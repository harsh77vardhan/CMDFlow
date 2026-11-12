#!/usr/bin/env bash
set -e

# Test Bash integration in an isolated sandbox
TEST_SANDBOX="$(mktemp -d)"
trap 'rm -rf "$TEST_SANDBOX"' EXIT

export HOME="$TEST_SANDBOX/home"
export CMDFLOW_CONFIG_DIR="$TEST_SANDBOX/config"
mkdir -p "$HOME" "$CMDFLOW_CONFIG_DIR"

echo "=== Testing Bash Integration in Sandbox: $TEST_SANDBOX ==="

# Initialize config
cmdflow config validate

# Evaluate init code
eval "$(cmdflow init bash)"

# 1. Test 'b' alias changes current shell working directory
mkdir -p "$TEST_SANDBOX/level1/level2"
cd "$TEST_SANDBOX/level1/level2"
b
if [ "$PWD" != "$TEST_SANDBOX/level1" ]; then
    echo "FAILED: 'b' did not change parent shell directory. Expected $TEST_SANDBOX/level1, got $PWD"
    exit 1
fi
echo "✓ Test 'b' (cd ..) passed"

# 2. Test 'bb' alias (cd ../..)
cd "$TEST_SANDBOX/level1/level2"
bb
if [ "$PWD" != "$TEST_SANDBOX" ]; then
    echo "FAILED: 'bb' did not navigate up 2 levels. Expected $TEST_SANDBOX, got $PWD"
    exit 1
fi
echo "✓ Test 'bb' (cd ../..) passed"

# 3. Test project navigation
TARGET_PROJ="$TEST_SANDBOX/my_project"
mkdir -p "$TARGET_PROJ"
cmdflow project add myproj "$TARGET_PROJ"
eval "$(cmdflow init bash)"
cd "$TEST_SANDBOX"
myproj
if [ "$PWD" != "$TARGET_PROJ" ]; then
    echo "FAILED: project shortcut 'myproj' did not change directory. Expected $TARGET_PROJ, got $PWD"
    exit 1
fi
echo "✓ Test project navigation passed"

# 4. Test paths with spaces and Unicode
SPACE_DIR="$TEST_SANDBOX/folder with spaces 🚀"
mkdir -p "$SPACE_DIR/inner"
cd "$SPACE_DIR/inner"
b
if [ "$PWD" != "$SPACE_DIR" ]; then
    echo "FAILED: spaces/unicode path handling failed. Expected $SPACE_DIR, got $PWD"
    exit 1
fi
echo "✓ Test spaces and unicode paths passed"

echo "=== All Bash integration tests passed successfully! ==="
