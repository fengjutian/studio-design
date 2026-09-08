import type { DirectorStyle } from "../types";

const key = "director-studio-styles-v1";
export const defaultDirectorStyles: DirectorStyle[] = [{
  id: "hong-kong-comedy", name: "周星驰式喜剧", description: "无厘头反差、小人物情感与夸张肢体喜剧。可按项目修改的创作预设。",
  prompt: "以小人物的认真与荒诞处境形成喜剧反差；表演先克制铺垫，再用一次清晰的夸张反应释放笑点。肢体动作有明确预备、执行与停顿，动作因果可读。构图突出人物关系和反应，保留市井质感；喜剧中带真诚情感。服装、角色身份和动作方向保持一致，不额外添加剧情事件。",
}];
export function loadDirectorStyles(): DirectorStyle[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultDirectorStyles.map((item) => ({ ...item }));
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is DirectorStyle => !!item && [item.id, item.name, item.description, item.prompt].every((value) => typeof value === "string"));
  } catch { return []; }
}
export function saveDirectorStyles(styles: DirectorStyle[]) { localStorage.setItem(key, JSON.stringify(styles)); }
