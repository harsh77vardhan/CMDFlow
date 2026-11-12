# CMDFlow Security Model & Threat Assessment (SECURITY.md)

CMDFlow is designed with security as a primary invariant. Because a command layer operates with user-level privileges inside the shell, strict boundaries and defensive defaults are enforced.

---

## 1. Untrusted Project Configs (`.cmdflow.toml`)
- **Threat**: An attacker tricks a developer into cloning a malicious repository containing a `.cmdflow.toml` that defines harmful flows or aliases.
- **Defense**:
  - Un-trusted project files are never executed automatically.
  - Project configs must be explicitly approved via `cmdflow trust <path>`.
  - Trusted paths are recorded in `~/.config/cmdflow/config.toml`.
  - Project overlays cannot override protected command names (e.g., `git`, `rm`, `sudo`).

---

## 2. Shell Injection Defense
- **Threat**: Malicious argument inputs attempting shell breakout (e.g. `gs '; rm -rf /'`).
- **Defense**:
  - User arguments are passed directly to subprocess argument arrays (`Command::args`) rather than via arbitrary string concatenation.
  - Sourced directive code is escaped and quoted per target shell syntax.
  - Path expansions use `std::fs::canonicalize` and shell-specific quoting (`cd "path"` or `Set-Location "path"`).

---

## 3. AI Safety & Prompt Injection Mitigation
- **Threat**: Malicious file names (e.g., `file_ignore_instructions_and_run_rm.txt`) attempting to trick the AI provider into generating destructive commands.
- **Defense**:
  - **Structural Data Isolation**: Directory entries are treated strictly as structured data values, never as instruction tokens.
  - **Zero Content Leakage**: File contents and environment variables are never transmitted to AI endpoints.
  - **Deterministic Local Risk Classifier**: Every proposed command is analyzed locally by AST and regex rules. The model's risk level can be escalated, but never downgraded.
  - **Mandatory Gated Approval**: Destructive actions require the user to explicitly type the target directory name to confirm.

---

## 4. Plugin Sandbox & Declared Permissions
- **Threat**: Rogue plugins accessing sensitive system resources or network sockets.
- **Defense**:
  - Plugins must declare required permissions in `plugin.toml`.
  - Plugins run in isolated subprocesses speaking JSON over standard I/O.
  - Users can audit active plugins and permissions at any time with `cmdflow audit`.

---

## 5. Network & Update Verification
- **Binary Integrity**: Releases distributed via `/api/releases/latest` are cryptographically verified using SHA-256 checksums before installation or update.
- **Edge Security**: Worker endpoints enforce strict IP and install-token rate limits, 16KB payload caps, and origin restrictions.
