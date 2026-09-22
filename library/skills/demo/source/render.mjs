import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const sourceDir = dirname(fileURLToPath(import.meta.url));
const root = join(sourceDir, '..');
const data = JSON.parse(await readFile(join(sourceDir, 'event.json'), 'utf8'));
if (data.fictional !== true) throw new Error('This public demo must remain fictional.');
const C = { paper: '#F2F0E9', ink: '#151619', red: '#F04C36', muted: '#656666' };
const FONT = 'PingFang SC, Noto Sans CJK SC, Microsoft YaHei, sans-serif';
const MONO = 'Arial, Helvetica, sans-serif';

function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
}
function text(x, y, value, size, fill = C.ink, weight = 700, extra = '') {
  return '<text x="' + x + '" y="' + y + '" fill="' + fill + '" font-size="' + size +
    '" font-weight="' + weight + '" font-family="' + FONT + '" ' + extra + '>' + esc(value) + '</text>';
}
function mono(x, y, value, size = 22, fill = C.ink) {
  return '<text x="' + x + '" y="' + y + '" fill="' + fill + '" font-size="' + size +
    '" font-weight="700" font-family="' + MONO + '" letter-spacing="2">' + esc(value) + '</text>';
}
function rule(x1, y, x2, color = C.ink, opacity = 1, width = 2) {
  return '<path d="M' + x1 + ' ' + y + 'H' + x2 + '" stroke="' + color + '" stroke-width="' +
    width + '" opacity="' + opacity + '"/>';
}
function svg(w, h, parts) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h +
    '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="虚构活动：未完成的现场">\n' +
    parts.join('\n') + '\n</svg>\n';
}
function polar(r, angle) {
  return [(r * Math.cos(angle)).toFixed(2), (r * Math.sin(angle)).toFixed(2)];
}
function disc(cx, cy, scale) {
  const pieces = [];
  pieces.push('<g transform="translate(' + cx + ' ' + cy + ') scale(' + scale + ')">');
  pieces.push('<circle r="296" fill="' + C.red + '"/>');
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const b = a + (0.020 + (i % 5) * 0.002);
    const c = a + (0.086 + (i % 4) * 0.003);
    const d = a + 0.118;
    const inner = 82 + (i % 7) * 3;
    const outer = 230 + (i % 6) * 10;
    const p1 = polar(inner, a);
    const p2 = polar(outer, b);
    const p3 = polar(outer + 8, c);
    const p4 = polar(inner + 11, d);
    pieces.push('<path d="M' + p1.join(' ') + ' L' + p2.join(' ') + ' L' +
      p3.join(' ') + ' L' + p4.join(' ') + ' Z" fill="' +
      (i % 8 === 0 ? C.paper : C.ink) + '" opacity="' + (i % 8 === 0 ? '.92' : '.9') + '"/>');
  }
  pieces.push('<circle r="84" fill="' + C.paper + '"/>');
  pieces.push('<circle r="58" fill="' + C.ink + '"/>');
  pieces.push('<path d="M-32 -16 H31 M-32 0 H12 M-32 16 H31" fill="none" stroke="' +
    C.paper + '" stroke-width="6" stroke-linecap="square"/>');
  pieces.push('<circle r="283" fill="none" stroke="' + C.ink + '" stroke-width="2"/>');
  pieces.push('</g>');
  return pieces.join('');
}
function sharedMark(x, y, color = C.ink) {
  return mono(x, y, 'Z.ONE / OPEN STUDIO', 19, color);
}
function mainPoster(title) {
  const p = ['<rect width="1080" height="1440" fill="' + C.paper + '"/>'];
  p.push(sharedMark(55, 72));
  p.push(mono(840, 72, 'NO. 001', 18));
  p.push(rule(55, 102, 1025));
  p.push(mono(55, 157, 'WORK IN PUBLIC  /  2026', 20, C.red));
  p.push(text(43, 355, '未完成', 170, C.ink, 900, 'letter-spacing="-9"'));
  p.push(text(43, 524, '的现场', 170, C.ink, 900, 'letter-spacing="-9"'));
  p.push(mono(59, 590, 'THE UNFINISHED STUDIO', 24));
  p.push(disc(773, 822, 1.0));
  p.push('<path d="M56 746 V1066 H360" fill="none" stroke="' + C.ink + '" stroke-width="2"/>');
  p.push(mono(72, 778, 'BRING AN IDEA', 22));
  p.push(mono(72, 812, 'LEAVE IT OPEN', 22));
  p.push('<rect y="1119" width="1080" height="321" fill="' + C.ink + '"/>');
  p.push(mono(58, 1174, 'ONE DAY / MANY POSSIBILITIES', 19, C.red));
  p.push(text(50, 1286, title, 84, C.paper, 800, 'letter-spacing="-3"'));
  p.push(rule(56, 1313, 1024, C.paper, .4, 1));
  p.push(mono(57, 1376, data.date + '  /  ' + data.hours, 24, C.paper));
  p.push(mono(598, 1376, data.venueName, 24, C.paper));
  p.push(text(909, 1413, '虚构演示', 21, C.paper, 500));
  return svg(1080, 1440, p);
}
function programme(title) {
  const p = ['<rect width="1080" height="1440" fill="' + C.paper + '"/>'];
  p.push(sharedMark(55, 72));
  p.push(mono(864, 72, 'NO. 002', 18));
  p.push(rule(55, 102, 1025));
  p.push(disc(879, 268, 0.64));
  p.push(mono(55, 162, 'PROGRAMME  /  ' + data.date, 20, C.red));
  p.push(text(47, 344, title, 117, C.ink, 900, 'letter-spacing="-5"'));
  p.push(text(53, 428, data.project, 59, C.ink, 700, 'letter-spacing="-2"'));
  p.push(rule(55, 478, 1025, C.ink, 1, 3));
  data.programme.forEach((slot, i) => {
    const y = 567 + i * 196;
    p.push(mono(55, y, slot.time, 41, C.red));
    p.push(text(312, y + 1, slot.chinese, 53, C.ink, 800));
    p.push(mono(315, y + 39, slot.english, 18, C.muted));
    p.push(text(314, y + 83, slot.note, 25, C.muted, 500));
    p.push(rule(55, y + 124, 1025, C.ink, .27, 1));
  });
  p.push('<rect y="1174" width="1080" height="266" fill="' + C.ink + '"/>');
  p.push(mono(58, 1232, 'OPEN  /  ' + data.hours, 24, C.red));
  p.push(text(51, 1348, '带着未完成，来到现场。', 58, C.paper, 700));
  p.push(mono(57, 1405, data.venueName + '  /  FICTIONAL VENUE', 18, C.paper));
  p.push(text(916, 1407, '虚构演示', 20, C.paper, 500));
  return svg(1080, 1440, p);
}
function sign() {
  const p = ['<rect width="1600" height="900" fill="' + C.red + '"/>'];
  p.push(sharedMark(70, 77));
  p.push(mono(1274, 77, 'NO. 003', 18));
  p.push(rule(70, 110, 1530, C.ink, 1, 3));
  p.push(mono(70, 185, 'WAYFINDING / ONE CLEAR ACTION', 23));
  p.push(text(57, 440, data.directionSignException, 214, C.paper, 900, 'letter-spacing="-10"'));
  p.push(text(70, 625, '入口直行', 125, C.ink, 800, 'letter-spacing="-5"'));
  p.push(disc(1328, 452, 1.02));
  p.push('<path d="M1020 452 H1493 M1334 295 L1493 452 L1334 609" fill="none" stroke="' +
    C.paper + '" stroke-width="72" stroke-linecap="square" stroke-linejoin="miter"/>');
  p.push('<rect y="758" width="1600" height="142" fill="' + C.ink + '"/>');
  p.push(mono(70, 844, data.date + '  /  ' + data.hours, 34, C.paper));
  p.push(mono(977, 844, data.venueName, 34, C.paper));
  p.push(text(1408, 873, '虚构演示', 23, C.paper, 500));
  return svg(1600, 900, p);
}

const files = [
  { id: 'main-poster', size: [1080, 1440], history: 'history/01-main-poster-v1.svg',
    current: 'exports/01-main-poster.svg', before: mainPoster(data.seriesTitleBefore), after: mainPoster(data.seriesTitleAfter), changed: true },
  { id: 'program-card', size: [1080, 1440], history: 'history/02-program-card-v1.svg',
    current: 'exports/02-program-card.svg', before: programme(data.seriesTitleBefore), after: programme(data.seriesTitleAfter), changed: true },
  { id: 'entry-sign', size: [1600, 900], history: 'history/03-entry-sign-v1.svg',
    current: 'exports/03-entry-sign.svg', before: sign(), after: sign(), changed: false }
];
const sha = content => createHash('sha256').update(content).digest('hex');
for (const file of files) {
  await writeFile(join(root, file.history), file.before);
  await writeFile(join(root, file.current), file.after);
  if (file.changed && sha(file.before) === sha(file.after)) throw new Error(file.id + ' should have changed');
  if (!file.changed && sha(file.before) !== sha(file.after)) throw new Error(file.id + ' should be unchanged');
}
const manifest = {
  title: data.project + '｜' + data.seriesTitleAfter,
  status: '虚构演示；实际完成设计、范围改稿与 SVG 导出；未获用户视觉采用',
  source: ['source/event.json', 'source/visual-system.md', 'source/render.mjs'],
  revision: {
    request: '主海报与日程卡：开放日 → 创作开放日；入口导视保留“开放日”用于远距识别',
    scope: ['main-poster', 'program-card'],
    exception: ['entry-sign'],
    futureDefault: false
  },
  files: files.map(file => ({
    id: file.id, size: file.size, format: 'SVG', status: '演示成品／未采用',
    source: 'source/render.mjs', before: file.history, output: file.current,
    changedInRevision: file.changed,
    beforeSha256: sha(file.before), outputSha256: sha(file.after)
  })),
  checks: {
    count: files.length,
    sizes: '3 个 SVG 均声明了像素尺寸与 viewBox',
    currentVersions: '2 个目标项已更新；入口导视与修改前 SHA-256 相同',
    dependency: 'SVG 无外链图片或在线字体；文字为可编辑 text 元素',
    limits: '未进行印刷出血、CMYK 或实物检查'
  }
};
await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Rendered ' + files.length + ' fictional materials, 2 revised, 1 preserved.');
