# Lichess 集成路线图

本文档总结了 Chess Analyzer 目前如何使用 Lichess 数据，并结合公开的 Lichess API 提出可落地的增强方案。目标是强化现有 Chess.com 导入流程与 Analyzer 体验，拓展用户能直接感知的价值。

## 1. 现有能力

- **PGN / Chess.com / Lichess 加载器**（`src/app/components/HomeGameLoader.tsx`）
  - 分栏界面支持粘贴 PGN、上传文件，或输入 Chess.com / Lichess 用户名。
  - Lichess 栏位调用 `GET /api/games/user/{username}` 获取最近 50 局，并将 PGN 直接推送到 Analyzer，保留来源元数据。
- **Analyzer 分析页**
  - 本地运行 Stockfish 17，多 PV，无需云端延迟。
  - 接收来自加载器、分享链接或库的 PGN。
- **Games Library**（`/games`）
  - 当前使用挑选的 Lichess 大师库，数据静态、过滤项有限。
- **博客 / 文档** 已针对 Lichess 分析做 SEO 及入门引导。

## 2. 与我们最相关的 Lichess API

| 类别 | 接口 / 功能 | 说明 |
| --- | --- | --- |
| 用户棋局 | `GET https://lichess.org/api/games/user/{username}` (NDJSON) | 支持 `max`、`since`、`until`、`perfType`、`rated`、`moves`、`evals`、`clocks`、`opening` 等参数。
| 棋局导出 | `GET https://lichess.org/game/export/{gameId}` 或 `POST /api/games/export/_ids` | 方便做批量下载或收藏。
| 云评估 | `GET https://lichess.org/api/cloud-eval?fen={fen}&multiPv=3` | 免费缓存热门位置的 Stockfish 14 NNUE 结果。
| 开局探索 | `GET https://explorer.lichess.ovh/lichess?fen={fen}&moves=N&topGames=M` | 返回总样本、胜率、代表棋局。
| 练习题 | `GET https://lichess.org/api/puzzle/{id}`、`/api/puzzle/daily` | 提供 FEN、走法与主题标签。
| TV / 直播 | `GET https://lichess.org/api/tv/channels`、`/api/tv/feed/{channel}` | 获取热门频道及实时 PGN。
| 用户信息 | `GET https://lichess.org/api/user/{username}` | 等级、称号、在线状态等。
| OAuth 事件流（可选） | `GET /api/stream/event`、`/api/board/game/stream/{gameId}` | 需 OAuth，用于实时同步或转播。

## 3. 增强点子

### 3.1 加载器升级

- **筛选与信息标签**
  - 结合 `opening=true`、`rated`、`perfType` 参数展示等级区间、赛制、结果、终局方式、开局名。
  - 提供快捷过滤（闪电、快棋、超快，仅限评级等），每个分页记忆选择。
- **详细说明：加载器筛选 + 信息标签**
  - **功能内容**：在 Lichess/Chess.com 用户名搜索结果上方提供筛选条，可以按赛制（Bullet/Blitz/Rapid/Classical）、对局类型（Rated/Casual）、日期区间以及是否包含云评估筛选列表；同时在每条结果右侧增加信息标签（Chip），展示开局名称、终局方式、平均耗时、是否为锦标/竞技赛等。
  - **用户价值**：用户通常在不同模式有不同训练目标（如快速回顾比赛级别的慢棋或寻找某个开局的近期实战），没有筛选时需要手动滚动查找，效率低。信息标签让用户无需打开对局即可预判是否符合学习目标，如看到“B90 西西里 Najdorf”即可快速定位。对想针对某赛制复盘或只看评级局的玩家尤其有帮助。
  - **解决痛点**：
    1. **定位困难**：当前列表仅按时间排序，用户难以在大量 Blitz 中找到需要的 Rapid/Classical，筛选可以立即缩小范围。
    2. **信息不透明**：没有开局/终局信息，用户只能逐个进入 Analyzer 才知道内容；信息标签直接展示关键元数据，减少无效点击。
    3. **跨端补齐**：Chess.com 有内建过滤，而我们统一 Loader 上补齐能力，让用户体验一致，不再因为站点差异重复操作。

### 3.1.1 待实现清单与API选择（补充）

- **Lichess**（有免费公开 API）
  - 筛选参数：`perfType`（赛制）、`rated`（仅评级）、`since`/`until`（时间范围）、`max`、`opening=true`。
  - 端点：`GET https://lichess.org/api/games/user/{username}`（NDJSON），支持上述参数。
  - 元数据：`opening.name`、`perf`、`rated`、`status` 可用于信息标签；`timeControl` 需从 clock 计算。
  - TODO：
    1) 在 `/import` 页加日期区间筛选（填充 `since`/`until`）。  
    2) 展示终局方式（status）、开局名、赛制、Rated 标签（已部分完成）。  
    3) 选项记忆与刷新按钮（已有）。  
    4) 如果需要云评估筛选，可先忽略，因 API 不直接提供，改为“云评估可用”标记需额外调用 cloud-eval，这里不推荐强制。

- **Chess.com**（免费公开 API，参数较少）
  - 端点：`GET https://api.chess.com/pub/player/{username}/games/{year}/{month}`（月度归档）。
  - 无官方赛制/日期筛选，只能前端过滤：从 `time_control` 推导 Bullet/Blitz/Rapid/Classical，`rules`/`rated` 判断赛制和评级。
  - TODO：
    1) 在 `/import` 页添加本地筛选（赛制、只看 Rated、日期范围）——在取回最近 1–2 月数据后前端过滤。  
    2) 信息标签：时控、Rated/Casual、终局（termination）、开局名（需解析 PGN ECO/Opening 自己实现）。
    3) 提示数据覆盖范围：当前只抓最近 1–2 个月，超出需二次抓取更多月份或分页。

- **分页/结果展示**
  - `/import` 页已支持分页，可继续：默认 25/页，允许 10/25/50，支持“刷新”与“返回首页”。
  - TODO：在列表上方显示当前过滤条件摘要（用户名、赛制、Rated、日期范围），方便用户确认。

### 3.1.2 实施难度简述

- Lichess 筛选：API 直接支持，改 URL 参数和 UI 控件即可，属于低/中等难度。日期区间需要将日期转换成毫秒级 `since`/`until`。
- Lichess 信息标签：已有字段，前端展示为 Chip，低难度。
- Chess.com 筛选：API 不支持，只能前端过滤；需明确“仅近月数据”限制。中等难度（解析 `time_control`、PGN ECO）。
- 路由跳转与列表页面：已完成 `/import` 基础框架；补充过滤和标签是低/中等难度的增量。
- **批量导入 / 收藏**
- **批量导入 / 收藏**
  - 支持一次挑选多局，按队列依次进入 Analyzer。
  - 新增“收藏”列表，利用 IndexedDB 缓存，方便离线复盘。

### 3.2 Analyzer 强化

- **云评估预热**
  - 进入 Analyzer 时先请求 cloud-eval，如果命中则在本地 Stockfish 启动前显示已有评价，并按 FEN 缓存避免重复请求。
- **开局上下文面板**
  - 对当前 FEN 调用 Explorer API，显示主流招法、胜率、示例大师局（跳转 Lichess）。与本地 Position Explorer 数据互补。
- **战术提示**
  - 当局面匹配 Lichess puzzle（通过 puzzle API 或每日题）时，提供“训练此题”按钮。

### 3.3 Games Library 进化

- **动态刷新**
  - 定期作业使用 `api/games/user`、`api/games/export/_ids` 或官方月度 Master 数据，持久化等级、ECO、perf type 等字段以支持高级过滤。
- **用户定制集合**
  - 允许输入 Lichess Study 或玩家 ID，生成临时集合，直接由 API 驱动，而非固定 PGN 包。

### 3.4 训练与互动

- **每日题卡片**
  - 首页调用 `api/puzzle/daily`，将题面一键加载到“对引擎”模式，增加日活触点。
- **战术历史与推荐**
  - 记录已完成题目 ID，允许回顾；使用 `theme` 标签词推荐相似题。
- **直播小挂件**
  - 展示当前热门频道与观众数，点击打开 Lichess 或直接用 `/api/tv/feed/{channel}` 在站内同步棋盘。

### 3.5 账号关联（需 OAuth）

- **对局自动同步**
  - 用户授权后监听 `/api/stream/event`，检测到对局结束即自动导入 Analyzer，真正“零手动”。
- **实时讲解模式**
  - 利用 `/api/board/game/stream/{gameId}` 获取实时走法，结合本站 UI 做聊天室/解说视图。

## 4. 实施要点

- **速率限制**：匿名请求额度充足但不是无限（约 15 req/s），继续使用 `AbortController` 和缓存控节奏。
- **NDJSON 解析**：沿用 `getLichessUserRecentGames` 中的按行解析方式；对 TV/feed 这类流式接口同样适用。
- **环境隔离**：站点静态部署，所有 API 调用都在浏览器执行，不要暴露私钥。OAuth 功能需独立 worker 或 serverless 代理。
- **类型安全**：为新字段扩充 `src/types/lichess.ts`，例如 perf type 枚举、puzzle payload，保证 TS 断言一致。
- **UI 文案**：添加新 Lichess 功能时同步更新商标声明，保持合规。

## 5. 推荐迭代顺序

1. **加载器筛选 + 信息标签**：工程量小，立即改善体验。
2. **Analyzer 云评估预热 + Explorer 兜底**：提升“进入即有结论”的速度感。
3. **每日题 + TV 挂件**：增加首页互动。
4. **批量导出 / 收藏**：照顾重度用户。
5. **OAuth 自动同步**：需要新基础设施，可作为高阶里程碑。

## 6. 监测指标

- 记录 Loader 各 tab 的使用占比，为后续优化提供依据。
- 比较启用云评估前后的首帧评估耗时，验证体验提升。
- 跟踪每日题完成量、TV 点击率、Explorer 面板互动次数，评估参与度。

---

每次版本发布后都应回顾此路线图，根据遥测、用户反馈以及 Lichess 新增 API 及时更新计划。
