/**
 * 对局摘要信息
 * 用于 Games Feed 中显示对局卡片
 */
export interface GameSummary {
  /** 对局唯一标识 (SHA-256 hash of PGN headers) */
  id: string;

  // 玩家信息
  /** 白方姓名 */
  white: string;
  /** 黑方姓名 */
  black: string;
  /** 白方 Elo 等级分 (可选) */
  whiteElo?: number;
  /** 黑方 Elo 等级分 (可选) */
  blackElo?: number;

  // 对局结果
  /** 对局结果: 1-0 (白胜), 0-1 (黑胜), 1/2-1/2 (和棋), * (未知) */
  result: "1-0" | "0-1" | "1/2-1/2" | "*";

  // 对局信息
  /** 对局日期 (YYYY.MM.DD 格式) */
  date?: string;
  /** 总手数 */
  moves: number;
  /** 时间控制 (例如: "600+0", "180+2") */
  timeControl?: string;
  /** 比赛场地/网站 */
  site?: string;
  /** 轮次 */
  round?: string;
  /** 结束方式 */
  termination?: string;

  // 开局信息
  /** ECO 开局分类代码 (例如: "C20", "B12") */
  eco?: string;
  /** 开局名称 (例如: "King's Pawn Opening") */
  opening?: string;

  // 文件定位信息 (用于 v2 manifest 方案)
  /** PGN 文件名 */
  file?: string;
  /** 文件偏移量 */
  offset?: number;
  /** PGN 文本长度 */
  length?: number;

  // 派生字段
  /** 分享链接 (/g/:id) */
  shareUrl?: string;
  /** 前 6-10 步 SAN 预览 (v3) */
  previewSan?: string;
}

/**
 * Games Feed 过滤器选项
 */
export interface GamesFilter {
  /** 选择的 PGN 文件 */
  file: string;
  /** 结果过滤: white (白胜), draw (和棋), black (黑胜), all (全部) */
  result: "white" | "draw" | "black" | "all";
  /** 最小 Elo 等级分 (v2) */
  minElo?: number;
  /** 最大 Elo 等级分 (v2) */
  maxElo?: number;
  /** 开始日期 (v2) */
  startDate?: string;
  /** 结束日期 (v2) */
  endDate?: string;
  /** ECO 代码过滤 (v2) */
  eco?: string;
  /** 玩家名称搜索 (v2) */
  player?: string;
}

/**
 * Worker 解析进度信息
 */
export interface ParseProgress {
  /** 当前已解析的对局数量 */
  current: number;
  /** 预估的总对局数量 (可能不准确) */
  total: number;
  /** 是否完成 */
  done: boolean;
}

/**
 * Worker 消息类型
 */
export interface WorkerMessage {
  /** 消息类型 */
  type: "batch" | "progress" | "complete" | "error";
  /** 对局批次数据 (type === "batch" 时) */
  games?: GameSummary[];
  /** 进度信息 (type === "progress" 时) */
  progress?: ParseProgress;
  /** 错误信息 (type === "error" 时) */
  error?: string;
}

/**
 * v2 Manifest 文件格式
 */
export interface GamesManifest {
  /** manifest 版本 */
  version: "v2";
  /** 生成时间 (ISO 格式) */
  generatedAt: string;
  /** 总对局数量 */
  totalGames: number;
  /** 包含的 PGN 文件列表 */
  files: string[];
  /** 对局摘要列表 */
  games: GameSummary[];
}

/**
 * API 响应类型
 */
export interface StreamGamesResponse {
  /** 对局数据流 (ReadableStream) */
  stream: ReadableStream<Uint8Array>;
}

export interface GetManifestResponse {
  /** manifest 数据 */
  manifest: GamesManifest;
}

/**
 * PGN 头信息字段
 * 参考: http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm
 */
export interface PgnHeaders {
  /** 赛事名称 */
  Event?: string;
  /** 比赛地点 */
  Site?: string;
  /** 比赛日期 (YYYY.MM.DD) */
  Date?: string;
  /** 轮次 */
  Round?: string;
  /** 白方姓名 */
  White?: string;
  /** 黑方姓名 */
  Black?: string;
  /** 白方 Elo 等级分 */
  WhiteElo?: string;
  /** 黑方 Elo 等级分 */
  BlackElo?: string;
  /** 白方 USCF 等级分 */
  WhiteUSCF?: string;
  /** 黑方 USCF 等级分 */
  BlackUSCF?: string;
  /** 白方标题 (GM, IM, WGM 等) */
  WhiteTitle?: string;
  /** 黑方标题 (GM, IM, WGM 等) */
  BlackTitle?: string;
  /** 对局结果 */
  Result?: string;
  /** 时间控制 */
  TimeControl?: string;
  /** 结束时间 */
  EndTime?: string;
  /** 结束方式 */
  Termination?: string;
  /** 对局开始时间 */
  StartTime?: string;
  /** 时区 */
  TimeZone?: string;
  /** ECO 开局代码 */
  ECO?: string;
  /** 开局名称 */
  Opening?: string;
  /** 变例 */
  Variation?: string;
  /** 子变例 */
  SubVariation?: string;
  /** 对局类型 */
  EventType?: string;
  /** 组别 */
  Section?: string;
  /** 比赛阶段 */
  Stage?: string;
  /** 对局 board 编号 */
  Board?: string;
  /** 备注 */
  Annotator?: string;
  /** 评分 */
  Score?: string;
  /** 链接 */
  Link?: string;
  /** 赛季 */
  Season?: string;
  /** 比赛年份 */
  Year?: string;
  /** FEN 起始位置 */
  FEN?: string;
  /** 设置 */
  SetUp?: string;
  /** 特殊规则 */
  Variant?: string;
}
