export type EngineVariant =
  | 'sf17'
  | 'sf17-lite'
  | 'sf17-single'
  | 'sf161'
  | 'sf161-lite'
  | 'sf161-single'
  | 'sf16-nnue'
  | 'sf16-nnue-single'
  | 'sf11';

export const ENGINE_VARIANTS: EngineVariant[] = [
  'sf17',
  'sf17-lite',
  'sf17-single',
  'sf161',
  'sf161-lite',
  'sf161-single',
  'sf16-nnue',
  'sf16-nnue-single',
  'sf11',
];

export function describeEngineVariant(variant: EngineVariant): string {
  switch (variant) {
    case 'sf17':
      return 'Stockfish 17 (multi-thread)';
    case 'sf17-lite':
      return 'Stockfish 17 Lite';
    case 'sf17-single':
      return 'Stockfish 17 (single thread)';
    case 'sf161':
      return 'Stockfish 16.1';
    case 'sf161-lite':
      return 'Stockfish 16.1 Lite';
    case 'sf161-single':
      return 'Stockfish 16.1 (single thread)';
    case 'sf16-nnue':
      return 'Stockfish 16 NNUE';
    case 'sf16-nnue-single':
      return 'Stockfish 16 NNUE (single thread)';
    case 'sf11':
      return 'Stockfish 11 (legacy)';
    default:
      return variant;
  }
}

export type EngineWorker = {
  isReady: boolean;
  uci: (command: string) => void;
  listen: (data: string) => void;
  terminate: () => void;
};

export type WorkerJob = {
  commands: string[];
  finalMessage: string;
  resolve: (messages: string[]) => void;
  onNewMessage?: (messages: string[]) => void;
};
