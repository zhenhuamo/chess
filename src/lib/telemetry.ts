// Lightweight event logger. Replace with real pipeline later.
const ENDPOINT = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_TELEMETRY_ENDPOINT) || '/api/telemetry';

export function logEvent(name: string, payload?: Record<string, any>) {
  try {
    const ts = Date.now();
    // eslint-disable-next-line no-console
    console.log('[telemetry]', name, { ts, ...(payload || {}) });
    // Optionally buffer events for later upload
    const key = 'telemetry:buffer';
    const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null;
    const buf = raw ? JSON.parse(raw) as any[] : [];
    buf.push({ name, ts, payload });
    if (typeof window !== 'undefined') window.sessionStorage.setItem(key, JSON.stringify(buf.slice(-200))); // keep last 200
    // Best-effort upload (single event) using keepalive fetch; ignore failures
    if (typeof fetch !== 'undefined') {
      const body = JSON.stringify({ name, ts, payload });
      fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(()=>{});
    }
  } catch {}
}

export function flushTelemetry() {
  try {
    const key = 'telemetry:buffer';
    const raw = typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null;
    const buf = raw ? JSON.parse(raw) as any[] : [];
    if (!buf.length) return;
    if (typeof fetch !== 'undefined') {
      const body = JSON.stringify(buf);
      fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(()=>{});
      window.sessionStorage.removeItem(key);
    }
  } catch {}
}
