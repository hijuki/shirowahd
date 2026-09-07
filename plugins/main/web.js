import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DOMAIN = 'swhdhlz.my.id';

const pluginConfig = {
  name: 'web',
  alias: ['website', 'upload', 'panel', 'dashboard', 'portaluploader', 'webhd'],
  category: 'main',
  description: 'Link uploader web HD & grup claim',
  usage: '.web',
  example: '.web',
  isPremium: false,
  isOwner: false,
  isBanned: false,
  isAdmin: false,
  cooldown: 5,
  energi: 0,
  isBotAdmin: false,
  isEnabled: true,
};

async function handler(m) {
  let siteName = 'STATUSHD';
  let domain = DEFAULT_DOMAIN;
  let claimGroupLink = 'https://chat.whatsapp.com/E597ARKxnLnLSpTVBx5G4C';

  try {
    const sf = join(__dirname, '..', '..', 'admin-settings.json');
    if (existsSync(sf)) {
      const s = JSON.parse(readFileSync(sf, 'utf8'));
      if (s.siteName) siteName = s.siteName;
      if (s.domain) domain = s.domain;
      if (Array.isArray(s.claimGroups) && s.claimGroups.length > 0) {
        const primary = s.claimGroups.find((g) => g.visible !== false) || s.claimGroups[0];
        if (primary?.link) claimGroupLink = primary.link;
      }
    }
  } catch {}

  const webUrl = `https://${domain}`;

  const text = `🌐 *${siteName} — WEB UPLOADER*

Upload video dan foto kualitas asli tanpa kompresi WhatsApp.

🔗 *Upload:* ${webUrl}
👥 *Grup Claim:* ${claimGroupLink}

> Upload berkas ➔ Salin kode ➔ Ketik *.claim KODE* di grup`;

  return await m.reply(text);
}

export { pluginConfig as config, handler };
