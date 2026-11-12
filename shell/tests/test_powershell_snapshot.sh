#!/usr/bin/env bash
set -e

echo "=== Testing PowerShell Snapshot and Syntax Generation ==="

INIT_OUTPUT="$(cmdflow init powershell)"

# Assert critical PowerShell integration markers
echo "$INIT_OUTPUT" | grep -q "function global:__cmdflow_run" || { echo "FAILED: Missing __cmdflow_run"; exit 1; }
echo "$INIT_OUTPUT" | grep -q "Invoke-Expression" || { echo "FAILED: Missing Invoke-Expression"; exit 1; }
echo "$INIT_OUTPUT" | grep -q "Set-Alias -Name cf -Value cmdflow -Scope Global" || { echo "FAILED: Missing cf alias"; exit 1; }
echo "$INIT_OUTPUT" | grep -q "function global:b {" || { echo "FAILED: Missing 'b' function in powershell output"; exit 1; }
echo "$INIT_OUTPUT" | grep -q "function global:gs {" || { echo "FAILED: Missing 'gs' function in powershell output"; exit 1; }
echo "$INIT_OUTPUT" | grep -q "function global:ll {" || { echo "FAILED: Missing 'll' function in powershell output"; exit 1; }

echo "✓ PowerShell snapshot assertions passed successfully!"
