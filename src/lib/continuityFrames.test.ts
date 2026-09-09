import { describe, expect, it } from "vitest";
import { createDirectorProposal } from "./director";
import { archiveShot, continuityCandidates, continuityFrameTime } from "./continuityFrames";

describe("continuity frames and versions", () => {
  it("uses the visible cut instead of the original media end", () => {
    const shot = createDirectorProposal("雨夜").scenes[0].shots[0];
    shot.duration = 4; shot.trimEnd = 10;
    expect(continuityFrameTime(shot)).toBeCloseTo(3.96);
    shot.trimEnd = 2;
    expect(continuityFrameTime(shot)).toBeCloseTo(1.96);
    expect(continuityCandidates(shot).every((time) => time < 2 && time >= 0)).toBe(true);
  });
  it("preserves old media and avoids recursive or duplicated snapshots", () => {
    const shot = createDirectorProposal("雨夜").scenes[0].shots[0];
    shot.taskId = "old"; shot.localAssetPath = "old.mp4";
    const saved = archiveShot(shot);
    expect(archiveShot(saved).versions).toHaveLength(1);
    expect(saved.versions?.[0].localAssetPath).toBe("old.mp4");
    expect(saved.versions?.[0]).not.toHaveProperty("versions");
    expect(shot.versions).toBeUndefined();
  });
  it("keeps the exact generation prompt with an archived video", () => {
    const shot = createDirectorProposal("雨夜").scenes[0].shots[0];
    shot.localAssetPath = "take-1.mp4";
    shot.generationSnapshot = {
      id: "snapshot-1", prompt: "exact provider prompt", providerId: "minimax",
      modelId: "MiniMax-Hailuo-2.3", resolution: "768P", duration: 6,
      createdAt: "2026-09-09T00:00:00.000Z", taskId: "task-1",
    };
    const saved = archiveShot(shot);
    expect(saved.versions?.[0].generationSnapshot?.prompt).toBe("exact provider prompt");
    expect(saved.versions?.[0].generationSnapshot?.taskId).toBe("task-1");
  });
});
