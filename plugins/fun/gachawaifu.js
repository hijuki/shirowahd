import axios from 'axios';
import config from '../../config.js';
import te from '../../src/lib/hillz-error.js';

const pluginConfig = {
  name: 'gachawaifu',
  alias: ['waifu', 'gacha', 'waifugacha', 'rollwaifu'],
  category: 'fun',
  description: 'Gacha karakter waifu anime dengan status, rating, dan aksi interaktif',
  usage: '.gachawaifu',
  example: '.gachawaifu',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true
};

const WAIFU_TYPES = ['Tsundere', 'Yandere', 'Kuudere', 'Dandere', 'Deredere', 'Himedere'];
const RARITIES = [
  { tier: 'SSR ⭐⭐⭐⭐⭐', chance: 0.05, title: 'LEGENDARY WAIFU' },
  { tier: 'SR ⭐⭐⭐⭐', chance: 0.25, title: 'EPIC WAIFU' },
  { tier: 'R ⭐⭐⭐', chance: 0.70, title: 'RARE WAIFU' }
];

async function handler(m, { sock, db }) {
  await m.react('🎲');

  try {
    const res = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 15000 });
    const imgUrl = res.data?.url;

    const rand = Math.random();
    let selectedTier = RARITIES[2];
    if (rand < 0.05) selectedTier = RARITIES[0];
    else if (rand < 0.30) selectedTier = RARITIES[1];

    const type = WAIFU_TYPES[Math.floor(Math.random() * WAIFU_TYPES.length)];
    const affection = Math.floor(Math.random() * 60) + 40;
    const power = Math.floor(Math.random() * 5000) + 1000;

    const caption =
      `🌸 *GACHA WAIFU ROLL*\n\n` +
      `• *Rarity:* \`${selectedTier.tier}\` [${selectedTier.title}]\n` +
      `• *Tipe Sifat:* \`${type}\`\n` +
      `• *Affection Point:* \`${affection}%\` ❤️\n` +
      `• *Combat Power:* \`${power} CP\` ⚔️\n\n` +
      `> Mau gacha lagi? Ketik \`${m.prefix}gachawaifu\``;

    if (imgUrl) {
      await sock.sendMessage(m.chat, {
        image: { url: imgUrl },
        caption: caption
      }, { quoted: m.raw || m });
    } else {
      await m.reply(caption);
    }
    await m.react('✨');
  } catch (err) {
    console.error('GachaWaifu Error:', err);
    await m.react('❌');
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
