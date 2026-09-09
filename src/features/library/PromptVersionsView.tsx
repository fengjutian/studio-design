import { convertFileSrc } from "@tauri-apps/api/core";
import { Film, History, Play, RotateCcw } from "@/components/icons";
import type { MovieProject, PromptVersion } from "@/types";
import { isDesktopApp } from "@/features/projects";

const sourceLabels: Record<PromptVersion["source"], string> = {
  manual: "手动保存",
  "before-expand": "扩写前",
  expanded: "AI 扩写",
  project: "创建电影",
};

export function PromptVersionsView({ versions, projects, onRestore, onOpenProject, onDelete }: {
  versions: PromptVersion[];
  projects: MovieProject[];
  onRestore: (version: PromptVersion) => void;
  onOpenProject: (project: MovieProject, shotId?: string) => void;
  onDelete: (id: string) => void;
}) {
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  return <div className="library-view">
    <header className="topbar library-topbar"><div className="wordmark"><span>提示词</span><i>PROMPT VERSIONS</i></div></header>
    <section className="library-content">
      <div className="library-heading"><div><span>CREATIVE HISTORY</span><h1>提示词版本</h1></div><p>{versions.length} 个版本 · 与电影及视频关联</p></div>
      {versions.length === 0 ? <div className="library-empty"><History size={34} /><h2>还没有提示词版本</h2><p>在首页保存提示词，或开始创作电影后会自动建立关联版本。</p></div> :
        <div className="prompt-library-list">{versions.map((version, index) => {
          const project = version.projectId ? projectsById.get(version.projectId) : undefined;
          const generatedShots = project?.scenes.flatMap((scene) => scene.shots).filter((shot) => shot.videoUrl || shot.localAssetPath) ?? [];
          return <article className="prompt-library-card" key={version.id}>
            <div className="prompt-library-meta"><span>V{versions.length - index}</span><b>{sourceLabels[version.source]}</b><time>{new Date(version.createdAt).toLocaleString("zh-CN")}</time></div>
            <p className="prompt-library-content">{version.content}</p>
            <div className="prompt-project-link">
              {project ? <>
                <button type="button" onClick={() => onOpenProject(project)}><Film size={14} /><span><b>《{project.title}》</b><small>{project.status} · {generatedShots.length} 个视频</small></span></button>
                {generatedShots.slice(0, 4).map((shot) => {
                  const source = (shot.localAssetPath && isDesktopApp() ? convertFileSrc(shot.localAssetPath) : undefined) ?? shot.videoUrl;
                  return <button type="button" className="prompt-video-link" key={shot.id} onClick={() => onOpenProject(project, shot.id)} title={`打开镜头 ${shot.number}`}>
                    {source ? <video src={source} muted preload="metadata" /> : <Play size={15} />}
                    <span>{String(shot.number).padStart(2, "0")}</span>
                  </button>;
                })}
                {generatedShots.length > 4 && <small>+{generatedShots.length - 4}</small>}
              </> : <span className="unlinked-prompt"><Film size={14} /> 未关联电影</span>}
            </div>
            <div className="prompt-library-actions"><button type="button" onClick={() => onRestore(version)}><RotateCcw size={13} /> 恢复到首页</button><button type="button" onClick={() => onDelete(version.id)}>删除</button></div>
          </article>;
        })}</div>}
    </section>
  </div>;
}
