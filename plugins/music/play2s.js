import axios from 'axios';
import yts from 'yt-search';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import config from '../../config.js';

const jalankan = promisify(execFile);
const BATAS_BASE64 = 900 * 1024;
const BITRATE_MIN = { mp3: 24, opus: 12 };
const BITRATE_AWAL = { mp3: 64, opus: 48 };
const CODEC = {
  mp3: { args: (br) => ['-c:a', 'libmp3lame', '-b:a', `${br}k`, '-ac', '1', '-ar', br < 32 ? '24000' : '32000'], ext: 'mp3', mime: 'audio/mpeg' },
  opus: { args: (br) => ['-c:a', 'libopus', '-b:a', `${br}k`, '-ac', '1', '-ar', '24000'], ext: 'ogg', mime: 'audio/ogg' }
};

const API_LRCLIB = 'https://lrclib.net/api';
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

function renderHtmlPlayer({ judul, artis, audioSrc, coverSrc, sourceLabel, caption, lirik }) {
  const nama = String(judul || 'Musik').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const sub = String(artis || 'SHIROWAHD Audio').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const lirikJson = JSON.stringify(Array.isArray(lirik) ? lirik : []);

  return `
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; }
body { margin: 0; background: transparent; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f2e9e4; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 12px; }
.player-wrap { width: 100%; max-width: 360px; margin: auto; }
.player-card { background: linear-gradient(160deg, #111827 0%, #090d16 100%); border: 1px solid rgba(0,255,178,0.2); border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.85); overflow: hidden; padding: 18px; position: relative; }
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
.progressTrack { background: rgba(255,255,255,0.15); height: 4px; border-radius: 2px; cursor: pointer; position: relative; margin-bottom: 6px; }
.progressBar { background: #00ffb2; height: 100%; border-radius: 2px; width: 0%; }
.timeRow { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
.controls { display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 14px; }
.playBtn { background: #00ffb2; color: #090d16; border: none; border-radius: 50%; width: 52px; height: 52px; display: flex; justify-content: center; align-items: center; cursor: pointer; font-size: 18px; font-weight: bold; }
</style>

<div class="player-wrap">
  <div class="player-card">
    <div class="player-header">
      <div class="source-label">${sourceLabel || 'SHIROWAHD MUSIC'}</div>
      <div class="source-channel">${sub}</div>
    </div>
    <div class="cover-box"><img src="${coverSrc || 'https://i.ibb.co/vzN4n4W/thumb.jpg'}" alt="Cover"></div>
    <div class="track-title">${nama}</div>
    <div class="track-artist">${sub}</div>
    <div class="lyricsPreview" id="lyricsBox">
      <div class="lyricsLine active" id="currentLyric">Memutar audio...</div>
    </div>
    <div class="progressTrack" id="track"><div class="progressBar" id="bar"></div></div>
    <div class="timeRow"><span id="curr">0:00</span><span id="dur">0:00</span></div>
    <div class="controls">
      <button class="playBtn" id="btnPlay">▶</button>
    </div>
  </div>
</div>
<audio id="player" src="${audioSrc}"></audio>
<script>
  const aud = document.getElementById('player');
  const btn = document.getElementById('btnPlay');
  const bar = document.getElementById('bar');
  const curr = document.getElementById('curr');
  const dur = document.getElementById('dur');
  const lrcBox = document.getElementById('currentLyric');
  const lrc = ${lirikJson};

  function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  btn.onclick = () => {
    if (aud.paused) {
      aud.play();
      btn.innerText = '⏸';
    } else {
      aud.pause();
      btn.innerText = '▶';
    }
  };

  aud.ontimeupdate = () => {
    curr.innerText = fmt(aud.currentTime);
    dur.innerText = fmt(aud.duration || 0);
    bar.style.width = ((aud.currentTime / (aud.duration || 1)) * 100) + '%';
    if (lrc.length) {
      const match = [...lrc].reverse().find(l => aud.currentTime >= l.time);
      if (match) lrcBox.innerText = match.text;
    }
  };
</script>
`;
}

const pluginConfig = {
  name: 'play2s',
  alias: ['playlirik', 'playmusic', 'player'],
  category: 'music',
  description: 'In-Bubble Music Player dengan Live Lyrics & Custom Meta Primitive',
  usage: '.play2s <judul lagu>',
  example: '.play2s Blue Bird Naruto',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true
};

async function handler(m, { sock }) {
  const query = m.text?.trim();
  if (!query) return m.reply(`🎧 *Format:* \`${m.prefix}play2s <judul lagu / artis>\``);

  await m.react('🕕');

  try {
    const searchRes = await yts(query);
    const video = searchRes?.videos?.[0];
    if (!video) {
      await m.react('❌');
      return m.reply(`❌ Tidak ditemukan lagu untuk: *${query}*`);
    }

    const { downloadSpotify, aio } = await import('../../src/scraper/aio.js');
    let rawAudioUrl = null;

    try {
      const sp = await downloadSpotify(video.title);
      if (sp?.download_url || sp?.url) rawAudioUrl = sp.download_url || sp.url;
    } catch (e) {}

    const htmlPayload = renderHtmlPlayer({
      judul: video.title,
      artis: video.author?.name || 'YouTube Music',
      audioSrc: rawAudioUrl || video.url,
      coverSrc: video.thumbnail,
      sourceLabel: 'SHIROWAHD MUSIC PLAYER',
      caption: `${video.title} - ${video.author?.name || ''}`,
      lirik: []
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
            submessages: [{ messageType: 2, messageText: `Now Playing: ${video.title}` }],
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
    await m.react('🎶');
  } catch (err) {
    console.error('Play2s error:', err);
    await m.reply(`🎵 *Hasil Pencarian:*\nhttps://youtu.be/${video?.videoId || ''}`);
  }
}

export { pluginConfig as config, handler };
