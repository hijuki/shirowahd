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

async function handler(m, { sock, conn }) {
  const client = sock || conn;
  if (typeof m.react === 'function') { try { await m.react('🕕'); } catch {} }

  try {
    const res = await axios.get('https://raw.githubusercontent.com/iamriz7/hyouka-md/main/src/data/ppcouple.json', { timeout: 15000 });
    const data = res.data;
    if (!Array.isArray(data) || !data.length) {
      if (typeof m.react === 'function') { try { await m.react('❌'); } catch {} }
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

    let albumSuccess = false;
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
          userJid: jidNormalizedUser(client.user?.id || ''),
          quoted: m.raw || m,
          upload: client.waUploadToServer
        }
      );

      await Promise.race([
        client.relayMessage(opener.key.remoteJid, opener.message, { messageId: opener.key.id }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Album timeout')), 4000))
      ]);

      for (const content of mediaList) {
        const msg = await generateWAMessage(opener.key.remoteJid, content, {
          upload: client.waUploadToServer
        });

        msg.message.messageContextInfo = {
          messageSecret: crypto.randomBytes(32),
          messageAssociation: {
            associationType: 1,
            parentMessageKey: opener.key
          }
        };

        await client.relayMessage(msg.key.remoteJid, msg.message, {
          messageId: msg.key.id
        });
      }
      albumSuccess = true;
    } catch (e) {
      albumSuccess = false;
    }

    if (!albumSuccess) {
      await client.sendMessage(m.chat, { image: mediaList[0].image, caption: mediaList[0].caption }, { quoted: m.raw || m });
      await client.sendMessage(m.chat, { image: mediaList[1].image, caption: mediaList[1].caption }, { quoted: m.raw || m });
    }

    if (typeof m.react === 'function') { try { await m.react('💑'); } catch {} }

  } catch (err) {
    console.error('PP Couple Error:', err);
    if (typeof m.react === 'function') { try { await m.react('❌'); } catch {} }
    if (typeof m.reply === 'function') m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
