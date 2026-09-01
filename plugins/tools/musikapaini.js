import fs from "fs";
import path from "path";
import axios from "axios";
import yts from "yt-search";
import { exec } from "child_process";
import { promisify } from "util";
import { queueFFmpeg } from "../../src/lib/hillz-ffmpeg.js";
import { saluranCtx } from "../../src/lib/hillz-context.js";
import ytdl from "../../src/scraper/ytdl.js";

const execAsync = promisify(exec);

const pluginConfig = {
  name: "carilagu",
  alias: ["whatmusic", "shazam", "findsong", "kenallagu", "tebakmusik", "musikapaini"],
  category: "tools",
  description: "Kenali lagu dari reply audio/VN/video dan unduh MP3 pilihan ke WhatsApp",
  usage: ".carilagu (reply audio/VN/video)",
  example: ".carilagu",
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

global.carilaguSessions = global.carilaguSessions || new Map();

// Helper untuk mengenali lagu menggunakan Shazam engine lokal
async function recognizeAudioFile(filePath) {
  const scriptContent = `
import asyncio, json, sys
from shazamio import Shazam

async def main():
    try:
        shazam = Shazam()
        res = await shazam.recognize(sys.argv[1])
        track = res.get("track", {})
        if not track:
            print(json.dumps({"status": False, "msg": "No track found"}))
            return

        sections = track.get("sections", [])
        meta = {}
        for s in sections:
            if s.get("type") == "SONG":
                for m in s.get("metadata", []):
                    meta[m.get("title")] = m.get("text")

        result = {
            "status": True,
            "title": track.get("title", "Unknown Title"),
            "artist": track.get("subtitle", "Unknown Artist"),
            "album": meta.get("Album", "-"),
            "release": meta.get("Released", meta.get("Label", "-")),
            "genre": track.get("genres", {}).get("primary", "-")
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"status": False, "error": str(e)}))

asyncio.run(main())
`;

  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const pyScriptPath = path.join(tempDir, `shazam_${Date.now()}_${Math.random().toString(36).substring(7)}.py`);
  fs.writeFileSync(pyScriptPath, scriptContent);

  try {
    const { stdout } = await execAsync(`python3 "${pyScriptPath}" "${filePath}"`, { timeout: 30000 });
    const parsed = JSON.parse(stdout.trim());
    return parsed;
  } catch (err) {
    return { status: false, error: err.message };
  } finally {
    try { if (fs.existsSync(pyScriptPath)) fs.unlinkSync(pyScriptPath); } catch {}
  }
}

// Handler utama saat user mengetik .carilagu
async function handler(m, { sock }) {
  let downloadFn = null;
  let isVideo = false;

  const selfIsVideo = m.isVideo || m.type === "videoMessage" || m.message?.videoMessage;
  const selfIsAudio = m.isAudio || m.type === "audioMessage" || m.message?.audioMessage;
  
  const quotedIsVideo = m.quoted && (
    m.quoted.isVideo || 
    m.quoted.type === "videoMessage" || 
    m.quoted.mtype === "videoMessage" ||
    m.quoted.message?.videoMessage
  );
  const quotedIsAudio = m.quoted && (
    m.quoted.isAudio || 
    m.quoted.type === "audioMessage" || 
    m.quoted.mtype === "audioMessage" ||
    m.quoted.message?.audioMessage ||
    m.quoted.message?.documentMessage
  );

  if (quotedIsVideo) {
    downloadFn = m.quoted.download.bind(m.quoted);
    isVideo = true;
  } else if (quotedIsAudio) {
    downloadFn = m.quoted.download.bind(m.quoted);
  } else if (selfIsVideo) {
    downloadFn = m.download.bind(m);
    isVideo = true;
  } else if (selfIsAudio) {
    downloadFn = m.download.bind(m);
  }

  if (!downloadFn) {
    return m.reply(
      `🎵 *ᴄᴀʀɪ ʟᴀɢᴜ (ᴍᴜsɪᴄ ʀᴇᴄᴏɢɴɪᴛɪᴏɴ)*\n\n` +
        `> Identifikasi judul lagu dari audio/voice note/video WhatsApp\n\n` +
        `*Cara Penggunaan:*\n` +
        `> 1. Reply pesan audio, VN, atau video dengan \`${m.prefix}carilagu\`\n` +
        `> 2. Atau kirim audio/video dengan caption \`${m.prefix}carilagu\``
    );
  }

  m.react("🔍");
  await m.reply(`🔍 *ᴍᴇɴɢɪᴅᴇɴᴛɪꜰɪᴋᴀsɪ ʟᴀɢᴜ...*\n\n> Sedang mengunduh audio & mencocokkan dengan database Shazam...`);

  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempId = Date.now() + "_" + Math.random().toString(36).substring(7);
  const inputExt = isVideo ? "mp4" : "ogg";
  const inputPath = path.join(tempDir, `input_${tempId}.${inputExt}`);
  const outputPath = path.join(tempDir, `sample_${tempId}.mp3`);

  try {
    const audioBuffer = await downloadFn();

    if (!audioBuffer || !audioBuffer.length) {
      m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴᴅᴜʜ ᴍᴇᴅɪᴀ*\n\n> Tidak dapat mengunduh audio dari WhatsApp. Pastikan media belum kadaluarsa.`);
    }

    fs.writeFileSync(inputPath, audioBuffer);

    // Konversi cuplikan audio 15 detik ke mp3 bersih
    await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -t 15 -vn -ar 44100 -ac 2 -b:a 128k "${outputPath}"`);
    const fileToRecognize = fs.existsSync(outputPath) ? outputPath : inputPath;

    // Jalankan Shazam Engine
    const recogResult = await recognizeAudioFile(fileToRecognize);

    if (!recogResult.status || !recogResult.title) {
      m.react("❌");
      return m.reply(`❌ *ʟᴀɢᴜ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\n> Tidak dapat mengenali lagu dari audio tersebut. Pastikan sampel lagu terdengar jelas & minim noise.`);
    }

    const songTitle = recogResult.title;
    const songArtist = recogResult.artist;
    const songAlbum = recogResult.album;
    const songRelease = recogResult.release;

    // Cari versi audio di YouTube (ambil 3-5 opsi)
    const searchQuery = `${songArtist} - ${songTitle}`;
    const ytSearch = await yts(searchQuery);
    let videos = ytSearch?.videos?.slice(0, 5) || [];

    if (!videos.length) {
      const fbSearch = await yts(songTitle);
      if (fbSearch?.videos?.length) {
        videos = fbSearch.videos.slice(0, 5);
      }
    }

    let text = `🎵 *ʟᴀɢᴜ ᴅɪᴛᴇᴍᴜᴋᴀɴ!*\n\n`;
    text += `╭┈┈⬡「 📋 *ɪɴꜰᴏ ʟᴀɢᴜ* 」\n`;
    text += `┃ 🎶 *Judul:* ${songTitle}\n`;
    text += `┃ 👤 *Artis:* ${songArtist}\n`;
    text += `┃ 💿 *Album:* ${songAlbum}\n`;
    text += `┃ 📅 *Rilis:* ${songRelease}\n`;
    text += `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n`;

    if (videos.length > 0) {
      text += `📋 *ᴘɪʟɪʜᴀɴ ᴠᴇʀsɪ ᴀᴜᴅɪᴏ (${videos.length} ᴛᴇʀsᴇᴅɪᴀ):*\n`;
      videos.forEach((v, idx) => {
        text += `*[${idx + 1}]* ${v.title}\n`;
        text += `   ⏱️ Durasi: \`${v.timestamp || "?"}\` · 👤 Channel: _${v.author?.name || "Unknown"}_\n\n`;
      });
      text += `💬 *Ketik angka (1-${videos.length}) untuk langsung mengirim audio MP3 ke chat ini.*`;

      // Simpan session aktif di berbagai key agar kompatibel grup & private chat
      const senderJid = m.sender || m.key?.participant || m.chat;
      const sessionData = {
        results: videos,
        chat: m.chat,
        sender: senderJid,
        songInfo: { title: songTitle, artist: songArtist },
        expiresAt: Date.now() + 5 * 60 * 1000,
      };

      global.carilaguSessions.set(m.chat + "_" + senderJid, sessionData);
      global.carilaguSessions.set(m.chat, sessionData);
      if (senderJid) global.carilaguSessions.set(senderJid, sessionData);
    } else {
      text += `_Tidak dapat menemukan link unduhan YouTube untuk lagu ini._`;
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
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
  }
}

// Answer handler untuk menangkap balasan nomor 1-5 dari user
export async function carilaguAnswerHandler(m, sock) {
  const rawBody = (m.body || m.text || "").trim();
  if (!rawBody) return false;

  // Cek apakah pesan berupa angka 1 sampai 5
  const match = rawBody.match(/^#?\[?([1-5])\]?\.?$/i);
  if (!match) return false;

  const choiceNum = parseInt(match[1], 10);
  const senderJid = m.sender || m.key?.participant || m.chat;

  // Cari session aktif
  let session = global.carilaguSessions?.get(m.chat + "_" + senderJid);
  if (!session) session = global.carilaguSessions?.get(m.chat);
  if (!session && senderJid) session = global.carilaguSessions?.get(senderJid);

  if (!session) return false;

  if (Date.now() > session.expiresAt) {
    global.carilaguSessions.delete(m.chat + "_" + senderJid);
    global.carilaguSessions.delete(m.chat);
    if (senderJid) global.carilaguSessions.delete(senderJid);
    return false;
  }

  if (choiceNum < 1 || choiceNum > session.results.length) {
    return false;
  }

  const selectedSong = session.results[choiceNum - 1];

  // Hapus session agar tidak terpanggil ganda
  global.carilaguSessions.delete(m.chat + "_" + senderJid);
  global.carilaguSessions.delete(m.chat);
  if (senderJid) global.carilaguSessions.delete(senderJid);

  m.react("⏳");
  await m.reply(`⏳ *ᴍᴇɴɢᴜɴᴅᴜʜ ᴀᴜᴅɪᴏ...*\n\n> Judul: *${selectedSong.title}*\n> Durasi: \`${selectedSong.timestamp}\`\n> Harap tunggu, sedang mengonversi & mengirimkan MP3...`);

  try {
    let mp3Buffer = null;

    // Metode 1: Scraper API Azbry ytmp3
    try {
      const res = await axios.get(`https://api.azbry.com/api/download/ytmp3?url=${encodeURIComponent(selectedSong.url)}`, { timeout: 35000 });
      if (res.data?.status && res.data?.result?.download) {
        const { data } = await axios.get(res.data.result.download, { responseType: "arraybuffer", timeout: 90000 });
        mp3Buffer = Buffer.from(data);
      }
    } catch {}

    // Metode 2: ytdl scraper internal
    if (!mp3Buffer) {
      try {
        const dlRes = await ytdl(selectedSong.url, "mp3");
        if (dlRes?.status && dlRes?.download) {
          const { data } = await axios.get(dlRes.download, { responseType: "arraybuffer", timeout: 90000 });
          mp3Buffer = Buffer.from(data);
        }
      } catch {}
    }

    // Metode 3: yt-dlp binary langsung di VPS
    if (!mp3Buffer) {
      const tmpAudio = path.join(process.cwd(), "temp", `dl_${Date.now()}.mp3`);
      try {
        await execAsync(`yt-dlp --extract-audio --audio-format mp3 -o "${tmpAudio}" "${selectedSong.url}"`, { timeout: 90000 });
        if (fs.existsSync(tmpAudio)) {
          mp3Buffer = fs.readFileSync(tmpAudio);
        }
      } catch {} finally {
        try { if (fs.existsSync(tmpAudio)) fs.unlinkSync(tmpAudio); } catch {}
      }
    }

    if (!mp3Buffer || !mp3Buffer.length) {
      throw new Error("Gagal mengunduh audio dari server. Silakan coba pilih nomor lainnya.");
    }

    await sock.sendMessage(
      m.chat,
      {
        audio: mp3Buffer,
        mimetype: "audio/mpeg",
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
