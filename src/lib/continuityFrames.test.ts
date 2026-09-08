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
});
