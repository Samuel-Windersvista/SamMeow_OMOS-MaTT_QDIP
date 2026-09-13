# Task 5 Brief: 引导页 first-run.html

> 来源：docs/02-通用版-实施计划.md Task 5（你的需求）

## Files:
- Create: `templates/setup/first-run.html`

## 控制器契约（必须遵守）

1. **单次提交**：Task 4 的 configure() 是全量重建 auth.json。页面必须收集所有勾选且测试通过的服务商，点"保存配置"时**一次性** POST /api/configure（不能每个服务商单独提交）。
2. **功能与结构按骨架**：计划 Task 5 Step 1 有完整 HTML 骨架（三服务商勾选卡片 + key 输入 + 测试按钮 + 保存按钮 + 状态提示）。功能逻辑照骨架，不得删改端点路径（/api/status、/api/test、/api/configure）。
3. **视觉打磨允许**：你是设计实现者。骨架的暗色终端风格（绿字黑底 + 边框）可以在骨架上优化——间距、卡片层次、hover/焦点态、按钮可用态、移动端窄屏、错误/成功状态的可读性。但保持"终端工作台"的气质，不要引入外部字体/CDN/图片（必须完全离线可用）。
4. 引导页文案必须接地气（玩家受众，非开发者），例如测试失败时的中文提示要能看懂（401=key 不对、网络错误=检查网络）。

## Step 1: 读取计划骨架

骨架代码在：`docs/02-通用版-实施计划.md` 的 Task 5 章节 Step 1。完整 HTML（含内联 CSS/JS、三服务商卡片、测试与保存逻辑）。

## Step 2: 编写 templates/setup/first-run.html

基于骨架实现，含上述视觉优化与契约。关键行为：
- init() 拉 /api/status 渲染服务商卡片（deepseek/kimi/openai 三个，来自 PROVIDERS 元数据）
- 每个卡片：勾选框（启用/禁用 key 输入与测试按钮）、key 输入框（password 型）、测试按钮（POST /api/test）、状态提示 span
- 测试成功后把 key 存入 state；测试失败显示中文错误
- 保存按钮：至少一个服务商测试通过才可点（或点击时校验），一次性 POST /api/configure
- 成功后显示"配置完成，请关闭本页并重新双击启动器"

## Step 3: 手动验证

Run: 
1. `node templates/setup/guide-server.js <临时根目录>`（需要先把 Task 2 的模板与 Task 4 的 setup 文件拷进临时根的对应位置，或用项目根做临时验证）
2. 浏览器打开 .guide-url 输出的地址
3. 验证：勾选 DeepSeek 填假 key → 测试显示"API key 无效"类中文错误；取消勾选 → 输入框禁用；无测试通过时点保存 → 有提示不提交
4. 截图或描述渲染效果写入报告

## Step 4: 提交

```bash
git add templates/setup/first-run.html
git commit -m "feat(qdip): first-run guide page"
```

## 全局约束
- 单文件 HTML，UTF-8 无 BOM，无外部资源（离线可用）
- 不改动 setup/ 下其他文件（guide-server.js 与 config-writer.js 是 Task 4 产物）
- 只本地 commit，不 push
