import config from '../../config.js';
import { sendAppleMusicPlayer } from '../../src/lib/hillz-apple-player.js';
import te from '../../src/lib/hillz-error.js';

const pluginConfig = {
  name: 'player',
  alias: ['playapple', 'spotifyapple', 'applemusic', 'spapple', 'appleplayer', 'snowkit'],
  category: 'music',
  description: 'Putar lagu dengan antarmuka Apple Music / Spotify Glass interaktif dan lirik sinkron',
  usage: '.player <judul lagu / link spotify>',
  example: '.player Starboy The Weeknd',
  isPremium: false,
  isOwner: false,
  isBanned: false,
  isAdmin: false,
  cooldown: 8,
  energi: 2,
  isBotAdmin: false,
  isEnabled: true,
};

async function handler(m, { sock, args }) {
  const textMsg = m.text || '';
  const query = args && args.length ? args.join(' ') : textMsg.trim().split(/ +/).slice(1).join(' ');

  if (!query) {
    return m.reply(
      `🎵 *APPLE MUSIC & SPOTIFY PLAYER*\n\n` +
        `> Masukkan judul lagu atau link lagu Spotify!\n\n` +
        `*Contoh:* \`${m.prefix}player Starboy The Weeknd\`\n` +
        `*Atau:* \`${m.prefix}player https://open.spotify.com/track/...\``
    );
  }

  if (typeof m.react === 'function') {
    try {
      await m.react('⏳');
    } catch {}
  }

  try {
    await sendAppleMusicPlayer(sock, m.chat, query, m);
    if (typeof m.react === 'function') {
      try {
        await m.react('🎵');
      } catch {}
    }
  } catch (error) {
    console.error('[ApplePlayer Error]:', error);
    if (typeof m.react === 'function') {
      try {
        await m.react('❌');
      } catch {}
    }

    if (error.message && !error.message.includes('Unexpected')) {
      return m.reply(`❌ *Gagal memuat player:* ${error.message}`);
    }
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
