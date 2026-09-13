# Task 8-10 合并 Brief: 启动.bat 修复 + E2E 验证文档 + 玩家指南

> 控制器合并派发（用户要求提速）。三个子任务按顺序执行，各自独立 commit。

## 子任务 A: 启动.bat 编码修复（裁决指令）

**背景**：Task 7 实证发现 UTF-8 无 BOM + chcp 65001 的 bat 在含中文 echo 时有非确定性解析错位（3 次复现）。templates/启动.bat 是同类方案，首次引导路径含中文 echo，需修复。

**Files:** Modify `templates/启动.bat`

**要求**：
1. 转码为 GBK/ANSI（本机 CP936）编码，删除 `chcp 65001` 行，保持全部中文文案与逻辑不变（53 行结构不变）
2. 验证：把 mock 测试目录放到**含中文的路径**（如 `D:\Temp\opencode\测试目录(中文)`），复制修复后的 bat + node.exe + 一个写 .guide-url 的 stub guide-server，运行首次引导路径（删除 .configured 使走引导分支），确认中文 echo 正常输出、无解析错误
3. 验证 git 处理：commit 后 `git ls-files --eol templates/启动.bat` 确认行尾处理（GBK 文件可能被 git 视为 binary——如实报告，若 binary 则确认工作区 CRLF 原样保留、组装复制后仍 CRLF）
4. 修复后重跑 build.ps1 让修复进组装产物
5. Commit: `fix(qdip): launcher encoding to GBK for Chinese cmd parsing`

## 子任务 B: Task 8 — E2E 验证 + README + 验证清单

**Files:** Create `README.md`；Create `build/验证清单.md`

**要求**：
1. **E2E 验证**（用子任务 A 修复后的组装产物）：模拟全新用户——复制 build/qdip-generic-0.1.0/ 到新目录 → `启动.bat --check` → 首次引导流程（起 guide-server、验证 .guide-url 与页面 200）→ 假 key 测 /api/test（预期中文错误）→ 有真实 key 则完成 /api/configure 全链路（无则说明）→ 验证 auth.json 与 .configured 生成 → 清理
2. **README.md**（项目根，维护者视角）：项目简介、目录说明（docs/ 文档、templates/ 模板、tools/ 打包器、build/ 产物、spt-edition/ 预留 SPT 专业版）、维护者工作流（更新组件 → build.ps1 → 验证 → 发布 release）、组件来源清单、许可（各组件 MIT + 出处）
3. **build/验证清单.md**（随包发布的玩家 FAQ）：玩家 5 步上手、常见报错对照（key 无效/网络/端口/杀毒拦截 bat）、重置方法（删 data/）、更新方法（新版 zip 覆盖，保留 auth 与 config/local）、"勿解压至盘符根目录"提示
4. Commit: `docs(qdip): readme and release checklist`（build/ 与 .superpowers/ 不进 git，验证清单.md 在 build/ 下——注意 .gitignore 忽略 build/！**验证清单.md 应放 templates/ 或仓库根才能进 git**——若放 build/ 会被忽略。改放 templates/验证清单.md 并让 build.ps1 部署到包根，或直接放仓库根。你决定并保持一致，报告说明）

## 子任务 C: Task 9 — 玩家使用指南 + 打包追加

**Files:** Create `templates/玩家使用指南.md`；Modify `tools/build.ps1`

**要求**：
1. 按计划 `docs/02-通用版-实施计划.md` Task 9 Step 1 的完整内容创建 玩家使用指南.md（内容已在计划中给出，照抄）
2. build.ps1 模板部署段追加：`Copy-Item "$templates\玩家使用指南.md" "$outDir\玩家使用指南.md" -Force`
3. 重跑 build.ps1，确认指南进组装目录与 zip
4. Commit: `feat(qdip): player usage guide + packaging`

## 全局约束
- 三个子任务顺序执行，独立 commit
- 禁止派生任何子代理；禁止运行任何含 pause/交互等待的命令（验证一律非交互：echo 确认输出、exit code 检查）；guide-server 验证后必须 kill
- 报告写入 `.superpowers\sdd\02-通用版-实施计划\task-8-10-report.md`
- 最终回复：状态、三个 commit hash、E2E 输出摘要一行、concerns
