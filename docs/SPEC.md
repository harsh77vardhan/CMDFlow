# CMDFlow Technical Specification (SPEC.md)

## 1. Overview
CMDFlow is an ergonomic command layer designed to sit transparently on top of standard shells: **Fish, Bash, Zsh, and PowerShell**. It replaces cumbersome, hard-to-remember commands with brief, intuitive shorthands, context-sensitive mappings, project bookmarks, and multi-step automation flows.

## 2. Core Components
- **CLI (`cmdflow`)**: Single static native binary compiled with Rust. Sub-20ms resolution latency.
- **Library (`cmdflow-core`)**: Configuration parser, template engine, directive emitter, deterministic risk classifier, and flow executor.
- **Shell Integrations (`shell/`)**: Thin sourced wrapper functions that invoke `cmdflow __run <shell>` and interpret directives in the host shell environment.
- **Settings Console (`settings-ui/`)**: Embedded local web interface served over loopback (`127.0.0.1`) with single-use authentication tokens.
- **Edge Backend (`src/worker/`)**: Cloudflare Worker providing release distribution, waitlist enrollment, and optional AI command proxying.

## 3. Configuration Layering
Config is resolved hierarchically:
1. **Global configuration**: `~/.config/cmdflow/config.toml` (or `%APPDATA%\cmdflow\config.toml` on Windows).
2. **Profile overlay**: `profiles.<active_profile>` defined in config.
3. **Project overlay**: `.cmdflow.toml` discovered by walking up from the current working directory (requires `cmdflow trust` confirmation).

## 4. Protected Commands
The following command names are protected and cannot be shadowed without the `--force` flag:
`cd`, `rm`, `sudo`, `mv`, `cp`, `ssh`, `git`, `sh`, `bash`, `zsh`, `fish`, `pwsh`, `powershell`, `cmdflow`, `cf`, `flow`.

## 5. Exit Codes & Shell Protocol
All shell wrappers preserve original command exit statuses (`$?`, `$status`, `$LASTEXITCODE`).
Directives are communicated through a temporary single-invocation directive file or stdout channel to guarantee parent process directory mutation.
