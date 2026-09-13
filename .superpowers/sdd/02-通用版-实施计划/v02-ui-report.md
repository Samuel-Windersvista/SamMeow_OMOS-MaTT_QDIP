# v0.2 UI 报告：first-run.html 扩展（人格设置 + 模型分配面板）

> 执行人：designer | 日期：2026-09-01 | commit：6557b68 | 基线：e4abdb8（fix-2 后端产物）

## 1. 契约对接确认（以 fix-2 实际代码为准）

| 契约项 | 页面实现 | 一致性 |
|--------|----------|--------|
| GET /api/status → `models: {deepseek:[], moonshot:[], openai:[]}` | init() 存 `lastModels`，渲染全部下拉选项 | 一致（对象结构，非 brief 描述的数组——已按代码修正） |
| providers 键 `kimi` vs models 键 `moonshot` | `PROVIDER_TO_MODELS_KEY` 映射表 | 一致 |
| POST /api/configure body | `{providers, persona?, personaText?, agentModels?}` | 一致 |
| persona 省略/default = 不写 | 选中"专业默认"时 body 不含 persona 键 | 一致 |
| personaText 仅 custom 时 | 仅 persona=custom 时附带 `customText.value.trim()` | 一致 |
| agentModels 只含玩家动过的键 | 遍历 select，`sel.value` 非空才收录；全空则不带 agentModels 键 | 一致 |
| 键名精确 | orchestrator/oracle/fixer/designer/explorer/librarian/observer/council-alpha/council-beta/council-gamma | 一致（逐字） |
| 值 = `provider/model` | option value = `prov + '/' + m`（prov 为 models 键，如 moonshot） | 一致 |

## 2. 视觉决策

延续 v0.1 暗色终端语言（磷光绿 `--accent` on 近黑底、Vault-Tec 风味标题、无外部资源）：

1. **Section 层级**：新增 `:: ` 前缀的 h2 小节标题（区别于 h1 的 `> ` 前缀），加"可选"描边小徽章——向玩家传达"这两块可以跳过"。
2. **Section B 人格**：2×2 卡片网格（窄屏塌成单列）。复用服务商卡片的 accent 左边条选中态（`.pcard.sel` = `.card.enabled` 同款边框+光晕），新增纯 CSS 单选圆点（选中时 radial-gradient 内发光圆点，无图片）。键盘可达：tabindex + Space/Enter 触发 + aria-checked。选"自定义"时展开深色 textarea（focus 光晕与 key-input 一致）。
3. **Section C 模型分配**：三组分标题用 12px accent 色 + 虚线分隔（终端清单感）；每行 = 等宽角色名（130px 固定列）+ 灰色职责说明 + 230px 深色下拉。下拉 option 文案 `DeepSeek / deepseek-chat` 格式（provider 友好名 + 模型名）。
4. **快捷按钮**：复用现有 button 样式缩小一号（13px/6px 12px）。"全部用同一模型"默认禁用，首个服务商测试通过后自动解锁并改名"全部用 deepseek-chat"——把抽象功能绑定到玩家刚完成的动作上。
5. **窄屏**：560px 断点下人格卡单列、模型行纵向堆叠、下拉全宽。
6. **防呆**：保持 v0.1 原则——未改过的下拉不提交（跟随默认 = 服务端不动该字段），部分覆盖语义由后端保证、前端只传显式选择。

## 3. 无头验证输出（node fetch，未使用浏览器自动化）

部署镜像临时根（setup/ + opencode/config/opencode/ 双模板 + data/），一次 boot 完成全部验证后 kill + 删除：

```
PASS  P1 页面 200
PASS  P2 关键词 x17（AI 人格/模型分配/Vault-Tec 复古/极简/自定义/跟随默认/全部跟随默认/
      核心角色/辅助角色/议会/council-alpha/council-beta/council-gamma/
      personaText/agentModels/data-persona/custom-text）
PASS  P3 无外部 URL（离线）
PASS  P4 UTF-8 无 BOM
PASS  P5 HTML 结构完整
PASS  S1 status.models 含 deepseek/moonshot/openai
PASS  S2 deepseek 首个模型为 deepseek-chat（快捷按钮将用它）
PASS  C1 旧式 configure（无新字段）-> ok:true
PASS  C2 未传 persona -> 无 persona.md
PASS  C3 未传 agentModels -> slim 与模板逐字节一致
PASS  C4 v0.2 configure（persona=vaulttec + 2 键 agentModels）-> ok:true
PASS  C5 persona.md 落盘
PASS  C6 persona.md 为 Vault-Tec 人格文本
PASS  C7 persona.md UTF-8 无 BOM
PASS  C8 opencode.json instructions 含 persona 条目
PASS  C9 orchestrator.model 被覆盖为 deepseek/deepseek-reasoner
PASS  C10 fixer.model 保持模板原值（部分覆盖语义）
PASS  C11 council-alpha 双预设（default + synthesizer）同步写入 openai/gpt-4o
PASS  C12 council-beta 保持模板原值
PASS  C13 custom persona -> ok:true
PASS  C14 persona.md = personaText 原文
---
ALL-CLEAR: 37/37 checks passed
```

- 二次运行 exit=0；临时根已删除；项目根无 data/ 残留；guide-server 已 kill。
- 首次运行在结束时输出一条 libuv Windows 断言噪音（`async.c line 76`，子进程 kill 时的已知良性竞态），不影响任何断言结果，重跑无该输出且 exit=0。

## 4. 提交

- commit：`6557b68` — `feat(qdip): guide page persona + per-agent model assignment UI`（1 file changed, 301 insertions, 1 deletion）
- 仅本地提交，未 push；工作树干净

## 5. 偏离说明

| # | 项目 | 说明 |
|---|------|------|
| 1 | models 结构 | brief 描述为数组 `[{provider,name,label}]`，fix-2 实际产物为对象 `{provider: [model]}` 且无 label——按"以实际产物为准"对接，下拉 label 由前端用 PROVIDER_LABELS 友好名拼接 |
| 2 | "全部用 X" 按钮文案 | brief 要求"全部用 <第一个测通的服务商模型>"——实现为动态改名（未测通时显示占位"全部用同一模型"且禁用） |
