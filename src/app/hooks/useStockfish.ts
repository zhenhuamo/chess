import { useEffect, useMemo, useRef, useState } from 'react';
import { ENGINE_BASE_URL } from '@/src/config/site';
// Cloud eval disabled: local engine only

type WorkerScorePayload =
  | { type: 'cp'; value: number }
  | { type: 'mate'; value: number };

type WorkerInfoMessage = {
  type: 'info';
  payload: {
    depth?: number;
    selDepth?: number;
    timeMs?: number;
    nodes?: number;
    nps?: number;
    multiPv?: number;
    pv?: string;
    score?: WorkerScorePayload;
  };
};

type WorkerAnalysisMessage = {
  type: 'analysis';
  payload: {
    bestMove: string;
    ponder?: string;
    depth?: number;
    pv?: string;
    score?: WorkerScorePayload;
  };
};

type WorkerReadyMessage = { type: 'ready' };

type WorkerErrorMessage = {
  type: 'error';
  message: string;
};

type WorkerLogMessage =
  | { type: 'log'; message: string }
  | { type: 'engine-meta'; message: string };

type WorkerMessage =
  | WorkerReadyMessage
  | WorkerInfoMessage
  | WorkerAnalysisMessage
  | WorkerErrorMessage
  | WorkerLogMessage;

export interface AnalysisResult {
  bestMove: string;
  ponder?: string;
  depth?: number;
  pv?: string;
  score?: number;
  mate?: number;
}

export interface AnalysisInfo {
  depth?: number;
  selDepth?: number;
  timeMs?: number;
  nodes?: number;
  nps?: number;
  multiPv?: number;
  pv?: string;
  score?: number;
  mate?: number;
}

type ExtractedScore = {
  score?: number;
  mate?: number;
};

const DEFAULT_DEPTH = 18;

function extractScore(payload?: WorkerScorePayload): ExtractedScore {
  if (!payload) {
    return {};
  }

  if (payload.type === 'cp') {
    return { score: payload.value };
  }

  return { mate: payload.value };
}

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [info, setInfo] = useState<AnalysisInfo | null>(null);
  const [lines, setLines] = useState<AnalysisInfo[]>([]);
  const [multiPv, setMultiPv] = useState<number>(3);
  const [engineMeta, setEngineMeta] = useState<string | null>(null);
  const [elo, setElo] = useState<number | null>(null);
  const [threads, setThreadsState] = useState<number>(2);
  type EngineVariant = 'sf17'|'sf17-lite'|'sf17-single'|'sf161'|'sf161-lite'|'sf161-single'|'sf16-nnue'|'sf16-nnue-single'|'sf11';
  const [engineVariant, setEngineVariantState] = useState<EngineVariant>('sf17');
  // If true, serve worker/engine assets from same-origin instead of CDN base.
  const [useLocalAssets, setUseLocalAssets] = useState(false);
  const infoRef = useRef<AnalysisInfo | null>(null);
  const linesRef = useRef<Record<number, AnalysisInfo>>({});
  const requestSeqRef = useRef(0);
  const localFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Prefer same-origin classic worker for reliability under COEP/COOP.
    // Only if explicitly needed, we can later add a flag to opt into CDN worker.
    let worker: Worker;
    try {
      worker = new Worker('/engines/stockfish-worker.js', { type: 'classic' });
      setUseLocalAssets(true); // ensure inner engine URLs stay same-origin as well
    } catch (localErr) {
      // Very unlikely, but keep a remote fallback to avoid total failure
      const workerUrl = (() => {
        const base = ENGINE_BASE_URL.endsWith('/') ? ENGINE_BASE_URL : ENGINE_BASE_URL + '/';
        const suffix = 'stockfish-worker.js';
        return base + (base.endsWith('engines/') ? '' : 'engines/') + suffix;
      })();
      try {
        worker = new Worker(workerUrl, { type: 'module' });
        setUseLocalAssets(false);
      } catch (remoteErr) {
        // Surface a visible error and give up
        console.error('[Stockfish] Failed to create both local and remote workers:', (remoteErr as Error)?.message);
        throw remoteErr;
      }
    }

    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      switch (message.type) {
        case 'ready':
          // Add a visible console marker to help Playwright-based validation.
          console.info('Stockfish ready');
          setIsReady(true);
          // Re-apply options when engine restarts
          try {
            if (typeof multiPv === 'number') {
              worker.postMessage({ type: 'setoption', name: 'MultiPV', value: Math.max(1, Math.min(6, multiPv)) });
            }
            if (elo) {
              worker.postMessage({ type: 'setoption', name: 'UCI_LimitStrength', value: true });
              worker.postMessage({ type: 'setoption', name: 'UCI_Elo', value: elo });
            }
            if (threads) {
              worker.postMessage({ type: 'setoption', name: 'Threads', value: Math.max(1, Math.min(32, threads)) });
            }
          } catch {}
          break;
        case 'info': {
          const { score, mate } = extractScore(message.payload.score);
          const nextInfo: AnalysisInfo = {
            depth: message.payload.depth,
            selDepth: message.payload.selDepth,
            timeMs: message.payload.timeMs,
            nodes: message.payload.nodes,
            nps: message.payload.nps,
            multiPv: message.payload.multiPv,
            pv: message.payload.pv,
            score,
            mate,
          };
          // Track multipv lines for UI (PV#1 often omits the 'multipv' token → treat as lane 1)
          const lane = (typeof nextInfo.multiPv === 'number' && nextInfo.multiPv > 0) ? nextInfo.multiPv : 1;
          linesRef.current[lane] = nextInfo;
          const arr = Object.keys(linesRef.current)
            .map((k) => Number(k))
            .sort((a, b) => a - b)
            .map((k) => linesRef.current[k]);
          setLines(arr);
          // Only treat PV#1 as the canonical "current" info for bar/score
          if (!nextInfo.multiPv || nextInfo.multiPv === 1) {
            infoRef.current = nextInfo;
            setInfo(nextInfo);
          }
          break;
        }
        case 'analysis': {
          const { score, mate } = extractScore(message.payload.score);
          const latestInfo = infoRef.current;
          setAnalysis({
            bestMove: message.payload.bestMove,
            ponder: message.payload.ponder,
            depth: message.payload.depth ?? latestInfo?.depth,
            pv: message.payload.pv ?? latestInfo?.pv,
            score,
            mate,
          });
          break;
        }
        case 'engine-meta':
          setEngineMeta(message.message);
          break;
        case 'log':
          // Surface interesting engine logs for debugging.
          if (process.env.NODE_ENV !== 'production') {
            // Use console.info instead of debug so our test harness can capture it.
            console.info('[Stockfish]', message.message);
          }
          break;
        case 'error':
          console.error('Stockfish error:', message.message);
          break;
        default:
          break;
      }
    };

    worker.postMessage({ type: 'init' });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const analyze = (fen: string, depth: number = DEFAULT_DEPTH) => {
    if (!workerRef.current) {
      return;
    }
    // Ensure MultiPV is applied before analysis
    workerRef.current.postMessage({ type: 'setoption', name: 'MultiPV', value: Math.max(1, Math.min(6, multiPv)) });
    if (threads) {
      workerRef.current.postMessage({ type: 'setoption', name: 'Threads', value: Math.max(1, Math.min(32, threads)) });
    }
    linesRef.current = {};
    setLines([]);
    workerRef.current.postMessage({
      type: 'analyze',
      fen,
      depth,
    });
  };

  const stop = () => {
    workerRef.current?.postMessage({ type: 'stop' });
  };

  const setStrengthElo = (value: number) => {
    if (!workerRef.current) return;
    const v = Math.max(1320, Math.min(3190, Math.floor(value)));
    setElo(v);
    workerRef.current.postMessage({ type: 'setoption', name: 'UCI_LimitStrength', value: true });
    workerRef.current.postMessage({ type: 'setoption', name: 'UCI_Elo', value: v });
  };

  const setThreads = (n: number) => {
    const v = Math.max(1, Math.min(32, Math.floor(n)));
    setThreadsState(v);
    workerRef.current?.postMessage({ type: 'setoption', name: 'Threads', value: v });
  };

  const setEngineVariant = (variant: EngineVariant) => {
    setEngineVariantState(variant);
    const sabSupported = ((): boolean => { try { return typeof SharedArrayBuffer !== 'undefined'; } catch { return false; } })();
    const mapPath = (v: EngineVariant): string => {
      // If the worker fell back to same-origin, make the engine URLs
      // same-origin as well to avoid creating a classic cross-origin worker
      // inside the bridge worker. Otherwise, serve from the CDN base.
      if (useLocalAssets) {
        const pLocal = (rel: string) => '/engines/' + rel.replace(/^\/?engines\//, '');
        switch (v) {
          case 'sf17': return sabSupported ? pLocal('stockfish-17/stockfish-17.js') : pLocal('stockfish-17/stockfish-17-single.js');
          case 'sf17-lite': return sabSupported ? pLocal('stockfish-17/stockfish-17-lite.js') : pLocal('stockfish-17/stockfish-17-lite-single.js');
          case 'sf17-single': return pLocal('stockfish-17/stockfish-17-single.js');
          case 'sf161': return sabSupported ? pLocal('stockfish-16.1/stockfish-16.1.js') : pLocal('stockfish-16.1/stockfish-16.1-single.js');
          case 'sf161-lite': return sabSupported ? pLocal('stockfish-16.1/stockfish-16.1-lite.js') : pLocal('stockfish-16.1/stockfish-16.1-lite-single.js');
          case 'sf161-single': return pLocal('stockfish-16.1/stockfish-16.1-single.js');
          case 'sf16-nnue': return sabSupported ? pLocal('stockfish-16/stockfish-nnue-16.js') : pLocal('stockfish-16/stockfish-nnue-16-single.js');
          case 'sf16-nnue-single': return pLocal('stockfish-16/stockfish-nnue-16-single.js');
          case 'sf11': return pLocal('stockfish-11.js');
        }
      }
      const base = ENGINE_BASE_URL.endsWith('/') ? ENGINE_BASE_URL : ENGINE_BASE_URL + '/';
      const p = (rel: string) => base + (base.endsWith('engines/') ? '' : 'engines/') + rel.replace(/^\/?engines\//, '');
      switch (v) {
        case 'sf17': return sabSupported ? p('stockfish-17/stockfish-17.js') : p('stockfish-17/stockfish-17-single.js');
        case 'sf17-lite': return sabSupported ? p('stockfish-17/stockfish-17-lite.js') : p('stockfish-17/stockfish-17-lite-single.js');
        case 'sf17-single': return p('stockfish-17/stockfish-17-single.js');
        case 'sf161': return sabSupported ? p('stockfish-16.1/stockfish-16.1.js') : p('stockfish-16.1/stockfish-16.1-single.js');
        case 'sf161-lite': return sabSupported ? p('stockfish-16.1/stockfish-16.1-lite.js') : p('stockfish-16.1/stockfish-16.1-lite-single.js');
        case 'sf161-single': return p('stockfish-16.1/stockfish-16.1-single.js');
        case 'sf16-nnue': return sabSupported ? p('stockfish-16/stockfish-nnue-16.js') : p('stockfish-16/stockfish-nnue-16-single.js');
        case 'sf16-nnue-single': return p('stockfish-16/stockfish-nnue-16-single.js');
        case 'sf11': return p('stockfish-11.js');
      }
    };
    const path = mapPath(variant);
    setIsReady(false);
    setAnalysis(null);
    setInfo(null);
    setLines([]);
    linesRef.current = {};
    workerRef.current?.postMessage({ type: 'setengine', path });
  };

  const engineLabel = useMemo(() => {
    if (!engineMeta) {
      return null;
    }

    const parts = engineMeta.split(' ');
    return parts.length > 2 ? parts.slice(1).join(' ') : engineMeta;
  }, [engineMeta]);

  // Local-only single-position analysis
  const analyzePreferCloud = async (fen: string, depth: number = DEFAULT_DEPTH, _multiPvOverride?: number) => {
    if (localFallbackTimerRef.current) {
      clearTimeout(localFallbackTimerRef.current);
      localFallbackTimerRef.current = null;
    }
    requestSeqRef.current += 1;
    analyze(fen, depth);
    return { source: 'local' as const };
  };

  return {
    isReady,
    analyze,
    analyzePreferCloud,
    stop,
    analysis,
    info,
    lines,
    multiPv,
    setMultiPv,
    elo,
    setStrengthElo,
    threads,
    setThreads,
    engineVariant,
    setEngineVariant,
    engineLabel,
  };
}
