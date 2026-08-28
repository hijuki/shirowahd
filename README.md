<p align="center">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/NodeJS-Dark.svg" width="55" height="55" alt="NodeJS" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/JavaScript.svg" width="55" height="55" alt="JavaScript" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/HTML.svg" width="55" height="55" alt="HTML5" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/CSS.svg" width="55" height="55" alt="CSS3" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Cloudflare-Dark.svg" width="55" height="55" alt="Cloudflare" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Nginx.svg" width="55" height="55" alt="Nginx" />
</p>

<h1 align="center">✨ SHIROWAHD v3.3.0 ✨</h1>

<p align="center">
  <b>WhatsApp Multi-Device Bot • Zero-Dependency Web File Uploader • Interactive Admin Control Panel</b><br>
  <sub>High-performance Node.js ecosystem with native streaming upload, 100+ modular plugins, and Cloudflare Edge Tunneling.</sub>
</p>

<p align="center">
  <a href="https://github.com/hijuki/shirowahd"><img src="https://img.shields.io/badge/Node.js-22.x%20LTS-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="https://github.com/hijuki/shirowahd"><img src="https://img.shields.io/badge/WhatsApp-Baileys%20Multi--Device-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp" /></a>
  <a href="https://github.com/hijuki/shirowahd"><img src="https://img.shields.io/badge/Web_Server-Native%20HTTP%20Zero--Dep-00599C?style=for-the-badge" alt="Web" /></a>
  <a href="https://github.com/hijuki/shirowahd"><img src="https://img.shields.io/badge/Tunnel-Cloudflare%20Edge-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare" /></a>
  <a href="https://github.com/hijuki/shirowahd"><img src="https://img.shields.io/badge/Developer-HILLZ-blueviolet?style=for-the-badge" alt="Developer" /></a>
</p>

---

## 📑 Daftar Isi
- [🌟 Fitur Utama](#-fitur-utama)
- [🧩 Tech Stack](#-tech-stack)
- [🚀 Setup VPS Baru (Step-by-Step)](#-setup-vps-baru-step-by-step)
- [⚙️ Konfigurasi Environment (`.env`)](#️-konfigurasi-environment-env)
- [🤖 Konfigurasi Bot WhatsApp (`config.js` & `.pair-number`)](#-konfigurasi-bot-whatsapp-configjs--pair-number)
- [🌐 Setup Nginx Reverse Proxy](#-setup-nginx-reverse-proxy)
- [☁️ Setup Cloudflare Tunnel (Optional)](#️-setup-cloudflare-tunnel-optional)
- [🔄 Update & Maintenance](#-update--maintenance)
- [📁 Struktur Folder Project](#-struktur-folder-project)
- [🛠️ Troubleshooting](#️-troubleshooting)

---

## 🌟 Fitur Utama

- 📤 **Web Cloud Uploader**: Drag & drop file sharing, real-time progress bar, custom claim codes PIN, dan auto-expire timers.
- ⚡ **Zero-Dependency Native HTTP Server**: Menggunakan native Node.js `http` tanpa express overhead, streaming chunked file 500MB+ stabil.
- 🤖 **WhatsApp Multi-Device Engine**: 100+ command plugin modular (AI, downloaders TikTok/IG/YT/Spotify, tools, RPG games, sticker maker).
- 🛡️ **Interactive Admin Hub**: Dashboard live telemetry, file explorer, upload analytics, IP security management, dan live dynamic branding.
- 🔒 **Cloudflare Edge Protection**: Fleksibel menggunakan direct A record proxy atau Cloudflare Tunnel daemon otomatis.
- 🔄 **Auto-Heal & Self-Update**: Auto `git pull` update otomatis saat startup dan auto-patch Baileys buffer handling (80MB+ media).

---

## 🧩 Tech Stack

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Runtime** | Node.js `>=22.0.0` (ESM) | Native modern ECMAScript Modules |
| **WhatsApp Core** | `@whiskeysockets/baileys` | Multi-Device Web API Socket |
| **Web Server** | Native Node.js `http` | Zero framework overhead & fast I/O |
| **Reverse Proxy** | Nginx & Cloudflare Tunnel | High concurrency buffer & SSL edge |
| **Database** | LowDB & Local JSON Stores | Fast lightweight storage |

---

## 🚀 Setup VPS Baru (Step-by-Step)

### 1. Install Node.js 22+ & Tools
Jalankan di terminal VPS (user `root`):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git screen ffmpeg imagemagick nginx
```

### 2. Clone Repositori (Private Repo)
Buat **Personal Access Token (PAT)** di GitHub:
> GitHub > Settings > Developer Settings > Personal Access Tokens (classic) > Centang scope `repo`.

Clone repo menggunakan token Anda:

```bash
cd /root
git clone https://<GITHUB_TOKEN>@github.com/hijuki/shirowahd.git
cd shirowahd
```

### 3. Install Dependencies
```bash
npm install
```

---

## ⚙️ Konfigurasi Environment (`.env`)

Buat file `.env` di folder root project:

```bash
nano .env
```

```env
# ==============================================================================
# ⚡ SHIROWAHD CORE CONFIGURATION
# ==============================================================================

# [ WAJIB DIISI ]
DOMAIN=swhdhlz.my.id
GIT_TOKEN=ghp_yourPersonalAccessTokenHere
GIT_ADDRESS=https://github.com/hijuki/shirowahd
USERNAME=hijuki
BRANCH=main

# [ CLOUDFLARE TUNNEL (0 = OFF / Mati, 1 = ON / Aktif) ]
ENABLE_TUNNEL=0
CF_ACCOUNT=
CF_EMAIL=
CF_KEY=
CF_TUNNEL_ID=
```

### Tabel Environment Variables:

| Variable | Status | Default | Keterangan |
| :--- | :---: | :--- | :--- |
| `DOMAIN` | **Wajib** | `swhdhlz.my.id` | Domain publik untuk web uploader & admin |
| `GIT_TOKEN` | **Wajib** | `-` | GitHub PAT untuk auto-pull update |
| `GIT_ADDRESS`| Opsional | `https://github.com/hijuki/shirowahd` | URL git repository |
| `USERNAME` | Opsional | `hijuki` | Username GitHub akun pemilik |
| `BRANCH` | Opsional | `main` | Branch target git |
| `ENABLE_TUNNEL` | Opsional | `0` | Mode Tunnel: `0` = **OFF** (Mati/Nonaktif), `1` = **ON** (Aktif) |

---

## 🤖 Konfigurasi Bot WhatsApp (`config.js` & `.pair-number`)

### 1. Konfigurasi `config.js`
Buka file `config.js` dan sesuaikan parameter utama:

```js
owner: {
  name: "SHIROWAHD",
  number: ["628xxxxxxxxx"],  // Nomor WhatsApp Owner (akses command owner)
},

session: {
  pairingNumber: "628xxxxxxxxx",  // Nomor WhatsApp yang akan dijadikan Bot
  usePairingCode: true,            // true = Pairing Code, false = QR Code
},

bot: {
  name: "SHIROWAHD",
  version: "3.3.0",
  developer: "HILLZ",
},

info: {
  website: "https://swhdhlz.my.id",
  grupwa: "https://chat.whatsapp.com/xxxx",
},

command: {
  prefix: ".",  // Prefix command (. / ! / #)
}
```

### 2. Set Pairing Number (`.pair-number`)
Buat file `.pair-number` yang berisi nomor WhatsApp bot (sama dengan `session.pairingNumber`):

```bash
echo "628xxxxxxxxx" > .pair-number
```

### 3. Pairing Pertama Kali
Jalankan bot:

```bash
node main.js
```
1. Buka WhatsApp di HP Anda.
2. Buka **Perangkat Tertaut (Linked Devices)** > **Tautkan Perangkat**.
3. Pilih **Tautkan dengan nomor telepon saja (Link with phone number instead)**.
4. Masukkan **8-digit Pairing Code** yang muncul di terminal VPS.

---

## 🌐 Setup Nginx Reverse Proxy

### 1. Buat Konfigurasi Nginx
```bash
nano /etc/nginx/sites-available/shirowahd
```

Tempelkan konfigurasi berikut (ganti `swhdhlz.my.id` dengan domain Anda):

```nginx
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
```

### 2. Aktifkan Site Nginx
```bash
ln -sf /etc/nginx/sites-available/shirowahd /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 3. Setup Cloudflare DNS
1. Buka dashboard Cloudflare > Menu **DNS**.
2. Tambahkan **A Record**:
   - **Name**: `@` atau subdomain Anda (misal: `swhdhlz`)
   - **IPv4 Address**: IP VPS Anda
   - **Proxy Status**: **Proxied (Orange Cloud)**
3. Menu **SSL/TLS** > Pilih mode **Flexible** (atau Full).

---

## ☁️ Setup Cloudflare Tunnel (Optional)

Jika ingin menjalankan web uploader tanpa port forwarding atau direct IP:

- `ENABLE_TUNNEL=0` : **OFF** (Cloudflare Tunnel nonaktif, menggunakan Nginx / IP Direct)
- `ENABLE_TUNNEL=1` : **ON** (Cloudflare Tunnel aktif otomatis saat aplikasi start)

1. Di file `.env`, aktifkan mode tunnel:
   ```env
   ENABLE_TUNNEL=1
   CF_ACCOUNT=your_account_id
   CF_EMAIL=your_email@domain.com
   CF_KEY=your_global_api_key
   CF_TUNNEL_ID=your_tunnel_id
   ```
2. `main.js` akan otomatis mengunduh binary `cloudflared` dan menghubungkan tunnel saat aplikasi start.

---

## 🔄 Update & Maintenance

### 1. Menjalankan Bot di Background (Screen)
```bash
screen -S shirowahd
cd /root/shirowahd && node main.js
# Tekan Ctrl+A lalu D untuk detach screen
```
- Buka kembali console: `screen -r shirowahd`

### 2. Update Code dari GitHub
- **Otomatis**: Setiap kali `node main.js` dijalankan, sistem otomatis mengeksekusi `git pull`.
- **Manual**:
  ```bash
  cd /root/shirowahd
  git pull origin main
  node main.js
  ```

---

## 📁 Struktur Folder Project

```text
shirowahd/
├── main.js             # Master bootloader (auto-kill, auto-patch, git auto-pull)
├── index.js            # WhatsApp bot core (Baileys client & message handler)
├── web-uploader.js     # Native zero-dependency HTTP server & admin API
├── config.js           # Konfigurasi bot, owner, and branding
├── admin-settings.json # Dynamic persistent admin branding & security settings
├── admin.html          # Single Page Application (SPA) admin panel
├── upload-page.html    # Public file upload interface
├── plugins/            # 100+ modular command plugins
├── src/lib/            # Core shared helper libraries & scrapers
├── .pair-number        # Nomor WhatsApp bot untuk auto-pairing
└── .env                # Secret environment variables (gitignored)
```

---

## 🛠️ Troubleshooting

- **Port 8080 Bentrok / In Use**:
  `main.js` sudah dilengkapi auto-kill proses lama di port 8080. Jika masih terkunci, matikan manual via:
  ```bash
  fuser -k 8080/tcp
  ```
- **Sesi WhatsApp Terputus / Logout**:
  Hapus folder session dan pairing ulang nomor WhatsApp:
  ```bash
  rm -rf session/
  node main.js
  ```
- **Token GitHub Expired saat Auto-Pull**:
  Update PAT baru Anda di file `.env` dan remote git:
  ```bash
  git remote set-url origin https://<TOKEN_BARU>@github.com/hijuki/shirowahd.git
  ```

---

<p align="center">
  <sub>Developed with ❤️ by <a href="https://github.com/hijuki"><b>HILLZ (hijuki)</b></a> • SHIROWAHD Official Project</sub>
</p>
