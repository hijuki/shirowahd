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
  description: "Kenali lagu/DJ dari reply audio/VN & pilih versi Original/DJ/Jedag-Jedug via menu interaktif",
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

// Helper multi-pencarian YouTube (Original + DJ Remix + Slowed)
async function searchWideMusic(title, artist) {
  const seenIds = new Set();
  const originalList = [];
  const djList = [];
  const otherList = [];

  // Query 1: Original / Official
  try {
    const res1 = await yts(`${artist} - ${title}`);
    (res1?.videos || []).slice(0, 5).forEach((v) => {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        originalList.push(v);
      }
    });
  } catch {}

  // Query 2: DJ Remix / Jedag Jedug / Breakbeat
  try {
    const res2 = await yts(`DJ ${title} remix full bass jedag jedug`);
    (res2?.videos || []).slice(0, 5).forEach((v) => {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        djList.push(v);
      }
    });
  } catch {}

  // Query 3: DJ TikTok / Slowed / Speed Up
  try {
    const res3 = await yts(`DJ ${artist} ${title} tiktok viral`);
    (res3?.videos || []).slice(0, 4).forEach((v) => {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        djList.push(v);
      }
    });
  } catch {}

  // Query 4: Slowed & Reverb
  try {
    const res4 = await yts(`${title} slowed reverb`);
    (res4?.videos || []).slice(0, 3).forEach((v) => {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        otherList.push(v);
      }
    });
  } catch {}

  return {
    original: originalList.slice(0, 4),
    dj: djList.slice(0, 5),
    other: otherList.slice(0, 3),
    all: [...originalList, ...djList, ...otherList]
  };
}

// Handler utama saat user mengetik .carilagu atau klik tombol getmusic
async function handler(m, { sock, args, command }) {
  // Jika dipanggil dari tombol interaktif (.getmusic / .dlcarilagu <videoId>)
  if (command === "getmusic" || command === "dlcarilagu") {
    const videoId = args[0]?.trim();
    if (!videoId) return m.reply("❌ ID video tidak ditemukan.");

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    m.react("⏳");
    await m.reply(`⏳ *ᴍᴇɴɢᴜɴᴅᴜʜ ᴀᴜᴅɪᴏ...*\n\n> Mengunduh MP3 dari YouTube...\n> Harap tunggu sebentar, file akan segera dikirim.`);

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
      `🎵 *ᴄᴀʀɪ ʟᴀɢᴜ & ᴅᴊ ʀᴇᴍɪx (ᴍᴜsɪᴄ ʀᴇᴄᴏɢɴɪᴛɪᴏɴ)*\n\n` +
        `> Identifikasi judul lagu & DJ Remix dari audio/voice note/video WhatsApp\n\n` +
        `*Cara Penggunaan:*\n` +
        `> 1. Reply pesan audio, VN, atau video dengan \`${m.prefix}carilagu\`\n` +
        `> 2. Atau kirim audio/video dengan caption \`${m.prefix}carilagu\``
    );
  }

  m.react("🔍");
  await m.reply(`🔍 *ᴍᴇɴɢɪᴅᴇɴᴛɪꜰɪᴋᴀsɪ ʟᴀɢᴜ...*\n\n> Sedang memindai sampel audio, vokal & beat remix...`);

  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempId = Date.now() + "_" + Math.random().toString(36).substring(7);
  const inputExt = isVideo ? "mp4" : "ogg";
  const inputPath = path.join(tempDir, `input_${tempId}.${inputExt}`);
  const outputPath = path.join(tempDir, `sample_${tempId}.mp3`);
  const outputMidPath = path.join(tempDir, `sample_mid_${tempId}.mp3`);

  try {
    const audioBuffer = await downloadFn();

    if (!audioBuffer || !audioBuffer.length) {
      m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴᴅᴜʜ ᴍᴇᴅɪᴀ*\n\n> Tidak dapat mengunduh audio dari WhatsApp. Pastikan media belum kadaluarsa.`);
    }

    fs.writeFileSync(inputPath, audioBuffer);

    // 1. Coba sampel awal 15 detik
    await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -t 15 -vn -ar 44100 -ac 2 -b:a 128k "${outputPath}"`);
    let fileToRecognize = fs.existsSync(outputPath) ? outputPath : inputPath;
    let recogResult = await recognizeAudioFile(fileToRecognize);

    // 2. Jika sampel awal gagal (sering terjadi pada DJ yang intro-nya lama), coba potong dari detik 15-30
    if (!recogResult.status || !recogResult.title) {
      try {
        await queueFFmpeg(`ffmpeg -y -ss 00:00:15 -i "${inputPath}" -t 15 -vn -ar 44100 -ac 2 -b:a 128k "${outputMidPath}"`);
        if (fs.existsSync(outputMidPath)) {
          recogResult = await recognizeAudioFile(outputMidPath);
        }
      } catch {}
    }

    if (!recogResult.status || !recogResult.title) {
      m.react("❌");
      return m.reply(`❌ *ʟᴀɢᴜ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\n> Tidak dapat mengenali lagu dari audio tersebut. Pastikan vokal/melodi lagu terdengar cukup jelas.`);
    }

    const songTitle = recogResult.title;
    const songArtist = recogResult.artist;
    const songAlbum = recogResult.album;
    const songRelease = recogResult.release;
    const coverUrl = recogResult.cover;

    // Pencarian luas (Original + DJ Remix + Slowed)
    const wideResults = await searchWideMusic(songTitle, songArtist);
    const sections = [];
    const allList = wideResults.all;

    if (wideResults.original.length > 0) {
      sections.push({
        title: "🎶 Versi Original & Official",
        rows: wideResults.original.map((v, i) => ({
          title: `[ORI ${i + 1}] ${v.title.substring(0, 42)}`,
          description: `⏱️ ${v.timestamp || "?"} · 👤 ${v.author?.name || "YouTube"}`,
          id: `${m.prefix}getmusic ${v.videoId}`,
        })),
      });
    }

    if (wideResults.dj.length > 0) {
      sections.push({
        title: "🎧 Versi DJ Remix & Jedag-Jedug",
        rows: wideResults.dj.map((v, i) => ({
          title: `[DJ ${i + 1}] ${v.title.substring(0, 42)}`,
          description: `⏱️ ${v.timestamp || "?"} · 👤 ${v.author?.name || "DJ Remix"}`,
          id: `${m.prefix}getmusic ${v.videoId}`,
        })),
      });
    }

    if (wideResults.other.length > 0) {
      sections.push({
        title: "✨ Versi Slowed / Reverb / Speed Up",
        rows: wideResults.other.map((v, i) => ({
          title: `[VIBE ${i + 1}] ${v.title.substring(0, 42)}`,
          description: `⏱️ ${v.timestamp || "?"} · 👤 ${v.author?.name || "Remix"}`,
          id: `${m.prefix}getmusic ${v.videoId}`,
        })),
      });
    }

    let bodyText = `🎵 *ʟᴀɢᴜ & ᴅᴊ ʀᴇᴍɪx ᴅɪᴛᴇᴍᴜᴋᴀɴ!*\n\n`;
    bodyText += `╭┈┈⬡「 📋 *ɪɴꜰᴏ ʟᴀɢᴜ* 」\n`;
    bodyText += `┃ 🎶 *Judul:* ${songTitle}\n`;
    bodyText += `┃ 👤 *Artis:* ${songArtist}\n`;
    bodyText += `┃ 💿 *Album:* ${songAlbum}\n`;
    bodyText += `┃ 📅 *Rilis:* ${songRelease}\n`;
    bodyText += `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n`;

    bodyText += `🔥 *Koleksi Versi Tersedia:*\n`;
    bodyText += `> 🎶 *Original:* ${wideResults.original.length} versi\n`;
    bodyText += `> 🎧 *DJ Remix / JJ:* ${wideResults.dj.length} versi\n`;
    bodyText += `> ✨ *Slowed / Vibe:* ${wideResults.other.length} versi\n\n`;
    bodyText += `👇 *Klik tombol menu di bawah untuk memilih versi MP3:*`;

    const buttons = [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "🎧 PILIH VERSI MP3 / DJ REMIX",
          sections,
        }),
      },
    ];

    // Quick reply untuk DJ Remix terpopuler
    if (wideResults.dj[0]) {
      buttons.push({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: `🎧 Unduh DJ Remix (${wideResults.dj[0].timestamp})`,
          id: `${m.prefix}getmusic ${wideResults.dj[0].videoId}`,
        }),
      });
    } else if (wideResults.original[0]) {
      buttons.push({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: `🎶 Unduh Versi Original`,
          id: `${m.prefix}getmusic ${wideResults.original[0].videoId}`,
        }),
      });
    }

    // Simpan session
    const senderJid = m.sender || m.key?.participant || m.chat;
    const sessionData = {
      results: allList,
      chat: m.chat,
      sender: senderJid,
      songInfo: { title: songTitle, artist: songArtist },
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    global.carilaguSessions.set(m.chat + "_" + senderJid, sessionData);
    global.carilaguSessions.set(m.chat, sessionData);
    if (senderJid) global.carilaguSessions.set(senderJid, sessionData);

    const headerSource = coverUrl && coverUrl.startsWith("http") ? coverUrl : getAssetBuffer("hillz");

    try {
      await sock.sendButton(
        m.chat,
        headerSource,
        bodyText,
        m,
        {
          buttons,
          footer: "SHIROWAHD • DJ & Music Recognizer",
          contextInfo: saluranCtx(),
        }
      );
    } catch (e) {
      await sock.sendMessage(
        m.chat,
        {
          text: bodyText,
          contextInfo: saluranCtx(),
        },
        { quoted: m }
      );
    }

    m.react("✅");
  } catch (error) {
    m.react("❌");
    await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> Gagal mengenali lagu: _${error.message}_`);
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    try { if (fs.existsSync(outputMidPath)) fs.unlinkSync(outputMidPath); } catch {}
  }
}

// Answer handler cadangan
export async function carilaguAnswerHandler(m, sock) {
  const rawBody = (m.body || m.text || "").trim();
  if (!rawBody) return false;

  const match = rawBody.match(/^#?\[?([1-9]|1[0-2])\]?\.?$/i);
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
      throw new Error("Gagal mengunduh audio dari server.");
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
