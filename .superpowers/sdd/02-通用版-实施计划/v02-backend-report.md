# v0.2 增量后端实施报告：人格设置 + 角色/议会模型分配

- 状态：DONE（TDD RED→GREEN，2 个独立 commit，工作树干净）
- 执行时间：2026-09-01
- Commits：
  - `2e760f9140c8cf1691725b6ab7499d9a353763ed` — feat(qdip): persona + per-agent model assignment in config writer
  - `e4abdb86c8ddc2b4981bdd07400b81b5a4705613` — feat(qdip): guide-server configure extension + models list
- 纪律：无 pause/交互命令；guide-server 验证后 kill；未派生子代理；向后兼容（旧 7 个测试全部通过）

## 1. 实测确认（路径基准）

**instructions 相对路径基准 = CWD（包根）**，与 plugin（配置文件目录）和 skills.paths（CWD）不同。证据（USERPROFILE 隔离 + marker 指令，big-pickle 模型遵循绝对路径指令已验证）：

```
[CFGDIR] instructions/persona.md 且文件在 cfgdir\instructions\ → marker 未出现（未从配置目录解析）
[CWD]    同相对路径且文件在 cwd\instructions\            → marker 出现（从 CWD 解析）
[PROD]   指令条目 "opencode/config/opencode/instructions/persona.md"（从包根 CWD 解析）→ PROD-MARKER 出现
```

**结论**：persona.md 写入 `<root>\opencode\config\opencode\instructions\persona.md`，opencode.json 的 instructions 条目为 CWD 相对路径 `opencode/config/opencode/instructions/persona.md`（启动器 `cd /d "%~dp0"` 保证 CWD=包根）。OMOslim 配置文件写入位置沿用 fix-wave 结论（`opencode/config/opencode/` 同目录层，源码公式 + 实测双重确认）。

## 2. 实现细节

### config-writer.js（commit 1）

- 导出新增 `PERSONAS` 与 `AVAILABLE_MODELS`
- `PERSONAS`：
  - `vaulttec`（中文，~200 字）：Vault-Tec 1950 年代原子风企业终端口吻（Overseer 称呼、containment breach/radiation leak/All-Clear 术语、Nuka-Cola/RobCo 引用、工程准确性优先）
  - `minimal`（中文，~60 字）：极简直接、无寒暄
- `AVAILABLE_MODELS`（静态列表，v1 取舍不动态拉取）：
  - deepseek: deepseek-chat / deepseek-reasoner
  - moonshot: moonshot-v1-8k / moonshot-v1-32k / moonshot-v1-128k
  - openai: gpt-4o-mini / gpt-4o
- `configure({ root, providers, persona, personaText, agentModels })`：
  - persona：`default`/省略/空 = 不写文件不改 instructions；`vaulttec`/`minimal` 用内置文本；`custom` 用 `personaText`；有文本则写 persona.md（UTF-8 无 BOM）+ opencode.json `instructions` 数组追加 CWD 相对路径（去重）
  - agentModels：键映射表 `AGENT_MODEL_PATHS`：
    - orchestrator/oracle/fixer/designer/explorer/librarian/observer → `presets.superpowers-bridge.<agent>.model`
    - council-alpha/beta/gamma → `council.presets.default.<seat>.model` **并同时** `council.presets.synthesizer.<seat>.model`
    - 未知键跳过；只覆盖显式选择的 agent，其余字段/agent 保持模板原值；写回 2 空格缩进
- 向后兼容：providers 逻辑不变；未传新字段时行为与旧版完全一致（oh-my-opencode-slim.json 不被触碰）

### guide-server.js（commit 2）

- `GET /api/status` 响应新增 `models: AVAILABLE_MODELS`
- `POST /api/configure` 解构 `{ providers, persona, personaText, agentModels }` 透传 configure（新字段可选，向后兼容）

## 3. API 契约最终形态（供 UI 对接）

### GET /api/status

```json
{
  "ok": true,
  "providers": { "deepseek": { "label": "DeepSeek", ... }, "kimi": {...}, "openai": {...} },
  "models": {
    "deepseek": ["deepseek-chat", "deepseek-reasoner"],
    "moonshot": ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    "openai":   ["gpt-4o-mini", "gpt-4o"]
  },
  "configured": false
}
```

### POST /api/configure

```json
{
  "providers": { "deepseek": { "apiKey": "sk-..." } },
  "persona": "vaulttec" | "minimal" | "custom" | 省略,
  "personaText": "仅 persona=custom 时必填",
  "agentModels": {
    "orchestrator": "deepseek/deepseek-chat",
    "oracle": "...", "fixer": "...", "designer": "...", "explorer": "...",
    "librarian": "...", "observer": "...",
    "council-alpha": "...", "council-beta": "...", "council-gamma": "..."
  }
}
```

- persona 省略 = 不写 persona；agentModels 省略/空 = 不改模型字段
- 响应 `{ "ok": true }`
- council 席位同时写入 `council.presets.default` 与 `council.presets.synthesizer`

## 4. TDD 过程

- config-writer 新增 6 测试（RED：4 失败 / GREEN：10/10 全过）：
  - vaulttec → persona.md + instructions 追加；custom → personaText 原样写入；persona 省略 → 无 persona 文件且无 instructions；agentModels 部分覆盖（未选 agent 与 variant 等字段保持原值）；council-alpha 双预设写入；agentModels 省略 → oh-my-opencode-slim.json 与原模板深度相等
- guide-server 新增 2 测试（RED：2 失败 / GREEN：5/5 全过）：
  - /api/status 含 models；/api/configure 带 persona+agentModels 端到端写入验证
- **最终全量：15 pass / 0 fail**（含旧 7 个，向后兼容确认）

## 5. 手动端到端验证输出（临时 root + 假 key）

```
[status] models: deepseek,moonshot,openai | deepseek: deepseek-chat,deepseek-reasoner
[configure] ok=True
[persona.md] exists=True first20=直接回答，不要寒暄，不要客…
[opencode.json] instructions=opencode/config/opencode/instructions/persona.md
[slim] orchestrator=deepseek/deepseek-reasoner librarian=moonshot/moonshot-v1-128k fixer=deepseek/deepseek-v4-flash
[slim] council-default.alpha=openai/gpt-4o council-synth.alpha=openai/gpt-4o default.beta=deepseek/deepseek-v4-flash
[guide-server] killed
```

（orchestrator/librarian/council-alpha 被覆盖；fixer 与 default.beta 保持模板原值 = 部分覆盖语义正确）

## 6. 验证与收尾

- build.ps1 重跑成功，新逻辑进入组装产物与 zip（`[DONE] 组装完成`，exit 0）
- 工作树干净；仅本地 commit 未 push

## 7. 偏离说明

| # | 项目 | 说明 |
|---|------|------|
| 1 | instructions 基准 | brief 要求实测确认——实测为 **CWD**（非配置目录，与 plugin 不同），instructions 条目采用 CWD 相对路径 `opencode/config/opencode/instructions/persona.md` |
| 2 | 模型合法值 | 按 brief 静态列表（deepseek-chat/reasoner、moonshot-v1-8k/32k/128k、gpt-4o-mini/4o）；agentModels 值直接透写 model 字段（`provider/model` 形式），未做白名单校验（UI 下拉即白名单，服务端信任透传——如需要可在后续加） |
| 3 | 测试伪象 | 无（本任务测试均为本地文件断言；guide-server 测试无外网调用——configure 只写文件，/api/test 假 key 结构断言仅旧测试） |
