import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const dest = new URL('../library/skills/', import.meta.url);
mkdirSync(dest, { recursive: true });
if (process.argv[2]) writeFileSync(new URL('catalogue.json', dest), readFileSync(process.argv[2]));
const { skills, updated } = JSON.parse(readFileSync(new URL('catalogue.json', dest)));
const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const repo = s => `https://github.com/joeyhu1108-maker/${s.repo}`;
const url = s => s.path === '.' ? repo(s) : `${repo(s)}/tree/main/${s.path}`;
const previews = {
  'design-master-extension': `<div class="demo-output extension-output"><img src="demo/exports/01-main-poster.svg" alt="创作开放日主海报" loading="lazy"><img src="demo/exports/02-program-card.svg" alt="创作开放日日程卡" loading="lazy"><img src="demo/exports/03-entry-sign.svg" alt="创作开放日入口导视" loading="lazy"></div>`,
  'design-scoped-revision': `<div class="demo-output revision-output"><img src="demo/history/01-main-poster-v1.svg" alt="改稿前主海报" loading="lazy"><span aria-hidden="true">→</span><img src="demo/exports/01-main-poster.svg" alt="改稿后主海报" loading="lazy"><small>第 3 张保留原称</small></div>`,
  'design-batch-delivery': `<div class="demo-output delivery-output"><img src="demo/exports/01-main-poster.svg" alt="交付物 1：主海报" loading="lazy"><img src="demo/exports/02-program-card.svg" alt="交付物 2：日程卡" loading="lazy"><img src="demo/exports/03-entry-sign.svg" alt="交付物 3：入口导视" loading="lazy"><small>3 张成品 · 同版源文件 · 清单</small></div>`,
  'selective-ink-sketch': `<img src="previews/ink-sketch.png" alt="公开案例：雪山与行人的钢笔速写，以留白和线条取舍表现空间" loading="lazy" width="1662" height="946">`,
  'gc-art-history-particle-play': `<img class="particle-image" src="previews/particle-earth.jpg" alt="公开项目画面：艺术史粒子地球，触摸留下光点" loading="lazy" width="1180" height="1191">`
};
const demo = new Set(['design-master-extension', 'design-scoped-revision', 'design-batch-delivery']);
const publicCase = new Set(['selective-ink-sketch', 'gc-art-history-particle-play']);
const preview = s => previews[s.id]
  ? `<div class="preview-art art-${s.id}">${previews[s.id]}</div><span class="preview-label">${demo.has(s.id) ? '真实流程演示 · 虚构活动' : '公开案例'}</span>`
  : `<div class="preview-pending"><small>PUBLIC CASE / PENDING</small><strong>暂无可公开案例</strong></div>`;
const orderedSkills = [...skills].sort((a, b) => Number(Boolean(previews[b.id])) - Number(Boolean(previews[a.id])));
const cards = orderedSkills.map((s, i) => `<article class="skill-card" id="${esc(s.id)}" data-category="${esc(s.category)}" data-search="${esc([s.title,s.id,s.category,s.summary,s.input,s.output].join(' ').toLowerCase())}">
  <button class="card-preview${previews[s.id] ? '' : ' card-preview--pending'}" data-open="${s.id}" aria-label="查看${esc(s.title)}的用法">${preview(s)}<span class="preview-open" aria-hidden="true">查看用法 ↗</span></button>
  <div class="card-info"><div><h2><button data-open="${s.id}">${esc(s.title)}</button></h2><p>${esc(s.summary)}</p></div><button class="quick-copy" data-copy-text="install-${i}" aria-label="复制${esc(s.title)}的安装说明">复制安装 <span aria-hidden="true">↗</span></button></div>
  <div class="card-meta"><span>${esc(s.category)}</span><span>Skill / ${String(i+1).padStart(2,'0')}</span></div>
</article>`).join('\n');
const dialogs = orderedSkills.map((s, i) => `<dialog class="skill-dialog" id="detail-${s.id}" aria-labelledby="title-${s.id}">
  <button class="close-dialog" aria-label="关闭详情" autofocus>×</button>
  <div class="detail-visual"><div class="detail-preview">${preview(s)}</div><p>${demo.has(s.id) ? '基于虚构活动实际制作并导出了这一套演示物料，保留了改稿前后与源文件；视觉方向尚未经你采用。' : publicCase.has(s.id) ? '来自该 Skill 公开仓库的案例画面。实际结果取决于你的资料、工具与迭代。' : '这项 Skill 暂无可公开的真实案例，因此不展示虚构作品图。'}</p>${demo.has(s.id) ? '<a href="demo/">查看完整演示与源文件 ↗</a><br>' : ''}<a href="${esc(url(s))}" target="_blank" rel="noreferrer">GitHub 源文件 ↗</a></div>
  <div class="detail-content"><span class="detail-category">${esc(s.category)}</span><h2 id="title-${s.id}">${esc(s.title)}</h2><p class="detail-summary">${esc(s.summary)}</p>
  <dl><dt>准备什么</dt><dd>${esc(s.input)}</dd><dt>得到什么</dt><dd>${esc(s.output)}</dd></dl>
  <div class="instruction-heading"><h3>安装到 Codex</h3><button class="copy-action" data-copy-text="install-${i}">复制安装说明</button></div><p class="instruction-hint">把下面这段话发给 Codex，安装一次即可。</p><pre id="install-${i}">请使用 $skill-installer 从 ${esc(url(s))} 安装 Skill。目录为 ${esc(s.path)}，安装名为 ${esc(s.id)}；保留它引用的配套文件。</pre>
  <div class="instruction-heading"><h3>然后这样用</h3><button class="copy-action secondary" data-copy-text="prompt-${i}">复制用法</button></div><pre id="prompt-${i}">${esc(s.prompt)}</pre>
  <p class="skill-boundary">${esc(s.boundary)}</p><p class="skill-stage">${esc(s.stage)} · ${updated}</p>
  </div></dialog>`).join('\n');
writeFileSync(new URL('index.html', dest), `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>设计 Skills｜Z.ONE</title><meta name="description" content="浏览 Joey 的设计 Skill，查看案例，复制安装与用法。从视觉创作到系列物料与网站交付。"><meta name="theme-color" content="#101210"><link rel="icon" href="../../assets/ai-zaowushe-logo.svg" type="image/svg+xml"><link rel="stylesheet" href="skills.css"><script src="skills.js" defer></script></head>
<body><a class="skip-link" href="#skill-list">跳到 Skill 列表</a>
<aside class="sidebar"><a class="brand" href="../../" aria-label="返回 Z.ONE 首页">Z.ONE<span>设计资源库</span></a>
<label class="search" for="skill-query"><span aria-hidden="true">⌕</span><input id="skill-query" type="search" placeholder="搜索海报、Logo、改稿…" aria-label="搜索 Skill"></label>
<nav class="skill-filters" aria-label="按任务筛选"><p>设计 SKILLS</p>${['全部','视觉创作','系列物料','品牌与网站'].map((x,i)=>`<button data-filter="${x}" aria-pressed="${i===0}"><span><i aria-hidden="true">${['▦','✳','▤','◈'][i]}</i>${x}</span><small>${i===0?skills.length:skills.filter(s=>s.category===x).length}</small></button>`).join('')}</nav>
<div class="sidebar-bottom"><a href="https://github.com/joeyhu1108-maker/zone-design-skills" target="_blank" rel="noreferrer">GitHub 总目录 <span>↗</span></a><a href="../">所有设计资源 <span>↗</span></a><p>Joey 的设计方法，随时取用。</p></div></aside>
<main id="skill-list"><header class="gallery-header"><div><h1>设计 Skills<span id="skill-count">9</span></h1><p>先看真实案例，再决定用哪一个。</p></div><div class="gallery-actions"><a href="demo/" class="demo-link">看一套物料怎么做 ↗</a><button class="help-button" data-open="help">怎么使用 <span aria-hidden="true">↗</span></button></div></header>
<div class="skills-grid">${cards}</div><div id="skill-empty" hidden><h2>没有找到相关 Skill</h2><p>试试“海报”“Logo”，或查看全部。</p><button id="clear-filter" class="copy-action">重置筛选</button></div><p class="gallery-note" role="status" aria-live="polite" id="result-status">9 个 Skill · 按需安装，在 Codex 中使用</p><noscript><p>打开 <a href="https://github.com/joeyhu1108-maker/zone-design-skills">GitHub 总目录</a>，查看完整安装说明和用法。</p></noscript></main>
${dialogs}
<dialog class="help-dialog skill-dialog" id="detail-help" aria-labelledby="help-title"><button class="close-dialog" aria-label="关闭详情" autofocus>×</button><div class="detail-content"><span class="detail-category">QUICK START</span><h2 id="help-title">像平时一样，直接说。</h2><p>Skill 把设计方法带进 Codex。你仍然决定目标和风格。</p><ol><li><b>选一个 Skill</b><p>点卡片看适用场景和需要准备的资料。</p></li><li><b>复制安装说明，发给 Codex</b><p>安装一次即可。完成后，在下一轮对话中调用。</p></li><li><b>带上资料，说你要做什么</b><p>复制用法，也可以用自己的话说。目标、风格和修改范围由你决定。</p></li></ol><p class="skill-boundary">本页用于浏览与复制用法，不直接生成图片。图像生成、文件编辑和导出需要相应工具；模型费用按实际执行计量。3 个系列物料 Skill 已完成单场景流程演示，尚未完成跨项目独立行为评测。</p></div></dialog>
<div class="copy-status" role="status" aria-live="polite"></div></body></html>`);
console.log(`Built ${skills.length} skill entries.`);
