import { EngineWorker } from "@/types/engine";
import { ENGINE_BASE_URL } from "@/src/config/site";
import { isIosDevice, isMobileDevice } from "./shared";

// Resolve engine worker URL against a configurable base. When enginePath is
// relative (e.g. "engines/stockfish-17/stockfish-17.js"), it is joined with
// ENGINE_BASE_URL so we can host heavy assets on R2/CDN. Absolute URLs are
// used as-is.
const resolveEngineUrl = (enginePath: string): string => {
  try {
    // Absolute URL
    new URL(enginePath);
    return enginePath;
  } catch {}
  const path = enginePath.replace(/^\/+/, '');
  const base = ENGINE_BASE_URL.endsWith('/') ? ENGINE_BASE_URL : ENGINE_BASE_URL + '/';
  return base + path.replace(/^engines\//, '');
};

export const getEngineWorker = (enginePath: string): EngineWorker => {
  console.log(`Creating worker from ${enginePath}`);
  const url = resolveEngineUrl(enginePath);
  const worker = new window.Worker(url);

  const engineWorker: EngineWorker = {
    isReady: false,
    uci: (command: string) => worker.postMessage(command),
    listen: () => null,
    terminate: () => worker.terminate(),
  };

  worker.onmessage = (event) => {
    engineWorker.listen(event.data);
  };

  return engineWorker;
};

export const sendCommandsToWorker = (
  worker: EngineWorker,
  commands: string[],
  finalMessage: string,
  onNewMessage?: (messages: string[]) => void
): Promise<string[]> => {
  return new Promise((resolve) => {
    const messages: string[] = [];

    worker.listen = (data) => {
      messages.push(data);
      onNewMessage?.(messages);

      if (data.startsWith(finalMessage)) {
        resolve(messages);
      }
    };

    for (const command of commands) {
      worker.uci(command);
    }
  });
};

export const getRecommendedWorkersNb = (): number => {
  const maxWorkersNbFromThreads = Math.max(
    1,
    Math.round(navigator.hardwareConcurrency - 4),
    Math.floor((navigator.hardwareConcurrency * 2) / 3)
  );

  const maxWorkersNbFromMemory =
    "deviceMemory" in navigator && typeof navigator.deviceMemory === "number"
      ? Math.max(1, Math.round(navigator.deviceMemory))
      : 4;

  const maxWorkersNbFromDevice = isIosDevice() ? 2 : isMobileDevice() ? 4 : 8;

  return Math.min(
    maxWorkersNbFromThreads,
    maxWorkersNbFromMemory,
    maxWorkersNbFromDevice
  );
};
