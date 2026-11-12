use crate::config::{Config, ContextCondition};
use std::path::Path;

#[derive(Debug, Clone)]
pub struct ContextEvaluator<'a> {
    pub shell: &'a str,
    pub cwd: &'a Path,
    pub config: Option<&'a Config>,
}

impl<'a> ContextEvaluator<'a> {
    pub fn new(shell: &'a str, cwd: &'a Path, config: Option<&'a Config>) -> Self {
        Self { shell, cwd, config }
    }

    pub fn matches(&self, cond: &ContextCondition) -> bool {
        if let Some(git) = cond.in_git_repo {
            let in_git = self.is_in_git_repo();
            if in_git != git {
                return false;
            }
        }

        if let Some(ref file) = cond.file_exists {
            let p = self.cwd.join(file);
            if !p.exists() || !p.is_file() {
                return false;
            }
        }

        if let Some(ref dir) = cond.dir_exists {
            let p = self.cwd.join(dir);
            if !p.exists() || !p.is_dir() {
                return false;
            }
        }

        if let Some(ref os) = cond.os {
            let current_os = std::env::consts::OS;
            if !current_os.eq_ignore_ascii_case(os) {
                return false;
            }
        }

        if let Some(ref target_shell) = cond.shell {
            if !self.shell.eq_ignore_ascii_case(target_shell) {
                return false;
            }
        }

        if let Some(ref env_name) = cond.env_set {
            if std::env::var(env_name).is_err() {
                return false;
            }
        }

        if let Some((ref key, ref val)) = cond.env_equals {
            match std::env::var(key) {
                Ok(v) if v == *val => {}
                _ => return false,
            }
        }

        if let Some(ref pattern) = cond.cwd_glob {
            if let Ok(glob_pattern) = glob::Pattern::new(pattern) {
                if !glob_pattern.matches_path(self.cwd) {
                    return false;
                }
            } else {
                return false;
            }
        }

        if let Some(ref proj_name) = cond.project_is {
            if let Some(cfg) = self.config {
                let matches_proj = cfg.projects.iter().any(|p| {
                    if p.name.eq_ignore_ascii_case(proj_name) {
                        let expanded = shellexpand::tilde(&p.path).to_string();
                        if let Ok(canon) = std::fs::canonicalize(&expanded) {
                            if let Ok(cwd_canon) = std::fs::canonicalize(self.cwd) {
                                return cwd_canon == canon || cwd_canon.starts_with(&canon);
                            }
                        }
                    }
                    false
                });
                if !matches_proj {
                    return false;
                }
            } else {
                return false;
            }
        }

        if let Some(ref cmd) = cond.has_command {
            if which::which(cmd).is_err() {
                return false;
            }
        }

        if let Some(ref all_conds) = cond.all {
            for c in all_conds {
                if !self.matches(c) {
                    return false;
                }
            }
        }

        if let Some(ref any_conds) = cond.any {
            let mut matched = false;
            for c in any_conds {
                if self.matches(c) {
                    matched = true;
                    break;
                }
            }
            if !matched {
                return false;
            }
        }

        if let Some(ref not_cond) = cond.not {
            if self.matches(not_cond) {
                return false;
            }
        }

        true
    }

    fn is_in_git_repo(&self) -> bool {
        let mut curr = self.cwd;
        loop {
            if curr.join(".git").exists() {
                return true;
            }
            match curr.parent() {
                Some(p) => curr = p,
                None => break,
            }
        }
        false
    }
}
