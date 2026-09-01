import fs from "fs";
import path from "path";
import axios from "axios";
import yts from "yt-search";
import { exec } from "child_process";
import { promisify } from "util";
import { queueFFmpeg } from "../../src/lib/hillz-ffmpeg.js";
import { saluranCtx } from "../../src/lib/hillz-context.js";
import { getAssetBuffer } from "../../src/lib/hillz-asset-manager.js";
import ytdl from "../../src/scraper/ytdl.js";

const execAsync = promisify(exec);

const pluginConfig = {
  name: "carilagu",
  alias: ["whatmusic", "shazam", "findsong", "kenallagu", "tebakmusik", "musikapaini", "getmusic", "dlcarilagu"],
  category: "tools",
  description: "Kenali lagu dari reply audio/VN/video & pilih versi via menu interaktif MP3",
  usage: ".carilagu (reply audio/VN/video)",
  example: ".carilagu",
  cooldown: 3,
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

        images = track.get("images", {})
        coverArt = images.get("coverart", images.get("coverarthq", images.get("background", "")))

        result = {
            "status": True,
            "title": track.get("title", "Unknown Title"),
            "artist": track.get("subtitle", "Unknown Artist"),
            "album": meta.get("Album", "-"),
            "release": meta.get("Released", meta.get("Label", "-")),
            "genre": track.get("genres", {}).get("primary", "-"),
            "cover": coverArt
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

// Helper untuk download MP3 via multi-source
async function downloadMp3Buffer(videoUrl) {
  let mp3Buffer = null;

  // Method 1: Scraper API Azbry
  try {
    const res = await axios.get(`https://api.azbry.com/api/download/ytmp3?url=${encodeURIComponent(videoUrl)}`, { timeout: 35000 });
    if (res.data?.status && res.data?.result?.download) {
      const { data } = await axios.get(res.data.result.download, { responseType: "arraybuffer", timeout: 90000 });
      mp3Buffer = Buffer.from(data);
    }
  } catch {}

  // Method 2: ytdl internal
  if (!mp3Buffer) {
    try {
      const dlRes = await ytdl(videoUrl, "mp3");
      if (dlRes?.status && dlRes?.download) {
        const { data } = await axios.get(dlRes.download, { responseType: "arraybuffer", timeout: 90000 });
        mp3Buffer = Buffer.from(data);
      }
    } catch {}
  }

  // Method 3: yt-dlp binary
  if (!mp3Buffer) {
    const tmpAudio = path.join(process.cwd(), "temp", `dl_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);
    try {
      await execAsync(`yt-dlp --extract-audio --audio-format mp3 -o "${tmpAudio}" "${videoUrl}"`, { timeout: 90000 });
      if (fs.existsSync(tmpAudio)) {
        mp3Buffer = fs.readFileSync(tmpAudio);
      }
    } catch {} finally {
      try { if (fs.existsSync(tmpAudio)) fs.unlinkSync(tmpAudio); } catch {}
    }
  }

  return mp3Buffer;
}

// Handler utama saat user mengetik .carilagu atau klik tombol getmusic
async function handler(m, { sock, args, command }) {
  // Jika dipanggil dari tombol interaktif (.getmusic / .dlcarilagu <videoId>)
  if (command === "getmusic" || command === "dlcarilagu") {
    const videoId = args[0]?.trim();
    if (!videoId) return m.reply("❌ ID video tidak ditemukan.");

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    m.react("⏳");
    await m.reply(`⏳ *ᴍᴇɴɢᴜɴᴅᴜʜ ᴀᴜᴅɪᴏ...*\n\n> Mengunduh MP3 dari server YouTube...\n> Harap tunggu sebentar, file akan segera dikirim.`);

    try {
      const mp3Buffer = await downloadMp3Buffer(videoUrl);
      if (!mp3Buffer || !mp3Buffer.length) {
        throw new Error("Gagal mengunduh audio dari server.");
      }

      await sock.sendMessage(
        m.chat,
        {
          audio: mp3Buffer,
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `Audio_${videoId}.mp3`,
          contextInfo: saluranCtx(),
        },
        { quoted: m }
      );

      m.react("🎶");
      return;
    } catch (err) {
      m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴᴅᴜʜ*\n\n> Terjadi kesalahan: _${err.message}_`);
    }
  }

  // Alur identifikasi lagu dari media
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
    const coverUrl = recogResult.cover;

    // Cari versi audio di YouTube (ambil 5 opsi)
    const searchQuery = `${songArtist} - ${songTitle}`;
    const ytSearch = await yts(searchQuery);
    let videos = ytSearch?.videos?.slice(0, 5) || [];

    if (!videos.length) {
      const fbSearch = await yts(songTitle);
      if (fbSearch?.videos?.length) {
        videos = fbSearch.videos.slice(0, 5);
      }
    }

    let bodyText = `🎵 *ʟᴀɢᴜ ᴅɪᴛᴇᴍᴜᴋᴀɴ!*\n\n`;
    bodyText += `╭┈┈⬡「 📋 *ɪɴꜰᴏ ʟᴀɢᴜ* 」\n`;
    bodyText += `┃ 🎶 *Judul:* ${songTitle}\n`;
    bodyText += `┃ 👤 *Artis:* ${songArtist}\n`;
    bodyText += `┃ 💿 *Album:* ${songAlbum}\n`;
    bodyText += `┃ 📅 *Rilis:* ${songRelease}\n`;
    bodyText += `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n`;

    if (videos.length > 0) {
      bodyText += `📋 *ᴘɪʟɪʜᴀɴ ᴠᴇʀsɪ ᴀᴜᴅɪᴏ (${videos.length} ᴛᴇʀsᴇᴅɪᴀ):*\n`;
      videos.forEach((v, idx) => {
        bodyText += `*[${idx + 1}]* ${v.title}\n`;
        bodyText += `   ⏱️ Durasi: \`${v.timestamp || "?"}\` · 👤 Channel: _${v.author?.name || "Unknown"}_\n\n`;
      });
      bodyText += `👇 *Klik tombol menu interaktif di bawah untuk memilih & mengunduh MP3:*`;

      // Buat Baris untuk List Button Interaktif
      const rows = videos.map((v, idx) => ({
        title: `[${idx + 1}] ${v.title.substring(0, 45)}`,
        description: `⏱️ ${v.timestamp || "?"} | 👤 ${v.author?.name || "YouTube"}`,
        id: `${m.prefix}getmusic ${v.videoId}`,
      }));

      const buttons = [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "🎵 PILIH & UNDUH MP3",
            sections: [
              {
                title: `Hasil Pencarian: ${songTitle.substring(0, 30)}`,
                rows,
              },
            ],
          }),
        },
      ];

      // Tambahkan quick reply untuk versi utama jika didukung
      if (videos[0]) {
        buttons.push({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: `🎶 Unduh Versi 1 (${videos[0].timestamp})`,
            id: `${m.prefix}getmusic ${videos[0].videoId}`,
          }),
        });
      }

      // Simpan juga session ketik angka manual sebagai cadangan
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

      // Kirim pesan interaktif dengan cover art / default asset
      const headerSource = coverUrl && coverUrl.startsWith("http") ? coverUrl : getAssetBuffer("hillz");

      try {
        await sock.sendButton(
          m.chat,
          headerSource,
          bodyText,
          m,
          {
            buttons,
            footer: "SHIROWAHD • Music Recognizer",
            contextInfo: saluranCtx(),
          }
        );
      } catch (e) {
        // Fallback jika sendButton gagal
        await sock.sendMessage(
          m.chat,
          {
            text: bodyText + "\n\n_(Ketik angka 1-5 untuk mengunduh)_",
            contextInfo: saluranCtx(),
          },
          { quoted: m }
        );
      }
    } else {
      bodyText += `_Tidak dapat menemukan link unduhan YouTube untuk lagu ini._`;
      await m.reply(bodyText);
    }

    m.react("✅");
  } catch (error) {
    m.react("❌");
    await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> Gagal mengenali lagu: _${error.message}_`);
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
  }
}

// Answer handler untuk menangkap balasan nomor 1-5 (cadangan jika user mengetik angka manual)
export async function carilaguAnswerHandler(m, sock) {
  const rawBody = (m.body || m.text || "").trim();
  if (!rawBody) return false;

  const match = rawBody.match(/^#?\[?([1-5])\]?\.?$/i);
  if (!match) return false;

  const choiceNum = parseInt(match[1], 10);
  const senderJid = m.sender || m.key?.participant || m.chat;

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

  global.carilaguSessions.delete(m.chat + "_" + senderJid);
  global.carilaguSessions.delete(m.chat);
  if (senderJid) global.carilaguSessions.delete(senderJid);

  m.react("⏳");
  await m.reply(`⏳ *ᴍᴇɴɢᴜɴᴅᴜʜ ᴀᴜᴅɪᴏ...*\n\n> Judul: *${selectedSong.title}*\n> Durasi: \`${selectedSong.timestamp}\`\n> Harap tunggu, sedang mengonversi & mengirimkan MP3...`);

  try {
    const mp3Buffer = await downloadMp3Buffer(selectedSong.url);

    if (!mp3Buffer || !mp3Buffer.length) {
      throw new Error("Gagal mengunduh audio dari server. Silakan coba klik tombol atau pilih nomor lain.");
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
