const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const baseURL = process.env.SITE_URL || "http://127.0.0.1:8890/";
const outputDir = path.resolve(__dirname, "../qa");

async function inspect(page, viewport, suffix) {
  await page.setViewportSize(viewport);
  await page.goto(baseURL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator("#hero-title").waitFor();

  const text = await page.locator("body").innerText();
  assert.match(text, /AI造物社/);
  assert.match(text, /造物门诊/);
  assert.match(text, /设计资源库/);
  assert.match(text, /Vibe Motion/);
  assert.equal(await page.locator(".door").count(), 3);
  assert.equal(await page.locator(".level-tab").count(), 3);
  assert.equal(await page.locator(".resource-card").count(), 6);

  await page.locator('[data-filter="motion"]').click();
  assert.equal(await page.locator('[data-kind]:visible').count(), 1);
  await page.locator('[data-filter="all"]').click();
  assert.equal(await page.locator('[data-kind]:visible').count(), 5);

  await page.locator('[data-level="intermediate"]').click();
  assert.equal(await page.locator('[data-level-panel="intermediate"]').isVisible(), true);
  await page.locator('[data-level="beginner"]').click();
  assert.equal(await page.locator('[data-level-panel="beginner"]').isVisible(), true);

  assert.match(await page.locator("#motion-prompt").innerText(), /1080 × 1920/);
  const motionLinks = await page.locator(".motion-links a").evaluateAll((links) => links.map((link) => link.href.replace(/\/$/, "")));
  assert.deepEqual(motionLinks, ["https://github.com/vibe-motion/skills", "https://vibe-motion.github.io"]);

  await page.locator("#clinic-user").fill("第一次打开产品的新用户");
  await page.locator("#clinic-task").fill("找到并开始生成");
  await page.locator(".clinic-submit").click();
  assert.match(await page.locator("[data-report-title]").innerText(), /找到并开始生成/);

  await page.locator("#resource-query").fill("动效");
  assert.equal(await page.locator(".resource-card:visible").count(), 1);
  await page.locator("#resource-query").fill("");

  await page.locator("[data-open-account]").first().click();
  assert.equal(await page.locator(".account-dialog").isVisible(), true);
  await page.locator("[data-close-account]").first().click();

  await page.waitForTimeout(2400);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `horizontal overflow should be absent, got ${overflow}px`);

  await page.screenshot({ path: path.join(outputDir, `zone-one-${suffix}.png`), fullPage: true });
  await page.locator("#vibe-motion").screenshot({ path: path.join(outputDir, `zone-one-motion-${suffix}.png`) });
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await inspect(page, { width: 1440, height: 900 }, "desktop");
  await inspect(page, { width: 390, height: 844 }, "mobile");
  await browser.close();
  process.stdout.write(`Z.ONE platform smoke test passed: ${baseURL}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
