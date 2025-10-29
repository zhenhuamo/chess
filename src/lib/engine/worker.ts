import { EngineWorker } from "@/types/engine";
import { ENGINE_BASE_URL } from "@/src/config/site";
import { isIosDevice, isMobileDevice } from "./shared";

const REMOTE_ONLY = (process.env.NEXT_PUBLIC_ENGINE_REMOTE_ONLY || "") === "1";

// Resolve engine worker URL against a configurable base. When enginePath is
// relative (e.g. "engines/stockfish-17/stockfish-17.js"), it is joined with
// ENGINE_BASE_URL so we can host heavy assets on R2/CDN. Absolute URLs are
// used as-is.
const resolveEngineUrl = (enginePath: string): string => {
  if (!enginePath) return enginePath;
  if (enginePath.startsWith("/")) {
    return enginePath;
  }
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
  const primaryUrl = resolveEngineUrl(enginePath);
  let worker: Worker | null = null;
  let blobUrl: string | null = null;
  let lastError: unknown;

  const isCrossOrigin = (url: string): boolean => {
    try {
      if (typeof window === "undefined") return false;
      const resolved = new URL(url, window.location.href);
      return resolved.origin !== window.location.origin;
    } catch {
      return false;
    }
  };

  const toSameOriginPath = (path: string): string => {
    if (!path) return path;
    if (path.startsWith("/")) return path;
    try {
      const url = new URL(path, typeof window !== "undefined" ? window.location.href : "http://localhost/");
      const idx = url.pathname.indexOf("/engines/");
      const pathname =
        idx >= 0 ? url.pathname.slice(idx) : url.pathname.startsWith("/") ? url.pathname : `/${url.pathname}`;
      return `${pathname}${url.search || ""}`;
    } catch {
      const stripped = path.replace(/^https?:\/\/[^/]+/i, "");
      const idx = stripped.indexOf("/engines/");
      const rel = idx >= 0 ? stripped.slice(idx) : stripped;
      return rel.startsWith("/") ? rel : `/${rel.replace(/^\/+/, "")}`;
    }
  };

  const tryCreateWorker = (url: string): boolean => {
    try {
      worker = new window.Worker(url);
      return true;
    } catch (err) {
      lastError = err;
      return false;
    }
  };

  const tryCreateWrappedWorker = (url: string): boolean => {
    try {
      const baseDir = (() => {
        try {
          const u = new URL(url, typeof window !== "undefined" ? window.location.href : "http://localhost/");
          const idx = u.pathname.lastIndexOf("/");
          return `${u.origin}${u.pathname.slice(0, idx + 1)}`;
        } catch {
          return "";
        }
      })();
      const bootstrap = [
        baseDir ? `self.ht=${JSON.stringify(baseDir)};` : "",
        `try{importScripts(${JSON.stringify(url)});}catch(e){self.postMessage(String(e));throw e;}`
      ].join("");
      const blob = new Blob([bootstrap], { type: "application/javascript" });
      blobUrl = URL.createObjectURL(blob);
      worker = new window.Worker(blobUrl);
      return true;
    } catch (err) {
      lastError = err;
      if (blobUrl) {
        try { URL.revokeObjectURL(blobUrl); } catch {}
        blobUrl = null;
      }
      return false;
    }
  };

  const primarySucceeded = tryCreateWorker(primaryUrl);

  if (!primarySucceeded) {
    const primaryCrossOrigin = isCrossOrigin(primaryUrl);
    if (!REMOTE_ONLY && primaryCrossOrigin) {
      const localPath = toSameOriginPath(enginePath);
      if (localPath && localPath !== primaryUrl) {
        console.warn(`[Stockfish] Cross-origin worker blocked. Falling back to same-origin asset: ${localPath}`);
        if (!tryCreateWorker(localPath)) {
          // As a last resort, wrap the remote asset via importScripts bootstrap.
          if (!tryCreateWrappedWorker(primaryUrl)) {
            throw lastError instanceof Error
              ? lastError
              : new Error(`Failed to start engine worker from ${primaryUrl}`);
          }
        }
      } else if (!tryCreateWrappedWorker(primaryUrl)) {
        throw lastError instanceof Error
          ? lastError
          : new Error(`Failed to start engine worker from ${primaryUrl}`);
      }
    } else if (!tryCreateWrappedWorker(primaryUrl)) {
      throw lastError instanceof Error
        ? lastError
        : new Error(`Failed to start engine worker from ${primaryUrl}`);
    }
  }

  if (!worker) {
    throw lastError instanceof Error ? lastError : new Error("Failed to create Stockfish worker");
  }

  const activeWorker = worker as Worker;

  const engineWorker: EngineWorker = {
    isReady: false,
    uci: (command: string) => activeWorker.postMessage(command),
    listen: () => null,
    terminate: () => {
      try {
        activeWorker.terminate();
      } finally {
        if (blobUrl) {
          try { URL.revokeObjectURL(blobUrl); } catch {}
          blobUrl = null;
        }
      }
    },
  };

  activeWorker.onmessage = (event) => {
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
