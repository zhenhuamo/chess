// Cloudflare Worker that proxies engine assets from R2/custom domain and
// adds the required response headers so a page under COEP can construct a
// cross-origin Worker from this origin.
//
// - Adds CORS: Access-Control-Allow-Origin for a curated allowlist
// - Adds COEP: require-corp (workers must join cross-origin isolation)
// - Adds CORP: cross-origin (so COEP page can embed/call into it)
// - Handles OPTIONS preflight for completeness
//
// Configure the allowlist via env.ALLOWED_ORIGINS (comma-separated) or edit
// the DEFAULT_ORIGINS below.

const DEFAULT_ORIGINS = [
  'https://chess-analysis.org',
  'https://www.chess-analysis.org',
  'https://chess-4sw.pages.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function parseAllowed(env: any): string[] {
  const raw = (env?.ALLOWED_ORIGINS || '').trim();
  if (!raw) return DEFAULT_ORIGINS;
  return raw
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
}

function isAllowed(origin: string | null, allowed: string[]): string | null {
  if (!origin) return null;
  if (allowed.includes('*')) return '*';
  return allowed.includes(origin) ? origin : null;
}

function makePreflight(origin: string | null, allowed: string[]): Response {
  const allowOrigin = isAllowed(origin, allowed);
  const headers = new Headers();
  if (allowOrigin) headers.set('Access-Control-Allow-Origin', allowOrigin);
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('Access-Control-Max-Age', '86400');
  headers.append('Vary', 'Origin');
  return new Response(null, { status: 204, headers });
}

function withSecurityHeaders(resp: Response, origin: string | null, allowed: string[]): Response {
  const allowOrigin = isAllowed(origin, allowed);
  const h = new Headers(resp.headers);
  if (allowOrigin) h.set('Access-Control-Allow-Origin', allowOrigin);
  h.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  h.append('Vary', 'Origin');
  // Required for cross-origin isolation across page and workers
  h.set('Cross-Origin-Embedder-Policy', 'require-corp');
  // Allow COEP pages to fetch/execute cross-origin scripts/workers from here
  h.set('Cross-Origin-Resource-Policy', 'cross-origin');
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const allowed = parseAllowed(env);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return makePreflight(origin, allowed);
    }

    // Proxy through to origin (R2 custom domain) and add headers on the way back
    const upstream = await fetch(request);
    return withSecurityHeaders(upstream, origin, allowed);
  },
};

