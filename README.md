# SHIROWAHD v3.3.0

WhatsApp bot + web file uploader + admin panel.

## Stack

- **Runtime:** Node.js 22
- **WA Library:** Baileys (ourin-baileys fork)
- **Tunnel:** Cloudflare Tunnel
- **Hosting:** Pterodactyl panel
- **Domain:** swhdhlz.my.id

## Features

- 📤 Web uploader with drag & drop, progress bar, claim codes
- 🤖 WhatsApp bot with 100+ commands (AI, downloader, tools, games, NSFW)
- 🛡️ Admin panel with dashboard, file manager, branding, security, monitoring
- 📊 Upload statistics & log viewer with CSV export
- 🎨 Customizable branding (logo, header, watermark, maintenance mode)
- 🔔 Notification system (Telegram, Discord webhooks)
- 👥 Multi-group claim support
- 🔐 Rate limiting, IP blocking, admin authentication
- 📱 WhatsApp pairing from admin panel

## Quick Start

```bash
# Install dependencies
npm install

# Start everything (bot + web uploader + admin)
node start-all.js
```

The entry point `start-all.js` launches the web uploader server and imports the WhatsApp bot in a single process.

## Environment

Set in Pterodactyl or `.env`:

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD` | Admin panel login password |
| `PORT` | HTTP server port (default: 8080) |

## Project Structure

```
start-all.js        → Entry point (imports bot + starts web server)
web-uploader.js     → HTTP server, upload handling, admin API
admin.html          → Admin panel SPA
upload-page.html    → Public upload page
index.js            → WhatsApp bot core
config.js           → Bot configuration
plugins/            → Bot command plugins
src/lib/            → Shared libraries
storage/            → Sessions, uploads (gitignored)
```

## Deployment

1. Upload files to Pterodactyl server
2. Set startup command: `node start-all.js`
3. Configure Cloudflare Tunnel to point to port 8080
4. Access admin at `https://swhdhlz.my.id/admin`

## License

Private project by HILLZ.
