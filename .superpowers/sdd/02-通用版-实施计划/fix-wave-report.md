# Fix Wave 实施报告：终审 2 Critical + 2 Important + 1 Minor 修复

- 状态：DONE（3 个独立 commit，工作树干净，全量回归通过）
- 执行时间：2026-08-31
- Commits：
  - F1：`fb5ae1c21888127c5224910990e87f42e79c303e` — fix(qdip): auth.json path under XDG_DATA_HOME opencode segment
  - F2+F4+F5：`9a5f9296b2be95333c408e47683e72a7e5802c9d` — config paths/plugin/skills/local/.github
  - F3：`6fca72f86234dacbc60cc0f98bd713835d962c1b` — component updater lands binary in opencode/bin
- 全程遵守纪律：无 pause/交互命令；opencode/guide-server 验证后均 kill；未派生子代理

## F1 [Critical] auth.json 写入位置差一层

**实测证据**（`opencode providers list`，XDG_DATA_HOME 指向探针目录）：

```
Credentials D:\Temp\opencode\oc-probe\data\opencode\auth.json
  probeB-withsuffix  api        ← 带 opencode 段层级（$XDG_DATA_HOME\opencode\auth.json）被读取
  1 credentials
```

`$XDG_DATA_HOME\auth.json`（无段）不被读取。**修复**：config-writer.js `authFile` → `path.join(root, 'opencode', 'auth', 'opencode', 'auth.json')`（XDG_DATA_HOME 环境变量不动）；同步更新测试断言路径。

**回归证据**：组装产物写假凭证到新路径后 `opencode providers list` 输出 `DeepSeek api / 1 credentials`；`opencode run` 会话用该假 key 调真实 deepseek API（`Your api key: ****ummy is invalid`）——证明凭证被 opencode 读取并用于调用。

## F2 [Critical] opencode.json 部署位置差一层 + plugin 相对路径

**实测证据 1（配置加载路径）**：`opencode run --print-logs` 日志：

```
message=loading path="...\config\opencode\config.json"
message=loading path="...\config\opencode\opencode.json"    ← XDG_CONFIG_HOME 下自动追加 opencode 段
```

**实测证据 2（OMOslim 配置位置，源码级）**：`oh-my-opencode-slim/src/cli/paths.ts`：

```ts
function getDefaultOpenCodeConfigDir(): string {
  const userConfigDir = process.env.XDG_CONFIG_HOME ? process.env.XDG_CONFIG_HOME : join(homedir(), '.config');
  return join(userConfigDir, 'opencode');        // 同样追加 opencode 段
}
getLiteConfig = join(getConfigDir(), 'oh-my-opencode-slim.json')
```

**交叉验证**：开发机（XDG 未设）真实布局 `~/.config/opencode/opencode.json` 与 `~/.config/opencode/oh-my-opencode-slim.json` 同目录存在——证明 opencode 与 OMOslim 共享同一配置基目录。设 `XDG_CONFIG_HOME=<pkg>\opencode\config` 后两者都应落在 `<pkg>\opencode\config\opencode\`。**修复**：build.ps1 把 opencode.json 与 oh-my-opencode-slim.json 部署到 `opencode\config\opencode\`；config-writer 的 configDir 同步。

**实测证据 3（plugin 相对路径基准 = 配置文件所在目录）**：哨兵配置 `{"plugin":["./plugins/probe"]}` → 日志：

```
failed to load plugin path=file:///D:/Temp/opencode/oc-p2/config/opencode/plugins/probe error="Plugin export is not a function"
```

解析基准确认。**修复**：template opencode.json plugin 路径 → `../../../plugins/oh-my-opencode-slim`、`../../../plugins/superpowers`（从 `config\opencode\` 回溯 3 层到 `<pkg>\plugins\`）。

**实测证据 4（skills.paths 基准 = CWD，且 `..` 折叠在中文+括号路径下不可靠）**：
- 干净路径测试：`../../../opencode/skills` 从 CWD 解析（`D:\opencode\skills`），非配置目录
- 组装路径（含中文+括号）测试：`../../../opencode/skills` 只折叠 1 层 → 错位
- **修复**：skills.paths → `["opencode/skills"]`（CWD 相对、无 `..`；启动器 `cd /d "%~dp0"` 保证 CWD=包根）。哨兵验证：`Skill "s1"` 加载成功，无 "skill path not found"

**回归证据**（组装产物 + XDG 指向包内）：
- `loading path="...\config\opencode\opencode.json"`（包内配置被加载）✓
- `failed to load plugin` 计数 0 ✓
- superpowers 技能从 `plugins\superpowers\skills\...` 注册（重复技能警告的 existing 路径指向组装目录）✓
- skills.paths 解析成功（无 skill path not found）✓
- `opencode providers list` 凭据路径正确 ✓

**OMOslim 预设应用说明**：`opencode run` 默认走 build agent，不触发 OMOslim 预设的 agent 路由（预设管 orchestrator/oracle 等），故 run 模式无法直接观测预设生效；配置文件位置已由源码公式 + 开发机真实布局双重确认，插件加载无错误。此为本环境验证方法局限，非修复缺陷。

## F3 [Important] 更新组件.bat 的 npm 落地位置

**修复**：opencode 更新改为 `npm install --prefix %TEMP%\qdip-oc-update opencode-ai@latest --no-save`（postinstall 落盘真实二进制）→ 校验 `node_modules\opencode-ai\bin\opencode.exe` 存在 → `copy /y` 到 `%ROOT%opencode\bin\opencode.exe`（启动器 PATH 实际读取位置）→ 清理临时目录；失败分支保留原版并提示"也可下载新版 zip 覆盖"。superpowers 更新改为在 `plugins\superpowers` 内直接 `call npm update --no-save`（该目录为 npm 包结构；实测无依赖，npm 报 up to date）。

**冒烟证据**（组装目录实跑，网络路径）：

```
[1/2] 更新 opencode ...
added 3 packages in 6s
  [OK] opencode 已更新
[2/2] 更新 superpowers ...
up to date, audited 1 package in 497ms
  [OK] superpowers 依赖已更新
完成。重新双击 启动.bat 生效。
opencode --version → 1.18.25（opencode-ai@latest==1.18.25，幂等验证机制）
```

parseErrors=0。原 `npm install -g --prefix %ROOT%opencode` 的落地位置（`opencode\` 根 + node_modules）与启动器 PATH（`opencode\bin`）不咬合的问题已消除。

## F4 [Important] build.ps1 生成 config/local 占位

**修复**：build.ps1 部署段创建 `opencode\config\opencode\local\`（与 opencode 实际读取的配置同目录——spec 4.1 的 `config/local` 在实测布局下的正确落点）+ 占位说明 `说明.txt`（UTF-8 无 BOM）。文档引用同步：验证清单.md/玩家使用指南.md 中 `opencode/config/local` → `opencode/config/opencode/local`。

## F5 [Minor] zip 夹带 superpowers/.github

**修复**：build.ps1 复制组件后 `Remove-Item "$outDir\plugins\superpowers\.github" -Recurse -Force`。回归验证：组装目录与 zip 均无 `.github`。

## 统一回归结果

| 项目 | 结果 |
|---|---|
| `node --test`（config-writer + guide-server） | 7 pass / 0 fail |
| 组装产物 `启动.bat --check` | exit 0，v24.14.1，无 [FAIL] |
| F1 auth list | DeepSeek api / 1 credentials（新路径） |
| F2 配置加载 + 插件 | loading path 正确、0 插件错误、superpowers 技能注册、skills 路径解析成功 |
| guide-server 起停 + 页面 | .guide-url 生成、/api/status ok、first-run.html 200（12900B）、已 kill |
| F3 更新冒烟 | [OK] opencode + [OK] superpowers，--version=1.18.25 |
| F4/F5 布局 | local\说明.txt 存在、.github 已剔除 |
| zip | 含更新组件.bat、验证清单.md、玩家使用指南.md；重打包完成 |

## 偏离说明

| # | 项目 | 说明 |
|---|------|------|
| 1 | skills.paths 基准 | 实测为 CWD 而非配置目录（与 plugin 不同），且 `..` 在中文+括号路径下折叠不可靠；采用无 `..` 的 `opencode/skills` |
| 2 | F4 local 位置 | 放 `opencode\config\opencode\local`（实测配置目录内）而非 spec 字面 `config\local`，与修正后的布局一致 |
| 3 | 文档路径引用 | 验证清单/玩家指南两处 config/local 引用随 F4 更新为新布局 |
| 4 | OMOslim 预设观测 | run 模式无法观测预设 agent 路由（见 F2 说明），以源码+真实布局双重确认代替 |
| 5 | 测试伪象 | Start-Process 数组参数对中文+括号路径截断（改用单字符串参数）；`& bat *> 文件` 规避 start 子窗口句柄挂起；均非产品缺陷 |

- 仅本地 commit，未 push；build/、tools/cache/ 未入库；修复未破坏既有引导链与 bat 工程约束（GBK+CRLF）。
