use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use base64::{engine::general_purpose, Engine};
use chrono::Local;
use fern::colors::{Color, ColoredLevelConfig};
use once_cell::sync::Lazy;
use serde::Serialize;
use serde_json::json;
use url::Url;

use tauri::menu::{CheckMenuItemBuilder, MenuBuilder, SubmenuBuilder};
use tauri::{Listener, Manager, WebviewWindow};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_store::StoreExt;
use tauri_plugin_updater::UpdaterExt;

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::*;

pub fn setup_logging(logs_dir: &std::path::Path) -> Result<(), fern::InitError> {
    let log_file_path = logs_dir.join("output.log");

    let colors = ColoredLevelConfig::new()
        .debug(Color::Magenta)
        .info(Color::Green)
        .warn(Color::Yellow)
        .error(Color::Red)
        .trace(Color::Blue);

    fern::Dispatch::new()
        // Global filter
        .level(log::LevelFilter::Debug)
        // Module filter
        .level_for("tauri_plugin_updater::updater", log::LevelFilter::Info)
        // Terminal output (colored)
        .chain(
            fern::Dispatch::new()
                .format(move |out, message, record| {
                    out.finish(format_args!(
                        "[{}][{}][{}] {}",
                        Local::now().format("%Y-%m-%d %H:%M:%S"),
                        colors.color(record.level()),
                        record.target(),
                        message
                    ))
                })
                .chain(std::io::stdout()),
        )
        // File output (not colored)
        .chain(
            fern::Dispatch::new()
                .format(|out, message, record| {
                    out.finish(format_args!(
                        "[{}][{}][{}] {}",
                        Local::now().format("%Y-%m-%d %H:%M:%S"),
                        record.level(),
                        record.target(),
                        message
                    ))
                })
                .chain(fern::log_file(log_file_path)?),
        )
        .apply()?;
    Ok(())
}

fn check_for_update(app_handle: tauri::AppHandle, release_channel: String) {
    tauri::async_runtime::spawn(async move {
        match get_update(app_handle.clone(), &release_channel).await {
            Ok(_) => log::info!("Update check completed."),
            Err(e) => {
                log::error!("Update check failed: {}", e);
                app_handle
                    .dialog()
                    .message(format!("Update check failed:\n{}", e))
                    .title("Update Error")
                    .blocking_show();
            }
        }
    });
}

async fn get_update(
    app_handle: tauri::AppHandle,
    release_channel: &str,
) -> tauri_plugin_updater::Result<()> {
    let update_url = if release_channel == "nightly" {
        "https://github.com/RaduLeonte/IVA-Prime/releases/download/nightly/latest.json"
    } else {
        "https://github.com/RaduLeonte/IVA-Prime/releases/latest/latest.json"
    };

    let updater = app_handle
        .updater_builder()
        .endpoints(vec![Url::parse(update_url)?])?
        .build()?;

    let update = updater.check().await?;

    if let Some(ref update) = update {
        log::info!(
            "Update found!\n  Body: {:?}\n  Current version: {}\n  New version: {}\n  Download URL: {}",
            update.body,
            update.current_version,
            update.version,
            update.download_url
        );

        let current_version = update.current_version.to_string();
        let new_version = update.version.to_string();

        let dialog_message = format!(
            "A new update is available!\n\nCurrent version: {}\nNew version: {}\n\nDo you want to download and install this update?",
            current_version, new_version
        );

        let answer = app_handle
            .dialog()
            .message(dialog_message)
            .title("Update Available")
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Update Now".to_string(),
                "Later".to_string(),
            ))
            .blocking_show();

        if !answer {
            log::info!("User declined update.");
            return Ok(());
        };

        // alternatively we could also call update.download() and update.install() separately
        log::info!("Starting download...");
        update
            .download_and_install(
                |_chunk_length, _content_length| {},
                || {
                    log::info!("Download finished.");
                },
            )
            .await?;

        log::info!("Update installed.");
        app_handle.restart();
    } else {
        log::info!("No update required.");
        app_handle
            .dialog()
            .message("You are up to date!")
            .title("No Update Available")
            .blocking_show();
    };

    Ok(())
}

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
    } else {
        log::debug!(
            "Successfully sent file paths to frontend -> files={:?}",
            files
        );
    }
}

fn queue_js_files(files: Vec<PathBuf>) {
    let mut pending = PENDING_FILES.lock().unwrap();
    pending.extend(files);
    log::debug!(
        "Main window is not ready, queueing files -> pending={:?}",
        pending
    );
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
                HINSTANCE::default(),             // Load from disk, not a resource handle
                PCWSTR(icon_path.as_ptr()),       // Path to icon file
                IMAGE_ICON,                       // We're loading an icon
                256,                              // Desired width
                256,                              // Desired height
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
        tauri::WebviewUrl::App("about.html".into()),
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
    pub fn get_appdata_dir() -> PathBuf {
        // Get the XDG_CONFIG_HOME or fall back to ~/.config if not set
        let config_dir = std::env::var("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                dirs::home_dir()
                    .unwrap_or_else(|| PathBuf::from("~"))
                    .join(".config")
            });

        config_dir.join("IVA Prime")
    }

    #[cfg(any(target_os = "windows", target_os = "macos"))]
    pub fn get_appdata_dir() -> PathBuf {
        // Use OS app data directories if possible
        let base = dirs::data_local_dir()
            .or_else(|| dirs::home_dir()) // fallback: home dir
            .unwrap_or_else(|| PathBuf::from("."));
        base.join("IVA Prime")
    }

    // Determine appdata directory based on the OS
    let appdata_dir = get_appdata_dir();

    let logs_dir = appdata_dir.join("logs");
    // Make sure it exists
    if let Err(e) = fs::create_dir_all(&logs_dir) {
        log::error!("Could not create logs directory: {e}");
    };

    setup_logging(&logs_dir).expect("Failed to initialize logging");

    let settings_path = appdata_dir.join("settings.json");

    tauri::Builder::default()
        // Plugins
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Ensure only one instance of the app is allowed.
            // If a second instance is opened (e.g. by double-clicking a file),
            // its arguments are captured here.

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
            log::info!("Logs path -> \"{}\"", logs_dir.display());
            log::info!("Settings path -> \"{}\"", settings_path.display());
            log::info!("App is starting...!");

            // Load setting from store
            let store = app.store(settings_path)?;

            let check_for_updates_on_startup: bool = store
                .get("check_for_updates_on_startup")
                .and_then(|obj| obj.get("value").and_then(|v| v.as_bool()))
                .unwrap_or(false);

            let release_channel = store
                .get("release_channel")
                .and_then(|obj| {
                    obj.get("value")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_owned())
                })
                .unwrap_or_else(|| "full".to_string());

            // Window menu
            let check_updates_on_startup_item =
                CheckMenuItemBuilder::new("Check for Updates on Startup")
                    .id("check_for_updates_on_startup")
                    .checked(check_for_updates_on_startup)
                    .build(app)?;

            let check_for_updates_now_item =
                tauri::menu::MenuItemBuilder::new("Check for Updates Now")
                    .id("check_for_updates_now")
                    .build(app)?;

            let full_release_item = CheckMenuItemBuilder::new("Full-release")
                .id("release_channel_full")
                .checked(release_channel == "full")
                .build(app)?;

            let nightly_release_item = CheckMenuItemBuilder::new("Nightly pre-release")
                .id("release_channel_nightly")
                .checked(release_channel == "nightly")
                .build(app)?;

            let release_channel_menu = SubmenuBuilder::new(app, "Release channel")
                .item(&full_release_item)
                .item(&nightly_release_item)
                .build()?;

            let settings_menu = SubmenuBuilder::new(app, "Settings")
                .item(&check_updates_on_startup_item)
                .item(&check_for_updates_now_item)
                .separator()
                .item(&release_channel_menu)
                .build()?;

            let menu = MenuBuilder::new(app).items(&[&settings_menu]).build()?;

            app.set_menu(menu)?;
            app.on_menu_event(move |app_handle: &tauri::AppHandle, event| {
                match event.id().0.as_str() {
                    "check_for_updates_on_startup" => {
                        let checked = check_updates_on_startup_item.is_checked().unwrap_or(false);
                        store.set("check_for_updates_on_startup", json!({ "value": checked }));
                    }
                    "release_channel_full" => {
                        let _ = full_release_item.set_checked(true);
                        let _ = nightly_release_item.set_checked(false);
                        store.set("release_channel", json!({ "value": "full" }));
                    }
                    "release_channel_nightly" => {
                        let _ = full_release_item.set_checked(false);
                        let _ = nightly_release_item.set_checked(true);
                        store.set("release_channel", json!({ "value": "nightly" }));
                    }
                    "check_for_updates_now" => {
                        let app_handle = app_handle.clone();
                        let release_channel = store
                            .get("release_channel")
                            .and_then(|obj| {
                                obj.get("value")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_owned())
                            })
                            .unwrap_or_else(|| "full".to_string());
                        check_for_update(app_handle, release_channel);
                    }
                    _ => {
                        log::debug!("Unexpected menu event.");
                    }
                }
            });

            // Check for updates
            if check_for_updates_on_startup {
                check_for_update(app.app_handle().clone(), release_channel);
            };

            // On main window ready
            let app_handle = app.app_handle().clone();
            app.listen("window-ready", move |_event| {
                log::info!("Window is ready!");

                let mut flag = MAIN_WINDOW_READY_FLAG.lock().unwrap();
                *flag = true;

                if let Some(main_window) = app_handle.get_webview_window("main") {
                    print_to_js_console(
                        main_window.clone(),
                        format!(
                            "Logs path -> {:?}",
                            std::env::current_exe().unwrap().parent().unwrap()
                        ),
                    );

                    let _ = main_window.set_title(&format!(
                        "IVA Prime v{}",
                        app_handle.package_info().version.to_string()
                    ));

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

            // Register deep links
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
            },
        );
}
