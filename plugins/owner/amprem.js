/**
 * Plugin Alight Motion Premium Generator & Verifier (Owner Only)
 * Menggunakan direct proxy endpoint Dapji Motion Pro (bebas API key, tanpa redirect)
 */

const config = {
  name: "amprem",
  alias: ["amverify", "ampremverify", "alightmotion", "ampro"],
  category: "owner",
  description: "Kirim magic link & verifikasi Alight Motion Premium",
  usage: ".amprem <email> atau .amverify [email] <link>",
  example: ".amprem user@gmail.com",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
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
    signal: AbortSignal.timeout(18000),
  });

  const raw = await res.text();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Server Alight Motion lagi down atau gak respon (HTTP ${res.status}). Coba bentar lagi ya.`);
  }
}

async function sendOrEdit(sock, m, text, targetKey) {
  if (targetKey) {
    try {
      await sock.sendMessage(m.chat, { text, edit: targetKey });
      return;
    } catch {
      // Jika edit gagal, fallback ke reply biasa
    }
  }
  await m.reply(text);
}

async function handler(m, { args, sock }) {
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
        `⚡ *VERIFIKASI ALIGHT MOTION*\n\n` +
        `Tinggal tempel magic link dari email biar akun lu langsung jadi Pro!\n\n` +
        `○ Format:\n` +
        `\`${m.prefix}amverify <magic_link>\`\n` +
        `_atau:_ \`${m.prefix}amverify <email> <magic_link>\`\n\n` +
        `_Contoh:_\n` +
        `\`${m.prefix}amverify https://alight-creative.firebaseapp.com/...\`\n\n` +
        `*By: SHIRO HLZ*`
      );
    }

    m.react("⏳");
    const waitMsg = await m.reply(`✨ _Lagi verifikasi magic link ke server Alight Motion, bentar ya tuan..._`);

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
          `❌ *Waduh, Verifikasi Gagal!*\n\n` +
          `> ${data.message || "Link-nya salah atau udah kadaluwarsa cuy. Pastikan link yang lu copy utuh dari email Alight Motion."}`,
          waitMsg?.key
        );
      }

      m.react("✅");
      return await sendOrEdit(
        sock,
        m,
        `✨ *ALIGHT MOTION PREMIUM SUKSES!*\n\n` +
        `✓ Akun: \`${targetEmail}\`\n` +
        `✓ Status: *PREMIUM / PRO AKTIF*\n` +
        `✓ Masa Aktif: *1 Tahun*\n\n` +
        `⚡ *Benefit Terbuka:*\n` +
        `• Bebas Watermark Alight Motion\n` +
        `• Support ekspor video 4K 60FPS\n` +
        `• Semua preset, efek, & transisi pro kebuka\n\n` +
        `_Tinggal login di app Alight Motion pake email ini, fiturnya otomatis langsung aktif!_\n\n` +
        `*By: SHIRO HLZ*`,
        waitMsg?.key
      );
    } catch (err) {
      m.react("❌");
      return await sendOrEdit(sock, m, `❌ *Terjadi Kesalahan:* ${err.message}`, waitMsg?.key);
    }
  } else {
    // ── LOGIKA KIRIM MAGIC LINK ──
    const email = (args[0] || "").trim();

    if (!email || !isValidEmail(email)) {
      return m.reply(
        `⚡ *ALIGHT MOTION PREMIUM*\n\n` +
        `Bikin akun Alight Motion lu jadi Pro / Premium gratis setahun!\n\n` +
        `○ Format:\n` +
        `\`${m.prefix}amprem <email>\`\n\n` +
        `_Contoh:_\n` +
        `\`${m.prefix}amprem user@gmail.com\`\n\n` +
        `💡 *Tips:* Males pake email pribadi? Gas pake tempmail kita aja di:\n` +
        `👉 *https://shiromail.my.id*\n\n` +
        `*By: SHIRO HLZ*`
      );
    }

    m.react("🚀");
    const waitMsg = await m.reply(`⚡ _Otw tembak magic link ke server Alight Motion, tunggu bentar ya tuan..._`);

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
          `❌ *Waduh, Gagal Kirim Link!*\n\n` +
          `> ${data.message || "Server Alight Motion lagi rewel atau nolak email ini. Coba pake email lain ya tuan."}`,
          waitMsg?.key
        );
      }

      savePending(m.sender, email);

      m.react("✅");
      return await sendOrEdit(
        sock,
        m,
        `⚡ *ALIGHT MOTION PREMIUM*\n\n` +
        `✓ *Magic link berhasil dikirim!*\n` +
        `○ Target: \`${email}\`\n\n` +
        `*Tinggal 1 Step Lagi:*\n` +
        `1. Cek inbox atau folder spam email lu.\n` +
        `2. Buka email dari *Alight Motion*, terus salin link verifikasinya (\`https://alight-creative...\`).\n` +
        `3. Kirim ke bot dengan perintah:\n` +
        `   \`${m.prefix}amverify <link>\`\n\n` +
        `_Note: Buruan verifikasi sebelum link-nya basi ya._\n\n` +
        `*By: SHIRO HLZ*`,
        waitMsg?.key
      );
    } catch (err) {
      m.react("❌");
      return await sendOrEdit(sock, m, `❌ *Terjadi Kesalahan:* ${err.message}`, waitMsg?.key);
    }
  }
}

export { config, handler };
