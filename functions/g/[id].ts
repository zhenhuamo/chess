// Dynamic HTML wrapper for /g/:id
// - Injects per-id Open Graph/Twitter meta tags for rich link previews
// - Serves the static /g page HTML so the SPA can hydrate at /g/:id
// - Falls back to 404 if id does not exist

export const onRequest: PagesFunction<{ SHARE: R2Bucket }> = async (ctx) => {
  const req = ctx.request;
  const url = new URL(req.url);
  const id = (url.pathname.split("/").pop() || "").trim();
  if (!/^[0-9a-zA-Z]{6,32}$/.test(id)) {
    return new Response("Invalid id", { status: 400, headers: htmlHeaders() });
  }

  // Look up the saved PGN to produce meaningful OG tags
  const key = `g/${id.slice(0, 2)}/${id}.json`;
  const obj = await ctx.env.SHARE.get(key);
  if (!obj) {
    // For unknown id, return 404 with static shell to keep UX consistent
    const base = await fetchBaseShell(url, "/g");
    return new Response(base, { status: 404, headers: htmlHeaders() });
  }

  // Parse headers from PGN for title/description
  let white = "White", black = "Black", date = "", event = "", result = "";
  try {
    const json = JSON.parse(await obj.text());
    const pgn = String(json?.pgn || "");
    const hdr = parsePgnHeaders(pgn);
    white = hdr.White || white;
    black = hdr.Black || black;
    date = hdr.Date || date;
    event = hdr.Event || event;
    result = hdr.Result || result;
  } catch {}

  const origin = `${url.protocol}//${url.host}`;
  const canonical = `${origin}/g/${id}`;
  const image = `${origin}/g/${id}/opengraph-image`;
  const title = `${white} vs ${black}${date ? ` · ${date}` : ""}`;
  const descParts = [event, result].filter(Boolean);
  const description = descParts.join(" · ") || "Shared chess game";

  // Fetch the static /g shell HTML and inject OG meta before </head>
  const baseHtml = await fetchBaseShell(url, "/g");
  const injection = ogMetaBlock({ title, description, canonical, image });
  const html = injectBeforeHeadClose(baseHtml, injection);

  // Cache aggressively: content-addressed id never changes
  const headers = htmlHeaders();
  headers.set("cache-control", "public, immutable, max-age=31536000");
  return new Response(html, { status: 200, headers });
};

function htmlHeaders(): Headers {
  const h = new Headers();
  h.set("content-type", "text/html; charset=utf-8");
  return h;
}

async function fetchBaseShell(url: URL, path: string): Promise<string> {
  const origin = `${url.protocol}//${url.host}`;
  const r = await fetch(`${origin}${path}`);
  return await r.text();
}

function injectBeforeHeadClose(html: string, block: string): string {
  const idx = html.toLowerCase().indexOf("</head>");
  if (idx === -1) return block + html;
  return html.slice(0, idx) + "\n" + block + "\n" + html.slice(idx);
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function ogMetaBlock({ title, description, canonical, image }: { title: string; description: string; canonical: string; image: string; }): string {
  const t = esc(title);
  const d = esc(description);
  const c = esc(canonical);
  const i = esc(image);
  return [
    `<link rel="canonical" href="${c}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:url" content="${c}">`,
    `<meta property="og:image" content="${i}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${t}">`,
    `<meta name="twitter:description" content="${d}">`,
    `<meta name="twitter:image" content="${i}">`,
  ].join("\n");
}

function parsePgnHeaders(pgn: string): Record<string, string> {
  // Extract PGN header tags: lines like [Key "Value"]
  const out: Record<string, string> = {};
  const lines = pgn.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*\[([^\s\]]+)\s+"([^"]*)"\s*\]\s*$/);
    if (m) out[m[1]] = m[2];
    else if (line.trim() === "") break; // headers end before first blank line
  }
  return out;
}

