"use client";
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { boardHueAtom, pieceSetAtom, boardThemeAtom } from './states';

// Loads saved appearance from localStorage once on app start.
export default function AppearanceBootstrap() {
  const setPiece = useSetAtom(pieceSetAtom);
  const setHue = useSetAtom(boardHueAtom);
  const setTheme = useSetAtom(boardThemeAtom);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('appearance');
      if (!raw) return;
      const obj = JSON.parse(raw || '{}');
      if (obj?.pieceSet) setPiece(String(obj.pieceSet));
      if (Number.isFinite(obj?.boardHue)) setHue(Number(obj.boardHue));
      if (obj?.boardTheme) setTheme(String(obj.boardTheme));
    } catch {}
  }, [setPiece, setHue, setTheme]);
  return null;
}
