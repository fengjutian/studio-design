import { useMemo, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Film, History, Play, RotateCcw } from "@/components/icons";
import type { MovieProject, PromptVersion } from "@/types";
import { isDesktopApp } from "@/features/projects";
import { diffPromptVersions } from "@/lib/promptDiff";

const sourceLabels: Record<PromptVersion["source"], string> = {
  manual: "手动保存", "before-expand": "扩写前", expanded: "AI 扩写", optimized: "AI 优化", project: "创建电影",
};
type Filter = "all" | "linked" | "unlinked" | "analyzed";

export function PromptVersionsView({ versions, projects, onRestore, onOpenProject, onDelete, onUpdate }: {
  versions: PromptVersion[];
  projects: MovieProject[];
  onRestore: (version: PromptVersion) => void;
  onOpenProject: (project: MovieProject, shotId?: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PromptVersion>) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const visible = versions.filter((version) => {
    const matchesQuery = !query.trim() || [version.name, version.note, version.content, version.projectTitle].some((value) => value?.toLowerCase().includes(query.trim().toLowerCase()));
    const linked = !!version.projectId && projectsById.has(version.projectId);
    const matchesFilter = filter === "all" || (filter === "linked" && linked) || (filter === "unlinked" && !linked) || (filter === "analyzed" && !!version.analysis);
    return matchesQuery && matchesFilter;
  });
  const compared = selected.map((id) => versions.find((version) => version.id === id)).filter((value): value is PromptVersion => !!value);
  const comparison = compared.length === 2 ? diffPromptVersions(compared[0].content, compared[1].content) : undefined;
  const toggleCompare = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : [current[1], id]);

  return <div className="library-view">
    <header className="topbar library-topbar"><div className="wordmark"><span>提示词</span><i>PROMPT VERSIONS</i></div></header>
    <section className="library-content">
      <div className="library-heading"><div><span>CREATIVE HISTORY</span><h1>提示词版本</h1></div><p>{versions.length} 个版本 · 与电影及视频关联</p></div>
      <div className="prompt-toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、内容、备注或电影…" aria-label="搜索提示词版本" />
        <div>{(["all", "linked", "unlinked", "analyzed"] as Filter[]).map((value) => <button type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{{ all: "全部", linked: "已关联", unlinked: "未关联", analyzed: "已分析" }[value]}</button>)}</div>
        <span>选择两个版本进行对比</span>
      </div>
      {compared.length === 2 && <section className="prompt-compare">
        <div className="compare-heading"><b>版本对比</b><button type="button" onClick={() => setSelected([])}>关闭</button></div>
        <div>{compared.map((version, index) => <article key={version.id}><span>{version.name || sourceLabels[version.source]}</span><small>{version.content.length} 字</small><p>{(index === 0 ? comparison?.before : comparison?.after)?.map((part, partIndex) => <mark className={`diff-${part.type}`} key={partIndex}>{part.value}</mark>)}</p></article>)}</div>
      </section>}
      {versions.length === 0 ? <div className="library-empty"><History size={34} /><h2>还没有提示词版本</h2><p>在首页保存提示词，或开始创作电影后会自动建立关联版本。</p></div> :
      visible.length === 0 ? <div className="library-empty compact-empty"><History size={28} /><h2>没有匹配的版本</h2><p>尝试更换关键词或筛选条件。</p></div> :
        <div className="prompt-library-list">{visible.map((version) => {
          const originalIndex = versions.findIndex((item) => item.id === version.id);
          const project = version.projectId ? projectsById.get(version.projectId) : undefined;
          const generatedShots = project?.scenes.flatMap((scene) => scene.shots).filter((shot) => shot.videoUrl || shot.localAssetPath) ?? [];
          return <article className={selected.includes(version.id) ? "prompt-library-card selected" : "prompt-library-card"} key={version.id}>
            <div className="prompt-library-meta">
              <label className="compare-check"><input type="checkbox" checked={selected.includes(version.id)} onChange={() => toggleCompare(version.id)} /> 对比</label>
              <span>V{versions.length - originalIndex}</span><b>{sourceLabels[version.source]}</b>
              {version.analysis && <em className={`prompt-analysis-badge verdict-${version.analysis.verdict}`}>{version.analysis.score} · {version.analysis.verdict}</em>}
              <time>{new Date(version.createdAt).toLocaleString("zh-CN")}</time>
            </div>
            <div className="prompt-copy">
              <input value={version.name ?? ""} onChange={(event) => onUpdate(version.id, { name: event.target.value })} placeholder="给这个版本命名…" maxLength={60} />
              <p className="prompt-library-content">{version.content}</p>
              <input value={version.note ?? ""} onChange={(event) => onUpdate(version.id, { note: event.target.value })} placeholder="添加修改备注（可选）" maxLength={160} />
            </div>
            <div className="prompt-project-link">
              {project ? <>
                <button type="button" onClick={() => onOpenProject(project)}><Film size={14} /><span><b>《{project.title}》</b><small>{project.status} · {generatedShots.length} 个视频</small></span></button>
                {generatedShots.slice(0, 4).map((shot) => {
                  const source = (shot.localAssetPath && isDesktopApp() ? convertFileSrc(shot.localAssetPath) : undefined) ?? shot.videoUrl;
                  return <button type="button" className="prompt-video-link" key={shot.id} onClick={() => onOpenProject(project, shot.id)} title={`打开镜头 ${shot.number}`}>
                    {source ? <video src={source} muted preload="metadata" /> : <Play size={15} />}<span>{String(shot.number).padStart(2, "0")}</span>
                  </button>;
                })}
                {generatedShots.length > 4 && <small>+{generatedShots.length - 4}</small>}
              </> : <span className="unlinked-prompt"><Film size={14} /> 未关联电影</span>}
            </div>
            {version.analysis && <details className="saved-analysis"><summary>查看 AI 分析</summary><p>{version.analysis.summary}</p><small>{version.analysis.suggestions.join(" · ")}</small></details>}
            <div className="prompt-library-actions"><button type="button" onClick={() => onRestore(version)}><RotateCcw size={13} /> 恢复到首页</button><button type="button" onClick={() => onDelete(version.id)}>删除</button></div>
          </article>;
        })}</div>}
    </section>
  </div>;
}
