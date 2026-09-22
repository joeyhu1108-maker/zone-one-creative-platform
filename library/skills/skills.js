const cards = [...document.querySelectorAll('.skill-card')];
const query = document.querySelector('#skill-query');
const filters = [...document.querySelectorAll('[data-filter]')];
const dialogs = [...document.querySelectorAll('dialog')];
let category = '全部';
function filterSkills() {
  const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const card of cards) {
    card.hidden = (category !== '全部' && card.dataset.category !== category) || !words.every(word => card.dataset.search.includes(word));
    if (!card.hidden) count++;
  }
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
  document.querySelector('#skill-count').textContent = count;
  document.querySelector('#result-status').textContent = `${count} 个 Skill · 按需安装，在 Codex 中使用`;
  document.querySelector('#skill-empty').hidden = count !== 0;
}
filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; filterSkills(); }));
query.addEventListener('input', filterSkills);
document.querySelector('#clear-filter').addEventListener('click', () => { category = '全部'; query.value = ''; filterSkills(); query.focus(); });
function openDetail(id) {
  const dialog = document.getElementById(`detail-${id}`);
  if (!dialog || dialog.open) return;
  dialogs.forEach(other => { if (other.open) other.close(); });
  dialog.showModal();
  dialog.scrollTop = 0;
}
document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
  openDetail(button.dataset.open);
  history.replaceState(null, '', `#${button.dataset.open}`);
}));
dialogs.forEach(dialog => {
  dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (location.hash === `#${dialog.id.slice(7)}`) history.replaceState(null, '', '#skill-list');
  });
});
let statusTimer;
document.querySelectorAll('[data-copy-text]').forEach(button => button.addEventListener('click', async () => {
  const source = document.getElementById(button.dataset.copyText);
  const status = document.querySelector('.copy-status');
  try {
    await navigator.clipboard.writeText(source.textContent);
    status.textContent = '已复制，粘贴给 Codex 即可。';
  } catch {
    const dialog = source.closest('dialog');
    if (!dialog.open) openDetail(dialog.id.slice(7));
    source.scrollIntoView({ block: 'center' });
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(source);
    selection.removeAllRanges(); selection.addRange(range);
    status.textContent = '请手动复制已选中的文字。';
  }
  // A native modal is above the document layer, so show feedback inside it.
  const activeDialog = dialogs.find(dialog => dialog.open);
  (activeDialog || document.body).append(status);
  status.classList.add('is-visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => status.classList.remove('is-visible'), 4000);
}));
function revealHash() {
  const id = location.hash.slice(1);
  if (document.getElementById(`detail-${id}`)) openDetail(id);
  else dialogs.forEach(dialog => { if (dialog.open) dialog.close(); });
}
window.addEventListener('hashchange', revealHash);
revealHash();
