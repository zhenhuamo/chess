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

