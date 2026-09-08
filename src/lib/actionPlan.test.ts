import { describe, expect, it } from "vitest";
import { createDirectorProposal } from "./director";
import { actionStart, framingWarning } from "./shotDirection";
import { buildShotPrompt } from "./providers";

describe("action continuity", () => {
  it("inherits updated end states only in continuation mode", () => {
    const project = createDirectorProposal("雨夜");
    const [first, second] = project.scenes[0].shots;
    first.actionPlan = { start: "", action: "挥剑", end: "左脚站稳", inheritStart: false };
    second.actionPlan = { start: "手动起点", action: "收剑", end: "剑垂在右侧", inheritStart: true };
    expect(actionStart(second, project)).toBe("左脚站稳");
    first.actionPlan.end = "右脚站稳";
    expect(buildShotPrompt(second, project)).toContain("ACTION START STATE: 右脚站稳");
    expect(buildShotPrompt(second, project)).toContain("PRIMARY ACTION: 收剑");
    second.transitionMode = "scene";
    expect(actionStart(second, project)).toBe("手动起点");
  });
  it("warns about wide-to-close continuation without overriding user direction", () => {
    const project = createDirectorProposal("雨夜");
    const [first, second] = project.scenes[0].shots;
    first.framing = "全景"; second.framing = "特写";
    expect(framingWarning(second, project)).toContain("建议切换机位");
    second.transitionMode = "cut";
    expect(framingWarning(second, project)).toBeUndefined();
    expect(second.transitionMode).toBe("cut");
  });
});
