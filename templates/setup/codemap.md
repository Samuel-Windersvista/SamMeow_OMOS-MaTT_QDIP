# templates/setup/

## Responsibility

首次运行引导服务（First-run Setup Service）：负责把玩家在浏览器引导页上做的选择（服务商 / API key、AI 人格、按角色模型分配、工作目录）写入 opencode 的便携配置目录，并验证 API key 的有效性。是 QDIP「首次配置」体验的完整三层实现，外加一份两端共享的服务商契约：

- `contract.js` —— 服务商契约层：浏览器与服务端共享的唯一一份服务商事实（`PROVIDERS` / 保留名 / 名称规则 / 模型表）与纯算法（key 派生、模型解析与合并、错误翻译、条目分类）。零依赖，不碰 DOM / `fs` / `node:*`；浏览器经 `/setup/contract.js` 以全局 `QDIPContract` 加载，服务端以 `require('./contract')` 加载
- `config-writer.js` —— 配置写入器（Service 层）：纯 Node 模块，无 HTTP 依赖，封装全部文件写入逻辑、人格文本与连通性测试；服务商事实从 `contract.js` 引入
- `guide-server.js` —— 本地引导 HTTP 服务器（Controller 层）：提供 REST API 端点与 setup 目录静态文件服务，业务委托给 `config-writer.js`
- `first-run.html` —— 引导页前端（View 层）：经 `/setup/contract.js` 加载共享契约，仍完全离线运行的终端风格配置 UI
- `wt-profile.ps1` —— Windows Terminal 便携 profile 生成器（不属于引导服务）：由 `启动.bat` 在每次以 WT 打开工作台前调用，把 QDIP profile 与剪贴板键位写入包内 `settings\settings.json`
- `contract.test.js` / `config-writer.test.js` / `guide-server.test.js` —— 行为契约测试（node:test）

## Design

- **契约单一来源（Single Source of Contract）**：服务商元数据与纯算法只写一份 `contract.js`，两端共享——浏览器用 `<script src="/setup/contract.js">` 取全局 `QDIPContract`，服务端 `config-writer.js` 用 `require('./contract')`。页面不再硬编码保留名、名称长度、派生截断预算或模型键映射；`AVAILABLE_MODELS` 的键与 `PROVIDERS` 的键在契约层就被锁死一致（测试断言子集关系）。UI 文案（`DESCS` / `TAGS` / `AGENT_GROUPS` / 提示语）仍留在页面，不进契约。
- **分层架构（Controller / Service / View）**：`guide-server.js` 是薄 HTTP 壳（路由 + JSON 编解码），所有业务逻辑集中在 `config-writer.js`；`first-run.html` 只做交互与展示，通过 fetch 调 API。四者通过 `setup` 目录相对位置耦合，并由 `tools/build.ps1` 按 `tools/layout.json` 的 `setup` 条目（`kind: "dir"`）以内容合并语义复制；该条目带 `exclude: ["*.test.js", "codemap.md"]`，复制后按 basename 递归删除命中项，因此 `.test.js` 与 `codemap.md` 只留在仓库、不进分发产物。
- **元数据驱动配置（Metadata-Driven Registry）**：`PROVIDERS` 静态表记录服务商关键差异——`builtin`（是否在 opencode 内置注册表）决定写入策略：内置 provider（deepseek / kimi-for-coding / openai）只需写 `auth.json` 即生效；非内置 provider（kimi）需在 `opencode.json` 的 `provider` 段注册为 `{ npm: '@ai-sdk/openai-compatible', options: { baseURL } }`。该结论基于 opencode 1.18.25 实测（注释标注证据来源）。
- **自定义服务商（OpenAI 兼容）**：玩家可新增任意 OpenAI 兼容端点。标识（provider key）由 Base URL 的注册域主标签派生，须避开 `RESERVED_PROVIDER_NAMES`；无 key 的本地端点写占位 key `sk-local`，以保证 auth 条目存在。条目校验（名称格式、长度、保留名、Base URL 协议、模型列表非空）在落盘前统一执行。
- **路径映射表（Path Mapping）**：`AGENT_MODEL_PATHS` 把前端 agent 键（`orchestrator` / `oracle` / `fixer` / … / `council-alpha`）映射到 `oh-my-opencode-slim.json` 内的深层路径；`COUNCIL_SEATS` 负责议会席位同时写入 `council.presets.default` 与 `council.presets.synthesizer` 两处。`setPath()` 提供按路径数组的深写工具。
- **部分覆盖原则（Partial Override）**：`configure()` 只改写玩家显式选择的项——agentModels 仅覆盖指定 agent、persona 为 `default` 时不写任何文件、非内置 provider 才注入 `provider` 段；未选中的 agent 与其它配置字段保持模板原值（测试专门断言此行为）。
- **instructions 条目必须脱离 CWD**：opencode 对 `instructions` 的相对路径按 `process.cwd()` 解析并向上 `globUp`，而 `plugin` 的相对路径按**声明它的 JSON 文件所在目录**解析——两条规则不同。启动器在设置工作目录后会把 CWD 切到玩家项目目录，因此 `configure()` 写入的 persona 条目是 `{env:QDIP_PERSONA}` token（由启动器注入绝对路径），**不是**裸相对路径。详见 `docs/adr/0001-opencode-relative-path-resolution.md`。
- **哨兵与 IPC 文件（Sentinel + IPC）**：启动时写 `data\.guide-url` 通知启动器（端口 + 引导页 URL）；配置完成写 `data\.configured` 标记（含时间戳与服务商列表），供 `启动.bat` 做首次运行门控；工作目录写 `data\workspace.txt`（UTF-8 单行，空值不写）。
- **防御性编程（Defensive）**：静态文件服务用 `path.basename` 归一化路径，防目录穿越（测试有专门用例）；API 全部 try/catch 返回 `{ ok:false, error }` JSON，前端 `friendlyError()` 再做玩家可读翻译。
- **无外部依赖（Zero-Dependency）**：仅用 `node:http` / `node:fs` / `node:path` 内建模块，引导页零外部 CDN 引用——保证分发包离线可用。
- **行为契约由 node:test 测试锁定**：`config-writer.test.js` 断言 auth.json 格式（`{ provider: { type:'api', key } }`，字段名是 `key` 不是 `apiKey`）、builtin / 非 builtin 注入差异、persona.md 写入与 `instructions` 追加 `{env:QDIP_PERSONA}`、agentModels 部分覆盖与 council 双预设写入、自定义服务商的校验与落盘、workspace 落盘；`guide-server.test.js` 用 `spawn` 真实启动服务器，断言 `.guide-url` 写入、`/api/status` 结构、`/api/test` 结构、路径穿越防护，以及 persona + agentModels + 自定义服务商 + workspace 的端到端落盘。

## Flow

**引导服务启动（guide-server.js）**：

```
启动.bat spawn: node setup/guide-server.js <ROOTS>
  → root = path.resolve(argv[2])（启动器传入，无尾反斜杠形态）
  → http.createServer 监听 127.0.0.1:0（随机端口）
  → 监听回调：mkdir data\ → 写 data\.guide-url = http://127.0.0.1:<port>/setup/first-run.html
  → 启动器轮询读到 .guide-url 后 start 打开浏览器
```

**配置交互（浏览器 → API → 磁盘）**：

```
first-run.html 加载
  → GET /api/status → { ok, providers: PROVIDERS, models: AVAILABLE_MODELS, configured }
  → 渲染服务商卡片；若 configured=true 显示「已存在配置」警告
玩家勾选服务商 → 粘贴 API key → POST /api/test { provider, apiKey[, baseUrl] }
  → testConnection()：fetch <baseUrl>/models，Authorization: Bearer <key>，AbortSignal.timeout(10s)
  → 401 →「API key 无效（401）」；402 →「余额不足（402）」；其它非 2xx →「HTTP <code>」；异常 →「网络错误: <msg>」
  → 自定义模式（带 baseUrl）成功时额外解析 OpenAI 格式 { data: [{ id }] } 返回模型列表
  → 前端 state[name] = 通过测试的 key（key 被改动即作废测试结果，防保存未验证 key）
玩家（可选）选人格 / 分配模型 / 填工作目录 → POST /api/configure { providers, persona, personaText, agentModels, workspace }
  → configure({ root, ... })：
     1) 写 opencode\auth\opencode\auth.json（每个服务商 { type:'api', key }）
     2) 改写 opencode\config\opencode\opencode.json（仅注入非内置 provider 与自定义 provider）
     2b) persona ≠ default 时：写 opencode\config\opencode\instructions\persona.md，
         并向 cfg.instructions 追加 '{env:QDIP_PERSONA}'
     2c) agentModels 非空时：按 AGENT_MODEL_PATHS 改写 oh-my-opencode-slim.json，
         议会席位同步写 council.presets.synthesizer
     3) 写 data\.configured（哨兵）
     4) workspace 非空时写 data\workspace.txt
  → 响应 { ok:true } → 前端显示「配置完成」→ 玩家关闭页面重开 启动.bat
```

**静态资源**：`GET /setup/<file>` → `path.join(setupDir, path.basename(rel))`，仅限 setup 目录内文件，MIME 按扩展名映射（html / js / css），其余 404。页面因此能以 `/setup/contract.js` 取到共享契约（`.js` 的 MIME 已映射，引导服务无需为它加专门路由）。

## Integration

- **被调用方**：`guide-server.js` 被 `启动.bat` 以 `node.exe setup\guide-server.js <ROOTS>` 形式 spawn（最小化窗口，仅首次未配置时）；`config-writer.js` 被 `guide-server.js` require（`configure` / `testConnection` / `PROVIDERS` / `AVAILABLE_MODELS`），并作为纯模块被 `config-writer.test.js` 直接导入测试；`contract.js` 被 `config-writer.js` 以 `require('./contract')` 引入，被引导页以 `/setup/contract.js` 加载，并被 `contract.test.js` 直接导入测试；`wt-profile.ps1` 被 `启动.bat` 以 `-Root` / `-WtDir` 参数调用。
- **对外 API 端点（first-run.html 消费）**：
  - `GET /api/status` —— 服务商元数据、可分配模型列表、是否已配置
  - `POST /api/test` —— 单服务商 API key 连通性测试（代理到模型服务商 `GET /models`；带 `baseUrl` 时为自定义直连模式）
  - `POST /api/configure` —— 一次性提交全部配置并落盘
- **读写文件（opencode 便携目录约定）**：`opencode\auth\opencode\auth.json`、`opencode\config\opencode\opencode.json`、`opencode\config\opencode\oh-my-opencode-slim.json`、`opencode\config\opencode\instructions\persona.md`、`data\.configured`、`data\.guide-url`、`data\workspace.txt`。这些路径与 `启动.bat` 的 `XDG_CONFIG_HOME` / `XDG_DATA_HOME` 重定向一致（opencode 在 XDG 下自动追加 `opencode` 段）。
- **上游模板依赖**：`configure()` 假定 `opencode.json` 与 `oh-my-opencode-slim.json` 已按模板存在于 `opencode\config\opencode\`（读取后改写）；测试通过 `makeRoot()` / `makeConfigureRoot()` 从 templates 根目录复制模板来模拟该前置条件。
- **构建集成**：`tools/build.ps1` 按 `tools/layout.json` 的 `setup` 条目（`kind: "dir"`，带 `exclude: ["*.test.js", "codemap.md"]`）把 `templates\setup\*` 以内容合并语义复制到产物 `setup\`，随后按 `exclude` 递归删除测试与 codemap，产物只留 `config-writer.js`、`contract.js`、`first-run.html`、`guide-server.js`、`wt-profile.ps1`；`first-run.html` 的 URL 前缀 `/setup/` 与之对应。产物侧的一致性由 `tools/verify-package.js` 校验（含 `layout/excluded-present`、`config/unparseable` 与 `env/unbound` 等规则）。
- **环境变量依赖**：`configure()` 写入的 `{env:QDIP_PERSONA}` 与模板 `opencode.json` 中的 `{env:QDIP_MCP_CHROME}` / `{env:QDIP_PREFERENCES}` 都必须由 `启动.bat` 与 `进入环境.bat` **两者**注入；`verify-package.js` 的 `env/unbound` 规则在校验产物时断言这一点。
