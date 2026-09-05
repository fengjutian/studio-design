import { invoke } from "@tauri-apps/api/core";
import type { GenerationSettings, MovieProject, Shot } from "../types";

export interface GenerateInput {
  shot: Shot;
  project: MovieProject;
  settings: GenerationSettings;
  apiKey?: string;
}

export interface GenerateResult {
  taskId: string;
  videoUrl?: string;
  localAssetPath?: string;
}

export interface VideoProvider {
  generate(input: GenerateInput): Promise<GenerateResult>;
}

export function buildShotPrompt(shot: Shot, project: MovieProject) {
  const motion = cameraCommand(shot.movement);
  return [
    shot.description,
    `Cinematic ${shot.framing}, ${project.visualStyle}.`,
    motion,
    "Consistent subject appearance, coherent physical motion, no subtitles, no watermark.",
  ].filter(Boolean).join(" ");
}

export function supportedVideoDuration(shotDuration: number): 6 | 10 {
  return shotDuration <= 6 ? 6 : 10;
}

export function getVideoProvider(settings: GenerationSettings): VideoProvider {
  return settings.provider === "minimax" ? minimaxProvider : mockProvider;
}

const mockProvider: VideoProvider = {
  async generate() {
    await delay(2200);
    return { taskId: `mock-${Date.now()}` };
  },
};

const minimaxProvider: VideoProvider = {
  async generate({ shot, project, settings, apiKey }) {
    if (!apiKey?.trim()) throw new Error("请先在设置中填写 MiniMax API Key。密钥只保留在本次应用会话中。");
    if (!(window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
      throw new Error("真实 MiniMax 生成只能在 Tauri 桌面应用中运行。请使用 npm run tauri dev 启动。");
    }

    const taskId = await invoke<string>("minimax_create_video", {
      apiKey,
      request: {
        model: settings.model,
        prompt: buildShotPrompt(shot, project),
        duration: supportedVideoDuration(shot.duration),
        resolution: settings.resolution,
      },
    });

    for (let attempt = 0; attempt < 180; attempt += 1) {
      await delay(10_000);
      const result = await invoke<MiniMaxTaskResult>("minimax_query_video", { apiKey, taskId });
      if (result.status === "Success") {
        if (!result.fileId) throw new Error("生成已完成，但 MiniMax 未返回文件 ID。");
        const videoUrl = await invoke<string>("minimax_retrieve_file", { apiKey, fileId: result.fileId });
        const localAssetPath = project.localPath
          ? await invoke<string>("download_generation", { projectPath: project.localPath, shotId: shot.id, url: videoUrl })
          : undefined;
        return { taskId, videoUrl, localAssetPath };
      }
      if (result.status === "Fail") throw new Error(result.errorMessage || "MiniMax 未能生成这个镜头。");
    }
    throw new Error("等待生成结果超时。任务仍可能在 MiniMax 后台继续执行。");
  },
};

interface MiniMaxTaskResult {
  status: string;
  fileId?: string;
  errorMessage?: string;
}

function cameraCommand(movement: string) {
  if (/跟拍/.test(movement)) return "[Tracking shot]";
  if (/推近|推进/.test(movement)) return "[Push in]";
  if (/拉远/.test(movement)) return "[Pull out]";
  if (/手持/.test(movement)) return "[Shake]";
  if (/静止/.test(movement)) return "[Static shot]";
  return "";
}

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
