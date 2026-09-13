# tools/

## Responsibility

Build Orchestration（构建编排）与 Packaging Pipeline（打包流水线）。本目录负责把三种来源的资产——`templates/` 下的自有静态模板、`tools/cache/` 下的离线第三方制品（Node 运行时、opencode CLI）、以及外部目录引用的插件/技能组件——依据 `components.json` 声明式清单组装成分发用的 QDIP 整合包目录，并可选压缩为可分发的 zip。同时提供组件源完整性校验（source validation）作为流水线的前置闸门。

## Design

- **Manifest-Driven Assembly（清单驱动组装 / 声明式配置）**：`components.json` 以数据声明组件列表（source → target 映射、版本、required 标志），`build.ps1` 的复制逻辑与具体组件解耦。新增/调整组件只需改 JSON，不改脚本。
- **Pipeline / 阶段化流水线**：`build.ps1` 将组装拆分为 5 个显式阶段（清理 → 复制组件 → 部署模板 → 校验 → 打包 zip），每阶段以 `[n/5]` 打印进度，失败即 `throw`（`$ErrorActionPreference = 'Stop'`），Fail-Fast。
- **Guard / 校验闸门（Fail-Fast Gate）**：`check-sources.ps1` 是独立的源存在性校验器，通过退出码（exit 0/1）向调用方传递结果；`build.ps1` 第 4 阶段将其作为子进程调用，并叠加关键运行制品存在性断言（node.exe、opencode.exe/cmd），双重校验。
- **Composition（组合装配）**：`components.json` 中 `type: "dir"` 的组件按"目录合并语义"复制——先建目标目录，再把 source 内容（`$src\*`）复制进去；目标已存在时内容合并而非嵌套（`Copy-Item` 目录到已存在目录会嵌套成子目录，quota-runtime 曾因此落成 `node_modules\node_modules`）。
- **Target 路径归一化**：所有 source/target 统一将 `/` 替换为 `\`（`Replace('/', '\')`），兼容 JSON 中 Unix 风格路径写法与 Windows 文件系统。

## Flow

### build.ps1（主打包脚本）

1. **输入解析**：`param` 接收 `-ComponentsFile`（默认 `$PSScriptRoot\components.json`）与 `-SkipZip` 开关。读取 JSON 解析出版本号 `$json.version`，计算输出目录 `build\qdip-generic-<version>`。
2. **工作目录锚定**：`Set-Location $root`（项目根）。关键原因：`check-sources.ps1` 按调用时 CWD 解析相对 source 路径（如 `tools/cache/...`），必须先锚定到项目根，否则相对路径解析错误。
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
5. **[3/5] 部署模板**（来自 `templates/`）：复制 `启动.bat`；若存在则复制 `更新组件.bat`（缺失时打印 skip 提示，表明 Task 7 未完成）；复制 `setup/*` 到 `setup/`；建立 `opencode\config\opencode\` 结构并复制 `opencode.json`、`oh-my-opencode-slim.json`、`tui.json`、`preferences.md`；创建 `local/` 玩家本地修改区并写入 `说明.txt`（UTF-8 无 BOM，`[System.IO.File]::WriteAllText`）；创建 `opencode\auth\` 空目录；复制 `验证清单.md`、`玩家使用指南.md`；创建 `data\.gitkeep`。
6. **[4/5] 校验**：调用 `& "$PSScriptRoot\check-sources.ps1" -ComponentsFile $ComponentsFile`，非零退出码即 throw；再断言 `runtime\node\node.exe` 与 `opencode\bin\opencode.exe|.cmd` 存在，缺失则 throw 并提示所需缓存制品（node-v24.14.1-win-x64、opencode-ai@1.18.30）。
7. **[5/5] 打包**：除非 `-SkipZip`，用 `Compress-Archive -CompressionLevel Optimal` 将输出目录内容压缩为 `build\qdip-generic-<version>.zip`（先删旧 zip）。

### check-sources.ps1（源检查）

读取 `components.json` → 遍历所有组件，对每个 `source` 执行 `Test-Path -LiteralPath`（`-LiteralPath` 兼容含空格/中文的路径）→ 收集缺失项 → 无缺失打印 `[OK] all N component sources exist` 并 `exit 0`；有缺失逐条打印 `[FAIL]` 列表并 `exit 1`。无任何副作用，纯只读校验。

## Integration

- **调用方 / 入口**：
  - `build.ps1` — 由人工（开发者终端）或 CI 直接执行，是本目录的主入口；`-SkipZip` 用于只产出目录不压缩的开发迭代场景。
  - `check-sources.ps1` — 被 `build.ps1` 第 4 阶段作为子进程调用（`&` + `$LASTEXITCODE` 检查），也可独立运行作为打包前的快速体检。
- **上游依赖（输入）**：
  - `components.json` — 组件清单（packageName、version、components[]，含 name/type/source/target/version/required）。
  - `templates/` — 自有静态模板：`启动.bat`、`进入环境.bat`、`更新组件.bat`、`setup/*`、`opencode.json`、`oh-my-opencode-slim.json`、`tui.json`、`验证清单.md`、`玩家使用指南.md`。
  - `tools/cache/` — 离线第三方制品：`node-v24.14.1-win-x64`、`opencode-1.18.30`（需按 Task 6 预先准备）。
  - 外部引用目录：`E:/云文件/GitHub/oh-my-opencode-slim/dist`（omoslim 构建产物）、`C:/Users/Winde/.config/opencode/oh-my-opencode-slim`（本地自定义）、`C:/Users/Winde/.config/opencode/skills`（OMO 技能）、`C:/Users/Winde/.agents/skills`（Matt 技能）、`C:/Users/Winde/.config/opencode/node_modules/@slkiser/opencode-quota`（用量插件）。上述均为**本机开发环境绝对路径**，移植构建机需同步修改 components.json。
- **下游消费方（输出）**：
  - `build\qdip-generic-<version>\` — 组装完成的目录，可直接分发。
  - `build\qdip-generic-<version>.zip` — 分发制品；终端玩家解压后通过 `启动.bat` 进入环境，`更新组件.bat` 消费 `plugins/` 与本地配置进行增量更新。
  - `opencode\config\opencode\local\` 为玩家本地修改区（spec 4.1 约定），更新整合包时保留该目录即保留玩家自定义配置。
- **环境耦合点**：脚本假定 Windows 平台（PowerShell、`\` 路径、`node.exe`/`opencode.exe`），且组件清单含非仓库内绝对路径，是本目录对开发机环境的显式耦合，文档层面应视为已知约束。
