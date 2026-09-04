import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clapperboard,
  Clock3,
  Film,
  FolderOpen,
  HardDrive,
  Home,
  KeyRound,
  Layers3,
  MessageCircleMore,
  MoreHorizontal,
  Play,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { createDirectorProposal } from "./lib/director";
import { getVideoProvider } from "./lib/providers";
import { createProjectDirectory, isDesktopApp, openProjectFile, saveProjectFile } from "./lib/projectFiles";
import { loadProjects, loadSettings, saveProjects, saveSettings } from "./lib/storage";
import type { GenerationSettings, MovieProject, Shot } from "./types";

type View = "home" | "proposal" | "studio" | "settings";

const prompts = [
  "一封迟到了十年的信，在海边小镇找到收件人",
  "凌晨两点，无人便利店里发生了一次奇怪的相遇",
  "一位宇航员在返回地球前，最后一次望向月球",
];

export default function App() {
  const [projects, setProjects] = useState<MovieProject[]>(loadProjects);
  const [active, setActive] = useState<MovieProject | null>(null);
  const [idea, setIdea] = useState("");
  const [view, setView] = useState<View>("home");
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [settings, setSettings] = useState<GenerationSettings>(loadSettings);
  const [apiKey, setApiKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => saveProjects(projects), [projects]);
  useEffect(() => saveSettings(settings), [settings]);

  const begin = () => {
    if (!idea.trim()) return;
    setIsThinking(true);
    window.setTimeout(() => {
      const project = createDirectorProposal(idea.trim());
      setActive(project);
      setIsThinking(false);
      setView("proposal");
    }, 850);
  };

  const accept = () => {
    if (!active) return;
    const next = { ...active, updatedAt: new Date().toISOString() };
    setProjects((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    setActive(next);
    setSelectedShotId(next.scenes[0]?.shots[0]?.id ?? null);
    setView("studio");
  };

  const openProject = (project: MovieProject) => {
    setActive(project);
    setSelectedShotId(project.scenes[0]?.shots[0]?.id ?? null);
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
    setIdea("");
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
      <AppRail view={view} onHome={goHome} onSettings={() => setView("settings")} />
      <main className="main-stage">
        {view === "home" && (
          <HomeView
            idea={idea}
            projects={projects}
            isThinking={isThinking}
            onIdea={setIdea}
            onBegin={begin}
            onPrompt={setIdea}
            onOpen={openProject}
            onOpenFile={openLocalProject}
          />
        )}
        {view === "proposal" && active && (
          <ProposalView project={active} onBack={goHome} onAccept={accept} />
        )}
        {view === "studio" && active && (
          <StudioView
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

function AppRail({ view, onHome, onSettings }: { view: View; onHome: () => void; onSettings: () => void }) {
  return (
    <aside className="app-rail">
      <button className="brand-mark" onClick={onHome} aria-label="返回首页">
        <Clapperboard size={22} strokeWidth={1.8} />
      </button>
      <nav>
        <button className={view === "home" ? "rail-button active" : "rail-button"} onClick={onHome}>
          <Home size={19} />
          <span>首页</span>
        </button>
        <button className="rail-button">
          <Film size={19} />
          <span>电影</span>
        </button>
        <button className="rail-button">
          <Layers3 size={19} />
          <span>素材</span>
        </button>
      </nav>
      <button className={view === "settings" ? "rail-button settings-button active" : "rail-button settings-button"} onClick={onSettings}>
        <Settings size={19} />
        <span>设置</span>
      </button>
    </aside>
  );
}

interface HomeProps {
  idea: string;
  projects: MovieProject[];
  isThinking: boolean;
  onIdea: (value: string) => void;
  onBegin: () => void;
  onPrompt: (value: string) => void;
  onOpen: (project: MovieProject) => void;
  onOpenFile: () => void;
}

function HomeView({ idea, projects, isThinking, onIdea, onBegin, onPrompt, onOpen, onOpenFile }: HomeProps) {
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
            <button className="primary-button" onClick={onBegin} disabled={!idea.trim() || isThinking}>
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
        <button className="icon-button" onClick={onBack}><ArrowLeft size={19} /></button>
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
  project: MovieProject;
  selectedShotId: string | null;
  onSelectShot: (id: string) => void;
  onUpdate: (project: MovieProject) => void;
  onBack: () => void;
  settings: GenerationSettings;
  apiKey: string;
  onSaveAs: () => void;
}

function StudioView({ project, selectedShotId, onSelectShot, onUpdate, onBack, settings, apiKey, onSaveAs }: StudioProps) {
  const [directorMode, setDirectorMode] = useState(false);
  const allShots = project.scenes.flatMap((scene) => scene.shots);
  const selected = allShots.find((shot) => shot.id === selectedShotId) ?? allShots[0];
  const totalDuration = allShots.reduce((sum, item) => sum + item.duration, 0);

  const generate = async () => {
    if (!selected) return;
    const setStatus = (status: Shot["generationStatus"]) => {
      onUpdate({
        ...project,
        status: status === "completed" ? "剪辑中" : "生成中",
        updatedAt: new Date().toISOString(),
        scenes: project.scenes.map((scene) => ({
          ...scene,
          shots: scene.shots.map((shot) => shot.id === selected.id ? { ...shot, generationStatus: status } : shot),
        })),
      });
    };
    setStatus("generating");
    try {
      const result = await getVideoProvider(settings).generate({ shot: selected, project, settings, apiKey });
      onUpdate({
        ...project,
        status: "剪辑中",
        updatedAt: new Date().toISOString(),
        scenes: project.scenes.map((scene) => ({
          ...scene,
          shots: scene.shots.map((shot) => shot.id === selected.id ? {
            ...shot,
            generationStatus: "completed",
            taskId: result.taskId,
            videoUrl: result.videoUrl,
            generationError: undefined,
          } : shot),
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onUpdate({
        ...project,
        status: "设计中",
        updatedAt: new Date().toISOString(),
        scenes: project.scenes.map((scene) => ({
          ...scene,
          shots: scene.shots.map((shot) => shot.id === selected.id ? { ...shot, generationStatus: "failed", generationError: message } : shot),
        })),
      });
    }
  };

  return (
    <div className="studio-view">
      <header className="studio-header workspace-header">
        <button className="icon-button" onClick={onBack}><ArrowLeft size={19} /></button>
        <div className="project-title"><span className="header-kicker">MY FILM</span><h2>《{project.title}》</h2></div>
        <div className="save-state">{project.localPath ? <><Check size={14} /> 已保存到本地</> : <>暂存在应用中</>}</div>
        <button className="quiet-button" onClick={onSaveAs}><HardDrive size={15} /> {project.localPath ? "另存为" : "保存项目"}</button>
        <button className="quiet-button"><Play size={15} fill="currentColor" /> 预览全片</button>
        <button className="primary-button compact">导出电影 <ArrowRight size={15} /></button>
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
                  {shot.generationStatus === "completed" && <i className="done-dot" />}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <section className="canvas-panel">
          <div className="canvas-toolbar"><span>镜头 {String(selected?.number ?? 1).padStart(2, "0")}</span><button><MoreHorizontal size={17} /></button></div>
          <div className="preview-canvas">
            <div className="frame-lines" />
            {selected?.generationStatus === "completed" ? (
              selected.videoUrl ? <video className="generated-video" src={selected.videoUrl} controls /> : <div className="generated-frame"><span className="generated-number">{String(selected.number).padStart(2, "0")}</span><p>{selected.title}</p><button><Play size={22} fill="currentColor" /></button></div>
            ) : selected?.generationStatus === "generating" ? (
              <div className="generating-state"><div className="generation-orbit"><Sparkles size={24} /></div><h3>正在拍摄这个镜头</h3><p>AI 摄影、灯光和演员正在就位…</p></div>
            ) : selected?.generationStatus === "failed" ? (
              <div className="failed-state"><AlertCircle size={32} /><h3>这个镜头没有拍成</h3><p>{selected.generationError}</p><button className="secondary-button" onClick={generate}><RotateCcw size={16} /> 再试一次</button></div>
            ) : (
              <div className="empty-canvas"><Clapperboard size={35} strokeWidth={1.3} /><h3>镜头等待开拍</h3><p>确认右侧的导演意图，然后生成这个镜头。</p><button className="primary-button" onClick={generate}><WandSparkles size={17} /> 生成这个镜头</button><small>{settings.provider === "mock" ? "当前使用体验模式，不会产生费用" : `${settings.model} · ${settings.resolution} · ${settings.duration} 秒`}</small></div>
            )}
          </div>
          <div className="shot-description"><span>导演意图</span><p>{selected?.description}</p><div><span>{selected?.framing}</span><span>{selected?.movement}</span><span>{selected?.duration} 秒</span></div></div>
        </section>

        <aside className="director-panel">
          <div className="panel-heading"><span><Sparkles size={15} /> AI 导演</span><div className="mode-switch"><button className={!directorMode ? "active" : ""} onClick={() => setDirectorMode(false)}>普通</button><button className={directorMode ? "active" : ""} onClick={() => setDirectorMode(true)}>导演</button></div></div>
          <div className="director-conversation">
            <div className="ai-message"><span>AI 导演助手</span><p>这是<strong>{selected?.title}</strong>。{selected?.description}</p><p>我会使用{selected?.framing}和{selected?.movement}，让画面延续“{project.visualStyle}”的感觉。</p></div>
            {directorMode && <div className="pro-controls"><span>镜头规格</span><label>摄影机<input value={selected?.framing ?? ""} readOnly /></label><label>运镜<input value={selected?.movement ?? ""} readOnly /></label><label>视觉风格<textarea value={project.visualStyle} readOnly /></label><label>生成引擎<input value={settings.provider === "mock" ? "体验模式" : `MiniMax · ${settings.model}`} readOnly /></label></div>}
          </div>
          <div className="director-input"><textarea placeholder="告诉 AI 你想怎么调整这个镜头…" rows={3} /><button aria-label="发送"><ArrowRight size={18} /></button></div>
        </aside>
      </div>
      <div className="timeline">
        <div className="timeline-heading"><span><Clock3 size={14} /> 时间线</span><b>00:{String(totalDuration).padStart(2, "0")}</b></div>
        <div className="timeline-track">
          {allShots.map((shot) => <button key={shot.id} style={{ flex: shot.duration }} className={shot.id === selected?.id ? "timeline-clip active" : "timeline-clip"} onClick={() => onSelectShot(shot.id)}><span>{String(shot.number).padStart(2, "0")}</span><b>{shot.title}</b><i>{shot.duration}s</i></button>)}
        </div>
      </div>
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
  const set = <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => onSettings({ ...settings, [key]: value });
  return (
    <div className="settings-view">
      <header className="studio-header">
        <button className="icon-button" onClick={onBack}><ArrowLeft size={19} /></button>
        <div><span className="header-kicker">PREFERENCES</span><h2>设置</h2></div>
      </header>
      <div className="settings-content">
        <div className="settings-intro"><span>GENERATION</span><h1>电影生成引擎</h1><p>选择幕后使用的制作引擎。你可以先在体验模式完成创作流程，再连接真实服务。</p></div>
        <section className="settings-card">
          <div className="settings-card-title"><Sparkles size={19} /><div><h3>生成服务</h3><p>控制镜头由模拟引擎还是真实模型生成。</p></div></div>
          <div className="provider-options">
            <button className={settings.provider === "mock" ? "provider-option active" : "provider-option"} onClick={() => set("provider", "mock")}>
              <span className="provider-radio" /><div><strong>体验模式</strong><p>快速模拟任务流程，不联网、不产生费用。</p></div><i>推荐入门</i>
            </button>
            <button className={settings.provider === "minimax" ? "provider-option active" : "provider-option"} onClick={() => set("provider", "minimax")}>
              <span className="provider-radio" /><div><strong>MiniMax</strong><p>调用 Hailuo 视频模型生成真实镜头。</p></div><i>真实生成</i>
            </button>
          </div>
        </section>

        <section className={settings.provider === "minimax" ? "settings-card" : "settings-card disabled-card"}>
          <div className="settings-card-title"><KeyRound size={19} /><div><h3>MiniMax 连接</h3><p>密钥只在应用运行期间保存在内存中，关闭后自动清除。</p></div></div>
          <div className="settings-form">
            <label className="wide-field"><span>API Key</span><input type="password" value={apiKey} disabled={settings.provider !== "minimax"} onChange={(event) => onApiKey(event.target.value)} placeholder="输入 MiniMax API Key" /><small><ShieldCheck size={12} /> 不写入项目文件或浏览器存储</small></label>
            <label><span>视频模型</span><select value={settings.model} disabled={settings.provider !== "minimax"} onChange={(event) => set("model", event.target.value as GenerationSettings["model"])}><option>MiniMax-Hailuo-2.3</option><option>MiniMax-Hailuo-02</option><option>T2V-01-Director</option></select></label>
            <label><span>分辨率</span><select value={settings.resolution} disabled={settings.provider !== "minimax"} onChange={(event) => set("resolution", event.target.value as GenerationSettings["resolution"])}><option>768P</option><option>1080P</option></select></label>
            <label><span>单镜头时长</span><select value={settings.duration} disabled={settings.provider !== "minimax"} onChange={(event) => set("duration", Number(event.target.value) as 6 | 10)}><option value={6}>6 秒</option><option value={10}>10 秒</option></select></label>
          </div>
          <div className="cost-note"><AlertCircle size={15} /><p>真实生成会消耗 MiniMax 账户额度。提交镜头前请确认模型、分辨率和时长。</p></div>
        </section>
      </div>
    </div>
  );
}
