# GhostAgent · 演示与项目介绍

## 一句话简介（英文）

GhostAgent turns rough ideas into structured specs and runnable web starters, with a lightweight local-first workflow and an optional AI planning mode.

## About the project（可据实际情况调整）

### Inspiration
Starting a small project often means spending too much time deciding what to build first. GhostAgent makes that first step tangible: a small specification and a working prototype instead of a blank page.

### What it does
GhostAgent turns a short idea into requirements, a design outline, a task checklist and a runnable frontend starter. It supports todo lists, notes and daily habits, with a clearly labelled generic-list fallback for other ideas. Users can preview a starter, save recent projects locally and download a ZIP containing code and Kiro-ready specification files.

### How it works
The default mode runs entirely in the browser using deterministic rules and local templates. An optional Node.js proxy can use an OpenAI-compatible model to refine the plan; credentials remain server-side. Executable starters still come from local templates, and AI-planned features are explicitly distinguished from implemented ones.

### Kiro workflow
The repository includes requirements, design, tasks and steering files under .kiro. They provide a starting point for reviewing and extending the project in Kiro. Add a description of your actual Kiro session here after you have performed and recorded it; do not describe prepared files as proof of past tool usage.

### What is next
Review the specs in Kiro, implement one additional feature, add more starter types, and improve the mapping between requirements and template coverage. Keep the project small and transparent about its limits.

## 2–3 分钟录屏提纲

| 时间 | 展示 | 说明 |
| --- | --- | --- |
| 0:00–0:20 | 首页和项目定位 | “GhostAgent helps turn a rough idea into a small, testable first version.” |
| 0:20–0:55 | 选择待办示例并生成 | 展示原始想法、需求和假设；说明当前是否为模板模式。 |
| 0:55–1:25 | 切换设计、任务、代码和预览 | 新增任务、完成任务、筛选、删除，展示真实交互。 |
| 1:25–1:45 | 下载 ZIP | 展示原型代码和 .kiro/specs 下的三份规格。 |
| 1:45–2:30 | 实际在 Kiro 中打开项目 | 审阅一份规格并完成一次真实小修改；仅展示实际做过的操作。 |
| 2:30–2:50 | 总结与限制 | 说明默认无 API、可选 AI 规划，额外全栈业务仍需实现。 |

若还没有真实使用 Kiro，先完成那一步，再录制相应片段。视频平台、时长和参赛分类请以赛事当期官方页面为准。

## 提交前检查

- [ ] 公开仓库地址实际可访问，根目录含 .kiro。
- [ ] Pages 实际发布成功，打开演示链接完整走通一次。
- [ ] 开发过程中的 Kiro 描述与真实操作一致。
- [ ] 没有将“模板生成”写成实时大模型结果。
- [ ] 已录制、上传并验证演示视频链接。
- [ ] 检查当期官方资格、赛道、奖项和截止时间。
- [ ] 未提交个人密钥、.env 或工作区内无关资料。
