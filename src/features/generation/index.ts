export { buildShotPrompt, getActiveProviderName, getVideoProvider, registerVideoProvider, supportedVideoDuration } from "@/lib/providers";
export type { GenerateInput, GenerateResult, VideoProvider } from "@/lib/providers";
export { getModelDefinition, getProviderDefinition, normalizeGenerationSettings, providerDefinitions, selectProvider } from "@/lib/providerRegistry";
export type { ProviderDefinition, VideoCapabilities, VideoModelDefinition } from "@/lib/providerRegistry";
