import { downloadContentFromMessage } from 'hillz';

const pluginConfig = {
  name: 'openvo',
  alias: ['rvo2', 'readviewonce', 'lihatvo'],
  category: 'group',
  description: 'Membuka pesan 1x lihat (ViewOnce) yang di-reply',
  usage: '.rvo (reply pesan 1x lihat)',
  example: '.rvo',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true
};

async function handler(m, { sock }) {
  const quoted = m.quoted;

  if (!quoted) {
    return await m.reply(
      `❌ *GAGAL*\n\n` +
      `> Balas pesan 1x lihat (ViewOnce) dengan perintah ini!\n` +
      `> Contoh: \`${m.prefix}rvo\` (reply pesan 1x lihat)`
    );
  }

  const isViewOnce =
    quoted.isViewOnce ||
    quoted.type === 'viewOnceMessageV2' ||
    quoted.type === 'viewOnceMessage' ||
    quoted.msg?.viewOnce;

  if (!isViewOnce) {
    return await m.reply(
      `❌ *BUKAN PESAN VIEW ONCE*\n\n` +
      `> Pesan yang kamu reply bukan pesan 1x lihat!`
    );
  }

  if (typeof m.react === 'function') {
    try { await m.react('⏳'); } catch {}
  }

  try {
    const rawMsg = quoted.msg?.message || quoted.msg || quoted;
    let mediaType = null;
    let streamType = null;

    if (rawMsg.imageMessage) {
      mediaType = 'image';
      streamType = 'image';
    } else if (rawMsg.videoMessage) {
      mediaType = 'video';
      streamType = 'video';
    } else if (rawMsg.audioMessage) {
      mediaType = 'audio';
      streamType = 'audio';
    } else {
      const targetType = quoted.type?.replace('Message', '').toLowerCase();
      if (['image', 'video', 'audio'].includes(targetType)) {
        mediaType = targetType;
        streamType = targetType;
      }
    }

    if (!mediaType) {
      return await m.reply(`❌ *GAGAL*\n\n> Tipe media 1x lihat tidak didukung.`);
    }

    const targetMsg = rawMsg[`${mediaType}Message`] || rawMsg;
    const stream = await downloadContentFromMessage(targetMsg, streamType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    const caption = `🔓 *VIEW ONCE BERHASIL DIBUKA*\n\n` +
      (targetMsg.caption ? `💬 *Pesan:* ${targetMsg.caption}\n` : '') +
      `👤 *Pengirim:* @${(quoted.sender || '').split('@')[0]}`;

    if (mediaType === 'image') {
      await sock.sendMessage(m.chat, {
        image: buffer,
        caption,
        mentions: quoted.sender ? [quoted.sender] : []
      }, { quoted: m.raw || m });
    } else if (mediaType === 'video') {
      await sock.sendMessage(m.chat, {
        video: buffer,
        caption,
        mentions: quoted.sender ? [quoted.sender] : []
      }, { quoted: m.raw || m });
    } else if (mediaType === 'audio') {
      await sock.sendMessage(m.chat, {
        audio: buffer,
        mimetype: targetMsg.mimetype || 'audio/mp4',
        ptt: false
      }, { quoted: m.raw || m });
    }

    if (typeof m.react === 'function') {
      try { await m.react('✅'); } catch {}
    }
  } catch (err) {
    console.error('[RVO Error]:', err);
    if (typeof m.react === 'function') {
      try { await m.react('❌'); } catch {}
    }
    await m.reply(`❌ *GAGAL MEMBUKA MEDIA*\n\n> Terjadi kesalahan saat mengunduh media 1x lihat.`);
  }
}

export { pluginConfig as config, handler };
