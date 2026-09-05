import http from 'http';
import { getSocket, isConnected } from '../connection.js';
import {
  getPluginCount,
  getAllCommandNames,
  getDuplicateCommands,
  getDuplicateAliases,
  getHijackedAliases,
  getUnreachablePlugins,
  getCategories,
} from './hillz-plugins.js';
import { daftarGrupMati, toggleGrup } from './hillz-group-state.js';
import { statusPairing, statusSub, mintaPairing } from './hillz-pairing.js';
import {
  daftarBot,
  simpanBot,
  hapusBot,
  semuaRole,
  kategoriTersedia,
  simpanRoleKustom,
  hapusRoleKustom,
} from './hillz-bot-registry.js';
import { umumkanBotOn } from './hillz-announce.js';

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
        // `unreachable` ≠ `duplicates`. Tabrakan nama sering tidak berbahaya
        // (plugin yang kalah masih punya nama lain), tapi plugin yang seluruh
        // nama + aliasnya direbut benar-benar tidak bisa dipanggil. Panel perlu
        // membedakan keduanya supaya angka "14 tabrakan" tidak dibaca sebagai
        // "14 plugin rusak".
        const mati = getUnreachablePlugins();
        // Alias dibajak: lebih berbahaya daripada plugin mati karena tidak ada
        // gejala apa pun — command jalan, hasilnya salah.
        const bajak = getHijackedAliases();
        json(res, 200, {
          ok: true,
          plugins: getPluginCount(),
          commands: names.length,
          categories: getCategories().length,
          duplicateCount: dups.length,
          duplicates: dups,
          aliasDuplicateCount: getDuplicateAliases().length,
          unreachableCount: mati.length,
          unreachable: mati.map((p) => ({
            file: p.filePath,
            names: p.names,
            aliases: p.aliases,
          })),
          hijackedAliasCount: bajak.length,
          hijackedAliases: bajak,
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
          disabled: daftarGrupMati().has(g.id)
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
        // Status disimpan ke disk lewat hillz-group-state supaya (a) bertahan
        // setelah restart dan (b) benar-benar dibaca handler untuk menolak
        // perintah. Sebelumnya hanya Set di memori yang tidak pernah dibaca.
        const mati = toggleGrup(body.jid);
        json(res, 200, { ok: true, disabled: mati });
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

    // ── PAIRING dari panel admin ─────────────────────────────────────────────
    // Kode pairing lahir di proses ini (bot). Panel tidak bisa membacanya dari
    // log, jadi dipublikasikan lewat papan status dan dibaca di sini.
    if (req.method === 'GET' && url === '/pair/state') {
      try {
        const sock = getSocket();
        json(res, 200, {
          ok: true,
          utama: statusPairing(),
          tambahan: statusSub(),
          terhubung: isConnected(),
          user: sock?.user || null,
        });
      } catch (e) { json(res, 500, { error: e.message }); }
      return;
    }

    // Minta kode untuk nomor UTAMA. Kalau bot sudah punya sesi, permintaan ini
    // ditolak: menimpa sesi hidup harus lewat langkah sadar (hapus sesi dulu)
    // supaya tidak ada admin yang kehilangan bot karena satu klik.
    if (req.method === 'POST' && url === '/pair/request') {
      try {
        const body = await parseBody(req);
        if (!body.number) { json(res, 400, { error: 'Missing number' }); return; }
        if (isConnected() && !body.force) {
          json(res, 409, {
            error: 'Bot sudah tersambung. Hapus sesi dulu bila ingin ganti nomor.',
          });
          return;
        }
        const st = mintaPairing(body.number);
        json(res, 200, { ok: true, state: st });
      } catch (e) { json(res, 400, { error: e.message }); }
      return;
    }

    // Pengumuman "BOT ON" manual — dipakai admin untuk mengulang tanpa restart.
    if (req.method === 'POST' && url === '/announce') {
      const sock = getSocket();
      if (!sock || !isConnected()) { json(res, 503, { error: 'Bot not connected' }); return; }
      try {
        const hasil = await umumkanBotOn(sock, { paksa: true });
        json(res, 200, { ok: true, ...hasil });
      } catch (e) { json(res, 500, { error: e.message }); }
      return;
    }

    // ── REGISTRY BOT (multi-nomor, on/off, role) ─────────────────────────────
    if (req.method === 'GET' && url === '/bots') {
      try {
        const sock = getSocket();
        const bots = daftarBot();
        // Nomor bot utama dilaporkan dari socket hidup, bukan dari berkas:
        // berkas bisa basi kalau nomor diganti lewat swap sesi manual.
        if (bots.main) {
          bots.main.nomorAktif = sock?.user?.id?.split(':')[0] || '';
          bots.main.terhubung = isConnected();
          bots.main.nama = sock?.user?.name || '';
        }
        json(res, 200, {
          ok: true,
          bots,
          roles: semuaRole(),
          kategori: kategoriTersedia(),
        });
      } catch (e) { json(res, 500, { error: e.message }); }
      return;
    }

    if (req.method === 'POST' && url === '/bots/save') {
      try {
        const body = await parseBody(req);
        if (!body.id) { json(res, 400, { error: 'Missing id' }); return; }
        const hasil = simpanBot(body.id, {
          nomor: body.nomor,
          label: body.label,
          role: body.role,
          aktif: body.aktif,
        });
        json(res, 200, { ok: true, bot: hasil });
      } catch (e) { json(res, 400, { error: e.message }); }
      return;
    }

    if (req.method === 'POST' && url === '/bots/delete') {
      try {
        const body = await parseBody(req);
        hapusBot(body.id);
        json(res, 200, { ok: true });
      } catch (e) { json(res, 400, { error: e.message }); }
      return;
    }

    if (req.method === 'POST' && url === '/bots/role/save') {
      try {
        const body = await parseBody(req);
        const r = simpanRoleKustom(body.id, {
          label: body.label,
          deskripsi: body.deskripsi,
          kategori: body.kategori,
        });
        json(res, 200, { ok: true, role: r });
      } catch (e) { json(res, 400, { error: e.message }); }
      return;
    }

    if (req.method === 'POST' && url === '/bots/role/delete') {
      try {
        const body = await parseBody(req);
        const r = hapusRoleKustom(body.id);
        // `dipindah` diteruskan supaya panel bisa memberi tahu bot mana yang
        // rolenya jatuh kembali ke `full` — jangan telan senyap.
        json(res, 200, { ok: true, dipindah: r.dipindah || [] });
      } catch (e) { json(res, 400, { error: e.message }); }
      return;
    }

    // Menautkan bot TAMBAHAN. Memakai mesin jadibot yang sudah ada supaya tidak
    // ada implementasi socket kedua; `m` = null berarti kodenya tidak dikirim ke
    // chat WhatsApp mana pun, hanya ke papan status untuk panel.
    if (req.method === 'POST' && url === '/bots/pair') {
      const sock = getSocket();
      if (!sock || !isConnected()) {
        json(res, 503, { error: 'Bot utama harus tersambung dulu' });
        return;
      }
      try {
        const body = await parseBody(req);
        const nomor = String(body.nomor || '').replace(/[^0-9]/g, '');
        if (nomor.length < 10 || nomor.length > 15) {
          json(res, 400, { error: 'Nomor tidak valid (10-15 digit)' }); return;
        }
        const { startJadibot } = await import('./hillz-jadibot-manager.js');
        // Slot didaftarkan dulu supaya panel bisa langsung menampilkan barisnya
        // walau pairing masih berjalan.
        simpanBot(nomor, { nomor, label: body.label || nomor, role: body.role || 'full', aktif: true });
        startJadibot(sock, null, nomor + '@s.whatsapp.net', true).catch(() => { });
        json(res, 202, { ok: true, message: 'Pairing dimulai, tunggu kode di panel' });
      } catch (e) { json(res, 500, { error: e.message }); }
      return;
    }

    if (req.method === 'POST' && url === '/bots/stop') {
      try {
        const body = await parseBody(req);
        const nomor = String(body.nomor || '').replace(/[^0-9]/g, '');
        const { stopJadibot } = await import('./hillz-jadibot-manager.js');
        await stopJadibot(nomor + '@s.whatsapp.net');
        json(res, 200, { ok: true });
      } catch (e) { json(res, 500, { error: e.message }); }
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
