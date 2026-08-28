<p align="center">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/NodeJS-Dark.svg" width="65" height="65" alt="NodeJS" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/JavaScript.svg" width="65" height="65" alt="JS" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/HTML.svg" width="65" height="65" alt="HTML5" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/CSS.svg" width="65" height="65" alt="CSS3" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Cloudflare-Dark.svg" width="65" height="65" alt="Cloudflare" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Nginx.svg" width="65" height="65" alt="Nginx" />
</p>

<h1 align="center">✨ SHIROWAHD v3.3.0 ✨</h1>

<p align="center">
  <b>Advanced Multi-Device WhatsApp Bot & Ultra-Fast Cloud Web File Uploader with Interactive Admin Control Hub</b><br>
  <sub>Engineered for High-Throughput Media Sharing, Automated Micro-Services, Cloudflare Edge Tunneling, and Multi-Plugin Architecture.</sub>
</p>

<p align="center">
  <a href="https://github.com/hijuki/shirowahd"><img src="https://img.shields.io/badge/Node.js-22.x%20LTS-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="https://github.com/hijuki/shirowahd"><img src="https://img.shields.io/badge/WhatsApp-Baileys%20Multi--Device-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp" /></a>
  <a href="https://github.com/hijuki/shirowahd"><img src="https://img.shields.io/badge/Web_Server-Native%20HTTP%20Zero--Dep-00599C?style=for-the-badge" alt="Web" /></a>
  <a href="https://github.com/hijuki/shirowahd"><img src="https://img.shields.io/badge/Edge-Cloudflare%20Tunnel-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare" /></a>
  <a href="https://github.com/hijuki/shirowahd"><img src="https://img.shields.io/badge/License-Private%20Pro-blueviolet?style=for-the-badge" alt="License" /></a>
</p>

---

## 📑 Table of Contents
- [🌟 Key Highlights](#-key-highlights)
- [🧩 Architecture & Core Modules](#-architecture--core-modules)
- [🌐 Web Cloud Uploader & Admin Panel](#-web-cloud-uploader--admin-panel)
- [🤖 WhatsApp Bot Commands Matrix](#-whatsapp-bot-commands-matrix)
- [🚀 Quick VPS Installation Guide](#-quick-vps-installation-guide)
- [⚙️ Environment Configuration (`.env`)](#️-environment-configuration-env)
- [🛡️ Production Deployment (PM2 & Nginx)](#️-production-deployment-pm2--nginx)
- [👑 Credits & Maintainer](#-credits--maintainer)

---

## 🌟 Key Highlights

- 📤 **High-Speed Drag & Drop Web Uploader**: Direct chunked streaming upload with real-time progress bars, custom secret claim codes, and auto-expire file timers.
- ⚡ **Express-less Native HTTP Engine**: Zero extra framework overhead, native streaming file pipeline handling 500MB+ payload uploads seamlessly.
- 💬 **WhatsApp Multi-Device Baileys Engine**: 100+ commands across AI intelligence, media downloaders (TikTok, IG, YT, Spotify), group security, and utilities.
- 🔒 **Cloudflare Edge Tunnel & Nginx Reverse Proxy**: Automatic SSL provisioning, CDN caching, DDoS mitigation, and flexible direct/tunnel routing.
- 🛠️ **Full Interactive Admin Hub**: Web-based dashboard for live telemetry, storage analytics, file explorer, IP security, and instant branding customization.
- 🔄 **Self-Updating Pipeline**: Auto-pull GitHub changes on startup, automatic hot-reloading plugins, and dynamic Baileys buffer patching for large media payloads.

---

## 🧩 Architecture & Core Modules

```text
┌─────────────────────────────────────────────────────────────┐
│                    SHIROWAHD ECOSYSTEM                      │
├──────────────────────────────┬──────────────────────────────┤
│      🤖 WHATSAPP ENGINE      │      🌐 WEB & CLOUD HUB      │
│   (@whiskeysockets/baileys)  │     (Native Zero-Dep HTTP)   │
├──────────────────────────────┼──────────────────────────────┤
│ • Pairing Code / QR Auth     │ • Drag & Drop Uploader       │
│ • 100+ Plugin Architecture   │ • Live Upload Telemetry      │
│ • Anti-Spam / Group Guard    │ • Admin Control Dashboard    │
│ • Large File Patch (80MB+)   │ • Custom Claim Code Vault    │
└──────────────────────────────┴──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               │    CLOUDFLARE / NGINX EDGE    │
               │   (SSL • CDN • Webhooks)      │
               └───────────────────────────────┘
```

---

## 🌐 Web Cloud Uploader & Admin Panel

| Feature | Description |
| :--- | :--- |
| **🚀 Chunked Upload** | Streamlined file delivery with real-time speed & ETA calculation. |
| **🔐 Secret Claim Codes** | Protect sensitive files behind alphanumeric security pins. |
| **📊 Admin Dashboard** | Live RAM, CPU, bandwidth metrics, and historical upload logs. |
| **📁 File Explorer** | Preview images, stream videos, and purge expired uploads in 1 click. |
| **🎨 Custom Branding** | Live dynamic banners, header video loop, and customizable themes. |

---

## 🤖 WhatsApp Bot Commands Matrix

```text
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
  ⚡ SHIROWAHD BOT PLUGINS ⚡
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
 ├ 🧠 AI & CHATBOT     : OpenAI GPT-4o, Claude, Gemini Pro, DALL-E 3
 ├ 📥 DOWNLOADERS      : TikTok No-WM, Instagram Reels, YouTube MP3/MP4, Spotify
 ├ 🎮 ENTERTAINMENT    : RPG Games, Trivia Quiz, Word Chain, Fun Menus
 ├ 🛡️ GROUP SHIELD     : Anti-Link, Anti-Toxic, Welcome/Leave Cards, Hidetag
 ├ 🛠️ UTILITIES        : Sticker Maker, OCR Reader, Remini Upscaler, QR Tools
 └ ⚙️ OWNER CONTROL    : Broadcast, Plugin Reload, Self-Update, Terminal Exec
```

---

## 🚀 Quick VPS Installation Guide

### 1. Update OS & Install Node.js 22 LTS
```bash
apt update -y && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git screen ffmpeg imagemagick nginx
```

### 2. Clone Repository
```bash
cd /root
git clone https://github.com/hijuki/shirowahd.git
cd shirowahd
npm install
```

---

## ⚙️ Environment Configuration (`.env`)

Create your `.env` file:

```bash
cp .env.example .env 2>/dev/null || nano .env
```

```env
# ==============================================================================
# ⚡ SHIROWAHD CORE ENVIRONMENT VARIABLES
# ==============================================================================

# [ REQUIRED CONFIGURATION ]
DOMAIN=swhdhlz.my.id
PORT=8080
GIT_TOKEN=ghp_yourPersonalAccessTokenHere
GIT_ADDRESS=https://github.com/hijuki/shirowahd
USERNAME=hijuki
BRANCH=main

# [ CLOUDFLARE TUNNEL (OPTIONAL) ]
ENABLE_TUNNEL=0
CF_ACCOUNT=
CF_EMAIL=
CF_KEY=
CF_TUNNEL_ID=

# [ NOTIFICATION HOOKS (OPTIONAL) ]
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
DISCORD_WEBHOOK_URL=
```

---

## 🛡️ Production Deployment (PM2 & Nginx)

### 1. Setup Nginx Reverse Proxy
```bash
cat <<'EOF' > /etc/nginx/sites-available/shirowahd
server {
    listen 80;
    server_name swhdhlz.my.id;

    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/shirowahd /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 2. Start Application with PM2
```bash
npm install -g pm2
pm2 start index.js --name "shirowahd" --time
pm2 save
pm2 startup
```

---

## 👑 Credits & Maintainer

- **Developer**: [@Hillz126](https://t.me/Hillz126)
- **Repository**: [hijuki/shirowahd](https://github.com/hijuki/shirowahd)
- **Powered by**: `@whiskeysockets/baileys` & Node.js Native HTTP

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/hijuki"><b>hijuki</b></a> • SHIROWAHD Project</sub>
</p>
