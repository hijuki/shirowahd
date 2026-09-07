import axios from 'axios';
import yts from 'yt-search';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';
import config from '../../config.js';
import te from '../../src/lib/hillz-error.js';
import { ytdl } from '../../src/scraper/ytdl.js';

const jalankan = promisify(execFile);
const BATAS_BASE64 = 550 * 1024;
const BITRATE_MIN = { mp3: 20, opus: 16 };
const BITRATE_AWAL = { mp3: 32, opus: 24 };
const CODEC = {
    mp3: { args: (br) => ['-af', 'highpass=f=30,loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'libmp3lame', '-b:a', `${br}k`, '-ac', '1', '-ar', '44100'], ext: 'mp3', mime: 'audio/mpeg' },
    opus: { args: (br) => ['-af', 'highpass=f=30,loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'libopus', '-b:a', `${br}k`, '-vbr', 'on', '-application', 'audio', '-ac', '1', '-ar', '48000'], ext: 'ogg', mime: 'audio/ogg' }
};

const FFMPEG_BIN = existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : 'ffmpeg';
const API_LRCLIB = 'https://lrclib.net/api';
const UA = 'shirowahd-bot/1.0 (+play lyrics)';
const DATA_DIR = join(process.cwd(), 'src', 'data', 'lyrics');
const TIMEOUT_MS = 8000;
const BATAS_LIRIK = 8 * 1024;
const KATA_SAMPAH = /\b(official|officiel|music|musik|video|lyrics?|lirik|audio|mv|hd|4k|8k|visuali[sz]er|full album|clip|klip|terbaru|new)\b/gi;

function berkasCache(kunci) {
    const hash = crypto.createHash('sha1').update(kunci).digest('hex');
    return join(DATA_DIR, `${hash}.json`);
}

function bacaCache(kunci) {
    try { return JSON.parse(readFileSync(berkasCache(kunci), 'utf8')); } catch { return null; }
}

function tulisCache(kunci, isi) {
    try {
        mkdirSync(DATA_DIR, { recursive: true });
        writeFileSync(berkasCache(kunci), JSON.stringify(isi));
    } catch {}
}

const normal = (t) => String(t ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

function pecahJudul(title, channel = '') {
    const bersih = String(title ?? '').replace(/[([{][^)\]}]*[)\]}]/g, ' ').replace(KATA_SAMPAH, ' ').replace(/\s{2,}/g, ' ').trim();
    const bagian = bersih.split(/\s+[-–—|]\s+|\s+[-–—|]$|^[-–—|]\s+/).map((s) => s.trim()).filter(Boolean);
    if (bagian.length < 2) return { artis: channel, judul: bersih || String(title ?? ''), tukar: true };
    const ch = normal(channel);
    const kiri = normal(bagian[0]);
    const kanan = normal(bagian[1]);
    const mirip = (a) => a && ch && (a.includes(ch) || ch.includes(a));
    if (mirip(kiri)) return { artis: bagian[0], judul: bagian[1], tukar: false };
    if (mirip(kanan)) return { artis: bagian[1], judul: bagian[0], tukar: false };
    return { artis: bagian[0], judul: bagian[1], tukar: true };
}

function parseLrc(lrc) {
    const keluar = [];
    for (const baris of String(lrc ?? '').split(/\r?\n/)) {
        const stempel = [...baris.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
        if (!stempel.length) continue;
        const teks = baris.replace(/\[[^\]]*\]/g, '').trim();
        if (!teks) continue;
        for (const [, mm, ss, pecahan] of stempel) {
            const ms = pecahan ? Number(pecahan.padEnd(3, '0').slice(0, 3)) : 0;
            keluar.push({ time: (Number(mm) * 60000 + Number(ss) * 1000 + ms) / 1000, text: teks });
        }
    }
    return keluar.sort((a, b) => a.time - b.time);
}

async function ambilJson(url) {
    try {
        const r = await axios.get(url.toString(), {
            headers: { 'User-Agent': UA },
            timeout: TIMEOUT_MS
        });
        return r.data;
    } catch { return null; }
}

async function cariDekat(judul, artis, durasi) {
    const u = new URL(`${API_LRCLIB}/search`);
    if (judul) u.searchParams.set('track_name', judul);
    if (artis) u.searchParams.set('artist_name', artis);
    const d = await ambilJson(u);
    if (!Array.isArray(d) || !d.length) return null;
    const lirikAda = d.filter((x) => x?.syncedLyrics && !x?.instrumental);
    if (!lirikAda.length) return null;
    if (!durasi) return lirikAda[0];
    let terbaik = null;
    let jarakMin = Infinity;
    for (const item of lirikAda) {
        const selisih = Math.abs((item.duration ?? 0) - durasi);
        if (selisih < jarakMin) {
            jarakMin = selisih;
            terbaik = item;
        }
    }
    return terbaik;
}

async function cariLirik(video) {
    const targetDetik = Math.max(0, Math.round(Number(video?.seconds ?? 0)));
    const judulMentah = String(video?.title ?? '');
    const channel = String(video?.author?.name ?? '');
    const kunci = `${judulMentah}|${channel}|${targetDetik}`;
    const tersimpan = bacaCache(kunci);
    if (tersimpan) return tersimpan.hasil;
    const { artis, judul, tukar } = pecahJudul(judulMentah, channel);
    let hit = null;
    let sumber = '';
    const urlGet = new URL(`${API_LRCLIB}/get`);
    urlGet.searchParams.set('artist_name', artis);
    urlGet.searchParams.set('track_name', judul);
    urlGet.searchParams.set('duration', String(targetDetik));
    const exact = await ambilJson(urlGet);
    if (exact?.syncedLyrics && !exact?.instrumental) { hit = exact; sumber = 'get'; }
    if (!hit) { const r = await cariDekat(judul, artis, targetDetik); if (r) { hit = r; sumber = 'search'; } }
    if (!hit && tukar) { const r = await cariDekat(artis, judul, targetDetik); if (r) { hit = r; sumber = 'search-balik'; } }
    if (!hit) {
        const r = await cariDekat(judul, '', targetDetik);
        const kataJudulVideo = new Set(normal(judulMentah).split(' '));
        const kataArtisHit = normal(r?.artistName).split(' ').filter(Boolean);
        const artisMasukAkal = kataArtisHit.length > 0 && (kataArtisHit.some((w) => w.length > 2 && kataJudulVideo.has(w)) || normal(channel).includes(kataArtisHit[0]));
        if (r && artisMasukAkal) { hit = r; sumber = 'search-judul'; }
    }
    if (!hit?.syncedLyrics || hit?.instrumental) { tulisCache(kunci, { hasil: null }); return null; }
    const baris = parseLrc(hit.syncedLyrics);
    if (!baris.length) { tulisCache(kunci, { hasil: null }); return null; }
    const hasil = { baris, artis: hit.artistName ?? artis, judul: hit.trackName ?? judul, durasi: hit.duration ?? 0, selisih: Math.round(Math.abs((hit.duration ?? 0) - targetDetik)), sumber };
    while (JSON.stringify(hasil.baris).length > BATAS_LIRIK) {
        hasil.baris = hasil.baris.slice(0, Math.floor(hasil.baris.length * 0.8));
        if (hasil.baris.length < 4) { tulisCache(kunci, { hasil: null }); return null; }
    }
    tulisCache(kunci, { hasil });
    return hasil;
}

async function kecilkan(masuk, keluar, codec, bitrate, maxDetik) {
    await jalankan(FFMPEG_BIN, ['-y', '-i', masuk, '-vn', '-t', String(maxDetik), ...CODEC[codec].args(bitrate), keluar]);
    return readFileSync(keluar);
}

async function audioDataUri(buffer, opsi = {}) {
    const { codec = 'opus', maxDetik = 160, batas = BATAS_BASE64 } = opsi;
    if (!Buffer.isBuffer(buffer) || !buffer.length || !CODEC[codec]) return null;
    const bitrate = opsi.bitrate ?? BITRATE_AWAL[codec];
    const minimum = BITRATE_MIN[codec];
    const dir = mkdtempSync(join(tmpdir(), 'shir-audio-'));
    const masuk = join(dir, 'masuk');
    const keluar = join(dir, `keluar.${CODEC[codec].ext}`);
    try {
        writeFileSync(masuk, buffer);
        const batasBerkas = Math.floor((batas * 3) / 4);
        let br = bitrate;
        let kecil = await kecilkan(masuk, keluar, codec, br, maxDetik);
        for (let putaran = 0; putaran < 3 && kecil.length > batasBerkas; putaran++) {
            const usul = Math.floor(((br * batasBerkas) / kecil.length) * 0.94);
            br = usul < minimum ? (br <= minimum ? minimum : minimum) : usul;
            kecil = await kecilkan(masuk, keluar, codec, br, maxDetik);
        }
        if (kecil.length > batasBerkas) return null;
        const b64 = kecil.toString('base64');
        return { dataUri: `data:${CODEC[codec].mime};base64,${b64}`, byte: b64.length, bitrate: br, codec };
    } catch (e) {
        console.error('[play2s audioDataUri error]:', e);
        return null;
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

async function coverDataUri(url, opsi = {}) {
    const { ukuran = 240, kualitas = 7, batas = 14 * 1024 } = opsi;
    if (!url || !/^https?:\/\//.test(url)) return null;
    const dir = mkdtempSync(join(tmpdir(), 'shir-cover-'));
    const masuk = join(dir, 'masuk');
    const keluar = join(dir, 'keluar.jpg');
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 12000 });
        const buf = Buffer.from(res.data);
        if (buf.length < 512) return null;
        writeFileSync(masuk, buf);
        let q = kualitas;
        let kecil = null;
        for (; q <= 10; q++) {
            await jalankan(FFMPEG_BIN, ['-y', '-i', masuk, '-vf', `crop='min(iw,ih)':'min(iw,ih)',scale=${ukuran}:${ukuran}`, '-q:v', String(q), keluar]);
            kecil = readFileSync(keluar);
            if ((kecil.length * 4) / 3 <= batas) break;
        }
        if (!kecil || (kecil.length * 4) / 3 > batas) return null;
        const b64 = kecil.toString('base64');
        return { dataUri: `data:image/jpeg;base64,${b64}`, byte: b64.length, kualitas: q };
    } catch {
        return null;
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

function lolos(t) {
    return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderSpotifyPlayer({ judul = 'Unknown', artis = 'Spotify', audioSrc = '', coverSrc = '', albumLabel = 'PLAYING FROM SPOTIFY', lirik = [] }) {
    const nama = lolos(judul);
    const sub = lolos(artis);
    const hasLyrics = lirik.length > 0 ? 1 : 0;
    const lyricsJson = JSON.stringify(lirik).replace(/<\//g, '<\\/');

    return `
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; }
body { margin: 0; background: #121212; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF; }
.sp-wrap { width: 100%; max-width: 380px; margin: auto; padding: 8px; }
.sp-card {
  background: linear-gradient(180deg, #302620 0%, #121212 50%, #121212 100%);
  border-radius: 16px; overflow: hidden;
  padding: 16px 16px 20px; transition: background 0.5s ease;
  box-shadow: 0 12px 36px rgba(0,0,0,0.7);
}

/* Spotify Header */
.sp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.sp-header-btn { color: #b3b3b3; font-size: 18px; cursor: pointer; display: flex; align-items: center; }
.sp-header-info { text-align: center; flex: 1; padding: 0 10px; }
.sp-header-label { font-size: 9px; letter-spacing: 1.5px; color: #b3b3b3; font-weight: 700; text-transform: uppercase; }
.sp-header-sub { font-size: 11px; color: #ffffff; font-weight: 700; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Spotify Album Cover */
.sp-cover-box {
  width: 100%; aspect-ratio: 1; border-radius: 8px; overflow: hidden;
  margin: 8px 0 18px; background: #282828;
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
}
.sp-cover-box img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Track Info Row */
.sp-track-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.sp-meta { overflow: hidden; padding-right: 12px; }
.sp-title { font-size: 18px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.3px; }
.sp-artist { font-size: 13px; color: #b3b3b3; margin-top: 3px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sp-heart-btn { background: none; border: none; color: #b3b3b3; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
.sp-heart-btn.active { color: #1ed760; transform: scale(1.15); }

/* Progress Bar */
.sp-progress-area { margin: 10px 0 6px; }
.sp-progress-track { background: rgba(255,255,255,0.25); height: 4px; border-radius: 2px; cursor: pointer; position: relative; }
.sp-progress-bar { background: #ffffff; height: 100%; border-radius: 2px; width: 0%; position: relative; pointer-events: none; }
.sp-progress-bar::after {
  content: ''; position: absolute; right: -5px; top: 50%; transform: translateY(-50%);
  width: 11px; height: 11px; border-radius: 50%; background: #ffffff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
}
.sp-time-row { display: flex; justify-content: space-between; font-size: 10.5px; color: #b3b3b3; margin-top: 6px; font-weight: 500; font-variant-numeric: tabular-nums; }

/* Control Buttons */
.sp-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; margin-bottom: 16px; padding: 0 4px; }
.sp-icon-btn { background: none; border: none; color: #b3b3b3; cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; transition: color 0.2s, transform 0.15s; }
.sp-icon-btn.active { color: #1ed760; }
.sp-play-btn {
  background: #ffffff; color: #000000; border: none; border-radius: 50%;
  width: 54px; height: 54px; display: flex; justify-content: center; align-items: center;
  cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: transform 0.15s;
}
.sp-play-btn:active { transform: scale(0.92); }

/* Spotify Realtime Lyrics Card */
.sp-lyrics-card {
  background: rgba(30, 30, 30, 0.85);
  border-radius: 12px;
  overflow: hidden;
  margin-top: 12px;
  padding: 14px 14px 16px;
  box-sizing: border-box;
  border: 1px solid rgba(255,255,255,0.08);
}
.sp-lyrics-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.sp-lyrics-tag { font-size: 10.5px; font-weight: 800; letter-spacing: 1px; color: #1ed760; text-transform: uppercase; }
.sp-sync-controls { display: flex; gap: 4px; align-items: center; }
.sp-sync-btn { background: rgba(255,255,255,0.1); border: none; color: #b3b3b3; padding: 2px 7px; border-radius: 4px; font-size: 9.5px; cursor: pointer; font-weight: 600; }
.sp-sync-btn:active { background: rgba(255,255,255,0.3); color: #fff; }
.sp-lyrics-scroll {
  height: 140px;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 10px 4px;
}
.sp-lyrics-scroll::-webkit-scrollbar { display: none; }
.sp-lyric-line {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  padding: 6px 0;
  cursor: pointer;
  transition: color 0.2s ease, transform 0.2s ease, font-size 0.2s ease;
  line-height: 1.35;
}
.sp-lyric-line.active {
  color: #1ed760;
  font-size: 16.5px;
  font-weight: 800;
  transform: scale(1.02);
  text-shadow: 0 0 16px rgba(30, 215, 96, 0.35);
}
.sp-lyrics-empty { font-size: 12px; color: #777777; font-style: italic; text-align: center; padding: 35px 0; }

/* Spotify Footer Info */
.sp-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding: 0 2px; font-size: 10px; color: #b3b3b3; }
.sp-connect { display: flex; align-items: center; gap: 6px; color: #1ed760; font-weight: 600; }
.sp-brand { font-size: 9.5px; opacity: 0.6; }
</style>

<div class="sp-wrap">
  <div class="sp-card" id="spCard">
    <!-- Header -->
    <div class="sp-header">
      <div class="sp-header-btn">⌄</div>
      <div class="sp-header-info">
        <div class="sp-header-label">${albumLabel}</div>
        <div class="sp-header-sub">${nama}</div>
      </div>
      <div class="sp-header-btn">⋯</div>
    </div>

    <!-- Album Art -->
    <div class="sp-cover-box" id="spCoverBox">
      <img id="spCoverImg" src="${coverSrc}" alt="Album Art">
    </div>

    <!-- Track Info -->
    <div class="sp-track-row">
      <div class="sp-meta">
        <div class="sp-title">${nama}</div>
        <div class="sp-artist">${sub}</div>
      </div>
      <button class="sp-heart-btn" id="spHeartBtn" title="Save to Your Library">
        <svg id="spHeartIcon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
      </button>
    </div>

    <!-- Progress Bar -->
    <div class="sp-progress-area">
      <div class="sp-progress-track" id="spProgressTrack">
        <div class="sp-progress-bar" id="spProgressBar"></div>
      </div>
      <div class="sp-time-row">
        <span id="spCurTime">0:00</span>
        <span id="spDurTime">0:00</span>
      </div>
    </div>

    <!-- Spotify Controls -->
    <div class="sp-controls">
      <!-- Shuffle -->
      <button class="sp-icon-btn" id="spShuffleBtn" title="Shuffle">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
      </button>
      <!-- Rewind 10s -->
      <button class="sp-icon-btn" id="spRewindBtn" title="Rewind 10s">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      </button>
      <!-- Big Play/Pause -->
      <button class="sp-play-btn" id="spPlayBtn" title="Play">
        <svg id="spPlayIcon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="6 3 21 12 6 21 6 3"/></svg>
      </button>
      <!-- Forward 10s -->
      <button class="sp-icon-btn" id="spForwardBtn" title="Forward 10s">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
      </button>
      <!-- Repeat -->
      <button class="sp-icon-btn" id="spRepeatBtn" title="Repeat">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
      </button>
    </div>

    <!-- Spotify Realtime Lyrics Card -->
    <div class="sp-lyrics-card" id="spLyricsCard">
      <div class="sp-lyrics-header">
        <span class="sp-lyrics-tag">LYRICS</span>
        <div class="sp-sync-controls">
          <button class="sp-sync-btn" id="spSyncMinus">-0.5s</button>
          <button class="sp-sync-btn" id="spSyncPlus">+0.5s</button>
        </div>
      </div>
      <div class="sp-lyrics-scroll" id="spLyricsScroll">
        <div class="sp-lyrics-empty">Memuat lirik...</div>
      </div>
    </div>

    <!-- Footer Spotify Connect -->
    <div class="sp-footer">
      <div class="sp-connect">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z"/></svg>
        <span>Spotify Connect</span>
      </div>
      <div class="sp-brand">${config.bot?.name || 'SHIROWAHD'}</div>
    </div>
  </div>
</div>

<audio id="audioEl" preload="auto" src="${audioSrc}"></audio>

<script>
(function(){
    const audio = document.getElementById('audioEl');
    const playBtn = document.getElementById('spPlayBtn');
    const progressBar = document.getElementById('spProgressBar');
    const progressTrack = document.getElementById('spProgressTrack');
    const curTime = document.getElementById('spCurTime');
    const durTime = document.getElementById('spDurTime');
    const heartBtn = document.getElementById('spHeartBtn');
    const repeatBtn = document.getElementById('spRepeatBtn');
    const shuffleBtn = document.getElementById('spShuffleBtn');
    const rewindBtn = document.getElementById('spRewindBtn');
    const forwardBtn = document.getElementById('spForwardBtn');
    const lyricsScroll = document.getElementById('spLyricsScroll');
    const coverImg = document.getElementById('spCoverImg');
    const card = document.getElementById('spCard');
    const syncMinus = document.getElementById('spSyncMinus');
    const syncPlus = document.getElementById('spSyncPlus');

    const hasLyrics = ${hasLyrics} === 1;
    const lyrics = ${lyricsJson};

    let lyricOffset = 0.0;

    function fmt(s){
        if(!Number.isFinite(s)) return '0:00';
        return Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0');
    }

    function buildLyricsDOM() {
        lyricsScroll.innerHTML = '';
        if (!hasLyrics || !lyrics.length) {
            lyricsScroll.innerHTML = '<div class="sp-lyrics-empty">Lirik tidak tersedia</div>';
            return;
        }
        lyrics.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'sp-lyric-line';
            div.dataset.index = index;
            div.textContent = item.text || '...';
            div.addEventListener('click', () => {
                if (audio.duration && Number.isFinite(audio.duration)) {
                    audio.currentTime = Math.max(0, item.time - lyricOffset);
                    updateLyrics(audio.currentTime);
                }
            });
            lyricsScroll.appendChild(div);
        });
    }
    buildLyricsDOM();

    let activeLyricIndex = -1;
    function updateLyrics(t) {
        if (!hasLyrics || !lyrics.length) return;
        const current = t + lyricOffset;

        // Cari baris yang sedang aktif sesuai rentang waktu presisi
        let targetIdx = -1;
        for (let i = 0; i < lyrics.length; i++) {
            if (current >= lyrics[i].time) {
                targetIdx = i;
            } else {
                break;
            }
        }

        if (targetIdx !== activeLyricIndex) {
            const lines = lyricsScroll.querySelectorAll('.sp-lyric-line');
            lines.forEach((el, i) => {
                if (i === targetIdx) {
                    el.classList.add('active');
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    el.classList.remove('active');
                }
            });
            activeLyricIndex = targetIdx;
        }
    }

    syncMinus.addEventListener('click', () => {
        lyricOffset = Math.round((lyricOffset - 0.5) * 10) / 10;
        updateLyrics(audio.currentTime);
    });

    syncPlus.addEventListener('click', () => {
        lyricOffset = Math.round((lyricOffset + 0.5) * 10) / 10;
        updateLyrics(audio.currentTime);
    });

    coverImg.addEventListener('load', () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 10; canvas.height = 10;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(coverImg, 0, 0, 10, 10);
            const data = ctx.getImageData(0, 0, 10, 10).data;
            let r=0,g=0,b=0,count=0;
            for(let i=0; i<data.length; i+=4){
                r+=data[i]; g+=data[i+1]; b+=data[i+2]; count++;
            }
            r=Math.min(100, Math.floor(r/count));
            g=Math.min(100, Math.floor(g/count));
            b=Math.min(100, Math.floor(b/count));
            card.style.background = 'linear-gradient(180deg, rgb('+r+','+g+','+b+') 0%, #121212 50%, #121212 100%)';
        } catch(e){}
    });

    let isPlaying = false;
    let isRepeat = false;

    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(e => console.error('Play err:', e));
        }
    });

    audio.addEventListener('play', () => {
        isPlaying = true;
        playBtn.innerHTML = '<svg id="spPauseIcon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    });

    audio.addEventListener('pause', () => {
        isPlaying = false;
        playBtn.innerHTML = '<svg id="spPlayIcon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="6 3 21 12 6 21 6 3"/></svg>';
    });

    audio.addEventListener('timeupdate', () => {
        if (!audio.duration || !Number.isFinite(audio.duration)) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = pct + '%';
        curTime.textContent = fmt(audio.currentTime);
        updateLyrics(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
        durTime.textContent = fmt(audio.duration);
    });

    audio.addEventListener('ended', () => {
        if (isRepeat) {
            audio.currentTime = 0;
            audio.play();
        } else {
            isPlaying = false;
            playBtn.innerHTML = '<svg id="spPlayIcon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><polygon points="6 3 21 12 6 21 6 3"/></svg>';
        }
    });

    progressTrack.addEventListener('click', (e) => {
        const rect = progressTrack.getBoundingClientRect();
        const clickPos = (e.clientX - rect.left) / rect.width;
        if (audio.duration && Number.isFinite(audio.duration)) {
            audio.currentTime = clickPos * audio.duration;
            updateLyrics(audio.currentTime);
        }
    });

    rewindBtn.addEventListener('click', () => {
        audio.currentTime = Math.max(0, audio.currentTime - 10);
        updateLyrics(audio.currentTime);
    });

    forwardBtn.addEventListener('click', () => {
        if (audio.duration) {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
            updateLyrics(audio.currentTime);
        }
    });

    repeatBtn.addEventListener('click', () => {
        isRepeat = !isRepeat;
        repeatBtn.classList.toggle('active', isRepeat);
    });

    shuffleBtn.addEventListener('click', () => {
        shuffleBtn.classList.toggle('active');
    });

    heartBtn.addEventListener('click', () => {
        heartBtn.classList.toggle('active');
        const icon = document.getElementById('spHeartIcon');
        if (heartBtn.classList.contains('active')) {
            icon.setAttribute('fill', '#1ed760');
            icon.setAttribute('stroke', '#1ed760');
        } else {
            icon.setAttribute('fill', 'none');
            icon.setAttribute('stroke', 'currentColor');
        }
    });
})();
<\/script>
    `;
}

const pluginConfig = {
    name: 'play2s',
    alias: ['spotplay', 'playlirik', 'musik', 'musicplayer', 'spotify'],
    category: 'music',
    description: 'Putar lagu Spotify Now Playing di dalam bubble WhatsApp dengan lirik realtime',
    usage: '.play2s <judul lagu>',
    example: '.play2s multo cup of joe',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 2,
    isEnabled: true
};

async function handler(m, { sock, conn, args }) {
    const client = sock || conn;
    const query = args.join(' ').trim();
    if (!query) {
        return m.reply(`🟢 *SPOTIFY MUSIC PLAYER*\n\n> Masukkan judul lagu yang ingin diputar!\n\n*Contoh:* \`${m.prefix}play2s multo\``);
    }

    if (typeof m.react === 'function') {
        try { await m.react('⏳'); } catch {}
    }

    try {
        const cari = await yts(query);
        const video = cari?.videos?.[0];

        if (!video || !video.url) {
            if (typeof m.react === 'function') try { await m.react('❌'); } catch {}
            return m.reply('🥀 _Lagu tidak ditemukan di YouTube._');
        }

        let rawAudioUrl = null;
        let audioBuffer = null;

        try {
            const dl = await ytdl(video.url, 'mp3');
            if (dl?.dl) rawAudioUrl = dl.dl;
        } catch (e) {
            console.error('[play2s] Ytdl error:', e);
        }

        if (!rawAudioUrl) {
            if (typeof m.react === 'function') try { await m.react('❌'); } catch {}
            return m.reply('🥀 _Gagal mendapatkan link audio dari server._');
        }

        let lirikHasil = null;
        try {
            lirikHasil = await cariLirik(video);
        } catch (e) {
            console.error('[play2s] Lirik error:', e);
        }

        const formatLirik = lirikHasil?.baris ? lirikHasil.baris.map(b => ({ time: b.time, text: b.text })) : [];

        let audioSrc = '';
        try {
            const audioRes = await axios.get(rawAudioUrl, { responseType: 'arraybuffer', timeout: 30000 });
            audioBuffer = Buffer.from(audioRes.data);
            const encodedAudio = await audioDataUri(audioBuffer, { codec: 'opus', maxDetik: 160, batas: BATAS_BASE64 });
            if (encodedAudio?.dataUri) {
                audioSrc = encodedAudio.dataUri;
            }
        } catch (e) {
            console.error('[play2s] Audio encode error:', e);
        }

        if (!audioSrc) {
            if (typeof m.react === 'function') try { await m.react('❌'); } catch {}
            return m.reply('🥀 _Gagal memproses audio untuk player in-bubble._');
        }

        // Cover thumbnail
        let coverSrc = video.thumbnail || '';
        if (video.thumbnail) {
            try {
                const coverRes = await coverDataUri(video.thumbnail, { ukuran: 240, kualitas: 7 });
                if (coverRes?.dataUri) {
                    coverSrc = coverRes.dataUri;
                }
            } catch (e) {
                console.error('[play2s] Cover encode error:', e);
            }
        }

        const judulLagu = lirikHasil?.judul || video.title || query;
        const artisLagu = lirikHasil?.artis || video.author?.name || 'Spotify Music';

        const htmlPayload = renderSpotifyPlayer({
            judul: judulLagu,
            artis: artisLagu,
            audioSrc: audioSrc,
            coverSrc: coverSrc,
            albumLabel: 'PLAYING FROM SPOTIFY',
            lirik: formatLirik
        });

        await client.relayMessage(
            m.chat,
            {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                    botMetadata: {
                        messageDisclaimerText: "",
                        botResponseId: "kurumi-music-player",
                        verificationMetadata: {
                            proofs: [
                                {
                                    version: 1,
                                    useCase: 1,
                                    signature: "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==",
                                    certificateChain: [
                                        "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg",
                                        "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=="
                                    ]
                                }
                            ]
                        }
                    }
                },
                botForwardedMessage: {
                    message: {
                        richResponseMessage: {
                            messageType: 1,
                            submessages: [{ messageType: 2, messageText: `${judulLagu} - ${artisLagu}` }],
                            unifiedResponse: {
                                data: Buffer.from(JSON.stringify({
                                    "response_id": "kurumi-music-player",
                                    "sections": [{ "view_model": { "primitive": { "__typename": "GenAIaeacdsnwHtmlPrimitive", "payload": htmlPayload, "trusted_sources": ["*", "swhdhlz.my.id", "hirara.dev", "i.ytimg.com"] }, "__typename": "GenAISingleLayoutViewModel" } }]
                                })).toString('base64'),
                            },
                            contextInfo: {
                                forwardingScore: 1,
                                isForwarded: true,
                                forwardedAiBotMessageInfo: {
                                    botJid: "867051314767696@bot"
                                },
                                forwardOrigin: 4
                            }
                        }
                    }
                }
            },
            {}
        );

        if (typeof m.react === 'function') {
            try { await m.react('🟢'); } catch {}
        }
    } catch (err) {
        console.error('[play2s Error]:', err);
        if (typeof m.react === 'function') try { await m.react('❌'); } catch {}
        m.reply(te(m.prefix, m.command, m.pushName));
    }
}

export { pluginConfig as config, handler };
