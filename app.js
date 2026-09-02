const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
const header = $(".site-header");
const cursor = $(".cursor-dot");
const heroObject = $(".hero-object");

function updateScrollState() {
  const max = document.documentElement.scrollHeight - innerHeight;
  root.style.setProperty("--scroll", max > 0 ? scrollY / max : 0);
  header?.classList.toggle("is-scrolled", scrollY > 36);
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
    if (heroObject && y < innerHeight) {
      const tiltX = ((y / innerHeight) - .5) * -9;
      const tiltY = ((x / innerWidth) - .5) * 11;
      heroObject.style.transform = `translateY(-50%) perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    }
  }, { passive: true });

  $$('a, button, input, label').forEach((node) => {
    node.addEventListener("pointerenter", () => cursor.classList.add("is-active"));
    node.addEventListener("pointerleave", () => cursor.classList.remove("is-active"));
  });
}

const revealTargets = $$(".section-head, .door, .feed-card, .school-brand, .level-tabs, .level-panel, .motion-heading, .motion-demo, .motion-workflow, .clinic-form, .clinic-report, .resource-search, .resource-card, .membership > *, footer > *");
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
  const context = canvas.getContext("2d", { alpha: false });
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  const pointer = { x: .72, y: .44, tx: .72, ty: .44 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    pixelRatio = Math.min(devicePixelRatio || 1, 1.7);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  canvas.closest(".hero")?.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.tx = (event.clientX - rect.left) / rect.width;
    pointer.ty = (event.clientY - rect.top) / rect.height;
  }, { passive: true });

  function draw(time = 0) {
    const seconds = time * .001;
    pointer.x += (pointer.tx - pointer.x) * .025;
    pointer.y += (pointer.ty - pointer.y) * .025;
    context.fillStyle = "#090c08";
    context.fillRect(0, 0, width, height);

    const halo = context.createRadialGradient(pointer.x * width, pointer.y * height, 0, pointer.x * width, pointer.y * height, Math.max(width, height) * .62);
    halo.addColorStop(0, "rgba(163,255,25,.20)");
    halo.addColorStop(.36, "rgba(87,132,36,.07)");
    halo.addColorStop(1, "rgba(9,12,8,0)");
    context.fillStyle = halo;
    context.fillRect(0, 0, width, height);

    context.globalCompositeOperation = "lighter";
    const bands = width < 700 ? 11 : 18;
    for (let band = 0; band < bands; band += 1) {
      const depth = band / (bands - 1);
      const base = height * (.16 + depth * .77);
      const amplitude = height * (.055 + Math.sin(depth * Math.PI) * .105);
      context.beginPath();
      for (let x = -40; x <= width + 40; x += 14) {
        const normalized = x / width;
        const pull = Math.exp(-Math.pow(normalized - pointer.x, 2) * 10);
        const wave = Math.sin(normalized * 8.2 + seconds * (.34 + depth * .22) + band * .48);
        const cross = Math.sin(normalized * 2.1 - seconds * .19 + band) * height * .045;
        const y = base + wave * amplitude + cross + (pointer.y - .5) * pull * height * .24;
        if (x === -40) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = band % 4 === 0 ? `rgba(210,255,92,${.2 + depth * .28})` : `rgba(227,240,210,${.035 + depth * .075})`;
      context.lineWidth = band % 4 === 0 ? 1.2 : .7;
      context.stroke();
    }

    for (let index = 0; index < 58; index += 1) {
      const seed = index * 12.9898;
      const x = ((Math.sin(seed) * 43758.5453) % 1 + 1) % 1;
      const y = ((Math.sin(seed * 1.71) * 24634.6345) % 1 + 1) % 1;
      const drift = Math.sin(seconds * .35 + seed) * 16;
      const radius = index % 13 === 0 ? 2.1 : .65;
      context.beginPath();
      context.arc(x * width + drift, y * height, radius, 0, Math.PI * 2);
      context.fillStyle = index % 13 === 0 ? "rgba(205,255,78,.72)" : "rgba(237,241,224,.18)";
      context.fill();
    }
    context.globalCompositeOperation = "source-over";
    if (!reducedMotion) requestAnimationFrame(draw);
  }

  addEventListener("resize", resize, { passive: true });
  resize();
  draw();
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
