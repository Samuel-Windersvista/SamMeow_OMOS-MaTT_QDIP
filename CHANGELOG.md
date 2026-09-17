# 变更记录

本仓库（SamMeow QDIP 快速部署整合包）的版本变更记录。格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号取自 `tools/components.json`。各组件版本与来源见 README「组件来源清单」。

## [Unreleased]

### 计划性变更
- **`templates/验证清单.md` 改造为维护者侧的 `docs/发布前检查清单.md` 并移出分发产物**：原文件内容（5 步上手 + FAQ 对照 + 重置/更新）已被 `templates/玩家使用指南.md` 完全覆盖，对玩家无增量；改造后是维护者侧的发布前逐条检查清单，不随包分发。`tools/layout.json` 删除 `checklist` 条目（deploy 16 → 15），产物不再包含 `验证清单.md`。
- **产物 `setup/` 不再分发测试文件与内部地图**：`templates/setup/config-writer.test.js`、`guide-server.test.js`、`codemap.md` 原先随 `dir` 内容合并进入产物，现由 `tools/layout.json` 的 `exclude` 声明排除。产物 `setup/` 只含 `config-writer.js`、`contract.js`、`first-run.html`、`guide-server.js`、`wt-profile.ps1` 五项。

### 新增
- **包布局单一声明 `tools/layout.json`**：15 条 `deploy` 声明（`name` / `source` / `target` / `kind` = `file` | `dir` | `emptydir` / `optional` / `exclude`）。`build.ps1` 的 [3/5] 阶段只按声明执行——增删部署条目不再需要改脚本。
- **产物校验器 `tools/verify-package.js`**：零依赖，导出纯函数 `verifyPackage({ outDir, componentsFile, layoutFile })`，另可直接作 CLI（退出码 0/1/2）。把原先内联在 `build.ps1` 的异质断言收敛为 9 条规则：`layout/component-missing`、`layout/deploy-missing`、`layout/excluded-present`、`runtime/missing`、`skills/missing`、`skills/collision`、`plugin/unresolved`、`config/unparseable`、`env/unbound`。违规记录固定为 `{ rule, path, detail }`。
- **文档/地图层校验器 `tools/check-docs.js`**：零依赖，导出纯函数 `checkDocs({ repoRoot })` 与 `describeScope({ repoRoot })`，违规记录同为 `{ rule, path, detail }`；另可直接作 CLI（`node tools/check-docs.js`，打印 `[SCOPE]`）。三条规则——`docs/path-missing`（反引号路径候选按三种基准解析：仓库根含去空格二次尝试、最新构建产物 `build/qdip-generic-*`、仓库自有文件 basename 索引；无产物时产物路径整类跳过并计入 `describeScope().skippedProductPaths`，不静默变成空操作）、`docs/encoding-broken`（按声明编码解码，禁止 U+FFFD 与私用区字符）、`docs/bom-missing`（`.ps1` 必须带 UTF-8 BOM，其余受检扩展名必须不带）。配套测试 `tools/check-docs.test.js` 含「真实仓库零违规」回归锁与「历史事故回归」探针（`docs/ 验证方案` 与 `安装到系统.bat`）。
- **便携环境模块 `templates/env.bat`**：便携环境的唯一定义处（`ROOT` / `PATH` / `XDG_*` / `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` / `QDIP_*` / `ROOTS` / `WSDIR`），内部推导后用 `endlocal & set` 导出，由两个启动器 `call` 复用。
- **构建期版本闸门**：`tools/components.json` 新增 `verifyVersion` 声明（`exe` / `args` / `strip`），`check-sources.ps1` 在复制前运行探针并比对实物版本。当前覆盖 `node-runtime` 与 `opencode-cli`；其余组件的版本串非机器可读，故不受闸门保护。
- **测试**：`tools/verify-package.test.js`（手写最小 fixture，逐条破坏）、`tools/launcher.test.js`（子 cmd 断言 `env.bat` 导出的变量集合）。
- **领域文档**：`CONTEXT.md`（术语表）、`docs/adr/0001-opencode-relative-path-resolution.md`、`docs/adr/0002-layout-json-stays-out-of-the-package.md`、`docs/整合包说明书.md`（维护者说明书，不随包分发）。

### 修改
- **启动器去重**：环境注入块（2 份）、`workspace.txt` 解析（3 份）、Windows Terminal 发现（2 份）、`endlocal` 变量搬运表（2 份）全部收敛到 `env.bat`。`启动.bat` 95 → 79 行，`进入环境.bat` 31 → 10 行；WT 发现改为 `启动.bat` 内的 `:find_wt` 子例程。
- **`templates/玩家使用指南.md` 扩写**（98 → 297 行）：新增「首次配置逐项说明」「自定义服务商（含本地 Ollama 示例）」「人格与角色模型分配」「工作目录」四节，FAQ 扩为 13 行表格，并补更新 / 重置 / 卸载 / `--check` 说明。
- **`build.ps1` 的 [4/5] 阶段**：改为「输入校验（存在性 + 版本）→ 产物校验（用产物内的便携 Node 执行 `verify-package.js`）」；删除原 node/opencode 存在性断言、技能数量断言与 superpowers 迁移守卫。`check-sources.ps1` 改为 UTF-8 with BOM。
- 四份 `codemap.md` 与两份 `README.md` 按上述改动回写；`templates/setup/codemap.md` 按当前实现重写。

### 修复
- **人格文件在设置工作目录后静默失效**：`instructions` 的相对路径按 `process.cwd()` 解析并向上 `globUp`，而启动器在设置工作目录后会把 CWD 切到玩家项目目录。改用启动器注入的 `{env:QDIP_PERSONA}` token（加载时展开为绝对路径），既脱离 CWD 又随 `%~dp0` 重新推导而耐搬运。
- **构建阻断**：`build.ps1` 的技能数量断言写死为 47，而本机技能并集已是 48，导致 [4/5] 阶段必然失败。该断言已由产物校验器的集合比对（并集 ⊆ target + 跨源重名）取代。
- **`templates/setup/codemap.md` 内容损坏**：原文为双重编码乱码（UTF-8 字节被按 GBK 解码后重存），人机均不可读；已按当前实现重写。
- **文档缺陷**：删除引用不存在文件「安装到系统.bat」的条目；修正「双击 `启动.bat --workspace`」（Windows 双击不传参，该指令不可能生效）；修正「引导页打不开 = 端口被占用」的错误归因（引导服务用 `server.listen(0)` 取系统随机空闲端口）。
- **`guide-server.test.js` 偶发失败**（约 4 次中 1 次，`TypeError: fetch failed`）：加入仅针对网络层异常、最多 3 次的重试，非 2xx 响应不重试。
- **`启动.bat --check` 在 UTF-8 控制台下的误报**：`:check` 分支里含一条 GBK 编码的中文文件名字面量（`进入环境.bat`），cmd 按当前控制台代码页解释批处理字节，在 `chcp 65001` 下该串被错误解码，路径对不上而误报 `[FAIL] 进入环境.bat missing`（文件其实一直在）。删除该检查项——自检只诊断玩家机器上的运行时依赖，全部是 ASCII 可查的项；launcher 文件完整性改由构建期把关：`tools/layout.json` 去掉 `env-shell`/`updater` 的 `optional` 声明，`build.ps1` [3/5] 对非 optional 条目加源存在性断言（缺失即抛错，与产物侧 `layout/deploy-missing` 双重把关）。

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
