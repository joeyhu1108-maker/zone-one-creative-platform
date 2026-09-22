import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const dest = new URL('../library/skills/', import.meta.url);
mkdirSync(dest, { recursive: true });
if (process.argv[2]) writeFileSync(new URL('catalogue.json', dest), readFileSync(process.argv[2]));
const { skills, updated } = JSON.parse(readFileSync(new URL('catalogue.json', dest)));
const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const repo = s => `https://github.com/joeyhu1108-maker/${s.repo}`;
const url = s => s.path === '.' ? repo(s) : `${repo(s)}/tree/main/${s.path}`;
const cards = skills.map((s, i) => `<article class="skill-card" id="${esc(s.id)}" data-category="${esc(s.category)}" data-search="${esc([s.title,s.id,s.category,s.summary,s.input,s.output].join(' ').toLowerCase())}">
  <div class="card-meta"><span>${esc(s.category)}</span><span>${String(i + 1).padStart(2,'0')}</span></div>
  <h3>${esc(s.title)}</h3><p class="skill-summary">${esc(s.summary)}</p>
  <p class="skill-id">${esc(s.id)}</p>
  <details><summary>看用法 <span aria-hidden="true">＋</span></summary><div class="skill-instructions">
    <dl><dt>你准备</dt><dd>${esc(s.input)}</dd><dt>会得到</dt><dd>${esc(s.output)}</dd></dl>
    <h4>安装后，直接这样说</h4><pre id="prompt-${i}">${esc(s.prompt)}</pre>
    <button class="copy-action" data-copy-text="prompt-${i}">复制用法</button>
    <details class="install-details"><summary>还没安装？</summary><p>复制下面的话，发给 Codex。安装完成后，在下一轮对话中调用。</p><pre id="install-${i}">请使用 $skill-installer 从 ${esc(url(s))} 安装 Skill。目录为 ${esc(s.path)}，安装名为 ${esc(s.id)}；保留它引用的配套文件。</pre><button class="copy-action" data-copy-text="install-${i}">复制安装说明</button></details>
    <p class="skill-boundary">${esc(s.boundary)}</p>
    <p class="skill-stage">${esc(s.stage)}</p>
  </div></details>
  <a class="source-link" href="${esc(url(s))}" target="_blank" rel="noreferrer">查看 GitHub 源文件 <span aria-hidden="true">↗</span></a>
</article>`).join('\n');
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>设计 Skill｜Z.ONE</title><meta name="description" content="Joey 的设计与审美 Skill：材料艺术、钢笔速写、Logo、系列物料与网站交付。找到任务，复制用法，在 Codex 中开始。">
<meta name="theme-color" content="#09120d"><link rel="icon" href="../../assets/ai-zaowushe-logo.svg" type="image/svg+xml">
<link rel="stylesheet" href="../../styles.css"><link rel="stylesheet" href="skills.css"><script src="skills.js" defer></script></head>
<body class="skills-page">
<a class="skip-link" href="#skill-list">跳到 Skill 列表</a>
<header class="site-header module-header"><a class="zone-mark" href="../../" aria-label="返回 Z.ONE 总站"><strong>Z.ONE</strong><span>创意实践与学习平台</span></a><nav aria-label="模块导航"><a href="../../school/">AI造物社</a><a href="../../clinic/">造物门诊</a><a href="../" aria-current="page">设计资源库</a></nav><a class="module-return" href="../">返回资源库 ↗</a></header>
<main>
<section class="skills-hero" aria-labelledby="skills-title">
  <div class="skills-breadcrumb"><a href="../../">Z.ONE</a><span>/</span><a href="../">设计资源库</a><span>/</span><span>设计 Skill</span></div>
  <div class="hero-grid"><div><p class="eyebrow">JOEY’S DESIGN PRACTICE / SKILLS</p><h1 id="skills-title">把设计经验，<br><em>带进下一次创作。</em></h1><p class="hero-intro">从一张图到一套物料。把你想做的事告诉 Codex，<br class="desktop-break">用这些 Skill 延续审美判断，减少反复解释与改稿。</p><a class="skills-cta" href="#skill-list">找到我需要的 Skill <span>↓</span></a></div>
  <div class="reuse-figure" aria-label="流程示意：你决定方向，Skill 复用方法，生成系列物料">
    <p>YOU DECIDE. SKILLS REPEAT.</p><div class="figure-master"><span>你决定</span><strong>方向<br>与审美</strong><i>MASTER / 01</i></div><div class="figure-line"></div><div class="figure-series"><div><span>01</span><b>海报</b></div><div><span>02</span><b>人物</b></div><div><span>03</span><b>导视</b></div></div><small>流程示意 · 固定规则 / 可变内容</small>
  </div></div>
  <div class="hero-foot"><span><b>09</b> 个可用方法</span><span>按需安装 · 对话中调用</span><a href="https://github.com/joeyhu1108-maker/zone-design-skills" target="_blank" rel="noreferrer">GitHub 总目录 ↗</a></div>
</section>
<section class="skills-catalogue" id="skill-list" aria-labelledby="catalogue-title"><div class="catalogue-heading"><div><p class="eyebrow">START WITH A TASK</p><h2 id="catalogue-title">这次，你想做什么？</h2></div><p>找到一项，展开用法。<br>你可以从任何地方开始。</p></div>
<div class="skill-controls"><div class="skill-filters" role="group" aria-label="按任务筛选">${['全部','视觉创作','系列物料','品牌与网站'].map((x,i)=>`<button data-filter="${x}" aria-pressed="${i===0}">${x}</button>`).join('')}</div><div class="skill-search"><label for="skill-query">搜索 Skill</label><input id="skill-query" type="search" placeholder="海报、Logo、改稿…"></div></div>
<p class="result-count" role="status" aria-live="polite"><span id="skill-count">9</span> 个 Skill</p><div class="skills-grid">${cards}</div><div id="skill-empty" hidden><h3>还没找到对应的 Skill</h3><p>换个关键词，或查看全部方法。</p><button id="clear-filter" class="copy-action">重置筛选</button></div>
<noscript><p>所有 Skill 都已展示，可以展开说明并手动复制文字。</p></noscript></section>
<section class="skills-combination" aria-labelledby="combination-title"><div><p class="eyebrow">ONE PROJECT, LESS REWORK</p><h2 id="combination-title">一套活动，<br>不用每次从头来。</h2><p>你先决定活动要做什么、采用什么视觉。<br>其余按当前任务，叫来需要的 Skill。</p></div><div class="combination-examples"><a href="#design-master-extension"><span>主视觉已经定了</span><strong>“照这个做 6 张嘉宾海报。”</strong><small>定稿延展 ↗</small></a><a href="#design-scoped-revision"><span>反馈来了</span><strong>“姓名都大一点，第二张保留。”</strong><small>按范围改稿 ↗</small></a><a href="#design-batch-delivery"><span>准备交付</span><strong>“重出改过的，和源文件一起打包。”</strong><small>整套物料交付 ↗</small></a></div></section>
<section class="skills-notes" aria-labelledby="notes-title"><h2 id="notes-title">开始前，知道这些就够了</h2><div><p><b>Skill 是方法，Codex 是执行入口。</b>安装后，把任务与资料一起交给 Codex。生成图像、编辑文件和导出，需要运行环境提供相应工具；本页用于查看用法，不直接生成图片。</p><p><b>只调用需要的能力。</b>已有模板换字、规则计算优先交给程序；需要新视觉时再调用模型。模型消耗按实际执行计量。</p><p><b>首批 9 个，持续整理。</b>3 个系列物料 Skill 为首发版本，已检查规则与文件结构，尚未完成独立模型行为评测；其余 6 个指向已有公开仓库。更新于 ${updated}。</p></div></section>
</main><footer class="skills-footer"><a href="../../">Z.ONE</a><span>设计经验，可重复使用。</span><a href="../">返回设计资源库 ↗</a></footer><div class="copy-status" role="status" aria-live="polite"></div>
</body></html>`;
writeFileSync(new URL('index.html', dest), html);
console.log(`Built ${skills.length} skill entries.`);
