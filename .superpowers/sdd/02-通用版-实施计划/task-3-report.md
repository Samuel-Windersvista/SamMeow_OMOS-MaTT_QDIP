# Task 3 实施报告：启动器 启动.bat

- 状态：DONE
- 执行时间：2026-08-31
- Commit：`1dd66ab345ecb4fa8488e345031414d5e4c03f8d`（short `1dd66ab`，feat(qdip): launcher with env injection and first-run gate）
- 产物：`templates/启动.bat`（UTF-8 无 BOM + chcp 65001 + CRLF，53 行，1695 字节）

## 1. 控制器修正确认

`XDG_CONFIG_HOME=%ROOT%opencode\config` 已包含在代码中（未回退），与 `XDG_DATA_HOME=%ROOT%opencode\auth` 并列，实现配置读取目录隔离到整合包内。

## 2. 冒烟测试环境

- mock 目录：`build\mock-launcher-test`（项目根下，路径含括号 `(Quick Deployment Integration Package)`）
- 便携 node：复制自 `C:\Program Files\nodejs\node.exe`（v24.14.1）
- opencode CLI：复制自 `%AppData%\npm\opencode*`（opencode / opencode.cmd / opencode.ps1）
- 引导服务：测试用 stub `setup\guide-server.js`（写入 `data\.guide-url`）

## 3. 冒烟测试完整输出

### TEST A：自检模式 `启动.bat --check`

```
[check] node: E:\云文件\GitHub\SamMeow_OMOS+SP+MaTT_QDIP(Quick Deployment Integration Package)\build\mock-launcher-test\runtime\node\node.exe
v24.14.1
exitcode: 0
```

预期达成：输出 [check] node 路径与 v24.14.1，无 [FAIL] 行，exit 0。

### TEST B：首次运行引导流程 `启动.bat`（无参数）

```
首次使用：请在浏览器中完成模型配置，完成后重新双击本文件启动。
exitcode: 0
```

stub 收到干净 argv（无尾引号脏字符）：

```json
["E:\\...\\mock-launcher-test\\runtime\\node\\node.exe","E:\\...\\mock-launcher-test\\setup\\guide-server.js","E:\\...\\mock-launcher-test"]
```

`data\.guide-url` 正确写入，内容为引导 URL。流程：mkdir data → del 旧 .guide-url → start 引导服务 → 等待循环捕获 .guide-url → start "" 打开 URL → 打印提示 → exit 0。

### TEST C：引导失败路径（stub 不写文件）

```
[FAIL] 引导服务启动失败。请截图本窗口反馈。
Press any key to continue . . .
exitcode: 1, elapsed: 15.4s
```

等待循环 15 次 × ~1.1s ≈ 15.4s，符合"最多 15 秒"注释；exit 1。

## 4. 偏离说明（相对 brief 原码的修正，均以冒烟测试实证驱动）

| # | brief 原文 | 修正后 | 根因 |
|---|-----------|--------|------|
| 1 | `if /i "%~1"=="--check" ( ... )` 与 `if not exist "%ROOT%data\.configured" ( ... )` 括号块 | `goto :check` / `goto :guide` + 顶层 `:check`/`:guide`/`:guidefail` 标签结构 | cmd 块解析器不识别引号内的 `)`。项目根路径含 `(Quick Deployment Integration Package)`，块内 `if not exist "路径(含括号)"` 报 "was unexpected at this time"（对照实验：无括号路径下同代码正常）。逐字代码连 brief 自带的 --check 冒烟都无法通过 |
| 2 | `timeout /t 0.5 /nobreak >nul` | `ping -n 2 127.0.0.1 >nul` | `timeout` 只接受整数秒，`/t 0.5` 直接报 "Invalid value for timeout (/T) specified"，等待循环空转 30 次立即判失败。`ping -n 2` 实测 ~1.1s，且对重定向 stdin（自动化/CI 调用）健壮；`tries` 同步 30→15 保持 15 秒预算 |
| 3 | `start ... "%ROOT%setup\guide-server.js" "%ROOT%"` | `"%ROOTS%"`（新增 `set "ROOTS=%ROOT:~0,-1%"`） | Windows C 运行时把 `\"` 解释为转义引号：`"E:\...\mock-launcher-test\"` 传参后 node 收到的 argv 是 `E:\...\mock-launcher-test"`（带尾巴引号），`root+'data'` 变成 `...test"data`。引导服务契约：**收到的是去尾反斜杠的根路径**（Task 4 应据此编写 guide-server.js） |
| 4 | （未声明行尾） | CRLF | 首批次以 LF 写入，cmd 对 LF 批处理解析错乱（`'---' 不是内部或外部命令` 等）。修正为 CRLF 后冒烟通过 |

以上修正均保持 brief 中所有 echo/rem/命令原文与语义不变；`goto` 结构使两条分支（--check、首次引导）在含括号路径下全部正常工作，生产（双击）与自动化调用场景均可用。

## 5. 测试伪象说明

- `timeout` 在重定向 stdin 下报 "Input redirection is not supported"——纯测试环境现象（真实双击有控制台 stdin），已在偏离 #2 中一并规避。
- TEST B 收尾处 bash 工具等待 120s 超时：`start "" "%GUIDE_URL%"` 弹出的测试窗口（guide-ok.cmd）句柄残留所致，launcher 自身输出完整、exit 0，非 launcher 缺陷。

## 6. 其他

- 仅本地 commit，未 push；commit 仅含 `templates/启动.bat` 一个文件。
- mock 测试目录 `build\mock-launcher-test` 保留在 build\ 下（未纳入 commit）。
- 注意：仓库若在无 autocrlf 环境检出，bat 可能变 LF；打包器（Task 6）应确保分发时 CRLF。
