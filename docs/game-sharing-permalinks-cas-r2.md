棋局分享：永久短链接方案（CAS + R2 + Pages Functions）

目标
- 实现“整局棋一键分享”的永久短链接：/g/<id>，长期可用、稳定、低维护。
- 正常使用不设限（无配额感知），除了平台级防护外基本零运维。

开发进度（最新）
- 已完成
  - 后端 API（Pages Functions，同域）：
    - POST /api/g（内容寻址生成短 id，写入/复用 R2，返回 { id, url, createdAt }）。
    - GET/HEAD /api/g/:id（返回 JSON 或 ?format=raw 纯 PGN；长效缓存与 ETag）。
    - 代码：functions/api/g/index.ts，functions/api/g/[id].ts。
  - R2 绑定：wrangler.toml 中加入 [[r2_buckets]]，binding=SHARE，bucket_name=chess-share。
  - 前端：
    - 分享按钮：src/sections/analysis/panelToolbar/shareButton.tsx，并已接入工具栏 index.tsx。
    - 查看页：/g 静态入口（生产由 _redirects 将 /g/* → /g），禁用引擎，提供“复制链接/PGN”“Open in Analyzer”。代码：src/app/g/page.tsx，src/app/g/head.tsx。
    - 配置：src/config/share.ts（SHARE_API_BASE=/api/g）。
- 待办
  - 线上 Pages 项目中绑定 R2 桶 chess-share（将 binding 名称设置为 SHARE）。
  - 首次部署后进行全链路验证与观察日志；如需，再决定是否开启软限流。
  - 二期：OG 分享图。

本地快速验证
1) 准备 R2：
   - wrangler r2 bucket create chess-share
2) 启动同域 API 与站点：
   - npm run build
   - wrangler pages dev out
3) 测试：
   - 在分析页走子 → 点击“分享为短链接” → 粘贴访问 /g/<id>
   - 拉取原始 PGN：/api/g/<id>?format=raw
   - 嵌入页：/embed/<id>、/embed/<id>?auto=1&speed=600、/embed/<id>?theme=dark

非目标（v1）
- 不做登录/权限控制（链接为公开但不列出）。
- 不做服务端引擎分析或重型元数据提取（前端继续使用现有能力）。

架构总览
- 内容寻址（CAS）：对“规范化的 PGN”做 SHA‑256 哈希 → base62 → 取前 10 位作为短 id。同一内容永远得到同一 id，天然去重，不需要清理任务或 TTL。
- 存储：Cloudflare R2（对象存储，便宜、耐用、几乎零维护）。每条记录是一份小 JSON，包含 PGN 与可选 meta。
- API：Cloudflare Pages Functions，挂载到站点同域路径 /api/g（而非独立子域）。仅两个端点：POST 保存、GET/HEAD 读取。页面同域调用，无 CORS 复杂度。
- 前端：在分析页新增“分享”按钮 -> POST /api/g -> 返回 id -> 复制 /g/<id>。新增只读查看页 /g（静态入口，生产用 _redirects 将 /g/* → /g），用 chess.js 渲染，默认关闭引擎。
- 嵌入分享 v1：/embed（静态入口，_redirects 将 /embed/* → /embed）；支持 theme/auto/speed 参数；仅棋盘渲染。

“同域”说明（重要）
- “同域”（Same-Origin）指“协议 + 主机名 + 端口”完全一致。例如页面是 https://chess-analysis.org/...，那么同域 API 指 https://chess-analysis.org/api/g/...（协议 https、主机 chess-analysis.org、端口 443 一致）。
- 你现有的引擎文件托管在 R2 自定义域 cacle.chess-analysis.org。严格来说它与 chess-analysis.org 不同域；但你已通过 Worker 把 /engines/* 代理到主域，从页面视角看成“同域访问 /engines/*”。
- 本方案中的“同域 Pages Functions”指：把分享 API 放在站点主域路径下（/api/g/*），与页面完全同域，从而无需 CORS/凭据处理，部署与发布也和站点统一。

数据模型
- R2 对象 Key：g/<分片>/<id>.json，其中分片 shard = id.slice(0, 2)，用于热点分散。
- JSON 结构（版本化，便于未来扩展）：
  {
    "v": 1,
    "pgn": "...",            // 规范化后的 PGN 文本
    "meta": { ... },          // 可选，小对象
    "createdAt": 1730745600000 // Epoch 毫秒
  }
- 大小限制：PGN 最大 1 MB（足以覆盖包含大量注释/变化的极端情况）。

ID 生成与冲突策略
- 规范化 PGN：将 CRLF/CR 替换为 LF；去除 NUL（\0）；去除末尾多余空行（保留注释与变化）；不修改头信息或 SAN。
- 对规范化字节计算 SHA‑256。
- 对哈希结果做 base62 编码，取前 N 位（默认 10）。
- 写入时检查：若 id 已存在且内容相同 → 直接返回（幂等）；若极小概率存在但内容不同 → 多取 1–2 位重新检查（理论上几乎不会发生）。

API 设计（同域 /api/g，Pages Functions）
- 基础路径：/api/g

1) POST /api/g
- 请求体：{ pgn: string, meta?: object }
- 行为：
  - 校验：pgn 非空；规范化后字节数 ≤ 1,048,576；meta 可选（建议 ≤ 8 KB）。
  - 通过 CAS 计算 id → 组装 R2 Key → 先 HEAD 检查是否存在；不存在则 PUT JSON；存在则 GET 校验是否完全一致，一致跳过写入。
  - 返回 { id, url, createdAt }。若新写入返回 201 Created，已存在返回 200 OK。
- 响应头：cache-control: no-store（写入操作不缓存）。
- 状态码：201/200/400/413/5xx。
- 软限流（可选）：每 IP 每小时 200 次。默认关闭以满足“几乎无限制”；如遇滥用再打开（不影响正常用户）。

2) GET /api/g/:id
- 返回保存的 JSON。
- 响应头：
  - content-type: application/json; charset=utf-8
  - cache-control: public, immutable, max-age=31536000
  - etag: W/"<sha1-of-bytes>"（弱 ETag 便于再验证）
- 查询参数：format=raw 时返回 text/plain 的纯 PGN。
- 状态码：200/404/400/5xx。

3) HEAD /api/g/:id
- 仅做存在性检查。返回与 GET 相同的缓存头，不含主体。

安全
- XSS：把 PGN 当数据处理，不做 HTML 渲染；查看页的走法列表用纯文本输出，避免 innerHTML。
- CORS/同域：API 与页面同域，无需 CORS。若未来迁到子域，可按需加 CORS 头。
- 滥用与限流：默认关闭限流；保留每 IP 大额度限流的开关（如 RATE_LIMIT_CREATE_PER_HOUR）。Cloudflare WAF/机器人防护仍可在账号层面启用。
- 隐私：链接公开但不列出。/g/* 页面默认 noindex（可按业务需要调整）。

Cloudflare 配置
- R2 桶
  - 建议桶名：chess-share。
  - 通过 Cloudflare Dashboard 或 wrangler 创建。
- Pages Functions 绑定
  - 在项目根 wrangler.toml 增加：
    [[r2_buckets]]
    binding = "SHARE"
    bucket_name = "chess-share"
  - 保持 nodejs_compat 打开（当前项目已启用）。
- 可选环境变量
  - SHARE_ID_LEN：短 id 长度，默认 10。
  - SHARE_MAX_PGN_BYTES：最大 PGN 大小，默认 1048576（1 MB）。
  - RATE_LIMIT_CREATE_PER_HOUR：软限流阈值，未设置则关闭限流。

本地开发与调试
- Pages Functions 需要在静态产物目录上运行。
- 建议流程：
  1) npm run build
  2) wrangler pages dev .vercel/output/static
  3) 打开 wrangler 给出的本地地址，API 位于 /api/g/*。
- 仅用 next dev 时，Functions 不可用。可临时将 NEXT_PUBLIC_SHARE_API_BASE 指向一个 wrangler dev 的地址进行联调。

实现计划（需新增/修改的文件）
- 后端（Pages Functions）：
  - functions/api/g/index.ts        （处理 POST）
  - functions/api/g/[id].ts         （处理 GET/HEAD）
- 前端：
  - src/config/share.ts             （导出 SHARE_API_BASE = "/api/g"）
  - src/sections/analysis/panelToolbar/shareButton.tsx（新增分享按钮）
  - 修改 src/sections/analysis/panelToolbar/index.tsx（加入按钮）
  - src/app/g/page.tsx              （只读查看页，静态入口）
  - src/app/embed/page.tsx          （嵌入页，静态入口）
  - _redirects                      （路由重写：/g/* → /g，/embed/* → /embed；postbuild 会复制到 out）
- 文档（本文件）：docs/game-sharing-permalinks-cas-r2.md

端点实现要点（伪代码）
- functions/api/g/index.ts（POST）
  - 解析 JSON；校验长度；规范化 PGN。
  - id = base62(sha256(bytes)).slice(0, ID_LEN)
  - key = `g/${id.slice(0,2)}/${id}.json`
  - R2.head(key) → 404 则 R2.put(JSON)；存在则 R2.get 比较字节：相同跳过写入；不同则“加长 id 1–2 位重试”。
  - 返回 { id, url: `${origin}/g/${id}`, createdAt }；新建返回 201，否则 200。

- functions/api/g/[id].ts（GET/HEAD）
  - 校验 id：/^[0-9a-zA-Z]{6,32}$/
  - key = `g/${id.slice(0,2)}/${id}.json`
  - GET：读 R2；404 则返回 404。
    * format=raw → text/plain 返回 json.pgn
    * 否则 → application/json 返回完整 JSON
  - 加缓存头：public, immutable, max-age=31536000；ETag 为主体字节的 SHA‑1。
  - HEAD：同头部，无 body。

PGN 规范化流程
- CRLF/CR → LF
- 去除 NUL（\0）
- 去除末尾多余空行（不修改内容主体）
- 可选：末尾补一个 LF（非必须）
- 不移除 PGN 注释、花括号或变化，保持“字面”等价

前端集成
- 分享按钮：
  - 无走子则禁用
  - 通过 game.pgn() 序列化棋局
  - POST /api/g，携带 { pgn, meta: { source: "analyze", moves: n } }
  - 成功后复制 `${location.origin}/g/${id}`，toast 提示
  - 可提供“复制 PGN”副按钮

- 查看页（/g 静态入口）：
  - 拉取 /api/g/<id>；处理 404/5xx
  - const g = new Chess(); g.loadPgn(pgn);
  - 渲染：棋盘（只读）、PGN 头（White/Black/Date/Event/Result）
  - 走法列表用纯文本（避免 HTML 注入）
  - 按钮：Open in Analyzer（写入 IDB 后跳转 /analyze?gameId=...）、复制链接、复制 PGN
  - SEO：metadata 里 robots 设置为 noindex（除非你希望被收录）

- 嵌入页（/embed）：
  - 通过 _redirects 将 /embed/* 重写为 /embed，页面在浏览器端解析路径末段作为 id。
  - 支持 query：theme=light|dark，auto=0|1，speed=200–5000（ms）。
  - 页面仅渲染棋盘（无引擎/无工具栏），适合 iframe 嵌入。
  - /g 页提供“Copy Embed”按钮生成 iframe 代码。

缓存策略
- 写入：no-store
- 读取：public, immutable, max-age=31536000（id 与内容一一对应，不会改变）
- CDN：Cloudflare 将缓存 GET /api/g/:id；ETag 支持条件请求
- 查看页/嵌入页是静态入口页面，其缓存由站点策略控制；数据通过 API 拉取，遵循 API 的缓存策略。

错误处理与用户体验
- POST 失败：toast “分享失败，请稍后再试”，控制台输出细节
- GET 404：友好提示“链接不存在或已被移除/修改”
- 剪贴板失败（极少）：回退为弹窗显示链接供手动复制

运维与成本
- R2：对象极小（JSON 通常 < 10 KB），成本极低；无清理任务（CAS 去重、永久保存）
- Pages Functions：与站点同部署；函数轻量，成本可忽略
- 无需 cron/迁移任务；若未来要改 schema，可通过 JSON 的 v 字段平滑升级

安全注意事项
- 不要把 PGN 注释渲染为 HTML；一律作为纯文本显示。
- 防止超大输入：硬性 1 MB 上限，超出返回 413。
- 如开启限流，给出远高于正常使用的阈值（如 200 次/小时/IP），并允许通过 env 配置。

二期（可选增强）
- OG 分享图（进行中）
  - 路由：/g/[id]/opengraph-image → 1200x630 PNG
  - 以 PGN 计算终局 FEN（可前端预计算传参，或在函数内用轻量 PGN/FEN 工具）
  - 以 SVG 渲染棋盘再转 PNG（Satori/Resvg 或兼容 Workers 的库）
  - 长 TTL 缓存 + 稳定 ETag（以 id 为作用域）
- 删除 Token（隐私）
  - POST 可返回 deleteToken=HMAC(id, server secret)
  - DELETE /api/g/:id 需携带 deleteToken，删除 R2 对象

测试清单
- 本地：
  - wrangler pages dev out
  - curl -X POST http://127.0.0.1:8788/api/g -H 'content-type: application/json' -d '{"pgn":"[Event \"Casual\"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *"}'
  - curl http://127.0.0.1:8788/api/g/<id>
  - curl http://127.0.0.1:8788/api/g/<id>?format=raw
  - 浏览 http://127.0.0.1:8788/g/<id> 验证棋盘/走法加载
  - 浏览 http://127.0.0.1:8788/embed/<id>?auto=1&speed=600 验证嵌入页
- 生产：
  - POST 相同 PGN → 返回相同 id（幂等）
  - PGN 略有不同 → 返回不同 id
  - 大 PGN（~200 KB）→ 正常；>1 MB → 413
  - 核对 GET 的缓存头与 ETag

兼容性与后向兼容
- JSON 内含 v=1 版本号；未来新增字段保持 GET 响应向后兼容。
- 若调整 id 长度/编码，保留旧有 GET 路由逻辑；仅对新写入使用新形态。

需确认/开放问题
- /g/* 是否允许搜索引擎收录（默认 noindex）？
- 是否默认开启软限流（建议关闭，保留开关）？
- 最大 PGN 体积是否需要 >1 MB（当前建议 1 MB）？

示例响应
- POST /api/g → 201 Created
  { "id": "3kA2bX9pQ", "url": "https://chess-analysis.org/g/3kA2bX9pQ", "createdAt": 1730745600000 }
- GET /api/g/3kA2bX9pQ → 200 OK
  { "v":1, "pgn":"[Event \"...\"]\n1. e4 ... *", "meta": {"source":"analyze","moves":27}, "createdAt":1730745600000 }
