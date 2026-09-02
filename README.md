# Z.ONE Creative Platform

Z.ONE 的前端整合入口，先把三个现有方向放进同一套清晰的信息架构：

1. **AI造物社**：课程、活动和共同创作。当前开放 Eazo 首作课与 Codex 创作课；Vibe Motion 是正在制作的 Z.ONE 原创重点模块。
2. **造物门诊**：基于 Z1 Interaction Review 的输入与诊断逻辑，展示截图、截图组、录屏三种证据入口。
3. **设计资源库**：基于 ZONE Design 的任务式资源发现方法，提供精选灵感和工具入口。

## 当前边界

- 这是可部署的静态前端整合版。
- 登录、积分和造物门诊均为浏览器本地原型，不会上传账号或素材。
- Z1 的本地知识库、MCP、模型分析和生产账号后端没有被打包进静态站。
- AI造物社的 Eazo 与 Codex 完整课程继续使用各自独立的课程页面；本仓库负责统一入口和后续课程层级。

## 本地查看

```bash
python3 -m http.server 8890
```

打开 <http://127.0.0.1:8890/>。

## 验收

```bash
NODE_PATH=/path/to/playwright/node_modules node scripts/smoke.cjs
```

验收覆盖桌面与手机布局、三模块入口、内容筛选、课程级别、Vibe Motion 提示词、门诊预诊、资源搜索与本地会员原型。

## 已有模块

- [AI造物社 Codex 创作课](https://ai-zaowushe-codex-course.pages.dev/)
- [AI造物社 Eazo 首作课](https://ai-zaowushe-creator-course.pages.dev/)
- [ZONE Design](https://zone-design.tlabel-optimus-workbench-clone.workers.dev/)
- Vibe Motion：Z.ONE 原创模块，正在制作，暂未开放下载
