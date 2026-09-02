const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

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
