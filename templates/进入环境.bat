@echo off
title QDIP 环境

rem --- 环境注入 + 工作目录解析（实现见 env.bat；变量由 env.bat 搬回本作用域） ---
call "%~dp0env.bat"

rem --- 变量逃逸由 env.bat 的 endlocal ^& set 负责；本文件不 setlocal，否则会还原环境变量与当前目录 ---
cd /d "%WSDIR%"

echo [QDIP] 环境已就绪。输入 opencode 启动工作台；输入 exit 关闭本窗口。
