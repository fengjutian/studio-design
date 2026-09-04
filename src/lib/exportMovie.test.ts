import { describe, expect, it } from "vitest";
import { createDirectorProposal } from "./director";
import { checkExportReadiness } from "./exportMovie";

describe("export readiness", () => {
  it("reports every shot without a local generated asset", () => {
    const project = createDirectorProposal("雨夜上海");
    project.localPath = "D:/movies/rain.movie";
    expect(checkExportReadiness(project).missingShots).toHaveLength(5);
  });

  it("is ready when all timeline shots have local assets", () => {
    const project = createDirectorProposal("雨夜上海");
    project.localPath = "D:/movies/rain.movie";
    project.scenes[0].shots.forEach((shot) => { shot.localAssetPath = `D:/movies/rain.movie/generations/${shot.id}.mp4`; });
    expect(checkExportReadiness(project).ready).toBe(true);
  });
});
