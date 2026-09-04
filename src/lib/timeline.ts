import type { MovieProject, Shot } from "../types";

export function getTimelineShots(project: MovieProject): Shot[] {
  const shots = project.scenes.flatMap((scene) => scene.shots);
  if (!project.timelineOrder?.length) return shots;
  const byId = new Map(shots.map((shot) => [shot.id, shot]));
  const ordered = project.timelineOrder.flatMap((id) => byId.get(id) ?? []);
  const known = new Set(ordered.map((shot) => shot.id));
  return [...ordered, ...shots.filter((shot) => !known.has(shot.id))];
}

export function moveTimelineShot(project: MovieProject, shotId: string, direction: -1 | 1): MovieProject {
  const order = getTimelineShots(project).map((shot) => shot.id);
  const current = order.indexOf(shotId);
  const target = current + direction;
  if (current < 0 || target < 0 || target >= order.length) return project;
  [order[current], order[target]] = [order[target], order[current]];
  return { ...project, timelineOrder: order, updatedAt: new Date().toISOString() };
}
