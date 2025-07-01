// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use tauri::Manager;
use tokio::time::sleep;
use std::time::Duration;
use std::fs;
use std::path::PathBuf;
use base64::{engine::general_purpose, Engine};
use serde::Serialize;


#[derive(Serialize)]
struct JsFile {
    name: String,
    content_base64: String,
}

fn prepare_js_files(paths: Vec<String>) -> Vec<JsFile> {
    paths
        .into_iter()
        .filter_map(|path| {
            let path_buf = PathBuf::from(&path);
            let name = path_buf.file_name()?.to_string_lossy().to_string();
            let bytes = fs::read(&path_buf).ok()?;
            let encoded = general_purpose::STANDARD.encode(&bytes);
            Some(JsFile {
                name,
                content_base64: encoded,
            })
        })
        .collect()
}

#[tauri::command]
async fn open_about_window(app: tauri::AppHandle) {
  let _about_window = tauri::WebviewWindowBuilder::new(
    &app,
    "about",
    tauri::WebviewUrl::App("about.html".into())
  )
  .title("IVA Prime - About")
  .inner_size(800.0, 600.0)
  .build();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Run on second instance of IVA Prime
            // `args` command line arguments of second instance
            // `app` tauri AppHandle.

            if let Some(main_window) = app.get_webview_window("main") {
                // Collect arguments
                let file_args: Vec<String> = args.into_iter().skip(1).collect();

                let js_files = prepare_js_files(file_args);
                let js_call = match serde_json::to_string(&js_files) {
                    Ok(json) => format!(r#"FileIO.importBase64Files({})"#, json),
                    Err(e) => {
                        eprintln!("Failed to serialize JS file list: {}", e);
                        return;
                    }
                };

                if let Err(err) = main_window.eval(&js_call) {
                    eprintln!("Failed to execute JavaScript: {}", err);
                }
            }
        }))
        .invoke_handler(tauri::generate_handler![open_about_window])
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            println!("Startup arguments: {:?}", args);

            let file_args: Vec<String> = args.into_iter().skip(1).collect();

            if !file_args.is_empty() {
                let app_handle = app.app_handle().clone();
                tauri::async_runtime::spawn(async move {
                    sleep(Duration::from_millis(1000)).await;

                    if let Some(main_window) = app_handle.get_webview_window("main") {
                        let js_files = prepare_js_files(file_args);
                        let js_call = match serde_json::to_string(&js_files) {
                            Ok(json) => format!(r#"FileIO.importBase64Files({})"#, json),
                            Err(e) => {
                                eprintln!("Failed to serialize JS file list: {}", e);
                                return;
                            }
                        };

                        if let Err(err) = main_window.eval(&js_call) {
                            eprintln!("Failed to execute JavaScript: {}", err);
                        }
                    } else {
                        eprintln!("Main window not found.");
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}