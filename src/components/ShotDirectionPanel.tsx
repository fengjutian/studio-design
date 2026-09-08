import { useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { CharacterAsset, MovieProject, Shot, VisualReference } from "../types";
import { transitionMode } from "../lib/shotDirection";
import { archiveShot } from "../lib/continuityFrames";
import { invalidateAllContinuity, invalidateDownstreamContinuity } from "../lib/timeline";

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
    <button disabled={locked} onClick={() => void importImage()}>{shot.firstFrame ? "替换镜头首帧" : "导入镜头首帧"}</button>
    {shot.firstFrame && <><img className="direction-preview" src={convertFileSrc(shot.firstFrame.localPath)} alt={`分镜首帧：${shot.firstFrame.name}`} /><label><input type="checkbox" checked={!!shot.firstFrameApproved} disabled={locked} onChange={(event) => updateShot({ firstFrameApproved: event.target.checked })} />已核对角色、站位和构图</label><button disabled={locked} onClick={() => updateShot({ firstFrame: undefined, firstFrameApproved: false })}>移除首帧引用</button></>}
    <p>当前已接入的视频适配器只传一张首帧。角色图片用于预审，选中角色的文字设定会加入提示词。</p>
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

function CharacterEditor({ character, disabled, onSave }: { character: CharacterAsset; disabled: boolean; onSave: (name: string, description: string) => void }) {
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(character.description);
  return <><label>名称<input value={name} maxLength={50} disabled={disabled} onChange={(event) => setName(event.target.value)} /></label><label>固定外观、服装与道具<textarea value={description} maxLength={300} disabled={disabled} onChange={(event) => setDescription(event.target.value)} /></label><button disabled={disabled || !name.trim()} onClick={() => onSave(name.trim(), description.trim())}>保存角色设定</button></>;
}
