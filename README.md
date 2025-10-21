# Chess Analyzer

一个使用 Next.js、React 和 Stockfish 引擎构建的在线国际象棋分析工具。

## 功能

- ♟️ **完整的棋盘界面** - 可交互的 8x8 棋盘，支持拖动棋子
- 🤖 **Stockfish 分析** - 使用 Stockfish 引擎进行位置分析
- ⚡ **实时评估** - 显示局面评分和最佳着法
- 🌍 **无需服务器** - 所有计算在客户端进行，零服务器成本
- 🔒 **完全隐私** - 所有棋局数据保留在本地

## 技术栈

- **前端框架**: Next.js 15 + React 19 + TypeScript
- **样式**: Tailwind CSS
- **棋类库**: chess.js
- **国际象棋引擎**: Stockfish (WebAssembly)
- **部署**: Cloudflare Pages

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

### 构建

```bash
npm run build
```

生成的静态文件将在 `out/` 目录中。

## 项目结构

```
.
├── app/
│   ├── components/       # React 组件
│   │   └── ChessBoard.tsx    # 主棋盘组件
│   ├── hooks/           # 自定义 React Hooks
│   │   └── useStockfish.ts   # Stockfish 引擎 hook
│   ├── workers/         # Web Workers
│   │   └── stockfish.worker.ts  # Stockfish 后台工作进程
│   ├── layout.tsx       # 根布局
│   ├── page.tsx         # 首页
│   └── globals.css      # 全局样式
├── package.json         # 项目依赖
├── tsconfig.json        # TypeScript 配置
├── next.config.ts       # Next.js 配置
└── tailwind.config.ts   # Tailwind CSS 配置
```

## 使用说明

1. **选择棋子**: 点击棋盘上的棋子
2. **查看合法着法**: 选中的棋子会高亮显示合法着法（绿色边框）
3. **移动棋子**: 点击绿色方格进行移动
4. **查看分析**: 页面右侧会实时显示位置分析

## 部署到 Cloudflare Pages

### 1. 准备 GitHub 仓库

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/chess-analyzer.git
git push -u origin main
```

### 2. 连接 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Pages**
3. 点击 **连接 Git 仓库**
4. 授权并选择 `chess-analyzer` 仓库
5. 配置构建设置:
   - **框架预设**: Next.js
   - **构建命令**: `npm run build`
   - **构建输出目录**: `out`
6. 保存并部署

### 3. 配置自定义域名

1. 在 Cloudflare Pages 项目中进入 **自定义域**
2. 添加你的域名
3. 更新域名的 DNS 设置指向 Cloudflare

## 后续改进

- [ ] 集成真实 Stockfish.js 引擎
- [ ] 添加着法记录（PGN 格式）
- [ ] 支持从 FEN 导入位置
- [ ] 添加棋局保存和加载
- [ ] 支持多种语言
- [ ] 添加移动端适配

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
