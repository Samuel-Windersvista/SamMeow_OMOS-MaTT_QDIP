# OpenCode 体系 Resources

适用版本：QDIP 0.6.0（环境快照 2026-09-30）

> 核实日期：2026-09-30（QDIP 重同步校正；初版 2026-09-16 librarian 现场扫描）。版本与文档更新频繁，引用前建议重新核实。

## Knowledge

### opencode 官方文档（本体）
- [opencode 文档主页](https://opencode.ai/docs)
  安装、CLI、`/init`、plan/build 模式、`/undo`、`/share`。用于：任何"opencode 本体怎么用"的问题。
- [TUI 使用与快捷键](https://opencode.ai/docs/tui)
  启动 TUI、`@` 引用文件、`!` 执行命令、`/connect`、`/compact`、`/sessions`、`/models`、会话列表与子会话导航。用于：日常操作、会话管理、上下文压缩。
- [快捷键参考](https://opencode.ai/docs/keybinds)
  `tui.json` 键位 schema、leader 键（ctrl+x）、会话/模型/代理切换。用于：改键位、查快捷键。
- [Agent Skills](https://opencode.ai/docs/skills)
  `SKILL.md` 的发现机制、frontmatter、权限、按代理覆盖。用于：理解 skill 系统如何加载——本课程核心机制之一。
- [Agents / 子代理](https://opencode.ai/docs/agents)
  内置 primary/subagent、JSON/Markdown 配置、权限与 task 权限。用于：理解 @explorer/@fixer 这类子代理的底层机制。
- [配置文件](https://opencode.ai/docs/config)
  `opencode.json` / `tui.json` 的位置、优先级、providers、agents、MCP、plugins、权限、压缩设置。用于：查任何配置项。
- [MCP 服务器](https://opencode.ai/docs/mcp-servers)
  本地/远程 MCP 配置、OAuth、`opencode mcp auth/list/debug`。用于：接外部工具与知识库（如 spt-mcp）。
- [Providers](https://opencode.ai/docs/providers) / [Models](https://opencode.ai/docs/models)
  75+ 服务商接入、`/connect`、模型选择与 variant。用于：模型选型与费用问题。
- [Plugins](https://opencode.ai/docs/plugins)
  本地/npm 插件、加载顺序、hooks。用于：理解 OMOslim / quota 这类插件如何工作。
- [Rules / AGENTS.md](https://opencode.ai/docs/rules)
  项目/全局规则文件、渐进披露。用于：写自己的规则文件（对应你的 preferences.md）。
- [自定义命令](https://opencode.ai/docs/commands) / [分享](https://opencode.ai/docs/share)
  自定义斜杠命令、会话分享隐私设置。

### 体系组件
- [oh-my-opencode-slim（GitHub）](https://github.com/alvinunreal/oh-my-opencode-slim)
  你的编排插件上游。README 覆盖：预设（`/preset`）、议会（`@council`）、后台编排、代理团队、附带 skills。本机/包内加载 v2.2.18；上游最新已到 v3.0.1（升级评估已完成、尚未迁移）。用于：预设与代理行为的权威解释。
- [superpowers（GitHub，obra/Jesse Vincent）](https://github.com/obra/superpowers)
  技能框架与开发方法论：brainstorming → writing-plans → executing-plans → TDD → code-review → finishing-a-branch。MIT 许可。**当前环境未安装为技能、默认不激活**；流程主线是 Matt 技能链（grill-with-docs → to-spec → to-tickets → implement），仅在用户点名时才考虑 superpowers。用于：理解"流程技能"这一层的备选来源。
- [Matt Pocock skills（GitHub）](https://github.com/mattpocock/skills)
  你整套工程 skills 的源头（grill-with-docs、to-spec、to-tickets、implement、code-review、wayfinder……）。用于：查技能原始设计与更新。
- [AI Hero：/grill-with-docs 介绍](https://www.aihero.dev/skills-grill-with-docs)
  主链路原文：`grill-with-docs → to-spec → to-tickets → implement → code-review`。用于：理解"为什么先追问再动手"。
- [AI Hero：/to-spec](https://www.aihero.dev/skills-to-spec) / [/to-tickets](https://www.aihero.dev/skills-to-tickets)
  spec 综合与 tracer-bullet 工单拆分。用于：多窗口任务链路。
- [AI Hero：TDD 技能](https://www.aihero.dev/skill-test-driven-development-claude-code)
  red/green/refactor 垂直切片、好测试与坏测试。用于：implement 内部驱动逻辑。
- [AI Hero：AGENTS.md 完全指南](https://www.aihero.dev/a-complete-guide-to-agents-md) / [Plan Mode 介绍](https://www.aihero.dev/plan-mode-introduction)
  指令预算、渐进披露；计划模式循环。用于：写规则文件、理解计划模式。

### 方法论（跨工具通用）
- [Anthropic：Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents)
  工作流 vs 代理、路由、并行、orchestrator-workers 模式。用于：理解你体系"编排层"的设计原理。
- [Simon Willison：Agentic Engineering Patterns](https://simonwillison.net/guides/agentic-engineering-patterns/)
  子代理、红绿 TDD、测试与 Git 习惯的实战模式集。用于：提升工作流质量的思路来源。

### 本地一手资料（本机）
- `C:\Users\Winde\.config\opencode\preferences.md`
  你的"宪法"——任务入口判定、会话边界、委派规则的最终裁决。用于：任何路由与流程问题的第一答案。
- `E:\云文件\GitHub\Meow-omo-slim-superpowers-patch-kit\docs\architecture.md`
  补丁工具包架构文档：Superpowers 负责流程控制、OMO Slim 提供 worker 席位。用于：理解两层如何咬合。
- `E:\云文件\GitHub\SamMeow_OMOS+MaTT_QDIP\README.md`
  QDIP 构建仓库说明：目录结构、组件来源清单（含各组件版本）、维护者工作流。用于：分发、部署与组件版本相关问题。

## Wisdom (Communities)
- [OpenCode Discord](https://discord.gg/opencode)
  官方社区。用于：版本升级疑难、插件问题、和其他用户交流工作流。
- [opencode GitHub Issues](https://github.com/anomalyco/opencode)
  官方源码仓库与问题追踪。用于：确认 bug、搜历史 issue。
- [OMO-slim Telegram](https://t.me/boringdystopiadevelopment)
  上游作者频道（README 链接）。用于：插件更新动态、上游讨论。
- 待核实：Reddit 相关板块（r/LocalLLaMA 等）扫描时不可达，未验证，暂不收录。

## Gaps
- 中文社区资源（B 站/知乎/贴吧的 OpenCode 或 OMOslim 教程）尚未调研——若你需要面向中文观众的引用，需补一轮搜索。
- OMOslim v3.0.1（相对 v2.2.18）的变化：升级评估已完成（见 2026-09-30 侦察报告第三节），尚未迁移——迁移前需按评估结论专项实施。
