use crate::gemini;
use anyhow::Result;
use governor::{Quota, RateLimiter};
use serde::{Deserialize, Serialize};
use std::{num::NonZeroU32, sync::Arc};
use tauri::{AppHandle, Emitter, Manager};
use tokio::{sync::Semaphore, task::JoinSet};
use tokio_util::sync::CancellationToken;
use std::sync::atomic::AtomicU32;
use once_cell::sync::OnceCell;
use std::path::PathBuf;
use tokio::io::AsyncWriteExt;
use tokio::fs::OpenOptions;

#[derive(Debug, Deserialize, Clone)]
pub struct ProcessConfig {
  pub api_key: String,
  pub concurrency: usize,
  pub rate_limit_rpm: u32,
  pub timeout_secs: u64,
  pub prompt_template: String,
  #[serde(default = "default_enable_web_search")]
  pub enable_web_search: bool,
  #[serde(default)]
  pub response_schema: Option<serde_json::Value>,
}

fn default_enable_web_search() -> bool {
  true
}

#[derive(Debug, Deserialize, Clone)]
pub struct Row(pub serde_json::Map<String, serde_json::Value>);

#[tauri::command]
pub async fn process_rows(app: AppHandle, rows: Vec<Row>, config: ProcessConfig) -> Result<(), String> {
  let cancel = CancellationToken::new();
  app.state::<CancelHolder>().0.set(cancel.clone()).ok();

  let limiter = Arc::new(RateLimiter::direct(
    Quota::per_minute(NonZeroU32::new(config.rate_limit_rpm.max(1)).unwrap()),
  ));
  let semaphore = Arc::new(Semaphore::new(config.concurrency.max(1)));

  let total = rows.len() as u32;
  let mut set = JoinSet::new();
  let app_clone = app.clone();
  let prompt_template = config.prompt_template.clone();
  let enable_web_search = config.enable_web_search;
  let response_schema = config.response_schema.clone();

  // --- Run ID と ログファイルパスの準備 ---
  let run_id = {
    // エポックミリ秒 + 下位4桁の16進を付与した簡易ID（外部クレート不使用）
    let now = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap_or_default();
    let millis = now.as_millis();
    let suffix = (millis as u64) & 0xFFFF;
    format!("{}-{:04x}", millis, suffix)
  };

  // AppData 配下に logs ディレクトリを用意（例: %AppData%/staf/logs）
  let logs_path: PathBuf = {
    // tauri 2 のパスリゾルバ（取れない場合は temp_dir ）
    let base = app
      .path()
      .app_data_dir()
      .unwrap_or(std::env::temp_dir())
      .join("staf")
      .join("logs");
    if let Err(e) = tokio::fs::create_dir_all(&base).await {
      let _ = app.emit("processing:debug", format!("log dir create error: {}", e));
    }
    base
  };

  let log_file_path = logs_path.join(format!("run-{}.jsonl", run_id));

  // ログ追記用の簡易ロック
  let log_lock = Arc::new(tokio::sync::Mutex::new(()));

  let success_count = Arc::new(AtomicU32::new(0));
  let error_count = Arc::new(AtomicU32::new(0));
  let progress = Arc::new(AtomicU32::new(0));
  let active_requests = Arc::new(AtomicU32::new(0));

  for (idx, row) in rows.into_iter().enumerate() {
    let sem = semaphore.clone();
    let limiter = limiter.clone();
    let api_key = config.api_key.clone();
    let timeout_secs = config.timeout_secs;
    let app = app_clone.clone();
    let cancel = cancel.clone();
    let success_count = success_count.clone();
    let error_count = error_count.clone();
    let progress = progress.clone();
    let active_requests = active_requests.clone();
    let prompt_template = prompt_template.clone();
    let log_file_path = log_file_path.clone();
    let log_lock = log_lock.clone();
    let run_id = run_id.clone();
    let enable_web_search = enable_web_search;
    let response_schema = response_schema.clone();

    set.spawn(async move {
      // デバッグ: タスク開始
      let _ = app.emit("processing:debug", format!("row {}: task spawned", idx));

      // セマフォ取得で待ち続け、タイムアウトでスキップしない
      let _permit = match sem.acquire().await {
        Ok(permit) => permit,
        Err(_) => return,
      };

      let _ = app.emit("processing:debug", format!("row {}: semaphore acquired", idx));

      if cancel.is_cancelled() {
        return;
      }

      // レートリミッタ（1リクエスト分の許可が出るまで待機）
      let _ = app.emit("processing:debug", format!("row {}: waiting rate limiter", idx));
      let _ = limiter.until_ready().await;
      let _ = app.emit("processing:debug", format!("row {}: rate limiter ready", idx));

      // プロンプト生成（単純置換）
      let prompt = render_prompt(&prompt_template, &row.0);
      let _ = app.emit("processing:debug", format!("row {}: prompt prepared (len={})", idx, prompt.len()));

      // 実際にHTTPリクエストを送信する時点でアクティブリクエスト数を増加
      let _ = app.emit("processing:debug", format!("row {}: sending request", idx));
      let current_active = active_requests.fetch_add(1, std::sync::atomic::Ordering::Relaxed) + 1;
      let _ = app.emit("processing:active_requests", ActiveRequestsEvent { count: current_active });
      let started = std::time::Instant::now();

      // 送信前ログ（request）: Structured Response + optional google_search
      let schema_len = response_schema.as_ref().map(|s| s.to_string().len()).unwrap_or(0);
      let request_body = serde_json::json!({
        "structuredResponse": true,
        "tools": if enable_web_search { serde_json::json!([{ "google_search": {} }]) } else { serde_json::json!([]) },
        "hasResponseSchema": response_schema.is_some(),
        "responseSchemaLength": schema_len,
        "prompt": prompt,
      });

      let request_record = serde_json::json!({
        "type": "request",
        "runId": run_id,
        "rowIndex": idx as u32,
        "timestampMs": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),
        "prompt": prompt,
        "requestBody": request_body,
        "inputRow": serde_json::Value::Object(row.0.clone()),
      });
      if let Err(e) = append_jsonl(&log_file_path, &log_lock, request_record).await {
        let _ = app.emit("processing:debug", format!("row {}: request log error -> {}", idx, e));
      }
      
      let res = gemini::generate_events_with_search_once(
        api_key,
        prompt.clone(),
        timeout_secs,
        enable_web_search,
        response_schema,
      ).await;

      match res {
        Ok(resp) => {
          // 中間ノート・構造化入力のログを（存在する場合）先に保存
          if let Some(notes) = resp.intermediate_notes.as_ref() {
            let intermediate_record = serde_json::json!({
              "type": "intermediate",
              "runId": run_id,
              "rowIndex": idx as u32,
              "timestampMs": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),
              "notes": notes,
            });
            if let Err(e) = append_jsonl(&log_file_path, &log_lock, intermediate_record).await {
              let _ = app.emit("processing:debug", format!("row {}: intermediate log error -> {}", idx, e));
            }
          }
          if let Some(s2in) = resp.stage2_input.as_ref() {
            let stage2_input_record = serde_json::json!({
              "type": "stage2_input",
              "runId": run_id,
              "rowIndex": idx as u32,
              "timestampMs": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),
              "text": s2in,
            });
            if let Err(e) = append_jsonl(&log_file_path, &log_lock, stage2_input_record).await {
              let _ = app.emit("processing:debug", format!("row {}: stage2_input log error -> {}", idx, e));
            }
          }

          let resp_text = resp.text;
          let _ = app.emit("processing:debug", format!("row {}: response received (text_len={})", idx, resp_text.len()));

          match parse_response_text(&resp_text) {
            Ok(parsed) => {
              success_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
              let _ = app.emit("processing:row", RowEvent {
                index: idx as u32,
                status: "success".into(),
                data: Some(parsed.clone()),
                raw: Some(resp_text.clone()),
                error: None,
              });

              // 応答ログ（success）
              let duration_ms = started.elapsed().as_millis() as u64;
          let response_record = serde_json::json!({
                "type": "response",
                "runId": run_id,
                "rowIndex": idx as u32,
                "timestampMs": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),
                "status": "success",
                "durationMs": duration_ms,
                "responseText": resp_text,
              });
              if let Err(e) = append_jsonl(&log_file_path, &log_lock, response_record).await {
                let _ = app.emit("processing:debug", format!("row {}: response log error -> {}", idx, e));
              }
            }
            Err(parse_err) => {
              error_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
              let _ = app.emit("processing:row", RowEvent {
                index: idx as u32,
                status: "error".into(),
                data: None,
                raw: Some(resp_text.clone()),
                error: Some(parse_err.clone()),
              });

              // 応答ログ（error: JSON未検出）
              let duration_ms = started.elapsed().as_millis() as u64;
              let response_record = serde_json::json!({
                "type": "response",
                "runId": run_id,
                "rowIndex": idx as u32,
                "timestampMs": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),
                "status": "error",
                "durationMs": duration_ms,
                "error": parse_err,
                "responseText": resp_text,
              });
              if let Err(e) = append_jsonl(&log_file_path, &log_lock, response_record).await {
                let _ = app.emit("processing:debug", format!("row {}: response log error -> {}", idx, e));
              }
            }
          }
        }
        Err(err) => {
          let _ = app.emit("processing:debug", format!("row {}: request error -> {}", idx, err));
          error_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
          let _ = app.emit("processing:row", RowEvent {
            index: idx as u32,
            status: "error".into(),
            data: None,
            raw: None,
            error: Some(err.to_string()),
          });

          // 応答ログ（error）
          let duration_ms = started.elapsed().as_millis() as u64;
          let response_record = serde_json::json!({
            "type": "response",
            "runId": run_id,
            "rowIndex": idx as u32,
            "timestampMs": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis(),
            "status": "error",
            "durationMs": duration_ms,
            "error": err.to_string(),
          });
          if let Err(e) = append_jsonl(&log_file_path, &log_lock, response_record).await {
            let _ = app.emit("processing:debug", format!("row {}: response log error -> {}", idx, e));
          }
        }
      }

      // 進行中リクエスト数を減少
      let current_active = active_requests.fetch_sub(1, std::sync::atomic::Ordering::Relaxed) - 1;
      let _ = app.emit("processing:active_requests", ActiveRequestsEvent { count: current_active });

      let current = progress.fetch_add(1, std::sync::atomic::Ordering::Relaxed) + 1;
      let _ = app.emit("processing:progress", ProgressEvent { current, total });
      let _ = app.emit("processing:debug", format!("row {}: progress {} / {}", idx, current, total));
    });
  }

  // 完了待ち（キャンセルで途中停止可）
  tokio::spawn(async move {
    while let Some(_joined) = set.join_next().await {}
    let success = success_count.load(std::sync::atomic::Ordering::Relaxed);
    let errors = error_count.load(std::sync::atomic::Ordering::Relaxed);
    let _ = app_clone.emit("processing:done", DoneEvent { success, errors });
  });

  Ok(())
}

#[tauri::command]
pub async fn abort_processing(app: AppHandle) -> Result<(), String> {
  if let Some(token) = app.state::<CancelHolder>().0.get() {
    token.cancel();
  }
  let _ = app.emit("processing:aborted", ());
  Ok(())
}

#[derive(Debug, Serialize, Clone)]
struct ProgressEvent {
  current: u32,
  total: u32,
}

#[derive(Debug, Serialize, Clone)]
struct ActiveRequestsEvent {
  count: u32,
}

#[derive(Debug, Serialize, Clone)]
struct RowEvent {
  index: u32,
  status: String,
  data: Option<serde_json::Value>,
  raw: Option<String>,
  error: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
struct DoneEvent {
  success: u32,
  errors: u32,
}

fn render_prompt(template: &str, row: &serde_json::Map<String, serde_json::Value>) -> String {
  let mut out = template.to_string();
  for (k, v) in row.iter() {
    let needle = format!("{{{{{}}}}}", k);
    out = out.replace(&needle, &value_to_string(v));
  }
  out
}

fn value_to_string(v: &serde_json::Value) -> String {
  match v {
    serde_json::Value::String(s) => s.clone(),
    _ => v.to_string(),
  }
}

fn parse_response_text(text: &str) -> Result<serde_json::Value, String> {
  serde_json::from_str::<serde_json::Value>(text.trim())
    .map_err(|_| "JSON not found in Gemini response".to_string())
}

// JSON Lines へ1レコード追記（排他制御込み）
async fn append_jsonl(path: &PathBuf, lock: &tokio::sync::Mutex<()>, value: serde_json::Value) -> Result<(), String> {
  let _g = lock.lock().await;
  let mut file = OpenOptions::new()
    .create(true)
    .append(true)
    .open(path)
    .await
    .map_err(|e| e.to_string())?;

  let line = serde_json::to_string(&value).map_err(|e| e.to_string())?;
  file.write_all(line.as_bytes()).await.map_err(|e| e.to_string())?;
  file.write_all(b"\n").await.map_err(|e| e.to_string())?;
  Ok(())
}

#[derive(Default)]
pub struct CancelHolder(pub OnceCell<CancellationToken>);


// 既定スキーマはフロントエンド側で生成し、ここでは使用しない

