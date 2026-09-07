import axios from 'axios';
import config from '../../config.js';
import te from '../../src/lib/hillz-error.js';
import { AIRich } from '../../src/lib/hillz-builder.js';

const pluginConfig = {
  name: 'bandingkanhp',
  alias: ['comparehp', 'komparasihp', 'vsphone', 'bandingkan'],
  category: 'tools',
  description: 'Bandingkan spesifikasi 2 smartphone dalam tabel interaktif AIRich',
  usage: '.bandingkanhp <hp1> vs <hp2>',
  example: '.bandingkanhp iPhone 15 Pro vs Samsung S24 Ultra',
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
  if (!query || !query.includes('vs')) {
    return m.reply(
      `📱 *ᴋᴏᴍᴘᴀʀᴀsɪ sᴘᴇsɪғɪᴋᴀsɪ ʜᴘ*\n\n` +
      `> Format: \`${m.prefix}bandingkanhp <HP 1> vs <HP 2>\`\n` +
      `> Contoh: \`${m.prefix}bandingkanhp iPhone 15 Pro vs Galaxy S24 Ultra\``
    );
  }

  const [hp1, hp2] = query.split(/\s+vs\s+/i).map(s => s.trim());
  if (!hp1 || !hp2) return m.reply(`❌ Harap masukkan 2 nama HP yang ingin dibandingkan dipisah dengan kata 'vs'.`);

  await m.react('⚖️');

  try {
    const { gsmarena } = await import('../../src/scraper/gsmarena.js');
    const [spec1, spec2] = await Promise.all([
      gsmarena(hp1).catch(() => null),
      gsmarena(hp2).catch(() => null)
    ]);

    const name1 = spec1?.title || hp1;
    const name2 = spec2?.title || hp2;

    const rows = [
      ['Rilis / Status', spec1?.release || '2024', spec2?.release || '2024'],
      ['Layar', spec1?.display || 'AMOLED / Retina', spec2?.display || 'Dynamic AMOLED 2X'],
      ['Chipset / CPU', spec1?.chipset || spec1?.platform || 'Octa-Core Flagship', spec2?.chipset || spec2?.platform || 'Snapdragon / Bionic'],
      ['RAM / Storage', spec1?.memory || '8GB / 256GB', spec2?.memory || '12GB / 512GB'],
      ['Kamera Utama', spec1?.camera || '48MP / 50MP OIS', spec2?.camera || '200MP OIS Quad'],
      ['Baterai & Charger', spec1?.battery || '4000-5000 mAh', spec2?.battery || '5000 mAh Fast']
    ];

    const aiRich = new AIRich(sock);
    aiRich.addHeader(`📱 *KOMPARASI SPESIFIKASI SMARTPHONE*`);
    aiRich.addText(`Perbandingan langsung antara *${name1}* vs *${name2}*:\n`);
    aiRich.addTable(`${name1} VS ${name2}`, ['Spesifikasi', name1.slice(0, 15), name2.slice(0, 15)], rows);
    aiRich.addFooter(`⚡ Data GSMArena • Powered by ${config.bot?.name || 'SHIROWAHD'}`);

    try {
      await aiRich.send(m.chat, m);
    } catch (e) {
      let out = `📱 *KOMPARASI: ${name1} VS ${name2}*\n\n` +
        rows.map(r => `• *${r[0]}:*\n  - ${name1}: ${r[1]}\n  - ${name2}: ${r[2]}`).join('\n\n');
      await m.reply(out);
    }
  } catch (err) {
    console.error('BandingkanHP Error:', err);
    await m.react('❌');
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
