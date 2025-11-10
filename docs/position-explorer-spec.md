位置探索（Position Explorer）规格方案（基于 4k+ PGN 数据）

目标与价值
- 目标：提供一页式“位置/开局探索”工具，用户给出一个棋盘位置（或开局名/PGN 片段），即可得到下一步选择、胜率、热门分支、典型陷阱与范例对局，并可一键练习。
- 用户价值：
  - 做决策：真实数据支撑“下一步怎么下”（按胜率/热度/难度排序）。
  - 少踩坑：标出早期高胜败分化的“套路/陷阱”，给出简要说明与范例。
  - 学范例：精选若干“结构清晰”的真实对局，一键在本地分析页打开。
  - 练习闭环：从当前位置立即生成 5 题/10 题练习，巩固记忆。

页面定位与路由
- 路由：/explore（静态入口，数据由前端/同域 API 拉取）
- 入口：
  - Analyze 页顶部/侧边入口“Explore Position”。
  - Openings 面板“更多”链接跳转 /explore，并带上当前 FEN。

核心功能（MVP）
1) 位置输入
   - 棋盘可摆放；支持粘贴 FEN；支持粘贴 PGN（自动定位到当前位置）。
   - 搜索框：支持 ECO/开局名（模糊匹配），选中后跳到开局主线的典型位置。

2) 过滤器
   - 等级段：<1400 / 1400–1800 / 1800–2200 / 2200+ / 未知。
   - 时控：blitz / rapid / classical / 全部（来自 headers：TimeControl/Event）。
   - 时间：最近 N 月（当数据持续扩充时使用）。

3) Top Moves（下一步选项）
   - 列：SAN/名称、UCI、Win%（按行棋方）、Games（K/M）、是否“PV#1 in-book”、Trap 标识。
   - 排序：按 Hot（Games）/ Win% / Mine%（个人库）切换。
   - 快捷：Play（加到分析盘）、Preview（预演 10 步）、Add to Training（加入训练队列）。

4) 迷你书树（Line Explorer）
   - 限深：默认 8–12 plies；节点显示 Games · Win%。
   - 支持“展开/收起”，按 Win%/Hot 排序子节点。

5) 典型陷阱（Traps）
   - 启发式：短局（≤25–30 手）且该分支胜率显著偏离均值；或存在早期大评估跳变（可用轻量引擎校验）。
   - 展示：简短说明 + 范例 /g/<id> 链接 + “Open in Analyzer”。

6) 范例对局（Model Games）
   - 选择：该位置后“结构清晰”的真实局（长度适中，评估平稳/转折明确，少超长垃圾时间）。
   - 操作：一键打开到 /g/<id> 或直接“Open in Analyzer”。

7) 一键练习（Practice Now）
   - 按当前位置，生成 5 题（默认）至训练页（/train）。
   - 题目：用 top-PV#1~#K（分差阈值内）构成“可接受答案集合”；支持 1–2 次提示。

数据来源与构建
- 种子数据（当前）：
  - 你已上传到 R2 的 3 份 PGN：
    - lichess-2000.pgn
    - lichess-2025-08-2000.pgn
    - lichess-4000.pgn（合并 4k 局）
  - 许可：Lichess 数据为 CC0，可本地使用。

- 数据使用路径（两选一，长期建议预构建）：
  A. 预构建 JSON（推荐）
     - 离线脚本将 4k 局解析为开局索引 JSON（global.curated.v2.json）：
       - 粒度：fen4（placement/side/castling/ep）；fen2 作为回退。
       - 每个节点保存：
         {
           fen4: string,
           moves: [ { uci, name?, eco?, games, wrWhite?, wrBlack?, weight? } ],
           totalGames,
           traps?: [ { lineSAN, reason, sampleIds: string[] } ],
           models?: string[] // /g/<id> 列表
         }
       - 限深：默认 16–20 plies；只保留 Top-5 子节点。
       - 产物放置：public/book/global.curated.v2.json（约几 MB）。
     - 优点：/explore 首屏极快；实现简单。

  B. 在线聚合（无后端，Web Worker）
     - 首次进入 /explore，从 R2 URL 流式拉取 .pgn 并在 Worker 中解析构建索引，分批写入 IndexedDB（持久化）。
     - 显示进度条，完成后页面读取 IDB 索引并渲染。
     - 优点：无需离线脚本；缺点：首屏构建时间较长（建议做“懒加载/缓存”）。

统计口径与算法要点
- 胜率：
  - wrWhite = 白方胜场 + 0.5*和棋 /（白方总局数）；wrBlack 同理。
  - 展示 Win% 时根据“当前行棋方”选择 wrWhite 或 wrBlack。

- 热度：Games=该位置下该步出现次数；可通过 weight（加权出现）削弱重复对局的影响（可选）。

- Trap 启发：
  - 规则一：该分支在短局（≤25–30 手）中的胜率显著偏离同层均值（|Δ| ≥ 15–20%）。
  - 规则二（可选）：轻量引擎评估出现≥300cp 的单步跳变且可被简单手段（吃回/战术）避免。
  - 输出字段：{ lineSAN, reason: '短局高胜率分支/评估大跳变', sampleIds: ['/g/<id>', ...] }。

- 范例对局：
  - 排序因子：评估平稳/转折清晰、长度适中、较少早弃权、头信息完整。
  - 每位置挑 3–10 盘，存为 ids（即 R2 /g/<id>）或内嵌简要头。

信息架构（UI）
- 布局：
  - 左栏：棋盘（可摆放）+ FEN 输入 + 过滤器（等级段/时控/时间）。
  - 右栏（折叠卡片）：
    1) Top Moves（表格 + Play/Preview/Add to Training）
    2) Line Explorer（小树，限深 8–12 plies）
    3) Traps（卡片：标题/简述/示例）
    4) Model Games（列表：对白双方/日期/结果）
    5) Actions（从此位置生成 5 题）

交互细节与边界
- FEN 无数据：提示“该位置暂无数据，尝试回退 1–4 plies”（自动回退并标注）。
- 排序切换：保留上一次选择；对移动端提供简化视图。
- 统一单位与格式：Games 千/百万用 K/M 表示；Win% 取整（±1%）；日期 YYYY-MM。 

与现有功能的衔接
- Analyze：Play/Preview 调用共用的 useChessActions；“Open in Analyzer”写入 IDB 并跳转。
- Openings 面板：沿用相同数据源（v2 JSON 或 IDB 索引），保持指标一致。
- 训练页：Add to Training/Practice 5 将 FEN 与“可接受答案集合”传入 /train。
- 分享：Model/Trap 的示例局优先指向 /g/<id>，并提供 Open in Analyzer 按钮。

技术与代码组织（建议）
- 新页：src/app/explore/page.tsx（静态入口），内部分为：
  - components：TopMovesTable.tsx、MiniBook.tsx、TrapCards.tsx、ModelGames.tsx、Filters.tsx。
  - hooks：useExploreData(fen, filters) 读取 JSON 或 IDB 索引；
  - services：
    * explore/buildIndex.ts（离线/Worker 端的索引构建逻辑）
    * explore/schema.ts（类型与校验）
  - workers：explore-index.worker.ts（在线聚合时使用）。

MVP → v1 路线与任务
- M1（2–3 天）
  - 预构建 JSON（global.curated.v2.json，限深 16–20 plies，Top-5）。
  - /explore 页面：位置输入 + 过滤器 + Top Moves + Model Games + Play/Preview。
  - 验收：首屏 < 2s；Top Moves 点击响应 < 150ms。

- M2（2 天）
  - MiniBook 小树（8–12 plies）；Add to Training；Practice 5。
  - 验收：训练页生成 ≤ 1s，Add to Training 可在 /train 中看到队列。

- M3（2 天）
  - Traps 卡片（启发式）；等级段/时控过滤完整；“无数据自动回退”。
  - 验收：典型位置能展示 1–3 个陷阱卡片；回退逻辑清晰提示。

性能与体验目标
- 首屏（预构建 JSON）加载 < 2s（桌面网络），< 3s（移动 4G）。
- Worker 构建（在线方式）单次不阻塞主线程（分批 yield）。
- 包体：新页增量 < 100KB gzip（组件按需加载）。

测试与验收
- 单测：索引构建（fen4/fen2 聚合、胜率/热度计算、Trap 判定）。
- 交互测试：排序切换、过滤器组合、无数据回退、Play/Preview。
- 端到端：从 /explore 选择位置 → Add to Training → /train 答题 → 分数与错题重练。

风险与缓解
- 样本量偏小（仅 4k 局）：限制树深与节点数，优先展示 TopN；后续扩充月份/用户补样。
- 头信息缺失：对 Elo/时控容错入“未知”桶，不影响主流程；后续可加规则识别。
- Trap 判定误差：以“启发式 + 可关闭标签”起步，后续再引入精确战术检测。

数据来源扩展（后续）
- R2 再投放更多月份（每月 2k–10k 局），离线脚本合并为 v3/v4 版本 JSON；用版本号与日期标识。
- 用户 API 抓取（Lichess/Chess.com）作为补充，加入段位/时控均衡采样。

 运维与发布
- 预构建脚本：scripts/build-explore-index.ts（可本地 Node 执行，输出 JSON）。
- 产物：public/book/global.curated.v2.json；在 /updates 公告。
- Sentry：仅对 /explore 的运行时异常采样上报（可选）。

开发方案（详细）
- 范围与非目标
  - 范围：/explore 独立学习页（可从导航进入），支持位置输入/FEN 粘贴、过滤器（段位/时控）、Top Moves、MiniBook、Model Games、从本位置生成练习；数据源为 v2 预构建 JSON（或在线聚合）。
  - 非目标（v1）：不做全站搜索所有局的全文检索；不做重型引擎服务器端计算；不做账号/云同步（仅本地）。

- 架构与数据流
  - 预构建路径（推荐）：离线脚本读取 R2 的 PGN → 解析 → 构建 fen 索引 → 生成 public/book/global.curated.v2.json → 页面按需加载与缓存。
  - 在线聚合路径（备选）：页面首次进入时在 Web Worker 解析远程 PGN（流式）→ 增量构建索引 → 存入 IndexedDB；首屏加载空态 + 进度条，构建完成后渲染。
  - 与现有系统衔接：Play/Preview 复用 useChessActions；Model/Trap 复用 /g 链接与 Open in Analyzer；Practice 进入 /train。

- 数据索引设计
  - 粒度：fen4 优先（placement/side/castling/ep），fen2 为聚合回退；限深 16–20 plies；每节点保留 Top-5 子节点（按 Games 或权重）。
  - 字段（建议 v2 schema）：
    - node: { fen4, totalGames, moves: [{ uci, name?, eco?, games, wrWhite?, wrBlack?, weight? }], traps?: [{ lineSAN, reason, sampleIds: string[] }], models?: string[] }
  - 生成要点：
    - 解析 UCI 与 SAN；ECO/名称可用本地开局表补全（无则留空）。
    - 胜率 wrWhite/wrBlack：按对白方/黑方各自的胜/和/负计算；展示 Win% 依据“当前行棋方”。
    - 去重：规范化 PGN（换行/空行/NUL），按哈希去重（与分享 API 一致思想）。
    - Trap 启发（v1）：短局（≤25–30 手）且分支胜率显著偏离同层均值（|Δ| ≥ 15–20%）；可选增加“单步评估大跳变 ≥300cp”的轻量校验。
    - Model 选择：长度适中（不超长/不太短）、评估曲线平稳或有典型转折、头信息齐全；挑 3–10 盘。
  - 体积预估：4k 局 → 节点约数万，JSON 约 1–5 MB（gzip 后 < 1.5 MB）。

- 页面与组件（文件建议）
  - 路由：src/app/explore/page.tsx（静态入口）
  - 组件：
    - Filters.tsx：等级段/时控/时间筛选；FEN/PGN 输入框；空态推荐区（热门开局、Traps 精选）。
    - TopMovesTable.tsx：列出 SAN/Win%/Games/标签（PV#1/Trap）；动作 Play/Preview/Add to Training。
    - MiniBook.tsx：迷你书树（限深 8–12 plies），支持展开/排序。
    - TrapCards.tsx：陷阱卡片（标题、简述、示例 /g/<id>）。
    - ModelGames.tsx：范例对局列表（标题/双方/日期/结果）。
  - hooks/services：
    - useExploreData(fen, filters)：从 v2 JSON/IDB 读节点与子节点；提供聚合与排序。
    - explore/schema.ts：类型定义与校验（容错缺失字段）。
    - explore/buildIndex.ts：离线/Worker 共用的构建函数（可复用在脚本/Worker）。
  - Worker（可选）：explore-index.worker.ts（在线聚合模式）。

- URL 与深链
  - /explore?fen=...&perf=rapid&elo=1400-1800&depth=10
  - 支持复制链接与书签；进入后自动加载对应位置与筛选。

- 性能与缓存
  - 预算：首屏 < 2s（桌面网络）；JSON gzip < 1.5 MB；Top Moves 点击响应 < 150ms。
  - 浏览器缓存：public, max-age=86400；版本升级用文件名/查询串版本号（如 v2.ts）。
  - 预取：Analyze/Openings 面板访问后可预取 v2 JSON，加速下一跳 /explore。

- 可用性与移动端
  - 移动端布局：Top Moves 折叠；书树默认收起；点击打开抽屉显示 Model/Trap。
  - a11y：键盘导航、可见焦点、ARIA，为表格列提供 title。
  - 文案：简明可读；单位 K/M；Win% 取整。

- 错误处理与降级
  - v2 JSON 拉取失败：提示“加载失败，稍后再试”，并提供在线聚合降级（可选）。
  - 无数据：自动回退 1–4 plies 并提示“已回退至 N plies 之前的最近有数据位置”。
  - R2 跨域：如遇 CORS，走同域代理 /api/fetch-pgn（简单转发）。

- 观测与开关
  - 事件：记录 TopMoves 点击/排序切换/Practice 触发（本地或 Sentry 可选）。
  - Feature flag：NEXT_PUBLIC_ENABLE_EXPLORE=1 控制导航显隐；灰度发布。

- 测试计划
  - 单元：buildIndex（fen4/fen2 聚合、胜率/热度、Trap 判定）；useExploreData（过滤/排序）。
  - 集成：/explore 页面加载 v2 JSON 渲染；Play/Preview 跳转 /analyze；Practice 跳转 /train。
  - 端到端（wrangler dev）：热门位置可用；无数据回退生效；移动端断点布局正常。

- 里程碑与任务
  - M1（2–3 天）
    - 脚本：scripts/build-explore-index.ts（Node），输入本地/远程 .pgn（R2 URL），输出 public/book/global.curated.v2.json。
    - 页面：/explore 基础框架；Filters + TopMoves + ModelGames；Play/Preview 接入 useChessActions。
    - 验收：首屏 < 2s；TopMoves 点击 < 150ms；3 个示例位置可用。
  - M2（2 天）
    - MiniBook 小树；Add to Training；Practice 5（进入 /train，构建题队列）。
    - 验收：训练生成 ≤ 1s；书树可展开/排序；Add to Training 在 /train 可见。
  - M3（2 天）
    - TrapCards：短局高胜率启发式；无数据回退与提示；导航加入 Learn → Explore。
    - 验收：典型开局能展示 1–3 个陷阱卡片；回退逻辑稳定。

- 验收清单（v1 完成定义）
  - /explore 可独立访问；无 FEN 时展示热门入口与搜索；有 FEN 时渲染 TopMoves/书树/范例。
  - 预构建 v2 JSON 正常加载；缓存与版本更新有效。
  - Play/Preview 与 Analyze 一致；Practice 直达 /train 并可答题。
  - 移动端可用；无数据回退提示明确；错误提示不打断。

优化路线（v1+ → v2）
- 数据与算法
  - 扩充数据源：再加 2–3 个月或按用户 API 抓取，提升覆盖度；分权重增加“新鲜度”衰减（近期对局权重略高）。
  - 段位/时控细分：按 Elo 段聚合统计；允许对比“当前段位 vs 目标段位”的选择差异。
  - Trap 精炼：引入轻量引擎对关键分支做 8–12 plies 校验，识别典型战术主题（漏吃回/闪击/夹击）。
  - Model 自动评分：用评估方差/长度/关键转折步定位“教学友好”的范例。

- 个性化与训练
  - Mine% 对比全局：在 TopMoves 显示“我的胜率 vs 全局胜率”，给出建议路径。
  - 计划生成：从某开局自动生成学习路径（若干关键位置 + 每日 5 题），支持间隔重复（SRS）。
  - 错题本：训练错题回流 /explore 的相应位置，形成“弱项地图”。

- 体验与产品化
  - 收藏与历史：收藏位置/分支；最近浏览；一键分享 /explore 深链。
  - SEO（可选）：/explore 可开启索引（仅页面，不含 /g），吸引自然流量；配 OG 卡片。
  - 交互润色：动画/骨架屏；更好的移动端抽屉式信息架构。
