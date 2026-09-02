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
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

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

const accountDialog = $(".account-dialog");
const accountForm = $("#account-form");
const accountSuccess = $(".account-success");
const accountName = $("#account-name");

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem("zone-one-profile") || "null");
  } catch {
    return null;
  }
}

function renderProfile() {
  const profile = getProfile();
  $$('[data-account-label]').forEach((node) => {
    node.textContent = profile?.name || "登录 / 注册";
  });
  $$('[data-points]').forEach((node) => {
    node.textContent = `${profile?.points || 0} pts`;
  });
}

function openAccount() {
  const profile = getProfile();
  accountForm.hidden = Boolean(profile);
  accountSuccess.hidden = !profile;
  if (profile) $("[data-welcome-name]").textContent = `${profile.name}，欢迎回来`;
  accountDialog.showModal();
}

$$('[data-open-account]').forEach((button) => button.addEventListener("click", openAccount));
$$('[data-close-account]').forEach((button) => button.addEventListener("click", () => accountDialog.close()));

accountDialog?.addEventListener("click", (event) => {
  if (event.target === accountDialog) accountDialog.close();
});

accountForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const profile = {
    name: accountName.value.trim(),
    role: $("#account-role").value,
    points: 20
  };
  localStorage.setItem("zone-one-profile", JSON.stringify(profile));
  accountForm.hidden = true;
  accountSuccess.hidden = false;
  $("[data-welcome-name]").textContent = `${profile.name}，欢迎加入`;
  renderProfile();
  showToast("20 个体验积分已记录");
});

renderProfile();
