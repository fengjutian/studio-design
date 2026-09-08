import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Shot } from "../types";
import { continuityCandidates } from "../lib/continuityFrames";

export function ContinuityTools({ shot, disabled, onCut, onRestore }: { shot: Shot; disabled: boolean; onCut: (seconds: number) => void; onRestore: (index: number) => void }) {
  const [frames, setFrames] = useState<{ seconds: number; image: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setFrames([]); setError(""); }, [shot]);
  useEffect(() => { let cancelled = false;
    if (!busy) return;
    const source = shot.localAssetPath ?? shot.videoUrl;
    if (!source) { setBusy(false); return; }
    void Promise.all(continuityCandidates(shot).map(async (seconds) => ({ seconds, image: await invoke<string>("extract_video_last_frame", { source, seconds }) })))
      .then((items) => { if (!cancelled) setFrames(items); })
      .catch((reason) => { if (!cancelled) setError(String(reason)); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [busy, shot]);
  return <div className="continuity-tools">
    <button disabled={disabled || busy || !shot.localAssetPath && !shot.videoUrl} onClick={() => setBusy(true)}>{busy ? "读取候选帧…" : "选择衔接帧"}</button>
    <span>选择画面会同步调整本镜头出点，后续镜头需重生成。</span>
    {!!shot.versions?.length && <select aria-label="恢复视频版本" disabled={disabled} value="" onChange={(event) => onRestore(Number(event.target.value))}><option value="">历史版本（{shot.versions.length}）</option>{shot.versions.map((version, index) => <option key={index} value={index}>恢复版本 {index + 1} · {version.generationModelId ?? "旧素材"} · {new Date(version.savedAt).toLocaleString()}</option>)}</select>}
    {error && <p role="alert">{error}</p>}
    <div className="candidate-frames">{frames.map((frame) => <button disabled={disabled} key={frame.seconds} onClick={() => { onCut(Math.min(shot.duration, frame.seconds + 0.04)); setFrames([]); }}><img src={frame.image} alt={`${frame.seconds.toFixed(2)} 秒衔接画面`} /><span>{frame.seconds.toFixed(2)} 秒</span></button>)}</div>
    {shot.sourceFrame && <span>生成参考：{shot.sourceFrame.seconds.toFixed(2)} 秒 · 来源任务 {shot.sourceFrame.taskId ?? "旧素材"}</span>}
  </div>;
}
