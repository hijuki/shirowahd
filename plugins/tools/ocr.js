import te from "../../src/lib/hillz-error.js";
import { sendToolsPreview } from "../../src/lib/hillz-context.js";

// Dulu: `import * as _tesseract from "tesseract.js"` — impor STATIS.
// Akibatnya tesseract.js dimuat pada SETIAP boot bot walau `.ocr` tidak pernah
// dipakai, dan runtime emscripten-nya menulis 31 baris peringatan
// "Blocking on the main thread is very dangerous" ke main-error.log. Panel admin
// membaca berkas log itu, jadi peringatan itulah yang mengotori panel — bukan
// galat, cuma kebisingan yang menutupi galat sungguhan.
//
// Sekarang dimuat saat dipakai. Hasilnya dicache supaya `.ocr` kedua tidak
// mengimpor ulang.
let _tesseract = null;
async function getTesseract() {
  if (!_tesseract) _tesseract = await import("tesseract.js");
  return _tesseract;
}
const pluginConfig = {
  name: "ocr",
  alias: ["totext", "imagetotext", "readtext"],
  category: "tools",
  description: "Extract teks dari gambar (Offline/Local)",
  usage: ".ocr (reply gambar)",
  example: ".ocr",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};
async function handler(m, { sock }) {
  const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");
  if (!isImage) {
    return m.reply(
      `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
        `> Reply gambar dengan \`${m.prefix}ocr\`\n\n` +
        `> Media yang didukung:\n` +
        `> JPG, PNG, GIF, WEBP`,
    );
  }
  await m.react("🕕");
  await m.reply(`🕕 *ᴍᴇᴍᴘʀᴏsᴇs...*\n\n> Mengekstrak teks dari gambar...`);
  try {
    let buffer;
    if (m.quoted && m.quoted.isMedia) {
      buffer = await m.quoted.download();
    } else if (m.isMedia) {
      buffer = await m.download();
    }
    if (!buffer || buffer.length === 0) {
      await m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Tidak dapat download gambar`);
    }
    const Tesseract = await getTesseract();
    const {
      data: { text },
    } = await Tesseract.recognize(buffer, "eng", {});
    const extractedText = text ? text.trim() : "";
    if (!extractedText || extractedText.length === 0) {
      await m.react("❌");
      return m.reply(
        `❌ *ᴛɪᴅᴀᴋ ᴀᴅᴀ ᴛᴇᴋs*\n\n> Tidak ada teks yang terdeteksi di gambar`,
      );
    }
    await m.react("✅");
    const responseText =
      `📖 *ᴏᴄʀ ʀᴇsᴜʟᴛ*\n\n` +
      `╭┈┈⬡「 📝 *ᴛᴇᴋs* 」\n` +
      `${extractedText
        .split("\n")
        .map((l) => `┃ ${l}`)
        .join("\n")}\n` +
      `╰┈┈┈┈┈┈┈┈⬡\n\n` +
      `> Total: ${extractedText.length} karakter`;
    await sendToolsPreview(
      sock,
      m.chat,
      responseText,
      "📖 *ᴏᴄʀ*",
      `${extractedText.length} chars`,
      { quoted: m },
    );
  } catch (e) {
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}
export { pluginConfig as config, handler };
