import http from 'http';
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, readdirSync, statSync, openSync, closeSync, writeSync, renameSync } from 'fs';
import { storeVideo, storeBundle, storeVideoFile, storeBundleFiles, getBundle, isBundle, deleteVideo, extendVideo, listVideos, getStats, getTotalStorage, setTTL, getTTL, cleanOrphans } from './src/lib/vid-store.js';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import https from 'https';
import { execSync, exec as execCb } from 'child_process';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env agar GIT_TOKEN/GIT_ADDRESS/BRANCH tersedia (dipakai fitur backup GitHub).
// Node >=20.12 punya process.loadEnvFile; kalau tidak ada, parse manual.
try {
  if (typeof process.loadEnvFile === 'function') process.loadEnvFile(join(__dirname, '.env'));
  else throw new Error('no loadEnvFile');
} catch {
  try {
    for (const line of readFileSync(join(__dirname, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* .env optional */ }
}

const PORT = 80;
const WEB_OUT = join(__dirname, 'web', 'out');
const BRAND_DIR = join(__dirname, 'brand-assets');
const SETTINGS_FILE = join(__dirname, 'admin-settings.json');
const UPLOAD_LOG_FILE = join(__dirname, 'upload-log.json');

// --- Telegram Notif ---
// Token & chat id boleh dari admin-settings.json ATAU .env (TELEGRAM_BOT_TOKEN /
// TELEGRAM_CHAT_ID). .env didahulukan sebagai fallback supaya secret tidak wajib
// ditulis di file settings yang ter-track git.
function tgCreds(s) {
  return {
    token: s.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: s.telegramChatId || process.env.TELEGRAM_CHAT_ID || '',
  };
}

function sendTelegram(event, text) {
  const s = loadSettings();
  const { token, chatId } = tgCreds(s);
  if (!token || !chatId) return;
  if (event === 'upload' && !s.telegramNotifyUpload) return;
  if (event === 'claim' && !s.telegramNotifyClaim) return;
  if (event === 'error' && !s.telegramNotifyError) return;
  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
  const req = https.request({ hostname: 'api.telegram.org', path: `/bot${token}/sendMessage`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } });
  req.on('error', () => {});
  req.end(body);
}

// --- Settings ---
function loadSettings() {
  try {
    if (existsSync(SETTINGS_FILE)) return JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'));
  } catch {}
  return {
    ownerWhatsapp: '', groups: [], channels: [],
    claimGroups: [],
    popupButtons: [],
    adminPassword: '@Hillz126',
    maintenance: false,
    ipBlacklist: [],
    siteName: 'SHIROWAHD',
    siteSubtitle: 'Upload & claim video HD',
    expireMinutes: 60,
    maxFileSizeMB: 0,
    allowLargeUpload: true,
    largeUploadMaxMB: 0,
    bannerText: '',
    announcement: '',
    heroTitle: '',
    heroSubtitle: '',
    heroDesc: '',
    footerText: '',
    logoUrl: '',
    heroImageUrl: '',
    showWelcome: true,
    showOwnerBtn: true,
    showChannelsBtn: true,
    showClaimBtn: true,
    showPopupBtns: true,
    domain: '',
    telegramBotToken: '',
    telegramChatId: '',
    telegramNotifyUpload: false,
    telegramNotifyClaim: false,
    telegramNotifyError: false,
    rateLimit: 0,
    rateCooldown: 0,
    autoCleanup: false,
    autoCleanupInterval: 30,
    storageQuotaMB: 0,
    // Ambang kirim video sebagai dokumen. Server WhatsApp menolak upload video
    // >±180 MB (diukur: 172 MB lolos, 201 MB ditolak semua host), sedangkan
    // dokumen 300 MB tetap lolos. 0 = pakai default plugin (180).
    videoAsDocumentMB: 180,
    // Batas sisi terpanjang video hasil encode. 3840 = 4K lewat utuh (rem
    // darurat hanya untuk 8K supaya encoder tidak kehabisan memori).
    // 0 = tanpa batas sama sekali. Diturunkan HANYA kalau HP tujuan memang
    // tidak sanggup — bukan sebagai tebakan.
    maxVideoLongSide: 2560,
    // --- Jalur upload langsung (lewat samping Cloudflare) ---
    //
    // Cloudflare menolak body request >100 MB di plan Free/Pro (Business 200 MB,
    // Enterprise 500 MB) dan itu TIDAK bisa dinaikkan dari sisi origin. Jalur
    // langsung memakai subdomain grey-cloud (proxied=false) supaya request tidak
    // lewat edge sama sekali, jadi tidak ada cap.
    //
    // MATI secara default. Menyalakannya membuka IP asli VPS dan menghilangkan
    // perlindungan DDoS untuk subdomain itu — dipakai hanya saat perlu, lalu
    // dimatikan lagi dari panel admin.
    //
    // Port 8443, BUKAN 443: port 443 di box ini dipakai sshd (satu-satunya jalan
    // masuk SSH). Mengambil 443 untuk web akan memutus akses administrasi.
    directUploadEnabled: false,
    directUploadHost: 'up.swhdhlz.my.id',
    directUploadPort: 8443
  };
}

// Pakai untuk field yang tidak boleh dikosongkan: '' / spasi dianggap "tidak dikirim".
function nonEmpty(v) {
  return (typeof v === 'string' && v.trim() === '') ? undefined : v;
}

function saveSettings(data) {
  const cur = loadSettings();
  const s = {
    ownerWhatsapp: data.ownerWhatsapp ?? cur.ownerWhatsapp ?? '',
    groups: data.groups ?? cur.groups ?? [],
    channels: data.channels ?? cur.channels ?? [],
    claimGroups: data.claimGroups ?? cur.claimGroups ?? (cur.claimGroup ? [cur.claimGroup] : []),
    popupButtons: data.popupButtons ?? cur.popupButtons ?? [],
    // Field kritis: string kosong TIDAK boleh menimpa nilai lama. `??` hanya
    // menyaring null/undefined, jadi payload berisi "" dulu bisa mengosongkan
    // password admin (risiko terkunci) atau menghapus nama situs (judul & og
    // jadi kosong). Field non-kritis seperti bannerText tetap boleh dikosongkan.
    adminPassword: nonEmpty(data.adminPassword) ?? cur.adminPassword ?? '@Hillz126',
    maintenance: data.maintenance ?? cur.maintenance ?? false,
    ipBlacklist: data.ipBlacklist ?? cur.ipBlacklist ?? [],
    siteName: nonEmpty(data.siteName) ?? cur.siteName ?? 'SHIROWAHD',
    siteSubtitle: data.siteSubtitle ?? cur.siteSubtitle ?? 'Upload & claim video HD',
    expireMinutes: data.expireMinutes ?? cur.expireMinutes ?? 60,
    maxFileSizeMB: data.maxFileSizeMB ?? cur.maxFileSizeMB ?? 0,
    allowLargeUpload: data.allowLargeUpload ?? cur.allowLargeUpload ?? true,
    largeUploadMaxMB: data.largeUploadMaxMB ?? cur.largeUploadMaxMB ?? 0,
    bannerText: data.bannerText ?? cur.bannerText ?? '',
    announcement: data.announcement ?? cur.announcement ?? '',
    heroTitle: data.heroTitle ?? cur.heroTitle ?? '',
    heroSubtitle: data.heroSubtitle ?? cur.heroSubtitle ?? '',
    heroDesc: data.heroDesc ?? cur.heroDesc ?? '',
    footerText: data.footerText ?? cur.footerText ?? '',
    logoUrl: data.logoUrl ?? cur.logoUrl ?? '',
    heroImageUrl: data.heroImageUrl ?? cur.heroImageUrl ?? '',
    showWelcome: data.showWelcome ?? cur.showWelcome ?? true,
    showOwnerBtn: data.showOwnerBtn ?? cur.showOwnerBtn ?? true,
    showChannelsBtn: data.showChannelsBtn ?? cur.showChannelsBtn ?? true,
    showClaimBtn: data.showClaimBtn ?? cur.showClaimBtn ?? true,
    showPopupBtns: data.showPopupBtns ?? cur.showPopupBtns ?? true,
    domain: data.domain ?? cur.domain ?? '',
    telegramBotToken: data.telegramBotToken ?? cur.telegramBotToken ?? '',
    telegramChatId: data.telegramChatId ?? cur.telegramChatId ?? '',
    telegramNotifyUpload: data.telegramNotifyUpload ?? cur.telegramNotifyUpload ?? false,
    telegramNotifyClaim: data.telegramNotifyClaim ?? cur.telegramNotifyClaim ?? false,
    telegramNotifyError: data.telegramNotifyError ?? cur.telegramNotifyError ?? false,
    rateLimit: data.rateLimit ?? cur.rateLimit ?? 0,
    rateCooldown: data.rateCooldown ?? cur.rateCooldown ?? 0,
    autoCleanup: data.autoCleanup ?? cur.autoCleanup ?? false,
    videoAsDocumentMB: data.videoAsDocumentMB ?? cur.videoAsDocumentMB ?? 180,
    maxVideoLongSide: data.maxVideoLongSide ?? cur.maxVideoLongSide ?? 1280,
    directUploadEnabled: data.directUploadEnabled !== undefined ? !!data.directUploadEnabled : (cur.directUploadEnabled !== undefined ? cur.directUploadEnabled : true),
    directUploadHost: nonEmpty(data.directUploadHost) ?? cur.directUploadHost ?? 'up.swhdhlz.my.id',
    directUploadPort: data.directUploadPort ?? cur.directUploadPort ?? 8443,
    autoCleanupInterval: data.autoCleanupInterval ?? cur.autoCleanupInterval ?? 30,
    storageQuotaMB: data.storageQuotaMB ?? cur.storageQuotaMB ?? 0
  };
  writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2), 'utf8');
  return s;
}

// Password admin: admin-settings.json menang (supaya tombol "Ubah Password" di
// panel benar-benar berefek), ADMIN_PASSWORD di .env hanya fallback kalau file
// settings kosong/hilang. Default lama tetap ada agar tidak terkunci sendiri.
function getAdminPassword() {
  return loadSettings().adminPassword || process.env.ADMIN_PASSWORD || '@Hillz126';
}

(function initTTL() {
  const s = loadSettings();
  if (s.expireMinutes) setTTL(s.expireMinutes * 60000);
})();

// --- Riwayat backup GitHub ---
const BACKUP_LOG_FILE = join(__dirname, 'backup-history.json');

function loadBackupHistory() {
  try {
    if (existsSync(BACKUP_LOG_FILE)) return JSON.parse(readFileSync(BACKUP_LOG_FILE, 'utf8'));
  } catch { /* corrupt → mulai baru */ }
  return [];
}

function addBackupHistory(entry) {
  const h = loadBackupHistory();
  h.unshift({ ts: Date.now(), ...entry });
  if (h.length > 50) h.length = 50;
  try { writeFileSync(BACKUP_LOG_FILE, JSON.stringify(h, null, 2), 'utf8'); } catch { /* disk full */ }
}

// --- Upload log ---
function loadUploadLog() {
  try {
    if (existsSync(UPLOAD_LOG_FILE)) return JSON.parse(readFileSync(UPLOAD_LOG_FILE, 'utf8'));
  } catch {}
  return [];
}

function addUploadLog(entry) {
  const log = loadUploadLog();
  log.unshift(entry);
  if (log.length > 500) log.length = 500;
  writeFileSync(UPLOAD_LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
}

// --- Upload rate limit ---
const uploadRateMap = new Map();

function checkUploadRate(ip, settings) {
  const limit = settings.rateLimit || 0;
  const cooldown = (settings.rateCooldown || 0) * 1000;
  if (limit <= 0 && cooldown <= 0) return { ok: true };
  const now = Date.now();
  const rec = uploadRateMap.get(ip) || { times: [], lastUpload: 0 };
  // cooldown check
  if (cooldown > 0 && rec.lastUpload && (now - rec.lastUpload) < cooldown) {
    const wait = Math.ceil((cooldown - (now - rec.lastUpload)) / 1000);
    return { ok: false, error: 'Tunggu ' + wait + ' detik sebelum upload lagi' };
  }
  // hourly limit check
  if (limit > 0) {
    const hourAgo = now - 3600000;
    rec.times = rec.times.filter(t => t > hourAgo);
    if (rec.times.length >= limit) {
      return { ok: false, error: 'Batas upload ' + limit + '/jam tercapai. Coba lagi nanti.' };
    }
  }
  return { ok: true };
}

function recordUpload(ip) {
  const rec = uploadRateMap.get(ip) || { times: [], lastUpload: 0 };
  rec.times.push(Date.now());
  rec.lastUpload = Date.now();
  uploadRateMap.set(ip, rec);
}

// --- Auto-cleanup ---
let autoCleanupTimer = null;

function startAutoCleanup() {
  if (autoCleanupTimer) clearInterval(autoCleanupTimer);
  const settings = loadSettings();
  if (!settings.autoCleanup) return;
  const interval = (settings.autoCleanupInterval || 30) * 60000;
  autoCleanupTimer = setInterval(() => {
    try {
      const videos = listVideos();
      let deleted = 0;
      for (const v of videos) {
        if (v.remaining <= 0) { deleteVideo(v.code); deleted++; }
      }
      if (deleted > 0) console.log('[auto-cleanup] Deleted ' + deleted + ' expired files');
    } catch (e) { console.log('[auto-cleanup] Error: ' + e.message); }
  }, interval);
  console.log('[auto-cleanup] Started, interval: ' + (settings.autoCleanupInterval || 30) + 'min');
}

// Start auto-cleanup on boot
startAutoCleanup();

// --- Rate limit login ---
const loginAttempts = new Map();

function checkLoginRate(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec) return true;
  if (rec.blockedUntil && now < rec.blockedUntil) return false;
  if (rec.blockedUntil && now >= rec.blockedUntil) { loginAttempts.delete(ip); return true; }
  return rec.count < 5;
}

function recordLoginFail(ip) {
  const rec = loginAttempts.get(ip) || { count: 0 };
  rec.count++;
  if (rec.count >= 5) rec.blockedUntil = Date.now() + 15 * 60000;
  loginAttempts.set(ip, rec);
}

function recordLoginSuccess(ip) { loginAttempts.delete(ip); }

// --- Token store ---
const tokens = new Map();

function genToken() {
  const t = crypto.randomBytes(24).toString('hex');
  tokens.set(t, Date.now() + 24 * 3600 * 1000);
  return t;
}

function validToken(req) {
  const auth = req.headers['authorization'] || '';
  const t = auth.replace('Bearer ', '');
  if (!t || !tokens.has(t)) return false;
  if (Date.now() > tokens.get(t)) { tokens.delete(t); return false; }
  return true;
}

// --- Helpers ---
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function jsonRes(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

function getClientIP(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}

function parseUrl(url) {
  const i = url.indexOf('?');
  return i === -1 ? url : url.substring(0, i);
}

// --- Video conversion: non-MP4 → MP4 H.264, keep 4K + original FPS ---
// --- Stage-2 encode jobs (async upload progress) ---
const jobs = new Map();
function sweepJobs() { const now = Date.now(); for (const [k, j] of jobs) if (now - j.ts > 15 * 60000) jobs.delete(k); }
function newJob(names) {
  sweepJobs();
  const id = crypto.randomBytes(8).toString('hex');
  jobs.set(id, { id, names, stage: 'Menyiapkan…', pct: 0, error: null, result: null, needsEncode: null, ts: Date.now() });
  return id;
}
const VIDEO_MP4_EXTS = ['.mp4', '.m4v'];
// Daftar diperluas: sebelumnya .mpg/.mpeg/.ogv/.m2ts/.mts/.vob/.asf dll TIDAK
// dikenali sebagai video, jadi file itu disimpan MENTAH — tanpa konversi ke
// H.264, tanpa faststart — dan penerima WA tidak bisa memutarnya sama sekali.
const VIDEO_EXTS = ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.3gp', '.3g2', '.flv', '.wmv', '.ts', '.m4v',
  '.mpg', '.mpeg', '.mpe', '.m1v', '.m2v', '.ogv', '.ogm', '.m2ts', '.mts', '.vob', '.asf', '.rm', '.rmvb',
  '.divx', '.f4v', '.mxf', '.dv', '.mp2', '.m2p', '.qt', '.amv', '.mjpeg', '.mjpg'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg', '.heic', '.heif', '.avif'];

function isVideoFile(name) {
  const ext = extname(name || '').toLowerCase();
  return VIDEO_EXTS.includes(ext);
}

// Fallback untuk file yang ekstensinya tidak dikenal atau tidak ada sama sekali
// (galeri HP kadang mengirim nama tanpa ekstensi). Isi file yang diperiksa,
// bukan namanya, jadi video tetap diproses dan tidak lolos mentah ke penerima.
function bufHasVideoStream(buf, name) {
  const tmp = join(tmpdir(), 'probe_' + crypto.randomBytes(6).toString('hex') + (extname(name || '') || ''));
  try {
    writeFileSync(tmp, buf.length > 4 * 1024 * 1024 ? buf.subarray(0, 4 * 1024 * 1024) : buf);
    const out = execSync('ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -of csv=p=0 ' + JSON.stringify(tmp), { timeout: 10000, stdio: 'pipe' }).toString();
    return out.includes('video');
  } catch { return false; }
  finally { try { unlinkSync(tmp); } catch {} }
}

// Satu item upload boleh diwakili isinya ({buf}) ATAU lokasinya ({path}).
// File besar masuk lewat jalur chunk yang sudah menuliskannya ke disk, jadi
// membacanya kembali ke memori hanya untuk diserahkan ke ffmpeg membuat proses
// menahan ratusan MB tanpa guna. Helper di bawah membuat seluruh pipeline bisa
// bekerja dengan salah satu bentuk tanpa cabang di mana-mana.
function itemSize(f) {
  if (f.buf) return f.buf.length;
  try { return statSync(f.path).size; } catch { return 0; }
}

// Materialisasi ke file di disk. Kalau item sudah berupa path, dipakai langsung
// (tidak ada penyalinan). Kalau masih buffer (upload kecil lewat /upload biasa),
// ditulis ke berkas sementara.
function itemToPath(f, hintExt) {
  if (f.path) return { path: f.path, temp: false };
  const ext = extname(f.name || '').toLowerCase() || hintExt || '.vid';
  const t = join(tmpdir(), 'upload_in_' + crypto.randomBytes(8).toString('hex') + ext);
  writeFileSync(t, f.buf);
  return { path: t, temp: true };
}

// Versi bufHasVideoStream untuk item berbasis path: ffprobe langsung membaca
// berkasnya, tidak perlu menyalin 4 MB pertama ke tempat lain.
function pathHasVideoStream(fp) {
  try {
    const out = execSync('ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -of csv=p=0 ' + JSON.stringify(fp), { timeout: 15000, stdio: 'pipe' }).toString();
    return out.includes('video');
  } catch { return false; }
}

function itemHasVideoStream(f) {
  if (f.path) return pathHasVideoStream(f.path);
  return bufHasVideoStream(f.buf, f.name);
}

function needsConvert(name) {
  const ext = extname(name || '').toLowerCase();
  return isVideoFile(name) && !VIDEO_MP4_EXTS.includes(ext);
}

// Cek kompatibilitas WhatsApp. Sebelumnya hanya codec_name yang diperiksa, jadi
// h264 varian "aneh" ikut di-stream-copy dan hasilnya sering GAGAL DIUNDUH atau
// tampil hitam waktu penerima ambil dari Status/SW. Yang bikin gagal:
//   - pix_fmt bukan yuv420p (10-bit / 4:2:2 / 4:4:4): decoder HP tidak sanggup
//   - profile High 10 / High 4:4:4: sama, di luar baseline yang dijamin WA
//   - tidak ada track audio: sebagian klien WA menolak/putus saat unduh
// Semua kondisi itu sekarang memaksa re-encode ke H.264 8-bit yuv420p + AAC.
function detectNeedsReencode(filePath) {
  try {
    const raw = execSync('ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt,profile,r_frame_rate,avg_frame_rate -of default=nw=1 ' + JSON.stringify(filePath), { timeout: 10000, stdio: 'pipe' }).toString();
    const get = (k) => (raw.match(new RegExp('^' + k + '=(.*)$', 'm')) || [, ''])[1].trim();
    const codec = get('codec_name').toLowerCase();
    const pixFmt = get('pix_fmt').toLowerCase();
    const profile = get('profile');

    // Persis standar .ttv2:
    // Hanya re-encode jika codec bukan h264, bukan yuv420p, atau 10-bit/HDR
    if (codec !== 'h264') return true;
    if (pixFmt && pixFmt !== 'yuv420p') return true;
    if (/10|4:4:4|4:2:2/i.test(profile)) return true;
    return false;
  } catch { return false; }
}

function audioCodecOf(filePath) {
  try {
    return execSync('ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 ' + JSON.stringify(filePath), { timeout: 10000, stdio: 'pipe' }).toString().trim().toLowerCase();
  } catch { return ''; }
}

function hasAudioStream(filePath) {
  try {
    const out = execSync('ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 ' + JSON.stringify(filePath), { timeout: 10000, stdio: 'pipe' }).toString().trim();
    return out.includes('audio');
  } catch { return true; }
}

const execP = (cmd, opts = {}) => new Promise((resolve, reject) => execCb(cmd, opts, (err, stdout, stderr) => err ? reject(new Error(String(stderr || err.message).split('\n').filter(Boolean).pop() || 'ffmpeg gagal')) : resolve(stdout)));

const FFMPEG_PUNYA_FPS_MODE = (() => {
  try { return execSync('ffmpeg -h full 2>&1 | grep -c -- "-fps_mode"', { timeout: 10000, stdio: 'pipe', shell: '/bin/bash' }).toString().trim() !== '0'; }
  catch { return false; }
})();

function codecVideoOf(filePath) {
  try {
    return execSync('ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 ' + JSON.stringify(filePath), { timeout: 10000, stdio: 'pipe' }).toString().trim().toLowerCase();
  } catch { return ''; }
}

function hitungMasalahDecode(filePath, detik, hanyaDecoder) {
  try {
    const batas = detik && detik > 0 ? ' -t ' + detik : '';
    const saring = hanyaDecoder
      ? ' | grep -v "to muxer" | grep -v "Last message repeated"'
      : '';
    const out = execSync(
      'ffmpeg -v error -i ' + JSON.stringify(filePath) + batas + ' -f null - 2>&1' + saring + ' | grep -vc "^$" || true',
      { timeout: 600000, stdio: 'pipe', shell: '/bin/bash' }
    ).toString().trim();
    return parseInt(out, 10) || 0;
  } catch { return 0; }
}

function bacaFps(filePath) {
  try {
    const raw = execSync('ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate,avg_frame_rate -of default=nw=1 ' + JSON.stringify(filePath), { timeout: 10000, stdio: 'pipe' }).toString();
    const ambil = (k) => (raw.match(new RegExp('^' + k + '=(.*)$', 'm')) || [, ''])[1].trim();
    const keAngka = (f) => {
      if (!f || !/^\d+\/\d+$/.test(f)) return 0;
      const [n, d] = f.split('/').map(Number);
      return d ? n / d : 0;
    };
    const nominalStr = ambil('r_frame_rate');
    const avgStr = ambil('avg_frame_rate');
    return { nominalStr, avgStr, nominal: keAngka(nominalStr), avg: keAngka(avgStr) };
  } catch { return { nominalStr: '', avgStr: '', nominal: 0, avg: 0 }; }
}

function fpsBohong(filePath) {
  const f = bacaFps(filePath);
  if (!(f.nominal > 0 && f.avg > 0)) return false;
  return Math.abs(f.avg - f.nominal) / f.nominal > 0.20;
}

function hitungErrorDecode(filePath, detik) {
  return hitungMasalahDecode(filePath, detik);
}

function sumberBermasalah(filePath) {
  return hitungMasalahDecode(filePath, 15, true) > 0 || fpsBohong(filePath);
}

function hasilLayak(outPath, durSumber) {
  try {
    if (!existsSync(outPath) || statSync(outPath).size < 1000) return { ok: false, alasan: 'berkas kosong' };
    if (!codecVideoOf(outPath)) return { ok: false, alasan: 'tidak ada stream video' };
    const durOut = probeDuration(outPath);
    if (durSumber > 0 && durOut > 0) {
      const selisih = Math.abs(durOut - durSumber) / durSumber;
      if (selisih > 0.15) return { ok: false, alasan: 'durasi meleset ' + Math.round(selisih * 100) + '%' };
    }
    const err = hitungMasalahDecode(outPath, 0, true);
    if (err > 0) return { ok: false, alasan: err + ' keluhan decode' };
    return { ok: true };
  } catch (e) {
    return { ok: false, alasan: e.message };
  }
}

function runFfmpeg(cmd, opts, dur, onPct) {
  return new Promise((resolve, reject) => {
    const p = execCb(cmd, opts, (err, stdout, stderr) => {
      if (err) reject(new Error(String(stderr || err.message).split('\n').filter(Boolean).pop() || 'ffmpeg gagal'));
      else resolve(stdout);
    });
    if (p.stdout && onPct && dur > 0) {
      p.stdout.on('data', d => {
        const m = String(d).match(/out_time_ms=(\d+)/g);
        if (!m) return;
        const sec = m[m.length - 1].split('=')[1] / 1e6;
        onPct(Math.max(1, Math.min(99, Math.round(sec / dur * 100))));
      });
    }
  });
}

function probeDuration(f) {
  try { return parseFloat(execSync('ffprobe -v error -show_entries format=duration -of csv=p=0 ' + JSON.stringify(f), { timeout: 10000, stdio: 'pipe' }).toString().trim()) || 0; } catch { return 0; }
}

function toMp4Name(originalName) {
  const n = String(originalName || 'video');
  return /\.[^.\/]+$/.test(n) ? n.replace(/\.[^.\/]+$/, '.mp4') : n + '.mp4';
}

async function convertToMp4Async(item, originalName, onPct, onPhase) {
  const id = crypto.randomBytes(8).toString('hex');
  const ext = extname(originalName || '').toLowerCase() || '.vid';
  const src = itemToPath(item, ext);
  const tmpIn = src.path;
  const tmpOut = join(tmpdir(), 'upload_out_' + id + '.mp4');
  try {
    const quickNeeds = detectNeedsReencode(tmpIn);
    const forceReencode = quickNeeds || fpsBohong(tmpIn);
    
    // JALUR 1: STREAM COPY / REMUX (Standar .ttv2 - Kualitas 100% Utuh Asli)
    if (!forceReencode) {
      if (onPhase) onPhase('remux');
      const silentAudio = !hasAudioStream(tmpIn)
        ? ' -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -shortest -c:a aac -b:a 128k'
        : (audioCodecOf(tmpIn) === 'aac' ? ' -c:a copy' : ' -c:a aac -b:a 192k');
      try {
        await runFfmpeg(
          'ffmpeg -y -i ' + JSON.stringify(tmpIn) + silentAudio + ' -c:v copy -movflags +faststart -progress pipe:1 -nostats ' + JSON.stringify(tmpOut),
          { timeout: 300000, maxBuffer: 10 * 1024 * 1024 },
          probeDuration(tmpIn),
          onPct
        );
        const nilaiRemux = hasilLayak(tmpOut, probeDuration(tmpIn));
        if (nilaiRemux.ok) {
          return { path: tmpOut, name: toMp4Name(originalName), temp: true };
        }
      } catch {}
    }

    // JALUR 2: HD ULTRA-CLEAN TRANSCODE (Hanya untuk HEVC/HDR/Corrupt)
    // Resolusi dibiarkan ASLI (tanpa scale filter / no downscale)
    // Kualitas CRF 18 (Ultra HD, tajam, detail mikroskopis terjaga)
    // FPS dibiarkan asli (passthrough 60/90/120fps)
    try { unlinkSync(tmpOut); } catch {}
    if (onPhase) onPhase('encode');

    let fpsFlag = '';
    const MAX_FPS = 120;
    try {
      const f = bacaFps(tmpIn);
      if (f.nominal > 0 && f.avg > 0 && Math.abs(f.avg - f.nominal) / f.nominal > 0.20) {
        if (f.avg > MAX_FPS) fpsFlag = ' -r ' + MAX_FPS;
        else fpsFlag = ' -r ' + f.avgStr;
      } else if (!f.nominal && f.avg > 0) {
        if (f.avg > MAX_FPS) fpsFlag = ' -r ' + MAX_FPS;
        else fpsFlag = ' -r ' + f.avgStr;
      }
    } catch {}

    const dur = probeDuration(tmpIn);
    const audioSenyap = hasAudioStream(tmpIn) ? '' : ' -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -shortest';
    const lewatkanFpsUtama = FFMPEG_PUNYA_FPS_MODE ? ' -fps_mode passthrough' : ' -vsync 0';

    // Khusus file .MOV / iPhone HEVC: batasi sisi panjang max 2560px (1440p Quad HD)
    // agar WhatsApp lancar memutar tanpa lag / drop frame / patah-patah.
    const isMov = ext === '.mov' || (originalName && /\.mov$/i.test(originalName)) || codecVideoOf(tmpIn) === 'hevc';
    const scaleFilter = isMov ? ' -vf "scale=2560:2560:force_original_aspect_ratio=decrease:force_divisible_by=2"' : '';

    // CRF 18 = Master Visual Quality (jernih, tajam, detail mikroskopis terjaga)
    const perintahEncode = (extraIn, fpsArg) =>
      'ffmpeg -y' + extraIn + ' -i ' + JSON.stringify(tmpIn) + audioSenyap +
      ' -c:v libx264 -profile:v high -pix_fmt yuv420p -preset veryfast -crf 18' +
      scaleFilter + fpsArg + lewatkanFpsUtama + ' -c:a aac -b:a 192k -ac 2 -movflags +faststart -progress pipe:1 -nostats ' +
      JSON.stringify(tmpOut);

    let kegagalan = [];
    try {
      await runFfmpeg(perintahEncode('', fpsFlag), { timeout: 600000, maxBuffer: 10 * 1024 * 1024 }, dur, onPct);
    } catch (e) { kegagalan.push('encode: ' + e.message); }

    let nilai = hasilLayak(tmpOut, dur);
    if (nilai.ok) return { path: tmpOut, name: toMp4Name(originalName), temp: true };
    kegagalan.push('percobaan 1 ditolak (' + nilai.alasan + ')');

    // Percobaan 2: Mode Tahan-Rusak
    try { unlinkSync(tmpOut); } catch {}
    try {
      await runFfmpeg(
        perintahEncode(' -err_detect ignore_err -fflags +genpts+discardcorrupt', lewatkanFpsUtama),
        { timeout: 600000, maxBuffer: 10 * 1024 * 1024 }, dur, onPct
      );
    } catch (e) { kegagalan.push('tahan-rusak: ' + e.message); }
    nilai = hasilLayak(tmpOut, dur);
    if (nilai.ok) return { path: tmpOut, name: toMp4Name(originalName), temp: true };
    kegagalan.push('percobaan 2 ditolak (' + nilai.alasan + ')');

    throw new Error('Video tidak bisa dikonversi — ' + kegagalan.join('; '));
  } catch (e) {
    try { unlinkSync(tmpOut); } catch {}
    throw e;
  } finally {
    if (src.temp) { try { unlinkSync(tmpIn); } catch {} }
  }
}

// --- Multipart parser ---
function parseMultipartFiles(body, boundary) {
  const parts = body.toString('binary').split('--' + boundary);
  const files = [];
  for (const part of parts) {
    const fnMatch = part.match(/filename="([^"]+)"/);
    if (!fnMatch) continue;
    if (!part.includes('name="video"') && !part.includes('name="image"') && !part.includes('name="file"')) continue;
    const fileName = fnMatch[1];
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const raw = part.slice(headerEnd + 4);
    const trimmed = raw.endsWith('\r\n') ? raw.slice(0, -2) : raw;
    const buf = Buffer.from(trimmed, 'binary');
    if (buf.length < 100) continue;
    files.push({ name: fileName, buf });
  }
  return files;
}

// --- Pipeline pemrosesan upload (dipakai jalur /upload biasa DAN jalur chunk) ---
// Dipisah jadi fungsi supaya file besar yang masuk lewat chunk diproses dengan
// langkah yang persis sama: remux/encode → simpan → log → notif. Tidak ada
// perbedaan perlakuan video antara dua jalur.
function beginUploadJob(files, clientIP) {
  const jobId = newJob(files.map(f => f.name));
  const job = jobs.get(jobId);
  (async () => {
    try {
      let convFail = 0;
      // Hitung dulu berapa video yang perlu diproses supaya bar bisa berjalan
      // 0→100 satu kali untuk keseluruhan job, bukan reset ke 0 tiap file.
      const vidIdx = files.map((f, i) => {
        if (isVideoFile(f.name)) return i;
        const ext = extname(f.name || '').toLowerCase();
        if (IMAGE_EXTS.includes(ext)) return -1;              // foto: jangan diprobe
        return itemHasVideoStream(f) ? i : -1;                // ekstensi asing/kosong
      }).filter(i => i >= 0);
      const totalVid = vidIdx.length || 1;
      for (let n = 0; n < vidIdx.length; n++) {
        const i = vidIdx[n];
        const f = files[i];
        const suffix = files.length > 1 ? ' (' + (n + 1) + '/' + vidIdx.length + ')' : '';
        job.stage = 'Memeriksa video' + suffix + '…';
        // pct global: bagian file ke-n mengisi slot [n/totalVid, (n+1)/totalVid]
        const scale = (p) => Math.round(((n + p / 100) / totalVid) * 100);
        try {
          const converted = await convertToMp4Async(
            f, f.name,
            p => { job.pct = Math.min(99, scale(p)); },
            phase => {
              // Label jujur: beda antara "cuma dirapikan" dan "dikonversi ulang".
              job.stage = (phase === 'remux' ? 'Merapikan video' : 'Konversi video') + suffix + '…';
              if (job.needsEncode === null) job.needsEncode = (phase !== 'remux');
            }
          );
          // Sumber lama (berkas chunk / berkas sementara) tidak dipakai lagi:
          // hapus segera supaya /tmp tidak menyimpan dua salinan file besar.
          if (f.path && f.path !== converted.path) { try { unlinkSync(f.path); } catch {} }
          files[i] = converted;
        } catch (e) {
          convFail++;
          console.log('[upload] ffmpeg convert failed for ' + f.name + ': ' + e.message);
          // fallback: simpan apa adanya
        }
        job.pct = Math.min(99, scale(100));
      }
      job.stage = 'Menyimpan…';
      const warn = convFail ? convFail + ' video gagal di-encode, disimpan tanpa konversi' : null;
      const allImages = files.every(f => IMAGE_EXTS.includes(extname(f.name || '').toLowerCase()));
      if (allImages && files.length >= 1) {
        // Item berbasis path dipindahkan; item berbasis buffer ditulis seperti dulu.
        const code = files.every(f => f.path)
          ? storeBundleFiles(files, clientIP)
          : storeBundle(files.map(f => (f.buf ? f : { name: f.name, buf: readFileSync(f.path) })), clientIP);
        if (!code) throw new Error('Server penuh');
        const totalSize = files.reduce((s, f) => s + itemSize(f), 0);
        addUploadLog({ ip: clientIP, timestamp: Date.now(), filename: files.map(f => f.name).join(', '), filesize: totalSize, code, bundle: true, count: files.length });
        recordUpload(clientIP);
        sendTelegram('upload', `📤 <b>Upload Bundle</b>\n${files.length} file | ${(totalSize/1048576).toFixed(1)} MB\nKode: <code>${code}</code>\nIP: ${clientIP}`);
        job.pct = 100; job.stage = 'Selesai';
        job.result = { ok: true, code, bundle: true, count: files.length, ...(warn && { warn }) };
      } else {
        const codes = [];
        for (const file of files) {
          const fsize = itemSize(file);
          const code = file.path
            ? storeVideoFile(file.path, file.name, clientIP)
            : storeVideo(file.buf, file.name, clientIP);
          if (!code) throw new Error('Server penuh');
          codes.push({ code, name: file.name });
          addUploadLog({ ip: clientIP, timestamp: Date.now(), filename: file.name, filesize: fsize, code });
        }
        recordUpload(clientIP);
        sendTelegram('upload', `📤 <b>Upload</b>\n${codes.map(c=>c.name).join(', ')}\nKode: <code>${codes[0].code}</code>\nIP: ${clientIP}`);
        job.pct = 100; job.stage = 'Selesai';
        job.result = { ok: true, code: codes[0].code, codes, ...(warn && { warn }) };
      }
    } catch (e) {
      job.error = e.message || 'Proses gagal';
      // Job gagal di tengah: berkas sementara yang belum dipindahkan ke store
      // akan menggantung di /tmp selamanya kalau tidak dibersihkan di sini.
      for (const f of files) { if (f && f.path) { try { unlinkSync(f.path); } catch {} } }
      sendTelegram('error', `❌ <b>Upload gagal</b>\n${files.map(f => f.name).join(', ')}\nError: ${job.error}\nIP: ${clientIP}`);
    }
  })();
  return jobId;
}

// --- Chunked upload (untuk file > limit proxy Cloudflare 100 MB) ---
// Alasan: Cloudflare Free menolak body >100 MB dengan 413 sebelum request sampai
// ke server. File besar dipecah client-side jadi bagian kecil, ditulis ke disk
// per bagian, lalu digabung byte-per-byte tanpa transformasi apa pun.
// 5 MB, diturunkan dari 20 MB. Batas Cloudflare yang menggagalkan upload besar
// dari HP bukan ukuran total, tapi LAMA satu request: proxy memutus koneksi yang
// menahan request terlalu lama (~100 detik). Pada upload HP 1–2 Mbps, satu
// bagian 20 MB butuh 80–160 detik sehingga hampir selalu putus; 5 MB selesai
// dalam 20–40 detik di jaringan yang sama.
// Turunkan logo brand jadi ikon PNG persegi berukuran `size`.
// Hasilnya di-cache di disk dengan kunci mtime, jadi ffmpeg hanya dipanggil sekali
// per logo per ukuran — bukan tiap permintaan favicon.
const ICON_CACHE = join(__dirname, '.icon-cache');
function brandIconPng(srcPath, size) {
  try {
    const st = statSync(srcPath);
    const key = 'i' + size + '_' + st.mtimeMs + '_' + st.size + '.png';
    const out = join(ICON_CACHE, key);
    if (existsSync(out)) return readFileSync(out);
    if (!existsSync(ICON_CACHE)) mkdirSync(ICON_CACHE, { recursive: true });
    // Padding transparan supaya logo non-persegi tidak gepeng.
    const vf = 'scale=' + size + ':' + size + ':force_original_aspect_ratio=decrease,'
      + 'pad=' + size + ':' + size + ':(ow-iw)/2:(oh-ih)/2:color=0x00000000';
    execSync('ffmpeg -v error -y -i ' + JSON.stringify(srcPath) + ' -vf ' + JSON.stringify(vf)
      + ' -frames:v 1 -f image2 ' + JSON.stringify(out), { timeout: 15000, stdio: 'pipe' });
    // Buang berkas cache lama supaya direktori tidak tumbuh tiap ganti logo.
    try {
      for (const f of readdirSync(ICON_CACHE)) {
        if (f !== key && /^i\d+_/.test(f) && Date.now() - statSync(join(ICON_CACHE, f)).mtimeMs > 86400000) unlinkSync(join(ICON_CACHE, f));
      }
    } catch {}
    return existsSync(out) ? readFileSync(out) : null;
  } catch { return null; }
}

// Ruang disk bebas di partisi tempat berkas sementara ditulis.
function freeDiskBytes() {
  try {
    const out = execSync('df -kP ' + JSON.stringify(tmpdir()) + ' | tail -1', { timeout: 5000, stdio: 'pipe' }).toString().trim().split(/\s+/);
    return (Number(out[3]) || 0) * 1024;
  } catch { return 0; }
}

// Chunk upload removed — use DNS direct for large files
// chunk upload removed — using DNS direct for large files

function readRawBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const bufs = [];
    let len = 0;
    req.on('data', c => {
      len += c.length;
      if (limitBytes && len > limitBytes) { reject(new Error('Chunk terlalu besar')); req.destroy(); return; }
      bufs.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(bufs)));
    req.on('error', reject);
  });
}

// --- Request Handler Utama ---
async function handleRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = parseUrl(req.url);
  const clientIP = getClientIP(req);
  const settings = loadSettings();

  if (req.method === 'GET' && (url === '/' || url === '')) {
    try {
      // Inject og/twitter meta dinamis: judul & logo ikut settings admin, host ikut request.
      let html = readFileSync(join(WEB_OUT, 'index.html'), 'utf8');
      const host = req.headers.host || 'localhost';
      const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0];
      const base = `${proto}://${host}`;
      const name = settings.siteName || 'SHIROWAHD';
      const desc = settings.siteSubtitle || 'Upload media HD ke grup WhatsApp';
      const lu = settings.logoUrl || '';
      const ogImg = (lu.startsWith('/brand/') && existsSync(join(BRAND_DIR, lu.slice(7).replace(/[^\w.-]/g, ''))))
        ? `${base}${lu}` : `${base}/apple-touch-icon.png`;
      const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      const meta = [
        `<meta property="og:title" content="${esc(name)}"/>`,
        `<meta property="og:description" content="${esc(desc)}"/>`,
        `<meta property="og:image" content="${ogImg}"/>`,
        `<meta property="og:url" content="${base}/"/>`,
        `<meta property="og:type" content="website"/>`,
        `<meta name="twitter:card" content="summary"/>`,
        `<meta name="twitter:title" content="${esc(name)}"/>`,
        `<meta name="twitter:image" content="${ogImg}"/>`,
      ].join('');
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(name)}</title>`);
      html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`);
      html = html.replace('</head>', meta + '</head>');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(html);
    } catch { res.writeHead(500); res.end('Page not found'); }
    return;
  }

  // Next.js static assets
  if (req.method === 'GET' && url.startsWith('/_next/')) {
    const rel = url.split('?')[0].replace(/\.\./g, '');
    const file = join(WEB_OUT, rel);
    if (existsSync(file) && file.startsWith(WEB_OUT)) {
      const types = { '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.map': 'application/json' };
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
      res.end(readFileSync(file));
      return;
    }
    res.writeHead(404); res.end('Not found'); return;
  }


  // Auto-adapt favicon: kalau admin set logo dari gallery, semua path ikon ikut logo itu.
  // HARUS sebelum route static generik, karena file favicon lama masih ada di WEB_OUT.
  //
  // Dulu logo dikirim UTUH ke setiap path ikon: foto 31 KB dipakai sebagai ikon
  // 16x16, dan Content-Type diambil dari ekstensi berkas ASAL — jadi `/favicon.ico`
  // dan `/favicon-32.png` mengaku `image/jpeg`, `/logo.svg` mengaku JPEG pula.
  // Sebagian browser menolak ikon yang tipenya tidak cocok, dan HP menanggung
  // unduhan penuh untuk gambar sebesar kuku. Sekarang tiap ukuran diturunkan
  // sekali pakai ffmpeg lalu dipakai ulang dari cache, dan tipe selalu jujur.
  if (req.method === 'GET' && ['/favicon.ico', '/favicon.svg', '/favicon-32.png', '/apple-touch-icon.png', '/logo.svg'].includes(url)) {
    const lu = settings.logoUrl || '';
    if (lu.startsWith('/brand/') && /\.(png|jpg|jpeg|webp|svg)$/i.test(lu)) {
      const bf = join(BRAND_DIR, lu.slice(7).replace(/[^\w.-]/g, ''));
      if (existsSync(bf)) {
        const isSvg = extname(bf).toLowerCase() === '.svg';
        // /logo.svg dipakai sebagai gambar penuh (bukan ikon kecil) → kirim asli.
        if (url === '/logo.svg' || (url === '/favicon.svg' && isSvg)) {
          const t = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
          res.writeHead(200, { 'Content-Type': t[extname(bf).toLowerCase()] || 'image/png', 'Cache-Control': 'public, max-age=300' });
          res.end(readFileSync(bf));
          return;
        }
        const size = url === '/apple-touch-icon.png' ? 180 : 32;
        const icon = brandIconPng(bf, size);
        if (icon) {
          res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' });
          res.end(icon);
          return;
        }
      }
    }
  }

  // Root static assets (hero.jpg, logo.svg, icons) dari WEB_OUT
  if (req.method === 'GET' && /^\/[\w.-]+\.(jpg|jpeg|png|gif|webp|svg|ico)$/.test(url.split('?')[0])) {
    const rel = url.split('?')[0].replace(/\.\./g, '');
    const file = join(WEB_OUT, rel);
    if (existsSync(file) && file.startsWith(WEB_OUT)) {
      const t = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.gif':'image/gif', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
      res.writeHead(200, { 'Content-Type': t[extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=86400' });
      res.end(readFileSync(file));
      return;
    }
  }

  // /favicon.svg dan /favicon.ico — fallback ke logo.svg kalau file khusus tidak ada,
  // biar tidak 404 (browser & Telegram preview selalu minta path ini).
  if (req.method === 'GET' && (url === '/favicon.svg' || url === '/favicon.ico' || url === '/favicon-32.png' || url === '/apple-touch-icon.png')) {
    const candidates = url === '/favicon.ico'
      ? ['favicon.ico', 'favicon-32.png', 'logo.svg']
      : url === '/favicon-32.png' ? ['favicon-32.png', 'logo.svg']
      : url === '/apple-touch-icon.png' ? ['apple-touch-icon.png', 'logo.svg']
      : ['favicon.svg', 'logo.svg'];
    for (const name of candidates) {
      const fav = join(WEB_OUT, name);
      if (existsSync(fav)) {
        const ct = name.endsWith('.ico') ? 'image/x-icon' : name.endsWith('.png') ? 'image/png' : 'image/svg+xml';
        res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400' });
        res.end(readFileSync(fav));
        return;
      }
    }
    res.writeHead(404); res.end('Not found'); return;
  }

  if (req.method === 'GET' && url === '/api/stats/public') {
    try {
      const stats = getStats();
      const log = loadUploadLog();
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const ts0 = todayStart.getTime();

      let successToday = 0;
      let failedToday = 0;
      let totalToday = 0;

      for (const item of log) {
        if (item.timestamp >= ts0) {
          totalToday++;
          if (item.code) successToday++;
          else if (item.status === 'failed' || item.error) failedToday++;
        }
      }

      jsonRes(res, 200, {
        ok: true,
        totalActive: stats.totalActive || 0,
        totalToday: Math.max(stats.uploadsToday || 0, totalToday),
        successToday: Math.max(stats.uploadsToday || 0, successToday),
        failedToday: failedToday,
        totalStorage: getTotalStorage(),
        directReady: true,
        serverTime: Date.now()
      });
    } catch (e) {
      jsonRes(res, 500, { ok: false, error: e.message });
    }
    return;
  }

  if (req.method === 'GET' && url === '/api/settings/public') {
    jsonRes(res, 200, {
      ownerWhatsapp: settings.ownerWhatsapp,
      groups: (settings.groups || []).filter(g => g.visible !== false),
      channels: (settings.channels || []).filter(c => c.visible !== false),
      claimGroups: (settings.claimGroups || (settings.claimGroup ? [settings.claimGroup] : [])).filter(g => g.visible !== false),
      popupButtons: (settings.popupButtons || []).filter(b => b.visible !== false),
      siteName: settings.siteName || 'SHIROWAHD',
      siteSubtitle: settings.siteSubtitle || 'Upload & claim video HD',
      maintenance: !!settings.maintenance,
      maxFileSizeMB: settings.maxFileSizeMB || 0,
      allowLargeUpload: settings.allowLargeUpload !== false,
      largeUploadMaxMB: settings.largeUploadMaxMB || 0,
      // Nilai ini harus sama dengan CHUNK_THRESHOLD di web/lib/up-api.js (80 MB).
      // Sebelumnya 95 dan tidak dipakai siapa pun — angka bohong di API publik.
      // chunkThresholdMB removed — no chunk upload
      videoAsDocumentMB: settings.videoAsDocumentMB || 180,
      maxVideoLongSide: settings.maxVideoLongSide ?? 1280,
      // Frontend memakai ini untuk mengarahkan upload BESAR ke jalur langsung
      // (di luar Cloudflare) saat tuan menyalakannya dari panel. Kalau mati,
      // nilainya null dan frontend tetap memakai host biasa seperti sekarang.
      directUploadBase: settings.directUploadEnabled
        ? 'https://' + (settings.directUploadHost || 'up.swhdhlz.my.id') + ':' + (settings.directUploadPort || 8443)
        : null,
      bannerText: settings.bannerText || '',
      announcement: settings.announcement || '',
      heroTitle: settings.heroTitle || '',
      heroSubtitle: settings.heroSubtitle || '',
      heroDesc: settings.heroDesc || '',
      footerText: settings.footerText || '',
      logoUrl: settings.logoUrl || '',
      heroImageUrl: settings.heroImageUrl || '',
      showWelcome: settings.showWelcome !== false,
      showOwnerBtn: settings.showOwnerBtn !== false,
      showChannelsBtn: settings.showChannelsBtn !== false,
      showClaimBtn: settings.showClaimBtn !== false,
      showPopupBtns: settings.showPopupBtns !== false,
      expireMinutes: settings.expireMinutes || 60
    });
    return;
  }

  // --- Upload (auto-convert non-MP4 video → MP4 H.264, keep 4K + FPS) ---
  if (req.method === 'POST' && url === '/upload') {
    if ((settings.ipBlacklist || []).includes(clientIP)) {
      jsonRes(res, 403, { ok: false, error: 'IP anda diblokir' }); return;
    }
    if (settings.maintenance) {
      jsonRes(res, 503, { ok: false, error: 'Sedang maintenance, coba lagi nanti' }); return;
    }
    // Rate limit check
    const rateCheck = checkUploadRate(clientIP, settings);
    if (!rateCheck.ok) {
      jsonRes(res, 429, { ok: false, error: rateCheck.error }); return;
    }
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const ct = req.headers['content-type'] || '';
        const boundary = ct.split('boundary=')[1];
        if (!boundary) { jsonRes(res, 400, { ok: false, error: 'No boundary' }); return; }

        let files = parseMultipartFiles(body, boundary);
        if (files.length === 0) { jsonRes(res, 400, { ok: false, error: 'No file' }); return; }

        const maxMB = settings.maxFileSizeMB || 0;
        if (settings.expireMinutes) setTTL(settings.expireMinutes * 60000);

        for (const file of files) {
          if (maxMB > 0 && file.buf.length > maxMB * 1024 * 1024) {
            jsonRes(res, 413, { ok: false, error: 'File "' + file.name + '" terlalu besar. Maksimal ' + maxMB + ' MB' }); return;
          }
        }

        // Kuota storage total (0 = tanpa batas). Dicek sebelum menyimpan biar disk tidak penuh.
        const quotaMB = settings.storageQuotaMB || 0;
        if (quotaMB > 0) {
          const incoming = files.reduce((s, f) => s + f.buf.length, 0);
          const used = getTotalStorage();
          if (used + incoming > quotaMB * 1024 * 1024) {
            const usedMB = (used / 1048576).toFixed(1);
            sendTelegram('error', `⚠️ <b>Kuota storage penuh</b>\nTerpakai: ${usedMB} MB / ${quotaMB} MB\nUpload ditolak dari IP ${clientIP}`);
            jsonRes(res, 507, { ok: false, error: 'Kuota storage server penuh (' + usedMB + '/' + quotaMB + ' MB). Coba lagi nanti.' }); return;
          }
        }

        // ponytail: async job flow — respond langsung, encode di background biar client bisa tunjukin progres tahap 2.
        const jobId = beginUploadJob(files, clientIP);
        jsonRes(res, 200, { ok: true, pending: true, jobId });
      } catch (e) {
        jsonRes(res, 500, { ok: false, error: e.message });
      }
    });
    return;
  }





  if (req.method === 'GET' && (url === '/upload/status' || url.startsWith('/upload/status/'))) {
    // Query dibaca lewat URLSearchParams: `split('id=')` juga cocok dengan
    // `jobId=` dan parameter lain yang kebetulan berakhiran "id", jadi mudah
    // mengambil nilai yang salah begitu ada parameter tambahan.
    const q = new URLSearchParams((req.url.split('?')[1] || ''));
    const pathId = url.startsWith('/upload/status/') ? url.slice('/upload/status/'.length).split('?')[0] : '';
    const id = pathId || q.get('id') || q.get('jobId') || '';
    const job = id && jobs.get(id);
    if (!job) { jsonRes(res, 404, { ok: false, error: 'Job tidak ditemukan' }); return; }
    jsonRes(res, 200, { ok: true, stage: job.stage, pct: job.pct, error: job.error, result: job.result, needsEncode: job.needsEncode });
    return;
  }

  if (req.method === 'GET' && url === '/header-video.mp4') {
    try {
      const vid = readFileSync(join(__dirname, 'header-video.mp4'));
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Cache-Control': 'public, max-age=86400' });
      res.end(vid);
    } catch { res.writeHead(404); res.end('Not found'); }
    return;
  }

  if (req.method === 'GET' && url === '/header-poster.jpg') {
    try {
      const img = readFileSync(join(__dirname, 'header-poster.jpg'));
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
      res.end(img);
    } catch { res.writeHead(404); res.end('Not found'); }
    return;
  }

  // admin panel (Next.js export)
  if (req.method === 'GET' && (url === '/admin' || url === '/admin/' || url === '/admin.html')) {
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(readFileSync(join(WEB_OUT, 'admin.html')));
    } catch { res.writeHead(500); res.end('Admin page not found'); }
    return;
  }

  if (req.method === 'POST' && url === '/admin/login') {
    if (!checkLoginRate(clientIP)) {
      jsonRes(res, 429, { ok: false, error: 'Terlalu banyak percobaan, coba lagi nanti' }); return;
    }
    try {
      const body = await readBody(req);
      const data = JSON.parse(body.toString());
      if (data.password === getAdminPassword()) {
        recordLoginSuccess(clientIP);
        jsonRes(res, 200, { ok: true, token: genToken() });
      } else {
        recordLoginFail(clientIP);
        jsonRes(res, 401, { ok: false, error: 'Password salah' });
      }
    } catch {
      jsonRes(res, 400, { ok: false, error: 'Bad request' });
    }
    return;
  }

  // ── Brand gallery: upload logo/hero dari admin, disimpan di brand-assets/ (survive rebuild) ──
  if (req.method === 'GET' && url.startsWith('/brand/')) {
    const name = url.slice(7).replace(/[^\w.-]/g, '');
    const file = join(BRAND_DIR, name);
    if (name && existsSync(file)) {
      const t = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.gif':'image/gif', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
      res.writeHead(200, { 'Content-Type': t[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
      res.end(readFileSync(file));
    } else { res.writeHead(404); res.end('Not found'); }
    return;
  }

  if (req.method === 'GET' && url === '/admin/api/gallery') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      if (!existsSync(BRAND_DIR)) mkdirSync(BRAND_DIR, { recursive: true });
      // Hanya berkas gambar: direktori atau berkas tersembunyi yang nyasar ke sini
      // dulu ikut terdaftar sebagai "logo" yang bisa dipilih admin.
      const files = readdirSync(BRAND_DIR).map(f => {
        const st = statSync(join(BRAND_DIR, f));
        return { name: f, url: `/brand/${f}`, size: st.size, mtime: st.mtimeMs, isFile: st.isFile() };
      }).filter(f => f.isFile && !f.name.startsWith('.') && /\.(png|jpe?g|webp|svg|gif|ico)$/i.test(f.name))
        .map(({ isFile, ...f }) => f)
        .sort((a, b) => b.mtime - a.mtime);
      jsonRes(res, 200, { ok: true, files });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  if (req.method === 'POST' && url === '/admin/api/gallery/upload') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const q = new URLSearchParams((req.url.split('?')[1] || ''));
      const raw = (q.get('name') || 'file.png').replace(/[^\w.-]/g, '_');
      const ext = extname(raw).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico'].includes(ext)) {
        jsonRes(res, 400, { ok: false, error: 'Format tidak didukung (png/jpg/webp/svg/gif/ico)' }); return;
      }
      const body = await readBody(req);
      if (!body.length) { jsonRes(res, 400, { ok: false, error: 'File kosong' }); return; }
      if (body.length > 5 * 1024 * 1024) { jsonRes(res, 400, { ok: false, error: 'Maks 5MB' }); return; }
      if (!existsSync(BRAND_DIR)) mkdirSync(BRAND_DIR, { recursive: true });
      writeFileSync(join(BRAND_DIR, raw), body);
      jsonRes(res, 200, { ok: true, url: `/brand/${raw}`, name: raw });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  if (req.method === 'POST' && url === '/admin/api/gallery/delete') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const body = await readBody(req);
      const name = (JSON.parse(body.toString()).name || '').replace(/[^\w.-]/g, '');
      const file = join(BRAND_DIR, name);
      if (name && existsSync(file)) { unlinkSync(file); jsonRes(res, 200, { ok: true }); }
      else jsonRes(res, 404, { ok: false, error: 'File tidak ada' });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  if (req.method === 'GET' && url === '/admin/api/settings') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    // Password admin tidak pernah dikirim ke browser — panel tidak punya field
    // untuk itu (ganti password lewat /admin/api/change-password), jadi tidak
    // ada gunanya mengeksposnya di respons JSON. Saat panel menyimpan kembali,
    // field yang hilang otomatis memakai nilai lama di saveSettings().
    const { adminPassword, ...safe } = loadSettings();
    jsonRes(res, 200, safe);
    return;
  }

  if (req.method === 'POST' && url === '/admin/api/settings') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const body = await readBody(req);
      const data = JSON.parse(body.toString());
      const saved = saveSettings(data);
      if (saved.expireMinutes) setTTL(saved.expireMinutes * 60000);
      startAutoCleanup(); // restart auto-cleanup with new settings
      mulaiJalurLangsung();
      jsonRes(res, 200, { ok: true });
    } catch (e) {
      jsonRes(res, 400, { ok: false, error: e.message });
    }
    return;
  }

  if (req.method === 'POST' && url === '/admin/api/change-password') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const body = await readBody(req);
      const data = JSON.parse(body.toString());
      if (!data.currentPassword || !data.newPassword) {
        jsonRes(res, 400, { ok: false, error: 'Data tidak lengkap' }); return;
      }
      if (data.currentPassword !== getAdminPassword()) {
        jsonRes(res, 401, { ok: false, error: 'Password lama salah' }); return;
      }
      if (data.newPassword.length < 4) {
        jsonRes(res, 400, { ok: false, error: 'Password baru minimal 4 karakter' }); return;
      }
      const s = loadSettings();
      s.adminPassword = data.newPassword;
      saveSettings(s);
      jsonRes(res, 200, { ok: true });
    } catch (e) {
      jsonRes(res, 400, { ok: false, error: e.message });
    }
    return;
  }

  if (req.method === 'GET' && url === '/admin/api/stats') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    const stats = getStats();
    stats.totalStorage = getTotalStorage();
    stats.expireMinutes = loadSettings().expireMinutes || 60;
    jsonRes(res, 200, stats);
    return;
  }

  if (req.method === 'GET' && url === '/admin/api/videos') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    jsonRes(res, 200, listVideos());
    return;
  }

  if (req.method === 'POST' && url === '/admin/api/video/delete') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const body = await readBody(req);
      const data = JSON.parse(body.toString());
      if (deleteVideo(data.code)) jsonRes(res, 200, { ok: true });
      else jsonRes(res, 404, { ok: false, error: 'Video tidak ditemukan' });
    } catch (e) { jsonRes(res, 400, { ok: false, error: e.message }); }
    return;
  }

  if (req.method === 'POST' && url === '/admin/api/video/extend') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const body = await readBody(req);
      const data = JSON.parse(body.toString());
      if (extendVideo(data.code, 3600000)) jsonRes(res, 200, { ok: true });
      else jsonRes(res, 404, { ok: false, error: 'Video tidak ditemukan' });
    } catch (e) { jsonRes(res, 400, { ok: false, error: e.message }); }
    return;
  }

  if (req.method === 'GET' && url === '/admin/api/upload-log') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    jsonRes(res, 200, loadUploadLog());
    return;
  }

  if (req.method === 'GET' && url === '/admin/api/analytics') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    const log = loadUploadLog();
    const days = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = 0;
    }
    for (const entry of log) {
      const key = new Date(entry.timestamp).toISOString().slice(0, 10);
      if (key in days) days[key]++;
    }
    jsonRes(res, 200, days);
    return;
  }

  if (req.method === 'POST' && url === '/admin/api/maintenance') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const body = await readBody(req);
      const data = JSON.parse(body.toString());
      const s = loadSettings();
      s.maintenance = !!data.enabled;
      saveSettings(s);
      jsonRes(res, 200, { ok: true, maintenance: s.maintenance });
    } catch (e) { jsonRes(res, 400, { ok: false, error: e.message }); }
    return;
  }

  // --- Cleanup expired files ---
  if (req.method === 'POST' && url === '/admin/api/cleanup') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const videos = listVideos();
      let deleted = 0;
      for (const v of videos) {
        if (v.remaining <= 0) { deleteVideo(v.code); deleted++; }
      }
      const orphans = cleanOrphans();
      jsonRes(res, 200, { ok: true, deleted, orphansDeleted: orphans.deleted, orphansFreed: orphans.freed });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  // --- Cleanup orphan files (ada di disk, tidak ada di index) ---
  if (req.method === 'POST' && url === '/admin/api/cleanup-orphans') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const r = cleanOrphans();
      jsonRes(res, 200, { ok: true, deleted: r.deleted, freed: r.freed });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  if (req.method === 'GET' && url === '/admin/api/blacklist') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    const s = loadSettings();
    jsonRes(res, 200, s.ipBlacklist || []);
    return;
  }

  if (req.method === 'POST' && url === '/admin/api/blacklist') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const body = await readBody(req);
      const data = JSON.parse(body.toString());
      const s = loadSettings();
      if (data.action === 'add' && data.ip) {
        if (!s.ipBlacklist) s.ipBlacklist = [];
        if (!s.ipBlacklist.includes(data.ip)) s.ipBlacklist.push(data.ip);
      } else if (data.action === 'remove' && data.ip) {
        s.ipBlacklist = (s.ipBlacklist || []).filter(x => x !== data.ip);
      }
      saveSettings(s);
      jsonRes(res, 200, { ok: true, ipBlacklist: s.ipBlacklist });
    } catch (e) { jsonRes(res, 400, { ok: false, error: e.message }); }
    return;
  }

  // === BACKUP TO GITHUB ===
  if (req.method === 'POST' && url === '/admin/api/backup') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const cwd = __dirname;
      const run = (cmd) => {
        try { return execSync(cmd, { cwd, encoding: 'utf8', timeout: 60000 }).trim(); }
        catch (e) { throw new Error(e.stderr ? e.stderr.toString().trim() : e.message); }
      };
      run('git config user.name "shirowahd-admin"');
      run('git config user.email "admin@shirowahd.local"');

      const branch = process.env.BRANCH || 'main';
      const repo = process.env.GIT_ADDRESS || 'https://github.com/hijuki/shirowahd';
      const token = process.env.GIT_TOKEN || '';
      if (!token) throw new Error('GIT_TOKEN tidak ditemukan di .env — tambahkan GIT_TOKEN=ghp_xxx di /root/shirowahd/.env');
      const authUrl = repo.replace(/^https:\/\/([^@]*@)?/, `https://${token}@`);

      // admin-settings.json TIDAK di-backup langsung karena isinya password admin
      // + token Telegram. Yang di-commit adalah salinan tersanitasi, supaya
      // konfigurasi tetap punya backup tanpa membocorkan kredensial.
      try {
        const s = loadSettings();
        const safe = { ...s };
        for (const k of ['adminPassword', 'telegramBotToken']) {
          if (safe[k]) safe[k] = '__SET_VIA_ENV__';
        }
        writeFileSync(join(__dirname, 'admin-settings.sanitized.json'), JSON.stringify(safe, null, 2), 'utf8');
      } catch { /* jangan gagalkan backup gara-gara ini */ }

      // Stage semua perubahan yang relevan. config.js ikut karena isinya sekarang
      // hanya referensi process.env (tanpa secret). File state runtime sudah
      // di-untrack lewat .gitignore.
      run('git add -A config.js admin-settings.sanitized.json .gitignore .env.example main.js web-uploader.js install.sh migrate.sh README.md package.json index.js rename-ourin.sh 2>/dev/null || true');
      try { run('git add -A plugins/ src/ case/ database/ web/ 2>/dev/null || true'); } catch {}

      let status = '';
      try { status = run('git status --porcelain'); } catch {}
      const staged = status ? status.split('\n').filter(l => l && !l.startsWith('??')).length : 0;
      const lines = staged;
      if (lines) {
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        run(`git commit -m "backup: ${ts} (${lines} files)"`);
      }

      // Sinkron dulu dengan remote (riwayat bisa divergen) lalu push.
      // autoStash menjaga sisa file dirty (log/state) tidak memblokir rebase.
      run(`git fetch ${authUrl} ${branch} 2>&1`);
      let behind = '0';
      try { behind = run(`git rev-list --count HEAD..FETCH_HEAD`); } catch {}
      if (behind !== '0') run(`git -c rebase.autoStash=true rebase FETCH_HEAD 2>&1`);

      let ahead = '0';
      try { ahead = run(`git rev-list --count FETCH_HEAD..HEAD`); } catch {}
      if (ahead === '0' && !lines) {
        addBackupHistory({ ok: true, changed: 0, pushed: 0, message: 'Sudah sinkron' });
        jsonRes(res, 200, { ok: true, message: 'Sudah sinkron, tidak ada perubahan untuk di-backup', changed: 0 });
        return;
      }

      run(`git push ${authUrl} HEAD:${branch} 2>&1`);
      // Push memakai URL beraut (bukan remote "origin"), jadi ref pelacak
      // refs/remotes/origin/<branch> tidak ikut diperbarui dan bikin
      // `git status` / rev-list terlihat "ahead" padahal sudah sinkron.
      try { run(`git update-ref refs/remotes/origin/${branch} HEAD`); } catch {}
      addBackupHistory({ ok: true, changed: lines, pushed: Number(ahead), message: 'Push berhasil' });
      jsonRes(res, 200, { ok: true, message: `Backup berhasil! ${lines} file di-commit, ${ahead} commit di-push ke GitHub`, changed: lines, pushed: Number(ahead) });
    } catch (e) {
      const msg = (e.message || 'Unknown error').replace(/https:\/\/[^@]+@/g, 'https://***@');
      addBackupHistory({ ok: false, message: msg.slice(0, 300) });
      sendTelegram('error', `❌ <b>Backup GitHub gagal</b>\n${msg.slice(0, 300)}`);
      jsonRes(res, 500, { ok: false, error: msg });
    }
    return;
  }

  // === RESTART BOT (pm2, fallback ke pkill lalu pm2 start) ===
  if (req.method === 'POST' && url === '/admin/api/bot/restart') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      let out = '';
      try {
        out = execSync('pm2 restart main --update-env 2>&1', { encoding: 'utf8', timeout: 60000 }).trim();
      } catch (e) {
        out = execSync('pm2 start main.js --name main 2>&1', { cwd: __dirname, encoding: 'utf8', timeout: 60000 }).trim();
      }
      sendTelegram('error', '🔄 <b>Bot di-restart</b> dari panel admin');
      jsonRes(res, 200, { ok: true, message: 'Bot WhatsApp berhasil di-restart!', output: out.split('\n').slice(-6).join('\n') });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.stderr ? e.stderr.toString().trim() : e.message }); }
    return;
  }

  if (req.method === 'POST' && url === '/admin/api/web/restart') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      sendTelegram('error', '🔄 <b>Web Uploader di-restart</b> dari panel admin');
      jsonRes(res, 200, { ok: true, message: 'Web Uploader sedang di-restart...' });
      setTimeout(() => {
        try { execSync('pm2 restart web --update-env 2>&1'); } catch {}
      }, 500);
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  if (req.method === 'POST' && url === '/admin/api/all/restart') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      sendTelegram('error', '🔄 <b>Semua service di-restart</b> dari panel admin');
      jsonRes(res, 200, { ok: true, message: 'Semua service (Bot + Web) sedang di-restart...' });
      setTimeout(() => {
        try { execSync('pm2 restart all --update-env 2>&1'); } catch {}
      }, 500);
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  if (req.method === 'GET' && url.startsWith('/admin/api/logs')) {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const q = new URLSearchParams((req.url.split('?')[1] || ''));
      const lines = Math.min(Math.max(parseInt(q.get('lines') || '200', 10) || 200, 10), 2000);
      const which = q.get('type') === 'error' ? 'main-error.log' : 'main-out.log';
      const candidates = [
        join(process.env.HOME || '/root', '.pm2', 'logs', which),
        join(__dirname, 'logs', which),
      ];
      let file = candidates.find(f => existsSync(f));
      if (!file) { jsonRes(res, 200, { ok: true, lines: [], note: 'File log tidak ditemukan' }); return; }
      const out = execSync(`tail -n ${lines} ${JSON.stringify(file)}`, { encoding: 'utf8', timeout: 10000, maxBuffer: 8 * 1024 * 1024 });
      jsonRes(res, 200, { ok: true, file, lines: out.split('\n') });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  // === BACKUP HISTORY ===
  if (req.method === 'GET' && url === '/admin/api/backup/history') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    jsonRes(res, 200, { ok: true, history: loadBackupHistory() });
    return;
  }

  // ===========================================================================
  // KENDALI CLOUDFLARE + JALUR UPLOAD LANGSUNG
  // ===========================================================================
  // Dua saklar terpisah, dua-duanya dari panel admin:
  //
  //   1. proxy Cloudflare per-record (orange ⇄ grey cloud) — lewat CF API
  //   2. jalur upload langsung di port 8443 — lewat setelan app
  //
  // Kredensial dibaca dari .env (CF_EMAIL + CF_KEY) dan TIDAK PERNAH dikirim ke
  // frontend. Zone dicari dari nama domain, tidak di-hardcode, supaya masih
  // jalan kalau domainnya pindah.

  // Panggil CF API. Balikan { status, json } — pemanggil yang memutuskan.
  async function cfApi(path, method = 'GET', body) {
    const email = process.env.CF_EMAIL, key = process.env.CF_KEY;
    if (!email || !key) return { status: 0, json: null, error: 'CF_EMAIL/CF_KEY belum diisi di .env' };
    const r = await fetch('https://api.cloudflare.com/client/v4' + path, {
      method,
      headers: { 'X-Auth-Email': email, 'X-Auth-Key': key, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  }

  async function cfZoneId() {
    const dom = process.env.DOMAIN || loadSettings().domain || '';
    if (!dom) return { error: 'DOMAIN belum diisi' };
    const r = await cfApi('/zones?name=' + encodeURIComponent(dom));
    const z = r.json?.result?.[0];
    return z ? { id: z.id, name: z.name, plan: z.plan?.name } : { error: 'zone ' + dom + ' tidak ditemukan' };
  }

  // Daftar record + status proxy, plus keadaan jalur langsung.
  if (req.method === 'GET' && url === '/admin/api/cf/dns') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const z = await cfZoneId();
      if (z.error) { jsonRes(res, 200, { ok: false, error: z.error }); return; }
      const r = await cfApi('/zones/' + z.id + '/dns_records?per_page=100');
      const st = loadSettings();
      jsonRes(res, 200, {
        ok: true,
        zone: { name: z.name, plan: z.plan },
        // Cap upload edge menurut plan — angka resmi Cloudflare, bukan tebakan.
        edgeCapMB: /business/i.test(z.plan || '') ? 200 : /enterprise/i.test(z.plan || '') ? 500 : 100,
        records: (r.json?.result || [])
          .filter(d => d.type === 'A' || d.type === 'AAAA' || d.type === 'CNAME')
          .map(d => ({ id: d.id, type: d.type, name: d.name, content: d.content, proxied: d.proxied })),
        direct: {
          enabled: !!st.directUploadEnabled,
          host: st.directUploadHost || 'up.swhdhlz.my.id',
          port: st.directUploadPort || 8443,
          // Apakah sertifikatnya benar-benar ada? Kalau tidak, menyalakan saklar
          // tidak akan membuka port — jadi panel harus jujur soal ini.
          certReady: existsSync('/etc/letsencrypt/live/up.swhdhlz.my.id/fullchain.pem'),
          listening: (() => {
            try { return execSync('ss -ltn 2>/dev/null | grep -c ":' + (st.directUploadPort || 8443) + ' " || true',
              { encoding: 'utf8', timeout: 5000 }).trim() !== '0'; } catch { return false; }
          })(),
        },
      });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  // Nyalakan/matikan proxy Cloudflare untuk satu record.
  // proxied=true  → aman (IP tersembunyi), cap upload berlaku
  // proxied=false → cap hilang, IP asli terbuka
  if (req.method === 'POST' && url === '/admin/api/cf/proxy') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const data = JSON.parse((await readBody(req)).toString());
      if (!data.recordId) { jsonRes(res, 400, { ok: false, error: 'recordId wajib' }); return; }
      const z = await cfZoneId();
      if (z.error) { jsonRes(res, 200, { ok: false, error: z.error }); return; }
      // PATCH, bukan PUT: PUT butuh seluruh field dan menghapus yang tidak dikirim.
      const r = await cfApi('/zones/' + z.id + '/dns_records/' + data.recordId, 'PATCH', { proxied: !!data.proxied });
      if (!r.json?.success) {
        jsonRes(res, 200, { ok: false, error: JSON.stringify(r.json?.errors || 'gagal').slice(0, 300) });
        return;
      }
      jsonRes(res, 200, { ok: true, name: r.json.result.name, proxied: r.json.result.proxied });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  // Nyalakan/matikan jalur upload langsung secara instan (live switch).
  if (req.method === 'POST' && url === '/admin/api/direct-upload') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const data = JSON.parse((await readBody(req)).toString());
      const mau = !!data.enabled;
      const certOk = existsSync('/etc/letsencrypt/live/up.swhdhlz.my.id/fullchain.pem');
      if (mau && !certOk) {
        jsonRes(res, 200, { ok: false, error: 'Sertifikat up.swhdhlz.my.id belum ada — jalur langsung tidak bisa dinyalakan tanpa HTTPS' });
        return;
      }
      const st = loadSettings();
      st.directUploadEnabled = mau;
      saveSettings(st);
      mulaiJalurLangsung();
      jsonRes(res, 200, {
        ok: true, enabled: mau,
        needsRestart: false,
        note: mau
          ? 'Jalur HTTPS langsung aktif di port ' + (st.directUploadPort || 8443) + ' tanpa batas 100 MB!'
          : 'Jalur langsung dimatikan. Semua upload kembali lewat Cloudflare.',
      });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  // === STATUS CLOUDFLARE TUNNEL ===
  if (req.method === 'GET' && url === '/admin/api/tunnel') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      let pids = [];
      try {
        pids = execSync('pgrep -f "cloudflared tunnel" 2>/dev/null || true', { encoding: 'utf8', timeout: 5000 })
          .trim().split('\n').filter(Boolean);
      } catch { /* pgrep tidak ada */ }
      jsonRes(res, 200, {
        ok: true,
        enabled: process.env.ENABLE_TUNNEL === '1',
        running: pids.length > 0,
        processes: pids.length,
        domain: process.env.DOMAIN || loadSettings().domain || '',
        // token/CF_KEY sengaja tidak dikirim ke frontend
        configured: Boolean(process.env.CF_ACCOUNT && process.env.CF_KEY && process.env.CF_TUNNEL_ID),
      });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  // === MONITORING API ===

    // ponytail: pm2 endpoints removed — not used on Pterodactyl

  if (req.method === 'GET' && url === '/admin/api/system') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const memRaw = execSync("free -b | awk '/Mem:/{print $2,$3,$4}'", { timeout: 3000 }).toString().trim().split(' ');
      const diskRaw = execSync("df -B1 / | awk 'NR==2{print $2,$3,$4,$5}'", { timeout: 3000 }).toString().trim().split(' ');
      const uptime = execSync('cat /proc/uptime', { timeout: 2000 }).toString().trim().split(' ')[0];
      const loadavg = execSync('cat /proc/loadavg', { timeout: 2000 }).toString().trim().split(' ').slice(0, 3).join(' ');
      jsonRes(res, 200, {
        ok: true,
        mem: { total: +memRaw[0], used: +memRaw[1], free: +memRaw[2] },
        disk: { total: +diskRaw[0], used: +diskRaw[1], free: +diskRaw[2], pct: diskRaw[3] },
        uptime: +uptime,
        loadavg
      });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  if (req.method === 'POST' && url === '/admin/api/bot/pair') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const body = await readBody(req);
      const { number } = JSON.parse(body.toString());
      if (!number || !/^\d{10,15}$/.test(number)) {
        jsonRes(res, 400, { ok: false, error: 'Nomor tidak valid (10-15 digit)' }); return;
      }
      // ponytail: on Pterodactyl, no pm2. Clear session + set env for next restart.
      const sessionDir = join(__dirname, 'storage', 'session');
      try { execSync('rm -rf ' + JSON.stringify(sessionDir + '/*') + ' 2>/dev/null; true', { timeout: 5000 }); } catch {}
      // Write pair number to env file so bot picks it up
      writeFileSync(join(__dirname, '.pair-number'), number);
      jsonRes(res, 200, { ok: true, message: 'Session dihapus. Restart server dari Pterodactyl panel, bot akan pairing dengan nomor ' + number + '.' });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  if (req.method === 'GET' && url === '/admin/api/bot/status') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    try {
      const sessionDir = join(__dirname, 'storage', 'session');
      const hasSession = existsSync(join(sessionDir, 'creds.json'));
      // Status bot HARUS ditanya ke bot-nya sendiri (internal API 127.0.0.1:8081).
      // Sebelumnya botOnline = hasSession && uptime proses WEB > 30 detik, jadi
      // panel menampilkan ONLINE walaupun proses bot mati — cuma menandakan
      // "file sesi ada dan web sudah hidup", bukan bot benar-benar tersambung.
      const live = await botInternalStatus();
      jsonRes(res, 200, {
        ok: true,
        botOnline: live ? live.connected === true : false,
        botReachable: !!live,
        user: live?.user || null,
        hasSession,
        pid: process.pid,
        uptime: Date.now() - (process.uptime() * 1000),
        restarts: 0
      });
    } catch (e) { jsonRes(res, 500, { ok: false, error: e.message }); }
    return;
  }

  // === BOT API PROXY (to internal API on 127.0.0.1:8081) ===
  if (url === '/admin/api/bot/groups' && req.method === 'GET') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    proxyBotApi(req, res, 'GET', '/groups');
    return;
  }

  if (url === '/admin/api/bot/groups/leave' && req.method === 'POST') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    proxyBotApi(req, res, 'POST', '/groups/leave');
    return;
  }

  if (url === '/admin/api/bot/groups/toggle' && req.method === 'POST') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    proxyBotApi(req, res, 'POST', '/groups/toggle');
    return;
  }

  if (url === '/admin/api/bot/broadcast' && req.method === 'POST') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    proxyBotApi(req, res, 'POST', '/broadcast');
    return;
  }

  if (url === '/admin/api/bot/broadcast/cancel' && req.method === 'POST') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    proxyBotApi(req, res, 'POST', '/broadcast/cancel');
    return;
  }

  if (url === '/admin/api/bot/send' && req.method === 'POST') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    proxyBotApi(req, res, 'POST', '/send');
    return;
  }

  if (url === '/admin/api/bot/exec' && req.method === 'POST') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    proxyBotApi(req, res, 'POST', '/exec');
    return;
  }

  // Ringkasan plugin + tabrakan nama command, diambil langsung dari registry bot.
  if (url === '/admin/api/bot/plugins' && req.method === 'GET') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    proxyBotApi(req, res, 'GET', '/plugins');
    return;
  }

  if (url === '/admin/api/bot/internal-status' && req.method === 'GET') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    proxyBotApi(req, res, 'GET', '/status');
    return;
  }

  res.writeHead(404); res.end('Not found');
}

const server = http.createServer(handleRequest);

// Tanya status ke internal API bot. Timeout pendek: kalau bot mati, panel harus
// cepat menampilkan OFFLINE, bukan menunggu sampai request browser habis waktu.
function botInternalStatus() {
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    try {
      const r = http.request({ hostname: '127.0.0.1', port: 8081, path: '/status', method: 'GET', timeout: 2000 }, resp => {
        let data = '';
        resp.on('data', c => data += c);
        resp.on('end', () => { try { finish(JSON.parse(data)); } catch { finish(null); } });
      });
      r.on('timeout', () => { r.destroy(); finish(null); });
      r.on('error', () => finish(null));
      r.end();
    } catch { finish(null); }
    setTimeout(() => finish(null), 2500);
  });
}

// --- Bot API proxy helper ---
function proxyBotApi(clientReq, clientRes, method, path) {
  const opts = {
    hostname: '127.0.0.1',
    port: 8081,
    path: path,
    method: method,
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000
  };
  const proxy = http.request(opts, (proxyRes) => {
    const chunks = [];
    proxyRes.on('data', c => chunks.push(c));
    proxyRes.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      clientRes.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      clientRes.end(body);
    });
  });
  proxy.on('error', (e) => {
    jsonRes(clientRes, 502, { ok: false, error: 'Bot API unavailable: ' + e.message });
  });
  proxy.on('timeout', () => {
    proxy.destroy();
    jsonRes(clientRes, 504, { ok: false, error: 'Bot API timeout' });
  });
  if (method === 'POST') {
    readBody(clientReq).then(buf => { proxy.end(buf); }).catch(() => proxy.end());
  } else {
    proxy.end();
  }
}

server.timeout = 600000;
server.requestTimeout = 600000;
server.headersTimeout = 600000;
server.keepAliveTimeout = 600000;
server.listen(PORT, () => console.log('Web uploader on port ' + PORT));

// ---------------------------------------------------------------------------
// Jalur upload langsung (HTTPS, di luar Cloudflare)
// ---------------------------------------------------------------------------
// Kenapa perlu: Cloudflare menolak body >100 MB di plan Free dan itu tidak bisa
// dinaikkan dari sisi origin. Subdomain grey-cloud tidak lewat edge, jadi tidak
// ada cap.
//
// Kenapa PORT 8443, bukan 443: port 443 di box ini dipakai sshd — satu-satunya
// jalan masuk SSH. Mengambilnya untuk web = kehilangan akses administrasi.
//
// Handler-nya SAMA PERSIS dengan server HTTP di atas (`server` dipakai ulang
// lewat listener yang sama), jadi tidak ada logika upload yang bercabang dua dan
// tidak ada yang bisa berbeda perilaku antara dua jalur.
//
// Hidup/mati diputuskan saat proses start dari setelan `directUploadEnabled`.
// Mematikan dari panel = port ini tidak dibuka lagi setelah restart berikutnya,
// jadi IP tertutup lagi.
const TLS_DIR = '/etc/letsencrypt/live/up.swhdhlz.my.id';
let srvTlsInstance = null;

function mulaiJalurLangsung() {
  const s = loadSettings();
  if (!s.directUploadEnabled) {
    if (srvTlsInstance) {
      try { srvTlsInstance.close(); console.log('[direct] server port ditutup'); } catch {}
      srvTlsInstance = null;
    }
    console.log('[direct] mati (directUploadEnabled=false) — semua upload lewat Cloudflare');
    return;
  }
  if (srvTlsInstance) return; // sudah berjalan
  const port = s.directUploadPort || 8443;
  let kunci, rantai;
  try {
    kunci = readFileSync(join(TLS_DIR, 'privkey.pem'));
    rantai = readFileSync(join(TLS_DIR, 'fullchain.pem'));
  } catch (e) {
    console.log('[direct] GAGAL: sertifikat tidak terbaca di ' + TLS_DIR + ' (' + e.code + ') — jalur langsung tidak dibuka');
    return;
  }
  srvTlsInstance = https.createServer({ key: kunci, cert: rantai }, handleRequest);
  srvTlsInstance.timeout = 600000;
  srvTlsInstance.requestTimeout = 600000;
  srvTlsInstance.headersTimeout = 600000;
  srvTlsInstance.keepAliveTimeout = 600000;
  srvTlsInstance.on('error', (e) => {
    console.log('[direct] error port ' + port + ': ' + e.message);
    srvTlsInstance = null;
  });
  srvTlsInstance.listen(port, () => console.log('[direct] HTTPS aktif di port ' + port + ' (di luar Cloudflare, tanpa cap 100 MB)'));
}
mulaiJalurLangsung();
