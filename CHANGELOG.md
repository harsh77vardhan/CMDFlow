# Changelog

All notable changes to the CMDFlow project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.2] - 2026-11-13

### Changed
- **CLI Engine (`cmdflow update`)**:
  - Implemented actual binary download to a secure temporary file (`tempfile::NamedTempFile`) with streaming SHA-256 calculation.
  - Added cryptographically verified SHA-256 checksum matching against `expected_sha256` before reporting success.
  - Added resilient fallback to direct GitHub Releases API and `SHA256SUMS.txt` when the edge proxy is unreachable.
- **Continuous Integration**:
  - Added real PowerShell execution tests on native Windows runner (`pwsh shell/tests/test_powershell.ps1`).
  - Fixed Windows filesystem handle lock issue in PowerShell CI test cleanup.
- **Hygiene & Documentation**:
  - Cleaned unused dependencies in `cli/cmdflow-core/Cargo.toml`.
  - Documented known limitations and platform targets in `README.md`.

---

## [1.0.1] - 2026-11-12

### Added
- **Security & Reliability**:
  - Sourced shell function definitions made alias-expansion safe (`command cmdflow` / `builtin cd`).
  - Added KV-backed rate limiting on Worker endpoints with memory fallback.
  - Standardized `cmdflow settings` command name and retained `cmdflow ui` alias.

---

### Added
- **Core Engine (`cmdflow-core`)**:
  - Layered TOML configuration with schema validation, atomic writes, and `.bak` backups.
  - Command resolution hierarchy: Exact Flow -> Context Rules -> Project Shortcuts -> Alias -> Passthrough.
  - Sub-20ms startup resolution time (benchmarked at ~3-5ms).
  - Protected command safeguarding (`cd`, `rm`, `sudo`, `mv`, `git`, `bash`, `fish`, `pwsh`).
  - Project directory registry with fuzzy matching.
  - Multi-step flow engine with live step streaming and parent directory tracking.
- **Shell Integrations (`shell/`)**:
  - Full directive execution protocol for **Bash**, **Zsh**, **Fish**, and **PowerShell**.
  - Sourced wrapper functions preserving original exit codes (`$?`, `$status`, `$LASTEXITCODE`).
  - Automated, idempotent `cmdflow install` and `cmdflow uninstall` with timestamped rc backups.
  - Comprehensive diagnostic utility (`cmdflow doctor`) detecting PATH shadowing and hooks.
- **Safe AI Command Generation (`cmdflow ask`)**:
  - Structural metadata gathering (zero secrets or file contents ever leaked).
  - Deterministic AST/regex risk classifier with 60+ unit tests.
  - Gated approval protocol enforcing exact target typing for destructive commands.
  - Multi-provider support: Mock, Local Ollama, OpenAI, Anthropic, Gemini, and CMDFlow Cloud.
- **Cloudflare Edge Worker Backend (`src/worker/`)**:
  - High-performance API endpoints: `/api/health`, `/api/releases/latest`, `/api/waitlist`, `/api/ai/command`, `/api/install-token`, `/api/feedback`.
  - D1 database schema and migrations for waitlists and feedback.
  - KV-backed rate limiting and CORS policy.
  - Vitest test suite with 100% test coverage.
- **Embedded Local Settings Console (`settings-ui/`)**:
  - Dedicated Vite + Vanilla TypeScript control panel styled with CMDFlow design tokens.
  - Embedded directly into the Rust static binary via `rust-embed`.
  - Loopback-only server on `127.0.0.1` secured with single-use authentication tokens.
- **Web Showcase & Documentation**:
  - Wired client landing page to live release API, shared starter pack, and waitlist submission.
  - Complete technical documentation suite (`SPEC.md`, `SECURITY.md`, `SHELLS.md`, `FLOWS.md`, `AI.md`, `PLUGINS.md`, `CONTRIBUTING.md`, `DECISIONS.md`).
- **DevOps & Release Pipeline**:
  - Multi-platform GitHub Actions CI matrix (Ubuntu, macOS, Windows).
  - Automated release pipeline building cross-platform static binaries with SHA-256 checksums.
  - Automated sandbox end-to-end verification script (`scripts/e2e.sh`).

---

## [1.0.0-rc1] - 2026-11-12
- Website wiring to `/api/releases/latest` and live waitlist form.
- Shared `starter-pack.json` import between frontend and CLI engine.
- Complete documentation suite and trust audit verification.

## [0.5.0-ui] - 2026-11-12
- Embedded settings UI console compiled and integrated into binary.
- Loopback-only HTTP server with token authentication.

## [0.4.0-backend] - 2026-11-12
- Edge backend API on Cloudflare Worker.
- D1 waitlist database migrations and Vitest unit tests.

## [0.3.0-ai] - 2026-11-12
- Safe AI command generation, mock provider, and 60+ deterministic risk tests.

## [0.2.0-shells] - 2026-11-12
- Shell code generation and directive execution for Bash, Zsh, Fish, and PowerShell.
- Automated installer and sandboxed shell test suites.

## [0.1.0-core] - 2026-11-12
- Core engine, TOML config manager, resolver, and flow runner.
