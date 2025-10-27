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
