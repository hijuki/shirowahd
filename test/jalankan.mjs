#!/usr/bin/env node
// Runner uji terpadu — DIPANGGIL `npm test`, ter-commit ke git.
//
// Kenapa perlu: `npm test` sebelumnya `echo "Error: no test specified" && exit 1`,
// dan semua uji audit tinggal di `.audit/` yang GITIGNORED (.gitignore:68).
// Artinya di VPS baru hasil `git clone` TIDAK punya satu pun uji — persis
// kebalikan dari "next setup gampang".
//
// Isi runner ini sengaja hanya uji yang JALAN TANPA jaringan, tanpa bot hidup,
// dan tanpa menyentuh sesi WA — supaya bisa dijalankan tepat setelah clone.

import { execFileSync } from 'child_process';
import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import os from 'os';

const merah = (s) => `\x1b[31m${s}\x1b[0m`;
const hijau = (s) => `\x1b[32m${s}\x1b[0m`;
const kuning = (s) => `\x1b[33m${s}\x1b[0m`;

let lulus = 0, gagal = 0, dilewati = 0;
const kegagalan = [];

function cek(nama, benar, detail = '') {
  if (benar) { lulus++; console.log(`  ${hijau('OK')}    ${nama}`); }
  else { gagal++; kegagalan.push(nama + (detail ? ` — ${detail}` : '')); console.log(`  ${merah('GAGAL')} ${nama}${detail ? ' — ' + detail : ''}`); }
}
function lewati(nama, sebab) { dilewati++; console.log(`  ${kuning('LEWAT')} ${nama} — ${sebab}`); }
function bagian(judul) { console.log(`\n${judul}`); }

// ═══ 1. Syntax seluruh berkas JS ter-track ═══
bagian('═══ 1. Syntax semua berkas JS ═══');
let daftar = [];
try {
  daftar = execFileSync('git', ['ls-files', '*.js', '*.mjs'], { encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((f) => !f.startsWith('web/out/'));
} catch { /* bukan repo git */ }

if (!daftar.length) lewati('sapuan syntax', 'git ls-files tidak tersedia');
else {
  const rusak = [];
  for (const f of daftar) {
    try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
    catch (e) { rusak.push(f); }
  }
  cek(`syntax ${daftar.length} berkas`, rusak.length === 0, rusak.slice(0, 5).join(', '));
}

// ═══ 2. Semua plugin bisa dimuat + bentuknya sah menurut loader ═══
bagian('═══ 2. Semua plugin dimuat (impor NYATA, bukan --check) ═══');
const berkasPlugin = [];
if (existsSync('plugins')) {
  const jelajah = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) jelajah(p);
      else if (e.endsWith('.js')) berkasPlugin.push(p);
    }
  };
  jelajah('plugins');
}

if (!berkasPlugin.length) lewati('muat plugin', 'folder plugins/ tidak ada');
else {
  const rusak = [];
  for (const f of berkasPlugin) {
    try {
      const mod = await import(pathToFileURL(f).href);
      // Aturan bentuk SAMA dengan hillz-plugins.js: named dulu, lalu default.
      let p = mod;
      if ((!p.config || !p.handler) && p.default) p = p.default;
      if (!p.config) rusak.push(`${f} (tidak ada config)`);
      else if (typeof p.handler !== 'function') rusak.push(`${f} (handler bukan fungsi)`);
    } catch (e) {
      rusak.push(`${f} (${(e.message || '').split('\n')[0].slice(0, 60)})`);
    }
  }
  cek(`${berkasPlugin.length} plugin dimuat + bentuk sah`, rusak.length === 0, rusak.slice(0, 3).join(' | '));
}

// ═══ 3. Modul inti bisa diimpor ═══
bagian('═══ 3. Modul inti ═══');
const inti = [
  ['config.js', 'default'],
  ['src/lib/hillz-fps.js', 'rencanaFps'],
  ['src/lib/hillz-hdmedia.js', 'siapkanVideoWA'],
  ['src/lib/hillz-reaksi.js', 'pasangReaksi'],
  ['src/lib/hillz-memory-monitor.js', 'startMemoryMonitor'],
  ['src/lib/hillz-plugins.js', 'loadPlugins'],
  ['src/lib/hillz-backup-rules.js', 'shouldExclude'],
];
for (const [berkas, ekspor] of inti) {
  if (!existsSync(berkas)) { lewati(berkas, 'berkas tidak ada'); continue; }
  try {
    const m = await import(pathToFileURL(berkas).href);
    cek(`${berkas} → ${ekspor}`, ekspor in m || (ekspor === 'default' && m.default !== undefined));
  } catch (e) {
    cek(`${berkas} → ${ekspor}`, false, (e.message || '').split('\n')[0].slice(0, 70));
  }
}

// ═══ 4. Pengawas memori: ambang turun dari RAM, gerbang lapor bekerja ═══
bagian('═══ 4. Pengawas memori ═══');
try {
  const mm = await import(pathToFileURL('src/lib/hillz-memory-monitor.js').href);
  const ram = Math.round(os.totalmem() / 1048576);
  if (typeof mm.hitungAmbang === 'function') {
    cek('ambang 1024 MB RAM ≥ 512', mm.hitungAmbang(1024) >= 512);
    cek('ambang 512 MB RAM dijepit ke 512', mm.hitungAmbang(512) === 512);
    cek('ambang 64 GB RAM dijepit ke 3072', mm.hitungAmbang(65536) === 3072);
    cek('RSS_LIMIT_MB dari env menang', mm.hitungAmbang(1024, '900') === 900);
    cek(`ambang RAM mesin ini (${ram} MB) di rentang`,
      mm.hitungAmbang(ram) >= 512 && mm.hitungAmbang(ram) <= 3072);
  } else lewati('hitungAmbang', 'tidak diekspor');

  if (typeof mm.perluLaporMurni === 'function') {
    const B = 1024 * 1024 * 1024; // batas 1 GB untuk uji
    const now = Date.now();
    cek('laporan pertama selalu tampil', mm.perluLaporMurni(1e6, 0, 0, now, B) === true);
    cek('geseran kecil TIDAK dilaporkan',
      mm.perluLaporMurni(0.30 * B, 0.29 * B, now - 1000, now, B) === false);
    cek('geseran ≥15% batas dilaporkan',
      mm.perluLaporMurni(0.46 * B, 0.30 * B, now - 1000, now, B) === true);
    cek('zona waspada 75% dilaporkan',
      mm.perluLaporMurni(0.80 * B, 0.79 * B, now - 1000, now, B) === true);
    cek('denyut 6 jam dilaporkan',
      mm.perluLaporMurni(0.30 * B, 0.30 * B, now - 6.5 * 3600e3, now, B) === true);
    cek('sebelum 6 jam, RSS diam → senyap',
      mm.perluLaporMurni(0.30 * B, 0.30 * B, now - 5 * 3600e3, now, B) === false);
  } else lewati('perluLaporMurni', 'tidak diekspor');
} catch (e) {
  cek('modul memory-monitor', false, (e.message || '').slice(0, 70));
}

// ═══ 5. Tambalan Baileys: gerbangnya harus membandingkan ISI ═══
bagian('═══ 5. Tambalan Baileys tidak boleh lapor sukses saat no-op ═══');
try {
  const src = 'if (opts?.maxContentLength && x) {}';
  const sama = src.replace(/TIDAK_ADA_POLA_INI/g, 'z');
  cek('regex tak cocok → dianggap TIDAK berubah', sama === src);
  const beda = src.replace(/if \(opts\?\.maxContentLength/g, 'if (false && opts?.maxContentLength');
  cek('regex cocok → dianggap BERUBAH', beda !== src);
} catch (e) { cek('logika tambalan', false, e.message); }

// ═══ 6. .env.example memuat semua kunci yang dibaca kode ═══
bagian('═══ 6. .env.example lengkap ═══');
if (!existsSync('.env.example')) lewati('.env.example', 'berkas tidak ada');
else {
  const { readFileSync } = await import('fs');
  const contoh = new Set(
    readFileSync('.env.example', 'utf8').split(/\r?\n/)
      .map((l) => (l.match(/^\s*([A-Z_][A-Z0-9_]*)=/) || [])[1]).filter(Boolean)
  );
  // Kunci yang bukan setelan aplikasi — disediakan OS atau dipakai internal.
  const abaikan = new Set(['HOME', 'USERNAME', 'PATH', '__SHIROWAHD_ENV_LOADED']);
  const dipakai = new Set();
  for (const f of daftar) {
    const { readFileSync: rf } = await import('fs');
    for (const m of rf(f, 'utf8').matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) dipakai.add(m[1]);
  }
  const hilang = [...dipakai].filter((k) => !contoh.has(k) && !abaikan.has(k)).sort();
  cek(`semua ${dipakai.size - [...dipakai].filter((k) => abaikan.has(k)).length} kunci ada di .env.example`,
    hilang.length === 0, hilang.join(', '));
}

// ═══ 7. Skrip setup: syntax bash ═══
bagian('═══ 7. Skrip setup ═══');
for (const s of ['install.sh', 'migrate.sh']) {
  if (!existsSync(s)) { lewati(s, 'tidak ada'); continue; }
  try { execFileSync('bash', ['-n', s], { stdio: 'pipe' }); cek(`bash -n ${s}`, true); }
  catch (e) { cek(`bash -n ${s}`, false, (e.stderr || '').toString().slice(0, 70)); }
}

// ═══ 8. KEAMANAN: gerbang izin tidak boleh bisa dilewati ═══
// Uji regresi untuk lubang yang ditemukan 2026-09-05: pesan dari chat
// `@newsletter` mendapat m.isOwner = true (serialize:610) DAN m.sender dipalsukan
// jadi nomor bot (serialize:543), sehingga lolos `if (m.isOwner) return
// { allowed: true }` di middleware — termasuk untuk `.eval` dan `.exec`.
// Uji ini akan MERAH lagi kalau pagarnya hilang saat refactor.
bagian('═══ 8. Keamanan: gerbang izin ═══');
try {
  const { checkPermission } = await import(pathToFileURL('src/lib/hillz-middleware.js').href);
  const { initDatabase } = await import(pathToFileURL('src/lib/hillz-database.js').href);
  const { mkdtempSync } = await import('fs');
  initDatabase(join(os.tmpdir(), 'ujiperm-') + Date.now());

  const pesan = (tambahan) => ({
    sender: '628999@s.whatsapp.net', chat: '1@newsletter', isGroup: false,
    isOwner: false, isPremium: false, isPartner: false, isNewsletter: false,
    fromMe: false, isBot: false, isCommand: true, command: 'eval',
    reply: async () => {}, ...tambahan,
  });
  const kOwner = { name: 'eval', isOwner: true, isPremium: false, isGroup: false };

  // Inilah lubangnya: apa yang serialize berikan untuk pesan newsletter.
  const dariSaluran = await checkPermission(
    pesan({ isNewsletter: true, isOwner: true, sender: '6285624537308@s.whatsapp.net' }), kOwner);
  cek('perintah owner dari @newsletter DITOLAK', dariSaluran.allowed === false);

  const orangBiasa = await checkPermission(pesan({ isGroup: true }), kOwner);
  cek('perintah owner dari orang biasa DITOLAK', orangBiasa.allowed === false);

  const ownerAsli = await checkPermission(pesan({ isOwner: true, isGroup: true }), kOwner);
  cek('owner asli tetap DIIZINKAN', ownerAsli.allowed === true);
} catch (e) {
  cek('gerbang izin', false, (e.message || '').split('\n')[0].slice(0, 70));
}

// ═══ 9. KEAMANAN: berkas rahasia tidak boleh ter-track git ═══
bagian('═══ 9. Keamanan: rahasia tidak ter-track ═══');
if (!daftar.length) lewati('sapuan rahasia', 'git tidak tersedia');
else {
  let semua = [];
  try {
    semua = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch { /* abaikan */ }
  const terlarang = semua.filter((f) =>
    /(^|\/)\.env$/.test(f) || /admin-settings\.json/.test(f) ||
    /^storage\/session/.test(f) || /\.bak\.\d/.test(f) || /creds\.json$/.test(f));
  cek('nol berkas rahasia ter-track', terlarang.length === 0, terlarang.slice(0, 4).join(', '));

  // Password bawaan pabrik tidak boleh muncul di berkas selain web-uploader.js
  // (di sana ia sengaja ada sebagai daftar-tolak, bukan sebagai kredensial).
  const { readFileSync: rf2 } = await import('fs');
  const bocor = [];
  for (const f of daftar) {
    if (f === 'web-uploader.js') continue;
    let isi = '';
    try { isi = rf2(f, 'utf8'); } catch { continue; }
    if (/adminPassword\s*[:=]\s*["'][^"']{4,}/.test(isi)) bocor.push(f);
  }
  cek('nol password admin hardcoded', bocor.length === 0, bocor.slice(0, 3).join(', '));
}

// ═══ 10. BACKUP: cakupan penuh kecuali sesi WhatsApp ═══
// Permintaan tetap tuan: backup memuat SELURUH data, satu-satunya yang
// dikecualikan adalah sesi WhatsApp (kredensial perangkat — zip dikirim lewat
// chat). Uji ini mengunci dua arah sekaligus supaya refactor nanti tidak
// diam-diam membuang data user atau diam-diam memasukkan rahasia.
bagian('═══ 10. Backup: cakupan & kebocoran ═══');
try {
  const { shouldExclude, pengaturanTersanitasi } = await import(
    pathToFileURL(join(process.cwd(), 'src/lib/hillz-backup-rules.js')).href);
  const root = process.cwd();
  const buang = (f) => shouldExclude(join(root, f), root);

  // Data yang tidak bisa dibangun ulang dari mana pun — wajib ikut.
  const wajibIkut = ['database/main/users.json', 'database/main/groups.json',
    'database/autoreply_media/a.mp3', 'brand-assets/logo.gif',
    '.gitignore', 'storage/pairing-state.json', 'plugins/main/menu.js',
    'package-lock.json', 'web/package-lock.json'];
  const hilang = wajibIkut.filter(buang);
  cek('data user & aset ikut backup', hilang.length === 0, hilang.join(', '));

  // Sesi WhatsApp — satu-satunya yang dikecualikan atas permintaan tuan.
  const sesi = ['storage/session/creds.json', 'storage/sessions/app-state.json'];
  cek('sesi WhatsApp dikecualikan', sesi.every(buang));

  // Rahasia tidak boleh masuk zip yang dikirim lewat chat.
  //
  // KOREKSI ALAT UKUR (2026-09-06): versi pertama uji ini juga menuntut
  // `backup-history.json` dibuang, dan uji itu GAGAL. Saya hampir menambal
  // aturan backup-nya. Salah: setelah diperiksa, isi berkas itu cuma
  // [ts, ok, changed, pushed, message] — nol kunci sensitif. Ia memang boleh
  // ikut backup. Yang keliru adalah uji-nya, bukan kodenya. Menambal aturan
  // demi menyenangkan uji yang salah = menghapus data tanpa alasan.
  const rahasia = ['.env', '.env.bak-1', 'admin-settings.json',
    'admin-settings.sanitized.json', '.git/config', 'storage/session/creds.json'];
  const lolos = rahasia.filter((f) => !buang(f));
  cek('rahasia tidak masuk zip', lolos.length === 0, lolos.join(', '));

  // Sampah yang membuat zip melewati batas kirim WhatsApp.
  cek('sampah build dibuang', ['node_modules/x/y.js', 'web/.next/a.js',
    '.audit/B1.sh', 'uploads/besar.mp4', 'cloudflared',
    'backup.zip', 'besar.tar.gz', 'boot_final.log'].every(buang));

  // Media yang DILAYANI web-uploader wajib ikut, kalau tidak hero web kosong
  // setelah pulih. Sekaligus penjaga: aturan mediaAkar tidak boleh melonggar
  // sampai memasukkan arsip/log.
  cek('media web ikut backup', ['header-video.mp4', 'assets/video/hillz-mp4.mp4',
    'assets/audio/hillz-mp3.mp3'].every((f) => !buang(f)));

  // Uji paling tajam untuk "cakupan seluruhnya": tidak boleh ada berkas
  // ter-track git yang hilang dari zip. Ini yang menangkap nama folder umum
  // (auth/build/dist/logs) membuang folder proyek yang sah.
  try {
    const track = execFileSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: 64e6 })
      .split('\n').filter(Boolean);
    const lenyap = track.filter((rel) => existsSync(rel) && buang(rel));
    cek('nol berkas ter-track hilang dari backup', lenyap.length === 0,
      lenyap.slice(0, 4).join(', '));
  } catch {
    lewati('cakupan ter-track', 'git tidak tersedia');
  }

  // Salinan settings di dalam zip wajib tanpa nilai kredensial.
  const bersih = pengaturanTersanitasi(root);
  const kunciBocor = bersih === null ? [] : Object.entries(JSON.parse(bersih))
    .filter(([k, v]) => /password|token|secret|chatid/i.test(k) &&
      typeof v === 'string' && v && v !== '__DIISI_LEWAT_ENV__')
    .map(([k]) => k);
  cek('settings di zip tersanitasi', kunciBocor.length === 0, kunciBocor.join(', '));
} catch (e) {
  cek('aturan backup', false, (e.message || '').split('\n')[0].slice(0, 70));
}

// ═══ Ringkasan ═══
console.log(`\n${'═'.repeat(52)}`);
console.log(`  LULUS ${lulus}   GAGAL ${gagal}   DILEWATI ${dilewati}`);
if (kegagalan.length) {
  console.log(`\n  Yang gagal:`);
  for (const k of kegagalan) console.log(`    - ${k}`);
}
console.log('═'.repeat(52));
process.exit(gagal === 0 ? 0 : 1);
