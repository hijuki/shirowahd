import { getVideoFile, getBundleFiles, isBundle, deleteVideo } from "../../src/lib/vid-store.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import { isOwner as checkOwner } from "../../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS_FILE = join(__dirname, "..", "..", "admin-settings.json");

const VIDEO_AS_DOCUMENT_DEFAULT_MB = 180;

function loadSettings() {
  try {
    if (existsSync(SETTINGS_FILE)) return JSON.parse(readFileSync(SETTINGS_FILE, "utf8"));
  } catch {}
  return {};
}

function saveSettings(s) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2), "utf8");
}

let cachedGroupJids = {};

function sendTelegramClaim(text) {
  const s = loadSettings();
  if (!s.telegramBotToken || !s.telegramChatId || !s.telegramNotifyClaim) return;
  const body = JSON.stringify({ chat_id: s.telegramChatId, text, parse_mode: "HTML" });
  const req = https.request({
    hostname: "api.telegram.org",
    path: "/bot" + s.telegramBotToken + "/sendMessage",
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
  });
  req.on("error", () => {});
  req.end(body);
}

async function getGroupJid(sock, inviteCode) {
  if (cachedGroupJids[inviteCode]) return cachedGroupJids[inviteCode];
  try {
    const info = await sock.groupGetInviteInfo(inviteCode);
    if (info && info.id) { cachedGroupJids[inviteCode] = info.id; return info.id; }
  } catch {}
  return null;
}

function isOwner(m) {
  const sender = (m.sender || "").replace(/@.+/, "");
  if (checkOwner(sender)) return true;
  const settings = loadSettings();
  const ownerNum = settings.ownerWhatsapp || "";
  return ownerNum && sender === ownerNum;
}

function getClaimGroups() {
  const settings = loadSettings();
  if (settings.claimGroups && settings.claimGroups.length > 0) return settings.claimGroups;
  if (settings.claimGroup) return [settings.claimGroup];
  const groups = settings.groups || [];
  if (groups.length > 0) return groups;
  return [{ name: 'Default', link: 'https://chat.whatsapp.com/L4J6dYuP3bX0aNzmMW6pnp' }];
}

function getInviteCodes() {
  return getClaimGroups().map(g => {
    const parts = (g.link || '').split('/');
    return parts[parts.length - 1];
  }).filter(Boolean);
}

const IMAGE_MIME_MAP = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
  ".tiff": "image/tiff", ".svg": "image/svg+xml",
};

function isImage(name) {
  const ext = extname(name || "").toLowerCase();
  return ext in IMAGE_MIME_MAP;
}

function getImageMimeType(name) {
  const ext = extname(name || "").toLowerCase();
  return IMAGE_MIME_MAP[ext] || "image/jpeg";
}

export const config = {
  name: "claim",
  alias: ["klaim", "ambil"],
  category: "claim",
  description: "Ambil berkas yang sudah diupload lewat kodenya",
  usage: ".claim KODE (bisa beberapa: .claim AB CD EF)",
  help: "Claim file yang sudah diupload. Gunakan: .claim KODE atau .claim AB CD EF",
};

export async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) {
    return m.reply(
      `🔑 *CARA KLAIM MEDIA HD*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `> Masukkan 6 digit kode yang kamu dapat dari web uploader.\n\n` +
      `*Contoh:* \`${m.prefix}claim A8K2Z\`\n` +
      `*Banyak:* \`${m.prefix}claim A8K2Z B9X1C\``
    );
  }

  const isGc = m.from?.endsWith("@g.us");
  const owner = isOwner(m);
  const claimGroups = getClaimGroups();
  const inviteCodes = getInviteCodes();

  // .claim on
  if (text.toLowerCase() === 'on') {
    if (!owner) return m.reply('⚠️ *Akses Ditolak:* Hanya owner yang dapat mengaktifkan fitur claim di grup ini.');
    if (!isGc) return m.reply('⚠️ *Perhatian:* Perintah ini hanya dapat dijalankan di dalam grup WhatsApp.');
    try {
      const meta = await sock.groupMetadata(m.from);
      const groupName = meta?.subject || 'Grup WhatsApp';
      const inviteResp = await sock.groupInviteCode(m.from);
      const link = 'https://chat.whatsapp.com/' + inviteResp;
      const settings = loadSettings();
      const cgs = settings.claimGroups || (settings.claimGroup ? [settings.claimGroup] : []);
      if (cgs.some(g => g.link.includes(inviteResp))) {
        let alreadyMsg = `ℹ️ *GRUP CLAIM SUDAH AKTIF*\n`;
        alreadyMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
        alreadyMsg += `👥 *Grup:* ${groupName}\n`;
        alreadyMsg += `🔗 *Link:* ${link}\n`;
        alreadyMsg += `⚡ *Status:* Sudah terdaftar & siap digunakan.\n`;
        alreadyMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
        alreadyMsg += `> Ketik \`.claim <KODE>\` untuk mengklaim video HD.`;
        return m.reply(alreadyMsg);
      }
      cgs.push({ name: groupName, link, visible: true });
      settings.claimGroups = cgs;
      saveSettings(settings);
      cachedGroupJids = {};

      let successMsg = `✅ *SUKSES MENDAFTARKAN GRUP CLAIM*\n`;
      successMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      successMsg += `👥 *Nama Grup:* ${groupName}\n`;
      successMsg += `🔗 *Invite Link:* ${link}\n`;
      successMsg += `⚡ *Status:* *Aktif & Terdaftar* 🟢\n`;
      successMsg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
      successMsg += `📝 *Petunjuk:*\n`;
      successMsg += `> Member grup sekarang dapat mengunduh video HD dengan format: \`.claim <KODE>\`\n`;
      successMsg += `> Cek daftar seluruh grup aktif: \`.listgrup\``;
      return m.reply(successMsg);
    } catch (e) {
      return m.reply('❌ *Gagal mengaktifkan claim:* ' + e.message);
    }
  }

  // .claim off
  if (text.toLowerCase() === 'off') {
    if (!owner) return m.reply('⚠️ *Akses Ditolak:* Hanya owner yang dapat menonaktifkan fitur claim di grup ini.');
    if (!isGc) return m.reply('⚠️ *Perhatian:* Perintah ini hanya dapat dijalankan di dalam grup WhatsApp.');
    try {
      const settings = loadSettings();
      const cgs = settings.claimGroups || (settings.claimGroup ? [settings.claimGroup] : []);
      const inviteResp = await sock.groupInviteCode(m.from);
      const filtered = cgs.filter(g => !g.link.includes(inviteResp));
      if (filtered.length === cgs.length) {
        return m.reply('⚠️ *Grup ini belum terdaftar* di dalam daftar grup claim aktif.');
      }
      settings.claimGroups = filtered;
      saveSettings(settings);
      cachedGroupJids = {};

      let offMsg = `🗑️ *GRUP CLAIM DINONAKTIFKAN*\n`;
      offMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      offMsg += `⚡ *Status:* Grup berhasil dihapus dari daftar claim.\n`;
      offMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      offMsg += `> Member tidak dapat lagi melakukan claim di grup ini.`;
      return m.reply(offMsg);
    } catch (e) {
      return m.reply('❌ *Gagal menonaktifkan claim:* ' + e.message);
    }
  }

  const codes = text.toUpperCase().split(/\s+/).filter(Boolean);

  if (!owner && isGc) {
    let allowed = false;
    for (const ic of inviteCodes) {
      const jid = await getGroupJid(sock, ic);
      if (jid === m.from) { allowed = true; break; }
    }
    if (!allowed) {
      const groupLinks = claimGroups.map(g => `> ◦ *${g.name}:* ${g.link}`).join('\n');
      return m.reply(
        `⚠️ *Claim Tidak Aktif di Grup Ini*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `Silakan klaim di salah satu grup resmi berikut:\n\n` +
        groupLinks
      );
    }
  }

  if (!owner && !isGc) {
    const groupLinks = claimGroups.map(g => `> ◦ *${g.name}:* ${g.link}`).join('\n');
    return m.reply(
      `⚠️ *Klaim Hanya Berlaku di Grup*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Silakan bergabung ke salah satu grup claim di bawah:\n\n` +
      groupLinks
    );
  }

  const target = m.from;
  const sender = m.sender || "";
  const senderTag = "@" + sender.replace(/@.+/, "");

  const results = [];
  const notFound = [];
  for (const code of codes) {
    if (isBundle(code)) {
      const bundle = getBundleFiles(code);
      if (bundle) results.push({ code, bundle });
      else notFound.push(code);
    } else {
      const v = getVideoFile(code);
      if (v) results.push({ code, v });
      else notFound.push(code);
    }
  }

  if (results.length === 0) {
    const codeList = codes.map(c => `\`${c}\``).join(', ');
    return m.reply(
      `❌ *KODE CLAIM TIDAK DITEMUKAN*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔑 *Kode:* ${codeList}\n` +
      `⚠️ Kode salah atau sudah kedaluwarsa (melebihi batas waktu simpan).\n\n` +
      `💡 *Solusi:* Silakan upload ulang di web uploader lalu masukkan kode yang baru.`
    );
  }

  try { await sock.sendMessage(m.from, { react: { text: "⏳", key: m.key } }); } catch {}

  const settings = loadSettings();
  const domain = settings.domain || "swhdhlz.my.id";
  const siteUrl = "https://" + domain;
  const docMB = Number(settings.videoAsDocumentMB);
  const VIDEO_AS_DOCUMENT_BYTES =
    (Number.isFinite(docMB) && docMB > 0 ? docMB : VIDEO_AS_DOCUMENT_DEFAULT_MB) * 1048576;

  // 𝗗𝗘𝗩𝗘𝗟𝗢𝗣𝗘𝗗 𝗕𝗬 𝗛𝗜𝗟𝗟𝗭
  const devTag = "𝗗𝗘𝗩𝗘𝗟𝗢𝗣𝗘𝗗 𝗕𝗬 𝗛𝗜𝗟𝗟𝗭";

  for (const item of results) {
    const { code } = item;

    if (item.bundle) {
      const total = item.bundle.length;
      for (let i = 0; i < total; i++) {
        const f = item.bundle[i];
        const sizeMB = (f.size / 1048576).toFixed(1);
        const mime = getImageMimeType(f.name);
        
        let caption = `📸 *ULTRA HD PHOTO READY*\n`;
        caption += `━━━━━━━━━━━━━━━━━━━━━\n`;
        caption += `👤 *Penerima:* ${senderTag}\n`;
        caption += `📦 *Ukuran:* \`${sizeMB} MB\` • *(Foto ${i + 1}/${total})*\n`;
        caption += `⚡ *Kualitas:* 100% Original Resolution\n`;
        caption += `━━━━━━━━━━━━━━━━━━━━━\n`;
        caption += `🔹 ${devTag}`;

        await sock.sendMessage(target, {
          image: { url: f.path },
          caption,
          mimetype: mime,
          fileName: f.name || (`foto-${i + 1}.jpg`),
          fileLength: f.size,
          mentions: [sender],
        });
      }
      deleteVideo(code);
    } else {
      const { v } = item;
      const sizeMB = (v.size / 1048576).toFixed(1);

      if (isImage(v.name)) {
        const mime = getImageMimeType(v.name);
        let caption = `📸 *ULTRA HD PHOTO READY*\n`;
        caption += `━━━━━━━━━━━━━━━━━━━━━\n`;
        caption += `👤 *Penerima:* ${senderTag}\n`;
        caption += `📦 *Ukuran:* \`${sizeMB} MB\`\n`;
        caption += `⚡ *Kualitas:* 100% Original Resolution\n`;
        caption += `━━━━━━━━━━━━━━━━━━━━━\n`;
        caption += `🔹 ${devTag}`;

        await sock.sendMessage(target, {
          image: { url: v.path },
          caption,
          mimetype: mime,
          fileName: v.name || "foto.jpg",
          fileLength: v.size,
          mentions: [sender],
        });
      } else {
        const asDocument = v.size > VIDEO_AS_DOCUMENT_BYTES;
        const baseName = (v.name || "video").replace(/\.[^.]+$/, "") + ".mp4";

        if (asDocument) {
          let caption = `📁 *ULTRA HD DOCUMENT (FULL QUALITY)*\n`;
          caption += `━━━━━━━━━━━━━━━━━━━━━\n`;
          caption += `👤 *Penerima:* ${senderTag}\n`;
          caption += `📦 *Ukuran:* \`${sizeMB} MB\`\n`;
          caption += `⚡ *Mode:* Dokumen Bebas Kompresi (100% Lossless)\n`;
          caption += `━━━━━━━━━━━━━━━━━━━━━\n`;
          caption += `ℹ️ *Catatan:* Ukuran file di atas ${Math.round(VIDEO_AS_DOCUMENT_BYTES / 1048576)} MB, dikirim sebagai dokumen agar kualitasnya tetap utuh tanpa disentuh kompresor WA.\n\n`;
          caption += `💡 *Cara Pakai:* Unduh file ➔ Simpan ke Galeri ➔ Share ke Status WA.\n\n`;
          caption += `🔹 ${devTag}`;

          await sock.sendMessage(target, {
            document: { url: v.path },
            mimetype: "video/mp4",
            fileName: baseName,
            fileLength: v.size,
            caption,
            mentions: [sender],
          });
        } else {
          let caption = `🎬 *ULTRA HD VIDEO READY*\n`;
          caption += `━━━━━━━━━━━━━━━━━━━━━\n`;
          caption += `👤 *Penerima:* ${senderTag}\n`;
          caption += `📦 *Ukuran:* \`${sizeMB} MB\`\n`;
          caption += `⚡ *Kualitas:* 100% Original High-FPS • Jernih\n`;
          caption += `━━━━━━━━━━━━━━━━━━━━━\n`;
          caption += `💡 *Tips:* Teruskan (*Share/Forward*) video ini langsung dari bot ke Status WhatsApp kamu agar resolusinya tetap HD dan tidak buram.\n\n`;
          caption += `🔹 ${devTag}`;

          await sock.sendMessage(target, {
            video: { url: v.path },
            caption,
            mimetype: "video/mp4",
            fileName: baseName,
            fileLength: v.size,
            mentions: [sender],
          });
        }
      }

      deleteVideo(code);
    }
  }

  // Notif Telegram
  try {
    const claimed = results.map(r => r.code).join(", ");
    const totalFiles = results.reduce((n, r) => n + (r.bundle ? r.bundle.length : 1), 0);
    sendTelegramClaim(
      `📥 <b>Claim Berhasil</b>\nKode: <code>${claimed}</code>\n` +
      `${totalFiles} file terkirim\nOleh: ${sender.replace(/@.+/, "")}\n` +
      `Di: ${isGc ? "Grup" : "Private Chat"}`
    );
  } catch {}

  try { await sock.sendMessage(m.from, { react: { text: "✅", key: m.key } }); } catch {}

  if (notFound.length > 0) {
    const missingCodes = notFound.map(c => `\`${c}\``).join(', ');
    await m.reply(`⚠️ *Beberapa kode tidak ditemukan:* ${missingCodes}`);
  }
}
