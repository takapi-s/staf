#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  use tauri::Manager;
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      crate::processor::process_rows,
      crate::processor::abort_processing,
      gemini_generate_with_search
    ])
    .setup(|app| {
      app.manage(crate::processor::CancelHolder::default());
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

mod gemini;
mod processor;

#[tauri::command]
async fn gemini_generate_with_search(api_key: String, prompt: String) -> Result<crate::gemini::GenerateResponse, String> {
  // デフォルト60秒（フロントで明示しないため）
  crate::gemini::generate_with_search_once(api_key, prompt, 60)
    .await
    .map_err(|e| e.to_string())
}
