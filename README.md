# Chess Analyzer

Open-source, browser-based chess analysis powered by Stockfish and Next.js. Live site: https://chess-analysis.org.

## Features

- ♟️ Interactive 8x8 board with drag-and-drop
- 🤖 Stockfish analysis (WebAssembly) with multi-PV
- ⚡ Live eval bar, best-move suggestions, and line browser
- 🌍 No server round-trips — engine runs locally in your tab
- 🔒 Privacy-first — games stay on your device

## Tech Stack

- **Framework**: Next.js 15 / React 19 / TypeScript
- **Styling**: Tailwind CSS + MUI (select sections)
- **Chess libs**: chess.js, react-chessboard
- **Engine**: Stockfish 17 (WASM)
- **Deploy**: static export (Cloudflare Pages)

## Getting Started

Prereqs: Node.js 18+

Install:
```bash
npm install
```

Dev:
```bash
npm run dev
# http://localhost:3000
```

Build (static export):
```bash
npm run build
# output in out/
```

## Project Layout (simplified)
```
src/
  app/                  # Next.js App Router pages
  components/           # Shared UI
  sections/analysis/    # Board, panel, loaders
  content/blog/         # Markdown posts
public/                 # Static assets (og images, icons)
next.config.ts          # Next config (static export)
tailwind.config.ts      # Tailwind config
```

## Usage

1) Paste or upload a PGN, then click “Analyze” to run Stockfish locally.  
2) Browse lines with multi-PV, eval bar, and move list.  
3) Save/export PGN with evaluations; bookmarks are kept client-side.  
4) Optional: play vs engine from any position.

## Deploying to Cloudflare Pages

1) Push this repo to GitHub.  
2) In Cloudflare Pages, connect the repo.  
3) Build command: `npm run build`  
4) Output directory: `out`  
5) Point your domain to the Pages project (we use https://chess-analysis.org).

## Contributing

Issues and PRs are welcome. Please open an issue to discuss larger changes first.

## License

MIT
