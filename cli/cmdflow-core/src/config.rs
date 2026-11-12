use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;

pub const DEFAULT_STARTER_PACK_JSON: &str = include_str!("../../../shared/starter-pack.json");

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("IO error at {0}: {1}")]
    Io(PathBuf, #[source] std::io::Error),

    #[error("TOML syntax error in {path} at line {line}, col {col}: {message}")]
    TomlSyntax {
        path: PathBuf,
        line: usize,
        col: usize,
        message: String,
    },

    #[error("Failed to parse TOML configuration in {0}: {1}")]
    TomlParse(PathBuf, #[source] toml::de::Error),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Alias {
    pub name: String,
    pub expansion: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub expansion_windows: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContextCondition {
    #[serde(default)]
    pub in_git_repo: Option<bool>,
    #[serde(default)]
    pub file_exists: Option<String>,
    #[serde(default)]
    pub dir_exists: Option<String>,
    #[serde(default)]
    pub os: Option<String>,
    #[serde(default)]
    pub shell: Option<String>,
    #[serde(default)]
    pub env_set: Option<String>,
    #[serde(default)]
    pub env_equals: Option<(String, String)>,
    #[serde(default)]
    pub cwd_glob: Option<String>,
    #[serde(default)]
    pub project_is: Option<String>,
    #[serde(default)]
    pub has_command: Option<String>,
    #[serde(default)]
    pub all: Option<Vec<ContextCondition>>,
    #[serde(default)]
    pub any: Option<Vec<ContextCondition>>,
    #[serde(default)]
    pub not: Option<Box<ContextCondition>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContextRule {
    pub when: ContextCondition,
    pub expansion: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContextRuleGroup {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub rules: Vec<ContextRule>,
    pub default: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Project {
    pub name: String,
    pub path: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub on_enter: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FlowStep {
    pub run: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub cwd: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default)]
    pub when: Option<ContextCondition>,
    #[serde(default)]
    pub continue_on_error: bool,
    #[serde(default)]
    pub confirm: bool,
    #[serde(default)]
    pub timeout: Option<u64>,
    #[serde(default)]
    pub retries: u32,
    #[serde(default)]
    pub parallel: Vec<FlowStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Flow {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub steps: Vec<FlowStep>,
    #[serde(default)]
    pub args: HashMap<String, String>,
    #[serde(default)]
    pub on_failure: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Settings {
    #[serde(default = "default_true")]
    pub expand_preview: bool,
    #[serde(default = "default_true")]
    pub confirm_destructive: bool,
    #[serde(default = "default_true")]
    pub inline_autocomplete: bool,
    #[serde(default = "default_shell")]
    pub default_shell: String,
    #[serde(default = "default_profile")]
    pub active_profile: String,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_ai_provider")]
    pub ai_provider: String,
    #[serde(default = "default_ai_model")]
    pub ai_model: String,
}

fn default_true() -> bool {
    true
}
fn default_shell() -> String {
    "bash".to_string()
}
fn default_profile() -> String {
    "default".to_string()
}
fn default_theme() -> String {
    "midnight".to_string()
}
fn default_ai_provider() -> String {
    "mock".to_string()
}
fn default_ai_model() -> String {
    "on-device-first".to_string()
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            expand_preview: true,
            confirm_destructive: true,
            inline_autocomplete: true,
            default_shell: default_shell(),
            active_profile: default_profile(),
            theme: default_theme(),
            ai_provider: default_ai_provider(),
            ai_model: default_ai_model(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct Profile {
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub aliases: Vec<Alias>,
    #[serde(default)]
    pub flows: Vec<Flow>,
    #[serde(default)]
    pub projects: Vec<Project>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Config {
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub settings: Settings,
    #[serde(default)]
    pub aliases: Vec<Alias>,
    #[serde(default)]
    pub context_rules: Vec<ContextRuleGroup>,
    #[serde(default)]
    pub projects: Vec<Project>,
    #[serde(default)]
    pub flows: Vec<Flow>,
    #[serde(default = "default_protected")]
    pub protected: Vec<String>,
    #[serde(default)]
    pub profiles: HashMap<String, Profile>,
    #[serde(default)]
    pub trusted_dirs: Vec<String>,
}

fn default_protected() -> Vec<String> {
    vec![
        "cd".into(),
        "rm".into(),
        "sudo".into(),
        "mv".into(),
        "cp".into(),
        "ssh".into(),
        "git".into(),
        "sh".into(),
        "bash".into(),
        "zsh".into(),
        "fish".into(),
        "pwsh".into(),
        "powershell".into(),
        "cmdflow".into(),
        "cf".into(),
        "flow".into(),
    ]
}

impl Default for Config {
    fn default() -> Self {
        Self {
            version: "1.0.0".into(),
            settings: Settings::default(),
            aliases: Vec::new(),
            context_rules: Vec::new(),
            projects: Vec::new(),
            flows: Vec::new(),
            protected: default_protected(),
            profiles: HashMap::new(),
            trusted_dirs: Vec::new(),
        }
    }
}

#[derive(Debug, Deserialize)]
struct StarterPackJson {
    pub version: String,
    pub aliases: Vec<Alias>,
    pub context_rules: Vec<ContextRuleGroup>,
    pub projects: Vec<Project>,
    pub flows: Vec<Flow>,
    pub protected: Vec<String>,
}

impl Config {
    pub fn from_starter_pack() -> Result<Self, ConfigError> {
        let starter: StarterPackJson = serde_json::from_str(DEFAULT_STARTER_PACK_JSON)?;
        Ok(Config {
            version: starter.version,
            aliases: starter.aliases,
            context_rules: starter.context_rules,
            projects: starter.projects,
            flows: starter.flows,
            protected: starter.protected,
            ..Default::default()
        })
    }

    pub fn load_file(path: &Path) -> Result<Self, ConfigError> {
        if !path.exists() {
            return Err(ConfigError::Io(
                path.to_path_buf(),
                std::io::Error::new(std::io::ErrorKind::NotFound, "Config file does not exist"),
            ));
        }
        let content =
            fs::read_to_string(path).map_err(|e| ConfigError::Io(path.to_path_buf(), e))?;

        toml::from_str(&content).map_err(|e| {
            if let Some(span) = e.span() {
                let prefix = &content[..span.start.min(content.len())];
                let line = prefix.lines().count().max(1);
                let col = prefix.lines().last().map(|l| l.len() + 1).unwrap_or(1);
                ConfigError::TomlSyntax {
                    path: path.to_path_buf(),
                    line,
                    col,
                    message: e.message().to_string(),
                }
            } else {
                ConfigError::TomlParse(path.to_path_buf(), e)
            }
        })
    }

    pub fn save_file(&self, path: &Path) -> Result<(), ConfigError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| ConfigError::Io(parent.to_path_buf(), e))?;
        }

        let serialized = toml::to_string_pretty(self)
            .map_err(|e| ConfigError::Validation(format!("Serialization error: {}", e)))?;

        // Atomic write with backup
        if path.exists() {
            let backup_path = path.with_extension("toml.bak");
            let _ = fs::copy(path, backup_path);
        }

        let tmp_path = path.with_extension("toml.tmp");
        fs::write(&tmp_path, serialized).map_err(|e| ConfigError::Io(tmp_path.clone(), e))?;

        fs::rename(&tmp_path, path).map_err(|e| ConfigError::Io(path.to_path_buf(), e))?;

        Ok(())
    }

    pub fn is_protected(&self, name: &str) -> bool {
        self.protected.iter().any(|p| p.eq_ignore_ascii_case(name))
    }

    pub fn add_alias(&mut self, alias: Alias, force: bool) -> Result<(), ConfigError> {
        if !force && self.is_protected(&alias.name) {
            return Err(ConfigError::Validation(format!(
                "'{}' is a protected command. Pass --force to override.",
                alias.name
            )));
        }
        self.aliases.retain(|a| a.name != alias.name);
        self.aliases.push(alias);
        Ok(())
    }

    pub fn remove_alias(&mut self, name: &str) -> bool {
        let initial = self.aliases.len();
        self.aliases.retain(|a| a.name != name);
        self.aliases.len() < initial
    }

    pub fn add_project(&mut self, project: Project) {
        self.projects.retain(|p| p.name != project.name);
        self.projects.push(project);
    }

    pub fn remove_project(&mut self, name: &str) -> bool {
        let initial = self.projects.len();
        self.projects.retain(|p| p.name != name);
        self.projects.len() < initial
    }

    pub fn add_flow(&mut self, flow: Flow, force: bool) -> Result<(), ConfigError> {
        if !force && self.is_protected(&flow.name) {
            return Err(ConfigError::Validation(format!(
                "'{}' is a protected command. Pass --force to override.",
                flow.name
            )));
        }
        self.flows.retain(|f| f.name != flow.name);
        self.flows.push(flow);
        Ok(())
    }

    pub fn remove_flow(&mut self, name: &str) -> bool {
        let initial = self.flows.len();
        self.flows.retain(|f| f.name != name);
        self.flows.len() < initial
    }

    /// Merges an overlay config (e.g. active profile or project config) into self.
    pub fn merge_overlay(&mut self, overlay: &Config) {
        // Overlay aliases overwrite base aliases
        for a in &overlay.aliases {
            if !self.is_protected(&a.name) {
                self.aliases.retain(|existing| existing.name != a.name);
                self.aliases.push(a.clone());
            }
        }
        // Overlay flows overwrite base flows
        for f in &overlay.flows {
            if !self.is_protected(&f.name) {
                self.flows.retain(|existing| existing.name != f.name);
                self.flows.push(f.clone());
            }
        }
        // Overlay projects
        for p in &overlay.projects {
            self.projects.retain(|existing| existing.name != p.name);
            self.projects.push(p.clone());
        }
        // Overlay context rules
        for c in &overlay.context_rules {
            self.context_rules
                .retain(|existing| existing.name != c.name);
            self.context_rules.push(c.clone());
        }
    }
}

pub struct ConfigManager;

impl ConfigManager {
    pub fn config_dir() -> PathBuf {
        if let Ok(val) = std::env::var("CMDFLOW_CONFIG_DIR") {
            return PathBuf::from(val);
        }
        if let Ok(val) = std::env::var("XDG_CONFIG_HOME") {
            return PathBuf::from(val).join("cmdflow");
        }
        dirs::config_dir()
            .map(|d| d.join("cmdflow"))
            .unwrap_or_else(|| {
                dirs::home_dir()
                    .unwrap_or_else(|| PathBuf::from("."))
                    .join(".config")
                    .join("cmdflow")
            })
    }

    pub fn config_path() -> PathBuf {
        Self::config_dir().join("config.toml")
    }

    pub fn load_or_init() -> Result<Config, ConfigError> {
        let path = Self::config_path();
        let mut config = if path.exists() {
            Config::load_file(&path)?
        } else {
            let starter = Config::from_starter_pack()?;
            starter.save_file(&path)?;
            starter
        };

        // If an active profile is set, apply profile overrides
        let active_profile = config.settings.active_profile.clone();
        if active_profile != "default" {
            if let Some(prof) = config.profiles.get(&active_profile) {
                for a in &prof.aliases {
                    config.aliases.retain(|x| x.name != a.name);
                    config.aliases.push(a.clone());
                }
                for f in &prof.flows {
                    config.flows.retain(|x| x.name != f.name);
                    config.flows.push(f.clone());
                }
                for p in &prof.projects {
                    config.projects.retain(|x| x.name != p.name);
                    config.projects.push(p.clone());
                }
            }
        }

        // Check for local .cmdflow.toml up directory tree
        if let Some(project_cfg) = Self::find_and_load_project_config() {
            config.merge_overlay(&project_cfg);
        }

        Ok(config)
    }

    pub fn find_and_load_project_config() -> Option<Config> {
        let current_dir = std::env::current_dir().ok()?;
        let mut curr = current_dir.as_path();
        loop {
            let candidate = curr.join(".cmdflow.toml");
            if candidate.is_file() {
                if let Ok(cfg) = Config::load_file(&candidate) {
                    return Some(cfg);
                }
            }
            match curr.parent() {
                Some(p) => curr = p,
                None => break,
            }
        }
        None
    }
}
