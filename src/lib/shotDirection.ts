import type { MovieProject, Shot } from "../types";
import { sharesSceneWithPrevious } from "./timeline";

export function transitionMode(shot: Shot, project: MovieProject) {
  return shot.transitionMode ?? (sharesSceneWithPrevious(project, shot.id) ? "continue" : "scene");
}

export function usesPreviousFrame(shot: Shot, project: MovieProject) {
  return transitionMode(shot, project) === "continue" && !shot.firstFrame;
}

export function firstFrameIssue(shot: Shot) {
  if (shot.firstFrame && !shot.firstFrameApproved) return "请在右侧预览并确认本镜头首帧。";
  if (shot.transitionMode && shot.transitionMode !== "continue" && !shot.firstFrame) return "切换机位或转场前，请导入并确认本镜头的分镜首帧。";
  return undefined;
}
