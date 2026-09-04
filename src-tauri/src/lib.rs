use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenProjectResult {
    path: String,
    project_json: String,
}

#[tauri::command]
async fn create_project_directory(title: String, project_json: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(parent) = rfd::FileDialog::new().set_title("Choose where to save the movie project").pick_folder() else {
            return Ok(None);
        };
        let folder_name = safe_folder_name(&title);
        let project_path = unique_project_path(&parent, &folder_name);
        create_project_structure(&project_path)?;
        write_project_json(&project_path, &project_json)?;
        Ok(Some(project_path.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|error| format!("Project creation task failed: {error}"))?
}

#[tauri::command]
async fn open_project_file() -> Result<Option<OpenProjectResult>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(file) = rfd::FileDialog::new()
            .set_title("Open movie project")
            .add_filter("Movie project", &["json"])
            .pick_file()
        else {
            return Ok(None);
        };
        if file.file_name().and_then(|name| name.to_str()) != Some("project.json") {
            return Err("Please select a project.json file inside a movie project directory.".into());
        }
        let project_json = std::fs::read_to_string(&file)
            .map_err(|error| format!("Cannot read project: {error}"))?;
        serde_json::from_str::<serde_json::Value>(&project_json)
            .map_err(|error| format!("Invalid project file: {error}"))?;
        let path = file.parent().ok_or("Cannot determine project directory.")?;
        create_project_structure(path)?;
        Ok(Some(OpenProjectResult {
            path: path.to_string_lossy().into_owned(),
            project_json,
        }))
    })
    .await
    .map_err(|error| format!("Open project task failed: {error}"))?
}

#[tauri::command]
async fn save_project_file(path: String, project_json: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let project_path = PathBuf::from(path);
        if !project_path.is_dir() {
            return Err("Project directory does not exist. Use Save As to choose a new location.".into());
        }
        write_project_json(&project_path, &project_json)
    })
    .await
    .map_err(|error| format!("Save project task failed: {error}"))?
}

fn safe_folder_name(title: &str) -> String {
    let cleaned: String = title
        .chars()
        .filter(|character| !matches!(character, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*'))
        .collect();
    let trimmed = cleaned.trim().trim_end_matches('.');
    if trimmed.is_empty() { "Untitled movie".into() } else { trimmed.chars().take(80).collect() }
}

fn unique_project_path(parent: &Path, title: &str) -> PathBuf {
    let initial = parent.join(format!("{title}.movie"));
    if !initial.exists() {
        return initial;
    }
    for number in 2..10_000 {
        let candidate = parent.join(format!("{title} {number}.movie"));
        if !candidate.exists() {
            return candidate;
        }
    }
    parent.join(format!("{title}-{}-movie", std::process::id()))
}

fn create_project_structure(path: &Path) -> Result<(), String> {
    std::fs::create_dir_all(path).map_err(|error| format!("Cannot create project directory: {error}"))?;
    for directory in ["assets", "generations", "thumbnails", "exports"] {
        std::fs::create_dir_all(path.join(directory))
            .map_err(|error| format!("Cannot create {directory} directory: {error}"))?;
    }
    Ok(())
}

fn write_project_json(path: &Path, project_json: &str) -> Result<(), String> {
    let value: serde_json::Value = serde_json::from_str(project_json)
        .map_err(|error| format!("Invalid project data: {error}"))?;
    let pretty = serde_json::to_string_pretty(&value)
        .map_err(|error| format!("Cannot serialize project: {error}"))?;
    let destination = path.join("project.json");
    let temporary = path.join("project.json.tmp");
    std::fs::write(&temporary, pretty).map_err(|error| format!("Cannot write temporary project file: {error}"))?;
    if destination.exists() {
        std::fs::remove_file(&destination).map_err(|error| format!("Cannot replace project file: {error}"))?;
    }
    std::fs::rename(&temporary, &destination).map_err(|error| format!("Cannot finish saving project: {error}"))?;
    Ok(())
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
            create_project_directory,
            open_project_file,
            save_project_file,
            minimax_create_video,
            minimax_query_video,
            minimax_retrieve_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running Director Studio");
}
