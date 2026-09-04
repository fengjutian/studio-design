# MiniMax 视频生成集成

## 架构边界

```text
Shot Specification
        ↓
TypeScript Provider Adapter
        ↓ Tauri IPC
Rust Commands
        ↓ HTTPS
MiniMax Video API
```

React 层负责把导演语言转换为供应商可用的 Prompt，并维护界面状态。Rust 层负责携带 API Key 发起网络请求，避免浏览器跨域问题，也避免将密钥编译进前端资源。

## 当前流程

1. `POST /v1/video_generation` 创建视频任务。
2. 每 10 秒调用 `GET /v1/query/video_generation` 查询任务。
3. 状态为 `Success` 时取得 `file_id`。
4. 调用 `GET /v1/files/retrieve` 获取 `download_url`。
5. 工作台直接预览返回的视频。

等待上限为 180 次查询，约 30 分钟。失败和超时会写入镜头的 `generationError`，用户可以从画布重新生成。

## 安全策略

- API Key 只保存在 React 运行时状态中。
- API Key 不写入 `localStorage`、项目文件或日志。
- 应用关闭后密钥自动清除。
- 普通设置（模型、分辨率、时长）可以持久化。

后续应接入操作系统安全凭据库，在用户明确选择“记住密钥”时进行加密存储。

## 支持配置

- 模型：`MiniMax-Hailuo-2.3`、`MiniMax-Hailuo-02`、`T2V-01-Director`
- 分辨率：`768P`、`1080P`
- 时长：6 秒、10 秒
- 当前输入模式：Text-to-Video

真实可用的模型、分辨率和时长组合由 MiniMax 账户与实时 API 规则决定。Provider 会将服务端错误转化为工作台中的可重试提示。
