import { getAllPlugins } from '../../src/lib/hillz-plugins.js';
import config from '../../config.js';
import te from '../../src/lib/hillz-error.js';

const pluginConfig = {
  name: 'totalfitur',
  alias: ['totalfeature', 'totalcmd', 'countplugin', 'distribusi'],
  category: 'main',
  description: 'Lihat distribusi dan total fitur/command bot (AIRich Table)',
  usage: '.totalfitur',
  example: '.totalfitur',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
};

const ICONS = {
  main: '🏠', tools: '🔧', downloader: '📥', download: '📥', sticker: '🎨',
  ai: '🤖', media: '📷', game: '🎮', rpg: '⚔️', maker: '🖼️', fun: '🎭',
  group: '👥', owner: '👑', premium: '💎', info: '📊', search: '🔍',
  canvas: '🎨', anime: '🌸', nsfw: '🔞', utility: '🛠️', economy: '💰',
  stalker: '🔎', random: '🎲', religi: '🕌', islamic: '☪️', cek: '✅',
  store: '🛒', panel: '🖥️', convert: '🔄', primbon: '🔮', tts: '🗣️',
  otp: '🔑', vps: '☁️', pushkontak: '📱', jpm: '🎰', ephoto: '📸',
  music: '🎵', other: '📦'
};

async function handler(m, { sock }) {
  try {
    const allPlugins = getAllPlugins();
    const cats = {};
    let total = 0, enabled = 0;

    for (const p of allPlugins) {
      if (!p.config) continue;
      const cat = p.config.category || 'other';
      if (!cats[cat]) cats[cat] = { total: 0, enabled: 0 };
      cats[cat].total++;
      total++;
      if (p.config.isEnabled !== false) {
        cats[cat].enabled++;
        enabled++;
      }
    }

    if (typeof m.react === 'function') {
      try { await m.react('📊'); } catch {}
    }

    const sorted = Object.entries(cats).sort((a, b) => b[1].total - a[1].total);

    const tableData = sorted.map(([cat, data]) => {
      const pct = ((data.total / total) * 100).toFixed(1);
      return [
        `${ICONS[cat] || '📦'} ${cat.toUpperCase()}`,
        data.total.toString(),
        `${pct}%`
      ];
    });

    if (typeof sock.sendTable === 'function') {
      try {
        return await sock.sendTable(
          m.chat,
          'Distribusi Fitur',
          ['Kategori', 'Jumlah', 'Persen'],
          tableData,
          m,
          {
            headerText: `Total: ${total} | Aktif: ${enabled} | Kategori: ${sorted.length}`
          }
        );
      } catch (err) {
        console.error('[TotalFitur] sendTable error:', err.message);
      }
    }

    // Fallback teks rapi
    let textOut = `📊 *DISTRIBUSI FITUR ${config.bot?.name || 'SHIROWAHD'}*\n\n` +
      `> Total: *${total}* | Aktif: *${enabled}* | Kategori: *${sorted.length}*\n\n` +
      tableData.map(r => `• *${r[0]}*: ${r[1]} (${r[2]})`).join('\n');
    await m.reply(textOut);
  } catch (error) {
    console.error('[TotalFitur] Handler error:', error);
    if (typeof m.react === 'function') {
      try { await m.react('❌'); } catch {}
    }
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
