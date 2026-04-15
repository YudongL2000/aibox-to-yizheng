<#
 [INPUT]: 依赖 Windows ScheduledTasks 模块、当前用户上下文、run-copilot-memory-sync.ps1 与 node 可执行文件。
 [OUTPUT]: 对外提供 Copilot Memory 同步器的计划任务安装入口，注册登录触发并立即启动任务。
 [POS]: scripts/ 的 Windows 运维脚本，把本地同步器提升为登录自启动能力；与 uninstall-copilot-memory-sync-task.ps1 成对出现。
 [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
#>

[CmdletBinding()]
param(
    [string]$TaskName = 'CopilotMemoryMcpSync',
    [string]$MemoryMcpUrl
)

$ErrorActionPreference = 'Stop'

$launcherPath = Join-Path $PSScriptRoot 'run-copilot-memory-sync.ps1'
$syncScriptPath = Join-Path $PSScriptRoot 'sync-copilot-chat-to-memory.js'
$mcpConfigPath = Join-Path (Split-Path -Parent $PSScriptRoot) '.vscode\mcp.json'
if (-not (Test-Path -LiteralPath $launcherPath)) {
    throw "Missing launcher script: $launcherPath"
}
if (-not (Test-Path -LiteralPath $syncScriptPath)) {
    throw "Missing sync script: $syncScriptPath"
}

if (-not $MemoryMcpUrl -and $env:MEMORY_MCP_URL) {
    $MemoryMcpUrl = $env:MEMORY_MCP_URL
}

if (-not $MemoryMcpUrl -and (Test-Path -LiteralPath $mcpConfigPath)) {
    try {
        $mcpConfig = Get-Content -Raw -LiteralPath $mcpConfigPath | ConvertFrom-Json
        $MemoryMcpUrl = $mcpConfig.servers.'mcp-memory'.url
    }
    catch {
    }
}

if (-not $MemoryMcpUrl) {
    throw 'MEMORY_MCP_URL is required. Define it in Windows or pass -MemoryMcpUrl explicitly before installing the task.'
}

$memoryUri = [System.Uri]$MemoryMcpUrl
$isLoopbackEndpoint = $memoryUri.IsLoopback -or $memoryUri.Host -eq 'localhost'
if ($memoryUri.Scheme -eq 'http' -and -not $isLoopbackEndpoint) {
    Write-Warning 'Memory MCP endpoint uses plain HTTP on a non-loopback address. Chat content and bearer auth will travel without TLS.'
}

$redactedMemoryMcpUrl = '{0}://{1}{2}' -f $memoryUri.Scheme, $memoryUri.Authority, $memoryUri.AbsolutePath

$nodeCommand = Get-Command node -CommandType Application -ErrorAction Stop
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = if ($env:COPILOT_SYNC_LOG_DIR) {
    $env:COPILOT_SYNC_LOG_DIR
} elseif ($env:APPDATA) {
    Join-Path $env:APPDATA 'Code\User\globalStorage\github.copilot-chat'
} else {
    Join-Path $repoRoot '.copilot-sync-logs'
}
$logFile = Join-Path $logDir 'memory-mcp-sync.log'
$taskDescription = 'Sync GitHub Copilot chat turns into Memory MCP after user logon.'
$taskArguments = @(
    ('"{0}"' -f $syncScriptPath),
    '--memory-mcp-url', ('"{0}"' -f $MemoryMcpUrl),
    '--log-path', ('"{0}"' -f $logFile)
) -join ' '

$action = New-ScheduledTaskAction -Execute $nodeCommand.Source -Argument $taskArguments -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description $taskDescription `
    -Force | Out-Null

Start-ScheduledTask -TaskName $TaskName

Write-Host "Installed scheduled task '$TaskName' for $currentUser using node at $($nodeCommand.Source)."
Write-Host "Memory MCP endpoint: $redactedMemoryMcpUrl"
if (-not $env:MCP_API_KEY) {
    Write-Warning 'MCP_API_KEY is not present in this PowerShell session. The task expects it to exist in the Windows user environment at runtime.'
}