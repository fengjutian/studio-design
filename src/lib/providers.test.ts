import { describe, expect, it } from "vitest";
import { createDirectorProposal } from "./director";
import { buildShotPrompt, supportedVideoDuration } from "./providers";

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
});

describe("supportedVideoDuration", () => {
  it("uses the shortest MiniMax duration that covers the planned shot", () => {
    expect(supportedVideoDuration(4)).toBe(6);
    expect(supportedVideoDuration(6)).toBe(6);
    expect(supportedVideoDuration(7)).toBe(10);
    expect(supportedVideoDuration(10)).toBe(10);
  });
});
