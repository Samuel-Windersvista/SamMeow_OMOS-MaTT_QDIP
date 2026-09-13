# wt-profile.ps1 - 生成便携 Windows Terminal 的 settings.json（QDIP 默认 profile）
# 由 启动.bat 在每次经 WT 启动 opencode 前调用。幂等：settings.json 已存在且
# qdip-root.txt 内容与 -Root 一致时直接退出，保留玩家对 WT 的全部自定义设置。
param(
  [Parameter(Mandatory = $true)][string]$Root,   # 包根（无尾反斜杠，来自 %ROOTS%）
  [Parameter(Mandatory = $true)][string]$WtDir   # terminal-<version> 目录（WindowsTerminal.exe 所在）
)
$ErrorActionPreference = 'Stop'

$guid        = '{0c0de000-0000-0000-0000-000000000001}'
$profileName = 'QDIP 环境'
$commandline = 'cmd.exe /k "' + (Join-Path $Root '进入环境.bat') + '"'

$settingsDir  = Join-Path $WtDir 'settings'
$settingsFile = Join-Path $settingsDir 'settings.json'
$markerFile   = Join-Path $settingsDir 'qdip-root.txt'

# 跳过条件：settings.json 存在 且 标记文件记录同一个 Root 且 settings.json 是合法 JSON
# （JSON 合法性校验：玩家手改坏 settings.json 时不能永久跳过，否则 WT 每次启动弹"设置无效"横幅）
$markerOk = $false
if ((Test-Path -LiteralPath $settingsFile) -and (Test-Path -LiteralPath $markerFile)) {
  $storedRoot = [System.IO.File]::ReadAllText($markerFile).Trim()
  $jsonValid = $false
  try {
    $null = [System.IO.File]::ReadAllText($settingsFile) | ConvertFrom-Json
    $jsonValid = $true
  } catch {
    $jsonValid = $false
  }
  $markerOk = ($storedRoot -ceq $Root) -and $jsonValid
}
if ($markerOk) { exit 0 }

# 已有 settings.json 先备份，玩家自定义不丢失
New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
if (Test-Path -LiteralPath $settingsFile) {
  Copy-Item -LiteralPath $settingsFile -Destination (Join-Path $settingsDir 'settings.json.bak') -Force
}

# 用 PowerShell 对象 + ConvertTo-Json 生成，避免手写 JSON 转义
$profile = [ordered]@{
  guid              = $guid
  name              = $profileName
  commandline       = $commandline
  startingDirectory = $Root
  hidden            = $false
}
$settings = [ordered]@{
  defaultProfile = $guid
  profiles       = [ordered]@{
    defaults = [ordered]@{}
    list     = @($profile)
  }
  '$help'        = 'https://aka.ms/terminal-documentation'
}
$json = $settings | ConvertTo-Json -Depth 6

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($settingsFile, $json, $utf8NoBom)
[System.IO.File]::WriteAllText($markerFile, $Root, $utf8NoBom)
