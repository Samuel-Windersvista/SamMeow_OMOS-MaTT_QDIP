@echo off
setlocal EnableExtensions
title SamMeow AI 工作台
cd /d "%~dp0"

rem --- 环境注入：便携 Node + opencode CLI + 配置隔离（实现见 env.bat） ---
call "%~dp0env.bat"

rem --- 自检模式：验证路径与版本 ---
if /i "%~1"=="--check" goto :check
if /i "%~1"=="--workspace" goto :pick_workspace

rem --- 首次运行引导 ---
if not exist "%ROOT%data\.configured" goto :guide
goto :run

:check
echo [check] node: %ROOT%runtime\node\node.exe
if not exist "%ROOT%runtime\node\node.exe" echo [FAIL] node missing
if not exist "%ROOT%opencode\bin\opencode.exe" if not exist "%ROOT%opencode\bin\opencode.cmd" echo [FAIL] opencode missing
if not exist "%ROOT%env.bat" echo [FAIL] env.bat missing
"%ROOT%runtime\node\node.exe" --version
"%ROOT%opencode\bin\opencode.exe" debug agent orchestrator >nul 2>&1 && echo [OK] plugin: oh-my-opencode-slim loaded || echo [FAIL] plugin: oh-my-opencode-slim NOT loaded
call :find_wt
if defined WTEXE (echo [OK] windows-terminal: %WTEXE%) else (echo [WARN] windows-terminal missing, fallback to console)
if "%WSDIR%"=="%ROOTS%" (echo [INFO] workspace: default ^(package root^)) else (echo [OK] workspace: %WSDIR%)
if not exist "%ROOT%setup\wt-profile.ps1" echo [FAIL] wt-profile.ps1 missing
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

:pick_workspace
if not exist "%ROOT%data" mkdir "%ROOT%data"
powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = '选择 opencode 工作目录'; $d.ShowNewFolderButton = $true; if ($d.ShowDialog() -eq 'OK') { [System.IO.File]::WriteAllText('%ROOT%data\workspace.txt', $d.SelectedPath, (New-Object System.Text.UTF8Encoding($false))) }"
if not exist "%ROOT%data\.configured" goto :guide
goto :run

:run
if /i "%~1"=="--console" goto :run_console
call :find_wt
if defined WTEXE (
  rem QDIP 默认 profile：保证 WT 新开窗口/标签页自动带 QDIP 环境（wt-profile.ps1 幂等）
  rem 块内整段在解析期展开，%WTDIR% 此时仍为空，故用 call + %%WTDIR%% 延迟到执行期展开
  call powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%setup\wt-profile.ps1" -Root "%ROOTS%" -WtDir "%%WTDIR%%"

  start "" "%WTEXE%" -w new -d "%WSDIR%" cmd /k opencode %*
  exit /b 0
)
:run_console
cd /d "%WSDIR%"
opencode %*
exit /b %errorlevel%

:find_wt
set "WTEXE="
for /d %%D in ("%ROOT%runtime\terminal\terminal-*") do if exist "%%D\WindowsTerminal.exe" set "WTEXE=%%D\WindowsTerminal.exe"
if defined WTEXE for %%D in ("%WTEXE%\..") do set "WTDIR=%%~fD"
exit /b 0
