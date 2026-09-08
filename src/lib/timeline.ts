import type { MovieProject, Shot } from "../types";

export function getTimelineShots(project: MovieProject): Shot[] {
  const shots = project.scenes.flatMap((scene) => scene.shots);
  if (!project.timelineOrder?.length) return shots;
  const byId = new Map(shots.map((shot) => [shot.id, shot]));
  const ordered = project.timelineOrder.flatMap((id) => byId.get(id) ?? []);
  const known = new Set(ordered.map((shot) => shot.id));
  return [...ordered, ...shots.filter((shot) => !known.has(shot.id))];
}

export function shotPlaybackDuration(shot: Shot) {
  return Math.max(0.1, Math.min(shot.trimEnd ?? shot.duration, shot.duration) - (shot.trimStart ?? 0));
}

export function getPreviousTimelineShot(project: MovieProject, shotId: string): Shot | undefined {
  const shots = getTimelineShots(project);
  const index = shots.findIndex((shot) => shot.id === shotId);
  return index > 0 ? shots[index - 1] : undefined;
}

export function isUsableContinuitySource(shot: Shot | undefined) {
  return Boolean(shot && shot.generationStatus === "completed" && !shot.continuityStale && (shot.localAssetPath || shot.videoUrl));
}

export function sharesSceneWithPrevious(project: MovieProject, shotId: string) {
  const previous = getPreviousTimelineShot(project, shotId);
  if (!previous) return false;
  const sceneId = project.scenes.find((scene) => scene.shots.some((shot) => shot.id === shotId))?.id;
  const previousSceneId = project.scenes.find((scene) => scene.shots.some((shot) => shot.id === previous.id))?.id;
  return Boolean(sceneId && sceneId === previousSceneId);
}

export function invalidateDownstreamContinuity(project: MovieProject, shotId: string): MovieProject {
  const ordered = getTimelineShots(project);
  const sourceIndex = ordered.findIndex((shot) => shot.id === shotId);
  if (sourceIndex < 0) return project;
  const staleIds = new Set(ordered.slice(sourceIndex + 1).map((shot) => shot.id));
  return {
    ...project,
    scenes: project.scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((shot) => staleIds.has(shot.id) && shot.generationStatus === "completed" ? { ...shot, continuityStale: true } : shot),
    })),
  };
}

export function invalidateAllContinuity(project: MovieProject): MovieProject {
  return {
    ...project,
    scenes: project.scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((shot) => shot.generationStatus === "completed" ? { ...shot, continuityStale: true } : shot),
    })),
  };
}

export function moveTimelineShot(project: MovieProject, shotId: string, direction: -1 | 1): MovieProject {
  const order = getTimelineShots(project).map((shot) => shot.id);
  const current = order.indexOf(shotId);
  const target = current + direction;
  if (current < 0 || target < 0 || target >= order.length) return project;
  [order[current], order[target]] = [order[target], order[current]];
  return { ...project, timelineOrder: order, updatedAt: new Date().toISOString() };
}
