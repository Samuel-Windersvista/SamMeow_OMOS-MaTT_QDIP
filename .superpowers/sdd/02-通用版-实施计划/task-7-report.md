# Task 7 实施报告：更新组件.bat

- 状态：DONE
- 执行时间：2026-08-31
- Commit：`8bc1e6b7756187fdf42cdef023d013d493b2202c`（short `8bc1e6b`，feat(qdip): component updater script）
- 产物：`templates/更新组件.bat`（GBK/ANSI + CRLF，39 行，1096 字节）
- 仅本地 commit，未 push；未修改其他文件

## 1. 实现内容

按计划 Task 7 骨架 + Task 3 工程约束（goto 风格、无块内 %VAR% 陷阱、无 timeout 小数、双引号路径）：

- 注入 PATH（`%ROOT%runtime\node`）→ 头部说明（OMOslim 与技能包等待新版整合包）
- `[1/2]` `call npm install -g opencode-ai@latest --prefix "%ROOT%opencode" --no-save 2>nul`，`if errorlevel 1 goto :ocfail` → 失败输出 `[FAIL] ... 已保留原版本`
- `[2/2]` `if not exist "%ROOT%plugins\superpowers\package.json" goto :spmissing` → 存在则 `pushd ... & call npm update superpowers --prefix "%ROOT%plugins" --no-save & popd` → `[OK]`；缺失 → `[SKIP]`
- 完成提示 + `pause`
- 控制流全部用 goto 标签（:ocfail / :step2 / :spmissing / :done），无含路径/变量的括号块

## 2. 编码决策与证据（重要偏离）

brief 全局约束要求"chcp 65001 + UTF-8 无 BOM"，但实测该方案在本文本上**非确定性解析错位**：

- UTF-8+chcp 版本冒烟出现 3 次独立解析错误：`'等待新版整合包发布。' is not recognized as an internal or external command`（cmd /c 运行）、`'完成。...'` 段报错（t1 最小复现）、`operable program or batch file.`（t2 最小复现）；同文件再跑一次又正常（run 2 无错）——随机性与位置相关，属 cmd 在 chcp 65001 后按字节游标重读批处理导致的已知缺陷。
- 本机控制台实测 `[Console]::OutputEncoding` 为 **CP936 (gb2312)**——GBK 是原生编码。
- **GBK/ANSI（去 chcp）版本 3/3 次运行零解析错误**，npm 实际执行成功（`changed 3 packages` / `up to date`），`[OK]`/`[FAIL]` 结构标记完整，exit 0。

结论：采用 **GBK/ANSI + CRLF、不含 chcp 行**。这与计划原文 Task 3 章允许的"GBK/ANSI 或带 chcp 65001 声明的 UTF-8"两个合法选项之一一致，且以实证选择更可靠者。真实用户双击（中文 Windows CP936 控制台）下 GBK 原生渲染无乱码。（本报告/工具管道中显示为乱码是 GBK 字节经 UTF-8 管道解码的伪象。）

**遗留 concern**：`templates/启动.bat`（Task 3 产物）同为 UTF-8 无 BOM + chcp 65001 方案，其首次引导路径含中文 echo（`echo 首次使用：...`、`echo [FAIL] 引导服务启动失败...`），潜伏同类解析错位风险（本任务未复现——--check 路径不含中文 echo、guide 路径需 mock 才能触发，且不在本任务范围）。建议后续单独为 启动.bat 做同样的 GBK 化改造。

## 3. 冒烟验证输出（组装目录内，3 次运行）

```
run 1 : parseErrors=0 opencodeOK=1 superpowersOK=1
run 2 : parseErrors=0 opencodeOK=1 superpowersOK=1
run 3 : parseErrors=0 opencodeOK=1 superpowersOK=1
--- final run output（结构） ---
============================================
  SamMeow AI 工作台 - 组件更新
  说明：更新 opencode 与 superpowers 组件。
  OMOslim 与技能包请等待新版整合包发布。
============================================
[1/2] 更新 opencode ...
changed 3 packages in 5s
  [OK] opencode 已更新
[2/2] 更新 superpowers ...
up to date in 489ms
  [OK] superpowers 已更新
完成。重新双击 启动.bat 生效。
Press any key to continue . . .
```

- 网络路径实测走通：npm 从官方 registry 更新 opencode-ai（changed 3 packages）、superpowers 已是最新（up to date）。
- 失败路径由 `if errorlevel 1 goto :ocfail` + `[FAIL]` 覆盖（网络不可用时提示清晰且不退出崩溃）；`[SKIP]` 分支在组件缺失时跳过。
- 脚本 EOL 验证：组装目录内 更新组件.bat CRLF=39 / LF=0 / 无 BOM。

## 4. Task 6 carry：重跑打包器输出

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
  + 更新组件.bat          ← 此前为 (skip)，现在进入组装
[4/5] 校验
[OK] all 6 component sources exist
  [OK] node: True  opencode: True
[5/5] 打包 zip
  -> build/qdip-generic-0.1.0.zip
[DONE] 组装完成: build/qdip-generic-0.1.0
```

- 组装目录根出现 更新组件.bat（与 启动.bat 并列）；zip 重新生成（100,387,007 字节，2026-08-31 23:17:10）。
- `tar -tf` 验证 zip 根含 `启动.bat` 与 `更新组件.bat` 条目（另含 runtime/node 自带 3 个 .bat，共 2356 条目）。

## 5. 偏离汇总

| # | brief/计划原文 | 实际 | 原因/证据 |
|---|--------------|------|----------|
| 1 | chcp 65001 + UTF-8 无 BOM | **GBK/ANSI + CRLF，无 chcp** | UTF-8+chcp 实测 3 次非确定性解析错位；GBK 3/3 零错误（见第 2 节）；计划原文允许 GBK/ANSI 选项 |
| 2 | （计划骨架用 if/else 括号块） | goto 标签控制流 | Task 3 实证修正：避免块内路径/变量解析错位 |
| 3 | — | 冒烟时 npm 实际执行更新（`changed 3 packages`） | 组装目录 opencode/ 被 npm 写入 node_modules——随后 build.ps1 重跑已清理重建，zip 干净 |

- build/ 与 tools/cache/ 未入库；仅 commit `templates/更新组件.bat` 一个文件。
