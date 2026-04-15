<#
 [INPUT]: 依赖 Windows ScheduledTasks 模块与当前用户上下文，用于定位既有 Copilot Memory 同步计划任务。
 [OUTPUT]: 对外提供计划任务卸载入口，停止并移除 Copilot Memory 自启动注册。
 [POS]: scripts/ 的 Windows 清理脚本，与 install-copilot-memory-sync-task.ps1 形成可逆操作对。
 [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
#>

[CmdletBinding()]
param(
    [string]$TaskName = 'CopilotMemoryMcpSync'
)

$ErrorActionPreference = 'Stop'

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
    Write-Host "Scheduled task '$TaskName' was not found."
    exit 0
}

try {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue | Out-Null
}
catch {
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Removed scheduled task '$TaskName'."