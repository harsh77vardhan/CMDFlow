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

$BinaryPath = Join-Path $TargetDir "cmdflow.exe"
if (!(Test-Path $BinaryPath) -and !(Get-Command cmdflow -ErrorAction SilentlyContinue)) {
    Write-Host "Downloading cmdflow-windows-x86_64.zip..." -ForegroundColor Cyan
    $ZipPath = Join-Path $env:TEMP "cmdflow-windows-x86_64.zip"
    $DownloadUrl = "https://github.com/harsh77vardhan/CMDFlow/releases/latest/download/cmdflow-windows-x86_64.zip"
    try {
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath -UseBasicParsing
        Expand-Archive -Path $ZipPath -DestinationPath $TargetDir -Force
        Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
        Write-Host "Extracted cmdflow.exe to $TargetDir" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Could not automatically download release asset: $_" -ForegroundColor Yellow
    }
}

Write-Host "Configuring shell integration..." -ForegroundColor Cyan
if (Get-Command cmdflow -ErrorAction SilentlyContinue) {
    & cmdflow.exe install
    Write-Host "CMDFlow installed successfully! Restart PowerShell or reload your `$PROFILE." -ForegroundColor Green
} elseif (Test-Path $BinaryPath) {
    & $BinaryPath install
    Write-Host "CMDFlow installed successfully! Restart PowerShell or reload your `$PROFILE." -ForegroundColor Green
} else {
    Write-Host "Place cmdflow.exe into $TargetDir and run 'cmdflow install'." -ForegroundColor Yellow
}
