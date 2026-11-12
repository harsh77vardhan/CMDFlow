use std::fs;
use std::path::Path;

fn main() {
    println!("cargo:rerun-if-changed=../../settings-ui/dist");
    let dist = Path::new("../../settings-ui/dist");
    if !dist.exists() {
        let _ = fs::create_dir_all(dist);
    }
    let index = dist.join("index.html");
    if !index.exists() {
        let _ = fs::write(
            &index,
            "<!doctype html><html><head><title>CMDFlow Settings</title></head><body><div id=\"app\">CMDFlow Settings</div></body></html>",
        );
    }
}
