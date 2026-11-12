use crate::risk::{RiskClassifier, RiskLevel};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AiError {
    #[error("Network error: {0}")]
    Network(String),

    #[error("API error ({0}): {1}")]
    Api(u16, String),

    #[error("Invalid JSON response from provider: {0}")]
    InvalidJson(String),

    #[error("Missing API key for provider '{0}'. Set it using 'cmdflow config set api_key <key>' or env {1}")]
    MissingApiKey(String, String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafeContext {
    pub os: String,
    pub shell: String,
    pub cwd_name: String,
    pub is_git_repo: bool,
    pub git_branch: Option<String>,
    pub top_level_entries: Vec<String>,
}

impl SafeContext {
    pub fn gather(shell: &str, cwd: &Path) -> Self {
        let os = std::env::consts::OS.to_string();
        let cwd_name = cwd
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "/".to_string());

        let mut is_git = false;
        let mut git_branch = None;
        if cwd.join(".git").exists() {
            is_git = true;
            if let Ok(head) = fs::read_to_string(cwd.join(".git").join("HEAD")) {
                if let Some(branch) = head.trim().strip_prefix("ref: refs/heads/") {
                    git_branch = Some(branch.to_string());
                }
            }
        }

        // Top level file names only (max 25 entries, no file contents, no env secrets)
        let mut entries = Vec::new();
        if let Ok(rd) = fs::read_dir(cwd) {
            for entry in rd.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                // Filter out secret or private files
                if name.starts_with(".env") || name.contains("id_rsa") || name.contains("key") {
                    continue;
                }
                entries.push(name);
                if entries.len() >= 25 {
                    break;
                }
            }
        }

        Self {
            os,
            shell: shell.to_string(),
            cwd_name,
            is_git_repo: is_git,
            git_branch,
            top_level_entries: entries,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiCommandProposal {
    pub command: String,
    pub explanation: String,
    pub risk: RiskLevel,
    #[serde(default)]
    pub affected_paths: Vec<String>,
    #[serde(default = "default_true")]
    pub reversible: bool,
}

fn default_true() -> bool {
    true
}

pub trait AiProvider {
    fn propose_command(
        &self,
        prompt: &str,
        context: &SafeContext,
    ) -> Result<AiCommandProposal, AiError>;
}

/// Deterministic mock provider for unit tests, offline development, and verification.
pub struct MockProvider;

impl AiProvider for MockProvider {
    fn propose_command(
        &self,
        prompt: &str,
        _context: &SafeContext,
    ) -> Result<AiCommandProposal, AiError> {
        let lower = prompt.to_lowercase();
        let (cmd, expl, model_risk, affected, rev) =
            if lower.contains("delete node modules") || lower.contains("remove node_modules") {
                (
                    "rm -rf node_modules",
                    "Removes the local npm node_modules dependency directory completely.",
                    RiskLevel::Destructive,
                    vec!["node_modules/".to_string()],
                    false,
                )
            } else if lower.contains("status") || lower.contains("git") {
                (
                    "git status",
                    "Displays the status of the working directory and staging area.",
                    RiskLevel::Safe,
                    vec![],
                    true,
                )
            } else if lower.contains("compress") || lower.contains("tar") || lower.contains("zip") {
                (
                    "tar -czvf archive.tar.gz .",
                    "Compresses the current directory into an archive file.",
                    RiskLevel::Caution,
                    vec!["archive.tar.gz".to_string()],
                    true,
                )
            } else if lower.contains("restart") || lower.contains("server") {
                (
                    "systemctl restart app.service",
                    "Restarts the system application service.",
                    RiskLevel::Caution,
                    vec![],
                    false,
                )
            } else {
                (
                    "ls -lah",
                    "Lists all files and directories in long format with human-readable sizes.",
                    RiskLevel::Safe,
                    vec![],
                    true,
                )
            };

        // Run through local deterministic classifier
        let local_risk = RiskClassifier::classify(cmd);
        let final_risk = RiskClassifier::reconcile(model_risk, local_risk);

        Ok(AiCommandProposal {
            command: cmd.to_string(),
            explanation: expl.to_string(),
            risk: final_risk,
            affected_paths: affected,
            reversible: rev,
        })
    }
}

pub struct CredentialsManager;

impl CredentialsManager {
    pub fn get_key(provider_name: &str) -> Option<String> {
        // 1. Check environment variable first
        let env_var = match provider_name.to_lowercase().as_str() {
            "openai" => "OPENAI_API_KEY",
            "anthropic" => "ANTHROPIC_API_KEY",
            "gemini" => "GEMINI_API_KEY",
            _ => "CMDFLOW_API_KEY",
        };
        if let Ok(val) = std::env::var(env_var) {
            if !val.trim().is_empty() {
                return Some(val.trim().to_string());
            }
        }

        // 2. Fall back to credentials file (~/.config/cmdflow/.credentials)
        let creds_file = crate::config::ConfigManager::config_dir().join(".credentials");
        if creds_file.exists() {
            if let Ok(content) = fs::read_to_string(creds_file) {
                for line in content.lines() {
                    let mut parts = line.splitn(2, '=');
                    if let (Some(k), Some(v)) = (parts.next(), parts.next()) {
                        if k.trim().eq_ignore_ascii_case(provider_name) {
                            return Some(v.trim().to_string());
                        }
                    }
                }
            }
        }
        None
    }

    pub fn save_key(provider_name: &str, key: &str) -> Result<(), std::io::Error> {
        let creds_dir = crate::config::ConfigManager::config_dir();
        fs::create_dir_all(&creds_dir)?;
        let creds_file = creds_dir.join(".credentials");

        let mut map = std::collections::HashMap::new();
        if creds_file.exists() {
            if let Ok(content) = fs::read_to_string(&creds_file) {
                for line in content.lines() {
                    let mut parts = line.splitn(2, '=');
                    if let (Some(k), Some(v)) = (parts.next(), parts.next()) {
                        map.insert(k.trim().to_lowercase(), v.trim().to_string());
                    }
                }
            }
        }

        map.insert(provider_name.to_lowercase(), key.trim().to_string());
        let mut out = String::new();
        for (k, v) in map {
            out.push_str(&format!("{}={}\n", k, v));
        }

        fs::write(&creds_file, out)?;

        // Set 0600 file permissions on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&creds_file)?.permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&creds_file, perms)?;
        }

        Ok(())
    }
}
