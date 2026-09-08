import axios from 'axios';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import yts from 'yt-search';
import { ytdl } from '../scraper/ytdl.js';

const jalankan = promisify(execFile);
const FFMPEG_BIN = existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : 'ffmpeg';
const BATAS_BASE64 = 480 * 1024;
const BITRATE_MIN = { mp3: 20, opus: 16 };
const BITRATE_AWAL = { mp3: 32, opus: 24 };

const CODEC = {
  mp3: {
    args: (br) => [
      '-af',
      'highpass=f=30,loudnorm=I=-16:TP=-1.5:LRA=11',
      '-c:a',
      'libmp3lame',
      '-b:a',
      `${br}k`,
      '-ac',
      '1',
      '-ar',
      '44100',
    ],
    ext: 'mp3',
    mime: 'audio/mpeg',
  },
  opus: {
    args: (br) => [
      '-af',
      'highpass=f=30,loudnorm=I=-16:TP=-1.5:LRA=11',
      '-c:a',
      'libopus',
      '-b:a',
      `${br}k`,
      '-vbr',
      'on',
      '-application',
      'audio',
      '-ac',
      '1',
      '-ar',
      '48000',
    ],
    ext: 'ogg',
    mime: 'audio/ogg',
  },
};

const API_LRCLIB = 'https://lrclib.net/api';
const DATA_DIR = join(process.cwd(), 'src', 'data', 'lyrics');

function parseLrc(lrc) {
  const keluar = [];
  for (const baris of String(lrc ?? '').split(/\r?\n/)) {
    const stempel = [...baris.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stempel.length) continue;
    const teks = baris.replace(/\[[^\]]*\]/g, '').trim();
    if (!teks) continue;
    for (const [, mm, ss, pecahan] of stempel) {
      const ms = pecahan ? Number(pecahan.padEnd(3, '0').slice(0, 3)) : 0;
      keluar.push({
        start_ms: Number(mm) * 60000 + Number(ss) * 1000 + ms,
        end_ms: null,
        text: teks,
      });
    }
  }
  return keluar.sort((a, b) => a.start_ms - b.start_ms);
}

function bersihkanTeks(s) {
  return String(s ?? '')
    .replace(/\s*\(.*?(official|video|audio|lirik|lyrics|remaster|hd|4k|ft\.|feat\.).*?\)/gi, '')
    .replace(/\s*\[.*?\]/gi, '')
    .trim();
}

function pecahJudulLagu(rawTitle, channel) {
  const bersih = bersihkanTeks(rawTitle);
  const parts = bersih.split(/\s*[-–—|]\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { artis: parts[0], judul: parts.slice(1).join(' - ') };
  }
  return { artis: channel || 'Artist', judul: bersih || 'Song' };
}

/**
 * Fetch lirik tersinkronisasi dari LRCLIB (multi-strategy)
 */
async function getLyrics(rawTitle, rawArtist, durasiDetik) {
  const { artis, judul } = pecahJudulLagu(rawTitle, rawArtist);

  // Strategy 1: track_name + artist_name
  try {
    const u = new URL(`${API_LRCLIB}/search`);
    u.searchParams.set('track_name', judul);
    if (artis && artis !== 'Artist') u.searchParams.set('artist_name', artis);
    const res = await axios.get(u.toString(), {
      headers: { 'User-Agent': 'shirowahd-bot/1.0 (+apple player)' },
      timeout: 5000,
    });
    const valid = Array.isArray(res.data) ? res.data.filter((x) => x?.syncedLyrics && !x?.instrumental) : [];
    if (valid.length > 0) return parseLrc(valid[0].syncedLyrics);
  } catch {}

  // Strategy 2: track_name only
  try {
    const u = new URL(`${API_LRCLIB}/search`);
    u.searchParams.set('track_name', judul);
    const res = await axios.get(u.toString(), {
      headers: { 'User-Agent': 'shirowahd-bot/1.0 (+apple player)' },
      timeout: 5000,
    });
    const valid = Array.isArray(res.data) ? res.data.filter((x) => x?.syncedLyrics && !x?.instrumental) : [];
    if (valid.length > 0) return parseLrc(valid[0].syncedLyrics);
  } catch {}

  // Strategy 3: query string 'q'
  try {
    const u = new URL(`${API_LRCLIB}/search`);
    u.searchParams.set('q', `${artis} ${judul}`.trim());
    const res = await axios.get(u.toString(), {
      headers: { 'User-Agent': 'shirowahd-bot/1.0 (+apple player)' },
      timeout: 5000,
    });
    const valid = Array.isArray(res.data) ? res.data.filter((x) => x?.syncedLyrics && !x?.instrumental) : [];
    if (valid.length > 0) return parseLrc(valid[0].syncedLyrics);
  } catch {}

  return [];
}

/**
 * Cover Data URI sama persis seperti .play2s
 */
async function coverDataUri(url, opsi = {}) {
  const { ukuran = 240, kualitas = 7, batas = 14 * 1024 } = opsi;
  if (!url || !/^https?:\/\//.test(url)) return '';
  const dir = mkdtempSync(join(tmpdir(), 'shir-cover-'));
  const masuk = join(dir, 'masuk');
  const keluar = join(dir, 'keluar.jpg');
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 12000 });
    const buf = Buffer.from(res.data);
    if (buf.length < 512) return '';
    writeFileSync(masuk, buf);
    let q = kualitas;
    let kecil = null;
    for (; q <= 10; q++) {
      await jalankan(FFMPEG_BIN, [
        '-y',
        '-i',
        masuk,
        '-vf',
        `crop='min(iw,ih)':'min(iw,ih)',scale=${ukuran}:${ukuran}`,
        '-q:v',
        String(q),
        keluar,
      ]);
      kecil = readFileSync(keluar);
      if ((kecil.length * 4) / 3 <= batas) break;
    }
    if (!kecil || (kecil.length * 4) / 3 > batas) return '';
    const b64 = kecil.toString('base64');
    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return '';
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
}

async function kecilkan(masuk, keluar, codec, bitrate, maxDetik) {
  await jalankan(FFMPEG_BIN, [
    '-y',
    '-i',
    masuk,
    '-vn',
    '-t',
    String(maxDetik),
    ...CODEC[codec].args(bitrate),
    keluar,
  ]);
  return readFileSync(keluar);
}

/**
 * Transcode audio stream ke Opus 48kHz Mono EBU R128 (sama seperti .play2s)
 */
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
    return `data:${CODEC[codec].mime};base64,${b64}`;
  } catch (e) {
    console.error('[ApplePlayer audioDataUri error]:', e);
    return null;
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Format detik ke MM:SS
 */
function formatDuration(durationSec) {
  const total = Math.max(0, Math.floor(durationSec || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Build Apple Music / Spotify Glass HTML Component
 */
export function buildApplePlayerHtml({ title, artist, durationSec, audioUrl, artworkDataUrl, lyrics }) {
  const safeTitle = String(title || 'Unknown Track')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const safeArtist = String(artist || 'Unknown Artist')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const cover = artworkDataUrl
    ? `<img class="player-cover" src="${artworkDataUrl}" alt="${safeTitle}">`
    : `<div class="player-cover"></div>`;

  const backdrop = artworkDataUrl ? `<img class="player-backdrop-image" src="${artworkDataUrl}" alt="">` : '';

  const clientConfig = JSON.stringify({
    lyrics: lyrics || [],
  })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');

  const css = `
:root {
  --player-white: #ffffff;
  --player-muted: rgba(255, 255, 255, 0.68);
  --player-faint: rgba(255, 255, 255, 0.46);
  --player-glass: rgba(255, 255, 255, 0.14);
  --player-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}
.music-player {
  position: relative;
  width: 100%;
  height: 520px;
  overflow: hidden;
  background: #111215;
  color: var(--player-white);
  font-family: var(--player-font);
  border-radius: 18px;
  isolation: isolate;
  contain: paint;
}
.player-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.player-backdrop-image {
  position: absolute;
  inset: -60px;
  width: calc(100% + 120px);
  height: calc(100% + 120px);
  object-fit: cover;
  opacity: 0.85;
  filter: blur(52px) saturate(1.35);
}
.player-scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: rgba(10, 10, 14, 0.65);
  pointer-events: none;
}
.player-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 8px 18px 14px;
}
.player-handle-row {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  flex: none;
}
.player-handle {
  width: 38px;
  height: 4px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.38);
}
.player-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
  padding: 6px 0 10px;
}
.player-cover {
  width: 48px;
  height: 48px;
  flex: none;
  object-fit: cover;
  border-radius: 9px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.4);
  background: rgba(255, 255, 255, 0.1);
}
.player-track-copy {
  flex: 1;
  min-width: 0;
}
.player-title {
  font-size: 15.5px;
  font-weight: 700;
  letter-spacing: -0.2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.player-artist {
  margin-top: 2px;
  color: var(--player-muted);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.player-favorite {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: none;
  border: 0;
  border-radius: 50%;
  background: var(--player-glass);
  color: var(--player-white);
  cursor: pointer;
}
.player-favorite svg {
  width: 19px;
  height: 19px;
}
.player-favorite.is-active svg {
  fill: #1ed760;
  stroke: #1ed760;
}
.player-lyrics {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 6px 36% 0;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.player-lyrics::-webkit-scrollbar {
  display: none;
}
.lyric-line {
  padding: 7px 0;
  color: rgba(255, 255, 255, 0.38);
  font-size: 24px;
  font-weight: 800;
  line-height: 1.32;
  letter-spacing: -0.5px;
  opacity: 0.55;
  transform: scale(0.97);
  transform-origin: left center;
  transition: all 0.38s cubic-bezier(.22, 1, .36, 1);
  cursor: pointer;
}
.lyric-line.is-active {
  color: #ffffff;
  opacity: 1;
  transform: scale(1.02);
  text-shadow: 0 2px 20px rgba(255, 255, 255, 0.25);
}
.lyric-line.is-past {
  color: rgba(255, 255, 255, 0.65);
  opacity: 0.72;
}
.player-empty-lyrics {
  padding-top: 35px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
}
.player-transport {
  flex: none;
  padding-top: 8px;
}
.player-progress {
  position: relative;
  height: 6px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.22);
  cursor: pointer;
}
.player-progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0;
  border-radius: 99px;
  background: #ffffff;
}
.player-progress-thumb {
  position: absolute;
  top: 50%;
  left: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
  transform: translate(-50%, -50%);
}
.player-times {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  color: var(--player-faint);
  font-size: 11.5px;
  font-family: monospace;
}
.player-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 26px;
  padding: 10px 0 4px;
}
.player-control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--player-white);
  cursor: pointer;
}
.player-skip-icon {
  width: 32px;
  height: 32px;
  opacity: 0.85;
}
.player-control-main {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #ffffff;
  color: #111215;
  box-shadow: 0 4px 18px rgba(0,0,0,0.4);
}
.player-play-icon {
  width: 26px;
  height: 26px;
}
`;

  const html = `
<style>${css}</style>
<div class="music-player">
  <div class="player-backdrop">${backdrop}</div>
  <div class="player-scrim"></div>
  <main class="player-content">
    <div class="player-handle-row"><div class="player-handle"></div></div>
    <header class="player-header">
      ${cover}
      <div class="player-track-copy">
        <div class="player-title">${safeTitle}</div>
        <div class="player-artist">${safeArtist}</div>
      </div>
      <button class="player-favorite" id="player-favorite" aria-label="Favorit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2.7l2.86 5.8 6.4.93-4.63 4.51 1.09 6.38L12 17.3l-5.72 3.02 1.09-6.38-4.63-4.51 6.4-.93L12 2.7z"/>
        </svg>
      </button>
    </header>
    <section class="player-lyrics" id="player-lyrics"></section>
    <footer class="player-transport">
      <div class="player-progress" id="player-progress">
        <div class="player-progress-fill" id="player-progress-fill"></div>
        <div class="player-progress-thumb" id="player-progress-thumb"></div>
      </div>
      <div class="player-times">
        <span id="player-current-time">0:00</span>
        <span id="player-duration">${formatDuration(durationSec)}</span>
      </div>
      <div class="player-controls">
        <button class="player-control" id="player-rewind" aria-label="Mundur 15s">
          <svg class="player-skip-icon" viewBox="0 0 512 512" fill="none" stroke="currentColor" stroke-width="32" stroke-linejoin="round">
            <path d="M480 145.52v221c0 13.28-13 21.72-23.63 15.35L267.5 268.8c-9.24-5.53-9.24-20.07 0-25.6l188.87-113C467 123.8 480 132.24 480 145.52Z"/>
            <path d="M251.43 145.52v221c0 13.28-13 21.72-23.63 15.35L38.93 268.8c-9.24-5.53-9.24-20.07 0-25.6l188.87-113c10.64-6.4 23.63 2.04 23.63 15.32Z"/>
          </svg>
        </button>
        <button class="player-control player-control-main" id="player-play" aria-label="Putar">
          <svg class="player-play-icon" id="player-play-icon" viewBox="0 0 64 64" fill="currentColor">
            <path d="M22 14.5v35a2.7 2.7 0 0 0 4.15 2.27l27.2-17.5a2.7 2.7 0 0 0 0-4.54l-27.2-17.5A2.7 2.7 0 0 0 22 14.5z"/>
          </svg>
          <svg class="player-play-icon" id="player-pause-icon" viewBox="0 0 64 64" fill="currentColor" style="display:none">
            <rect x="18" y="12" width="10" height="40" rx="2.8"/>
            <rect x="36" y="12" width="10" height="40" rx="2.8"/>
          </svg>
        </button>
        <button class="player-control" id="player-forward" aria-label="Maju 15s">
          <svg class="player-skip-icon" viewBox="0 0 512 512" fill="none" stroke="currentColor" stroke-width="32" stroke-linejoin="round">
            <path d="M32 145.52v221c0 13.28 13 21.72 23.63 15.35L244.5 268.8c9.24-5.53 9.24-20.07 0-25.6L55.63 130.2C45 123.8 32 132.24 32 145.52Z"/>
            <path d="M260.57 145.52v221c0 13.28 13 21.72 23.63 15.35l188.87-113c9.24-5.53 9.24-20.07 0-25.6L284.2 130.2c-10.64-6.4-23.63 2.04-23.63 15.32Z"/>
          </svg>
        </button>
      </div>
    </footer>
  </main>
</div>
<audio id="player-audio" preload="auto" playsinline webkit-playsinline ${audioUrl ? `src="${audioUrl}"` : ''}></audio>
<script>window.__SNOWKIT_PLAYER__=${clientConfig};</script>
<script>
(() => {
  const audio = document.getElementById("player-audio");
  const playBtn = document.getElementById("player-play");
  const rewindBtn = document.getElementById("player-rewind");
  const forwardBtn = document.getElementById("player-forward");
  const favBtn = document.getElementById("player-favorite");
  const playIcon = document.getElementById("player-play-icon");
  const pauseIcon = document.getElementById("player-pause-icon");
  const progress = document.getElementById("player-progress");
  const progressFill = document.getElementById("player-progress-fill");
  const progressThumb = document.getElementById("player-progress-thumb");
  const curTimeLbl = document.getElementById("player-current-time");
  const durLbl = document.getElementById("player-duration");
  const lyricsContainer = document.getElementById("player-lyrics");

  const conf = window.__SNOWKIT_PLAYER__ || {};
  const lyrics = Array.isArray(conf.lyrics) ? conf.lyrics : [];
  let activeIndex = -1;
  const lyricEls = [];

  const fmt = (s) => {
    if (!Number.isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ":" + String(sec).padStart(2, "0");
  };

  const updateProgress = () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const p = Math.max(0, Math.min(100, (audio.currentTime / audio.duration) * 100));
    progressFill.style.width = p + "%";
    progressThumb.style.left = p + "%";
    curTimeLbl.textContent = fmt(audio.currentTime);
  };

  const syncLyrics = () => {
    if (!lyrics.length) return;
    const curMs = audio.currentTime * 1000;
    let nextIdx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (curMs >= lyrics[i].start_ms) nextIdx = i;
      else break;
    }
    if (nextIdx === activeIndex) return;
    activeIndex = nextIdx;

    lyricEls.forEach((el, idx) => {
      el.className = "lyric-line";
      if (idx === nextIdx) el.classList.add("is-active");
      else if (idx < nextIdx) el.classList.add("is-past");
    });

    if (nextIdx >= 0 && lyricEls[nextIdx]) {
      const target = lyricEls[nextIdx];
      const desired = target.offsetTop - (lyricsContainer.clientHeight - target.offsetHeight) * 0.45;
      lyricsContainer.scrollTo({ top: desired, behavior: "smooth" });
    }
  };

  const renderLyrics = () => {
    if (!lyrics.length) {
      const emp = document.createElement("div");
      emp.className = "player-empty-lyrics";
      emp.textContent = "Lirik tidak tersedia untuk lagu ini.";
      lyricsContainer.appendChild(emp);
      return;
    }
    lyrics.forEach((l, i) => {
      const d = document.createElement("div");
      d.className = "lyric-line";
      d.textContent = l.text || "♪";
      d.addEventListener("click", () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          audio.currentTime = Math.max(0, l.start_ms / 1000);
          updateProgress();
          syncLyrics();
        }
      });
      lyricsContainer.appendChild(d);
      lyricEls.push(d);
    });
  };

  try {
    audio.load();
  } catch {}

  renderLyrics();
  syncLyrics();

  playBtn.addEventListener("click", async () => {
    try {
      if (audio.paused) {
        await audio.play();
        playIcon.style.display = "none";
        pauseIcon.style.display = "block";
      } else {
        audio.pause();
        playIcon.style.display = "block";
        pauseIcon.style.display = "none";
      }
    } catch (e) {
      playIcon.style.display = "block";
      pauseIcon.style.display = "none";
    }
  });

  rewindBtn.addEventListener("click", () => {
    audio.currentTime = Math.max(0, audio.currentTime - 15);
    updateProgress();
    syncLyrics();
  });

  forwardBtn.addEventListener("click", () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 15);
      updateProgress();
      syncLyrics();
    }
  });

  favBtn.addEventListener("click", () => favBtn.classList.toggle("is-active"));

  progress.addEventListener("pointerdown", (e) => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = progress.getBoundingClientRect();
    const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    audio.currentTime = (pos / rect.width) * audio.duration;
    updateProgress();
    syncLyrics();
  });

  audio.addEventListener("loadedmetadata", () => {
    durLbl.textContent = fmt(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    updateProgress();
    syncLyrics();
  });
  audio.addEventListener("play", () => {
    playIcon.style.display = "none";
    pauseIcon.style.display = "block";
  });
  audio.addEventListener("pause", () => {
    if (!audio.ended) {
      playIcon.style.display = "block";
      pauseIcon.style.display = "none";
    }
  });
  audio.addEventListener("ended", () => {
    playIcon.style.display = "block";
    pauseIcon.style.display = "none";
    progressFill.style.width = "0%";
    progressThumb.style.left = "0%";
    curTimeLbl.textContent = "0:00";
    activeIndex = -1;
    syncLyrics();
  });
})();
</script>
`;

  return html.trim();
}

/**
 * Service utama untuk resolve musik (Spotify / YouTube) dan mengirim Bubble Player
 */
export async function sendAppleMusicPlayer(sock, chat, query, quote = null) {
  let title = '';
  let artist = '';
  let durationSec = 0;
  let rawCoverUrl = '';

  // 1. Cek apakah SnowKit terkonfigurasi (support URL Spotify, judul lagu, match, atau nama artis)
  const isSpotify = /open\.spotify\.com\/track\/|spotify:track:/i.test(query);
  const snowkitToken = process.env.SNOWKIT_TOKEN;
  const snowkitEndpoint = process.env.SNOWKIT_ENDPOINT || 'https://snow.kairogg.com.br';

  if (snowkitToken) {
    try {
      const { SnowKit } = await import('@luanxdd/snowkit');
      const { SnowKitPlayer } = await import('@luanxdd/snowkit/player');
      const snow = new SnowKit({ baseUrl: snowkitEndpoint, token: snowkitToken });
      const player = new SnowKitPlayer({ baseUrl: snowkitEndpoint, token: snowkitToken });

      let track = null;

      if (isSpotify) {
        // Resolve URL Spotify langsung
        track = await snow.catalog.resolve(query, { market: 'ID' });
      } else {
        // Coba pencarian lagu di katalog SnowKit
        const results = await snow.catalog.songs.search(query, { market: 'ID', limit: 5 });
        if (results?.data?.length > 0) {
          track = results.data[0];
        } else {
          // Coba cari artisnya jika pencarian lagu kosong
          const artistRes = await snow.catalog.artists.search(query, { market: 'ID', limit: 3 });
          if (artistRes?.data?.length > 0) {
            const artistId = artistRes.data[0].id;
            const topTracks = await snow.catalog.artists.albums(artistId, { market: 'ID', limit: 1 });
            if (topTracks?.data?.length > 0) {
              const albumTracks = await snow.catalog.albums.tracks(topTracks.data[0].id, { market: 'ID', limit: 5 });
              track = albumTracks?.data?.[0];
            }
          }
        }
      }

      if (track && track.id) {
        title = track.title || track.name;
        artist = track.artists?.map((a) => a.name).join(', ') || 'Spotify Artist';
        durationSec = Math.floor((track.durationMs || 0) / 1000);
        rawCoverUrl = track.artwork?.url || track.album?.images?.[0]?.url || '';

        const ready = await player.ready(track.id, { market: 'ID' });
        let lyrics = [];
        if (ready?.lyrics?.lines?.length) {
          lyrics = ready.lyrics.lines.map((l) => ({
            start_ms: l.startMs ?? l.start_ms ?? 0,
            end_ms: l.endMs ?? l.end_ms ?? null,
            text: l.text || '♪',
          }));
        } else {
          lyrics = await getLyrics(title, artist, durationSec);
        }

        const artworkDataUrl = await coverDataUri(rawCoverUrl);
        const streamSrc = ready.audio?.socketUrl || ready.audio?.streamUrl;

        if (streamSrc) {
          const htmlPayload = buildApplePlayerHtml({
            title,
            artist,
            durationSec,
            audioUrl: streamSrc,
            artworkDataUrl,
            lyrics,
          });

          return await sendRichEnvelope(sock, chat, htmlPayload, `${title} - ${artist}`);
        }
      }
    } catch (e) {
      console.warn('[SnowKit resolve fallback]:', e.message);
    }
  }

  // 2. Universal Search Engine (YouTube + LRCLIB + Opus 48kHz Transcoder)
  const cleanQuery = query.replace(/^https?:\/\/[^\s]+/i, '').trim() || query;
  
  // Utamakan hasil 'audio' / 'official audio' agar tidak mengambil Official Music Video yang ada adegan klip/hening pembuka
  let searchResult = await yts(cleanQuery + ' audio');
  let video = searchResult?.videos?.find((v) => /official audio|topic|audio/i.test(v.title)) || searchResult?.videos?.[0];
  if (!video) {
    searchResult = await yts(cleanQuery);
    video = searchResult?.videos?.[0];
  }

  if (!video) {
    throw new Error('Lagu tidak ditemukan. Silakan coba judul atau nama artis lain.');
  }

  const parsedMeta = pecahJudulLagu(video.title, video.author?.name);
  title = parsedMeta.judul;
  artist = parsedMeta.artis;
  durationSec = video.seconds || 180;
  rawCoverUrl = video.thumbnail || video.image || '';

  // Unduh audio YouTube
  let audioBuffer = null;
  try {
    const dlResult = await ytdl(video.url, 'mp3');
    const rawAudioUrl =
      dlResult?.dl || dlResult?.url || dlResult?.downloadUrl || (typeof dlResult === 'string' ? dlResult : null);
    if (rawAudioUrl) {
      const audioRes = await axios.get(rawAudioUrl, { responseType: 'arraybuffer', timeout: 30000 });
      audioBuffer = Buffer.from(audioRes.data);
    }
  } catch (e) {
    console.error('[ApplePlayer] Ytdl error:', e);
  }

  if (!audioBuffer) {
    throw new Error('Gagal mengambil audio stream dari server YouTube.');
  }

  // Paralel: ambil lirik, transcode audio ke Opus Base64 (persis .play2s), dan optimasi cover
  const [lyrics, audioBase64, artworkDataUrl] = await Promise.all([
    getLyrics(title, artist, durationSec),
    audioDataUri(audioBuffer, { codec: 'opus', maxDetik: 160 }),
    coverDataUri(rawCoverUrl),
  ]);

  if (!audioBase64) {
    throw new Error('Gagal mengompresi audio stream.');
  }

  const htmlPayload = buildApplePlayerHtml({
    title,
    artist,
    durationSec,
    audioUrl: audioBase64,
    artworkDataUrl,
    lyrics,
  });

  return await sendRichEnvelope(sock, chat, htmlPayload, `${title} - ${artist}`);
}

/**
 * Envelope Protobuf WhatsApp Rich Message
 */
async function sendRichEnvelope(sock, chat, htmlPayload, messageTitle) {
  const msgContent = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: '',
        botResponseId: 'kurumi-music-player',
        verificationMetadata: {
          proofs: [
            {
              version: 1,
              useCase: 1,
              signature: 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==',
              certificateChain: [
                'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg',
                'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ==',
              ],
            },
          ],
        },
      },
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [{ messageType: 2, messageText: messageTitle }],
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                response_id: 'kurumi-music-player',
                sections: [
                  {
                    view_model: {
                      primitive: {
                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                        payload: htmlPayload,
                        trusted_sources: ['*', 'swhdhlz.my.id', 'hirara.dev', 'i.ytimg.com'],
                      },
                      __typename: 'GenAISingleLayoutViewModel',
                    },
                  },
                ],
              })
            ).toString('base64'),
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botJid: '867051314767696@bot',
            },
            forwardOrigin: 4,
          },
        },
      },
    },
  };

  return await sock.relayMessage(chat, msgContent, {});
}
