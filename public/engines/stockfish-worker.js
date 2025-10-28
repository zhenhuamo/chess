// Moved from /public/workers/stockfish-worker.js to /public/engines/stockfish-worker.js
// See previous history for comments.
// Stockfish bridge worker. Spawns the official Stockfish.js worker, forwards UCI commands,
// parses output lines, and sends structured messages to the UI thread.

// Default engine script. If this worker is served from the engine CDN (R2),
// a leading "/engines/..." will resolve on that CDN origin; if an absolute
// URL is provided later via `setengine`, we will switch to it.
const ENGINE_SCRIPT = '/engines/stockfish-17/stockfish-17.js';
let engineScriptPath = ENGINE_SCRIPT;

let engineWorker = null; // The actual Stockfish.js worker
let engineInitPromise = null;
let engineReady = false;
let analysisInFlight = false;

let startupQueue = [];
const uciReadyCallbacks = [];
const readyOkCallbacks = [];

function sendMessageToUI(message) { self.postMessage(message); }
function enqueueReadyCallback(callbacks, callback) { callbacks.push(callback); }
function flushReadyCallbacks(callbacks) { while (callbacks.length > 0) { const r = callbacks.shift(); if (r) r(); } }

function parseScore(tokens) {
  const i = tokens.indexOf('score'); if (i === -1 || i + 2 >= tokens.length) return undefined;
  const t = tokens[i + 1]; const v = Number(tokens[i + 2]); if (Number.isNaN(v)) return undefined;
  if (t === 'cp') return { type: 'cp', value: v }; if (t === 'mate') return { type: 'mate', value: v }; return undefined;
}

function parseInfo(line) {
  const tokens = line.trim().split(/\s+/); const info = {};
  const d = tokens.indexOf('depth'); if (d !== -1) info.depth = Number(tokens[d + 1]);
  const sd = tokens.indexOf('seldepth'); if (sd !== -1) info.selDepth = Number(tokens[sd + 1]);
  const ti = tokens.indexOf('time'); if (ti !== -1) info.timeMs = Number(tokens[ti + 1]);
  const ni = tokens.indexOf('nodes'); if (ni !== -1) info.nodes = Number(tokens[ni + 1]);
  const np = tokens.indexOf('nps'); if (np !== -1) info.nps = Number(tokens[np + 1]);
  const mp = tokens.indexOf('multipv'); if (mp !== -1) info.multiPv = Number(tokens[mp + 1]);
  const pv = tokens.indexOf('pv'); if (pv !== -1 && pv + 1 < tokens.length) info.pv = tokens.slice(pv + 1).join(' ');
  const sc = parseScore(tokens); if (sc) info.score = sc; return info;
}

function parseBestMove(line) {
  const tokens = line.trim().split(/\s+/); if (tokens.length < 2) return null;
  const bestMove = tokens[1];
  // Preserve '(none)' so the UI can stop the spinner gracefully
  if (!bestMove) return null;
  const pi = tokens.indexOf('ponder'); const ponder = pi !== -1 ? tokens[pi + 1] : undefined;
  return { bestMove, ponder };
}

function handleEngineOutput(rawLine) {
  const line = String(rawLine || '').trim(); if (!line) return;
  if (line === 'uciok') { engineReady = true; flushStartupQueue(); sendMessageToUI({ type: 'ready' }); flushReadyCallbacks(uciReadyCallbacks); return; }
  if (line === 'readyok') { flushReadyCallbacks(readyOkCallbacks); return; }
  if (line.startsWith('bestmove')) { analysisInFlight = false; const p = parseBestMove(line); if (p) sendMessageToUI({ type: 'analysis', payload: p }); return; }
  if (line.startsWith('info')) { const payload = parseInfo(line); if (payload.depth !== undefined || payload.score !== undefined || payload.pv) { sendMessageToUI({ type: 'info', payload }); } return; }
  if (line.startsWith('id ') || line.startsWith('option ')) { sendMessageToUI({ type: 'engine-meta', message: line }); return; }
  sendMessageToUI({ type: 'log', message: line });
}

function dispatchCommand(command, options) {
  if (!engineWorker) { if (!options || !options.bypassQueue) startupQueue.push(command); return; }
  if (!engineReady && (!options || (!options.force && !options.allowDuringInit))) { startupQueue.push(command); return; }
  sendMessageToUI({ type: 'log', message: `[worker->engine] ${command}` }); engineWorker.postMessage(command);
}

function flushStartupQueue() { if (!engineWorker || startupQueue.length === 0) return; const q = startupQueue; startupQueue = []; q.forEach((cmd) => dispatchCommand(cmd, { bypassQueue: true })); }

function ensureEngine() {
  if (engineWorker) return Promise.resolve(); if (engineInitPromise) return engineInitPromise;
  engineInitPromise = new Promise((resolve, reject) => {
    try { engineWorker = new Worker(engineScriptPath); } catch (error) { sendMessageToUI({ type: 'error', message: error instanceof Error ? error.message : String(error) }); reject(error); return; }
    engineWorker.onmessage = (e) => { const data = String(e.data || ''); if (!data) return; if (data.indexOf('\n') !== -1) { data.split('\n').forEach((line) => handleEngineOutput(line)); } else { handleEngineOutput(data); } };
    engineWorker.onerror = (e) => { try { const msg = (e && (e.message || (e.error && e.error.message))) || String(e); const suppress = /RuntimeError: unreachable|function signature mismatch|is not a function|table index is out of bounds/i.test(msg); if (suppress) { sendMessageToUI({ type: 'log', message: `[engine:onerror:suppressed] ${msg}` }); if (e && typeof e.preventDefault === 'function') e.preventDefault(); return; } sendMessageToUI({ type: 'error', message: msg }); } catch (err) { sendMessageToUI({ type: 'error', message: String(err) }); } };
    dispatchCommand('uci', { force: true, allowDuringInit: true }); resolve();
  });
  return engineInitPromise;
}

function resetEngine(newPath) { try { if (engineWorker) { engineWorker.terminate(); } } catch {} engineWorker = null; engineReady = false; engineInitPromise = null; startupQueue = []; if (typeof newPath === 'string' && newPath.length) { engineScriptPath = newPath; } }

function waitForEngineReady() { if (engineReady) return Promise.resolve(); return new Promise((resolve) => { enqueueReadyCallback(uciReadyCallbacks, resolve); }); }
function waitForReadyOk() { return new Promise((resolve) => { enqueueReadyCallback(readyOkCallbacks, resolve); dispatchCommand('isready', { allowDuringInit: true }); }); }

async function handleInit() { await ensureEngine(); await waitForEngineReady(); }
async function handleSetOption(name, value) { await ensureEngine(); await waitForEngineReady(); const optionValue = typeof value === 'boolean' ? (value ? 'true' : 'false') : value !== undefined ? String(value) : undefined; const command = optionValue ? `setoption name ${name} value ${optionValue}` : `setoption name ${name}`; dispatchCommand(command); }
async function handleAnalyze(fen, depth) { await ensureEngine(); await waitForEngineReady(); if (analysisInFlight) { dispatchCommand('stop', { allowDuringInit: true }); analysisInFlight = false; } dispatchCommand('stop', { allowDuringInit: true }); dispatchCommand(`position fen ${fen}`); dispatchCommand(`go depth ${depth}`); analysisInFlight = true; }
async function handleStop() { if (!engineWorker) return; dispatchCommand('stop', { allowDuringInit: true }); analysisInFlight = false; }
async function handleSetEngine(path) { resetEngine(path); await ensureEngine(); await waitForEngineReady(); }

self.addEventListener('message', (event) => {
  const request = event.data || {};
  (async () => {
    try {
      switch (request.type) {
        case 'init': await handleInit(); break;
        case 'setengine': await handleSetEngine(request.path || ENGINE_SCRIPT); break;
        case 'setoption': await handleSetOption(request.name, request.value); break;
        case 'analyze': { const depth = typeof request.depth === 'number' && Number.isFinite(request.depth) ? Math.max(1, Math.floor(request.depth)) : 15; await handleAnalyze(request.fen, depth); break; }
        case 'stop': await handleStop(); break;
        default: break;
      }
    } catch (error) { sendMessageToUI({ type: 'error', message: error instanceof Error ? error.message : String(error) }); }
  })();
});
