import fs from "fs";
import os from "os";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { rencanaFps, filterFps, argKeluaranFps, FFMPEG_PUNYA_FPS_MODE } from "../../src/lib/hillz-fps.js";

const FFMPEG_BIN = fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : ffmpegInstaller.path;
ffmpeg.setFfmpegPath(FFMPEG_BIN);

const pluginConfig = {
  name: "hdvid",
  alias: ["hdvideo", "enhancevid", "hdv"],
  category: "tools",
  description: "Meningkatkan kualitas video menjadi HD dengan pure FFMPEG",
  usage: ".hdvid (reply video)",
  example: ".hdvid",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 120,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock }) {
  let isVideoMessage = m.isVideo || (m.quoted && m.quoted.type === "videoMessage");
  let isDocumentMessage = (m.type === "documentMessage" && m.message?.documentMessage?.mimetype?.startsWith("video")) || (m.quoted && m.quoted.type === "documentMessage" && m.quoted.message?.documentMessage?.mimetype?.startsWith("video"));

  if (!isVideoMessage && !isDocumentMessage) {
    let txt = `📹 *HD VIDEO ENHANCER* 📹\n\n`;
    txt += `Halo kak! Punya video yang buram? Aku bisa bantu bikin jadi HD lho!\n\n`;
    txt += `*Cara Pakai:*\n`;
    txt += `👉 Kirim video (atau document video) dengan caption \`${m.prefix}hdvid\`\n`;
    txt += `👉 Atau reply video (atau document video) dengan \`${m.prefix}hdvid\`\n\n`;
    txt += `⚠️ _Fitur Premium, proses bisa memakan waktu tergantung ukuran ya kak!_`;
    return m.reply(txt);
  }

  await m.reply(
    `🎞️ *PROSES ENHANCE DIMULAI* 🎞️\n\n` +
      `> Video sedang diunduh dan diproses ke resolusi HD! ✨\n` +
      `> ⏱️ Estimasi waktu: *1-3 menit* tergantung ukuran video.\n\n` +
      `_Mohon bersabar ya kak, video akan otomatis dikirim setelah selesai._`
  );

  try {
    let videoBuffer = null;
    try {
      videoBuffer = (await m?.quoted?.download?.()) || (await m.download?.());
    } catch {}

    if (!videoBuffer || videoBuffer.length < 1000) {
      const q = m.quoted;
      const msg = q?.message || m.message;
      const target = msg?.ephemeralMessage?.message || msg?.viewOnceMessage?.message || msg?.viewOnceMessageV2?.message || msg;
      const content = target?.videoMessage || target?.documentMessage;
      if (content) {
        try {
          const { downloadContentFromMessage } = await import('hillz');
          const stream = await downloadContentFromMessage(content, target.documentMessage ? 'document' : 'video');
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          videoBuffer = Buffer.concat(chunks);
        } catch {}
      }
    }

    if (!videoBuffer || videoBuffer.length === 0) {
      await m.react("❌");
      return m.reply(`❌ *GAGAL*\n\nAduh kak, videonya gagal diunduh! Coba kirim ulang ya.`);
    }

    if (videoBuffer.length > 50 * 1024 * 1024) {
      await m.react("❌");
      return m.reply(`❌ *FILE TERLALU BESAR*\n\nMaaf kak, maksimal ukuran video cuma 50MB ya!`);
    }

    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input-hd-${Date.now()}.mp4`);
    const outputPath = path.join(tempDir, `output-hd-${Date.now()}.mp4`);

    fs.writeFileSync(inputPath, videoBuffer);

    // fps dibatasi 60 di sini juga. `.hdvid` menaikkan resolusi 2x, dan pada
    // sumber 120 fps itu berarti 4x beban encode untuk frame yang toh dibuang
    // WhatsApp — jadi fps diturunkan DULU, sebelum scale.
    const rFps = rencanaFps(inputPath);
    const filterVideo = [
      filterFps(rFps),
      'scale=iw*2:ih*2:flags=lanczos',
      'unsharp=5:5:1.0:5:5:0.0',
    ].filter(Boolean);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(filterVideo)
        .outputOptions([
          '-c:v libx264', '-preset fast', '-crf 23', '-c:a copy',
          ...argKeluaranFps(rFps, FFMPEG_PUNYA_FPS_MODE),
        ])
        .save(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    const resultBuffer = fs.readFileSync(outputPath);

    await sock.sendMedia(m.chat, resultBuffer, `✨ *PROSES SELESAI* ✨\n\nIni dia hasil videonya kak, udah jauh lebih mulus dan HD kan? 😍`, m, {
      type: "video",
      mimetype: "video/mp4",
      fileName: `HDVID-${Date.now()}.mp4`,
    });

    await m.react("✅");

    try {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
    } catch (e) { /* cleanup */ }
  } catch (err) {
    await m.react("❌");
    await m.reply(`❌ Maaf kak, proses enhance videonya gagal! 😭\n\nDetail: ${err.message}`);
  }
}

export { pluginConfig as config, handler };
