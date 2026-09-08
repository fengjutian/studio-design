import type { Shot } from "../types";

export function continuityFrameTime(shot: Shot) {
  return Math.max(shot.trimStart ?? 0, Math.min(shot.trimEnd ?? shot.duration, shot.duration) - 0.04);
}

export function continuityCandidates(shot: Shot) {
  const end = continuityFrameTime(shot);
  return [...new Set([0.4, 0.2, 0].map((offset) => Math.max(shot.trimStart ?? 0, end - offset)))];
}

export function archiveShot(shot: Shot): Shot {
  if (!shot.videoUrl && !shot.localAssetPath) return shot;
  const { versions = [], ...snapshot } = shot;
  if (versions.some((version) => version.taskId === shot.taskId && version.localAssetPath === shot.localAssetPath)) return shot;
  return { ...shot, versions: [...versions, { ...snapshot, savedAt: new Date().toISOString() }] };
}
