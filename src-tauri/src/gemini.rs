use anyhow::{anyhow, Result};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::sleep;

#[derive(Debug, Clone)]
pub struct GeminiClientRust {
  http: Client,
  api_key: String,
}

impl GeminiClientRust {
  pub fn new(api_key: String, timeout_secs: u64) -> Result<Self> {
    let http = Client::builder()
      // ALPNに任せる（HTTP/2 or HTTP/1.1）。Prior Knowledgeは使わない
      .pool_max_idle_per_host(10)
      .pool_idle_timeout(Duration::from_secs(90))
      .connect_timeout(Duration::from_secs(30)) // 接続タイムアウトを30秒に延長
      .tcp_keepalive(Duration::from_secs(30))
      .use_rustls_tls()
      .timeout(Duration::from_secs(timeout_secs))
      .build()?;
    Ok(Self { http, api_key })
  }

  pub async fn generate_with_search(&self, prompt: &str, enable_web_search: bool) -> Result<GenerateResponse> {
    let url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    let body = GenerateRequest {
      contents: vec![Content {
        parts: vec![Part { text: prompt.to_string() }],
      }],
      tools: if enable_web_search {
        vec![Tool { google_search: GoogleSearch {} }]
      } else {
        vec![]
      },
    };

    // リトライ 5 回、指数バックオフ（送信エラーも含む）
    let mut attempt: u32 = 0;
    loop {
      let res = match self
        .http
        .post(url)
        .header("x-goog-api-key", &self.api_key)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
      {
        Ok(resp) => resp,
        Err(e) => {
          if attempt >= 5 {
            // より詳細なエラー情報を提供
            let error_msg = if e.is_timeout() {
              "Connection timeout - check network connection"
            } else if e.is_connect() {
              "Connection failed - check firewall/proxy settings"
            } else if e.is_request() {
              "Request failed - check API key and permissions"
            } else {
              &format!("Network error: {}", e)
            };
            return Err(anyhow!(format!("send error (retry exceeded): {}", error_msg)));
          }
          let backoff = Duration::from_millis(500 * (1u64 << attempt));
          sleep(backoff).await;
          attempt += 1;
          continue;
        }
      };

      match res.status() {
        StatusCode::OK => {
          let v: serde_json::Value = res.json().await?;
          // `text` は SDK が合成してくれるが REST では parts から抽出
          let text = v
            .pointer("/candidates/0/content/parts/0/text")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string();
          let grounding_metadata = v.pointer("/candidates/0/groundingMetadata").cloned();
          return Ok(GenerateResponse { text, grounding_metadata });
        }
        StatusCode::TOO_MANY_REQUESTS | StatusCode::BAD_GATEWAY | StatusCode::SERVICE_UNAVAILABLE | StatusCode::GATEWAY_TIMEOUT => {
          if attempt >= 5 {
            let text = res.text().await.unwrap_or_default();
            return Err(anyhow!(format!("retry exceeded: {}", text)));
          }
          let backoff = Duration::from_millis(500 * (1u64 << attempt));
          sleep(backoff).await;
          attempt += 1;
          continue;
        }
        _ => {
          let text = res.text().await.unwrap_or_default();
          return Err(anyhow!(format!("gemini error: {}", text)));
        }
      }
    }
  }
}

// Tauriコマンド用の薄いヘルパー
pub async fn generate_with_search_once(api_key: String, prompt: String, timeout_secs: u64, enable_web_search: bool) -> Result<GenerateResponse> {
  let client = GeminiClientRust::new(api_key, timeout_secs)?;
  client.generate_with_search(&prompt, enable_web_search).await
}

#[derive(Debug, Serialize)]
struct GenerateRequest {
  contents: Vec<Content>,
  tools: Vec<Tool>,
}

#[derive(Debug, Serialize)]
struct Content {
  parts: Vec<Part>,
}

#[derive(Debug, Serialize)]
struct Part {
  text: String,
}

#[derive(Debug, Serialize)]
struct Tool {
  #[serde(rename = "google_search")]
  google_search: GoogleSearch,
}

#[derive(Debug, Serialize)]
struct GoogleSearch {}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GenerateResponse {
  pub text: String,
  pub grounding_metadata: Option<serde_json::Value>,
}


