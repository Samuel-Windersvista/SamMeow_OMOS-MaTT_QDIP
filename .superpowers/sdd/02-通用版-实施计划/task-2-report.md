# Task 2 实施报告：配置模板 — opencode.json 与 oh-my-opencode-slim.json

- 状态：DONE
- 执行时间：2026-08-31
- Commit：`c054ecf377af28271cd03472993a79bc2c77e804`（short `c054ecf`，feat(qdip): config templates with relative plugin paths）

## 1. 产物

| 文件 | 说明 |
|------|------|
| `templates/opencode.json` | opencode 主配置（相对 plugin 路径，无 instructions 字段） |
| `templates/oh-my-opencode-slim.json` | OMOslim 预设（仅 superpowers-bridge，通用版） |

## 2. templates/opencode.json 最终内容结构

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "./plugins/oh-my-opencode-slim",
    "./plugins/superpowers"
  ],
  "providers": {},
  "lsp": true
}
```

- 按控制器裁定：**不含 instructions 字段**（个人偏好档案不带入玩家版）。
- plugin 使用相对路径 `./plugins/...`（部署后与插件目录平级）。

## 3. templates/oh-my-opencode-slim.json 最终内容结构

顶层字段（5 个，顺序与 brief 预期结构一致）：

1. `$schema`: `https://unpkg.com/oh-my-opencode-slim@latest/oh-my-opencode-slim.schema.json`（原样）
2. `preset`: `"superpowers-bridge"`（原样）
3. `showStartupToast`: `false`（原样）
4. `council`: 完整保留源文件的 `presets.default` / `presets.synthesizer` / `default_preset` / `councillor_execution_mode` / `councillor_retries`
5. `presets`: 仅含 `superpowers-bridge` 一个预设

`presets.superpowers-bridge` 内 10 个 agent，每个含 `model` / `variant` / `skills` / `mcps` 四字段，全部原样复制：

| agent | model | variant | skills | mcps |
|-------|-------|---------|--------|------|
| orchestrator | deepseek/deepseek-v4-pro | max | ["*"] | ["*", "!context7"] |
| orchestrator-beta | kimi-for-coding/k3 | medium | ["*"] | ["*", "!context7"] |
| orchestrator-gamma | deepseek/deepseek-v4-flash | max | ["*"] | ["*", "!context7"] |
| oracle | kimi-for-coding/k3 | high | ["simplify"] | [] |
| fixer | deepseek/deepseek-v4-flash | high | [] | [] |
| designer | kimi-for-coding/k3 | medium | ["agent-browser"] | [] |
| explorer | deepseek/deepseek-v4-flash | medium | [] | [] |
| librarian | deepseek/deepseek-v4-flash | medium | [] | ["websearch", "context7", "grep_app"] |
| observer | kimi-for-coding/k3 | medium | [] | [] |
| council | kimi-for-coding/k3 | max | [] | [] |

## 4. mcps 剔除前后对比

规则 3 要求剔除每个 agent mcps 中的 `blender-mcp` 与 `spt-mcp`。经比对源文件 `C:\Users\Winde\.config\opencode\oh-my-opencode-slim.json`：

- **源文件中 superpowers-bridge 内没有任何 agent 的 mcps 包含 `blender-mcp` 或 `spt-mcp`**（全部为 `["*", "!context7"]`、`[]` 或 `["websearch", "context7", "grep_app"]`）。
- 因此剔除操作结果为 **无变化**（no-op），模板与源完全一致。
- 规则 4：以 `"*"` / `"!xxx"` 开头的条目（`"*"`、`"!context7"`）已原样保留。
- 规则 2：`presets` 下已删除 `openai` 与 `opencode-go` 两个预设，仅保留 `superpowers-bridge`。

## 5. JSON 校验输出

```
[OK] templates are valid JSON
opencode.json BOM: False
oh-my-opencode-slim.json BOM: False
--- top-level fields in template: $schema, preset, showStartupToast, council, presets
--- presets in template: superpowers-bridge
--- model mismatches: 0
```

- 两个模板均通过 `ConvertFrom-Json` 解析。
- UTF-8 无 BOM（已用字节级检查确认）。
- 模板导出 superpowers-bridge 中全部 10 个 agent 的 `model` 字段与源文件逐一比对，**0 处不一致**（含 orchestrator=deepseek/deepseek-v4-pro、oracle=kimi-for-coding/k3、fixer=deepseek/deepseek-v4-flash 等路由）。

## 6. 偏离说明

1. **顶层 `disabled_agents` 字段未保留**：brief Step 2 规则 1 仅列出 `$schema`、`preset`、`showStartupToast`、`council`、`presets` 五个保留字段，`disabled_agents` 不在列表中，且 brief 预期输出结构亦未包含，故按 brief 字面执行剔除（值为 `[]`，剔除无实际影响）。
2. **mcps 剔除为 no-op**：源文件 superpowers-bridge 中本就不存在 `blender-mcp`/`spt-mcp`，属预期内偏差，见第 4 节。
3. **仅本地 commit，未 push**；commit 仅含 brief Step 4 指定的两个模板文件（报告文件未纳入该 commit）。
