export interface UpdateEntry {
  date: string;        // YYYY-MM-DD
  version?: string;    // optional semantic or label
  title: string;       // short headline
  items: string[];     // bullet points
}

// Edit this list whenever you ship changes. Newest first.
export const UPDATES: UpdateEntry[] = [
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

