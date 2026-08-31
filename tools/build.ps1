param(
  [string]$ComponentsFile = "$PSScriptRoot\components.json",
  [switch]$SkipZip
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
# 前序 carry：check-sources.ps1 按 CWD 解析相对 source 路径，必须锚定到项目根
Set-Location $root
$json = Get-Content $ComponentsFile -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $json.version
$outDir = Join-Path $root "build\qdip-generic-$version"
$templates = Join-Path $root "templates"

Write-Host "[1/5] 清理组装目录"
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

Write-Host "[2/5] 复制组件"
foreach ($c in $json.components) {
  $src = $c.source.Replace('/', '\')
  $dst = Join-Path $outDir ($c.target.Replace('/', '\'))
  New-Item -ItemType Directory -Path (Split-Path $dst -Parent) -Force | Out-Null
  Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
  Write-Host "  + $($c.name) -> $($c.target)"
}

Write-Host "[3/5] 部署模板"
Copy-Item "$templates\启动.bat" "$outDir\启动.bat" -Force
if (Test-Path "$templates\更新组件.bat") {
  Copy-Item "$templates\更新组件.bat" "$outDir\更新组件.bat" -Force
  Write-Host "  + 更新组件.bat"
} else {
  Write-Host "  (skip) 更新组件.bat 尚未创建（Task 7 未完成，部署时跳过）"
}
New-Item -ItemType Directory -Path "$outDir\setup" -Force | Out-Null
Copy-Item "$templates\setup\*" "$outDir\setup" -Recurse -Force
New-Item -ItemType Directory -Path "$outDir\opencode\config" -Force | Out-Null
Copy-Item "$templates\opencode.json" "$outDir\opencode\config\opencode.json" -Force
Copy-Item "$templates\oh-my-opencode-slim.json" "$outDir\opencode\config\oh-my-opencode-slim.json" -Force
New-Item -ItemType Directory -Path "$outDir\opencode\auth" -Force | Out-Null
Copy-Item "$templates\验证清单.md" "$outDir\验证清单.md" -Force
New-Item -ItemType Directory -Path "$outDir\data" -Force | Out-Null
New-Item -ItemType File -Path "$outDir\data\.gitkeep" -Force | Out-Null

Write-Host "[4/5] 校验"
& "$PSScriptRoot\check-sources.ps1" -ComponentsFile $ComponentsFile
if ($LASTEXITCODE -ne 0) { throw "组件源缺失：请按 Task 6 Step 2 准备 tools/cache 离线缓存后重试" }
$nodeOk = Test-Path "$outDir\runtime\node\node.exe"
$ocOk = (Test-Path "$outDir\opencode\bin\opencode.exe") -or (Test-Path "$outDir\opencode\bin\opencode.cmd")
if (-not $nodeOk) { throw "缺少便携 Node：请将 node-v24.14.1-win-x64 放入 tools/cache/ 并按 components.json 命名" }
if (-not $ocOk) { throw "缺少 opencode CLI：请先 npm install opencode-ai@1.18.25 并部署到 tools/cache/opencode-1.18.25" }
Write-Host "  [OK] node: $nodeOk  opencode: $ocOk"

Write-Host "[5/5] 打包 zip"
if (-not $SkipZip) {
  $zip = Join-Path $root "build\qdip-generic-$version.zip"
  if (Test-Path $zip) { Remove-Item $zip -Force }
  Compress-Archive -Path "$outDir\*" -DestinationPath $zip -CompressionLevel Optimal
  Write-Host "  -> $zip"
}
Write-Host "[DONE] 组装完成: $outDir"
