import { useEffect, useRef, useState } from 'react';

interface AnalysisResult {
  bestMove: string;
  score: number;
  pv: string;
  depth: number;
}

interface AnalysisInfo {
  score: number;
  pv: string;
  depth: string;
}

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [info, setInfo] = useState<AnalysisInfo | null>(null);

  useEffect(() => {
    // Initialize worker
    if (typeof window !== 'undefined') {
      workerRef.current = new Worker(
        new URL('../workers/stockfish.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event) => {
        const { type, ...data } = event.data;

        if (type === 'ready') {
          setIsReady(true);
        } else if (type === 'analysis') {
          setAnalysis(data as AnalysisResult);
        } else if (type === 'info') {
          setInfo(data as AnalysisInfo);
        } else if (type === 'error') {
          console.error('Stockfish error:', data.message);
        }
      };

      workerRef.current.postMessage({ type: 'init' });
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const analyze = (fen: string, depth: number = 15) => {
    if (isReady && workerRef.current) {
      workerRef.current.postMessage({ type: 'analyze', fen, depth });
    }
  };

  return {
    isReady,
    analyze,
    analysis,
    info,
  };
}
