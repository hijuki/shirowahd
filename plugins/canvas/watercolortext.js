import config from '../../config.js';
import axios from 'axios';

const pluginConfig = {
  name: "watercolortext2",
  alias: ["wctext", "watercolorart"],
  category: 'canvas',
  description: 'Buat gambar teks dengan efek watercolor',
  usage: '.watercolortext <teks>',
  example: '.watercolortext SHIRO',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, conn, args }) {
  const client = sock || conn;
  const text = (args && args.length) ? args.join(' ') : (m.text || '').trim();

  if (!text) {
    return m.reply(
      `🎨 *WATERCOLOR TEXT*\n\n> Masukkan teks yang ingin dijadikan gambar\n\n\`Contoh: ${m.prefix || '.'}watercolortext SHIRO\``
    );
  }

  if (typeof m.react === 'function') await m.react('🎨');

  try {
    const apikey = config.APIkey?.cuki || 'cuki';
    const url = `https://api.cuki.biz.id/api/ephoto/watercolortext?apikey=${apikey}&query=${encodeURIComponent(text)}`;
    
    const { data } = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const imageBuffer = Buffer.from(data);

    if (typeof m.react === 'function') await m.react('✅');
    await client.sendMessage(m.chat, { 
      image: imageBuffer, 
      caption: `🎨 *Water Color Text*\n\nTeks: ${text}` 
    }, { quoted: m });
  } catch (error) {
    console.error('[watercolortext]', error);
    if (typeof m.react === 'function') await m.react('❌');
    m.reply(`❌ *GAGAL*\n\n> ${error.message}`);
  }
}

export { pluginConfig as config, handler };
