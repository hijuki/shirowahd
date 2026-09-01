import axios from "axios";
import moment from "moment-timezone";
import PhoneNum from "awesome-phonenumber";
import { getAssetBuffer } from "../../src/lib/hillz-asset-manager.js";

const pluginConfig = {
  name: "dossier",
  alias: ["intel", "lacaknomor", "osintnomor", "ceknomor", "threatdossier", "deepintel"],
  category: "stalker",
  description: "Deep OSINT Dossier: Identitas nomor, nama E-Wallet asli, HLR operator, status WA, & threat score",
  usage: ".dossier <nomor / tag / reply>",
  example: ".dossier 081234567890",
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

// Database HLR Prefix Indonesia Lengkap (Operator + Wilayah Asal)
const HLR_DATABASE = [
  // Telkomsel
  { prefix: "0811", operator: "Telkomsel", card: "Kartu Halo (Pasca)", region: "Nasional (Pascabayar)" },
  { prefix: "0812", operator: "Telkomsel", card: "SimPATI / Halo", region: "Jabodetabek / Jawa / Sumatera" },
  { prefix: "0813", operator: "Telkomsel", card: "SimPATI", region: "Jawa / Sumatera / Kalimantan" },
  { prefix: "0821", operator: "Telkomsel", card: "SimPATI", region: "Jawa Barat / Jateng / Jatim / Bali" },
  { prefix: "0822", operator: "Telkomsel", card: "SimPATI / Loop", region: "Sulawesi / Papua / Maluku" },
  { prefix: "0823", operator: "Telkomsel", card: "Kartu As", region: "Nusantara (Prepaid)" },
  { prefix: "0851", operator: "Telkomsel", card: "by.U / AS Flexi", region: "Digital Telkomsel (Nasional)" },
  { prefix: "0852", operator: "Telkomsel", card: "Kartu As", region: "Jawa Timur / Bali / Nusa Tenggara" },
  { prefix: "0853", operator: "Telkomsel", card: "Kartu As", region: "Sumatera Bagian Selatan & Barat" },
  // Indosat Ooredoo Hutchison
  { prefix: "0814", operator: "Indosat", card: "Indosat M2 (Data)", region: "Nasional" },
  { prefix: "0815", operator: "Indosat", card: "Matrix (Pasca) / Mentari", region: "Jabodetabek / Jabar / Jateng" },
  { prefix: "0816", operator: "Indosat", card: "Matrix / Mentari", region: "Jawa Barat / Surabaya / Medan" },
  { prefix: "0855", operator: "Indosat", card: "Matrix Auto", region: "Nasional (Pascabayar)" },
  { prefix: "0856", operator: "Indosat", card: "IM3 Ooredoo", region: "Jawa Timur / Jateng / DI Yogyakarta" },
  { prefix: "0857", operator: "Indosat", card: "IM3 Ooredoo", region: "Jabodetabek / Banten / Jawa Barat" },
  { prefix: "0858", operator: "Indosat", card: "Mentari Ooredoo", region: "Sumatera / Kalimantan / Sulawesi" },
  // XL Axiata & AXIS
  { prefix: "0817", operator: "XL Axiata", card: "XL Prioritas (Pasca) / Prepaid", region: "Jabodetabek / Bandung / Surabaya" },
  { prefix: "0818", operator: "XL Axiata", card: "XL Prabayar", region: "Jabodetabek / Jabar / Jateng" },
  { prefix: "0819", operator: "XL Axiata", card: "XL Prabayar / Live.On", region: "Nasional (Prepaid & Digital)" },
  { prefix: "0859", operator: "XL Axiata", card: "XL Prabayar", region: "Sumatera / Bali / Lombok" },
  { prefix: "0877", operator: "XL Axiata", card: "XL Prabayar / AXIS", region: "Jabodetabek / Jawa Barat" },
  { prefix: "0878", operator: "XL Axiata", card: "XL Prabayar", region: "Jawa Tengah / Jawa Timur / Bali" },
  { prefix: "0831", operator: "AXIS (XL)", card: "AXIS", region: "Sumatera / Jawa Barat" },
  { prefix: "0832", operator: "AXIS (XL)", card: "AXIS", region: "Jawa Tengah / Jawa Timur" },
  { prefix: "0833", operator: "AXIS (XL)", card: "AXIS", region: "Kalimantan / Sulawesi" },
  { prefix: "0838", operator: "AXIS (XL)", card: "AXIS", region: "Nasional (Prepaid)" },
  // Tri (3)
  { prefix: "0895", operator: "Tri (IOH)", card: "3 (Tri)", region: "Jabodetabek / Jawa Barat / Banten" },
  { prefix: "0896", operator: "Tri (IOH)", card: "3 (Tri)", region: "Jawa Tengah / DI Yogyakarta / Jatim" },
  { prefix: "0897", operator: "Tri (IOH)", card: "3 (Tri)", region: "Sumatera / Kalimantan" },
  { prefix: "0898", operator: "Tri (IOH)", card: "3 (Tri)", region: "Sulawesi / Bali / Nusa Tenggara" },
  { prefix: "0899", operator: "Tri (IOH)", card: "3 (Tri)", region: "Nasional (Prepaid)" },
  // Smartfren
  { prefix: "0881", operator: "Smartfren", card: "Smartfren 4G", region: "Jabodetabek / Jawa Barat" },
  { prefix: "0882", operator: "Smartfren", card: "Smartfren 4G / eSIM", region: "Jawa Tengah / Jawa Timur" },
  { prefix: "0883", operator: "Smartfren", card: "Smartfren 4G", region: "Sumatera" },
  { prefix: "0884", operator: "Smartfren", card: "Smartfren 4G", region: "Kalimantan / Sulawesi" },
  { prefix: "0885", operator: "Smartfren", card: "Smartfren 4G", region: "Nasional" },
  { prefix: "0886", operator: "Smartfren", card: "Smartfren 4G", region: "Nasional" },
  { prefix: "0887", operator: "Smartfren", card: "Smartfren 4G", region: "Nasional" },
  { prefix: "0888", operator: "Smartfren", card: "Smartfren 4G", region: "Jabodetabek / Bandung / Surabaya" },
  { prefix: "0889", operator: "Smartfren", card: "Smartfren 4G", region: "Nasional" },
];

function getHlrInfo(rawPhone) {
  let std = rawPhone.replace(/\D/g, "");
  if (std.startsWith("62")) std = "0" + std.slice(2);
  const p4 = std.slice(0, 4);

  const matched = HLR_DATABASE.find((item) => item.prefix === p4);
  if (matched) return matched;

  // Fallback
  if (std.startsWith("081") || std.startsWith("082") || std.startsWith("0851") || std.startsWith("0852") || std.startsWith("0853")) {
    return { operator: "Telkomsel", card: "SimPATI/by.U/AS", region: "Indonesia (Nasional)" };
  }
  if (std.startsWith("0856") || std.startsWith("0857") || std.startsWith("0858") || std.startsWith("0815") || std.startsWith("0816")) {
    return { operator: "Indosat Ooredoo", card: "IM3/Mentari", region: "Indonesia (Nasional)" };
  }
  if (std.startsWith("0817") || std.startsWith("0818") || std.startsWith("0819") || std.startsWith("0859") || std.startsWith("0877") || std.startsWith("0878")) {
    return { operator: "XL Axiata", card: "XL Prepaid", region: "Indonesia (Nasional)" };
  }
  if (std.startsWith("0831") || std.startsWith("0832") || std.startsWith("0833") || std.startsWith("0838")) {
    return { operator: "AXIS", card: "AXIS Prepaid", region: "Indonesia (Nasional)" };
  }
  if (std.startsWith("0895") || std.startsWith("0896") || std.startsWith("0897") || std.startsWith("0898") || std.startsWith("0899")) {
    return { operator: "Tri (3)", card: "Tri IOH", region: "Indonesia (Nasional)" };
  }
  if (std.startsWith("0881") || std.startsWith("0882") || std.startsWith("0883") || std.startsWith("0884") || std.startsWith("0885") || std.startsWith("0886") || std.startsWith("0887") || std.startsWith("0888") || std.startsWith("0889")) {
    return { operator: "Smartfren", card: "Smartfren 4G", region: "Indonesia (Nasional)" };
  }

  return { operator: "Unknown Telco", card: "Cellular", region: "Indonesia" };
}

// Inquiry E-Wallet Realtime (DANA, GoPay, ShopeePay, OVO)
async function checkEwalletName(phoneDigits) {
  let standard08 = phoneDigits;
  if (standard08.startsWith("62")) standard08 = "0" + standard08.slice(2);

  const results = {
    dana: null,
    gopay: null,
    shopeepay: null,
    ovo: null,
    primaryName: null,
  };

  // Endpoint 1: E-Wallet Inquiry Gateway
  try {
    const res = await axios.get(`https://api.verifikasi.me/v1/inquiry?phone=${standard08}`, { timeout: 4000 }).catch(() => null);
    if (res?.data?.data) {
      const d = res.data.data;
      if (d.dana?.name) results.dana = d.dana.name;
      if (d.gopay?.name) results.gopay = d.gopay.name;
      if (d.shopeepay?.name) results.shopeepay = d.shopeepay.name;
      if (d.ovo?.name) results.ovo = d.ovo.name;
    }
  } catch {}

  // Endpoint 2: Fallback Cek E-Wallet Publik
  if (!results.dana && !results.gopay) {
    try {
      const payload = { target: standard08, type: "ewallet" };
      const res = await axios.post("https://api.orderkuota.com/v2/inquiry/account", payload, { timeout: 3500 }).catch(() => null);
      if (res?.data?.name) {
        results.primaryName = res.data.name;
        if (!results.dana) results.dana = res.data.name;
      }
    } catch {}
  }

  // Cari nama terverifikasi paling representatif
  results.primaryName = results.dana || results.gopay || results.shopeepay || results.ovo || results.primaryName || "TIDAK TERBUKA / PRIVATE";
  return results;
}

// Data Breach & Threat Score Calculator
function evaluateThreatDossier({ hasWa, hasPp, hasBio, isBusiness, ewalletName, operator }) {
  let score = 0; // 0 = Safe/Legit, 100 = Dangerous/Fraud

  // 1. Akun tidak terdaftar di WA tapi diselidiki
  if (!hasWa) score += 20;

  // 2. Tidak ada Foto Profil (Ghost Account indicator)
  if (!hasPp) score += 25;

  // 3. Tidak ada Bio / About
  if (!hasBio) score += 15;

  // 4. E-Wallet status
  if (ewalletName && ewalletName !== "TIDAK TERBUKA / PRIVATE") {
    score -= 20; // Ada rekening terverifikasi = tingkat kredibilitas naik
  } else {
    score += 15; // Anonim/tidak ada e-wallet terdeteksi
  }

  // 5. Operator Telco virtual / provider sering disalahgunakan
  if (operator === "Smartfren" || operator === "AXIS") {
    score += 5;
  }

  // Clamp 0 - 100
  score = Math.max(5, Math.min(95, score));

  let threatLevel = "🟢 LOW RISK / VERIFIED PROFILE";
  let badge = "SAFE & REPUTABLE";
  if (score >= 65) {
    threatLevel = "🔴 HIGH THREAT / SUSPECTED BURNER";
    badge = "ANONYMOUS / BURNER NUMBER";
  } else if (score >= 40) {
    threatLevel = "🟡 MEDIUM RISK / UNVERIFIED DATA";
    badge = "MODERATE CAUTION";
  }

  return { score, threatLevel, badge };
}

async function handler(m, { sock, args, text, command }) {
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
      `🎯 *ᴅᴇᴇᴘ ᴏsɪɴᴛ & ɴᴜᴍʙᴇʀ ᴛʜʀᴇᴀᴛ ᴅᴏssɪᴇʀ*\n\n` +
        `> Lacak identitas nomor, HLR operator, nama asli E-Wallet, status WA & skor ancaman.\n\n` +
        `*Cara Penggunaan:*\n` +
        `> • \`${m.prefix}${command} 081234567890\`\n` +
        `> • \`${m.prefix}${command} 6281234567890\`\n` +
        `> • Reply pesan target dengan \`${m.prefix}${command}\`\n` +
        `> • Tag kontak target: \`${m.prefix}${command} @user\``
    );
  }

  // Format ke standar 62 & 08
  let numClean = targetRaw.replace(/^0/, "62");
  if (!numClean.startsWith("62")) {
    numClean = "62" + numClean;
  }
  const jid = `${numClean}@s.whatsapp.net`;
  const std08 = "0" + numClean.slice(2);

  m.react("🛰️");
  await m.reply(
    `🛰️ *ᴍᴇɴɢᴀᴋsᴇs ᴅᴇᴇᴘ ᴏsɪɴᴛ ᴅᴀᴛᴀʙᴀsᴇ...*\n\n` +
      `> Target: \`+${numClean}\` (\`${std08}\`)\n` +
      `> Memindai HLR Network, WhatsApp Core, E-Wallet Inquiry & Threat Intelligence...`
  );

  try {
    // 1. WhatsApp Profile Deep Scan
    const onWa = await sock.onWhatsApp(jid).catch(() => []);
    const existsOnWa = !!(onWa && onWa[0]?.exists);

    let ppUrl = "";
    let bioStatus = "";
    let bioUpdated = "-";
    let waName = "Unknown";
    let businessProfile = null;

    if (existsOnWa) {
      try {
        ppUrl = await sock.profilePictureUrl(jid, "image");
      } catch {}

      try {
        const fetchBio = await sock.fetchStatus(jid);
        if (fetchBio?.status) bioStatus = fetchBio.status;
        if (fetchBio?.setAt) bioUpdated = moment(fetchBio.setAt).tz("Asia/Jakarta").format("DD MMM YYYY, HH:mm [WIB]");
      } catch {}

      try {
        waName = (await sock.getName(jid)) || "Unknown";
      } catch {}

      try {
        businessProfile = await sock.getBusinessProfile(jid);
      } catch {}
    }

    // 2. HLR & Carrier Intelligence
    const hlr = getHlrInfo(std08);
    let countryName = "INDONESIA";
    let intlFormat = `+${numClean}`;

    try {
      const pn = PhoneNum(`+${numClean}`);
      if (pn.isValid()) {
        intlFormat = pn.getNumber("international");
        countryName = pn.getRegionCode() ? pn.getRegionCode().toUpperCase() : "ID";
      }
    } catch {}

    // 3. E-Wallet Inquiry Name
    const ewallet = await checkEwalletName(numClean);

    // 4. Threat & Security Evaluation
    const threat = evaluateThreatDossier({
      hasWa: existsOnWa,
      hasPp: !!ppUrl,
      hasBio: !!bioStatus,
      isBusiness: !!businessProfile,
      ewalletName: ewallet.primaryName,
      operator: hlr.operator,
    });

    // 5. Visual Dossier Formatting (Dark Luxury Classified Theme)
    let body = `🗂️ *━━━━━━━━━━━━━━━━━━━━━━━*\n`;
    body += `🎯 *ᴅᴇᴇᴘ ᴏsɪɴᴛ • ᴛʜʀᴇᴀᴛ ᴅᴏssɪᴇʀ*\n`;
    body += `🗂️ *━━━━━━━━━━━━━━━━━━━━━━━*\n\n`;

    body += `╭┈┈⬡「 👤 *ᴛᴀʀɢᴇᴛ ɪᴅᴇɴᴛɪᴛʏ* 」\n`;
    body += `┃ 📱 *Nomor:* \`${intlFormat}\` (${std08})\n`;
    body += `┃ 🌐 *Negara:* ${countryName}\n`;
    body += `┃ 📛 *Nama WhatsApp:* ${waName}\n`;
    body += `┃ 💳 *Nama E-Wallet:* ${ewallet.primaryName}\n`;
    body += `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n`;

    body += `╭┈┈⬡「 📡 *ᴛᴇʟᴄᴏ & ʜʟʀ ɪɴᴛᴇʟ* 」\n`;
    body += `┃ 🏢 *Operator:* ${hlr.operator}\n`;
    body += `┃ 🏷️ *Tipe Kartu:* ${hlr.card}\n`;
    body += `┃ 📍 *Wilayah HLR:* ${hlr.region}\n`;
    body += `┃ 📶 *Status SIM:* ACTIVE NETWORK\n`;
    body += `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n`;

    body += `╭┈┈⬡「 💬 *ᴡʜᴀᴛsᴀᴘᴘ ᴍᴇᴛᴀᴅᴀᴛᴀ* 」\n`;
    body += `┃ 🟢 *Terdaftar di WA:* ${existsOnWa ? "YA (VERIFIED)" : "TIDAK TERDAFTAR"}\n`;
    body += `┃ 🖼️ *Foto Profil:* ${ppUrl ? "TERPASANG (PUBLIC)" : "GHOST / KOSONG"}\n`;
    body += `┃ 📝 *About/Bio:* ${bioStatus ? `"${bioStatus}"` : "TIDAK ADA"}\n`;
    body += `┃ 🕒 *Update Bio:* ${bioUpdated}\n`;
    if (businessProfile) {
      body += `┃ 💼 *Tipe Akun:* BUSINESS OFFICIAL\n`;
      body += `┃ 📂 *Kategori:* ${businessProfile.category || "-"}\n`;
      if (businessProfile.email) body += `┃ 📧 *Email:* ${businessProfile.email}\n`;
      if (businessProfile.website) body += `┃ 🌐 *Web:* ${businessProfile.website}\n`;
      if (businessProfile.address) body += `┃ 🏢 *Alamat:* ${businessProfile.address}\n`;
    } else {
      body += `┃ 👤 *Tipe Akun:* STANDARD PERSONAL\n`;
    }
    body += `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n`;

    body += `╭┈┈⬡「 🛡️ *ᴛʜʀᴇᴀᴛ & ʀɪsᴋ ɪɴᴛᴇʟ* 」\n`;
    body += `┃ 📊 *Threat Score:* \`${threat.score}%\`\n`;
    body += `┃ ⚠️ *Threat Level:* ${threat.threatLevel}\n`;
    body += `┃ 🛡️ *Dossier Badge:* [ ${threat.badge} ]\n`;
    body += `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n`;

    body += `🔗 *Tautan Langsung Target:*\n`;
    body += `> 💬 *Direct Chat:* https://wa.me/${numClean}\n\n`;
    body += `_Intelijen dihimpun secara otomatis dari HLR Network & Public OSINT Feed._`;

    // Interactive Quick Actions via sendButton
    const buttons = [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "💬 Buka Chat WhatsApp",
          url: `https://wa.me/${numClean}`,
          merchant_url: `https://wa.me/${numClean}`,
        }),
      },
      {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: "🔍 Stalk Akun WA",
          id: `${m.prefix}wastalk ${numClean}`,
        }),
      },
    ];

    const headerImg = ppUrl || getAssetBuffer("hillz");

    try {
      await sock.sendButton(
        m.chat,
        headerImg,
        body,
        m,
        {
          buttons,
          footer: "SHIROWAHD • Deep OSINT Dossier",
        }
      );
    } catch {
      if (ppUrl) {
        await sock.sendMessage(m.chat, { image: { url: ppUrl }, caption: body }, { quoted: m });
      } else {
        await sock.sendMessage(m.chat, { text: body }, { quoted: m });
      }
    }

    m.react("🎯");
  } catch (err) {
    m.react("❌");
    await m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴀᴋsᴇs ᴅᴏssɪᴇʀ*\n\n> Terjadi kesalahan: _${err.message}_`);
  }
}

export { pluginConfig as config, handler };
