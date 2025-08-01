// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    let _ = fix_path_env::fix(); // fix PATH on macos aarch64

    iva_prime_lib::run()
}
