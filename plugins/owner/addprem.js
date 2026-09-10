import config from "../../config.js";
import { getDatabase } from "../../src/lib/hillz-database.js";
import {
  addPremium as addPremiumFile,
  removePremium as removePremiumFile,
} from "../../src/lib/hillz-premium-db.js";
import {
  addJadibotPremium,
  removeJadibotPremium,
  getJadibotPremiums,
} from "../../src/lib/hillz-jadibot-database.js";

const pluginConfig = {
  name: "addprem",
  alias: [
    "addpremium",
    "setprem",
    "delprem",
    "delpremium",
    "listprem",
    "premlist",
  ],
  category: "owner",
  description: "Kelola status dan masa aktif premium user",
  usage:
    ".addprem <nomor/@tag> [durasi]\n.delprem <nomor/@tag>\n.listprem",
  example: ".addprem 6281234567890 30d",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractTarget(m) {
  if (m.quoted) return m.quoted.sender?.replace(/[^0-9]/g, "") || "";
  if (m.mentionedJid?.length)
    return m.mentionedJid[0]?.replace(/[^0-9]/g, "") || "";
  if (m.args?.length) {
    const candidate = m.args[0].replace(/[^0-9]/g, "");
    if (candidate.length >= 8) return candidate;
  }
  return "";
}

function toMentionJid(value) {
  const number = String(value || "").replace(/[^0-9]/g, "");
  return number ? `${number}@s.whatsapp.net` : null;
}

function parseDuration(args, targetNumber) {
  let durationMs = 30 * 24 * 60 * 60 * 1000;
  let durationLabel = "30 hari";
  let isPermanent = false;

  const durationArg = args.find((a) => {
    const clean = a.replace(/[^0-9]/g, "");
    if (clean === targetNumber) return false;
    return /^(perm|permanen|permanent|\d+(s|detik|m|menit|j|jam|h|hari|d|day|b|bln|bulan|t|thn|tahun|y)?)$/i.test(a);
  });

  if (durationArg) {
    const lower = durationArg.toLowerCase();
    if (["perm", "permanen", "permanent"].includes(lower)) {
      return { durationMs: null, durationLabel: "Permanen", isPermanent: true };
    }

    const match = lower.match(/^(\d+)(s|detik|m|menit|j|jam|h|hari|d|day|b|bln|bulan|t|thn|tahun|y)?$/);
    if (match) {
      const val = parseInt(match[1]);
      const unit = match[2] || "d";

      if (["s", "detik"].includes(unit)) {
        durationMs = val * 1000;
        durationLabel = `${val} detik`;
      } else if (["m", "menit"].includes(unit)) {
        durationMs = val * 60 * 1000;
        durationLabel = `${val} menit`;
      } else if (["j", "jam"].includes(unit)) {
        durationMs = val * 60 * 60 * 1000;
        durationLabel = `${val} jam`;
      } else if (["b", "bln", "bulan"].includes(unit)) {
        durationMs = val * 30 * 24 * 60 * 60 * 1000;
        durationLabel = `${val} bulan`;
      } else if (["t", "thn", "tahun", "y"].includes(unit)) {
        durationMs = val * 365 * 24 * 60 * 60 * 1000;
        durationLabel = `${val} tahun`;
      } else {
        // 'd', 'day', 'h', 'hari' atau angka polos
        durationMs = val * 24 * 60 * 60 * 1000;
        durationLabel = `${val} hari`;
      }
    }
  }

  return { durationMs, durationLabel, isPermanent };
}

async function handler(m, { sock, jadibotId, isJadibot }) {
  const db = getDatabase();
  const cmd = m.command.toLowerCase();

  const isAdd = ["addprem", "addpremium", "setprem"].includes(cmd);
  const isDel = ["delprem", "delpremium"].includes(cmd);
  const isList = ["listprem", "premlist"].includes(cmd);

  if (!db.data.premium) db.data.premium = [];

  // ── 1. DAFTAR USER PREMIUM (.listprem) ──
  if (isList) {
    if (isJadibot && jadibotId) {
      const jbPremiums = getJadibotPremiums(jadibotId);
      if (jbPremiums.length === 0) {
        return m.reply(
          `💎 *DAFTAR PREMIUM JADIBOT*\n\nBelum ada user premium di jadibot ini.\nKetik \`${m.prefix}addprem <nomor>\` buat nambahin.`
        );
      }
      let txt = `💎 *DAFTAR PREMIUM JADIBOT* — ${jadibotId}\n\n`;
      const mentions = jbPremiums
        .map((p) => (typeof p === "string" ? p : p.jid))
        .map(toMentionJid)
        .filter(Boolean);
      jbPremiums.forEach((p, i) => {
        const num = typeof p === "string" ? p : p.jid;
        const number = String(num || "").replace(/[^0-9]/g, "");
        txt += `${i + 1}. @${number}\n`;
      });
      txt += `\nTotal: *${jbPremiums.length}* user premium\n\n*By: SHIRO HLZ*`;
      return m.reply(txt, { mentions });
    }

    if (db.data.premium.length === 0) {
      return m.reply(
        `💎 *DAFTAR PREMIUM*\n\nBelum ada user premium yang terdaftar saat ini.\nKetik \`${m.prefix}addprem <nomor> [durasi]\` buat nambahin.`
      );
    }

    let txt = `💎 *DAFTAR USER PREMIUM*\n\n`;
    const now = Date.now();
    const mentions = db.data.premium
      .map((p) => (typeof p === "string" ? p : p.id))
      .map(toMentionJid)
      .filter(Boolean);

    db.data.premium.forEach((p, i) => {
      const num = typeof p === "string" ? p : p.id;
      const isPerm = typeof p === "string" || !p.expired;
      const remaining = !isPerm
        ? Math.ceil((p.expired - now) / (1000 * 60 * 60 * 24))
        : null;
      const status = isPerm
        ? "Permanen"
        : remaining > 0
          ? `${remaining} hari lagi`
          : "⚠️ Kadaluwarsa";
      const number = String(num || "").replace(/[^0-9]/g, "");
      txt += `${i + 1}. @${number} — *${status}*\n`;
    });

    txt += `\nTotal: *${db.data.premium.length}* user premium aktif\n\n*By: SHIRO HLZ*`;
    return m.reply(txt, { mentions });
  }

  // ── 2. VALIDASI TARGET NOMOR ──
  let targetNumber = extractTarget(m);

  if (!targetNumber) {
    return m.reply(
      `⚡ *KELOLA PREMIUM*\n\n` +
      `○ Tambah Premium:\n` +
      `\`${m.prefix}addprem <nomor/@tag> [durasi]\`\n` +
      `_Contoh:_ \`${m.prefix}addprem 6281234567890 30d\`\n\n` +
      `○ Hapus Premium:\n` +
      `\`${m.prefix}delprem <nomor/@tag>\`\n\n` +
      `○ Cek Daftar:\n` +
      `\`${m.prefix}listprem\`\n\n` +
      `*By: SHIRO HLZ*`
    );
  }

  if (targetNumber.startsWith("0")) {
    targetNumber = "62" + targetNumber.slice(1);
  }

  if (targetNumber.length < 8 || targetNumber.length > 16) {
    return m.reply(`❌ Format nomor salah atau kurang lengkap.`);
  }

  // ── 3. MODE JADIBOT ──
  if (isJadibot && jadibotId) {
    if (isAdd) {
      if (addJadibotPremium(jadibotId, targetNumber)) {
        await m.react("💎");
        return m.reply(
          `✨ *SUKSES JADIBOT PREMIUM*\n\n✓ Nomor: \`${targetNumber}\`\n✓ Status: *Premium Jadibot Aktif*\n\n*By: SHIRO HLZ*`
        );
      } else {
        return m.reply(`❌ \`${targetNumber}\` sudah berstatus premium di Jadibot ini.`);
      }
    } else if (isDel) {
      if (removeJadibotPremium(jadibotId, targetNumber)) {
        await m.react("✅");
        return m.reply(
          `✓ Berhasil menghapus status premium \`${targetNumber}\` di Jadibot.`
        );
      } else {
        return m.reply(`❌ \`${targetNumber}\` bukan premium di Jadibot ini.`);
      }
    }
    return;
  }

  // ── 4. TAMBAH PREMIUM (.addprem) ──
  if (isAdd) {
    const existingIndex = db.data.premium.findIndex((p) =>
      typeof p === "string" ? p === targetNumber : p.id === targetNumber
    );

    const { durationMs, durationLabel, isPermanent } = parseDuration(m.args || [], targetNumber);
    const pushName = m.quoted?.pushName || m.pushName || "User";
    const now = Date.now();

    let newExpired = null;

    if (!isPermanent) {
      if (existingIndex !== -1) {
        const currentData = db.data.premium[existingIndex];
        const currentExpired = typeof currentData === "string" ? now : currentData.expired || now;
        const baseTime = currentExpired > now ? currentExpired : now;
        newExpired = baseTime + durationMs;

        if (typeof currentData === "string") {
          db.data.premium[existingIndex] = {
            id: targetNumber,
            expired: newExpired,
            name: pushName,
            addedAt: now,
          };
        } else {
          db.data.premium[existingIndex].expired = newExpired;
          db.data.premium[existingIndex].name = pushName;
        }
      } else {
        newExpired = now + durationMs;
        db.data.premium.push({
          id: targetNumber,
          expired: newExpired,
          name: pushName,
          addedAt: now,
        });
      }
    } else {
      // Permanen
      if (existingIndex !== -1) {
        db.data.premium[existingIndex] = {
          id: targetNumber,
          expired: null,
          name: pushName,
          addedAt: now,
        };
      } else {
        db.data.premium.push({
          id: targetNumber,
          expired: null,
          name: pushName,
          addedAt: now,
        });
      }
    }

    // Sinkronisasi ke database/main/users.json
    const jid = targetNumber + "@s.whatsapp.net";
    const user = db.getUser(jid) || db.setUser(jid);

    user.isPremium = true;
    user.energi = config.energi?.premium ?? 99999999;
    db.setUser(jid, user);
    db.updateExp(jid, 250000);
    db.updateKoin(jid, 50000);

    // Sinkronisasi ke src/lib/hillz-premium-db.js & database/main/
    try {
      const days = isPermanent ? 36500 : Math.max(1, Math.ceil(durationMs / (24 * 60 * 60 * 1000)));
      addPremiumFile(targetNumber, days, pushName);
    } catch { }

    db.save();

    await m.react("💎");
    const expText = isPermanent ? "*Permanen (Selamanya)*" : `*${formatDate(newExpired)}*`;
    return m.reply(
      `✨ *PREMIUM BERHASIL DITAMBAHKAN!*\n\n` +
      `✓ Akun: \`${targetNumber}\`\n` +
      `✓ Status: *PREMIUM AKTIF*\n` +
      `✓ Durasi: *${durationLabel}*\n` +
      `✓ Expired: ${expText}\n` +
      `⚡ Limit/Energi: *${user.energi === -1 ? '∞ Unlimited' : user.energi.toLocaleString('id-ID')}*\n\n` +
      `*By: SHIRO HLZ*`
    );
  }

  // ── 5. HAPUS PREMIUM (.delprem) ──
  if (isDel) {
    const index = db.data.premium.findIndex((p) =>
      typeof p === "string" ? p === targetNumber : p.id === targetNumber
    );

    if (index === -1) {
      return m.reply(`❌ Nomor \`${targetNumber}\` tidak terdaftar sebagai user premium.`);
    }

    db.data.premium.splice(index, 1);

    const jid = targetNumber + "@s.whatsapp.net";
    const user = db.getUser(jid);
    if (user) {
      user.isPremium = false;
      user.energi = config.energi?.default ?? 99999;
      db.setUser(jid, user);
    }

    try {
      removePremiumFile(targetNumber);
    } catch { }

    db.save();
    await m.react("✅");
    return m.reply(
      `✓ Status premium untuk \`${targetNumber}\` berhasil dicabut dan limit dikembalikan ke default.\n\n*By: SHIRO HLZ*`
    );
  }
}

export { pluginConfig as config, handler };
