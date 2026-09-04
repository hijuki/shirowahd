/**
 * Menyalakan web-uploader.js di port sementara + bot WA TIRUAN, khusus untuk
 * diuji lewat browser sungguhan. Berkas skor/rahasia dipisah dari produksi.
 *
 * Cetak JSON satu baris berisi port + token, lalu hidup sampai dibunuh.
 * Dipakai oleh uji browser; JANGAN dipakai di produksi.
 */
import { spawn } from 'child_process';
import http from 'http';
import net from 'net';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const KERJA = mkdtempSync(join(tmpdir(), 'arena-browser-'));
process.env.ARENA_SCORES = join(KERJA, 'skor.json');
process.env.ARENA_SECRET_FILE = join(KERJA, 'rahasia');

function portKosong() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}

const PORT = await portKosong();

/* bot WA tiruan: catat pesan yang dikirim web-uploader ke berkas */
const CATATAN = join(KERJA, 'pesan-wa.json');
const ditangkap = [];
writeFileSync(CATATAN, '[]');
const botTiruan = http.createServer((req, res) => {
  const c = [];
  req.on('data', (d) => c.push(d));
  req.on('end', () => {
    let b = null;
    try { b = JSON.parse(Buffer.concat(c).toString()); } catch {}
    ditangkap.push({ path: req.url, body: b, waktu: Date.now() });
    writeFileSync(CATATAN, JSON.stringify(ditangkap, null, 2));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
  });
});
await new Promise((r) => botTiruan.listen(0, '127.0.0.1', r));
const PORT_BOT = botTiruan.address().port;

const anak = spawn('node', ['web-uploader.js'], {
  cwd: new URL('../..', import.meta.url).pathname,
  env: {
    ...process.env,
    WEB_PORT: String(PORT),
    ARENA_BOT_HOST: '127.0.0.1',
    ARENA_BOT_PORT: String(PORT_BOT),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
anak.stdout.on('data', (d) => { log += d; });
anak.stderr.on('data', (d) => { log += d; });

/* tunggu siap */
function ping() {
  return new Promise((res) => {
    const r = http.request({ hostname: '127.0.0.1', port: PORT, path: '/api/arena/papan', timeout: 3000 }, (resp) => {
      resp.resume(); res(resp.statusCode === 200);
    });
    r.on('error', () => res(false));
    r.on('timeout', () => { r.destroy(); res(false); });
    r.end();
  });
}
let siap = false;
for (let i = 0; i < 60; i++) { if (await ping()) { siap = true; break; } await new Promise((r) => setTimeout(r, 250)); }
if (!siap) { console.log(JSON.stringify({ ok: false, log: log.slice(0, 2000) })); process.exit(1); }

const { buatToken, rahasiaArena } = await import('./hillz-arena.js');
const token = buatToken(rahasiaArena(), '628111000111@s.whatsapp.net', 'Uji Browser', 30 * 60 * 1000);

console.log(JSON.stringify({
  ok: true, port: PORT, portBot: PORT_BOT, token,
  kerja: KERJA, catatan: CATATAN, skor: process.env.ARENA_SCORES,
}));

function bereskan() {
  try { anak.kill('SIGKILL'); } catch {}
  try { botTiruan.close(); } catch {}
  try { rmSync(KERJA, { recursive: true, force: true }); } catch {}
}
process.on('SIGTERM', () => { bereskan(); process.exit(0); });
process.on('SIGINT', () => { bereskan(); process.exit(0); });
setInterval(() => {}, 1 << 30);
