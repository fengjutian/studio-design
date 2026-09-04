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
    .filter((shot) => !shot.localAssetPath)
    .map((shot) => `${String(shot.number).padStart(2, "0")} ${shot.title}`);
  return { ready: Boolean(project.localPath) && missingShots.length === 0, missingShots };
}

export async function exportMovie(project: MovieProject): Promise<string> {
  if (!isDesktopApp()) throw new Error("电影导出只能在 Tauri 桌面应用中运行。");
  if (!project.localPath) throw new Error("请先把电影保存为本地项目。");
  const shots = getTimelineShots(project);
  const missing = shots.filter((shot) => !shot.localAssetPath);
  if (missing.length) throw new Error(`还有 ${missing.length} 个镜头没有本地视频素材。`);
  return invoke<string>("export_movie", {
    projectPath: project.localPath,
    title: project.title,
    inputPaths: shots.map((shot) => shot.localAssetPath as string),
  });
}
