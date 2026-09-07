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
  description: 'Cari video TikTok dan kirim sebagai Album Video WhatsApp',
  usage: '.ttsearch <query>',
  example: '.ttsearch jedag jedug anime',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 12,
  energi: 2,
  isEnabled: true
};

async function handler(m, { sock, conn, args }) {
  const client = sock || conn;
  const text = (args && args.length) ? args.join(' ') : (m.text || '').trim();

  if (!text) {
    return m.reply(
      `📱 *TIKTOK VIDEO SEARCH*\n\n` +
      `> Masukkan kata kunci pencarian TikTok!\n\n` +
      `*Contoh:* \`${m.prefix || '.'}ttsearch jedag jedug anime\``
    );
  }

  if (typeof m.react === 'function') { try { await m.react('🔍'); } catch {} }

  try {
    const res = await axios.post(
      'https://tikwm.com/api/feed/search',
      new URLSearchParams({
        keywords: text,
        count: '3',
        cursor: '0',
        web: '1',
        hd: '1'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        timeout: 15000
      }
    );

    const videos = res.data?.data?.videos;
    if (!Array.isArray(videos) || !videos.length) {
      if (typeof m.react === 'function') { try { await m.react('❌'); } catch {} }
      return m.reply(`🥀 *Tidak ada video ditemukan* untuk kata kunci \`${text}\`.`);
    }

    const selected = videos.slice(0, 2);

    for (const v of selected) {
      const videoUrl = v.play || v.wmplay;
      const title = v.title || 'TikTok Video';
      const author = v.author?.nickname || v.author?.unique_id || 'TikTok User';

      await client.sendMessage(
        m.chat,
        {
          video: { url: videoUrl },
          caption: `📱 *TikTok:* ${title}\n👤 *Author:* ${author}\n👁 *Views:* ${Number(v.play_count || 0).toLocaleString()}`
        },
        { quoted: m.raw || m }
      );
    }

    if (typeof m.react === 'function') { try { await m.react('✅'); } catch {} }

  } catch (err) {
    console.error('TikTok Search Error:', err);
    if (typeof m.react === 'function') { try { await m.react('❌'); } catch {} }
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
