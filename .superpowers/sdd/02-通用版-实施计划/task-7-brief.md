# Task 7 Brief: 更新组件.bat

> 来源：docs/02-通用版-实施计划.md Task 7（你的需求，含 Task 6 carry）

## Files:
- Create: `templates/更新组件.bat`

## Task 6 carry（必须执行）

Task 6 的 build.ps1 对 更新组件.bat 做了条件化复制（存在才复制）。本任务创建文件后，**必须重跑一次 build.ps1**，确认新组件进入组装产物与 zip。

## Step 1: 编写 templates/更新组件.bat

骨架代码在计划文档 Task 7 Step 1。按骨架实现，注意：
- 同 Task 3 的 bat 工程约束：CRLF 行尾、UTF-8 无 BOM + chcp 65001（中文 echo）、路径双引号
- Task 3 实现者的实证修正同样适用：避免块内 %VAR% 引用问题（参考 templates/启动.bat 的 goto 结构风格）、不用 timeout 小数
- 语义：注入 PATH → [1/2] npm 更新 opencode（失败保留原版并提示网络问题）→ [2/2] npm 更新 superpowers（组件缺失时 SKIP）→ 完成提示（重新双击启动器生效）

## Step 2: 冒烟验证

复制到 Task 6 的组装目录（build/qdip-generic-0.1.0/）跑一次：
- 网络路径：opencode 更新会尝试 npm（网络可用，预期 [OK] 或合理失败信息）
- 验证脚本不崩（窗口流程走完），失败时提示清晰

## Step 3: 提交 + 重跑打包器

```bash
git add templates/更新组件.bat
git commit -m "feat(qdip): component updater script"
```

然后：`powershell -ExecutionPolicy Bypass -File tools\build.ps1`（从项目根）
验证：组装目录根出现 更新组件.bat；zip 重新生成。

## 全局约束
- CRLF + chcp 65001 + UTF-8 无 BOM
- 不修改其他文件；tools/cache/ 与 build/ 不进 git
- 只本地 commit，不 push
