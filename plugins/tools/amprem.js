/**
 * Plugin Alight Motion Premium Generator & Verifier
 * Menggunakan direct proxy endpoint Dapji Motion Pro (bebas API key, tanpa redirect)
 */

const config = {
  name: "amprem",
  alias: ["amverify", "ampremverify", "alightmotion", "ampro"],
  category: "tools",
  description: "Kirim magic link & verifikasi Alight Motion Premium",
  usage: ".amprem <email> atau .amverify [email] <link>",
  example: ".amprem user@gmail.com",
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

const DAPJI_API = "https://dapjimotionpro.my.id/api/proxy-amprem";
const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Android 10; Mobile; rv:154.0) Gecko/154.0 Firefox/154.0",
  "Referer": "https://dapjimotionpro.my.id/generator-v2",
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
    signal: AbortSignal.timeout(15000),
  });

  const raw = await res.text();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Server Alight Motion merespons tidak valid (HTTP ${res.status}). Coba beberapa saat lagi.`);
  }
}

async function handler(m, { args }) {
  const cmd = (m.command || "").toLowerCase();
  const isVerify =
    cmd === "amverify" ||
    cmd === "ampremverify" ||
    (args[0] && args[0].toLowerCase() === "verify");

  if (isVerify) {
    // ── LOGIKA VERIFIKASI LINK ──
    let cleanArgs = [...args];
    if (cleanArgs[0] && cleanArgs[0].toLowerCase() === "verify") {
      cleanArgs.shift();
    }

    let targetEmail = "";
    let targetLink = "";

    if (cleanArgs.length >= 2) {
      // User kirim: .amverify email link ATAU .amverify link email
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
      // User kirim: .amverify link (ambil email dari cache perintah .amprem sebelumnya)
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
        `⚡ *VERIFIKASI ALIGHT MOTION*\n\n` +
        `○ Cara Verifikasi:\n` +
        `\`${m.prefix}amverify <email> <magic_link>\`\n\n` +
        `_Contoh:_\n` +
        `\`${m.prefix}amverify user@gmail.com https://alight-creative.firebaseapp.com/...\`\n\n` +
        `💡 *Tips:* Kalau kamu baru saja menjalankan \`${m.prefix}amprem <email>\`, kamu cukup ketik:\n` +
        `\`${m.prefix}amverify <magic_link>\``
      );
    }

    m.react("🕕");

    try {
      const data = await requestDapji({
        action: "verify",
        email: targetEmail,
        link: targetLink,
      });

      if (!data.success) {
        m.react("❌");
        return m.reply(
          `❌ *VERIFIKASI GAGAL*\n\n` +
          `> ${data.message || "Gagal memverifikasi magic link. Pastikan link belum kadaluwarsa atau sudah terpakai."}`
        );
      }

      m.react("✅");
      return m.reply(
        `✨ *ALIGHT MOTION PREMIUM SUKSES!*\n\n` +
        `✓ Akun: \`${targetEmail}\`\n` +
        `✓ Status: *PREMIUM / PRO AKTIF*\n` +
        `✓ Masa Aktif: *1 Tahun*\n\n` +
        `⚡ *Benefit Terbuka:*\n` +
        `• Bebas Watermark Alight Motion\n` +
        `• Ekspor video resolusi tinggi hingga 4K 60FPS\n` +
        `• Terbuka semua preset, transisi, & efek eksklusif\n\n` +
        `_Silakan buka aplikasi Alight Motion dan login langsung menggunakan email tersebut._\n\n` +
        `*By: SHIRO HLZ*`
      );
    } catch (err) {
      m.react("❌");
      return m.reply(`❌ *Terjadi Kesalahan:* ${err.message}`);
    }
  } else {
    // ── LOGIKA KIRIM MAGIC LINK ──
    const email = (args[0] || "").trim();

    if (!email || !isValidEmail(email)) {
      return m.reply(
        `⚡ *ALIGHT MOTION PREMIUM*\n\n` +
        `Generate link aktivasi akun Alight Motion resmi.\n\n` +
        `○ Format:\n` +
        `\`${m.prefix}amprem <email>\`\n\n` +
        `_Contoh:_\n` +
        `\`${m.prefix}amprem user@gmail.com\`\n\n` +
        `💡 *Tips:* Mau pakai disposable email instan? Kamu bisa gunakan tempmail kita di:\n` +
        `👉 *https://shiromail.my.id*`
      );
    }

    m.react("🕕");

    try {
      const data = await requestDapji({
        action: "send",
        email: email,
      });

      if (!data.success) {
        m.react("❌");
        return m.reply(
          `❌ *GAGAL MENGIRIM LINK*\n\n` +
          `> ${data.message || "Server menolak pengiriman link. Coba dengan email lain."}`
        );
      }

      // Simpan email pengirim untuk kemudahan langkah verifikasi
      savePending(m.sender, email);

      m.react("✅");
      return m.reply(
        `⚡ *ALIGHT MOTION PREMIUM*\n\n` +
        `✓ *Magic link berhasil dikirim!*\n` +
        `○ Alamat: \`${email}\`\n\n` +
        `*Langkah Selanjutnya:*\n` +
        `1. Buka kotak masuk email / folder Spam.\n` +
        `2. Cari pesan dari *Alight Motion*, lalu salin link verifikasinya (\`https://alight-creative...\`).\n` +
        `3. Masukkan link ke bot dengan perintah:\n` +
        `   \`${m.prefix}amverify <link>\`\n\n` +
        `_Link verifikasi berlaku selama beberapa menit._`
      );
    } catch (err) {
      m.react("❌");
      return m.reply(`❌ *Terjadi Kesalahan:* ${err.message}`);
    }
  }
}

export { config, handler };
