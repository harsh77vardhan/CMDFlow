# CMDFlow 3-Minute Live Demo Script

**Live Production URL:** [https://cmdflow.cmdflow.workers.dev](https://cmdflow.cmdflow.workers.dev)  
**Latest Release:** [v1.0.3 on GitHub](https://github.com/harsh77vardhan/CMDFlow/releases/tag/v1.0.3)  
**Binary Location:** `~/.local/bin/cmdflow` (Installed & Integrated)

---

## 🎯 Demo Goal
Showcase that CMDFlow is a real, ultra-fast (<20ms startup) command layer running natively on the host machine across Bash, Zsh, and Fish, backed by a production Cloudflare Edge Worker.

---

## ⏱️ Step-by-Step 3-Minute Walkthrough

### 0. Quick Sanity & Diagnostics (< 15 seconds)
Verify installation status, configuration validity, and PATH diagnostics:
```bash
cmdflow doctor
```
**Expected Output:**
```text
CMDFlow Doctor Diagnostic Report
--------------------------------
Config file: ~/.config/cmdflow/config.toml ... OK (Valid)
  Total aliases: 10
  Total projects: 1
  Total flows: 1

Shadowing Diagnostics:
  ! Alias 'gs' shadows binary at /usr/bin/gs
  ! Alias 'gc' shadows binary at /usr/bin/gc

Installed Shells Check:
  ✓ Found bash at /usr/bin/bash
  ✓ Found zsh at /usr/bin/zsh
  ✓ Found fish at /usr/bin/fish

✓ Doctor check complete.
```

---

### 1. Instant Navigation & Aliases (< 30 seconds)
Move between directories instantly without repetitive `cd ..`:
```bash
# Go up one directory
b

# Verify new directory
pwd

# Jump back
cd -

# Run quick git status shortcut
gs
```
**Expected Output:**
- `b` changes the working directory to the parent folder.
- `gs` runs `git status` cleanly.

---

### 2. Context-Aware Routing (< 30 seconds)
CMDFlow adapts to the current context. The `s` shortcut automatically detects if you are in a Git repository:
```bash
# Inside a git repository:
s
# -> Runs 'git status'

# Move outside to a non-git directory:
cd /tmp
s
# -> Automatically falls back to 'ls'

# Return to repository
cd -
```

---

### 3. Named Projects & Explanations (< 30 seconds)
Inspect saved projects and multi-step automation flows:
```bash
# List configured projects
cmdflow project ls

# Explain an alias without running it
cmdflow explain b

# Inspect a multi-step flow safely
cmdflow explain deploy
```
**Expected Output:**
```text
PROJECT          PATH                                 DESCRIPTION
-----------------------------------------------------------------
technea          ~/Documents/Technea                  Example project reference

Explaining: deploy
  Type: Multi-step Flow (4 steps)
    1. git pull
    2. npm install
    3. npm test
    4. npm run build
```

---

### 4. Deterministic AI Safety Guard (< 30 seconds)
Ask natural language questions with real-time risk classification and approval gating:
```bash
cmdflow ask --non-interactive "check git status"
```
**Expected Output:**
```text
CMDFlow AI Assistant
--------------------------------
Proposed:    git status
Explanation: Displays the status of the working directory and staging area.
Risk Level:  [SAFE]
Non-interactive mode: executing safe command.
...
```

---

### 5. Live Edge Worker & Self-Update (< 30 seconds)
Verify live connectivity to Cloudflare Edge Worker (`https://cmdflow.cmdflow.workers.dev`) and cryptographic SHA-256 asset verification:
```bash
cmdflow update
```
**Expected Output:**
```text
▶ Checking for updates from https://cmdflow.cmdflow.workers.dev/api/releases/latest...
  Update source:   Cloudflare Edge Worker (https://cmdflow.cmdflow.workers.dev/api/releases/latest)
  Current version: v1.0.3
  Latest version:  v1.0.3
  Target platform: linux-x86_64
  Asset URL:       https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.3/cmdflow-linux-x86_64.tar.gz
  Expected SHA:    60b6e0d535cb8d6407a8ad269ccaafe13b6841fc4270feb220103ad26c7e3872
▶ Downloading asset to temporary file...
  Downloaded:      2939903 bytes
  Calculated SHA:  60b6e0d535cb8d6407a8ad269ccaafe13b6841fc4270feb220103ad26c7e3872
✓ Checksum verified for linux-x86_64: 60b6e0d535cb8d6407a8ad269ccaafe13b6841fc4270feb220103ad26c7e3872
✓ CMDFlow is up to date (v1.0.3) via Cloudflare Edge Worker (https://cmdflow.cmdflow.workers.dev/api/releases/latest)!
```

---

### 6. Interactive Settings UI (< 15 seconds)
Launch the embedded settings management interface on a random localhost port:
```bash
cmdflow settings
```
*(Press `Ctrl+C` to return to the shell).*

---

## 🛠️ Troubleshooting Guide

| Issue | Cause | Fix |
|---|---|---|
| `command not found: cmdflow` | `~/.local/bin` not in `$PATH` | Add `export PATH="$HOME/.local/bin:$PATH"` to your shell rc file or restart terminal. |
| `b: command not found` | Shell rc file not reloaded | Run `source ~/.bashrc` (or `source ~/.zshrc`, or restart terminal). |
| Port in use during `cmdflow settings` | Previous UI server left running | `pkill -f "cmdflow settings"` or restart command. |
| Edge proxy offline | Network or DNS issue | CLI automatically falls back to GitHub Releases API. |
