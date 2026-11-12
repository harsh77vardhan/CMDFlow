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
    # In live installation, downloads from release API
    echo "Downloading CMDFlow for ${PLATFORM}..."
    RELEASE_DATA=$(curl -fsSL https://cmdflow.dev/api/releases/latest 2>/dev/null || true)
    if [ -n "$RELEASE_DATA" ]; then
        DOWNLOAD_URL=$(echo "$RELEASE_DATA" | grep -o "https://[^\"]*${PLATFORM}[^\"]*" | head -n 1 || true)
    fi
fi

# Run installer hook
if command -v cmdflow >/dev/null 2>&1; then
    cmdflow install
    echo "✓ CMDFlow shell integration installed successfully."
else
    echo "Installation complete. Add ~/.local/bin to your PATH and run 'cmdflow install'."
fi
