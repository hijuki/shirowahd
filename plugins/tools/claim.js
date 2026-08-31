import { getVideoFile, getBundleFiles, isBundle, deleteVideo } from "../../src/lib/vid-store.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import { isOwner as checkOwner } from "../../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS_FILE = join(__dirname, "..", "..", "admin-settings.json");

// Ambang kirim-sebagai-dokumen. Diukur langsung ke server WhatsApp:
// 172 MB masih diterima sebagai video, 201 MB ditolak semua host. 180 MB
// memberi sedikit ruang aman di bawah titik gagal yang terbukti.
// Bisa ditimpa dari panel admin lewat setelan videoAsDocumentMB.
const VIDEO_AS_DOCUMENT_DEFAULT_MB = 180;

function loadSettings() {
  try {
    if (existsSync(SETTINGS_FILE)) return JSON.parse(readFileSync(SETTINGS_FILE, "utf8"));
  } catch { /* parse skip */ }
  return {};
}
function saveSettings(s) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2), "utf8");
}

let cachedGroupJids = {};

// Notif Telegram untuk event claim — toggle "telegramNotifyClaim" di panel admin.
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
  } catch { /* metadata optional */ }
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
  command: ["claim"],
  tag: "tools",
  help: "Claim file yang sudah diupload. Gunakan: .claim KODE atau .claim AB CD EF",
};

export async function handler(m, { sock }) {
  const text = m.text?.trim();
  if (!text) return m.reply("\u26a0\ufe0f Masukkan kode file.\n\n\ud83d\udcdd Contoh: *.claim AB* atau *.claim AB CD EF*");

  const isGc = m.from?.endsWith("@g.us");
  const owner = isOwner(m);
  const claimGroups = getClaimGroups();
  const inviteCodes = getInviteCodes();

  // .claim on
  if (text.toLowerCase() === 'on') {
    if (!owner) return m.reply('\u26a0\ufe0f Hanya owner yang bisa mengaktifkan claim di grup ini.');
    if (!isGc) return m.reply('\u26a0\ufe0f Kirim di grup, bukan di PC.');
    try {
      const meta = await sock.groupMetadata(m.from);
      const groupName = meta?.subject || 'Grup';
      const inviteResp = await sock.groupInviteCode(m.from);
      const link = 'https://chat.whatsapp.com/' + inviteResp;
      const settings = loadSettings();
      const cgs = settings.claimGroups || (settings.claimGroup ? [settings.claimGroup] : []);
      if (cgs.some(g => g.link.includes(inviteResp))) {
        return m.reply('\u2705 Grup *' + groupName + '* sudah terdaftar sebagai grup claim.');
      }
      cgs.push({ name: groupName, link });
      settings.claimGroups = cgs;
      saveSettings(settings);
      cachedGroupJids = {};
      return m.reply('\u2705 Grup *' + groupName + '* ditambahkan sebagai grup claim!\n\nLink: ' + link);
    } catch (e) {
      return m.reply('\u274c Gagal: ' + e.message);
    }
  }

  // .claim off
  if (text.toLowerCase() === 'off') {
    if (!owner) return m.reply('\u26a0\ufe0f Hanya owner yang bisa menonaktifkan claim di grup ini.');
    if (!isGc) return m.reply('\u26a0\ufe0f Kirim di grup, bukan di PC.');
    try {
      const settings = loadSettings();
      const cgs = settings.claimGroups || (settings.claimGroup ? [settings.claimGroup] : []);
      const inviteResp = await sock.groupInviteCode(m.from);
      const filtered = cgs.filter(g => !g.link.includes(inviteResp));
      if (filtered.length === cgs.length) {
        return m.reply('\u26a0\ufe0f Grup ini tidak terdaftar sebagai grup claim.');
      }
      settings.claimGroups = filtered;
      saveSettings(settings);
      cachedGroupJids = {};
      return m.reply('\u2705 Grup ini dihapus dari daftar grup claim.');
    } catch (e) {
      return m.reply('\u274c Gagal: ' + e.message);
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
      const groupLinks = claimGroups.map(g => g.name + ': ' + g.link).join('\n');
      return m.reply('\u26a0\ufe0f *Claim tidak aktif di grup ini.*\n\nJoin salah satu grup claim:\n' + groupLinks);
    }
  }

  if (!owner && !isGc) {
    const groupLinks = claimGroups.map(g => g.name + ': ' + g.link).join('\n');
    return m.reply('\u26a0\ufe0f *Claim hanya bisa di grup!*\n\nJoin salah satu grup claim:\n' + groupLinks);
  }

  const target = m.from;
  const sender = m.sender || "";
  const senderTag = "@" + sender.replace(/@.+/, "");

  const results = [];
  const notFound = [];
  for (const code of codes) {
    if (isBundle(code)) {
      // Hanya lokasi file yang diambil, bukan isinya. Pada video besar
      // (170 MB) memuat isi ke memori di sini membuat proses bot melonjak
      // ratusan MB sekaligus di box yang RAM-nya terbatas.
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
    if (codes.length === 1) {
      return m.reply("\u274c Kode *" + codes[0] + "* tidak ditemukan atau sudah expired.\n\n\u23f3 Kode berlaku sesuai durasi yang diatur.");
    }
    return m.reply("\u274c Semua kode tidak ditemukan atau sudah expired: *" + codes.join(", ") + "*\n\n\u23f3 Kode berlaku sesuai durasi yang diatur.");
  }

  try { await sock.sendMessage(m.from, { react: { text: "\u23ec", key: m.key } }); } catch { /* send optional */ }

  const settings = loadSettings();
  const siteName = settings.siteName || "SHIROWAHD";
  const domain = settings.domain || "swhdhlz.my.id";
  const siteUrl = "https://" + domain;
  const docMB = Number(settings.videoAsDocumentMB);
  const VIDEO_AS_DOCUMENT_BYTES =
    (Number.isFinite(docMB) && docMB > 0 ? docMB : VIDEO_AS_DOCUMENT_DEFAULT_MB) * 1048576;

  // 𝗗𝗘𝗩𝗘𝗟𝗢𝗣𝗘𝗗 𝗕𝗬 𝗛𝗜𝗟𝗟𝗭 — Unicode Mathematical Bold
  const devTag = "\ud835\uddd7\ud835\uddd8\ud835\udde9\ud835\uddd8\ud835\udddf\ud835\udde2\ud835\udde3\ud835\uddd8\ud835\uddd7 \ud835\uddd5\ud835\uddec \ud835\udddb\ud835\udddc\ud835\udddf\ud835\udddf\ud835\udded";

  for (const item of results) {
    const { code } = item;

    if (item.bundle) {
      const total = item.bundle.length;
      for (let i = 0; i < total; i++) {
        const f = item.bundle[i];
        const sizeMB = (f.size / 1048576).toFixed(1);
        const mime = getImageMimeType(f.name);
        const caption = i === 0
          ? "\ud83d\udcf7 *Foto " + (i+1) + "/" + total + "* \u2022 " + sizeMB + " MB\n\n" + senderTag + " ini file kamu \u2705\n\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n" + devTag
          : "\ud83d\udcf7 *Foto " + (i+1) + "/" + total + "* \u2022 " + sizeMB + " MB";
        await sock.sendMessage(target, {
          image: { url: f.path },
          caption,
          mimetype: mime,
          fileName: f.name || ("foto-" + (i + 1) + ".jpg"),
          fileLength: f.size,
          mentions: i === 0 ? [sender] : [],
        });
      }
      deleteVideo(code);
    } else {
      const { v } = item;
      const sizeMB = (v.size / 1048576).toFixed(1);

      if (isImage(v.name)) {
        const mime = getImageMimeType(v.name);
        await sock.sendMessage(target, {
          image: { url: v.path },
          caption: "\ud83d\udcf7 " + sizeMB + " MB\n\n" + senderTag + " ini file kamu \u2705\n\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n" + devTag,
          mimetype: mime,
          fileName: v.name || "foto.jpg",
          fileLength: v.size,
          mentions: [sender],
        });
      } else {
        // fileName + fileLength dikirim eksplisit: tanpa keduanya sebagian klien
        // WhatsApp menampilkan media tanpa ukuran dan unduhan penerima lebih
        // sering menggantung/gagal. jpegThumbnail kosong dibiarkan agar WA
        // membuat thumbnail sendiri dari file (lebih andal daripada tanpa apa pun).
        //
        // Media dikirim sebagai { url: path }: baileys membaca file itu bertahap
        // dari disk saat mengenkripsi, jadi pemakaian memori tetap kecil berapa
        // pun ukuran videonya. Sebelumnya seluruh isi file ditahan di memori.
        //
        // BATAS SERVER WHATSAPP (diukur langsung, bukan tebakan):
        //   144 MB video -> sukses | 172 MB video -> sukses
        //   201 MB video -> "Media upload failed on all hosts" (semua host tolak)
        //   300 MB DOKUMEN -> sukses
        // Jadi penolakan itu batas endpoint media /mms/video, bukan bug kita dan
        // bukan soal memori. Untuk file di atas ambang, kirim sebagai DOKUMEN:
        // file utuh tetap sampai tanpa dikompres sama sekali (justru lebih baik
        // daripada video, karena WA tidak mengutak-atik dokumen), penerima
        // tinggal simpan lalu buka dari galeri.
        const asDocument = v.size > VIDEO_AS_DOCUMENT_BYTES;
        const baseName = (v.name || "video").replace(/\.[^.]+$/, "") + ".mp4";

        if (asDocument) {
          await sock.sendMessage(target, {
            document: { url: v.path },
            mimetype: "video/mp4",
            fileName: baseName,
            fileLength: v.size,
            caption: "\ud83c\udfac *Video HD siap!* \u00b7 " + sizeMB + " MB\n\n" + senderTag + " ini video kamu \u2705\n\n\u26a0\ufe0f Ukurannya di atas " + Math.round(VIDEO_AS_DOCUMENT_BYTES / 1048576) + " MB, jadi WhatsApp menolak mengirimnya sebagai video. Dikirim sebagai *dokumen* supaya kualitasnya utuh 100% tanpa dikompres.\n\n_Cara pakai: tap unduh \u2192 simpan \u2192 buka dari galeri._\n\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n" + devTag,
            mentions: [sender],
          });
        } else {
          await sock.sendMessage(target, {
            video: { url: v.path },
            caption: "\ud83c\udfac *Video HD siap!*\n\n" + senderTag + " ini video kamu \u2705\n\n_Agar SW kamu HD, share video ini langsung dari bot ke SW kamu._\n\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n" + devTag,
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

  // Notif Telegram: file berhasil diklaim lewat bot WA
  try {
    const claimed = results.map(r => r.code).join(", ");
    const totalFiles = results.reduce((n, r) => n + (r.bundle ? r.bundle.length : 1), 0);
    sendTelegramClaim(
      "\ud83d\udce5 <b>Claim</b>\nKode: <code>" + claimed + "</code>\n" +
      totalFiles + " file terkirim\nOleh: " + sender.replace(/@.+/, "") +
      "\nDi: " + (isGc ? "grup" : "PC")
    );
  } catch { /* notif optional */ }

  // Visit Website button — same pattern as .menu (interactiveButtons)
  try {
    await sock.sendMessage(target, {
      text: "\ud83c\udf10 *WEBSITE UPLOADER*",
      footer: devTag,
      interactiveButtons: [
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "\ud83c\udf10 Visit Website",
            url: siteUrl,
            merchant_url: siteUrl
          })
        }
      ]
    });
  } catch { /* send optional */ }

  try { await sock.sendMessage(m.from, { react: { text: "\u2705", key: m.key } }); } catch { /* send optional */ }

  if (notFound.length > 0) {
    await m.reply("\u26a0\ufe0f Kode tidak ditemukan: *" + notFound.join(", ") + "*");
  }
}
