export type ProjectStatus = "构思中" | "设计中" | "生成中" | "剪辑中" | "已完成";
export type GenerationStatus = "idle" | "queued" | "generating" | "completed" | "failed";

export interface Shot {
  id: string;
  number: number;
  title: string;
  description: string;
  framing: string;
  movement: string;
  duration: number;
  generationStatus: GenerationStatus;
  thumbnail?: string;
  videoUrl?: string;
  localAssetPath?: string;
  taskId?: string;
  generationStartedAt?: string;
  generationError?: string;
  trimStart?: number;
  trimEnd?: number;
}

export interface AudioTrack {
  id: string;
  name: string;
  localPath: string;
  duration: number;
  trimStart: number;
  volume: number;
}

export interface Scene {
  id: string;
  number: number;
  title: string;
  location: string;
  mood: string;
  shots: Shot[];
}

export interface MovieProject {
  id: string;
  title: string;
  idea: string;
  synopsis: string;
  visualStyle: string;
  status: ProjectStatus;
  updatedAt: string;
  scenes: Scene[];
  localPath?: string;
  timelineOrder?: string[];
  lastExportPath?: string;
  soundtrack?: AudioTrack;
}

export type ProviderKind = "mock" | "minimax";
export type MiniMaxModel = "MiniMax-Hailuo-2.3" | "MiniMax-Hailuo-02" | "T2V-01-Director";

export interface GenerationSettings {
  provider: ProviderKind;
  directorProvider: "local" | "minimax";
  directorModel: "MiniMax-M3" | "MiniMax-M2.7" | "MiniMax-M2.7-highspeed";
  model: MiniMaxModel;
  resolution: "768P" | "1080P";
  duration: 6 | 10;
}
