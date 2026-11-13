# CMDFlow

[![CI](https://github.com/harsh77vardhan/CMDFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/harsh77vardhan/CMDFlow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v1.0.3-emerald.svg)](https://github.com/harsh77vardhan/CMDFlow/releases)
[![Website](https://img.shields.io/badge/Website-cmdflow.cmdflow.workers.dev-indigo.svg)](https://cmdflow.cmdflow.workers.dev)

CMDFlow is an ultra-fast (<20ms startup), deterministic command layer that sits on top of your existing shells (**Bash**, **Zsh**, **Fish**, and **PowerShell**). Instead of memorizing obscure flags or navigating nested paths, CMDFlow provides instant aliases, project jumping, multi-step flows, context-aware routing, and a sandboxed AI assistant that checks command safety before execution.

---

## ⚡ Quick Install

### Linux & macOS
```bash
curl -fsSL https://cmdflow.cmdflow.workers.dev/install.sh | bash
```
*(or via GitHub raw: `curl -fsSL https://raw.githubusercontent.com/harsh77vardhan/CMDFlow/main/scripts/install.sh | bash`)*

### Windows (PowerShell)
```powershell
iwr -useb https://cmdflow.cmdflow.workers.dev/install.ps1 | iex
```
*(or via GitHub raw: `iwr -useb https://raw.githubusercontent.com/harsh77vardhan/CMDFlow/main/scripts/install.ps1 | iex`)*

### From Source (Rust Cargo)
```bash
cargo install --path cli/cmdflow
cmdflow install
```

---

## 🚀 Quick Start

### 1. Navigation & Aliases
```bash
# Add a simple alias
cmdflow alias add b "cd .."
cmdflow alias add gs "git status -sb"

# Use your aliases immediately in your shell
b
gs
```

### 2. Project Jumping
```bash
# Register a project directory
cmdflow project add technea ~/Documents/Technea

# Jump directly to it from anywhere
project technea
```

### 3. Multi-Step Automation Flows
Run sequences of commands safely with step-by-step progress:
```bash
cmdflow flow run deploy
```

### 4. Natural Language AI Assistant
Translate natural language into safe shell commands with deterministic risk assessment:
```bash
cmdflow ask "delete node modules"
# Output:
# Proposed:    rm -rf node_modules
# Explanation: Removes local npm dependencies directory completely
# Risk Level:  [DESTRUCTIVE]
# Affected:    node_modules/
# Requires explicit confirmation before running.
```

### 5. Diagnostics, Updates & Settings Console
```bash
# Run self-diagnostics and detect shadow conflicts
cmdflow doctor

# Check for updates and verify release checksums against the edge API
cmdflow update

# Launch the embedded local web configuration UI (alias: cmdflow ui)
cmdflow settings
cmdflow ui
```

---

## 🏛️ Architecture & Monorepo Layout

```
.
├── cli/                 # Rust workspace (cmdflow-core + cmdflow clap binary)
├── shell/               # Native shell integration scripts & sandboxed test suites
│   ├── bash/
│   ├── zsh/
│   ├── fish/
│   └── powershell/
├── settings-ui/         # Local settings console (Vite + Vanilla TS, embedded into binary)
├── src/
│   ├── client/          # Landing site & interactive terminal showcase
│   └── worker/          # Cloudflare Worker API & release proxy
├── docs/                # Comprehensive architecture, security, shell & AI specifications
│   ├── SPEC.md
│   ├── DECISIONS.md
│   ├── SECURITY.md
│   ├── SHELLS.md
│   ├── FLOWS.md
│   ├── AI.md
│   ├── PLUGINS.md
│   └── CONTRIBUTING.md
└── scripts/             # Automated install scripts & cross-shell E2E verification
```

---

## 🔒 Security & Performance Guarantees

- **Resolution Latency**: <20ms startup resolution overhead (measured 2-4ms in production benchmarks).
- **Protected Names**: Core shell commands (`cd`, `rm`, `sudo`, `mv`, `cp`, `git`, `ssh`, shell binaries) are guarded against unintended shadowing.
- **Sandboxed Operations**: All tests and CI matrix runs operate in temporary sandboxed environments.
- **Deterministic AI Risk Engine**: Regex & semantic heuristic rules detect destructive operations (`rm -rf`, `mkfs`, `dd`, `DROP DATABASE`) and mandate user approval.

---

## 🛠️ Verification & Testing

Run the full cross-platform test suite:
```bash
# Rust core & CLI unit and integration tests
cargo test --workspace --manifest-path cli/Cargo.toml

# Shell integration tests
bash shell/tests/test_bash.sh
zsh shell/tests/test_zsh.sh
fish shell/tests/test_fish.fish
pwsh shell/tests/test_powershell.ps1

# Complete end-to-end sandbox test
./scripts/e2e.sh
```

---

## ⚠️ Known Limitations & Target Platforms

- **Tier-1 Platforms**: Supported with pre-compiled binaries in every release:
  - `linux-x86_64` (Linux x86_64 glibc)
  - `darwin-arm64` (Apple Silicon M1/M2/M3/M4)
  - `darwin-x86_64` (Intel Mac)
  - `windows-x86_64` (Windows 10/11 x86_64)
- **Linux arm64 (`aarch64-unknown-linux-gnu`)**: Feasible via `cross` or native ARM64 runners; planned for general availability in v1.1. Users on ARM64 Linux can build directly with `cargo install --path cli/cmdflow`.
- **Windows arm64 (`aarch64-pc-windows-msvc`)**: Standard GitHub Actions free runners do not currently provide native Windows ARM64 environments, and MSVC cross-compilers require specialized proprietary SDK linkers. Users can compile natively with Rust toolchain on Windows on ARM.

---

## 📄 License

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 Harsh Vardhan.
