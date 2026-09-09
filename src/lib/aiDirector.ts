import { invoke } from "@tauri-apps/api/core";
import { createDirectorProposal, createProjectFromDirectorResponse, type DirectorResponse } from "./director";
import { isDesktopApp } from "./projectFiles";
import type { GenerationSettings, MovieProject, PromptAnalysis } from "../types";

export async function developIdea(idea: string, settings: GenerationSettings, apiKey: string): Promise<MovieProject> {
  if (settings.directorProvider === "local") return createDirectorProposal(idea);
  if (!apiKey.trim()) throw new Error("请先在设置中填写 MiniMax API Key，或切换为本地导演。");
  if (!isDesktopApp()) throw new Error("真实 AI 导演只能在 Tauri 桌面应用中运行。");
  const content = await invoke<string>("minimax_director_proposal", { apiKey, idea, model: settings.directorModel });
  return createProjectFromDirectorResponse(idea, parseDirectorJson(content));
}

export async function expandIdea(idea: string, settings: GenerationSettings, apiKey: string): Promise<string> {
  if (!idea.trim()) throw new Error("请先写下一句电影创意。");
  if (settings.directorProvider !== "minimax") throw new Error("请先在设置中启用 MiniMax AI 导演。");
  if (!apiKey.trim()) throw new Error("请先在设置中填写 MiniMax API Key。");
  if (!isDesktopApp()) throw new Error("AI 扩写只能在 Tauri 桌面应用中运行。");
  const content = await invoke<string>("minimax_expand_idea", { apiKey, idea: idea.trim(), model: settings.directorModel });
  return cleanExpandedIdea(content);
}

export async function analyzeVideoPrompt(idea: string, settings: GenerationSettings, apiKey: string): Promise<PromptAnalysis> {
  if (!idea.trim()) throw new Error("请先写下需要分析的提示词。");
  if (settings.directorProvider !== "minimax") throw new Error("请先在设置中启用 MiniMax AI 导演。");
  if (!apiKey.trim()) throw new Error("请先在设置中填写 MiniMax API Key。");
  if (!isDesktopApp()) throw new Error("AI 提示词分析只能在 Tauri 桌面应用中运行。");
  const content = await invoke<string>("minimax_analyze_video_prompt", { apiKey, idea: idea.trim(), model: settings.directorModel });
  return parsePromptAnalysis(content);
}

export function parsePromptAnalysis(content: string): PromptAnalysis {
  const withoutThinking = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenced = withoutThinking.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? withoutThinking.slice(withoutThinking.indexOf("{"), withoutThinking.lastIndexOf("}") + 1);
  try {
    const value = JSON.parse(candidate) as PromptAnalysis;
    if (!Number.isFinite(value.score) || !["适合", "需要优化", "不适合"].includes(value.verdict) ||
      typeof value.summary !== "string" || !Array.isArray(value.strengths) || !Array.isArray(value.risks) || !Array.isArray(value.suggestions)) throw new Error();
    return { ...value, score: Math.max(0, Math.min(100, Math.round(value.score))) };
  } catch {
    throw new Error("AI 返回了无法解析的分析结果，请重试。");
  }
}

export function cleanExpandedIdea(content: string): string {
  const result = content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim()
    .replace(/^```(?:text|markdown)?\s*|\s*```$/gi, "")
    .trim();
  if (!result) throw new Error("AI 没有返回扩写内容，请再试一次。");
  return result;
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
