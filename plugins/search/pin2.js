import { generateWAMessageFromContent, prepareWAMessageMedia } from 'hillz';
import axios from 'axios';
import te from '../../src/lib/hillz-error.js';
import config from '../../config.js';

const pluginConfig = {
  name: 'pin2',
  alias: ['pinterest2', 'pinnext'],
  category: 'search',
  description: 'Cari gambar Pinterest dengan tombol interaktif Next',
  usage: '.pin2 <query>',
  example: '.pin2 anime aesthetic',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true
};

async function getPinterestImages(query) {
  try {
    const res = await axios.get(`https://api.cuki.biz.id/api/search/pinterest?apikey=cuki-x&query=${encodeURIComponent(query)}&type=image`, { timeout: 10000 });
    const results = res.data?.data?.results;
    if (results && results.length > 0) {
      return results.filter(item => item.image_url).map(item => item.image_url);
    }
  } catch {}
  return [];
}

async function handler(m, { sock, args }) {
  const query = args.join(' ').trim();
  if (!query) {
    return m.reply(`🔍 *PINTEREST INTERAKTIF*\n\n> Masukkan kata kunci pencarian!\n\n*Contoh:* \`${m.prefix}pin2 anime aesthetic\``);
  }

  if (typeof m.react === 'function') {
    try { await m.react('⏳'); } catch {}
  }

  try {
    const images = await getPinterestImages(query);
    if (!images || images.length === 0) {
      if (typeof m.react === 'function') try { await m.react('❌'); } catch {}
      return m.reply(`❌ *HASIL TIDAK DITEMUKAN*\n\n> Gambar tidak ditemukan untuk kata kunci: *${query}*`);
    }

    const randomImg = images[Math.floor(Math.random() * images.length)];
    const imgRes = await axios.get(randomImg, { responseType: 'arraybuffer', timeout: 15000 });
    const imgBuffer = Buffer.from(imgRes.data);

    const media = await prepareWAMessageMedia(
      { image: imgBuffer },
      { upload: sock.waUploadToServer }
    );

    const buttons = [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🎲 Ambil Lagi (Next)',
          id: `${m.prefix}pin2 ${query}`
        })
      },
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '📦 Album Versi (.pin)',
          id: `${m.prefix}pin ${query}`
        })
      }
    ];

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: {
            body: { text: `🎨 *PINTEREST EXPLORER*\n\n> 🔍 *Pencarian:* \`${query}\`\n> 📸 *Total Hasil:* ${images.length} Gambar` },
            footer: { text: `${config.bot?.name || 'SHIROWAHD'} • Tap tombol untuk ganti gambar` },
            header: {
              title: '📌 *PINTEREST IMAGE*',
              hasMediaAttachment: true,
              imageMessage: media.imageMessage
            },
            nativeFlowMessage: { buttons }
          }
        }
      }
    }, { quoted: m.raw || m });

    await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    if (typeof m.react === 'function') try { await m.react('✅'); } catch {}
  } catch (err) {
    console.error('[Pin2 Error]:', err);
    if (typeof m.react === 'function') try { await m.react('❌'); } catch {}
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
