# AI Director Engine

## 两种模式

- 本地导演：通过确定性模板即时产生五镜头方案，适合无密钥体验与离线演示。
- MiniMax AI 导演：调用 `MiniMax-M2.7` 或 `MiniMax-M2.7-highspeed`，把任意创意发展为多场景结构化分镜。

## 输出协议

AI Director 返回供应商无关的电影结构：

```text
Movie
└── Scenes[]
    └── Shots[]
        ├── title
        ├── description
        ├── framing
        ├── movement
        └── duration
```

客户端会移除模型思考标签和 Markdown JSON 围栏，验证必要字段，限制为最多 8 个场景、每场最多 20 个镜头，并为所有对象生成本地稳定 ID。不合法结果不会直接进入项目。

## 安全与降级

- API Key 与视频生成共用，仅保存在当前应用会话内存。
- 本地导演始终可用，不依赖网络。
- 真实导演失败时保留用户原始想法，并给出可重试提示。
- Provider 输出先转换为内部 Movie / Scene / Shot，项目格式不依赖 MiniMax。
