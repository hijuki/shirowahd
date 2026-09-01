import fs from "fs";
import path from "path";
import axios from "axios";
import yts from "yt-search";
import { exec } from "child_process";
import { promisify } from "util";
import { queueFFmpeg } from "../../src/lib/hillz-ffmpeg.js";
import { getAssetBuffer } from "../../src/lib/hillz-asset-manager.js";
import ytdl from "../../src/scraper/ytdl.js";

const execAsync = promisify(exec);

const pluginConfig = {
  name: "carilagu",
  alias: ["whatmusic", "shazam", "findsong", "kenallagu", "tebakmusik", "musikapaini", "getmusic", "dlcarilagu"],
  category: "tools",
  description: "Pencarian universal lagu, DJ TikTok & video converter MP3",
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

// Helper Pencarian Universal YouTube (Original + DJ TikTok + Jedag Jedug + Breakbeat + Slowed)
async function searchUniversalMusic(title, artist) {
  const seenIds = new Set();
  const originalList = [];
  const djTiktokList = [];
  const djRemixList = [];
  const slowedList = [];

  const cleanTitle = title.replace(/[^\w\s]/gi, " ").trim();
  const cleanArtist = artist.replace(/[^\w\s]/gi, " ").trim();

  // Query 1: Original & Official Track
  try {
    const r1 = await yts(`${cleanArtist} - ${cleanTitle}`);
    (r1?.videos || []).slice(0, 4).forEach((v) => {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        originalList.push(v);
      }
    });
  } catch {}

  // Query 2: DJ TikTok Viral & Sound Kane
  try {
    const r2 = await yts(`DJ ${cleanTitle} tiktok viral sound mengkane`);
    (r2?.videos || []).slice(0, 5).forEach((v) => {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        djTiktokList.push(v);
      }
    });
  } catch {}

  // Query 3: DJ Remix Jedag Jedug / Breakbeat / Full Bass
  try {
    const r3 = await yts(`DJ ${cleanTitle} jedag jedug remix breakbeat full bass`);
    (r3?.videos || []).slice(0, 5).forEach((v) => {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        djRemixList.push(v);
      }
    });
  } catch {}

  // Query 4: Slowed Reverb / Speed Up / Vibe
  try {
    const r4 = await yts(`${cleanTitle} slowed reverb speed up`);
    (r4?.videos || []).slice(0, 3).forEach((v) => {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        slowedList.push(v);
      }
    });
  } catch {}

  return {
    original: originalList.slice(0, 4),
    djTiktok: djTiktokList.slice(0, 5),
    djRemix: djRemixList.slice(0, 5),
    slowed: slowedList.slice(0, 3),
    all: [...originalList, ...djTiktokList, ...djRemixList, ...slowedList],
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
    await m.reply(`⏳ *ᴍᴇɴɢᴜɴᴅᴜʜ ᴀᴜᴅɪᴏ...*\n\n> Mengunduh MP3 dari YouTube...\n> Harap tunggu sebentar, file MP3 akan dikirim murni.`);

    try {
      const mp3Buffer = await downloadMp3Buffer(videoUrl);
      if (!mp3Buffer || !mp3Buffer.length) {
        throw new Error("Gagal mengunduh audio dari server.");
      }

      // Kirim MP3 murni TANPA context saluran (audio reguler)
      await sock.sendMessage(
        m.chat,
        {
          audio: mp3Buffer,
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `Audio_${videoId}.mp3`,
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

  // Alur identifikasi lagu dari media (audio, VN, atau video)
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
      `🌐 *ᴘᴇɴᴄᴀʀɪᴀɴ ᴜɴɪᴠᴇʀsᴀʟ ᴍᴜsɪᴋ & ᴅᴊ ᴛɪᴋᴛᴏᴋ*\n\n` +
        `> Identifikasi lagu, DJ TikTok, remix & ekstrak audio video WhatsApp\n\n` +
        `*Cara Penggunaan:*\n` +
        `> 1. Reply pesan audio, VN, atau *video* dengan \`${m.prefix}carilagu\`\n` +
        `> 2. Atau kirim audio/video dengan caption \`${m.prefix}carilagu\``
    );
  }

  m.react("🔍");
  await m.reply(`🔍 *ᴍᴇɴɢɪᴅᴇɴᴛɪꜰɪᴋᴀsɪ ᴍᴜsɪᴋ (ᴘᴇɴᴄᴀʀɪᴀɴ ᴜɴɪᴠᴇʀsᴀʟ)...*\n\n> Memindai sampel gelombang vokal & beat musik...`);

  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempId = Date.now() + "_" + Math.random().toString(36).substring(7);
  const inputExt = isVideo ? "mp4" : "ogg";
  const inputPath = path.join(tempDir, `input_${tempId}.${inputExt}`);
  const outSample1 = path.join(tempDir, `s1_${tempId}.mp3`);
  const outSample2 = path.join(tempDir, `s2_${tempId}.mp3`);
  const outSample3 = path.join(tempDir, `s3_${tempId}.mp3`);

  try {
    const audioBuffer = await downloadFn();

    if (!audioBuffer || !audioBuffer.length) {
      m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴᴅᴜʜ ᴍᴇᴅɪᴀ*\n\n> Tidak dapat mengunduh media dari WhatsApp. Pastikan media belum kadaluarsa.`);
    }

    fs.writeFileSync(inputPath, audioBuffer);

    // Multi-pass extraction untuk video & audio DJ:
    // Pass 1: 0 - 15 detik
    await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -t 15 -vn -ar 44100 -ac 2 -b:a 128k "${outSample1}"`);
    let fileToRecog = fs.existsSync(outSample1) ? outSample1 : inputPath;
    let recogResult = await recognizeAudioFile(fileToRecog);

    // Pass 2: 15 - 35 detik (bagian drop/vokal DJ)
    if (!recogResult.status || !recogResult.title) {
      try {
        await queueFFmpeg(`ffmpeg -y -ss 00:00:15 -i "${inputPath}" -t 18 -vn -ar 44100 -ac 2 -b:a 128k "${outSample2}"`);
        if (fs.existsSync(outSample2)) {
          recogResult = await recognizeAudioFile(outSample2);
        }
      } catch {}
    }

    // Pass 3: 35 - 55 detik
    if (!recogResult.status || !recogResult.title) {
      try {
        await queueFFmpeg(`ffmpeg -y -ss 00:00:35 -i "${inputPath}" -t 18 -vn -ar 44100 -ac 2 -b:a 128k "${outSample3}"`);
        if (fs.existsSync(outSample3)) {
          recogResult = await recognizeAudioFile(outSample3);
        }
      } catch {}
    }

    if (!recogResult.status || !recogResult.title) {
      m.react("❌");
      return m.reply(`❌ *ʟᴀɢᴜ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\n> Tidak dapat mengenali lagu dari audio/video tersebut. Pastikan vokal atau nada lagu terdengar jelas.`);
    }

    const songTitle = recogResult.title;
    const songArtist = recogResult.artist;
    const songAlbum = recogResult.album;
    const songRelease = recogResult.release;
    const coverUrl = recogResult.cover;

    // Pencarian Universal (Original + DJ TikTok + DJ Remix + Slowed)
    const uni = await searchUniversalMusic(songTitle, songArtist);
    const sections = [];
    const allList = uni.all;

    if (uni.djTiktok.length > 0) {
      sections.push({
        title: "🔥 Versi DJ TikTok & Viral Mengkane",
        rows: uni.djTiktok.map((v, i) => ({
          title: `[TIKTOK ${i + 1}] ${v.title.substring(0, 42)}`,
          description: `⏱️ ${v.timestamp || "?"} · 👤 ${v.author?.name || "TikTok DJ"}`,
          id: `${m.prefix}getmusic ${v.videoId}`,
        })),
      });
    }

    if (uni.djRemix.length > 0) {
      sections.push({
        title: "🎧 Versi DJ Remix & Jedag-Jedug Full Bass",
        rows: uni.djRemix.map((v, i) => ({
          title: `[REMIX ${i + 1}] ${v.title.substring(0, 42)}`,
          description: `⏱️ ${v.timestamp || "?"} · 👤 ${v.author?.name || "DJ Remix"}`,
          id: `${m.prefix}getmusic ${v.videoId}`,
        })),
      });
    }

    if (uni.original.length > 0) {
      sections.push({
        title: "🎶 Versi Original & Official Track",
        rows: uni.original.map((v, i) => ({
          title: `[ORI ${i + 1}] ${v.title.substring(0, 42)}`,
          description: `⏱️ ${v.timestamp || "?"} · 👤 ${v.author?.name || "Official"}`,
          id: `${m.prefix}getmusic ${v.videoId}`,
        })),
      });
    }

    if (uni.slowed.length > 0) {
      sections.push({
        title: "✨ Versi Slowed / Reverb / Speed Up",
        rows: uni.slowed.map((v, i) => ({
          title: `[VIBE ${i + 1}] ${v.title.substring(0, 42)}`,
          description: `⏱️ ${v.timestamp || "?"} · 👤 ${v.author?.name || "Vibe"}`,
          id: `${m.prefix}getmusic ${v.videoId}`,
        })),
      });
    }

    let bodyText = `🌐 *ᴘᴇɴᴄᴀʀɪᴀɴ ᴜɴɪᴠᴇʀsᴀʟ ᴍᴜsɪᴋ & ᴅᴊ*\n\n`;
    bodyText += `╭┈┈⬡「 📋 *ɪɴꜰᴏ ʟᴀɢᴜ* 」\n`;
    bodyText += `┃ 🎶 *Judul:* ${songTitle}\n`;
    bodyText += `┃ 👤 *Artis:* ${songArtist}\n`;
    bodyText += `┃ 💿 *Album:* ${songAlbum}\n`;
    bodyText += `┃ 📅 *Rilis:* ${songRelease}\n`;
    bodyText += `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n`;

    bodyText += `🔥 *Hasil Penelusuran Universal:*\n`;
    if (uni.djTiktok.length) bodyText += `> 📱 *DJ TikTok Viral:* ${uni.djTiktok.length} versi\n`;
    if (uni.djRemix.length) bodyText += `> 🎧 *DJ Remix / JJ:* ${uni.djRemix.length} versi\n`;
    if (uni.original.length) bodyText += `> 🎶 *Original Track:* ${uni.original.length} versi\n`;
    if (uni.slowed.length) bodyText += `> ✨ *Slowed / Vibe:* ${uni.slowed.length} versi\n\n`;
    bodyText += `👇 *Klik tombol menu di bawah untuk memilih & mengunduh MP3:*`;

    const buttons = [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "🌐 PILIH VERSI MP3 / DJ TIKTOK",
          sections,
        }),
      },
    ];

    // Quick reply untuk DJ TikTok / Remix terpopuler
    if (uni.djTiktok[0]) {
      buttons.push({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: `📱 Unduh DJ TikTok (${uni.djTiktok[0].timestamp})`,
          id: `${m.prefix}getmusic ${uni.djTiktok[0].videoId}`,
        }),
      });
    } else if (uni.djRemix[0]) {
      buttons.push({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: `🎧 Unduh DJ Remix (${uni.djRemix[0].timestamp})`,
          id: `${m.prefix}getmusic ${uni.djRemix[0].videoId}`,
        }),
      });
    } else if (uni.original[0]) {
      buttons.push({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: `🎶 Unduh Original (${uni.original[0].timestamp})`,
          id: `${m.prefix}getmusic ${uni.original[0].videoId}`,
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
          footer: "SHIROWAHD • Pencarian Universal",
        }
      );
    } catch (e) {
      await sock.sendMessage(
        m.chat,
        {
          text: bodyText,
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
    try { if (fs.existsSync(outSample1)) fs.unlinkSync(outSample1); } catch {}
    try { if (fs.existsSync(outSample2)) fs.unlinkSync(outSample2); } catch {}
    try { if (fs.existsSync(outSample3)) fs.unlinkSync(outSample3); } catch {}
  }
}

// Answer handler cadangan
export async function carilaguAnswerHandler(m, sock) {
  const rawBody = (m.body || m.text || "").trim();
  if (!rawBody) return false;

  const match = rawBody.match(/^#?\[?([1-9]|1[0-7])\]?\.?$/i);
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
  await m.reply(`⏳ *ᴍᴇɴɢᴜɴᴅᴜʜ ᴀᴜᴅɪᴏ...*\n\n> Judul: *${selectedSong.title}*\n> Durasi: \`${selectedSong.timestamp}\`\n> Harap tunggu, mengirimkan berkas MP3...`);

  try {
    const mp3Buffer = await downloadMp3Buffer(selectedSong.url);

    if (!mp3Buffer || !mp3Buffer.length) {
      throw new Error("Gagal mengunduh audio dari server.");
    }

    // Kirim MP3 murni TANPA context saluran
    await sock.sendMessage(
      m.chat,
      {
        audio: mp3Buffer,
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: `${selectedSong.title}.mp3`,
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
