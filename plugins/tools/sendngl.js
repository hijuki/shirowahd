import te from "../../src/lib/ourin-error.js";
import axios from "axios";

const pluginConfig = {
  name: "sendngl",
  alias: [],
  category: "tools",
  description: "Send NGL",
  usage: ".sendngl <url> | <text>",
  example: ".sendngl https://ngl.link/xxxx | hai",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function extractUsername(link) {
  const match = link.trim().match(/(?:https?:\/\/)?ngl\.link\/([a-zA-Z0-9_.]+)/i);
  if (match) return match[1];
  const clean = link.trim().replace(/[^a-zA-Z0-9_.]/g, '');
  return clean || null;
}

async function handler(m, { sock }) {
  const text = m.text?.split("|");
  const link = text?.[0]?.trim();
  const kata = text?.[1]?.trim();
  if (!link)
    return m.reply(
      `*LINK NGL NYA MANA ??*\nContoh: \`${m?.prefix}sendngl https://ngl.link/xxxx | hai\``,
    );
  if (!kata)
    return m.reply(
      `*KATA KATA NYA MANA ??*\n\nContoh: \`${m?.prefix}sendngl https://ngl.link/xxxx | hai\``,
    );

  const username = extractUsername(link);
  if (!username)
    return m.reply(`*USERNAME NGL TIDAK VALID*`);

  m.react("🎴");

  try {
    await axios.post("https://ngl.link/api/submit", {
      username,
      question: kata,
      deviceId: "wa-" + Math.random().toString(36).slice(2) + Date.now(),
      gameSlug: "",
      referrer: ""
    }, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/json",
        "Origin": "https://ngl.link",
        "Referer": "https://ngl.link/" + username,
      },
      timeout: 15000
    });

    m.react("✅");
    await sock.sendMessage(
      m.chat,
      {
        text: `✅ *DONE*\n\nBerhasil mengirim pesan!\nTarget: ngl.link/${username}\nPesan: ${kata}`,
      },
      { quoted: m },
    );
  } catch (error) {
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
