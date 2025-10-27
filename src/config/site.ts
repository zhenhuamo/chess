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
