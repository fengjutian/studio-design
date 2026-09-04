import type { GenerationSettings, MovieProject } from "../types";

const KEY = "director-studio-projects-v1";
const SETTINGS_KEY = "director-studio-settings-v1";

export const defaultSettings: GenerationSettings = {
  provider: "mock",
  directorProvider: "local",
  directorModel: "MiniMax-M2.7",
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
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: GenerationSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
