import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import yts from "yt-search";
import { downloadMediaMessage } from "hillz";
import { queueFFmpeg } from "../../src/lib/hillz-ffmpeg.js";
import hillzApi from "../../src/lib/hillz-apimanager.js";
import { saluranCtx } from "../../src/lib/hillz-context.js";
import ytdl from "../../src/scraper/ytdl.js";

const pluginConfig = {
  name: "carilagu",
  alias: ["whatmusic", "shazam", "findsong", "kenallagu", "tebakmusik"],
  category: "tools",
  description: "Kenali lagu dari reply audio/VN dan unduh MP3 pilihan ke WhatsApp",
  usage: ".carilagu (reply audio/video)",
  example: ".carilagu",
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

// Global active sessions storage for song search choices
global.carilaguSessions = global.carilaguSessions || new Map();

async function uploadToUploader(buffer, filename = "audio.mp3") {
  const form = new FormData();
  form.append("file", buffer, {
    filename,
    contentType: "application/octet-stream",
  });

  const res = await axios.post("https://c.termai.cc/api/upload?key=AIzaBj7z2z3xBjsk", form, {
    headers: form.getHeaders(),
    timeout: 60000,
  });

  if (!res.data?.status && !res.data?.path && !res.data?.url) {
    throw new Error("Gagal mengupload sampel audio ke server");
  }
  return res.data;
}

// Handler utama saat user mengetik .carilagu
async function handler(m, { sock }) {
  let audioBuffer = null;
  let filename = "audio.mp3";

  if (m.quoted?.message) {
    const quotedMsg = m.quoted.message;
    const audioMsg = quotedMsg.audioMessage || quotedMsg.videoMessage || quotedMsg.documentMessage;

    if (audioMsg) {
      try {
        audioBuffer = await downloadMediaMessage(
          { key: m.quoted.key, message: quotedMsg },
          "buffer",
          {},
        );
        filename = audioMsg.fileName || (quotedMsg.videoMessage ? "video.mp4" : "audio.mp3");
      } catch {}
    }
  }

  if (!audioBuffer && m.message) {
    const audioMsg = m.message.audioMessage || m.message.videoMessage || m.message.documentMessage;
    if (audioMsg) {
      try {
        audioBuffer = await m.download();
        filename = audioMsg.fileName || (m.message.videoMessage ? "video.mp4" : "audio.mp3");
      } catch {}
    }
  }

  if (!audioBuffer) {
    return m.reply(
      "🎵 *ᴄᴀʀɪ ʟᴀɢᴜ (ᴍᴜsɪᴄ ʀᴇᴄᴏɢɴɪᴛɪᴏɴ)*\n\n" +
        "> Identifikasi judul lagu dari audio/voice note/video WhatsApp\n\n" +
        "*Cara Penggunaan:*\n" +
        `> 1. Reply pesan audio, VN, atau video dengan \`${m.prefix}carilagu\`\n` +
        `> 2. Atau kirim audio/video dengan caption \`${m.prefix}carilagu\``
    );
  }

  m.react("🔍");
  await m.reply("🔍 *ᴍᴇɴɢɪᴅᴇɴᴛɪꜰɪᴋᴀsɪ ʟᴀɢᴜ...*\n\n> Memproses sampel audio dan mencocokkan database...");

  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempId = Date.now() + "_" + Math.random().toString(36).substring(7);
  const inputAudio = path.join(tempDir, `sample_${tempId}.bin`);
  const outputAudio = path.join(tempDir, `sample_${tempId}.mp3`);

  try {
    fs.writeFileSync(inputAudio, audioBuffer);

    // Potong 15 detik pertama dengan bitrate bersih untuk recognition yang cepat
    await queueFFmpeg(`ffmpeg -y -i "${inputAudio}" -t 15 -vn -ar 44100 -ac 2 -b:a 128k "${outputAudio}"`);

    const sampleBuffer = fs.existsSync(outputAudio) ? fs.readFileSync(outputAudio) : audioBuffer;

    // Upload sample ke uploader
    const audioUpload = await uploadToUploader(sampleBuffer, "sample.mp3");

    // Identifikasi via API Neoxr WhatMusic
    const data = await hillzApi.neoxr.whatMusic(
      {
        url: audioUpload,
        apikey: process.env.API_KEY || "Milik-Bot-OurinMD",
      },
      { timeout: 60000 }
    );

    if (!data?.status || !data?.data) {
      m.react("❌");
      return m.reply("❌ *ʟᴀɢᴜ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\n> Tidak dapat mengenali lagu dari audio tersebut. Pastikan suara musik terdengar jelas dan tidak terlalu bising.");
    }

    const music = data.data;
    const songTitle = music.title || "Unknown Title";
    const songArtist = music.artist || "Unknown Artist";
    const songAlbum = music.album || "-";
    const songRelease = music.release || "-";

    // Cari versi audio di YouTube (minimal 3 pilihan)
    const searchQuery = `${songArtist} - ${songTitle}`;
    const ytSearch = await yts(searchQuery);
    let videos = ytSearch?.videos?.slice(0, 5) || [];

    if (!videos.length) {
      const fbSearch = await yts(songTitle);
      if (fbSearch?.videos?.length) {
        videos = fbSearch.videos.slice(0, 5);
      }
    }

    let text = "🎵 *ʟᴀɢᴜ ᴅɪᴛᴇᴍᴜᴋᴀɴ!*\n\n";
    text += "╭┈┈⬡「 📋 *ɪɴꜰᴏ ʟᴀɢᴜ* 」\n";
    text += `┃ 🎶 *Judul:* ${songTitle}\n`;
    text += `┃ 👤 *Artis:* ${songArtist}\n`;
    text += `┃ 💿 *Album:* ${songAlbum}\n`;
    text += `┃ 📅 *Rilis:* ${songRelease}\n`;
    text += "╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n";

    if (videos.length > 0) {
      text += `📋 *ᴘɪʟɪʜᴀɴ ᴠᴇʀsɪ ᴀᴜᴅɪᴏ (${videos.length} ᴛᴇʀsᴇᴅɪᴀ):*\n`;
      videos.forEach((v, idx) => {
        text += `*[${idx + 1}]* ${v.title}\n`;
        text += `   ⏱️ Durasi: \`${v.timestamp || "?"}\` · 👤 Channel: _${v.author?.name || "Unknown"}_\n\n`;
      });
      text += `💬 *Ketik/Balas angka (1-${videos.length}) untuk mengirim audio MP3 ke WhatsApp ini.*`;

      // Simpan session
      const sessionKey = m.chat + "_" + m.sender;
      global.carilaguSessions.set(sessionKey, {
        results: videos,
        chat: m.chat,
        sender: m.sender,
        songInfo: { title: songTitle, artist: songArtist },
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
    } else {
      text += "_Tidak dapat menemukan link unduhan YouTube untuk lagu ini._";
    }

    await sock.sendMessage(
      m.chat,
      {
        text,
        contextInfo: saluranCtx(),
      },
      { quoted: m }
    );

    m.react("✅");
  } catch (error) {
    m.react("❌");
    await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> Gagal mengenali lagu: _${error.message}_`);
  } finally {
    try { if (fs.existsSync(inputAudio)) fs.unlinkSync(inputAudio); } catch {}
    try { if (fs.existsSync(outputAudio)) fs.unlinkSync(outputAudio); } catch {}
  }
}

// Answer handler untuk menangkap balasan nomor 1, 2, 3 dari user
export async function carilaguAnswerHandler(m, sock) {
  if (!m.body) return false;

  const text = m.body.trim();
  const sessionKey = m.chat + "_" + m.sender;
  const session = global.carilaguSessions?.get(sessionKey);

  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    global.carilaguSessions.delete(sessionKey);
    return false;
  }

  const choiceNum = parseInt(text, 10);
  if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > session.results.length) {
    return false;
  }

  const selectedSong = session.results[choiceNum - 1];
  global.carilaguSessions.delete(sessionKey);

  m.react("⏳");
  await m.reply(`⏳ *ᴍᴇɴɢᴜɴᴅᴜʜ ᴀᴜᴅɪᴏ...*\n\n> Mengunduh: *${selectedSong.title}*\n> Durasi: \`${selectedSong.timestamp}\`\n> Harap tunggu sebentar, file MP3 akan segera dikirim...`);

  try {
    let mp3Buffer = null;

    // Coba download menggunakan ytdl
    try {
      const dlRes = await ytdl(selectedSong.url, "mp3");
      if (dlRes?.status && dlRes?.download) {
        const { data } = await axios.get(dlRes.download, { responseType: "arraybuffer", timeout: 120000 });
        mp3Buffer = Buffer.from(data);
      }
    } catch {}

    // Fallback API download ytmp3
    if (!mp3Buffer) {
      const res = await axios.get(`https://api.azbry.com/api/download/ytmp3?url=${encodeURIComponent(selectedSong.url)}`, { timeout: 60000 });
      if (res.data?.status && res.data?.result?.download) {
        const { data } = await axios.get(res.data.result.download, { responseType: "arraybuffer", timeout: 120000 });
        mp3Buffer = Buffer.from(data);
      }
    }

    if (!mp3Buffer || !mp3Buffer.length) {
      throw new Error("Gagal mengunduh berkas audio dari server");
    }

    await sock.sendMessage(
      m.chat,
      {
        audio: mp3Buffer,
        mimetype: "audio/mp4",
        ptt: false,
        fileName: `${selectedSong.title}.mp3`,
        contextInfo: saluranCtx(),
      },
      { quoted: m }
    );

    m.react("🎶");
    return true;
  } catch (err) {
    m.react("❌");
    await m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴᴅᴜʜ*\n\n> Terjadi kesalahan saat mengunduh MP3: _${err.message}_`);
    return true;
  }
}

export { pluginConfig as config, handler };
