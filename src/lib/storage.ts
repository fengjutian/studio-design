import type { GenerationSettings, MovieProject, PromptVersion } from "../types";
import { normalizeGenerationSettings } from "./providerRegistry";

const KEY = "director-studio-projects-v1";
const SETTINGS_KEY = "director-studio-settings-v1";
const IDEA_DRAFT_KEY = "director-studio-idea-draft-v1";
const MINIMAX_API_KEY = "director-studio-minimax-api-key-v1";
const PROMPT_VERSIONS_KEY = "director-studio-prompt-versions-v1";

export const defaultSettings: GenerationSettings = {
  provider: "mock",
  directorProvider: "local",
  directorModel: "MiniMax-M3",
  model: "MiniMax-Hailuo-2.3",
  resolution: "768P",
  duration: 6,
};

export function loadProjects(): MovieProject[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as MovieProject[];
  } catch {
    return [];
  }
}

export function saveProjects(projects: MovieProject[]) {
  localStorage.setItem(KEY, JSON.stringify(projects));
}

export function loadSettings(): GenerationSettings {
  try {
    return normalizeGenerationSettings({ ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") });
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: GenerationSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadIdeaDraft(): string {
  return localStorage.getItem(IDEA_DRAFT_KEY) ?? "";
}

export function saveIdeaDraft(idea: string) {
  localStorage.setItem(IDEA_DRAFT_KEY, idea);
}

export function loadPromptVersions(): PromptVersion[] {
  try {
    const value = JSON.parse(localStorage.getItem(PROMPT_VERSIONS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is PromptVersion =>
      !!item && typeof item.id === "string" && typeof item.content === "string" &&
      typeof item.createdAt === "string" && ["manual", "before-expand", "expanded"].includes(item.source)
    ) : [];
  } catch {
    return [];
  }
}

export function savePromptVersions(versions: PromptVersion[]) {
  localStorage.setItem(PROMPT_VERSIONS_KEY, JSON.stringify(versions.slice(0, 50)));
}

export function loadApiKey(): string {
  return localStorage.getItem(MINIMAX_API_KEY) ?? "";
}

export function saveApiKey(apiKey: string) {
  if (apiKey.trim()) localStorage.setItem(MINIMAX_API_KEY, apiKey.trim());
  else localStorage.removeItem(MINIMAX_API_KEY);
}
