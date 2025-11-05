import { atom } from "jotai";

export const pieceSetAtom = atom<string>("chicago");
export const boardHueAtom = atom<number>(0);
// Visual theme for board wrapper (beyond hue rotation). Used to style container.
export const boardThemeAtom = atom<string>("classic");
