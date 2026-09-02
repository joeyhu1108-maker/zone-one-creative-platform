const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseURL = process.env.SITE_URL || "http://127.0.0.1:8890/";
const outputDir = path.resolve(__dirname, "../qa");
const route = (pathname) => new URL(pathname, baseURL).href;

function watchConsole(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function open(page, pathname) {
  const response = await page.goto(route(pathname), { waitUntil: "domcontentloaded", timeout: 30000 });
  assert.ok(response && response.ok(), `${pathname} should return 2xx`);
}

async function inspectHome(page, viewport, suffix) {
  await page.setViewportSize(viewport);
  const errors = watchConsole(page);
  await open(page, "./");
  await page.locator("#hero-title").waitFor();

  const text = await page.locator("body").innerText();
  assert.match(text, /AI造物社/);
  assert.match(text, /造物门诊/);
  assert.match(text, /设计资源库/);
  assert.match(text, /让好想法，\s*真正发生/);
  assert.match(text, /总站只负责选方向/);
  assert.match(text, /欢迎赞助我们/);
  assert.equal(await page.locator(".door").count(), 3);
  assert.equal(await page.locator(".support-needs article").count(), 3);
  assert.equal(await page.locator('.support-contact img').getAttribute("src"), "assets/joey-wechat-qr.jpg");
  assert.equal(await page.locator("main > .school, main > .clinic, main > .library, main > .vibe-motion").count(), 0);

  const doorPaths = await page.locator(".door").evaluateAll((nodes) => nodes.map((node) => new URL(node.href).pathname));
  assert.deepEqual(doorPaths, ["/school/", "/clinic/", "/library/"]);

  await page.waitForFunction(() => {
    const canvas = document.querySelector("#particle-earth");
    return canvas?.dataset.earthReady === "true" || document.querySelector(".story-sticky")?.classList.contains("earth-failed");
  });
  assert.equal(await page.locator(".story-media img").count(), 0);
  assert.equal(await page.locator(".story-particle-canvas").count(), 3);
  assert.equal(await page.locator("button[data-particle-zoom]").count(), 6);
  await page.waitForFunction(() => [...document.querySelectorAll(".story-particle-canvas")]
    .every((canvas) => canvas.dataset.particleReady === "true"));
  await page.evaluate(() => {
    const story = document.querySelector(".scroll-story");
    const travel = story.offsetHeight - innerHeight;
    scrollTo(0, story.offsetTop + travel * (1.25 / 4));
  });
  await page.waitForFunction(() => document.querySelector(".scroll-story")?.dataset.step === "1");
  const observeCanvas = page.locator('[data-particle-case="observe"]');
  await observeCanvas.click({ position: { x: 40, y: 40 } });
  assert.equal(await observeCanvas.getAttribute("data-scatter-state"), "active");
  await page.locator('[data-story-media="1"] [data-particle-zoom="in"]').click();
  assert.equal(await observeCanvas.getAttribute("data-particle-zoom"), "1.15");
  await page.locator('[data-filter="motion"]').click();
  assert.equal(await page.locator("[data-kind]:visible").count(), 1);
  await page.locator('[data-filter="all"]').click();
  assert.equal(await page.locator("[data-kind]:visible").count(), 5);

  await page.locator("[data-open-account]").first().click();
  assert.equal(await page.locator(".account-dialog").isVisible(), true);
  await page.locator("[data-close-account]").first().click();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `home horizontal overflow should be absent, got ${overflow}px`);
  assert.deepEqual(errors, [], `home console errors: ${errors.join(" | ")}`);
  await page.screenshot({ path: path.join(outputDir, `hierarchy-home-${suffix}.png`), fullPage: true });
}

async function inspectSchool(page, viewport, suffix) {
  await page.setViewportSize(viewport);
  const errors = watchConsole(page);
  await open(page, "school/");
  await page.locator("#module-title").waitFor();
  assert.match(await page.locator("body").innerText(), /Z\.ONE 总站[\s\S]*AI造物社[\s\S]*Eazo \/ Codex \/ Vibe Motion/);
  assert.equal(await page.locator('.hierarchy-line li[aria-current="step"]').innerText(), "02\nAI造物社\n选择课程");
  assert.equal(await page.locator("#eazo").getAttribute("href"), "https://ai-zaowushe-creator-course.pages.dev/");
  assert.equal(await page.locator("#codex").getAttribute("href"), "https://ai-zaowushe-codex-course.pages.dev/");
  assert.match(await page.locator("#vibe-motion").innerText(), /AI造物社里正在制作的重点模块/);
  assert.match(await page.locator("#motion-prompt").innerText(), /1080 × 1920/);
  await page.locator('[data-level="intermediate"]').click();
  assert.equal(await page.locator('[data-level-panel="intermediate"]').isVisible(), true);
  await page.locator('[data-level="beginner"]').click();
  assert.equal(await page.locator('[data-level-panel="beginner"]').isVisible(), true);
  const returnPath = await page.locator(".module-return").evaluate((node) => new URL(node.href).pathname);
  assert.equal(returnPath, "/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `school horizontal overflow should be absent, got ${overflow}px`);
  assert.deepEqual(errors, [], `school console errors: ${errors.join(" | ")}`);
  await page.screenshot({ path: path.join(outputDir, `hierarchy-school-${suffix}.png`), fullPage: true });
}

async function inspectClinic(page, viewport, suffix) {
  await page.setViewportSize(viewport);
  const errors = watchConsole(page);
  await open(page, "clinic/");
  await page.locator("#module-title").waitFor();
  assert.equal(await page.locator('.hierarchy-line li[aria-current="step"]').innerText(), "02\n造物门诊\n说明真实任务");
  await page.locator("#clinic-user").fill("第一次打开产品的新用户");
  await page.locator("#clinic-task").fill("找到并开始生成");
  await page.locator(".clinic-submit").click();
  assert.match(await page.locator("[data-report-title]").innerText(), /找到并开始生成/);
  assert.deepEqual(errors, [], `clinic console errors: ${errors.join(" | ")}`);
  await page.screenshot({ path: path.join(outputDir, `hierarchy-clinic-${suffix}.png`), fullPage: true });
}

async function inspectLibrary(page, viewport, suffix) {
  await page.setViewportSize(viewport);
  const errors = watchConsole(page);
  await open(page, "library/");
  await page.locator("#module-title").waitFor();
  assert.equal(await page.locator('.hierarchy-line li[aria-current="step"]').innerText(), "02\n设计资源库\n说清任务");
  assert.equal(await page.locator(".resource-card").count(), 6);
  await page.locator("#resource-query").fill("动效");
  assert.equal(await page.locator(".resource-card:visible").count(), 1);
  await page.locator("#resource-query").fill("");
  assert.deepEqual(errors, [], `library console errors: ${errors.join(" | ")}`);
  await page.screenshot({ path: path.join(outputDir, `hierarchy-library-${suffix}.png`), fullPage: true });
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const [suffix, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    for (const inspect of [inspectHome, inspectSchool, inspectClinic, inspectLibrary]) {
      const page = await browser.newPage();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await inspect(page, viewport, suffix);
      await page.close();
    }
  }
  await browser.close();
  process.stdout.write(`Z.ONE hierarchy smoke test passed: ${baseURL}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
