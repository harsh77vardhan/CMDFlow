# Architectural & Engineering Decisions (DECISIONS.md)

This log records architectural decisions, engineering trade-offs, and rationale made during the development of CMDFlow.

---

### DECISION-001: Monorepo Structure & Coexistence with Showcase Site
- **Context**: The existing repo contained a landing page (`src/client`, `src/worker`, `index.html`, `vite.config.ts`).
- **Decision**: Preserve all existing client files in-place and establish a structured monorepo:
  - `cli/`: Rust workspace (`cmdflow-core` engine and `cmdflow` binary).
  - `shell/`: Shell templates and integration tests.
  - `settings-ui/`: Embedded local web settings panel (Vite + TS).
  - `shared/`: Single source of truth for starter pack configurations (`starter-pack.json`).
  - `docs/`: Comprehensive engineering and security documentation.
  - `scripts/`: Installers, test runners, and release scripts.
  - `.github/workflows/`: CI and automated release pipelines.
- **Rationale**: Clean separation of concerns while enabling direct asset sharing between the landing page and CLI engine.

---

### DECISION-002: Shell Directive Protocol (Zoxide-Style Execution)
- **Context**: A child subprocess cannot modify its parent shell's current working directory (`cd`) or environment variables.
- **Decision**: Sourced shell functions invoke `cmdflow __run <shell> -- <args>`. All human-readable feedback streams to `stderr` / TTY, while executable shell directives (e.g. `cd "/path"`, `export FOO="bar"`, or `Set-Location` on PowerShell) are output to a dedicated directive channel (either stdout or a temp file evaluated by the shell wrapper).
- **Rationale**: Ensures deterministic, fast (<20ms) execution without subshell escapes or dirty parent process tampering, compatible across Bash, Zsh, Fish, and PowerShell.

---

### DECISION-003: Single Source of Truth for Starter Pack (`shared/starter-pack.json`)
- **Context**: The landing page interactive demo and the CLI engine must present identical shortcuts and expansions without drift.
- **Decision**: Define all default aliases, projects, and flows in `shared/starter-pack.json`. Both the Rust CLI binary (via `include_str!`) and the client website import this single schema.
- **Rationale**: Prevents divergence between documentation/marketing and the actual runtime behavior.

---

### DECISION-004: Deterministic Local Risk Classifier
- **Context**: AI models might occasionally misjudge the destructive risk of complex commands.
- **Decision**: The local Rust risk classifier inspects proposed shell commands using deterministic pattern matching and AST heuristics. It can **escalate** a model's risk rating (e.g., from `safe` to `destructive`), but can **never downgrade** it. Commands classified as `destructive` require the user to explicitly type the target directory or file name to confirm execution.
- **Rationale**: Guarantees zero unintentional data loss even if an external LLM hallucinates safety.

---

### DECISION-005: Sandboxed Testing Policy
- **Context**: Testing shell initialization and commands could contaminate the host developer environment (`~/.bashrc`, `~/.config/fish`, etc.).
- **Decision**: All tests during development and CI operate strictly within temporary directories overriding `$HOME`, `$XDG_CONFIG_HOME`, and `$APPDATA`. Real user config files are never modified except during an explicit `cmdflow install` invoked by the end-user.
- **Rationale**: Total safety and isolation for developer and test runs.

---

### DECISION-006: Embedded Settings Server Security
- **Context**: `cmdflow settings` launches a local web UI.
- **Decision**: The local server binds exclusively to `127.0.0.1` on a dynamically assigned OS port. Access requires a cryptographically random, single-use token in the query string. The server enforces strict CORS, origin validation, and automatic shutdown after 15 minutes of inactivity.
- **Rationale**: Prevents cross-site request forgery and unauthorized local inspection.
