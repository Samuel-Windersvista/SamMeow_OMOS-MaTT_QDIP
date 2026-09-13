# Task 6 实施报告：打包器 build.ps1 + 离线组件缓存

- 状态：DONE
- 执行时间：2026-08-31
- Commit：`da2ec2394987312600adf79522af74d50d0638d2`（short `da2ec23`，feat(qdip): packaging script with component assembly）
- 产物：`tools/build.ps1`（UTF-8 with BOM，PS 5.1 中文解析正确）、`.gitattributes`
- components.json 未修改（Task 1 产物，按 brief 约束勿改）；build/ 与 tools/cache/ 内容未入库（.gitignore 已有规则）

## 1. build.ps1 实际实现

骨架按计划 Task 6 Step 1，附加前序 carry：

- `$root = Split-Path $PSScriptRoot -Parent` 计算项目根；**`Set-Location $root`**（carry #2：check-sources.ps1 按 CWD 解析 components.json 里的相对 source 路径）。
- 5 步流程：清理组装目录 → 按 components.json 复制 6 个组件（node-runtime→runtime/node、opencode-cli→opencode/bin、omoslim→plugins/oh-my-opencode-slim、omoslim-append→custom、superpowers→plugins/superpowers、matt-skills→opencode/skills）→ 部署模板 → 校验 → zip。
- 部署模板：`启动.bat`、`setup\*`（config-writer.js/test、guide-server.js/test、first-run.html）、`opencode\config\opencode.json`、`oh-my-opencode-slim.json`、`opencode\auth`、`data\.gitkeep`；**`更新组件.bat` 条件化**——Task 7 尚未创建（当前仓库无该文件），跳过并输出 `(skip)` 提示（已如实执行）。
- 校验段：先跑 check-sources.ps1 且**检查 `$LASTEXITCODE`**（非 0 即 throw，防止缺组件继续组装）；再检测 node.exe 与 opencode **双形态**（`opencode.exe` 或 `opencode.cmd`），缺则 throw 并给出补缓存指引。
- zip：`build/qdip-generic-<version>.zip`（version 来自 components.json=0.1.0），`-SkipZip` 可跳过。

## 2. opencode 离线包布局选型（环境适配点，含证据）

**证据链**：`npm pack opencode-ai@1.18.25` → tgz 仅 3.0KB，内含 `bin/opencode.exe`（**479 字节占位 stub**）+ postinstall.mjs + package.json。package.json 显示真实二进制来自 optionalDependencies 平台包（`opencode-windows-x64@1.18.25` 等）；postinstall.mjs 通过 `require.resolve` 找到平台包后把其 `bin/opencode.exe` 复制到主包 bin/。

**方案 A（直接解包 tgz）不可行**：stub 不可执行（479B），真实二进制不在主包内。

**选型：方案 B 变体（npm 完整安装 → 提取真实二进制到源目录根级）**：
1. `npm install --prefix tools/cache/opencode-install opencode-ai@1.18.25`（postinstall 自动拉取 opencode-windows-x64 并落盘真实二进制）
2. 复制 `node_modules/opencode-ai/bin/opencode.exe`（**179,651,624 字节**，自包含 bun 二进制）到 `tools/cache/opencode-1.18.25/opencode.exe`
3. 生成独立 shim `opencode.cmd`（`@echo off` + `"%~dp0opencode.exe" %*` + `exit /b %errorlevel%`，CRLF），与 exe 同目录

**最终缓存布局**（components.json 的 source 目录，组装后整体复制到 `opencode/bin`）：

```
tools/cache/opencode-1.18.25/
  opencode.exe   (179,651,624 bytes; --version → 1.18.25 实测)
  opencode.cmd   (57 bytes; 独立 shim; --version → 1.18.25 实测)
```

Node 缓存：`tools/cache/node-v24.14.1-win-x64.zip`（36,358,527 字节，nodejs.org 官方源）→ 解压 `node-v24.14.1-win-x64\node.exe` 存在。下载均走 nodejs.org / npm registry，未走 GitHub。

## 3. 下载与组装输出

```
[1/5] 清理组装目录
[2/5] 复制组件
  + node-runtime -> runtime/node
  + opencode-cli -> opencode/bin
  + omoslim -> plugins/oh-my-opencode-slim
  + omoslim-append -> plugins/oh-my-opencode-slim/custom
  + superpowers -> plugins/superpowers
  + matt-skills -> opencode/skills
[3/5] 部署模板
  (skip) 更新组件.bat 尚未创建（Task 7 未完成，部署时跳过）
[4/5] 校验
[OK] all 6 component sources exist
  [OK] node: True  opencode: True
[5/5] 打包 zip
  -> build/qdip-generic-0.1.0.zip
[DONE] 组装完成: build/qdip-generic-0.1.0
```

（终端显示中文乱码为 PS 5.1 管道输出编码伪象；脚本文件本身 UTF-8 BOM，PS 5.1 解析正确，逻辑不受影响。zip 100,386,313 字节 ≈ 96MB。）

## 4. 组装产物冒烟测试输出

```
=== 1. 启动.bat --check ===
[check] node: <root>\build\qdip-generic-0.1.0\runtime\node\node.exe
v24.14.1
exitcode: 0                     （无 [FAIL] 行）

=== 2. 组装目录启动.bat EOL ===
CRLF=53 LF-only=0               （CRLF 保持）

=== 3. opencode --version in assembly ===
1.18.25

=== 4. 引导服务 + 引导页（carry #3 描述性检查） ===
.guide-url: http://127.0.0.1:<port>/setup/first-run.html   （node setup/guide-server.js <组装目录> 启动成功）
api/status: ok=True providers=deepseek,kimi,openai configured=False
first-run.html: status=200 length=12900
  has title / has cards / has submit: True / True / True
traversal /setup/../data/.configured: 404
```

carry #3 结论：引导页 HTML 完整（标题、服务商卡片容器、提交按钮齐备），静态资源可访问，穿越防御生效；未使用浏览器自动化工具。

## 5. CRLF 验证结果

- `.gitattributes`：`*.bat text eol=crlf` + `*.ps1 text eol=crlf`。
- `git ls-files --eol -- templates/启动.bat` → `i/lf w/crlf attr/text eol=crlf`（blob 为 LF、检出为 CRLF——git 标准规范化，符合属性声明意图）。
- 工作副本 `templates/启动.bat`：CRLF=53 / LF=0（无需恢复）。
- 组装目录 `build/qdip-generic-0.1.0/启动.bat`：CRLF=53 / LF=0（分发即 CRLF，Task 3 的 bat 可正确解析）。

## 6. 偏离说明

| # | 计划/brief 原文 | 实际 | 原因 |
|---|----------------|------|------|
| 1 | 方案 A：tgz 解包后直接部署 bin | 弃用方案 A，采用 npm 完整安装提取真实二进制（方案 B 变体） | 实测 tgz 内 `bin/opencode.exe` 是 479B stub，不可执行；真实二进制在 `opencode-windows-x64` 平台包（179MB） |
| 2 | 方案 A 提及部署为 `opencode.cmd`（npm 生成 shim） | 部署 `opencode.exe`（原生可执行）+ 独立 `opencode.cmd` shim | 原生 .exe 直接入 PATH 最稳；npm 生成的 .cmd 含 `..\opencode-ai\` 相对引用，脱离 node_modules 会失效，故用自包含 shim |
| 3 | check-sources 调用不检查退出码 | 增加 `$LASTEXITCODE` 检查，非 0 即 throw | 防止缺组件仍继续组装产出坏包 |
| 4 | 更新组件.bat 部署行 | 条件化（Test-Path 存在才复制） | brief 明示"若尚未创建则跳过该行并报告"；当前仓库 Task 7 未完成，实际跳过 |
| 5 | 修改 components.json（计划文档） | 不修改 | brief 优先级更高："Modify: 无（勿改）" |
| 6 | — | build.ps1 采用 UTF-8 BOM | PS 5.1 对无 BOM .ps1 按 ANSI 解析，中文 Write-Host 会乱码；BOM 方案为标准做法（JS 无 BOM 约束不适用于 ps1） |

- 仅本地 commit，未 push；commit 含 `tools/build.ps1` + `.gitattributes` 两个文件。
- `build/qdip-generic-0.1.0/`、`build/qdip-generic-0.1.0.zip`、`tools/cache/` 内容均未入库（.gitignore 覆盖；仅 task 1 的 `.gitkeep` 占位文件被跟踪）。
