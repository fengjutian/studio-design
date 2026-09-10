import type { MovieProject, Shot } from "../types";
import { framingWarning, transitionMode } from "./shotDirection";

export interface ContinuityAuditItem {
  code: string;
  message: string;
}

export function auditShotContinuity(project: MovieProject, shot: Shot): ContinuityAuditItem[] {
  const issues: ContinuityAuditItem[] = [];
  const selected = (project.characters ?? []).filter((character) => shot.characterIds?.includes(character.id));
  const copy = `${shot.title} ${shot.description} ${shot.generationPromptOverride ?? ""}`;

  for (const character of selected) {
    if (!character.description.trim()) issues.push({ code: `empty-character-${character.id}`, message: `角色“${character.name}”缺少固定外观、服装和道具设定。` });
  }
  for (const character of project.characters ?? []) {
    if (character.name.length >= 2 && copy.includes(character.name) && !shot.characterIds?.includes(character.id)) {
      issues.push({ code: `unlinked-character-${character.id}`, message: `镜头提到了“${character.name}”，但尚未关联其角色设定。` });
    }
  }

  const framing = framingWarning(shot, project);
  if (framing) issues.push({ code: "framing-change", message: framing });

  const sceneIndex = project.scenes.findIndex((scene) => scene.shots.some((candidate) => candidate.id === shot.id));
  const scene = project.scenes[sceneIndex];
  if (transitionMode(shot, project) === "scene" && sceneIndex > 0 && !shot.firstFrame && !scene?.visualReference && project.visualReference) {
    issues.push({ code: "global-reference-fallback", message: "新场景正在沿用项目视觉基准；建议设置场景视觉基准，避免继承上一地点的构图和建筑。" });
  }
  if (!shot.actionPlan) issues.push({ code: "missing-action-plan", message: "尚未设置动作起点与终点，连续动作可能在切点发生重置。" });
  return issues;
}
