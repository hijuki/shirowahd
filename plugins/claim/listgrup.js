import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import config from '../../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS_FILE = join(__dirname, '..', '..', 'admin-settings.json');

const pluginConfig = {
  name: 'listgrup',
  alias: ['listgc', 'listclaim', 'claimlist', 'gruplist', 'grupclaim'],
  category: 'claim',
  description: 'Menampilkan daftar grup WhatsApp yang fitur claim-nya aktif',
  usage: '.listgrup',
  example: '.listgrup',
  isPremium: false,
  isOwner: false,
  isBanned: false,
  isAdmin: false,
  cooldown: 5,
  energi: 0,
  isBotAdmin: false,
  isEnabled: true,
};

function loadSettings() {
  try {
    if (existsSync(SETTINGS_FILE)) {
      return JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

async function handler(m) {
  const settings = loadSettings();
  const rawGroups = settings.claimGroups || (settings.claimGroup ? [settings.claimGroup] : []);
  const groups = rawGroups.filter((g) => g && g.link);

  const botName = config.bot?.name || 'SHIROWAHD';
  const siteDomain = settings.domain || 'swhdhlz.my.id';

  if (!groups || groups.length === 0) {
    let emptyMsg = `📋 *DAFTAR GRUP CLAIM AKTIF*\n`;
    emptyMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    emptyMsg += `⚠️ *Belum ada grup claim yang terdaftar.*\n\n`;
    emptyMsg += `👑 *Untuk Owner:* Ketik \`.claim on\` di dalam grup untuk mendaftarkannya.\n`;
    emptyMsg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    emptyMsg += `🔹 *Engine:* ${botName}`;
    return m.reply(emptyMsg);
  }

  let text = `📋 *DAFTAR GRUP CLAIM AKTIF (${groups.length})*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Grup resmi tempat kamu bisa klaim video Ultra HD tanpa kompresi:\n\n`;

  groups.forEach((g, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const name = g.name || `Grup Claim #${idx + 1}`;
    const link = g.link || '-';
    text += `*${num}.* 👥 *${name}*\n`;
    text += `    🔗 ${link}\n\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💡 *Cara Claim Video HD:*\n`;
  text += `> 1. Upload video di: https://${siteDomain}\n`;
  text += `> 2. Salin kode claim (contoh: \`A8K2Z\`)\n`;
  text += `> 3. Kirim \`.claim <KODE>\` di salah satu grup di atas.\n\n`;
  text += `🔹 *Engine:* ${botName} Media System`;

  return m.reply(text);
}

export { pluginConfig as config, handler };
