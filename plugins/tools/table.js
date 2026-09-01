
const pluginConfig = {
  name: "table",
  alias: ["tabel", "tabels", "grid"],
  category: "tools",
  description: "Membuat tabel spreadsheet Native WhatsApp resmi",
  usage: ".tabel <Judul> | <Header1, Header2> | <Data baris 1> | <Data baris 2>",
  example: ".tabel Daftar Harga VPN | Paket, Durasi, Harga | VIP All-in-One, 30 Hari, 25.000 | SSH Only, 30 Hari, 15.000",
  isOwner: false,
  isPremium: false,
  isGroup: false,
};

async function handler(m, { sock, args, text, command }) {
  if (!text) {
    return m.reply(
      `Format penggunaan tabel native WhatsApp:\n` +
      `*${m.prefix}${command} <Judul> | <Header1, Header2> | <Baris 1 col1, col2> | ...*\n\n` +
      `*Contoh:*\n` +
      `\`${m.prefix}${command} Paket SHIROVPN | Layanan, Durasi, Harga | VIP All-in-One, 30 Hari, 25k | SSH WebSocket, 30 Hari, 15k | VLESS Trojan, 30 Hari, 15k\``
    );
  }

  const parts = text.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) {
    return m.reply("Harap sertakan minimal Judul dan Header tabel yang dipisahkan tanda | (pipa)");
  }

  const title = parts[0];
  const headers = parts[1].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 2; i < parts.length; i++) {
    const cols = parts[i].split(",").map((c) => c.trim());
    rows.push(cols);
  }

  try {
    await sock.sendTable(m.chat, title, headers, rows, m, {
      disclaimerText: "Data digenerate resmi via SHIROWAHD Native Engine",
    });
  } catch (err) {
    console.error("[TablePlugin] Error:", err);
    m.reply("Gagal membuat tabel native: " + err.message);
  }
}

export default {
  config: pluginConfig,
  handler,
};
