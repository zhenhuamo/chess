"use client";
import { useEffect, useState } from "react";

export const useScreenSize = () => {
  const [size, setSize] = useState({ width: 1024, height: 768 });
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
};

