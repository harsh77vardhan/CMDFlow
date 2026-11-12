# Contributing to CMDFlow (CONTRIBUTING.md)

Thank you for your interest in contributing to CMDFlow!

---

## 1. Development Prerequisites
- **Rust**: 1.80+ (`cargo`, `rustc`, `rustfmt`, `clippy`)
- **Node.js**: v20+ or **Bun**: 1.3+
- **Shells**: Bash, Zsh, Fish (optional: PowerShell)

---

## 2. Repository Layout
- `cli/`: Rust workspace (`cmdflow-core` engine and `cmdflow` binary).
- `shell/`: Shell code generation templates and integration test suites.
- `settings-ui/`: Local settings console (Vite + Vanilla TypeScript).
- `src/worker/`: Cloudflare Worker API backend (`/api/*`).
- `src/client/`: Landing page and web showcase.
- `docs/`: Technical and security documentation.
- `shared/`: Canonical `starter-pack.json` definition.

---

## 3. Running Tests & Verifying Quality Bar
Before submitting code, ensure all test suites pass with zero warnings:

```sh
# Rust core engine and clippy
cd cli
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test --workspace

# Shell integration tests (isolated sandboxes)
cd ../shell/tests
./test_bash.sh
zsh ./test_zsh.sh
fish ./test_fish.fish
./test_powershell_snapshot.sh

# TypeScript typechecks and worker tests
cd ../..
npm run typecheck
npm run test:worker
```

---

## 4. Conventional Commits
All commits must follow Conventional Commits formatting:
- `feat:` for new capabilities
- `fix:` for bug fixes
- `test:` for test additions or fixtures
- `docs:` for documentation updates
- `chore:` for build system and dependency updates
