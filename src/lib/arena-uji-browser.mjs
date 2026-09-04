/**
 * UJI BROWSER SUNGGUHAN untuk /arena — memakai Chrome headless lewat CDP
 * mentah (tanpa puppeteer, karena tidak terpasang).
 *
 * Yang dibuktikan (hal yang TIDAK bisa dibuktikan uji HTTP):
 *   1. halaman benar-benar dirender: papan 4x4 muncul, 2 ubin awal ada
 *   2. tekan tombol arah -> ubin bergerak, skor di layar berubah
 *   3. permainan bisa diselesaikan dan skor terkirim ke server
 *   4. skor di layar SAMA dengan skor yang dihitung server (bukti mesin cocok)
 *   5. papan skor di halaman terisi setelah selesai
 *   6. tidak ada error JavaScript di konsol
 *
 * Argumen: node arena-uji-browser.mjs <url-arena-dengan-token>
 */
import { spawn } from 'child_process';
import http from 'http';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const ARG_URL = process.argv[2];

/* ── Server uji dinyalakan sendiri, supaya tiap jalan mulai dari NOL.
   Kalau memakai server yang sudah lama hidup, skor run sebelumnya masih
   ada di berkas → skor baru bukan rekor → pemberitahuan WA tidak dikirim,
   dan uji "WA diberitahu" gagal padahal kodenya benar. Itu jebakan yang
   sudah kena sekali. ── */
let srv = null;
let URL_UJI = ARG_URL;
if (!URL_UJI) {
  srv = spawn('node', ['src/lib/arena-uji-server.mjs'], {
    cwd: new URL('../..', import.meta.url).pathname,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let keluaran = '';
  const info = await new Promise((res, rej) => {
    const jam = setTimeout(() => rej(new Error('server uji tidak siap: ' + keluaran.slice(0, 500))), 45000);
    srv.stdout.on('data', (d) => {
      keluaran += d;
      const baris = keluaran.split('\n').find((b) => b.trim().startsWith('{'));
      if (baris) { clearTimeout(jam); try { res(JSON.parse(baris)); } catch (e) { rej(e); } }
    });
    srv.stderr.on('data', (d) => { keluaran += d; });
    srv.on('exit', () => { clearTimeout(jam); rej(new Error('server uji mati: ' + keluaran.slice(0, 500))); });
  });
  if (!info.ok) { console.log('server uji gagal: ' + JSON.stringify(info).slice(0, 500)); process.exit(1); }
  URL_UJI = 'http://127.0.0.1:' + info.port + '/arena?t=' + encodeURIComponent(info.token);
  console.log('Server uji sendiri di port ' + info.port + ' (papan skor kosong)');
}

let lulus = 0, gagal = 0;
function cek(nama, dapat, harus) {
  const ok = JSON.stringify(dapat) === JSON.stringify(harus);
  if (ok) { lulus++; console.log('  LULUS ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + '\n    dapat: ' + JSON.stringify(dapat) + '\n    harus: ' + JSON.stringify(harus)); }
}
function cekBenar(nama, syarat, catatan = '') {
  if (syarat) { lulus++; console.log('  LULUS ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + (catatan ? ' — ' + String(catatan).slice(0, 200) : '')); }
}

/* ── jalankan Chrome headless dengan port debug ── */
const PROFIL = mkdtempSync(join(tmpdir(), 'arena-chrome-'));
const PORT_CDP = 9333 + Math.floor(Math.random() * 400);
const chrome = spawn('google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--remote-debugging-port=' + PORT_CDP,
  '--user-data-dir=' + PROFIL,
  '--window-size=430,900',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
let logChrome = '';
chrome.stdout.on('data', (d) => { logChrome += d; });
chrome.stderr.on('data', (d) => { logChrome += d; });

function bereskan() {
  try { chrome.kill('SIGKILL'); } catch {}
  try { if (srv) srv.kill('SIGTERM'); } catch {}
  try { rmSync(PROFIL, { recursive: true, force: true }); } catch {}
}
process.on('exit', bereskan);
process.on('uncaughtException', (e) => { console.log('LEDAK: ' + e.stack); bereskan(); process.exit(1); });

function ambilJSON(jalan) {
  return new Promise((res) => {
    const r = http.get({ hostname: '127.0.0.1', port: PORT_CDP, path: jalan, timeout: 4000 }, (resp) => {
      const c = []; resp.on('data', (d) => c.push(d));
      resp.on('end', () => { try { res(JSON.parse(Buffer.concat(c).toString())); } catch { res(null); } });
    });
    r.on('error', () => res(null));
    r.on('timeout', () => { r.destroy(); res(null); });
  });
}

let ver = null;
for (let i = 0; i < 60; i++) { ver = await ambilJSON('/json/version'); if (ver) break; await new Promise((r) => setTimeout(r, 300)); }
if (!ver) { console.log('CHROME TIDAK JALAN:\n' + logChrome.slice(0, 1500)); process.exit(1); }
console.log('Chrome siap: ' + (ver['Browser'] || '?'));

/* ── WebSocket minimal (CDP butuh ws; ditulis tangan supaya tanpa dependensi) ── */
import { createHash, randomBytes } from 'crypto';
import net from 'net';

function wsSambung(wsUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(wsUrl);
    const kunci = randomBytes(16).toString('base64');
    const sock = net.connect(Number(u.port), u.hostname, () => {
      sock.write(
        `GET ${u.pathname}${u.search} HTTP/1.1\r\n` +
        `Host: ${u.host}\r\n` +
        'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
        `Sec-WebSocket-Key: ${kunci}\r\n` +
        'Sec-WebSocket-Version: 13\r\n\r\n'
      );
    });
    let jabatSelesai = false;
    let sisa = Buffer.alloc(0);
    const penanti = new Map();
    const pesanLain = [];
    let idBerikut = 1;

    function bacaKerangka() {
      while (sisa.length >= 2) {
        const b1 = sisa[0], b2 = sisa[1];
        const opcode = b1 & 0x0f;
        let panjang = b2 & 0x7f;
        let ofs = 2;
        if (panjang === 126) { if (sisa.length < 4) return; panjang = sisa.readUInt16BE(2); ofs = 4; }
        else if (panjang === 127) { if (sisa.length < 10) return; panjang = Number(sisa.readBigUInt64BE(2)); ofs = 10; }
        if (sisa.length < ofs + panjang) return;
        const isi = sisa.subarray(ofs, ofs + panjang);
        sisa = sisa.subarray(ofs + panjang);
        if (opcode === 1) {
          let j = null;
          try { j = JSON.parse(isi.toString()); } catch {}
          if (j && j.id && penanti.has(j.id)) { penanti.get(j.id)(j); penanti.delete(j.id); }
          else if (j) pesanLain.push(j);
        } else if (opcode === 8) { sock.end(); }
      }
    }

    sock.on('data', (d) => {
      if (!jabatSelesai) {
        sisa = Buffer.concat([sisa, d]);
        const i = sisa.indexOf('\r\n\r\n');
        if (i === -1) return;
        const kepala = sisa.subarray(0, i).toString();
        if (!/101/.test(kepala)) return reject(new Error('jabat tangan ws gagal: ' + kepala.split('\r\n')[0]));
        const harus = createHash('sha1').update(kunci + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
        if (!kepala.includes(harus)) return reject(new Error('Sec-WebSocket-Accept salah'));
        sisa = sisa.subarray(i + 4);
        jabatSelesai = true;
        resolve(api);
        bacaKerangka();
        return;
      }
      sisa = Buffer.concat([sisa, d]);
      bacaKerangka();
    });
    sock.on('error', reject);

    function kirim(teks) {
      const isi = Buffer.from(teks);
      const mask = randomBytes(4);
      let kepala;
      if (isi.length < 126) kepala = Buffer.from([0x81, 0x80 | isi.length]);
      else if (isi.length < 65536) { kepala = Buffer.alloc(4); kepala[0] = 0x81; kepala[1] = 0xfe; kepala.writeUInt16BE(isi.length, 2); }
      else { kepala = Buffer.alloc(10); kepala[0] = 0x81; kepala[1] = 0xff; kepala.writeBigUInt64BE(BigInt(isi.length), 2); }
      const bertopeng = Buffer.alloc(isi.length);
      for (let i = 0; i < isi.length; i++) bertopeng[i] = isi[i] ^ mask[i % 4];
      sock.write(Buffer.concat([kepala, mask, bertopeng]));
    }

    const api = {
      kirim(metode, params = {}) {
        const id = idBerikut++;
        return new Promise((res, rej) => {
          const jam = setTimeout(() => { penanti.delete(id); rej(new Error('timeout CDP ' + metode)); }, 20000);
          penanti.set(id, (j) => { clearTimeout(jam); j.error ? rej(new Error(metode + ': ' + j.error.message)) : res(j.result); });
          kirim(JSON.stringify({ id, method: metode, params }));
        });
      },
      pesanLain,
      tutup() { try { sock.end(); } catch {} },
    };
  });
}

const daftar = await ambilJSON('/json/list');
const target = (daftar || []).find((t) => t.type === 'page');
if (!target) { console.log('tidak ada tab'); process.exit(1); }
const cdp = await wsSambung(target.webSocketDebuggerUrl);
await cdp.kirim('Page.enable');
await cdp.kirim('Runtime.enable');
await cdp.kirim('Console.enable');

async function nilai(ekspresi) {
  const r = await cdp.kirim('Runtime.evaluate', { expression: ekspresi, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('JS: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}
async function tunggu(ekspresi, batas = 12000) {
  const mulai = Date.now();
  while (Date.now() - mulai < batas) {
    try { if (await nilai(ekspresi)) return true; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

/* ── buka halaman ── */
await cdp.kirim('Page.navigate', { url: URL_UJI });
const adaPapan = await tunggu("!!document.querySelector('#papan') && document.querySelectorAll('#papan .kosong').length === 16");
console.log('');
console.log('══ Halaman dirender ══');
cekBenar('papan 4x4 siap', adaPapan);

const awal = await nilai(`(() => {
  const sel = [...document.querySelectorAll('#papan .sel')];
  return {
    judul: document.title,
    isiSel: sel.map(s => s.textContent.trim()),
    terisi: sel.filter(s => s.textContent.trim() !== '').length,
    skor: document.querySelector('#skor')?.textContent.trim(),
    pemain: document.querySelector('#namaPemain')?.textContent.trim(),
    kartuPemainTampil: !!document.querySelector('#kartuPemain') && getComputedStyle(document.querySelector('#kartuPemain')).display !== 'none',
    adaTombolArah: !!document.querySelector('[data-arah="0"]') || !!document.querySelector('.pad .ibtn'),
    jumlahKosong: document.querySelectorAll('#papan .kosong').length,
  };
})()`);
cekBenar('judul memuat ARENA', /ARENA/i.test(awal.judul || ''), awal.judul);
cek('16 kotak latar papan', awal.jumlahKosong, 16);
cek('2 ubin awal', awal.terisi, 2);
cek('skor awal 0', awal.skor, '0');
cekBenar('nama pemain dari token tampil', (awal.pemain || '').includes('Uji Browser'), JSON.stringify(awal.pemain));
cekBenar('kartu pemain tampil (bukan tamu)', awal.kartuPemainTampil === true);
cekBenar('tombol arah ada (bisa disentuh di HP)', awal.adaTombolArah);

/* ── main: tekan tombol arah sampai skor naik ── */
console.log('\n══ Main lewat tombol & papan tuts ══');
const hasilMain = await nilai(`(async () => {
  const tidur = ms => new Promise(r => setTimeout(r, ms));
  const skorSkr = () => Number(document.querySelector('#skor').textContent.trim());
  const isi = () => [...document.querySelectorAll('#papan .sel')].map(s => s.textContent.trim()).join(',');
  const sebelum = isi();
  let langkah = 0, berubah = 0;
  for (let i = 0; i < 120; i++) {
    const arah = i % 4;
    const t = document.querySelector('[data-arah="' + arah + '"]');
    const lama = isi();
    t.click();
    await tidur(30);
    langkah++;
    if (isi() !== lama) berubah++;
    if (skorSkr() > 40 && berubah > 12) break;
  }
  return { sebelum, sesudah: isi(), langkah, berubah, skor: skorSkr(),
           selesai: !!document.querySelector('#tirai')?.classList.contains('tampil') };
})()`);
cekBenar('papan berubah setelah ditekan', hasilMain.sebelum !== hasilMain.sesudah);
cekBenar('sebagian langkah mengubah papan', hasilMain.berubah > 5, 'berubah ' + hasilMain.berubah + '/' + hasilMain.langkah);
cekBenar('skor di layar naik dari 0', hasilMain.skor > 0, 'skor ' + hasilMain.skor);

/* tombol keyboard juga harus jalan (main di laptop) */
const sebelumTuts = await nilai("[...document.querySelectorAll('#papan .sel')].map(s=>s.textContent.trim()).join(',')");
for (const kode of ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']) {
  await cdp.kirim('Input.dispatchKeyEvent', { type: 'keyDown', key: kode, code: kode, windowsVirtualKeyCode: { ArrowUp: 38, ArrowLeft: 37, ArrowDown: 40, ArrowRight: 39 }[kode] });
  await cdp.kirim('Input.dispatchKeyEvent', { type: 'keyUp', key: kode, code: kode });
  await new Promise((r) => setTimeout(r, 80));
}
const sesudahTuts = await nilai("[...document.querySelectorAll('#papan .sel')].map(s=>s.textContent.trim()).join(',')");
cekBenar('papan tuts (arrow key) juga jalan', sebelumTuts !== sesudahTuts);

/* ── selesaikan permainan: kirim skor ke server ── */
console.log('\n══ Kirim skor ke server ══');
// Sadap fetch DULU, supaya balasan server bisa dibaca apa adanya —
// bukan cuma percaya teks yang halaman tulis sendiri.
await nilai(`(() => {
  window.__resp = {};
  const asli = window.fetch;
  window.fetch = function(u, o) {
    return asli(u, o).then(r => {
      const klon = r.clone();
      klon.json().then(j => { window.__resp[String(u).split('?')[0]] = j; }).catch(() => {});
      return r;
    });
  };
  return true;
})()`);

const kirim = await nilai(`(async () => {
  const skorLayar = Number(document.querySelector('#skor').textContent.trim());
  const t = document.querySelector('#bKirim');
  if (!t) return { ada: false };
  t.click();
  const mulai = Date.now();
  while (Date.now() - mulai < 20000) {
    const lap = document.querySelector('#lap')?.textContent || '';
    if (/SKOR SERVER|KIRIM ✕/.test(lap)) break;
    await new Promise(r => setTimeout(r, 200));
  }
  return {
    ada: true, skorLayar,
    lap: (document.querySelector('#lap')?.textContent || '').replace(/\\s+/g, ' ').trim(),
    tombol: document.querySelector('#bKirim')?.textContent.trim(),
    balasan: window.__resp['/api/arena/selesai'] || null,
  };
})()`);
cekBenar('tombol KIRIM SKOR ada', kirim.ada);
cekBenar('server menerima & membalas', !!kirim.balasan, JSON.stringify(kirim).slice(0, 300));
if (kirim.balasan) {
  cek('server bilang ok', kirim.balasan.ok, true);
  cekBenar('SKOR LAYAR == SKOR SERVER', kirim.balasan.skor === kirim.skorLayar,
    'layar ' + kirim.skorLayar + ' vs server ' + kirim.balasan.skor);
  cekBenar('server memberi peringkat', !!(kirim.balasan.peringkat && kirim.balasan.peringkat.posisi), JSON.stringify(kirim.balasan.peringkat));
  cekBenar('WA diberitahu (bot tiruan)', kirim.balasan.wa === true, JSON.stringify(kirim.balasan.wa));
}
cekBenar('layar bilang skor cocok', /✓ cocok/.test(kirim.lap || ''), kirim.lap);
cekBenar('tombol berubah jadi TERKIRIM', /TERKIRIM/.test(kirim.tombol || ''), kirim.tombol);

/* ── papan skor di halaman ── */
console.log('\n══ Papan skor di halaman ══');
const papan = await nilai(`(async () => {
  const t = document.querySelector('#bMuat');
  if (t) t.click();
  await new Promise(r => setTimeout(r, 1500));
  const baris = [...document.querySelectorAll('#papanSkor .pos')];
  return {
    jumlah: baris.length,
    teks: baris.map(b => b.textContent.replace(/\\s+/g, ' ').trim()).slice(0, 5),
    akuDitandai: baris.filter(b => b.getAttribute('data-aku') === '1').length,
    adaNomorWA: /62\\d{8,}|@s\\.whatsapp\\.net/.test(document.body.innerHTML),
  };
})()`);
cekBenar('papan skor terisi', papan.jumlah >= 1, JSON.stringify(papan));
cekBenar('nama pemain tampil di papan', (papan.teks[0] || '').includes('Uji Browser'), JSON.stringify(papan.teks));
cekBenar('baris milikku ditandai', papan.akuDitandai === 1, 'ditandai ' + papan.akuDitandai);
cekBenar('NOMOR WA TIDAK ADA DI HALAMAN', papan.adaNomorWA === false);

/* ── konsol bersih ── */
console.log('\n══ Tidak ada error JS ══');
const galat = cdp.pesanLain.filter((p) => p.method === 'Runtime.exceptionThrown');
const konsolGalat = cdp.pesanLain.filter((p) => p.method === 'Runtime.consoleAPICalled' && p.params?.type === 'error');
cekBenar('tidak ada exception JS', galat.length === 0, JSON.stringify(galat.slice(0, 2)).slice(0, 300));
cekBenar('tidak ada console.error', konsolGalat.length === 0, JSON.stringify(konsolGalat.map((k) => k.params.args?.map((a) => a.value)).slice(0, 3)).slice(0, 300));

cdp.tutup();
bereskan();
console.log('\n────────────────────────────────');
console.log(gagal === 0 ? '✓ SEMUA ' + lulus + ' UJI BROWSER LULUS' : '✗ ' + gagal + ' GAGAL dari ' + (lulus + gagal));
process.exit(gagal === 0 ? 0 : 1);
