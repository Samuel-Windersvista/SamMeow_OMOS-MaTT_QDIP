# 增量 Brief: 引导页人格设置 + 角色/议会模型分配（后端逻辑）

> QDIP v0.2 增量。先做后端（config-writer + guide-server + 测试），UI 由 des-2 后续对接。

## 需求

初次引导页新增两个能力：
1. **AI 人格设置**：玩家可选预设人格或自定义，写入环境
2. **模型分配**：玩家填完 key 后，为 OMO-slim 每个角色（orchestrator/oracle/fixer/designer/explorer/librarian/observer）与议会（council alpha/beta/gamma + 合成者）指定大模型

## 设计（控制器已定案，按此实现）

### 人格
- 4 种模式：`default`（专业默认，不写任何文件）、`vaulttec`（Vault-Tec 复古风，写入 persona.md）、`minimal`（极简无废话）、`custom`（玩家自填文本）
- `vaulttec` 与 `minimal` 的内容由你撰写（中文，500 字内，作为 instructions 补充）：vaulttec = 1950 年代原子风企业终端口吻；minimal = 极简直接回复
- 写入位置：`<root>/opencode/config/opencode/instructions/persona.md`（UTF-8 无 BOM）
- 同时更新 `<root>/opencode/config/opencode/opencode.json`：`instructions` 数组追加 `"<相对路径到 persona.md>"`（相对基准为配置文件位置，与之前实测的 opencode.json 加载路径一致——如不确定用 CWD 还是配置目录基准，实测确认）

### 模型分配
- 写入 `oh-my-opencode-slim.json` 的 `presets.superpowers-bridge` 各 agent 的 `model` 字段 + `council.presets` 里 default/synthesizer 两个预设的 alpha/beta/gamma `model` 字段
- 只覆盖玩家显式选择的角色；未选择的保持模板原值
- 模型合法值：deepseek（deepseek-chat / deepseek-reasoner）、moonshot（moonshot-v1-8k / moonshot-v1-32k / moonshot-v1-128k）、openai（gpt-4o-mini / gpt-4o）。静态列表即可（不动态拉 opencode models——v1 取舍）

### API 扩展（guide-server.js）

1. `POST /api/configure` 请求体扩展（向后兼容，新字段可选）：
```json
{
  "providers": { "deepseek": { "apiKey": "..." } },
  "persona": "vaulttec" | "minimal" | "custom" | 省略,
  "personaText": "自定义文本，仅 persona=custom 时",
  "agentModels": { "orchestrator": "deepseek/deepseek-chat", "oracle": "...", "...": "..." }
}
```
   agentModels 的键：orchestrator、oracle、fixer、designer、explorer、librarian、observer、council-alpha、council-beta、council-gamma（council 席位同时写入 default 与 synthesizer 两个 council preset 的对应席位）
2. `GET /api/status` 响应扩展：`models` 字段（静态模型列表）供 UI 渲染下拉
3. 行为：persona 省略 = 不写 persona；agentModels 省略或空 = 不改模型字段

### config-writer.js 扩展
- `configure()` 新增可选参数处理上述逻辑，导出 `PERSONAS` 与 `AVAILABLE_MODELS` 常量
- 写 oh-my-opencode-slim.json 时：读取现有文件（`opencode/config/opencode/oh-my-opencode-slim.json`——实测 OMOslim 的读取位置与 opencode.json 同目录层），只改 agent model 字段，其余内容原样保留（JSON 序列化 2 空格缩进）
- 注意 council 结构：`council.presets.default` 与 `council.presets.synthesizer` 都含 alpha/beta/gamma

## TDD（node:test，向后兼容）

1. 现有 7 个测试必须继续通过（不破坏旧引导流程）
2. 新增测试：
   - persona=vaulttec 写入 persona.md + opencode.json instructions 追加
   - persona 省略不写 persona 文件
   - agentModels 部分覆盖：只改指定 agent 的 model，其他字段与 agent 保持原值
   - council-alpha 写入 default 与 synthesizer 两处
   - agentModels 省略 = oh-my-opencode-slim.json 不变（除了 providers 相关）
3. guide-server 测试：/api/configure 带新字段的端到端（假 key）、/api/status 含 models

## 验证

- `node --test templates/setup/*.test.js` 全绿
- 手动：临时 root 跑 guide-server → 模拟新字段 configure → 检查 persona.md、opencode.json instructions、oh-my-opencode-slim.json 的 agent model 字段
- 非交互纪律（无 pause）；服务 kill
- 重跑 build.ps1 使新逻辑进组装产物

## 提交

分 2 个 commit：
1. `feat(qdip): persona + per-agent model assignment in config writer`（config-writer + 测试）
2. `feat(qdip): guide-server configure extension + models list`（guide-server + 测试）

报告写入 `.superpowers\sdd\02-通用版-实施计划\v02-backend-report.md`：实现细节、API 契约最终形态（供 UI 对接）、测试输出、commit hash。
