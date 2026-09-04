import type { MovieProject } from "../types";

const KEY = "director-studio-projects-v1";

export function loadProjects(): MovieProject[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as MovieProject[];
  } catch {
    return [];
  }
}

export function saveProjects(projects: MovieProject[]) {
  localStorage.setItem(KEY, JSON.stringify(projects));
}
