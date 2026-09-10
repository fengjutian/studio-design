import { describe, expect, it } from "vitest";
import { createDirectorProposal } from "./director";
import { buildShotPrompt, getContinuitySource, modelForGeneration, supportedVideoDuration } from "./providers";

describe("buildShotPrompt", () => {
  it("converts director language into a provider-ready prompt", () => {
    const project = createDirectorProposal("少年在雨夜的上海街头奔跑");
    const prompt = buildShotPrompt(project.scenes[0].shots[1], project);
    expect(prompt).toContain("[Tracking shot]");
    expect(prompt).toContain(project.visualStyle);
    expect(prompt).toContain("PROJECT CONTINUITY BIBLE");
    expect(prompt).toContain("CONTINUE DIRECTLY FROM PREVIOUS SHOT");
    expect(prompt).toContain("no watermark");
  });

  it("keeps continuity constraints around a custom shot description", () => {
    const project = createDirectorProposal("雨夜");
    const shot = project.scenes[0].shots[1];
    shot.generationPromptOverride = "橘猫停下并回头";
    const prompt = buildShotPrompt(shot, project);
    expect(prompt).toContain("CURRENT SHOT: 橘猫停下并回头");
    expect(prompt).toContain("PROJECT CONTINUITY BIBLE");
    expect(prompt).toContain("CONTINUE DIRECTLY FROM PREVIOUS SHOT");
  });
});

describe("getContinuitySource", () => {
  it("uses only the immediately preceding completed timeline shot", () => {
    const project = createDirectorProposal("少年在雨夜的上海街头奔跑");
    const [first, second, third] = project.scenes[0].shots;
    first.generationStatus = "completed";
    first.localAssetPath = "first.mp4";
    project.timelineOrder = [third.id, first.id, second.id];
    expect(getContinuitySource(second, project)?.id).toBe(first.id);
    expect(getContinuitySource(first, project)).toBeUndefined();
  });

  it("does not carry an action tail frame across scene boundaries", () => {
    const project = createDirectorProposal("少年在雨夜的上海街头奔跑");
    const previous = project.scenes[0].shots[project.scenes[0].shots.length - 1];
    const nextSceneShot = { ...project.scenes[0].shots[0], id: "next-scene-shot" };
    project.scenes.push({ ...project.scenes[0], id: "next-scene", number: 2, shots: [nextSceneShot] });
    previous.generationStatus = "completed";
    previous.localAssetPath = "previous.mp4";
    expect(getContinuitySource(nextSceneShot, project)).toBeUndefined();
  });
});

describe("supportedVideoDuration", () => {
  it("uses the shortest MiniMax duration that covers the planned shot", () => {
    expect(supportedVideoDuration(4)).toBe(6);
    expect(supportedVideoDuration(6)).toBe(6);
    expect(supportedVideoDuration(7)).toBe(10);
    expect(supportedVideoDuration(10)).toBe(10);
  });
});

describe("modelForGeneration", () => {
  it("uses the image-to-video variant when a legacy Director model receives a tail frame", () => {
    expect(modelForGeneration("T2V-01-Director", true)).toBe("I2V-01-Director");
    expect(modelForGeneration("MiniMax-Hailuo-2.3", true)).toBe("MiniMax-Hailuo-2.3");
  });
});
