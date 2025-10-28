Ops Quick Guide

This project serves engine assets (JS/WASM) from Cloudflare R2 via a same‑origin proxy mounted at /engines/* on chess-analysis.org. Use this checklist when making changes.

Environments and Components
- Pages (front‑end): Next.js static export deployed to Cloudflare Pages.
- Engines Proxy (Worker): workers/engines-proxy, routes:
  - chess-analysis.org/engines/* → proxies to UPSTREAM_ORIGIN (cacle.chess-analysis.org)
  - cacle.chess-analysis.org/engines/* → headers added in place
- R2: stores all engine assets under the key prefix engines/.

Routine Changes
1) Front-end only
   - Commit code → trigger Pages build OR run: wrangler pages deploy .vercel/output/static

2) Proxy Worker changed (workers/engines-proxy)
   - cd workers/engines-proxy && npx wrangler deploy
   - In wrangler.toml bump: NEXT_PUBLIC_ENGINE_VERSION (e.g. +1)
   - Redeploy Pages so the site requests .../stockfish-worker.js?v=<new>

3) Engine assets changed (R2) or public/engines/stockfish-worker.js updated
   - Sync to R2: bash scripts/tools/r2-sync-engines.sh
   - Bump NEXT_PUBLIC_ENGINE_VERSION in wrangler.toml
   - Redeploy Pages

Verification (after deploy)
- Console on /play:
  - [Stockfish:debug] page … workerUrl should be https://chess-analysis.org/engines/stockfish-worker.js?v=<new>
  - “Stockfish ready” should appear; no Failed to construct 'Worker' errors
- Headers for any /engines/* resource:
  - Cross-Origin-Opener-Policy: same-origin
  - Cross-Origin-Embedder-Policy: require-corp
  - Access-Control-Allow-Origin: https://chess-analysis.org
  - Cross-Origin-Resource-Policy: cross-origin
  - Vary: Origin

CLI Snippets
- Probe worker headers:
  curl -I -H 'Origin: https://chess-analysis.org' \
  https://chess-analysis.org/engines/stockfish-worker.js?v=2025-10-28-05

- Probe engine JS headers:
  curl -I -H 'Origin: https://chess-analysis.org' \
  https://chess-analysis.org/engines/stockfish-17/stockfish-17-single.js

Secrets Needed for CI
- CLOUDFLARE_API_TOKEN: API token with Workers Deploy + Pages Write + R2 Read/Write (if CI syncs R2)
- CLOUDFLARE_ACCOUNT_ID: your CF account ID
- (Optional) CF_PAGES_PROJECT_NAME: Pages project name (defaults to chess-pages here)

