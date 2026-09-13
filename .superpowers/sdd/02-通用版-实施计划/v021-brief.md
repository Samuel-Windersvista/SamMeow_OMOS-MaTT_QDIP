# v0.2.1 Brief: 模型分配区域加"跟随默认"依赖提示

## 需求

在 first-run.html 的模型分配 Section（Section C）加一个醒目的提示块，说明"跟随默认"的依赖关系。

## 背景（提示的准确依据）

整合包预设（superpowers-bridge）的角色默认模型绑定特定模型，例如 orchestrator=deepseek/deepseek-v4-pro、oracle=kimi-for-coding/k3、部分角色用 kimi-for-coding 系列。这些模型**不是**引导页静态列表（deepseek-chat / moonshot / gpt-4o-mini 等）能覆盖的：
- deepseek-v4-pro 不是 DeepSeek 官方 API 的模型名（官方是 deepseek-chat / deepseek-reasoner）
- kimi-for-coding（api.kimi.com）与 Moonshot 开放平台是不同产品

因此玩家只按引导页配 key 时，"跟随默认"的角色很可能因缺少对应 API 而无法工作。

## 要求

1. 在 Section C（模型分配）顶部或"跟随默认"选项附近加提示块，文案（可微调措辞，保持玩家可读）：

> 注意：选择"跟随默认"会使用预设模型组合（DeepSeek v4 与 Kimi K3 等），需要对应的 API 才能生效。如果你只配置了一个服务商，请使用下面的"全部用 X"快捷按钮，避免部分角色无法工作。

2. 视觉：复用现有警告/注意样式（如 [!!] 前缀、警示色），不新增字体/CDN；与现有暗色终端风格一致
3. 不改动任何逻辑/契约

## 验证

- 无头验证：文件可加载、提示块在 HTML 结构内、无外部 URL
- 不需要起 guide-server 完整流程（纯文案插入），node fetch 页面静态检查即可

## 提交

`fix(qdip): model assignment default dependency notice`
报告写入 `.superpowers\sdd\02-通用版-实施计划\v021-report.md`（简短即可）。
