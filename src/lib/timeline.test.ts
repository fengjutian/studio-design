import { describe, expect, it } from "vitest";
import { createDirectorProposal } from "./director";
import { getPreviousTimelineShot, getTimelineShots, invalidateDownstreamContinuity, isUsableContinuitySource, moveTimelineShot, shotPlaybackDuration } from "./timeline";

describe("timeline", () => {
  it("moves a shot without changing the scene structure", () => {
    const project = createDirectorProposal("雨夜上海");
    const first = getTimelineShots(project)[0];
    const moved = moveTimelineShot(project, first.id, 1);
    expect(getTimelineShots(moved)[1].id).toBe(first.id);
    expect(moved.scenes[0].shots[0].id).toBe(first.id);
  });

  it("keeps unknown newly-added shots in the timeline", () => {
    const project = createDirectorProposal("海边散步");
    project.timelineOrder = project.timelineOrder?.slice(0, 2);
    expect(getTimelineShots(project)).toHaveLength(project.scenes[0].shots.length);
  });

  it("uses the selected in and out points as playback duration", () => {
    const shot = createDirectorProposal("海边散步").scenes[0].shots[0];
    shot.trimStart = 1.2;
    shot.trimEnd = 3.7;
    expect(shotPlaybackDuration(shot)).toBeCloseTo(2.5);
  });

  it("caps legacy generated media at the director's shot duration", () => {
    const shot = createDirectorProposal("海边散步").scenes[0].shots[0];
    shot.duration = 4;
    shot.trimEnd = 10;
    expect(shotPlaybackDuration(shot)).toBe(4);
  });
});

describe("continuity chain", () => {
  it("requires an immediately preceding completed asset", () => {
    const project = createDirectorProposal("雨夜上海");
    const shots = getTimelineShots(project);
    expect(getPreviousTimelineShot(project, shots[1].id)?.id).toBe(shots[0].id);
    expect(isUsableContinuitySource(shots[0])).toBe(false);
    shots[0].generationStatus = "completed";
    shots[0].videoUrl = "https://example.com/shot.mp4";
    expect(isUsableContinuitySource(shots[0])).toBe(true);
  });

  it("marks completed downstream shots stale after an upstream regeneration", () => {
    const project = createDirectorProposal("雨夜上海");
    const shots = getTimelineShots(project);
    for (const shot of shots) {
      shot.generationStatus = "completed";
      shot.videoUrl = `https://example.com/${shot.id}.mp4`;
    }
    const updated = invalidateDownstreamContinuity(project, shots[0].id);
    expect(getTimelineShots(updated)[0].continuityStale).not.toBe(true);
    expect(getTimelineShots(updated).slice(1).every((shot) => shot.continuityStale)).toBe(true);
  });
});
