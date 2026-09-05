import { convertFileSrc } from "@tauri-apps/api/core";
import type { ReactNode } from "react";
import { ArrowRight, Film, FolderOpen, Layers3, Play } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { MovieProject } from "@/domain/movie";
import { isDesktopApp } from "@/features/projects";

function LibraryHeader({ title, eyebrow, action }: { title: string; eyebrow: string; action?: ReactNode }) {
  return <header className="topbar library-topbar"><div className="wordmark"><span>{title}</span><i>{eyebrow}</i></div>{action}</header>;
}

export function MoviesView({ projects, onOpen, onOpenFile }: { projects: MovieProject[]; onOpen: (project: MovieProject) => void; onOpenFile: () => void }) {
  return (
    <div className="library-view">
      <LibraryHeader title="电影" eyebrow="YOUR FILMS" action={<Button variant="quiet" onClick={onOpenFile}><FolderOpen size={16} /> 打开项目</Button>} />
      <section className="library-content">
        <div className="library-heading"><div><span>FILM LIBRARY</span><h1>全部电影</h1></div><p>{projects.length} 个项目</p></div>
        {projects.length === 0 ? <div className="library-empty"><Film size={34} /><h2>还没有电影项目</h2><p>回到首页输入一个创意，或打开已有的本地项目。</p></div> : <div className="movie-library-grid">{projects.map((project) => {
          const shots = project.scenes.flatMap((scene) => scene.shots);
          const completed = shots.filter((shot) => shot.generationStatus === "completed").length;
          return <button type="button" className="movie-library-card" key={project.id} onClick={() => onOpen(project)}><div className="movie-cover"><span>{project.title.slice(0, 1)}</span><Play size={25} fill="currentColor" /></div><div><span className="card-kicker">{project.status}</span><h2>《{project.title}》</h2><p>{project.scenes.length} 个场景 · {shots.length} 个镜头 · {completed} 个已生成</p><small>{project.synopsis}</small></div><ArrowRight size={18} /></button>;
        })}</div>}
      </section>
    </div>
  );
}

export function AssetsView({ projects, onOpen }: { projects: MovieProject[]; onOpen: (project: MovieProject, shotId?: string) => void }) {
  const assets = projects.flatMap((project) => project.scenes.flatMap((scene) => scene.shots.filter((shot) => shot.videoUrl || shot.localAssetPath).map((shot) => ({ project, scene, shot }))));
  return (
    <div className="library-view">
      <LibraryHeader title="素材" eyebrow="MEDIA LIBRARY" />
      <section className="library-content">
        <div className="library-heading"><div><span>GENERATED MEDIA</span><h1>镜头素材</h1></div><p>{assets.length} 个视频</p></div>
        {assets.length === 0 ? <div className="library-empty"><Layers3 size={34} /><h2>还没有可用素材</h2><p>进入电影工作台生成镜头后，视频会自动汇总到这里。</p></div> : <div className="asset-grid">{assets.map(({ project, scene, shot }) => {
          const source = shot.videoUrl ?? (shot.localAssetPath && isDesktopApp() ? convertFileSrc(shot.localAssetPath) : undefined);
          return <button type="button" className="asset-card" key={`${project.id}-${shot.id}`} onClick={() => onOpen(project, shot.id)}>{source ? <video src={source} muted preload="metadata" /> : <div className="asset-placeholder"><Film size={28} /></div>}<div><span>{project.title} · 场景 {scene.number}</span><h2>{String(shot.number).padStart(2, "0")} {shot.title}</h2><p>{shot.framing} · {shot.duration} 秒</p></div></button>;
        })}</div>}
      </section>
    </div>
  );
}
