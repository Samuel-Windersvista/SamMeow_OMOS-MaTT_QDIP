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
}

# 版本闸门：只校验声明了 verifyVersion 的组件（源存在性已在上方确认；源缺失时不探测，避免噪声）
$mismatches = @()
$checked = 0
foreach ($c in $json.components) {
  if (-not $c.verifyVersion) { continue }
  $src = $c.source.Replace('/', '\')
  if (-not (Test-Path -LiteralPath $src)) { continue }
  $probeExe = Join-Path $src $c.verifyVersion.exe
  if (-not (Test-Path -LiteralPath $probeExe)) {
    $mismatches += "$($c.name): 探测程序缺失 $($c.verifyVersion.exe)"
    continue
  }
  $probeArgs = @($c.verifyVersion.args)
  $probeOut = (& $probeExe @probeArgs 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) {
    $mismatches += "$($c.name): 探测失败（exit $LASTEXITCODE）"
    continue
  }
  if ($c.verifyVersion.strip) {
    $probeOut = $probeOut -replace ('^' + [regex]::Escape($c.verifyVersion.strip)), ''
  }
  $checked++
  if ($probeOut -ne $c.version) {
    $mismatches += "$($c.name): 期望 $($c.version)，实际 $probeOut"
  }
}

if ($mismatches.Count -gt 0) {
  Write-Host "[FAIL] version mismatch:" -ForegroundColor Red
  $mismatches | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  Write-Host "[HINT] 请把对应版本的制品放入 tools/cache/ 并按 components.json 的 source 命名；" -ForegroundColor Yellow
  Write-Host "       若制品本身已更新，则改为更新 components.json 里的 version 字段。" -ForegroundColor Yellow
  exit 1
}

Write-Host "[OK] all $($json.components.Count) component sources exist"
Write-Host "[OK] version check passed: $checked component(s)"
exit 0
