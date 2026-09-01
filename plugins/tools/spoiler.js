
const pluginConfig = {
  name: "spoiler",
  alias: ["blur", "viewonce", "rahasia"],
  category: "tools",
  description: "Mengirim gambar atau video dengan efek spoiler / tap-to-reveal",
  usage: ".spoiler [reply foto/video]",
  example: ".spoiler [reply media]",
  isOwner: false,
  isPremium: false,
  isGroup: false,
};

async function handler(m, { sock, args, text, command }) {
  const quoted = m.quoted ? m.quoted : m;
  const mime = quoted.mimetype || "";

  if (!/image|video/.test(mime)) {
    return m.reply(`Balas (reply) sebuah foto atau video dengan pesan *${m.prefix + command}* [caption opsional]`);
  }

  try {
    m.react?.("⏳");
    const mediaBuffer = await quoted.download();
    if (!mediaBuffer) return m.reply("Gagal mengunduh berkas media");

    await sock.sendSpoiler(m.chat, mediaBuffer, text || quoted.text || "", m, {
      mimetype: mime,
    });
    m.react?.("✨");
  } catch (err) {
    console.error("[SpoilerPlugin] Error:", err);
    m.reply("Gagal mengirim media spoiler: " + err.message);
  }
}

export default {
  config: pluginConfig,
  handler,
};
