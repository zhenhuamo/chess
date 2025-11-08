export interface UpdateEntry {
  date: string;        // YYYY-MM-DD
  version?: string;    // optional semantic or label
  title: string;       // short headline
  items: string[];     // bullet points
}

// Edit this list whenever you ship changes. Newest first.
export const UPDATES: UpdateEntry[] = [
  {
    date: '2025-11-08',
    version: 'v2.1.0',
    title: 'Share/Embed UX: Popover, Deep-Link Ply, Configurable Embed, OG Highlight',
    items: [
      'Share UI switched from alerts to a non-blocking Popover + Snackbar: Copy Link, Copy PGN, Open, and System Share (when supported).',
      'Configurable embed generator in the Share Popover: theme(light/dark), auto playback, speed (200–5000ms), width/height; one-click “Copy Embed”.',
      'Deep-link to a specific step via /g/<id>?ply=N; the viewer replays only up to N plies.',
      'OG image now highlights the last move (from/to squares with an arrow) for richer link previews.',
    ],
  },
  {
    date: '2025-11-05',
    version: 'v2.0.0',
    title: 'Game Sharing: Permanent Links + Embed',
    items: [
      'Permanent share links are live: POST /api/g stores PGN in R2 using content‑addressed ids; open /g/<id> to view a read‑only board and moves.',
      'Same‑origin API on Pages Functions with long‑term caching (immutable + ETag); JSON and ?format=raw supported.',
      'Analyze page adds a “Share as short link” button (toolbar, next to Save).',
      'Viewer page switched to static entry /g with Cloudflare Pages redirects (/g/* → /g). Added “Copy Embed” and “Open in Analyzer”.',
      'New embed page /embed/<id> with params: theme=light|dark, auto=0|1, speed=200–5000ms; renders a clean board suitable for iframe.',
      'Build/deploy reliability: purge large engine assets from static output; copy _redirects/_headers to out; fixed R2 .get() body handling.',
      'Privacy: /g and /embed remain noindex by default; we will revisit indexing after OG image support.',
      'Global Appearance: add “Appearance” in left navigation (palette icon). Choose piece set and board hue; applies to all boards and persists locally.',
    ],
  },
  {
    date: '2025-11-03',
    version: 'v1.9.0',
    title: 'Opening Book Expansion + Fallback & Reliability Fixes',
    items: [
      'Curated global opening book expanded to ~350 fen2 positions (each with Top‑5 moves). Coverage now includes deeper lines in Spanish/Italian/Two Knights/Scotch, Sicilian (Najdorf/Dragon/Classical/Scheveningen/Alapin/Accelerated), French, Caro‑Kann, Scandinavian, Alekhine, Pirc/Modern, QGD/Slav/Semi‑Slav/QGA, Nimzo/QID/Catalan, KID/Grünfeld, Benoni/Benko, and English/Réti.',
      'Ancestor fallback: when the exact position has no book lines, Book now shows the nearest ancestor within 4 plies with a clear hint.',
      'PV#1 in‑book check improved: we now check both fen4 (exact) and fen2 (aggregated) to avoid false “Novelty” notices.',
      'Loading reliability: opening‑book fetch switched to no‑store to prevent stale cache during development or after updates.',
      'Global Book rows continue to support Hot / Win% / My% sorting and display Win% · Games (K/M) · Mine (≥10 samples).',
    ],
  },
  {
    date: '2025-11-02',
    version: 'v1.8.0',
    title: 'Openings panel: Personal stats + Light book + PV integration',
    items: [
      'New Openings panel with two tabs: My Stats (personal opening book from your saved games) and Book (lightweight local opening book).',
      'Engine integration: each opening move has quick actions — play the first move (→) or preview multiple moves (▶) using the current engine PV when available.',
      'Book matching fallback: resolve by full FEN (fen4) first; if not found, fallback to fen2 (piece placement + side to move) and aggregate weights.',
      'PV awareness: highlight when a move equals Engine PV#1; Book tab shows whether PV#1 is in book or a novelty.',
      'Expanded light book coverage for key early positions (e4/d4/c4/Nf3 and common replies).',
      'Personal book depth increased from 12 → 16 plies (≈8 moves) to cover early middlegame transitions.',
      'Added Rebuild button in My Stats to regenerate the personal opening book on demand.',
      'Smart fallback for My Stats: if the exact position has no data, show the nearest ancestor within 4 plies with a hint.',
    ],
  },
  {
    date: '2025-11-01',
    version: 'v1.7.0',
    title: 'Interactive Engine Lines (PV preview & hotkeys)',
    items: [
      'Engine Lines: click any PV to preview the first 10 moves on the analysis board.',
      'Per-line controls: added buttons to play only the first move, or preview the first 10 moves.',
      'Keyboard shortcuts: press 1/2/3 to play the first move of PV#1/#2/#3.',
      'Added header tooltip with usage hints for PV preview and hotkeys.',
    ],
  },
  {
    date: '2025-11-01',
    version: 'v1.6.0',
    title: 'Analysis page UI/UX improvements',
    items: [
      'Optimized PanelHeader by removing "Load Another Game" and reducing height for more space.',
      'Increased analysis panel height from 140px to 90px offset for better content visibility.',
      'Enhanced Moves tab with larger fonts (1rem) and improved icons (14px) for better readability.',
      'Replaced colored dots with professional PNG icons from public/icons directory.',
      'Improved Classification section with larger fonts (0.85rem), icons (16px), and consistent spacing.',
      'Added horizontal scrolling to Engine Lines (PV analysis) to view complete move sequences.',
      'Increased Engine Lines container height to 260px and optimized scrollbar styling.',
    ],
  },
  {
    date: '2025-11-01',
    version: 'v1.5.0',
    title: 'Contact page and analytics',
    items: [
      'Added a simple Contact page with the project email address.',
      'Integrated Microsoft Clarity snippet for session analytics.',
      'Introduced a collapsible side navigation for cleaner layout.',
    ],
  },
  {
    date: '2025-11-01',
    version: 'v1.4.0',
    title: 'Homepage play autosave',
    items: [
      'Homepage self‑analysis board now autosaves moves to the local Games database.',
      'Added "Save as new" to create a separate record.',
      'Restart starts a fresh record to avoid overwriting previous games.',
    ],
  },
  {
    date: '2025-11-01',
    version: 'v1.3.0',
    title: 'Chess.com loader on the homepage',
    items: [
      'Unified loader supports PGN paste/upload and Chess.com recent games.',
      'Selecting a game jumps directly to the Analyze page.',
    ],
  },
];
