import { describe, expect, it } from "vitest";
import { createDirectorProposal } from "./director";

describe("movie project format", () => {
  it("remains serializable with scene and shot identities", () => {
    const project = createDirectorProposal("一只猫第一次看见大海");
    const restored = JSON.parse(JSON.stringify({ schemaVersion: 1, ...project }));
    expect(restored.schemaVersion).toBe(1);
    expect(restored.scenes[0].shots[0].id).toBe(project.scenes[0].shots[0].id);
  });
});
