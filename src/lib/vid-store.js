import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync, statSync } from 'fs';
import { randomBytes } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIDS_DIR = join(__dirname, '..', '..', 'vids');
const INDEX = join(VIDS_DIR, 'index.json');
const CODE_LEN = 2;
const DEFAULT_TTL = 3600000; // 1 hour

if (!existsSync(VIDS_DIR)) mkdirSync(VIDS_DIR, { recursive: true });

let customTTL = null;

export function setTTL(ms) { customTTL = ms; }
export function getTTL() { return customTTL || DEFAULT_TTL; }

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
