# Z.ONE Creative Platform

公网入口：<https://zone-one-creative-platform.joeyhu1108.workers.dev/>

Z.ONE 现在使用清晰的三级关系：

1. **一级总站**：只介绍 Z.ONE、展示正在发生的内容，并让访问者选择方向。
2. **二级模块页**：AI造物社、造物门诊、设计资源库各自承担一个明确任务，并始终保留面包屑、返回总站和模块切换。
3. **具体行动**：进入 Eazo / Codex 课程、生成预诊问题，或打开外部灵感与工具网站。

三个二级模块分别是：

1. **AI造物社**：课程、活动和共同创作。当前开放 Eazo 首作课与 Codex 创作课；Vibe Motion 是正在制作的 Z.ONE 原创重点模块。
2. **造物门诊**：基于 Z1 Interaction Review 的输入与诊断逻辑，展示截图、截图组、录屏三种证据入口。
3. **设计资源库**：基于 ZONE Design 的任务式资源发现方法，提供精选灵感和工具入口。

## 当前边界

- 这是可部署的静态前端整合版。
- 登录、积分和造物门诊均为浏览器本地原型，不会上传账号或素材。
- Z1 的本地知识库、MCP、模型分析和生产账号后端没有被打包进静态站。
- AI造物社的 Eazo 与 Codex 完整课程继续使用各自独立的课程页面；它们通过 `/school/` 课程中心进入，不再从总站直接跳出。

## 本地查看

```bash
python3 -m http.server 8890
```

打开 <http://127.0.0.1:8890/>。

## 验收

```bash
NODE_PATH=/path/to/playwright/node_modules node scripts/smoke.cjs
```

验收覆盖桌面与手机布局、一级总站三模块入口、三个二级页的层级路径与返回路线、内容筛选、课程级别、Vibe Motion 提示词、门诊预诊和资源搜索。

## 已有模块

### 设计 Skill 用法库

- 入口：[/library/skills/](https://zone-one-creative-platform.joeyhu1108.workers.dev/library/skills/)
- 原始目录：[zone-design-skills](https://github.com/joeyhu1108-maker/zone-design-skills)，本次同步版本 `e35b2ff`。
- 首批 9 个 Skill：已有 6 个公开仓库加 3 个新发布的系列物料 Skill。提供任务筛选、搜索、输入输出说明、复制用法及安装说明。
- 本页为静态使用指南，不请求模型、不接收用户 API Key、不在网页中执行设计任务。

更新目录时，先修改 `zone-design-skills/catalogue.json`，再将该文件同步到本站并重新构建页面：

```bash
node scripts/build-skills.mjs /path/to/zone-design-skills/catalogue.json
node scripts/build-static.mjs
```

不传目录路径时，构建器使用已提交的 `library/skills/catalogue.json`。生成的 HTML 可在禁用 JavaScript 时阅读；JavaScript 仅负责筛选、复制与定位。发布目录仅包含明确列出的网页资产，不包含仓库历史和开发文件。

使用已安装的 Wrangler 在正确 Cloudflare 账号执行 `wrangler deploy`。发布前核对 Worker 名称 `zone-one-creative-platform`；发布后检查总站 → 设计资源库 → 设计 Skill 的路径、搜索、展开用法与复制反馈。

- [AI造物社 Codex 创作课](https://ai-zaowushe-codex-course.pages.dev/)
- [AI造物社 Eazo 首作课](https://ai-zaowushe-creator-course.pages.dev/)
- [ZONE Design](https://zone-design.tlabel-optimus-workbench-clone.workers.dev/)
- Vibe Motion：Z.ONE 原创模块，正在制作，暂未开放下载
