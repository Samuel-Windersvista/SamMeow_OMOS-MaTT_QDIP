@echo off
setlocal EnableExtensions
title SamMeow 更新组件
cd /d "%~dp0"
set "ROOT=%~dp0"
set "PATH=%ROOT%runtime\node;%PATH%"

echo ============================================
echo   SamMeow AI 工作台 - 组件更新
echo   说明：更新 opencode 组件。
echo   OMOslim 与技能包请等待新版整合包发布。
echo ============================================
echo.

rem --- 1. 更新 opencode（npm 官方源） ---
echo [1/1] 更新 opencode ...
set "OC_UPDATE=%TEMP%\qdip-oc-update"
if exist "%OC_UPDATE%" rd /s /q "%OC_UPDATE%"
call npm install --prefix "%OC_UPDATE%" opencode-ai@latest --no-save 2>nul
if errorlevel 1 goto :ocfail
if not exist "%OC_UPDATE%\node_modules\opencode-ai\bin\opencode.exe" goto :ocfail
copy /y "%OC_UPDATE%\node_modules\opencode-ai\bin\opencode.exe" "%ROOT%opencode\bin\opencode.exe" >nul
if errorlevel 1 goto :ocfail
rd /s /q "%OC_UPDATE%" 2>nul
echo   [OK] opencode 已更新
goto :done
:ocfail
rd /s /q "%OC_UPDATE%" 2>nul
echo   [FAIL] opencode 更新失败（网络问题？）。已保留原版本。
echo         提示：也可到发布页下载新版整合包 zip 解压覆盖。

:done
echo.
echo 完成。重新双击 启动.bat 生效。
pause
