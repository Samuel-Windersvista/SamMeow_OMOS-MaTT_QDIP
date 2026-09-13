# Task 2 Brief: 配置模板 — opencode.json 与 oh-my-opencode-slim.json

> 来源：docs/02-通用版-实施计划.md Task 2（你的需求）

## Files:
- Create: `templates/opencode.json`
- Create: `templates/oh-my-opencode-slim.json`

## Step 1: 编写 templates/opencode.json

控制器已裁定：**不含 instructions 字段**（个人偏好档案不带入玩家版）。

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

## Step 2: 编写 templates/oh-my-opencode-slim.json

源文件：`C:\Users\Winde\.config\opencode\oh-my-opencode-slim.json`（读它）。

规则：
1. 保留顶层字段：`$schema`、`preset`、`showStartupToast`、`council`、`presets`（原样复制）
2. `presets` 下**只保留 `superpowers-bridge` 一个预设**（删除 openai 与 opencode-go 两个预设）
3. `superpowers-bridge` 内每个 agent 的 `mcps` 数组：**剔除 `blender-mcp` 与 `spt-mcp`**（本机特有，通用版不带）；保留 websearch、context7、grep_app 等其他值不变；若剔除后数组为空则保留空数组
4. `mcps` 数组以 `"*"` 或 `"!xxx"` 开头的条目原样保留
5. 其余所有字段（variant、skills、model 等）原样复制，一字不改

预期输出结构（agent 模型路由必须与源一致，例如 orchestrator=deepseek/deepseek-v4-pro、oracle=kimi-for-coding/k3、fixer=deepseek/deepseek-v4-flash 等）：

```json
{
  "$schema": "https://unpkg.com/oh-my-opencode-slim@latest/oh-my-opencode-slim.schema.json",
  "preset": "superpowers-bridge",
  "showStartupToast": false,
  "council": { ...原样... },
  "presets": {
    "superpowers-bridge": {
      "orchestrator": { ...mcps 已剔除 blender-mcp/spt-mcp... },
      ...其余 agent 同...
    }
  }
}
```

## Step 3: 校验

```powershell
Get-Content "templates\opencode.json" -Raw | ConvertFrom-Json | Out-Null
Get-Content "templates\oh-my-opencode-slim.json" -Raw | ConvertFrom-Json | Out-Null
Write-Host "[OK] templates are valid JSON"
```
再验证：导出的 superpowers-bridge 里每个 agent 的 model 字段与源文件完全一致（用 PowerShell 对比两个 JSON 的对应节点）。

## Step 4: 提交

```bash
git add templates/opencode.json templates/oh-my-opencode-slim.json
git commit -m "feat(qdip): config templates with relative plugin paths"
```

## 全局约束
- 写入文件 UTF-8 无 BOM（PowerShell 5.1 写文件用 `[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))`）
- JSON 缩进 2 空格
- 不要修改除上述两个模板以外的任何文件
- 只本地 commit，不 push
