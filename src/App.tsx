import { useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Clock3,
  Film,
  FolderOpen,
  HardDrive,
  KeyRound,
  MessageCircleMore,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Download,
  WandSparkles,
  Volume2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { developIdea, expandIdea } from "@/features/director";
import { getActiveProviderName, getModelDefinition, getProviderDefinition, getVideoProvider, providerDefinitions, selectProvider, supportedVideoDuration } from "@/features/generation";
import { createProjectDirectory, isDesktopApp, openProjectFile, saveProjectFile } from "@/features/projects";
import { checkExportReadiness, exportMovie } from "./lib/exportMovie";
import { getPreviousTimelineShot, getTimelineShots, invalidateAllContinuity, invalidateDownstreamContinuity, isUsableContinuitySource, moveTimelineShot, sharesSceneWithPrevious, shotPlaybackDuration } from "@/features/timeline";
import { loadApiKey, loadIdeaDraft, loadProjects, loadSettings, saveApiKey, saveIdeaDraft, saveProjects, saveSettings } from "@/features/projects";
import type { GenerationSettings, MovieProject, Shot } from "@/domain/movie";
import type { AppView as View } from "@/app/navigation";
import { AppRail } from "@/app/AppRail";
import { AssetsView, MoviesView } from "@/features/library";
import { ContinuityTools } from "./components/ContinuityTools";
import { showContinuityWarnings } from "./lib/generationDisplay";
import { ShotDirectionPanel } from "./components/ShotDirectionPanel";
import { firstFrameIssue, usesPreviousFrame } from "./lib/shotDirection";
import { archiveShot, continuityFrameTime } from "./lib/continuityFrames";
import { DirectorStylesView } from "./components/DirectorStylesView";
import { loadDirectorStyles, saveDirectorStyles } from "./lib/directorStyles";
import type { DirectorStyle } from "./types";

const prompts = [
  "一封迟到了十年的信，在海边小镇找到收件人",
  "凌晨两点，无人便利店里发生了一次奇怪的相遇",
  "一位宇航员在返回地球前，最后一次望向月球",
];

function formatTimecode(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

export default function App() {
  const [projects, setProjects] = useState<MovieProject[]>(loadProjects);
  const [active, setActive] = useState<MovieProject | null>(null);
  const [idea, setIdea] = useState(loadIdeaDraft);
  const [view, setView] = useState<View>("home");
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [settings, setSettings] = useState<GenerationSettings>(loadSettings);
  const [apiKey, setApiKey] = useState(loadApiKey);
  const [notice, setNotice] = useState<string | null>(null);
  const [directorStyles, setDirectorStyles] = useState(loadDirectorStyles);
  useEffect(() => saveDirectorStyles(directorStyles), [directorStyles]);

  useEffect(() => saveProjects(projects), [projects]);
  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveIdeaDraft(idea), [idea]);
  useEffect(() => saveApiKey(apiKey), [apiKey]);
  useEffect(() => {
    if (!active?.localPath || !isDesktopApp()) return;
    void invoke("allow_project_assets", { path: active.localPath }).catch((error) => showNotice(`无法载入本地素材：${String(error)}`));
  }, [active?.localPath]);

  const begin = async () => {
    if (!idea.trim()) return;
    setIsThinking(true);
    try {
      const project = await developIdea(idea.trim(), settings, apiKey);
      setActive(project);
      setView("proposal");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setIsThinking(false);
    }
  };

  const expandPrompt = async () => {
    if (!idea.trim() || isExpanding) return;
    setIsExpanding(true);
    try {
      setIdea(await expandIdea(idea, settings, apiKey));
      showNotice("AI 已完成扩写，你可以继续修改或直接开始创作。", 2600);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setIsExpanding(false);
    }
  };

  const accept = () => {
    if (!active) return;
    const next = { ...active, updatedAt: new Date().toISOString() };
    setProjects((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    setActive(next);
    setSelectedShotId(next.scenes[0]?.shots[0]?.id ?? null);
    setView("studio");
  };

  const openProject = (project: MovieProject, shotId?: string) => {
    setActive(project);
    setSelectedShotId(shotId ?? project.scenes[0]?.shots[0]?.id ?? null);
    setView("studio");
  };

  const openLocalProject = async () => {
    try {
      const project = await openProjectFile();
      if (!project) return;
      setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
      openProject(project);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const goHome = () => {
    setView("home");
    setActive(null);
  };

  const updateProject = (next: MovieProject) => {
    setActive(next);
    setProjects((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    void saveProjectFile(next).catch((error) => showNotice(`自动保存失败：${String(error)}`));
  };

  const saveProjectAs = async () => {
    if (!active) return;
    try {
      const saved = await createProjectDirectory(active);
      if (saved) {
        updateProject(saved);
        showNotice("电影项目已保存到本地目录。", 2400);
      }
    } catch (error) {
      showNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const showNotice = (message: string, duration = 4200) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), duration);
  };

  return (
    <div className="app-shell">
      <AppRail view={view} onHome={goHome} onMovies={() => setView("movies")} onAssets={() => setView("assets")} onStyles={() => setView("styles")} onSettings={() => setView("settings")} />
      <main className="main-stage">
        {view === "home" && (
          <HomeView
            idea={idea}
            projects={projects}
            isThinking={isThinking}
            isExpanding={isExpanding}
            onIdea={setIdea}
            onBegin={begin}
            onExpand={expandPrompt}
            onPrompt={setIdea}
            onOpen={openProject}
            onOpenFile={openLocalProject}
          />
        )}
        {view === "proposal" && active && (
          <ProposalView project={active} onBack={goHome} onAccept={accept} />
        )}
        {view === "movies" && <MoviesView projects={projects} onOpen={openProject} onOpenFile={openLocalProject} />}
        {view === "assets" && <AssetsView projects={projects} onOpen={openProject} />}
        {view === "styles" && <DirectorStylesView styles={directorStyles} onChange={setDirectorStyles} />}
        {view === "studio" && active && (
          <StudioView
            directorStyles={directorStyles}
            project={active}
            selectedShotId={selectedShotId}
            onSelectShot={setSelectedShotId}
            onUpdate={updateProject}
            onBack={goHome}
            settings={settings}
            apiKey={apiKey}
            onSaveAs={saveProjectAs}
          />
        )}
        {view === "settings" && (
          <SettingsView settings={settings} apiKey={apiKey} onSettings={setSettings} onApiKey={setApiKey} onBack={goHome} />
        )}
      </main>
      {notice && <div className="app-notice"><AlertCircle size={16} />{notice}</div>}
    </div>
  );
}

interface HomeProps {
  idea: string;
  projects: MovieProject[];
  isThinking: boolean;
  isExpanding: boolean;
  onIdea: (value: string) => void;
  onBegin: () => void;
  onExpand: () => void;
  onPrompt: (value: string) => void;
  onOpen: (project: MovieProject) => void;
  onOpenFile: () => void;
}

function HomeView({ idea, projects, isThinking, isExpanding, onIdea, onBegin, onExpand, onPrompt, onOpen, onOpenFile }: HomeProps) {
  return (
    <div className="home-view">
      <header className="topbar">
        <div className="wordmark"><span>片场</span><i>DIRECTOR STUDIO</i></div>
        <div className="topbar-actions">
          <button className="quiet-button" onClick={onOpenFile} title={isDesktopApp() ? "选择 project.json" : "请在桌面应用中使用"}><FolderOpen size={16} /> 打开项目</button>
          <div className="avatar">导</div>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={14} /> AI 电影创作工作站</div>
        <h1>人人都是<br /><em>电影导演</em></h1>
        <p className="hero-copy">你负责想象，AI 负责执行。<br />从一个想法，开始你的下一部电影。</p>

        <div className={idea ? "idea-composer has-content" : "idea-composer"}>
          <button type="button" className="expand-idea-button" onClick={onExpand} disabled={!idea.trim() || isThinking || isExpanding} title="使用当前 AI 导演模型扩写创意">
            {isExpanding ? <span className="mini-spinner" /> : <Sparkles size={14} />}
            {isExpanding ? "正在扩写" : "AI 扩写"}
          </button>
          <textarea
            value={idea}
            onChange={(event) => onIdea(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onBegin();
            }}
            placeholder="今天，你想拍一部什么电影？"
            rows={4}
            autoFocus
          />
          <div className="composer-footer">
            <span><WandSparkles size={15} /> 说出故事、画面或一种感觉</span>
            <button type="button" className="primary-button" onClick={onBegin} disabled={!idea.trim() || isThinking || isExpanding}>
              {isThinking ? <span className="spinner" /> : <Clapperboard size={17} />}
              {isThinking ? "正在构思" : "开始创作电影"}
              {!isThinking && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
        <div className="prompt-row">
          <span>试试灵感</span>
          {prompts.map((prompt) => (
            <button key={prompt} onClick={() => onPrompt(prompt)}>{prompt}</button>
          ))}
        </div>
      </section>

      <section className="recent-section">
        <div className="section-heading">
          <div><span>YOUR FILMS</span><h2>最近创作</h2></div>
          {projects.length > 0 && <button>查看全部 <ArrowRight size={15} /></button>}
        </div>
        {projects.length === 0 ? (
          <div className="empty-film">
            <div className="film-strip"><Play size={22} fill="currentColor" /></div>
            <div><h3>你的第一部电影，从上面的一句话开始</h3><p>AI 会帮你完成故事、分镜和镜头设计。</p></div>
          </div>
        ) : (
          <div className="project-grid">
            {projects.slice(0, 3).map((project) => (
              <button className="project-card" key={project.id} onClick={() => onOpen(project)}>
                <div className="project-poster"><span>{project.title.slice(0, 1)}</span><Play size={20} fill="currentColor" /></div>
                <div className="project-info"><h3>《{project.title}》</h3><p>{project.scenes.length} 个场景 · {project.scenes.flatMap((s) => s.shots).length} 个镜头</p></div>
                <span className="status-badge">{project.status}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      <div className="grain" />
    </div>
  );
}

function ProposalView({ project, onBack, onAccept }: { project: MovieProject; onBack: () => void; onAccept: () => void }) {
  const shots = project.scenes.flatMap((scene) => scene.shots);
  return (
    <div className="proposal-view">
      <header className="studio-header">
        <Button variant="icon" size="icon" onClick={onBack} aria-label="返回"><ArrowLeft size={19} /></Button>
        <div><span className="header-kicker">AI DIRECTOR'S PROPOSAL</span><h2>导演提案</h2></div>
        <span className="step-label">构思完成 · 等待确认</span>
      </header>
      <div className="proposal-content">
        <section className="director-note">
          <div className="director-avatar"><Sparkles size={20} /></div>
          <div>
            <span>AI 导演助手</span>
            <p>我理解这是一部关于<strong>{project.scenes[0].mood}</strong>的短片。我建议用 {shots.length} 个镜头、约 {shots.reduce((sum, item) => sum + item.duration, 0)} 秒来呈现，让情绪从环境逐渐靠近人物，并在结尾获得一次呼吸。</p>
          </div>
        </section>
        <section className="proposal-main">
          <div className="proposal-story">
            <span className="section-number">01 / STORY</span>
            <h1>《{project.title}》</h1>
            <p>{project.synopsis}</p>
            <div className="meta-pills"><span>{project.visualStyle}</span><span>约 {shots.reduce((sum, s) => sum + s.duration, 0)} 秒</span><span>16:9</span></div>
          </div>
          <div className="shot-plan">
            <span className="section-number">02 / SHOT PLAN</span>
            <h3>{project.scenes[0].title}</h3>
            <p className="scene-meta">{project.scenes[0].location} · {project.scenes[0].mood}</p>
            <div className="shot-list">
              {shots.map((item) => (
                <div className="proposal-shot" key={item.id}>
                  <span className="shot-index">{String(item.number).padStart(2, "0")}</span>
                  <div><h4>{item.title}</h4><p>{item.description}</p></div>
                  <div className="shot-tags"><span>{item.framing}</span><span>{item.movement}</span><span>{item.duration}s</span></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <footer className="proposal-actions">
        <button className="secondary-button"><RotateCcw size={16} /> 重新设计</button>
        <button className="secondary-button"><MessageCircleMore size={16} /> 告诉 AI 怎么改</button>
        <button className="primary-button" onClick={onAccept}><Check size={17} /> 接受方案，进入片场 <ArrowRight size={16} /></button>
      </footer>
    </div>
  );
}

interface StudioProps {
  directorStyles: DirectorStyle[];
  project: MovieProject;
  selectedShotId: string | null;
  onSelectShot: (id: string) => void;
  onUpdate: (project: MovieProject) => void;
  onBack: () => void;
  settings: GenerationSettings;
  apiKey: string;
  onSaveAs: () => void;
}

function StudioView({ project, selectedShotId, onSelectShot, onUpdate, onBack, settings, apiKey, onSaveAs, directorStyles }: StudioProps) {
  const providerName = getActiveProviderName(settings);
  const [directorMode, setDirectorMode] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [playingTimeline, setPlayingTimeline] = useState(false);
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState("正在提交生成任务…");
  const [mediaErrorShotId, setMediaErrorShotId] = useState<string | null>(null);
  const [timelinePanning, setTimelinePanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const timelineDragRef = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null);
  const allShots = useMemo(() => getTimelineShots(project), [project]);
  const selected = allShots.find((shot) => shot.id === selectedShotId) ?? allShots[0];
  const totalDuration = allShots.reduce((sum, item) => sum + shotPlaybackDuration(item), 0);
  const selectedSource = (selected?.localAssetPath && isDesktopApp() ? convertFileSrc(selected.localAssetPath) : undefined) ?? selected?.videoUrl;
  const previousShot = selected ? getPreviousTimelineShot(project, selected.id) : undefined;
  const sameSceneTransition = Boolean(selected && usesPreviousFrame(selected, project));
  const continuityBlocked = Boolean(sameSceneTransition && !isUsableContinuitySource(previousShot));
  const directionIssue = selected ? firstFrameIssue(selected) : undefined;

  useEffect(() => setMediaErrorShotId(null), [selected?.id, selectedSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playingTimeline) return;
    video.currentTime = selected?.trimStart ?? 0;
    void video.play().catch(() => setPlayingTimeline(false));
  }, [selected?.id, selected?.trimStart, playingTimeline]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingTimeline) {
      if (audio.paused) audio.currentTime = project.soundtrack?.trimStart ?? 0;
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [playingTimeline, project.soundtrack?.trimStart]);

  const generate = async (forceNew = false) => {
    if (!selected || activeGenerationId) return;
    if (continuityBlocked || directionIssue) return;
    const generationShot = forceNew ? { ...selected, taskId: undefined, continuitySourceShotId: undefined, visualReferenceName: undefined } : selected;
    const taskSettings = !forceNew && selected.taskId && selected.generationProviderId
      ? { ...settings, provider: selected.generationProviderId, model: selected.generationModelId ?? settings.model }
      : settings;
    const taskProviderName = getActiveProviderName(taskSettings);
    const archived = { ...project, scenes: project.scenes.map((scene) => ({ ...scene, shots: scene.shots.map((shot) => shot.id === selected.id ? { ...archiveShot(shot), sourceFrame: forceNew && sameSceneTransition && previousShot ? { shotId: previousShot.id, taskId: previousShot.taskId, path: previousShot.localAssetPath, seconds: continuityFrameTime(previousShot) } : forceNew ? undefined : shot.sourceFrame } : shot) })) };
    const generationProject = forceNew ? invalidateDownstreamContinuity(archived, selected.id) : archived;
    let currentTaskId = generationShot.taskId;
    setActiveGenerationId(selected.id);
    setGenerationProgress(currentTaskId ? "正在恢复任务状态查询…" : "正在提交生成任务…");
    onUpdate({
      ...generationProject,
      status: "生成中",
      updatedAt: new Date().toISOString(),
      scenes: generationProject.scenes.map((scene) => ({
        ...scene,
        shots: scene.shots.map((shot) => shot.id === selected.id ? { ...shot, taskId: forceNew ? undefined : shot.taskId, generationProviderId: taskSettings.provider, generationModelId: taskSettings.model, generationStatus: "generating", generationStartedAt: new Date().toISOString(), generationError: undefined } : shot),
      })),
    });
    try {
      const result = await getVideoProvider(taskSettings).generate({
        shot: generationShot,
        project: generationProject,
        settings: taskSettings,
        apiKey,
        onTaskCreated: (taskId) => {
          currentTaskId = taskId;
          setGenerationProgress(`任务已提交（${taskId}），等待 ${taskProviderName} 处理…`);
          onUpdate({ ...generationProject, status: "生成中", updatedAt: new Date().toISOString(), scenes: generationProject.scenes.map((scene) => ({ ...scene, shots: scene.shots.map((shot) => shot.id === selected.id ? { ...shot, taskId, generationProviderId: taskSettings.provider, generationModelId: taskSettings.model, generationStatus: "generating", generationStartedAt: shot.generationStartedAt ?? new Date().toISOString() } : shot) })) });
        },
        onProgress: (status, elapsedSeconds) => setGenerationProgress(`${taskProviderName} 状态：${status} · 已等待 ${Math.floor(elapsedSeconds / 60)}分${elapsedSeconds % 60}秒`),
      });
      onUpdate({
        ...generationProject,
        status: "剪辑中",
        updatedAt: new Date().toISOString(),
        scenes: generationProject.scenes.map((scene) => ({
          ...scene,
          shots: scene.shots.map((shot) => shot.id === selected.id ? {
            ...shot,
            generationStatus: "completed",
            taskId: result.taskId,
            generationProviderId: taskSettings.provider,
            generationModelId: taskSettings.model,
            videoUrl: result.videoUrl,
            localAssetPath: result.localAssetPath,
            continuitySourceShotId: result.continuitySourceShotId,
            visualReferenceName: result.visualReferenceName,
            generatedFirstFramePath: result.generatedFirstFramePath,
            continuityStale: false,
            trimStart: 0,
            trimEnd: selected.duration,
            generationError: undefined,
            generationStartedAt: undefined,
          } : shot),
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const canResume = Boolean(currentTaskId) && (message.includes("仍可能") || message.includes("无法连接") || message.includes("超时"));
      onUpdate({
        ...generationProject,
        status: "设计中",
        updatedAt: new Date().toISOString(),
        scenes: generationProject.scenes.map((scene) => ({
          ...scene,
          shots: scene.shots.map((shot) => shot.id === selected.id ? { ...shot, taskId: canResume ? currentTaskId : undefined, generationStatus: "failed", generationError: message } : shot),
        })),
      });
    } finally {
      setActiveGenerationId(null);
    }
  };

  const moveSelected = (direction: -1 | 1) => {
    if (!selected) return;
    const moved = moveTimelineShot(project, selected.id, direction);
    const first = getTimelineShots(moved)[0];
    onUpdate(first ? invalidateDownstreamContinuity(moved, first.id) : moved);
  };

  const runExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const path = await exportMovie(project);
      onUpdate({ ...project, status: "已完成", lastExportPath: path, updatedAt: new Date().toISOString() });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
    } finally {
      setExporting(false);
    }
  };

  const advancePreview = () => {
    const index = allShots.findIndex((shot) => shot.id === selected?.id);
    const next = allShots.slice(index + 1).find((shot) => shot.videoUrl || shot.localAssetPath);
    if (playingTimeline && next) onSelectShot(next.id);
    else {
      setPlayingTimeline(false);
      if (audioRef.current) audioRef.current.pause();
    }
  };

  const startPreview = () => {
    const firstPlayable = allShots.find((shot) => shot.videoUrl || shot.localAssetPath);
    if (!firstPlayable) return;
    onSelectShot(firstPlayable.id);
    setPlayingTimeline(true);
  };

  const updateTrim = (field: "trimStart" | "trimEnd", value: number) => {
    if (!selected || activeGenerationId) return;
    const limit = selected.trimEnd ?? selected.duration;
    const start = field === "trimStart" ? Math.min(value, limit - 0.1) : selected.trimStart ?? 0;
    const end = field === "trimEnd" ? Math.max(value, start + 0.1) : limit;
    const next = { ...project, scenes: project.scenes.map((scene) => ({ ...scene, shots: scene.shots.map((shot) => shot.id === selected.id ? { ...shot, trimStart: start, trimEnd: end } : shot) })), updatedAt: new Date().toISOString() };
    onUpdate(end !== limit ? invalidateDownstreamContinuity(next, selected.id) : next);
  };

  const restoreVersion = (index: number) => {
    if (!selected || activeGenerationId) return;
    const version = selected.versions?.[index];
    if (!version) return;
    const archived = archiveShot(selected);
    const { savedAt: _, ...restored } = version;
    const referenceMatches = restored.sourceFrame
      ? previousShot?.id === restored.sourceFrame.shotId && previousShot.taskId === restored.sourceFrame.taskId && previousShot.localAssetPath === restored.sourceFrame.path && continuityFrameTime(previousShot) === restored.sourceFrame.seconds && !previousShot.continuityStale
      : !sameSceneTransition && restored.visualReferenceName === project.visualReference?.name;
    const next = { ...project, updatedAt: new Date().toISOString(), scenes: project.scenes.map((scene) => ({ ...scene, shots: scene.shots.map((shot) => shot.id === selected.id ? { ...restored, versions: archived.versions, generationStatus: "completed" as const, continuityStale: !!restored.continuityStale || !referenceMatches } : shot) })) };
    onUpdate(invalidateDownstreamContinuity(next, selected.id));
  };

  const startTimelinePan = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, input, label")) return;
    timelineDragRef.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
    event.currentTarget.setPointerCapture(event.pointerId);
    setTimelinePanning(true);
  };

  const moveTimelinePan = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = timelineDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
  };

  const stopTimelinePan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (timelineDragRef.current?.pointerId !== event.pointerId) return;
    timelineDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setTimelinePanning(false);
  };

  const scrollTimeline = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = timelineScrollRef.current;
    if (!container || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    if (container.scrollWidth <= container.clientWidth) return;
    event.preventDefault();
    container.scrollLeft += event.deltaY;
  };

  const importSoundtrack = async () => {
    if (!project.localPath) { onSaveAs(); return; }
    try {
      const result = await invoke<{ path: string; name: string; duration: number } | null>("import_audio", { projectPath: project.localPath });
      if (result) onUpdate({ ...project, soundtrack: { id: crypto.randomUUID(), localPath: result.path, name: result.name, duration: result.duration, trimStart: 0, volume: 0.8 }, updatedAt: new Date().toISOString() });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
      setExportOpen(true);
    }
  };

  const importVisualReference = async () => {
    if (!project.localPath) { onSaveAs(); return; }
    try {
      const result = await invoke<{ path: string; name: string } | null>("import_visual_reference", { projectPath: project.localPath });
      if (result) {
        const invalidated = invalidateAllContinuity(project);
        onUpdate({ ...invalidated, visualReference: { localPath: result.path, name: result.name }, updatedAt: new Date().toISOString() });
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
      setExportOpen(true);
    }
  };

  return (
    <div className="studio-view">
      <header className="studio-header workspace-header">
        <button className="icon-button" onClick={onBack}><ArrowLeft size={19} /></button>
        <div className="project-title"><span className="header-kicker">MY FILM</span><h2>《{project.title}》</h2></div>
        <div className="save-state">{project.localPath ? <><Check size={14} /> 已保存到本地</> : <>暂存在应用中</>}</div>
        <button className="quiet-button" onClick={onSaveAs}><HardDrive size={15} /> {project.localPath ? "另存为" : "保存项目"}</button>
        <button className="quiet-button" onClick={playingTimeline ? () => setPlayingTimeline(false) : startPreview}>{playingTimeline ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />} {playingTimeline ? "暂停预览" : "预览全片"}</button>
        <button className="primary-button compact" onClick={() => setExportOpen(true)}>导出电影 <ArrowRight size={15} /></button>
      </header>
      <div className="workspace">
        <aside className="scene-panel">
          <div className="panel-heading"><span>电影结构</span><button><Plus size={15} /></button></div>
          {project.scenes.map((scene) => (
            <div className="scene-group" key={scene.id}>
              <div className="scene-title"><ChevronDown size={15} /><span>场景 {String(scene.number).padStart(2, "0")}</span><b>{scene.title}</b></div>
              {scene.shots.map((shot) => (
                <button className={shot.id === selected?.id ? "shot-nav active" : "shot-nav"} key={shot.id} onClick={() => onSelectShot(shot.id)}>
                  <div className="shot-miniature">{shot.generationStatus === "completed" ? <span>{shot.number}</span> : <Film size={16} />}</div>
                  <div><strong>{String(shot.number).padStart(2, "0")} {shot.title}</strong><span>{shot.framing} · {shot.duration}s</span></div>
                  {shot.generationStatus === "completed" && <i className={shot.continuityStale ? "done-dot stale" : "done-dot"} title={shot.continuityStale ? "连续性已过期，需要重新生成" : "已完成"} />}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <section className="canvas-panel">
          <div className="canvas-toolbar"><span>镜头 {String(selected?.number ?? 1).padStart(2, "0")}</span><div><button type="button" title="为首镜头和每个新场景锁定角色与美术风格" onClick={importVisualReference}><Film size={15} /> {project.visualReference ? "更换视觉基准" : "设置视觉基准"}</button>{selected?.generationStatus === "completed" && <button type="button" title="创建一个新的生成任务，可能产生费用" onClick={() => void generate(true)}><RotateCcw size={15} /> 重新生成</button>}<button><MoreHorizontal size={17} /></button></div></div>
          <div className="preview-canvas">
            <div className="frame-lines" />
            {showContinuityWarnings(selected) && directionIssue ? (
              <div className="generation-recovery"><h3>确认镜头首帧</h3><p>{directionIssue}</p></div>
            ) : showContinuityWarnings(selected) && continuityBlocked ? (
              <div className="generation-recovery"><div className="recovery-icon"><AlertCircle size={22} /></div><span className="recovery-kicker">CONTINUITY CHAIN BROKEN</span><h3>请先完成上一镜头</h3><p>“{previousShot?.title}”尚未生成、素材不可用或连续性已经过期。为保证尾帧续拍，当前镜头暂不能生成。</p></div>
            ) : showContinuityWarnings(selected) && selected?.continuityStale ? (
              <div className="generation-recovery"><div className="recovery-icon"><AlertCircle size={22} /></div><span className="recovery-kicker">CONTINUITY OUTDATED</span><h3>连续性参考已经过期</h3><p>前序镜头发生了变化，这个视频仍基于旧画面生成。请重新生成以接续最新尾帧。</p><div className="recovery-actions"><button className="primary-button compact" onClick={() => void generate(true)}><WandSparkles size={15} /> 按最新尾帧重新生成</button></div></div>
            ) : selected?.generationStatus === "completed" ? (
              selectedSource && mediaErrorShotId !== selected.id ? <video ref={videoRef} className="generated-video" src={selectedSource} controls={!playingTimeline} onError={() => { setPlayingTimeline(false); setMediaErrorShotId(selected.id); }} onLoadedData={() => setMediaErrorShotId(null)} onEnded={advancePreview} onTimeUpdate={(event) => { if (playingTimeline && event.currentTarget.currentTime >= Math.min(selected.trimEnd ?? selected.duration, selected.duration)) advancePreview(); }} /> : <div className="generation-recovery"><div className="recovery-icon"><AlertCircle size={22} /></div><span className="recovery-kicker">VIDEO LINK EXPIRED</span><h3>视频链接已经失效</h3><p>{selected.taskId ? "原生成任务还在，可以先重新获取；也可以创建一个全新视频任务。" : "旧视频无法恢复，可以重新生成这个镜头。"}</p>{selected.taskId && <code>Task ID · {selected.taskId}</code>}<div className="recovery-actions">{selected.taskId && <button className="secondary-button compact" onClick={() => void generate()}><RotateCcw size={15} /> 重新获取</button>}<button className="primary-button compact" onClick={() => void generate(true)}><WandSparkles size={15} /> 重新生成</button></div></div>
            ) : selected?.generationStatus === "generating" && activeGenerationId === selected.id ? (
              <div className="generating-state"><div className="generation-orbit"><Sparkles size={24} /></div><h3>正在拍摄这个镜头</h3><p>{generationProgress}</p></div>
            ) : selected?.generationStatus === "generating" ? (
              <div className="generation-recovery"><div className="recovery-icon"><AlertCircle size={22} /></div><span className="recovery-kicker">GENERATION INTERRUPTED</span><h3>生成状态查询已中断</h3><p>{selected.taskId ? "视频任务可能仍在 MiniMax 后台运行，可以安全地恢复查询，不会重复创建任务。" : "这是旧版本遗留的状态，本地没有保存任务编号，可以重新生成。"}</p>{selected.taskId && <code>Task ID · {selected.taskId}</code>}<div className="recovery-actions">{selected.taskId && <button className="secondary-button compact" onClick={() => void generate()}><RotateCcw size={15} /> 恢复任务</button>}<button className="primary-button compact" onClick={() => void generate(true)}><WandSparkles size={15} /> 重新生成</button></div></div>
            ) : selected?.generationStatus === "failed" ? (
              <div className="failed-state"><AlertCircle size={32} /><h3>这个镜头没有拍成</h3><p>{selected.generationError}</p><button className="secondary-button" onClick={() => void generate(selected.taskId ? false : true)}><RotateCcw size={16} /> {selected.taskId ? "继续查询" : "再试一次"}</button></div>
            ) : (
              <div className="empty-canvas"><Clapperboard size={35} strokeWidth={1.3} /><h3>镜头等待开拍</h3><p>{sameSceneTransition && previousShot ? `将自动使用“${previousShot.title}”的尾帧续拍。` : project.visualReference ? `将使用项目视觉基准“${project.visualReference.name}”建立这个场景。` : "尚未设置视觉基准，将仅根据导演设定生成。"}</p><button className="primary-button" onClick={() => void generate(true)}><WandSparkles size={17} /> 生成这个镜头</button><small>{settings.provider === "mock" ? "当前使用体验模式，不会产生费用" : `${settings.model} · ${settings.resolution} · 生成 ${supportedVideoDuration(selected?.duration ?? 6)} 秒，成片保留 ${selected?.duration ?? 6} 秒`}</small></div>
            )}
          </div>
          {selected?.generationStatus === "completed" && selectedSource && <div className="trim-editor"><span><Scissors size={13} /> 裁剪</span><label>入点 <input type="range" min={0} max={Math.max(.2, (selected.trimEnd ?? selected.duration) - .1)} step="0.1" value={selected.trimStart ?? 0} onChange={(event) => updateTrim("trimStart", Number(event.target.value))} /><b>{(selected.trimStart ?? 0).toFixed(1)}s</b></label><label>出点 <input type="range" min={Math.min(selected.duration - .1, (selected.trimStart ?? 0) + .1)} max={selected.duration} step="0.1" value={selected.trimEnd ?? selected.duration} onChange={(event) => updateTrim("trimEnd", Number(event.target.value))} /><b>{(selected.trimEnd ?? selected.duration).toFixed(1)}s</b></label></div>}
          <div className="shot-description"><span>导演意图</span><p>{selected?.description}</p><div>{selected?.continuitySourceShotId ? <span title="生成时使用了上一镜头的尾帧">尾帧续拍</span> : selected?.visualReferenceName && <span title={`使用视觉基准：${selected.visualReferenceName}`}>视觉基准</span>}<span>{selected?.framing}</span><span>{selected?.movement}</span><span>{selected?.duration} 秒</span></div></div>
        </section>

        <aside className="director-panel">
          <div className="panel-heading"><span><Sparkles size={15} /> AI 导演</span><div className="mode-switch"><button className={!directorMode ? "active" : ""} onClick={() => setDirectorMode(false)}>普通</button><button className={directorMode ? "active" : ""} onClick={() => setDirectorMode(true)}>导演</button></div></div>
          <div className="director-conversation">
            <section className="shot-direction"><h3>电影导演风格</h3><select aria-label="选择导演风格" disabled={!!activeGenerationId} value="" onChange={(event) => { const style = directorStyles.find((item) => item.id === event.target.value); onUpdate({ ...invalidateAllContinuity(project), directorStyle: style ? { ...style } : undefined, updatedAt: new Date().toISOString() }); }}><option value="" disabled>选择或更新风格…</option><option value="none">不使用导演风格</option>{directorStyles.map((style) => <option value={style.id} key={style.id}>{style.name}</option>)}</select><p>当前：{project.directorStyle?.name ?? "未启用"}</p>{project.directorStyle && <details><summary>查看生成指令</summary><p>{project.directorStyle.prompt}</p></details>}<p>应用于整部电影的新生成任务；更换后已有镜头会标记为需重生成。</p></section>
            {selected && <ShotDirectionPanel key={`${project.id}-${selected.id}`} project={project} shot={selected} disabled={!!activeGenerationId} onUpdate={onUpdate} onSave={onSaveAs} />}
            {selected && <ContinuityTools shot={selected} disabled={!!activeGenerationId} onCut={(seconds) => updateTrim("trimEnd", seconds)} onRestore={restoreVersion} />}
            <div className="ai-message"><span>AI 导演助手</span><p>这是<strong>{selected?.title}</strong>。{selected?.description}</p><p>我会使用{selected?.framing}和{selected?.movement}，让画面延续“{project.visualStyle}”的感觉。</p></div>
            {directorMode && <div className="pro-controls"><span>镜头规格</span><label>摄影机<input value={selected?.framing ?? ""} readOnly /></label><label>运镜<input value={selected?.movement ?? ""} readOnly /></label><label>视觉风格<textarea value={project.visualStyle} readOnly /></label><label>生成引擎<input value={`${providerName} · ${settings.model}`} readOnly /></label></div>}
          </div>
          <div className="director-input"><textarea placeholder="告诉 AI 你想怎么调整这个镜头…" rows={3} /><button aria-label="发送"><ArrowRight size={18} /></button></div>
        </aside>
      </div>
      <section className="timeline">
        <header className="timeline-heading">
          <div className="timeline-title"><Clock3 size={14} /><span>时间线</span><em>SEQUENCE 01</em></div>
          <div className="timeline-tools"><button onClick={() => moveSelected(-1)} disabled={!selected || allShots[0]?.id === selected.id}><ChevronLeft size={13} /> 前移</button><button onClick={() => moveSelected(1)} disabled={!selected || allShots[allShots.length - 1]?.id === selected.id}>后移 <ChevronRight size={13} /></button><b>{formatTimecode(totalDuration)}:00</b></div>
        </header>
        <div className="timeline-editor">
          <div className="track-labels"><div className="ruler-corner">TC</div><div className="track-label"><Film size={13} /><span><b>V1</b> 主画面</span></div><div className="track-label"><Music2 size={13} /><span><b>A1</b> 配乐</span></div></div>
          <div ref={timelineScrollRef} className={timelinePanning ? "timeline-scroll is-panning" : "timeline-scroll"} title="滚轮或拖动空白区域可横向浏览" onWheel={scrollTimeline} onPointerDown={startTimelinePan} onPointerMove={moveTimelinePan} onPointerUp={stopTimelinePan} onPointerCancel={stopTimelinePan}>
            <div className="time-ruler">{Array.from({ length: Math.max(2, Math.ceil(totalDuration / 5) + 1) }, (_, index) => <span key={index} style={{ left: `${Math.min(100, (index * 5 / Math.max(totalDuration, 1)) * 100)}%` }}>{formatTimecode(index * 5)}</span>)}</div>
            <div className="timeline-track">
              {allShots.map((shot) => <button key={shot.id} style={{ width: `${Math.max(92, shotPlaybackDuration(shot) * 34)}px` }} className={`${shot.id === selected?.id ? "timeline-clip active" : "timeline-clip"} status-${shot.generationStatus}${shot.continuityStale ? " continuity-stale" : ""}`} title={shot.continuityStale ? "前序镜头已变化，需要重新生成" : undefined} onClick={() => onSelectShot(shot.id)}><span>{String(shot.number).padStart(2, "0")}</span><b>{shot.title}</b><i>{shot.continuityStale ? "需重生成" : `${shotPlaybackDuration(shot).toFixed(1)}s`}</i></button>)}
            </div>
            <div className="audio-track-row">{project.soundtrack ? <div className="audio-clip"><b>{project.soundtrack.name}</b><label><Volume2 size={11} /><input type="range" min="0" max="1.5" step="0.05" value={project.soundtrack.volume} onChange={(event) => onUpdate({ ...project, soundtrack: { ...project.soundtrack!, volume: Number(event.target.value) }, updatedAt: new Date().toISOString() })} /></label></div> : <button onClick={importSoundtrack}><Plus size={12} /> 导入配乐</button>}</div>
          </div>
        </div>
        {project.soundtrack && isDesktopApp() && <audio ref={audioRef} src={convertFileSrc(project.soundtrack.localPath)} />}
      </section>
      {exportOpen && <ExportDialog project={project} exporting={exporting} error={exportError} onExport={runExport} onClose={() => { if (!exporting) setExportOpen(false); }} />}
    </div>
  );
}

function ExportDialog({ project, exporting, error, onExport, onClose }: { project: MovieProject; exporting: boolean; error: string | null; onExport: () => void; onClose: () => void }) {
  const readiness = checkExportReadiness(project);
  const completed = Boolean(project.lastExportPath) && !error;
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title">
        <div className="export-icon"><Download size={22} /></div>
        <span className="section-number">FINAL CUT</span>
        <h2 id="export-title">导出《{project.title}》</h2>
        <p>按照当前时间线顺序合并镜头，输出适合播放和分享的标准电影文件。</p>
        <div className="export-specs"><div><span>格式</span><strong>MP4 · H.264</strong></div><div><span>画面</span><strong>1920 × 1080 · 30fps</strong></div><div><span>位置</span><strong>项目 / exports</strong></div></div>
        {!project.localPath && <div className="export-warning"><AlertCircle size={15} /><span>请先使用工作台顶部的“保存项目”选择本地位置。</span></div>}
        {project.localPath && readiness.missingShots.length > 0 && <div className="export-warning"><AlertCircle size={15} /><span>还有 {readiness.missingShots.length} 个镜头缺少本地素材或连续性已过期：{readiness.missingShots.slice(0, 3).join("、")}{readiness.missingShots.length > 3 ? "…" : ""}</span></div>}
        {error && <div className="export-error"><AlertCircle size={15} /><span>{error}</span></div>}
        {completed && <div className="export-success"><Check size={15} /><span>电影已导出到：{project.lastExportPath}</span></div>}
        {exporting && <div className="export-progress"><span className="spinner" /><div><strong>正在完成电影…</strong><p>统一画面规格并按时间线合并镜头，请不要关闭应用。</p></div></div>}
        <footer><button className="secondary-button" onClick={onClose} disabled={exporting}>{completed ? "完成" : "取消"}</button><button className="primary-button" onClick={onExport} disabled={!readiness.ready || exporting}>{exporting ? "正在导出" : completed ? "再次导出" : "开始导出"}<ArrowRight size={15} /></button></footer>
      </section>
    </div>
  );
}

interface SettingsProps {
  settings: GenerationSettings;
  apiKey: string;
  onSettings: (settings: GenerationSettings) => void;
  onApiKey: (value: string) => void;
  onBack: () => void;
}

function SettingsView({ settings, apiKey, onSettings, onApiKey, onBack }: SettingsProps) {
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ ok: boolean; message: string } | null>(null);
  const set = <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => onSettings({ ...settings, [key]: value });
  const activeProvider = getProviderDefinition(settings.provider) ?? providerDefinitions[0];
  const activeModel = getModelDefinition(settings) ?? activeProvider.models[0];
  const setProvider = (providerId: string) => {
    onSettings(selectProvider(settings, providerId));
    setConnectionResult(null);
  };
  const setModel = (modelId: string) => {
    const next = { ...settings, model: modelId };
    const model = getModelDefinition(next);
    onSettings({
      ...next,
      resolution: model?.capabilities.resolutions[0] ?? settings.resolution,
      duration: model?.capabilities.durations[0] ?? settings.duration,
    });
  };
  const testConnection = async () => {
    if (!apiKey.trim()) {
      setConnectionResult({ ok: false, message: "请先填写 API Key。" });
      return;
    }
    if (!isDesktopApp()) {
      setConnectionResult({ ok: false, message: "接口测试需要在 Tauri 桌面应用中运行。" });
      return;
    }
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const message = await invoke<string>("minimax_test_connection", { apiKey });
      setConnectionResult({ ok: true, message });
    } catch (error) {
      setConnectionResult({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setTestingConnection(false);
    }
  };
  return (
    <div className="settings-view">
      <header className="studio-header">
        <button className="icon-button" onClick={onBack}><ArrowLeft size={19} /></button>
        <div><span className="header-kicker">PREFERENCES</span><h2>设置</h2></div>
      </header>
      <div className="settings-content">
        <div className="settings-intro"><span>GENERATION</span><h1>电影生成引擎</h1><p>选择幕后使用的制作引擎。你可以先在体验模式完成创作流程，再连接真实服务。</p></div>
        <section className="settings-card">
          <div className="settings-card-title"><Clapperboard size={19} /><div><h3>AI 导演引擎</h3><p>决定一句话由本地模板还是大模型发展成完整分镜。</p></div></div>
          <div className="provider-options">
            <button className={settings.directorProvider === "local" ? "provider-option active" : "provider-option"} onClick={() => set("directorProvider", "local")}><span className="provider-radio" /><div><strong>本地导演</strong><p>即时生成固定结构，不联网、不产生费用。</p></div><i>体验</i></button>
            <button className={settings.directorProvider === "minimax" ? "provider-option active" : "provider-option"} onClick={() => set("directorProvider", "minimax")}><span className="provider-radio" /><div><strong>MiniMax AI 导演</strong><p>理解任意创意，生成连贯的多场景分镜。</p></div><i>智能</i></button>
          </div>
          {settings.directorProvider === "minimax" && <div className="inline-setting"><label><span>导演模型</span><select value={settings.directorModel} onChange={(event) => set("directorModel", event.target.value as GenerationSettings["directorModel"])}><option>MiniMax-M3</option><option>MiniMax-M2.7</option><option>MiniMax-M2.7-highspeed</option></select></label><p>与视频引擎共用下方 API Key。</p></div>}
        </section>
        <section className="settings-card">
          <div className="settings-card-title"><Sparkles size={19} /><div><h3>生成服务</h3><p>控制镜头由模拟引擎还是真实模型生成。</p></div></div>
          <div className="provider-options">{providerDefinitions.map((provider) => <button key={provider.id} className={settings.provider === provider.id ? "provider-option active" : "provider-option"} onClick={() => setProvider(provider.id)}><span className="provider-radio" /><div><strong>{provider.name}</strong><p>{provider.description}</p></div><i>{provider.badge}</i></button>)}</div>
        </section>

        <section className={settings.provider === "minimax" || settings.directorProvider === "minimax" ? "settings-card" : "settings-card disabled-card"}>
          <div className="settings-card-title"><KeyRound size={19} /><div><h3>MiniMax 国内连接</h3><p>连接国内开放平台 api.minimaxi.com；密钥保存在当前设备的应用存储中。</p></div></div>
          <div className="settings-form">
            <label className="wide-field"><span>API Key</span><div className="api-key-row"><input type="password" value={apiKey} disabled={settings.provider !== "minimax" && settings.directorProvider !== "minimax"} onChange={(event) => { onApiKey(event.target.value); setConnectionResult(null); }} placeholder="输入 MiniMax API Key" /><button type="button" className="secondary-button test-api-button" onClick={testConnection} disabled={!apiKey.trim() || testingConnection}>{testingConnection ? <span className="mini-spinner" /> : <Check size={14} />}{testingConnection ? "测试中" : "测试连接"}</button></div><small><ShieldCheck size={12} /> 保存在本机应用存储中，不写入电影项目；本地存储未加密</small>{connectionResult && <small className={connectionResult.ok ? "connection-result success" : "connection-result error"}>{connectionResult.ok ? <Check size={12} /> : <AlertCircle size={12} />}{connectionResult.message}</small>}</label>
            <label><span>视频模型</span><select value={settings.model} disabled={settings.provider === "mock"} onChange={(event) => setModel(event.target.value)}>{activeProvider.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
            <label><span>分辨率</span><select value={settings.resolution} disabled={settings.provider === "mock"} onChange={(event) => set("resolution", event.target.value)}>{activeModel.capabilities.resolutions.map((resolution) => <option key={resolution}>{resolution}</option>)}</select></label>
            <label><span>单镜头时长</span><select value={settings.duration} disabled={settings.provider === "mock"} onChange={(event) => set("duration", Number(event.target.value))}>{activeModel.capabilities.durations.map((duration) => <option key={duration} value={duration}>{duration} 秒</option>)}</select></label>
          </div>
          <div className="capability-list"><span className={activeModel.capabilities.textToVideo ? "supported" : ""}>文生视频</span><span className={activeModel.capabilities.firstFrame ? "supported" : ""}>首帧续拍</span><span className={activeModel.capabilities.lastFrame ? "supported" : ""}>尾帧控制</span><span className={activeModel.capabilities.characterReference ? "supported" : ""}>角色参考</span><span className={activeModel.capabilities.videoReference ? "supported" : ""}>视频参考</span><span className={activeModel.capabilities.seed ? "supported" : ""}>固定种子</span></div>
          <div className="cost-note"><AlertCircle size={15} /><p>真实生成会消耗 MiniMax 账户额度。提交镜头前请确认模型、分辨率和时长。</p></div>
        </section>
      </div>
    </div>
  );
}
