// Lightweight localStorage cache for FEN -> eval lines (cloud/local), with TTL.
// Non-UI utility, safe to call in client components.

export type CachedLine = { pv: string[]; cp?: number; mate?: number; depth: number; multiPv: number };
export type CachedEval = { bestMove?: string; lines: CachedLine[]; date: string; source: 'cloud' | 'local' };

const KEY_PREFIX = 'fen-eval-v1:'; // bump when changing shape
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const now = () => Date.now();

function makeKey(fen: string, multiPv: number) {
  return `${KEY_PREFIX}${encodeURIComponent(fen)}|${multiPv}`;
}

export function getCachedEval(fen: string, multiPv: number, ttlMs: number = DEFAULT_TTL_MS): CachedEval | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(makeKey(fen, multiPv));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value: CachedEval; ts: number };
    if (!parsed || !parsed.value || !parsed.ts) return null;
    if (now() - parsed.ts > ttlMs) {
      localStorage.removeItem(makeKey(fen, multiPv));
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function setCachedEval(fen: string, multiPv: number, value: CachedEval) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(makeKey(fen, multiPv), JSON.stringify({ ts: now(), value }));
  } catch {
    // ignore quota errors
  }
}

