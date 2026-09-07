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
  name: 'pin',
  alias: ['pinsearch', 'pinterestsearch', 'pins', 'pinterest'],
  category: 'search',
  description: 'Cari foto di Pinterest dan kirim sebagai Album WhatsApp',
  usage: '.pin <query>',
  example: '.pin anime aesthetic',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true
};

async function handler(m, { sock, conn, args }) {
  const client = sock || conn;
  const text = (args && args.length) ? args.join(' ') : (m.text || '').trim();

  if (!text) {
    return m.reply(
      `📌 *PINTEREST SEARCH*\n\n` +
      `> Masukkan kata kunci gambar yang ingin dicari!\n\n` +
      `*Contoh:* \`${m.prefix || '.'}pin anime aesthetic\``
    );
  }

  if (typeof m.react === 'function') { try { await m.react('🔍'); } catch {} }

  try {
    let images = [];

    // Provider 1: Siputzx Pinterest API
    try {
      const res = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(text)}`, { timeout: 10000 });
      if (res.data?.status && Array.isArray(res.data?.data) && res.data.data.length > 0) {
        images = res.data.data;
      }
    } catch {}

    // Provider 2 Fallback: Vreden / Public Scraper
    if (!images.length) {
      try {
        const res = await axios.get(`https://api.betabotz.eu.org/api/search/pinterest?text=${encodeURIComponent(text)}&apikey=${config.APIkey?.betabotz || 'betabotz'}`, { timeout: 10000 });
        if (res.data?.status && Array.isArray(res.data?.result)) {
          images = res.data.result;
        }
      } catch {}
    }

    if (!images.length) {
      if (typeof m.react === 'function') { try { await m.react('❌'); } catch {} }
      return m.reply(`🥀 *Gambar tidak ditemukan* untuk kata kunci \`${text}\`.`);
    }

    const selectedUrls = images.slice(0, 5).map(x => (typeof x === 'string' ? x : (x.images_url || x.image || x.url))).filter(Boolean);

    if (!selectedUrls.length) {
      if (typeof m.react === 'function') { try { await m.react('❌'); } catch {} }
      return m.reply('❌ Gagal mengurai link gambar.');
    }

    // Download buffer gambar secara paralel
    const buffers = await Promise.all(
      selectedUrls.map(async (u) => {
        try {
          const r = await axios.get(u, { responseType: 'arraybuffer', timeout: 12000 });
          return Buffer.from(r.data);
        } catch {
          return null;
        }
      })
    );

    const validBuffers = buffers.filter(Boolean);
    if (!validBuffers.length) {
      if (typeof m.react === 'function') { try { await m.react('❌'); } catch {} }
      return m.reply('❌ Gagal mengunduh gambar dari Pinterest.');
    }

    let albumSent = false;
    try {
      const opener = generateWAMessageFromContent(
        m.chat,
        {
          messageContextInfo: { messageSecret: crypto.randomBytes(32) },
          albumMessage: {
            expectedImageCount: validBuffers.length,
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

      for (let i = 0; i < validBuffers.length; i++) {
        const msg = await generateWAMessage(
          opener.key.remoteJid,
          {
            image: validBuffers[i],
            caption: i === 0 ? `📌 *Pinterest:* \`${text}\` (${validBuffers.length} Foto)` : ''
          },
          { upload: client.waUploadToServer }
        );

        msg.message.messageContextInfo = {
          messageSecret: crypto.randomBytes(32),
          messageAssociation: {
            associationType: 1,
            parentMessageKey: opener.key
          }
        };

        await client.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
      }
      albumSent = true;
    } catch {
      albumSent = false;
    }

    if (!albumSent) {
      // Fallback kirim single image terbaik
      await client.sendMessage(
        m.chat,
        {
          image: validBuffers[0],
          caption: `📌 *Pinterest Result*\n\n> 🔍 *Query:* \`${text}\``
        },
        { quoted: m.raw || m }
      );
    }

    if (typeof m.react === 'function') { try { await m.react('✅'); } catch {} }

  } catch (err) {
    console.error('Pinterest Search Error:', err);
    if (typeof m.react === 'function') { try { await m.react('❌'); } catch {} }
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
