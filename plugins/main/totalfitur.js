import { getAllPlugins } from '../../src/lib/hillz-plugins.js';
import config from '../../config.js';
import te from '../../src/lib/hillz-error.js';
import { AIRich } from '../../src/lib/hillz-builder.js';

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
  other: '📦'
};

async function handler(m, { sock }) {
  try {
    const allPlugins = getAllPlugins ? getAllPlugins() : [];
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

    await m.react('📊');

    const sorted = Object.entries(cats).sort((a, b) => b[1].total - a[1].total);
    const tableData = sorted.map(([cat, data]) => {
      const pct = total > 0 ? ((data.total / total) * 100).toFixed(1) : '0';
      return [
        `${ICONS[cat] || '📦'} ${cat.toUpperCase()}`,
        data.total.toString(),
        `${pct}%`
      ];
    });

    const aiRich = new AIRich(sock);
    aiRich.addHeader(`📊 *DISTRIBUSI FITUR ${config.bot?.name || 'SHIROWAHD'}*`);
    aiRich.addText(`Total: *${total}* Fitur | Aktif: *${enabled}* | Kategori: *${sorted.length}*\n`);
    aiRich.addTable('Distribusi Kategori Fitur', ['Kategori', 'Jumlah', 'Persen'], tableData);
    aiRich.addFooter(`⚡ Powered by ${config.bot?.name || 'SHIROWAHD'}`);

    try {
      await aiRich.send(m.chat, m);
    } catch (sendErr) {
      // Fallback text jika AIRich tidak didukung
      let textOut = `📊 *DISTRIBUSI FITUR ${config.bot?.name || 'SHIROWAHD'}*\n\n` +
        `> Total: *${total}* | Aktif: *${enabled}* | Kategori: *${sorted.length}*\n\n` +
        tableData.map(r => `• *${r[0]}*: ${r[1]} (${r[2]})`).join('\n');
      await m.reply(textOut);
    }
  } catch (error) {
    await m.react('❌');
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
