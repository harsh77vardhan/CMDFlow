use crate::config::{Config, Flow, Project};
use crate::context::ContextEvaluator;
use std::path::Path;

#[derive(Debug, Clone, PartialEq)]
pub enum ResolvedTarget {
    Flow(Flow, Vec<String>),
    ContextRule {
        name: String,
        expansion: String,
        matched_rule_index: Option<usize>,
    },
    Project(Project),
    Alias(String),
    NotFound,
}

#[derive(Debug, Clone)]
pub struct Resolver<'a> {
    pub config: &'a Config,
    pub shell: &'a str,
    pub cwd: &'a Path,
}

impl<'a> Resolver<'a> {
    pub fn new(config: &'a Config, shell: &'a str, cwd: &'a Path) -> Self {
        Self { config, shell, cwd }
    }

    pub fn resolve(&self, name: &str, args: &[String]) -> ResolvedTarget {
        // 1. Exact flow name
        if let Some(flow) = self.config.flows.iter().find(|f| f.name == name) {
            return ResolvedTarget::Flow(flow.clone(), args.to_vec());
        }

        // 2. Context rules
        let evaluator = ContextEvaluator::new(self.shell, self.cwd, Some(self.config));
        if let Some(group) = self.config.context_rules.iter().find(|g| g.name == name) {
            for (idx, rule) in group.rules.iter().enumerate() {
                if evaluator.matches(&rule.when) {
                    let expansion = self.expand_template(&rule.expansion, args);
                    return ResolvedTarget::ContextRule {
                        name: group.name.clone(),
                        expansion,
                        matched_rule_index: Some(idx),
                    };
                }
            }
            let expansion = self.expand_template(&group.default, args);
            return ResolvedTarget::ContextRule {
                name: group.name.clone(),
                expansion,
                matched_rule_index: None,
            };
        }

        // 3. Project shortcut (explicit: "project <name>" or "p <name>", or direct match)
        if name == "project" || name == "p" {
            if let Some(proj_name) = args.first() {
                if let Some(proj) = self.find_project(proj_name) {
                    return ResolvedTarget::Project(proj);
                }
            }
        }
        if let Some(proj) = self.find_project(name) {
            return ResolvedTarget::Project(proj);
        }

        // 4. Alias
        if let Some(alias) = self.config.aliases.iter().find(|a| a.name == name) {
            let base = if self.shell.eq_ignore_ascii_case("powershell")
                || self.shell.eq_ignore_ascii_case("pwsh")
            {
                alias.expansion_windows.as_ref().unwrap_or(&alias.expansion)
            } else {
                &alias.expansion
            };
            let expanded = self.expand_template(base, args);
            return ResolvedTarget::Alias(expanded);
        }

        // 5. Fallback
        ResolvedTarget::NotFound
    }

    pub fn find_project(&self, name: &str) -> Option<Project> {
        // Exact match first
        if let Some(p) = self
            .config
            .projects
            .iter()
            .find(|p| p.name.eq_ignore_ascii_case(name))
        {
            return Some(p.clone());
        }
        // Fuzzy match: highest Jaro-Winkler similarity above threshold 0.75
        let mut best_match: Option<(&Project, f64)> = None;
        for p in &self.config.projects {
            let score = strsim::jaro_winkler(&p.name.to_lowercase(), &name.to_lowercase());
            if score >= 0.75 {
                match best_match {
                    Some((_, current_score)) if score > current_score => {
                        best_match = Some((p, score));
                    }
                    None => {
                        best_match = Some((p, score));
                    }
                    _ => {}
                }
            }
        }
        best_match.map(|(p, _)| p.clone())
    }

    pub fn expand_template(&self, template: &str, args: &[String]) -> String {
        let mut result = template.to_string();
        let mut has_positional = false;

        // Replace positional placeholders: {1}, {2}, etc.
        for (i, arg) in args.iter().enumerate() {
            let placeholder = format!("{{{}}}", i + 1);
            if result.contains(&placeholder) {
                has_positional = true;
                result = result.replace(&placeholder, arg);
            }
        }

        // Replace all arguments {@}
        if result.contains("{@}") {
            has_positional = true;
            result = result.replace("{@}", &args.join(" "));
        }

        // Replace {cwd}
        if result.contains("{cwd}") {
            result = result.replace("{cwd}", &self.cwd.to_string_lossy());
        }

        // Replace {project}
        if result.contains("{project}") {
            let proj_name = self.find_current_project_name().unwrap_or_default();
            result = result.replace("{project}", &proj_name);
        }

        // Replace {env:VAR}
        while let Some(start) = result.find("{env:") {
            if let Some(end) = result[start..].find('}') {
                let full = &result[start..start + end + 1];
                let var_name = &full[5..full.len() - 1];
                let val = std::env::var(var_name).unwrap_or_default();
                result = result.replace(full, &val);
            } else {
                break;
            }
        }

        // If template had NO argument placeholders and extra arguments were passed, append them
        if !has_positional && !args.is_empty() {
            result.push(' ');
            result.push_str(&args.join(" "));
        }

        result
    }

    fn find_current_project_name(&self) -> Option<String> {
        for p in &self.config.projects {
            let expanded = shellexpand::tilde(&p.path).to_string();
            if let Ok(canon) = std::fs::canonicalize(&expanded) {
                if let Ok(cwd_canon) = std::fs::canonicalize(self.cwd) {
                    if cwd_canon == canon || cwd_canon.starts_with(&canon) {
                        return Some(p.name.clone());
                    }
                }
            }
        }
        None
    }
}
