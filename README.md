# 人人都是电影导演

让不会写 Prompt、不会摄影、不会剪辑的人，也能像导演一样完成一部电影。

这是一个基于 Tauri 的桌面端 AI 电影创作工作站。用户负责表达想法，AI 将导演意图转化为故事、场景、镜头与可生成的视频任务，最终组织成一部电影。

## 文档

- [产品定义与 MVP 规格](docs/product-spec.md)

## 当前状态

首个可运行原型已包含：

- 从一句话生成 AI 导演提案
- 故事、场景与五镜头分镜方案
- 电影工作台、镜头导航和基础时间线
- 普通模式与导演模式切换
- 本地项目自动保存
- 无 API Key 时可体验的镜头生成模拟

MiniMax 真实生成接口将在 Provider 层接入，核心体验为 `Idea → Movie`。

## 本地开发

```bash
npm install
npm run dev
```

启动 Tauri 桌面应用：

```bash
npm run tauri dev
```

检查与测试：

```bash
npm run build
npm test
```
