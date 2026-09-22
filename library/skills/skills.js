const cards = [...document.querySelectorAll('.skill-card')];
const query = document.querySelector('#skill-query');
const filters = [...document.querySelectorAll('[data-filter]')];
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
  document.querySelector('#skill-empty').hidden = count !== 0;
}
filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; filterSkills(); }));
query.addEventListener('input', filterSkills);
document.querySelector('#clear-filter').addEventListener('click', () => { category = '全部'; query.value = ''; filterSkills(); query.focus(); });
let statusTimer;
document.querySelectorAll('[data-copy-text]').forEach(button => button.addEventListener('click', async () => {
  const source = document.getElementById(button.dataset.copyText);
  const status = document.querySelector('.copy-status');
  try {
    await navigator.clipboard.writeText(source.textContent);
    status.textContent = '已复制，去 Codex 粘贴即可。';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(source);
    selection.removeAllRanges(); selection.addRange(range);
    status.textContent = '请手动复制已选中的文字。';
  }
  status.classList.add('is-visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => status.classList.remove('is-visible'), 4000);
}));
function revealHash() {
  const card = cards.find(card => `#${card.id}` === location.hash);
  if (!card) return;
  category = '全部'; query.value = ''; filterSkills();
  card.querySelector('details').open = true;
  card.scrollIntoView({ block: 'start' });
}
window.addEventListener('hashchange', revealHash);
revealHash();
