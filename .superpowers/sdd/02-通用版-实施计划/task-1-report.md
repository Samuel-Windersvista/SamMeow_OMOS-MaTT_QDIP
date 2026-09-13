# Task 1 报告：项目骨架与 components.json

> 日期：2026-08-31
> 执行者：Fixer（QDIP 整合包 Task 1）

## 做了什么

按 `task-1-brief.md` 的 Step 1-5 逐一执行：

| Step | 内容 | 结果 |
|------|------|------|
| 1 | 创建目录 `tools/cache`、`templates/setup`、`build` | 完成（原均不存在，已创建） |
| 2 | 编写 `tools/components.json`（6 组件清单，UTF-8 无 BOM） | 完成 |
| 3 | 编写 `tools/check-sources.ps1`（UTF-8 无 BOM） | 完成 |
| 4 | 运行校验 `tools\check-sources.ps1` | 完成（见下） |
| 5 | git add + commit | 完成，见 commit hash |

占位文件：`tools/cache/.gitkeep`、`templates/.gitkeep`、`build/.gitkeep`（均为空文件，UTF-8 无 BOM）。

## check-sources 输出

```
[FAIL] missing sources:
  node-runtime: tools\cache\node-v24.14.1-win-x64
  opencode-cli: tools\cache\opencode-1.18.25
EXIT=1
```

缺失项（2/6）：`node-runtime`、`opencode-cli`。

处理方式：按 brief 约定**未创建缺失目录、未修改 source 路径**——这两个运行时组件源（`tools/cache/node-v24.14.1-win-x64`、`tools/cache/opencode-1.18.25`）由 Task 6 打包器负责下载/填充。其余 4 个组件源（omoslim、omoslim-append、superpowers、matt-skills）均存在。Task 6 在执行打包前须先补齐这两个缓存目录。

## Commit

```
1143dc6 chore(qdip): project skeleton + component manifest
5 files changed, 69 insertions(+)
```

提交文件：`tools/components.json`、`tools/check-sources.ps1`、`tools/cache/.gitkeep`、`templates/.gitkeep`、`build/.gitkeep`。

工作区状态：clean。

## 偏离与说明

1. **git add 需 -f（偏离，最低限度）**：项目 `.gitignore` 已忽略 `build/` 与 `tools/cache/`。brief Step 5 的 `git add` 原样执行时对 `tools/cache/.gitkeep`、`build/.gitkeep` 报 "paths are ignored"（ADD_EXIT=1）。为保证 brief 意图（跟踪这两个占位目录），仅对这两个文件追加 `git add -f` 后完成提交，其余文件按原命令正常暂存。未修改 `.gitignore`。
2. **check-sources 预期失败**：详见上节，属于 Task 1 正常边界（组件源由 Task 6 填充），非错误。
3. **templates/setup 目录未被 git 跟踪**：brief Files 列表仅含 `templates/.gitkeep`（已提交），`templates/setup` 为空目录且无 .gitkeep，git 不跟踪。按 brief 原样执行，未额外创建文件。
4. 行尾警告：git 提示 LF 将被替换为 CRLF，属仓库默认 autocrlf 行为，不影响提交。

## 验证

- 编码校验：5 个文件均无 BOM（字节级检查）。
- 校验脚本：运行 `powershell -ExecutionPolicy Bypass -File tools\check-sources.ps1`，输出如上。
- git：commit 成功（EXIT=0），工作区 clean。
