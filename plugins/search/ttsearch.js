import {
  generateWAMessage,
  generateWAMessageFromContent,
  jidNormalizedUser
} from 'hillz';
import axios from 'axios';
import crypto from 'crypto';
import te from '../../src/lib/hillz-error.js';
import config from '../../config.js';

const pluginConfig = {
  name: 'ttsearch',
  alias: ['tiktoksearch', 'tiktokcari', 'ttcari', 'ttfind'],
  category: 'search',
  description: 'Cari video TikTok dan kirimkan dalam album interaktif',
  usage: '.ttsearch <kata kunci>',
  example: '.ttsearch Jedag Jedug Anime',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true
};

async function handler(m, { sock }) {
  const query = m.text?.trim();
  if (!query) return m.reply(`🔍 *Format:* \`${m.prefix}ttsearch <kata kunci pencarian>\``);

  await m.react('🕕');

  try {
    const res = await axios.get(`https://api.tiklydown.eu.org/api/search?q=${encodeURIComponent(query)}`, { timeout: 20000 });
    const items = res.data?.data?.videos || res.data?.data || [];
    const valid = items.filter(v => v.cover || v.play || v.video).slice(0, 6);

    if (!valid.length) {
      await m.react('❌');
      return m.reply(`❌ Tidak ditemukan video TikTok untuk: *${query}*`);
    }

    const mediaList = [];
    for (const v of valid) {
      const imgUrl = v.cover || v.origin_cover;
      if (!imgUrl) continue;
      try {
        const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 15000 });
        const imgBuffer = Buffer.from(imgRes.data);
        if (imgBuffer.length > 1000) {
          mediaList.push({
            image: imgBuffer,
            caption: `🎵 *${v.title || query}*\n👤 *Author:* ${v.author?.nickname || v.author?.unique_id || 'TikTok User'}\n🔗 *Link:* ${v.play || v.video || ''}`
          });
        }
      } catch (e) {
        continue;
      }
    }

    if (!mediaList.length) {
      await m.react('❌');
      return m.reply('❌ Gagal memuat cover video TikTok.');
    }

    try {
      const opener = generateWAMessageFromContent(
        m.chat,
        {
          messageContextInfo: { messageSecret: crypto.randomBytes(32) },
          albumMessage: {
            expectedImageCount: mediaList.length,
            expectedVideoCount: 0
          }
        },
        {
          userJid: jidNormalizedUser(sock.user.id),
          quoted: m.raw || m,
          upload: sock.waUploadToServer
        }
      );

      await sock.relayMessage(opener.key.remoteJid, opener.message, {
        messageId: opener.key.id
      });

      for (const content of mediaList) {
        const msg = await generateWAMessage(opener.key.remoteJid, content, {
          upload: sock.waUploadToServer
        });

        msg.message.messageContextInfo = {
          messageSecret: crypto.randomBytes(32),
          messageAssociation: {
            associationType: 1,
            parentMessageKey: opener.key
          }
        };

        await sock.relayMessage(msg.key.remoteJid, msg.message, {
          messageId: msg.key.id
        });
      }

      await m.react('✅');
    } catch (err) {
      // Fallback kirim single card
      await sock.sendMessage(m.chat, {
        image: mediaList[0].image,
        caption: mediaList[0].caption
      }, { quoted: m.raw || m });
      await m.react('✅');
    }
  } catch (err) {
    console.error('TTSearch Error:', err);
    await m.react('❌');
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
