import { invoke } from "@tauri-apps/api/core";
import { createDirectorProposal, createProjectFromDirectorResponse, type DirectorResponse } from "./director";
import { isDesktopApp } from "./projectFiles";
import type { GenerationSettings, MovieProject } from "../types";

export async function developIdea(idea: string, settings: GenerationSettings, apiKey: string): Promise<MovieProject> {
  if (settings.directorProvider === "local") return createDirectorProposal(idea);
  if (!apiKey.trim()) throw new Error("请先在设置中填写 MiniMax API Key，或切换为本地导演。");
  if (!isDesktopApp()) throw new Error("真实 AI 导演只能在 Tauri 桌面应用中运行。");
  const content = await invoke<string>("minimax_director_proposal", { apiKey, idea, model: settings.directorModel });
  return createProjectFromDirectorResponse(idea, parseDirectorJson(content));
}

export function parseDirectorJson(content: string): DirectorResponse {
  const withoutThinking = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenced = withoutThinking.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? withoutThinking.slice(withoutThinking.indexOf("{"), withoutThinking.lastIndexOf("}") + 1);
  try {
    return JSON.parse(candidate) as DirectorResponse;
  } catch {
    throw new Error("AI 导演返回了无法解析的分镜，请重新设计一次。");
  }
}
