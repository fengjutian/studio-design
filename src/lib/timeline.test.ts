import { describe, expect, it } from "vitest";
import { createDirectorProposal } from "./director";
import { getTimelineShots, moveTimelineShot } from "./timeline";

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
});
