use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::Manager;

const MINIMAX_API_BASE: &str = "https://api.minimaxi.com/v1";

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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportClip {
    path: String,
    trim_start: f64,
    trim_end: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportAudio {
    path: String,
    trim_start: f64,
    volume: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportedAudio {
    path: String,
    name: String,
    duration: f64,
}

#[derive(Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
    base_resp: BaseResponse,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Deserialize)]
struct ChatMessage {
    content: String,
}

#[tauri::command]
async fn minimax_director_proposal(
    api_key: String,
    idea: String,
    model: String,
) -> Result<String, String> {
    validate_key(&api_key)?;
    if idea.trim().is_empty() || idea.chars().count() > 4000 {
        return Err("The movie idea must contain between 1 and 4000 characters.".into());
    }
    if !matches!(
        model.as_str(),
        "MiniMax-M3" | "MiniMax-M2.7" | "MiniMax-M2.7-highspeed"
    ) {
        return Err("Unsupported AI director model.".into());
    }
    let system = r#"You are the behind-the-scenes director for a Chinese AI filmmaking desktop application. Turn the user's idea into a concise, filmable short movie plan. Return only valid JSON, with no Markdown. Schema: {"title":string,"synopsis":string,"visualStyle":string,"scenes":[{"title":string,"location":string,"mood":string,"shots":[{"title":string,"description":string,"framing":string,"movement":string,"duration":number}]}]}. Use Chinese. Create 1-5 scenes and 3-12 shots total. Each shot must be visually specific, continuous with adjacent shots, and 2-10 seconds long. framing and movement should be understandable Chinese film terms."#;
    let response = client()
        .post(format!("{MINIMAX_API_BASE}/chat/completions"))
        .bearer_auth(api_key.trim())
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                {"role": "system", "name": "Director Studio", "content": system},
                {"role": "user", "name": "Director", "content": idea}
            ],
            "temperature": 1.0,
            "max_completion_tokens": 4096
        }))
        .send()
        .await
        .map_err(network_error)?;
    let status = response.status();
    let body: ChatCompletionResponse = response.json().await.map_err(parse_error)?;
    ensure_success(status, &body.base_resp)?;
    body.choices
        .into_iter()
        .next()
        .map(|choice| choice.message.content)
        .ok_or_else(|| "AI director returned no proposal.".into())
}

#[tauri::command]
async fn minimax_expand_idea(
    api_key: String,
    idea: String,
    model: String,
) -> Result<String, String> {
    validate_key(&api_key)?;
    if idea.trim().is_empty() || idea.chars().count() > 4000 {
        return Err("The movie idea must contain between 1 and 4000 characters.".into());
    }
    if !matches!(
        model.as_str(),
        "MiniMax-M3" | "MiniMax-M2.7" | "MiniMax-M2.7-highspeed"
    ) {
        return Err("Unsupported AI director model.".into());
    }
    let system = r#"You are a Chinese film creative assistant. Expand the user's rough idea into one vivid, coherent and filmable movie prompt. Preserve the core premise. Include protagonist, dramatic goal, conflict, setting, atmosphere, visual style and a compelling turn. Write one compact Chinese paragraph of 120-220 Chinese characters. Return only the expanded prompt, with no title, explanation, Markdown or JSON."#;
    let response = client()
        .post(format!("{MINIMAX_API_BASE}/chat/completions"))
        .bearer_auth(api_key.trim())
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                {"role": "system", "name": "Director Studio", "content": system},
                {"role": "user", "name": "Director", "content": idea}
            ],
            "temperature": 0.9,
            "max_completion_tokens": 800
        }))
        .send()
        .await
        .map_err(network_error)?;
    let status = response.status();
    let body: ChatCompletionResponse = response.json().await.map_err(parse_error)?;
    ensure_success(status, &body.base_resp)?;
    body.choices
        .into_iter()
        .next()
        .map(|choice| choice.message.content)
        .ok_or_else(|| "AI prompt expansion returned no content.".into())
}

#[tauri::command]
async fn minimax_test_connection(api_key: String) -> Result<String, String> {
    validate_key(&api_key)?;
    let response = client()
        .get(format!("{MINIMAX_API_BASE}/models"))
        .bearer_auth(api_key.trim())
        .send()
        .await
        .map_err(network_error)?;
    let status = response.status();
    if status.is_success() {
        Ok("连接成功，API Key 有效。".into())
    } else if status.as_u16() == 401 || status.as_u16() == 403 {
        Err("认证失败，请检查 API Key 是否正确或仍然有效。".into())
    } else {
        Err(format!("MiniMax 接口返回 HTTP {status}，请稍后重试。"))
    }
}

#[tauri::command]
fn allow_project_assets(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let project = std::fs::canonicalize(path)
        .map_err(|error| format!("Cannot access project directory: {error}"))?;
    if !project.join("project.json").is_file() {
        return Err("The selected directory is not a movie project.".into());
    }
    app.asset_protocol_scope()
        .allow_directory(project, true)
        .map_err(|error| format!("Cannot allow local project media: {error}"))
}

#[tauri::command]
async fn import_audio(project_path: String) -> Result<Option<ImportedAudio>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let project = std::fs::canonicalize(project_path)
            .map_err(|error| format!("Cannot access project directory: {error}"))?;
        if !project.join("project.json").is_file() {
            return Err("Save the movie as a local project before importing audio.".into());
        }
        let Some(source) = rfd::FileDialog::new()
            .set_title("Import soundtrack")
            .add_filter("Audio", &["mp3", "wav", "m4a", "aac", "flac", "ogg"])
            .pick_file()
        else {
            return Ok(None);
        };
        let extension = source
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("audio");
        let stem = source
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("soundtrack");
        let destination =
            unique_asset_path(&project.join("assets"), &safe_folder_name(stem), extension);
        std::fs::copy(&source, &destination)
            .map_err(|error| format!("Cannot copy soundtrack into project: {error}"))?;
        let duration = probe_duration(&destination).unwrap_or(0.0);
        Ok(Some(ImportedAudio {
            path: destination.to_string_lossy().into_owned(),
            name: source
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("Soundtrack")
                .to_string(),
            duration,
        }))
    })
    .await
    .map_err(|error| format!("Import audio task failed: {error}"))?
}

#[tauri::command]
async fn create_project_directory(
    title: String,
    project_json: String,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(parent) = rfd::FileDialog::new()
            .set_title("Choose where to save the movie project")
            .pick_folder()
        else {
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
            return Err(
                "Please select a project.json file inside a movie project directory.".into(),
            );
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
            return Err(
                "Project directory does not exist. Use Save As to choose a new location.".into(),
            );
        }
        write_project_json(&project_path, &project_json)
    })
    .await
    .map_err(|error| format!("Save project task failed: {error}"))?
}

#[tauri::command]
async fn download_generation(
    project_path: String,
    shot_id: String,
    url: String,
) -> Result<String, String> {
    if !url.starts_with("https://") {
        return Err("Video download URL must use HTTPS.".into());
    }
    if shot_id.is_empty()
        || !shot_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-')
    {
        return Err("Invalid shot ID.".into());
    }
    let project_path = PathBuf::from(project_path);
    if !project_path.join("project.json").is_file() || !project_path.join("generations").is_dir() {
        return Err("The selected directory is not a valid movie project.".into());
    }
    let destination = project_path
        .join("generations")
        .join(format!("{shot_id}.mp4"));
    let temporary = project_path
        .join("generations")
        .join(format!("{shot_id}.mp4.part"));
    let mut response = reqwest::Client::new()
        .get(url)
        .send()
        .await
        .map_err(network_error)?
        .error_for_status()
        .map_err(network_error)?;
    let mut output = std::fs::File::create(&temporary)
        .map_err(|error| format!("Cannot create video file: {error}"))?;
    while let Some(chunk) = response.chunk().await.map_err(network_error)? {
        std::io::Write::write_all(&mut output, &chunk)
            .map_err(|error| format!("Cannot write video file: {error}"))?;
    }
    drop(output);
    if destination.exists() {
        std::fs::remove_file(&destination)
            .map_err(|error| format!("Cannot replace generated video: {error}"))?;
    }
    std::fs::rename(&temporary, &destination)
        .map_err(|error| format!("Cannot finish video download: {error}"))?;
    Ok(destination.to_string_lossy().into_owned())
}

#[tauri::command]
async fn export_movie(
    project_path: String,
    title: String,
    clips: Vec<ExportClip>,
    audio: Option<ExportAudio>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if clips.is_empty() {
            return Err("No generated shots are available for export.".into());
        }
        let project = std::fs::canonicalize(&project_path)
            .map_err(|error| format!("Cannot access project directory: {error}"))?;
        let generations = std::fs::canonicalize(project.join("generations"))
            .map_err(|error| format!("Cannot access generations directory: {error}"))?;
        let exports = project.join("exports");
        std::fs::create_dir_all(&exports)
            .map_err(|error| format!("Cannot create exports directory: {error}"))?;

        let mut inputs = Vec::with_capacity(clips.len());
        for clip in clips {
            let path = std::fs::canonicalize(&clip.path)
                .map_err(|error| format!("Cannot access a timeline clip: {error}"))?;
            if !path.starts_with(&generations) || path.extension().and_then(|value| value.to_str()) != Some("mp4") {
                return Err("Every export clip must be an MP4 from this project's generations directory.".into());
            }
            if clip.trim_start < 0.0 || clip.trim_end <= clip.trim_start {
                return Err("A timeline clip has an invalid trim range.".into());
            }
            inputs.push((path, clip.trim_start, clip.trim_end));
        }

        let output = unique_export_path(&exports, &safe_folder_name(&title));
        let mut command = std::process::Command::new("ffmpeg");
        command.arg("-y");
        for (input, _, _) in &inputs {
            command.arg("-i").arg(input);
        }
        let audio_path = if let Some(track) = &audio {
            let path = std::fs::canonicalize(&track.path)
                .map_err(|error| format!("Cannot access soundtrack: {error}"))?;
            if !path.starts_with(project.join("assets")) {
                return Err("Soundtrack must be stored in this project's assets directory.".into());
            }
            command.arg("-i").arg(&path);
            Some(path)
        } else {
            None
        };

        let mut filter = String::new();
        for (index, (_, trim_start, trim_end)) in inputs.iter().enumerate() {
            filter.push_str(&format!(
                "[{index}:v:0]trim=start={trim_start}:end={trim_end},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v{index}];"
            ));
        }
        for index in 0..inputs.len() {
            filter.push_str(&format!("[v{index}]"));
        }
        filter.push_str(&format!("concat=n={}:v=1:a=0[outv]", inputs.len()));
        if let Some(track) = &audio {
            filter.push_str(&format!(";[{}:a:0]atrim=start={},asetpts=PTS-STARTPTS,volume={}[outa]", inputs.len(), track.trim_start.max(0.0), track.volume.clamp(0.0, 2.0)));
        }

        command.args(["-filter_complex", &filter, "-map", "[outv]"]);
        if audio_path.is_some() {
            command.args(["-map", "[outa]", "-c:a", "aac", "-b:a", "192k", "-shortest"]);
        }
        let result = command
            .args(["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart"])
            .arg(&output)
            .output()
            .map_err(|error| format!("Cannot start FFmpeg. Install FFmpeg and make sure it is available on PATH: {error}"))?;
        if !result.status.success() {
            let details = String::from_utf8_lossy(&result.stderr);
            let tail: String = details.chars().rev().take(900).collect::<String>().chars().rev().collect();
            return Err(format!("FFmpeg export failed: {tail}"));
        }
        Ok(output.to_string_lossy().into_owned())
    })
    .await
    .map_err(|error| format!("Export task failed: {error}"))?
}

fn unique_export_path(exports: &Path, title: &str) -> PathBuf {
    let initial = exports.join(format!("{title}.mp4"));
    if !initial.exists() {
        return initial;
    }
    for number in 2..10_000 {
        let candidate = exports.join(format!("{title} {number}.mp4"));
        if !candidate.exists() {
            return candidate;
        }
    }
    exports.join(format!("{title}-{}.mp4", std::process::id()))
}

fn unique_asset_path(directory: &Path, stem: &str, extension: &str) -> PathBuf {
    let initial = directory.join(format!("{stem}.{extension}"));
    if !initial.exists() {
        return initial;
    }
    for number in 2..10_000 {
        let candidate = directory.join(format!("{stem} {number}.{extension}"));
        if !candidate.exists() {
            return candidate;
        }
    }
    directory.join(format!("{stem}-{}.{}", std::process::id(), extension))
}

fn probe_duration(path: &Path) -> Result<f64, String> {
    let output = std::process::Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
        ])
        .arg(path)
        .output()
        .map_err(|error| format!("Cannot start ffprobe: {error}"))?;
    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse::<f64>()
        .map_err(|error| format!("Cannot read audio duration: {error}"))
}

fn safe_folder_name(title: &str) -> String {
    let cleaned: String = title
        .chars()
        .filter(|character| {
            !matches!(
                character,
                '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*'
            )
        })
        .collect();
    let trimmed = cleaned.trim().trim_end_matches('.');
    if trimmed.is_empty() {
        "Untitled movie".into()
    } else {
        trimmed.chars().take(80).collect()
    }
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
    std::fs::create_dir_all(path)
        .map_err(|error| format!("Cannot create project directory: {error}"))?;
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
    std::fs::write(&temporary, pretty)
        .map_err(|error| format!("Cannot write temporary project file: {error}"))?;
    if destination.exists() {
        std::fs::remove_file(&destination)
            .map_err(|error| format!("Cannot replace project file: {error}"))?;
    }
    std::fs::rename(&temporary, &destination)
        .map_err(|error| format!("Cannot finish saving project: {error}"))?;
    Ok(())
}

#[tauri::command]
async fn minimax_create_video(
    api_key: String,
    request: CreateVideoRequest,
) -> Result<String, String> {
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
            allow_project_assets,
            import_audio,
            create_project_directory,
            open_project_file,
            save_project_file,
            download_generation,
            export_movie,
            minimax_director_proposal,
            minimax_expand_idea,
            minimax_test_connection,
            minimax_create_video,
            minimax_query_video,
            minimax_retrieve_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running Director Studio");
}
