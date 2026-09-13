# Task 5B Brief: 引导页验收与收尾（前任已写文件，禁止重做）

> 背景：前任 designer 已完成 first-run.html（12.9KB）但在浏览器验证环节卡死被取消，未提交未写报告。你的任务是**验收现有文件、修正问题、验证、提交**。禁止从头重写。

## Files:
- Modify: `templates/setup/first-run.html`（已存在，13KB）
- Create: 无新文件（报告除外）

## 原需求（对照检查项）

读 `docs/02-通用版-实施计划.md` 的 Task 5 章节 Step 1 骨架，与 `.superpowers\sdd\02-通用版-实施计划\task-5-brief.md`（控制器契约）。

对照现有 `templates/setup/first-run.html` 逐项检查：

1. **功能**：init() 拉 /api/status 渲染服务商卡片（deepseek/kimi/openai）；勾选启用/禁用输入；测试按钮 POST /api/test 并显示中文错误（401=key 不对、网络错误）；保存按钮一次性 POST /api/configure（**契约：单次提交所有 provider，不能分次**）；成功提示"关闭本页重新双击启动器"
2. **契约**：端点路径精确（/api/status、/api/test、/api/configure）；POST 请求体 `{ provider, apiKey }` 与 `{ providers: {...} }` 与 Task 4 服务端一致
3. **离线**：无任何外部 URL（CDN/字体/图片）
4. **视觉**：暗色终端风格是否成立（间距、焦点态、禁用态、窄屏、错误可读性）
5. **编码**：UTF-8 无 BOM；HTML 结构完整

## Step 1: 验收检查（读文件 + 读 Task 4 服务端代码交叉核对）

读 `templates/setup/guide-server.js` 与 `templates/setup/config-writer.js`（Task 4 产物），确认页面调用的端点、方法、请求体字段与服务端实现精确一致。

## Step 2: 修正问题（如有）

只修问题，不重写。若页面逻辑与服务端不一致（如字段名、提交结构），改页面侧（服务端是已审查通过的 Task 4 产物）。

## Step 3: 静态验证（禁止浏览器自动化——前任就卡死在这）

用 node 做无头验证：
1. 起 `node templates/setup/guide-server.js <项目根>`（用项目根做验证，data/ 会生成 .guide-url——验证后删除 data/.guide-url 与 data/.configured 测试残留）
2. 用 node fetch 请求 `.guide-url` 里的页面 URL → 200 且包含 expected 关键词
3. 用 node fetch 依次调 /api/status、/api/test（假 key）、/api/configure（假数据，验证后清理）——确认页面依赖的 API 契约与服务端实际响应一致
4. 页面 JS 逻辑审查：通读 script 段，确认无引用错误（变量、函数、DOM id）

## Step 4: 提交 + 报告

```bash
git add templates/setup/first-run.html
git commit -m "feat(qdip): first-run guide page"
```

报告写入 `.superpowers\sdd\02-通用版-实施计划\task-5-report.md`：验收清单逐项结果、修正内容（如有）、静态验证输出、commit hash。

## 全局约束
- 不改动 guide-server.js / config-writer.js（Task 4 已审查产物）
- 验证后清理测试残留（data/.guide-url 等）
- 只本地 commit，不 push
