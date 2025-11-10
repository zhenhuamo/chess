位置探索（/explore）开发手册（完整版）

概述
- 目的：上线一个独立的学习页（/explore），基于真实对局数据（当前 4k+ PGN），帮助玩家研究任意位置：下一步怎么下、胜率、热门分支、典型陷阱、范例对局，并可一键练习。
- 范围（v1）：纯前端（Next 静态导出 + Cloudflare Pages）。优先命中“预构建索引 JSON（v2）”，失败时在浏览器用 Web Worker 在线聚合降级；无需服务端引擎。
- 非目标（v1）：不做全量检索/重型后端；不做账号/云同步（仅本地）。

最近更新（2025-11-10）
- 已完成
  - 页面与导航：独立页 `/explore`；左侧导航入口；`/analyze` 提供 “Explore this position” 深链。
  - 快路径与缓存：`/api/explore/manifest` → `/api/explore/index?url=…` 命中即“Loaded prebuilt index”，首屏 < 2s；失败降级至 Worker + `/api/explore/stream`；构建结果写入 IndexedDB（key `stream:<file>:algo:v0:max16`）。
  - 顶部落地说明与来源芯片：What/How/Source（prebuilt/stream/cache）、Index 版本/Updated、Nodes、Training 队列数。
  - Top Moves 可交互：行内 Play / Preview / Add to Training；排序 Hot（games）/ Win% 切换；键盘 Enter=Apply、Space=Replay、Esc=Close、Cmd/Ctrl+Enter=Add。
  - 预演体验：独立“预览棋盘”，支持 ⏮/▶/⏭/↻ 与进度条；棋盘上用箭头标出下一手。
  - 无数据回退：fen4→fen2→祖先回退 1–4 plies；采样阈值 MIN_TOTAL=50；UI 显示“已回退至 N plies 前位置”；空态给出 e4/d4/c4/Nf3 示例入口。
  - Mini Book 组件化：去全局变量，按 props 渲染 2 层 Top‑N（默认 Top‑3）。
  - Model Games（基础）：若节点含 `models`，拉取 `/g/<id>` 解析 PGN 头并展示 [ECO] White vs Black · 结果 · 日期；一键 Open in Analyzer。
  - Practice（占位）：`Practice Now (5)` 从当前位置贪心生成 5 题入队；`Start Practice` 跳 /analyze 并自动进入 Retry 流（/analyze 答对自动切下一题，RetryBar 显示 Queue 并可 Next）。
  - 观测：前端 `logEvent()`（缓冲 + keepalive）与占位端点 `/api/telemetry`；事件：play_click、preview_click、add_to_training、model_open、practice_now/practice_start/practice_started/practice_next/practice_finish。
- 待办（下一步）
  1) 顶部来源补全：显示索引覆盖量（总样本、时间窗口），并链接“数据范围说明”。
  2) 事件上报完善：统一 payload（fen4、uci、rank、sortKey、source、fallbackDepth、queueSize、page），Explore/Analyze 首尾 flush；必要时写入 R2 或接第三方。
  3) Practice 页面：独立 `/train`（题目列表、评分与历史/SRS），现阶段继续沿用 /analyze 的 Retry 流作占位。
  4) Model Games 回退来源：当无 `models` 时按启发式挑选 3–10 盘（基于样本/长度/评估方差/转折步）。
  5) 预演细节：目标格高亮/色板统一；Mini Book 顶部提供 depth/topN 快捷切换。
  6) 文案与 SEO：Learn → Explore 导航与可索引策略；可分享深链（含排序/回退信息）。

里程碑（合并版）
- M1（完成）
  - 预构建脚本与 R2 发布；/explore 页面 MVP；快路径 + Worker 降级；IDB 缓存；fen2 回退。
- M2（进行中）
  - 交互完善：Top Moves（Play/Preview/Add + 排序 + 快捷键）、Mini Book 组件化、祖先回退与 UI 提示、Model Games（基础）、Practice Now → /analyze、预演进度条与箭头、来源芯片、基础埋点。
- M3（计划）
  - TrapCards（启发式）、覆盖量与 SEO、更多筛选（段位/时控）、/train 页面、埋点闭环与指标盘。

术语/缩写
- fen4：FEN 的前 4 段（棋子/行棋方/王车易位/吃过路兵），忽略半步/全步计数。
- fen2：FEN 的前 2 段（棋子/行棋方），用于粗粒度聚合回退。
- ply：半步；“回退 N plies” 指向上回撤 N 个半步位置。
- PV：主变化（principal variation）。

数据契约（v2 草案）
- Manifest（/api/explore/manifest 代理到 R2）
  - 字段：`index`（URL）、`version`、`date`、`totalGames`、`coverage`（如 `2025-06~08`）、`checksum`、`etag`、`minAppVersion`。
- Index（/api/explore/index?url=…）
  - 节点：
    - `fen4`：string
    - `totalGames`：number
    - `moves`：`[{ uci, games, wrWhite?, wrBlack?, eco? }]`
    - `traps?`：`[{ lineSAN: string[], reason: string, sampleIds?: string[] }]`
    - `models?`：`string[]`（形如 `/g/<id>`）
  - 示例：
```
{ "fen4": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq",
  "totalGames": 312,
  "moves": [ { "uci": "e7e5", "games": 210, "wrWhite": 0.52, "wrBlack": 0.48, "eco": "C20" } ],
  "traps": [ { "lineSAN": ["...Qh4#"], "reason": "短局高胜率分支", "sampleIds": ["/g/abc123"] } ],
  "models": ["/g/abc123", "/g/xyz789"] }
```

交互契约（MVP）
- 顶部：FEN 输入/应用；文件切换；Rebuild；Practice Now(5)/Start Practice；来源芯片（Source/Index/Updated/Nodes/Training）。
- Top Moves：行显示 `SAN · Games · Win%`；按钮 Play/Preview/Add；排序 Hot/Win%；快捷键 Enter/Space/Esc/Cmd-Enter。
- 预演：右侧面板显示线路；⏮/▶/⏭/↻ 与进度条；棋盘箭头标注下一手；Apply 不改写历史，只把线路走到棋盘。
- 回退：fen4 miss → fen2 聚合；仍 miss → 回退祖先 1–4 plies；每级需样本 ≥50；UI 明示回退层级；完全 miss 显示空态示例。
- Mini Book：Top‑N×2 层；点击可 Play。
- Model Games：展示 3–10 盘（优先 `models`）；一键 Open in Analyzer。
- Practice：`Practice Now (5)` 入队 → `Start Practice` 跳 /analyze 的 Retry 流；/analyze 答对自动下一题，RetryBar 显示 Queue 与 Next。

观测与指标（v1）
- 事件：topmove_click（含 play/preview/add）、preview_click、play_click、add_to_training、model_open、practice_now、practice_start/practice_started、practice_next、practice_finish。
- 载荷建议：`{ page, fen4, uci?, rank?, sortKey?, source, fallbackType?, fallbackDepth?, queueSize?, len? }`。
- KPI：首屏 < 2s 命中率（prebuilt）；回退率；预演→播放转化；Practice 开始/完成率；/analyze 题目平均尝试次数。

验收清单（v1 完成定义）
- /explore 可独立访问，有落地页说明；有 FEN 时展示 TopMoves/书树/范例；空态给出示例起点。
- v2 JSON 可加载并缓存/版本化；失败时优雅降级；fen4/fen2/祖先回退可解释。
- Play/Preview/Practice 与棋盘和 /analyze 集成良好；预演有进度与箭头。
- 移动端可用；键盘可达；报错非阻断；埋点可落本地或上报占位端点。

风险与缓解
- 样本量较小：限制 Top‑N 与深度；阈值与回退；页面标注“数据覆盖范围”。
- 头信息质量不齐：未知值纳入“未知”桶，不阻断流程。
- Trap 误报：策略保守，允许关闭 Trap 提示；后续用轻量引擎校验迭代。

优化路线（v1+ → v2）
- 数据：增量分月/用户；新鲜度权重；更细分段（Elo/时控）。
- Trap：Top 分支 8–12 plies 轻量引擎校验，产出战术主题标签。
- Model：评估方差/长度/转折步加权，挑教学友好局。
- 个性化：Mine% vs Global% 并排；自动学习路径与 SRS。
- 体验：收藏/历史、可分享深链、/explore 开放 SEO（/g 保持 noindex）、骨架屏/动画。

附录
- 深链示例：
  - `/explore?fen=rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1&perf=rapid`
  - `/explore?fen=r1bqkbnr/pppp1ppp/2n5/4p3/1b2P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4&perf=blitz&elo=1800-2200`

R2 对象与代理约定（建议）
- R2 Key 命名：
  - 索引：explore/index/v2/YYYY-MM-DD.json.gz
  - 清单：explore/manifest.json
- 代理响应头：
  - /api/explore/manifest：cache-control: public, max-age=3600；ETag 透传
  - /api/explore/index：cache-control: public, immutable, max-age=31536000；ETag；content-encoding: gzip（如有）
  - /api/explore/stream：cache-control: no-store
