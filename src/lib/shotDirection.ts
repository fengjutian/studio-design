import type { MovieProject, Shot } from "../types";
import { getPreviousTimelineShot, sharesSceneWithPrevious } from "./timeline";

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

export function actionStart(shot: Shot, project: MovieProject) {
  if (shot.actionPlan?.inheritStart && transitionMode(shot, project) === "continue") {
    return getPreviousTimelineShot(project, shot.id)?.actionPlan?.end?.trim() ?? "";
  }
  return shot.actionPlan?.start?.trim() ?? "";
}

export function framingWarning(shot: Shot, project: MovieProject) {
  const previous = getPreviousTimelineShot(project, shot.id);
  if (!previous || !usesPreviousFrame(shot, project)) return undefined;
  const group = (framing: string) => /特写|近景/.test(framing) ? "close" : /远景|全景/.test(framing) ? "wide" : /中景/.test(framing) ? "medium" : undefined;
  const before = group(previous.framing), after = group(shot.framing);
  return before && after && before !== after ? `上一镜头是“${previous.framing}”，本镜头是“${shot.framing}”。直接续帧可能保留旧构图，建议切换机位并确认新首帧。` : undefined;
}
