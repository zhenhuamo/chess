import { isWasmSupported } from "@/src/lib/engine/shared";
import { Stockfish11 } from "@/src/lib/engine/stockfish11";
import { Stockfish16 } from "@/src/lib/engine/stockfish16";
import { Stockfish16_1 } from "@/src/lib/engine/stockfish16_1";
import { Stockfish17 } from "@/src/lib/engine/stockfish17";
import { UciEngine } from "@/src/lib/engine/uciEngine";
import { EngineName } from "@/src/types/enums";
import { useEffect, useState } from "react";

export const useEngine = (engineName: EngineName | undefined) => {
  const [engine, setEngine] = useState<UciEngine | null>(null);

  useEffect(() => {
    if (!engineName) return;

    if (engineName !== EngineName.Stockfish11 && !isWasmSupported()) {
      return;
    }

    pickEngine(engineName).then((newEngine) => {
      setEngine((prev) => {
        prev?.shutdown();
        return newEngine;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineName]);

  return engine;
};

const pickEngine = (engine: EngineName): Promise<UciEngine> => {
  switch (engine) {
    case EngineName.Stockfish17:
      return Stockfish17.create(false);
    case EngineName.Stockfish17Lite:
      return Stockfish17.create(true);
    case EngineName.Stockfish16_1:
      return Stockfish16_1.create(false);
    case EngineName.Stockfish16_1Lite:
      return Stockfish16_1.create(true);
    case EngineName.Stockfish16:
      return Stockfish16.create(false);
    case EngineName.Stockfish16NNUE:
      return Stockfish16.create(true);
    case EngineName.Stockfish11:
      return Stockfish11.create();
  }
};

