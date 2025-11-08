use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use gemini_rust::{Gemini, Tool};

// ↑ 旧REST実装は削除（gemini-rustへ移行）

// （旧RESTヘルパーは削除）

// 旧 GenerateRequest は廃止

// （旧REST向けの構造体類は削除）

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GenerateResponse {
  pub text: String,
  pub grounding_metadata: Option<serde_json::Value>,
  pub intermediate_notes: Option<String>,
  pub stage2_input: Option<String>,
}

// （旧REST用スキーマ関数は不要）

// ==== gemini-rust を使った新実装（Structured Response & Google Search）====

// プロンプト生成（テキストのみ、ツールなし）
pub async fn generate_prompt_text_once(api_key: String, prompt: String, _timeout_secs: u64) -> Result<GenerateResponse> {
  let client = Gemini::new(api_key).map_err(|e| anyhow!(e.to_string()))?;
  println!("[gemini.rs] generate_prompt_text_once: prompt=\n{}", prompt);
  let resp = client
    .generate_content()
    .with_user_message(prompt)
    .execute()
    .await
    .map_err(|e| anyhow!(e.to_string()))?;
  let text = resp.text().to_string();
  println!("[gemini.rs] generate_prompt_text_once: response_text(raw)=\n{}", text);
  Ok(GenerateResponse { text, grounding_metadata: None, intermediate_notes: None, stage2_input: None })
}

pub async fn generate_events_with_search_once(
  api_key: String,
  prompt: String,
  _timeout_secs: u64,
  enable_web_search: bool,
  response_schema: Option<serde_json::Value>,
) -> Result<GenerateResponse> {
  let client = Gemini::new(api_key).map_err(|e| anyhow!(e.to_string()))?;

  println!("[gemini.rs] generate_events_with_search_once: enable_web_search={}", enable_web_search);
  println!("[gemini.rs] generate_events_with_search_once: prompt=\n{}", prompt);
  match &response_schema {
    Some(schema) => {
      match serde_json::to_string_pretty(schema) {
        Ok(pretty) => println!("[gemini.rs] response_schema(JSON pretty)=\n{}", pretty),
        Err(_) => println!("[gemini.rs] response_schema: <failed to pretty-print>"),
      }
    }
    None => println!("[gemini.rs] response_schema=None"),
  }

  if enable_web_search {
    // 1) 検索・収集フェーズ（ツール使用／MIME・スキーマ未指定）
    let search_prompt = format!(
      "{}\n\n上の指示に従い、信頼できる情報源を優先して事実を収集してください。結果は箇条書きのメモとして簡潔に出力してください。",
      prompt
    );
    let notes_resp = client
      .generate_content()
      .with_system_prompt("与えられたタスクの要件に従い、Google検索ツールで根拠を収集し、確認できた事実のみを箇条書きで要約してください。URLや出典名を含めても構いません。")
      .with_user_message(search_prompt)
      .with_tool(Tool::google_search())
      .execute()
      .await
      .map_err(|e| anyhow!(e.to_string()))?;
    let notes_text = notes_resp.text().to_string();
    println!("[gemini.rs] stage1(search/collect) notes(raw)=\n{}", notes_text);

    // 2) 構造化フェーズ（ツール未使用／MIME・スキーマ指定）
    let mut struct_builder = client
      .generate_content()
      .with_system_prompt("与えられたメモの内容だけに基づき、指定されたスキーマに厳密に従うJSONを返してください。未知や不確実な値はnullを使用してください。")
      .with_user_message({
        let s = format!(
          "以下のメモを、指定のスキーマに従ってJSONへ構造化してください。\n\n--- メモ ---\n{}\n----------------\n",
          notes_text
        );
        s
      })
      .with_response_mime_type("application/json");
    if let Some(schema) = response_schema {
      struct_builder = struct_builder.with_response_schema(schema);
    }
    let struct_resp = struct_builder
      .execute()
      .await
      .map_err(|e| anyhow!(e.to_string()))?;
    let text = struct_resp.text().to_string();
    println!("[gemini.rs] stage2(structure) response_text(raw)=\n{}", text);
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
      if let Ok(pretty) = serde_json::to_string_pretty(&json) {
        println!("[gemini.rs] stage2(structure) response_text(JSON pretty)=\n{}", pretty);
      }
    }
    Ok(GenerateResponse {
      text,
      grounding_metadata: None,
      intermediate_notes: Some(notes_text),
      stage2_input: Some("以下のメモを、指定のスキーマに従ってJSONへ構造化してください。--- メモ --- ...".to_string()),
    })
  } else {
    // 検索なし：単発で構造化出力（ツール未使用／MIME・スキーマ指定）
    let mut builder = client
      .generate_content()
      .with_system_prompt("指定されたスキーマに厳密に従い、JSONのみを返してください。未知や不確実な値はnullを使用してください。")
      .with_user_message(prompt)
      .with_response_mime_type("application/json");
    if let Some(schema) = response_schema {
      builder = builder.with_response_schema(schema);
    }
    let resp = builder
      .execute()
      .await
      .map_err(|e| anyhow!(e.to_string()))?;
    let text = resp.text().to_string();
    println!("[gemini.rs] single(structure) response_text(raw)=\n{}", text);
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
      if let Ok(pretty) = serde_json::to_string_pretty(&json) {
        println!("[gemini.rs] single(structure) response_text(JSON pretty)=\n{}", pretty);
      }
    }
    Ok(GenerateResponse { text, grounding_metadata: None, intermediate_notes: None, stage2_input: None })
  }
}


