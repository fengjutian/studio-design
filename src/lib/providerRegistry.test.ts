import { describe, expect, it } from "vitest";
import { defaultSettings } from "./storage";
import { getModelDefinition, normalizeGenerationSettings, selectProvider } from "./providerRegistry";

describe("provider registry", () => {
  it("migrates an incompatible legacy model to the provider default", () => {
    const settings = normalizeGenerationSettings({ ...defaultSettings, provider: "mock", model: "MiniMax-Hailuo-2.3" });
    expect(settings.model).toBe("mock-video");
  });

  it("selects a provider with a valid model and capability options", () => {
    const settings = selectProvider(defaultSettings, "minimax");
    const model = getModelDefinition(settings);
    expect(settings.provider).toBe("minimax");
    expect(model?.capabilities.firstFrame).toBe(true);
    expect(model?.capabilities.resolutions).toContain(settings.resolution);
  });

  it("falls back safely when a removed provider is loaded", () => {
    const settings = normalizeGenerationSettings({ ...defaultSettings, provider: "removed-provider" });
    expect(settings.provider).toBe("mock");
  });
});
