import { aiodl } from "../../src/scraper/aio.js";
import te from "../../src/lib/hillz-error.js";
import { saluranCtx } from "../../src/lib/hillz-context.js";
import fs from "fs";
import { ambilVideoHD, ringkasKualitas } from "../../src/lib/hillz-hdmedia.js";

const pluginConfig = {
  name: "aio",
  alias: ["allinone", "download", "dl"],
  category: "downloader",
  description:
    "All in one downloader (IG, TikTok, FB, Twitter, YouTube, Pinterest, CapCut, dll)",
  usage: ".aio <url>",
  example: ".aio https://instagram.com/p/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const url = m.text?.trim();

  if (!url) {
    return m.reply(
      `📥 *ᴀʟʟ ɪɴ ᴏɴᴇ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
        `> Download dari berbagai platform!\n\n` +
        `╭┈┈⬡「 🌐 *ᴘʟᴀᴛꜰᴏʀᴍ* 」\n` +
        `┃ • Instagram\n` +
        `┃ • TikTok\n` +
        `┃ • Facebook\n` +
        `┃ • Twitter/X\n` +
        `┃ • YouTube\n` +
        `┃ • Pinterest\n` +
        `┃ • CapCut\n` +
        `┃ • Threads / Reddit\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `> *Contoh:* ${m.prefix}aio https://instagram.com/p/xxx`,
    );
  }

  if (!url.startsWith("http")) {
    return m.reply(`❌ URL tidak valid! Harus dimulai dengan http/https`);
  }

  await m.react("🕕");

  try {
    const result = await aiodl(url);

    if (!result?.media?.length) {
      await m.react("❌");
      return m.reply(`❌ Gagal mengambil media. Pastikan URL valid.`);
    }

    const ctxInfo = saluranCtx();

    // `break` di akhir loop berarti hanya item PERTAMA yang dikirim. Untuk video
    // itu justru yang kita mau — tapi kandidat video harus dipilih berdasarkan
    // kualitas, bukan urutan kemunculan. Semua kandidat video dikumpulkan dulu.
    const kandidatVideo = result.media.filter((x) => x.type === "video");
    if (kandidatVideo.length) {
      const siap = await ambilVideoHD(kandidatVideo, {
        basis: kandidatVideo.find((x) => x.basis)?.basis,
      });
      try {
        await sock.sendMedia(
          m.chat,
          siap.path,
          (result.title ? result.title + "\n" : "") + `📺 ${ringkasKualitas(siap)}`,
          m,
          { type: "video", contextInfo: ctxInfo },
        );
      } finally {
        if (siap.temp) { try { fs.unlinkSync(siap.path); } catch {} }
      }
      await m.react("✅");
      return;
    }

    for (const item of result.media) {
      if (item.type === "video") {
        await sock.sendMedia(m.chat, item.url, result.title || null, m, {
          type: "video",
          contextInfo: ctxInfo,
        });
      } else if (item.type === "audio") {
        await sock.sendMessage(
          m.chat,
          {
            audio: { url: item.url },
            mimetype: "audio/mpeg",
            contextInfo: ctxInfo,
          },
          { quoted: m },
        );
      } else {
        await sock.sendMedia(m.chat, item.url, result.title || null, m, {
          type: "image",
          contextInfo: ctxInfo,
        });
      }
      break;
    }

    await m.react("✅");
  } catch (error) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
