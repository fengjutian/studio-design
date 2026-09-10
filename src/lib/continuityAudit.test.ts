import { describe, expect, it } from "vitest";
import { createDirectorProposal } from "./director";
import { auditShotContinuity } from "./continuityAudit";

describe("continuity audit", () => {
  it("finds an unlinked character and missing action plan", () => {
    const project = createDirectorProposal("雨夜");
    const shot = project.scenes[0].shots[0];
    shot.description = "橘猫守着纸箱";
    project.characters = [{ id: "cat", name: "橘猫", description: "白色左前爪", images: [] }];
    const codes = auditShotContinuity(project, shot).map((item) => item.code);
    expect(codes).toContain("unlinked-character-cat");
    expect(codes).toContain("missing-action-plan");
  });
});
