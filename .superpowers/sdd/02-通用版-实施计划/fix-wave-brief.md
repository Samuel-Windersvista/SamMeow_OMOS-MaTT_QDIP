# Fix Wave Brief: 终审 Critical/Important 修复（一次派发，统一回归）

> 终审（ora-2）发现 2 Critical + 2 Important + 1 Minor。全部修复后用终审验证方法做回归。

## 修复清单

### F1 [Critical-1] auth.json 写入位置差一层
opencode 1.18.25 在 `$XDG_DATA_HOME` 下自动追加 `opencode` 段：实际读 `$XDG_DATA_HOME\opencode\auth.json`。当前 XDG_DATA_HOME=`<root>\opencode\auth`，config-writer 写 `<root>\opencode\auth\auth.json`——opencode 实际找 `<root>\opencode\auth\opencode\auth.json`，读不到。
**修复**：`templates/setup/config-writer.js` 的 authFile 改为 `path.join(root, 'opencode', 'auth', 'opencode', 'auth.json')`（XDG_DATA_HOME 环境变量不动）。同步更新 config-writer.test.js 的断言路径。
**验证**：临时目录复刻布局 → 写 auth.json → 设 XDG_DATA_HOME → 运行组装产物 opencode 的 `opencode auth list` → 输出显示该凭证存在。

### F2 [Critical-2] opencode.json 部署位置差一层 + plugin 相对路径验证
opencode 在 `$XDG_CONFIG_HOME` 下追加 `opencode` 段：实际读 `$XDG_CONFIG_HOME\opencode\opencode.json`。当前部署到 `<root>\opencode\config\opencode.json`，读不到 → 插件全部静默失效。
**修复分两步（必须实测）**：
1. 确认 OMOslim 读 oh-my-opencode-slim.json 的确切位置：OMOslim 的 getConfigDir 对 XDG_CONFIG_HOME 是否也追加 opencode 段（查其源码 src/config 下 paths 相关逻辑，或实测：放 sentinel 跑 opencode 看 OMOslim 是否加载）。opencode.json 与 oh-my-opencode-slim.json 可能落在不同层级——以实测为准
2. 修改 `tools/build.ps1` 部署段把两个配置文件放到实测正确的位置
3. **plugin 相对路径验证**：`"./plugins/oh-my-opencode-slim"` 的相对基准是 CWD 还是配置文件目录？实测：sentinel 配置（plugin 指向不存在路径会报错 vs 存在路径正常）确认解析基准。若相对配置文件目录，则 plugin 路径必须改为从 config\opencode\ 回溯的正确相对路径
**验证**：opencode 启动日志（loading path 输出）显示整合包内配置被加载；插件加载无报错（OMOslim/superpowers 的启动日志出现）。

### F3 [Important-1] 更新组件.bat 的 npm 落地位置
当前 `npm install -g --prefix %ROOT%opencode` 落地位置与启动器 PATH（`opencode\bin`）不咬合；superpowers 更新逻辑大概率 no-op。
**修复**：实测 npm --prefix 的 Windows 落地规则（bin 放哪），改为把更新产物落地到启动器实际读取的位置（`opencode\bin`）；superpowers 更新改为对 `plugins\superpowers` 内直接执行 npm update（该目录是 npm 包结构）。若 npm 方案不可靠，降级为提示性脚本（引导玩家下载新版 zip）并在脚本文案里说明。
**验证**：冒烟运行（网络路径），确认更新后 `opencode --version` 反映新版本或脚本如实提示失败。

### F4 [Important-2] build.ps1 生成 config/local 占位
spec 4.1 要求 `opencode/config/local/`（玩家本地修改区），玩家指南/验证清单已引用。**修复**：build.ps1 部署段创建该目录 + 占位说明文件。

### F5 [Minor] zip 夹带 superpowers/.github/
**修复**：build.ps1 复制 superpowers 后删除 `.github` 目录（或复制时排除）。

## 完成后统一回归

1. 重跑 build.ps1 → 组装产物
2. 回归验证（全部非交互，禁止 pause 脚本）：
   - 临时目录复刻：写 sentinel opencode.json（plugin 指向不存在路径）→ 起 opencode 看日志确认读到了整合包配置（报错即证明加载）
   - 正确配置：起 opencode 确认 OMOslim/superpowers 插件加载
   - auth list 验证（F1）
   - 启动.bat --check 冒烟
   - guide-server 起停 + 页面 200
3. 三个独立 commit（按 F1/F2+F4+F5/F3 分组或你自定，逻辑清晰即可）

## 全局约束
- 禁止派生子代理；禁止 pause/交互命令；起服务必须 kill
- 修复不破坏已过审查的行为（引导链、bat 工程约束）
- 报告写入 `.superpowers\sdd\02-通用版-实施计划\fix-wave-report.md`：每个 F 项的修复内容、实测证据（命令输出）、commit hash
- 最终回复：状态、commit hashes、回归摘要一行、concerns
