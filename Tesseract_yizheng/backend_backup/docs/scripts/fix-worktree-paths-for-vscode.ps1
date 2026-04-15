# ============================================================================
# Fix Git Worktree Paths for VSCode
# ============================================================================
# 功能：将 worktree 的 .git 文件路径从 WSL 格式转换为 Windows 格式
# 用法：在 PowerShell 中执行此脚本
# ============================================================================

$ErrorActionPreference = "Stop"

$repoRoot = "C:\Users\sam\Documents\Sam\code\tesseract-BE"
$worktreeBase = "C:\Users\sam\Documents\Sam\code\.zcf\tesseract-BE"

function Convert-WslGitPathToWindows {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath
    )

    if (-not (Test-Path $FilePath)) {
        Write-Host "  Warning: $FilePath not found" -ForegroundColor Red
        return
    }

    $content = Get-Content -Path $FilePath -Raw
    Write-Host "  Processing: $FilePath" -ForegroundColor Gray
    Write-Host "    Current: $content" -ForegroundColor DarkGray

    # 统一将 WSL 路径转换为 Windows Git 可识别的路径格式。
    $newContent = $content -replace '/mnt/c/', 'C:/' -replace '\\', '/'
    Write-Host "    New: $newContent" -ForegroundColor Green

    Set-Content -Path $FilePath -Value $newContent -NoNewline
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fix Git Worktree Paths for VSCode" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 修复 worktree 目录中的 .git 文件
Write-Host "[1/2] Fixing .git files in worktree directories..." -ForegroundColor Yellow

$worktreeDirs = Get-ChildItem -Path $worktreeBase -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne ".git" }
foreach ($worktreeDir in $worktreeDirs) {
    $gitFile = Join-Path -Path $worktreeDir.FullName -ChildPath ".git"
    Convert-WslGitPathToWindows -FilePath $gitFile
}

Write-Host ""

# 2. 修复主仓库中的 gitdir 文件
Write-Host "[2/2] Fixing gitdir files in main repository..." -ForegroundColor Yellow

$gitWorktreesDir = Join-Path -Path $repoRoot -ChildPath ".git\worktrees"
$gitWorktreeDirs = Get-ChildItem -Path $gitWorktreesDir -Directory -ErrorAction SilentlyContinue
foreach ($gitWorktreeDir in $gitWorktreeDirs) {
    $gitdirFile = Join-Path -Path $gitWorktreeDir.FullName -ChildPath "gitdir"
    Convert-WslGitPathToWindows -FilePath $gitdirFile
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Done! Now reload VSCode window:" -ForegroundColor Green
Write-Host "  1. Press Ctrl+Shift+P" -ForegroundColor White
Write-Host "  2. Type: Developer: Reload Window" -ForegroundColor White
Write-Host "  3. Open Source Control (Ctrl+Shift+G)" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
