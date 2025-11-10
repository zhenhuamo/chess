位置探索（/explore）开发手册（完整版）

概述
- 目的：上线一个独立的学习页（/explore），基于你已收集的真实对局数据（当前 4k+ PGN），帮助玩家研究任意位置/分支：下一步怎么下、胜率如何、热门分支、典型陷阱、范例对局，并可一键练习。
- 范围（v1）：纯前端（Next 静态导出 + Cloudflare Pages）。数据来自“预构建索引 JSON（v2）”，或在浏览器用 Web Worker 在线聚合作为降级。无需服务端引擎。
- 非目标（v1）：不做全量全文检索；不做重型服务端引擎；不做账号/云同步（仅本地）。

当前进度（2025-11-10）
- 已完成
  - 页面与导航：新增独立页 `/explore`，左侧导航加入 Explore；在 `/analyze` 右下角提供 “Explore this position” 深链。
  - R2 流代理：实现 `/api/explore/stream?file=…`（仅白名单三份 PGN），同域拉取 R2 数据（no-store）。
  - MVP 功能：FEN 输入与应用、基于 R2 流的在线聚合（限深 ~16 plies，Top‑N 前端裁剪）、进度提示、Top Moves 基础渲染、棋盘稳定渲染（修复 Board 默认 atom 的 update depth 问题、稳定化玩家对象）。
- 已就绪（占位/待接通）
  - `/api/explore/manifest` 与 `/api/explore/index` 代理端点占位（当前返回 404，前端会回退到 stream 模式）。待在 R2 投放 `explore/manifest.json` 与 `explore/index/v2/*.json.gz` 即可接通。
- 待办（下一步优先）
  1) Worker + IndexedDB 缓存（首次构建后下次秒开）
  2) 无数据回退（fen4→fen2→回退 1–4 plies，UI 标注）
  3) 预构建索引脚本（Node）与 R2 发布流程（manifest/index）
  4) MiniBook、Model Games、TrapCards、Practice Now、Add to Training
  5) 观测/开关与小型 A/B（低优先）


用户目标与场景
- 即使没有自己的对局，也能学习一个位置：“大家在这里都走什么？哪步更好？有没有套路/陷阱？”
- 用数据做选择：“把下一步按胜率/热度排序，并能在棋盘上立即演练/预览。”
- 高效学习：“给典型陷阱和范例对局；从这个位置立即出 5 题练习。”
- 对比自我（v1+）：我的选择与群体的差异（Mine% vs Global%）。

导航与入口
- 主入口：/explore（导航栏 Learn/Study）。与 /analyze 解耦、独立访问。
- 便捷入口：/analyze 的“Explore this position”深链，携带 FEN 与筛选参数。
- 深链格式：/explore?fen=FEN&perf=rapid&elo=1400-1800&depth=10
- 空态（无 FEN）：展示热门开局快捷入口（e4/d4/c4/Nf3）、本月趋势、Traps 精选、最近浏览与收藏。

数据来源（仅 R2 路径）
- 原始 PGN（R2，已就绪）：
  - https://cacle.chess-analysis.org/chess-png/lichess-4000.pgn
  - https://cacle.chess-analysis.org/chess-png/lichess-2025-08-2000.pgn
  - https://cacle.chess-analysis.org/chess-png/lichess-2000.pgn
- 许可：Lichess 公共数据 CC0，可用于本地/学习。
- 两种供给方式（统一从 R2 读取）：
  A) 预构建索引 JSON（推荐）：离线脚本解析上述 PGN → 构建 FEN 索引 → 将产物上传到 R2（建议 key：explore/index/v2/YYYY-MM-DD.json.gz），并在 R2 写入/更新清单 explore/manifest.json。
  B) 在线聚合（降级）：Web Worker 通过同域代理拉取 R2 的 .pgn 流（/api/explore/stream?file=…），增量构建索引到 IndexedDB，显示进度后渲染。

索引设计（v2 JSON）
- 粒度：fen4（棋子/行棋方/王车易位/吃过路兵），缺失时按 fen2（棋子+行棋方）聚合回退。
- 深度：16–20 plies（8–10 步）。每节点保留 Top‑5 子节点，控制体积。
- 节点结构：
  node: {
    fen4: string,
    totalGames: number,
    moves: [ { uci: string, name?: string, eco?: string, games: number, wrWhite?: number, wrBlack?: number, weight?: number } ],
    traps?: [ { lineSAN: string[], reason: string, sampleIds: string[] } ],
    models?: string[]
  }
- 计算要点：
  - 规范化 PGN（换行/NUL/尾部空行），哈希去重。
  - 结果抽取：1-0 / 0-1 / 1/2-1/2。wrWhite/wrBlack 仅统计该节点“轮到该方走”的样本。
  - ECO/名称：用本地开局表补全（没有则留空）。
  - Traps 启发（v1）：短局（≤25–30 手）且相对同层均值胜率偏离 ≥15–20%；可选再用轻量引擎校验单步大跳变（≥300cp）（v1+）。
  - Models 选择：长度适中、评估平稳或转折清晰、头信息完整；保留 3–10 盘。
- 体积目标：4k 输入 ≈ 1–5 MB JSON（gzip < 1.5 MB）。

算法
- 从 PGN 构建索引：
  1) 每盘重放至深度上限，记录 (fen4, nextUci, result, headers)。
  2) 按 fen4 聚合：累计总局数、各下一步出现次数与分侧胜率、补 ECO/名称。
  3) 依据启发式生成 traps/models；每层裁剪至 Top‑5 子节点。
- 下一步排序：
  - Hot：按 Games 降序，次序按 Win% 降序。
  - Win%：按当前行棋方的胜率降序，次序按 Games。
  - Mine%（v1+）：个人库胜率与全局融合排序。
- 无数据回退：
  - 先查 fen4；无则按 fen2 聚合；再回退 1–4 plies 直到命中。UI 标注“已从 N plies 之前回退”。

- 架构
- 纯前端（Next 15 静态导出）；Cloudflare Pages 托管；已有 Pages Functions（分享 API）。
  - 新增同域代理（统一从 R2 读）：
    - GET /api/explore/manifest → 代理 R2 的 explore/manifest.json（返回当前索引版本与路径）。
    - GET /api/explore/index?version=… → 代理 R2 的索引 JSON（如 explore/index/v2/YYYY-MM-DD.json.gz）。
    - GET /api/explore/stream?file=… → 代理 R2 的原始 .pgn 流（仅在线聚合降级使用）。
  - 建议前端环境变量：
    - NEXT_PUBLIC_EXPLORE_MANIFEST_ENDPOINT=/api/explore/manifest
    - NEXT_PUBLIC_EXPLORE_INDEX_ENDPOINT=/api/explore/index
    - NEXT_PUBLIC_EXPLORE_STREAM_ENDPOINT=/api/explore/stream
- 模块建议：
  - src/app/explore/page.tsx（静态入口）
  - src/app/explore/components/Filters.tsx（FEN/PGN 输入、段位/时控筛选、空态推荐）
  - src/app/explore/components/TopMovesTable.tsx（SAN、Win%、Games、Play/Preview/Add）
  - src/app/explore/components/MiniBook.tsx（有限深的小书树）
  - src/app/explore/components/TrapCards.tsx
  - src/app/explore/components/ModelGames.tsx
  - src/app/explore/hooks/useExploreData.ts（加载/合并/排序；fen4/fen2 回退）
  - src/app/explore/services/schema.ts（类型与运行时校验）
  - src/app/explore/services/buildIndex.ts（构建器，脚本/Worker 复用）
  - src/app/explore/workers/explore-index.worker.ts（仅在线聚合模式）
- 可选代理：/api/fetch-pgn?url=...（同域转发解决 R2 CORS）。

UI/UX
- 桌面布局：
  - 左栏：棋盘 + FEN/PGN + 筛选（时控/段位/时间）。
  - 右栏（折叠卡）：Top Moves → Mini Book → Traps → Model Games → Practice Now。
- 交互：
  - Play 将第一步落到分析盘；Preview 预演 10 步。
  - Add to Training 将该位置加入 /train 题队。
  - 复制深链（携带当前筛选）。
- 移动端：
  - Top Moves 优先显示；其他信息放置在底部抽屉 Tab。
  - 顶部/底部提供固定动作：Play/Preview/Practice。
- 文案与单位：Games 用 K/M；Win% 取整；清晰标注“回退来源”。

性能与缓存
- 预算：首屏 < 2s（桌面），索引 JSON gzip < 1.5 MB，Top‑move 点击响应 < 150 ms。
- 索引获取：先 GET /api/explore/manifest（max-age=3600），再 GET /api/explore/index?version=…（immutable + ETag）。命中 304 时走浏览器缓存。
- 预取：在 /analyze 或 Openings 悬停“Explore”时预取 /api/explore/manifest 与对应 index。
- 在线模式：Worker 分批构建（yield），进度条；构建完成后将索引写入 IDB（含版本号），下次优先用 IDB。

可访问性与多语言
- 键盘可达，表格/按钮 aria/role 完整，焦点可见。
- 可排序列表提供列标题与提示；工具提示简洁。
- 文案可 i18n；避免代码中硬编码大小写/语言混杂。

错误处理与降级
- v2 JSON 加载失败：提示重试（退避），提供“在线构建（较慢）”降级。
- 无数据：自动回退至近祖先（≤4 plies），并提供跳转链接。
- CORS：若 R2 阻拦，走同域代理；加入超时/中止控制。

可观测性
- 事件：explore_view、topmove_click（uci, rank, sort）、preview_click、add_to_training、practice_from_position。
- 本地调试日志：用 NEXT_PUBLIC_DEBUG=1 开关。
- 可选：Sentry 对 /explore 的运行时异常采样上报。

安全与隐私
- 不涉及 PII；仅本地存储（IDB 作为缓存）。不上传用户数据。
- 深链仅含 FEN；避免在 URL 中嵌入大数据。

类型（TS）
- ExploreNode: { fen4: string; totalGames: number; moves: ExploreMove[]; traps?: Trap[]; models?: string[] }
- ExploreMove: { uci: string; name?: string; eco?: string; games: number; wrWhite?: number; wrBlack?: number; weight?: number }
- Trap: { lineSAN: string[]; reason: string; sampleIds: string[] }
- Filters: { perf?: 'blitz'|'rapid'|'classical'|'all'; elo?: string; time?: string }

构建与脚本（R2 唯一路径）
- 离线构建脚本（Node）：scripts/build-explore-index.ts
  - 输入：一个或多个 R2 URL（或本地 .pgn）
  - 输出：本地生成索引 JSON 后，上传到 R2 指定 key，并更新 R2 上的清单文件。
  - CLI 示例：
    - 生成索引：
      node scripts/build-explore-index.ts \
        --in https://cacle.chess-analysis.org/chess-png/lichess-4000.pgn \
        --out index-v2-2025-11-08.json \
        --maxDepth 20 --topN 5 --minGames 3
    - 上传到 R2（示例命令，具体按你 R2 工具/权限调整）：
      wrangler r2 object put explore/index/v2/2025-11-08.json.gz --file index-v2-2025-11-08.json --content-type application/json --content-encoding gzip
    - 更新清单（manifest）：
      wrangler r2 object put explore/manifest.json --file manifest.json --content-type application/json
  - 清单（manifest.json）建议结构：
    { "version": "v2-2025-11-08", "index": "explore/index/v2/2025-11-08.json.gz", "createdAt": 1731091200000, "size": 1234567 }
- package.json 建议：
  - "build:explore:index": "node scripts/build-explore-index.ts --in https://cacle.chess-analysis.org/chess-png/lichess-4000.pgn --out index-v2.json && gzip -f index-v2.json"
  - "publish:explore:index": "wrangler r2 object put explore/index/v2/2025-11-08.json.gz --file index-v2.json.gz --content-type application/json --content-encoding gzip && wrangler r2 object put explore/manifest.json --file manifest.json --content-type application/json"
  - "dev:pages": "wrangler pages dev out"

测试计划
- 单元：构建器（聚合/胜率/裁剪）、useExploreData（排序/回退）、Trap 启发式。
- 集成：加载 v2 JSON、渲染 Top Moves、动作接入棋盘与 /train。
- 端到端（wrangler）：深链 URL 正确定位；回退生效；移动端布局烟雾测试。

里程碑与任务（状态）
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
  - 实现 scripts/build-explore-index.ts，产出 global.curated.v2.json（16–20 plies、Top‑5）。
  - 实现 /explore：Filters + TopMoves + ModelGames；接通 Play/Preview。
  - 验收：首屏 < 2s；3 个示例位置可用。
- M2（2 天）
  - 加 MiniBook（8–12 plies）、Add to Training、Practice Now（5 题）→ /train。
  - 验收：生成练习 ≤ 1s；交互流畅。
- M3（2 天）
  - TrapCards（启发式）；回退提示 UX；导航加入 Learn → Explore。
  - 验收：常见开局能出现 1–3 个陷阱卡片；回退逻辑稳定。

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
