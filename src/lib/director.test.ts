import { describe, expect, it } from "vitest";
import { createDirectorProposal } from "./director";

describe("createDirectorProposal", () => {
  it("turns a rainy Shanghai idea into a structured shot plan", () => {
    const project = createDirectorProposal("少年在雨夜的上海街头奔跑，最后停在便利店门口");
    expect(project.title).toBe("雨夜");
    expect(project.scenes).toHaveLength(1);
    expect(project.scenes[0].shots).toHaveLength(5);
    expect(project.scenes[0].shots[0].generationStatus).toBe("idle");
  });

  it("creates a useful generic proposal for any non-empty idea", () => {
    const project = createDirectorProposal("一只猫第一次看见大海");
    expect(project.title).toBe("一只猫第一次");
    expect(project.synopsis).toContain("一只猫第一次看见大海");
    expect(project.scenes[0].shots.length).toBeGreaterThanOrEqual(3);
  });
});
