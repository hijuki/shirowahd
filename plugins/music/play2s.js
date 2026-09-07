import axios from 'axios';
import yts from 'yt-search';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';
import config from '../../config.js';
import { ytdl } from '../../src/scraper/ytdl.js';

const jalankan = promisify(execFile);
const BATAS_BASE64 = 600 * 1024;
const BITRATE_MIN = { mp3: 24, opus: 12 };
const BITRATE_AWAL = { mp3: 48, opus: 16 };
const CODEC = {
  mp3: { args: (br) => ['-c:a', 'libmp3lame', '-b:a', `${br}k`, '-ac', '1', '-ar', '22050'], ext: 'mp3', mime: 'audio/mpeg' },
  opus: { args: (br) => ['-c:a', 'libopus', '-b:a', `${br}k`, '-ac', '1', '-ar', '16000'], ext: 'ogg', mime: 'audio/ogg' }
};

const API_LRCLIB = 'https://lrclib.net/api';
const UA = 'shirowahd-bot/1.0 (+play lyrics)';
const DATA_DIR = join(process.cwd(), 'src', 'data', 'lyrics');
const TIMEOUT_MS = 8000;
const TOLERANSI_DETIK = 4;
const BATAS_LIRIK = 6 * 1024;
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
  await jalankan('/usr/bin/ffmpeg', ['-y', '-i', masuk, '-vn', '-t', String(maxDetik), ...CODEC[codec].args(bitrate), keluar]);
  return readFileSync(keluar);
}

async function audioDataUri(buffer, opsi = {}) {
  const { codec = 'opus', maxDetik = 240, batas = BATAS_BASE64 } = opsi;
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
  const { ukuran = 180, kualitas = 8, batas = 10 * 1024 } = opsi;
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
    for (; q <= 12; q++) {
      await jalankan('/usr/bin/ffmpeg', ['-y', '-i', masuk, '-vf', `crop='min(iw,ih)':'min(iw,ih)',scale=${ukuran}:${ukuran}`, '-q:v', String(q), keluar]);
      kecil = readFileSync(keluar);
      if ((kecil.length * 4) / 3 <= batas) break;
    }
    if (!kecil || (kecil.length * 4) / 3 > batas) return null;
    const b64 = kecil.toString('base64');
    return { dataUri: `data:image/jpeg;base64,${b64}`, byte: b64.length, kualitas: q };
  } catch { return null; } finally { rmSync(dir, { recursive: true, force: true }); }
}

function renderHtmlPlayer({ judul, artis, audioSrc, coverSrc, sourceLabel, caption, lirik }) {
  const nama = String(judul || 'Musik').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const sub = String(artis || 'SHIROWAHD Audio').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const hasLyrics = Array.isArray(lirik) && lirik.length > 0 ? 1 : 0;
  const lyricsJson = JSON.stringify(Array.isArray(lirik) ? lirik : []);

  return `
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; }
body { margin: 0; background: transparent; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f2e9e4; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 12px; }
.player-wrap { width: 100%; max-width: 360px; margin: auto; }
.player-card { background: linear-gradient(160deg, #111827 0%, #090d16 100%); border: 1px solid rgba(0,255,178,0.25); border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.85); overflow: hidden; padding: 18px; position: relative; }
.player-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.source-label { font-size: 10px; font-weight: 700; color: #00ffb2; text-transform: uppercase; letter-spacing: 1px; }
.source-channel { font-size: 11px; color: rgba(255,255,255,0.6); }
.cover-box { width: 100%; aspect-ratio: 1/1; border-radius: 16px; overflow: hidden; margin-bottom: 14px; background: #1e293b; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.cover-box img { width: 100%; height: 100%; object-fit: cover; }
.track-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.track-artist { font-size: 13px; color: #94a3b8; margin-bottom: 12px; }
.lyricsPreview { height: 75px; overflow-y: auto; text-align: center; font-size: 13px; color: #cbd5e1; margin-bottom: 12px; scroll-behavior: smooth; }
.lyricsLine { padding: 4px 0; transition: all 0.3s; opacity: 0.5; }
.lyricsLine.active { opacity: 1; font-weight: 700; color: #00ffb2; transform: scale(1.05); }
.lyricsEmpty { font-size: 12px; color: rgba(255,255,255,0.4); font-style: italic; padding: 25px 0; }
.progressTrack { background: rgba(255,255,255,0.15); height: 4px; border-radius: 2px; cursor: pointer; position: relative; margin-bottom: 6px; }
.progressBar { background: #00ffb2; height: 100%; border-radius: 2px; width: 0%; }
.timeRow { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
.controls { display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 14px; }
.playBtn { background: #00ffb2; color: #090d16; border: none; border-radius: 50%; width: 52px; height: 52px; display: flex; justify-content: center; align-items: center; cursor: pointer; font-size: 18px; font-weight: bold; }
.audioError { font-size: 11px; color: #ff8a80; text-align: center; margin-top: 8px; display: none; }
</style>

<div class="player-wrap">
  <div class="player-card" id="playerCard">
    <div class="player-header">
      <div class="source-label">${sourceLabel}</div>
      <div class="source-channel">${sub}</div>
    </div>
    <div class="cover-box"><img id="coverImg" src="${coverSrc || ''}" alt="Cover"></div>
    <div class="track-title">${nama}</div>
    <div class="track-artist">${sub}</div>
    <div class="lyricsPreview" id="lyricsPreview">
      <div class="lyricsEmpty">Lirik tidak tersedia</div>
    </div>
    <div class="progressTrack" id="progressTrack"><div class="progressBar" id="progressBar"></div></div>
    <div class="timeRow"><span id="curTime">0:00</span><span id="durTime">0:00</span></div>
    <div class="controls">
      <button class="playBtn" id="playBtn">▶</button>
    </div>
    <div class="audioError" id="audioError">⚠ Audio gagal diputar</div>
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
  const lyricsPreview = document.getElementById('lyricsPreview');
  const hasLyrics = ${hasLyrics} === 1;
  const lyrics = ${lyricsJson};

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
      div.className = 'lyricsLine';
      div.textContent = item.text || '...';
      lyricsPreview.appendChild(div);
    });
  }
  buildLyricsDOM();

  let activeLyricIndex = -1;
  function updateLyrics(t) {
    if (!hasLyrics || !lyrics.length) return;
    let idx = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (t >= lyrics[i].time) idx = i; else break;
    }
    if (idx !== activeLyricIndex) {
      const lines = lyricsPreview.querySelectorAll('.lyricsLine');
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

  playBtn.addEventListener('click', () => {
    if(audio.paused){
      audio.play().then(() => {
        playBtn.innerText = '⏸';
      }).catch((e) => {
        console.error(e);
      });
    } else {
      audio.pause();
      playBtn.innerText = '▶';
    }
  });

  progressTrack.addEventListener('click', (e) => {
    if (!audio.duration || !Number.isFinite(audio.duration)) return;
    const rect = progressTrack.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
  });
})();
</script>
`;
}

const pluginConfig = {
  name: 'play2s',
  alias: ['spotplay', 'playlirik', 'musik', 'player'],
  category: 'music',
  description: 'Putar lagu dengan kartu musik interaktif Meta HTML Primitive + Lirik live',
  usage: '.play2s <judul lagu>',
  example: '.play2s merry Christmas please don\'t call',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true
};

async function handler(m, { sock, args }) {
  const query = (args && args.length) ? args.join(' ') : (m.text || '').trim();
  if (!query) {
    return m.reply(`🎧 *Format:* \`${m.prefix}play2s <judul lagu / artis>\`\n> Contoh: \`${m.prefix}play2s merry Christmas please don't call\``);
  }

  if (typeof m.react === 'function') await m.react('🔍');

  try {
    const search = await yts(query);
    const video = search?.videos?.[0];
    if (!video || !video.url) {
      if (typeof m.react === 'function') await m.react('❌');
      return m.reply('❌ Lagu tidak ditemukan di YouTube.');
    }

    if (typeof m.react === 'function') await m.react('⏳');

    // 1. Dapatkan download URL audio
    const dl = await ytdl(video.url, 'mp3');
    const directAudioUrl = dl?.dl;
    if (!directAudioUrl) {
      if (typeof m.react === 'function') await m.react('❌');
      return m.reply('❌ Gagal mendapatkan streaming audio dari server YouTube.');
    }

    // 2. Download audio buffer dan kompresi jadi Base64 DataURI (Opus 16kbps mono)
    const audioRes = await axios.get(directAudioUrl, { responseType: 'arraybuffer', timeout: 30000 });
    const encodedAudio = await audioDataUri(Buffer.from(audioRes.data), { codec: 'opus', maxDetik: 240 });

    if (!encodedAudio?.dataUri) {
      if (typeof m.react === 'function') await m.react('❌');
      return m.reply('❌ Gagal mengompresi audio untuk WhatsApp player.');
    }

    // 3. Download dan kompresi cover thumbnail
    let coverSrc = '';
    if (video.thumbnail) {
      const coverRes = await coverDataUri(video.thumbnail, { ukuran: 180, kualitas: 8 });
      if (coverRes?.dataUri) coverSrc = coverRes.dataUri;
    }

    // 4. Cari lirik tersinkronisasi
    let lirikHasil = null;
    try {
      lirikHasil = await cariLirik(video);
    } catch (e) {
      console.error('[play2s] Lirik error:', e);
    }

    const formatLirik = lirikHasil?.baris ? lirikHasil.baris.map(b => ({ time: b.time, text: b.text })) : [];
    const judulLagu = lirikHasil?.judul || video.title || query;
    const artisLagu = lirikHasil?.artis || video.author?.name || 'YouTube Music';

    const htmlPayload = renderHtmlPlayer({
      judul: judulLagu,
      artis: artisLagu,
      audioSrc: encodedAudio.dataUri,
      coverSrc: coverSrc,
      sourceLabel: 'SHIROWAHD MUSIC',
      caption: `${judulLagu} - ${artisLagu}`,
      lirik: formatLirik
    });

    const msgContent = {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        botMetadata: {
          messageDisclaimerText: '',
          botResponseId: 'shirowahd-music-player',
          verificationMetadata: {
            proofs: [
              {
                version: 1,
                useCase: 1,
                signature: 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==',
                certificateChain: [
                  'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg',
                  'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=='
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
                response_id: 'shirowahd-music-player',
                sections: [{
                  view_model: {
                    primitive: {
                      __typename: 'GenAIaeacdsnwHtmlPrimitive',
                      payload: htmlPayload,
                      trusted_sources: ['swhdhlz.my.id', 'hirara.dev']
                    },
                    __typename: 'GenAISingleLayoutViewModel'
                  }
                }]
              })).toString('base64')
            },
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
              forwardOrigin: 4
            }
          }
        }
      }
    };

    await sock.relayMessage(m.chat, msgContent, {});
    if (typeof m.react === 'function') await m.react('🎶');
  } catch (err) {
    console.error('Play2s error:', err);
    if (typeof m.react === 'function') await m.react('❌');
    await m.reply(`❌ *Terjadi Kesalahan:* ${err.message}`);
  }
}

export { pluginConfig as config, handler };
