import axios from 'axios';
import { generateWAMessage, generateWAMessageFromContent, jidNormalizedUser } from 'hillz';
import config from '../../config.js';
import te from '../../src/lib/hillz-error.js';

const pluginConfig = {
  name: 'bingimage',
  alias: ['imagesearch', 'carigambar', 'bingimg'],
  category: 'search',
  description: 'Cari gambar HD via Bing Image Search dan kirim sebagai Album',
  usage: '.carigambar <query>',
  example: '.carigambar pemandangan jepang',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true
};

async function searchBing(query) {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    const html = res.data;
    const matches = [...html.matchAll(/murl&quot;:&quot;(https?:\/\/[^&]+)&quot;/g)];
    const urls = matches.map(m => m[1]).filter(u => u.endsWith('.jpg') || u.endsWith('.png') || u.endsWith('.jpeg') || u.includes('image'));
    return [...new Set(urls)].slice(0, 5);
  } catch {}
  return [];
}

async function handler(m, { sock, args }) {
  const query = args.join(' ').trim();
  if (!query) {
    return m.reply(`🔍 *BING IMAGE SEARCH*\n\n> Masukkan kata kunci pencarian gambar!\n\n*Contoh:* \`${m.prefix}carigambar anime cyberpunk\``);
  }

  if (typeof m.react === 'function') try { await m.react('⏳'); } catch {}

  try {
    let images = await searchBing(query);
    if (!images || images.length === 0) {
      // Fallback ke Pinterest API
      const res = await axios.get(`https://api.cuki.biz.id/api/search/pinterest?apikey=cuki-x&query=${encodeURIComponent(query)}&type=image`, { timeout: 10000 }).catch(() => null);
      images = (res?.data?.data?.results || []).filter(i => i.image_url).map(i => i.image_url).slice(0, 5);
    }

    if (!images || images.length === 0) {
      if (typeof m.react === 'function') try { await m.react('❌'); } catch {}
      return m.reply(`❌ *GAMBAR TIDAK DITEMUKAN*\n\n> Tidak ditemukan gambar untuk pencarian: *${query}*`);
    }

    const contextInfo = {
      isForwarded: true,
      forwardingScore: 1,
      forwardOrigin: 4
    };

    const albumCards = await Promise.all(
      images.map(async (url, idx) => {
        return generateWAMessage(
          m.chat,
          {
            image: { url },
            caption: idx === 0 ? `🖼️ *BING IMAGE ALBUM*\n\n> 🔍 *Query:* ${query}\n> 📦 *Total:* ${images.length} Gambar HD\n\n*${config.bot?.name || 'SHIROWAHD'}*` : '',
            contextInfo
          },
          { userJid: jidNormalizedUser(sock.user?.id), upload: sock.waUploadToServer }
        );
      })
    );

    const albumMessage = generateWAMessageFromContent(
      m.chat,
      {
        albumMessage: {
          expectedImageCount: albumCards.length,
          contextInfo
        }
      },
      { userJid: jidNormalizedUser(sock.user?.id) }
    );

    await sock.relayMessage(albumMessage.key.remoteJid, albumMessage.message, {
      messageId: albumMessage.key.id
    });

    for (const card of albumCards) {
      await sock.relayMessage(card.key.remoteJid, card.message, {
        messageId: card.key.id
      });
    }

    if (typeof m.react === 'function') try { await m.react('✅'); } catch {}
  } catch (err) {
    console.error('[BingImage Error]:', err);
    if (typeof m.react === 'function') try { await m.react('❌'); } catch {}
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
