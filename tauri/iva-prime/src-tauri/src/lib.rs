// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[cfg(target_os = "windows")]
use windows::{
    Win32::{
        Foundation::*,
    },
};

use tauri::Manager;
use std::fs;
use std::path::PathBuf;
use base64::{engine::general_purpose, Engine};
use serde::Serialize;
use url::Url;



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


#[cfg(target_os = "windows")]
/// Forces the taskbar icon to use a high-res icon
/// 
/// * `window` - A reference to the [`tauri::WebviewWindow`] that should receive the high-res icon.
/// * `icon_path_str` - A relative or absolute path to the `.ico` file to use. The icon file
///   should contain a 256x256 image (preferably 32-bit RGBA) for best results.
fn force_high_res_taskbar_icon(window: &tauri::WebviewWindow, icon_path_str: &str) {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows::{
        core::PCWSTR,
        Win32::{
            Foundation::{HWND, LPARAM, WPARAM},
            UI::WindowsAndMessaging::*,
        },
    };

    // Try to get the native window handle (HWND) for the Tauri window
    if let Ok(hwnd_raw) = window.hwnd() {
        // Convert the handle into the proper Windows API type
        let hwnd = HWND(hwnd_raw.0 as isize);

        // Convert the icon path string to a null-terminated wide string for Windows API
        let icon_path: Vec<u16> = OsStr::new(icon_path_str)
            .encode_wide()
            .chain(Some(0))
            .collect();

        // Load the .ico file as an icon handle (HICON)
        let hicon_result = unsafe {
            LoadImageW(
                HINSTANCE::default(),          // Load from disk, not a resource handle
                PCWSTR(icon_path.as_ptr()),    // Path to icon file
                IMAGE_ICON,                    // We're loading an icon
                256,                           // Desired width
                256,                           // Desired height
                LR_LOADFROMFILE | LR_DEFAULTSIZE, // Load from file, fallback to default size if needed
            )
        };

        // If the icon was loaded successfully, apply it to the window
        if let Ok(hicon) = hicon_result {
            unsafe {
                // Set the large (taskbar/alt-tab) icon
                SendMessageW(hwnd, WM_SETICON, WPARAM(1), LPARAM(hicon.0)); // ICON_BIG = 1

                // Set the small (title bar/window frame) icon
                SendMessageW(hwnd, WM_SETICON, WPARAM(0), LPARAM(hicon.0)); // ICON_SMALL = 0
            }
        }
    }
}


#[tauri::command]
async fn open_about_window(app: tauri::AppHandle) {
    let about_window = tauri::WebviewWindowBuilder::new(
        &app,
        "about",
        tauri::WebviewUrl::App("about.html".into())
    )
    .title("IVA Prime - About")
    .inner_size(800.0, 600.0)
    .build();

    #[cfg(target_os = "windows")]
    if let Ok(ref window) = about_window {
        force_high_res_taskbar_icon(window, "icons/icon.ico");
    }
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
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
            // Force high-res window icon
            #[cfg(target_os = "windows")]
            if let Some(window) = app.get_webview_window("main") {
                force_high_res_taskbar_icon(&window, "icons/icon.ico");
            }


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