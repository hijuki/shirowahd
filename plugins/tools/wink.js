import winkEnhance from "../../src/scraper/wink.js";

const pluginConfig = {
  name: "wink",
  alias: ["winkenhance", "winkhd", "wenhance"],
  category: "tools",
  description: "Meningkatkan kualitas video menjadi Ultra HD dengan Wink AI",
  usage: ".wink (reply video)",
  example: ".wink",
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
    return m.reply(
      `✨ *ᴡɪɴᴋ ᴠɪᴅᴇᴏ ᴇɴʜᴀɴᴄᴇʀ*\n\n` +
        `> Bikin video buram jadi *Ultra HD* pakai AI Wink!\n\n` +
        `*Cara pakai:*\n` +
        `> Kirim/reply video lalu caption \`${m.prefix}wink\`\n\n` +
        `⚠️ _Fitur Premium, proses estimasi 1-5 menit tergantung durasi video_`,
    );
  }

  await m.reply(
    `✨ *PROSES WINK ENHANCE DIMULAI* ✨\n\n` +
      `> Video sedang dikirim dan diproses AI Wink ke *Ultra HD* 🎬\n` +
      `> ⏱️ Estimasi waktu: *1-5 menit* tergantung durasi video.\n\n` +
      `_Mohon tunggu ya, bot akan langsung mengirimkan hasilnya._`
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
      return m.reply(`❌ *GAGAL*\n\nVideonya gagal diunduh, coba kirim ulang ya!`);
    }

    if (videoBuffer.length > 50 * 1024 * 1024) {
      await m.react("❌");
      return m.reply(`❌ *FILE TERLALU BESAR*\n\nMaksimal ukuran video cuma *50MB* ya!`);
    }

    const result = await winkEnhance(videoBuffer, {
      filename: `wink-${Date.now()}.mp4`,
    });

    await sock.sendMedia(m.chat, result.resultUrl, `✨ *ᴡɪɴᴋ ᴇɴʜᴀɴᴄᴇ sᴇʟᴇsᴀɪ!*\n\n> Ini dia hasilnya, udah jadi *Ultra HD* kan? 😍`, m, {
      type: "video",
      mimetype: "video/mp4",
      fileName: `WINK-HD-${Date.now()}.mp4`,
    });

    await m.react("✅");
  } catch (err) {
    console.log(err);
    await m.react("❌");
    await m.reply(`❌ Proses Wink enhance gagal! Coba lagi nanti ya 😭`);
  }
}

export { pluginConfig as config, handler };
