@echo off
setlocal EnableExtensions
title SamMeow AI 工作台
cd /d "%~dp0"

rem --- 环境注入：便携 Node + opencode CLI + 配置隔离 ---
set "ROOT=%~dp0"
set "PATH=%ROOT%runtime\node;%ROOT%opencode\bin;%PATH%"
set "XDG_DATA_HOME=%ROOT%opencode\auth"
set "XDG_CONFIG_HOME=%ROOT%opencode\config"
rem ROOTS：ROOT 去尾反斜杠（cmd 会把 \" 解释为转义引号，传给引导服务会带脏字符）
set "ROOTS=%ROOT:~0,-1%"

rem --- 自检模式：验证路径与版本 ---
if /i "%~1"=="--check" goto :check

rem --- 首次运行引导 ---
if not exist "%ROOT%data\.configured" goto :guide
goto :run

:check
echo [check] node: %ROOT%runtime\node\node.exe
if not exist "%ROOT%runtime\node\node.exe" echo [FAIL] node missing
if not exist "%ROOT%opencode\bin\opencode.exe" if not exist "%ROOT%opencode\bin\opencode.cmd" echo [FAIL] opencode missing
"%ROOT%runtime\node\node.exe" --version
exit /b 0

:guide
if not exist "%ROOT%data" mkdir "%ROOT%data"
del /q "%ROOT%data\.guide-url" 2>nul
start "QDIP-Guide" /min "%ROOT%runtime\node\node.exe" "%ROOT%setup\guide-server.js" "%ROOTS%"
rem 等待引导服务写入 .guide-url（最多 15 秒）
set /a tries=0
:waitguide
if not exist "%ROOT%data\.guide-url" (
  set /a tries+=1
  if %tries% GEQ 15 goto guidefail
  ping -n 2 127.0.0.1 >nul
  goto waitguide
)
set /p GUIDE_URL=<"%ROOT%data\.guide-url"
start "" "%GUIDE_URL%"
echo 首次使用：请在浏览器中完成模型配置，完成后重新双击本文件启动。
exit /b 0
:guidefail
echo [FAIL] 引导服务启动失败。请截图本窗口反馈。
pause
exit /b 1

:run
opencode %*
exit /b %errorlevel%

