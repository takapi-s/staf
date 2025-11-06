use crate::gemini::GeminiClientRust;
use anyhow::Result;
use governor::{Quota, RateLimiter};
use serde::{Deserialize, Serialize};
use std::{num::NonZeroU32, sync::Arc};
use tauri::{AppHandle, Emitter, Manager};
use tokio::{sync::Semaphore, task::JoinSet};
use tokio_util::sync::CancellationToken;
use std::sync::atomic::AtomicU32;
use once_cell::sync::OnceCell;

#[derive(Debug, Deserialize, Clone)]
pub struct ProcessConfig {
  pub api_key: String,
  pub concurrency: usize,
  pub rate_limit_rpm: u32,
  pub timeout_secs: u64,
  pub prompt_template: String,
  #[serde(default = "default_enable_web_search")]
  pub enable_web_search: bool,
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
  let client = Arc::new(
    GeminiClientRust::new(config.api_key.clone(), config.timeout_secs)
      .map_err(|e| e.to_string())?,
  );

  let total = rows.len() as u32;
  let mut set = JoinSet::new();
  let app_clone = app.clone();
  let prompt_template = config.prompt_template.clone();
  let enable_web_search = config.enable_web_search;

  let success_count = Arc::new(AtomicU32::new(0));
  let error_count = Arc::new(AtomicU32::new(0));
  let progress = Arc::new(AtomicU32::new(0));
  let active_requests = Arc::new(AtomicU32::new(0));

  for (idx, row) in rows.into_iter().enumerate() {
    let sem = semaphore.clone();
    let limiter = limiter.clone();
    let client = client.clone();
    let app = app_clone.clone();
    let cancel = cancel.clone();
    let success_count = success_count.clone();
    let error_count = error_count.clone();
    let progress = progress.clone();
    let active_requests = active_requests.clone();
    let prompt_template = prompt_template.clone();

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
      
      let res = client.generate_with_search(&prompt, enable_web_search).await;

      match res {
        Ok(resp) => {
          let _ = app.emit("processing:debug", format!("row {}: response received (text_len={})", idx, resp.text.len()));
          success_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
          let _ = app.emit("processing:row", RowEvent {
            index: idx as u32,
            status: "success".into(),
            data: Some(parse_response_text(&resp.text)),
            raw: Some(resp.text),
            error: None,
          });
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

fn parse_response_text(text: &str) -> serde_json::Value {
  let trimmed = text.trim();

  // 1) コードブロック内のJSON（オブジェクト）
  if let Some(caps) = regex::Regex::new(r"```(?:json)?\s*(\{[\s\S]*\})\s*```")
    .ok()
    .and_then(|re| re.captures(trimmed))
  {
    if let Some(m) = caps.get(1) {
      if let Ok(v) = serde_json::from_str::<serde_json::Value>(m.as_str()) {
        return v;
      }
    }
  }

  // 2) コードブロック内のJSON（配列）
  if let Some(caps) = regex::Regex::new(r"```(?:json)?\s*(\[[\s\S]*\])\s*```")
    .ok()
    .and_then(|re| re.captures(trimmed))
  {
    if let Some(m) = caps.get(1) {
      if let Ok(v) = serde_json::from_str::<serde_json::Value>(m.as_str()) {
        return v;
      }
    }
  }

  // 3) 全文がJSONとして妥当
  if let Ok(v) = serde_json::from_str::<serde_json::Value>(trimmed) {
    return v;
  }

  // 4) フリーテキスト混在: 最初のオブジェクト/配列のJSONを切り出してパース
  fn try_parse_between(text: &str, start: char, end: char) -> Option<serde_json::Value> {
    let start_pos = text.find(start)?;
    // end 文字の出現位置をすべて集め、後方から順に試す
    let mut end_positions: Vec<usize> = text.match_indices(end).map(|(i, _)| i).collect();
    end_positions.sort_unstable();
    while let Some(pos) = end_positions.pop() {
      if pos <= start_pos { continue; }
      if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text[start_pos..=pos]) {
        return Some(v);
      }
    }
    None
  }

  if let Some(v) = try_parse_between(trimmed, '{', '}') {
    return v;
  }
  if let Some(v) = try_parse_between(trimmed, '[', ']') {
    return v;
  }

  // 5) それでもだめなら生テキストを格納
  serde_json::json!({"result": text})
}

#[derive(Default)]
pub struct CancelHolder(pub OnceCell<CancellationToken>);


