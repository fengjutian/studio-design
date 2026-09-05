export type AppView = "home" | "movies" | "assets" | "proposal" | "studio" | "settings";

export const primaryNavigation = [
  { id: "home", label: "首页" },
  { id: "movies", label: "电影" },
  { id: "assets", label: "素材" },
] as const satisfies ReadonlyArray<{ id: AppView; label: string }>;
