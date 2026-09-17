# templates/

## Responsibility

分发模板源（Distribution Template Source）：存放构建 QDIP 可分发 zip 时所需的全部"行为模板"——玩家启动器、更新脚本、opencode 配置模板、首次引导服务源码与终端用户文档。`tools/build.ps1` 将本目录内容部署到组装目录 `build\qdip-generic-<version>\` 的对应位置，本目录不直接参与运行时执行，而是运行时文件的源头。

按职责分六组：

- 启动/环境/更新脚本：`env.bat`（便携环境的唯一声明模块——`PATH`/`XDG_*`/`QDIP_*`/`ROOTS`/`WSDIR` 等 10 个变量的推导与导出，被两个启动器 `call`）、`启动.bat`（便携环境启动器 + 首次引导调度）、`更新组件.bat`（增量更新 opencode）
- opencode 配置模板：`opencode.json`（opencode 主配置）、`oh-my-opencode-slim.json`（子代理角色/议会模型分配预设）、`tui.json`（TUI 插件注册表：OMOslim 侧边栏 tui2.js + opencode-quota 用量条，直接指向插件入口文件）、`preferences.md`（个人倾向/工作流指令，opencode.json 经 `{env:QDIP_PREFERENCES}` 引用，启动器注入该变量）
- 首次引导服务源码：`setup/`（见 `templates/setup/codemap.md`，启动器与配置写入器的消费方）
- 玩家本地修改区说明模板：`local/说明.txt`（部署到 `opencode\config\opencode\local\说明.txt`；原先内嵌在 `build.ps1` 里由脚本生成，现为真实模板文件）
- 数据目录占位模板：`data/.gitkeep`（空文件，部署到产物 `data\.gitkeep`，标记 `data/` 目录存在）
- 终端用户文档：`玩家使用指南.md`（新手 5 步上手与工作流建议）

## Design

- **便携应用模式（Portable App）**：环境注入集中到 `env.bat`——它内部 `setlocal` 推导 `PATH`/`XDG_DATA_HOME`/`XDG_CONFIG_HOME`/`OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS`/`QDIP_MCP_CHROME`/`QDIP_PREFERENCES`/`QDIP_PERSONA`/`ROOTS`/`WSDIR` 等变量，把 Node 运行时、opencode CLI、认证目录、配置目录全部注入/重定向到包内路径（`runtime\node`、`opencode\bin`、`opencode\auth`、`opencode\config`），末尾以一条 `endlocal & set` 把 10 个变量搬回调用者作用域；`启动.bat` 与 `进入环境.bat` 只 `call "%~dp0env.bat"`，不再各自维护注入逻辑。其中 `QDIP_PERSONA` 指向包内 persona 指令文件，供配置里的 `{env:QDIP_PERSONA}` token 解析；不依赖系统安装与用户全局配置。
- **首次运行门控（First-run Gate，Sentinel 哨兵）**：`data\.configured` 文件作为"是否已配置"的哨兵；不存在则进入引导分支（启动 `guide-server.js` 并打开浏览器），存在则直接运行 opencode。`data\.guide-url` 是引导服务写给启动器的进程间通信文件（PIPE/消息传递的朴素实现）。
- **引导调度器（Bootstrap Orchestrator）**：`启动.bat` 先 `call env.bat` 注入环境，再作为首次引导的调度中枢——启动后台 HTTP 引导服务，轮询等待 `.guide-url` 出现（上限 15 次、每次 `ping` 间隔约 1 秒），再用 `start` 调系统默认浏览器打开引导页，随后退出让玩家自行重开。
- **配置模板 + 运行期填充（Template + Runtime Injection）**：`opencode.json` 的 `provider` 段初始为空、`oh-my-opencode-slim.json` 携带默认模型分配，二者均作为模板由 `setup/config-writer.js` 在玩家保存配置时原地改写。注意 opencode 配置键为单数 `provider`（1.18.27 起复数 `providers` 会被诊断为 unsupported 并静默丢弃）。人格指令（v0.2）写入 `instructions/persona.md`，并以 `{env:QDIP_PERSONA}` token 追加到 `instructions` 数组——token 在配置加载时被替换为启动器注入的绝对路径，避免裸相对路径随 CWD 失效。
- **后台子代理开关**：`env.bat` 注入 `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true`，被两个启动器 `call` 后生效（OMOslim 编排器官方安装器同款要求，缺失时 ping all agents 等编排能力不可用）。
- **自检模式（Self-check）**：`启动.bat --check` 输出 node/opencode 存在性与版本，供诊断分发完整性。
- **可离线缓存（Offline-safe update）**：`更新组件.bat` 把更新产物先下载到 `%TEMP%` 临时目录再 `copy /y` 覆盖目标，失败时保留原版本。

## Flow

**首次运行（配置引导）**：

```
玩家双击 启动.bat
  → call env.bat（推导并导出 ROOT/PATH/XDG_*/QDIP_*/ROOTS/WSDIR 十个变量；ROOTS 为去尾反斜杠形态，供 guide-server 接收）
  → 检测 data\.configured 不存在 → :guide 分支
      → 创建 data\ 目录
      → 以最小化窗口 spawn runtime\node\node.exe setup\guide-server.js <ROOTS>
      → 轮询等待 data\.guide-url（≤15 次，超时则 :guidefail 提示）
      → 读取 .guide-url，start 打开浏览器 → 引导页（setup/first-run.html）
      → 玩家在引导页测试连接 → 保存配置 → 引导服务写各配置文件 + data\.configured → 玩家关闭浏览器
  → 玩家再次双击 启动.bat
      → 检测 data\.configured 存在 → :run 分支 → 执行 opencode %*（透传命令行参数）
```

**已配置启动（正常路径）**：`启动.bat` → `call env.bat`（环境注入） → `opencode %*` → 退出码透传。

**增量更新**：`更新组件.bat` → `npm install --prefix %TEMP% opencode-ai@latest --no-save` → 校验 `bin\opencode.exe` 存在 → `copy /y` 覆盖 `opencode\bin\opencode.exe` → 清理临时目录。

**构建部署（build.ps1 → templates/）**：不再硬编码复制，而是由 `tools/layout.json` 的 `deploy` 数组（15 条）驱动（`source` 相对仓库根，`target` 相对产物根）。`file` 条目复制到产物对应路径——`启动.bat`/`env.bat`/`进入环境.bat`/`更新组件.bat`/`玩家使用指南.md`/`README.md`（源 `templates\README.md`）落在 outDir 根，`CHANGELOG.md`（源在仓库根）也落在 outDir 根，`opencode.json`/`oh-my-opencode-slim.json`/`tui.json`/`preferences.md` 落在 `outDir\opencode\config\opencode\`（opencode 在 XDG_CONFIG_HOME 下自动追加 `opencode` 段，实际读取该目录），`local\说明.txt` 落在 `outDir\opencode\config\opencode\local\`，`data\.gitkeep` 落在 `outDir\data\`；`dir` 条目 `setup\*` 以内容合并语义复制到 `outDir\setup`，复制后按该条目的 `exclude`（`["*.test.js", "codemap.md"]`）递归删除 basename 命中的项（大小写不敏感），因此 `config-writer.test.js`/`guide-server.test.js`/`codemap.md` 不进产物，`setup/` 只留 `config-writer.js`、`contract.js`、`first-run.html`、`guide-server.js`、`wt-profile.ps1`；`emptydir` 条目创建 `outDir\opencode\auth\`；deploy 条目当前均非 optional，源缺失时在复制前抛错。

## Integration

- **消费方（被谁调用/读取）**：
  - `启动.bat`：被玩家双击；先 `call "%~dp0env.bat"` 注入环境；内部调用 `runtime\node\node.exe` 运行 `setup\guide-server.js`、`opencode` CLI、`start` 打开浏览器；`:find_wt` 子例程供 `--check` 与 `:run` 复用定位 Windows Terminal；读取 `data\.configured` 与 `data\.guide-url`。参数 `--check` 进入自检模式。
  - `env.bat`：被 `启动.bat` 与 `进入环境.bat` 以 `call` 调用；内部用 PowerShell 读 `data\workspace.txt`（存在且非空时）推导 `WSDIR`，末尾 `endlocal & set` 把 10 个变量导出到调用者作用域。
  - `更新组件.bat`：被玩家双击；写 `opencode\bin\opencode.exe`（调用 npm）。
  - `opencode.json`：被 opencode 运行时读取；`plugin` 段以相对路径引用 `../../../plugins/oh-my-opencode-slim` 与 `../../../plugins/opencode-quota`（依赖 build 时组件部署到 `plugins/`）；被 `setup/config-writer.js` 读取并改写 `provider` 段。
  - `oh-my-opencode-slim.json`：被 oh-my-opencode-slim 插件读取；被 `setup/config-writer.js` 按 `AGENT_MODEL_PATHS`/`COUNCIL_SEATS` 改写模型分配。
  - `玩家使用指南.md`：被 build.ps1 复制进分发 zip，供玩家阅读。
- **依赖方（本目录依赖什么）**：`setup/`（引导服务，被启动器 spawn 并被 build 复制）；`tools/build.ps1`（组装消费方）；运行时依赖 `runtime\node`、`opencode\bin\opencode.exe`、`plugins\oh-my-opencode-slim`（由 build 从 components.json 部署，见 `tools/components.json`）。
