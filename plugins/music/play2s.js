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
const BATAS_BASE64 = 550 * 1024; // 550KB aman dari drop WhatsApp
const BITRATE_MIN = { mp3: 18, opus: 16 };
const BITRATE_AWAL = { mp3: 32, opus: 20 };
const CODEC = {
    mp3: { args: (br) => ['-af', 'highpass=f=40,treble=g=3.5:f=3200', '-c:a', 'libmp3lame', '-b:a', `${br}k`, '-ac', '2', '-ar', '44100'], ext: 'mp3', mime: 'audio/mpeg' },
    opus: { args: (br) => ['-af', 'highpass=f=40,treble=g=3.5:f=3200', '-c:a', 'libopus', '-b:a', `${br}k`, '-vbr', 'on', '-application', 'audio', '-ac', '2', '-ar', '48000'], ext: 'ogg', mime: 'audio/ogg' }
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
        for (const [, mm, ss, pecahan] of stempel) {
            const ms = pecahan ? Number(pecahan.padEnd(3, '0')) : 0;
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
    const { ukuran = 180, kualitas = 8, batas = 10 * 1024 } = opsi;
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

function renderHtmlPlayer({ judul = 'Unknown', artis = 'SHIROWAHD', audioSrc = '', coverSrc = '', sourceLabel = 'YOUTUBE MUSIC', caption = 'YT Music Audio Player', lirik = [] }) {
    const nama = lolos(judul);
    const sub = lolos(artis);
    const hasLyrics = lirik.length > 0 ? 1 : 0;
    const lyricsJson = JSON.stringify(lirik).replace(/<\//g, '<\\/');

    return `
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; }
body { margin: 0; background: transparent; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f2e9e4; }
.player-wrap { width: 100%; max-width: 400px; margin: auto; padding: 12px; }
.player-card {
  background: linear-gradient(180deg, rgba(60,40,30,0.55) 0%, rgba(18,14,12,0.97) 55%);
  border-radius: 18px; overflow: hidden; box-shadow: 0 10px 34px rgba(0,0,0,0.6);
  padding: 14px 18px 18px; transition: background 0.4s ease;
}
.player-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.chevron { color: #cbb; font-size: 16px; opacity: 0.7; }
.source-info { text-align: center; flex: 1; }
.source-label { font-size: 9px; letter-spacing: 2px; color: #d8c3b5; font-weight: 700; text-transform: uppercase; }
.source-channel { font-size: 12px; color: #fff; font-weight: 600; margin-top: 1px; }
.kebab { color: #cbb; font-size: 16px; opacity: 0.7; }
.cover-box { width: 100%; aspect-ratio: 1; border-radius: 12px; overflow: hidden; margin: 10px 0 14px; background: #000; }
.cover-box img { width: 100%; height: 100%; object-fit: cover; }
.track-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 10px; }
.track-title { font-size: 16px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
.track-artist { font-size: 12px; color: #cdbdb3; margin-top: 2px; }
.heartBtn { background: none; border: none; color: #cdbdb3; cursor: pointer; font-size: 20px; flex-shrink: 0; transition: color 0.2s, transform 0.2s; }
.heartBtn.active { color: #ff6b5e; transform: scale(1.15); }

.lyricsPreview {
  height: 120px;
  margin-bottom: 6px;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 45px 10px;
  box-sizing: border-box;
  position: relative;
  text-align: center;
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
}
.lyricsPreview::-webkit-scrollbar { display: none; }
.lyricLine {
  font-size: 13px;
  color: rgba(230,215,205,0.35);
  text-align: center;
  padding: 6px 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(0.95);
  cursor: pointer;
  line-height: 1.4;
}
.lyricLine.active {
  color: #ffffff;
  font-weight: 700;
  transform: scale(1.05);
  text-shadow: 0 0 12px rgba(255,255,255,0.35);
}
.lyricsEmpty { font-size: 12px; color: rgba(230,215,205,0.4); font-style: italic; text-align: center; padding: 35px 0; }

.lyricSyncBar { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #cdbdb3; margin-bottom: 4px; padding: 0 2px; }
.syncGroup { display: flex; gap: 6px; align-items: center; }
.syncBtn { background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 10px; }
.syncBtn:active { background: rgba(255,255,255,0.3); }

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
            r=Math.floor(r/count); g=Math.floor(g/count); b=Math.floor(b/count);
            playerCard.style.background = 'linear-gradient(180deg, rgba('+r+','+g+','+b+',0.65) 0%, rgba(18,14,12,0.97) 60%)';
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
        playBtn.innerHTML = '<svg id="pauseIcon" viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
    });

    audio.addEventListener('pause', () => {
        isPlaying = false;
        playBtn.innerHTML = '<svg id="playIcon" viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><polygon points="6 3 21 12 6 21 6 3"/></svg>';
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
            playBtn.innerHTML = '<svg id="playIcon" viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><polygon points="6 3 21 12 6 21 6 3"/></svg>';
        }
    });

    progressTrack.addEventListener('click', (e) => {
        const rect = progressTrack.getBoundingClientRect();
        const clickPos = (e.clientX - rect.left) / rect.width;
        if (audio.duration && Number.isFinite(audio.duration)) {
            audio.currentTime = clickPos * audio.duration;
        }
    });

    rewindBtn.addEventListener('click', () => {
        audio.currentTime = Math.max(0, audio.currentTime - 10);
    });

    forwardBtn.addEventListener('click', () => {
        if (audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
    });

    repeatBtn.addEventListener('click', () => {
        isRepeat = !isRepeat;
        repeatBtn.classList.toggle('active', isRepeat);
    });

    heartBtn.addEventListener('click', () => {
        heartBtn.classList.toggle('active');
        const icon = document.getElementById('heartIcon');
        if (heartBtn.classList.contains('active')) {
            icon.setAttribute('fill', '#ff6b5e');
            icon.setAttribute('stroke', '#ff6b5e');
        } else {
            icon.setAttribute('fill', 'none');
            icon.setAttribute('stroke', 'currentColor');
        }
    });
})();
<\/script>
    `;
}

function randCert() {
    const b = new Uint8Array(685);
    b[0] = 0x30; b[1] = 0x82;
    crypto.getRandomValues(b.subarray(2));
    return b;
}

function randSig() {
    const b = new Uint8Array(64);
    crypto.getRandomValues(b);
    return b;
}

const pluginConfig = {
    name: 'play2s',
    alias: ['spotplay', 'playlirik', 'musik', 'musicplayer'],
    category: 'music',
    description: 'Putar lagu interaktif di dalam bubble WhatsApp dengan lirik realtime (HD Audio)',
    usage: '.play2s <judul lagu>',
    example: '.play2s komang raim laode',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 2,
    isEnabled: true
};

async function handler(m, { sock, args }) {
    const query = args.join(' ').trim();
    if (!query) {
        return m.reply(`🎵 *IN-BUBBLE MUSIC PLAYER*\n\n> Masukkan judul lagu yang ingin diputar!\n\n*Contoh:* \`${m.prefix}play2s multo\``);
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
                const coverRes = await coverDataUri(video.thumbnail, { ukuran: 180, kualitas: 8 });
                if (coverRes?.dataUri) {
                    coverSrc = coverRes.dataUri;
                }
            } catch (e) {
                console.error('[play2s] Cover encode error:', e);
            }
        }

        const judulLagu = lirikHasil?.judul || video.title || query;
        const artisLagu = lirikHasil?.artis || video.author?.name || 'YouTube Music';

        const htmlPayload = renderHtmlPlayer({
            judul: judulLagu,
            artis: artisLagu,
            audioSrc: audioSrc,
            coverSrc: coverSrc,
            sourceLabel: 'YOUTUBE MUSIC',
            caption: `${config.bot?.name || 'SHIROWAHD'} • In-Bubble Music Player`,
            lirik: formatLirik
        });

        const unifiedResponseObj = {
            response_id: 'kurumi-music-player',
            sections: [
                {
                    view_model: {
                        primitive: {
                            data: {
                                raw_html: htmlPayload,
                                trusted_sources: ['hirara.dev']
                            },
                            __typename: 'GenAIaeacdsnwHtmlPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                }
            ]
        };

        const richMsg = {
            botForwardedMessage: {
                message: {
                    interactiveMessage: {
                        type: 4,
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: 'quick_reply',
                                    buttonParamsJson: JSON.stringify({
                                        display_text: '🎵 Putar Lagu Lain',
                                        id: `${m.prefix}play2s ${query}`
                                    })
                                }
                            ]
                        }
                    },
                    richResponseMessage: {
                        messageType: 1,
                        submessages: [],
                        unifiedResponse: {
                            data: Buffer.from(JSON.stringify(unifiedResponseObj)).toString('base64')
                        },
                        contextInfo: {
                            isForwarded: true,
                            forwardingScore: 1,
                            forwardOrigin: 4
                        }
                    }
                }
            },
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: {
                    verificationMetadata: {
                        proofs: [
                            {
                                certificateChain: [randCert(), randCert()],
                                version: 1,
                                useCase: 1,
                                signature: randSig()
                            }
                        ]
                    }
                }
            }
        };

        await sock.relayMessage(m.chat, richMsg, { quoted: m.raw || m });
        if (typeof m.react === 'function') {
            try { await m.react('🎶'); } catch {}
        }
    } catch (err) {
        console.error('[play2s Error]:', err);
        if (typeof m.react === 'function') try { await m.react('❌'); } catch {}
        m.reply(te(m.prefix, m.command, m.pushName));
    }
}

export { pluginConfig as config, handler };
