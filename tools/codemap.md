# tools/

## Responsibility

Build Orchestration（构建编排）与 Packaging Pipeline（打包流水线）。本目录负责把三种来源的资产——`templates/` 下的自有静态模板、`tools/cache/` 下的离线第三方制品（Node 运行时、opencode CLI）、以及外部目录引用的插件/技能组件——依据 `components.json` 声明式清单组装成分发用的 QDIP 整合包目录，并可选压缩为可分发的 zip。同时承担包布局声明（`layout.json`）与两道构建期校验：组件源校验（source validation，输入侧——存在性 + 实物版本闸门）与产物校验（package verification，输出侧）；另有一道独立于构建流水线的文档/地图层校验（doc layer validation，`check-docs.js`）。

## Design

- **Manifest-Driven Assembly（清单驱动组装 / 声明式配置）**：`components.json` 以数据声明组件列表（source → target 映射、版本、required 标志），`build.ps1` 的复制逻辑与具体组件解耦。新增/调整组件只需改 JSON，不改脚本。
- **Layout-Driven Deployment（布局声明驱动部署）**：产物布局由 `layout.json` 的 `deploy` 数组声明，每条含 `name`/`source`/`target`/`kind`/`optional`，`kind: "dir"` 可另带 `exclude`；`build.ps1` 的 [3/5] 遍历该数组，按 `kind` 分派落位（`file` 先建父目录再复制、`dir` 建目标后按内容合并语义复制、`emptydir` 只建目录），未知 `kind` 抛错。`exclude` 只对 `dir` 有效：每个模式匹配目标内文件/目录的 basename（大小写不敏感，故 `*.test.js` 命中任意深度），复制后把命中项从产物删除。`source` 相对仓库根，`target` 相对产物根。
- **Pipeline / 阶段化流水线**：`build.ps1` 将组装拆分为 5 个显式阶段（清理 → 复制组件 → 部署模板 → 校验 → 打包 zip），每阶段以 `[n/5]` 打印进度，失败即 `throw`（`$ErrorActionPreference = 'Stop'`），Fail-Fast。
- **两段 seam（输入校验 / 产物校验）**：流水线把校验拆成两个独立模块——输入侧 `check-sources.ps1`（组件源存在性 + 实物版本）与输出侧 `verify-package.js`（产物完整性）；两者各自可独立运行/测试，均以退出码向 `build.ps1` 传递结果，任一非 0 即 throw。
- **Guard / 校验闸门（Fail-Fast Gate）**：`check-sources.ps1` 是独立的源校验器，先做存在性检查、再对声明了 `verifyVersion` 的组件执行实物版本探测，通过退出码（exit 0/1）向调用方传递结果；`verify-package.js` 是零依赖产物校验器，导出纯函数 `verifyPackage({ outDir, componentsFile, layoutFile })`（返回违规数组，不打印/不抛异常/不写文件），并可直接作为 CLI 运行。`build.ps1` 第 4 阶段先调用前者，再用产物内的便携 Node 执行后者，构成输入与产物双重闸门。
- **Composition（组合装配）**：`components.json` 中 `type: "dir"` 的组件按"目录合并语义"复制——先建目标目录，再把 source 内容（`$src\*`）复制进去；目标已存在时内容合并而非嵌套（`Copy-Item` 目录到已存在目录会嵌套成子目录，quota-runtime 曾因此落成 `node_modules\node_modules`）。
- **Target 路径归一化**：所有 source/target 统一将 `/` 替换为 `\`（`Replace('/', '\')`），兼容 JSON 中 Unix 风格路径写法与 Windows 文件系统。

## Flow

### build.ps1（主打包脚本）

1. **输入解析**：`param` 接收 `-ComponentsFile`（默认 `$PSScriptRoot\components.json`）与 `-SkipZip` 开关。读取 JSON 解析出版本号 `$json.version`，计算输出目录 `build\qdip-generic-<version>`。
2. **工作目录锚定**：`Set-Location $root`（项目根）。同时服务两条相对路径解析：`check-sources.ps1` 按调用时 CWD 解析相对 source 路径（如 `tools/cache/...`），`verify-package.js` 也优先按 CWD 解析 `components.json` 里的相对 source；必须先锚定到项目根，否则相对路径解析错误。
3. **[1/5] 清理**：删除已存在的旧输出目录并重建。
 4. **[2/5] 复制组件**：遍历 `$json.components`，对每个组件执行 `source → target` 合并复制。11 个组件的落位：
   - `node-runtime` → `runtime/node`
   - `opencode-cli` → `opencode/bin`
   - `omoslim` → `plugins/oh-my-opencode-slim`
   - `omoslim-append` → `plugins/oh-my-opencode-slim/custom`（本地自定义追加区）
   - `omo-skills` → `opencode/config/opencode/skills`（OMO 自有技能）
   - `matt-skills` → `opencode/config/opencode/skills`（Matt 技能，与 omo-skills 合并到同一目录；必须落在 `$XDG_CONFIG_HOME/opencode/skills` 才能被自动发现）
   - `omoslim-runtime` → `plugins/oh-my-opencode-slim/node_modules`（含 TUI 依赖 @opentui/core、@opentui/solid、solid-js）
   - `opencode-quota` → `plugins/opencode-quota`（自带 nested node_modules 的 @opentui 0.2.x）
   - `quota-runtime` → `plugins/opencode-quota/node_modules`（合并补充 hoisted 依赖，须排在 opencode-quota 之后）
   - `chrome-devtools-mcp` → `mcp/chrome-devtools-mcp`
   - `windows-terminal` → `runtime/terminal`
5. **[3/5] 部署模板**：读取 `$PSScriptRoot\layout.json`，遍历 `deploy` 数组按 `kind` 分派——`file` 先建父目录再 `Copy-Item -LiteralPath`；`dir` 建 target 后 `Copy-Item "$src\*"`（内容合并语义），复制后若有 `exclude` 则用 `Get-ChildItem -Recurse -Filter <pattern>` 找匹配 basename 的项（大小写不敏感，支持任意深度）并 `Remove-Item -Recurse -Force`，逐条打印 `  - <name>: 排除 <相对路径>`；`emptydir` 只建目录；未知 `kind` 抛错。非 `optional` 条目源缺失时在复制前抛出 `部署条目 <name> 的源缺失`；`optional: true` 且源缺失时打印 skip 并跳过（当前无 optional 条目）。15 条声明覆盖启动器、便携环境模块 `env.bat`、`setup/`（`exclude: ["*.test.js", "codemap.md"]`）、配置模板、`local/说明.txt`、`opencode\auth\` 空目录、文档与 `data\.gitkeep` 等。
6. **[4/5] 校验**：先调用 `& "$PSScriptRoot\check-sources.ps1" -ComponentsFile $ComponentsFile`（输入侧，先存在性后版本，成功时打印 `[OK] all N component sources exist` 与 `[OK] version check passed: N component(s)`；非零退出码即 throw）；再调用 `& "$outDir\runtime\node\node.exe" "$PSScriptRoot\verify-package.js" --out $outDir --components $ComponentsFile`（产物侧，用产物内的便携 Node 执行，构建机无需预装 node；非零退出码即 throw）。
7. **[5/5] 打包**：除非 `-SkipZip`，用 `Compress-Archive -CompressionLevel Optimal` 将输出目录内容压缩为 `build\qdip-generic-<version>.zip`（先删旧 zip）。

### layout.json（包布局声明）

产物布局的唯一真相：`deploy` 数组 15 条声明，字段复用 `components.json` 的 `name`/`source`/`target`，外加 `kind`（`file` | `dir` | `emptydir`）、`optional` 与 `dir` 专用的 `exclude`（字符串数组）。`source` 相对仓库根（可指向 `templates/` 或仓库根文件如 `CHANGELOG.md`），`target` 相对产物根。`optional: true` 的条目在源缺失时允许跳过；`exclude` 的模式匹配目标内 basename，命中项不留在产物里。`build.ps1` 的 [3/5] 只负责按声明执行，`verify-package.js` 的 `layout/deploy-missing` 与 `layout/excluded-present` 两条规则按同一份声明核对产物。

### verify-package.js（产物校验器）

零依赖（仅 `node:fs` / `node:path`）的产物校验器。导出纯函数 `verifyPackage({ outDir, componentsFile, layoutFile })`，返回 `Array<{ rule, path, detail }>` 违规列表（无 `severity` 字段），不打印/不抛异常/不写文件；直接运行本文件时作为 CLI（`--out` 必填、`--components`、`--layout`）。全绿打印 `[OK] package verified: <outDir>` 并 exit 0；有违规按 rule 分组打印 `[FAIL] <rule> (n)` 后 exit 1；参数缺失或清单读不到 exit 2。九条规则：`layout/component-missing`、`layout/deploy-missing`、`layout/excluded-present`、`runtime/missing`、`skills/missing`、`skills/collision`、`plugin/unresolved`、`config/unparseable`、`env/unbound`。其中 `layout/excluded-present` 递归遍历带 `exclude` 的条目 target，按 basename 做最小 glob（只支持 `*`）匹配，命中即报违规。合并到同一 target 的多源组件做集合比对（并集 ⊆ target + 跨源同名即 collision）。

### check-sources.ps1（源检查）

读取 `components.json`，分两段校验：

1. **存在性**：遍历所有组件，对每个 `source` 执行 `Test-Path -LiteralPath`（`-LiteralPath` 兼容含空格/中文的路径）→ 有缺失逐条打印 `[FAIL] missing sources:` 列表并 `exit 1`（此时不继续版本探测，避免噪声）。
2. **版本闸门**：只处理声明了 `verifyVersion` 的条目（`exe` 相对 `source`、`args` 为探测参数、可选 `strip` 前缀）；源缺失时跳过（不重复报）。探测程序不存在记「探测程序缺失」，非零 `$LASTEXITCODE` 记「探测失败（exit N）」，`strip` 剥前缀后与 `version` 严格比较不等记「`期望 X，实际 Y`」。有不一致时打印 `[FAIL] version mismatch:` 列表与 `[HINT]` 方向性提示并 `exit 1`。

两段都通过时打印 `[OK] all N component sources exist` 与 `[OK] version check passed: N component(s)` 并 `exit 0`。无任何副作用，纯只读校验。只负责输入侧，产物侧由 `verify-package.js` 承担。

### check-docs.js（文档/地图层校验器）

零依赖（仅 `node:fs` / `node:path`）的文档校验器，**不参与构建流水线**，独立运行。导出纯函数 `checkDocs({ repoRoot })`（返回 `Array<{ rule, path, detail }>`，形状与 `verify-package.js` 一致，不打印/不抛异常/不写文件）与 `describeScope({ repoRoot })`（返回检查范围与跳过计数）；直接运行本文件时作为 CLI（`node tools/check-docs.js [--repo <repoRoot>]`，打印 `[SCOPE]` 后按 rule 分组打印违规，exit 0/1）。三条规则：

- `docs/path-missing`：include 文档（`codemap.md`、`README.md`、`AGENTS.md`、`CONTEXT.md`、`docs/adr/*`、`docs/整合包说明书.md`、`docs/发布前检查清单.md`、`templates/README.md`、`templates/玩家使用指南.md` 等）里反引号包裹的路径候选必须能在某个基准上解析——仓库根（含去空格二次尝试）、最新构建产物 `build/qdip-generic-*`（首段属于 `opencode`/`plugins`/`runtime`/`mcp`/`setup`/`data`，无产物时整类跳过并计入 `skippedProductPaths`）、或仓库自有文件的 basename 索引（无 `/` 的裸文件名）。未命中再查窄化运行时白名单。
- `docs/encoding-broken`：仓库自有文本文件（`.md`/`.js`/`.json`/`.txt`/`.bat`/`.ps1`/`.cjs`/`.mjs`）必须能按声明编码解码（`.bat` 按 GBK，其余按 UTF-8），且不含 U+FFFD 或私用区字符。
- `docs/bom-missing`：`.ps1` 必须带 UTF-8 BOM；其余受检扩展名必须不带 BOM。

已知盲区：含 `*`/`?` 的 glob 片段、含 `...` 的省略写法、含 `<...>` 的占位符不做路径检查；`CHANGELOG.md` 只查编码不查路径；历史规划文档（`docs/00-*`/`01-*`/`02-*`、`docs/matt-pocock-workflow-report.md`、`docs/workflow-diff-and-recommendations.md`、`docs/agents/*`）不在路径检查范围；无构建产物时产物路径整类跳过（CLI 会打印 `[WARN]`）。

## Integration

- **调用方 / 入口**：
  - `build.ps1` — 由人工（开发者终端）或 CI 直接执行，是本目录的主入口；`-SkipZip` 用于只产出目录不压缩的开发迭代场景。
  - `check-sources.ps1` — 被 `build.ps1` 第 4 阶段作为子进程调用（`&` + `$LASTEXITCODE` 检查），也可独立运行作为打包前的快速体检。
  - `verify-package.js` — 被 `build.ps1` 第 4 阶段用产物内便携 Node 调用（CLI），也可独立运行核对任意产物目录；导出 `verifyPackage` 供单测直接调用。
  - `check-docs.js` — 独立于构建流水线的文档/地图层校验器：CLI 可跑，导出 `checkDocs` / `describeScope` 供单测直接调用；建议在构建之后跑（那样产物路径才会被真正核对）。
- **上游依赖（输入）**：
  - `components.json` — 组件清单（packageName、version、components[]，含 name/type/source/target/version/required；`node-runtime`/`opencode-cli` 另带 `verifyVersion`（exe/args/strip）供版本闸门探测）。
  - `layout.json` — 包布局声明（`deploy[]`，含 name/source/target/kind/optional，`dir` 条目可带 exclude），驱动 [3/5] 部署与 `layout/deploy-missing` / `layout/excluded-present` 校验。
  - `templates/` — 自有静态模板：`启动.bat`、`env.bat`、`进入环境.bat`、`更新组件.bat`、`setup/*`、`opencode.json`、`oh-my-opencode-slim.json`、`tui.json`、`preferences.md`、`local/说明.txt`、`data/.gitkeep`、`玩家使用指南.md`。
  - `tools/cache/` — 离线第三方制品：`node-v24.14.1-win-x64`、`opencode-1.18.30`（需按 Task 6 预先准备）。
  - 外部引用目录：`E:/云文件/GitHub/oh-my-opencode-slim/dist`（omoslim 构建产物）、`C:/Users/Winde/.config/opencode/oh-my-opencode-slim`（本地自定义）、`C:/Users/Winde/.config/opencode/skills`（OMO 技能）、`C:/Users/Winde/.agents/skills`（Matt 技能）、`C:/Users/Winde/.config/opencode/node_modules/@slkiser/opencode-quota`（用量插件）。上述均为**本机开发环境绝对路径**，移植构建机需同步修改 components.json。
- **下游消费方（输出）**：
  - `build\qdip-generic-<version>\` — 组装完成的目录，可直接分发。
  - `build\qdip-generic-<version>.zip` — 分发制品；终端玩家解压后通过 `启动.bat` 进入环境，`更新组件.bat` 消费 `plugins/` 与本地配置进行增量更新。
  - `verify-package.js` — 消费产物目录与两份清单（components.json + layout.json），作为产物校验入口。
  - `check-docs.js` — 消费仓库自身的文档与源码文本：include 文档的路径候选、全仓自有文本的编码/BOM，以及（存在构建产物时）产物内的路径。
  - `opencode\config\opencode\local\` 为玩家本地修改区（spec 4.1 约定），更新整合包时保留该目录即保留玩家自定义配置。
- **环境耦合点**：脚本假定 Windows 平台（PowerShell、`\` 路径、`node.exe`/`opencode.exe`），且组件清单含非仓库内绝对路径，是本目录对开发机环境的显式耦合，文档层面应视为已知约束。
