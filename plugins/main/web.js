import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import config from '../../config.js';
import { getStats, getTotalStorage } from '../../src/lib/vid-store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DOMAIN = 'swhdhlz.my.id';

const pluginConfig = {
  name: 'web',
  alias: ['website', 'upload', 'panel', 'dashboard', 'portaluploader', 'webhd'],
  category: 'main',
  description: 'Info portal web uploader HD & panduan upload',
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

const fmtSize = (b) => {
  if (!b || b === 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i];
};

async function handler(m, { sock }) {
  let vidStats = { totalActive: 0, totalSize: 0, uploadsToday: 0 };
  let vidStorage = 0;
  try {
    vidStats = getStats();
    vidStorage = getTotalStorage();
  } catch {
    /* optional fallback */
  }

  // Ambil pengaturan dinamis dari admin-settings.json jika ada
  let siteName = 'SHIROWAHD';
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
  } catch {
    /* parse fallback */
  }

  const webUrl = `https://${domain}`;

  const caption = `🌐 *${siteName} — ULTRA HD WEB PORTAL*
━━━━━━━━━━━━━━━━━━━━━
*Simpan Kualitas Asli • Bypass Kompresi WA • 60 FPS*

Platform uploader video & foto beresolusi tinggi tanpa buram. Media diproses dengan pipeline khusus agar tetap jernih 100% saat dipasang di Status WhatsApp.

📊 *STATUS SERVER & MEDIA*
> ◦ *Video Aktif:* \`${vidStats.totalActive.toLocaleString('id-ID')} file\`
> ◦ *Upload Hari Ini:* \`${vidStats.uploadsToday.toLocaleString('id-ID')} file\`
> ◦ *Kapasitas Terpakai:* \`${fmtSize(vidStorage)}\`
> ◦ *Transcode Engine:* \`HDR-to-SDR • 60 FPS Fixed • EBU R128\`
> ◦ *Direct Upload:* \`Active (Bypass Limit)\`

⚡ *CARA PENGGUNAAN (4 LANGKAH)*
> 1️⃣ *Buka Web Portal:* Klik tombol upload atau tautan di bawah.
> 2️⃣ *Pilih File:* Upload video/foto langsung dari galeri browser.
> 3️⃣ *Salin Kode:* Tunggu upload selesai & copy 6 digit kode claim.
> 4️⃣ *Kirim Perintah:* Ketik \`.claim <KODE>\` di grup claim WhatsApp.

🔗 *LINK AKSES CEPAT*
> 🚀 *Web Uploader:* ${webUrl}
> 👥 *Grup Claim:* ${claimGroupLink}
━━━━━━━━━━━━━━━━━━━━━
🔹 *Engine:* ${config.bot?.name || 'SHIROWAHD'} High-Performance Web
🔹 *Author:* @${config.owner?.name || 'SHIRO HLZ'}`;

  // Kirim dengan media gambar poster header & tombol khusus user
  try {
    return await sock.sendMessage(
      m.chat,
      {
        image: { url: `${webUrl}/header-poster.jpg` },
        caption,
        footer: `${siteName} • Ultra HD Media Pipeline`,
        interactiveButtons: [
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '📤 Buka Web Uploader',
              url: webUrl,
              merchant_url: webUrl,
            }),
          },
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: '👥 Masuk Grup Claim',
              url: claimGroupLink,
              merchant_url: claimGroupLink,
            }),
          },
        ],
      },
      { quoted: m }
    );
  } catch (err) {
    return await sock.sendMessage(m.chat, { text: caption }, { quoted: m });
  }
}

export { pluginConfig as config, handler };
