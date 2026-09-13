# Task 3 Brief: 启动器 启动.bat

> 来源：docs/02-通用版-实施计划.md Task 3（你的需求，含控制器修正）

## Files:
- Create: `templates/启动.bat`

## 控制器修正（必须体现在代码里，与计划原文的差异）

计划原文的 bat 只设置了 `XDG_DATA_HOME`。控制器补充裁定：**必须同时设置 `XDG_CONFIG_HOME`**——绿色版整合包要把 opencode 配置读取目录隔离到整合包内（`opencode\config`），否则 opencode 会去读玩家系统的 `%USERPROFILE%\.config\opencode`，整合包内的 opencode.json 与 oh-my-opencode-slim.json 不会生效。

## Step 1: 编写 templates/启动.bat

注意：bat 文件编码必须是 **GBK/ANSI 或带 chcp 65001 声明的 UTF-8**——含中文 echo 文本时，无 chcp 的 UTF-8 无 BOM 文件在中文 Windows 上会乱码。采用 **chcp 65001 + UTF-8 无 BOM** 方案（与项目全局约束一致）。

```bat
@echo off
chcp 65001 >nul
setlocal EnableExtensions
title SamMeow AI 工作台
cd /d "%~dp0"

rem --- 环境注入：便携 Node + opencode CLI + 配置隔离 ---
set "ROOT=%~dp0"
set "PATH=%ROOT%runtime\node;%ROOT%opencode\bin;%PATH%"
set "XDG_DATA_HOME=%ROOT%opencode\auth"
set "XDG_CONFIG_HOME=%ROOT%opencode\config"

rem --- 自检模式：验证路径与版本 ---
if /i "%~1"=="--check" (
  echo [check] node: %ROOT%runtime\node\node.exe
  if not exist "%ROOT%runtime\node\node.exe" echo [FAIL] node missing
  if not exist "%ROOT%opencode\bin\opencode.exe" if not exist "%ROOT%opencode\bin\opencode.cmd" echo [FAIL] opencode missing
  "%ROOT%runtime\node\node.exe" --version
  exit /b 0
)

rem --- 首次运行引导 ---
if not exist "%ROOT%data\.configured" (
  if not exist "%ROOT%data" mkdir "%ROOT%data"
  del /q "%ROOT%data\.guide-url" 2>nul
  start "QDIP-Guide" /min "%ROOT%runtime\node\node.exe" "%ROOT%setup\guide-server.js" "%ROOT%"
  rem 等待引导服务写入 .guide-url（最多 15 秒）
  set /a tries=0
  :waitguide
  if not exist "%ROOT%data\.guide-url" (
    set /a tries+=1
    if %tries% GEQ 30 goto guidefail
    timeout /t 0.5 /nobreak >nul
    goto waitguide
  )
  set /p GUIDE_URL=<"%ROOT%data\.guide-url"
  start "" "%GUIDE_URL%"
  echo 首次使用：请在浏览器中完成模型配置，完成后重新双击本文件启动。
  goto :eof
  :guidefail
  echo [FAIL] 引导服务启动失败。请截图本窗口反馈。
  pause
  exit /b 1
)

rem --- 正常启动 opencode ---
opencode %*
exit /b %errorlevel%
```

## Step 2: 冒烟验证

开发机已有系统 node（C:\Program Files\nodejs\node.exe，v24.14.1）与 npm 全局 opencode（%AppData%\Roaming\npm 下）。在项目根建临时 mock 目录跑自检（**不要动 templates/启动.bat 本体**，复制一份到 mock 目录）：

```powershell
$mock = "E:\云文件\GitHub\SamMeow_OMOS+SP+MaTT_QDIP(Quick Deployment Integration Package)\build\mock-launcher-test"
New-Item -ItemType Directory -Path "$mock\runtime\node" -Force | Out-Null
New-Item -ItemType Directory -Path "$mock\opencode\bin" -Force | Out-Null
Copy-Item "C:\Program Files\nodejs\node.exe" "$mock\runtime\node\node.exe"
Copy-Item "$env:APPDATA\Roaming\npm\opencode*" "$mock\opencode\bin\" -Recurse -Force
Copy-Item "templates\启动.bat" "$mock\启动.bat"
# 运行自检
& "$mock\启动.bat" --check
# 预期：输出 [check] node: <路径> 与 v24.14.1，无 [FAIL] 行
```

## Step 3: 提交

```bash
git add templates/启动.bat
git commit -m "feat(qdip): launcher with env injection and first-run gate"
```

## 全局约束
- bat 文件 UTF-8 无 BOM + chcp 65001
- 路径双引号包裹（含中文/空格）
- 不修改其他文件；只本地 commit
