# OpenCode V1 -> V2 迁移操作手册（Windows / 本机实装）

- 日期：2026-11-21
- 适用范围：把本机 OpenCode 从 `opencode` 1.19.0 切到 `opencode2` 2.0.13，并保留 V1 可回退
- 前置评估（结论已吸收，不重复论证）：`docs/research/2026-11-21-opencode-v2-upgrade-assessment.md`
- 引用规则：`[本地]` 为磁盘文件，`[源码]` 为 `anomalyco/opencode` master，`[官方]` 为 opencode.ai docs 小节，`[实测]` 为本次只读命令输出
- 本文只写"怎么做"，不写"该不该升"

## 0. 迁移前检查
| 检查 | 命令 | 预期 |
|---|---|---|
| V1 版本 | `opencode --version` | `1.19.0` `[实测]` |
| V2 版本 | `opencode2 --version` | `opencode v2.0.13` `[实测]` |
| 全局包 | `npm ls -g --depth=0` | 同时有 `opencode-ai@1.19.0` 与 `@opencode/cli@2.0.13` `[实测]` |
| bin 指向 | `(Get-Command opencode).Source; (Get-Command opencode2).Source` | 两个 `.ps1` shim 路径 |
| 配置来源 | `opencode2 debug config` | 列出合并来源，含 `C:\Users\Winde\.config\opencode\opencode.json` |
| 全局路径 | `opencode2 debug paths` | data=`C:\Users\Winde\.local\share\opencode`，config=`C:\Users\Winde\.config\opencode` `[源码]` `global.ts` L12-13、`global-roots.ts` L5-16 |
| 会话迁移状态 | 见 §5 的只读查询 | 本机已为 `{"phase":"completed"}` `[实测]` |
| 剩余空间 | `(Get-PSDrive E).Free` | 大于 12 GB（数据目录约 9.9 GB）`[实测]` |

上述命令与 `opencode2 debug config` 的输出都依赖当前工作目录；本手册默认在 `C:\Users\Winde` 下执行（该目录另有项目级 `.opencode\opencode.json`，见 §2.6）。

备份（先退出所有 OpenCode 实例，让 WAL 落盘）：

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$dst = "E:\backup\opencode-$stamp"
New-Item -ItemType Directory -Path $dst -Force | Out-Null
robocopy "$env:USERPROFILE\.config\opencode" "$dst\config" /MIR /R:1 /W:1 /NFL /NDL
robocopy "$env:USERPROFILE\.local\share\opencode" "$dst\share" /MIR /R:1 /W:1 /NFL /NDL
Get-ChildItem -LiteralPath "$dst\share" -Filter "opencode.db*" | Select-Object Name,Length
```

robocopy 退出码 0-7 均为成功，`$LASTEXITCODE>=8` 才算失败。两份目录都必须备份：配置在 `%USERPROFILE%\.config\opencode`，数据/会话在 `%USERPROFILE%\.local\share\opencode`；后者容量来自本机实测（`opencode.db` 8.9 GB + WAL 0.9 GB）。V1/V2 共用这对目录（`[源码]` `global.ts` L12-13）。

## 1. 版本与 bin 处置
冲突事实：`@opencode/cli@2.0.13` 的 `bin` 同时声明 `opencode` 与 `opencode2`；`opencode-ai@1.19.0` 也声明 `opencode`（`[本地]` 两个 `package.json`；`[实测]`）。当前 `%APPDATA%\npm\opencode.ps1` 指向 `node_modules\opencode-ai\bin\opencode.exe`（`[本地]` 文件内容），即裸 `opencode` 目前是 V1。

1. 试跑期一律用 `opencode2` 调 V2，裸 `opencode` 保持 V1；不依赖 `opencode` 判断版本。
2. 判定 shim 归属要读 shim，不要猜：
   ```powershell
   Select-String -LiteralPath "$env:APPDATA\npm\opencode.ps1" -Pattern "node_modules"
   ```
   出现 `node_modules/@opencode/cli/` = V2 胜出；`node_modules/opencode-ai/` = V1 胜出。
3. 想让 `opencode` 指向 V2（会夺走 V1 的命令名）：`npm uninstall -g opencode-ai` 后 `npm install -g @opencode/cli@2.0.13`，再 `opencode --version`，预期 `opencode v2.0.13`；回退见 §7。
4. 官方立场是不并存，V2 安装器会替换 V1（`[官方]` migrate-v1 §Install V2 / 首段）。本机"并存"来自第三方 npm 包的双 bin，不是官方形态。

## 2. 配置迁移
总原则：V2 读取与 V1 相同路径，并在内存归一化 V1 字段、不回写源文件（`[官方]` migrate-v1 §Use your existing configuration）。所以"不改也能跑"，但下列**取值**必须改，否则插件加载失败或解析到错误包。V1/V2 共用同一份文件，一旦改成 V2 原生形态，V1 会读到不认识的键（官方同节警告）。

### 2.1 `C:\Users\Winde\.config\opencode\opencode.json`（53 行）
| 键（行号 `[本地]`） | V1 现状 | V2 写法 / 事实 | 是否改 |
|---|---|---|---|
| `plugin` L4-7 | `["opencode-quota","E:/云文件/GitHub/oh-my-opencode-slim"]` | V2 原生名 `plugins`；值见 §3 | 键名可留（自动归一，`[官方]` §Plugins）；**值必须改** |
| 本地插件路径 L6 | 仓库根 | `"E:/云文件/GitHub/oh-my-opencode-slim/dist/server"` | 必须改 |
| `agent.*.disable` L8-21 | 4 个内置 agent 禁用 | `agents.*.disabled` | 自动归一（`[官方]` §Agents and modes）；不改 |
| `mcp` L22-48 | `type:local` + `enabled:true` | `mcp.servers` + `disabled:false`；`timeout` 拆 `catalog`/`execution` | 自动归一（`[官方]` §MCP servers）；不改 |
| `lsp: true` L49 | 启用 LSP | 仍被接受，但不运行语言服务器、不暴露 LSP 工具、不产诊断 | 配置不改，工序改（`[官方]` §Supported fields without direct native equivalents） |
| `instructions` L50-52 | `preferences.md` | 同名保留 | 不改（同上节） |
| `autoupdate: "notify"` L3 | notify | `update:"notify"` | 自动归一，同上节；不改 |
| 权限（未配置） | 项目外访问默认 ask | V2 默认 allow | 要保留旧行为需加 `{"action":"external_directory","resource":"*","effect":"ask"}`（`[官方]` §Permissions and tools） |
| todos（未配置） | 默认开 | 默认关 | 需要时加 `"experimental": {"todo": true}`（同上节） |
| `$schema` L2 | `https://opencode.ai/config.json` | 保留 | 不改；V2 是否有专用 schema 见 §9-3 |

`[实测]` `opencode2 debug config` 已显示归一化结果：`update:"notify"`、`agents.*.disabled`、`mcp.servers.*.disabled`、`plugins`（源文件仍写 `plugin`）。即 V2 已在内存完成归一，源文件未变。

### 2.2 `cli.json`（16 行）
已是 V2 格式（L2 `$schema` = `https://opencode.ai/v2/cli.json` `[本地]`），V2 只读此文件。键位合法：`plugins` L3-6、`diffs.wrap` L7-9、`session.sidebar/scrollbar/thinking` L10-14、`animations` L15，依据 `[官方]` cli/config §Plugins/§Diffs/§Sessions/§Appearance。**唯一要改**：`plugins` 两项都未钉版本（`@slkiser/opencode-quota@latest`、`oh-my-opencode-slim`），替换为 §3 的精确版本。

### 2.3 `tui.json`（7 行）
V2 不再读取分层 `tui.json(c)`，只用全局 `cli.json`；`cli.json` 已存在，故首次启动不会触发自动迁移（`[官方]` migrate-v1 §Terminal client configuration）。保留给 V1，不再维护。

### 2.4 `oh-my-opencode-slim.json`（362 行）
插件私有 schema，与宿主无关：`preset`、`council.*`、每 agent 的 `model`/`variant`/`skills`/`mcps` 由 OMO 在 `setup(ctx)` 内自行解析（`[本地]` 文件 L2-27；`[官方插件文档]` OMO 文档 §Configuring models on v2）。**不需要迁移**；V2 下模型解析规则与 V1 相同。

### 2.5 并行期的配置分流（可选，有前提）
V2 的 Global 服务取 `process.env.OPENCODE_CONFIG_DIR ?? <XDG_CONFIG_HOME>/opencode`（`[源码]` `global.ts` L79），可给 V2 单独配置目录，避免与 V1 抢同一份文件：`$env:OPENCODE_CONFIG_DIR = "C:\Users\Winde\.config\opencode-v2"`，再 `opencode2 debug paths` 确认 config 行。该变量未见于官方 config 文档，且是否同时改变 skills 发现根未验证（§9-1）。不采用时，就接受两宿主读同一份文件、取值按 V2 改，V1 侧插件加载会因此失败。

### 2.6 `C:\Users\Winde\.opencode\`（home 的项目级 V1 配置，最容易漏）
该目录在"当前目录 = home"时作为项目级配置参与合并，V2 同样会读（`[实测]` `opencode2 debug config` 输出中列在全局文档之后）。
- `opencode.json` L2-12：`plugin` 是 **package+options 元组**；V2 已归一为 `{package, options}`（`[实测]`），但 `oc-plugin-vault-tec@0.3.0` 的 peer 是 `@opencode-ai/plugin`（V1 API，`[实测]` npm view），而 V2 不运行 V1 插件实现（`[官方]` migrate-v1 §Plugins）→ 视为不可用，需换 V2 版或删除该条。
- `"~/.config/opencode/node_modules/superpowers"`：`[实测]` 该目录不存在（`plugins\superpowers` 是空目录），此条在 V1 侧也可能已悬空；V2 要求目录且含 `index.js`。
- `tui.json` L2-12：项目级 TUI 配置；V2 只读全局 `cli.json`，不迁移项目级 `tui.json`（`[官方]` §Terminal client configuration），主题/扫描线等外观需在全局 `cli.json` 或对应 TUI 插件入口重配。
- `package.json`：只钉 `@opencode-ai/plugin 1.4.6`（V1 SDK），`node_modules` 内没有上述两个插件。

## 3. 插件迁移
### 3.1 quota：两代硬分叉，必须两套写法
| 宿主 | 写法 | 依据 |
|---|---|---|
| V1 | `"@slkiser/opencode-quota@4.10.2"` | peer `@opencode-ai/plugin ^1.4.3` `[实测]` npm view |
| V2 | `"@slkiser/opencode-quota@6.3.0"`（保守可用 6.2.2） | peer `@opencode/plugin >=2.0.28`，两者相同 `[实测]` |
| V2 TUI（`cli.json`） | 与 V2 服务端同版本 | TUI 走 `exports["./tui"]`，与 server 入口分离（`[本地]` 该包 package.json） |

没有跨代版本。V1 侧当前写**裸名** `opencode-quota`（`[本地]` opencode.json L5），而 npm 上 `opencode-quota@0.0.1-dev` 是另一个包（仓库 nelsonPires5，描述为 Codex/Antigravity/z.ai 额度 `[实测]`），与 `@slkiser/opencode-quota` 不同包；三个候选根目录下均未找到名为 `opencode-quota` 的已安装副本。结论：V1 也改成显式 scoped + 精确版本。V1 侧另有 `v4-latest` dist-tag（=`4.10.13`，`[实测]`），本手册按 4.10.2 钉死。

### 3.2 OMO Slim 本地 fork
- 入口：V2 走 `exports["./server"]` → `dist/server/index.js`（`[本地]` OMO package.json L13-15，构建脚本 L60）。V2 插件解析器优先试 `server` 子路径；直接注册 `dist/server` 目录时，目录内 `index.js` 即入口（`[官方插件文档]` §How it works、§Registration rules）。
- 构建：`Set-Location -LiteralPath "E:\云文件\GitHub\oh-my-opencode-slim"; bun install; bun run build; Test-Path -LiteralPath "dist\server\index.js"`，预期 `True`。现有产物构建于 2026-09-05，src 最新改动同日、`git status` 干净、领先 origin 32 个提交（`[实测]`），仍应重建（§9-8）。
- 注册（V2）：`"E:/云文件/GitHub/oh-my-opencode-slim/dist/server"`。必须是**目录**；指向 `dist/server.js` 这类文件会被拒并告警（`[官方]` migrate-v1 §Plugins；`[官方插件文档]` §Registration rules）。
- 版本钉定：改用 npm 包时写 `"oh-my-opencode-slim@2.2.18"`，不要 `@latest`。V2 对未钉版本的 npm/Git 插件会在启动时检查更新（`[官方]` plugins §Reload "checks unpinned npm and Git plugins for updates"），OMO 文档则称会"每次启动自动刷新"（`[官方插件文档]` §Installing on v2），两者表述不一致（§9-2）；结论一致：钉精确版本。
- 不要同时注册 npm 包与本地目录：重复插件 ID 会硬失败（`[官方插件文档]` §Registration rules 末条）。V1 侧保持仓库根路径，走主入口 `dist/index.js`（`[本地]` OMO package.json L6、L8-12）。

### 3.3 notifier：先判定，别猜
现状：`@mohak34/opencode-notifier` 只出现在 `~/.config/opencode/package.json` L3（`latest`），三份配置（全局 `opencode.json`、home 项目级 `.opencode\opencode.json`、`cli.json`）的 `plugin(s)` 都没有它；`~/.config/opencode/plugins` 下只有空的 `superpowers` 目录；状态文件 `opencode-notifier-state.json` 为 `{"turn":226}`、mtime 2026-05-15；日志无加载记录（`[实测]`）。判定方法（任一命中才算加载）：

```powershell
Select-String -LiteralPath "$env:USERPROFILE\.config\opencode\opencode.json","$env:USERPROFILE\.config\opencode\cli.json","$env:USERPROFILE\.opencode\opencode.json" -Pattern "notifier"
Get-ChildItem -LiteralPath "$env:USERPROFILE\.config\opencode\plugins" -Recurse -File
opencode2 plugin list
```

前两条为空且第三条无 notifier = 未加载，V2 侧无需迁移。要启用则用 `@mohak34/opencode-notifier@1.1.3`（peer 同时覆盖 `@opencode/plugin >=2.0.18 <3` 与 `@opencode-ai/plugin >=1.17.0 <2`，`[实测]`），显式写入 `plugins`。

## 4. 技能与工作流
数量以命令为准（评估报告写 39，本机实测 41）：

```powershell
(Get-ChildItem -LiteralPath "$env:USERPROFILE\.agents\skills" -Directory | Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") }).Count
(Get-ChildItem -LiteralPath "$env:USERPROFILE\.config\opencode\skills" -Directory | Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") }).Count
$ids = @(); foreach ($r in @("$env:USERPROFILE\.agents\skills","$env:USERPROFILE\.config\opencode\skills")) { $ids += (Get-ChildItem -LiteralPath $r -Directory | Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") }).Name }; $ids | Group-Object | Where-Object Count -gt 1
```

预期：前两行 `41`、`9`；第三行无输出（无重复 ID）`[实测]`。

发现顺序与优先级（`[官方]` skills §Discovery/§Precedence）：内置 → `.claude/skills` → `.agents/skills`（全局优先）→ `~/.config/opencode/skills` → 项目 `.opencode/skills` → 显式 `skills` 数组。即 `~/.agents/skills` 优先级**低于** `~/.config/opencode/skills`，同 ID 时后者覆盖。目录名即 ID（大小写敏感）；含 `SKILL.md` 的目录算一个技能、不再向内搜索；源根下最多 6 层。

必须重测的工作流环节：

1. multiplexer：V2 下被 host-gated off，会话管理器强制 `type:"none"`（`[官方插件文档]` §Feature matrix；`[实测]` `oh-my-opencode-slim.20261121T135119.log` L1 `enabled:false`）。
2. orchestrator-wake：未移植，改由 V2 内建 `subagent` 完成通知（同上 §v1-only, by design）；`background-orchestration` 技能语义需重测。
3. 委派：V2 `subagent` 参数经桥接归一为 V1 `task`（`agent`→`subagent_type`、`sessionID`→`task_id`），命令默认后台运行并回报父会话（OMO 文档 §The v2 adapter；`[官方]` migrate-v1 §Commands）。
4. `/interview`、`/deepwork`、`/reflect`、`/loop`：走 marker 往返（OMO 文档 §Feature matrix）。
5. idle 重复：V2 以 `session.status` 为主，适配层额外合成 `session.idle`，同时监听会收到两次 idle（OMO 文档 §Upstream behaviors）。
6. `chat.headers` 未桥接，依赖自定义请求头的工序失效（同上 §v1-only）。
7. TUI `/preset` 依赖 `cli.json` 注册包提供的 `./tui` 入口（`dist/tui2.js`），需实机验证侧栏与切换。

## 5. 会话数据迁移
触发与门控（`[源码]` `packages/core/src/database/v1-migration.bun.ts`）：

- 自动执行，无需命令：`layer` 启动时 fork 运行 `run()`（L512-529），首个进度标签 `Clearing old events`（L514）。
- 进入条件：KV 状态不是 `completed` **且** 当前库存在名为 `session` 的表（L541-550、L1229-1234 的 `sqlite_master` 探测）。
- 数据源：当前库的 V1 `session/message/part` 表，加上数据目录下的 `opencode-next.db`（L576-588、L799-803、L936-943）。
- 顺序与断点：按 `session.id` 倒序逐条处理，每条事务先写 `KVTable` 的 `migration.v1-v2`（`phase:"sessions"` + `cursor`），完成时写 `phase:"completed"`（L601-616、L642-649、L739-761）。
- 完整性：旧行 `INSERT OR IGNORE` 进 V2 表，并**保留原始 V1 行**（L618-619 注释、L674 起）。
- 历史工具名改写：`bash→shell`、`task→subagent`、`apply_patch→patch`，`todowrite` 记录移除并生成提示（L996-998、L1016-1025）。

进度观测：`status()` 返回 `required` / `running(progress)` / `completed` / `error`（L87-90、L500-510）；失败记录 `V1 migration failed` 并停在 error（L517-520），已写 cursor 会在下次启动续跑。

本机现状（`[实测]`，只读）：库内同时有 `session`（799 行）与 `session_v2`，KV `migration.v1-v2` = `{"phase":"completed"}`。复查脚本（写到临时文件以避开 PowerShell 引号问题）：

```powershell
$code = @'
import { Database } from 'bun:sqlite'
const db = new Database(process.argv[1], { readonly: true })
console.log(db.query(`SELECT value FROM kv WHERE key = 'migration.v1-v2'`).get())
console.log(db.query('SELECT COUNT(*) AS c FROM session').get())
'@
$tmp = Join-Path $env:TEMP "check-migration.ts"
Set-Content -LiteralPath $tmp -Value $code -Encoding UTF8
bun $tmp "$env:USERPROFILE\.local\share\opencode\opencode.db"
Remove-Item -LiteralPath $tmp
```

失败处置：先查 `Select-String -LiteralPath "$env:USERPROFILE\.local\share\opencode\log\opencode.log" -Pattern "V1 migration"`；cursor 无法从 UI 清除，只能回滚数据目录（§7）。不可逆边界：无 V2→V1 转换器；首次迁移会分批 `DELETE FROM event`（L561-568），`event` 表内容不可恢复；V1 会话行虽保留，但 V1 能否正常读回未经运行验证（§9-4）。

## 6. 验证清单
| 维度 | 命令 | 预期 |
|---|---|---|
| 模型 | `opencode2 models` | 列出 `deepseek/*`、`kimi-code-plan-cn/*`、`opencode-go/*` |
| 凭据 | `opencode2 auth list` | 至少一个 provider 已登录 |
| agent | `opencode2 debug agents` | `orchestrator` + `explorer/librarian/oracle/designer/fixer`（OMO 日志 `agents:15` `[实测]`） |
| 权限 | `opencode2 debug config` | 能看到合并来源；外部目录规则按 §2.1 出现 |
| MCP | `opencode2 mcp list` | `blender-mcp`、`chrome-devtools`，外加 OMO 内建 `context7`/`gh_grep` |
| 技能 | §4 的三条命令 | `41` / `9`，无重复 ID |
| 插件 | `opencode2 plugin list` | OMO 与 quota 各一条且版本与配置一致（可能安装缺失包，先备份） |
| 委派 | `opencode2 run --standalone "list your specialist agents"` | 点名 explorer、librarian、oracle、designer、fixer（`[官方插件文档]` §Installing on v2） |
| 会话/路径 | `opencode2 session list`；`opencode2 debug paths` | 有已迁移会话；路径与 §0 一致 |

## 7. 回滚方案
V2 不回写配置文件（`[官方]` §Use your existing configuration），配置回滚零成本；数据面靠备份。

```powershell
opencode2 service stop
npm install -g opencode-ai@1.19.0
Select-String -LiteralPath "$env:APPDATA\npm\opencode.ps1" -Pattern "node_modules"
opencode --version
```

预期 shim 指回 `node_modules/opencode-ai/`，版本 `1.19.0`。数据回滚仅在确认损坏时执行：

```powershell
Remove-Item -LiteralPath "$env:USERPROFILE\.local\share\opencode" -Recurse -Force
robocopy "E:\backup\opencode-<stamp>\share" "$env:USERPROFILE\.local\share\opencode" /MIR /R:1 /W:1
```

不可逆边界：`event` 表删除、`session_v2/session_message/project` 新表内容、`opencode-next.db` 导入结果，只有恢复备份才能撤销；`--standalone` 与版本回退无关。

## 8. 执行顺序（TL;DR）
1. 退出全部 OpenCode 实例；按 §0 跑检查命令并完成两份 robocopy 备份，核对 `opencode.db` 大小。
2. 按 §3.2 重建 OMO（`bun install` + `bun run build`），确认 `dist\server\index.js`。
3. 编辑 `opencode.json`：插件数组改为 `@slkiser/opencode-quota@6.3.0` 与 `E:/.../oh-my-opencode-slim/dist/server`。
4. 编辑 `cli.json`：`plugins` 两项钉精确版本。
5. 视需要加 `experimental.todo` 与 `external_directory: ask` 规则；要隔离配置则设 `OPENCODE_CONFIG_DIR`（§2.5）。
6. `opencode2 debug config` + `opencode2 debug paths`，确认读的是预期文件。
7. 依次跑 `opencode2 debug agents`、`opencode2 mcp list`、`opencode2 models`、`opencode2 auth list`，再跑 §4 技能检查。
8. 跑 `opencode2 run --standalone "list your specialist agents"`，再跑一个真实小工单，重点看 §4 的 7 个重测项。
9. 稳定后再决定是否让 `opencode` 指向 V2（§1 第 3 条），否则保持双命令并存。

## 9. 未证实 / 需要人工确认
1. `[未证实]` `OPENCODE_CONFIG_DIR` 是否同时改变 skills 发现根、V1 是否识别它（源码只显示 V2 Global 服务读取）。确认：设变量后对比 `opencode2 debug paths` 与技能计数。
2. `[未证实]` V2 对未钉版本 npm 插件是"仅检查更新"还是"静默升级"：官方 plugins 文档写 "checks ... without changing the installed package"，OMO 文档写 "auto-refreshes ... on every startup"。确认：两次启动后比对 `node_modules` 内版本。
3. `[未证实]` `opencode.json` 是否存在 V2 专用 `$schema`。确认：查官方 config 文档或 schema 端点，勿猜。
4. `[未证实]` 迁移后 V1 能否正常读回会话（旧 `session` 行保留 799 行，但 `event` 表已清空）。确认：V1 启动后 `opencode session list` 或 TUI 历史。
5. `[未证实]` OMO 在本机 2.0.13 上是否 bridges 全绿（维护方仅验证 `beta-18743`）。确认：看插件日志 `health check passed` 与 `bridges` 数。
6. `[未证实]` V1 侧裸名 `opencode-quota` 实际解析到哪个包（三个候选根目录无同名安装副本，日志无加载记录）。确认：搜 `package.json` 扩展 §3.3 的判定命令。
7. `[未证实]` notifier 当前是否加载（无配置项、日志无记录、state 陈旧）。确认：§3.3 三条命令。
8. `[未证实]` 本地 `dist/server/index.js` 与当前 src 是否字节一致（构建于 2026-09-05，git 干净但未比对）。确认：重建后比对 mtime/哈希。
9. `[未证实]` 模型能否在 V2 下按 ID 枚举并加载全部技能。确认：`opencode2 run --standalone "list your available skills by id"`，与 §4 计数比对。
10. `[未证实]` `service.json` 的 `password` 归属（V1 service 还是 V2 server；V2 认证改用 `OPENCODE_PASSWORD`、用户名固定 `opencode`）。确认：`[官方]` migrate-v1 §Server authentication 与实际登录行为。

## 10. 执行记录（2026-11-21 实机）

### 10.1 与原计划的三处偏差

1. **`plugin` 与 `plugins` 不是"V2 优先"，而是合并。** 保留 V1 的 `plugin` 键做回退，会让 V2 把两套条目并进同一个 `plugins` 数组（实测 4 条：仓库根 + `dist/server` 各一份），触发重复插件 ID。结论：**必须二选一**，已删除 `plugin` 键。
2. **版本从 2.0.13 升到 2.3.2。** 原计划锁 2.0.13；实测其模型目录缺少用户依赖的 provider，遂升 `latest`（`2.3.2`）。升级未解决 provider 问题（见 10.2），但版本更近、`auth export/import` 等子命令可用。
3. **V2 有独立凭据库。** V1 的 `~/.local/share/opencode/auth.json`（`{"provider":{"type":"api","key":...}}`）不被 V2 读取；V2 凭据形如 `cred_*`，需用 `opencode2 auth import <file>` 导入导出格式。

### 10.2 provider 丢失的真实原因与修法

现象：`opencode2 auth list` 只认 DeepSeek，`opencode2 models` 只有 13 个模型；preset 里的 `kimi-code-plan-cn/*`、`opencode-go/*` 全部不可用。

原因两条，缺一不可：

- **模型目录**：V2 不会因为 `auth.json` 里有 key 就自动收录 provider，必须在配置里显式声明 `providers.<id>`（`package` + `settings.baseURL`）。`kimi-code-plan-cn` 与 `opencode-go` 在 models.dev 目录中存在（`npm=@ai-sdk/openai-compatible`），但需配置触发加载。
- **凭据**：声明 provider 后仍需 key；V2 只认自己的凭据库，需 `auth import`。

修法（已落地，写入 `C:\Users\Winde\.config\opencode\opencode.json`）：

```json
"providers": {
  "kimi-code-plan-cn": { "package": "aisdk:@ai-sdk/openai-compatible",
    "settings": { "baseURL": "https://api.kimi.com/coding/v1" } },
  "opencode-go": { "package": "aisdk:@ai-sdk/openai-compatible",
    "settings": { "baseURL": "https://opencode.ai/inference/go/openai/v1" } }
}
```

```powershell
# 凭据：由 V1 auth.json 转成 V2 export 格式后导入（不要打印明文）
$v1 = Get-Content "$env:USERPROFILE\.local\share\opencode\auth.json" -Raw | ConvertFrom-Json
$out = @(); foreach ($p in $v1.PSObject.Properties) { $out += [ordered]@{ id="v1-$($p.Name)"; integrationID=$p.Name; label="API key"; active=$true; value=[ordered]@{ type="key"; key=$p.Value.key } } }
$tmp = Join-Path $env:TEMP "oc-auth-import.json"; $out | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $tmp -Encoding UTF8
opencode2 auth import $tmp; Remove-Item -LiteralPath $tmp -Force
```

结果：模型 `14 -> 52`，provider `deepseek / kimi-code-plan-cn / opencode / opencode-go` 全部出现；`kimi-code-plan-cn/k3` 与 `opencode-go/glm-5.3-flash` 各跑一次 `run --standalone` 均返回 `OK`（exit 0）。

### 10.3 其他实测结论

- `~/.opencode/opencode.json` 的 `oc-plugin-vault-tec`（V1 插件 API）在 V2 不运行；已备份为 `.bak-20261121` 并清空 `plugins`。
- `debug agents` 里出现的 `k3`、`glm-5.3-flash` 等"额外 agent"是正则误读：它们是 agent 定义里嵌套的 `model.id`，不是真 agent。
- OMO 在 2.3.2 上 15 个 agent 全部注册（orchestrator 及其 beta/gamma/delta 变体齐全）。
- `blender-mcp` 报 `Connection closed`：Blender 未运行，与迁移无关。
- 卸载 `opencode-ai@1.19.0` 会连带删除共享的 `opencode` shim（npm bin 冲突），需重装 `@opencode/cli` 恢复；实测重装后 `opencode` 与 `opencode2` 均为 `v2.3.2`。

### 10.4 回滚（V1 二进制已卸载）

```powershell
npm install -g opencode-ai@1.19.0
# 并恢复 opencode.json 的 V1 形态：从 E:\backup\opencode-<stamp>\config\opencode.json 取回 plugin 键
```

注意：数据目录已被 V2 迁移过（`migration.v1-v2 = completed`），V1 读回旧会话未经运行验证；数据回滚只能整目录还原备份。

## 参考来源
- `[官方]` https://opencode.ai/docs/migrate-v1/ ：不并存与替换（§Install V2）；配置同路径、内存归一化、勿改写后给 V1 用（§Use your existing configuration）；权限/external_directory/todos（§Permissions and tools）；agent 归一（§Agents and modes）；MCP 归一（§MCP servers）；skills 不变（§Skills）；lsp/instructions/autoupdate（§Supported fields without direct native equivalents）；cli.json 迁移（§Terminal client configuration）；plugins 键与目录规则（§Plugins）；服务端认证（§Server authentication）
- `[官方]` https://opencode.ai/docs/plugins/ ：`plugins` 数组、目录发现、`plugin add/list/check/update`、未钉版本检查（§Configure/§Discover/§Manage/§Reload）
- `[官方]` https://opencode.ai/docs/skills/ ：发现路径、深度 6 层、ID 规则、优先级顺序（§Discovery/§IDs/§Precedence）
- `[官方]` https://opencode.ai/docs/cli/config/ ：`cli.json` 位置与热加载、`session`/`diffs`/`animations`/`plugins` 键（§Configuration file/§Sessions/§Diffs/§Appearance/§Plugins）
- `[官方]` https://opencode.ai/docs/build/plugins/migrate-v1/ ：V1 插件不运行、目录入口、双代同包导出（§Migrate plugin configuration/§Support V1 and V2 from one package）
- `[源码]` https://raw.githubusercontent.com/anomalyco/opencode/master/packages/core/src/database/v1-migration.bun.ts ：L87-90 状态类型；L500-529 启动触发；L541-590 门控与进度；L561-568 清 event；L601-649 游标；L739-761 完成；L799-803/L936-943 `opencode-next.db`；L996-1025 工具名改写；L1209-1234 KV 与 `hasLegacySessions`
- `[源码]` https://raw.githubusercontent.com/anomalyco/opencode/master/packages/util/src/global.ts ：L12-13 app/roots；L79 `OPENCODE_CONFIG_DIR`；`.../util/src/global-roots.ts` L5-16 XDG data/cache/config/state
- `[本地插件文档]` `E:\云文件\GitHub\oh-my-opencode-slim\docs\opencode-v2-compatibility.md` ：L49-68 三入口与 v2 解析顺序；L128-147 能力矩阵；L164-210 安装/钉版本/注册规则；L212-221 模型解析；L235-247 v1-only 限制；L249-268 环境注意
- `[本地]` `E:\云文件\GitHub\oh-my-opencode-slim\package.json` ：L6-20 三入口 exports；L57-63 构建脚本；L90-91 V1 SDK 版本
- `[本地]` `C:\Users\Winde\.config\opencode\` 下 `opencode.json` L2-52、`cli.json` L2-15、`tui.json` L2-6、`package.json` L2-6、`oh-my-opencode-slim.json` L1-27；`C:\Users\Winde\.opencode\` 下 `opencode.json` L2-12、`tui.json` L2-12、`package.json`；`%APPDATA%\npm\opencode.ps1` 实际指向；两个全局包 `package.json` 的 `bin`
- `[实测]` npm registry 2026-11-21：quota 4.10.2 peer `@opencode-ai/plugin ^1.4.3`；6.2.2/6.3.0 peer `@opencode/plugin >=2.0.28`；latest=6.3.0，`v4-latest`=4.10.13；`opencode-quota@0.0.1-dev` 为不同包；notifier 1.1.3 双代 peer
- `[实测]` `opencode2 --help` 子命令（`auth/mcp/plugin/models/session/debug/run/service`）；`opencode2 debug paths|config|agents`；`--version` 输出；只读 DB 查询（表含 `session`/`session_v2`，KV=`completed`，`session` 799 行）；`oh-my-opencode-slim.20261121T135119.log` L1 `enabled:false`、L3 `agents:15/tools:9/mcps:2`
