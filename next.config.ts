import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable cross-origin isolation so WASM with threads / SharedArrayBuffer can run.
  async headers() {
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
  // Ensure single Jotai instance (avoid multiple-store bug in dev/monorepo setups)
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      jotai: path.resolve(__dirname, 'node_modules/jotai'),
      'jotai/utils': path.resolve(__dirname, 'node_modules/jotai/utils'),
    };
    return config;
  },
};

export default nextConfig;
