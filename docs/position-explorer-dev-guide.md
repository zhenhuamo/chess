位置探索（/explore）开发手册（完整版）

概述
- 目的：上线一个独立的学习页（/explore），基于你已收集的真实对局数据（当前 4k+ PGN），帮助玩家研究任意位置/分支：下一步怎么下、胜率如何、热门分支、典型陷阱、范例对局，并可一键练习。
- 范围（v1）：纯前端（Next 静态导出 + Cloudflare Pages）。数据来自“预构建索引 JSON（v2）”，或在浏览器用 Web Worker 在线聚合作为降级。无需服务端引擎。
- 非目标（v1）：不做全量全文检索；不做重型服务端引擎；不做账号/云同步（仅本地）。

当前进度（2025-11-10）
- 已完成
  - 页面与导航：新增独立页 `/explore`，左侧导航加入 Explore；在 `/analyze` 右下角提供 “Explore this position” 深链。
  - R2 流代理：实现 `/api/explore/stream?file=…`（仅白名单三份 PGN），同域拉取 R2 数据（no-store）。
  - 快路径（prebuilt index）接通：客户端优先 `/api/explore/manifest` → `/api/explore/index?url=…`，命中即“Loaded prebuilt index”，首屏 < 2s；失败自动回退到 Worker + stream；服务端代理透传 gzip/ETag/缓存。
  - Worker + IndexedDB 缓存：首次构建后写入 IDB（版本号 `stream:<file>:algo:v0:max16`），下次“Loaded from cache”。
  - 无数据回退（第一步）：fen4 无数据时做 fen2 聚合回退，尽量给出 Top Moves。
  - Mini Book（MVP）：在 Top Moves 下展示 2 层小书树（Top‑3 → 下一层），用于快速感知分支走向。
- 待办（下一步优先）
  1) 交互与文案（立即）：
     - 顶部说明区（What/How/Source）：一句话解释本页用途；显示“数据来源（R2 prebuilt/stream/cache）”“索引版本/覆盖量”。
     - Top Moves 行为：行点击 = 预演 10 步（Preview）；右侧加入 Play/Preview/Add to Training 按钮；排序开关 Hot/Win%。
     - 空态提示：当 fen4 与 fen2 都无数据时，建议“回退 N plies 或从示例 e4/d4/c4/Nf3 开始”。
  2) 无数据回退（完善）：fen4→fen2→祖先回退 1–4 plies，并在 UI 明示“已回退至 N plies 之前的最近有数据位置”。
  3) Mini Book 组件化：去除临时全局 Map，改为页面状态/上下文；每层限制 Top‑N，展示 Games · Win%。
  4) Model Games（基础）：展示 3–10 盘，一键 Open in Analyzer。
  5) Practice Now（占位到 /train）：从当前位置生成 5 题（Top‑PV 做可接受答案集合）。
  6) 观测/开关：埋点 topmove_click/preview_click；开关控制 Mini Book/Model 区块。

用户目标与场景里程碑与任务（状态）
- M1（2–3 天）
  - [已完成] 预构建脚本：scripts/build-explore-index.js（已产出 explore-index-v2.json(.gz) 与 explore-manifest.json 并上传 R2）。
  - [已部分完成] /explore：Filters（FEN 输入/应用✓，其余筛选待做）、TopMoves（✓）、MiniBook（MVP✓）、ModelGames（未做）、Play/Preview（未接动作）。
  - [已完成] 导航与深链；快路径代理；Worker + IDB 缓存；fen2 回退。
  - 目标：首屏 < 2s（快路径达成）；stream 模式自动降级可用。
- M2（2 天）
  - [进行中] MiniBook 组件化与交互完善；祖先回退与提示；Model Games（基础）；Practice Now（占位到 /train）。
  - 目标：生成练习 ≤ 1s；交互流畅；用户理解“页面是干什么的”。
- M3（2 天）
  - [未完成] TrapCards（启发式）、Learn → Explore 文案与 SEO、更多筛选（段位/时控）。
  - 目标：常见开局能出现 1–3 个陷阱卡片；回退逻辑稳定。
- M1（2–3 天）
  - [未完成] scripts/build-explore-index.ts（Node）与 R2 发布（manifest/index）。
  - [已部分完成] /explore 基础：Filters（FEN 输入/应用✓，其余筛选待做）、TopMoves（✓）、ModelGames（未做）、Play/Preview（未接动作）。
  - [已完成] 导航与深链：左侧 Explore 入口、/analyze → /explore 深链。
  - 目标：首屏 < 2s（依赖索引 JSON 快路径），当前 stream 模式已可用（首次需等待构建）。
- M2（2 天）
  - [未完成] MiniBook（8–12 plies）、Add to Training、Practice Now（5 题）→ /train。
  - 目标：生成练习 ≤ 1s；交互流畅。
- M3（2 天）
  - [未完成] TrapCards（启发式）、无数据回退与提示（部分在待办 2）、Learn → Explore 导航文案优化。
  - 目标：常见开局能出现 1–3 个陷阱卡片；回退逻辑稳定。
- M1（2–3 天）
  - [已完成] 预构建脚本：scripts/build-explore-index.js（已产出 explore-index-v2.json(.gz) 与 explore-manifest.json 并上传 R2）。
  - [已部分完成] /explore：Filters（FEN 输入/应用✓，其余筛选待做）、TopMoves（✓）、MiniBook（MVP✓）、ModelGames（未做）、Play/Preview（未接动作）。
  - [已完成] 导航与深链；快路径代理；Worker + IDB 缓存；fen2 回退。
  - 目标：首屏 < 2s（快路径达成）；stream 模式自动降级可用。
- M2（2 天）
  - [进行中] MiniBook 组件化与交互完善；祖先回退与提示；Model Games（基础）；Practice Now（占位到 /train）。
  - 目标：生成练习 ≤ 1s；交互流畅；用户理解“页面是干什么的”。
- M3（2 天）
  - [未完成] TrapCards（启发式）、Learn → Explore 文案与 SEO、更多筛选（段位/时控）。
  - 目标：常见开局能出现 1–3 个陷阱卡片；回退逻辑稳定。

验收清单（v1 完成定义）
- /explore 可独立访问；空态有推荐；有 FEN 时展示 TopMoves/书树/范例。
- v2 JSON 可加载并缓存/版本化；失败时优雅降级。
- Play/Preview/Practice 与现有棋盘和 /train 集成良好。
- 移动端可用；键盘可达；错误非阻断。

风险与缓解
- 样本量较小（4k）：限制深度与 Top‑N，自动回退，页面标注“数据覆盖范围”。
- 头信息质量不齐：未知值纳入“未知”桶，不阻断流程。
- Trap 误报：策略保守，允许用户关闭 Trap 提示；后续用更可靠检测迭代。

优化路线（v1+ → v2）
- 数据：再加月份/用户数据；引入“新鲜度权重”（近期对局权重略高）。
- 分段：按 Elo/时控细分；对比“当前段位 vs 目标段位”的选择差异。
- Trap：对 Top 分支做 8–12 plies 轻量引擎校验，提炼战术主题标签。
- Model：用评估方差/长度/转折步打分，自动挑选教学友好局。
- 个性化：Mine% vs Global% 并排；自动学习路径与间隔重复（SRS）。
- 体验：收藏/历史、可分享深链、/explore 开放 SEO（/g 仍 noindex）、骨架屏/动画。

- 附录
- 深链示例：
  - /explore?fen=rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1&perf=rapid
  - /explore?fen=r1bqkbnr/pppp1ppp/2n5/4p3/1b2P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4&perf=blitz&elo=1800-2200
- JSON 节点示例（节选）：
  { "fen4": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq",
    "totalGames": 312,
    "moves": [ { "uci": "e7e5", "games": 210, "wrWhite": 0.52, "wrBlack": 0.48, "eco": "C20" } ],
    "traps": [ { "lineSAN": ["...Qh4#"], "reason": "短局高胜率分支", "sampleIds": ["/g/abc123"] } ],
    "models": ["/g/abc123","/g/xyz789"] }

R2 对象与代理约定（建议）
- R2 Key 命名：
  - 索引：explore/index/v2/YYYY-MM-DD.json.gz
  - 清单：explore/manifest.json
- 代理响应头：
  - /api/explore/manifest：cache-control: public, max-age=3600；ETag 透传
  - /api/explore/index：cache-control: public, immutable, max-age=31536000；ETag；content-encoding: gzip（如有）
  - /api/explore/stream：cache-control: no-store
