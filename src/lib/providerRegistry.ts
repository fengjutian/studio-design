import type { GenerationSettings } from "../types";

export interface VideoCapabilities {
  textToVideo: boolean;
  firstFrame: boolean;
  lastFrame: boolean;
  characterReference: boolean;
  videoReference: boolean;
  seed: boolean;
  durations: number[];
  resolutions: string[];
}

export interface VideoModelDefinition {
  id: string;
  name: string;
  capabilities: VideoCapabilities;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  description: string;
  badge: string;
  requiresApiKey: boolean;
  models: VideoModelDefinition[];
}

const baseCapabilities: VideoCapabilities = {
  textToVideo: true,
  firstFrame: true,
  lastFrame: false,
  characterReference: false,
  videoReference: false,
  seed: false,
  durations: [6, 10],
  resolutions: ["768P", "1080P"],
};

export const providerDefinitions: ProviderDefinition[] = [
  {
    id: "mock",
    name: "体验模式",
    description: "快速模拟统一任务流程，不联网、不产生费用。",
    badge: "体验",
    requiresApiKey: false,
    models: [{ id: "mock-video", name: "模拟视频", capabilities: { ...baseCapabilities, firstFrame: false } }],
  },
  {
    id: "minimax",
    name: "MiniMax",
    description: "通过适配器调用 Hailuo 视频生成服务。",
    badge: "已连接",
    requiresApiKey: true,
    models: [
      { id: "MiniMax-Hailuo-2.3", name: "Hailuo 2.3", capabilities: baseCapabilities },
      { id: "MiniMax-Hailuo-02", name: "Hailuo 02", capabilities: baseCapabilities },
      { id: "T2V-01-Director", name: "Video-01 Director", capabilities: { ...baseCapabilities, resolutions: ["720P"] } },
    ],
  },
];

export function getProviderDefinition(providerId: string) {
  return providerDefinitions.find((provider) => provider.id === providerId);
}

export function getModelDefinition(settings: Pick<GenerationSettings, "provider" | "model">) {
  const provider = getProviderDefinition(settings.provider);
  return provider?.models.find((model) => model.id === settings.model) ?? provider?.models[0];
}

export function normalizeGenerationSettings(settings: GenerationSettings): GenerationSettings {
  const provider = getProviderDefinition(settings.provider) ?? providerDefinitions[0];
  const model = provider.models.find((item) => item.id === settings.model) ?? provider.models[0];
  const resolution = model.capabilities.resolutions.includes(settings.resolution) ? settings.resolution : model.capabilities.resolutions[0];
  const duration = model.capabilities.durations.includes(settings.duration) ? settings.duration : model.capabilities.durations[0];
  return { ...settings, provider: provider.id, model: model.id, resolution, duration };
}

export function selectProvider(settings: GenerationSettings, providerId: string): GenerationSettings {
  const provider = getProviderDefinition(providerId);
  if (!provider) return settings;
  return normalizeGenerationSettings({ ...settings, provider: provider.id, model: provider.models[0].id });
}
