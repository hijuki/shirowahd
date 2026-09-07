import {
  generateWAMessage,
  generateWAMessageFromContent,
  jidNormalizedUser
} from 'hillz';
import axios from 'axios';
import crypto from 'crypto';
import te from '../../src/lib/hillz-error.js';
import { f } from '../../src/lib/hillz-http.js';
import config from '../../config.js';

const pluginConfig = {
  name: 'pin',
  alias: ['pinsearch', 'pinterestsearch', 'pins', 'pinterest'],
  category: 'search',
  description: 'Cari gambar di Pinterest dan kirimkan dalam album WhatsApp interaktif',
  usage: '.pin <query>',
  example: '.pin Cyberpunk Anime',
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
  if (!query) {
    return m.reply(
      `🔍 *ᴘɪɴᴛᴇʀᴇsᴛ sᴇᴀʀᴄʜ*\n\n` +
      `> Format: \`${m.prefix}pin <kata kunci>\`\n` +
      `> Contoh: \`${m.prefix}pin Cyberpunk City\``
    );
  }

  await m.react('🕕');

  try {
    const data = await f(
      `https://api.cuki.biz.id/api/search/pinterest?apikey=cuki-x&query=${encodeURIComponent(query)}&type=image`
    ).catch(() => null);

    let results = data?.data?.results?.filter(item => item.image_url)?.slice(0, 8);

    // Fallback jika API pertama down
    if (!results || results.length === 0) {
      try {
        const fallRes = await axios.get(`https://api.fdci.se/sosmed/repins?query=${encodeURIComponent(query)}`, { timeout: 15000 });
        if (Array.isArray(fallRes.data) && fallRes.data.length > 0) {
          results = fallRes.data.slice(0, 8).map(u => ({ image_url: u }));
        }
      } catch (e) {}
    }

    if (!results || results.length === 0) {
      await m.react('❌');
      return m.reply(`❌ Tidak ditemukan gambar untuk pencarian: *${query}*`);
    }

    const mediaList = [];
    for (const item of results) {
      const imageUrl = item.image_url;
      if (!imageUrl) continue;
      try {
        const imgRes = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 15000
        });
        const imgBuffer = Buffer.from(imgRes.data);
        if (imgBuffer.length > 1000) {
          mediaList.push({ image: imgBuffer });
        }
      } catch (e) {
        continue;
      }
    }

    if (mediaList.length === 0) {
      await m.react('❌');
      return m.reply('❌ Gagal mengunduh gambar Pinterest.');
    }

    // Coba kirim via Album WhatsApp Message
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
    } catch (albumErr) {
      // Fallback kirim foto biasa
      for (const content of mediaList.slice(0, 3)) {
        await sock.sendMessage(
          m.chat,
          {
            image: content.image,
            caption: `🔍 *Pinterest:* ${query}`
          },
          { quoted: m.raw || m }
        );
      }
      await m.react('✅');
    }
  } catch (error) {
    await m.react('❌');
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
