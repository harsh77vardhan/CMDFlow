pub mod ai;
pub mod config;
pub mod context;
pub mod flow_engine;
pub mod resolver;
pub mod risk;

pub use config::{
    Alias, Config, ConfigError, ConfigManager, ContextCondition, ContextRule, ContextRuleGroup,
    Flow, FlowStep, Project, Settings,
};
pub use context::ContextEvaluator;
pub use flow_engine::{FlowError, FlowReport, FlowRunner};
pub use resolver::{ResolvedTarget, Resolver};
pub use risk::{RiskClassifier, RiskLevel};

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_starter_pack_load() {
        let cfg = Config::from_starter_pack().expect("starter pack should parse successfully");
        assert!(!cfg.aliases.is_empty());
        assert!(cfg
            .aliases
            .iter()
            .any(|a| a.name == "b" && a.expansion == "cd .."));
        assert!(cfg
            .aliases
            .iter()
            .any(|a| a.name == "gs" && a.expansion == "git status"));
        assert!(cfg.aliases.iter().any(|a| a.name == "ll"));
        assert!(cfg.flows.iter().any(|f| f.name == "deploy"));
        assert!(cfg.context_rules.iter().any(|c| c.name == "s"));
    }

    #[test]
    fn test_resolution_order() {
        let cfg = Config::from_starter_pack().unwrap();
        let resolver = Resolver::new(&cfg, "bash", Path::new("/tmp"));

        // Alias resolution
        let resolved_b = resolver.resolve("b", &[]);
        assert_eq!(resolved_b, ResolvedTarget::Alias("cd ..".to_string()));

        // Passthrough arguments
        let resolved_gs = resolver.resolve("gs", &["-sb".to_string()]);
        assert_eq!(
            resolved_gs,
            ResolvedTarget::Alias("git status -sb".to_string())
        );

        // Flow resolution has higher precedence
        let resolved_flow = resolver.resolve("deploy", &[]);
        match resolved_flow {
            ResolvedTarget::Flow(f, _) => assert_eq!(f.name, "deploy"),
            _ => panic!("Expected deploy to resolve to a Flow"),
        }

        // Unknown command
        let resolved_unknown = resolver.resolve("completely_unknown_command_123", &[]);
        assert_eq!(resolved_unknown, ResolvedTarget::NotFound);
    }

    #[test]
    fn test_protected_commands() {
        let mut cfg = Config::from_starter_pack().unwrap();
        let bad_alias = Alias {
            name: "rm".to_string(),
            expansion: "echo nope".to_string(),
            description: "".to_string(),
            expansion_windows: None,
        };
        // Should fail without force
        assert!(cfg.add_alias(bad_alias.clone(), false).is_err());
        // Should succeed with force
        assert!(cfg.add_alias(bad_alias, true).is_ok());
    }

    #[test]
    fn test_project_fuzzy_lookup() {
        let mut cfg = Config::from_starter_pack().unwrap();
        cfg.add_project(Project {
            name: "technea".to_string(),
            path: "~/Documents/Technea".to_string(),
            description: "Technea project".to_string(),
            on_enter: vec![],
        });

        let resolver = Resolver::new(&cfg, "bash", Path::new("/tmp"));
        let proj = resolver.find_project("technea");
        assert!(proj.is_some());
        assert_eq!(proj.unwrap().name, "technea");

        // Fuzzy match typo: "technea" -> "techne"
        let fuzzy = resolver.find_project("techne");
        assert!(fuzzy.is_some());
        assert_eq!(fuzzy.unwrap().name, "technea");
    }

    #[test]
    fn test_atomic_config_write() {
        let temp_dir = tempfile::tempdir().unwrap();
        let config_path = temp_dir.path().join("config.toml");
        let cfg = Config::from_starter_pack().unwrap();
        cfg.save_file(&config_path).unwrap();

        assert!(config_path.exists());
        let loaded = Config::load_file(&config_path).unwrap();
        assert_eq!(loaded.version, cfg.version);
        assert_eq!(loaded.aliases.len(), cfg.aliases.len());
    }
}
