import axios from "axios";
import PhoneNum from "awesome-phonenumber";
import { getAssetBuffer } from "../../src/lib/hillz-asset-manager.js";

const pluginConfig = {
  name: "getcontact",
  alias: ["gtc", "tagkontak", "stalktag", "namanomor", "tags"],
  category: "stalker",
  description: "GetContact Tags & Name Intelligence: Mengetahui nama kontak tersimpan di HP orang lain",
  usage: ".getcontact <nomor / tag / reply>",
  example: ".getcontact 081234567890",
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

// Database generator & multi-engine resolver untuk GetContact & Caller ID
export async function fetchGetcontactTags(rawPhone) {
  let std = rawPhone.replace(/\D/g, "");
  if (std.startsWith("0")) std = "62" + std.slice(1);
  if (!std.startsWith("62")) std = "62" + std;

  const phone08 = "0" + std.slice(2);
  const tagsResult = {
    status: false,
    phone: `+${std}`,
    phoneLocal: phone08,
    name: null,
    totalTags: 0,
    tags: [],
    spamCount: 0,
    isSpam: false,
    source: "GetContact Cloud",
  };

  // Tier 1: Public Caller API Gateway
  try {
    const res = await axios.get(`https://api.siputzx.my.id/api/stalk/getcontact?nomor=${std}`, { timeout: 6000 }).catch(() => null);
    if (res?.data?.status && res?.data?.data) {
      const d = res.data.data;
      if (Array.isArray(d.tags) && d.tags.length > 0) {
        tagsResult.status = true;
        tagsResult.tags = d.tags;
        tagsResult.totalTags = d.tags.length;
        tagsResult.name = d.name || d.tags[0];
        return tagsResult;
      }
    }
  } catch {}

  // Tier 2: Backup Caller & Truecaller Resolver
  try {
    const res2 = await axios.get(`https://api.agatz.xyz/api/getcontact?nomor=${std}`, { timeout: 6000 }).catch(() => null);
    if (res2?.data?.status && res2?.data?.data) {
      const d = res2.data.data;
      const list = d.tags || d.result || [];
      if (list.length > 0) {
        tagsResult.status = true;
        tagsResult.tags = list;
        tagsResult.totalTags = list.length;
        tagsResult.name = d.name || list[0];
        return tagsResult;
      }
    }
  } catch {}

  // Tier 3: Heuristic Intelligence dari E-Wallet, WhatsApp Name, & Contact Directories
  try {
    const ewRes = await axios.get(`https://api.verifikasi.me/v1/inquiry?phone=${phone08}`, { timeout: 3500 }).catch(() => null);
    const names = [];
    if (ewRes?.data?.data) {
      const ed = ewRes.data.data;
      if (ed.dana?.name) names.push({ tag: ed.dana.name, count: 8, source: "DANA Verified" });
      if (ed.gopay?.name) names.push({ tag: ed.gopay.name, count: 6, source: "GoPay Verified" });
      if (ed.shopeepay?.name) names.push({ tag: ed.shopeepay.name, count: 5, source: "ShopeePay" });
      if (ed.ovo?.name) names.push({ tag: ed.ovo.name, count: 4, source: "OVO Account" });
    }

    if (names.length > 0) {
      tagsResult.status = true;
      tagsResult.tags = names.map((n) => `${n.tag} (${n.source})`);
      tagsResult.name = names[0].tag;
      tagsResult.totalTags = names.length;
      tagsResult.source = "E-Wallet Verified Identity";
      return tagsResult;
    }
  } catch {}

  return tagsResult;
}

async function handler(m, { sock, text, command }) {
  let targetRaw = "";

  if (m.quoted?.sender) {
    targetRaw = m.quoted.sender.split("@")[0];
  } else if (m.mentionedJid && m.mentionedJid[0]) {
    targetRaw = m.mentionedJid[0].split("@")[0];
  } else if (text && text.trim()) {
    targetRaw = text.replace(/[^0-9]/g, "");
  }

  if (!targetRaw || targetRaw.length < 5) {
    return m.reply(
      `🏷️ *ɢᴇᴛᴄᴏɴᴛᴀᴄᴛ ᴛᴀɢs & ɴᴀᴍᴇ ɪɴᴛᴇʟ*\n\n` +
        `> Lihat bagaimana orang lain menyimpan nomor target di buku telepon.\n\n` +
        `*Cara Penggunaan:*\n` +
        `> • \`${m.prefix}${command} 081234567890\`\n` +
        `> • Reply chat target dengan \`${m.prefix}${command}\`\n` +
        `> • Tag kontak target: \`${m.prefix}${command} @user\``
    );
  }

  let numClean = targetRaw.replace(/^0/, "62");
  if (!numClean.startsWith("62")) numClean = "62" + numClean;
  const std08 = "0" + numClean.slice(2);

  m.react("🔍");
  await m.reply(`🔍 *ᴍᴇᴍɪɴᴅᴀɪ ɢᴇᴛᴄᴏɴᴛᴀᴄᴛ ᴛᴀɢs...*\n\n> Target: \`+${numClean}\` (\`${std08}\`)\n> Menghubungkan ke buku telepon & database kontak...`);

  try {
    const data = await fetchGetcontactTags(numClean);

    let ppUrl = "";
    try {
      ppUrl = await sock.profilePictureUrl(`${numClean}@s.whatsapp.net`, "image");
    } catch {}

    let body = `🗂️ *━━━━━━━━━━━━━━━━━━━━━━━*\n`;
    body += `🏷️ *ɢᴇᴛᴄᴏɴᴛᴀᴄᴛ • ᴛᴀɢ ɪɴᴛᴇʟʟɪɢᴇɴᴄᴇ*\n`;
    body += `🗂️ *━━━━━━━━━━━━━━━━━━━━━━━*\n\n`;

    body += `╭┈┈⬡「 📱 *ᴛᴀʀɢᴇᴛ ɴᴜᴍʙᴇʀ* 」\n`;
    body += `┃ 📞 *Nomor:* \`+${numClean}\` (${std08})\n`;
    body += `┃ 👤 *Nama Utama:* ${data.name || "TIDAK TERBUKA / PRIVATE"}\n`;
    body += `┃ 📊 *Total Tag Ditemukan:* ${data.tags.length} tag\n`;
    body += `┃ 📡 *Sumber Data:* ${data.source}\n`;
    body += `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n`;

    if (data.tags.length > 0) {
      body += `🏷️ *Daftar Nama Kontak Tersimpan:*\n`;
      data.tags.slice(0, 15).forEach((t, idx) => {
        body += `> *${idx + 1}.* ${t}\n`;
      });
      if (data.tags.length > 15) {
        body += `> _...dan ${data.tags.length - 15} tag lainnya._\n`;
      }
    } else {
      body += `⚠️ *Tidak Ada Tag Kontak Publik:*\n`;
      body += `> Nomor ini belum memiliki riwayat tag yang dibagikan secara publik di database GetContact/Truecaller.\n`;
    }

    body += `\n💡 *Gunakan \`${m.prefix}dossier ${std08}\` untuk investigasi HLR, status WA, & skor ancaman lengkap.*`;

    const buttons = [
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "🗂️ Buka Full Dossier",
          id: `${m.prefix}dossier ${numClean}`,
        }),
      },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "💬 Chat WhatsApp",
          url: `https://wa.me/${numClean}`,
          merchant_url: `https://wa.me/${numClean}`,
        }),
      },
    ];

    const headerSource = ppUrl || getAssetBuffer("hillz");

    try {
      await sock.sendButton(
        m.chat,
        headerSource,
        body,
        m,
        {
          buttons,
          footer: "SHIROWAHD • GetContact Intelligence",
        }
      );
    } catch {
      if (ppUrl) {
        await sock.sendMessage(m.chat, { image: { url: ppUrl }, caption: body }, { quoted: m });
      } else {
        await sock.sendMessage(m.chat, { text: body }, { quoted: m });
      }
    }

    m.react("✅");
  } catch (err) {
    m.react("❌");
    await m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴀᴍʙɪʟ ᴛᴀɢ*\n\n> Terjadi kesalahan: _${err.message}_`);
  }
}

export { pluginConfig as config, handler };
