'use client';

import { useEffect, useState } from 'react';

const DEFAULT_SIZE = 416;
const MIN_SIZE = 260;

const computeSize = () => {
  if (typeof window === 'undefined') return DEFAULT_SIZE;
  const width = window.innerWidth;
  const height = window.innerHeight;

  let target = width - 32;

  if (width >= 1600) {
    target = Math.min(720, height * 0.8);
  } else if (width >= 1280) {
    target = Math.min(660, height * 0.78);
  } else if (width >= 1024) {
    target = Math.min(600, height * 0.75);
  } else if (width >= 768) {
    target = Math.min(520, height * 0.72);
  } else {
    target = Math.min(width - 24, height * 0.62);
  }

  const rounded = Math.round(target / 8) * 8;
  return Math.max(MIN_SIZE, rounded);
};

export function useResponsiveBoardSize() {
  const [size, setSize] = useState<number>(DEFAULT_SIZE);

  useEffect(() => {
    const handler = () => setSize(computeSize());
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return size;
}
