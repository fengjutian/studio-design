import type { MovieProject, Shot } from "../types";
import { getPreviousTimelineShot, sharesSceneWithPrevious } from "./timeline";

export function transitionMode(shot: Shot, project: MovieProject) {
  if (shot.transitionMode) return shot.transitionMode;
  if (!sharesSceneWithPrevious(project, shot.id)) return "scene";
  const previous = getPreviousTimelineShot(project, shot.id);
  const group = (framing: string) => /特写|近景/.test(framing) ? "close" : /远景|全景/.test(framing) ? "wide" : "other";
  return previous && new Set([group(previous.framing), group(shot.framing)]).size > 1 &&
    [group(previous.framing), group(shot.framing)].every((item) => item !== "other") ? "cut" : "continue";
}

export function usesPreviousFrame(shot: Shot, project: MovieProject) {
  return transitionMode(shot, project) === "continue" && !shot.firstFrame;
}

export function firstFrameIssue(shot: Shot, project: MovieProject) {
  if (shot.firstFrame && !shot.firstFrameApproved) return "请在右侧预览并确认本镜头首帧。";
  const mode = transitionMode(shot, project);
  if (mode === "cut" && !shot.firstFrame) return "切换机位前，请导入并确认本镜头的分镜首帧。";
  const scene = project.scenes.find((item) => item.shots.some((candidate) => candidate.id === shot.id));
  if (mode === "scene" && !shot.firstFrame && !scene?.visualReference && !project.visualReference) return "新场景需要镜头首帧、场景视觉基准或项目视觉基准，不能仅凭文字生成。";
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
