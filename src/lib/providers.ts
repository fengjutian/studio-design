import { invoke } from "@tauri-apps/api/core";
import type { GenerationSettings, MovieProject, Shot } from "../types";

export interface GenerateInput {
  shot: Shot;
  project: MovieProject;
  settings: GenerationSettings;
  apiKey?: string;
  onTaskCreated?: (taskId: string) => void;
  onProgress?: (status: string, elapsedSeconds: number) => void;
}

export interface GenerateResult {
  taskId: string;
  videoUrl?: string;
  localAssetPath?: string;
  continuitySourceShotId?: string;
}

export interface VideoProvider {
  generate(input: GenerateInput): Promise<GenerateResult>;
}

export function buildShotPrompt(shot: Shot, project: MovieProject) {
  const motion = cameraCommand(shot.movement);
  const orderedShots = getOrderedShots(project);
  const shotIndex = orderedShots.findIndex((item) => item.id === shot.id);
  const previousShot = shotIndex > 0 ? orderedShots[shotIndex - 1] : undefined;
  const scene = project.scenes.find((item) => item.shots.some((candidate) => candidate.id === shot.id));
  return [
    `PROJECT CONTINUITY BIBLE: ${project.synopsis}`,
    `LOCKED VISUAL STYLE: ${project.visualStyle}. Keep the same character identity, face, hairstyle, age, body proportions, costume, props, architecture, weather, color palette, lighting direction, lens character and film grain across every shot. Do not redesign or replace established elements.`,
    scene && `CURRENT SCENE: ${scene.location}; mood: ${scene.mood}.`,
    previousShot && `CONTINUE DIRECTLY FROM PREVIOUS SHOT: ${previousShot.description}. Preserve the ending positions, screen direction, action phase, environment state and lighting continuity.`,
    `CURRENT SHOT: ${shot.description}`,
    `Cinematic ${shot.framing}, ${project.visualStyle}.`,
    motion,
    "Temporal continuity, consistent subject appearance, coherent physical motion, no jump in wardrobe or environment, no subtitles, no watermark.",
  ].filter(Boolean).join(" ");
}

export function getContinuitySource(shot: Shot, project: MovieProject): Shot | undefined {
  const orderedShots = getOrderedShots(project);
  const shotIndex = orderedShots.findIndex((item) => item.id === shot.id);
  if (shotIndex <= 0) return undefined;
  const previous = orderedShots[shotIndex - 1];
  return previous.generationStatus === "completed" && Boolean(previous.localAssetPath || previous.videoUrl)
    ? previous
    : undefined;
}

export function supportedVideoDuration(shotDuration: number): 6 | 10 {
  return shotDuration <= 6 ? 6 : 10;
}

export function modelForGeneration(model: GenerationSettings["model"], usesFirstFrame: boolean) {
  return usesFirstFrame && model === "T2V-01-Director" ? "I2V-01-Director" : model;
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
  async generate({ shot, project, settings, apiKey, onTaskCreated, onProgress }) {
    if (!apiKey?.trim()) throw new Error("请先在设置中填写 MiniMax API Key。密钥只保留在本次应用会话中。");
    if (!(window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
      throw new Error("真实 MiniMax 生成只能在 Tauri 桌面应用中运行。请使用 npm run tauri dev 启动。");
    }

    let continuitySource: Shot | undefined;
    let firstFrameImage: string | undefined;
    if (!shot.taskId) {
      continuitySource = getContinuitySource(shot, project);
      const source = continuitySource?.localAssetPath ?? continuitySource?.videoUrl;
      if (source) {
        onProgress?.("正在提取上一镜头尾帧", 0);
        firstFrameImage = await invoke<string>("extract_video_last_frame", { source });
      }
    }

    const taskId = shot.taskId ?? await invoke<string>("minimax_create_video", {
        apiKey,
        request: {
          model: modelForGeneration(settings.model, Boolean(firstFrameImage)),
          prompt: buildShotPrompt(shot, project),
          duration: supportedVideoDuration(shot.duration),
          resolution: settings.resolution,
          firstFrameImage,
        },
      });
    onTaskCreated?.(taskId);

    for (let attempt = 0; attempt < 60; attempt += 1) {
      await delay(10_000);
      const result = await invoke<MiniMaxTaskResult>("minimax_query_video", { apiKey, taskId });
      onProgress?.(result.status, (attempt + 1) * 10);
      if (result.status === "Success") {
        if (!result.fileId) throw new Error("生成已完成，但 MiniMax 未返回文件 ID。");
        const videoUrl = await invoke<string>("minimax_retrieve_file", { apiKey, fileId: result.fileId });
        const localAssetPath = project.localPath
          ? await invoke<string>("download_generation", { projectPath: project.localPath, shotId: shot.id, url: videoUrl })
          : undefined;
        return { taskId, videoUrl, localAssetPath, continuitySourceShotId: continuitySource?.id ?? shot.continuitySourceShotId };
      }
      if (["Fail", "Failed"].includes(result.status)) throw new Error(result.errorMessage || "MiniMax 未能生成这个镜头。");
    }
    throw new Error(`等待生成结果超过 10 分钟。任务 ${taskId} 仍可能在 MiniMax 后台继续，可点击“继续查询”。`);
  },
};

function getOrderedShots(project: MovieProject) {
  const shots = project.scenes.flatMap((scene) => scene.shots);
  if (!project.timelineOrder?.length) return shots;
  const byId = new Map(shots.map((shot) => [shot.id, shot]));
  const ordered = project.timelineOrder.flatMap((id) => byId.get(id) ?? []);
  const included = new Set(ordered.map((shot) => shot.id));
  return [...ordered, ...shots.filter((shot) => !included.has(shot.id))];
}

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
