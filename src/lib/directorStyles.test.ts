import { describe, expect, it } from "vitest";
import { defaultDirectorStyles } from "./directorStyles";
import { createDirectorProposal } from "./director";
import { buildShotPrompt } from "./providers";

describe("director styles", () => {
  it("embeds the project snapshot in the generation prompt and portable project", () => {
    const project = createDirectorProposal("雨夜");
    project.directorStyle = { ...defaultDirectorStyles[0] };
    const restored = JSON.parse(JSON.stringify(project));
    const prompt = buildShotPrompt(restored.scenes[0].shots[0], restored);
    expect(prompt).toContain(defaultDirectorStyles[0].prompt);
    expect(prompt).toContain("CURRENT SHOT:");
    expect(prompt).toContain("preserve this shot's action");
    delete project.directorStyle;
    expect(buildShotPrompt(project.scenes[0].shots[0], project)).not.toContain("DIRECTOR STYLE (");
  });
});
