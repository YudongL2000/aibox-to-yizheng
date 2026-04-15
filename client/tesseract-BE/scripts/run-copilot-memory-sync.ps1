<#
 [INPUT]: 依赖 Windows PowerShell、当前用户的 APPDATA 与 PATH 中的 node，可读取同步器所需环境变量如 MCP_API_KEY、MEMORY_MCP_URL。
 [OUTPUT]: 对外提供 Copilot Memory 同步器的 Windows 启动入口，固定仓库根目录并把运行日志落到 AppData。
 [POS]: scripts/ 的 Windows 启动器，被计划任务和手工排障共用；与 sync-copilot-chat-to-memory.js 形成宿主与被调关系。
 [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
#>

[CmdletBinding()]
param(
    [string]$MemoryMcpUrl,
    [string]$NodePath,
    [switch]$Detached,
    [switch]$Once,
    [switch]$DryRun,
    [switch]$Backfill,
    [switch]$VerboseSync
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$syncScript = Join-Path $PSScriptRoot 'sync-copilot-chat-to-memory.js'
$workspaceStorageRoot = $env:COPILOT_WORKSPACE_STORAGE

if (-not (Test-Path -LiteralPath $syncScript)) {
    throw "Missing sync script: $syncScript"
}

function Resolve-ComparablePath {
    param([string]$Value)

    if (-not $Value) {
        return ''
    }

    return $Value.Replace('\', '/').TrimEnd('/').ToLowerInvariant()
}

function Get-RedactedUrl {
    param([string]$Value)

    try {
        $uri = [System.Uri]$Value
        return '{0}://{1}{2}' -f $uri.Scheme, $uri.Authority, $uri.AbsolutePath
    }
    catch {
        return 'invalid-url'
    }
}

function Resolve-WorkspaceStorageForRepo {
    param([string]$RepoRoot)

    if (-not $env:APPDATA) {
        return ''
    }

    $storageRoot = Join-Path $env:APPDATA 'Code\User\workspaceStorage'
    if (-not (Test-Path -LiteralPath $storageRoot)) {
        return ''
    }

    $repoKey = Resolve-ComparablePath $RepoRoot
    $exactMatch = $null
    $workspaceMatch = $null

    foreach ($directory in Get-ChildItem -Path $storageRoot -Directory) {
        $workspaceJsonPath = Join-Path $directory.FullName 'workspace.json'
        if (-not (Test-Path -LiteralPath $workspaceJsonPath)) {
            continue
        }

        try {
            $workspaceJson = Get-Content -Raw -LiteralPath $workspaceJsonPath | ConvertFrom-Json
        }
        catch {
            continue
        }

        $folderPath = if ($workspaceJson.folder) { Resolve-ComparablePath ([System.Uri]::UnescapeDataString($workspaceJson.folder).Replace('file:///', '')) } else { '' }
        $workspacePath = if ($workspaceJson.workspace) { Resolve-ComparablePath ([System.Uri]::UnescapeDataString($workspaceJson.workspace).Replace('file:///', '')) } else { '' }

        if ($folderPath -eq $repoKey) {
            $exactMatch = $directory.FullName
            break
        }

        if ($workspacePath -and ($workspacePath -eq $repoKey -or $workspacePath.StartsWith("$repoKey/"))) {
            $workspaceMatch = $directory.FullName
        }
    }

    if ($exactMatch) {
        return $exactMatch
    }

    return $workspaceMatch
}

if (-not $workspaceStorageRoot) {
    $workspaceStorageRoot = Resolve-WorkspaceStorageForRepo -RepoRoot $repoRoot
}

if (-not $workspaceStorageRoot) {
    throw "Could not resolve the VS Code workspaceStorage entry for $repoRoot"
}

$env:COPILOT_WORKSPACE_STORAGE = $workspaceStorageRoot

if ($MemoryMcpUrl) {
    $env:MEMORY_MCP_URL = $MemoryMcpUrl
}

if (-not $env:MEMORY_MCP_URL) {
    throw 'MEMORY_MCP_URL is required. Pass -MemoryMcpUrl or define the environment variable in Windows.'
}

if ($Detached) {
    $childArguments = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $PSCommandPath,
        '-MemoryMcpUrl', $env:MEMORY_MCP_URL,
        '-NodePath', $NodePath
    )

    if ($Once) {
        $childArguments += '-Once'
    }
    if ($DryRun) {
        $childArguments += '-DryRun'
    }
    if ($Backfill) {
        $childArguments += '-Backfill'
    }
    if ($VerboseSync) {
        $childArguments += '-VerboseSync'
    }

    Start-Process -FilePath 'powershell.exe' -ArgumentList $childArguments -WorkingDirectory $repoRoot -WindowStyle Hidden | Out-Null
    exit 0
}

if ($NodePath) {
    $nodeCommand = [pscustomobject]@{ Source = $NodePath }
} else {
    $nodeCommand = Get-Command node -CommandType Application -ErrorAction Stop
}

if (-not (Test-Path -LiteralPath $nodeCommand.Source)) {
    throw "Node executable not found: $($nodeCommand.Source)"
}
$logDir = if ($env:COPILOT_SYNC_LOG_DIR) {
    $env:COPILOT_SYNC_LOG_DIR
} elseif ($env:APPDATA) {
    Join-Path $env:APPDATA 'Code\User\globalStorage\github.copilot-chat'
} else {
    Join-Path $repoRoot '.copilot-sync-logs'
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir 'memory-mcp-sync.log'

$arguments = @($syncScript)
if ($Once) {
    $arguments += '--once'
}
if ($DryRun) {
    $arguments += '--dry-run'
}
if ($Backfill) {
    $arguments += '--backfill'
}
if ($VerboseSync) {
    $arguments += '--verbose'
}

Push-Location $repoRoot
try {
    $redactedUrl = Get-RedactedUrl -Value $env:MEMORY_MCP_URL
    "[$(Get-Date -Format o)] Launching Copilot Memory sync from $repoRoot (workspaceStorage=$workspaceStorageRoot, endpoint=$redactedUrl)" | Out-File -FilePath $logFile -Append -Encoding utf8
    & $nodeCommand.Source @arguments *>> $logFile
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}