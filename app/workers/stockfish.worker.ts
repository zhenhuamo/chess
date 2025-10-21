// stockfish.worker.ts
// Simplified worker - will be replaced with actual Stockfish implementation

let analysisInProgress = false;

self.onmessage = async (event: MessageEvent) => {
  const { type, fen, depth } = event.data;

  try {
    if (type === 'init') {
      // Initialize (placeholder)
      self.postMessage({ type: 'ready' });
    } else if (type === 'analyze') {
      if (analysisInProgress) {
        return;
      }

      analysisInProgress = true;

      // Simple mock analysis for now
      // In production, this will use actual Stockfish.js
      self.postMessage({
        type: 'info',
        score: 25,
        pv: 'e2e4 c7c5',
        depth: '1',
      });

      // Simulate analysis completion
      setTimeout(() => {
        self.postMessage({
          type: 'analysis',
          bestMove: 'e2e4',
          score: 25,
          pv: 'e2e4 c7c5',
          depth,
        });
        analysisInProgress = false;
      }, 1000);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    analysisInProgress = false;
  }
};
