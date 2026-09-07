import { getContentType } from "hillz";

const pluginConfig = {
  name: "antistatus",
  alias: ["anticall", "antistory"],
  category: "group",
  description: "Auto hapus jika ada yang mengirim status/story ke dalam grup",
  usage: ".antistatus on / off",
  example: ".antistatus on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, args, db }) {
  if (!m.isOwner && !m.isAdmin) {
    return m.reply("❌ Perintah ini khusus untuk Admin Grup atau Owner!");
  }
  const action = args[0]?.toLowerCase();
  if (!action || !["on", "off"].includes(action)) {
    return m.reply("*PILIHAN STATUS ANTISTATUS*\n\nCara pakai:\n- `" + m.prefix + "antistatus on` (Aktifkan)\n- `" + m.prefix + "antistatus off` (Matikan)");
  }
  if (!db.data) db.data = {};
  if (!db.data.chats) db.data.chats = {};
  if (!db.data.chats[m.chat]) db.data.chats[m.chat] = {};
  db.data.chats[m.chat].antistatus = action === "on";
  await m.reply("✅ Berhasil " + (action === "on" ? "mengaktifkan" : "menonaktifkan") + " fitur *Anti-Status* di grup ini.");
}

async function before(m, { sock, db }) {
  if (!m.isGroup) return;
  const chatData = db?.data?.chats?.[m.chat];
  if (!chatData || !chatData.antistatus) return;
  try {
    const type = getContentType(m.message);
    const isStatusMessage =
      type === "protocolMessage" ||
      m.chat.endsWith("@broadcast") ||
      m.message?.protocolMessage?.type === 0 ||
      JSON.stringify(m.message || {}).includes("status");
    if (isStatusMessage && m.isBotAdmin) {
      await sock.sendMessage(m.chat, { delete: m.key });
      return true;
    }
  } catch {}
}

export { pluginConfig as config, handler, before };
