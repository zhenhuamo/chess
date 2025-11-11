# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 提供与本代码库协作时的指导。

## 项目概述

这是一个功能全面的**国际象棋分析** Web 应用，基于 Next.js 15、React 19 和 TypeScript 构建，集成 Stockfish WebAssembly 引擎。提供实时国际象棋分析、多引擎支持、PGN 解析、对局评估等高级功能。

## 常用命令

### 开发
```bash
npm run dev              # 启动开发服务器，访问 localhost:3000
```

### 构建与部署
```bash
npm run build            # 生成生产环境静态文件（输出到 out/ 目录）
npm run build:cf         # 为 Cloudflare Pages 构建（使用 next-on-pages）
npm run postbuild        # 构建后清理引擎文件并复制重定向/请求头配置
```

### 代码质量
```bash
npm run lint             # 运行 ESLint 检查
```

## 架构概览

### 核心技术栈
- **前端框架**：Next.js 15（静态导出）、React 19、TypeScript 5
- **UI 框架**：MUI Material v7 + Tailwind CSS
- **状态管理**：Jotai（原子化状态）+ React Query（服务端状态）
- **国际象棋逻辑**：chess.js（游戏状态 + PGN 解析）
- **棋盘组件**：react-chessboard + chessboard-element
- **数据可视化**：Recharts（评估图表）
- **本地存储**：IndexedDB（通过 idb 库）

### 国际象棋引擎架构
应用支持多个 Stockfish 版本，采用复杂的加载策略：

**支持的引擎版本**：
- Stockfish 17（完整版和轻量版）
- Stockfish 16.1（完整版和轻量版）
- Stockfish 16 NNUE
- Stockfish 11（回退版本）

**Worker 管理机制**（`src/lib/engine/worker.ts`）：
- 支持跨域加载并自动回退
- 根据 CPU 核心数和设备内存进行负载均衡
- 针对移动设备/iOS 的优雅降级
- 基于设备能力的智能引擎选择

**多线程支持**：
- 需要 SharedArrayBuffer 和跨域隔离（COOP/COEP 请求头）
- 在不支持的浏览器自动回退到单线程
- iOS 限制 2 线程，移动设备 4 线程，桌面设备最高 8 线程

### 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── analyze/            # 分析主界面
│   ├── play/               # 与 Stockfish 对战
│   ├── g/[id]/             # 分享对局链接
│   ├── embed/              # 嵌入式棋盘
│   ├── records/            # 已保存的对局
│   ├── explore/            # 对局探索功能
│   └── train/              # 训练工具
├── sections/               # 可复用的 UI 区块
│   ├── analysis/           # 分析面板组件
│   ├── engineSettings/     # 引擎配置对话框
│   └── play/               # 游戏控制区块
├── lib/                    # 核心业务逻辑
│   ├── engine/             # 引擎管理与 Worker
│   ├── chess.ts            # 国际象棋工具与 PGN 解析
│   ├── chessCom.ts         # Chess.com API 集成
│   └── lichess.ts          # Lichess API 集成
├── components/             # 共享 UI 组件
├── hooks/                  # 自定义 React Hooks
└── types/                  # TypeScript 类型定义
```

### 关键设计模式

**引擎加载策略**（`src/lib/engine/worker.ts`）：
1. 从 `ENGINE_BASE_URL`（CDN/R2 存储桶）加载
2. 跨域被阻止时回退到同源加载
3. 最后手段：使用 blob + importScripts 包装
4. 处理 iOS 和移动端限制

**对局分析流程**：
1. 使用 chess.js 解析 PGN
2. 通过重放走法重建每个位置 FEN
3. 批量发送位置到引擎
4. 计算评估指标（胜率、准确度、Elo 估计）
5. 着法分类（精彩/极佳/好棋/失误/大错/绝妙）

**外部集成**：
- Chess.com：通过 OAuth API 导入对局
- Lichess：对局导入和云端评估 API
- 分享对局：Cloudflare R2 存储 + 短链接

### 配置文件

**关键配置文件**：
- `next.config.ts`：静态导出、COOP/COEP 请求头（跨域隔离）
- `wrangler.toml`：Cloudflare Pages 部署 + R2 存储桶配置
- `src/config/site.ts`：站点常量和功能开关

**引擎配置**：
- 引擎文件存储在 `public/engines/`（总共 333MB）
- 每个引擎在 `src/lib/engine/stockfish*.ts` 中单独配置
- 基于设备能力自动选择
- 可用时从 CDN 远程加载

### 开发注意事项

**浏览器兼容性**：
- Chrome/Edge：完整多线程支持（最优）
- Safari/Firefox：单线程回退
- iOS：限制为 2 个线程
- 多线程需要跨域隔离（SharedArrayBuffer）

**性能考虑**：
- 引擎文件较大（每个 50-100MB）- 按需延迟加载
- 使用 Worker 线程避免阻塞主 UI
- IndexedDB 用于对局存储 - 异步操作
- Next.js 基于路由的代码拆分优化

**分析与监控**：
- Google Analytics 用于使用统计
- Microsoft Clarity 用于热力图
- Sentry 错误监控（过滤 WASM 错误）
- Firebase 分析集成

## 重要限制

1. **无测试框架**：项目当前缺少自动化测试
2. **大引擎文件**：`public/engines/` 中有 333MB 的 WASM 引擎
3. **仅静态导出**：Next.js 配置为 `output: "export"`，无 SSR
4. **跨域隔离**：多线程需要，但会影响某些开发流程
5. **iOS 限制**：WebAssembly 多线程支持有限

## 构建与部署

**Cloudflare Pages**（主要方式）：
- 静态导出到 `out/`
- R2 存储桶用于分享对局
- KV 用于短链接映射
- 引擎文件长期缓存

**构建流程**：
1. `next build` 创建静态导出
2. `postbuild` 清理不必要的文件
3. 复制 `_redirects` 和 `_headers` 到 Cloudflare
4. 从 CDN 提供引擎文件并设置缓存请求头

## 外部服务

- **Cloudflare**：Pages 托管、R2 存储、KV 用于短链接
- **Chess.com API**：基于 OAuth 的对局导入
- **Lichess API**：对局导入和云端评估
