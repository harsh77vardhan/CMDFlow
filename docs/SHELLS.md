# Shell Integration Guide (SHELLS.md)

CMDFlow supports four major shells across Linux, macOS, and Windows: **Bash, Zsh, Fish, and PowerShell**.

---

## 1. How It Works
Because child processes cannot mutate their parent shell's working directory or environment variables, CMDFlow employs a zoxide-style directive architecture:

1. The shell sources `eval "$(cmdflow init <shell>)"` during startup.
2. Sourced wrapper functions intercept invocations of configured aliases, projects, and flows.
3. The wrapper calls `cmdflow __run <shell> --directive-file <file> -- <name> [args...]`.
4. Human output is displayed on standard error/TTY.
5. Directory transitions (`cd` / `Set-Location`) and environment changes are written to the temporary directive file and evaluated directly in the host shell.
6. The directive file is immediately deleted, and the exit status (`$?`, `$status`, `$LASTEXITCODE`) is returned.

---

## 2. Shell Configuration Quick Reference

### Bash (`~/.bashrc`)
```bash
# >>> cmdflow init >>>
eval "$(cmdflow init bash)"
# <<< cmdflow init <<<
```

### Zsh (`~/.zshrc`)
```zsh
# >>> cmdflow init >>>
eval "$(cmdflow init zsh)"
# <<< cmdflow init <<<
```

### Fish (`~/.config/fish/config.fish`)
```fish
# >>> cmdflow init >>>
eval (cmdflow init fish | string collect)
# <<< cmdflow init <<<
```

### PowerShell (`$PROFILE`)
```powershell
# >>> cmdflow init >>>
Invoke-Expression (& cmdflow.exe init powershell | Out-String)
# <<< cmdflow init <<<
```

---

## 3. Automated Installation & Removal
- **Install**: Run `cmdflow install`. It detects all installed shells, creates a timestamped backup of your existing rc files, and appends the marked block.
- **Uninstall**: Run `cmdflow uninstall`. It cleanly removes the marked block and restores original configuration files.
- **Verify**: Run `cmdflow doctor` to inspect PATH status, shadowing warnings, and shell hooks.
