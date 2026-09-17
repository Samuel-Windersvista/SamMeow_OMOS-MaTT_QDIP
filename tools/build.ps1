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

Write-Host "[1/5] 清理组装目录"
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

Write-Host "[2/5] 复制组件"
foreach ($c in $json.components) {
  $src = $c.source.Replace('/', '\')
  $dst = Join-Path $outDir ($c.target.Replace('/', '\'))
  # 目录合并语义：目标已存在时把 source 内容合并进去
  # （Copy-Item 目录到已存在目录会嵌套成子目录，曾导致 quota-runtime 落成 node_modules\node_modules）
  New-Item -ItemType Directory -Path $dst -Force | Out-Null
  Copy-Item -Path "$src\*" -Destination $dst -Recurse -Force
  Write-Host "  + $($c.name) -> $($c.target)"
}

# windows-terminal 便携标记：激活 WT portable 模式，设置/状态存包内 settings\ 而不污染玩家系统
$wtRoot = Join-Path $outDir "runtime\terminal"
$wtDirs = Get-ChildItem -Path $wtRoot -Directory -Filter "terminal-*" -ErrorAction SilentlyContinue
if ($wtDirs) {
  foreach ($d in $wtDirs) {
    New-Item -ItemType File -Path (Join-Path $d.FullName ".portable") -Force | Out-Null
    Write-Host "  + windows-terminal .portable: $($d.Name)"
  }
} else {
  Write-Host "  (skip) windows-terminal .portable: runtime\terminal\terminal-* 未找到"
}

Write-Host "[3/5] 部署模板"
# 布局声明驱动：tools/layout.json 的 deploy 数组是产物布局的唯一真相。
# source 相对仓库根（$root），target 相对产物根（$outDir）。
$layout = Get-Content "$PSScriptRoot\layout.json" -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($d in $layout.deploy) {
  $src = if ($d.source) { Join-Path $root ($d.source.Replace('/', '\')) } else { $null }
  $dst = Join-Path $outDir ($d.target.Replace('/', '\'))
  if (-not $d.optional -and $d.source -and -not (Test-Path -LiteralPath $src)) {
    throw "部署条目 $($d.name) 的源缺失：$src（layout.json 未标 optional）"
  }
  if ($d.optional -eq $true -and $d.source -and -not (Test-Path -LiteralPath $src)) {
    Write-Host "  (skip) $($d.name) 源缺失，跳过"
    continue
  }
  switch ($d.kind) {
    'file' {
      # Copy-Item 不会自动建父目录
      New-Item -ItemType Directory -Path (Split-Path $dst -Parent) -Force | Out-Null
      Copy-Item -LiteralPath $src -Destination $dst -Force
    }
    'dir' {
      # 内容合并语义：target 已存在时把 source 内容合并进去（直接复制目录会嵌套成子目录）
      New-Item -ItemType Directory -Path $dst -Force | Out-Null
      Copy-Item -Path "$src\*" -Destination $dst -Recurse -Force
      # exclude（仅 kind=dir 有效）：每个模式匹配目标内文件/目录的 basename（大小写不敏感），
      # 因此 "*.test.js" 会命中任意深度的该项；命中的项在复制后从产物删除。
      if ($d.exclude) {
        foreach ($pattern in $d.exclude) {
          $hits = @(Get-ChildItem -Path $dst -Recurse -Force -Filter $pattern)
          foreach ($hit in $hits) {
            Remove-Item -LiteralPath $hit.FullName -Recurse -Force
            $rel = $hit.FullName.Substring($dst.Length).TrimStart('\')
            Write-Host "  - $($d.name): 排除 $rel"
          }
        }
      }
    }
    'emptydir' {
      New-Item -ItemType Directory -Path $dst -Force | Out-Null
    }
    default { throw "layout.json 未知 kind: $($d.kind)（条目 $($d.name)）" }
  }
  Write-Host "  + $($d.name) -> $($d.target)"
}
Write-Host "[4/5] 校验"
& "$PSScriptRoot\check-sources.ps1" -ComponentsFile $ComponentsFile
if ($LASTEXITCODE -ne 0) { throw "组件源缺失：请按 Task 6 Step 2 准备 tools/cache 离线缓存后重试" }
# 产物校验：布局声明（layout.json）+ 组件清单（components.json）对产物的完整核对。
# 用产物内的便携 Node 执行，构建机无需预装 node，同时顺带验证便携 Node 可运行。
# 注意：CWD 必须是仓库根（脚本开头已 Set-Location $root），校验器解析 components.json 的
# 相对 source 时依赖这一点。
& "$outDir\runtime\node\node.exe" "$PSScriptRoot\verify-package.js" --out $outDir --components $ComponentsFile
if ($LASTEXITCODE -ne 0) { throw "产物校验失败：见上方违规列表" }

Write-Host "[5/5] 打包 zip"
if (-not $SkipZip) {
  $zip = Join-Path $root "build\qdip-generic-$version.zip"
  if (Test-Path $zip) { Remove-Item $zip -Force }
  Compress-Archive -Path "$outDir\*" -DestinationPath $zip -CompressionLevel Optimal
  Write-Host "  -> $zip"
}
Write-Host "[DONE] 组装完成: $outDir"
