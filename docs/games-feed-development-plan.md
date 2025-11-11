# Games Feed 独立页面开发计划

## 项目概述

将 Games Feed 功能从 /explore 的子功能升级为独立页面，提供专注的对局浏览体验。

## 项目目标

### v1 (MVP)
- 创建独立的 `/games` 页面，提供对局卡片流浏览
- 客户端流式解析 PGN 文件，渲染对局卡片
- 支持文件选择、结果过滤、打开分析器、复制 PGN、分享功能
- 首屏 2s 内显示骨架屏，10s 内完成 1000 局解析（桌面端）

### v2 (优化)
- 预生成 manifest 文件，实现秒级首屏加载
- 增加搜索功能（玩家名、ECO、日期范围）
- 增加排序功能（日期、Elo 等级分）

### v3 (增强)
- 添加对局预览（前 6-10 步 SAN）
- 收藏功能（IndexedDB）
- 性能优化（虚拟滚动）

## 技术方案

### v1: 客户端流式解析架构

```
┌─────────────────────────────────────────────────────────────┐
│                    /games 页面 (page.tsx)                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  GamesContainer (状态管理 - Jotai)                      │ │
│  │  - 当前选择的文件                                       │ │
│  │  - 过滤条件 (结果: W/D/L)                               │ │
│  │  - 已解析的对局列表                                     │ │
│  │  - 加载状态                                             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                        ▲                                     │
│                        │ postMessage                         │
│                        │                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  parse-games.worker.ts (Web Worker)                     │ │
│  │  - 流式读取 PGN 文本                                    │ │
│  │  - 逐行解析头信息                                       │ │
│  │  - 每 50/100 局发送一批                                 │ │
│  │  - 可中断/暂停                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                        ▲                                     │
│                        │ fetch                               │
│                        │                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  /api/games/stream?file=... (API 路由)                  │ │
│  │  - 代理 R2 存储的 PGN 文件                              │ │
│  │  - 支持 Range 请求（v2）                                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### v2: Manifest 快路径架构

```
┌─────────────────────────────────────────────────────────────┐
│ 构建阶段 (CI/CD)                                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  scripts/build-manifest.js                              │ │
│  │  - 读取多个 PGN 文件                                    │ │
│  │  - 提取头信息摘要                                      │ │
│  │  - 输出 games/manifest-YYYY-MM-DD.json.gz              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│                    R2: explore/games/                       │
└─────────────────────────────────────────────────────────────┘
                               ↑
                               │ fetch
                               │
┌─────────────────────────────────────────────────────────────┐
│                    /games 页面 (page.tsx)                    │
│  1. 加载 manifest.json.gz                                  │
│  2. 秒级渲染首批卡片                                       │
│  3. 点击卡片时加载完整 PGN                                 │
└─────────────────────────────────────────────────────────────┘
```

## 数据结构设计

### GameSummary (对局摘要)
```typescript
interface GameSummary {
  // 唯一标识
  id: string; // SHA-256(headers + pgn片段)

  // 基本信息
  white: string;
  black: string;
  whiteElo?: number;
  blackElo?: number;
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  date?: string; // YYYY.MM.DD

  // 开局信息
  eco?: string; // ECO 代码 (例: "C20")
  opening?: string; // 开局名称

  // 对局信息
  moves: number; // 总手数
  timeControl?: string; // 时间控制 (例: "600+0")
  site?: string; // 对局来源
  round?: string; // 轮次
  termination?: string; // 结束方式

  // 文件定位 (v2)
  file?: string; // PGN 文件名
  offset?: number; // 文件偏移量
  length?: number; // PGN 文本长度

  // 派生字段
  shareUrl?: string; // /g/<id>
  previewSan?: string; // 前 6-10 步 SAN (v3)
}
```

### Manifest 文件格式 (v2)
```typescript
interface GamesManifest {
  version: "v2";
  generatedAt: string; // ISO 日期
  totalGames: number;
  files: string[]; // 包含的 PGN 文件列表
  games: GameSummary[];
}
```

## 组件设计

### 1. Page Layout (/games/page.tsx)
```
┌─────────────────────────────────────────┐
│  Header (共享布局)                      │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐ │
│  │  PageHeader                       │ │
│  │  - 标题: Games Library           │ │
│  │  - 简短说明                       │ │
│  └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  ┌──────────┬───────────────────────┐ │
│  │  Sidebar │     Main Content      │ │
│  │          │                       │ │
│  │  Filters │   ┌───────────────┐   │ │
│  │          │   │  Games Grid   │   │ │
│  │  - File  │   │               │   │ │
│  │  - Date  │   │  GameCard × N │   │ │
│  │  - ELO   │   │               │   │ │
│  │  - ECO   │   └───────────────┘   │ │
│  │          │   ┌───────────────┐   │ │
│  │          │   │  Load More    │   │ │
│  │          │   └───────────────┘   │ │
│  └──────────┴───────────────────────┘ │
├─────────────────────────────────────────┤
│  Footer (共享布局)                      │
└─────────────────────────────────────────┘
```

### 2. GamesContainer (状态管理)
**使用 Jotai atoms 管理状态：**
```typescript
// 全局状态
const currentFileAtom = atom<string>("lichess-4000.pgn");
const filterResultAtom = atom<"all" | "white" | "draw" | "black">("all");
const gamesAtom = atom<GameSummary[]>([]);
const isLoadingAtom = atom<boolean>(false);
const parseProgressAtom = atom<{ current: number; total: number } | null>(null);

// 派生状态
const filteredGamesAtom = atom((get) => {
  const games = get(gamesAtom);
  const filter = get(filterResultAtom);
  // 根据 filter 过滤对局
});
```

### 3. GameCard (对局卡片)
**布局设计：**
```
┌──────────────────────────────────────┐
│  White Player (2400)          1-0   │
│  vs                         2025.08 │
│  Black Player (2350)                  │
├──────────────────────────────────────┤
│  C20 • KP Opening • 42 moves          │
│  3+0 • lichess.org                    │
├──────────────────────────────────────┤
│  [Open] [Copy] [Share]                │
│  [Preview ▼] (v3)                    │
└──────────────────────────────────────┘
```

### 4. Filters (过滤器)
**v1 基础过滤器：**
- 文件选择：lichess-4000 / lichess-2025-08-2000 / lichess-2000
- 结果过滤：All / White / Draw / Black

**v2 扩展过滤器：**
- 日期范围选择器
- ELO 范围滑块
- ECO 代码输入
- 玩家名称搜索

### 5. 解析 Worker (parse-games.worker.ts)
**核心算法：**
```typescript
// 1. 创建读取器
const reader = response.body?.getReader();
const decoder = new TextDecoder();

// 2. 状态机解析
let buffer = "";
let currentGameHeaders: Record<string, string> = {};
let games: GameSummary[] = [];

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() || ""; // 保留不完整行

  for (const line of lines) {
    if (line.startsWith("[Event ")) {
      // 新对局开始
      if (Object.keys(currentGameHeaders).length > 0) {
        games.push(parseHeaders(currentGameHeaders));
      }
      currentGameHeaders = {};
    } else if (line.startsWith("[")) {
      // 解析头信息
      const match = line.match(/^\[(\w+) "(.+)"\]$/);
      if (match) {
        currentGameHeaders[match[1]] = match[2];
      }
    }

    // 每 50/100 局发送一批
    if (games.length >= BATCH_SIZE) {
      self.postMessage({ type: "batch", games });
      games = [];
    }
  }
}
```

## API 设计

### 1. GET /api/games/stream?file={filename}
**功能**：流式读取 R2 中的 PGN 文件
**参数**：
- `file`: PGN 文件名（例: lichess-4000.pgn）

**响应**：
```
Content-Type: text/plain
Transfer-Encoding: chunked
```

### 2. GET /api/games/manifest (v2)
**功能**：获取预生成的 manifest 文件
**响应**：
```json
{
  "version": "v2",
  "generatedAt": "2025-01-15T10:00:00Z",
  "totalGames": 100000,
  "files": ["lichess-4000.pgn", "lichess-2025-08-2000.pgn"],
  "games": [
    {
      "id": "a1b2c3...",
      "white": "MagnusCarlsen",
      "black": "Hikaru",
      "whiteElo": 2839,
      "blackElo": 2780,
      "result": "1-0",
      "date": "2025.08.10",
      "eco": "C20",
      "opening": "KP Opening",
      "moves": 42,
      "timeControl": "3+0",
      "file": "lichess-4000.pgn",
      "offset": 123456,
      "length": 2345
    }
  ]
}
```

### 3. GET /api/games/pgn?file={filename}&offset={offset}&length={length} (v2)
**功能**：获取对局的完整 PGN 文本（用于打开分析器）
**参数**：
- `file`: PGN 文件名
- `offset`: 文件偏移量
- `length`: 文本长度

## 性能目标

### v1 目标
- 首屏骨架屏渲染：< 1s
- 首批卡片可见时间：< 2s（50-100 局）
- 1000 局解析完成时间：< 10s（桌面端）
- 内存占用：< 200MB（大文件解析时）

### v2 目标
- 首屏卡片渲染：< 1s（使用 manifest）
- 打开分析器时间：< 1s（使用 offset/length 加载）

## 开发里程碑

### M1 (2-3 天) - v1 MVP
- [x] 创建项目目录结构 ✅ 2025-01-15
- [x] 创建基础类型定义文件 ✅ 2025-01-15
- [x] 实现 PGN 解析 Worker ✅ 2025-01-15
- [x] 创建 API 客户端 ✅ 2025-01-15
- [x] 实现 GamesContainer 状态管理 ✅ 2025-01-15
- [x] 创建 GameCard 组件 ✅ 2025-01-15
- [x] 创建基础过滤器组件 ✅ 2025-01-15
- [x] 创建页面路由 `/games/page.tsx` ✅ 2025-01-15
- [x] 添加进度指示器和骨架屏 ✅ 2025-01-15
- [x] 修复构建错误（重复导出、MUI API 变更、Box props）✅ 2025-01-15
- [x] 修复漏掉的 Grid API 调用 ✅ 2025-01-15
- [x] 修复 PgnHeaders 中重复的 Site 字段 ✅ 2025-01-15
- [x] 创建 /api/games/stream API 路由 ✅ 2025-01-15
- [x] **M1 MVP 完成！所有核心组件已实现** ✅ 2025-01-15
- [ ] 测试和集成 (下一步)
- [ ] 基础埋点 (优化阶段添加)

### M2 (2-3 天) - v2 Manifest 优化
- [ ] 创建 build-manifest.js 脚本
- [ ] 配置 R2 存储 manifest 文件
- [ ] 创建 /api/games/manifest API
- [ ] 前端优先加载 manifest，失败回退到 Worker
- [ ] 实现搜索功能（玩家名、ECO）
- [ ] 实现排序功能（日期、Elo）
- [ ] 扩展过滤器（日期范围、Elo 范围）

### M3 (2-3 天) - 增强功能与优化
- [ ] 添加对局预览（前 6-10 步 SAN）
- [ ] 实现虚拟滚动（性能优化）
- [ ] 添加收藏功能（IndexedDB）
- [ ] 实现 ItemList JSON-LD（SEO）
- [ ] 无障碍优化（键盘导航、屏幕阅读器）
- [ ] 添加 FAQ 和说明文案

### M4 (1-2 天) - 导航与集成
- [ ] 在 Header 添加导航链接
- [ ] 在首页添加引导按钮
- [ ] 在 /explore 页面添加提示链接
- [ ] 移动端适配

## 文件结构

```
src/app/games/
├── page.tsx                    # 主页面
├── layout.tsx                  # 页面布局（可选）
├── components/
│   ├── GamesContainer.tsx      # 状态容器
│   ├── GamesSidebar.tsx        # 侧边栏过滤器
│   ├── GameCard.tsx            # 对局卡片
│   ├── GamesGrid.tsx           # 网格布局
│   ├── LoadMoreButton.tsx      # 加载更多
│   └── ProgressIndicator.tsx   # 进度指示器
├── hooks/
│   └── useGamesStream.ts       # 流式数据 Hook
├── workers/
│   └── parse-games.worker.ts   # PGN 解析 Worker
├── types/
│   └── game.ts                 # 类型定义
└── api.ts                      # API 客户端

scripts/
└── build-games-manifest.js     # 构建 manifest 脚本

functions/api/games/
├── manifest.ts                 # Manifest API (v2)
└── stream.ts                   # Stream API
```

## 与现有系统的集成

### 1. 导航入口
- **Header 导航栏**：添加 "Games" 或 "Library" 链接
- **首页**：添加 "Browse Games" 按钮
- **/explore 页面**：添加提示："Want to browse full games? Check out Games Library"

### 2. 与 Analyzer 集成
```typescript
// 点击 "Open in Analyzer"
const handleOpenInAnalyzer = async (game: GameSummary) => {
  // 获取完整 PGN
  const pgn = await fetchGamePgn(game);

  // 保存到 IndexedDB
  const gameId = await saveGameToIndexedDB(pgn);

  // 跳转到分析器
  router.push(`/analyze?gameId=${gameId}`);
};
```

### 3. 与分享系统集成
```typescript
// 使用现有的 /api/g 端点
const handleShare = async (game: GameSummary) => {
  const pgn = await fetchGamePgn(game);
  const response = await fetch("/api/g", {
    method: "POST",
    body: JSON.stringify({ pgn })
  });
  const { id } = await response.json();

  // 复制分享链接
  navigator.clipboard.writeText(`${window.origin}/g/${id}`);
};
```

## 埋点事件

### 页面级别
- `games_page_view` - 页面访问
- `games_file_change` - 切换 PGN 文件
- `games_filter_change` - 过滤器变更

### 交互级别
- `games_parse_start` - 开始解析
- `games_parse_progress` - 解析进度
- `games_parse_complete` - 解析完成
- `games_parse_error` - 解析错误

### 卡片级别
- `game_card_view` - 卡片曝光
- `game_card_open` - 打开分析器
- `game_card_copy` - 复制 PGN
- `game_card_share` - 分享对局

## SEO 优化

### Meta 信息
```typescript
// page.tsx
export const metadata: Metadata = {
  title: "Games Library - Browse Chess Games | Chess Analyzer",
  description: "Browse thousands of master chess games from lichess.org. Learn from top players, analyze openings, and improve your chess skills.",
  keywords: ["chess games", "master games", "lichess games", "chess database", "learn chess"]
};
```

### JSON-LD (v3)
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "https://chess-analysis.org/g/a1b2c3"
    }
  ]
}
```

## 性能优化策略

### 1. Worker 线程
- 使用 Web Worker 解析 PGN，避免阻塞主线程
- 使用 transferable objects 传递数据

### 2. 分批渲染
- Worker 每 50-100 局发送一批
- 主线程使用 requestIdleCallback 渲染

### 3. 内存管理
- 大文件解析时，已渲染的批次可以丢弃原文本
- 只保留摘要信息（GameSummary）

### 4. v2 Manifest
- 预生成摘要文件，减少客户端计算
- 按需加载完整 PGN

### 5. 虚拟滚动 (v3)
- 最多同时渲染 50-100 张卡片
- 不可见卡片从 DOM 中移除

## 错误处理

### 解析错误
- 遵循"fail-fast"原则，单局解析失败不影响其他对局
- 记录错误日志（Sentry）
- UI 显示警告但不阻断流程

### 网络错误
- R2 下载失败：显示重试按钮
- 超时处理：5 秒无响应显示"加载缓慢"提示

### 存储错误
- IndexedDB 写入失败：显示错误消息
- 分享失败：显示错误消息

## 无障碍支持

### 键盘导航
- Tab 键在卡片间切换
- Enter 键打开对局
- Space 键展开预览（v3）

### 屏幕阅读器
- 卡片使用 article 语义标签
- 提供 aria-label 描述对局信息
- 加载状态使用 aria-live 区域

## 浏览器兼容性

### 支持
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 降级
- Web Worker 不支持：主线程解析（性能较差）
- SharedArrayBuffer 不支持：单线程 Worker
- BigInt 不支持：使用 uuid 替代 hash（v2）

## 测试计划

### 功能测试
- [ ] 流式解析正确性（对比解析结果与原始 PGN）
- [ ] 过滤器功能（各种组合）
- [ ] Open in Analyzer 流程
- [ ] Copy PGN 功能
- [ ] Share 功能

### 性能测试
- [ ] 1000 局解析时间 < 10s
- [ ] 10000 局内存占用 < 500MB
- [ ] 滚动流畅度（60fps）

### 兼容性测试
- [ ] Chrome 移动端
- [ ] Safari iOS
- [ ] Firefox

## 部署清单

### v1 部署
- [ ] Worker 文件部署到 CDN
- [ ] PGN 文件配置正确
- [ ] API 路由配置（跨域、缓存）
- [ ] 埋点配置

### v2 部署
- [ ] build-manifest.js 添加到构建流程
- [ ] manifest 文件上传到 R2
- [ ] 回退逻辑测试（manifest 404）

## 监控指标

### 性能指标
- 首屏渲染时间（< 2s）
- 首批卡片加载时间（< 3s）
- 解析速度（局/秒）

### 业务指标
- 页面访问次数
- 平均浏览对局数
- Analyzer 打开率
- 分享率
- 用户停留时间

### 错误指标
- 解析错误率（< 0.1%）
- API 错误率（< 0.5%）
- 客户端错误率（< 1%）

## 风险评估

### 技术风险
1. **大文件解析性能问题**
   - 缓解：Worker + 分批 + requestIdleCallback
   - 缓解：v2 manifest 预生成

2. **内存占用过高**
   - 缓解：只保留摘要信息，丢弃原文本
   - 缓解：虚拟滚动

3. **R2 带宽成本**
   - 缓解：manifest 缓存
   - 缓解：浏览器缓存（Cache-Control）

### 产品风险
1. **用户找不到功能**
   - 缓解：Header 导航 + 首页引导 + /explore 提示

2. **解析错误导致数据不完整**
   - 缓解：严格测试 + 错误日志 + 快速修复

## 后续迭代方向

### 短期（1-2 个月）
- PGN 上传功能（用户上传自己的对局）
- 收藏夹功能（IndexedDB + Cloud sync）
- 对局标签系统

### 中期（3-6 个月）
- 全文搜索（OpenSearch/Elasticsearch）
- 推荐算法（基于用户行为）
- 对局评论/笔记

### 长期（6 个月以上）
- 社区功能（分享、点赞）
- 高级筛选（开局树、战术主题）
- 与其他数据源集成（chess.com、other OTB events）

## 附录

### A. PGN 头信息字段说明
```
[Event]      # 赛事名称
[Site]       # 比赛地点
[Date]       # 比赛日期 (YYYY.MM.DD)
[Round]      # 轮次
[White]      # 白方姓名
[Black]      # 黑方姓名
[WhiteElo]   # 白方等级分
[BlackElo]   # 黑方等级分
[Result]     # 结果 (1-0, 0-1, 1/2-1/2, *)
[ECO]        # 开局分类 (例: C20)
[Opening]    # 开局名称
[TimeControl]# 时间控制 (例: 600+0)
[Termination]# 结束方式
```

### B. ECO 分类参考
```
A00-A39: 开局除特殊者外
A40-A44: 侧翼开局
A45-A49: 印度防御
A50-A59: 开局除特殊者外
...
B00-B09: 开局除特殊者外
B10-B19: 卡罗-康防御
...
C00-C19: 法国防御
C20-C99: 开放性开局
...
D00-D69: 封闭性开局
...
E00-E59: 印度防御除特殊者外
E60-E99: 王翼印度防御
```

### C. 时间控制格式
```
600+0   # 10 分钟，无加秒
180+2   # 3 分钟，每步加 2 秒
-       # 无限制
```

---

**文档版本**: v1.0
**创建日期**: 2025-01-15
**最后更新**: 2025-01-15
**状态**: 计划中
