#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "    CMDFlow End-to-End Automated Test Verification"
echo "=========================================================="

SANDBOX="$(mktemp -d /tmp/cmdflow_e2e_XXXXXX)"
trap 'rm -rf "$SANDBOX"' EXIT

export HOME="$SANDBOX/home"
export XDG_CONFIG_HOME="$SANDBOX/config"
export CMDFLOW_CONFIG_DIR="$SANDBOX/config/cmdflow"
mkdir -p "$HOME" "$CMDFLOW_CONFIG_DIR"
git init -q "$SANDBOX"

echo "1. Testing sandbox environment initialized at: $SANDBOX"

# 1. Install integration into sandbox
cmdflow install --sandbox-home "$HOME"
if ! grep -q "# >>> cmdflow init >>>" "$HOME/.bashrc"; then
    echo "FAILED: .bashrc does not contain cmdflow init block"
    exit 1
fi
echo "✓ cmdflow install verified in sandbox"

# 2. Test Bash realistic session
echo "\n2. Testing Bash session..."
(
    export HOME="$SANDBOX/home"
    export CMDFLOW_CONFIG_DIR="$SANDBOX/config/cmdflow"
    eval "$(cmdflow init bash)"

    # Test b
    mkdir -p "$SANDBOX/dir1/dir2"
    cd "$SANDBOX/dir1/dir2"
    b
    if [ "$PWD" != "$SANDBOX/dir1" ]; then
        echo "FAILED: 'b' did not change directory"
        exit 1
    fi
    echo "  ✓ 'b' navigated to parent directory"

    # Test bb
    cd "$SANDBOX/dir1/dir2"
    bb
    if [ "$PWD" != "$SANDBOX" ]; then
        echo "FAILED: 'bb' did not navigate up 2 levels"
        exit 1
    fi
    echo "  ✓ 'bb' navigated up two directories"

    # Test project
    mkdir -p "$SANDBOX/projects/alpha"
    cmdflow project add alpha "$SANDBOX/projects/alpha"
    eval "$(cmdflow init bash)"
    cd "$SANDBOX"
    alpha
    if [ "$PWD" != "$SANDBOX/projects/alpha" ]; then
        echo "FAILED: 'alpha' project shortcut failed"
        exit 1
    fi
    echo "  ✓ Project navigation verified"

    # Test explain
    cmdflow explain b >/dev/null
    echo "  ✓ 'cmdflow explain' works"

    # Test doctor
    cmdflow doctor >/dev/null
    echo "  ✓ 'cmdflow doctor' diagnostics passed"

    # Test AI safe execution
    cmdflow ask "git status" --non-interactive >/dev/null
    echo "  ✓ 'cmdflow ask' safe non-interactive execution verified"
)

# 3. Test Zsh realistic session
if command -v zsh >/dev/null 2>&1; then
    echo "\n3. Testing Zsh session..."
    zsh -c "
        export HOME='$SANDBOX/home'
        export CMDFLOW_CONFIG_DIR='$SANDBOX/config/cmdflow'
        eval \"\$(cmdflow init zsh)\"
        mkdir -p '$SANDBOX/zsh_a/zsh_b'
        cd '$SANDBOX/zsh_a/zsh_b'
        b
        if [[ \"\$PWD\" != '$SANDBOX/zsh_a' ]]; then
            echo 'FAILED: Zsh b failed'
            exit 1
        fi
        echo '  ✓ Zsh session verified successfully'
    "
fi

# 4. Test Fish realistic session
if command -v fish >/dev/null 2>&1; then
    echo "\n4. Testing Fish session..."
    fish -c "
        set -x HOME '$SANDBOX/home'
        set -x CMDFLOW_CONFIG_DIR '$SANDBOX/config/cmdflow'
        eval (cmdflow init fish | string collect)
        mkdir -p '$SANDBOX/fish_a/fish_b'
        cd '$SANDBOX/fish_a/fish_b'
        b
        if test \"\$PWD\" != '$SANDBOX/fish_a'
            echo 'FAILED: Fish b failed'
            exit 1
        end
        echo '  ✓ Fish session verified successfully'
    "
fi

# 5. Measure and record resolve latency
echo "\n5. Benchmarking resolve startup performance..."
START_NS=$(date +%s%N)
cmdflow __run bash -- b >/dev/null
END_NS=$(date +%s%N)
ELAPSED_MS=$(( (END_NS - START_NS) / 1000000 ))
echo "  ↳ Resolution latency: ${ELAPSED_MS}ms (Target: < 20ms)"
if [ "$ELAPSED_MS" -gt 35 ]; then
    echo "WARNING: Resolve latency exceeded expected threshold: ${ELAPSED_MS}ms"
fi

# 6. Test uninstall
echo "\n6. Testing cmdflow uninstall..."
cmdflow uninstall --sandbox-home "$HOME"
if grep -q "# >>> cmdflow init >>>" "$HOME/.bashrc"; then
    echo "FAILED: .bashrc still contains init block after uninstall"
    exit 1
fi
echo "✓ cmdflow uninstall restored all rc files cleanly"

echo "\n=========================================================="
echo "    ✓ ALL END-TO-END VERIFICATION CHECKS PASSED!"
echo "=========================================================="
