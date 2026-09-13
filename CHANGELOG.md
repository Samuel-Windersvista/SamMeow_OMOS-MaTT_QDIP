# 变更记录

本仓库（SamMeow QDIP 快速部署整合包）的版本变更记录。格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号取自 `tools/components.json`。各组件版本与来源见 README「组件来源清单」。

## [0.4.0] - 2026-09-11

构建产物：`build/qdip-generic-0.4.0.zip`

### 破坏性变更
- **移除 superpowers 插件**：本机环境已不再加载 superpowers（从插件数组删除、`node_modules/superpowers` 目录消失）。分发产物不再包含 `plugins/superpowers`，`opencode.json` 插件段、`更新组件.bat` 与启动自检同步去除。玩家需**重新解压**新版整合包，而非覆盖更新。
- **默认预设切换 `superpowers-bridge` → `matt-bridge`**：`oh-my-opencode-slim.json` 仅保留 `matt-bridge` 预设（含 per-agent 技能路由）；首次引导页的模型分配写入该预设。

### 变更
- **opencode CLI 升级 1.18.27 → 1.18.30**（离线制品 `tools/cache/opencode-1.18.30`）。
- **技能库来源重排**：Matt 技能迁至 `~/.agents/skills`（38 个），OMO 自有技能保留在 `~/.config/opencode/skills`（9 个）；两者合并部署到产物 `opencode/config/opencode/skills`，共 47 个技能。
- 组件清单版本 0.3.4 → 0.4.0。
- 构建编排新增产物断言：技能目录技能数为 47、产物不含 superpowers 插件目录、产物 `opencode.json` 插件段无 superpowers。
- `preferences.md` 同步本机（补齐架构报告 HTML 一律简体中文的规则行）。

### 修复
- 修正 config-writer 测试中过时的 `instructions === undefined` 断言（模板自 0.3.4 起自带 `{env:QDIP_PREFERENCES}` instructions，断言改为"未注入 persona 指令"）。

## [0.3.4] - 2026-09-08

构建产物：`build/qdip-generic-0.3.4.zip`

### 新增
- **个人倾向文件 `preferences.md` 纳入分发**：同步自本机偏好档案（v2，2026-09-08 按 Matt Pocock 思想重构）。随包部署到 `opencode\config\opencode\preferences.md`；`opencode.json` 经 `instructions: ["{env:QDIP_PREFERENCES}"]` 引用，由 `启动.bat`/`进入环境.bat` 注入该环境变量（正斜杠路径，防 JSON 转义），与 `QDIP_MCP_CHROME` 同机制。
- **matt-skills 技能库更新 2026-09-05 → 2026-09-08**：24 → 34 个技能。新增 10 个：`ask-matt`（技能路由器）、`implement`（最小实现）、`to-spec`/`to-tickets`（会话转 spec/工单）、`tdd`（Matt 版测试驱动开发）、`diagnosing-bugs`（修 bug 流水线）、`improve-codebase-architecture`（架构深化扫描）、`teach`（知识传授）、`to-questionnaire`（决策转问卷）、`wait-what`（未传达重述）。
- 工作流诊断报告纳入 `docs/`：`workflow-diff-and-recommendations.md`、`matt-pocock-workflow-report.md`（维护者参考，不进分发包）。

### 变更
- **工作流按 Matt Pocock 思想重构**（随 preferences.md v2）：任务入口判定表（单窗口/多窗口/超大规划/修 bug/查资料/配置/小改动）、`grill-with-docs` 钉清开放决策、会话边界顺序（continue → clear → handoff → subagent → compact）。

### 修复
- 无。

## [0.3.3] - 2026-09-05

构建产物：`build/qdip-generic-0.3.3.zip`

### 修复
- **matt-skills 技能库缺失**：matt 套技能原先部署到包根 `opencode/skills`，依赖 `opencode.json` 中 `skills.paths` 注册——但 opencode 1.18.27 的技能加载只认全局技能目录（`$XDG_CONFIG_HOME/opencode/skills`，即产物 `opencode/config/opencode/skills`），且 `skills.paths` 相对路径按启动工作目录解析、不生效。修复：matt-skills 部署目标改为 `opencode/config/opencode/skills`（与 opencode 默认全局技能扫描目录一致），并移除无效的 `skills.paths` 配置。验证：产物环境下 `opencode debug skill` 从 16 个技能恢复到 40 个（matt 套 24 个全部出现）。
- **启动器与快速入口编码损坏**：`启动.bat`/`进入环境.bat` 曾被以 UTF-8 保存，中文内容损坏（部分变替换字符），CMD（GBK 代码页）下中文路径判定失败——`启动.bat --check` 报"进入环境.bat missing"、插件加载误报、MCP 环境变量被污染导致 opencode 配置解析异常。修复：从 0.2.0 完好基线恢复为 GBK 编码，并补回 0.3.x 新增的 `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` 与 `QDIP_MCP_CHROME` 注入逻辑。验证：`启动.bat --check` 全绿（node/插件/Windows Terminal/进入环境.bat 无 FAIL）。

### 新增
- `README.md`（包结构说明，玩家视角）与 `CHANGELOG.md`（版本变更记录）纳入分发，随包发布。

## [0.3.2] - 2026-09-05

构建产物：`build/qdip-generic-0.3.2.zip`

### 修复
- **MCP 路径导致 opencode 配置解析失败**：`启动.bat`/`进入环境.bat` 注入的 `QDIP_MCP_CHROME` 由 Windows 反斜杠路径改为正斜杠（`D:/...`）。根因：opencode 对 `{env:...}` 占位符先做文本替换再解析 JSON，反斜杠（`\q`、`\c`）成为非法转义字符，报 `InvalidEscapeCharacter`。Windows/Node 均接受正斜杠路径，行为不变。

## [0.3.1] - 2026-09-05

构建产物：`build/qdip-generic-0.3.1.zip`

### 新增
- 用量/配额显示插件 `opencode-quota` 3.8.3 纳入打包（`plugins/opencode-quota`）
- `quota-runtime`：opencode-quota 运行时依赖（comment-json/xdg-basedir/solid-js 等）经 `tools/quota-runtime` 清单 vendored 并合并
- `进入环境.bat`（进入已配置环境的快速入口）、`tui.json`（TUI 外观配置模板）纳入分发
- 玩家使用指南扩充

### 变更
- opencode CLI 升级 1.18.25 → 1.18.27
- OMOslim 升级 2.2.17+patch-kit → 2.2.18+patch-kit
- matt-skills 更新 2026-08-24 → 2026-09-05
- `omoslim-runtime` 升级为 `2.2.18-deps+tui`：纳入 @opentui TUI 全家桶（@opentui/core、@opentui/solid、solid-js）

## [0.3.0] - 2026-09-05

构建产物：`build/qdip-generic-0.3.0.zip`

### 新增
- Chrome DevTools MCP `chrome-devtools-mcp` 1.8.0 纳入打包（`mcp/chrome-devtools-mcp`，浏览器自动化）

## [0.2.0] - 2026-09-05

构建产物：`build/qdip-generic-0.2.0.zip`

### 新增
- 便携 Windows Terminal 1.24.11911.0 纳入打包（`runtime/terminal`）
- matt-skills 全套技能纳入打包（`opencode/skills`）
- 引导页升级：Vault-Tec persona 化 + 按代理（agent）配置模型分配 UI；配置写入器扩展（model 字段、models 列表）
- deepseek v4 模型名修正 + kimi-for-coding 使用提示

### 修复
- 配置路径修复（F1-F5）：auth.json 落位 XDG_DATA_HOME 的 opencode 段、opencode 配置路径归 XDG 段、插件/技能相对路径修正、`local/` 玩家本地修改区、分发时剥离 `plugins/superpowers/.github`
- 组件更新脚本：更新后的二进制落位 `opencode/bin`（此前落错路径）
- 启动.bat 编码修正（GBK，兼容中文 cmd 解析）

## [0.1.0] - 2026-08-31

初始版本。

### 新增
- 项目骨架：需求说明书、通用版 spec、实施计划、`templates/` 模板目录
- 组件清单 `tools/components.json`（7 组件：便携 Node 24.14.1、opencode CLI 1.18.25、OMOslim 2.2.17+patch-kit、OMOslim 自定义片段、superpowers 6.3.0、matt-skills 2026-08-24 等）
- 启动器 `启动.bat`：便携环境注入（PATH/XDG_*）+ 首次引导门（`data/.configured` 哨兵，未配置时拉起引导服务）
- 首次引导服务 `guide-server.js` + 引导页 `first-run.html`：浏览器配置 API key，验证连通性后落盘写入便携配置目录
- 打包脚本 `tools/build.ps1`（5 阶段流水线：清理 → 复制组件 → 部署模板 → 校验 → 压缩 zip）
- 组件更新脚本 `更新组件.bat`
- 玩家使用指南、验证清单
