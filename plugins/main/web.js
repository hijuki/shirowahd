import config from "../../config.js"
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getStats, getTotalStorage } from "../../src/lib/vid-store.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOMAIN = 'swhdhlz.my.id'

const pluginConfig = {
  name: "web",
  alias: ["website", "upload", "panel", "dashboard"],
  category: "main",
  description: "Info web uploader & admin panel",
  usage: ".web",
  example: ".web",
  isPremium: false,
  isOwner: false,
  isBanned: false,
  isAdmin: false,
  cooldown: 5,
  energi: 0,
  isBotAdmin: false,
  isEnabled: true
}

const fmtSize = (b) => {
  if (!b || b === 0) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return (b / Math.pow(1024, i)).toFixed(1) + ' ' + u[i]
}

async function handler(m, { sock }) {
  let vidStats = { totalActive: 0, totalSize: 0, uploadsToday: 0 }
  let vidStorage = 0
  try { vidStats = getStats(); vidStorage = getTotalStorage(); } catch {}

  // Load settings for site name
  let siteName = 'SHIROWAHD'
  try {
    const sf = join(__dirname, '..', '..', 'admin-settings.json')
    if (existsSync(sf)) {
      const s = JSON.parse(readFileSync(sf, 'utf8'))
      if (s.siteName) siteName = s.siteName
    }
  } catch {}

  const url = `https://${DOMAIN}`

  const caption = `🌐 *${siteName} — Web Dashboard*

Upload video berkualitas tinggi langsung dari browser, claim via bot WhatsApp.

📊 *Status Saat Ini*
> ◦ *Video aktif:* ${vidStats.totalActive}
> ◦ *Upload hari ini:* ${vidStats.uploadsToday}
> ◦ *Total storage:* ${fmtSize(vidStorage)}

📌 *Cara Pakai*
> 1. Buka link upload di bawah
> 2. Pilih video/foto, tunggu upload selesai
> 3. Copy kode yang muncul
> 4. Kirim \`.claim KODE\` di grup claim

🔗 *${DOMAIN}*`

  return await sock.sendMessage(m.chat, {
    image: { url: `${url}/header-poster.jpg` },
    caption,
    footer: `${siteName} v3.3 — Powered by HILLZ`,
    interactiveButtons: [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "📤 Upload Video",
          url: url,
          merchant_url: url
        })
      },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "⚙️ Admin Panel",
          url: `${url}/admin`,
          merchant_url: `${url}/admin`
        })
      }
    ]
  }, { quoted: m })
}

export { pluginConfig as config, handler }
