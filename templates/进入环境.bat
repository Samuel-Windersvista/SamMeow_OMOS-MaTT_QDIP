@echo off
setlocal EnableExtensions
title QDIP 环境

rem --- 环境注入：便携 Node + opencode CLI + 配置隔离（与 启动.bat 头部一致） ---
set "ROOT=%~dp0"
set "PATH=%ROOT%runtime\node;%ROOT%opencode\bin;%PATH%"
set "XDG_DATA_HOME=%ROOT%opencode\auth"
set "XDG_CONFIG_HOME=%ROOT%opencode\config"
rem OMOslim 编排器依赖 opencode 后台子代理实验开关（官方安装器同款）
set "OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true"
rem chrome-devtools MCP 入口路径（opencode.json {env:QDIP_MCP_CHROME} 插值；正斜杠路径：{env:...} 按文本替换后再解析 JSON，反斜杠会成为非法转义）
set "QDIP_MCP_CHROME=%ROOT:\=/%mcp/chrome-devtools-mcp/build/src/bin/chrome-devtools-mcp.js"
rem 个人倾向文件 preferences.md 路径（opencode.json {env:QDIP_PREFERENCES} 取值，正斜杠防 JSON 转义）
set "QDIP_PREFERENCES=%ROOT:\=/%opencode/config/opencode/preferences.md"
rem ROOTS：ROOT 去尾反斜杠（cmd 会把 \" 解释为转义引号，传给引导服务会带脏字符）
set "ROOTS=%ROOT:~0,-1%"

rem --- 工作目录：与 启动.bat 的 :run 分支读取逻辑一致 ---
set "WSDIR=%ROOTS%"
if exist "%ROOT%data\workspace.txt" for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "$p = '%ROOT%data\workspace.txt'; if (Test-Path -LiteralPath $p) { $w = ([System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)).Trim(); if ($w) { Write-Output $w } }"`) do set "WSDIR=%%A"
if "%WSDIR:~-1%"=="\" set "WSDIR=%WSDIR:~0,-1%"
if "%WSDIR:~-1%"==":" set "WSDIR=%WSDIR%\."

rem --- 带出 setlocal：本脚本由 cmd /k 调用，结束后要留在交互 shell；endlocal 会还原环境变量与当前目录，故注入变量在此重放，cd 放在其后 ---
endlocal & set "ROOT=%ROOT%" & set "PATH=%PATH%" & set "XDG_DATA_HOME=%XDG_DATA_HOME%" & set "XDG_CONFIG_HOME=%XDG_CONFIG_HOME%" & set "OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=%OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS%" & set "QDIP_MCP_CHROME=%QDIP_MCP_CHROME%" & set "QDIP_PREFERENCES=%QDIP_PREFERENCES%" & set "ROOTS=%ROOTS%" & set "WSDIR=%WSDIR%"
cd /d "%WSDIR%"

echo [QDIP] 环境已就绪。输入 opencode 启动工作台；输入 exit 关闭本窗口。
