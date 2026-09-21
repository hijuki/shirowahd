/**
 * Plugin Alight Motion Premium Generator & Verifier (Premium Feature)
 * Menggunakan direct proxy endpoint Dapji Motion Pro (bebas API key, tanpa redirect)
 * Biaya: 10 limit per create akun (verify gratis)
 */

import { getDatabase } from "../../src/lib/hillz-database.js";

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

const DAPJI_BASE = "https://am.dapjisync.my.id";
const HEADERS = {
  "Content-Type": "application/json",
  "X-API-Key": "FREE",
  "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0",
  Referer: "https://am.dapjisync.my.id/",
  Origin: "https://am.dapjisync.my.id",
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
  const isSend = payload.action === "send";
  const url = isSend ? `${DAPJI_BASE}/api/send` : `${DAPJI_BASE}/api/verif`;
  const body = isSend
    ? { gmail: payload.email }
    : { gmail: payload.email, link: payload.link };

  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
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

async function sendOrEdit(sock, m, text, targetKey) {
  if (targetKey) {
    try {
      await sock.sendMessage(m.chat, { text, edit: targetKey });
      return;
    } catch {
      // Fallback ke reply jika edit gagal
    }
  }
  await m.reply(text);
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
      return m.reply(
        `⚡ *ALIGHT MOTION PRO*\n` +
        `_Panduan Verifikasi Lisensi_\n\n` +
        `> Salin tautan masuk dari email Alight Motion untuk menyelesaikan aktivasi lisensi Pro.\n\n` +
        `○ *Format Perintah*\n` +
        `  \`${m.prefix}amverify <link>\`\n` +
        `  _atau:_ \`${m.prefix}amverify <email> <link>\`\n\n` +
        `○ *Contoh*\n` +
        `  \`${m.prefix}amverify https://alight-creative.firebaseapp.com/...\`\n\n` +
        `—\n` +
        `⚡ *SHIRO HLZ* • *Core Systems*`
      );
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
        return await sendOrEdit(
          sock,
          m,
          `⚠️ *ALIGHT MOTION PRO*\n` +
          `_Verifikasi Lisensi Gagal_\n\n` +
          `> ${data.message || data.error || "Tautan tidak valid atau sudah kedaluwarsa. Pastikan menyalin tautan secara utuh dari email masuk Alight Motion."}\n\n` +
          `—\n` +
          `⚡ *SHIRO HLZ* • *Core Systems*`,
          waitMsg?.key
        );
      }

      m.react("✅");
      const duration = data.duration ? `${data.duration} (365 Hari)` : `1 Tahun (365 Hari)`;
      return await sendOrEdit(
        sock,
        m,
        `✨ *ALIGHT MOTION PRO*\n` +
        `_License Successfully Activated_\n\n` +
        `> Akun kamu resmi ditingkatkan ke versi *Pro*. Lisensi aktif selama 1 tahun penuh dan siap digunakan langsung di aplikasi.\n\n` +
        `○ *Detail Lisensi*\n` +
        `  • Akun : \`${targetEmail}\`\n` +
        `  • Status : *PRO / PREMIUM AKTIF*\n` +
        `  • Masa Aktif : *${duration}*\n\n` +
        `○ *Fitur Terbuka*\n` +
        `  ✓ Ekspor video resolusi tinggi hingga 4K 60FPS\n` +
        `  ✓ Bebas tanda air (No Watermark)\n` +
        `  ✓ Terbuka semua efek, transisi, & XML preset\n` +
        `  ✓ Sinkronisasi cloud project & prioritas render\n\n` +
        `_Buka aplikasi Alight Motion di HP kamu, lalu login langsung menggunakan email di atas._\n\n` +
        `—\n` +
        `⚡ *SHIRO HLZ* • *Core Systems*`,
        waitMsg?.key
      );
    } catch (err) {
      m.react("❌");
      return await sendOrEdit(
        sock,
        m,
        `⚠️ *ALIGHT MOTION PRO*\n` +
        `_Sistem Error_\n\n` +
        `> ${err.message}\n\n` +
        `—\n` +
        `⚡ *SHIRO HLZ* • *Core Systems*`,
        waitMsg?.key
      );
    }
  } else {
    // ── 2. LOGIKA CREATE AKUN (.amprem) — POTONG 10 LIMIT ──
    const email = (args[0] || "").trim();

    if (!email || !isValidEmail(email)) {
      return m.reply(
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
        `Bikin tempmail gratis & cepat tanpa daftar di:\n` +
        `→ *https://shiromail.my.id*\n\n` +
        `—\n` +
        `⚡ *SHIRO HLZ* • *Core Systems*`
      );
    }

    // Pengecekan limit user (Owner & Partner bebas batas)
    const user = db.getUser(m.sender);
    const isExempt = m.isOwner || m.isPartner;
    const userLimit = user?.energi ?? 0;

    if (!isExempt && user?.energi !== -1) {
      if (userLimit < 10) {
        return m.reply(
          `⚡ *ALIGHT MOTION PRO*\n` +
          `_Limit Tidak Mencukupi_\n\n` +
          `> Aktivasi akun Pro membutuhkan minimal *10 Limit*.\n` +
          `> Sisa limit kamu saat ini: *${userLimit}*\n\n` +
          `_Silakan tunggu reset limit harian atau hubungi owner untuk top up limit._\n\n` +
          `—\n` +
          `⚡ *SHIRO HLZ* • *Core Systems*`
        );
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
        return await sendOrEdit(
          sock,
          m,
          `⚠️ *ALIGHT MOTION PRO*\n` +
          `_Pengiriman Magic Link Gagal_\n\n` +
          `> ${data.message || data.error || "Permintaan aktivasi ditolak oleh server. Pastikan email belum terdaftar di sesi aktif atau coba email lain."}\n\n` +
          `_Catatan: Limit kamu tidak terpotong._\n\n` +
          `—\n` +
          `⚡ *SHIRO HLZ* • *Core Systems*`,
          waitMsg?.key
        );
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
      return await sendOrEdit(
        sock,
        m,
        `⚡ *ALIGHT MOTION PRO*\n` +
        `_Magic Link Dispatched_\n\n` +
        `> Magic link aktivasi berhasil dikirim ke email target. Segera lakukan verifikasi untuk mengaktifkan status Pro.\n\n` +
        `○ *Target Akun*\n` +
        `  \`${email}\`\n\n` +
        `○ *Biaya Layanan*\n` +
        `  *-10 Limit* (Sisa: *${sisaLimit}*)\n\n` +
        `*LANGKAH VERIFIKASI*\n` +
        `1. Buka kotak masuk email kamu di:\n   → https://shiromail.my.id/?email=${encodeURIComponent(email)}\n` +
        `2. Buka pesan dari *Alight Motion*, salin tautan tombol loginnya (\`https://alight-creative...\`).\n` +
        `3. Kirim ke bot dengan perintah:\n` +
        `   \`${m.prefix}amverify <link>\`\n\n` +
        `_Catatan: Verifikasi link 100% bebas biaya (0 limit)._\n\n` +
        `—\n` +
        `⚡ *SHIRO HLZ* • *Core Systems*`,
        waitMsg?.key
      );
    } catch (err) {
      m.react("❌");
      return await sendOrEdit(
        sock,
        m,
        `⚠️ *ALIGHT MOTION PRO*\n` +
        `_Sistem Error_\n\n` +
        `> ${err.message}\n\n` +
        `_Catatan: Limit kamu tidak terpotong._\n\n` +
        `—\n` +
        `⚡ *SHIRO HLZ* • *Core Systems*`,
        waitMsg?.key
      );
    }
  }
}

export { config, handler };
