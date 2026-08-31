import http from 'http';
import { getSocket, isConnected } from '../connection.js';
import {
  getPluginCount,
  getAllCommandNames,
  getDuplicateCommands,
  getCategories,
} from './hillz-plugins.js';

const BOT_API_PORT = 8081;
let server = null;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

// Ubah nilai apa pun jadi teks aman untuk panel admin: objek bersiklus (mis.
// `sock`) tidak boleh membuat JSON.stringify melempar error dan menelan hasil.
function safeInspect(v) {
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return v;
  try {
    const seen = new WeakSet();
    return JSON.stringify(v, function (k, val) {
      if (typeof val === 'function') return '[Function ' + (val.name || 'anonymous') + ']';
      if (typeof val === 'bigint') return String(val);
      if (val && typeof val === 'object') {
        if (Buffer.isBuffer(val)) return '[Buffer ' + val.length + ' bytes]';
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    }, 2);
  } catch (e) {
    return String(v);
  }
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// Active broadcast state for cancel support
let activeBroadcast = null;

export function startBotApi() {
  if (server) return;

  server = http.createServer(async (req, res) => {
    const url = req.url.split('?')[0];

    if (req.method === 'GET' && url === '/status') {
      const sock = getSocket();
      json(res, 200, {
        connected: isConnected(),
        user: sock?.user || null
      });
      return;
    }

    // Ringkasan plugin: jumlah nyata dari registry (bukan hasil hitung baris log)
    // plus daftar command yang saling menimpa. Tanpa ini tabrakan nama command
    // hanya terlihat sekali saat boot lalu hilang dari log.
    if (req.method === 'GET' && url === '/plugins') {
      try {
        const names = getAllCommandNames();
        const dups = getDuplicateCommands();
        json(res, 200, {
          ok: true,
          plugins: getPluginCount(),
          commands: names.length,
          categories: getCategories().length,
          duplicateCount: dups.length,
          duplicates: dups,
        });
      } catch (e) {
        json(res, 500, { error: e.message });
      }
      return;
    }

    if (req.method === 'GET' && url === '/groups') {
      const sock = getSocket();
      if (!sock || !isConnected()) {
        json(res, 503, { error: 'Bot not connected' });
        return;
      }
      try {
        const result = await sock.groupFetchAllParticipating();
        const groups = Object.values(result).map(g => ({
          id: g.id,
          subject: g.subject,
          size: g.size || g.participants?.length || 0,
          disabled: global.disabledGroups?.has(g.id) || false
        }));
        json(res, 200, { groups });
      } catch (e) {
        json(res, 500, { error: e.message });
      }
      return;
    }

    if (req.method === 'POST' && url === '/send') {
      const sock = getSocket();
      if (!sock || !isConnected()) {
        json(res, 503, { error: 'Bot not connected' });
        return;
      }
      try {
        const body = await parseBody(req);
        if (!body.jid || !body.text) {
          json(res, 400, { error: 'Missing jid or text' });
          return;
        }
        await sock.sendMessage(body.jid, { text: body.text });
        json(res, 200, { ok: true });
      } catch (e) {
        json(res, 500, { error: e.message });
      }
      return;
    }

    if (req.method === 'POST' && url === '/broadcast') {
      const sock = getSocket();
      if (!sock || !isConnected()) {
        json(res, 503, { error: 'Bot not connected' });
        return;
      }
      try {
        const body = await parseBody(req);
        const { jids, text, delay } = body;
        if (!Array.isArray(jids) || !text) {
          json(res, 400, { error: 'Missing jids array or text' });
          return;
        }
        const delayMs = Math.max(1000, (delay || 3) * 1000);
        const results = { sent: 0, failed: 0, errors: [], cancelled: false };
        const broadcastId = Date.now().toString(36);
        activeBroadcast = { id: broadcastId, cancel: false };

        for (let i = 0; i < jids.length; i++) {
          if (activeBroadcast?.id !== broadcastId || activeBroadcast.cancel) {
            results.cancelled = true;
            break;
          }
          try {
            await sock.sendMessage(jids[i], { text });
            results.sent++;
          } catch (e) {
            results.failed++;
            results.errors.push({ jid: jids[i], error: e.message });
          }
          if (i < jids.length - 1 && !(activeBroadcast?.cancel)) {
            await new Promise(r => setTimeout(r, delayMs));
          }
        }

        activeBroadcast = null;
        json(res, 200, { ok: true, ...results });
      } catch (e) {
        activeBroadcast = null;
        json(res, 500, { error: e.message });
      }
      return;
    }

    if (req.method === 'POST' && url === '/exec') {
      const sock = getSocket();
      if (!sock || !isConnected()) {
        json(res, 503, { error: 'Bot not connected' });
        return;
      }
      try {
        const body = await parseBody(req);
        const { code, target } = body;
        // `target` hanya wajib kalau kodenya memang menyebut `target`. Dulu selalu
        // wajib, jadi perintah diagnostik yang tidak butuh chat (mis. membaca
        // registry plugin) tidak bisa dijalankan sama sekali dari panel.
        if (!code) {
          json(res, 400, { error: 'Missing code' });
          return;
        }
        if (/\btarget\b/.test(code) && !target) {
          json(res, 400, { error: 'Kode ini memakai `target`, jadi JID target wajib diisi' });
          return;
        }
        // Auto-detect: if code declares a function, extract & call it
        let execCode = code;
        const fnMatch = code.match(/^\s*(async\s+)?function\s+(\w+)\s*\(/);
        if (fnMatch) {
          // User pasted full function declaration — append a call
          execCode = code + `\nreturn await ${fnMatch[2]}(sock, target);`;
        } else if (!/\breturn\b/.test(code)) {
          // Ekspresi tunggal tanpa `return` (mis. `getPluginCount()`) dulu tetap
          // dieksekusi tapi nilainya dibuang, jadi konsol admin selalu kosong.
          const satuBaris = code.trim().replace(/;\s*$/, '');
          if (!/[;\n]/.test(satuBaris)) execCode = 'return (' + satuBaris + ');';
        }
        // console.log di dalam kode ikut ditangkap supaya kelihatan di panel.
        const logs = [];
        const asliLog = console.log;
        console.log = (...a) => { logs.push(a.map(x => typeof x === 'string' ? x : safeInspect(x)).join(' ')); asliLog(...a); };
        let hasil;
        try {
          const fn = new Function('sock', 'target', `return (async function(){
${execCode}
})();`);
          hasil = await fn(sock, target);
        } finally {
          console.log = asliLog;
        }
        json(res, 200, { ok: true, result: safeInspect(hasil), logs });
      } catch (e) {
        json(res, 500, { error: e.message });
      }
      return;
    }

    if (req.method === 'POST' && url === '/groups/leave') {
      const sock = getSocket();
      if (!sock || !isConnected()) { json(res, 503, { error: 'Bot not connected' }); return; }
      try {
        const body = await parseBody(req);
        if (!body.jid) { json(res, 400, { error: 'Missing jid' }); return; }
        await sock.groupLeave(body.jid);
        json(res, 200, { ok: true });
      } catch (e) { json(res, 500, { error: e.message }); }
      return;
    }

    if (req.method === 'POST' && url === '/groups/toggle') {
      const sock = getSocket();
      if (!sock || !isConnected()) { json(res, 503, { error: 'Bot not connected' }); return; }
      try {
        const body = await parseBody(req);
        if (!body.jid) { json(res, 400, { error: 'Missing jid' }); return; }
        // Store disabled groups in a Set
        if (!global.disabledGroups) global.disabledGroups = new Set();
        const wasDisabled = global.disabledGroups.has(body.jid);
        if (wasDisabled) {
          global.disabledGroups.delete(body.jid);
        } else {
          global.disabledGroups.add(body.jid);
        }
        json(res, 200, { ok: true, disabled: !wasDisabled });
      } catch (e) { json(res, 500, { error: e.message }); }
      return;
    }

    if (req.method === 'POST' && url === '/broadcast/cancel') {
      if (activeBroadcast) {
        activeBroadcast.cancel = true;
        json(res, 200, { ok: true, message: 'Broadcast cancel requested' });
      } else {
        json(res, 200, { ok: true, message: 'No active broadcast' });
      }
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(BOT_API_PORT, '127.0.0.1', () => {
    console.log('[bot-api] Internal API on 127.0.0.1:' + BOT_API_PORT);
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log('[bot-api] Port ' + BOT_API_PORT + ' in use, skipping');
      server = null;
    }
  });
}
