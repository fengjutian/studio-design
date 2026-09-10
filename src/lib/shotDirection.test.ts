import { describe, expect, it, vi } from "vitest";
import { createDirectorProposal } from "./director";
import { buildShotPrompt, getContinuitySource, getVideoProvider } from "./providers";
import { firstFrameIssue, transitionMode, usesPreviousFrame } from "./shotDirection";
import { defaultSettings } from "./storage";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("shot direction", () => {
  it("retains legacy defaults but lets camera cuts break tail-frame dependence", () => {
    const project = createDirectorProposal("雨夜");
    const [first, second] = project.scenes[0].shots;
    first.generationStatus = "completed"; first.localAssetPath = "old.mp4";
    expect(transitionMode(first, project)).toBe("scene");
    expect(getContinuitySource(second, project)).toBe(first);
    second.transitionMode = "cut";
    expect(getContinuitySource(second, project)).toBeUndefined();
    expect(firstFrameIssue(second, project)).toBeTruthy();
    expect(buildShotPrompt(second, project)).not.toContain("CONTINUE DIRECTLY");
  });

  it("requires first-frame approval and includes only selected character descriptions", () => {
    const project = createDirectorProposal("雨夜");
    const shot = project.scenes[0].shots[1];
    shot.firstFrame = { name: "分镜", localPath: "frame.png" };
    expect(usesPreviousFrame(shot, project)).toBe(false);
    expect(firstFrameIssue(shot, project)).toBeTruthy();
    shot.firstFrameApproved = true;
    expect(firstFrameIssue(shot, project)).toBeUndefined();
    project.characters = [{ id: "cat", name: "橘猫", description: "白色左前爪", images: [] }, { id: "other", name: "黑猫", description: "蓝色围巾", images: [] }];
    shot.characterIds = ["cat"];
    expect(buildShotPrompt(shot, project)).toContain("白色左前爪");
    expect(buildShotPrompt(shot, project)).not.toContain("蓝色围巾");
  });

  it("passes the approved shot image to the adapter instead of extracting the previous video", async () => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    const project = createDirectorProposal("雨夜"); project.localPath = "project";
    const shot = project.scenes[0].shots[1];
    shot.firstFrame = { name: "approved", localPath: "frame.png" }; shot.firstFrameApproved = true;
    const mocked = vi.mocked(invoke); mocked.mockReset();
    mocked.mockImplementation(async (command) => {
      if (command === "read_project_image_data_url") return "data:image/png;base64,reference";
      throw new Error("stop before paid task");
    });
    const settings = { ...defaultSettings, provider: "minimax" };
    try {
      await expect(getVideoProvider(settings).generate({ shot, project, settings, apiKey: "test" })).rejects.toThrow("stop before paid task");
      expect(mocked).toHaveBeenCalledWith("minimax_create_video", expect.objectContaining({ request: expect.objectContaining({ firstFrameImage: "data:image/png;base64,reference" }) }));
      expect(mocked.mock.calls.some(([command]) => command === "extract_video_last_frame")).toBe(false);
    } finally { vi.unstubAllGlobals(); }
  });
});
