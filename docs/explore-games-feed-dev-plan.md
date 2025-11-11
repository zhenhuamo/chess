Explore · Games Feed 开发计划（v1 → v3）

概述
- 背景：当前 /explore 已提供 Position Explorer（基于真实对局的“位置→Top Moves/Win%/Mini Book/Model Games/Practice”）。为了满足“按整盘对局学习”的需求，新增一个“Games Feed（对局卡片流）”，基于你上传到 R2 的 PGN 数据，让玩家以卡片方式刷对局并一键进入 Analyzer 学习。
- 数据源（R2 已有）：
  - https://cacle.chess-analysis.org/chess-png/lichess-2000.pgn
  - https://cacle.chess-analysis.org/chess-png/lichess-2025-08-2000.pgn
  - https://cacle.chess-analysis.org/chess-png/lichess-4000.pgn
- 目标（v1）：
  - 在 /explore 页面中加入一个新视图/分区“Games Feed”。
  - 客户端流式解析 PGN 头信息，渲染对局卡片（White/Black/Result/Date/ECO/Moves/TimeControl 等）。
  - 操作：Open in Analyzer（/analyze）、Copy PGN、Share（/api/g）。
  - 首屏 2s 内出现首批卡片骨架，10s 内完成 1000 局头信息解析（桌面）。
- 非目标（v1）：
  - 不做全文检索与模糊搜索；不做引擎计算；不做账号系统与服务端分页。

信息架构与路由
- /explore 页面顶部保持“Position Explorer”工具，下面新增“Games Feed”分区；或用内置 Tab：Position | Games。
- SEO：页面整体 Title/Description 仍围绕“chess analysis”。落地区文案解释“数据视角 vs 引擎分析”的互补关系；为卡片流分区添加简短说明与 FAQ。

技术方案（两阶段）
1) v1（MVP，客户端流式）
   - 代理复用：/api/explore/stream?file=… 从 R2 拉取文本。
   - Worker：parse-games.worker.ts
     - 逐行/逐块解析 PGN，以 "[Event " 为开始标志，遇到空行收集头信息；不保留完整走子文本（仅在“Open in Analyzer”时再拉）。
     - 每解析 N 局（50/100）发一次 progress 批次到主线程，主线程追加渲染卡片。
     - 可中断/暂停（大文件滚动加载）。
   - 前端组件：
     - GamesFeed.tsx（容器，文件选择/排序/过滤/滚动加载/进度展示）
     - GameCard.tsx（对局卡片，操作按钮）
     - FeedFilters.tsx（文件切换、结果过滤、ECO/日期/手数范围——v1 先做“结果+文件”）
   - 打开分析器：
     - 点击“Open in Analyzer”→ 通过 /api/g POST { pgn } 获得短 id，并写入 IndexedDB；然后跳转 /analyze?gameId=<idbId> 或 /g/<id> → Open。

2) v2（Manifest 快路径，推荐）
   - Node 脚本：scripts/build-games-manifest.js
     - 输入多个 .pgn，输出 explore/games/YYYY-MM-DD.json.gz（仅头信息摘要 + pgnOffset/length + hash）。
     - 字段示例：{ id/hash, white, black, whiteElo, blackElo, result, date, eco, opening, termination, timeControl, moves, perf?, file, offset?, length? }
   - 前端优先拉 manifest，首屏秒出卡片。点击卡片再按 offset Range 请求原文本（或从 /api/g/raw 代理 R2 Range）。
   - 失败降级：走 v1 Worker 流解析。

数据契约（对局卡片摘要）
- 必填：White, Black, Result, Date, ECO?, Opening?, Moves?, TimeControl?, Site?, Round?, Perf?（自定义）。
- 派生：id（sha-256 of headers+pgn hash，或 manifest 提供）、shareUrl（/g/<id>）、previewSan（前 5–10 步 SAN，v2 可选）。
- 示例（JSON）：
  ```json
  {
    "id": "a1b2c3",
    "white": "Alice (2120)",
    "black": "Bob (2080)",
    "result": "1-0",
    "date": "2025.08.10",
    "eco": "C20",
    "opening": "KP Opening",
    "moves": 56,
    "timeControl": "600+0",
    "file": "lichess-2000.pgn",
    "offset": 123456,
    "length": 2345
  }
  ```

UI/交互规范
- 入口：/explore 工具下方 Tab（Position | Games），默认记忆上次选择。
- 过滤：
  - 文件：4000 / 2000(AUG) / 2000（必有）
  - 结果：White / Draw / Black
  - 搜索（v2）：白/黑名称 contains、ECO、日期区间、手数范围。
- 卡片：
  - 顶部：White vs Black（rating）· Result · Date
  - 次级：ECO/Opening · Moves · TimeControl · Source file
  - 操作：Open in Analyzer / Copy PGN / Share
  - 骨架：4–8 列表 skeleton；滚动到底加载更多
- 性能目标：
  - 首屏 skeleton < 1s；首批 30–60 张卡片 < 2s（v1 取决于解析速率）。
  - 内存占用 < 200MB（大文件解析时分批丢弃已渲染 batch 的原文本，只保留摘要）。

组件与文件清单（v1）
- src/app/explore/components/GamesFeed.tsx（容器，Jotai 管理状态）
- src/app/explore/components/GameCard.tsx（卡片）
- src/app/explore/parse-games.worker.ts（流式解析）
- src/app/explore/api.ts（封装 openInAnalyzer、copyPgn、share）
- src/app/explore/types.ts（摘要类型定义）

服务端与代理
- 复用 /api/explore/stream?file=… 代理 R2（no-store）。
- /api/g：已有，存储 PGN 获取短 id；/api/g/[id]：读取。必要时新增 /api/g/raw 代理 R2 Range（v2）。
- v2 Fast Path：/api/games/manifest 代理 R2 的 JSON.gz；失败则回退 v1 Worker。

埋点与指标
- 事件：feed_open、feed_file_change、feed_filter_change、feed_parse_progress、feed_parse_done、card_open_analyzer、card_copy_pgn、card_share。
- 关键指标：首屏时间、首批卡片可见时间、总对局量、卡片点击率、Analyzer 打开率、分享率。

SEO
- 元信息（已在 explore/layout.tsx 配置）：保留 “chess analysis” 高密度。
- 文案：落地区“Quick Start / How To Read The Stats / From Data To Engine / Practice / Coverage & Limits / FAQ”。
- 结构化数据（可选）：ItemList（列出若干卡片，指向 /g/<id> 或 /analyze 深链）；SoftwareApplication + FAQ JSON-LD。

性能与质量
- 解析策略：行缓冲（1–4KB）、遇到“[”行收集 header；遇空行结束；跨块缓冲边界。
- 退避：解析错误时跳过该局，不阻断；对超长行做截断保护。
- 资源：解析批次使用 setTimeout(0) or requestIdleCallback 让 UI 保持可交互。

安全与合规
- 内容：PGN 头是公开数据，无敏感 PII；保留玩家昵称/匿名。
- CORS：走同域 /api/… 代理，避免跨域问题。
- 速率：长文件下载可展示剩余/暂停/停止，避免移动端过载与流量消耗。

里程碑
- M1（1–2 天）：
  - GamesFeed.tsx + GameCard.tsx + parse-games.worker.ts；
  - 文件切换、结果过滤（基础）；
  - Open in Analyzer / Copy PGN / Share；
  - 骨架/进度条/错误处理；
  - 埋点（基础）。
- M2（1–2 天）：
  - build-games-manifest.js + /api/games/manifest；
  - 前端优先 manifest，失败回退 Worker；
  - 过滤扩展（ECO/日期/手数）、排序（日期新→旧、ELO 高→低）。
- M3（2 天）：
  - 搜索（玩家名、ECO 前缀）；ItemList JSON-LD；
  - 预览 SAN（前 6–10 步）；滚动性能优化；
  - QA 与无障碍（键盘/屏幕阅读器）。

验收标准（v1）
- 能从 3 个 R2 文件解析出对局卡片，支持文件切换/结果过滤；
- 解析过程中 UI 可交互，有清晰进度；
- “Open in Analyzer/Copy/Share” 可用；
- 首屏 skeleton < 1s；首批卡片 < 2s（桌面）；
- 错误不阻断；移动端可用。

风险与缓解
- 大文件解析导致卡顿：使用 Worker + 批次渲染 + 让步（yield）；v2 提前生成 manifest。
- 头信息缺失：字段兜底 Unknown，不阻断。
- R2 网络波动：超时/重试/暂停继续；保留“停止解析”按钮（v1 可选）。

实施任务清单（按优先级）
1) 解析 Worker：parse-games.worker.ts（输入：stream/file；输出：{ type: 'batch', items: GameSummary[] }）
2) GamesFeed.tsx：
   - 文件选择器（4000/2000(AUG)/2000）
   - 结果过滤（W/D/L）
   - 进度与“加载更多/停止解析”
   - 卡片网格（Skeleton）
3) GameCard.tsx：呈现信息与按钮；Open in Analyzer → /api/g；Copy/Share。
4) 埋点：feed_open、feed_parse_progress、card_open_analyzer。
5) 文案与落地说明：简短介绍 + FAQ（已存在的落地区中补一段链接到 Games Feed）。
6) v2（并行或下一迭代）：build-games-manifest.js + /api/games/manifest + 前端优先加载。

代码落点（建议）
- src/app/explore/components/GamesFeed.tsx
- src/app/explore/components/GameCard.tsx
- src/app/explore/parse-games.worker.ts
- src/app/explore/types.ts（export type GameSummary）
- functions/api/games/manifest.ts（可选，代理 R2 的 manifest）
- scripts/build-games-manifest.js（Node 脚本）

备注
- 保持 /explore 目前 Position Explorer 能力不变，用 Tab 或分区让两者并存；
- SEO 仍以“chess analysis”为核心关键词，落地文案强调“数据→引擎→练习”的学习闭环。

