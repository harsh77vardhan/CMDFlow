# Automation Flows Guide (FLOWS.md)

CMDFlow Flows allow developers to bundle complex, multi-step command sequences into a single memorable keyword with live progress tracking, conditional execution, directory tracking, and clean failure handling.

---

## 1. Flow Definition Schema

Flows are defined in `config.toml` or in per-project `.cmdflow.toml`:

```toml
[[flows]]
name = "deploy"
description = "Pulls latest code, installs dependencies, runs tests, and builds"

[[flows.steps]]
name = "Pull latest changes"
run = "git pull"

[[flows.steps]]
name = "Install dependencies"
run = "npm install"

[[flows.steps]]
name = "Run tests"
run = "npm test"

[[flows.steps]]
name = "Build project"
run = "npm run build"
```

---

## 2. Advanced Step Options

Each step supports optional control flags:
- `cwd`: Run the step in a specific directory (absolute or relative to current path).
- `env`: Key-value environment variables passed to the child process.
- `when`: Conditional execution based on git repository status, file existence, or OS.
- `continue_on_error`: If true, subsequent steps continue even if this step fails.
- `confirm`: Prompts the user before executing the specific step.
- `retries`: Number of times to retry a failed step before halting.
- `timeout`: Maximum execution duration in seconds.

---

## 3. Directory Tracking in Flows

If a flow step runs `cd <path>`, the engine tracks the final destination and emits a directory directive when the flow completes. The parent shell will be in the target directory after the flow finishes.

---

## 4. Running Flows

```sh
# Execute flow
cmdflow flow run deploy
# Or directly via the generated alias
deploy

# Dry run (previews steps without execution)
cmdflow flow run deploy --dry-run
```
