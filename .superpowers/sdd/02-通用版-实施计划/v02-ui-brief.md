# v0.2 UI Brief: first-run.html 扩展（人格 + 模型分配面板）

> 后端已就绪（fix-2 完成）。你负责 first-run.html 的前端对接与视觉。禁止浏览器自动化（前任卡死教训），验证用 node fetch 无头方式。

## 后端 API 契约（fix-2 实测定案，直接对接）

- `GET /api/status` 现在含 `models` 字段（静态模型列表，形如 `[{ "provider": "deepseek", "name": "deepseek-chat", "label": "DeepSeek Chat" }, ...]`，读 config-writer.js 的 AVAILABLE_MODELS 确认精确结构）
- `POST /api/configure` 新增可选字段（并入现有请求体）：
  - `persona`: `"vaulttec"` | `"minimal"` | `"custom"`（省略 = 不设置）
  - `personaText`: 仅 persona=custom 时的文本
  - `agentModels`: `{ "orchestrator": "deepseek/deepseek-chat", "oracle": "...", "fixer": "...", "designer": "...", "explorer": "...", "librarian": "...", "observer": "...", "council-alpha": "...", "council-beta": "...", "council-gamma": "..." }`（键名精确，值 = `provider/model` 字符串；省略某键 = 该角色保持默认）

## UI 需求

在现有 first-run.html 上新增两个 Section（保持暗色终端风格与现有组件语言）：

### Section B: AI 人格（可选）
- 4 个单选卡片：专业默认（说明：直接干活的实干型助手）/ Vault-Tec 复古（说明：1950 年代原子风企业终端口吻，有趣）/ 极简（说明：一句话能说完绝不说两句）/ 自定义（选中展开 textarea）
- 默认选中"专业默认"；不选任何 = 不传 persona
- 视觉：复用现有卡片风格（accent 左边条选中态）

### Section C: 模型分配（可选）
- 三个分组标题：核心角色（orchestrator/oracle/fixer）、辅助角色（designer/explorer/librarian/observer）、议会（council-alpha/beta/gamma）
- 每个角色一行：角色名 + 简短职责说明 + 下拉选择
- 下拉选项：第一项"跟随默认"（空值），其余来自 /api/status 的 models 列表（label 显示，value = provider/model）
- 快捷按钮："全部跟随默认" + "全部用 <第一个测通的服务商模型>"（如玩家测通了 deepseek，就提供"全部用 deepseek-chat"）
- 未修改的下拉 = 不传该键（agentModels 只含玩家动过的）

### 保存流程
- 现有保存按钮的 POST body 扩展：`{ providers, persona?, personaText?, agentModels? }`
- 成功提示文案不变

## 验证（无头，禁止浏览器自动化）

1. 起 guide-server（临时 root）→ node fetch 页面 200 + 关键词
2. 通读页面 JS 确认契约字段与后端一致
3. 起服务模拟完整 configure 请求（含 persona + agentModels 部分覆盖）→ 检查 persona.md / oh-my-opencode-slim.json 落盘正确（只改指定字段）
4. 无头验证后清理 + kill

## 提交

`feat(qdip): guide page persona + per-agent model assignment UI`
报告写入 `.superpowers\sdd\02-通用版-实施计划\v02-ui-report.md`：视觉决策、验证输出、commit hash。
