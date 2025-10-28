// Site-level configuration for PGN headers and branding.
// Override via env vars in `.env.local` if needed.
// Example:
// NEXT_PUBLIC_PGN_EVENT="Chess Analysis Game"
// NEXT_PUBLIC_PGN_SITE="chess-analysis.org"

export const PGN_EVENT_DEFAULT =
  process.env.NEXT_PUBLIC_PGN_EVENT || 'Chess Analysis Game';

export const PGN_SITE_DEFAULT =
  process.env.NEXT_PUBLIC_PGN_SITE || 'chess-analysis.org';

// Canonical site URL used for sitemap/robots and absolute links
export const SITE_URL = 'https://chess-analysis.org';

// Base URL for engine assets (JS/WASM). Default serves from /public/engines.
// For Cloudflare R2 offloading, set to your R2 custom domain, e.g.:
// NEXT_PUBLIC_ENGINE_BASE_URL="https://assets.chess-analysis.org/engines/"
export const ENGINE_BASE_URL = (
  process.env.NEXT_PUBLIC_ENGINE_BASE_URL || 'https://cacle.chess-analysis.org/engines/'
).replace(/\/$/, '/');

// Optional cache-busting/versioning for engine assets served from R2.
// When set (e.g. NEXT_PUBLIC_ENGINE_VERSION="2025-10-28"), we will append
// `?v=<value>` to the worker URL so browsers bypass immutable caches after an
// engine update.
export const ENGINE_ASSETS_VERSION = process.env.NEXT_PUBLIC_ENGINE_VERSION || '';
