import config from '../../config.js';
import { getDatabase } from '../../src/lib/hillz-database.js';
import te from '../../src/lib/hillz-error.js';

const pluginConfig = {
  name: 'antistatus',
  alias: ['antistory', 'antistatussw'],
  category: 'group',
  description: 'Deteksi dan otomatis hapus broadcast status WA yang diteruskan ke grup',
  usage: '.antistatus [on/off]',
  example: '.antistatus on',
  isOwner: false,
  isAdmin: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, args, prefix, command }) {
  try {
    const db = getDatabase();
    const groupData = db.getGroup(m.chat) || {};
    const state = (args[0] || '').toLowerCase();

    if (state === 'on' || state === 'enable' || state === '1') {
      groupData.antiStatus = true;
      db.setGroup(m.chat, { antiStatus: true });
      return m.reply('🛡️ *Anti-Status Aktif!* Status WhatsApp yang dikirim/diteruskan ke grup akan otomatis dihapus.');
    } else if (state === 'off' || state === 'disable' || state === '0') {
      groupData.antiStatus = false;
      db.setGroup(m.chat, { antiStatus: false });
      return m.reply('🔓 *Anti-Status Dinonaktifkan.*');
    } else {
      const current = groupData.antiStatus ? 'AKTIF 🟢' : 'NONAKTIF 🔴';
      return m.reply(
        `🛡️ *PENGATURAN ANTI-STATUS*\n\n` +
        `> Status saat ini: *${current}*\n\n` +
        `Gunakan perintah:\n` +
        `◦ \`${prefix}${command} on\` - Mengaktifkan\n` +
        `◦ \`${prefix}${command} off\` - Menonaktifkan`
      );
    }
  } catch (error) {
    console.error('[antistatus]', error);
    return m.reply(te(prefix, command, m.pushName));
  }
}

export { pluginConfig as config, handler };
