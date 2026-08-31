import instagramDownloader from "../../src/scraper/ig.js";
import fs from "fs";
import { ambilVideoHD, ringkasKualitas } from "../../src/lib/hillz-hdmedia.js";
const pluginConfig = {
  name: "instagramdl",
  alias: ["igdl", "ig", "instagram"],
  category: "download",
  description: "Download video/foto Instagram",
  usage: ".instagramdl <url>",
  example: ".instagramdl https://www.instagram.com/reel/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const IG_REGEX = /instagram\.com\/(p|reel|reels|stories|tv)\//i;

async function handler(m, { sock }) {
  const url = m.text?.trim();

  if (!url) {
    return m.reply(
      `📸 *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
        `> \`${m.prefix}igdl <url>\`\n\n` +
        `*ᴄᴏɴᴛᴏʜ:*\n` +
        `> \`${m.prefix}igdl https://www.instagram.com/reel/xxx\`\n` +
        `> \`${m.prefix}igdl https://www.instagram.com/p/xxx\``,
    );
  }

  if (!IG_REGEX.test(url)) {
    return m.reply(
      `❌ URL tidak valid. Gunakan link Instagram (reel/post/story).`,
    );
  }

  await m.react("🕕");

  try {
    const result = await instagramDownloader(url);

    if (!result?.media?.length) {
      await m.react("❌");
      return m.reply(`❌ Gagal mengambil media. Coba link lain.`);
    }

    const isStory = url.includes("/stories/");
    let caption = `📸 *Instagram ${isStory ? "Story" : "Downloader"}*\n\n`;
    if (result.username && result.username !== "-") {
      caption += `👤 *Author*: @${result.username}\n`;
    }
    if (result.caption) {
      caption += `📝 *Caption*:\n${result.caption}\n`;
    }
    caption = caption.trim();

    for (const item of result.media) {
      if (item.type === "video" || item.type === "mp4") {
        // Dulu `{ video: { url } }` langsung: Baileys mengunduh sendiri, jadi
        // tidak ada kesempatan memeriksa codec. Reel Instagram kadang HEVC dan
        // WhatsApp tidak bisa memutarnya. Sekarang diunduh dulu, dipastikan
        // H.264 tanpa menurunkan resolusi, baru dikirim.
        let siap;
        try {
          siap = await ambilVideoHD([item], { referer: "https://www.instagram.com/" });
        } catch {
          siap = null;
        }
        if (siap) {
          try {
            await sock.sendMessage(
              m.chat,
              { video: { url: siap.path }, caption: caption ? caption + `\n🎬 ${ringkasKualitas(siap)}` : "" },
              { quoted: m },
            );
          } finally {
            if (siap.temp) { try { fs.unlinkSync(siap.path); } catch {} }
          }
        } else {
          // Kalau penyiapan gagal, kirim apa adanya — lebih baik terkirim
          // daripada gagal total.
          await sock.sendMessage(
            m.chat,
            { video: { url: item.url }, caption },
            { quoted: m },
          );
        }
      } else {
        await sock.sendMessage(
          m.chat,
          { image: { url: item.url }, caption },
          { quoted: m },
        );
      }
      caption = "";
    }

    await m.react("✅");
  } catch (err) {
    await m.react("❌");
    return m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴᴅᴜʜ*\n\n> ${err.message}`);
  }
}

export { pluginConfig as config, handler };
