import { useState } from "react";
import type { DirectorStyle } from "../types";

export function DirectorStylesView({ styles, onChange }: { styles: DirectorStyle[]; onChange: (styles: DirectorStyle[]) => void }) {
  const [draft, setDraft] = useState<DirectorStyle | null>(null);
  const [error, setError] = useState("");
  const save = () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.prompt.trim()) { setError("请填写风格名称和生成指令。"); return; }
    const value = { ...draft, name: draft.name.trim(), prompt: draft.prompt.trim() };
    onChange([...styles.filter((item) => item.id !== value.id), value]); setDraft(null); setError("");
  };
  return <div className="library-view"><header className="topbar library-topbar"><div className="wordmark"><span>导演风格</span><i>DIRECTOR STYLES</i></div></header><section className="library-content">
    <div className="library-heading"><div><span>STYLE LIBRARY</span><h1>导演风格管理</h1></div><button className="primary-button" onClick={() => { setDraft({ id: crypto.randomUUID(), name: "", description: "", prompt: "" }); setError(""); }}>新建风格</button></div>
    <p>将表演、镜头和节奏写成可复用指令。在电影工作台选择后用于视频生成。修改或删除风格库条目不会改变电影已选的版本。</p>
    <div className="style-library-grid">{styles.map((style) => <article className="settings-card" key={style.id}><h2>{style.name}</h2><p>{style.description}</p><p className="style-prompt">{style.prompt}</p><button className="secondary-button" onClick={() => { setDraft({ ...style }); setError(""); }}>编辑</button> <button className="quiet-button" onClick={() => onChange(styles.filter((item) => item.id !== style.id))}>删除</button></article>)}</div>
    {!styles.length && <p>暂无风格，点击“新建风格”添加。</p>}
    {draft && <section className="settings-card style-editor"><h2>{styles.some((item) => item.id === draft.id) ? "编辑风格" : "新建风格"}</h2><label>名称<input maxLength={60} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>简介<input maxLength={160} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label>视频生成指令<textarea rows={7} maxLength={600} value={draft.prompt} placeholder="描述表演方式、构图、运镜、节奏与色彩……" onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} /></label><small>{draft.prompt.length}/600 字符；模型总提示词限制仍适用。</small>{error && <p role="alert">{error}</p>}<div><button className="primary-button" onClick={save}>保存风格</button> <button className="secondary-button" onClick={() => setDraft(null)}>取消</button></div></section>}
  </section></div>;
}
