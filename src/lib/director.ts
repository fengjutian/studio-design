import type { MovieProject, Shot } from "../types";

const uid = () => crypto.randomUUID();

const shot = (
  number: number,
  title: string,
  description: string,
  framing: string,
  movement: string,
  duration: number,
): Shot => ({
  id: uid(),
  number,
  title,
  description,
  framing,
  movement,
  duration,
  generationStatus: "idle",
});

export function createDirectorProposal(idea: string): MovieProject {
  const rainy = /雨|上海|便利店|奔跑/.test(idea);
  const title = rainy ? "雨夜" : extractTitle(idea);

  const project: MovieProject = {
    id: uid(),
    title,
    idea,
    synopsis: rainy
      ? "暴雨笼罩着深夜的城市，一个少年穿过空旷街道，直到便利店的暖光成为他短暂的避风港。"
      : `一个围绕“${idea.slice(0, 36)}${idea.length > 36 ? "…" : ""}”展开的短片，用克制的镜头建立情绪，并在结尾留下余韵。`,
    visualStyle: rainy ? "电影写实 · 冷暖对比 · 潮湿霓虹" : "电影写实 · 自然光 · 克制叙事",
    status: "设计中",
    updatedAt: new Date().toISOString(),
    scenes: [
      {
        id: uid(),
        number: 1,
        title: rainy ? "雨夜街头" : "故事发生",
        location: rainy ? "上海 · 深夜" : "未命名地点",
        mood: rainy ? "紧张、孤独" : "沉浸、期待",
        shots: rainy
          ? [
              shot(1, "雨幕中的城市", "高楼和道路消失在暴雨里，霓虹在积水中晃动。", "远景", "缓慢推进", 4),
              shot(2, "少年奔跑", "少年从画面深处跑来，雨水打湿外套。", "中景", "侧向跟拍", 4),
              shot(3, "踏过积水", "鞋底重重落下，水花在霓虹中飞溅。", "特写", "低机位慢动作", 3),
              shot(4, "穿过街角", "镜头贴近少年身后，呼吸与脚步越来越急。", "近景", "手持跟拍", 5),
              shot(5, "暖光停靠", "少年停在便利店门口，隔着玻璃看向温暖的室内。", "中近景", "缓慢推近", 5),
            ]
          : [
              shot(1, "建立世界", "用环境与光线交代故事发生的地点。", "远景", "缓慢推进", 4),
              shot(2, "人物出现", "主角进入画面，动作揭示当下的目标。", "中景", "平稳跟拍", 5),
              shot(3, "关键细节", "一个细节改变人物对眼前处境的理解。", "特写", "静止", 3),
              shot(4, "情绪转折", "人物作出选择，画面节奏随之变化。", "近景", "缓慢推近", 5),
              shot(5, "留下余韵", "动作结束，环境接住人物未说出口的情绪。", "远景", "缓慢拉远", 5),
            ],
      },
    ],
  };
  project.timelineOrder = project.scenes.flatMap((scene) => scene.shots.map((item) => item.id));
  return project;
}

function extractTitle(idea: string) {
  const clean = idea.replace(/[，。！？,.!?\s]/g, "");
  return clean.slice(0, 6) || "未命名电影";
}
