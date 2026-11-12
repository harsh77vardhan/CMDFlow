#!/usr/bin/env fish

set -l TEST_SANDBOX (mktemp -d)
function cleanup --on-process-exit %self
    rm -rf "$TEST_SANDBOX"
end

set -x HOME "$TEST_SANDBOX/home"
set -x CMDFLOW_CONFIG_DIR "$TEST_SANDBOX/config"
mkdir -p "$HOME" "$CMDFLOW_CONFIG_DIR"

echo "=== Testing Fish Integration in Sandbox: $TEST_SANDBOX ==="

cmdflow config validate
eval (cmdflow init fish | string collect)

# 1. Test 'b' alias
mkdir -p "$TEST_SANDBOX/level1/level2"
cd "$TEST_SANDBOX/level1/level2"
b
if test "$PWD" != "$TEST_SANDBOX/level1"
    echo "FAILED: 'b' did not change directory in Fish"
    exit 1
end
echo "✓ Test 'b' (cd ..) in Fish passed"

# 2. Test 'bb' alias
cd "$TEST_SANDBOX/level1/level2"
bb
if test "$PWD" != "$TEST_SANDBOX"
    echo "FAILED: 'bb' did not change directory in Fish"
    exit 1
end
echo "✓ Test 'bb' (cd ../..) in Fish passed"

# 3. Test project navigation
set -l TARGET_PROJ "$TEST_SANDBOX/fish_project"
mkdir -p "$TARGET_PROJ"
cmdflow project add fishproj "$TARGET_PROJ"
eval (cmdflow init fish | string collect)
cd "$TEST_SANDBOX"
fishproj
if test "$PWD" != "$TARGET_PROJ"
    echo "FAILED: project navigation failed in Fish"
    exit 1
end
echo "✓ Test project navigation in Fish passed"

echo "=== All Fish integration tests passed successfully! ==="
