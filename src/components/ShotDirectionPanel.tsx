import { useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { CharacterAsset, MovieProject, Shot, VisualReference } from "../types";
import { actionStart, framingWarning, transitionMode } from "../lib/shotDirection";
import { archiveShot } from "../lib/continuityFrames";
import { invalidateAllContinuity, invalidateDownstreamContinuity } from "../lib/timeline";
import { buildShotPrompt } from "../lib/providers";

export function ShotDirectionPanel({ project, shot, disabled, onUpdate, onSave }: { project: MovieProject; shot: Shot; disabled: boolean; onUpdate: (project: MovieProject) => void; onSave: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(project);
  latest.current = project;
  const locked = busy || disabled;
  function updateShot(patch: Partial<Shot>, id = shot.id) {
    const current = latest.current;
    const next = { ...current, updatedAt: new Date().toISOString(), scenes: current.scenes.map((scene) => ({ ...scene, shots: scene.shots.map((item) => item.id === id ? { ...archiveShot(item), ...patch, continuityStale: !!(item.localAssetPath || item.videoUrl), taskId: undefined } : item) })) };
    onUpdate(invalidateDownstreamContinuity(next, id));
  }
  function updateCharacters(characters: CharacterAsset[]) {
    onUpdate({ ...invalidateAllContinuity(latest.current), characters, updatedAt: new Date().toISOString() });
  }
  async function importImage(characterId?: string) {
    if (!project.localPath) { onSave(); return; }
    const shotId = shot.id;
    setBusy(true); setError("");
    try {
      const image = await invoke<{ path: string; name: string } | null>("import_visual_reference", { projectPath: project.localPath });
      if (!image) return;
      const reference: VisualReference = { name: image.name, localPath: image.path };
      if (characterId) updateCharacters((latest.current.characters ?? []).map((character) => character.id === characterId ? { ...character, images: [...character.images, reference] } : character));
      else updateShot({ firstFrame: reference, firstFrameApproved: false }, shotId);
    } catch (reason) { setError(String(reason)); }
    finally { setBusy(false); }
  }
  return <section className="shot-direction">
    <h3>分镜与角色</h3>
    <label>衔接方式<select disabled={locked} value={transitionMode(shot, project)} onChange={(event) => updateShot({ transitionMode: event.target.value as Shot["transitionMode"] })}><option value="continue">动作延续</option><option value="cut">切换机位</option><option value="scene">转场</option></select></label>
    <p>动作延续默认接上一镜头出点；切换机位或转场使用本镜头确认后的首帧。</p>
    {framingWarning(shot, project) && <p role="status">{framingWarning(shot, project)}</p>}
    <ActionEditor key={`${shot.id}-${JSON.stringify(shot.actionPlan)}`} shot={shot} project={project} disabled={locked} onSave={(actionPlan) => updateShot({ actionPlan })} />
    <button disabled={locked} onClick={() => void importImage()}>{shot.firstFrame ? "替换镜头首帧" : "导入镜头首帧"}</button>
    {shot.firstFrame && <><img className="direction-preview" src={convertFileSrc(shot.firstFrame.localPath)} alt={`分镜首帧：${shot.firstFrame.name}`} /><label><input type="checkbox" checked={!!shot.firstFrameApproved} disabled={locked} onChange={(event) => updateShot({ firstFrameApproved: event.target.checked })} />已核对角色、站位和构图</label><button disabled={locked} onClick={() => updateShot({ firstFrame: undefined, firstFrameApproved: false })}>移除首帧引用</button></>}
    <p>当前已接入的视频适配器只传一张首帧。角色图片用于预审，选中角色的文字设定会加入提示词。</p>
    <ShotPromptEditor key={`${shot.id}-${shot.generationPromptOverride ?? "auto"}`} shot={shot} project={project} disabled={locked} onSave={(generationPromptOverride) => updateShot({ generationPromptOverride })} />
    <button disabled={locked} onClick={() => updateCharacters([...(project.characters ?? []), { id: crypto.randomUUID(), name: "新角色", description: "", images: [] }])}>添加角色</button>
    {(project.characters ?? []).map((character) => <details key={character.id}><summary>{character.name || "未命名角色"} · {character.images.length} 张图</summary>
      <label><input type="checkbox" disabled={locked} checked={shot.characterIds?.includes(character.id) ?? false} onChange={(event) => updateShot({ characterIds: event.target.checked ? [...(shot.characterIds ?? []), character.id] : shot.characterIds?.filter((id) => id !== character.id) })} />本镜头出场</label>
      <CharacterEditor key={`${character.id}-${character.name}-${character.description}`} character={character} disabled={locked} onSave={(name, description) => updateCharacters((latest.current.characters ?? []).map((item) => item.id === character.id ? { ...item, name, description } : item))} />
      <button disabled={locked} onClick={() => void importImage(character.id)}>添加定妆图</button>
      {character.images.map((image) => <img key={image.localPath} className="direction-preview" src={convertFileSrc(image.localPath)} alt={`${character.name}：${image.name}`} />)}
      <button disabled={locked} onClick={() => updateCharacters((project.characters ?? []).filter((item) => item.id !== character.id))}>移除角色引用</button>
    </details>)}
    {error && <p role="alert">{error}</p>}
  </section>;
}

function ShotPromptEditor({ shot, project, disabled, onSave }: { shot: Shot; project: MovieProject; disabled: boolean; onSave: (value?: string) => void }) {
  const automatic = buildShotPrompt({ ...shot, generationPromptOverride: undefined }, project);
  const [value, setValue] = useState(shot.generationPromptOverride ?? automatic);
  const customized = !!shot.generationPromptOverride;
  return <details className="shot-prompt-editor">
    <summary>最终生成提示词 {customized ? "· 已自定义" : "· 自动合成"}</summary>
    <p>这里的内容会原样发送给视频模型，并记录到生成快照。</p>
    <textarea disabled={disabled} value={value} maxLength={2000} rows={9} onChange={(event) => setValue(event.target.value)} />
    <small>{value.length}/2000 字符</small>
    <button disabled={disabled || !value.trim()} onClick={() => onSave(value.trim())}>锁定此镜头提示词</button>
    {customized && <button disabled={disabled} onClick={() => onSave(undefined)}>恢复自动合成</button>}
  </details>;
}

function CharacterEditor({ character, disabled, onSave }: { character: CharacterAsset; disabled: boolean; onSave: (name: string, description: string) => void }) {
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(character.description);
  return <><label>名称<input value={name} maxLength={50} disabled={disabled} onChange={(event) => setName(event.target.value)} /></label><label>固定外观、服装与道具<textarea value={description} maxLength={300} disabled={disabled} onChange={(event) => setDescription(event.target.value)} /></label><button disabled={disabled || !name.trim()} onClick={() => onSave(name.trim(), description.trim())}>保存角色设定</button></>;
}

function ActionEditor({ shot, project, disabled, onSave }: { shot: Shot; project: MovieProject; disabled: boolean; onSave: (plan: Shot["actionPlan"]) => void }) {
  const [plan, setPlan] = useState(shot.actionPlan ?? { start: "", action: "", end: "", inheritStart: false });
  const continuing = transitionMode(shot, project) === "continue";
  const inherited = actionStart({ ...shot, actionPlan: { ...plan, inheritStart: true } }, project);
  return <details open={!!shot.actionPlan}><summary>动作起止状态</summary>
    <p>每镜头安排一个主要动作。结束状态是拍摄目标，请对照生成画面检查后再续拍。</p>
    {continuing && <label><input type="checkbox" disabled={disabled} checked={plan.inheritStart} onChange={(event) => setPlan({ ...plan, inheritStart: event.target.checked })} />继承上一镜头的结束状态</label>}
    <label>起始状态<textarea disabled={disabled || continuing && plan.inheritStart} maxLength={180} value={continuing && plan.inheritStart ? inherited : plan.start} placeholder="角色站位、朝向、支撑脚、持物手" onChange={(event) => setPlan({ ...plan, start: event.target.value })} /></label>
    {continuing && plan.inheritStart && !inherited && <p>上一镜头还没有结束状态，请先填写或改为手动输入。</p>}
    <label>本镜头动作<textarea disabled={disabled} maxLength={180} value={plan.action} placeholder="例如：右手持剑从右上方向左下方挥落" onChange={(event) => setPlan({ ...plan, action: event.target.value })} /></label>
    <label>结束状态<textarea disabled={disabled} maxLength={180} value={plan.end} placeholder="例如：左脚在前站稳，剑尖朝左下方" onChange={(event) => setPlan({ ...plan, end: event.target.value })} /></label>
    <button disabled={disabled || continuing && plan.inheritStart && !inherited} onClick={() => onSave(plan)}>保存动作设计</button>
    {shot.actionPlan && <button disabled={disabled} onClick={() => onSave(undefined)}>移除动作设计</button>}
  </details>;
}
