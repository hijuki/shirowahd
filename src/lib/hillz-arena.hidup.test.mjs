/**
 * UJI HIDUP: menjalankan web-uploader.js SUNGGUHAN di port terpisah, dengan
 * berkas skor & rahasia terpisah, dan bot WA DITIRU oleh server lokal.
 *
 * Yang dibuktikan:
 *   1. rute lama (/, /api/stats/public, /upload) masih hidup -> tidak ada yang rusak
 *   2. /arena, /api/arena/mulai, /selesai, /papan bekerja
 *   3. skor dihitung server dari langkah, skor karangan klien diabaikan
 *   4. sesi tidak bisa dipakai dua kali
 *   5. token WA palsu ditolak, papan skor TIDAK membocorkan nomor
 *   6. pesan WA benar-benar dikirim (ditangkap server tiruan)
 *
 * Tidak ada pesan WhatsApp sungguhan yang terkirim: ARENA_BOT_PORT dialihkan.
 */
import { spawn } from 'child_process';
import http from 'http';
import net from 'net';
import { unlinkSync, existsSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const KERJA = mkdtempSync(join(tmpdir(), 'arena-uji-'));
const BERKAS_SKOR = join(KERJA, 'skor.json');
const BERKAS_RAHASIA = join(KERJA, 'rahasia');

// WAJIB sebelum modul arena dipakai: kalau tidak, proses uji ini memakai
// berkas rahasia PRODUKSI dan token yang dibuatnya tidak akan cocok dengan
// yang dipakai server uji.
process.env.ARENA_SECRET_FILE = BERKAS_RAHASIA;
process.env.ARENA_SCORES = BERKAS_SKOR;

/**
 * Port dipilih yang benar-benar kosong, bukan angka tetap.
 *
 * Pelajaran mahal: run sebelumnya pernah mati di tengah jalan dan
 * meninggalkan web-uploader hidup di port tetap. Run berikutnya gagal
 * listen (EADDRINUSE) tapi tetap "sukses" konek — ke server BASI dengan
 * rahasia dari berkas yang sudah dihapus. Akibatnya token tidak cocok dan
 * uji menuduh kode salah padahal kodenya benar.
 */
function portKosong() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}
const PORT = await portKosong();

let lulus = 0, gagal = 0;
function cek(nama, dapat, harus) {
  const ok = JSON.stringify(dapat) === JSON.stringify(harus);
  if (ok) { lulus++; console.log('  LULUS ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + '\n    dapat: ' + JSON.stringify(dapat) + '\n    harus: ' + JSON.stringify(harus)); }
}
function cekBenar(nama, syarat, catatan = '') {
  if (syarat) { lulus++; console.log('  LULUS ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + (catatan ? ' — ' + catatan : '')); }
}

/* ── bot WA tiruan: menangkap apa pun yang dikirim web-uploader ── */
const ditangkap = [];
const botTiruan = http.createServer((req, res) => {
  const c = [];
  req.on('data', (d) => c.push(d));
  req.on('end', () => {
    let b = null;
    try { b = JSON.parse(Buffer.concat(c).toString()); } catch {}
    ditangkap.push({ path: req.url, body: b });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
  });
});
await new Promise((r) => botTiruan.listen(0, '127.0.0.1', r));
const PORT_BOT = botTiruan.address().port;
console.log('Bot WA tiruan siap di 127.0.0.1:' + PORT_BOT);

/* ── jalankan web-uploader sungguhan ── */
const anak = spawn('node', ['web-uploader.js'], {
  cwd: new URL('../..', import.meta.url).pathname,
  env: {
    ...process.env,
    WEB_PORT: String(PORT),
    ARENA_SCORES: BERKAS_SKOR,
    ARENA_SECRET_FILE: BERKAS_RAHASIA,
    ARENA_BOT_HOST: '127.0.0.1',
    ARENA_BOT_PORT: String(PORT_BOT),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
anak.stdout.on('data', (d) => { log += d; });
anak.stderr.on('data', (d) => { log += d; });

function panggil(jalan, opsi = {}) {
  return new Promise((resolve) => {
    const isi = opsi.body ? Buffer.from(JSON.stringify(opsi.body)) : null;
    const r = http.request({
      hostname: '127.0.0.1', port: PORT, path: jalan, method: opsi.method || 'GET',
      headers: isi ? { 'Content-Type': 'application/json', 'Content-Length': isi.length } : {},
      timeout: 15000,
    }, (resp) => {
      const c = [];
      resp.on('data', (d) => c.push(d));
      resp.on('end', () => {
        const teks = Buffer.concat(c).toString();
        let json = null;
        try { json = JSON.parse(teks); } catch {}
        resolve({ status: resp.statusCode, teks, json });
      });
    });
    r.on('error', (e) => resolve({ status: 0, teks: e.message, json: null }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, teks: 'timeout', json: null }); });
    if (isi) r.end(isi); else r.end();
  });
}

/* tunggu server siap */
let siap = false;
for (let i = 0; i < 60; i++) {
  const h = await panggil('/api/arena/papan');
  if (h.status === 200) { siap = true; break; }
  await new Promise((r) => setTimeout(r, 250));
}
if (!siap) { console.log('SERVER TIDAK SIAP. Log:\n' + log.slice(0, 3000)); process.exit(1); }
console.log('web-uploader hidup di port ' + PORT + '\n');

/* ══ 1. rute yang sudah ada wajib tetap hidup ══ */
console.log('══ Rute lama tidak rusak ══');
{
  const beranda = await panggil('/');
  cek('GET / -> 200', beranda.status, 200);
  cekBenar('GET / mengembalikan HTML uploader', beranda.teks.includes('<html') && beranda.teks.length > 500);

  const stat = await panggil('/api/stats/public');
  cek('GET /api/stats/public -> 200', stat.status, 200);
  cekBenar('stats punya kunci ok', stat.json && stat.json.ok !== undefined, JSON.stringify(stat.json || {}).slice(0, 120));

  const setelan = await panggil('/api/settings/public');
  cek('GET /api/settings/public -> 200', setelan.status, 200);

  const kegiatan = await panggil('/api/activity/public');
  cek('GET /api/activity/public -> 200', kegiatan.status, 200);

  const statusJob = await panggil('/upload/status/tidakada');
  cek('GET /upload/status/<ngawur> -> 404 (bukan 500)', statusJob.status, 404);

  const hilang = await panggil('/jalan-yang-tidak-ada');
  cek('rute ngawur tetap 404', hilang.status, 404);
}

/* ══ 2. halaman game ══ */
console.log('\n══ Halaman /arena ══');
{
  const h = await panggil('/arena');
  cek('GET /arena -> 200', h.status, 200);
  cekBenar('berisi papan 2048', h.teks.includes('ARENA 2048') && h.teks.includes('id="papan"'));
  cekBenar('tidak ada kredensial di HTML',
    !/adminPassword|Bearer |GIT_TOKEN|CF_KEY/i.test(h.teks));
  cekBenar('tidak memanggil /admin/api', !h.teks.includes('/admin/api'));
}

/* ══ 3. main jujur: skor server = skor mesin klien ══ */
console.log('\n══ Main jujur, skor dihitung server ══');
const { rngBaru, papanBaru, geser, ubinTertinggi } = await import('./hillz-arena.js');
let sesiJujur = null, skorJujur = 0, langkahJujur = [];
{
  const m = await panggil('/api/arena/mulai', { method: 'POST', body: {} });
  cek('POST /mulai (tamu) -> 200', m.status, 200);
  cekBenar('server memberi seed', Number.isInteger(m.json.seed));
  cekBenar('server memberi sesi bertanda tangan', typeof m.json.sesi === 'string' && m.json.sesi.includes('.'));
  cek('tamu -> pemain null', m.json.pemain, null);

  // main memakai modul server (mesin identik sudah diuji terpisah)
  const st = papanBaru(m.json.seed);
  const acak = rngBaru((m.json.seed ^ 0x5bf03635) >>> 0);
  let putus = 0;
  while (!st.selesai && langkahJujur.length < 1200 && putus < 40) {
    const a = Math.floor(acak() * 4);
    if (geser(st, a).pindah) { langkahJujur.push(a); putus = 0; } else putus++;
  }
  skorJujur = st.skor;
  sesiJujur = m.json.sesi;

  const s = await panggil('/api/arena/selesai', { method: 'POST', body: { sesi: sesiJujur, langkah: langkahJujur } });
  cek('POST /selesai -> 200', s.status, 200);
  cek('skor server = skor lokal', s.json.skor, skorJujur);
  cek('ubin server = ubin lokal', s.json.ubin, ubinTertinggi(st));
  cek('tamu ditandai tamu', s.json.tamu, true);
  cek('tamu tidak masuk peringkat', s.json.peringkat, null);
  cek('tamu tidak memicu WA', s.json.wa, false);
  console.log('  (info) skor ' + skorJujur + ' dari ' + langkahJujur.length + ' langkah');
}

/* ══ 4. sesi tidak bisa dipakai ulang ══ */
console.log('\n══ Anti kirim ulang ══');
{
  const ulang = await panggil('/api/arena/selesai', { method: 'POST', body: { sesi: sesiJujur, langkah: langkahJujur } });
  cek('kirim sesi yang sama 2x -> 409', ulang.status, 409);
}

/* ══ 5. curang ditolak ══ */
console.log('\n══ Curang ditolak ══');
{
  const m = await panggil('/api/arena/mulai', { method: 'POST', body: {} });

  // (a) kirim skor karangan di payload — harus DIABAIKAN, bukan dipakai
  const st = papanBaru(m.json.seed);
  const urut = [];
  for (let i = 0; i < 40; i++) { const a = i % 4; if (geser(st, a).pindah) urut.push(a); }
  const palsu = await panggil('/api/arena/selesai', {
    method: 'POST', body: { sesi: m.json.sesi, langkah: urut, skor: 999999, ubin: 65536 },
  });
  cek('skor karangan diabaikan', palsu.json.skor, st.skor);
  cekBenar('skor karangan TIDAK masuk', palsu.json.skor !== 999999);

  // (b) sesi dipalsukan
  const rusak = await panggil('/api/arena/selesai', { method: 'POST', body: { sesi: 'aaaa.bbbb', langkah: [0, 1] } });
  cek('sesi palsu -> 403', rusak.status, 403);

  // (c) tanda tangan diubah 1 karakter
  const m2 = await panggil('/api/arena/mulai', { method: 'POST', body: {} });
  const bagi = m2.json.sesi.split('.');
  const tagRusak = bagi[0] + '.' + (bagi[1][0] === 'A' ? 'B' : 'A') + bagi[1].slice(1);
  const ubah = await panggil('/api/arena/selesai', { method: 'POST', body: { sesi: tagRusak, langkah: [0] } });
  cek('tanda tangan diubah -> 403', ubah.status, 403);

  // (d) langkah tidak sah
  const m3 = await panggil('/api/arena/mulai', { method: 'POST', body: {} });
  const arahNgawur = await panggil('/api/arena/selesai', { method: 'POST', body: { sesi: m3.json.sesi, langkah: [0, 1, 77] } });
  cek('arah 77 -> 400', arahNgawur.status, 400);

  // (e) token WA palsu tidak memberi identitas
  const tokenPalsu = await panggil('/api/arena/mulai', { method: 'POST', body: { token: 'xxx.yyy' } });
  cek('token palsu -> tetap 200 tapi pemain null', tokenPalsu.json.pemain, null);
}

/* ══ 6. pemain WA sungguhan: papan skor + pesan WA ══ */
console.log('\n══ Pemain WA + pemberitahuan ══');
{
  // token dibuat memakai rahasia yang SAMA dengan yang dipakai server
  const { buatToken, rahasiaArena } = await import('./hillz-arena.js');
  const rahasia = rahasiaArena();
  const jid = '628111222333@s.whatsapp.net';
  const token = buatToken(rahasia, jid, 'Uji <b>Pemain</b>');

  const m = await panggil('/api/arena/mulai', { method: 'POST', body: { token } });
  cek('mulai dengan token -> 200', m.status, 200);
  cekBenar('nama pemain dikenali', typeof m.json.pemain === 'string' && m.json.pemain.length > 0, JSON.stringify(m.json.pemain));

  const st = papanBaru(m.json.seed);
  const acak = rngBaru((m.json.seed ^ 0x1234) >>> 0);
  const urut = [];
  let putus = 0;
  while (!st.selesai && urut.length < 1200 && putus < 40) {
    const a = Math.floor(acak() * 4);
    if (geser(st, a).pindah) { urut.push(a); putus = 0; } else putus++;
  }

  const jumlahSebelum = ditangkap.length;
  const s = await panggil('/api/arena/selesai', { method: 'POST', body: { sesi: m.json.sesi, langkah: urut } });
  cek('selesai -> 200', s.status, 200);
  cek('skor cocok', s.json.skor, st.skor);
  cekBenar('dapat peringkat', s.json.peringkat && s.json.peringkat.posisi >= 1, JSON.stringify(s.json.peringkat));
  cek('rekor baru = true', s.json.rekorBaru, true);
  cek('WA diberitahu', s.json.wa, true);

  cekBenar('bot tiruan menerima 1 pesan baru', ditangkap.length === jumlahSebelum + 1, 'dapat ' + (ditangkap.length - jumlahSebelum));
  const pesan = ditangkap[ditangkap.length - 1] || { path: '(tidak ada)', body: { jid: '', text: '' } };
  cek('dikirim ke /send', pesan.path, '/send');
  cek('jid tujuan benar', pesan.body.jid, jid);
  cekBenar('isi pesan memuat skor', pesan.body.text.includes(String(st.skor)), pesan.body.text.slice(0, 80));
  cekBenar('isi pesan memuat kata REKOR', pesan.body.text.includes('REKOR'));

  // papan skor publik: nama bersih, nomor TIDAK bocor
  const p = await panggil('/api/arena/papan');
  cek('papan -> 200', p.status, 200);
  cekBenar('ada 1 pemain di papan', p.json.papan.length === 1, JSON.stringify(p.json.papan));
  cekBenar('NOMOR WA TIDAK BOCOR', !p.teks.includes('628111222333') && !p.teks.includes('@s.whatsapp.net'), p.teks.slice(0, 200));
  cekBenar('tag HTML di nama dibuang', !p.json.papan[0].nama.includes('<'), p.json.papan[0].nama);
  cekBenar('kunci jid tidak ada di balasan', !Object.keys(p.json.papan[0]).includes('jid'));

  // token benar -> pemain dikenali di papan skor
  const pAku = await panggil('/api/arena/papan?t=' + encodeURIComponent(token));
  cek('papan?t= -> menandai aku', pAku.json.papan[0].aku, true);
  const pTanpa = await panggil('/api/arena/papan');
  cek('papan tanpa token -> aku false', pTanpa.json.papan[0].aku, false);

  // skor LEBIH RENDAH tidak boleh dianggap rekor baru
  const m2 = await panggil('/api/arena/mulai', { method: 'POST', body: { token } });
  const kecil = await panggil('/api/arena/selesai', { method: 'POST', body: { sesi: m2.json.sesi, langkah: [] } });
  cek('permainan 0 langkah -> 200', kecil.status, 200);
  cek('skor 0 bukan rekor baru', kecil.json.rekorBaru, false);
  cek('skor 0 tidak memicu WA', kecil.json.wa, false);
}

/* ══ 7. upload masih utuh (maintenance ON = ditolak di gerbang) ══ */
console.log('\n══ Upload tidak terganggu ══');
{
  const batas = '----uji' + Date.now();
  const badan = Buffer.from(
    `--${batas}\r\nContent-Disposition: form-data; name="file"; filename="a.txt"\r\nContent-Type: text/plain\r\n\r\nbukan video\r\n--${batas}--\r\n`
  );
  const h = await new Promise((resolve) => {
    const r = http.request({
      hostname: '127.0.0.1', port: PORT, path: '/upload', method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + batas, 'Content-Length': badan.length },
      timeout: 20000,
    }, (resp) => {
      const c = [];
      resp.on('data', (d) => c.push(d));
      resp.on('end', () => { let j = null; const t = Buffer.concat(c).toString(); try { j = JSON.parse(t); } catch {} resolve({ status: resp.statusCode, teks: t, json: j }); });
    });
    r.on('error', (e) => resolve({ status: 0, teks: e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, teks: 'timeout' }); });
    r.end(badan);
  });
  cekBenar('POST /upload dijawab handler (bukan mati)', h.status !== 0, h.teks);
  cekBenar('jawaban upload berbentuk JSON', !!h.json, h.teks.slice(0, 160));
  console.log('  (info) /upload -> ' + h.status + ' ' + JSON.stringify(h.json));
}

/* ══ 8. berkas skor terpisah & rapi ══ */
console.log('\n══ Berkas skor ══');
{
  const { bacaSkor } = await import('./hillz-arena.js');
  const isi = bacaSkor(BERKAS_SKOR);
  cekBenar('berkas skor uji terbentuk', existsSync(BERKAS_SKOR));
  cekBenar('berisi entri', isi.length >= 2, 'jumlah ' + isi.length);
  cekBenar('entri punya jid+skor+ubin', isi[0].jid && isi[0].skor !== undefined && isi[0].ubin !== undefined);
  cekBenar('TIDAK menulis arena-scores.json produksi',
    !existsSync(new URL('../../arena-scores.json', import.meta.url).pathname));
}

/* ── bereskan: WAJIB jalan walau uji gagal di tengah ── */
function bereskan() {
  try { anak.kill('SIGKILL'); } catch {}
  try { botTiruan.close(); } catch {}
  try { rmSync(KERJA, { recursive: true, force: true }); } catch {}
}
process.on('exit', bereskan);
process.on('uncaughtException', (e) => { console.log('LEDAK: ' + e.message); bereskan(); process.exit(1); });
bereskan();

console.log('\n────────────────────────────────');
console.log(gagal === 0 ? '✓ SEMUA ' + lulus + ' UJI HIDUP LULUS' : '✗ ' + gagal + ' GAGAL dari ' + (lulus + gagal));
if (gagal) console.log('\n--- log server ---\n' + log.slice(-2500));
process.exit(gagal === 0 ? 0 : 1);
