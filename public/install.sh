#!/usr/bin/env bash
set -e

# CMDFlow Unix Installer (Linux & macOS)
echo "=== Installing CMDFlow ==="

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
    x86_64|amd64) TARGET_ARCH="x86_64" ;;
    aarch64|arm64) TARGET_ARCH="arm64" ;;
    *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

case "$OS" in
    linux) PLATFORM="linux-${TARGET_ARCH}" ;;
    darwin) PLATFORM="darwin-${TARGET_ARCH}" ;;
    *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

BIN_DIR="${HOME}/.local/bin"
mkdir -p "$BIN_DIR"

if command -v cmdflow >/dev/null 2>&1; then
    echo "Found existing cmdflow binary at $(which cmdflow)"
else
    echo "Downloading CMDFlow for ${PLATFORM}..."
    DOWNLOAD_URL=""
    RELEASE_DATA=$(curl -fsSL https://cmdflow.dev/api/releases/latest 2>/dev/null || true)
    if [ -n "$RELEASE_DATA" ]; then
        DOWNLOAD_URL=$(echo "$RELEASE_DATA" | grep -o "https://[^\"]*${PLATFORM}[^\"]*" | head -n 1 || true)
    fi
    if [ -z "$DOWNLOAD_URL" ]; then
        DOWNLOAD_URL="https://github.com/harsh77vardhan/CMDFlow/releases/latest/download/cmdflow-${PLATFORM}.tar.gz"
    fi

    TMP_DIR=$(mktemp -d)
    if curl -fsSL "$DOWNLOAD_URL" -o "$TMP_DIR/cmdflow.tar.gz" 2>/dev/null; then
        tar -xzf "$TMP_DIR/cmdflow.tar.gz" -C "$TMP_DIR"
        if [ -f "$TMP_DIR/cmdflow" ]; then
            mv "$TMP_DIR/cmdflow" "$BIN_DIR/cmdflow"
            chmod +x "$BIN_DIR/cmdflow"
            export PATH="$BIN_DIR:$PATH"
            echo "Installed cmdflow to $BIN_DIR/cmdflow"
        fi
    fi
    rm -rf "$TMP_DIR"
fi

# Run installer hook
if command -v cmdflow >/dev/null 2>&1 || [ -f "$BIN_DIR/cmdflow" ]; then
    CMD="${BIN_DIR}/cmdflow"
    if command -v cmdflow >/dev/null 2>&1; then
        CMD="cmdflow"
    fi
    "$CMD" install
    echo "✓ CMDFlow shell integration installed successfully."
else
    echo "Installation complete. Add ~/.local/bin to your PATH and run 'cmdflow install'."
fi
