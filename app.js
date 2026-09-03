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

function renderProfile() {
  const profile = getProfile();
  $$('[data-account-label]').forEach((node) => {
    node.textContent = profile?.name || "进入 Z.ONE";
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
  if (!accountDialog.open) accountDialog.showModal();
  startAccessField();
}

$$('[data-open-account]').forEach((button) => button.addEventListener("click", openAccount));
function closeAccount() {
  accountDialog?.close();
}
$$('[data-close-account]').forEach((button) => button.addEventListener("click", closeAccount));

accountDialog?.addEventListener("click", (event) => {
  if (event.target === accountDialog) closeAccount();
});
accountDialog?.addEventListener("close", stopAccessField);

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
