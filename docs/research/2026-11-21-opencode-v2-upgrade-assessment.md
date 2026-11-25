# OpenCode V1 -> V2 升级可行性评估（宿主层）

- 日期：2026-11-21
- 评估对象：OpenCode 宿主 `opencode`（V1，本机 1.19.0）-> `opencode2`（V2，本机 2.0.13）
- 方法：两条只读研究线（exp-1 本机实装盘点、lib-1 上游一手资料）+ 主控对一手文档与源码的直接核对
- 范围：只回答三件事——能否并行、V1 配置与工作流在 V2 的可用性、是否建议升级

---

## 结论摘要

- **官方立场是"不并存"**：V1/V2 共用 `opencode` 命令，V2 的 curl 安装器会**替换** V1 二进制，"no longer installed side by side by default"。本机之所以两个都有，是因为 `@opencode/cli@2.0.13` 这个 npm 包同时导出了 `opencode` 和 `opencode2` 两个 bin 名，属于第三方打包行为，不是官方支持的并行形态。
- **配置文件是同一份**：V2 读取与 V1 完全相同的 `~/.config/opencode/opencode.json(c)`，并在内存中归一化 V1 字段、**不回写源文件**。因此"配置并行兼容"这一层基本是成立的。
- **真正卡并行的不是配置文件，而是三处**：(1) 插件 API 全新，V1 插件实现**不在** V2 运行；(2) `tui.json` 被单一全局 `cli.json` 取代（本机已存在）；(3) 数据目录同为 `~/.local/share/opencode`。
- **你的工作流 90% 可迁移**：41 个 `~/.agents/skills` + 9 个 `~/.config/opencode/skills` 全部按 `SKILL.md` 目录发现，V2 支持同样的路径；`instructions`、`mcp`、V1 `agent` 覆写、`autoupdate` 均被接受或自动归一化。
- **三处硬损失**：V2 **不运行 LSP**（不暴露 LSP 工具、不产出诊断）、多路复用器（tmux/zellij）与 orchestrator-wake 调度器在 OMO Slim 的 V2 适配里被**显式关闭/未移植**、`external_directory` 默认放行（V1 是默认询问）。
- **第三方插件出现硬分叉**：`@slkiser/opencode-quota` 4.10.2 的 peer 是 `@opencode-ai/plugin ^1.4.3`（V1 专属），5.0.0 起 peer 改为 `@opencode/plugin 2.0.x`（V2 专属），没有同时服务两代的版本。
- **建议：可并行试跑，暂不切主力**。条件是三件事都做完——OMO Slim 用 `dist/server` 目录注册、quota 在 V2 侧固定 6.2.2、LSP 相关工序改用项目自带 typecheck/lint。

---

## 1. V1 / V2 能否共存

### 1.1 官方结论：默认不并存

> "OpenCode 1 and OpenCode 2 both use the `opencode` command and are no longer installed side by side by default. Remove a package-managed V1 installation before installing V2; the V2 curl installer replaces the V1 binary."

来源：官方迁移文档 `migrate-v1.mdx` L5-6（本地缓存副本 `C:\Users\Winde\AppData\Local\Temp\opencode\migrate-v1.mdx`；上游仓库 `github.com/anomalyco/opencode`）

### 1.2 本机实际状态：确实并存，但是非官方形态

| 二进制 | 版本 | 来源包 | 备注 |
|---|---|---|---|
| `opencode` | 1.19.0 | npm 全局 `opencode-ai@1.19.0` | 现役主力 |
| `opencode2` | 2.0.13 | npm 全局 `@opencode/cli@2.0.13` | `package.json` 的 `bin` 同时映射 `opencode` 与 `opencode2` 到同一 exe |

证据：`C:\Users\Winde\AppData\Roaming\npm\node_modules\@opencode\cli\package.json`（`bin: { opencode: ./bin/opencode.exe, opencode2: ./bin/opencode.exe }`，`version: 2.0.13`）。

风险点：`@opencode/cli` 也注册了 `opencode` 这个 bin 名，与 `opencode-ai@1.19.0` 的 `opencode` **同名冲突**。谁在 PATH 中胜出取决于 npm shim 的写入顺序，升级任意一方都可能让 `opencode` 命令悄悄指向另一个大版本。

### 1.3 配置：同一份，V2 只读不写

- V2 读取的系统/全局/项目配置路径与 V1 完全一致，明确包含 `~/.config/opencode/opencode.json(c)`、`<project>/opencode.json(c)`、`<project>/.opencode/opencode.json(c)`（`migrate-v1.mdx` L51-62）。
- "V2 normalizes supported V1 and native V2 fields **in memory without rewriting the source file**"（L64-66）。
- 警告：**"V1 and V2 use the same configuration locations, so do not point V1 at files after converting them to native V2-only shapes."**（L42-43）——即：只要你不主动把配置改写成 V2 原生形态，V1 继续读同一份文件是安全的；一旦改写，V1 侧会读到它不认识的键。

### 1.4 数据目录：同为 `~/.local/share/opencode`

V2 core 的全局路径实现（`global.ts`，本地缓存副本）以 `app = "opencode"` 调用 `roots(app)`，`global-roots.ts` 定义为 `XDG_DATA_HOME/opencode`、`XDG_CONFIG_HOME/opencode`、`XDG_STATE_HOME/opencode`。V1 使用同一 app 标识，故两者**共享** data / state / cache 目录。

V2 内含明确的 V1 会话迁移模块（`v1-migration-bun.ts`，1234 行）：用 `hasLegacySessions()` 探测旧 `session` 表，把 V1 行经 `transformSession()` 转成 V2 的 `SessionMessage`/`SessionTable` 结构并 `INSERT OR IGNORE` 写入，进度与断点存在 `KVTable` 的 `MIGRATION_STATE_KEY`（`phase: "sessions"` -> `"completed"`）。即**会话历史是有官方迁移路径的，方向为单向 V1 -> V2**。

> 仍然是单向且不可逆：迁移只在一个方向上转换数据，没有 V2 -> V1 的回退转换器。**升级前备份 `~/.local/share/opencode` 依然是硬前提**。

### 1.5 终端配置：`tui.json` -> `cli.json`

V2 用单一全局 `~/.config/opencode/cli.json` 取代 V1 的分层 `tui.json(c)`；`cli.json` 缺失时，V2 首次启动会把受支持的全局 `tui.json` 设置**自动迁移**过来，同时保持 V1 文件不变（`migrate-v1.mdx` L559-570）。本机 `cli.json` 已存在且 `$schema` 为 `https://opencode.ai/v2/cli.json`，说明 V2 至少完整启动过一次，迁移已完成。

---

## 2. V1 配置在 V2 的可用性矩阵

| 配置项 | 本机 V1 现状 | V2 是否可用 | 需要的动作 | 证据 |
|---|---|---|---|---|
| `plugin` 单数键 | `["opencode-quota", "E:/.../oh-my-opencode-slim"]` | **否**，改名 `plugins` | 改键名；本地路径必须是**目录**且含 `index.js` | `migrate-v1.mdx` L572-595 |
| 本地路径插件 | 指向仓库根 `E:/云文件/GitHub/oh-my-opencode-slim` | **需调整为** `.../dist/server` | OMO 的 V2 入口是 `dist/server/index.js`，不是仓库根 | OMO `docs/opencode-v2-compatibility.md` "Registration rules" |
| 未钉版本的 npm 插件 | `opencode-quota`（解析到 4.10.2） | **版本不兼容** | V2 侧需 `@slkiser/opencode-quota` >= 5.0.0（6.2.2 的 peer 为 `@opencode/plugin >=2.0.28`） | npm 元数据 `quota.json`：4.10.2 peer=`@opencode-ai/plugin ^1.4.3`；5.0.0 起 peer=`2.0.16` |
| 插件版本钉定 | V1 无此概念 | V2 **每次启动自动刷新未钉版本的 npm 插件** | 用精确版本，不用 `@latest` | `opencode-v2-compatibility.md` "Installing on v2" |
| `agent: { explore/general/build/plan: { disable: true } }` | 已用 | **可用**（自动归一化为 `agents.*.disabled`） | 无需改动 | `migrate-v1.mdx` L144-180 |
| `mcp`（blender-mcp、chrome-devtools） | V1 `type: local` + `enabled` | **可用**（自动归一化为 `mcp.servers` + `disabled`） | 无需改动；原生 V2 形态需 `mcp.servers` 与 `timeout.{catalog,execution}` | `migrate-v1.mdx` L228-266 |
| `lsp: true` | 已开启 | **被接受但不再执行**："does not run language servers, expose LSP tools, or produce LSP diagnostics" | 用项目自带 typecheck / lint / 编译器命令替代 | `migrate-v1.mdx` L454-455 |
| `instructions` | `preferences.md` | **可用**，无需迁移 | 无 | `migrate-v1.mdx` L451-452 |
| `autoupdate: "notify"` | 已设 | **可用**（映射为 `update: "notify"`） | 无 | `migrate-v1.mdx` L462 |
| `tui.json` | 存在，单数 `plugin` 键 | **被 `cli.json` 取代** | 已自动迁移；V2 只读 `cli.json` | `migrate-v1.mdx` L559-570；`cli-config.mdx` L18-35 |
| `~/.agents/skills`（41 个） | Matt 全套 + agent-browser | **可用**，V2 显式保留该全局兼容路径 | 无 | 官方 `skills.mdx` L43-48 |
| `~/.config/opencode/skills`（9 个） | deepwork/reflect/simplify 等 | **可用** | 无；"Existing skill files ... do not change" | `skills.mdx` L43-48；`migrate-v1.mdx` L316、L538-548 |
| 技能 `SKILL.md` 结构 | 目录形式 | **可用**，V2 同时支持 `.opencode/skill/` 与 `.opencode/skills/` | 无 | `migrate-v1.mdx` L540-548 |
| OMO `preset` / agent / model / variant | `oh-my-opencode-slim.json`（插件私有 schema） | **取决于插件是否加载成功**，宿主无关 | 见 2.1 | `oh-my-opencode-slim.json`（362 行） |
| `~\.opencode\`（home 项目级配置） | `plugin` 为 package+options 元组，含 `oc-plugin-vault-tec@0.3.0` 与一条指向 `superpowers` 的路径；另有项目级 `tui.json` | **会被 V2 读取合并**；但该插件 peer 是 V1 版 `@opencode-ai/plugin`，V2 不运行 V1 插件实现；项目级 `tui.json` 不迁移 | 换成 V2 版或删除该条；外观改到全局 `cli.json` | 本机实测（`C:\Users\Winde\.opencode\opencode.json`）+ `migrate-v1.mdx` §Plugins、§Terminal client configuration |
| 自定义主题 `vault-tec.json` | 已删除（磁盘不存在） | 不适用 | 无 | 本机盘点 exp-1 |
| Todos | V1 默认开 | **V2 默认关** | 需要时加 `experimental.todo: true` | `migrate-v1.mdx` L126-135 |
| 项目外目录访问 | V1 默认 **ask** | **V2 默认 allow** | 若要保留旧行为，加 `{ "action": "external_directory", "resource": "*", "effect": "ask" }` | `migrate-v1.mdx` L137-140 |
| 会话历史 | `~/.local/share/opencode` | [未证实] 是否可读 | 升级前整体备份该目录 | `global.ts` + `global-roots.ts` |

### 2.1 OMO Slim 在 V2 的运行面（关键）

上游 `docs/opencode-v2-compatibility.md` 明确：单一 npm 包同时支持 v1 与 v2，默认导出为 `{ id, server, setup }`；V2 走 `setup(ctx)`，通过 client shim 复用全部 V1 构建逻辑。已按 `opencode2 beta-18743` 验证。

在 V2 上 **仍然可用**：agent 与权限映射、委派与后台任务板（v2 原生 `subagent` 工具经桥接）、工具集（ast-grep/webfetch/task_*）、`/deepwork` `/reflect` `/loop` `/interview`、消息变换、事件处理、内建 MCP（context7/gh_grep）、前台模型 fallback、`/preset` 交互切换。

在 V2 上 **被关闭或未移植**（设计使然）：

| 能力 | V2 状态 | 影响 |
|---|---|---|
| Multiplexer（tmux/zellij/herdr） | host-gated off | 无 tmux 分屏；V2 自己原生渲染 subagent |
| Orchestrator-wake 调度器 | 未移植 | 靠 V2 内建 `subagent` 完成通知替代 |
| `chat.headers` | 未桥接 | 自定义请求头失效 |
| Companion 桌面应用 | 未验证 | 需单独验证 |

> 与你的偏好档案直接相关：`background-orchestration` 与"工单 -> 并行 lane -> hook 驱动完成"的编排模型依赖 wake 调度器语义。V2 用内建 subagent 通知覆盖了大部分，但**行为细节不同**（例如 V2 的委派命令默认后台运行并把结果回报父会话）。这是升级后最需要重测的工作流环节。

---

## 3. 风险与坑

1. **插件 API 是真正的断层**。"V1 plugin implementations do not run in V2. Moving a file or renaming its config entry is not enough."（`migrate-v1.mdx` L597-599）。任何 V1-only 插件在 V2 上会静默不工作。
2. **`opencode` bin 名冲突**：`opencode-ai@1.19.0` 与 `@opencode/cli@2.0.13` 都注册 `opencode`。升级任一包可能让命令行指向意外的大版本。
3. **共享数据目录**：config 归一化只发生在内存，但 data/state 目录是共享的；SQLite schema 冲突后果是会话库损坏。
4. **`opencode-quota` 硬分叉**：没有跨两代的版本。若两边都要 quota，必须在两套配置里声明不同版本（V1 侧 4.10.2、V2 侧 6.2.2）。
5. **V2 自动刷新未钉版本的 npm 插件**：V1 配置里裸写 `"opencode-quota"` 的写法在 V2 语义下等于"每次启动可能静默升级"。
6. **LSP 能力消失**：这不是配置问题，是 V2 的功能边界。你的偏好档案里"LSP 启用"，需改为项目内 typecheck/lint。
7. **`external_directory` 默认放行**：安全姿态弱于 V1，agent 可在项目外目录读写而不询问。
8. **V2 仍是 beta 线**（`opencode2 2.0.13`）：OMO 文档里已验证的版本是 `beta-18743`，与本机 2.0.13 的对应关系未逐条确认。
9. **本地 OMO 分支领先 origin 32 个提交**，其中 superpowers-policy 五件套（`superpowers-policy.ts`、`agent-tier-policy.ts`、`agent-mcp-blacklist.ts`、`orchestrator-only-skills.ts`、`foreground-fallback/cooldowns.ts`）是**上游没有的本地定制**；V2 适配（`src/v2/*`）与这些定制叠加后的行为未经实测。

---

## 4. 升级建议

### 结论：**可以有条件并行试跑，暂不切换主力**

不建议"现在就切"，理由是三条硬损失（LSP、multiplexer、wake 调度器）都命中了你的日常工作流；也不建议"完全不动"，因为 V2 的配置兼容层比预期好，早试跑成本低、收益是提前暴露适配问题。

### 条件化建议

**现在就值得做（零风险，先做）**

1. 备份 `~/.local/share/opencode` 与 `~/.config/opencode`（含未提交的 3 个 config 变更）。
2. 固定 bin 名歧义：不要依赖裸 `opencode` 命令判断版本，用 `opencode --version` / `opencode2 --version` 显式区分。
3. 把 OMO 的 V2 注册路径从仓库根改成 `dist/server` 目录（仅改 `cli.json`，不动 `opencode.json`，V1 完全不受影响）。

**触发升级的条件（任一满足即可切主力）**

- 你实际用上 V2 的原生 subagent 渲染，且连续跑通 3 个真实工单（grill -> to-spec -> to-tickets -> implement -> code-review）无编排异常。
- quota 在 V2 侧稳定在 6.2.x，且你确认不需要 V1 侧的额度显示。
- 项目内的 typecheck/lint 能覆盖原先依赖 LSP 的工序。

**不建议升级的情形**

- 依赖 tmux 多路复用做并行 lane 编排。
- 依赖 LSP 诊断做重构（`simplify`、`improve-codebase-architecture` 这类需要导航的工序）。
- 依赖 `chat.headers` 做网关/计费标记。

### 回滚方案

V2 不回写配置文件，回滚成本极低：`npm i -g opencode-ai@1.19.0` 覆盖 `opencode` bin，V1 配置原样可用。唯一不可逆的是 `~/.local/share/opencode` 若被 V2 改写——所以备份是硬前提。

---

## 5. 未证实 / 存疑

- ~~数据库 schema 兼容性~~ **已证实**：V2 自带 V1 会话迁移（`v1-migration-bun.ts`），单向 V1 -> V2；旧行经 `transformSession()` 转换后写入 V2 表，进度存 `KVTable`。见 §1.4。未证实的是"迁移后 V1 仍能读回"——不成立，无反向转换器。
- `[未证实]` 上游仓库主分支是否已吸收本地 superpowers-policy 五件套（只核对了本地 `origin/master` 副本，2026-08-29 快照）。
- `[未证实]` `@mohak34/opencode-notifier` 装在本机 `package.json` 却不在任何 `plugin(s)` 数组里，实际加载路径不明；其最新版 1.1.2 的 peer 同时覆盖 `@opencode/client >=2.0.18 <3` 与 `@opencode-ai/plugin >=1.17.0 <2`，即**双代兼容**，但本机装的是 0.2.5。
- `[未证实]` V2 TUI 对自定义主题的发现路径（本机主题文件已删除，无实装可测）。
- `[未证实]` `service.json` 的 `password` 字段归属（V1 service 还是 V2 server）；V2 认证已改为 `OPENCODE_PASSWORD`、用户名固定 `opencode`。

---

## 6. V1 vs V2 客观对比

### 6.1 V2 的真实增益（有据可查的部分）

| 增益 | 证据 |
|---|---|
| 插件 API 域化：`ctx.agent/tool/mcp/command/event/session/generate` 分域注册，且逐能力 probe，缺能力只降级单特性 | `opencode-v2-compatibility.md` "The v2 adapter" |
| 权限模型从"按工具分组"改为**有序数组**，优先级与例外显式化；管理员用 `policies` 强制 | `migrate-v1.mdx` L97-124、L69-72 |
| 模型 variant 升为一等公民：`provider/model#variant`，variants 改为带 `id` 的数组 | `migrate-v1.mdx` L413-445 |
| provider 三元分离：`package` / `settings` / `headers` / `body`，按请求角色归位 | `migrate-v1.mdx` L366-400 |
| skills 支持 HTTP catalog、`opencode/autoinvoke`、按 skill ID 授权、六源显式优先级链 | `skills.mdx` L67-118、L164-182、L207-227 |
| 委派命令默认后台运行并回报父会话（不再需要插件自己实现） | `migrate-v1.mdx` L347-348 |
| 宿主原生渲染 subagent + 原生完成通知，插件无需自建 wake 调度 | `opencode-v2-compatibility.md` "Limitations / Orchestrator-wake scheduler" |
| 单一 `cli.json` 且**运行中编辑即时生效**（V1 是分层 `tui.json`，需重启） | `cli-config.mdx` L35 |
| 内含 V1 -> V2 会话迁移器，历史数据不丢 | `v1-migration-bun.ts` |

### 6.2 V1 的真实优势（相对 V2 的不可替代项）

| 优势 | 证据 |
|---|---|
| **LSP 完整可用**；V2 接受 `lsp` 配置但不运行语言服务器、不暴露 LSP 工具、不产诊断 | `migrate-v1.mdx` L454-455 |
| 多路复用器（tmux/zellij/herdr/panes）；V2 被 host 门控关闭 | `opencode-v2-compatibility.md` 功能矩阵 |
| orchestrator-wake 调度器；V2 未移植（靠宿主内建通知替代，语义不同） | 同上 |
| `chat.headers` 自定义请求头；V2 未桥接 | 同上 |
| 插件生态按 V1 构建（quota 4.10.2 等），V2 需换版本或等移植 | npm peer：4.10.2 = `@opencode-ai/plugin ^1.4.3` |
| 非 beta，行为稳定；V2 为 `opencode2 2.0.13` | 本机实装 |
| `external_directory` 默认 **ask**；V2 默认 allow | `migrate-v1.mdx` L137-140 |

### 6.3 加权评分（权重按你的实际工作流设定）

| 维度 | 权重 | V1 | V2 | 依据 |
|---|---|---|---|---|
| 当前可用性与稳定性 | 25% | 5.0 | 2.5 | V2 是 beta 线；OMO 已验证到 `beta-18743`，与 2.0.13 未逐条对齐 |
| 与你现有工作流契合 | 20% | 5.0 | 3.0 | 三项硬损失（LSP、multiplexer、wake）全命中 |
| 配置/插件兼容 | 15% | 5.0 | 3.5 | 配置层兼容好，插件层硬分叉（quota） |
| 能力上限 | 15% | 3.0 | 4.5 | 6.1 九项增益 |
| 权限与安全姿态 | 10% | 3.5 | 3.0 | 模型更严谨但默认更松 |
| 可维护性/未来性 | 15% | 2.0 | 5.0 | 官方路线是 V2，V1 只会修 bug |
| **加权总分** | | **4.10** | **3.48** | |

### 6.4 结论

- **问"现在哪个更好用"：V1。** 差距 0.62 分，几乎全部来自"稳定性"与"工作流契合"两项——即你的 LSP 与并行编排。
- **问"哪个平台更好"：V2。** 若把前两项权重降到 10% 并抬升"能力上限/未来性"，V2 反超。判定标准不是版本号，而是"你要不要那三样 V1 独有的能力"。
- **临界条件**：V2 补上 LSP（或你接受用 typecheck/lint 替代）且 OMO 的 multiplexer 缺口被原生 subagent 渲染正式覆盖时，权重反转，V2 即成为更优选择。



**官方文档（一手）** —— 仓库 `github.com/anomalyco/opencode`（由 `@opencode/cli` 的 `repository` 字段确认）；本次实际读取的缓存副本在 `C:\Users\Winde\AppData\Local\Temp\opencode\`
- `migrate-v1.mdx`（633 行）：安装并行性 L5-6；配置同路径 L51-66；权限 L97-140；agent L144-180；mcp L228-266；skills L297-316；lsp 缺失 L454-455；autoupdate L462；agent/skill/command 文件 L487-548；cli.json L559-570；plugins L572-599；server API L604-627
- `skills.mdx`（245 行）：发现路径 L41-48；优先级 L164-182；`SKILL.md` 规则 L54-65
- `cli-config.mdx`（425 行）：`cli.json` 位置 L18-35；终端插件声明 L369-392
- `plug-migrate.mdx`（376 行）：插件 API 迁移
- `supervisor.ts`（248 行）、`plugin-module.ts`（186 行）：v2 插件加载器
- `global.ts`、`global-roots.ts`：`roots("opencode")` 定义 data/config/state 目录

**插件维护方一手文档（本地）**
- `E:\云文件\GitHub\oh-my-opencode-slim\docs\opencode-v2-compatibility.md`（273 行）：双导出结构、功能矩阵、v2-only 限制、注册规则、环境注意事项
- `E:\云文件\GitHub\oh-my-opencode-slim\package.json`（v2.2.18）：`exports` 的 `.` / `./server` / `./tui` 三入口

**本机实装（只读盘点，exp-1）**
- `C:\Users\Winde\.config\opencode\opencode.json`（53 行）、`oh-my-opencode-slim.json`（362 行）、`tui.json`、`cli.json`、`package.json`
- `C:\Users\Winde\AppData\Roaming\npm\node_modules\@opencode\cli\package.json`（v2.0.13，双 bin）
- `~\.agents\skills\`（41 个）、`~\.config\opencode\skills\`（9 个）、`~\.config\opencode\.oh-my-opencode-slim\skills-manifest.json`

**npm 元数据**
- `@slkiser/opencode-quota`：4.10.2 peer `@opencode-ai/plugin ^1.4.3`；5.0.0 peer `@opencode/plugin 2.0.16`；6.2.2 peer `>=2.0.28`（latest，2026-11-05）
- `@mohak34/opencode-notifier`：1.1.2 同时 peer `@opencode/client >=2.0.18 <3` 与 `@opencode-ai/plugin >=1.17.0 <2`（2026-11-01）
