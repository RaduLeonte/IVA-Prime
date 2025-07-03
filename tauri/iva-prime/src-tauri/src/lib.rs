// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use tauri::Manager;
use std::fs;
use std::path::PathBuf;
use base64::{engine::general_purpose, Engine};
use serde::Serialize;
use url::Url;
//use tauri::Listener;


#[derive(Serialize)]
struct JsFile {
    name: String,
    content_base64: String,
}

fn prepare_js_files(paths: Vec<PathBuf>) -> Vec<JsFile> {
    paths
        .into_iter()
        .filter_map(|path| {
            let name = path.file_name()?.to_string_lossy().to_string();
            let bytes = fs::read(&path).ok()?;
            let encoded = general_purpose::STANDARD.encode(&bytes);
            Some(JsFile {
                name,
                content_base64: encoded,
            })
        })
        .collect()
}



fn handle_file_associations(app: tauri::AppHandle, files: Vec<PathBuf>) {
    let js_files = prepare_js_files(files);
    let js_call = match serde_json::to_string(&js_files) {
        Ok(json) => format!(
            r#"
            if (document.readyState !== 'complete') {{
                window.addEventListener('DOMContentLoaded', function() {{
                    FileIO.importBase64Files({});
                }});
            }} else {{
                FileIO.importBase64Files({});
            }}
            "#,
            json,
            json
        ),
        Err(e) => {
            eprintln!("Failed to serialize JS file list: {}", e);
            return;
        }
    };

    if let Some(main_window) = app.get_webview_window("main") {
        if let Err(err) = main_window.eval(&js_call) {
            eprintln!("Failed to execute JavaScript: {}", err);
        }
    } else {
        eprintln!("Main window not found.");
    }
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
            // Collect arguments for second instance
            let file_args: Vec<String> = args.into_iter().skip(1).collect();
            let files = file_args
                .into_iter()
                .filter_map(|maybe_file| {
                    if maybe_file.starts_with('-') {
                        return None; // Skip flags
                    }

                    if let Ok(url) = Url::parse(&maybe_file) {
                        if let Ok(path) = url.to_file_path() {
                            return Some(path);
                        }
                    }

                    Some(PathBuf::from(maybe_file))
                })
                .collect::<Vec<_>>();

            handle_file_associations(app.clone(), files);
        }))
        .invoke_handler(tauri::generate_handler![open_about_window])
        .setup(|app| {
            #[cfg(any(windows, target_os = "linux"))]
            {
                let args: Vec<String> = std::env::args().collect();
                println!("Startup arguments: {:?}", args);
    
                let file_args: Vec<String> = args.into_iter().skip(1).collect();
                let files = file_args
                    .into_iter()
                    .filter_map(|maybe_file| {
                        if maybe_file.starts_with('-') {
                            return None; // Skip flags
                        }
    
                        if let Ok(url) = Url::parse(&maybe_file) {
                            if let Ok(path) = url.to_file_path() {
                                return Some(path);
                            }
                        }
    
                        Some(PathBuf::from(maybe_file))
                    })
                    .collect::<Vec<_>>();
    
                // Wait for the front-end to be loaded
                if let Some(_main_window) = app.get_webview_window("main") {
                    // Listen for the 'tauri://window-loaded' event
                    let app_handle = app.app_handle();
                    handle_file_associations(app_handle.clone(), files.clone());
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(
            #[allow(unused_variables)]
            |app, event| {
            #[cfg(any(target_os = "macos"))]
            if let tauri::RunEvent::Opened { urls } = event {
                let files = urls
                    .into_iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .collect::<Vec<_>>();

                handle_file_associations(app.app_handle().clone(), files.clone())
            }
        });
}