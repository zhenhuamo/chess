import { Chess } from "chess.js";
import type { Game } from "@/src/types/game";

export type Fen4 = string; // piece/side/castling/ep

export interface PersonalMoveStat {
  uci: string;
  count: number;
  successSum: number; // 1 for win (mover), 0.5 draw, 0 loss
}

export type PersonalBookIndex = Record<Fen4, Record<string, PersonalMoveStat>>;

// In‑memory cache for the session; v1 keeps it simple
let CACHE: PersonalBookIndex | null = null;

export const fenToFen4 = (fen: string): Fen4 => fen.split(" ").slice(0, 4).join(" ");

const resultToScore = (result?: string): { white: number; black: number } => {
  switch (result) {
    case "1-0":
      return { white: 1, black: 0 };
    case "0-1":
      return { white: 0, black: 1 };
    case "1/2-1/2":
      return { white: 0.5, black: 0.5 };
    default:
      return { white: 0.5, black: 0.5 }; // treat unknown as draw-ish
  }
};

export async function buildPersonalBookIndex(games: Game[], maxPlies = 12): Promise<PersonalBookIndex> {
  const index: PersonalBookIndex = {};

  for (const g of games) {
    if (!g?.pgn) continue;
    const chess = new Chess();
    try { chess.loadPgn(g.pgn); } catch { continue; }
    const verbose = chess.history({ verbose: true }) as Array<{ from: string; to: string; promotion?: string; before?: string; after?: string }>;
    const resScore = resultToScore((g as any)?.result || chess.getHeaders()?.Result);

    // Re-simulate to collect FEN before each move (up to maxPlies)
    const sim = new Chess();
    const startFen: string | undefined = (chess as any).getHeaders?.()?.FEN;
    if (startFen) { try { sim.load(startFen); } catch {} }

    for (let i = 0; i < verbose.length && i < maxPlies; i++) {
      const mv = verbose[i];
      const fen4 = fenToFen4(sim.fen());
      const uci = mv.from + mv.to + (mv.promotion || "");
      const mover = sim.turn(); // 'w' or 'b' BEFORE the move

      // update stats
      const bucket = (index[fen4] ||= {});
      const stat = (bucket[uci] ||= { uci, count: 0, successSum: 0 });
      stat.count += 1;
      stat.successSum += mover === 'w' ? resScore.white : resScore.black;

      try { sim.move({ from: mv.from as any, to: mv.to as any, promotion: mv.promotion as any }); } catch { break; }
    }
  }

  CACHE = index;
  return index;
}

export function getPersonalBookIndex(): PersonalBookIndex | null { return CACHE; }

export function getTopPersonalMoves(fen: string, opts?: { topK?: number; minSamplesForWinRate?: number }) {
  const idx = CACHE;
  if (!idx) return [] as Array<{ uci: string; count: number; winRate?: number }>;
  const fen4 = fenToFen4(fen);
  const bucket = idx[fen4];
  if (!bucket) return [];
  const minN = opts?.minSamplesForWinRate ?? 10;
  const arr = Object.values(bucket).map((s) => ({ uci: s.uci, count: s.count, winRate: s.count >= minN ? (s.successSum / s.count) : undefined }));
  // sort: primary by winRate (if both defined), else by count desc
  arr.sort((a, b) => {
    if (typeof a.winRate === 'number' && typeof b.winRate === 'number') {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return (b.count - a.count);
    }
    if (typeof a.winRate === 'number') return -1;
    if (typeof b.winRate === 'number') return 1;
    return (b.count - a.count);
  });
  const k = opts?.topK ?? 3;
  return arr.slice(0, k);
}

// Helper to rebuild from IndexedDB directly (used by UI button)
export async function rebuildPersonalBookFromDb(maxPlies = 16): Promise<PersonalBookIndex> {
  const { openDB } = await import('idb');
  const db = await openDB<any>('games', 1, { upgrade(db) { if (!db.objectStoreNames.contains('games')) { db.createObjectStore('games', { keyPath: 'id', autoIncrement: true }); } } });
  const games = (await db.getAll('games')) as Game[];
  return buildPersonalBookIndex(games, maxPlies);
}

export function getPersonalMoveStat(fen: string, uci: string, opts?: { minSamplesForWinRate?: number }): { count: number; winRate?: number } | null {
  const idx = CACHE;
  if (!idx) return null;
  const fen4 = fenToFen4(fen);
  const bucket = idx[fen4];
  if (!bucket) return null;
  const stat = bucket[uci];
  if (!stat) return null;
  const minN = opts?.minSamplesForWinRate ?? 10;
  return { count: stat.count, winRate: stat.count >= minN ? (stat.successSum / stat.count) : undefined };
}
