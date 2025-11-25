# Lichess 每日一题与 TV 挂件集成计划

## 目标
在着陆页（Landing Page）增加“每日一题”和“Lichess TV”挂件，提升用户活跃度与页面动态感。

## 用户审查
- **设计确认**：将在着陆页 Hero 区域下方新增一行，包含两个卡片：左侧为每日一题（可交互），右侧为 Lichess TV（实时热门对局）。
- **API 依赖**：依赖 Lichess 公开 API (`/api/puzzle/daily`, `/api/tv/channels`)。

## 拟议变更

### 类型定义
#### [MODIFY] [lichess.ts](file:///Users/mac/jscode/chess/src/types/lichess.ts)
- 新增 `LichessPuzzle` 相关接口。
- 新增 `LichessTV` 相关接口。

### API 封装
#### [NEW] [lichess-api.ts](file:///Users/mac/jscode/chess/src/lib/lichess-api.ts)
- 创建（或更新现有）API 工具库，封装 `fetchDailyPuzzle` 和 `fetchTVFeed`。
- *注：如果 `src/lib/lichess.ts` 已存在则复用，否则新建。*

### UI 组件
#### [NEW] [DailyPuzzleCard.tsx](file:///Users/mac/jscode/chess/src/app/components/DailyPuzzleCard.tsx)
- 展示棋盘、题目信息（Rating, Theme）。
- 支持用户在棋盘上走子，验证答案。
- 提供“Analyze”按钮跳转分析页。

#### [NEW] [LichessTVCard.tsx](file:///Users/mac/jscode/chess/src/app/components/LichessTVCard.tsx)
- 展示当前 Lichess TV 热门频道的对局信息（双方选手、Rating）。
- 自动刷新或流式获取棋盘状态。
- 提供“Watch on Lichess”链接。

### 页面集成
#### [MODIFY] [LandingPage.tsx](file:///Users/mac/jscode/chess/src/app/components/LandingPage.tsx)
- 在 Hero Section 下方引入上述两个组件。
- 调整布局以适应响应式设计。

## 验证计划

### 手动验证
1.  **每日一题**：
    - 确认加载是否成功。
    - 尝试走子，验证正确/错误反馈。
    - 点击“Analyze”确认能否携带 PGN/FEN 跳转。
2.  **Lichess TV**：
    - 确认能否显示当前热门对局。
    - 观察棋盘是否随时间更新（或手动刷新有效）。
    - 点击链接确认跳转。
