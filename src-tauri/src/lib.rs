#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  use tauri::Manager;
  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
      }
    }))
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      crate::processor::process_rows,
      crate::processor::abort_processing,
      gemini_generate_with_search,
      gemini_generate_prompt_text,
      recreate_windows_shortcut
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
async fn gemini_generate_with_search(
  api_key: String,
  prompt: String,
  enable_web_search: Option<bool>,
  response_schema: Option<serde_json::Value>,
) -> Result<crate::gemini::GenerateResponse, String> {
  let enable_web_search = enable_web_search.unwrap_or(true);
  crate::gemini::generate_events_with_search_once(api_key, prompt, 60, enable_web_search, response_schema)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn gemini_generate_prompt_text(api_key: String, prompt: String) -> Result<crate::gemini::GenerateResponse, String> {
  crate::gemini::generate_prompt_text_once(api_key, prompt, 60)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn recreate_windows_shortcut(name: Option<String>, description: Option<String>) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::path::{Path, PathBuf};
    use windows::core::{Interface, PCWSTR, PWSTR};
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED};
    use windows::Win32::System::Com::IPersistFile;
    use windows::Win32::UI::Shell::{IShellLinkW, FOLDERID_Desktop, KNOWN_FOLDER_FLAG, ShellLink, SHGetKnownFolderPath};

    fn to_wide(s: &OsStr) -> Vec<u16> {
      s.encode_wide().chain(std::iter::once(0)).collect()
    }

    unsafe {
      let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);

      // デスクトップパス取得
      let raw_path: PWSTR = SHGetKnownFolderPath(&FOLDERID_Desktop, KNOWN_FOLDER_FLAG(0), None)
        .map_err(|e| e.to_string())?;
      if raw_path.is_null() {
        CoUninitialize();
        return Err("Desktop path not found".into());
      }
      let desktop: PathBuf = {
        let mut len = 0usize;
        while *raw_path.0.add(len) != 0 { len += 1; }
        let slice = std::slice::from_raw_parts(raw_path.0, len);
        let s = String::from_utf16_lossy(slice);
        CoTaskMemFree(Some(raw_path.0 as _));
        PathBuf::from(s)
      };

      // 実行ファイル
      let exe = std::env::current_exe().map_err(|e| e.to_string())?;
      let exe_dir = exe.parent().unwrap_or(Path::new("."));
      let default_name = exe.file_stem().unwrap_or_else(|| OsStr::new("app")).to_string_lossy().to_string();
      let mut shortcut_name = name.unwrap_or(default_name);
      if !shortcut_name.to_ascii_lowercase().ends_with(".lnk") {
        shortcut_name.push_str(".lnk");
      }
      let lnk_path = desktop.join(shortcut_name);

      // ShellLink 作成
      let sl: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER).map_err(|e| e.to_string())?;
      let exe_w = to_wide(exe.as_os_str());
      sl.SetPath(PCWSTR(exe_w.as_ptr())).map_err(|e| format!("SetPath: {:?}", e))?;
      let dir_w = to_wide(exe_dir.as_os_str());
      sl.SetWorkingDirectory(PCWSTR(dir_w.as_ptr())).map_err(|e| format!("SetWorkingDirectory: {:?}", e))?;
      if let Some(desc) = description.as_ref() {
        let desc_w = to_wide(OsStr::new(desc));
        sl.SetDescription(PCWSTR(desc_w.as_ptr())).map_err(|e| format!("SetDescription: {:?}", e))?;
      }
      // アイコンはexeを使用
      let icon_w = to_wide(exe.as_os_str());
      sl.SetIconLocation(PCWSTR(icon_w.as_ptr()), 0).map_err(|e| format!("SetIconLocation: {:?}", e))?;

      let pf: IPersistFile = sl.cast().map_err(|e| e.to_string())?;
      let lnk_w = to_wide(lnk_path.as_os_str());
      pf.Save(PCWSTR(lnk_w.as_ptr()), true).map_err(|e| format!("Save: {:?}", e))?;

      CoUninitialize();
      Ok(())
    }
  }

  #[cfg(not(target_os = "windows"))]
  {
    let _ = name;
    let _ = description;
    Err("unsupported platform".into())
  }
}
