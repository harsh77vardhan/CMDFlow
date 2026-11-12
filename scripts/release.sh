#!/usr/bin/env bash
set -e

# CMDFlow Release Packaging Script
VERSION="0.1.0"
DIST_DIR="dist/releases/v${VERSION}"
mkdir -p "$DIST_DIR"

echo "Building CMDFlow release binary..."
cd cli
cargo build --release
cd ..

TARGET_BIN="cli/target/release/cmdflow"
ARCHIVE_NAME="cmdflow-linux-x86_64.tar.gz"

echo "Creating release archive: $DIST_DIR/$ARCHIVE_NAME"
tar -czvf "$DIST_DIR/$ARCHIVE_NAME" -C "cli/target/release" cmdflow

echo "Calculating SHA-256 checksums..."
cd "$DIST_DIR"
sha256sum "$ARCHIVE_NAME" > SHA256SUMS
cat SHA256SUMS
cd ../../..

echo "✓ Release build and checksums generated in $DIST_DIR"
