import { describe, expect, it } from "vitest";
import { createDirectorProposal } from "./director";
import { migrateProject } from "./projectFiles";

describe("movie project format", () => {
  it("remains serializable with scene and shot identities", () => {
    const project = createDirectorProposal("一只猫第一次看见大海");
    const restored = JSON.parse(JSON.stringify({ schemaVersion: 1, ...project }));
    expect(restored.schemaVersion).toBe(1);
    expect(restored.scenes[0].shots[0].id).toBe(project.scenes[0].shots[0].id);
  });
});

describe("project migration", () => {
  it("links characters mentioned by legacy shots without overriding explicit choices", () => {
    const project = createDirectorProposal("雨夜");
    project.characters = [{ id: "cat", name: "橘猫", description: "白色左前爪", images: [] }];
    project.scenes[0].shots[0].description = "橘猫守在纸箱旁";
    project.scenes[0].shots[1].description = "橘猫跑过积水";
    project.scenes[0].shots[1].characterIds = [];
    const migrated = migrateProject(project);
    expect(migrated.scenes[0].shots[0].characterIds).toEqual(["cat"]);
    expect(migrated.scenes[0].shots[1].characterIds).toEqual([]);
  });
});
