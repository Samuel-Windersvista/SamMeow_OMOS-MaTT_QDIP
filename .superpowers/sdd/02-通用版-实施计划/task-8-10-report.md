# Task 8-10 合并实施报告：启动.bat 修复 + E2E 验证文档 + 玩家指南

- 状态：DONE（三个子任务顺序执行，各自独立 commit，工作树干净）
- 执行时间：2026-08-31
- Commits：
  - A（启动.bat 编码修复）：`7a7f2a35aa54aa935e86006fb372539295b8c512`
  - B（README + 验证清单）：`144d970ea8cb1c81e931acc095e3c98b18a377ce`
  - C（玩家使用指南）：`8bebf9e71da4612e9c80a1f6c61d91e290db1317`
- 全程遵守纪律：无任何 pause/交互等待命令；guide-server 验证后均 Stop-Process kill；未派生子代理

## 子任务 A：启动.bat 编码修复（GBK）

**改动**：`templates/启动.bat` 从 UTF-8 无 BOM + chcp 65001 转码为 **GBK/ANSI（CP936）**，删除 `chcp 65001 >nul` 行，全部中文文案与逻辑不变（53 行结构保持，1695→1557 字节，CRLF=53）。

**验证（mock 置于含中文+括号路径 `D:\Temp\opencode\测试目录(中文)`）**：
- 删除 `.configured` 强制走首次引导分支：stub guide-server 写入 `.guide-url`、等待循环捕获、`echo 首次使用：请在浏览器中完成模型配置...` 正常输出、**parseErrors=0**、exit 0
- `--check`：exit 0、`[check] node` + v24.14.1、无 [FAIL]（mock 无 opencode/bin 时 [FAIL] 检测逻辑本身工作正常）
- 行数 53、goto 标签齐全、chcp 行已删除

**git 处理验证**：
- `git ls-files --eol -- templates/启动.bat` → `i/lf w/crlf attr/text eol=crlf`：git 按 text 处理（未判 binary），blob LF / 检出 CRLF，工作副本 CRLF=53 原样保留
- blob（`git show HEAD:启动.bat`）与工作副本 GBK 解码对比：**完全一致**（GBK 字节未被 git 损坏）
- 重跑 build.ps1 后组装目录 `启动.bat` 为 GBK + CRLF=53 + 无 chcp

**测试工具教训（记录）**：`Start-Process cmd /c` 对"中文+括号"路径引号处理失败（bat 不启动）；`&` 调用会因 `start` 子窗口句柄继承导致工具管道挂起——解法：`& bat *> 文件` 重定向（子窗口继承文件句柄而非管道），PS 立即返回，输出从文件按 UTF-16 读取。均属测试伪象，非产品缺陷。

## 子任务 B：Task 8 — E2E + README + 验证清单

**E2E 输出（用修复后的组装产物，模拟全新用户）**：

```
[1] assembly copied to D:\Temp\opencode\qdip-e2e
[2] --check exit=0 node-ok=True fail=False
[3] .guide-url: http://127.0.0.1:3995/setup/first-run.html
[4] /api/status ok=True providers=deepseek,kimi,openai
[5] first-run.html status=200 len=12900 title=True
[6] /api/test ok=False error=API key 无效（401）（显示 ??? 为管道伪象）
[7] /api/configure ok=True
[8] auth.json deepseek.type=api key-matches=True
    opencode.json providers-empty=True（实测 count=0，deepseek 内置不注入，行为正确）
[9] .configured exists=True
[10] guide-server killed, e2e complete
```

- 真实 key 不可用（报告/代码禁用真实 key 纪律），/api/configure 全链路用假 key `sk-test-dummy-e2e` 完成——本地文件写入链（auth.json 实测格式 `{type:'api', key}` + .configured + opencode.json）全部验证；网络鉴权半程由 /api/test 假 key 401 路径覆盖
- E2E 脚本中 `providers-empty=False` 一处为 **PS 5.1 测量伪象**（空 PSCustomObject 的 `.psobject.Properties.Count` 返回 $null，`$null -eq 0` 为 False）；直接读文件实测 providers 为空，config-writer 行为正确
- 清理：e2e 目录已删除，guide-server 已 kill

**产物**：
- `README.md`（仓库根，维护者视角）：项目简介、目录结构表（docs/templates/tools/build/tools/cache + spt-edition 与 generic 空占位目录）、维护者工作流（更新组件→build.ps1→验证→发布 release）、组件来源清单（node/opencode/OMOslim/superpowers/matt-skills 各含来源与版本）、许可（各组件 MIT + 出处）
- `templates/验证清单.md` + `tools/build.ps1` 部署行：**位置决策**——验证清单.md 放 `templates/`（build/ 被 gitignore 无法入库），由 build.ps1 `[3/5]` 段复制到包根，与 Task 9 玩家使用指南同模式，保持一致
- 重跑 build.ps1：组装目录根出现 验证清单.md，zip 含该条目

## 子任务 C：Task 9 — 玩家使用指南 + 打包追加

- `templates/玩家使用指南.md`：照抄计划 Task 9 Step 1 完整内容（这是什么/快速开始 5 步/高效使用 5 条工作流建议/适合与不适合/常见问题表/进阶成长路径）
- `tools/build.ps1` 追加 `Copy-Item "$templates\玩家使用指南.md" "$outDir\玩家使用指南.md" -Force`
- 重跑 build.ps1：组装目录根含 玩家使用指南.md 与 验证清单.md 两个 md；`tar -tf` 确认 zip 含两条目
- 最终冒烟：组装目录 `启动.bat --check` → exit 0、v24.14.1、无 [FAIL]

## 偏离说明

| # | brief/计划原文 | 实际 | 原因 |
|---|--------------|------|------|
| 1 | 验证清单.md 位置未定（build/ 被忽略） | 放 `templates/验证清单.md` + build.ps1 部署到包根 | brief 允许自决；与 Task 9 玩家指南同模式，两文档一起随包发布 |
| 2 | "有真实 key 则完成 /api/configure 全链路（无则说明）" | 无真实 key；用假 key 完成 configure 全链路（本地写入验证）+ 假 key 401 路径覆盖网络鉴权 | 纪律：报告/代码不得含真实 key；configure 本身是本地文件写入，假 key 足以验证全链路 |
| 3 | — | E2E/启动器验证采用 `& bat *> 文件` 重定向模式 | 规避 `start` 子窗口句柄继承导致的管道挂起（见子任务 A 教训） |
| 4 | — | git 将 GBK 启动.bat 按 text（非 binary）处理 | 实测 `i/lf w/crlf attr/text eol=crlf`，GBK 字节完好（blob 与工作副本解码一致），无需 binary 标注 |

- 三个 commit 均只含各自子任务文件；build/、tools/cache/、.superpowers/ 未入库；全部仅本地 commit 未 push
