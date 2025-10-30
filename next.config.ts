import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Static export cannot use next/image optimization. Disable it to avoid runtime error.
  images: { unoptimized: true },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable cross-origin isolation (COOP/COEP) only when explicitly enabled.
  // In local dev we default to disabling these headers so that a remote
  // cross-origin module Worker (on cacle.chess-analysis.org) can be loaded via
  // CORS without requiring the worker response to also send COEP.
  // This means SAB/multithreaded WASM will be unavailable in dev, but remote
  // assets can still be used. In production, turn this on by setting
  // ENABLE_COEP=1 in the environment (or remove the guard below).
  async headers() {
    const enableCOI = process.env.ENABLE_COEP === '1' || process.env.NODE_ENV === 'production';
    if (!enableCOI) return [];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

export default nextConfig;
