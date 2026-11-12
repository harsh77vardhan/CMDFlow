$ErrorActionPreference = "Stop"

# Create temporary sandbox
$Sandbox = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $Sandbox -Force | Out-Null
$env:CMDFLOW_CONFIG_DIR = Join-Path $Sandbox "config"
$env:USERPROFILE = Join-Path $Sandbox "user"
New-Item -ItemType Directory -Path $env:CMDFLOW_CONFIG_DIR -Force | Out-Null
New-Item -ItemType Directory -Path $env:USERPROFILE -Force | Out-Null

Write-Host "=== Testing PowerShell Integration in Sandbox: $Sandbox ==="

# Initialize cmdflow
cmdflow doctor
$InitScript = & cmdflow init powershell | Out-String
Invoke-Expression $InitScript

# 1. Assert: an alias expands
cmdflow alias add greet "Write-Output 'hello from cmdflow'"
$InitScript = & cmdflow init powershell | Out-String
Invoke-Expression $InitScript

$out = greet
if ($out -ne "hello from cmdflow") {
    Write-Error "FAILED: alias expansion failed. Expected 'hello from cmdflow', got '$out'"
    exit 1
}
Write-Host "✓ Test 1: Alias expansion passed"

# 2. Assert: 'b' changes the real working directory
$L1 = Join-Path $Sandbox "level1"
$L2 = Join-Path $L1 "level2"
New-Item -ItemType Directory -Path $L2 -Force | Out-Null
Set-Location $L2
b
if ((Get-Location).Path -ne $L1) {
    Write-Error "FAILED: 'b' did not change directory to $L1, currently at: $((Get-Location).Path)"
    exit 1
}
Write-Host "✓ Test 2: 'b' changes working directory passed"

# 3. Assert: Arguments pass through
cmdflow alias add echocmd "Write-Output"
$InitScript = & cmdflow init powershell | Out-String
Invoke-Expression $InitScript

$argsOut = echocmd "foo" "bar baz"
if ($argsOut[0] -ne "foo" -or $argsOut[1] -ne "bar baz") {
    Write-Error "FAILED: arguments did not pass through cleanly. Got: $($argsOut -join ', ')"
    exit 1
}
Write-Host "✓ Test 3: Arguments pass through passed"

# 4. Assert: $LASTEXITCODE is preserved
cmd.exe /c "exit 42"
$savedExit = $LASTEXITCODE
if ($savedExit -ne 42) {
    Write-Error "FAILED: cmd.exe /c exit 42 did not set LASTEXITCODE to 42"
    exit 1
}
Set-Location $L2
b
if ($LASTEXITCODE -ne 42) {
    Write-Error "FAILED: LASTEXITCODE was not preserved across 'b' (expected 42, got $LASTEXITCODE)"
    exit 1
}
cmd.exe /c "exit 0"
Set-Location $L2
b
if ($LASTEXITCODE -ne 0) {
    Write-Error "FAILED: LASTEXITCODE was not preserved across 'b' (expected 0, got $LASTEXITCODE)"
    exit 1
}
Write-Host "✓ Test 4: `$LASTEXITCODE preservation passed"

# 5. Assert: A path with spaces works
$SpaceDir = Join-Path $Sandbox "folder with spaces"
$SubDir = Join-Path $SpaceDir "subfolder"
New-Item -ItemType Directory -Path $SubDir -Force | Out-Null
Set-Location $SubDir
b
if ((Get-Location).Path -ne $SpaceDir) {
    Write-Error "FAILED: path with spaces failed. Expected $SpaceDir, got: $((Get-Location).Path)"
    exit 1
}

$ProjectWithSpace = Join-Path $Sandbox "project with space"
New-Item -ItemType Directory -Path $ProjectWithSpace -Force | Out-Null
cmdflow project add spaceproj "$ProjectWithSpace"
$InitScript = & cmdflow init powershell | Out-String
Invoke-Expression $InitScript

Set-Location $Sandbox
spaceproj
if ((Get-Location).Path -ne $ProjectWithSpace) {
    Write-Error "FAILED: project shortcut with spaces failed. Expected $ProjectWithSpace, got: $((Get-Location).Path)"
    exit 1
}
Write-Host "✓ Test 5: Path with spaces works passed"

Remove-Item -Recurse -Force $Sandbox
Write-Host "=== All PowerShell integration tests passed successfully! ==="
