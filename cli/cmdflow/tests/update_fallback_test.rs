use std::process::Command;

#[test]
fn test_update_fallback_on_unreachable_endpoint() {
    let bin_path = env!("CARGO_BIN_EXE_cmdflow");
    let output = Command::new(bin_path)
        .arg("update")
        .env("CMDFLOW_API", "http://127.0.0.1:9/api/releases/latest")
        .output()
        .expect("failed to execute cmdflow update");

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    eprintln!("DEBUG STDERR:\n{}", stderr);
    eprintln!("DEBUG STDOUT:\n{}", stdout);

    assert!(
        stderr.contains("Primary endpoint unreachable")
            || stderr.contains("falling back to source")
            || stdout.contains("GitHub Releases API")
    );
    assert!(output.status.success());
}
