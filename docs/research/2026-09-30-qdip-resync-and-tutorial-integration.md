# QDIP 重同步与教学站点集成 — 研究侦察报告

- 日期：2026-09-30
- 研究问题：
  - 将「Samuel的Opencode自用开发环境快速部署包」（QDIP）与当前本机 opencode 开发环境重新同步，使两者同等；
  - 将 /teach 教学站点（需按当前环境更新）纳入包体，并在首次设置页面（`setup/first-run.html`）加入口，引导新用户首次使用前先理解这套开发环境背后的开发思想。
- 评估对象：
  - QDIP 仓库：`E:\云文件\GitHub\SamMeow_OMOS+MaTT_QDIP`（最新构建 `build\qdip-generic-0.5.0\`）
  - 本机环境：`C:\Users\Winde\.config\opencode\`、`C:\Users\Winde\.agents\`、live fork `E:\云文件\GitHub\oh-my-opencode-slim`
  - 教学站点：`E:\云文件\GitHub\Video_script_repository\我的OCvibecoding环境视频\教学\`
- 方法：三条只读研究线并行调查（exp-1 QDIP 包机制 / exp-2 本机环境清单 / exp-3 教学审计），全部结论附一手来源（`path:line`）；关键论断已由主控抽样亲验（见 §6.2）。本文件为汇编稿，未执行任何写操作。
- 状态：**已完成**（三线全部返回并归档；未决点见 §7）

---

## 一、本机 opencode 环境基线（exp-2）

### 1.1 主配置 `opencode.json`（53 行）

- 插件（`opencode.json:4-7`）：`opencode-quota`、`E:/云文件/GitHub/oh-my-opencode-slim`（仅有的本地绝对路径引用，`:6`）。
- 禁用代理（`:8-21`）：`explore` / `general` / `build` / `plan` 全部 `disable:true`。
- MCP（`:22-47`）：`blender-mcp`（local，`C:\Users\Winde\.local\bin\uvx.exe blender-mcp`）、`chrome-devtools`（`npx -y chrome-devtools-mcp@latest --autoConnect`）。
- 其他：`autoupdate: notify`（`:3`）；`lsp: true`（`:49`）；`instructions` → `preferences.md`（`:50-52`）；**无 permission 段、无 provider 段**。
- 未引用 `oh-my-opencode-slim-patched`，也未引用 `Meow-omo-slim-superpowers-patch-kit`（后者仅出现在旧备份 `opencode.json.bak-20260728:6`）。

### 1.2 预设 `oh-my-opencode-slim.json`（274 行）

- 当前 preset：`matt-bridge`（`:3`）；`disabled_agents: []`（`:4`）；`showStartupToast: false`（`:22`）。
- council（`:5-21`）：`default` 与 `synthesizer` 两套，均为 alpha=`deepseek/deepseek-v4-pro`、beta=`deepseek/deepseek-flash`、gamma=`kimi-code-plan-cn/k3`；`default_preset: "synthesizer"`；`councillor_execution_mode: "parallel"`；`councillor_retries: 3`。
- 共 **3 套 preset**：`DeepSeek-Only`（`:24-98`）、`matt-bridge`（`:99-185`，当前）、`superpowers-bridge`（`:186-272`）。

`matt-bridge` 各代理配置（`:100-184`）：

| agent | model | variant | skills | mcps |
|---|---|---|---|---|
| orchestrator | `deepseek/deepseek-flash` | max | `["*"]` | `["*","!context7"]` |
| orchestrator-beta | `kimi-code-plan-cn/k3` | high | `["*"]` | `["*","!context7"]` |
| orchestrator-gamma | `deepseek/deepseek-v4-pro` | max | `["*"]` | `["*","!context7"]` |
| orchestrator-delta | `kimi-code-plan-cn/kimi-for-coding` | high | `["*"]` | `["*","!context7"]` |
| oracle | `deepseek/deepseek-flash` | max | simplify, codebase-design, domain-modeling, diagnosing-bugs | `[]` |
| fixer | `deepseek/deepseek-flash` | medium | tdd, diagnosing-bugs, migrate-to-shoehorn, **resolving-merge-conflicts**, prototype, codebase-design, simplify | `[]` |
| designer | `kimi-code-plan-cn/k3` | max | agent-browser, tdd, prototype, diagnosing-bugs, codebase-design | `[]` |
| explorer | `deepseek/deepseek-flash` | medium | `[]` | `[]` |
| librarian | `kimi-code-plan-cn/kimi-for-coding-highspeed` | medium | `[]` | websearch, context7, gh_grep |
| observer | `deepseek/deepseek-flash` | medium | `[]` | `[]` |
| council | `kimi-code-plan-cn/k3` | max | `[]` | `[]` |

[WARN] `resolving-merge-conflicts` 已随 Matt v1.3 移除（本机技能目录不存在），但 preset 仍有 **3 处残留引用**（`:56` / `:142` / `:229`，横跨三套 preset）——环境侧清理候选。

### 1.3 技能部署（两处，合计 48）

- `C:\Users\Winde\.agents\skills\`：**39 个目录**；锁文件 `C:\Users\Winde\.agents\.skill-lock.json`（schema v3）记录 **38 条**（`project-status-report` 有目录但未入锁）。
- `C:\Users\Winde\.config\opencode\skills\`：**9 个目录**（8 个 OMO-Slim 管理：simplify / codemap / clonedeps / deepwork / verification-planning / reflect / worktrees / oh-my-opencode-slim；+ 1 个自定义：background-orchestration）。
- lock 时间戳：`installedAt` 基线多为 `2026-09-10T15:48`，`updatedAt` 多为 `2026-09-30T07:58`（**09-30 发生过全量刷新**）。
- 来源构成：mattpocock/skills（GitHub）+ vercel-labs/agent-browser（1 个）。
- v1.3 对照：`implement-spec` / `pr` / `retro` 在列；`resolving-merge-conflicts` 已删；`pr` 为最近一次同步新增（`updatedAt: 2026-09-30T07:58:44`）。

### 1.4 运行时与依赖链

- **live fork**：`E:\云文件\GitHub\oh-my-opencode-slim`，version `2.2.18`（`package.json:3`），remote `github.com/alvinunreal/oh-my-opencode-slim`，分支 `master`（另有本地 `patch-kit-v2`），**ahead 32**。近期提交含 `Chore: upgrade @opencode-ai/plugin and @opencode-ai/sdk to 1.18.27`（`e75ed9b7`）、上游 2.2.18 合并（`05d654ca`）等。**这是当前唯一被 `opencode.json` 引用的本地插件**。
- `C:\Users\Winde\.config\opencode\.oh-my-opencode-slim\`：技能同步状态目录。`skills-manifest.json`（8 技能，packageVersion 全为 `2.2.18`，updatedAt `2026-09-30T01:39:56Z`）+ `skill-updates\` 暂存 2.2.2 / 2.2.17 / 2.2.18 三版。
- `C:\Users\Winde\.config\opencode\oh-my-opencode-slim-patched\`：**v1.1.1 旧补丁产物**（非 git，`.slim\` 元数据指向原作者机器 `alvin/repos/...`），当前环境未引用。
- `E:\云文件\GitHub\Meow-omo-slim-superpowers-patch-kit\`：存在（含 patched 副本、patch-kit-v2、`skills\{background-orchestration, matt-pocock}` 等），**当前未被任何 live 配置引用**（仅旧备份文件中出现）。
- 实际生效插件包：`node_modules\@slkiser\opencode-quota`（声明 `^4.10.2`）+ `@mohak34\opencode-notifier`（`package.json:3,5`）。

### 1.5 其余配置/状态文件

| 文件 | 判定 |
|---|---|
| `preferences.md`（91 行） | 用户自定义 Overseer 偏好档案 v2，经 `opencode.json:51` 注入所有会话 |
| `tui.json` / `cli.json` | TUI / CLI 层插件与界面配置 |
| `plugins\`（`.config\opencode` 内） | 实质为空（仅空目录 `superpowers\`） |
| `service.json` | **含敏感凭据（明文），本文件不摘录任何内容**；同步/分发作业必须排除 |
| `opencode-quota\` / `opencode-notifier-state.json` | 插件运行时数据 |
| `.config\opencode` git 仓库 | 单提交（`0cbb2ab`，2026-05-14），分支 `master`，**dirty**（modified: oh-my-opencode-slim.json / opencode.json / tui.json；deleted: `.opencode/themes/vault-tec.json`；untracked: skills/、多个 `*.bak*` 等） |

---

## 二、QDIP 0.5.0 包与构建机制（exp-1）

### 2.1 仓库分支事实（最关键的机制前提）

- 当前检出分支 **`main` 是孤立 "Initial commit"**（`70c064f`，仅 `.gitattributes` + `LICENSE`）。
- **完整构建源码在 `master` 分支**：`templates/`、`tools/build.ps1`、`tools/layout.json`、`tools/components.json`、`tools/verify-package.js`、`docs/`、`CONTEXT.md`、`AGENTS.md` 等。
- 工作树里的 `build/`、`docs/`、`release/`、`tools/`（及本文件）为**未跟踪内容**（亲验 `git status --short`：`?? build/ ?? docs/ ?? release/ ?? tools/`）。
- 最近提交（`--all`）：`e23cd82 Create project-status-20260917.html`、`3131c72 6`、`0899861 刷新release`、`63b6b7c 修正0.5.0`、`f4dddad 新版本0.5.0`、`91bb208 更新0.4.0`、`70c064f Initial commit`。
- 影响：同步作业开工前必须先决定「切回 master / restore 构建源码」，否则无法改动流水线。

### 2.2 包结构（`build\qdip-generic-0.5.0\`）

根文件：

| 文件 | 行数 | 职责 |
|---|---|---|
| `启动.bat` | 78 | 主入口：注环境（`:7`）→ 首次门控 `if not exist "%ROOT%data\.configured"`（`:14`）→ 便携 Node spawn `setup\guide-server.js` 并轮询 `data\.guide-url`（`:30-46`）→ `:run` 经 Windows Terminal 执行 `opencode`（`:58-72`） |
| `进入环境.bat` | 10 | 仅注入便携环境并 `cd` 到工作区，不启动 opencode |
| `更新组件.bat` | 35 | `npm install opencode-ai@latest` → copy 进 `opencode\bin`（`:16-25`），只更新 opencode 本体 |
| `env.bat` | 35 | **0.5.0 新增**，便携环境唯一定义处：`ROOT/PATH/XDG_*/OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS/QDIP_MCP_CHROME/QDIP_PREFERENCES/QDIP_PERSONA/ROOTS/WSDIR`（`:13-34`） |
| `README.md` | 55 | 包结构与快速开始 |
| `玩家使用指南.md` | 297 | 玩家工作流、自定义服务商、人格/模型分配、FAQ |
| `CHANGELOG.md` | 136 | 版本变更记录 |

子目录：`opencode\bin`（opencode.exe，1.18.30）、`opencode\auth`（空壳）、`opencode\config\opencode\`（opencode.json、oh-my-opencode-slim.json（148 行）、tui.json、preferences.md、instructions/persona.md、**skills/（48 个）**、local/、node_modules/）、`plugins\`（oh-my-opencode-slim、opencode-quota 3.8.3）、`mcp\chrome-devtools-mcp`（1.8.0）、`runtime\`（node 24.14.1 + terminal 1.24.11911.0）、`data\`（`.configured`、`.guide-url` 冒烟残留）、`setup\`（5 项）。

包内 `opencode.json` 关键差异：插件用相对路径 `../../../plugins/...`（`:3-6`），MCP 用 `{env:QDIP_MCP_CHROME}`（`:8-17`），instructions 用 `{env:QDIP_PREFERENCES}` + `{env:QDIP_PERSONA}`（`:18-21`）。

### 2.3 setup 机制（首次设置页）

- `first-run.html`（1169 行）结构：`.term-bar`（`:447-450`）→ 标题/说明（`:452-455`）→ 服务商卡片 `#cards`（`:457`）→ `#sec-persona` 人格四选一（`:459-484`）→ `#sec-models` 模型分配（`:486-495`）→ `#sec-workspace` 工作目录（`:497-501`）→ `.actions` 保存（`:503-506`）→ `#result`/`#done`（`:507-511`）→ 脚本 `/setup/contract.js` + 内联（`:514-1167`）。
- **现状：页面无任何教程/文档入口**（亲验：全文 `href|https?://` 仅命中 1 处——`:764` 的 Base URL 输入提示字符串，非链接）。
- **教程入口首选插入锚点**：`#sec-workspace` 结束（`:501`）与 `.actions` 开始（`:503`）之间，新增 `<div class="section" id="sec-tutorial">`；`.section` 样式已存在（`:288-308`）。次选：顶部 intro 之后（`:455-456`）。
- `guide-server.js`（59 行，亲验全读）：root=`argv[2]`（`:7`）；API `/api/status`（`:16`）/`POST /api/configure`（`:21`）/`POST /api/test`（`:30`）；**静态文件仅服务 `setup/` 目录、且 `path.basename` 扁平化**（`:40-47`），MIME 仅 `.html/.js/.css`（`:11`）；随机端口 `listen(0)`（`:55`）；启动时写 `data/.guide-url`（`:58`）。**不支持额外静态目录/子目录路由。**
- `config-writer.js`（228 行）：`PERSONAS`（`:19-22`）、`DEFAULT_PRESET='matt-bridge'`（`:25`）、`AGENT_MODEL_PATHS`（`:28-39`）、`configure()`（`:99-181`，写 auth.json/opencode.json/persona.md/oh-my-opencode-slim.json + `.configured` + `workspace.txt`）、`testConnection()`（`:195-226`）。
- `contract.js`（138 行）：浏览器/服务端共享的 UMD 契约（`PROVIDERS`、`AVAILABLE_MODELS`、命名规则、`friendlyError` 等，`:5-121`）。
- `wt-profile.ps1`（99 行）：幂等生成便携 Windows Terminal `settings.json`（显式 ctrl+c/ctrl+v 绑定）。

### 2.4 构建与发布流水线（`master` 分支）

- `tools/build.ps1` 5 阶段：`[1/5]` 清理目标目录 → `[2/5]` 按 `tools/components.json` 复制 **11 个组件** → `[3/5]` 按 `tools/layout.json` 部署 `templates/`（15 条 deploy） → `[4/5]` `check-sources.ps1`（存在性+版本闸门）+ 便携 Node 跑 `verify-package.js`（9 规则） → `[5/5]` `Compress-Archive` 产出 zip。
- `components.json` 组件清单与版本：node-runtime 24.14.1、opencode-cli **1.18.30**、omoslim **2.2.18+patch-kit**、matt-skills **2026-09-11** 快照、opencode-quota 3.8.3、chrome-devtools-mcp 1.8.0、windows-terminal 1.24.11911.0。
- 来源写法：**本机绝对路径**（如 `E:/云文件/GitHub/oh-my-opencode-slim/dist`、`C:/Users/Winde/.config/opencode/skills`、`C:/Users/Winde/.agents/skills`）与 **离线缓存** `tools/cache/`（node/opencode/omoslim-runtime/quota-runtime/terminal/mcp）混用；`tools/omoslim-runtime`、`tools/quota-runtime` 为 vendored 依赖清单（构建时合并 node_modules）。
- `release/` 的 zip 为**手工**从 `build/` 复制（维护者工作流第 4 步）；证据：`release/Samuel的...-0.5.0.zip` 与 `build/qdip-generic-0.5.0.zip` 字节数完全相同（165266657）。
- `generic/`、`spt-edition/` 为空占位目录（README 明示）；`master:.gitignore` 忽略 `build/`、`tools/cache/`、`release/`、`node_modules/`。

### 2.5 版本基线与 0.4.0 → 0.5.0

- 顶层差异：0.5.0 **新增 `env.bat`**、**移除 `验证清单.md`**；`setup/` 由 7 项收敛为 5 项（**新增 `contract.js`**，移除测试文件与内部 codemap）。
- `CHANGELOG.md:5-34` 要点：验证清单改为维护者侧 `docs/发布前检查清单.md`；`setup/` 不再分发测试/内部地图；新增 `tools/layout.json`（单一布局声明）、`verify-package.js`、构建期版本闸门、`templates/env.bat`；启动器去重（启动.bat 95→79、进入环境.bat 31→10）；**修复"写死技能数 47 vs 实际 48"**；修复人格文件工作目录失效（改用 `{env:QDIP_PERSONA}`）。

### 2.6 文档约定与 master 侧文档

- `docs/research/` 约定（本文件即按此归档）：`YYYY-MM-DD-slug.md`，头部为「标题 → 日期 → 评估对象 → 方法 → 状态」。
- `master` 分支另有：`docs/00-可行性报告.md`、`01-通用版-spec.md`、`02-通用版-实施计划.md`、`adr/0001-0002`、`docs/agents/*`、`docs/整合包说明书.md`、`docs/发布前检查清单.md`、`docs/matt-pocock-workflow-report.md`、`docs/workflow-diff-and-recommendations.md`、`docs/project-status-20260917.html`、`CONTEXT.md`、`AGENTS.md`、`codemap.md`；`.superpowers/sdd/` 存历史任务产物。
- 仓库根 `.opencode/`：`package.json` 依赖 `@opencode-ai/plugin` 1.18.30（master 上为 1.18.27）；`images/` 为空目录（用途未明）。
- 关于 QDIP 同步任务的历史记录：工作树与 master 均未发现（仅有 0.5.0 自身演进记录）。

---

## 三、同步差距观察（exp-1 × exp-2 交叉）

> 口径：以下为**观察与待核点**，不是执行清单；正式同步前需逐项亲验。

| # | 条目 | 包 0.5.0 | 本机环境 | 证据 |
|---|---|---|---|---|
| 1 | Matt 技能集合 | 48 个：**含 `resolving-merge-conflicts`、无 `pr`** | 48 个：**含 `pr`、无 `resolving-merge-conflicts`** | 亲验包目录清单；`.agents` 清单 + `.skill-lock.json` |
| 2 | 技能文件内容 | `matt-skills 2026-09-11` 快照 | `2026-09-30` 全量刷新（v1.3 措辞/frontmatter/GLOSSARY 改名波及约 11 个技能文件）；抽样 5 对：grill-with-docs/teach/background-orchestration/simplify 全等，**implement-spec 漂移 35→40 行** | `components.json`；lock 的 `updatedAt`；F2 哈希抽样 |
| 3 | OMO-Slim | `2.2.18+patch-kit`（= live fork dist 逐文件超集：205/205 相同 + 21 个 `custom\*.md`） | live fork `2.2.18`（ahead 32，含自定义 superpowers-policy 等） | `master:tools/components.json`；live fork `package.json:3` + `git log`；F2 哈希核验 |
| 4 | opencode CLI | 固定 1.18.30（`更新组件.bat` 可升 latest） | **实装 1.18.33**（npm 全局 shim） | 包 `opencode\bin`；`更新组件.bat:16-25`；F2 实测 |
| 5 | 插件 | oh-my-opencode-slim + opencode-quota **3.8.3** | quota 实装 **4.10.2**；notifier 0.2.5 已安装但**未被任何配置引用**（推断未激活；包内未含） | 包 `plugins\`；环境 `package.json:3,5` |
| 6 | 预设文件 | `oh-my-opencode-slim.json` **148 行**（单 `matt-bridge` preset 模板，无占位符；`config-writer.js` 仅改写被配置的 `model` 叶子字段） | **274 行**、3 套 preset（实装形态） | 包 config 目录；环境文件 |
| 7 | preferences / persona | 包内 `preferences.md` + `instructions\persona.md`（后者为运行时产物、非模板） | `preferences.md` 91 行（v2；仅多「SPT 游戏验证流程」1 行） | 两侧文件；F1 节级比对 |
| 8 | MCP | 仅 chrome-devtools（`{env:QDIP_MCP_CHROME}`） | chrome-devtools（npx latest）+ **blender-mcp**（本机特有） | 包 `opencode.json:8-17`；环境 `opencode.json:22-35` |
| 9 | 秘密与状态 | `opencode\auth` 空壳；`data\` 有 `.configured`/`.guide-url` 冒烟残留 | 实 auth；`service.json` 含敏感凭据 | 包目录；环境文件 |
| 10 | 环境侧残留 | — | preset 3 处 `resolving-merge-conflicts` 引用；`oh-my-opencode-slim-patched`（v1.1.1）旧目录；多个 `*.bak*` | `oh-my-opencode-slim.json:56,142,229` 等 |
| 11 | 作业前提 | 构建源码在 `master`、工作树未跟踪 | — | §2.1（亲验） |
| 12 | cli.json | **包内无** | 实装存在（schema `opencode.ai/v2/cli.json`，读取入口未证实） | F2 核验 |

---

## 四、教学站点审计（exp-3）

### 4.1 结构与规模

- 全目录 **21 个文件 ≈ 177 KB**：`index.html`；`lessons\`（lesson-template + 0001~0006）；`reference\`（cheatsheet-template + 01~06 速查表）；`assets\`（lesson.css 21KB、quiz.js 8.8KB）；`learning-records\0001`；`MISSION.md` / `NOTES.md` / `RESOURCES.md`。
- `index.html` 为纯静态入口：引用六课（`:46-79`）、六速查表（`:49-79`）、课程档案（`:91`）；不加载 quiz.js。

### 4.2 课程内容与教学理念

| 课程 | 标题 | 核心论点 |
|---|---|---|
| 0001 | 任务入口判定 | 开工先输出 `[入口]` 分类（`:40-59`）；七车道总表（`:62-119`）；拿不准问 `ask-matt`（`:124-139`） |
| 0002 | 会话边界 | 上下文会"变质"、单会话健康上限约 150K token（`:30-46`）；换台决策梯 continue→clear→handoff→subagent→compact（`:58-98`）；三铁律（`:121-156`） |
| 0003 | 委派策略 | 委派三收益（`:30-39`）；代理名册（`:51-106`）；三条委派规则 + 后台任务生命周期（`:117-167`） |
| 0004 | 主流程 | 主链 grill-with-docs→to-spec→to-tickets→implement×N（`:30-48`）；每站产出物（`:53-98`）；收尾 retro/reflect（`:126-137`） |
| 0005 | 体系地图 | 五层结构（`:34-49`）；文件地图（`:54-98`）；预设与模型（`:110-132`） |
| 0006 | 排障与维护 | 改配置三原则（`:29-36`）；症状分诊表（`:47-88`）；三层定位法（`:112-119`） |

- 教学理念（`MISSION.md`）：从"AI 帮我做"升级为"我知道每一步在干什么"（`:4`）；受众为非程序员、碎片时间、简体中文（`:13-18`）。
- `NOTES.md`：技能总数记录为 47（`:37`，已过时）；待办含"课程随环境更新"（`:42-52`）。
- `RESOURCES.md`：核实日期 2026-09-16（`:3`）；含 opencode 官方文档、体系组件、方法论、本机一手资料清单。

### 4.3 自包含性（结论：完全离线可用）

- 站内链接**全部相对路径**；**无外部 CDN/字体/在线脚本**（全目录 grep 未命中 `@import`/`url()`/字体引用）。
- 外部引用**全部是超链接**（aihero.dev、opencode.ai/docs、GitHub 仓库、Discord/Telegram 等），不加载资源。
- `quiz.js` 头注声明"原生 JS，零依赖，file:// 直接可用"（`quiz.js:2`）。
- 复制约束：**整目录原样复制不断链**；若打平目录或单独移动 `index.html` 则全断（`../assets`、`../reference` 体系）。

### 4.4 过时点汇总（对照当前环境）

| 文件:行 | 问题 | 依据 |
|---|---|---|
| `lessons\0004-主流程.html:35,63,116` | 仍写 `CONTEXT.md`，应为 `GLOSSARY.md` | Matt v1.3 改名 |
| `reference\01-任务路由速查表.html:121` | 同上 | 同上 |
| `reference\04-主流程速查表.html:39,84,109` | 同上（三处） | 同上 |
| `lessons\0005-体系地图.html:114` | 预设名 `opencode-go` 不存在 | 实际仅 DeepSeek-Only / matt-bridge / superpowers-bridge |
| `reference\05-体系地图速查表.html:125` | 同上 | 同上 |
| `lessons\0005-体系地图.html:145` | 练习"搜 `deepseek` 找 designer"错误 | `matt-bridge.designer = kimi-code-plan-cn/k3` |
| `lessons\0005-体系地图.html:37,77` | 技能数 47 / "38+9" 漂移 | 现为 39+9=48 |
| `reference\05-体系地图速查表.html:52,88` | 同上 | 同上 |
| `NOTES.md:37,38` | 技能数 / `CONTEXT.md` 陈旧 | 同上 |
| `lessons\0003-委派策略.html:95-98`、`reference\03:67` | observer 角色描述与 QDIP 设置页不一致 | `first-run.html:572`（"观察员：监督流程"） |
| `RESOURCES.md:33` | "稳定版 v2.2.20"过时 | 上游已 3.0.1（见 assessment 报告） |
| `RESOURCES.md:72` | "v3.0.0-beta 未调研"已过时 | assessment 已完成 |
| `RESOURCES.md:34` | 将 superpowers 列为流程技能层，易误导 | 实际未安装、不激活 |
| `RESOURCES.md:58` | 指向不存在的 `QDIP\README.md` | 仓库根无 README（构建侧 README 在包内/master） |
| 全站页脚 | 仅"更新于 2026-09"，无适用版本标注 | 环境迭代快，易再漂移 |

### 4.5 打包适配约束

1. **guide-server 只服务 `setup/` 扁平文件**（`guide-server.js:40-47`，亲验）——教学的 `lessons/`、`reference/`、`assets/` 三级结构无法直接由现有 server 提供。
2. 若放入 `setup/` 需避免与现有文件冲突，并注意 `path.basename` 会把子目录**扁平化**导致相对链接全断。
3. `first-run.html:514` 使用 `/setup/contract.js` 根绝对路径风格；教学使用相对路径体系，两者不混用。
4. 外部依赖为零、体积 177KB——**无阻塞**。
5. 备选路径：教学支持 `file://` 直开（`quiz.js:2`），可绕过 server 限制。
6. 署名：教学引用 Matt Pocock / AI Hero / opencode 官方文档 / OMO-Slim 仓库，随包分发建议保留来源链接。
7. 教学为最新迭代产物（建于 2026-09-16，晚于 09-11 matt-bridge 重构）；父目录视频初稿（2026-08-31）仍宣称 "superpowers 6.3.0"，口径需澄清（不影响教学正文）。

---

## 五、首次设置页集成机制（exp-1 × exp-3 汇总）

- 现状：`first-run.html` 无教程入口（亲验，§6.2）；包内也无任何成品教程内容；`/teach` 技能本体已随包分发（`opencode\config\opencode\skills\teach\SKILL.md`）。
- 插入锚点与样式：见 §2.3（`#sec-workspace` 与 `.actions` 之间，`:501-503`）。
- 服务约束：见 §4.5-1/2（`guide-server.js` 扁平服务、MIME 三类型、随机端口、`.guide-url` 机制）。
- 入包通道（F1 增补）：`setup/` 产物全部源自 `master:templates/setup/`（dir 合并部署、支持 exclude）——教程可 (i) 放 `templates/setup/tutorial/` 自动随包，或 (ii) 走 `components.json` 外部源复制；注意 exclude 模式（`*.test.js`/`codemap.md` 按 basename 递归排除）与 check-docs 编码/路径规则。
- 机制层面的可选路径（细节留待实施 spec 裁决）：
  - A. 扩 `guide-server.js` 静态路由（支持子目录白名单）——多改一处服务代码；
  - B. 把教程打平为扁平文件放入 `setup/`（如 `learn.html`）——需重写站内相对链接；
  - C. 教程随包分发但以 `file://` 直开（启动器打印/打开本地路径）——改动最小，与现有 server 完全解耦。
- 命名注意：避免使用 `index.html` 等通用名与现有文件冲突。

---

## 六、来源索引

### 6.1 研究线

- exp-1（QDIP 包机制）：session `ses_f0e5f6b95ffeKD5y2aR9LLhS8E`；读取：`build/qdip-generic-0.5.0/` 全目录（first-run.html、玩家使用指南.md、config-writer.js、contract.js、CHANGELOG.md、启动.bat、oh-my-opencode-slim.json、guide-server.js 等）+ `master:` 构建源码（build.ps1、layout.json、components.json、verify-package.js、docs/）。
- exp-2（本机环境清单）：session `ses_f0e5f6198ffeknaPiYfbVuY4ke`；读取：`.config/opencode` 配置面 + `.agents` 技能面 + live fork。
- exp-3（教学审计）：session `ses_f0e5f5399ffet03UCiQ8cPLgBc`；读取：教学全站 + 环境对照源 + assessment 报告。
- 增补事实线（grilling 阶段）：F1 包模板与构建机制深读（复用 exp-1 会话）；F2 实装版本与漂移核验（session `ses_f0cb6a532ffegOEQEf5wiBuu7R`）。

### 6.2 主控亲验记录（2026-09-30，本会话直接验证）

1. `guide-server.js` 全读（59 行）→ 扁平 `path.basename` 服务（`:40-47`）、MIME（`:11`）、随机端口（`:55`）、`.guide-url`（`:58`）**确认**。
2. `first-run.html` 抽样（`:490-509`）→ 插入锚点确认；Select-String 全文 `href|https?://` **仅 1 处命中**（`:764` Base URL 提示字符串）→ **无教程/外链入口确认**。
3. 包内技能目录计数与清单 → **48 个**，含 `resolving-merge-conflicts`、无 `pr`（v1.3 前快照特征）**确认**。
4. git 状态 → HEAD=`main`（孤立初始提交）；`master` 存在；工作树 `build/ docs/ release/ tools/` 未跟踪 **确认**。

---

## 七、未决点与不确定清单

1. **同步作业前提**：构建源码（templates/tools/docs）在 `master`，当前 `main` 工作树不具备——切回/恢复方案待定（§2.1）。
2. 包内 48 技能与环境 48 技能的逐文件内容差异：抽样 5 对已核（`implement-spec` 漂移 35→40 行；其余 4 对全等），**全量逐字比对未做**（集合级差异：`resolving-merge-conflicts` ↔ `pr`）。
3. ~~opencode 实装版本未实测~~ → 已实测：**1.18.33**（npm 全局 shim，2026-09-30）。
4. `plugins\` 是否需补 `opencode-notifier`、quota 是否升 `4.x`——已核：quota 包内 3.8.3 vs 实装 **4.10.2**（待同步）；notifier 0.2.5 已装但未被任何配置引用（推断未激活）。
5. `.opencode/images\` 空目录用途未明。
6. 包 `data\` 冒烟残留（`.configured`/`.guide-url`）的清理时机（构建期 vs 发布期）未定。
7. 环境侧残留清理（preset 3 处无效技能引用、`oh-my-opencode-slim-patched`、`*.bak*`）属环境动作，需用户确认后执行。
8. 父目录视频初稿的 "superpowers 6.3.0" 口径与现状冲突（`NOTES.md:39` 列为待核实）；对外发布教学/视频前需澄清。
9. `Meow-omo-slim-superpowers-patch-kit\docs\architecture.md` 存在性未验证（`RESOURCES.md:56` 引用）。
10. 教学速查表 02/03/05/06 未逐字核对（抽样级别）。
11. `project-status-report` 技能未入 `.skill-lock.json`——来源/归属未确认。
12. 教学"更新"范围：**已决策（2026-09-30）**——按新环境全面重写（保留结构）；集成路径 = 扩展 guide-server 服务子目录。

---

*本文件由主控汇编，遵循 `docs/research/` 既有约定归档；所有论断附一手来源，关键论断经亲验（§6.2）。*
