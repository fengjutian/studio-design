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
  generationProviderId?: string;
  generationModelId?: string;
  generationStartedAt?: string;
  generationError?: string;
  continuitySourceShotId?: string;
  visualReferenceName?: string;
  continuityStale?: boolean;
  trimStart?: number;
  trimEnd?: number;
  versions?: ShotVersion[];
  transitionMode?: "continue" | "cut" | "scene";
  actionPlan?: { start: string; action: string; end: string; inheritStart: boolean };
  firstFrame?: VisualReference;
  firstFrameApproved?: boolean;
  characterIds?: string[];
  generatedFirstFramePath?: string;
  sourceFrame?: { shotId: string; taskId?: string; path?: string; seconds: number };
}

export type ShotVersion = Omit<Shot, "versions"> & { savedAt: string };

export interface AudioTrack {
  id: string;
  name: string;
  localPath: string;
  duration: number;
  trimStart: number;
  volume: number;
}

export interface VisualReference {
  name: string;
  localPath: string;
}

export interface CharacterAsset {
  id: string;
  name: string;
  description: string;
  images: VisualReference[];
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
  directorStyle?: DirectorStyle;
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
  visualReference?: VisualReference;
  characters?: CharacterAsset[];
}

export interface DirectorStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export interface PromptVersion {
  id: string;
  content: string;
  createdAt: string;
  source: "manual" | "before-expand" | "expanded";
}

export interface PromptAnalysis {
  score: number;
  verdict: "适合" | "需要优化" | "不适合";
  summary: string;
  strengths: string[];
  risks: string[];
  suggestions: string[];
}

export type ProviderKind = string;
export type MiniMaxModel = string;

export interface GenerationSettings {
  provider: ProviderKind;
  directorProvider: "local" | "minimax";
  directorModel: "MiniMax-M3" | "MiniMax-M2.7" | "MiniMax-M2.7-highspeed";
  model: MiniMaxModel;
  resolution: string;
  duration: number;
}
