# CMDFlow AI Command Generation Specification (AI.md)

CMDFlow provides safe, natural-language command generation designed specifically for developers who live in the terminal. Rather than executing commands blindly, CMDFlow enforces strict boundaries, sanitization, and deterministic local risk validation.

---

## 1. Safety Principles & Threat Model

1. **Zero Secret Leakage**:
   - Only structural metadata is collected: host OS, shell dialect, current directory basename, git branch/status, and top-level directory entries.
   - **Never collected**: File contents, environment variables, authentication tokens, `.env` files, SSH keys, or private dotfiles.
2. **Never Auto-Run**:
   - The CLI never executes an AI-proposed command without explicit interactive user approval.
   - Non-interactive / piped environments automatically reject any non-safe command.
3. **Never Chain or Elevate**:
   - Commands are never automatically chained (`&&`, `;`) with hidden sub-commands.
   - Commands are never prefixed with `sudo` or elevated privileges without explicit instruction and confirmation.

---

## 2. Architecture & Data Flow

```
User Prompt ("delete node modules")
          │
          ▼
SafeContext Gatherer (OS, Shell, CWD basename, Git state, Top-level names)
          │
          ▼
Provider Layer (Anthropic / OpenAI / Gemini / Ollama / Mock / Cloud Proxy)
          │
          ▼
Raw Proposal { command, explanation, model_risk, affected_paths, reversible }
          │
          ▼
Deterministic Local Risk Classifier
          │
          ▼ (Reconcile: Can RAISE risk, never LOWER it)
Final Risk Level: SAFE | CAUTION | DESTRUCTIVE
          │
          ▼
Approval Gate (Enter/y | "yes" | Type Target Name)
          │
          ├── [Approved] ──▶ Execute in shell & Log to history.jsonl
          └── [Declined] ──▶ Clean Cancellation
```

---

## 3. Risk Levels & Approval Gates

| Risk Level | Definition | Examples | Approval Protocol |
|---|---|---|---|
| **Safe** | Read-only operations, status checks, safe navigations | `git status`, `ls -la`, `cd ..`, `cat file` | Press `Enter` or `y` |
| **Caution** | Modifies state, restarts services, non-hard deletions, package uninstall | `systemctl restart`, `git branch -d`, `npm un`, `kill -9` | User must type **`yes`** |
| **Destructive** | Unrecoverable data loss, hard resets, disk wiping, mass file deletion | `rm -rf`, `git reset --hard`, `mkfs`, `dd if=`, `DROP TABLE` | User must type the **exact target name** (e.g. `node_modules`) |

---

## 4. Deterministic Local Risk Classifier

Even if a remote LLM marks a command as "safe", the local Rust engine evaluates the command against strict regular expressions and AST rules:

- **Filesystem deletion**: `rm -rf`, `rm -fr`, `rm -r`, `rm *`, `Remove-Item -Recurse -Force`, `rd /s /q`, `del /f /s /q`
- **Git operations**: `git reset --hard`, `git clean -f`, `git push --force`, `git push -f`, `git push +branch`
- **Low-level disk**: `dd if=`, `mkfs.*`, `fdisk`, `parted`, `Format-Volume`, `format c:`
- **Database**: `DROP DATABASE`, `DROP TABLE`, `TRUNCATE TABLE`
- **Remote execution**: `curl \| sh`, `wget \| bash`, `curl \| pwsh`
- **Permissions**: `chmod -R 777`, `chmod -R 000`, `chown -R`
- **System redirects**: `> /etc/`, `> /dev/sda`, `> /boot/`

The deterministic classifier unit test suite contains **over 60 test cases** to ensure zero regressions.

---

## 5. Providers & Configuration

CMDFlow supports bring-your-own-key across all major providers:

```sh
# Set provider
cmdflow config set ai_provider mock      # Offline deterministic provider (default for testing)
cmdflow config set ai_provider ollama    # Local Ollama (http://localhost:11434)
cmdflow config set ai_provider anthropic # Anthropic Claude
cmdflow config set ai_provider openai    # OpenAI GPT-4o
cmdflow config set ai_provider gemini    # Google Gemini
cmdflow config set ai_provider cloud     # CMDFlow Cloud Worker Proxy
```

Credentials are saved in `~/.config/cmdflow/.credentials` with `0600` permissions (owner read/write only) or retrieved directly from environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `CMDFLOW_API_KEY`).
