# Chess.com 付费/受限功能与本站替代对比

> 说明：下文基于当前 Chess.com 常见会员分级（Gold/Platinum/Diamond）与公开产品形态的通用认知，实际权益可能变动，请以官方会员页面为准。本项目与 Chess.com 无隶属关系，商标归其所有。

## 1) 高需求但收费/受限（Chess.com）
- 深度引擎复盘（Game Review 深搜 + 多主变 + 错误解释/重试）
  - 免费版常有每日/每局的次数或深度限制；完整解释、重试训练通常需会员。
- 开局库（Opening Explorer/Book：大师库、分级/时控统计、对手倾向）
  - 免费多仅给浅层或“仅限自己对局”的统计；大师库/更大深度通常需会员。
- 习题训练与冲刺（Puzzles、Puzzle Rush/Battle）
  - 免费版次数/模式受限；主题训练与无限冲刺常需会员。
- 高级 Insights（数据洞察）
  - 阶段表现、时控分布、开局收益、失误类型等细粒度图表多为会员权益。
- 无广告与完整内容库（视频/课程/Drills）
  - 免费访问数量受限或带广告；完整课程与去广告为会员项。

## 2) 本站已替代/解决的痛点（本地免费）
- 本地引擎分析：浏览器内运行，无次数限制；可调 Depth 与 MultiPV（1–6）。
- Engine Lines 可操作：
  - 点击 PV 预演前 10 步；
  - 每条 PV 有“只下一步/预演多步”按钮；
  - 键盘 1/2/3 直接下一步对应 PV#1/#2/#3 的首步。
- 关键时刻可视化：图表（Graph）+ Moves 分类（Brilliant/Blunder 等）+ Accuracy/预计等级分。
- 快速载入与隐私：支持加载 Chess.com 对局（公开 API/PGN），分析在本地执行，数据不外传。
- 棋盘辅助：最佳着法箭头、评估条、逐步回放/跳转，与引擎线联动训练。

## 3) 目前缺口与可补齐路线
- 开局库（高需求）
  - 个人库：基于本地保存的对局构建“我的开局统计”（分支胜率/误招热区）。
  - 轻量书/公开库：引入小型本地书或开源数据（注意条款），展示热门着法与胜率。
- 错误重试与讲解（高需求）
  - Retry Mistakes：跳到失误步，仅允许引擎推荐首步或强候选；走错给简短提示。
  - 文本化讲解：基于 PV 差异生成“为什么不行/更好在哪里”的说明（吃亏点、战术主题、子力协调）。
- 训练模式（中高需求）
  - 从最近 N 局自动采样战术跳变位/残局错手位，生成“今日训练 10 题”；支持限时模式模拟 Puzzle Rush 的核心体验。
- 高级 Insights（中需求）
  - 把 Accuracy/分类做成“阶段/类型/时控维度”的聚合图，覆盖会员 Insights 的核心价值。

## 4) 优先级建议（最大化替代付费价值）
1. 开局库 v1：个人库统计 + 轻量开源书（分支胜率/热门着法/典型陷阱），并与 Engine Lines 联动。
2. 错误重试模式：在 Moves 的失误项加“Retry”，限制可走步为 PV#1/强候选，完成后给简要评语。
3. 训练入口：从近期对局采样 tactical/残局位，生成“今日训练 10 题”。
4. Insights v1：分阶段（开/中/终）、按错因（漏战术/弃子误算/协调问题）的聚合图。

## 5) 术语与提示
- PV（Principal Variation）：引擎主变线。多主变（MultiPV）用于比较替代强招。
- cp：评估分（centipawn）；M 表示将死步数。
- 本地分析优势：不限量、隐私好、交互自由；但受设备性能和浏览器环境影响。

---
最后更新：2025-11-01
文件维护者：内部文档（可在 PR 中直接更新此清单）

## 6) 用户需求导向的优化路线（草案）现在我

- 分享/嵌入闭环（优先级：高｜工作量：S–M）
  - [已完成] 分享弹窗改为 Popover + Snackbar，提供“复制链接/PGN/Embed”，并支持移动端 System Share（Web Share）；路径：`src/sections/analysis/panelToolbar/shareButton.tsx`。
  - [已完成] Embed 可配置：theme/auto/speed/width/height，一键生成 iframe 代码；路径：同上。
  - [已完成] 深链步数：/g/<id>?ply=N 打开定位到第 N 步；路径：`src/app/g/page.tsx`。
  - [已完成] OG 分享图高亮最后一步（起止两格 + 箭头）；路径：`functions/g/[id]/opengraph-image.ts`。
  - 后续可选优化：/g 页面内也提供可配置的 Embed 选项（与工具栏 Popover 一致）。

- 训练模式 v1（优先级：高｜工作量：M）
  - “今日 10 题”：从本地最近对局抽取 Inaccuracy/Mistake/Blunder 位，限时计分，错题重练。
  - 新增 /train 页面（纯前端，复用现有引擎线与分类）。

- 错误解释（优先级：高｜工作量：S–M）
  - 基于 PV 差异/子力损失/吃回漏算生成“一句话解释”，在 Moves 列表行右侧展示可展开说明。
  - 涉及：`src/lib/engine/helpers/moveClassification.ts`、`src/sections/analysis/panelBody/movesTab/`。

- 开局库可操作（优先级：中高｜工作量：M）
  - 公开书：显示热门着法、胜率、陷阱标识（trap）；一键加入训练队列。
  - 个人库：并排显示 Mine% vs Global%，条形图可视化；重建进度与按钮反馈。
  - 涉及：`src/hooks/useLightBook.ts`、`src/hooks/usePersonalOpeningBook.ts`、`src/sections/analysis/panelBody/openingsPanel/`。

- Insights v1（优先级：中｜工作量：M）
  - 分阶段（开/中/终）与错因分布的聚合卡片；以 Recharts 实现，轻量可读。

- 运维/隐私（优先级：中｜工作量：S）
  - 分享删除：POST 返回 deleteToken，支持 DELETE /api/g/:id。
  - 软限流与观测：每 IP 大额度限流开关 + 日志/告警接入。

备注
- 上述均为“本地优先/同域 API”的轻量实现路径，保持零后端运维为前提。
- 具体排期可按“分享闭环 → 训练 → 解释 → 开局库 → Insights → 运维”的顺序推进。
