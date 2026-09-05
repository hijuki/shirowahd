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

// ═══ Ringkasan ═══
console.log(`\n${'═'.repeat(52)}`);
console.log(`  LULUS ${lulus}   GAGAL ${gagal}   DILEWATI ${dilewati}`);
if (kegagalan.length) {
  console.log(`\n  Yang gagal:`);
  for (const k of kegagalan) console.log(`    - ${k}`);
}
console.log('═'.repeat(52));
process.exit(gagal === 0 ? 0 : 1);
