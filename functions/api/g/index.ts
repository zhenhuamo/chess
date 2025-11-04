// POST /api/g
// Creates or returns a permanent, content-addressed short id for a PGN.
// Storage: Cloudflare R2 (binding: SHARE)
// Response: { id, url, createdAt }

export const onRequestPost: PagesFunction<{ SHARE: R2Bucket } & Record<string, any>> = async (ctx) => {
  try {
    const req = ctx.request;
    const url = new URL(req.url);
    const origin = `${url.protocol}//${url.host}`;

    // Parse body
    let body: any = null;
    try { body = await req.json(); } catch {}
    const rawPgn = (body?.pgn ?? '').toString();
    if (!rawPgn || typeof rawPgn !== 'string') {
      return json({ error: 'invalid_pgn' }, { status: 400, headers: noStore() });
    }

    const maxBytes = clampInt(ctx.env?.SHARE_MAX_PGN_BYTES, 1, 50 * 1024 * 1024, 1_048_576); // default 1MB
    const norm = normalizePgn(rawPgn);
    const normBytes = new TextEncoder().encode(norm);
    if (normBytes.byteLength > maxBytes) {
      return json({ error: 'too_large', maxBytes }, { status: 413, headers: noStore() });
    }

    // Compute CAS id from SHA-256 -> base62
    const idLen = clampInt(ctx.env?.SHARE_ID_LEN, 6, 32, 10);
    let id = await hashToBase62(normBytes, idLen);
    let key = makeKey(id);

    let created = false;
    // Check existence
    let head = await ctx.env.SHARE.head(key);
    if (!head) {
      created = true;
      const createdAt = Date.now();
      const obj = JSON.stringify({ v: 1, pgn: norm, meta: smallMeta(body?.meta), createdAt });
      await ctx.env.SHARE.put(key, obj, { httpMetadata: { contentType: 'application/json; charset=utf-8' } });
      return json({ id, url: `${origin}/g/${id}`, createdAt }, { status: 201, headers: noStore() });
    }

    // Exists – verify identical. If not identical (extremely unlikely), extend id length and retry up to +2.
    const existed = await ctx.env.SHARE.get(key);
    if (existed) {
      try {
        const parsed = JSON.parse(existed);
        if (parsed?.pgn === norm) {
          return json({ id, url: `${origin}/g/${id}`, createdAt: parsed?.createdAt }, { status: 200, headers: noStore() });
        }
      } catch {}
    }
    // Collision fallback
    for (let extra = 1; extra <= 2; extra++) {
      const altId = await hashToBase62(normBytes, idLen + extra);
      const altKey = makeKey(altId);
      const altHead = await ctx.env.SHARE.head(altKey);
      if (!altHead) {
        const createdAt = Date.now();
        const obj = JSON.stringify({ v: 1, pgn: norm, meta: smallMeta(body?.meta), createdAt });
        await ctx.env.SHARE.put(altKey, obj, { httpMetadata: { contentType: 'application/json; charset=utf-8' } });
        return json({ id: altId, url: `${origin}/g/${altId}`, createdAt }, { status: 201, headers: noStore() });
      } else {
        const existing = await ctx.env.SHARE.get(altKey);
        try {
          const parsed = JSON.parse(existing || 'null');
          if (parsed?.pgn === norm) {
            return json({ id: altId, url: `${origin}/g/${altId}`, createdAt: parsed?.createdAt }, { status: 200, headers: noStore() });
          }
        } catch {}
      }
    }

    // If still colliding, return an error (practically unreachable)
    return json({ error: 'collision' }, { status: 500, headers: noStore() });
  } catch (e: any) {
    return json({ error: 'internal', message: e?.message || 'unknown' }, { status: 500, headers: noStore() });
  }
};

function JSONResponse(body: any, init?: ResponseInit) { return new Response(JSON.stringify(body), { ...(init || {}), headers: { 'content-type': 'application/json; charset=utf-8', ...(init?.headers || {}) } }); }
const json = JSONResponse;
const noStore = () => ({ 'cache-control': 'no-store' });

function clampInt(raw: any, min: number, max: number, def: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function normalizePgn(pgn: string): string {
  let s = pgn.replace(/\r\n?/g, '\n');
  s = s.replace(/\u0000/g, '');
  // Trim trailing blank lines
  s = s.replace(/\n+$/g, '\n');
  return s;
}

function smallMeta(meta: any) {
  if (!meta || typeof meta !== 'object') return undefined;
  try {
    const s = JSON.stringify(meta);
    if (s.length > 8192) return undefined; // ignore oversized meta
    return JSON.parse(s);
  } catch { return undefined; }
}

function makeKey(id: string): string { return `g/${id.slice(0, 2)}/${id}.json`; }

async function hashToBase62(bytes: Uint8Array, len: number): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  // Convert hash bytes to BigInt
  let n = 0n;
  for (const b of hash) { n = (n << 8n) + BigInt(b); }
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  // Produce at least `len` chars
  let out = '';
  const base = 62n;
  while (out.length < len) {
    const rem = n % base;
    out = alphabet[Number(rem)] + out;
    n = n / base;
    // If n becomes zero before reaching len, keep filling with leading zeros (deterministic)
    if (n === 0n && out.length < len) {
      out = alphabet[0].repeat(len - out.length) + out;
      break;
    }
  }
  return out.slice(0, len);
}

