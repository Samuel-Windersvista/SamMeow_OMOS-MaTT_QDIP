# wt-profile.ps1 - 生成/补齐便携 Windows Terminal 的 settings.json（QDIP 默认 profile）
# 由 启动.bat 在每次经 WT 启动 opencode 前调用。幂等，分两条路径：
#   A) settings.json 合法 且 qdip-root.txt 与 -Root 一致 → 只补齐缺失的剪贴板绑定，
#      玩家对 WT 的自定义设置原样保留（0.4.x 及更早生成的 settings.json 没有 keybindings 段）；
#   B) 首次运行 / 包根变更 / JSON 损坏 → 备份（settings.json.bak）后重建。
# 为什么必须显式写 ctrl+c / ctrl+v：WT 的 defaults.json 只绑 ctrl+shift+c/v、ctrl+insert、
# shift+insert 等；ctrl+c/ctrl+v 来自 WT「新建用户 settings.json」的模板 userDefaults.json。
# 本脚本抢先落盘 settings.json，WT 便不再生成该模板 → 不写这两个键，玩家按 ctrl+c/v 无反应。
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
$utf8NoBom    = New-Object System.Text.UTF8Encoding($false)

# 剪贴板绑定（与 WT 官方 userDefaults.json 模板同款）。copy 动作在无选区时会把按键原样转发给
# 程序（官方文档明示），所以 TUI / cmd 里的 ctrl+c 中断进程行为不受影响。
$clipboardKeybindings = @(
  [ordered]@{ id = 'Terminal.CopyToClipboard';  keys = 'ctrl+c' },
  [ordered]@{ id = 'Terminal.PasteFromClipboard'; keys = 'ctrl+v' }
)

function Test-KeyChordBound {
  param($Keybindings, [string]$Chord)
  foreach ($kb in @($Keybindings)) {
    if (-not $kb) { continue }
    foreach ($k in @($kb.keys)) {
      if ($k -and ($k -ieq $Chord)) { return $true }
    }
  }
  return $false
}

# 读取现状：settings.json 是否合法（JSON 非法时必须重建，否则 WT 每次启动弹"设置无效"横幅）
$existing   = $null
$storedRoot = ''
if (Test-Path -LiteralPath $settingsFile) {
  try { $existing = [System.IO.File]::ReadAllText($settingsFile) | ConvertFrom-Json } catch { $existing = $null }
}
if (Test-Path -LiteralPath $markerFile) {
  $storedRoot = [System.IO.File]::ReadAllText($markerFile).Trim()
}

# A) 同包根的存量实例：只补齐缺失的绑定（玩家已把 ctrl+c / ctrl+v 绑到别处时不覆盖）
if ($existing -and ($storedRoot -ceq $Root)) {
  $mergedOk = $false
  try {
    $missing = @($clipboardKeybindings | Where-Object { -not (Test-KeyChordBound -Keybindings $existing.keybindings -Chord $_.keys) })
    if ($missing.Count -gt 0) {
      Copy-Item -LiteralPath $settingsFile -Destination (Join-Path $settingsDir 'settings.json.bak') -Force
      $merged = @($existing.keybindings | Where-Object { $_ }) + $missing
      $existing | Add-Member -NotePropertyName keybindings -NotePropertyValue $merged -Force
      [System.IO.File]::WriteAllText($settingsFile, ($existing | ConvertTo-Json -Depth 32), $utf8NoBom)
    }
    $mergedOk = $true
  } catch {
    # 结构异常等：不中断启动，落到重建分支（仍会先备份）
  }
  if ($mergedOk) {
    [System.IO.File]::WriteAllText($markerFile, $Root, $utf8NoBom)
    exit 0
  }
}

# B) 首次 / 包根变更 / JSON 损坏：备份后重建
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
  keybindings    = $clipboardKeybindings
  '$help'        = 'https://aka.ms/terminal-documentation'
}
$json = $settings | ConvertTo-Json -Depth 6

[System.IO.File]::WriteAllText($settingsFile, $json, $utf8NoBom)
[System.IO.File]::WriteAllText($markerFile, $Root, $utf8NoBom)
