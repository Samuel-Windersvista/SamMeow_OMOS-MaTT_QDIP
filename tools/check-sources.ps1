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
