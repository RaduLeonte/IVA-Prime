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


fn parse_files_from_args(args: Vec<String>) -> Vec<PathBuf> {
    args.into_iter()
        .skip(1) // Skip binary path
        .filter_map(|maybe_file| {
            if maybe_file.starts_with('-') {
                return None; // Skip CLI flags
            }

            // Handle URL-style file paths (e.g. file://C:/...)
            if let Ok(url) = Url::parse(&maybe_file) {
                if let Ok(path) = url.to_file_path() {
                    return Some(path);
                }
            }

            // Fallback to raw path
            Some(PathBuf::from(maybe_file))
        })
        .collect()

}


#[derive(Serialize)]
struct JsFile {
    name: String,
    content_base64: String,
}


/// Converts a list of file paths into a vector of `JsFile` objects,
/// where each file is read and base64-encoded for JavaScript consumption.
fn prepare_js_files(paths: Vec<PathBuf>) -> Vec<JsFile> {
    paths
        .into_iter()
        .filter_map(|path| {
            // Get file name from path
            let name = path.file_name()?.to_string_lossy().to_string();

            // Read file
            let bytes = fs::read(&path).ok()?;

            // Encode to base64
            let encoded = general_purpose::STANDARD.encode(&bytes);

            // Construct a JsFile with the filename and base64 string
            Some(JsFile {
                name,
                content_base64: encoded,
            })
        })
        // Collect all successful conversions into a Vec<JsFile>
        .collect()
}


/// Sends file data (base64-encoded) to the front-end's `FileIO.importBase64Files`
/// JavaScript function after the main window is ready.
fn handle_file_associations(app: tauri::AppHandle, files: Vec<PathBuf>) {
    // Convert the list of file paths into JsFile structs with base64-encoded content
    let js_files = prepare_js_files(files);

    // Attempt to serialize the JsFile list into a JSON string
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
            json, // used twice in the template
            json
        ),
        Err(e) => {
            eprintln!("Failed to serialize JS file list: {}", e);
            return;
        }
    };

    // Try to get the main application window
    if let Some(main_window) = app.get_webview_window("main") {
        // Inject and execute the JS string in the main window's context
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
/// Opens the "About" window in the Tauri application.
async fn open_about_window(app: tauri::AppHandle) {
    // Create the window
    let about_window = tauri::WebviewWindowBuilder::new(
        &app,
        "about", // Unique label
        tauri::WebviewUrl::App("about.html".into())
    )
    .title("IVA Prime - About")
    .inner_size(800.0, 600.0)
    .build();

    // Force the window to use a high-res icon
    #[cfg(target_os = "windows")]
    if let Ok(ref window) = about_window {
        force_high_res_taskbar_icon(window, "icons/icon.ico");
    }
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Plugins
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // Ensure only one instance of the app is allowed.
        // If a second instance is opened (e.g. by double-clicking a file),
        // its arguments are captured here.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Convert incoming args into filesystem paths (excluding flags)
            let files: Vec<PathBuf> = parse_files_from_args(args);

            // Pass the list of paths to the frontend
            handle_file_associations(app.clone(), files);
        }))

        // Register custom commands for frontend
        .invoke_handler(tauri::generate_handler![open_about_window])

        // App setup
        .setup(|app| {
            // On Windows, force high-res window icon
            #[cfg(target_os = "windows")]
            if let Some(window) = app.get_webview_window("main") {
                force_high_res_taskbar_icon(&window, "icons/icon.ico");
            }

            // On Windows or Linux, process file args passed at startup
            #[cfg(any(windows, target_os = "linux"))]
            {
                let args: Vec<String> = std::env::args().collect();
                println!("Startup arguments: {:?}", args);
    
                let files: Vec<PathBuf> = parse_files_from_args(args);

                // If the main window is already available, send files right away
                if let Some(_main_window) = app.get_webview_window("main") {
                    let app_handle = app.app_handle();
                    handle_file_associations(app_handle.clone(), files.clone());
                }
            }

            Ok(())
        })

        // Final app build step
        .build(tauri::generate_context!())
        .expect("error while running tauri application")

        // Event loop for runtime events
        .run(
            #[allow(unused_variables)]
            |app, event| {
            // On macOS, handle files opened via Finder (e.g. drag-drop on Dock icon)
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