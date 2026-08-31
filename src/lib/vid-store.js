import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync, statSync, renameSync, openSync, closeSync, readSync, writeSync } from 'fs';
import { randomBytes } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIDS_DIR = join(__dirname, '..', '..', 'vids');
const INDEX = join(VIDS_DIR, 'index.json');
const CODE_LEN = 2;
const DEFAULT_TTL = 3600000; // 1 jam — hanya dipakai kalau setelan belum ada
const SETTINGS_FILE = join(__dirname, '..', '..', 'admin-settings.json');

if (!existsSync(VIDS_DIR)) mkdirSync(VIDS_DIR, { recursive: true });

let customTTL = null;

export function setTTL(ms) { customTTL = ms; }

// BUG YANG DIPERBAIKI: TTL dulu hanya diketahui lewat setTTL(), dan yang
// memanggilnya cuma web-uploader.js. Proses BOT (main) meng-import modul ini
// tanpa pernah memanggil setTTL, jadi ia memakai DEFAULT_TTL 1 jam — padahal
// admin menyetel expireMinutes 1440 (24 jam). Akibatnya setiap kali bot
// menyentuh store (getVideoFile/checkVideo memanggil cleanup()), semua kode
// yang berumur >1 jam DIHAPUS, dan user yang klaim jam kedua dapat
// "kode tidak ada" walau panel bilang file masih hidup 24 jam.
// Sekarang setelan dibaca langsung dari admin-settings.json, jadi kedua proses
// selalu sepakat tanpa bergantung siapa yang mengingat memanggil setTTL.
let ttlCache = { ms: 0, at: 0 };
function settingsTTL() {
  // Cache 5 detik: cleanup() dipanggil sangat sering, jangan baca disk tiap kali.
  if (Date.now() - ttlCache.at < 5000) return ttlCache.ms;
  let ms = 0;
  try {
    const m = Number(JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')).expireMinutes);
    if (Number.isFinite(m) && m > 0) ms = m * 60000;
  } catch { /* setelan belum ada / rusak → pakai default */ }
  ttlCache = { ms, at: Date.now() };
  return ms;
}

export function getTTL() { return customTTL || settingsTTL() || DEFAULT_TTL; }

function load() {
  try { return JSON.parse(readFileSync(INDEX, 'utf8')); } catch { return {}; }
}
function save(db) { writeFileSync(INDEX, JSON.stringify(db, null, 2)); }

function genCode(db) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 50; i++) {
    let c = '';
    const bytes = randomBytes(CODE_LEN);
    for (let j = 0; j < CODE_LEN; j++) c += chars[bytes[j] % chars.length];
    if (!db[c]) return c;
  }
  return null;
}

export function storeVideo(buf, name, ip) {
  cleanup();
  const db = load();
  const code = genCode(db);
  if (!code) return null;
  const file = join(VIDS_DIR, code + '.vid');
  writeFileSync(file, buf);
  // ponytail: store relative path for portability, resolve on read
  db[code] = { name, file: code + '.vid', size: buf.length, ts: Date.now(), ip: ip || 'unknown' };
  save(db);
  return code;
}

// Store multiple files under 1 code
export function storeBundle(files, ip) {
  cleanup();
  const db = load();
  const code = genCode(db);
  if (!code) return null;
  const fileEntries = [];
  let totalSize = 0;
  for (let i = 0; i < files.length; i++) {
    const fname = code + '_' + i + '.vid';
    writeFileSync(join(VIDS_DIR, fname), files[i].buf);
    fileEntries.push({ name: files[i].name, file: fname, size: files[i].buf.length });
    totalSize += files[i].buf.length;
  }
  db[code] = { bundle: true, files: fileEntries, ts: Date.now(), ip: ip || 'unknown', totalSize };
  save(db);
  return code;
}

// Varian storeVideo/storeBundle yang MEMINDAHKAN berkas dari disk, bukan
// menerima isinya di memori. Untuk video 300 MB, versi buffer memaksa seluruh
// isi file ditahan di RAM hanya untuk dituliskan lagi ke disk. rename() pada
// filesystem yang sama nyaris tanpa biaya; kalau beda device, disalin bertahap.
function moveInto(srcPath, destPath) {
  try {
    renameSync(srcPath, destPath);
    return;
  } catch (e) {
    if (e.code !== 'EXDEV') throw e;
  }
  // Beda filesystem (/tmp vs disk data): salin bertahap 4 MB, jangan sekali muat.
  const rfd = openSync(srcPath, 'r');
  const wfd = openSync(destPath, 'w');
  try {
    const buf = Buffer.allocUnsafe(4 * 1024 * 1024);
    let pos = 0;
    for (;;) {
      const n = readSync(rfd, buf, 0, buf.length, pos);
      if (n <= 0) break;
      writeSync(wfd, buf, 0, n);
      pos += n;
    }
  } finally {
    try { closeSync(rfd); } catch {}
    try { closeSync(wfd); } catch {}
  }
  try { unlinkSync(srcPath); } catch {}
}

export function storeVideoFile(srcPath, name, ip) {
  cleanup();
  const db = load();
  const code = genCode(db);
  if (!code) return null;
  const size = statSync(srcPath).size;
  const file = join(VIDS_DIR, code + '.vid');
  moveInto(srcPath, file);
  db[code] = { name, file: code + '.vid', size, ts: Date.now(), ip: ip || 'unknown' };
  save(db);
  return code;
}

export function storeBundleFiles(files, ip) {
  cleanup();
  const db = load();
  const code = genCode(db);
  if (!code) return null;
  const fileEntries = [];
  let totalSize = 0;
  for (let i = 0; i < files.length; i++) {
    const fname = code + '_' + i + '.vid';
    const size = statSync(files[i].path).size;
    moveInto(files[i].path, join(VIDS_DIR, fname));
    fileEntries.push({ name: files[i].name, file: fname, size });
    totalSize += size;
  }
  db[code] = { bundle: true, files: fileEntries, ts: Date.now(), ip: ip || 'unknown', totalSize };
  save(db);
  return code;
}

// Get bundle - returns array of files or null if not a bundle
export function getBundle(code) {
  cleanup();
  const db = load();
  const e = db[code.toUpperCase()];
  if (!e || !e.bundle) return null;
  const result = [];
  for (const f of e.files) {
    const filePath = join(VIDS_DIR, f.file);
    if (!existsSync(filePath)) continue;
    result.push({ buf: readFileSync(filePath), name: f.name, size: f.size });
  }
  return result.length > 0 ? result : null;
}

// Check if code is a bundle
export function isBundle(code) {
  const db = load();
  const e = db[code.toUpperCase()];
  return !!(e && e.bundle);
}

function resolveFile(entry) {
  // Handle both old absolute paths and new relative paths
  if (entry.file && !entry.file.includes('/') && !entry.file.includes('\\')) {
    return join(VIDS_DIR, entry.file);
  }
  // Legacy absolute path — check if exists, otherwise try relative
  if (existsSync(entry.file)) return entry.file;
  const basename = entry.file.split('/').pop().split('\\').pop();
  return join(VIDS_DIR, basename);
}

export function getVideo(code) {
  cleanup();
  const db = load();
  const e = db[code.toUpperCase()];
  if (!e) return null;
  const filePath = resolveFile(e);
  if (!existsSync(filePath)) { delete db[code.toUpperCase()]; save(db); return null; }
  return { buf: readFileSync(filePath), path: filePath, name: e.name, size: e.size, createdAt: e.ts };
}

// Varian getVideo/getBundle yang HANYA mengembalikan lokasi file, tanpa membaca
// isinya ke memori. Dipakai jalur kirim WhatsApp: baileys bisa menerima
// { url: path } dan membaca file itu bertahap sendiri, jadi video 170 MB tidak
// perlu ditahan utuh di RAM (yang pada box 3 GB membuat bot nyaris mati).
// Fungsi getVideo/getBundle di atas dibiarkan apa adanya untuk pemakai lain.
export function getVideoFile(code) {
  cleanup();
  const db = load();
  const e = db[code.toUpperCase()];
  if (!e) return null;
  const filePath = resolveFile(e);
  if (!existsSync(filePath)) { delete db[code.toUpperCase()]; save(db); return null; }
  return { path: filePath, name: e.name, size: e.size, createdAt: e.ts };
}

export function getBundleFiles(code) {
  cleanup();
  const db = load();
  const e = db[code.toUpperCase()];
  if (!e || !e.bundle) return null;
  const result = [];
  for (const f of e.files) {
    const filePath = join(VIDS_DIR, f.file);
    if (!existsSync(filePath)) continue;
    result.push({ path: filePath, name: f.name, size: f.size });
  }
  return result.length > 0 ? result : null;
}

export function checkVideo(code) {
  cleanup();
  const db = load();
  const e = db[code.toUpperCase()];
  if (!e) return null;
  const ttl = getTTL();
  const remaining = Math.max(0, ttl - (Date.now() - e.ts));
  if (e.bundle) {
    return { name: e.files[0].name + ' +' + (e.files.length - 1) + ' more', size: e.totalSize, ts: e.ts, remaining, bundle: true, count: e.files.length };
  }
  return { name: e.name, size: e.size, ts: e.ts, remaining };
}

export function deleteVideo(code) {
  const db = load();
  const e = db[code.toUpperCase()];
  if (!e) return false;
  if (e.bundle) {
    for (const f of e.files) { try { unlinkSync(join(VIDS_DIR, f.file)); } catch {} }
  } else {
    try { unlinkSync(resolveFile(e)); } catch {}
  }
  delete db[code.toUpperCase()];
  save(db);
  return true;
}

export function extendVideo(code, extraMs) {
  const db = load();
  const e = db[code.toUpperCase()];
  if (!e) return false;
  e.ts += (extraMs || 3600000);
  save(db);
  return true;
}

export function listVideos() {
  cleanup();
  const db = load();
  const ttl = getTTL();
  const now = Date.now();
  const list = [];
  for (const [code, v] of Object.entries(db)) {
    const remaining = Math.max(0, ttl - (now - v.ts));
    if (v.bundle) {
      list.push({ code, name: v.files[0].name + ' +' + (v.files.length - 1) + ' more', size: v.totalSize, ts: v.ts, ip: v.ip || 'unknown', remaining, bundle: true, count: v.files.length });
    } else {
      list.push({ code, name: v.name, size: v.size, ts: v.ts, ip: v.ip || 'unknown', remaining });
    }
  }
  list.sort((a, b) => b.ts - a.ts);
  return list;
}

export function getStats() {
  cleanup();
  const db = load();
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const ts0 = todayStart.getTime();
  let totalActive = 0, totalSize = 0, uploadsToday = 0;
  for (const v of Object.values(db)) {
    totalActive++;
    totalSize += v.size || 0;
    if (v.ts >= ts0) uploadsToday++;
  }
  return { totalActive, totalSize, uploadsToday };
}

// ponytail: count ALL files in vids dir, not just .vid — images also stored as .vid extension
export function getTotalStorage() {
  try {
    let total = 0;
    const files = readdirSync(VIDS_DIR);
    for (const f of files) {
      if (f === 'index.json') continue;
      try { total += statSync(join(VIDS_DIR, f)).size; } catch {}
    }
    return total;
  } catch { return 0; }
}

// Hapus file .vid di disk yang tidak tercatat di index.json (orphan).
// Terjadi kalau index hilang/di-reset tapi file fisik masih ada.
export function cleanOrphans() {
  const db = load();
  const known = new Set();
  for (const v of Object.values(db)) {
    if (v.bundle) { for (const f of v.files) known.add(f.file); }
    else if (v.file) known.add(v.file.split('/').pop().split('\\').pop());
  }
  let deleted = 0, freed = 0;
  try {
    for (const f of readdirSync(VIDS_DIR)) {
      if (f === 'index.json' || known.has(f)) continue;
      try {
        const p = join(VIDS_DIR, f);
        const sz = statSync(p).size;
        unlinkSync(p);
        deleted++; freed += sz;
      } catch { /* skip file terkunci */ }
    }
  } catch { /* dir hilang */ }
  return { deleted, freed };
}

function cleanup() {
  const db = load();
  const now = Date.now();
  const ttl = getTTL();
  let changed = false;
  for (const [k, v] of Object.entries(db)) {
    if (now - v.ts > ttl) {
      if (v.bundle) {
        for (const f of v.files) { try { unlinkSync(join(VIDS_DIR, f.file)); } catch {} }
      } else {
        try { unlinkSync(resolveFile(v)); } catch {}
      }
      delete db[k];
      changed = true;
    }
  }
  if (changed) save(db);
}
