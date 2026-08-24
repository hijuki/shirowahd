import http from 'http';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { storeVideo, storeBundle, getBundle, isBundle, deleteVideo, extendVideo, listVideos, getStats, getTotalStorage, setTTL, getTTL } from './src/lib/vid-store.js';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import https from 'https';
import { execSync, exec as execCb } from 'child_process';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 80;
const WEB_OUT = join(__dirname, 'web', 'out');
const SETTINGS_FILE = join(__dirname, 'admin-settings.json');
const UPLOAD_LOG_FILE = join(__dirname, 'upload-log.json');

// --- Telegram Notif ---
function sendTelegram(event, text) {
  const s = loadSettings();
  if (!s.telegramBotToken || !s.telegramChatId) return;
  if (event === 'upload' && !s.telegramNotifyUpload) return;
  if (event === 'claim' && !s.telegramNotifyClaim) return;
  if (event === 'error' && !s.telegramNotifyError) return;
  const body = JSON.stringify({ chat_id: s.telegramChatId, text, parse_mode: 'HTML' });
  const req = https.request({ hostname: 'api.telegram.org', path: `/bot${s.telegramBotToken}/sendMessage`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } });
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
    bannerText: '',
    announcement: '',
    heroTitle: '',
    heroSubtitle: '',
    heroDesc: '',
    footerText: '',
    logoUrl: '',
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
    storageQuotaMB: 0
  };
}

function saveSettings(data) {
  const cur = loadSettings();
  const s = {
    ownerWhatsapp: data.ownerWhatsapp ?? cur.ownerWhatsapp ?? '',
    groups: data.groups ?? cur.groups ?? [],
    channels: data.channels ?? cur.channels ?? [],
    claimGroups: data.claimGroups ?? cur.claimGroups ?? (cur.claimGroup ? [cur.claimGroup] : []),
    popupButtons: data.popupButtons ?? cur.popupButtons ?? [],
    adminPassword: data.adminPassword ?? cur.adminPassword ?? '@Hillz126',
    maintenance: data.maintenance ?? cur.maintenance ?? false,
    ipBlacklist: data.ipBlacklist ?? cur.ipBlacklist ?? [],
    siteName: data.siteName ?? cur.siteName ?? 'SHIROWAHD',
    siteSubtitle: data.siteSubtitle ?? cur.siteSubtitle ?? 'Upload & claim video HD',
    expireMinutes: data.expireMinutes ?? cur.expireMinutes ?? 60,
    maxFileSizeMB: data.maxFileSizeMB ?? cur.maxFileSizeMB ?? 0,
    bannerText: data.bannerText ?? cur.bannerText ?? '',
    announcement: data.announcement ?? cur.announcement ?? '',
    heroTitle: data.heroTitle ?? cur.heroTitle ?? '',
    heroSubtitle: data.heroSubtitle ?? cur.heroSubtitle ?? '',
    heroDesc: data.heroDesc ?? cur.heroDesc ?? '',
    footerText: data.footerText ?? cur.footerText ?? '',
    logoUrl: data.logoUrl ?? cur.logoUrl ?? '',
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
    autoCleanupInterval: data.autoCleanupInterval ?? cur.autoCleanupInterval ?? 30,
    storageQuotaMB: data.storageQuotaMB ?? cur.storageQuotaMB ?? 0
  };
  writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2), 'utf8');
  return s;
}

function getAdminPassword() {
  return loadSettings().adminPassword || '@Hillz126';
}

(function initTTL() {
  const s = loadSettings();
  if (s.expireMinutes) setTTL(s.expireMinutes * 60000);
})();

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
const VIDEO_MP4_EXTS = ['.mp4', '.m4v'];
const VIDEO_EXTS = ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.3gp', '.flv', '.wmv', '.ts', '.m4v'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'];

function isVideoFile(name) {
  const ext = extname(name || '').toLowerCase();
  return VIDEO_EXTS.includes(ext);
}

function needsConvert(name) {
  const ext = extname(name || '').toLowerCase();
  return isVideoFile(name) && !VIDEO_MP4_EXTS.includes(ext);
}

// Detect if video codec is NOT h264 — needs re-encode for WA compatibility
function detectNeedsReencode(filePath) {
  try {
    const codec = execSync('ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 ' + JSON.stringify(filePath), { timeout: 10000, stdio: 'pipe' }).toString().trim();
    // h264/avc = compatible with all WA clients. Anything else (hevc/h265/vp9/av1) = re-encode
    return codec !== 'h264';
  } catch { return false; }
}

function convertToMp4(buf, originalName) {
  const id = crypto.randomBytes(8).toString('hex');
  const ext = extname(originalName || '').toLowerCase() || '.vid';
  const tmpIn = join(tmpdir(), 'upload_in_' + id + ext);
  const tmpOut = join(tmpdir(), 'upload_out_' + id + '.mp4');
  try {
    writeFileSync(tmpIn, buf);
    const forceReencode = detectNeedsReencode(tmpIn);
    if (!forceReencode) {
      // Source is h264 — stream copy (no re-encode, keeps quality 100%)
      try {
        execSync(
          'ffmpeg -i ' + JSON.stringify(tmpIn) + ' -c:v copy -c:a aac -b:a 320k -movflags +faststart -y ' + JSON.stringify(tmpOut),
          { timeout: 300000, stdio: 'pipe' }
        );
        if (existsSync(tmpOut) && readFileSync(tmpOut).length > 1000) {
          return { buf: readFileSync(tmpOut), name: originalName.replace(/\.[^.]+$/, '.mp4') };
        }
      } catch {}
    }
    // Re-encode to H.264 — either forced (HEVC/VP9/AV1) or stream copy failed
    try { unlinkSync(tmpOut); } catch {}
    let fpsFlag = '';
    try {
      const fps = execSync('ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 ' + JSON.stringify(tmpIn), { timeout: 10000, stdio: 'pipe' }).toString().trim().replace(/,+$/, '');
      if (fps && /^\d+\/\d+$/.test(fps)) {
        const [num, den] = fps.split('/').map(Number);
        const fpsVal = den ? num / den : num;
        // Cap at 90fps — prevents ffmpeg meltdown from variable-rate videos reporting 1000000/1
        if (fpsVal > 0 && fpsVal <= 90) fpsFlag = ' -r ' + fps;
        else if (fpsVal > 90) fpsFlag = ' -r 90';
      }
    } catch {}
    // Auto-downscale: cap at 1440p (2K). WA can't display 4K anyway.
    let scaleFilter = '';
    try {
      const res = execSync('ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 ' + JSON.stringify(tmpIn), { timeout: 10000, stdio: 'pipe' }).toString().trim().replace(/,+$/, '');
      const [w, h] = res.split(',').map(Number);
      if (w && h && Math.min(w, h) > 1440) {
        // Landscape: height=1440, Portrait: width=1440. Keep aspect ratio.
        if (w > h) scaleFilter = ' -vf scale=-2:1440';
        else scaleFilter = ' -vf scale=1440:-2';
      }
    } catch {}
    // ponytail: crf 23 = good quality, lighter than 18. veryfast preset = much less CPU. Upgrade to crf 18 + fast if server has dedicated GPU/power.
    execSync(
      'ffmpeg -i ' + JSON.stringify(tmpIn) + ' -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -preset veryfast -crf 23' + scaleFilter + fpsFlag + ' -c:a aac -b:a 192k -movflags +faststart -y ' + JSON.stringify(tmpOut),
      { timeout: 600000, stdio: 'pipe' }
    );
    return { buf: readFileSync(tmpOut), name: originalName.replace(/\.[^.]+$/, '.mp4') };
  } finally {
    try { unlinkSync(tmpIn); } catch {}
    try { unlinkSync(tmpOut); } catch {}
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

// --- Server ---
const server = http.createServer(async (req, res) => {
  const url = parseUrl(req.url);
  const clientIP = getClientIP(req);
  const settings = loadSettings();

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
    res.end(); return;
  }

  if (req.method === 'GET' && (url === '/' || url === '')) {
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(readFileSync(join(WEB_OUT, 'index.html')));
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


  if (req.method === 'GET' && url === '/favicon.svg') {
    const fav = join(WEB_OUT, 'favicon.svg');
    if (existsSync(fav)) {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end(readFileSync(fav));
      return;
    }
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
      bannerText: settings.bannerText || '',
      announcement: settings.announcement || '',
      heroTitle: settings.heroTitle || '',
      heroSubtitle: settings.heroSubtitle || '',
      heroDesc: settings.heroDesc || '',
      footerText: settings.footerText || '',
      logoUrl: settings.logoUrl || '',
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

        // ponytail: auto-convert ALL video to MP4 H.264 on upload (keep 4K + FPS, no compress)
        // includes .mp4 with HEVC codec — re-encode to H.264 for WA compatibility
        files = files.map(f => {
          if (isVideoFile(f.name)) {
            try {
              const converted = convertToMp4(f.buf, f.name);
              return converted;
            } catch (e) {
              console.log('[upload] ffmpeg convert failed for ' + f.name + ': ' + e.message);
              return f; // fallback: store as-is
            }
          }
          return f;
        });

        const allImages = files.every(f => {
          const ext = (f.name || '').toLowerCase().replace(/^.*\./, '.');
          return IMAGE_EXTS.includes('.' + ext.replace(/^\./, ''));
        });

        if (allImages && files.length >= 1) {
          const code = storeBundle(files, clientIP);
          if (!code) { jsonRes(res, 500, { ok: false, error: 'Server penuh' }); return; }
          const totalSize = files.reduce((s, f) => s + f.buf.length, 0);
          addUploadLog({ ip: clientIP, timestamp: Date.now(), filename: files.map(f => f.name).join(', '), filesize: totalSize, code, bundle: true, count: files.length });
          recordUpload(clientIP);
          sendTelegram('upload', `📤 <b>Upload Bundle</b>\n${files.length} file | ${(totalSize/1048576).toFixed(1)} MB\nKode: <code>${code}</code>\nIP: ${clientIP}`);
          jsonRes(res, 200, { ok: true, code, bundle: true, count: files.length });
        } else {
          const codes = [];
          for (const file of files) {
            const code = storeVideo(file.buf, file.name, clientIP);
            if (!code) { jsonRes(res, 500, { ok: false, error: 'Server penuh' }); return; }
            codes.push({ code, name: file.name });
            addUploadLog({ ip: clientIP, timestamp: Date.now(), filename: file.name, filesize: file.buf.length, code });
          }
          recordUpload(clientIP);
          sendTelegram('upload', `📤 <b>Upload</b>\n${codes.map(c=>c.name).join(', ')}\nKode: <code>${codes[0].code}</code>\nIP: ${clientIP}`);
          jsonRes(res, 200, { ok: true, code: codes[0].code, codes });
        }
      } catch (e) {
        jsonRes(res, 500, { ok: false, error: e.message });
      }
    });
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

  if (req.method === 'GET' && url === '/admin/api/settings') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    jsonRes(res, 200, loadSettings());
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
      jsonRes(res, 200, { ok: true, deleted });
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

      // Stage only safe files (skip node_modules/storage/session)
      run('git add admin-settings.json .gitignore main.js web-uploader.js 2>/dev/null || true');
      try { run('git add plugins/ src/ database/ 2>/dev/null || true'); } catch {}

      let status = '';
      try { status = run('git status --porcelain'); } catch {}
      if (!status) {
        jsonRes(res, 200, { ok: true, message: 'Tidak ada perubahan untuk di-backup', changed: 0 });
        return;
      }
      const lines = status.split('\n').filter(Boolean).length;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      run(`git commit -m "backup: ${ts} (${lines} files)"`);

      // Try push with existing origin first
      let pushed = false;
      try { run('git push origin main 2>&1'); pushed = true; } catch {}

      // Fallback: build auth URL from env
      if (!pushed) {
        const repo = process.env.GIT_ADDRESS || 'https://github.com/hijuki/shirowahd';
        const token = process.env.GIT_TOKEN || '';
        if (!token) {
          // Try reading from .env file directly
          let envToken = '';
          try {
            const envFile = require('fs').readFileSync(require('path').join(__dirname, '.env'), 'utf8');
            const m = envFile.match(/GIT_TOKEN=([^\s]+)/);
            if (m) envToken = m[1];
          } catch {}
          if (!envToken) throw new Error('GIT_TOKEN tidak ditemukan di environment atau .env — tambahkan GIT_TOKEN=ghp_xxx di file .env');
          const authUrl = repo.replace('https://', `https://${envToken}@`);
          run(`git push ${authUrl} main 2>&1`);
        } else {
          const authUrl = repo.replace('https://', `https://${token}@`);
          run(`git push ${authUrl} main 2>&1`);
        }
      }

      jsonRes(res, 200, { ok: true, message: `Backup berhasil! ${lines} file di-push ke GitHub`, changed: lines });
    } catch (e) {
      const msg = (e.message || 'Unknown error').replace(/https:\/\/[^@]+@/g, 'https://***@');
      jsonRes(res, 500, { ok: false, error: msg });
    }
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
      // ponytail: bot runs inside same process via import in start-all.js; upgrade to separate process check if split later
      const botOnline = hasSession && process.uptime() > 30;
      jsonRes(res, 200, {
        ok: true,
        botOnline,
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

  if (url === '/admin/api/bot/internal-status' && req.method === 'GET') {
    if (!validToken(req)) { jsonRes(res, 401, { ok: false, error: 'Unauthorized' }); return; }
    proxyBotApi(req, res, 'GET', '/status');
    return;
  }

  res.writeHead(404); res.end('Not found');
});

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
