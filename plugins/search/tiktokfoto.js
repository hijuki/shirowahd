import axios from 'axios';
import crypto from 'crypto';
import { generateWAMessage, generateWAMessageFromContent, jidNormalizedUser } from 'hillz';
import config from '../../config.js';
import te from '../../src/lib/hillz-error.js';

const pluginConfig = {
  name: 'tiktokfoto',
  alias: ['ttfoto', 'ttphotosearch', 'searchtiktokfoto', 'ttslide'],
  category: 'search',
  description: 'Cari foto / slide TikTok dan kirim sebagai Album WhatsApp',
  usage: '.tiktokfoto <query / link>',
  example: '.tiktokfoto aesthetic girl',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true
};

async function getTikTokPhotos(query) {
  try {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    let targetUrl = query;
    if (!isUrl) {
      const searchRes = await axios.post('https://tikwm.com/api/feed/search', new URLSearchParams({ keywords: query, count: '10', cursor: '0', web: '1', hd: '1' }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        timeout: 10000
      });
      const items = searchRes.data?.data?.videos || [];
      const photoPost = items.find(v => v.images && v.images.length > 0) || items[0];
      if (photoPost && photoPost.images && photoPost.images.length > 0) {
        return {
          title: photoPost.title,
          author: photoPost.author?.nickname || 'TikTok Creator',
          images: photoPost.images
        };
      }
      if (photoPost) {
        targetUrl = `https://www.tiktok.com/@${photoPost.author?.unique_id}/video/${photoPost.video_id}`;
      }
    }

    const detailRes = await axios.post('https://tikwm.com/api/', new URLSearchParams({ url: targetUrl, count: '12', cursor: '0', web: '1', hd: '1' }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      timeout: 10000
    });
    const data = detailRes.data?.data;
    if (data && data.images && data.images.length > 0) {
      return {
        title: data.title,
        author: data.author?.nickname || 'TikTok Creator',
        images: data.images
      };
    }
  } catch {}
  return null;
}

async function handler(m, { sock, args }) {
  const query = args.join(' ').trim();
  if (!query) {
    return m.reply(`📸 *TIKTOK SLIDE PHOTO ALBUM*\n\n> Masukkan kata kunci atau link TikTok Slide!\n\n*Contoh:* \`${m.prefix}tiktokfoto aesthetic girl\``);
  }

  if (typeof m.react === 'function') try { await m.react('⏳'); } catch {}

  try {
    const result = await getTikTokPhotos(query);
    if (!result || !result.images || result.images.length === 0) {
      if (typeof m.react === 'function') try { await m.react('❌'); } catch {}
      return m.reply(`❌ *SLIDE TIDAK DITEMUKAN*\n\n> Tidak ditemukan foto/slide TikTok untuk pencarian tersebut.`);
    }

    const albumImages = result.images.slice(0, 10);
    const contextInfo = {
      isForwarded: true,
      forwardingScore: 1,
      forwardOrigin: 4
    };

    const albumCards = await Promise.all(
      albumImages.map(async (url, idx) => {
        return generateWAMessage(
          m.chat,
          {
            image: { url },
            caption: idx === 0 ? `📸 *TIKTOK PHOTO ALBUM*\n\n> 👤 *Kreator:* ${result.author}\n> 💬 *Judul:* ${result.title || 'Slide Foto'}\n> 🖼️ *Total Slide:* ${albumImages.length} foto\n\n*${config.bot?.name || 'SHIROWAHD'}*` : '',
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
    console.error('[TikTokFoto Error]:', err);
    if (typeof m.react === 'function') try { await m.react('❌'); } catch {}
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
