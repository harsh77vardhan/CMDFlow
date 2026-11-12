# Plugin System Guide (PLUGINS.md)

CMDFlow provides a modular plugin architecture allowing developers to extend the command layer with prompt decorations, notification hooks, and custom external integrations.

---

## 1. Plugin Structure
A plugin can be either a standalone binary (`cmdflow-plugin-<name>`) found on `$PATH` or a directory containing a `plugin.toml`:

```toml
[plugin]
name = "git-branch-prompt"
version = "0.1.0"
author = "CMDFlow Community"
description = "Injects current git branch into shell prompts"

[permissions]
read_git = true
network = false
filesystem = "read-only"

[hooks]
prompt_hook = true
pre_run = false
post_run = false
```

---

## 2. Built-in Example Plugins
1. **`git-branch-prompt`**: Fast, lightweight git branch detection hook for prompt integration without overhead.
2. **`notify-on-long-flow`**: Emits a desktop notification when an automation flow runs for more than 10 seconds.

---

## 3. Security & Auditing
Plugins run as non-elevated subprocesses speaking JSON over standard I/O. Users can inspect declared permissions using `cmdflow audit`.
