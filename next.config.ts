import type { NextConfig } from "next";
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';
import createMDX from '@next/mdx';

const withMDX = createMDX({ extension: /\.mdx?$/ });

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cacle.chess-analysis.org',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  pageExtensions: ['ts', 'tsx', 'mdx'],
  // Enable cross-origin isolation (COOP/COEP) only when explicitly enabled.
  // In local dev we default to disabling these headers so that a remote
  // cross-origin module Worker (on cacle.chess-analysis.org) can be loaded via
  // CORS without requiring the worker response to also send COEP.
  // This means SAB/multithreaded WASM will be unavailable in dev, but remote
  // assets can still be used. In production, turn this on by setting
  // ENABLE_COEP=1 in the environment (or remove the guard below).
  async headers() {
    const enableCOI = process.env.ENABLE_COEP === '1' || process.env.NODE_ENV === 'production';
    const headers = [];

    if (enableCOI) {
      headers.push({
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      });
    }

    // Add CORP header for local API proxy to satisfy COEP
    if (process.env.NODE_ENV === 'development') {
      headers.push({
        source: '/api/explore/:path*',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      });
    }

    return headers;
  },
  // 仅本地开发提供 /g/:id -> /g 的重写，方便 dev 访问；导出模式不会生效
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        { source: '/g/:path*', destination: '/g' },
        { source: '/api/explore/lichess', destination: 'https://explorer.lichess.ovh/lichess' },
        { source: '/api/explore/masters', destination: 'https://explorer.lichess.ovh/masters' },
      ];
    }
    return [];
  },
};

export default async function config() {
  if (process.env.NODE_ENV === 'development') {
    await setupDevPlatform({ remote: true, persist: true });
  }
  return withMDX(nextConfig);
}
