import axios from 'axios';
import yts from 'yt-search';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';
import config from '../../config.js';
import { ytdl } from '../../src/scraper/ytdl.js';

const jalankan = promisify(execFile);
const BATAS_BASE64 = 850 * 1024;
const BITRATE_MIN = { mp3: 16, opus: 12 };
const BITRATE_AWAL = { mp3: 24, opus: 16 };
const CODEC = {
    mp3: { args: (br) => [ '-c:a', 'libmp3lame', '-b:a', `${br}k`, '-ac', '1', '-ar', '22050' ], ext: 'mp3', mime: 'audio/mpeg' },
    opus: { args: (br) => ['-c:a', 'libopus', '-b:a', `${br}k`, '-ac', '1', '-ar', '16000'], ext: 'ogg', mime: 'audio/ogg' }
};

const FFMPEG_BIN = existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : 'ffmpeg';
const API_LRCLIB = 'https://lrclib.net/api';
const UA = 'ackles-bot/1.0 (+play lyrics)';
const DATA_DIR = join(process.cwd(), 'src', 'data', 'lyrics');
const TIMEOUT_MS = 8000;
const TOLERANSI_DETIK = 4;
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
        for (const [, mm, ss, pecahan] of stempel) {
            const ms = pecahan ? Number(pecahan.padEnd(3, '0')) : 0;
            keluar.push({ time: (Number(mm) * 60000 + Number(ss) * 1000 + ms) / 1000, text: teks });
        }
    }
    return keluar.sort((a, b) => a.time - b.time);
}

async function ambilJson(url) {
    const ac = new AbortController();
    const jam = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ac.signal });
        if (res.status === 404 || !res.ok) return null;
        return await res.json();
    } catch { return null; } finally { clearTimeout(jam); }
}

async function cariDekat(judul, artis, targetDetik) {
    const url = new URL(`${API_LRCLIB}/search`);
    url.searchParams.set('track_name', judul);
    if (artis) url.searchParams.set('artist_name', artis);
    const hasil = await ambilJson(url);
    if (!Array.isArray(hasil)) return null;
    const bersinkron = hasil.filter((r) => r?.syncedLyrics);
    if (!bersinkron.length) return null;
    bersinkron.sort((a, b) => Math.abs((a.duration ?? 0) - targetDetik) - Math.abs((b.duration ?? 0) - targetDetik));
    const terbaik = bersinkron[0];
    if (Math.abs((terbaik.duration ?? 0) - targetDetik) > TOLERANSI_DETIK) return null;
    return terbaik;
}

async function cariLirik(video) {
    const targetDetik = Number(video?.duration?.seconds) || 0;
    if (!targetDetik) return null;
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
    // Gunakan MP3 (audio/mpeg) agar universal di Android & iOS Safari WebKit
    const { codec = 'mp3', maxDetik = 180, batas = BATAS_BASE64 } = opsi;
    if (!Buffer.isBuffer(buffer) || !buffer.length || !CODEC[codec]) return null;
    const bitrate = opsi.bitrate ?? BITRATE_AWAL[codec];
    const minimum = BITRATE_MIN[codec];
    const dir = mkdtempSync(join(tmpdir(), 'shz-audio-'));
    const masuk = join(dir, 'masuk');
    const keluar = join(dir, `keluar.${CODEC[codec].ext}`);
    try {
        writeFileSync(masuk, buffer);
        const batasBerkas = Math.floor((batas * 3) / 4);
        let br = bitrate;
        let kecil = await kecilkan(masuk, keluar, codec, br, maxDetik);
        for (let putaran = 0; putaran < 3 && kecil.length > batasBerkas; putaran++) {
            const usul = Math.floor(((br * batasBerkas) / kecil.length) * 0.90);
            br = usul < minimum ? minimum : usul;
            kecil = await kecilkan(masuk, keluar, codec, br, maxDetik);
        }
        if (kecil.length > batasBerkas) return null;
        const b64 = kecil.toString('base64');
        return { dataUri: `data:${CODEC[codec].mime};base64,${b64}`, byte: b64.length, bitrate: br, codec };
    } catch { return null; } finally { rmSync(dir, { recursive: true, force: true }); }
}

async function coverDataUri(url, opsi = {}) {
    const { ukuran = 200, kualitas = 7, batas = 12 * 1024 } = opsi;
    if (!url || !/^https?:\/\//.test(url)) return null;
    const dir = mkdtempSync(join(tmpdir(), 'shz-cover-'));
    const masuk = join(dir, 'masuk');
    const keluar = join(dir, 'keluar.jpg');
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
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
    } catch { return null; } finally { rmSync(dir, { recursive: true, force: true }); }
}

function lolos(t) {
    return String(t ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderHtmlPlayer({ judul, artis, audioSrc, coverSrc, sourceLabel, caption, lirik }) {
    const nama = lolos(judul || 'Musik');
    const sub = lolos(artis || 'Kurumi Arcade');
    const hasLyrics = Array.isArray(lirik) && lirik.length > 0 ? 1 : 0;
    const lyricsJson = JSON.stringify(Array.isArray(lirik) ? lirik : []);

    return `
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; }
body { margin: 0; background: transparent; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f2e9e4; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 6px; }
.player-wrap { width: 100%; max-width: 340px; margin: auto; }
.player-card { background: linear-gradient(180deg, #1c1512 0%, #120e0c 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; box-shadow: 0 16px 40px rgba(0,0,0,0.65); overflow: hidden; padding: 16px; position: relative; transition: background 0.6s ease; }
.player-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.chevron { font-size: 16px; color: #cdbdb3; font-weight: 300; cursor: pointer; }
.source-info { text-align: center; line-height: 1.15; }
.source-label { font-size: 8.5px; font-weight: 700; color: #a89a90; text-transform: uppercase; letter-spacing: 1.2px; }
.source-channel { font-size: 10.5px; color: #e6d7cd; font-weight: 600; margin-top: 1px; }
.kebab { font-size: 15px; color: #cdbdb3; cursor: pointer; }
.cover-box { width: 100%; aspect-ratio: 1/1; border-radius: 16px; overflow: hidden; margin-bottom: 14px; background: #000; box-shadow: 0 12px 28px rgba(0,0,0,0.5); }
.cover-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
.track-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.track-title { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 1px; line-height: 1.2; word-break: break-word; }
.track-artist { font-size: 12px; color: #b8a99f; line-height: 1.2; }
.heartBtn { background: none; border: none; color: #e6d7cd; cursor: pointer; padding: 2px 0 0 6px; }
.heartBtn.active { color: #ff5252; }

.lyricsPreview {
  font-size: 13.5px;
  line-height: 1.45;
  color: rgba(230,215,205,0.7);
  background: rgba(0,0,0,0.22);
  border-radius: 10px;
  padding: 8px 10px;
  margin: 4px 0 8px;
  height: 62px;
  overflow-y: hidden;
  position: relative;
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
}
.lyricLine {
  text-align: center;
  transition: all 0.25s ease;
  opacity: 0.35;
  transform: scale(0.95);
  padding: 3px 0;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lyricLine.active {
  opacity: 1;
  color: #fff;
  font-weight: 700;
  transform: scale(1.05);
  text-shadow: 0 0 12px rgba(255,255,255,0.35);
}
.lyricsEmpty { font-size: 12px; color: rgba(230,215,205,0.4); font-style: italic; text-align: center; padding: 35px 0; }

.lyricSyncBar { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #cdbdb3; margin-bottom: 4px; padding: 0 2px; }
.syncGroup { display: flex; gap: 6px; align-items: center; }
.syncBtn { background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 10px; }
.syncBtn:active { background: rgba(255,255,255,0.3); }

.audioError { font-size: 11.5px; color: #ff8a80; text-align: center; margin: 8px 0 0; display: none; }
.progressArea { margin: 4px 0 4px; }
.progressTrack { background: rgba(255,255,255,0.2); height: 3px; border-radius: 2px; cursor: pointer; position: relative; }
.progressBar { background: #f2e9e4; height: 100%; border-radius: 2px; width: 0%; position: relative; pointer-events: none; }
.progressBar::after { content: ''; position: absolute; right: -5px; top: 50%; transform: translateY(-50%); width: 10px; height: 10px; border-radius: 50%; background: #fff; }
.timeRow { display: flex; justify-content: space-between; font-size: 10.5px; color: #cdbdb3; margin-top: 4px; }
.controls { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding: 0 2px; }
.ctrlBtn { background: none; border: none; color: #f2e9e4; cursor: pointer; font-size: 15px; padding: 6px; display: flex; align-items: center; justify-content: center; position: relative; transition: color 0.2s; }
.ctrlBtn.active { color: #ff9e6b; }
.playBtn { background: #fff; color: #1a1310; border: none; border-radius: 50%; width: 50px; height: 50px; display: flex; justify-content: center; align-items: center; cursor: pointer; font-size: 17px; }
.seekLabel { position: absolute; bottom: -2px; font-size: 7px; font-weight: 700; }
.captionText { text-align: center; font-size: 11px; color: rgba(230,215,205,0.55); margin-top: 10px; font-style: italic; }
</style>
<div class="player-wrap">
  <div class="player-card" id="playerCard">
    <div class="player-header">
      <span class="chevron">⌄</span>
      <div class="source-info">
        <div class="source-label">${sourceLabel}</div>
        <div class="source-channel">${sub}</div>
      </div>
      <span class="kebab">⋮</span>
    </div>
    <div class="cover-box"><img id="coverImg" src="${coverSrc}" alt="Cover"></div>
    <div class="track-row">
      <div>
        <div class="track-title">${nama}</div>
        <div class="track-artist">${sub}</div>
      </div>
      <button class="heartBtn" id="heartBtn"><svg id="heartIcon" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></button>
    </div>
    <div class="lyricsPreview" id="lyricsPreview">
      <div class="lyricsEmpty">Lirik tidak tersedia</div>
    </div>
    <div class="lyricSyncBar">
      <span id="syncLabel">Offset Lirik: 0.0s</span>
      <div class="syncGroup">
        <button class="syncBtn" id="syncMinus">-0.5s</button>
        <button class="syncBtn" id="syncPlus">+0.5s</button>
      </div>
    </div>
    <div class="progressArea">
      <div class="progressTrack" id="progressTrack"><div class="progressBar" id="progressBar"></div></div>
      <div class="timeRow"><span id="curTime">0:00</span><span id="durTime">0:00</span></div>
    </div>
    <div class="controls">
      <button class="ctrlBtn" id="noteBtn"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></button>
      <button class="ctrlBtn" id="rewindBtn"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg><span class="seekLabel">10</span></button>
      <button class="playBtn" id="playBtn"><svg id="playIcon" viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><polygon points="6 3 21 12 6 21 6 3"/></svg></button>
      <button class="ctrlBtn" id="forwardBtn"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg><span class="seekLabel">10</span></button>
      <button class="ctrlBtn" id="repeatBtn"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></button>
    </div>
    <div class="captionText">${caption}</div>
    <div class="audioError" id="audioError">⚠ Audio gagal dimuat</div>
  </div>
</div>
<audio id="audioEl" preload="auto" src="${audioSrc}"></audio>
<script>
(function(){
    const audio = document.getElementById('audioEl');
    const playBtn = document.getElementById('playBtn');
    const progressBar = document.getElementById('progressBar');
    const progressTrack = document.getElementById('progressTrack');
    const curTime = document.getElementById('curTime');
    const durTime = document.getElementById('durTime');
    const heartBtn = document.getElementById('heartBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const noteBtn = document.getElementById('noteBtn');
    const rewindBtn = document.getElementById('rewindBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const lyricsPreview = document.getElementById('lyricsPreview');
    const coverImg = document.getElementById('coverImg');
    const playerCard = document.getElementById('playerCard');
    const syncLabel = document.getElementById('syncLabel');
    const syncMinus = document.getElementById('syncMinus');
    const syncPlus = document.getElementById('syncPlus');

    const hasLyrics = ${hasLyrics} === 1;
    const lyrics = ${lyricsJson};

    let lyricOffset = 0.0;

    function fmt(s){
        if(!Number.isFinite(s)) return '0:00';
        return Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0');
    }

    function buildLyricsDOM() {
        lyricsPreview.innerHTML = '';
        if (!hasLyrics || !lyrics.length) {
            lyricsPreview.innerHTML = '<div class="lyricsEmpty">Lirik tidak tersedia</div>';
            return;
        }
        lyrics.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'lyricLine';
            div.dataset.index = index;
            div.textContent = item.text || '...';
            div.addEventListener('click', () => {
                if (audio.duration && Number.isFinite(audio.duration)) {
                    audio.currentTime = item.time;
                }
            });
            lyricsPreview.appendChild(div);
        });
    }
    buildLyricsDOM();

    let activeLyricIndex = -1;
    function updateLyrics(t) {
        if (!hasLyrics || !lyrics.length) return;
        const adjustedTime = Math.max(0, t + lyricOffset);
        let idx = 0;
        for (let i = 0; i < lyrics.length; i++) {
            if (adjustedTime >= lyrics[i].time) idx = i; else break;
        }

        if (idx !== activeLyricIndex) {
            const lines = lyricsPreview.querySelectorAll('.lyricLine');
            lines.forEach((el, i) => {
                if (i === idx) {
                    el.classList.add('active');
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    el.classList.remove('active');
                }
            });
            activeLyricIndex = idx;
        }
    }

    syncMinus.addEventListener('click', () => {
        lyricOffset = Math.round((lyricOffset - 0.5) * 10) / 10;
        syncLabel.textContent = 'Offset: ' + (lyricOffset > 0 ? '+' : '') + lyricOffset.toFixed(1) + 's';
        updateLyrics(audio.currentTime);
    });

    syncPlus.addEventListener('click', () => {
        lyricOffset = Math.round((lyricOffset + 0.5) * 10) / 10;
        syncLabel.textContent = 'Offset: ' + (lyricOffset > 0 ? '+' : '') + lyricOffset.toFixed(1) + 's';
        updateLyrics(audio.currentTime);
    });

    audio.addEventListener('timeupdate', () => {
        if(audio.duration){
            progressBar.style.width = (audio.currentTime / audio.duration) * 100 + '%';
            curTime.textContent = fmt(audio.currentTime);
        }
        updateLyrics(audio.currentTime);
    });
    audio.addEventListener('loadedmetadata', () => { durTime.textContent = fmt(audio.duration); });
    audio.addEventListener('error', () => {
        const box = document.getElementById('audioError');
        if (box) box.style.display = 'block';
    });

    function safe(fn) {
        return function(e) {
            try { fn(e); } catch (err) {}
        };
    }

    playBtn.addEventListener('click', safe(() => {
        const icon = document.getElementById('playIcon');
        if(audio.paused){
            const p = audio.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
            icon.innerHTML = '<rect x="5" y="4" width="5" height="16"/><rect x="14" y="4" width="5" height="16"/>';
        } else {
            audio.pause();
            icon.innerHTML = '<polygon points="6 3 21 12 6 21 6 3"/>';
        }
    }));

    progressTrack.addEventListener('click', safe((e) => {
        if (!audio.duration || !Number.isFinite(audio.duration)) return;
        const rect = progressTrack.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audio.currentTime = ratio * audio.duration;
    }));

    rewindBtn.addEventListener('click', safe(() => { audio.currentTime = Math.max(0, (audio.currentTime || 0) - 10); }));
    forwardBtn.addEventListener('click', safe(() => { if(audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); }));

    heartBtn.addEventListener('click', safe(() => {
        heartBtn.classList.toggle('active');
        const filled = heartBtn.classList.contains('active');
        document.getElementById('heartIcon').setAttribute('fill', filled ? 'currentColor' : 'none');
    }));

    repeatBtn.addEventListener('click', safe(() => {
        audio.loop = !audio.loop;
        repeatBtn.classList.toggle('active', audio.loop);
    }));

    noteBtn.addEventListener('click', safe(() => {
        lyricsPreview.style.display = lyricsPreview.style.display === 'none' ? 'block' : 'none';
        noteBtn.classList.toggle('active');
    }));

    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 8; canvas.height = 8;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(probe, 0, 0, 8, 8);
            const data = ctx.getImageData(0, 0, 8, 8).data;
            let r = 0, g = 0, b = 0, n = 0;
            for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2]; n++; }
            r = Math.round(r/n); g = Math.round(g/n); b = Math.round(b/n);
            playerCard.style.background = \`linear-gradient(180deg, rgba(\${r},\${g},\${b},0.55) 0%, rgba(18,14,12,0.97) 55%)\`;
        } catch (e) {}
    };
    probe.src = coverImg.src;
})();
</script>
`;
}

const pluginConfig = {
    name: 'play2s',
    alias: ['spotplay', 'playlirik', 'musik'],
    category: 'music',
    description: 'Putar lagu dengan kartu musik interaktif tema baru + lirik',
    usage: '.spotplay <judul lagu>',
    example: '.spotplay mangu',
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
    const query = (args && args.length) ? args.join(' ') : (m.text || '').trim();
    if (!query) {
        return m.reply(`🎧 _"Lagu apa yang ingin Master dengarkan?"_\n\n> ⟡ *Contoh:* \`.spotplay mangu\``);
    }

    if (typeof m.react === 'function') await m.react('🔍');

    try {
        const search = await yts(query);
        const video = search?.videos?.[0];
        if (!video || !video.url) {
            if (typeof m.react === 'function') await m.react('❌');
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
            if (typeof m.react === 'function') await m.react('❌');
            return m.reply('🥀 _Gagal mendapatkan link audio dari server._');
        }

        if (typeof m.react === 'function') await m.react('⏳');

        let lirikHasil = null;
        try {
            lirikHasil = await cariLirik(video);
        } catch (e) {
            console.error('[play2s] Lirik error:', e);
        }

        const formatLirik = lirikHasil?.baris ? lirikHasil.baris.map(b => ({ time: b.time, text: b.text })) : [];

        let audioSrc = rawAudioUrl;
        try {
            const audioRes = await axios.get(rawAudioUrl, { responseType: 'arraybuffer', timeout: 30000 });
            audioBuffer = Buffer.from(audioRes.data);
            // Kompresi ke MP3 24k agar universal di semua perangkat & ukuran <800KB
            const encodedAudio = await audioDataUri(audioBuffer, { codec: 'mp3', maxDetik: 180 });
            if (encodedAudio?.dataUri) {
                audioSrc = encodedAudio.dataUri;
            }
        } catch (e) {
            console.error('[play2s] Audio encode error:', e);
        }

        let coverSrc = '';
        if (video.thumbnail) {
            try {
                const coverRes = await coverDataUri(video.thumbnail, { ukuran: 200, kualitas: 7 });
                if (coverRes?.dataUri) {
                    coverSrc = coverRes.dataUri;
                }
            } catch (e) {
                console.error('[play2s] Cover encode error:', e);
            }
        }

        const judulLagu = lirikHasil?.judul || video.title || query;
        const artisLagu = lirikHasil?.artis || video.author?.name || 'Kurumi Arcade';

        const htmlPayload = renderHtmlPlayer({
            judul: judulLagu,
            artis: artisLagu,
            audioSrc: audioSrc,
            coverSrc: coverSrc,
            sourceLabel: 'YOUTUBE MUSIC',
            caption: `${judulLagu} - ${artisLagu}`,
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
                                    "sections": [{ "view_model": { "primitive": { "__typename": "GenAIaeacdsnwHtmlPrimitive", "payload": htmlPayload, "trusted_sources": ["hirara.dev"] }, "__typename": "GenAISingleLayoutViewModel" } }]
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

        if (typeof m.react === 'function') await m.react('🎵');

    } catch (error) {
        console.error('Play2s Plugin Error:', error);
        if (typeof m.react === 'function') await m.react('❌');
        await m.reply('❌ *GAGAL*\n\n> ' + error.message);
    }
}

export { pluginConfig as config, handler };
