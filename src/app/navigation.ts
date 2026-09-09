export type AppView = "home" | "movies" | "assets" | "prompts" | "styles" | "proposal" | "studio" | "settings";

export const primaryNavigation = [
  { id: "home", label: "首页" },
  { id: "movies", label: "电影" },
  { id: "assets", label: "素材" },
  { id: "prompts", label: "提示词" },
  { id: "styles", label: "风格" },
] as const satisfies ReadonlyArray<{ id: AppView; label: string }>;
