#!/usr/bin/env zsh
set -e

TEST_SANDBOX="$(mktemp -d)"
trap 'rm -rf "$TEST_SANDBOX"' EXIT

export HOME="$TEST_SANDBOX/home"
export CMDFLOW_CONFIG_DIR="$TEST_SANDBOX/config"
mkdir -p "$HOME" "$CMDFLOW_CONFIG_DIR"

echo "=== Testing Zsh Integration in Sandbox: $TEST_SANDBOX ==="

cmdflow config validate
eval "$(cmdflow init zsh)"

# 1. Test 'b' alias
mkdir -p "$TEST_SANDBOX/level1/level2"
cd "$TEST_SANDBOX/level1/level2"
b
if [[ "$PWD" != "$TEST_SANDBOX/level1" ]]; then
    echo "FAILED: 'b' did not change directory in Zsh"
    exit 1
fi
echo "✓ Test 'b' (cd ..) in Zsh passed"

# 2. Test 'bb' alias
cd "$TEST_SANDBOX/level1/level2"
bb
if [[ "$PWD" != "$TEST_SANDBOX" ]]; then
    echo "FAILED: 'bb' did not change directory in Zsh"
    exit 1
fi
echo "✓ Test 'bb' (cd ../..) in Zsh passed"

# 3. Test project navigation
TARGET_PROJ="$TEST_SANDBOX/zsh_project"
mkdir -p "$TARGET_PROJ"
cmdflow project add zshproj "$TARGET_PROJ"
eval "$(cmdflow init zsh)"
cd "$TEST_SANDBOX"
zshproj
if [[ "$PWD" != "$TARGET_PROJ" ]]; then
    echo "FAILED: project navigation failed in Zsh"
    exit 1
fi
echo "✓ Test project navigation in Zsh passed"

# 4. Test spaces and unicode
SPACE_DIR="$TEST_SANDBOX/zsh folder 🌟"
mkdir -p "$SPACE_DIR/nested"
cd "$SPACE_DIR/nested"
b
if [[ "$PWD" != "$SPACE_DIR" ]]; then
    echo "FAILED: spaces in Zsh failed"
    exit 1
fi
echo "✓ Test spaces/unicode in Zsh passed"

echo "=== All Zsh integration tests passed successfully! ==="
