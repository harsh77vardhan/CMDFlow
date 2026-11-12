use crate::config::{Flow, FlowStep};
use crate::context::ContextEvaluator;
use std::collections::HashMap;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Instant;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum FlowError {
    #[error("Step '{0}' failed with exit code {1}")]
    StepFailed(String, i32),

    #[error("Step '{0}' timed out after {1} seconds")]
    StepTimeout(String, u64),

    #[error("Step execution cancelled by user")]
    Cancelled,

    #[error("IO error: {0}")]
    Io(#[from] io::Error),
}

#[derive(Debug, Clone)]
pub struct FlowReport {
    pub success: bool,
    pub exit_code: i32,
    pub final_cwd: Option<PathBuf>,
    pub exported_env: HashMap<String, String>,
    pub steps_run: usize,
    pub total_duration_ms: u128,
}

pub struct FlowRunner<'a> {
    pub flow: &'a Flow,
    pub shell: &'a str,
    pub initial_cwd: &'a Path,
    pub dry_run: bool,
    pub args: &'a [String],
}

impl<'a> FlowRunner<'a> {
    pub fn new(
        flow: &'a Flow,
        shell: &'a str,
        initial_cwd: &'a Path,
        dry_run: bool,
        args: &'a [String],
    ) -> Self {
        Self {
            flow,
            shell,
            initial_cwd,
            dry_run,
            args,
        }
    }

    pub fn execute(&self) -> Result<FlowReport, FlowError> {
        let start_time = Instant::now();
        let mut current_cwd = self.initial_cwd.to_path_buf();
        let exported_env: HashMap<String, String> = HashMap::new();
        let total_steps = self.flow.steps.len();

        eprintln!(
            "{} Running flow: {} ({} steps){}",
            if self.dry_run { "[DRY RUN]" } else { "▶" },
            self.flow.name,
            total_steps,
            if !self.flow.description.is_empty() {
                format!(" — {}", self.flow.description)
            } else {
                "".to_string()
            }
        );

        for (idx, step) in self.flow.steps.iter().enumerate() {
            let step_num = idx + 1;
            let step_title = step.name.as_deref().unwrap_or(step.run.as_str());

            // Check conditional execution
            if let Some(ref cond) = step.when {
                let eval = ContextEvaluator::new(self.shell, &current_cwd, None);
                if !eval.matches(cond) {
                    eprintln!(
                        "  [{}/{}] Skipped: {} (condition false)",
                        step_num, total_steps, step_title
                    );
                    continue;
                }
            }

            // Check confirmation if required
            if step.confirm && !self.dry_run {
                eprint!(
                    "  [confirm] Run step '{}' ({})? [y/N]: ",
                    step_title, step.run
                );
                io::stderr().flush().ok();
                let mut input = String::new();
                io::stdin().read_line(&mut input)?;
                let trimmed = input.trim().to_lowercase();
                if trimmed != "y" && trimmed != "yes" {
                    eprintln!("  [{}/{}] Skipped by user.", step_num, total_steps);
                    continue;
                }
            }

            let step_start = Instant::now();
            eprintln!(
                "  [{}/{}] Running: {}...",
                step_num, total_steps, step_title
            );

            if self.dry_run {
                eprintln!("      $ {}", step.run);
                continue;
            }

            // Handle internal 'cd' commands to track directory state
            let trimmed_run = step.run.trim();
            if trimmed_run.starts_with("cd ") || trimmed_run == "cd" {
                let target = if trimmed_run == "cd" {
                    "~"
                } else {
                    trimmed_run[3..].trim()
                };
                let expanded = shellexpand::tilde(target).to_string();
                let next_path = if Path::new(&expanded).is_absolute() {
                    PathBuf::from(expanded)
                } else {
                    current_cwd.join(expanded)
                };
                if let Ok(canon) = std::fs::canonicalize(&next_path) {
                    current_cwd = canon;
                    eprintln!("      ↳ cd {}", current_cwd.display());
                } else {
                    eprintln!(
                        "      ↳ cd failed: directory not found: {}",
                        next_path.display()
                    );
                    if !step.continue_on_error {
                        return Err(FlowError::StepFailed(step_title.to_string(), 1));
                    }
                }
                continue;
            }

            // Execute subprocess
            let mut retries_left = step.retries;
            loop {
                let exit_status = self.run_subprocess(step, &current_cwd, &exported_env)?;
                if exit_status.success() {
                    let elapsed = step_start.elapsed().as_secs_f64();
                    eprintln!("      ✓ Done in {:.2}s", elapsed);
                    break;
                } else {
                    let code = exit_status.code().unwrap_or(1);
                    if retries_left > 0 {
                        retries_left -= 1;
                        eprintln!(
                            "      ! Step failed with code {}. Retrying ({} remaining)...",
                            code, retries_left
                        );
                        continue;
                    }

                    if step.continue_on_error {
                        eprintln!("      ! Step failed with code {}, continuing anyway.", code);
                        break;
                    } else {
                        eprintln!("      ✗ Step failed with code {}. Flow halted.", code);
                        return Err(FlowError::StepFailed(step_title.to_string(), code));
                    }
                }
            }
        }

        let total_duration = start_time.elapsed().as_millis();
        eprintln!(
            "✔ Flow '{}' completed in {:.2}s",
            self.flow.name,
            total_duration as f64 / 1000.0
        );

        let final_dir = if current_cwd != self.initial_cwd {
            Some(current_cwd)
        } else {
            None
        };

        Ok(FlowReport {
            success: true,
            exit_code: 0,
            final_cwd: final_dir,
            exported_env,
            steps_run: total_steps,
            total_duration_ms: total_duration,
        })
    }

    fn run_subprocess(
        &self,
        step: &FlowStep,
        cwd: &Path,
        env_vars: &HashMap<String, String>,
    ) -> Result<std::process::ExitStatus, FlowError> {
        let work_dir = if let Some(ref custom_cwd) = step.cwd {
            let expanded = shellexpand::tilde(custom_cwd).to_string();
            if Path::new(&expanded).is_absolute() {
                PathBuf::from(expanded)
            } else {
                cwd.join(expanded)
            }
        } else {
            cwd.to_path_buf()
        };

        let mut cmd = if cfg!(windows) {
            let mut c = Command::new("cmd.exe");
            c.arg("/C").arg(&step.run);
            c
        } else {
            let mut c = Command::new("sh");
            c.arg("-c").arg(&step.run);
            c
        };

        cmd.current_dir(&work_dir);
        cmd.envs(env_vars);
        cmd.envs(&step.env);
        cmd.stdout(Stdio::inherit());
        cmd.stderr(Stdio::inherit());

        let mut child = cmd.spawn()?;
        let status = child.wait()?;
        Ok(status)
    }
}
