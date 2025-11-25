# `/games` 页面性能提升计划

## 目标
- 缩短首屏时间（包含数据展示与 UI 可交互）
- 减少网络带宽与 CPU/内存消耗
- 提升 “Open in Analyzer” 跳转体验
- 为后续迭代（分页、过滤）预留空间

---

## 1. 确保同源 API 可用
- 部署 `src/app/api/explore/*` Edge Route，生产环境设置 `EXPL_MANIFEST_URL=https://cacle.chess-analysis.org/games/games-manifest.json`
- 验证 `https://站点/api/explore/manifest`、`/lichess`、`/stream` 均返回 200
- 监控 Cloudflare Pages 发布：`npm run build:cf && wrangler pages deploy`
- 目的：让 `/games` 与 `/explore` 不再依赖缺失的 Pages Function，保证 manifest 快路径可命中

## 2. Manifest 快路径
- 在 R2 维护 `games-manifest.json`（最好分文件/分页），保证字段包含游戏摘要、FEN、最后一手等
- 前端 `startParsingAtom` 在 manifest 命中后直接 `set(rawGamesAtom, manifest.games)` 并跳过 worker
- manifest 更新流程：定期脚本 + CI，上传到 `cacle.chess-analysis.org/games/`

## 3. 客户端解析优化（兜底）
- `startParsingAtom` 在收到 worker 批量时改为 append 到同一个数组引用，避免 `prev => [...prev, ...games]`
- 调整 `BATCH_SIZE`、进度上报频率，确保 UI 线程少重算
- Worker 支持 `abort`（取消 ReadableStream），切换文件时立即停止旧解析

## 4. 卡片预览与引擎
- manifest 中预先存每局最终 FEN 和最后一步（或生成缩略图），`GameBoardPreview` 直接渲染，无需 `fetchPgnForGame`
- Stockfish 计算改为显式按钮或仅在详情页触发，减少 hover 时的 Worker 启动
- 如需保持动态棋盘，可限制首屏渲染数量 + 使用 IntersectionObserver 懒加载

## 5. Analyzer 跳转链路
- 在 manifest / R2 中缓存完整 PGN（或 `file + offset + length`），`openInAnalyzer` 读取本地缓存而非实时请求 lichess
- 新增 `/api/games/pgn?file=&hash=` 等端点，直接从 R2/Worker 返回 PGN
- 预先初始化 IndexedDB（`games` store）并提供错误兜底，减少首次点击延迟

## 6. 服务端分页与过滤（中期）
- 设计 `/api/games/list?file=&page=&filter=…`，后端从 JSON 或 KV 中读取片段
- `useGamesState` 改为按需请求分页结果，而非一次性加载 5 万局
- 在 UI 中保留当前分页状态（page/pageSize），请求响应包含 `total` 以更新分页器

## 7. 监控与回归
- 添加简单的 logging/analytics：manifest 命中率、PGN 请求耗时、首屏加载耗时
- 出现 manifest 404 或 PGN fetch 失败时报警（Cloudflare Logpush / Sentry）
- 定期验证 `/games` 核心路径（展示 + 打开分析器 + 复制 PGN）

---

### 执行顺序建议
1. 部署 Edge API + 配置 manifest URL
2. 确保 manifest 数据完整并命中首屏
3. 客户端解析 append 优化（作为兜底）
4. 改造棋盘预览 / Stockfish 触发方式
5. Analyzer 跳转链路缓存 PGN
6. 服务端分页与过滤
7. 补充监控与报警

以上步骤可分批上线，每完成一个阶段都能显著降低 `/games` 页面加载时间。***
