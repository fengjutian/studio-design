import { invoke } from "@tauri-apps/api/core";
import { isDesktopApp } from "./projectFiles";
import { getTimelineShots } from "./timeline";
import type { MovieProject } from "../types";

export interface ExportReadiness {
  ready: boolean;
  missingShots: string[];
}

export function checkExportReadiness(project: MovieProject): ExportReadiness {
  const missingShots = getTimelineShots(project)
    .filter((shot) => !shot.localAssetPath || shot.continuityStale)
    .map((shot) => `${String(shot.number).padStart(2, "0")} ${shot.title}`);
  return { ready: Boolean(project.localPath) && missingShots.length === 0, missingShots };
}

export async function exportMovie(project: MovieProject): Promise<string> {
  if (!isDesktopApp()) throw new Error("电影导出只能在 Tauri 桌面应用中运行。");
  if (!project.localPath) throw new Error("请先把电影保存为本地项目。");
  const shots = getTimelineShots(project);
  const missing = shots.filter((shot) => !shot.localAssetPath || shot.continuityStale);
  if (missing.length) throw new Error(`还有 ${missing.length} 个镜头缺少本地素材或连续性已经过期。`);
  return invoke<string>("export_movie", {
    projectPath: project.localPath,
    title: project.title,
    clips: shots.map((shot) => ({
      path: shot.localAssetPath as string,
      trimStart: shot.trimStart ?? 0,
      trimEnd: shot.trimEnd ?? shot.duration,
    })),
    audio: project.soundtrack ? {
      path: project.soundtrack.localPath,
      trimStart: project.soundtrack.trimStart,
      volume: project.soundtrack.volume,
    } : null,
  });
}
