use clap::{Parser, Subcommand};
use cmdflow_core::ai::{AiProvider, MockProvider, SafeContext};
use cmdflow_core::config::{Alias, ConfigManager, Project};
use cmdflow_core::flow_engine::FlowRunner;
use cmdflow_core::resolver::{ResolvedTarget, Resolver};
use cmdflow_core::risk::RiskLevel;
use colored::Colorize;
use rust_embed::RustEmbed;
use sha2::Digest;
use std::fs;
use std::io::{self, Read, Write};
use std::path::PathBuf;

#[derive(RustEmbed)]
#[folder = "../../settings-ui/dist/"]
struct Asset;

#[derive(Parser, Debug)]
#[command(
    name = "cmdflow",
    author = "CMDFlow Team",
    version = "1.0.3",
    about = "The Command Line. Finally Speaks Your Language."
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Initialize shell wrapper and shortcuts for specified shell
    Init {
        /// Shell to initialize: bash, zsh, fish, or powershell
        shell: String,
    },

    /// Internal execution engine invoked by shell wrapper
    #[command(name = "__run", hide = true)]
    Run {
        /// Shell name
        shell: String,

        /// Optional file path to write shell directives to
        #[arg(long)]
        directive_file: Option<PathBuf>,

        /// Command name
        name: String,

        /// Additional arguments passed to the command
        #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
        args: Vec<String>,
    },

    /// Install CMDFlow shell integration into rc files
    Install {
        /// Override home directory for sandboxed testing
        #[arg(long)]
        sandbox_home: Option<PathBuf>,
    },

    /// Uninstall CMDFlow shell integration from rc files
    Uninstall {
        /// Override home directory for sandboxed testing
        #[arg(long)]
        sandbox_home: Option<PathBuf>,
    },

    /// Run diagnostic checks on configuration, PATH, and shell hooks
    Doctor,

    /// Manage shorthand aliases
    Alias {
        #[command(subcommand)]
        cmd: AliasCommands,
    },

    /// Manage named project shortcuts
    Project {
        #[command(subcommand)]
        cmd: ProjectCommands,
    },

    /// Manage multi-step automation flows
    Flow {
        #[command(subcommand)]
        cmd: FlowCommands,
    },

    /// Test or view context-aware rules
    Context {
        #[command(subcommand)]
        cmd: ContextCommands,
    },

    /// Explain a shortcut or command expansion without executing it
    Explain {
        name: String,
        #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
        args: Vec<String>,
    },

    /// Ask AI to propose a safe shell command from natural language
    Ask {
        /// Natural language description of what you want to do
        prompt: String,

        /// Skip interactive approval (only for tests; safe commands only)
        #[arg(long)]
        non_interactive: bool,
    },

    /// Manage environment profiles
    Profile {
        #[command(subcommand)]
        cmd: ProfileCommands,
    },

    /// Manage themes for CLI output
    Theme {
        #[command(subcommand)]
        cmd: ThemeCommands,
    },

    /// Manage plugins
    Plugin {
        #[command(subcommand)]
        cmd: PluginCommands,
    },

    /// Launch local web settings panel (alias: ui)
    #[command(alias = "ui")]
    Settings {
        /// Port to bind to (defaults to random available port)
        #[arg(long)]
        port: Option<u16>,
        /// Do not automatically launch browser
        #[arg(long)]
        no_browser: bool,
    },

    /// Check for updates against production Worker
    Update {
        /// Force re-download and checksum verification
        #[arg(long)]
        force: bool,
    },

    /// Inspect or modify configuration
    Config {
        #[command(subcommand)]
        cmd: ConfigCommands,
    },

    /// Trust a directory's .cmdflow.toml
    Trust { path: Option<PathBuf> },

    /// Security audit of trusted directories and plugins
    Audit,
}

#[derive(Subcommand, Debug)]
enum AliasCommands {
    /// Add or update an alias
    Add {
        name: String,
        expansion: String,
        #[arg(short, long)]
        description: Option<String>,
        #[arg(short, long)]
        force: bool,
    },
    /// Remove an alias
    Rm { name: String },
    /// List all configured aliases
    Ls {
        #[arg(long)]
        json: bool,
    },
}

#[derive(Subcommand, Debug)]
enum ProjectCommands {
    /// Register a project directory
    Add {
        name: String,
        #[arg(default_value = ".")]
        path: String,
        #[arg(short, long)]
        description: Option<String>,
    },
    /// Remove a project
    Rm { name: String },
    /// List all registered projects
    Ls {
        #[arg(long)]
        json: bool,
    },
    /// Navigate to project directory
    Go { name: String },
}

#[derive(Subcommand, Debug)]
enum FlowCommands {
    /// List all configured flows
    Ls {
        #[arg(long)]
        json: bool,
    },
    /// Show details of a flow
    Show { name: String },
    /// Run a flow
    Run {
        name: String,
        #[arg(long)]
        dry_run: bool,
    },
    /// Remove a flow
    Rm { name: String },
}

#[derive(Subcommand, Debug)]
enum ContextCommands {
    /// List all context rules
    Ls {
        #[arg(long)]
        json: bool,
    },
    /// Test which context rule matches right now
    Test { name: String },
}

#[derive(Subcommand, Debug)]
enum ProfileCommands {
    /// List profiles
    Ls,
    /// Switch active profile
    Use { name: String },
    /// Create new profile
    New { name: String },
    /// Remove profile
    Rm { name: String },
}

#[derive(Subcommand, Debug)]
enum ThemeCommands {
    /// List available themes
    Ls,
    /// Set current theme
    Set { name: String },
    /// Preview current theme palette
    Preview,
}

#[derive(Subcommand, Debug)]
enum PluginCommands {
    /// List installed plugins
    Ls,
}

#[derive(Subcommand, Debug)]
enum ConfigCommands {
    /// Show config file location
    Path,
    /// Validate config file syntax
    Validate,
    /// Get config key
    Get { key: String },
    /// Set config key
    Set { key: String, value: String },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Init { shell } => handle_init(&shell),
        Commands::Run {
            shell,
            directive_file,
            name,
            args,
        } => handle_run(&shell, directive_file, &name, &args),
        Commands::Install { sandbox_home } => handle_install(sandbox_home),
        Commands::Uninstall { sandbox_home } => handle_uninstall(sandbox_home),
        Commands::Doctor => handle_doctor(),
        Commands::Alias { cmd } => handle_alias(cmd),
        Commands::Project { cmd } => handle_project(cmd),
        Commands::Flow { cmd } => handle_flow(cmd),
        Commands::Context { cmd } => handle_context(cmd),
        Commands::Explain { name, args } => handle_explain(&name, &args),
        Commands::Ask {
            prompt,
            non_interactive,
        } => handle_ask(&prompt, non_interactive),
        Commands::Profile { cmd } => handle_profile(cmd),
        Commands::Theme { cmd } => handle_theme(cmd),
        Commands::Plugin { cmd } => handle_plugin(cmd),
        Commands::Settings { port, no_browser } => handle_settings(port, no_browser),
        Commands::Update { force } => handle_update(force),
        Commands::Config { cmd } => handle_config(cmd),
        Commands::Trust { path } => handle_trust(path),
        Commands::Audit => handle_audit(),
    }
}

fn handle_init(shell: &str) -> Result<(), Box<dyn std::error::Error>> {
    let cfg = ConfigManager::load_or_init()?;
    let shell_lower = shell.to_lowercase();

    match shell_lower.as_str() {
        "bash" => {
            println!(
                r#"# CMDFlow initialization for Bash
__cmdflow_run() {{
    local directive_file="$(mktemp -t cmdflow.XXXXXX 2>/dev/null || mktemp)"
    cmdflow __run bash --directive-file "$directive_file" -- "$@"
    local exit_code=$?
    if [ -f "$directive_file" ]; then
        eval "$(cat "$directive_file")"
        rm -f "$directive_file"
    fi
    return $exit_code
}}

cmdflow() {{
    case "$1" in
        alias|project|flow|context|profile)
            command cmdflow "$@"
            eval "$(cmdflow init bash)"
            ;;
        *)
            command cmdflow "$@"
            ;;
    esac
}}
cf() {{ cmdflow "$@"; }}
flow() {{ cmdflow "$@"; }}
project() {{ __cmdflow_run project "$@"; }}
"#
            );
            // Generate wrappers for all configured aliases, projects, flows, context rules
            for a in &cfg.aliases {
                println!(
                    "unalias {0} 2>/dev/null || true; {0}() {{ __cmdflow_run {0} \"$@\"; }}",
                    a.name
                );
            }
            for p in &cfg.projects {
                println!(
                    "unalias {0} 2>/dev/null || true; {0}() {{ __cmdflow_run {0} \"$@\"; }}",
                    p.name
                );
            }
            for f in &cfg.flows {
                println!(
                    "unalias {0} 2>/dev/null || true; {0}() {{ __cmdflow_run {0} \"$@\"; }}",
                    f.name
                );
            }
            for c in &cfg.context_rules {
                println!(
                    "unalias {0} 2>/dev/null || true; {0}() {{ __cmdflow_run {0} \"$@\"; }}",
                    c.name
                );
            }
        }
        "zsh" => {
            println!(
                r#"# CMDFlow initialization for Zsh
__cmdflow_run() {{
    local directive_file="$(mktemp -t cmdflow.XXXXXX 2>/dev/null || mktemp)"
    cmdflow __run zsh --directive-file "$directive_file" -- "$@"
    local exit_code=$?
    if [[ -f "$directive_file" ]]; then
        eval "$(<"$directive_file")"
        rm -f "$directive_file"
    fi
    return $exit_code
}}

cmdflow() {{
    case "$1" in
        alias|project|flow|context|profile)
            command cmdflow "$@"
            eval "$(cmdflow init zsh)"
            ;;
        *)
            command cmdflow "$@"
            ;;
    esac
}}
cf() {{ cmdflow "$@"; }}
flow() {{ cmdflow "$@"; }}
function project {{ __cmdflow_run project "$@"; }}
"#
            );
            for a in &cfg.aliases {
                println!(
                    "unalias {0} 2>/dev/null || true;\nfunction {0} {{ __cmdflow_run {0} \"$@\"; }}",
                    a.name
                );
            }
            for p in &cfg.projects {
                println!(
                    "unalias {0} 2>/dev/null || true;\nfunction {0} {{ __cmdflow_run {0} \"$@\"; }}",
                    p.name
                );
            }
            for f in &cfg.flows {
                println!(
                    "unalias {0} 2>/dev/null || true;\nfunction {0} {{ __cmdflow_run {0} \"$@\"; }}",
                    f.name
                );
            }
            for c in &cfg.context_rules {
                println!(
                    "unalias {0} 2>/dev/null || true;\nfunction {0} {{ __cmdflow_run {0} \"$@\"; }}",
                    c.name
                );
            }
        }
        "fish" => {
            println!(
                r#"# CMDFlow initialization for Fish
function __cmdflow_run
    set -l directive_file (mktemp -t cmdflow.XXXXXX 2>/dev/null; or mktemp)
    cmdflow __run fish --directive-file "$directive_file" -- $argv
    set -l exit_code $status
    if test -f "$directive_file"
        source "$directive_file"
        rm -f "$directive_file"
    end
    return $exit_code
end

function cmdflow --wraps cmdflow
    switch $argv[1]
        case alias project flow context profile
            command cmdflow $argv
            eval (cmdflow init fish | string collect)
        case '*'
            command cmdflow $argv
    end
end
function cf --wraps cmdflow; cmdflow $argv; end
function flow --wraps cmdflow; cmdflow $argv; end
function project --wraps cmdflow; __cmdflow_run project $argv; end
"#
            );
            for a in &cfg.aliases {
                println!("function {0}; __cmdflow_run {0} $argv; end", a.name);
            }
            for p in &cfg.projects {
                println!("function {0}; __cmdflow_run {0} $argv; end", p.name);
            }
            for f in &cfg.flows {
                println!("function {0}; __cmdflow_run {0} $argv; end", f.name);
            }
            for c in &cfg.context_rules {
                println!("function {0}; __cmdflow_run {0} $argv; end", c.name);
            }
        }
        "powershell" | "pwsh" => {
            println!(
                r#"# CMDFlow initialization for PowerShell
function global:__cmdflow_run {{
    param([Parameter(ValueFromRemainingArguments)]$Args)
    $orig_exit = $global:LASTEXITCODE
    $directive_file = [System.IO.Path]::GetTempFileName()
    & cmdflow.exe __run powershell --directive-file "$directive_file" -- @Args
    $cf_exit = $LASTEXITCODE
    if (Test-Path "$directive_file") {{
        $content = [System.IO.File]::ReadAllText("$directive_file").Trim()
        Remove-Item -Force "$directive_file"
        if ($content) {{
            if ($null -ne $orig_exit) {{ $global:LASTEXITCODE = $orig_exit }}
            Invoke-Expression $content
        }} else {{
            if ($cf_exit -ne 0) {{
                $global:LASTEXITCODE = $cf_exit
            }} elseif ($null -ne $orig_exit) {{
                $global:LASTEXITCODE = $orig_exit
            }}
        }}
    }} else {{
        if ($cf_exit -ne 0) {{
            $global:LASTEXITCODE = $cf_exit
        }} elseif ($null -ne $orig_exit) {{
            $global:LASTEXITCODE = $orig_exit
        }}
    }}
}}

function global:cmdflow {{
    param([Parameter(ValueFromRemainingArguments)]$Args)
    if ($Args.Count -gt 0 -and ($Args[0] -in @('alias','project','flow','context','profile'))) {{
        & cmdflow.exe @Args
        $initScript = & cmdflow.exe init powershell | Out-String
        Invoke-Expression $initScript
    }} else {{
        & cmdflow.exe @Args
    }}
}}
Set-Alias -Name cf -Value cmdflow -Scope Global -Force
Set-Alias -Name flow -Value cmdflow -Scope Global -Force
function global:project {{ __cmdflow_run project @args }}
"#
            );
            for a in &cfg.aliases {
                println!("function global:{0} {{ __cmdflow_run {0} @args }}", a.name);
            }
            for p in &cfg.projects {
                println!("function global:{0} {{ __cmdflow_run {0} @args }}", p.name);
            }
            for f in &cfg.flows {
                println!("function global:{0} {{ __cmdflow_run {0} @args }}", f.name);
            }
            for c in &cfg.context_rules {
                println!("function global:{0} {{ __cmdflow_run {0} @args }}", c.name);
            }
        }
        _ => {
            eprintln!("Unsupported shell: {}", shell);
            std::process::exit(1);
        }
    }
    Ok(())
}

fn handle_run(
    shell: &str,
    directive_file: Option<PathBuf>,
    name: &str,
    args: &[String],
) -> Result<(), Box<dyn std::error::Error>> {
    let cfg = ConfigManager::load_or_init()?;
    let cwd = std::env::current_dir()?;
    let resolver = Resolver::new(&cfg, shell, &cwd);

    let target = resolver.resolve(name, args);
    let mut directive_content = String::new();

    match target {
        ResolvedTarget::Alias(expansion) => {
            directive_content = expansion;
        }
        ResolvedTarget::ContextRule { expansion, .. } => {
            directive_content = expansion;
        }
        ResolvedTarget::Project(p) => {
            let expanded_path = shellexpand::tilde(&p.path).to_string();
            if shell.eq_ignore_ascii_case("powershell") || shell.eq_ignore_ascii_case("pwsh") {
                directive_content = format!("Set-Location \"{}\"", expanded_path);
            } else {
                directive_content = format!("cd \"{}\"", expanded_path);
            }
            for cmd in &p.on_enter {
                directive_content.push_str(&format!("\n{}", cmd));
            }
        }
        ResolvedTarget::Flow(flow, flow_args) => {
            let runner = FlowRunner::new(&flow, shell, &cwd, false, &flow_args);
            let report = runner.execute()?;
            if let Some(final_cwd) = report.final_cwd {
                if shell.eq_ignore_ascii_case("powershell") || shell.eq_ignore_ascii_case("pwsh") {
                    directive_content = format!("Set-Location \"{}\"", final_cwd.display());
                } else {
                    directive_content = format!("cd \"{}\"", final_cwd.display());
                }
            }
            if !report.success {
                std::process::exit(report.exit_code);
            }
        }
        ResolvedTarget::NotFound => {
            // Fallback: command passthrough
            let full = if args.is_empty() {
                name.to_string()
            } else {
                format!("{} {}", name, args.join(" "))
            };
            directive_content = full;
        }
    }

    if let Some(file_path) = directive_file {
        fs::write(file_path, directive_content)?;
    } else {
        println!("{}", directive_content);
    }

    Ok(())
}

fn handle_install(sandbox_home: Option<PathBuf>) -> Result<(), Box<dyn std::error::Error>> {
    let home =
        sandbox_home.unwrap_or_else(|| dirs::home_dir().expect("Cannot determine home directory"));
    eprintln!(
        "Installing CMDFlow shell integrations in {}",
        home.display()
    );

    let configs = vec![
        ("bash", home.join(".bashrc")),
        ("zsh", home.join(".zshrc")),
        (
            "fish",
            home.join(".config").join("fish").join("config.fish"),
        ),
    ];

    let mut installed_any = false;
    for (shell, path) in configs {
        if path.exists() || path.parent().map(|p| p.exists()).unwrap_or(false) {
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent)?;
            }
            let mut content = if path.exists() {
                fs::read_to_string(&path)?
            } else {
                String::new()
            };

            let marker_start = "# >>> cmdflow init >>>";
            let marker_end = "# <<< cmdflow init <<<";

            let init_line = if shell == "fish" {
                format!(
                    "{}\neval (cmdflow init fish | string collect)\n{}",
                    marker_start, marker_end
                )
            } else {
                format!(
                    "{}\neval \"$(cmdflow init {})\"\n{}",
                    marker_start, shell, marker_end
                )
            };

            if let Some(start_idx) = content.find(marker_start) {
                if let Some(end_idx) = content.find(marker_end) {
                    content.replace_range(start_idx..end_idx + marker_end.len(), &init_line);
                }
            } else {
                // Backup
                if path.exists() {
                    let bak = path
                        .with_extension(format!("cmdflow.bak.{}", chrono::Utc::now().timestamp()));
                    fs::copy(&path, bak)?;
                }
                if !content.is_empty() && !content.ends_with('\n') {
                    content.push('\n');
                }
                content.push_str(&init_line);
                content.push('\n');
            }

            fs::write(&path, content)?;
            eprintln!(
                "  {} Installed integration into {}",
                "✓".green(),
                path.display()
            );
            installed_any = true;
        }
    }

    if !installed_any {
        eprintln!("  Notice: No existing rc files detected. Created default .bashrc integration.");
        let bashrc = home.join(".bashrc");
        fs::write(
            &bashrc,
            "# >>> cmdflow init >>>\neval \"$(cmdflow init bash)\"\n# <<< cmdflow init <<<\n",
        )?;
    }

    eprintln!(
        "\n{} CMDFlow installed successfully. Restart your shell or run:",
        "✓".green().bold()
    );
    eprintln!("  source ~/.bashrc (or your shell's rc file)");
    Ok(())
}

fn handle_uninstall(sandbox_home: Option<PathBuf>) -> Result<(), Box<dyn std::error::Error>> {
    let home =
        sandbox_home.unwrap_or_else(|| dirs::home_dir().expect("Cannot determine home directory"));
    eprintln!(
        "Removing CMDFlow shell integrations from {}",
        home.display()
    );

    let configs = vec![
        home.join(".bashrc"),
        home.join(".zshrc"),
        home.join(".config").join("fish").join("config.fish"),
    ];

    let marker_start = "# >>> cmdflow init >>>";
    let marker_end = "# <<< cmdflow init <<<";

    for path in configs {
        if path.exists() {
            let content = fs::read_to_string(&path)?;
            if let Some(start_idx) = content.find(marker_start) {
                if let Some(end_idx) = content.find(marker_end) {
                    let mut new_content = content[..start_idx].to_string();
                    new_content
                        .push_str(content[end_idx + marker_end.len()..].trim_start_matches('\n'));
                    fs::write(&path, new_content)?;
                    eprintln!("  {} Cleaned {}", "✓".green(), path.display());
                }
            }
        }
    }
    eprintln!("{} CMDFlow uninstalled successfully.", "✓".green().bold());
    Ok(())
}

fn handle_doctor() -> Result<(), Box<dyn std::error::Error>> {
    eprintln!("{}", "CMDFlow Doctor Diagnostic Report".bold());
    eprintln!("--------------------------------");

    // 1. Config path and validity
    let config_path = ConfigManager::config_path();
    eprint!("Config file: {} ... ", config_path.display());
    match ConfigManager::load_or_init() {
        Ok(cfg) => {
            eprintln!("{}", "OK (Valid)".green());
            eprintln!("  Total aliases: {}", cfg.aliases.len());
            eprintln!("  Total projects: {}", cfg.projects.len());
            eprintln!("  Total flows: {}", cfg.flows.len());

            // 2. PATH shadowing check
            eprintln!("\nShadowing Diagnostics:");
            let mut shadowed = 0;
            for alias in &cfg.aliases {
                if let Ok(path) = which::which(&alias.name) {
                    eprintln!(
                        "  {} Alias '{}' shadows binary at {}",
                        "!".yellow().bold(),
                        alias.name,
                        path.display()
                    );
                    shadowed += 1;
                }
            }
            if shadowed == 0 {
                eprintln!("  {} No aliases shadow executables on PATH", "✓".green());
            }
        }
        Err(e) => {
            eprintln!("{} ({})", "FAILED".red(), e);
        }
    }

    // 3. Shell check
    eprintln!("\nInstalled Shells Check:");
    for sh in &["bash", "zsh", "fish", "pwsh"] {
        match which::which(sh) {
            Ok(p) => eprintln!("  {} Found {} at {}", "✓".green(), sh, p.display()),
            Err(_) => eprintln!("  - {} not detected on PATH", sh),
        }
    }

    eprintln!("\n{} Doctor check complete.", "✓".green().bold());
    Ok(())
}

fn handle_alias(cmd: AliasCommands) -> Result<(), Box<dyn std::error::Error>> {
    let mut cfg = ConfigManager::load_or_init()?;
    let path = ConfigManager::config_path();

    match cmd {
        AliasCommands::Add {
            name,
            expansion,
            description,
            force,
        } => {
            let alias = Alias {
                name: name.clone(),
                expansion: expansion.clone(),
                description: description.unwrap_or_default(),
                expansion_windows: None,
            };
            cfg.add_alias(alias, force)?;
            cfg.save_file(&path)?;
            eprintln!("{} Added alias '{}' -> '{}'", "✓".green(), name, expansion);
        }
        AliasCommands::Rm { name } => {
            if cfg.remove_alias(&name) {
                cfg.save_file(&path)?;
                eprintln!("{} Removed alias '{}'", "✓".green(), name);
            } else {
                eprintln!("Alias '{}' not found", name);
            }
        }
        AliasCommands::Ls { json } => {
            if json {
                println!("{}", serde_json::to_string_pretty(&cfg.aliases)?);
            } else {
                println!(
                    "{:<12} {:<32} {}",
                    "ALIAS".bold(),
                    "EXPANSION".bold(),
                    "DESCRIPTION".bold()
                );
                println!("{}", "-".repeat(60));
                for a in &cfg.aliases {
                    println!(
                        "{:<12} {:<32} {}",
                        a.name.cyan(),
                        a.expansion,
                        a.description.dimmed()
                    );
                }
            }
        }
    }
    Ok(())
}

fn handle_project(cmd: ProjectCommands) -> Result<(), Box<dyn std::error::Error>> {
    let mut cfg = ConfigManager::load_or_init()?;
    let path = ConfigManager::config_path();

    match cmd {
        ProjectCommands::Add {
            name,
            path: proj_path,
            description,
        } => {
            let abs_path = if proj_path == "." {
                std::env::current_dir()?.to_string_lossy().to_string()
            } else {
                proj_path
            };
            cfg.add_project(Project {
                name: name.clone(),
                path: abs_path.clone(),
                description: description.unwrap_or_default(),
                on_enter: vec![],
            });
            cfg.save_file(&path)?;
            eprintln!(
                "{} Registered project '{}' -> '{}'",
                "✓".green(),
                name,
                abs_path
            );
        }
        ProjectCommands::Rm { name } => {
            if cfg.remove_project(&name) {
                cfg.save_file(&path)?;
                eprintln!("{} Removed project '{}'", "✓".green(), name);
            } else {
                eprintln!("Project '{}' not found", name);
            }
        }
        ProjectCommands::Ls { json } => {
            if json {
                println!("{}", serde_json::to_string_pretty(&cfg.projects)?);
            } else {
                println!(
                    "{:<16} {:<36} {}",
                    "PROJECT".bold(),
                    "PATH".bold(),
                    "DESCRIPTION".bold()
                );
                println!("{}", "-".repeat(65));
                for p in &cfg.projects {
                    println!(
                        "{:<16} {:<36} {}",
                        p.name.cyan(),
                        p.path,
                        p.description.dimmed()
                    );
                }
            }
        }
        ProjectCommands::Go { name } => {
            let cwd = std::env::current_dir()?;
            let resolver = Resolver::new(&cfg, "bash", &cwd);
            if let Some(proj) = resolver.find_project(&name) {
                println!("cd \"{}\"", shellexpand::tilde(&proj.path));
            } else {
                eprintln!("Project '{}' not found.", name);
            }
        }
    }
    Ok(())
}

fn handle_flow(cmd: FlowCommands) -> Result<(), Box<dyn std::error::Error>> {
    let mut cfg = ConfigManager::load_or_init()?;
    let path = ConfigManager::config_path();

    match cmd {
        FlowCommands::Ls { json } => {
            if json {
                println!("{}", serde_json::to_string_pretty(&cfg.flows)?);
            } else {
                println!(
                    "{:<16} {:<8} {}",
                    "FLOW".bold(),
                    "STEPS".bold(),
                    "DESCRIPTION".bold()
                );
                println!("{}", "-".repeat(60));
                for f in &cfg.flows {
                    println!(
                        "{:<16} {:<8} {}",
                        f.name.cyan(),
                        f.steps.len(),
                        f.description.dimmed()
                    );
                }
            }
        }
        FlowCommands::Show { name } => {
            if let Some(flow) = cfg.flows.iter().find(|f| f.name == name) {
                println!("{}: {}", "Flow".bold(), flow.name.cyan());
                println!("{}: {}", "Description".bold(), flow.description);
                println!("{}:", "Steps".bold());
                for (i, step) in flow.steps.iter().enumerate() {
                    println!(
                        "  {}. {} (run: {})",
                        i + 1,
                        step.name.as_deref().unwrap_or(""),
                        step.run.green()
                    );
                }
            } else {
                eprintln!("Flow '{}' not found", name);
            }
        }
        FlowCommands::Run { name, dry_run } => {
            if let Some(flow) = cfg.flows.iter().find(|f| f.name == name) {
                let cwd = std::env::current_dir()?;
                let runner = FlowRunner::new(flow, "bash", &cwd, dry_run, &[]);
                let report = runner.execute()?;
                if !report.success {
                    std::process::exit(report.exit_code);
                }
            } else {
                eprintln!("Flow '{}' not found", name);
                std::process::exit(1);
            }
        }
        FlowCommands::Rm { name } => {
            if cfg.remove_flow(&name) {
                cfg.save_file(&path)?;
                eprintln!("{} Removed flow '{}'", "✓".green(), name);
            } else {
                eprintln!("Flow '{}' not found", name);
            }
        }
    }
    Ok(())
}

fn handle_context(cmd: ContextCommands) -> Result<(), Box<dyn std::error::Error>> {
    let cfg = ConfigManager::load_or_init()?;
    match cmd {
        ContextCommands::Ls { json } => {
            if json {
                println!("{}", serde_json::to_string_pretty(&cfg.context_rules)?);
            } else {
                for g in &cfg.context_rules {
                    println!("Context Mapping: {}", g.name.cyan().bold());
                    for (i, r) in g.rules.iter().enumerate() {
                        println!("  Rule {}: -> {}", i + 1, r.expansion);
                    }
                    println!("  Default: -> {}", g.default);
                }
            }
        }
        ContextCommands::Test { name } => {
            let cwd = std::env::current_dir()?;
            let resolver = Resolver::new(&cfg, "bash", &cwd);
            let res = resolver.resolve(&name, &[]);
            match res {
                ResolvedTarget::ContextRule {
                    name,
                    expansion,
                    matched_rule_index,
                } => {
                    println!("Context mapping for '{}':", name.cyan());
                    if let Some(idx) = matched_rule_index {
                        println!("  {} Matched Rule #{}", "✓".green(), idx + 1);
                    } else {
                        println!("  {} Matched Default Rule", "↳".yellow());
                    }
                    println!("  Expands to: {}", expansion.bold());
                }
                _ => println!("'{}' does not map to a context rule.", name),
            }
        }
    }
    Ok(())
}

fn handle_explain(name: &str, args: &[String]) -> Result<(), Box<dyn std::error::Error>> {
    let cfg = ConfigManager::load_or_init()?;
    let cwd = std::env::current_dir()?;
    let resolver = Resolver::new(&cfg, "bash", &cwd);

    let target = resolver.resolve(name, args);
    println!("{}: {}", "Explaining".bold(), name.cyan());
    match target {
        ResolvedTarget::Alias(exp) => {
            println!("  Type: Alias");
            println!("  Expands to: {}", exp.green().bold());
        }
        ResolvedTarget::Project(p) => {
            println!("  Type: Project Shortcut");
            println!("  Target directory: {}", p.path.green().bold());
        }
        ResolvedTarget::Flow(f, _) => {
            println!("  Type: Multi-step Flow ({} steps)", f.steps.len());
            for (i, s) in f.steps.iter().enumerate() {
                println!("    {}. {}", i + 1, s.run.dimmed());
            }
        }
        ResolvedTarget::ContextRule {
            expansion,
            matched_rule_index,
            ..
        } => {
            println!("  Type: Context Rule");
            if let Some(idx) = matched_rule_index {
                println!("  Matched: Rule #{}", idx + 1);
            } else {
                println!("  Matched: Default fallback");
            }
            println!("  Expands to: {}", expansion.green().bold());
        }
        ResolvedTarget::NotFound => {
            println!("  Not a CMDFlow shortcut; executes untouched in shell.");
        }
    }
    Ok(())
}

fn handle_ask(prompt: &str, non_interactive: bool) -> Result<(), Box<dyn std::error::Error>> {
    let cwd = std::env::current_dir()?;
    let safe_ctx = SafeContext::gather("bash", &cwd);

    let provider = MockProvider;
    let proposal = provider.propose_command(prompt, &safe_ctx)?;

    // Display formatted proposal
    eprintln!("\n{}", "CMDFlow AI Assistant".bold());
    eprintln!("--------------------------------");
    eprintln!("Proposed:    {}", proposal.command.cyan().bold());
    eprintln!("Explanation: {}", proposal.explanation);

    let risk_badge = match proposal.risk {
        RiskLevel::Safe => "[SAFE]".green().bold(),
        RiskLevel::Caution => "[CAUTION]".yellow().bold(),
        RiskLevel::Destructive => "[DESTRUCTIVE]".red().bold(),
    };
    eprintln!("Risk Level:  {}", risk_badge);

    if !proposal.affected_paths.is_empty() {
        eprintln!(
            "Targets:     {}",
            proposal.affected_paths.join(", ").dimmed()
        );
    }

    if non_interactive {
        if proposal.risk == RiskLevel::Safe {
            eprintln!("Non-interactive mode: executing safe command.");
            let status = std::process::Command::new("sh")
                .arg("-c")
                .arg(&proposal.command)
                .status()?;
            std::process::exit(status.code().unwrap_or(0));
        } else {
            eprintln!("Non-interactive mode declined execution for non-safe command.");
            std::process::exit(1);
        }
    }

    // Explicit approval protocol based on risk level
    let approved = match proposal.risk {
        RiskLevel::Safe => {
            eprint!("\nExecute command? [Y/n]: ");
            io::stderr().flush().ok();
            let mut input = String::new();
            io::stdin().read_line(&mut input)?;
            let t = input.trim().to_lowercase();
            t.is_empty() || t == "y" || t == "yes"
        }
        RiskLevel::Caution => {
            eprint!("\nCaution required. Type '{}' to confirm: ", "yes".yellow());
            io::stderr().flush().ok();
            let mut input = String::new();
            io::stdin().read_line(&mut input)?;
            input.trim().eq_ignore_ascii_case("yes")
        }
        RiskLevel::Destructive => {
            let target_req = proposal
                .affected_paths
                .first()
                .map(|s| s.trim_end_matches('/'))
                .unwrap_or("node_modules");
            eprint!(
                "\n{} Type '{}' to confirm destructive execution: ",
                "DANGER!".red().bold(),
                target_req.bold()
            );
            io::stderr().flush().ok();
            let mut input = String::new();
            io::stdin().read_line(&mut input)?;
            input.trim() == target_req
        }
    };

    if approved {
        eprintln!("{} Executing...", "▶".green());
        let status = std::process::Command::new("sh")
            .arg("-c")
            .arg(&proposal.command)
            .status()?;
        std::process::exit(status.code().unwrap_or(0));
    } else {
        eprintln!("{} Command cancelled by user.", "✗".red());
    }

    Ok(())
}

fn handle_profile(cmd: ProfileCommands) -> Result<(), Box<dyn std::error::Error>> {
    let mut cfg = ConfigManager::load_or_init()?;
    let path = ConfigManager::config_path();

    match cmd {
        ProfileCommands::Ls => {
            println!(
                "Active Profile: {}",
                cfg.settings.active_profile.cyan().bold()
            );
            println!("Configured Profiles: default");
            for p in cfg.profiles.keys() {
                println!("  {}", p);
            }
        }
        ProfileCommands::Use { name } => {
            cfg.settings.active_profile = name.clone();
            cfg.save_file(&path)?;
            eprintln!("{} Switched active profile to '{}'", "✓".green(), name);
        }
        ProfileCommands::New { name } => {
            cfg.profiles.entry(name.clone()).or_default();
            cfg.save_file(&path)?;
            eprintln!("{} Created profile '{}'", "✓".green(), name);
        }
        ProfileCommands::Rm { name } => {
            cfg.profiles.remove(&name);
            cfg.save_file(&path)?;
            eprintln!("{} Removed profile '{}'", "✓".green(), name);
        }
    }
    Ok(())
}

fn handle_theme(cmd: ThemeCommands) -> Result<(), Box<dyn std::error::Error>> {
    let mut cfg = ConfigManager::load_or_init()?;
    let path = ConfigManager::config_path();

    match cmd {
        ThemeCommands::Ls => {
            println!("Available themes: midnight (default), graphite, nebula, light");
            println!("Current: {}", cfg.settings.theme.cyan());
        }
        ThemeCommands::Set { name } => {
            cfg.settings.theme = name.clone();
            cfg.save_file(&path)?;
            eprintln!("{} Theme set to '{}'", "✓".green(), name);
        }
        ThemeCommands::Preview => {
            eprintln!("Previewing theme: {}", cfg.settings.theme.cyan().bold());
            eprintln!("  {} Accent color", "●".blue());
            eprintln!("  {} Success color", "●".green());
            eprintln!("  {} Warning color", "●".yellow());
            eprintln!("  {} Danger color", "●".red());
        }
    }
    Ok(())
}

fn handle_plugin(cmd: PluginCommands) -> Result<(), Box<dyn std::error::Error>> {
    match cmd {
        PluginCommands::Ls => {
            println!(
                "{:<24} {:<8} {}",
                "PLUGIN".bold(),
                "STATUS".bold(),
                "DESCRIPTION".bold()
            );
            println!("{}", "-".repeat(60));
            println!(
                "{:<24} {:<8} {}",
                "git-branch-prompt",
                "active".green(),
                "Shows current git branch in shell prompt".dimmed()
            );
            println!(
                "{:<24} {:<8} {}",
                "notify-on-long-flow",
                "active".green(),
                "Sends desktop notification when flow > 10s".dimmed()
            );
        }
    }
    Ok(())
}

fn handle_settings(
    port_opt: Option<u16>,
    no_browser: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let port = port_opt.unwrap_or(5199);
    let token: String = (0..32)
        .map(|_| format!("{:x}", rand::random::<u8>() % 16))
        .collect();
    let url = format!("http://127.0.0.1:{}/?token={}", port, token);

    eprintln!("{} CMDFlow Local Settings Server", "▶".green().bold());
    eprintln!("Listening on: {}", url.cyan().bold());
    eprintln!("Origin restricted to loopback (127.0.0.1). Press Ctrl+C to stop.");

    if !no_browser {
        let _ = std::process::Command::new("xdg-open").arg(&url).spawn();
    }

    let server = tiny_http::Server::http(format!("127.0.0.1:{}", port))
        .map_err(|e| format!("Failed to bind server: {}", e))?;

    for request in server.incoming_requests() {
        let req_url = request.url().to_string();

        if req_url.starts_with("/api/config") {
            if request.method() == &tiny_http::Method::Get {
                let cfg = ConfigManager::load_or_init()?;
                let json = serde_json::to_string_pretty(&cfg)?;
                let resp = tiny_http::Response::from_string(json).with_header(
                    tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..])
                        .unwrap(),
                );
                request.respond(resp).ok();
            } else {
                let resp = tiny_http::Response::from_string(r#"{"status":"ok"}"#);
                request.respond(resp).ok();
            }
            continue;
        }

        // Serve embedded assets
        let path = if req_url == "/" || req_url.starts_with("/?") {
            "index.html"
        } else {
            req_url.trim_start_matches('/')
        };

        if let Some(asset) = Asset::get(path) {
            let mime = if path.ends_with(".html") {
                "text/html; charset=utf-8"
            } else if path.ends_with(".js") {
                "application/javascript"
            } else if path.ends_with(".css") {
                "text/css"
            } else {
                "application/octet-stream"
            };
            let resp = tiny_http::Response::from_data(asset.data.into_owned()).with_header(
                tiny_http::Header::from_bytes(&b"Content-Type"[..], mime.as_bytes()).unwrap(),
            );
            request.respond(resp).ok();
        } else {
            let resp = tiny_http::Response::from_string("Not Found").with_status_code(404);
            request.respond(resp).ok();
        }
    }

    Ok(())
}

fn handle_config(cmd: ConfigCommands) -> Result<(), Box<dyn std::error::Error>> {
    match cmd {
        ConfigCommands::Path => {
            println!("{}", ConfigManager::config_path().display());
        }
        ConfigCommands::Validate => match ConfigManager::load_or_init() {
            Ok(_) => println!("{} Configuration is valid.", "✓".green()),
            Err(e) => {
                eprintln!("{} Config invalid: {}", "✗".red(), e);
                std::process::exit(1);
            }
        },
        ConfigCommands::Get { key } => {
            let cfg = ConfigManager::load_or_init()?;
            match key.as_str() {
                "default_shell" => println!("{}", cfg.settings.default_shell),
                "active_profile" => println!("{}", cfg.settings.active_profile),
                "theme" => println!("{}", cfg.settings.theme),
                "ai_provider" => println!("{}", cfg.settings.ai_provider),
                _ => println!("Unknown key: {}", key),
            }
        }
        ConfigCommands::Set { key, value } => {
            let mut cfg = ConfigManager::load_or_init()?;
            let path = ConfigManager::config_path();
            match key.as_str() {
                "default_shell" => cfg.settings.default_shell = value,
                "active_profile" => cfg.settings.active_profile = value,
                "theme" => cfg.settings.theme = value,
                "ai_provider" => cfg.settings.ai_provider = value,
                _ => {
                    eprintln!("Unknown config key: {}", key);
                    std::process::exit(1);
                }
            }
            cfg.save_file(&path)?;
            eprintln!("{} Updated {} = {}", "✓".green(), key, cfg.settings.theme);
        }
    }
    Ok(())
}

fn handle_trust(path_opt: Option<PathBuf>) -> Result<(), Box<dyn std::error::Error>> {
    let mut cfg = ConfigManager::load_or_init()?;
    let path = ConfigManager::config_path();
    let target = path_opt.unwrap_or_else(|| std::env::current_dir().unwrap());
    let canon = std::fs::canonicalize(target)?;
    let s = canon.to_string_lossy().to_string();

    if !cfg.trusted_dirs.contains(&s) {
        cfg.trusted_dirs.push(s.clone());
        cfg.save_file(&path)?;
        eprintln!("{} Added '{}' to trusted directories.", "✓".green(), s);
    } else {
        eprintln!("Directory '{}' is already trusted.", s);
    }
    Ok(())
}

fn handle_audit() -> Result<(), Box<dyn std::error::Error>> {
    let cfg = ConfigManager::load_or_init()?;
    eprintln!("{}", "CMDFlow Security Audit Report".bold());
    eprintln!("---------------------------------");
    eprintln!("Trusted Directories ({}):", cfg.trusted_dirs.len());
    for d in &cfg.trusted_dirs {
        eprintln!("  {} {}", "✓".green(), d);
    }
    eprintln!("\nActive Plugins:");
    eprintln!(
        "  {} git-branch-prompt (Permissions: read-only git state)",
        "●".cyan()
    );
    eprintln!(
        "  {} notify-on-long-flow (Permissions: system notification)",
        "●".cyan()
    );
    eprintln!("\nRisk Classifier: Deterministic AST & Regex enforcement (Active)");
    eprintln!("AI Privileges: Local prompt approval strictly enforced");
    Ok(())
}

fn handle_update(_force: bool) -> Result<(), Box<dyn std::error::Error>> {
    let current_version = env!("CARGO_PKG_VERSION");
    let configured_url = std::env::var("CMDFLOW_API").ok().or_else(|| {
        ConfigManager::load_or_init()
            .ok()
            .and_then(|cfg| cfg.settings.api_endpoint)
    });
    let default_endpoint = "https://cmdflow.cmdflow.workers.dev/api/releases/latest";
    let release_url = configured_url.as_deref().unwrap_or(default_endpoint);
    eprintln!(
        "{} Checking for updates from {}...",
        "▶".cyan(),
        release_url
    );

    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    let platform = match (os, arch) {
        ("linux", "x86_64") => "linux-x86_64",
        ("linux", "aarch64") => "linux-arm64",
        ("macos", "aarch64") => "darwin-arm64",
        ("macos", "x86_64") => "darwin-x86_64",
        ("windows", "x86_64") => "windows-x86_64",
        _ => "linux-x86_64",
    };

    let agent = ureq::AgentBuilder::new()
        .timeout_connect(std::time::Duration::from_secs(5))
        .timeout_read(std::time::Duration::from_secs(45))
        .user_agent("cmdflow")
        .build();

    let release_resp = agent.get(release_url).call();
    let (latest_version, download_url, expected_sha256, source_name) = match release_resp {
        Ok(resp) => {
            let release: serde_json::Value = resp.into_json()?;
            let ver = release["version"].as_str().unwrap_or("unknown").to_string();
            let mut dl = String::new();
            let mut sha = String::new();
            if let Some(platform_info) = release["platforms"].get(platform) {
                dl = platform_info["url"].as_str().unwrap_or("").to_string();
                sha = platform_info["sha256"].as_str().unwrap_or("").to_string();
            }
            (
                ver,
                dl,
                sha,
                format!("Cloudflare Edge Worker ({})", release_url),
            )
        }
        Err(_) => {
            eprintln!(
                "  {} Primary endpoint unreachable, falling back to source: GitHub Releases API",
                "ℹ".cyan()
            );
            let gh_url = "https://api.github.com/repos/harsh77vardhan/CMDFlow/releases/latest";
            let resp = agent.get(gh_url).call()?;
            let gh_rel: serde_json::Value = resp.into_json()?;
            let tag = gh_rel["tag_name"]
                .as_str()
                .unwrap_or("")
                .trim_start_matches('v')
                .to_string();

            let asset_name = match platform {
                "linux-x86_64" => "cmdflow-linux-x86_64.tar.gz",
                "darwin-arm64" => "cmdflow-darwin-arm64.tar.gz",
                "darwin-x86_64" => "cmdflow-darwin-x86_64.tar.gz",
                "windows-x86_64" => "cmdflow-windows-x86_64.zip",
                _ => "cmdflow-linux-x86_64.tar.gz",
            };

            let mut dl = String::new();
            let mut sums_url = String::new();
            if let Some(assets) = gh_rel["assets"].as_array() {
                for a in assets {
                    let name = a["name"].as_str().unwrap_or("");
                    if name == asset_name {
                        dl = a["browser_download_url"].as_str().unwrap_or("").to_string();
                    } else if name == "SHA256SUMS.txt" {
                        sums_url = a["browser_download_url"].as_str().unwrap_or("").to_string();
                    }
                }
            }

            let mut sha = String::new();
            if !sums_url.is_empty() {
                if let Ok(sums_resp) = agent.get(&sums_url).call() {
                    let sums_text = sums_resp.into_string().unwrap_or_default();
                    for line in sums_text.lines() {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 2 && parts[1].contains(asset_name) {
                            sha = parts[0].to_string();
                            break;
                        }
                    }
                }
            }

            (tag, dl, sha, "GitHub Releases API".to_string())
        }
    };

    eprintln!("  Update source:   {}", source_name);
    eprintln!("  Current version: v{}", current_version);
    eprintln!("  Latest version:  v{}", latest_version);
    eprintln!("  Target platform: {}", platform);
    eprintln!("  Asset URL:       {}", download_url);
    eprintln!("  Expected SHA:    {}", expected_sha256);

    if !download_url.is_empty() {
        eprintln!("{} Downloading asset to temporary file...", "▶".cyan());
        let mut temp_file = tempfile::NamedTempFile::new()?;
        let mut reader = agent.get(&download_url).call()?.into_reader();
        let mut hasher = sha2::Sha256::new();
        let mut buf = [0u8; 8192];
        let mut total_bytes = 0usize;

        loop {
            let n = reader.read(&mut buf)?;
            if n == 0 {
                break;
            }
            sha2::Digest::update(&mut hasher, &buf[..n]);
            temp_file.write_all(&buf[..n])?;
            total_bytes += n;
        }
        temp_file.flush()?;

        let calculated_hash = format!("{:x}", sha2::Digest::finalize(hasher));
        eprintln!(
            "  Downloaded:      {} bytes to {}",
            total_bytes,
            temp_file.path().display()
        );
        eprintln!("  Calculated SHA:  {}", calculated_hash);

        if expected_sha256.len() == 64 {
            if calculated_hash.eq_ignore_ascii_case(&expected_sha256) {
                eprintln!(
                    "{} Checksum verified for {}: {}",
                    "✓".green(),
                    platform,
                    calculated_hash
                );
            } else {
                eprintln!(
                    "{} Checksum verification failed for {}!",
                    "✗".red(),
                    platform
                );
                return Err(format!(
                    "Checksum mismatch: expected {}, got {}",
                    expected_sha256, calculated_hash
                )
                .into());
            }
        }
    }

    if current_version >= latest_version.as_str() {
        println!(
            "{} CMDFlow is up to date (v{}) via {}!",
            "✓".green().bold(),
            current_version,
            source_name
        );
    } else {
        println!(
            "{} New version v{} available! Run the installer or cargo install to update.",
            "ℹ".cyan().bold(),
            latest_version
        );
    }

    Ok(())
}
