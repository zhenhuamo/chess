export interface UpdateEntry {
  date: string;        // YYYY-MM-DD
  version?: string;    // optional semantic or label
  title: string;       // short headline
  items: string[];     // bullet points
}

// Edit this list whenever you ship changes. Newest first.
export const UPDATES: UpdateEntry[] = [
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
