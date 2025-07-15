// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[cfg(target_os = "windows")]
use windows::{
    Win32::{
        Foundation::*,
    },
};

use tauri_plugin_log::{Target, TargetKind};

use tauri::{Manager, WebviewWindow, Listener};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use base64::{engine::general_purpose, Engine};
use serde::Serialize;
use url::Url;
use tauri_plugin_deep_link::DeepLinkExt;


pub fn print_to_js_console(window: WebviewWindow, s: String) {
    let js_call = format!("console.log('{}');", s);
    if let Err(err) = window.eval(&js_call) {
        eprintln!("Failed to execute JavaScript: {}", err);
    }
}

static MAIN_WINDOW_READY_FLAG: Lazy<Mutex<bool>> = Lazy::new(|| Mutex::new(false));
static PENDING_FILES: Lazy<Mutex<Vec<PathBuf>>> = Lazy::new(|| Mutex::new(vec![]));


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


fn send_js_files(window: &tauri::WebviewWindow, files: Vec<PathBuf>) {
    let js_files = prepare_js_files(files.clone());
    let js_call = match serde_json::to_string(&js_files) {
        Ok(json) => format!(
            r#"
            FileIO.importBase64Files({});
            "#,
            json
        ),
        Err(e) => {
            log::error!("Failed to serialize JS file list: {}", e);
            return;
        }
    };

    if let Err(err) = window.eval(&js_call) {
        log::error!("Failed to execute JavaScript: {}", err);
    } else{
        log::debug!("Successfully sent file paths to frontend -> files={:?}", files);
    }
}


fn queue_js_files(files: Vec<PathBuf>) {
    let mut pending = PENDING_FILES.lock().unwrap();
    pending.extend(files);
    log::debug!("Main window is not ready, queueing files -> pending={:?}", pending);
}


/// Sends file data (base64-encoded) to the front-end's `FileIO.importBase64Files`
/// JavaScript function after the main window is ready.
fn handle_file_associations(app: tauri::AppHandle, files: Vec<PathBuf>) {
    // Try to get the main application window
    if let Some(main_window) = app.get_webview_window("main") {
        let main_window_ready_flag = MAIN_WINDOW_READY_FLAG.lock().unwrap();

        if *main_window_ready_flag {
            // If the result is Ok, it means the window is ready
            send_js_files(&main_window, files);
        } else {
            // If the window is not ready, queue the files
            queue_js_files(files);
        }
    } else {
        // Queue files for later
        queue_js_files(files);
    }
}


#[cfg(target_os = "windows")]
/// Forces the taskbar icon to use a high-res icon
/// 
/// * `window` - A reference to the [`tauri::WebviewWindow`] that should receive the high-res icon.
/// * `icon_path_str` - A relative or absolute path to the `.ico` file to use. The icon file
///   should contain a 256x256 image (preferably 32-bit RGBA) for best results.
fn force_high_res_taskbar_icon(window: &WebviewWindow, icon_path_str: &str) {
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
#[allow(unused_variables)]
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
    #[cfg(target_os = "linux")]
    pub fn get_log_dir() -> PathBuf {
        // Get the XDG_CONFIG_HOME or fall back to ~/.config if not set
        let config_dir = std::env::var("XDG_CONFIG_HOME")
            .map(PathBuf::from) // Convert the String to PathBuf
            .unwrap_or_else(|_| dirs::home_dir().unwrap_or_else(|| PathBuf::from("~")).join(".config"));

        config_dir.join("iva-prime").join("logs")
    }

    #[cfg(any(target_os = "windows", target_os = "macos"))]
    pub fn get_log_dir() -> PathBuf {
        // Get the current executable's directory
        let exe_dir = std::env::current_exe()
            .map(|p| p.parent().unwrap_or_else(|| Path::new(".")).to_path_buf())
            .unwrap_or_else(|_| PathBuf::from("."));

        // Return the log directory (inside the executable's directory)
        exe_dir.join("logs")
    }

    // Determine the log directory based on the OS
    let log_dir = get_log_dir();

    tauri::Builder::default()
        // Plugins
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Debug) // Lowest log level
                .targets(
                    [
                        Target::new(TargetKind::Stdout),
                        Target::new(
                            TargetKind::Folder {
                                path: log_dir.clone(),
                                file_name: None,
                          }
                        ),
                        Target::new(TargetKind::Webview),
                    ]
                )
                .max_file_size(50_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .build(),
        )
        // Ensure only one instance of the app is allowed.
        // If a second instance is opened (e.g. by double-clicking a file),
        // its arguments are captured here.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Convert incoming args into filesystem paths (excluding flags)
            let files: Vec<PathBuf> = parse_files_from_args(args);

            if !files.is_empty() {
                log::debug!("Single instance plugin -> files={:?}", files);
    
                // Pass the list of paths to the frontend
                handle_file_associations(app.clone(), files);
            }
        }))

        // Register custom commands for frontend
        .invoke_handler(tauri::generate_handler![open_about_window])

        // App setup
        .setup(move |app| {
            log::info!("Logs path -> {:?}", log_dir);
            log::info!("App is starting...!");
            
            let app_handle = app.app_handle().clone();
            app.listen("window-ready", move |_event| {
                log::info!("Window is ready!");

                let mut flag = MAIN_WINDOW_READY_FLAG.lock().unwrap();
                *flag = true;
                
                if let Some(main_window) = app_handle.get_webview_window("main") {
                    print_to_js_console(
                        main_window.clone(),
                        format!("Logs path -> {:?}", std::env::current_exe().unwrap().parent().unwrap())
                    );

                    let files = {
                        let mut pending = PENDING_FILES.lock().unwrap();
                        std::mem::take(&mut *pending)
                    };
                    if !files.is_empty() {
                        log::debug!("Sending queued files to window -> files={:?}", files);
                        send_js_files(&main_window, files);
                    }
                }
            });

            // On Windows, force high-res window icon
            #[cfg(target_os = "windows")]
            {
                let app_handle = app.app_handle().clone();
                app.listen("window-ready", move |_event| {
                    if let Some(main_window) = app_handle.get_webview_window("main") {
                        force_high_res_taskbar_icon(&main_window, "icons/icon.ico");
                    }
                });
            }

            app.deep_link().register_all()?;


            // Process file args passed at startup
            #[cfg(any(target_os = "windows", target_os = "linux"))]
            {
                let args: Vec<String> = std::env::args().collect();
                
                let files: Vec<PathBuf> = parse_files_from_args(args);
                
                if !files.is_empty() {
                    log::debug!("Setup -> files={:?}", files);
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
            // On macOS, handle files opened via finder after startup
            #[cfg(any(target_os = "macos"))]
            if let tauri::RunEvent::Opened { urls } = event {
                let files = urls
                    .into_iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .collect::<Vec<_>>();

                if !files.is_empty() {
                    log::debug!("MacOS RunEvent::Opened -> files={:?}", files);
                    handle_file_associations(app.app_handle().clone(), files.clone())
                }
            }
        });
}