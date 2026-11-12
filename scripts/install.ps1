# CMDFlow Windows PowerShell Installer
Write-Host "=== Installing CMDFlow for Windows ===" -ForegroundColor Cyan

$TargetDir = "$env:LOCALAPPDATA\cmdflow\bin"
if (!(Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$TargetDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$TargetDir", "User")
    $env:Path = "$env:Path;$TargetDir"
    Write-Host "Added $TargetDir to User PATH" -ForegroundColor Green
}

Write-Host "Configuring shell integration..." -ForegroundColor Cyan
if (Get-Command cmdflow -ErrorAction SilentlyContinue) {
    & cmdflow.exe install
    Write-Host "CMDFlow installed successfully! Restart PowerShell or reload your `$PROFILE." -ForegroundColor Green
} else {
    Write-Host "Place cmdflow.exe into $TargetDir and run 'cmdflow install'." -ForegroundColor Yellow
}
