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
- MiniMax Hailuo 真实视频生成（Tauri 桌面端）
- 生成失败提示与镜头重试
- 本地 `.movie` 项目目录创建、打开和自动保存
- 镜头时间线排序、导出前完整性检查
- FFmpeg 1080p H.264 成片导出
- 连续时间线预览与逐镜头入点/出点裁剪
- 配乐导入、音量控制和 AAC 混音
- MiniMax M2.7 大模型导演引擎

MiniMax 已通过独立 Provider 层接入，核心体验为 `Idea → Movie`。在“设置 → 电影生成引擎”中切换至 MiniMax 并输入 API Key；密钥仅保存在当前应用会话内存中。

真实视频生成遵循 MiniMax 的异步流程：创建任务、每 10 秒查询状态、成功后获取视频地址。默认仍使用不产生费用的体验模式。

桌面端可以将电影保存为项目目录：

```text
电影名.movie/
├── project.json
├── assets/
├── generations/
├── thumbnails/
└── exports/
```

当前粗剪导出会按照时间线顺序和裁剪范围合并所有本地镜头，将不同尺寸的视频统一到 `1920×1080 / 30fps`，并混入项目配乐，输出到项目的 `exports/` 目录。开发环境需确保 `ffmpeg` 与 `ffprobe` 已加入 `PATH`；发行版后续将改为随应用提供的 sidecar。

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
