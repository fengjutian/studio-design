import { Clapperboard, Film, History, Home, Layers3, Settings } from "@/components/icons";
import type { AppView } from "@/app/navigation";

interface AppRailProps {
  view: AppView;
  onHome: () => void;
  onMovies: () => void;
  onAssets: () => void;
  onPrompts: () => void;
  onSettings: () => void;
  onStyles: () => void;
}

export function AppRail({ view, onHome, onMovies, onAssets, onPrompts, onSettings, onStyles }: AppRailProps) {
  return (
    <aside className="app-rail">
      <button type="button" className="brand-mark" onClick={onHome} aria-label="返回首页">
        <Clapperboard size={22} strokeWidth={1.8} />
      </button>
      <nav>
        <button type="button" className={view === "home" ? "rail-button active" : "rail-button"} onClick={onHome}><Home size={19} /><span>首页</span></button>
        <button type="button" className={view === "movies" ? "rail-button active" : "rail-button"} onClick={onMovies}><Film size={19} /><span>电影</span></button>
        <button type="button" className={view === "assets" ? "rail-button active" : "rail-button"} onClick={onAssets}><Layers3 size={19} /><span>素材</span></button>
        <button type="button" className={view === "prompts" ? "rail-button active" : "rail-button"} onClick={onPrompts}><History size={19} /><span>提示词</span></button>
        <button type="button" className={view === "styles" ? "rail-button active" : "rail-button"} onClick={onStyles}><Clapperboard size={19} /><span>风格</span></button>
      </nav>
      <button type="button" className={view === "settings" ? "rail-button settings-button active" : "rail-button settings-button"} onClick={onSettings}><Settings size={19} /><span>设置</span></button>
    </aside>
  );
}
