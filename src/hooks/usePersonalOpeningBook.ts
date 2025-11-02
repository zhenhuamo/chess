"use client";
import { useEffect, useMemo, useState } from "react";
import { openDB } from "idb";
import type { Game } from "@/src/types/game";
import { buildPersonalBookIndex, getPersonalBookIndex, getTopPersonalMoves } from "@/src/services/personalBook";

export function usePersonalOpeningBook(fen: string, rebuildKey?: number) {
  const [ready, setReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (getPersonalBookIndex() && rebuildKey === undefined) { setReady(true); return; }
        const db = await openDB<any>('games', 1, { upgrade(db) { if (!db.objectStoreNames.contains('games')) { db.createObjectStore('games', { keyPath: 'id', autoIncrement: true }); } } });
        const games = (await db.getAll('games')) as Game[];
        await buildPersonalBookIndex(games, 16);
        if (!cancelled) setReady(true);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to build personal opening book');
      }
    })();
    return () => { cancelled = true; };
  }, [rebuildKey]);

  const topMoves = useMemo(() => {
    if (!ready) return [] as Array<{ uci: string; count: number; winRate?: number }>;
    return getTopPersonalMoves(fen, { topK: 3, minSamplesForWinRate: 10 });
  }, [fen, ready]);

  return { ready, error, topMoves };
}
