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
  name: 'couple',
  alias: ['ppcouple', 'ppcp', 'fotocouple', 'avatarcp'],
  category: 'random',
  description: 'Mendapatkan foto profil anime couple (sepasang cowok & cewek) dalam Album WhatsApp',
  usage: '.couple',
  example: '.couple',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
};

async function handler(m, { sock }) {
  await m.react('🕕');

  try {
    const res = await axios.get('https://raw.githubusercontent.com/iamriz7/hyouka-md/main/src/data/ppcouple.json', { timeout: 15000 });
    const data = res.data;
    if (!Array.isArray(data) || !data.length) {
      await m.react('❌');
      return m.reply('❌ Gagal memuat database avatar couple.');
    }

    const item = data[Math.floor(Math.random() * data.length)];
    const maleUrl = item.male || item.cowo || item.pria;
    const femaleUrl = item.female || item.cewe || item.wanita;

    const [maleRes, femaleRes] = await Promise.all([
      axios.get(maleUrl, { responseType: 'arraybuffer', timeout: 15000 }),
      axios.get(femaleUrl, { responseType: 'arraybuffer', timeout: 15000 })
    ]);

    const mediaList = [
      { image: Buffer.from(maleRes.data), caption: '👦 *AVATAR MALE (COWOK)*' },
      { image: Buffer.from(femaleRes.data), caption: '👧 *AVATAR FEMALE (CEWEK)*' }
    ];

    try {
      const opener = generateWAMessageFromContent(
        m.chat,
        {
          messageContextInfo: { messageSecret: crypto.randomBytes(32) },
          albumMessage: {
            expectedImageCount: 2,
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

      await m.react('💑');
    } catch (err) {
      await sock.sendMessage(m.chat, { image: mediaList[0].image, caption: mediaList[0].caption }, { quoted: m.raw || m });
      await sock.sendMessage(m.chat, { image: mediaList[1].image, caption: mediaList[1].caption }, { quoted: m.raw || m });
      await m.react('💑');
    }
  } catch (err) {
    console.error('PP Couple Error:', err);
    await m.react('❌');
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
