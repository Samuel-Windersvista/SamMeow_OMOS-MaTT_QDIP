# Task 1 Brief: 项目骨架与 components.json

> 来源：docs/02-通用版-实施计划.md Task 1（你的需求，照抄执行，不要改动内容）

## Files:
- Create: `tools/components.json`
- Create: `tools/check-sources.ps1`
- Create: `tools/cache/.gitkeep`
- Create: `templates/.gitkeep`
- Create: `build/.gitkeep`

## Interfaces:
- Produces: `components.json` 结构（Task 6 打包器读取；字段：`name`、`source`、`type`(dir)、`target`、`version`、`required`）；`check-sources.ps1`（Task 6 build.ps1 调用，参数 `-ComponentsFile`）

## Step 1: 创建目录
项目根：`E:\云文件\GitHub\SamMeow_OMOS+SP+MaTT_QDIP(Quick Deployment Integration Package)`
确保 `tools/cache`、`templates/setup`、`build` 目录存在（已存在则跳过）。

## Step 2: 编写 tools/components.json

```json
{
  "packageName": "qdip-generic",
  "version": "0.1.0",
  "components": [
    {
      "name": "node-runtime",
      "type": "dir",
      "source": "tools/cache/node-v24.14.1-win-x64",
      "target": "runtime/node",
      "version": "24.14.1",
      "required": true
    },
    {
      "name": "opencode-cli",
      "type": "dir",
      "source": "tools/cache/opencode-1.18.25",
      "target": "opencode/bin",
      "version": "1.18.25",
      "required": true
    },
    {
      "name": "omoslim",
      "type": "dir",
      "source": "E:/云文件/GitHub/oh-my-opencode-slim/dist",
      "target": "plugins/oh-my-opencode-slim",
      "version": "2.2.17+patch-kit",
      "required": true
    },
    {
      "name": "omoslim-append",
      "type": "dir",
      "source": "C:/Users/Winde/.config/opencode/oh-my-opencode-slim",
      "target": "plugins/oh-my-opencode-slim/custom",
      "version": "latest",
      "required": true
    },
    {
      "name": "superpowers",
      "type": "dir",
      "source": "C:/Users/Winde/.config/opencode/node_modules/superpowers",
      "target": "plugins/superpowers",
      "version": "6.3.0",
      "required": true
    },
    {
      "name": "matt-skills",
      "type": "dir",
      "source": "C:/Users/Winde/.config/opencode/skills",
      "target": "opencode/skills",
      "version": "2026-08-24",
      "required": true
    }
  ]
}
```

## Step 3: 编写 tools/check-sources.ps1

```powershell
param([string]$ComponentsFile = "$PSScriptRoot\components.json")
$json = Get-Content $ComponentsFile -Raw -Encoding UTF8 | ConvertFrom-Json
$missing = @()
foreach ($c in $json.components) {
  $src = $c.source.Replace('/', '\')
  if (-not (Test-Path -LiteralPath $src)) { $missing += "$($c.name): $src" }
}
if ($missing.Count -gt 0) {
  Write-Host "[FAIL] missing sources:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  exit 1
} else {
  Write-Host "[OK] all $($json.components.Count) component sources exist"
  exit 0
}
```

## Step 4: 运行校验
`powershell -ExecutionPolicy Bypass -File tools\check-sources.ps1`
预期：`[OK] all 6 component sources exist`。若报缺失，把缺失项列在报告里（不要自行创建缺失目录或修改 source 路径——那是 Task 6 的职责）。

## Step 5: 提交
```bash
git add tools/components.json tools/check-sources.ps1 tools/cache/.gitkeep templates/.gitkeep build/.gitkeep
git commit -m "chore(qdip): project skeleton + component manifest"
```

## 全局约束（必须遵守）
- 写入文件一律 UTF-8 无 BOM（PowerShell 用 Set-Content -Encoding UTF8 在 PS 5.1 会写 BOM——改用 [System.IO.File]::WriteAllText + UTF8Encoding($false)，或确认无 BOM）
- 路径含中文/空格：所有引用双引号包裹
- 不要创建 components.json 之外的任何新文件
- 不要运行 git push；只本地 commit
- 完成后把 git log 的 commit hash 写进报告
