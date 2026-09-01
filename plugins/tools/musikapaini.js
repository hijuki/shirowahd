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
  description: "Pencarian universal lagu, DJ TikTok, & audio converter dengan engine Shazam & YouTube",
  usage: ".carilagu <judul/lirik> atau reply audio/video",
  example: ".carilagu dj dingin keringetan",
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

global.carilaguSessions = global.carilaguSessions || new Map();

// Helper untuk Shazam recognition yang akurat (tanpa false-positive tempo liar)
async function recognizeAudioAccurate(filePath) {
  const scriptContent = `
import asyncio, json, sys, os, subprocess
from shazamio import Shazam

async def test_file(shazam, target_path):
    try:
        res = await shazam.recognize(target_path)
        track = res.get("track", {})
        if track and track.get("title"):
            sections = track.get("sections", [])
            meta = {}
            for s in sections:
                if s.get("type") == "SONG":
                    for m in s.get("metadata", []):
                        meta[m.get("title")] = m.get("text")

            images = track.get("images", {})
            coverArt = images.get("coverart", images.get("coverarthq", images.get("background", "")))

            return {
                "status": True,
                "title": track.get("title", "Unknown Title"),
                "artist": track.get("subtitle", "Unknown Artist"),
                "album": meta.get("Album", "-"),
                "release": meta.get("Released", meta.get("Label", "-")),
                "genre": track.get("genres", {}).get("primary", "-"),
                "cover": coverArt
            }
    except:
        pass
    return None

async def main():
    shazam = Shazam()
    input_file = sys.argv[1]
    
    # 1. Coba scan audio normal (1.0x)
    r = await test_file(shazam, input_file)
    if r:
        print(json.dumps(r))
        return

    # 2. Coba vocal filter (potong low bass jedag jedug tanpa merusak nada)
    vocal_out = f"/tmp/voc_{os.getpid()}.mp3"
    subprocess.run(f"ffmpeg -y -i {input_file} -af 'highpass=f=200,lowpass=f=4000' {vocal_out}", shell=True, capture_output=True)
    r = await test_file(shazam, vocal_out)
    try: os.unlink(vocal_out)
    except: pass
    if r:
        print(json.dumps(r))
        return

    # 3. Coba toleransi tempo wajar (0.95x & 1.05x)
    for sp in [0.95, 1.05]:
        out_sp = f"/tmp/sp_{sp}_{os.getpid()}.mp3"
        subprocess.run(f"ffmpeg -y -i {input_file} -filter:a 'atempo={sp}' {out_sp}", shell=True, capture_output=True)
        r = await test_file(shazam, out_sp)
        try: os.unlink(out_sp)
        except: pass
        if r:
            print(json.dumps(r))
            return

    print(json.dumps({"status": False, "msg": "No track found"}))

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

// Helper Pencarian Universal YouTube
async function searchUniversalMusic(title, artist = "") {
  const seenIds = new Set();
  const originalList = [];
  const djTiktokList = [];
  const djRemixList = [];
  const slowedList = [];

  const cleanTitle = (title || "").replace(/[^\w\s]/gi, " ").trim();
  const cleanArtist = (artist || "").replace(/[^\w\s]/gi, " ").trim();
  const baseQuery = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;

  // Query 1: DJ TikTok Viral & Sound Kane
  try {
    const r1 = await yts(`DJ ${baseQuery} tiktok viral sound mengkane`);
    (r1?.videos || []).slice(0, 5).forEach((v) => {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        djTiktokList.push(v);
      }
    });
  } catch {}

  // Query 2: DJ Remix Jedag Jedug / Breakbeat / Full Bass
  try {
    const r2 = await yts(`DJ ${baseQuery} jedag jedug remix breakbeat`);
    (r2?.videos || []).slice(0, 5).forEach((v) => {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        djRemixList.push(v);
      }
    });
  } catch {}

  // Query 3: Original & Official Track
  try {
    const r3 = await yts(`${baseQuery}`);
    (r3?.videos || []).slice(0, 4).forEach((v) => {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId);
        originalList.push(v);
      }
    });
  } catch {}

  // Query 4: Slowed Reverb / Speed Up
  try {
    const r4 = await yts(`${baseQuery} slowed reverb`);
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
    all: [...djTiktokList, ...djRemixList, ...originalList, ...slowedList],
  };
}

// Handler utama saat user mengetik .carilagu
async function handler(m, { sock, args, text, command }) {
  // 1. Download handler dari tombol interaktif (.getmusic / .dlcarilagu <videoId>)
  if (command === "getmusic" || command === "dlcarilagu") {
    const videoId = args[0]?.trim();
    if (!videoId) return m.reply("❌ ID video tidak ditemukan.");

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    m.react("⏳");
    await m.reply(`⏳ *ᴍᴇɴɢᴜɴᴅᴜʜ ᴀᴜᴅɪᴏ...*\n\n> Mengunduh berkas MP3...\n> File akan dikirim langsung sebagai audio MP3.`);

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

  // 2. Jika user menyertakan teks langsung (contoh: .carilagu dj dingin keringetan / .carilagu steven gerrard)
  if (text && text.trim().length > 0) {
    m.react("🔍");
    await m.reply(`🔍 *ᴍᴇɴᴄᴀʀɪ ᴍᴜsɪᴋ ᴜɴɪᴠᴇʀsᴀʟ...*\n\n> Kata Kunci: *${text.trim()}*\n> Memindai DJ TikTok, Jedag-Jedug, & Official Track...`);

    const uni = await searchUniversalMusic(text.trim());
    if (!uni.all.length) {
      m.react("❌");
      return m.reply(`❌ *ʟᴀɢᴜ ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\n> Tidak ada lagu atau remix DJ yang cocok untuk kata kunci: _${text}_`);
    }

    const sections = [];
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
    bodyText += `╭┈┈⬡「 📋 *ɪɴꜰᴏ ᴘᴇɴᴄᴀʀɪᴀɴ* 」\n`;
    bodyText += `┃ 🔍 *Kata Kunci:* ${text.trim()}\n`;
    bodyText += `┃ 📊 *Total Ditemukan:* ${uni.all.length} audio\n`;
    bodyText += `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n`;
    bodyText += `🔥 *Hasil Kategori:*\n`;
    if (uni.djTiktok.length) bodyText += `> 📱 *DJ TikTok Viral:* ${uni.djTiktok.length} versi\n`;
    if (uni.djRemix.length) bodyText += `> 🎧 *DJ Remix / JJ:* ${uni.djRemix.length} versi\n`;
    if (uni.original.length) bodyText += `> 🎶 *Original Track:* ${uni.original.length} versi\n`;
    if (uni.slowed.length) bodyText += `> ✨ *Slowed / Vibe:* ${uni.slowed.length} versi\n\n`;
    bodyText += `👇 *Pilih versi audio MP3 di tombol menu berikut:*`;

    const buttons = [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "🌐 PILIH VERSI MP3 / DJ TIKTOK",
          sections,
        }),
      },
    ];

    if (uni.djTiktok[0]) {
      buttons.push({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: `📱 Unduh DJ TikTok (${uni.djTiktok[0].timestamp})`,
          id: `${m.prefix}getmusic ${uni.djTiktok[0].videoId}`,
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

    const senderJid = m.sender || m.key?.participant || m.chat;
    const sessionData = {
      results: uni.all,
      chat: m.chat,
      sender: senderJid,
      songInfo: { title: text.trim(), artist: "" },
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    global.carilaguSessions.set(m.chat + "_" + senderJid, sessionData);
    global.carilaguSessions.set(m.chat, sessionData);
    if (senderJid) global.carilaguSessions.set(senderJid, sessionData);

    const headerSource = uni.all[0]?.thumbnail || getAssetBuffer("hillz");

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
      await sock.sendMessage(m.chat, { text: bodyText }, { quoted: m });
    }

    m.react("✅");
    return;
  }

  // 3. Alur identifikasi dari media (audio / VN / video)
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
        `*Cara Menggunakan:*\n` +
        `> 1. *Ketik Judul/Lirik:* \`${m.prefix}carilagu <judul / potongan lirik / sound dj>\`\n` +
        `> 2. *Reply Media:* Balas audio/VN/video dengan \`${m.prefix}carilagu\`\n` +
        `> 3. *Kirim Media:* Kirim video/audio dengan caption \`${m.prefix}carilagu\``
    );
  }

  m.react("🔍");
  await m.reply(`🔍 *ᴍᴇɴɢɪᴅᴇɴᴛɪꜰɪᴋᴀsɪ ᴍᴜsɪᴋ...*\n\n> Memindai frekuensi audio & database musik...`);

  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempId = Date.now() + "_" + Math.random().toString(36).substring(7);
  const inputExt = isVideo ? "mp4" : "ogg";
  const inputPath = path.join(tempDir, `input_${tempId}.${inputExt}`);
  const outSample1 = path.join(tempDir, `s1_${tempId}.mp3`);
  const outSample2 = path.join(tempDir, `s2_${tempId}.mp3`);

  try {
    const audioBuffer = await downloadFn();

    if (!audioBuffer || !audioBuffer.length) {
      m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴᴅᴜʜ ᴍᴇᴅɪᴀ*\n\n> Media tidak dapat diunduh dari WhatsApp.`);
    }

    fs.writeFileSync(inputPath, audioBuffer);

    // Ekstraksi 15 detik pertama
    await queueFFmpeg(`ffmpeg -y -i "${inputPath}" -t 15 -vn -ar 44100 -ac 2 -b:a 128k "${outSample1}"`);
    let fileToRecog = fs.existsSync(outSample1) ? outSample1 : inputPath;
    let recogResult = await recognizeAudioAccurate(fileToRecog);

    // Jika belum ketemu, coba detik 15-30
    if (!recogResult.status || !recogResult.title) {
      try {
        await queueFFmpeg(`ffmpeg -y -ss 00:00:15 -i "${inputPath}" -t 15 -vn -ar 44100 -ac 2 -b:a 128k "${outSample2}"`);
        if (fs.existsSync(outSample2)) {
          recogResult = await recognizeAudioAccurate(outSample2);
        }
      } catch {}
    }

    let songTitle = recogResult.title || "";
    let songArtist = recogResult.artist || "";
    let songAlbum = recogResult.album || "-";
    let songRelease = recogResult.release || "-";
    let coverUrl = recogResult.cover || "";

    if (!songTitle) {
      m.react("❌");
      return m.reply(
        `❌ *ᴍᴜsɪᴋ ᴛɪᴅᴀᴋ ᴛᴇʀᴅᴀꜰᴛᴀʀ ᴅɪ ᴅᴀᴛᴀʙᴀsᴇ ʀᴇsᴍɪ*\n\n` +
          `> Audio ini kemungkinan adalah *Sound DJ TikTok / Bootleg Remix / Suara Kreator* yang tidak terdaftar di database global.\n\n` +
          `💡 *Solusi Akurat:* Ketik judul atau potongan lirik lagunya secara langsung:\n` +
          `> \`${m.prefix}carilagu <judul atau potongan kata lirik>\`\n` +
          `> Contoh: \`${m.prefix}carilagu dj dingin keringetan\``
      );
    }

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

    if (uni.djTiktok[0]) {
      buttons.push({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: `📱 Unduh DJ TikTok (${uni.djTiktok[0].timestamp})`,
          id: `${m.prefix}getmusic ${uni.djTiktok[0].videoId}`,
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
      await sock.sendMessage(m.chat, { text: bodyText }, { quoted: m });
    }

    m.react("✅");
  } catch (error) {
    m.react("❌");
    await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> Gagal mengenali lagu: _${error.message}_`);
  } finally {
    try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (fs.existsSync(outSample1)) fs.unlinkSync(outSample1); } catch {}
    try { if (fs.existsSync(outSample2)) fs.unlinkSync(outSample2); } catch {}
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
