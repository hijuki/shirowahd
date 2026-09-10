/**
 * Plugin Alight Motion Premium Generator & Verifier (Premium Feature)
 * Menggunakan direct proxy endpoint Dapji Motion Pro (bebas API key, tanpa redirect)
 * Biaya: 10 limit per create akun (verify gratis)
 * UI: WhatsApp Interactive Card + ExternalAdReply + Channel Header + Native Footer Credit
 */

import { proto, generateWAMessageFromContent } from "hillz";
import { getDatabase } from "../../src/lib/hillz-database.js";
import { getAssetBuffer } from "../../src/lib/hillz-asset-manager.js";
import botConfig from "../../config.js";

const config = {
  name: "amprem",
  alias: ["amverify", "ampremverify", "alightmotion", "ampro"],
  category: "tools",
  description: "Kirim magic link & verifikasi Alight Motion Pro (Biaya 10 Limit)",
  usage: ".amprem <email> atau .amverify [email] <link>",
  example: ".amprem user@gmail.com",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  limit: 10,
  isEnabled: true,
};

const DAPJI_API = "https://dapjimotionpro.my.id/api/proxy-amprem";
const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0",
  Referer: "https://dapjimotionpro.my.id/generator-v2",
};

// Cache email terakhir per pengirim (auto expire 20 menit)
const pendingEmail = new Map();

function savePending(sender, email) {
  pendingEmail.set(sender, { email, ts: Date.now() });
  if (pendingEmail.size > 200) {
    const oldest = pendingEmail.keys().next().value;
    pendingEmail.delete(oldest);
  }
}

function getPending(sender) {
  const item = pendingEmail.get(sender);
  if (!item) return null;
  if (Date.now() - item.ts > 20 * 60 * 1000) {
    pendingEmail.delete(sender);
    return null;
  }
  return item.email;
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidLink(link) {
  if (typeof link !== "string") return false;
  const trimmed = link.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

async function requestDapji(payload) {
  const res = await fetch(DAPJI_API, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(18000),
  });

  const raw = await res.text();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `Gateway Alight Motion tidak merespons (HTTP ${res.status}). Silakan coba beberapa saat lagi.`
    );
  }
}

/**
 * Buat fake quoted verified contact SHIRO HLZ
 */
function getVerifiedQuoted(m) {
  return {
    key: {
      fromMe: false,
      participant: "0@s.whatsapp.net",
      remoteJid: "status@broadcast",
    },
    message: {
      contactMessage: {
        displayName: "⚡ SHIRO HLZ • Core Systems",
        vcard:
          "BEGIN:VCARD\n" +
          "VERSION:3.0\n" +
          "FN:SHIRO HLZ\n" +
          "ORG:Core Systems\n" +
          "item1.TEL;waid=6282262421536:+6282262421536\n" +
          "item1.X-ABLabel:Official\n" +
          "END:VCARD",
        sendEphemeral: true,
      },
    },
  };
}

/**
 * Buat payload pesan interaktif dengan Native Footer, ExternalAdReply, dan Channel attribution
 */
function buildRichPayload(m, { title, text, footer, buttons = [] }) {
  const thumb = getAssetBuffer("hillz");
  const saluranId = botConfig.saluran?.id || "120363413208281480@newsletter";
  const saluranName = "SHIRO HLZ • Core Systems";

  const contextInfo = {
    mentionedJid: [m.sender],
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
    externalAdReply: {
      title: title || "✦ ALIGHT MOTION PRO • 1 YEAR ✦",
      body: "Official Verified • SHIRO HLZ Core Systems",
      thumbnail: thumb,
      sourceUrl: "https://shiromail.my.id",
      mediaType: 1,
      renderLargerThumbnail: true,
      showAdAttribution: true,
    },
  };

  const interactiveMessage = proto.Message.InteractiveMessage.create({
    body: proto.Message.InteractiveMessage.Body.create({ text }),
    footer: proto.Message.InteractiveMessage.Footer.create({
      text: footer || "⚡ By: SHIRO HLZ • Core Systems",
    }),
    header: proto.Message.InteractiveMessage.Header.create({
      title: title || "ALIGHT MOTION PRO",
      hasMediaAttachment: false,
    }),
    contextInfo,
    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
      buttons: buttons.map((b) => ({
        name: b.name,
        buttonParamsJson:
          typeof b.buttonParamsJson === "string"
            ? b.buttonParamsJson
            : JSON.stringify(b.buttonParamsJson),
      })),
    }),
  });

  const fullMsg = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage,
        },
      },
    },
    { quoted: getVerifiedQuoted(m) }
  );

  return { fullMsg, contextInfo };
}

/**
 * Kirim pesan rich card interaktif dengan fallback jika client tidak mendukung
 */
async function sendRichCard(sock, m, { title, text, footer, buttons = [], waitMsg = null }) {
  if (waitMsg?.key) {
    await sock.sendMessage(m.chat, { delete: waitMsg.key }).catch(() => {});
  }

  const { fullMsg, contextInfo } = buildRichPayload(m, { title, text, footer, buttons });

  try {
    await sock.relayMessage(m.chat, fullMsg.message, { messageId: fullMsg.key.id });
  } catch {
    // Fallback: Kirim format extendedTextMessage ber-adReply
    await sock.sendMessage(
      m.chat,
      {
        text,
        contextInfo,
      },
      { quoted: getVerifiedQuoted(m) }
    );
  }
}

async function handler(m, { args, sock }) {
  const db = getDatabase();
  const cmd = (m.command || "").toLowerCase();
  const isVerify =
    cmd === "amverify" ||
    cmd === "ampremverify" ||
    (args[0] && args[0].toLowerCase() === "verify");

  if (isVerify) {
    // ── 1. LOGIKA VERIFIKASI LINK (0 LIMIT) ──
    let cleanArgs = [...args];
    if (cleanArgs[0] && cleanArgs[0].toLowerCase() === "verify") {
      cleanArgs.shift();
    }

    let targetEmail = "";
    let targetLink = "";

    if (cleanArgs.length >= 2) {
      if (isValidEmail(cleanArgs[0])) {
        targetEmail = cleanArgs[0].trim();
        targetLink = cleanArgs.slice(1).join(" ").trim();
      } else if (isValidEmail(cleanArgs[cleanArgs.length - 1])) {
        targetEmail = cleanArgs[cleanArgs.length - 1].trim();
        targetLink = cleanArgs.slice(0, -1).join(" ").trim();
      } else {
        targetEmail = cleanArgs[0].trim();
        targetLink = cleanArgs[1].trim();
      }
    } else if (cleanArgs.length === 1) {
      const cached = getPending(m.sender);
      if (cached) {
        targetEmail = cached;
        targetLink = cleanArgs[0].trim();
      } else {
        targetLink = cleanArgs[0].trim();
      }
    }

    if (!targetEmail || !isValidEmail(targetEmail) || !targetLink || !isValidLink(targetLink)) {
      return await sendRichCard(sock, m, {
        title: "✦ ALIGHT MOTION PRO • VERIFY ✦",
        text:
          `⚡ *PANDUAN VERIFIKASI LISENSI*\n` +
          `_Auto License Activation • Zero Cost_\n\n` +
          `> Salin tautan masuk dari email Alight Motion untuk menyelesaikan aktivasi lisensi Pro.\n\n` +
          `○ *Format Perintah*\n` +
          `  \`${m.prefix}amverify <link>\`\n` +
          `  _atau:_ \`${m.prefix}amverify <email> <link>\`\n\n` +
          `○ *Contoh*\n` +
          `  \`${m.prefix}amverify https://alight-creative.firebaseapp.com/...\`\n\n` +
          `○ *Biaya Layanan*\n` +
          `  *0 Limit* (Gratis Tanpa Biaya)`,
        footer: "⚡ By: SHIRO HLZ • Core Systems",
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: {
              display_text: "🌐 Buka Shiro Mail",
              url: "https://shiromail.my.id",
              merchant_url: "https://shiromail.my.id",
            },
          },
          {
            name: "cta_copy",
            buttonParamsJson: {
              display_text: "📋 Format Verify",
              id: "copy_format_verify",
              copy_code: `${m.prefix}amverify `,
            },
          },
        ],
      });
    }

    m.react("⏳");
    const waitMsg = await m.reply(
      `✨ _Memvalidasi token lisensi ke server Alight Motion..._`
    );

    try {
      const data = await requestDapji({
        action: "verify",
        email: targetEmail,
        link: targetLink,
      });

      if (!data.success) {
        m.react("❌");
        return await sendRichCard(sock, m, {
          title: "⚠️ VERIFIKASI LISENSI GAGAL",
          text:
            `⚡ *STATUS VERIFIKASI DITOLAK*\n` +
            `_Alight Motion Server Gateway_\n\n` +
            `> ${data.message || "Tautan tidak valid atau sudah kedaluwarsa. Pastikan menyalin tautan secara utuh dari email masuk Alight Motion."}\n\n` +
            `_Catatan: Verifikasi lisensi tidak memotong kuota limit kamu._`,
          footer: "⚡ By: SHIRO HLZ • Core Systems",
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: {
                display_text: "🌐 Buka Shiro Mail",
                url: "https://shiromail.my.id",
                merchant_url: "https://shiromail.my.id",
              },
            },
          ],
          waitMsg,
        });
      }

      m.react("✅");
      return await sendRichCard(sock, m, {
        title: "✦ ALIGHT MOTION PRO • ACTIVATED ✦",
        text:
          `✨ *LISENSI BERHASIL DIAKTIFKAN*\n` +
          `_Official 1-Year Pro Subscription_\n\n` +
          `> Akun kamu resmi ditingkatkan ke versi *Pro*. Lisensi aktif selama 1 tahun penuh dan siap digunakan langsung di aplikasi.\n\n` +
          `○ *Detail Lisensi*\n` +
          `  • Akun : \`${targetEmail}\`\n` +
          `  • Status : *PRO / PREMIUM (UNLOCKED)*\n` +
          `  • Masa Aktif : *1 Tahun (365 Hari)*\n\n` +
          `○ *Fitur Terbuka*\n` +
          `  ✓ Ekspor video resolusi tinggi hingga 4K 60FPS\n` +
          `  ✓ Bebas tanda air (No Watermark)\n` +
          `  ✓ Terbuka semua efek, transisi, & XML preset\n` +
          `  ✓ Sinkronisasi cloud project & prioritas render\n\n` +
          `_Buka aplikasi Alight Motion di HP kamu, lalu login langsung menggunakan email di atas._`,
        footer: "⚡ By: SHIRO HLZ • Core Systems",
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: {
              display_text: "🌐 Shiro Mail",
              url: "https://shiromail.my.id",
              merchant_url: "https://shiromail.my.id",
            },
          },
          {
            name: "quick_reply",
            buttonParamsJson: {
              display_text: "⚡ Cek Status Akun",
              id: `${m.prefix}cekprem`,
            },
          },
        ],
        waitMsg,
      });
    } catch (err) {
      m.react("❌");
      return await sendRichCard(sock, m, {
        title: "⚠️ ALIGHT MOTION GATEWAY ERROR",
        text:
          `⚡ *KONEKSI SERVER TERGANGGU*\n` +
          `_Dapji Motion Gateway Error_\n\n` +
          `> ${err.message}\n\n` +
          `_Catatan: Kuota limit kamu tetap aman dan tidak terpotong._`,
        footer: "⚡ By: SHIRO HLZ • Core Systems",
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: {
              display_text: "🌐 Buka Shiro Mail",
              url: "https://shiromail.my.id",
              merchant_url: "https://shiromail.my.id",
            },
          },
        ],
        waitMsg,
      });
    }
  } else {
    // ── 2. LOGIKA CREATE AKUN (.amprem) — POTONG 10 LIMIT ──
    const email = (args[0] || "").trim();

    if (!email || !isValidEmail(email)) {
      return await sendRichCard(sock, m, {
        title: "✦ ALIGHT MOTION PRO • GENERATOR ✦",
        text:
          `⚡ *ALIGHT MOTION PRO*\n` +
          `_Auto License Activation • 1 Year Access_\n\n` +
          `> Aktifkan lisensi Alight Motion Pro 1 tahun penuh ke akun kamu. Bebas watermark, unlock semua preset, dan render 4K 60FPS.\n\n` +
          `○ *Perintah*\n` +
          `  \`${m.prefix}amprem <email>\`\n\n` +
          `○ *Contoh*\n` +
          `  \`${m.prefix}amprem user@gmail.com\`\n\n` +
          `○ *Biaya Layanan*\n` +
          `  *10 Limit* per pembuatan akun\n\n` +
          `💡 *Mau pakai email instan?*\n` +
          `Bikin tempmail gratis & cepat tanpa daftar di Shiro Mail.`,
        footer: "⚡ By: SHIRO HLZ • Core Systems",
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: {
              display_text: "🌐 Buka Shiro Mail",
              url: "https://shiromail.my.id",
              merchant_url: "https://shiromail.my.id",
            },
          },
          {
            name: "cta_copy",
            buttonParamsJson: {
              display_text: "📋 Contoh Perintah",
              id: "copy_contoh_amprem",
              copy_code: `${m.prefix}amprem user@shiromail.my.id`,
            },
          },
        ],
      });
    }

    // Pengecekan limit user (Owner & Partner bebas batas)
    const user = db.getUser(m.sender);
    const isExempt = m.isOwner || m.isPartner;
    const userLimit = user?.energi ?? 0;

    if (!isExempt && user?.energi !== -1) {
      if (userLimit < 10) {
        return await sendRichCard(sock, m, {
          title: "⚡ ALIGHT MOTION PRO • NOTICE",
          text:
            `⚡ *LIMIT TIDAK MENCUKUPI*\n` +
            `_Quota Balance Warning_\n\n` +
            `> Aktivasi akun Pro membutuhkan minimal *10 Limit*.\n` +
            `> Sisa limit kamu saat ini: *${userLimit}*\n\n` +
            `_Silakan tunggu reset limit harian atau hubungi owner untuk top up limit._`,
          footer: "⚡ By: SHIRO HLZ • Core Systems",
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: {
                display_text: "👑 Hubungi Owner",
                url: `https://wa.me/${botConfig.owner?.number || "6282262421536"}`,
                merchant_url: `https://wa.me/${botConfig.owner?.number || "6282262421536"}`,
              },
            },
          ],
        });
      }
    }

    m.react("🚀");
    const waitMsg = await m.reply(
      `⚡ _Menghubungkan ke gateway Alight Motion..._`
    );

    try {
      const data = await requestDapji({
        action: "send",
        email: email,
      });

      if (!data.success) {
        m.react("❌");
        return await sendRichCard(sock, m, {
          title: "⚠️ PENGIRIMAN MAGIC LINK GAGAL",
          text:
            `⚡ *PERMINTAAN DITOLAK*\n` +
            `_Alight Motion Server Gateway_\n\n` +
            `> ${data.message || "Permintaan aktivasi ditolak oleh server. Pastikan email belum terdaftar di sesi aktif atau coba email lain."}\n\n` +
            `_Catatan: Limit kamu tidak terpotong._`,
          footer: "⚡ By: SHIRO HLZ • Core Systems",
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: {
                display_text: "🌐 Buat Email Baru (Shiro Mail)",
                url: "https://shiromail.my.id",
                merchant_url: "https://shiromail.my.id",
              },
            },
          ],
          waitMsg,
        });
      }

      // Potong 10 limit jika pengiriman sukses
      if (!isExempt && user?.energi !== -1) {
        db.updateEnergi(m.sender, -10);
      }

      savePending(m.sender, email);

      const sisaLimit =
        isExempt || user?.energi === -1
          ? "∞ Unlimited"
          : `${db.getUser(m.sender)?.energi ?? 0}`;

      m.react("✅");
      return await sendRichCard(sock, m, {
        title: "⚡ MAGIC LINK DISPATCHED • STEP 1",
        text:
          `⚡ *MAGIC LINK BERHASIL DIKIRIM*\n` +
          `_Tahap 1 dari 2 Aktivasi Lisensi_\n\n` +
          `> Magic link aktivasi berhasil dikirim ke email target. Segera lakukan verifikasi untuk mengaktifkan status Pro.\n\n` +
          `○ *Target Akun*\n` +
          `  \`${email}\`\n\n` +
          `○ *Biaya Layanan*\n` +
          `  *-10 Limit* (Sisa: *${sisaLimit}*)\n\n` +
          `*LANGKAH VERIFIKASI*\n` +
          `1. Buka kotak masuk email kamu (inbox atau folder spam).\n` +
          `2. Buka pesan dari *Alight Motion*, salin tautan tombol loginnya (\`https://alight-creative...\`).\n` +
          `3. Kirim ke bot dengan perintah:\n` +
          `   \`${m.prefix}amverify <link>\`\n\n` +
          `_Catatan: Verifikasi link 100% bebas biaya (0 limit)._`,
        footer: "⚡ By: SHIRO HLZ • Core Systems",
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: {
              display_text: "🌐 Buka Kotak Masuk (Shiro Mail)",
              url: "https://shiromail.my.id",
              merchant_url: "https://shiromail.my.id",
            },
          },
          {
            name: "cta_copy",
            buttonParamsJson: {
              display_text: "📋 Salin Format Verify",
              id: "copy_format_verify_step1",
              copy_code: `${m.prefix}amverify `,
            },
          },
        ],
        waitMsg,
      });
    } catch (err) {
      m.react("❌");
      return await sendRichCard(sock, m, {
        title: "⚠️ ALIGHT MOTION GATEWAY ERROR",
        text:
          `⚡ *KONEKSI SERVER TERGANGGU*\n` +
          `_Dapji Motion Gateway Error_\n\n` +
          `> ${err.message}\n\n` +
          `_Catatan: Kuota limit kamu tetap aman dan tidak terpotong._`,
        footer: "⚡ By: SHIRO HLZ • Core Systems",
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: {
              display_text: "🌐 Buka Shiro Mail",
              url: "https://shiromail.my.id",
              merchant_url: "https://shiromail.my.id",
            },
          },
        ],
        waitMsg,
      });
    }
  }
}

export { config, handler };
