@echo off
rem ============================================================
rem QDIP 便携环境模块 —— 唯一声明「便携环境是什么」的地方。
rem 由 启动.bat 与 进入环境.bat 以 call "%~dp0env.bat" 调用。
rem 内部 setlocal 推导，末尾用 endlocal ^& set 把结果搬回调用者作用域。
rem 导出：ROOT PATH XDG_DATA_HOME XDG_CONFIG_HOME
rem       OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS
rem       QDIP_MCP_CHROME QDIP_PREFERENCES QDIP_PERSONA ROOTS WSDIR
rem ============================================================
setlocal EnableExtensions

rem --- 环境注入：便携 Node + opencode CLI + 配置根 ---
set "ROOT=%~dp0"
set "PATH=%ROOT%runtime\node;%ROOT%opencode\bin;%PATH%"
set "XDG_DATA_HOME=%ROOT%opencode\auth"
set "XDG_CONFIG_HOME=%ROOT%opencode\config"
rem OMOslim 后台子代理实验开关（官方安装器同款要求）
set "OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true"
rem chrome-devtools MCP 入口（opencode.json 的 {env:QDIP_MCP_CHROME} 取此值）
set "QDIP_MCP_CHROME=%ROOT:\=/%mcp/chrome-devtools-mcp/build/src/bin/chrome-devtools-mcp.js"
rem 个人倾向文件（opencode.json 的 {env:QDIP_PREFERENCES} 取此值）
set "QDIP_PREFERENCES=%ROOT:\=/%opencode/config/opencode/preferences.md"
rem 人格文件（config-writer 写入 instructions 的 {env:QDIP_PERSONA} token 取此值）
set "QDIP_PERSONA=%ROOT:\=/%opencode/config/opencode/instructions/persona.md"
rem ROOTS：ROOT 去尾反斜杠
set "ROOTS=%ROOT:~0,-1%"

rem --- 工作目录解析：data\workspace.txt 存在且非空则用它，否则用包根 ---
set "WSDIR=%ROOTS%"
if exist "%ROOT%data\workspace.txt" for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "$p = '%ROOT%data\workspace.txt'; if (Test-Path -LiteralPath $p) { $w = ([System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)).Trim(); if ($w) { Write-Output $w } }"`) do set "WSDIR=%%A"
if "%WSDIR:~-1%"=="\" set "WSDIR=%WSDIR:~0,-1%"
if "%WSDIR:~-1%"==":" set "WSDIR=%WSDIR%\."

endlocal & set "ROOT=%ROOT%" & set "PATH=%PATH%" & set "XDG_DATA_HOME=%XDG_DATA_HOME%" & set "XDG_CONFIG_HOME=%XDG_CONFIG_HOME%" & set "OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=%OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS%" & set "QDIP_MCP_CHROME=%QDIP_MCP_CHROME%" & set "QDIP_PREFERENCES=%QDIP_PREFERENCES%" & set "QDIP_PERSONA=%QDIP_PERSONA%" & set "ROOTS=%ROOTS%" & set "WSDIR=%WSDIR%"
exit /b 0
