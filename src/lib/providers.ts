import { invoke } from "@tauri-apps/api/core";
import { getPreviousTimelineShot, isUsableContinuitySource } from "./timeline";
import { getProviderDefinition } from "./providerRegistry";
import { continuityFrameTime } from "./continuityFrames";
import { actionStart, firstFrameIssue, transitionMode, usesPreviousFrame } from "./shotDirection";
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
  visualReferenceName?: string;
  generatedFirstFramePath?: string;
}

export interface VideoProvider {
  id: string;
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
    transitionMode(shot, project) === "continue" && previousShot && `CONTINUE DIRECTLY FROM PREVIOUS SHOT: ${previousShot.description}. Preserve the ending positions, screen direction, action phase, environment state and lighting continuity.`,
    transitionMode(shot, project) === "cut" && "CAMERA CUT: use the approved opening composition. Preserve character identity and screen direction; do not morph from the previous camera angle.",
    transitionMode(shot, project) === "scene" && "NEW SCENE: establish the specified location and opening composition. Preserve character identity; do not carry over the previous background or action.",
    ...(project.characters ?? []).filter((character) => shot.characterIds?.includes(character.id)).map((character) => `CHARACTER ${character.name}: ${character.description}`),
    `CURRENT SHOT: ${shot.generationPromptOverride?.trim() || shot.description}`,
    project.directorStyle?.prompt && `DIRECTOR STYLE (${project.directorStyle.name}): ${project.directorStyle.prompt}. Apply to presentation only; preserve this shot's action, character identity and approved composition.`,
    actionStart(shot, project) && `ACTION START STATE: ${actionStart(shot, project)}`,
    shot.actionPlan?.action.trim() && `PRIMARY ACTION: ${shot.actionPlan.action.trim()}. Perform this single action; do not add unrelated attacks, jumps or turns.`,
    shot.actionPlan?.end.trim() && `TARGET END STATE: ${shot.actionPlan.end.trim()}. Reach this state within the first ${Math.min(shot.trimEnd ?? shot.duration, shot.duration)} seconds used by the edit.`,
    shot.actionPlan && "Maintain movement direction, supporting foot, weapon hand and action phase. Do not reset the pose at the opening. These are planned states; follow the reference image where physical details differ.",
    `Cinematic ${shot.framing}, ${project.visualStyle}.`,
    motion,
    "Temporal continuity, consistent subject appearance, coherent physical motion, no jump in wardrobe or environment, no subtitles, no watermark.",
  ].filter(Boolean).join(" ");
}

export function getContinuitySource(shot: Shot, project: MovieProject): Shot | undefined {
  if (!usesPreviousFrame(shot, project)) return undefined;
  const previous = getPreviousTimelineShot(project, shot.id);
  if (!isUsableContinuitySource(previous)) return undefined;
  return previous;
}

export function supportedVideoDuration(shotDuration: number): 6 | 10 {
  return shotDuration <= 6 ? 6 : 10;
}

export function modelForGeneration(model: GenerationSettings["model"], usesFirstFrame: boolean) {
  return usesFirstFrame && model === "T2V-01-Director" ? "I2V-01-Director" : model;
}

export function getVideoProvider(settings: GenerationSettings): VideoProvider {
  const provider = providerAdapters.get(settings.provider);
  if (!provider) throw new Error(`生成服务“${settings.provider}”尚未安装适配器。`);
  return provider;
}

export function getActiveProviderName(settings: GenerationSettings) {
  return getProviderDefinition(settings.provider)?.name ?? settings.provider;
}

const providerAdapters = new Map<string, VideoProvider>();

export function registerVideoProvider(provider: VideoProvider) {
  providerAdapters.set(provider.id, provider);
}

const mockProvider: VideoProvider = {
  id: "mock",
  async generate() {
    await delay(2200);
    return { taskId: `mock-${Date.now()}` };
  },
};

const minimaxProvider: VideoProvider = {
  id: "minimax",
  async generate({ shot, project, settings, apiKey, onTaskCreated, onProgress }) {
    if (!apiKey?.trim()) throw new Error("请先在设置中填写 MiniMax API Key。密钥只保留在本次应用会话中。");
    if (!(window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
      throw new Error("真实 MiniMax 生成只能在 Tauri 桌面应用中运行。请使用 npm run tauri dev 启动。");
    }

    let continuitySource: Shot | undefined;
    let firstFrameImage: string | undefined;
    if (!shot.taskId) {
      const issue = firstFrameIssue(shot, project);
      if (issue) throw new Error(issue);
      continuitySource = getContinuitySource(shot, project);
      if (usesPreviousFrame(shot, project) && !continuitySource) throw new Error("动作延续需要上一镜头已完成且连续性有效，请先完成上一镜头或切换衔接方式。");
      const source = continuitySource?.localAssetPath ?? continuitySource?.videoUrl;
      if (shot.firstFrame) {
        if (!project.localPath) throw new Error("请先保存项目。");
        firstFrameImage = await invoke<string>("read_project_image_data_url", { projectPath: project.localPath, path: shot.firstFrame.localPath });
      } else if (source) {
        onProgress?.("正在提取上一镜头尾帧", 0);
        firstFrameImage = await invoke<string>("extract_video_last_frame", { source, seconds: continuityFrameTime(continuitySource!) });
      } else if ((sceneReference(shot, project) ?? project.visualReference) && project.localPath) {
        onProgress?.("正在载入项目视觉基准帧", 0);
        const reference = sceneReference(shot, project) ?? project.visualReference!;
        firstFrameImage = await invoke<string>("read_project_image_data_url", { projectPath: project.localPath, path: reference.localPath });
      }
    }

    const prompt = buildShotPrompt(shot, project);
    if (!shot.taskId && prompt.length > 2000) throw new Error("镜头和角色设定合计超过当前模型的 2000 字符限制，请精简描述或减少出场角色。");
    const taskId = shot.taskId ?? await invoke<string>("minimax_create_video", {
        apiKey,
        request: {
          model: modelForGeneration(settings.model, Boolean(firstFrameImage)),
          prompt,
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
          ? await invoke<string>("download_generation", { projectPath: project.localPath, shotId: `${shot.id}-${crypto.randomUUID()}`, url: videoUrl })
          : undefined;
        return {
          taskId,
          videoUrl,
          localAssetPath,
          generatedFirstFramePath: shot.firstFrame?.localPath ?? (shot.taskId ? shot.generatedFirstFramePath : undefined),
          continuitySourceShotId: continuitySource?.id ?? shot.continuitySourceShotId,
          visualReferenceName: shot.firstFrame?.name ?? (shot.taskId ? shot.visualReferenceName : !continuitySource && firstFrameImage ? (sceneReference(shot, project) ?? project.visualReference)?.name : undefined),
        };
      }
      if (["Fail", "Failed"].includes(result.status)) throw new Error(result.errorMessage || "MiniMax 未能生成这个镜头。");
    }
    throw new Error(`等待生成结果超过 10 分钟。任务 ${taskId} 仍可能在 MiniMax 后台继续，可点击“继续查询”。`);
  },
};

registerVideoProvider(mockProvider);
registerVideoProvider(minimaxProvider);

function getOrderedShots(project: MovieProject) {
  const shots = project.scenes.flatMap((scene) => scene.shots);
  if (!project.timelineOrder?.length) return shots;
  const byId = new Map(shots.map((shot) => [shot.id, shot]));
  const ordered = project.timelineOrder.flatMap((id) => byId.get(id) ?? []);
  const included = new Set(ordered.map((shot) => shot.id));
  return [...ordered, ...shots.filter((shot) => !included.has(shot.id))];
}

function sceneReference(shot: Shot, project: MovieProject) {
  return project.scenes.find((scene) => scene.shots.some((candidate) => candidate.id === shot.id))?.visualReference;
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
