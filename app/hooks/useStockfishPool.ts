'use client';

// Lightweight local Stockfish worker pool for concurrent single-position analysis.
// Intended to accelerate full-game analysis when cloud eval is missing/too shallow.

export type EngineVariant = 'sf17'|'sf17-lite'|'sf17-single'|'sf161'|'sf161-lite'|'sf161-single'|'sf16-nnue'|'sf16-nnue-single'|'sf11';

type WorkerScorePayload =
  | { type: 'cp'; value: number }
  | { type: 'mate'; value: number };

type WorkerInfoMessage = {
  type: 'info';
  payload: {
    depth?: number;
    multiPv?: number;
    pv?: string;
    score?: WorkerScorePayload;
    mate?: number; // compatibility
  };
};
type WorkerAnalysisMessage = { type: 'analysis'; payload: { bestMove: string; depth?: number; pv?: string; score?: WorkerScorePayload } };
type WorkerReadyMessage = { type: 'ready' };
type WorkerLogMessage = { type: 'log'|'engine-meta'; message: string };
type WorkerErrorMessage = { type: 'error'; message: string };
type WorkerMessage = WorkerReadyMessage | WorkerInfoMessage | WorkerAnalysisMessage | WorkerLogMessage | WorkerErrorMessage;

export interface PoolPositionLine { pv: string[]; depth: number; multiPv: number; cp?: number; mate?: number }
export interface PoolPositionEval { lines: PoolPositionLine[]; bestMove?: string }

function mapVariantToPath(variant: EngineVariant): string {
  const sabSupported = (()=>{ try { return typeof SharedArrayBuffer !== 'undefined'; } catch { return false; } })();
  switch (variant) {
    case 'sf17': return sabSupported ? '/engines/stockfish-17/stockfish-17.js' : '/engines/stockfish-17/stockfish-17-single.js';
    case 'sf17-lite': return sabSupported ? '/engines/stockfish-17/stockfish-17-lite.js' : '/engines/stockfish-17/stockfish-17-lite-single.js';
    case 'sf17-single': return '/engines/stockfish-17/stockfish-17-single.js';
    case 'sf161': return sabSupported ? '/engines/stockfish-16.1/stockfish-16.1.js' : '/engines/stockfish-16.1/stockfish-16.1-single.js';
    case 'sf161-lite': return sabSupported ? '/engines/stockfish-16.1/stockfish-16.1-lite.js' : '/engines/stockfish-16.1/stockfish-16.1-lite-single.js';
    case 'sf161-single': return '/engines/stockfish-16.1/stockfish-16.1-single.js';
    case 'sf16-nnue': return sabSupported ? '/engines/stockfish-16/stockfish-nnue-16.js' : '/engines/stockfish-16/stockfish-nnue-16-single.js';
    case 'sf16-nnue-single': return '/engines/stockfish-16/stockfish-nnue-16-single.js';
    case 'sf11': return '/engines/stockfish-11.js';
  }
}

function extractScore(payload?: WorkerScorePayload): { cp?: number; mate?: number } {
  if (!payload) return {};
  if ((payload as any).type === 'cp') return { cp: (payload as any).value };
  return { mate: (payload as any).value };
}

async function initWorker(variant: EngineVariant, mpv: number, threads: number): Promise<Worker> {
  const w = new Worker('/engines/stockfish-worker.js', { type: 'classic' });
  await new Promise<void>((resolve) => {
    w.onmessage = (e: MessageEvent<WorkerMessage>) => {
      if (e.data.type === 'ready') resolve();
    };
    w.postMessage({ type: 'init' });
  });
  const path = mapVariantToPath(variant);
  w.postMessage({ type: 'setengine', path });
  // Wait a tick for engine to switch; not strictly required
  w.postMessage({ type: 'setoption', name: 'MultiPV', value: Math.max(1, Math.min(6, mpv)) });
  w.postMessage({ type: 'setoption', name: 'Threads', value: Math.max(1, Math.min(32, threads)) });
  return w;
}

async function analyzeFenWithWorker(w: Worker, fen: string, depth: number, mpv: number, timeoutMs = 30000): Promise<PoolPositionEval> {
  let resolveFn: (v: PoolPositionEval) => void = ()=>{};
  let rejectFn: (e: any) => void = ()=>{};
  const p = new Promise<PoolPositionEval>((resolve, reject) => { resolveFn = resolve; rejectFn = reject; });
  const timer = setTimeout(() => {
    try { w.postMessage({ type: 'stop' }); } catch {}
    rejectFn(new Error('engine timeout'));
  }, timeoutMs);

  const lines: Record<number, PoolPositionLine> = {};

  const handler = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;
    if (msg.type === 'info') {
      const { depth: d, multiPv, pv, score } = msg.payload;
      // PV#1 often omits the 'multipv 1' token in Stockfish output → default to lane 1
      const lane = (typeof multiPv === 'number' && multiPv > 0) ? multiPv : 1;
      const { cp, mate } = extractScore(score);
      lines[lane] = {
        pv: (pv || '').split(' ').filter(Boolean),
        depth: d || lines[lane]?.depth || 0,
        multiPv: lane,
        cp, mate,
      };
    } else if (msg.type === 'analysis') {
      clearTimeout(timer);
      w.removeEventListener('message', handler as any);
      const arr = Object.keys(lines).map(k => Number(k)).sort((a,b)=>a-b).map(k => lines[k]);
      resolveFn({ lines: arr, bestMove: msg.payload.bestMove });
    }
  };
  w.addEventListener('message', handler as any);
  try {
    w.postMessage({ type: 'setoption', name: 'MultiPV', value: Math.max(1, Math.min(6, mpv)) });
    w.postMessage({ type: 'analyze', fen, depth });
  } catch (e) {
    clearTimeout(timer);
    w.removeEventListener('message', handler as any);
    rejectFn(e);
  }

  return p.finally(() => {
    try { w.postMessage({ type: 'stop' }); } catch {}
  });
}

export function useStockfishPool() {
  let pool: Worker[] = [];
  let currentVariant: EngineVariant = 'sf17-lite';
  let currentThreads = 1;
  let currentMpv = 3;

  const ensurePool = async (workers: number, variant: EngineVariant, threadsPerWorker: number, mpv: number) => {
    const needRebuild = pool.length !== workers || currentVariant !== variant || currentThreads !== threadsPerWorker || currentMpv !== mpv;
    if (!needRebuild) return pool;
    // Terminate old
    pool.forEach(w => { try { w.terminate(); } catch {} });
    pool = [];
    currentVariant = variant; currentThreads = threadsPerWorker; currentMpv = mpv;
    for (let i=0;i<workers;i++) {
      // eslint-disable-next-line no-await-in-loop
      const w = await initWorker(variant, mpv, threadsPerWorker);
      pool.push(w);
    }
    return pool;
  };

  const evaluateFensLocal = async (fens: string[], opts: { depth: number; mpv: number; workers: number; threadsPerWorker?: number; variant?: EngineVariant; onProgress?: (done: number)=>void }) => {
    const workers = Math.max(1, Math.min(8, opts.workers));
    const variant = opts.variant || currentVariant || 'sf17-lite';
    const threadsPerWorker = Math.max(1, Math.min(32, opts.threadsPerWorker ?? 1));
    const mpv = Math.max(1, Math.min(6, opts.mpv));
    await ensurePool(workers, variant, threadsPerWorker, mpv);

    const results: PoolPositionEval[] = new Array(fens.length);
    let completed = 0; const nextIndexRef = { value: 0 };
    const runOne = async (w: Worker) => {
      while (true) {
        const i = nextIndexRef.value++; if (i >= fens.length) return;
        try {
          const res = await analyzeFenWithWorker(w, fens[i], opts.depth, mpv);
          results[i] = res;
        } catch {
          results[i] = { lines: [] };
        } finally {
          completed++; opts.onProgress?.(completed);
        }
      }
    };

    await Promise.all(pool.slice(0, workers).map(w => runOne(w)));
    return results;
  };

  const shutdown = () => { pool.forEach(w=>{ try { w.terminate(); } catch{} }); pool = []; };

  return { evaluateFensLocal, shutdown };
}
