/**
 * Modul State & Health Tracker Plugin Bot (Shirowahd)
 *
 * Mengelola status aktif/nonaktif per plugin (persisten di `database/main/plugins-off.json`),
 * pencatatan statistik eksekusi runtime (`database/main/plugin-stats.json`),
 * serta riwayat error runtime plugin (`database/main/plugin-errors.json`).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BERKAS_OFF = () => path.join(AKAR, "database", "main", "plugins-off.json");
const BERKAS_STATS = () => path.join(AKAR, "database", "main", "plugin-stats.json");
const BERKAS_ERRORS = () => path.join(AKAR, "database", "main", "plugin-errors.json");

function pastikanDir() {
  const dir = path.join(AKAR, "database", "main");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ── Cache State Plugin Mati (mtime + size locking) ──
let cacheOff = null;
let cacheOffKunci = "";

export function daftarPluginMati() {
  let kunci = "0:0";
  try {
    const s = fs.statSync(BERKAS_OFF());
    kunci = `${s.mtimeMs}:${s.size}`;
  } catch {
    kunci = "0:0";
  }
  if (cacheOff && kunci === cacheOffKunci) return cacheOff;
  try {
    const d = JSON.parse(fs.readFileSync(BERKAS_OFF(), "utf8"));
    cacheOff = new Set(Array.isArray(d) ? d : Array.isArray(d.off) ? d.off : []);
  } catch {
    cacheOff = new Set();
  }
  cacheOffKunci = kunci;
  return cacheOff;
}

export function apakahPluginMati(namaAtauPath) {
  if (!namaAtauPath) return false;
  const off = daftarPluginMati();
  const clean = String(namaAtauPath).trim().toLowerCase();
  const rel = clean.startsWith("plugins/") ? clean : clean.replace(/\\/g, "/");
  return off.has(clean) || off.has(rel) || off.has(path.basename(clean, ".js"));
}

export function setelPluginMati(namaAtauPath, mati = true) {
  if (!namaAtauPath) return false;
  pastikanDir();
  const off = new Set(daftarPluginMati());
  const clean = String(namaAtauPath).trim().toLowerCase();
  if (mati) {
    off.add(clean);
  } else {
    off.delete(clean);
    off.delete(path.basename(clean, ".js"));
    off.delete(clean.replace(/\\/g, "/"));
  }
  try {
    fs.writeFileSync(BERKAS_OFF(), JSON.stringify([...off], null, 2), "utf8");
    cacheOff = off;
    try {
      const s = fs.statSync(BERKAS_OFF());
      cacheOffKunci = `${s.mtimeMs}:${s.size}`;
    } catch {}
    return true;
  } catch (err) {
    console.error("[PluginState] Gagal menyimpan status plugin:", err.message);
    return false;
  }
}

// ── Statistik Pemakaian Plugin ──
let memStats = null;
let statsSaveTimeout = null;

function loadStats() {
  if (memStats) return memStats;
  try {
    memStats = JSON.parse(fs.readFileSync(BERKAS_STATS(), "utf8"));
  } catch {
    memStats = {};
  }
  return memStats;
}

function flushStats() {
  if (!memStats) return;
  try {
    pastikanDir();
    fs.writeFileSync(BERKAS_STATS(), JSON.stringify(memStats, null, 2), "utf8");
  } catch (e) {
    console.error("[PluginState] Gagal flush stats:", e.message);
  }
}

export function ambilStatistikPlugin() {
  return loadStats();
}

export function catatEksekusiPlugin(nama, sukses = true, err = null) {
  if (!nama) return;
  const key = String(nama).trim().toLowerCase();
  const stats = loadStats();
  if (!stats[key]) {
    stats[key] = { runs: 0, success: 0, errors: 0, lastRun: 0, lastError: null };
  }
  stats[key].runs = (stats[key].runs || 0) + 1;
  stats[key].lastRun = Date.now();
  if (sukses) {
    stats[key].success = (stats[key].success || 0) + 1;
  } else {
    stats[key].errors = (stats[key].errors || 0) + 1;
    stats[key].lastError = {
      message: err?.message || String(err || "Unknown error"),
      time: Date.now()
    };
  }

  // Debounce simpan ke disk agar tidak I/O spam
  if (!statsSaveTimeout) {
    statsSaveTimeout = setTimeout(() => {
      statsSaveTimeout = null;
      flushStats();
    }, 5000);
  }
}

// ── Riwayat Error Runtime Plugin ──
export function catatErrorPlugin(info) {
  pastikanDir();
  let errors = [];
  try {
    errors = JSON.parse(fs.readFileSync(BERKAS_ERRORS(), "utf8"));
    if (!Array.isArray(errors)) errors = [];
  } catch {
    errors = [];
  }

  const entri = {
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    time: Date.now(),
    command: info.command || "unknown",
    pluginName: info.pluginName || info.command || "unknown",
    filePath: info.filePath || "unknown",
    message: String(info.errorMsg || info.message || "Unknown error"),
    stack: String(info.errorStack || info.stack || "").slice(0, 1000),
    sender: info.sender ? String(info.sender).slice(-15) : null,
    chat: info.chat ? String(info.chat).slice(-20) : null
  };

  errors.unshift(entri);
  if (errors.length > 100) errors.length = 100;

  try {
    fs.writeFileSync(BERKAS_ERRORS(), JSON.stringify(errors, null, 2), "utf8");
  } catch (e) {
    console.error("[PluginState] Gagal simpan error log:", e.message);
  }
}

export function ambilRiwayatErrorPlugin() {
  try {
    const d = JSON.parse(fs.readFileSync(BERKAS_ERRORS(), "utf8"));
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

export function bersihkanRiwayatErrorPlugin() {
  pastikanDir();
  try {
    fs.writeFileSync(BERKAS_ERRORS(), JSON.stringify([], null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}
