// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use tauri::Manager;
use tauri::Emitter;

#[tauri::command]
fn open_files(app: tauri::AppHandle, files: Vec<String>) {
    println!("Received files: {:?}", files);

    // Sending the list of files to the frontend
    let main_window = app.get_webview_window("main").unwrap();

    main_window.emit(
        "files_received", // Event name
        files, // Payload
    )
    .expect("Failed to send files to frontend");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![open_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
