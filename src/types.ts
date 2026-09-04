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
}
