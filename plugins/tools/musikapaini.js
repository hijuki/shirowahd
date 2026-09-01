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
      `🎵 *ᴄᴀʀɪ ʟᴀɢᴜ (ᴍᴜsɪᴄ ʀᴇᴄᴏɢɴɪᴛɪᴏɴ)*

` +
        `> Identifikasi judul lagu dari audio/voice note/video WhatsApp

` +
        `*Cara Penggunaan:*
` +
        `> 1. Reply pesan audio, VN, atau video dengan \`${m.prefix}carilagu\`
` +
        `> 2. Atau kirim audio/video dengan caption \`${m.prefix}carilagu\``
    );
  }

  m.react("🔍");
  await m.reply(`🔍 *ᴍᴇɴɢɪᴅᴇɴᴛɪꜰɪᴋᴀsɪ ʟᴀɢᴜ...*

> Sedang mengunduh audio & mencocokkan dengan database Shazam...`);

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
      return m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴᴅᴜʜ ᴍᴇᴅɪᴀ*

> Tidak dapat mengunduh audio dari WhatsApp. Pastikan media belum kadaluarsa.`);
    }

    fs.writeFileSync(inputPath, audioBuffer);

    // Konversi cuplikan audio 15 detik ke mp3 bersih
    await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -t 15 -vn -ar 44100 -ac 2 -b:a 128k "${outputPath}"`);
    const fileToRecognize = fs.existsSync(outputPath) ? outputPath : inputPath;

    // Jalankan Shazam Engine
    const recogResult = await recognizeAudioFile(fileToRecognize);

    if (!recogResult.status || !recogResult.title) {
      m.react("❌");
      return m.reply(`❌ *ʟᴀɢᴜ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*

> Tidak dapat mengenali lagu dari audio tersebut. Pastikan sampel lagu terdengar jelas & minim noise.`);
    }

    const songTitle = recogResult.title;
    const songArtist = recogResult.artist;
    const songAlbum = recogResult.album;
    const songRelease = recogResult.release;

    // Cari versi audio di YouTube
    const searchQuery = `${songArtist} - ${songTitle}`;
    const ytSearch = await yts(searchQuery);
    let videos = ytSearch?.videos?.slice(0, 5) || [];

    if (!videos.length) {
      const fbSearch = await yts(songTitle);
      if (fbSearch?.videos?.length) {
        videos = fbSearch.videos.slice(0, 5);
      }
    }

    let text = `🎵 *ʟᴀɢᴜ ᴅɪᴛᴇᴍᴜᴋᴀɴ!*

`;
    text += `╭┈┈⬡「 📋 *ɪɴꜰᴏ ʟᴀɢᴜ* 」
`;
    text += `┃ 🎶 *Judul:* ${songTitle}
`;
    text += `┃ 👤 *Artis:* ${songArtist}
`;
    text += `┃ 💿 *Album:* ${songAlbum}
`;
    text += `┃ 📅 *Rilis:* ${songRelease}
`;
    text += `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡

`;

    if (videos.length > 0) {
      text += `📋 *ᴘɪʟɪʜᴀɴ ᴠᴇʀsɪ ᴀᴜᴅɪᴏ (${videos.length} ᴛᴇʀsᴇᴅɪᴀ):*
`;
      videos.forEach((v, idx) => {
        text += `*[${idx + 1}]* ${v.title}
`;
        text += `   ⏱️ Durasi: \`${v.timestamp || "?"}\` · 👤 Channel: _${v.author?.name || "Unknown"}_

`;
      });
      text += `💬 *Ketik/Balas angka (1-${videos.length}) untuk mengirim audio MP3 ke WhatsApp ini.*`;

      // Simpan session selama 5 menit
      const sessionKey = m.chat + "_" + m.sender;
      global.carilaguSessions.set(sessionKey, {
        results: videos,
        chat: m.chat,
        sender: m.sender,
        songInfo: { title: songTitle, artist: songArtist },
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
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
    await m.reply(`❌ *ᴇʀʀᴏʀ*

> Gagal mengenali lagu: _${error.message}_`);
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
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
  await m.reply(`⏳ *ᴍᴇɴɢᴜɴᴅᴜʜ ᴀᴜᴅɪᴏ...*

> Mengunduh: *${selectedSong.title}*
> Durasi: \`${selectedSong.timestamp}\`
> Harap tunggu sebentar, file MP3 akan segera dikirim...`);

  try {
    let mp3Buffer = null;

    // Coba download menggunakan ytdl internal
    try {
      const dlRes = await ytdl(selectedSong.url, "mp3");
      if (dlRes?.status && dlRes?.download) {
        const { data } = await axios.get(dlRes.download, { responseType: "arraybuffer", timeout: 120000 });
        mp3Buffer = Buffer.from(data);
      }
    } catch {}

    // Fallback downloader via alternative API
    if (!mp3Buffer) {
      try {
        const res = await axios.get(`https://api.azbry.com/api/download/ytmp3?url=${encodeURIComponent(selectedSong.url)}`, { timeout: 30000 });
        if (res.data?.status && res.data?.result?.download) {
          const { data } = await axios.get(res.data.result.download, { responseType: "arraybuffer", timeout: 120000 });
          mp3Buffer = Buffer.from(data);
        }
      } catch {}
    }

    // Fallback ke yt-dlp jika direct link scraper dibatasi
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
      throw new Error("Gagal mengunduh audio. Silakan coba lagi atau pilih nomor lain.");
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
    await m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴᴅᴜʜ*

> Terjadi kesalahan saat mengunduh MP3: _${err.message}_`);
    return true;
  }
}

export { pluginConfig as config, handler };
