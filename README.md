# CMDFlow

[![CI](https://github.com/harsh77vardhan/CMDFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/harsh77vardhan/CMDFlow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v1.0.0-emerald.svg)](https://github.com/harsh77vardhan/CMDFlow/releases)

CMDFlow is an ultra-fast (<20ms startup), deterministic command layer that sits on top of your existing shells (**Bash**, **Zsh**, **Fish**, and **PowerShell**). Instead of memorizing obscure flags or navigating nested paths, CMDFlow provides instant aliases, project jumping, multi-step flows, context-aware routing, and a sandboxed AI assistant that checks command safety before execution.

---

## ⚡ Quick Install

### Linux & macOS
```bash
curl -fsSL https://raw.githubusercontent.com/harsh77vardhan/CMDFlow/main/scripts/install.sh | bash
```

### Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/harsh77vardhan/CMDFlow/main/scripts/install.ps1 | iex
```

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

### 5. Diagnostics & Settings UI
```bash
# Run self-diagnostics and detect shadow conflicts
cmdflow doctor

# Launch the embedded local web configuration UI
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
bash shell/tests/test_powershell_snapshot.sh

# Complete end-to-end sandbox test
./scripts/e2e.sh
```

---

## 📄 License

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 Harsh Vardhan.
