import fs from "fs";
import os from "os";
import path from "path";
import axios from "axios";
import { TeraBoxDL } from "../../src/scraper/terabox.js";

const pluginConfig = {
  name: "terabox",
  alias: ["tb", "tera", "teraboxdl", "tbdl"],
  category: "download",
  description: "Download video/file dari TeraBox",
  usage: ".terabox <url>",
  example: ".terabox https://terabox.com/s/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    m.react("❌");
    return m.reply(
      `📦 *TeraBox Downloader*\n\n` +
        `Download video atau file dari TeraBox.\n\n` +
        `*PENGGUNAAN:*\n` +
        `> *${m.prefix}terabox <link>*\n\n` +
        `*CONTOH:*\n` +
        `> *${m.prefix}terabox https://terabox.com/s/xxx*\n\n` +
        `_File dikirim sebagai dokumen/video_`,
    );
  }

  m.react("🕕");

  try {
    const result = await TeraBoxDL(text);

    if (!result.status) {
      m.react("☢");
      return m.reply(`❌ *TeraBox Gagal*\n\n> ${result.error}`);
    }

    const totalInfo = result.total_files > 1 ? `\n> 📂 Total: ${result.total_files} file (kirim file pertama)` : "";
    let caption =
      `📦 *TeraBox*\n\n` +
      `> 📌 ${result.file_name}\n` +
      `> 📏 Size: ${result.file_size}` +
      totalInfo;

    // Send thumbnail if available
    if (result.thumbnail) {
      try {
        await sock.sendMedia(m.chat, result.thumbnail, caption, m, { type: "image" });
      } catch { /* thumbnail optional */ }
    }

    if (!result.download_url) {
      m.react("❌");
      return m.reply(`❌ *Download URL tidak tersedia*\n\nTerabox mungkin butuh login/cookie untuk file ini.`);
    }

    // Download file from Terabox CDN
    await m.reply("⏳ _Mengunduh file dari TeraBox..._");

    const res = await axios.get(result.download_url, {
      responseType: "arraybuffer",
      timeout: 180000,
      maxContentLength: 200 * 1024 * 1024,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": result.referer || "https://www.terabox.com/",
        "Cookie": result.cookies || "",
        "Accept": "*/*",
      },
    });

    const buffer = Buffer.from(res.data);
    if (buffer.length < 1000) {
      m.react("❌");
      return m.reply("❌ File terlalu kecil atau gagal download. Link mungkin expired.");
    }

    const safeName = (result.file_name || "file").replace(/[<>:"/\\|?*]/g, "_");
    const ext = result.extension || ".mp4";
    const isVideo = result.is_video;

    if (isVideo && buffer.length < 100 * 1024 * 1024) {
      // Send as video if < 100MB
      await sock.sendMessage(m.chat, {
        video: buffer,
        caption,
        mimetype: "video/mp4",
        fileName: safeName,
      }, { quoted: m });
    } else {
      // Send as document
      const mimeMap = {
        ".mp4": "video/mp4", ".mkv": "video/x-matroska", ".avi": "video/x-msvideo",
        ".mov": "video/quicktime", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png", ".pdf": "application/pdf", ".zip": "application/zip",
        ".rar": "application/x-rar-compressed",
      };
      await sock.sendMessage(m.chat, {
        document: buffer,
        mimetype: mimeMap[ext] || "application/octet-stream",
        fileName: safeName,
        caption,
      }, { quoted: m });
    }

    m.react("✅");
  } catch (e) {
    console.error("[terabox]", e.message);
    m.react("☢");
    m.reply("❌ Gagal mengambil data TeraBox: " + (e.message || "coba lagi nanti"));
  }
}

export { pluginConfig as config, handler };
