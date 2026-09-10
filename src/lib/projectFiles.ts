import { invoke } from "@tauri-apps/api/core";
import type { MovieProject } from "../types";

interface OpenProjectResult {
  path: string;
  projectJson: string;
}

export function isDesktopApp() {
  return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export async function createProjectDirectory(project: MovieProject): Promise<MovieProject | null> {
  requireDesktop();
  const serialized = serializeProject(project);
  const path = await invoke<string | null>("create_project_directory", {
    title: project.title,
    projectJson: serialized,
  });
  if (!path) return null;
  await invoke("allow_project_assets", { path });
  const saved = { ...project, localPath: path, updatedAt: new Date().toISOString() };
  await saveProjectFile(saved);
  return saved;
}

export async function openProjectFile(): Promise<MovieProject | null> {
  requireDesktop();
  const result = await invoke<OpenProjectResult | null>("open_project_file");
  if (!result) return null;
  await invoke("allow_project_assets", { path: result.path });
  const parsed = JSON.parse(result.projectJson) as MovieProject;
  validateProject(parsed);
  return { ...migrateProject(parsed), localPath: result.path };
}

export function migrateProject(project: MovieProject): MovieProject {
  const characters = project.characters ?? [];
  if (!characters.length) return project;
  return {
    ...project,
    scenes: project.scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((shot) => {
        if (shot.characterIds !== undefined) return shot;
        const copy = `${shot.title} ${shot.description}`;
        const inferred = characters.filter((character) => character.name.length >= 2 && copy.includes(character.name)).map((character) => character.id);
        return { ...shot, characterIds: inferred };
      }),
    })),
  };
}

export async function saveProjectFile(project: MovieProject): Promise<void> {
  if (!project.localPath || !isDesktopApp()) return;
  await invoke("save_project_file", {
    path: project.localPath,
    projectJson: serializeProject(project),
  });
}

function serializeProject(project: MovieProject) {
  const { localPath: _, ...portableProject } = project;
  return JSON.stringify({ schemaVersion: 1, ...portableProject });
}

function validateProject(value: MovieProject) {
  if (!value || typeof value.id !== "string" || typeof value.title !== "string" || !Array.isArray(value.scenes)) {
    throw new Error("这不是有效的电影项目文件。");
  }
}

function requireDesktop() {
  if (!isDesktopApp()) throw new Error("本地项目目录只能在 Tauri 桌面应用中使用。");
}
