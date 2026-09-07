import config from '../../config.js';
import { AIRich } from '../../src/lib/hillz-builder.js';

const pluginConfig = {
  name: 'tqto',
  alias: ['thanksto', 'credits', 'kredit'],
  category: 'main',
  description: 'Menampilkan daftar kontributor dan pembuat bot',
  usage: '.tqto',
  example: '.tqto',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
};

async function handler(m, { sock }) {
  const credits = [
    { name: 'SHIRO HLZ', role: 'Author & Lead Architect', icon: '👑' },
    { name: 'Shirowahd Team', role: 'Core Development', icon: '👨‍💻' },
    { name: 'Baileys Community', role: 'WhatsApp Multi-Device Engine', icon: '🌐' },
    { name: 'Nous Research / Hermes', role: 'Autonomous AI Orchestration', icon: '🧠' },
    { name: 'Open Source Community', role: 'Libraries & Tools', icon: '📦' }
  ];

  const rows = credits.map((c, i) => [(i + 1).toString(), c.name, `${c.icon} ${c.role}`]);

  try {
    const aiRich = new AIRich(sock);
    aiRich.addHeader(`🍟 *SPECIAL THANKS TO*`);
    aiRich.addText(`Terima kasih kepada semua kontributor dan developer yang telah membangun ekosistem ini:\n`);
    aiRich.addTable('Contributors & Credits', ['No', 'Nama', 'Role'], rows);
    aiRich.addFooter(`⚡ ${config.bot?.name || 'SHIROWAHD'}`);
    await aiRich.send(m.chat, m);
  } catch (e) {
    let out = `🍟 *SPECIAL THANKS TO*\n\n` +
      credits.map((c, i) => `*${i + 1}*. *${c.name}* [ ${c.icon} ${c.role} ]`).join('\n');
    await m.reply(out);
  }
}

export { pluginConfig as config, handler };
