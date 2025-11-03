"use client";
import { useEffect, useMemo, useState } from "react";

type LightBookNode = { uci: string; weight?: number; name?: string; eco?: string; trap?: boolean; games?: number; wrWhite?: number; wrBlack?: number };
type LightBook = { version: number; source: string; nodes: Record<string, LightBookNode[]> };

const fenTo4 = (fen: string) => fen.split(' ').slice(0,4).join(' ');
const fenTo2 = (fen: string) => fen.split(' ').slice(0,2).join(' ');

export function useLightBook(fen: string) {
  const [book, setBook] = useState<LightBook | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Try curated global book first, then fallback to light.json demo
        let data: LightBook | null = null;
        try {
          const res1 = await fetch('/book/global.curated.v1.json', { cache: 'no-store' });
          if (res1.ok) data = (await res1.json()) as LightBook;
        } catch {}
        if (!data) {
          const res2 = await fetch('/book/light.json', { cache: 'no-store' });
          if (res2.ok) data = (await res2.json()) as LightBook;
        }
        if (!data) throw new Error('No opening book data');
        if (!cancelled) setBook(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load book');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Build a fen2 -> nodes map on the fly by aggregating fen4 groups
  const fen2Map = useMemo(() => {
    if (!book) return {} as Record<string, LightBookNode[]>;
    const map: Record<string, Record<string, LightBookNode>> = {};
    for (const [k, arr] of Object.entries(book.nodes || {})) {
      const key2 = k.split(' ').slice(0,2).join(' ');
      if (!map[key2]) map[key2] = {};
      for (const n of arr) {
        const prev = map[key2][n.uci];
        if (prev) {
          // aggregate weight/games if same move appears under different castling/ep states
          prev.weight = (prev.weight || 0) + (n.weight || 0);
          prev.games = (prev.games || 0) + (n.games || 0);
          // wrWhite/wrBlack: keep weighted average by games when available
          if (typeof n.wrWhite === 'number' && typeof n.games === 'number' && n.games > 0) {
            const gPrev = prev.games || 0;
            const wPrev = typeof prev.wrWhite === 'number' ? prev.wrWhite * gPrev : 0;
            const wNew = n.wrWhite * n.games;
            const gSum = gPrev + n.games;
            if (gSum > 0) prev.wrWhite = (wPrev + wNew) / gSum;
          }
          if (typeof n.wrBlack === 'number' && typeof n.games === 'number' && n.games > 0) {
            const gPrev = prev.games || 0;
            const wPrev = typeof prev.wrBlack === 'number' ? prev.wrBlack * gPrev : 0;
            const wNew = n.wrBlack * n.games;
            const gSum = gPrev + n.games;
            if (gSum > 0) prev.wrBlack = (wPrev + wNew) / gSum;
          }
        } else {
          map[key2][n.uci] = { ...n };
        }
      }
    }
    const out: Record<string, LightBookNode[]> = {};
    for (const [k, byMove] of Object.entries(map)) {
      out[k] = Object.values(byMove);
    }
    return out;
  }, [book]);

  const resolved = useMemo(() => {
    if (!book) return { list: [] as LightBookNode[], matchedBy: undefined as 'fen4' | 'fen2' | undefined };
    const key4 = fenTo4(fen);
    const key2 = fenTo2(fen);
    let list = book.nodes?.[key4];
    let matchedBy: 'fen4' | 'fen2' | undefined = undefined;
    if (list && list.length) {
      matchedBy = 'fen4';
    } else {
      list = fen2Map[key2] || [];
      if (list && list.length) matchedBy = 'fen2';
    }
    const copy = (list || []).slice().sort((a,b) => ((b.weight||0) - (a.weight||0)));
    return { list: copy.slice(0, 3), matchedBy };
  }, [book, fen, fen2Map]);

  return { ready: !!book, error, top: resolved.list, all: book, matchedBy: resolved.matchedBy };
}
