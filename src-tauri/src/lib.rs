use serde::{Deserialize, Serialize};

const MINIMAX_API_BASE: &str = "https://api.minimax.io/v1";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateVideoRequest {
    model: String,
    prompt: String,
    duration: u8,
    resolution: String,
}

#[derive(Deserialize)]
struct CreateVideoResponse {
    task_id: Option<String>,
    base_resp: BaseResponse,
}

#[derive(Deserialize)]
struct QueryVideoResponse {
    status: String,
    file_id: Option<String>,
    error_message: Option<String>,
    base_resp: BaseResponse,
}

#[derive(Deserialize)]
struct RetrieveFileResponse {
    file: Option<RetrievedFile>,
    base_resp: BaseResponse,
}

#[derive(Deserialize)]
struct RetrievedFile {
    download_url: String,
}

#[derive(Deserialize)]
struct BaseResponse {
    status_code: i64,
    status_msg: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VideoTaskResult {
    status: String,
    file_id: Option<String>,
    error_message: Option<String>,
}

#[tauri::command]
async fn minimax_create_video(api_key: String, request: CreateVideoRequest) -> Result<String, String> {
    validate_key(&api_key)?;
    if request.prompt.trim().is_empty() || request.prompt.chars().count() > 2000 {
        return Err("镜头描述必须在 1 到 2000 个字符之间。".into());
    }
    if !matches!(request.duration, 6 | 10) {
        return Err("MiniMax 视频时长必须为 6 秒或 10 秒。".into());
    }

    let response = client()
        .post(format!("{MINIMAX_API_BASE}/video_generation"))
        .bearer_auth(api_key.trim())
        .json(&serde_json::json!({
            "model": request.model,
            "prompt": request.prompt,
            "duration": request.duration,
            "resolution": request.resolution,
        }))
        .send()
        .await
        .map_err(network_error)?;

    let status = response.status();
    let body: CreateVideoResponse = response.json().await.map_err(parse_error)?;
    ensure_success(status, &body.base_resp)?;
    body.task_id.ok_or_else(|| "MiniMax 未返回任务 ID。".into())
}

#[tauri::command]
async fn minimax_query_video(api_key: String, task_id: String) -> Result<VideoTaskResult, String> {
    validate_key(&api_key)?;
    let response = client()
        .get(format!("{MINIMAX_API_BASE}/query/video_generation"))
        .bearer_auth(api_key.trim())
        .query(&[("task_id", task_id)])
        .send()
        .await
        .map_err(network_error)?;

    let status = response.status();
    let body: QueryVideoResponse = response.json().await.map_err(parse_error)?;
    ensure_success(status, &body.base_resp)?;
    Ok(VideoTaskResult {
        status: body.status,
        file_id: body.file_id,
        error_message: body.error_message,
    })
}

#[tauri::command]
async fn minimax_retrieve_file(api_key: String, file_id: String) -> Result<String, String> {
    validate_key(&api_key)?;
    let response = client()
        .get(format!("{MINIMAX_API_BASE}/files/retrieve"))
        .bearer_auth(api_key.trim())
        .query(&[("file_id", file_id)])
        .send()
        .await
        .map_err(network_error)?;

    let status = response.status();
    let body: RetrieveFileResponse = response.json().await.map_err(parse_error)?;
    ensure_success(status, &body.base_resp)?;
    body.file
        .map(|file| file.download_url)
        .ok_or_else(|| "MiniMax 未返回视频下载地址。".into())
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("reqwest client configuration is valid")
}

fn validate_key(api_key: &str) -> Result<(), String> {
    if api_key.trim().is_empty() {
        Err("MiniMax API Key 不能为空。".into())
    } else {
        Ok(())
    }
}

fn ensure_success(http_status: reqwest::StatusCode, base: &BaseResponse) -> Result<(), String> {
    if http_status.is_success() && base.status_code == 0 {
        Ok(())
    } else {
        Err(format!("MiniMax 请求失败：{}", base.status_msg))
    }
}

fn network_error(error: reqwest::Error) -> String {
    format!("无法连接 MiniMax：{error}")
}

fn parse_error(error: reqwest::Error) -> String {
    format!("无法解析 MiniMax 返回结果：{error}")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            minimax_create_video,
            minimax_query_video,
            minimax_retrieve_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running Director Studio");
}
