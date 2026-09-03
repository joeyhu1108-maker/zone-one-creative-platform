const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
const header = $(".site-header");
const cursor = $(".cursor-dot");
const scrollStory = $(".scroll-story");
const storyCopies = $$('[data-story-copy]');
const storyMedia = $$('[data-story-media]');
const storyRail = $$(".story-rail i");
const storyNumber = $("[data-story-number]");
let activeStoryStep = -1;

function updateStoryState() {
  if (!scrollStory) return;
  const bounds = scrollStory.getBoundingClientRect();
  const travel = Math.max(1, bounds.height - innerHeight);
  const progress = Math.min(1, Math.max(0, -bounds.top / travel));
  const step = Math.min(storyCopies.length - 1, Math.floor(progress * storyCopies.length));
  const stepProgress = progress * storyCopies.length - step;
  scrollStory.style.setProperty("--story-shift", `${(stepProgress - .5) * -18}px`);
  if (step === activeStoryStep) return;
  activeStoryStep = step;
  scrollStory.dataset.step = String(step);
  if (storyNumber) storyNumber.textContent = String(step + 1).padStart(2, "0");
  storyCopies.forEach((node, index) => {
    const active = index === step;
    node.classList.toggle("is-active", active);
    node.setAttribute("aria-hidden", String(!active));
  });
  storyMedia.forEach((node) => node.classList.toggle("is-active", Number(node.dataset.storyMedia) === step));
  storyRail.forEach((node, index) => {
    node.classList.toggle("is-active", index === step);
    node.classList.toggle("is-past", index < step);
  });
}

function updateScrollState() {
  const max = document.documentElement.scrollHeight - innerHeight;
  root.style.setProperty("--scroll", max > 0 ? scrollY / max : 0);
  header?.classList.toggle("is-scrolled", scrollY > 36);
  updateStoryState();
}

addEventListener("scroll", updateScrollState, { passive: true });
updateScrollState();

if (matchMedia("(pointer: fine)").matches) {
  addEventListener("pointermove", (event) => {
    const x = event.clientX;
    const y = event.clientY;
    cursor.style.transform = `translate3d(${x - cursor.offsetWidth / 2}px, ${y - cursor.offsetHeight / 2}px, 0)`;
    root.style.setProperty("--mx", `${(x / innerWidth) * 100}%`);
    root.style.setProperty("--my", `${(y / innerHeight) * 100}%`);
  }, { passive: true });

  $$('a, button, input, label, canvas[tabindex]').forEach((node) => {
    node.addEventListener("pointerenter", () => cursor.classList.add("is-active"));
    node.addEventListener("pointerleave", () => cursor.classList.remove("is-active"));
  });
}

const revealTargets = $$(".about-intro > *, .about-belief > *, .about-pillars article, .about-method, .section-head, .door, .feed-card, .support-intro > *, .support-needs article, .support-action > *, .school-brand, .level-tabs, .level-panel, .motion-heading, .motion-demo, .motion-workflow, .clinic-form, .clinic-report, .resource-search, .resource-card, .membership > *, footer > *");
revealTargets.forEach((node) => node.classList.add("reveal"));

if (reducedMotion) {
  revealTargets.forEach((node) => node.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: .08 });
  revealTargets.forEach((node) => revealObserver.observe(node));
}

function startKineticField() {
  const canvas = $("#kinetic-canvas");
  if (!canvas) return;
  const hero = canvas.closest(".hero");
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false })
    || canvas.getContext("experimental-webgl");
  if (!gl) {
    hero?.classList.add("fluid-failed");
    return;
  }

  const vertexSource = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;
  const fragmentSource = `
    precision highp float;
    uniform vec2 uRes;
    uniform vec2 uPointer;
    uniform float uTime;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash(i), b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec2 p) {
      float value = 0.0, amplitude = 0.5;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p);
        p = p * 2.03 + vec2(1.7, 9.2);
        amplitude *= 0.5;
      }
      return value;
    }
    float caustic(vec2 uv, float time) {
      vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
      vec2 i = p;
      float c = 1.0;
      float intensity = 0.0045;
      for (int n = 0; n < 4; n++) {
        float t = time * 0.42 * (1.0 - 3.0 / float(n + 1));
        i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
        c += 1.0 / length(vec2(p.x / (sin(i.x + t) / intensity), p.y / (cos(i.y + t) / intensity)));
      }
      c /= 4.0;
      c = 1.17 - pow(c, 1.4);
      return pow(abs(c), 7.0);
    }
    void main() {
      vec2 frag = gl_FragCoord.xy / uRes.xy;
      vec2 uv = frag;
      uv.x *= uRes.x / uRes.y;
      float focus = smoothstep(0.62, 0.0, distance(frag, uPointer));
      uv += (uPointer - 0.5) * focus * 0.10;
      float time = uTime * 0.8;
      vec2 q = uv * 1.5;
      float w1 = fbm(q + vec2(0.0, time * 0.08));
      float w2 = fbm(q * 1.3 + vec2(time * 0.05, -time * 0.04) + 4.0);
      vec2 warp = vec2(w1, w2) - 0.5;
      float body = clamp(w1 * 0.6 + w2 * 0.4, 0.0, 1.0);
      float light = caustic(uv * 2.8 + warp * 0.7, time);
      vec3 deep = vec3(0.006, 0.018, 0.010);
      vec3 mid = vec3(0.018, 0.105, 0.060);
      vec3 glow = vec3(0.10, 0.84, 0.48);
      vec3 hot = vec3(0.91, 1.0, 0.55);
      vec3 cool = vec3(0.32, 0.95, 0.62);
      vec3 color = mix(deep, mid, smoothstep(0.05, 0.8, body));
      color = mix(color, glow, smoothstep(0.2, 0.95, light));
      color += mix(glow, cool, smoothstep(0.3, 0.8, body)) * light * 0.5;
      color += hot * pow(light, 4.0) * (0.66 + focus * 0.22);
      vec2 poolCenter = mix(vec2(0.68, 0.44), uPointer, 0.18);
      color *= mix(0.42, 1.12, smoothstep(1.3, 0.1, length(frag - poolCenter)));
      color = color / (color + 0.8);
      color = pow(color, vec3(0.85));
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) {
    hero?.classList.add("fluid-failed");
    return;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    hero?.classList.add("fluid-failed");
    return;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resolution = gl.getUniformLocation(program, "uRes");
  const timeUniform = gl.getUniformLocation(program, "uTime");
  const pointerUniform = gl.getUniformLocation(program, "uPointer");
  const pointer = { x: .74, y: .48, tx: .74, ty: .48 };
  let frame = 0;
  let start = performance.now();

  function resize() {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    const scale = Math.min(.68, 980 / Math.max(width, 1));
    canvas.width = Math.max(2, Math.round(width * scale));
    canvas.height = Math.max(2, Math.round(height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function render(seconds) {
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform2f(pointerUniform, pointer.x, pointer.y);
    gl.uniform1f(timeUniform, seconds);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.dataset.fluidReady = "true";
  }

  function loop(now) {
    render((now - start) / 1000);
    frame = requestAnimationFrame(loop);
  }

  hero?.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    pointer.tx = (event.clientX - rect.left) / rect.width;
    pointer.ty = 1 - (event.clientY - rect.top) / rect.height;
  }, { passive: true });
  addEventListener("resize", () => {
    resize();
    if (reducedMotion) render(11.5);
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else if (!reducedMotion) {
      start = performance.now();
      frame = requestAnimationFrame(loop);
    }
  });

  resize();
  if (reducedMotion) render(11.5);
  else frame = requestAnimationFrame(loop);
}

startKineticField();

const toast = $(".toast");
let toastTimer;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

const routeOptions = {
  "not-started": {
    title: "还没开始",
    situation: "有想法，但还不知道先做什么",
    duration: "约 2–3 小时",
    module: "AI造物社",
    path: "school/",
    reason: "先沿着一条清楚的学习与制作路径，把第一件能打开、操作和分享的作品做出来。"
  },
  making: {
    title: "制作卡住",
    situation: "已经在做，但页面、交互或结果不够清楚",
    duration: "约 10 分钟",
    module: "造物门诊",
    path: "clinic/",
    reason: "带着当前页面和真实任务，先找出最影响体验的三个卡点，再继续修改。"
  },
  reference: {
    title: "寻找参考",
    situation: "需要视觉、交互、动效或工具方向",
    duration: "约 5–15 分钟",
    module: "设计资源库",
    path: "library/",
    reason: "按当前任务找灵感、界面案例与制作工具，减少没有目的的浏览。"
  }
};

const routeStorageKey = "zone-one-entry";
let routeSelection = null;
let routeReturnFocus = null;

function readRouteSelection() {
  if (routeOptions[routeSelection]) return routeSelection;
  const fromUrl = new URLSearchParams(location.search).get("entry");
  if (routeOptions[fromUrl]) return fromUrl;
  try {
    const stored = localStorage.getItem(routeStorageKey);
    return routeOptions[stored] ? stored : null;
  } catch {
    return routeSelection;
  }
}

function saveRouteSelection(choice) {
  routeSelection = choice;
  try {
    localStorage.setItem(routeStorageKey, choice);
  } catch {
    // The in-memory choice and the destination URL keep the route recoverable.
  }
}

function trackZoneEvent(name, data = {}) {
  const allowedKeys = ["choice", "module", "source", "task"];
  const payload = { event: name, timestamp: new Date().toISOString() };
  allowedKeys.forEach((key) => {
    if (typeof data[key] === "string") payload[key] = data[key];
  });
  window.__zoneAnalytics = window.__zoneAnalytics || [];
  window.__zoneAnalytics.push(payload);
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
  window.dispatchEvent(new CustomEvent("zone:analytics", { detail: payload }));
  try {
    const previous = JSON.parse(localStorage.getItem("zone-one-events") || "[]");
    localStorage.setItem("zone-one-events", JSON.stringify([...previous, payload].slice(-50)));
  } catch {
    // Analytics must never block the creation path.
  }
}

function trapModalFocus(dialog, event) {
  if (event.key !== "Tab") return;
  const focusable = $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])', dialog)
    .filter((node) => !node.hidden && node.getClientRects().length);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

document.body.insertAdjacentHTML("beforeend", `
  <dialog class="route-dialog" aria-labelledby="route-title">
    <div class="route-panel">
      <button class="route-close" type="button" data-close-router aria-label="关闭入口选择">×</button>
      <div data-route-choice-step>
        <header class="route-head">
          <p class="route-kicker">FIRST CREATION / 01</p>
          <h2 id="route-title">你现在卡在哪？</h2>
          <p>选最接近的一项。先看推荐理由，确认后再进入。</p>
        </header>
        <div class="route-options" aria-label="选择当前卡点">
          <button class="route-option" type="button" data-route-choice="not-started" aria-pressed="false">
            <span class="route-option-index">01</span><span class="route-option-copy"><strong>还没开始</strong><small>有想法，但还不知道先做什么</small></span><time>约 2–3 小时</time>
          </button>
          <button class="route-option" type="button" data-route-choice="making" aria-pressed="false">
            <span class="route-option-index">02</span><span class="route-option-copy"><strong>制作卡住</strong><small>已经在做，但页面、交互或结果不够清楚</small></span><time>约 10 分钟</time>
          </button>
          <button class="route-option" type="button" data-route-choice="reference" aria-pressed="false">
            <span class="route-option-index">03</span><span class="route-option-copy"><strong>寻找参考</strong><small>需要视觉、交互、动效或工具方向</small></span><time>约 5–15 分钟</time>
          </button>
        </div>
        <section class="route-result" data-route-result aria-live="polite" hidden>
          <span class="route-result-label">推荐入口</span>
          <h3 data-route-module></h3>
          <p data-route-reason></p>
        </section>
        <p class="route-error" data-route-error role="alert" hidden></p>
        <button class="route-confirm" type="button" data-route-confirm disabled><span>先选择一个卡点</span></button>
      </div>
      <section class="route-benefit" data-route-benefit hidden>
        <span class="route-benefit-badge">推荐已确认</span>
        <h3>先去 <span data-route-benefit-module></span></h3>
        <p>入口已经为你保留。你可以领取昵称、身份和 20 个本机体验积分，也可以直接开始。</p>
        <button class="route-claim" type="button" data-route-claim>领取 20 个体验积分</button>
        <button class="route-skip" type="button" data-route-skip>暂不领取，直接前往</button>
        <button class="route-reset" type="button" data-route-reset>换一个入口</button>
      </section>
    </div>
  </dialog>
`);

const routeDialog = $(".route-dialog");
const routeChoiceStep = $("[data-route-choice-step]", routeDialog);
const routeBenefit = $("[data-route-benefit]", routeDialog);
const routeResult = $("[data-route-result]", routeDialog);
const routeConfirm = $("[data-route-confirm]", routeDialog);
const routeError = $("[data-route-error]", routeDialog);

function renderRouteSelection() {
  const option = routeOptions[routeSelection];
  $$('[data-route-choice]', routeDialog).forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.routeChoice === routeSelection));
  });
  routeResult.hidden = !option;
  routeConfirm.disabled = !option;
  $("[data-route-module]", routeDialog).textContent = option?.module || "";
  $("[data-route-reason]", routeDialog).textContent = option?.reason || "";
  $("span", routeConfirm).textContent = option ? `确认，进入${option.module}` : "先选择一个卡点";
}

function showRouteChoices() {
  routeChoiceStep.hidden = false;
  routeBenefit.hidden = true;
  routeConfirm.dataset.loading = "false";
  routeConfirm.setAttribute("aria-busy", "false");
  routeConfirm.disabled = !routeSelection;
  routeError.hidden = true;
  renderRouteSelection();
}

function openRouter(eventOrSource) {
  if (eventOrSource?.preventDefault) eventOrSource.preventDefault();
  const source = eventOrSource?.currentTarget?.classList?.contains("module-return") ? "module" : "hero";
  routeReturnFocus = eventOrSource?.currentTarget || document.activeElement;
  routeSelection = readRouteSelection();
  showRouteChoices();
  if (!routeDialog.open) routeDialog.showModal();
  trackZoneEvent("entry_router_open", { source, choice: routeSelection || "none" });
  requestAnimationFrame(() => {
    const selected = routeSelection && $(`[data-route-choice="${routeSelection}"]`, routeDialog);
    (selected || $("[data-route-choice]", routeDialog))?.focus();
  });
}

function routeUrl(choice, extra = {}) {
  const option = routeOptions[choice];
  if (!option) return null;
  const target = new URL(`/${option.path}`, location.origin);
  target.searchParams.set("entry", choice);
  Object.entries(extra).forEach(([key, value]) => target.searchParams.set(key, value));
  return target;
}

function navigateToRoute(choice = routeSelection) {
  const target = routeUrl(choice);
  if (!target) return false;
  try {
    location.assign(target.href);
    return true;
  } catch {
    routeChoiceStep.hidden = false;
    routeBenefit.hidden = true;
    routeError.textContent = "页面暂时没有跳转。你的选择已经保留，请重试或关闭后继续浏览。";
    routeError.hidden = false;
    routeConfirm.disabled = false;
    routeConfirm.dataset.loading = "false";
    routeConfirm.setAttribute("aria-busy", "false");
    $("span", routeConfirm).textContent = "重试进入推荐模块";
    return false;
  }
}

$$('[data-open-router]').forEach((button) => button.addEventListener("click", openRouter));
$$('[data-route-choice]', routeDialog).forEach((button) => {
  button.addEventListener("click", () => {
    saveRouteSelection(button.dataset.routeChoice);
    renderRouteSelection();
    trackZoneEvent("entry_option_select", { choice: routeSelection, module: routeOptions[routeSelection].module });
  });
});

routeConfirm.addEventListener("click", () => {
  if (!routeSelection || routeConfirm.dataset.loading === "true") return;
  const option = routeOptions[routeSelection];
  routeConfirm.dataset.loading = "true";
  routeConfirm.setAttribute("aria-busy", "true");
  routeConfirm.disabled = true;
  $("span", routeConfirm).textContent = "正在确认…";
  trackZoneEvent("entry_recommend_confirm", { choice: routeSelection, module: option.module });
  setTimeout(() => {
    if (getProfile()) {
      navigateToRoute();
      return;
    }
    routeChoiceStep.hidden = true;
    routeBenefit.hidden = false;
    routeConfirm.setAttribute("aria-busy", "false");
    $("[data-route-benefit-module]", routeDialog).textContent = option.module;
    $("[data-route-claim]", routeDialog).focus();
  }, reducedMotion ? 0 : 180);
});

$("[data-route-claim]", routeDialog).addEventListener("click", () => {
  routeDialog.close();
  openAccount(null, true);
});
$("[data-route-skip]", routeDialog).addEventListener("click", () => navigateToRoute());
$("[data-route-reset]", routeDialog).addEventListener("click", () => {
  showRouteChoices();
  $(`[data-route-choice="${routeSelection}"]`, routeDialog)?.focus();
});
$("[data-close-router]", routeDialog).addEventListener("click", () => routeDialog.close());
routeDialog.addEventListener("click", (event) => {
  if (event.target === routeDialog) routeDialog.close();
});
routeDialog.addEventListener("keydown", (event) => trapModalFocus(routeDialog, event));
routeDialog.addEventListener("close", () => routeReturnFocus?.focus?.());

routeSelection = readRouteSelection();
const currentModule = document.body.classList.contains("module-school-page") ? "AI造物社"
  : document.body.classList.contains("module-clinic-page") ? "造物门诊"
    : document.body.classList.contains("module-library-page") ? "设计资源库" : null;
if (currentModule) trackZoneEvent("module_arrive", { module: currentModule, choice: routeSelection || "direct" });

$$('[data-copy]').forEach((button) => {
  button.addEventListener("click", async () => {
    const target = $(button.dataset.copy);
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.textContent.trim());
      showToast("提示词已复制");
    } catch {
      showToast("复制失败，请手动选择提示词");
    }
  });
});

$$('[data-filter]').forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.filter;
    $$('[data-filter]').forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    $$('[data-kind]').forEach((card) => {
      card.hidden = value !== "all" && !card.dataset.kind.split(" ").includes(value);
    });
  });
});

$$('[data-level]').forEach((button) => {
  button.addEventListener("click", () => {
    const level = button.dataset.level;
    $$('[data-level]').forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    $$('[data-level-panel]').forEach((panel) => {
      const active = panel.dataset.levelPanel === level;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  });
});

const fileInput = $("#clinic-files");
const fileState = $("[data-file-state]");
fileInput?.addEventListener("change", () => {
  const count = fileInput.files.length;
  fileState.textContent = count ? `已选择 ${count} 个文件，只在当前浏览器中读取` : "文件只在当前浏览器中预览";
});

$(".clinic-submit")?.addEventListener("click", () => {
  const user = $("#clinic-user").value.trim();
  const task = $("#clinic-task").value.trim();
  const evidence = $('input[name="evidence"]:checked').value;
  const result = $(".report-result");
  $(".report-empty").hidden = true;
  result.hidden = false;

  if (!user || !task) {
    $("[data-report-title]").textContent = "先补齐真实任务";
    $("[data-report-copy]").textContent = "门诊需要“谁在使用”和“他必须完成什么”，写清这两项后才有判断依据。";
    showToast("请先填写用户和任务");
    return;
  }

  $("[data-report-title]").textContent = `${user}，能否顺利${task}？`;
  $("[data-report-copy]").textContent = `你选择了“${evidence}”。正式门诊会结合真实画面，只返回三个最影响任务的卡点。`;
  trackZoneEvent("first_task_complete", { module: "造物门诊", task: "generate_triage_question" });
  showToast("预诊问题已生成");
});

const resourceInput = $("#resource-query");
const resourceCount = $("[data-resource-count]");
const noResults = $(".no-results");

resourceInput?.addEventListener("input", () => {
  const query = resourceInput.value.trim().toLowerCase();
  let visible = 0;
  $$(".resource-card").forEach((card) => {
    const matched = !query || card.dataset.search.toLowerCase().includes(query);
    card.hidden = !matched;
    if (matched) visible += 1;
  });
  resourceCount.textContent = `${visible} 个精选入口`;
  noResults.hidden = visible !== 0;
});

$$('.resource-card[href]').forEach((card) => card.addEventListener("click", () => {
  trackZoneEvent("first_task_complete", { module: "设计资源库", task: "open_resource" });
}));

$$('.course-list a[href]').forEach((course) => course.addEventListener("click", () => {
  trackZoneEvent("first_task_complete", { module: "AI造物社", task: "open_course" });
}));

const accountDialog = $(".account-dialog");
const accountForm = $("#account-form");
const accountSuccess = $(".account-success");
const accountName = $("#account-name");
const accessCanvas = $("#access-canvas");
const accountCard = $(".account-card");
let accessFrame = 0;
const accessPointer = { x: .58, y: .34, targetX: .58, targetY: .34, hover: .88, targetHover: .88 };
let accessRenderer;

function createAccessRenderer() {
  const gl = accessCanvas?.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "high-performance"
  });
  if (!gl) return null;

  const vertexSource = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const fragmentSource = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_ptr;
    uniform float u_hov;

    float hash(vec2 p) {
      p=fract(p*vec2(127.1,311.7));
      p+=dot(p,p+19.19);
      return fract(p.x*p.y);
    }

    float vnoise(vec2 p) {
      vec2 i=floor(p),f=fract(p);
      vec2 u=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);
    }

    float fbm(vec2 p) {
      float v=0.0,a=0.5;
      for(int i=0;i<5;i++) {
        v+=a*vnoise(p);
        p=p*2.03+vec2(1.7,9.2);
        a*=0.5;
      }
      return v;
    }

    void main() {
      vec2 uv=gl_FragCoord.xy/u_res;
      vec2 p=uv-0.5;
      p.x*=u_res.x/u_res.y;

      float warp=fbm(uv*2.7+vec2(u_time*0.045,-u_time*0.025));
      float folds=fbm(uv*4.1+vec2(warp*1.8,-warp*1.3)+u_ptr*0.7);
      float angle=uv.x*1.45-uv.y*1.15+(u_ptr.x-0.5)*1.7+(u_ptr.y-0.5)*1.2+warp*1.7+u_time*0.035;
      float ribbon=pow(0.5+0.5*sin(angle*10.5+folds*7.0),2.2);
      float cloud=smoothstep(0.42,0.82,folds+warp*0.25);

      vec2 sweepDir=normalize(vec2(0.72,0.68));
      float sweep=exp(-9.0*abs(dot(p,sweepDir)-(u_ptr.x-0.5)*1.25-(u_ptr.y-0.5)*0.72));

      vec2 grid=uv*vec2(142.0,188.0);
      vec2 cell=floor(grid);
      float seed=hash(cell);
      vec2 jitter=(vec2(hash(cell+7.3),hash(cell+3.7))-0.5)*0.58;
      float dotShape=1.0-smoothstep(0.04,0.24,length(fract(grid)-0.5-jitter));
      float twinkle=0.38+0.62*pow(0.5+0.5*sin(u_time*1.8+seed*52.0+(u_ptr.x+u_ptr.y)*5.0),8.0);
      float sparkle=step(0.86,seed)*dotShape*twinkle;

      vec3 base=mix(vec3(0.012,0.014,0.016),vec3(0.045,0.048,0.052),uv.y);
      float foil=(ribbon*0.47+cloud*0.34+sweep*0.56)*(0.76+u_hov*0.36);
      vec3 col=base+vec3(0.44,0.48,0.53)*foil+vec3(0.95,0.98,1.0)*sparkle*(0.62+u_hov*0.48);
      float vignette=1.0-smoothstep(0.28,1.18,length(p*vec2(0.86,1.0)));
      col*=mix(0.58,1.0,vignette);
      col=1.0-exp(-col*1.18);
      gl_FragColor=vec4(col,1.0);
    }
  `;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  accessCanvas.dataset.fieldMode = "webgl";

  return {
    gl,
    resolution: gl.getUniformLocation(program, "u_res"),
    time: gl.getUniformLocation(program, "u_time"),
    pointer: gl.getUniformLocation(program, "u_ptr"),
    hover: gl.getUniformLocation(program, "u_hov")
  };
}

function drawAccessField(time = 0) {
  if (!accessCanvas || !accountDialog?.open) {
    accessFrame = 0;
    return;
  }
  if (accessRenderer === undefined) accessRenderer = createAccessRenderer();
  const bounds = accessCanvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const width = Math.max(1, Math.round(bounds.width * dpr));
  const height = Math.max(1, Math.round(bounds.height * dpr));
  if (accessCanvas.width !== width || accessCanvas.height !== height) {
    accessCanvas.width = width;
    accessCanvas.height = height;
  }
  accessPointer.x += (accessPointer.targetX - accessPointer.x) * .075;
  accessPointer.y += (accessPointer.targetY - accessPointer.y) * .075;
  accessPointer.hover += (accessPointer.targetHover - accessPointer.hover) * .06;

  if (accessRenderer) {
    const { gl } = accessRenderer;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(accessRenderer.resolution, width, height);
    gl.uniform1f(accessRenderer.time, time * .001);
    gl.uniform2f(accessRenderer.pointer, accessPointer.x, 1 - accessPointer.y);
    gl.uniform1f(accessRenderer.hover, accessPointer.hover);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  accountDialog.dataset.accessReady = "true";
  if (!reducedMotion) accessFrame = requestAnimationFrame(drawAccessField);
}

function startAccessField() {
  if (accessFrame) cancelAnimationFrame(accessFrame);
  accessFrame = requestAnimationFrame(drawAccessField);
}

function stopAccessField() {
  if (accessFrame) cancelAnimationFrame(accessFrame);
  accessFrame = 0;
}

accountCard?.addEventListener("pointermove", (event) => {
  const bounds = accountCard.getBoundingClientRect();
  accessPointer.targetX = (event.clientX - bounds.left) / bounds.width;
  accessPointer.targetY = (event.clientY - bounds.top) / bounds.height;
  accessPointer.targetHover = 1;
  accountCard.style.setProperty("--portal-x", `${accessPointer.targetX * 100}%`);
  accountCard.style.setProperty("--portal-y", `${accessPointer.targetY * 100}%`);
});

accountCard?.addEventListener("pointerleave", () => {
  accessPointer.targetX = .5;
  accessPointer.targetY = .42;
  accessPointer.targetHover = .78;
});

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem("zone-one-profile") || "null");
  } catch {
    return null;
  }
}

function saveProfile(profile) {
  try {
    localStorage.setItem("zone-one-profile", JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

function renderProfile() {
  const profile = getProfile();
  $$('[data-account-label]').forEach((node) => {
    node.textContent = profile ? "已领取" : "本机访问";
  });
  $$('[data-points]').forEach((node) => {
    node.textContent = `${profile?.points || 20} pts`;
    node.hidden = !profile;
  });
}

let accountReturnFocus = null;

function openAccount(event, fromRouter = false) {
  event?.preventDefault?.();
  routeSelection = routeSelection || readRouteSelection();
  if (!routeSelection) {
    showToast("先选择一个创作入口，再领取体验积分");
    openRouter(event || "account");
    return;
  }
  if (!accountDialog) {
    const home = new URL("/", location.origin);
    home.searchParams.set("entry", routeSelection);
    home.searchParams.set("claim", "1");
    location.assign(home.href);
    return;
  }
  accountReturnFocus = event?.currentTarget || (fromRouter ? routeReturnFocus : document.activeElement);
  const profile = getProfile();
  accountForm.hidden = Boolean(profile);
  accountSuccess.hidden = !profile;
  if (profile) $("[data-welcome-name]").textContent = `${profile.name}，欢迎回来`;
  if (!profile && accountDialog.dataset.accountState !== "error") {
    accountDialog.dataset.accountState = "idle";
    $("[data-account-status]").hidden = true;
    $("[data-account-recovery]").hidden = true;
    const submit = $(".account-submit", accountForm);
    submit.disabled = false;
    submit.dataset.accountState = "idle";
    $("span", submit).textContent = "领取 20 个体验积分";
  }
  if (!accountDialog.open) accountDialog.showModal();
  startAccessField();
  requestAnimationFrame(() => (profile ? $("[data-account-continue]") : accountName)?.focus());
}

$$('[data-open-account]').forEach((button) => button.addEventListener("click", openAccount));
function closeAccount() {
  if (accountDialog?.open) accountDialog.close();
}
$$('[data-close-account]').forEach((button) => button.addEventListener("click", closeAccount));

accountDialog?.addEventListener("click", (event) => {
  if (event.target === accountDialog) closeAccount();
});
accountDialog?.addEventListener("keydown", (event) => trapModalFocus(accountDialog, event));
accountDialog?.addEventListener("close", () => {
  stopAccessField();
  accountReturnFocus?.focus?.();
});

let pendingProfile = null;

function showAccountSaveError() {
  const submit = $(".account-submit", accountForm);
  const status = $("[data-account-status]");
  accountDialog.dataset.accountState = "error";
  submit.dataset.accountState = "error";
  submit.setAttribute("aria-busy", "false");
  submit.disabled = true;
  $("span", submit).textContent = "保存失败";
  status.textContent = "本机存储暂时不可用。你的输入仍在页面中，可以重试或暂不领取。";
  status.hidden = false;
  $("[data-account-recovery]").hidden = false;
  $("[data-account-retry]").focus();
}

function finishAccountSave(profile) {
  const submit = $(".account-submit", accountForm);
  accountDialog.dataset.accountState = "success";
  submit.dataset.accountState = "success";
  submit.setAttribute("aria-busy", "false");
  accountForm.hidden = true;
  accountSuccess.hidden = false;
  $("[data-welcome-name]").textContent = `${profile.name}，欢迎加入`;
  renderProfile();
  showToast("20 个体验积分已记录");
  $("[data-account-continue]").focus();
}

function persistPendingProfile() {
  if (!pendingProfile) return;
  const submit = $(".account-submit", accountForm);
  accountDialog.dataset.accountState = "loading";
  submit.dataset.accountState = "loading";
  submit.setAttribute("aria-busy", "true");
  submit.disabled = true;
  $("span", submit).textContent = "正在保存…";
  $("[data-account-status]").hidden = true;
  $("[data-account-recovery]").hidden = true;
  setTimeout(() => {
    if (saveProfile(pendingProfile)) finishAccountSave(pendingProfile);
    else showAccountSaveError();
  }, reducedMotion ? 0 : 280);
}

accountForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  pendingProfile = {
    name: accountName.value.trim(),
    role: $("#account-role").value,
    points: 20
  };
  persistPendingProfile();
});

$("[data-account-retry]")?.addEventListener("click", () => {
  accountDialog.dataset.accountState = "retry";
  const submit = $(".account-submit", accountForm);
  submit.dataset.accountState = "retry";
  submit.setAttribute("aria-busy", "false");
  $("span", submit).textContent = "正在重试…";
  setTimeout(persistPendingProfile, 0);
});

$$('[data-account-skip]').forEach((button) => button.addEventListener("click", () => {
  accountDialog.dataset.accountState = "skip";
  const submit = $(".account-submit", accountForm);
  if (submit) {
    submit.dataset.accountState = "skip";
    submit.setAttribute("aria-busy", "false");
  }
  closeAccount();
  navigateToRoute();
}));

$("[data-account-continue]")?.addEventListener("click", () => navigateToRoute());
$("[data-account-back]")?.addEventListener("click", () => {
  closeAccount();
  setTimeout(() => openRouter("account"), 0);
});

renderProfile();

const initialParams = new URLSearchParams(location.search);
if (initialParams.get("claim") === "1" && routeSelection && !getProfile()) {
  openAccount(null, true);
}
