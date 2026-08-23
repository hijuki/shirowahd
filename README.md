# SHIROWAHD

WhatsApp bot + web file uploader + admin panel.

## Stack

- **Runtime:** Node.js 22+
- **WA Library:** Baileys
- **Web:** Express-less HTTP server (native `http`)
- **Domain:** Via Cloudflare proxy (A record) atau Cloudflare Tunnel

## Features

- Web uploader (drag & drop, progress bar, claim codes)
- WhatsApp bot 100+ commands (AI, downloader, tools, games)
- Admin panel (dashboard, file manager, branding, security)
- Upload statistics & log viewer
- Notification system (Telegram, Discord webhooks)
- Auto git pull on startup
- Auto patch Baileys (large file upload 80MB+)

---

## Setup VPS Baru (Dari Nol)

### 1. Install Node.js 22+

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git screen
```

### 2. Clone Repo (Private)

Buat GitHub Personal Access Token (PAT):
1. GitHub > Settings > Developer Settings > Personal Access Tokens > Tokens (classic)
2. Generate new token, centang `repo` scope
3. Copy token (contoh: `ghp_xxxxxxxxxxxx`)

Clone:

```bash
cd /root
git clone https://TOKEN_LU@github.com/hijuki/shirowahd.git
cd shirowahd
```

Ganti `TOKEN_LU` dengan PAT lu.

### 3. Install Dependencies

```bash
npm install
```

### 4. Buat File `.env`

```bash
nano .env
```

Isi:

```env
# === WAJIB ===
DOMAIN=swhdhlz.my.id
GIT_TOKEN=ghp_xxxxxxxxxxxx
GIT_ADDRESS=https://github.com/hijuki/shirowahd
USERNAME=hijuki
BRANCH=main

# === CLOUDFLARE TUNNEL (optional, default OFF) ===
ENABLE_TUNNEL=0
CF_ACCOUNT=
CF_EMAIL=
CF_KEY=
CF_TUNNEL_ID=
```

Minimal cuma butuh `DOMAIN` dan `GIT_TOKEN`. Sisanya optional.

### 5. Setup Nginx (Reverse Proxy)

Install nginx:

```bash
apt install -y nginx
```

Buat config:

```bash
nano /etc/nginx/sites-available/shirowahd
```

Isi:

```nginx
server {
    listen 80;
    server_name DOMAIN_LU;

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

Ganti `DOMAIN_LU` dengan domain lu.

Aktifin:

```bash
ln -sf /etc/nginx/sites-available/shirowahd /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 6. Setup Domain (Cloudflare)

1. Buka Cloudflare dashboard > DNS
2. Tambah A record:
   - Name: `@` (atau subdomain lu)
   - Content: IP VPS lu
   - Proxy: ON (orange cloud)
3. SSL/TLS > pilih **Flexible**

### 7. Jalankan Bot

```bash
cd /root/shirowahd
node main.js
```

Atau pake `screen` biar jalan di background:

```bash
screen -S bot
node main.js
# Tekan Ctrl+A lalu D untuk detach
```

Buka lagi: `screen -r bot`

---

## Ganti Domain

1. Edit `.env`:
   ```
   DOMAIN=domainbaru.com
   ```

2. Update Cloudflare DNS:
   - Tambah A record baru yang nunjuk ke IP VPS

3. Update Nginx:
   ```bash
   nano /etc/nginx/sites-available/shirowahd
   # Ganti server_name ke domain baru
   nginx -t && systemctl reload nginx
   ```

4. Restart bot:
   ```bash
   node main.js
   ```
   `main.js` otomatis update `admin-settings.json` pake domain baru.

---

## Update Code dari GitHub

Otomatis: setiap `node main.js` dijalankan, dia auto `git pull` dari GitHub.

Manual:

```bash
cd /root/shirowahd
git pull origin main
node main.js
```

**Penting:** `.env` ada di `.gitignore`, jadi ga ke-overwrite waktu pull. Tapi kalau lu pake `git reset --hard`, `.env` bakal kehapus — bikin ulang.

---

## Clone Repo Private ke VPS Lain

```bash
# Cara 1: Token di URL (simple)
git clone https://TOKEN@github.com/hijuki/shirowahd.git

# Cara 2: Set token di git config (ga keliatan di history)
git clone https://github.com/hijuki/shirowahd.git
cd shirowahd
git remote set-url origin https://TOKEN@github.com/hijuki/shirowahd.git
```

Cek token masih valid:
```bash
curl -s -H "Authorization: token TOKEN" https://api.github.com/user | grep login
```

---

## Cloudflare Tunnel (Optional)

Kalau mau pake tunnel instead of direct A record:

1. Edit `.env`:
   ```
   ENABLE_TUNNEL=1
   CF_ACCOUNT=account_id_lu
   CF_EMAIL=email@lu.com
   CF_KEY=api_key_lu
   CF_TUNNEL_ID=tunnel_id_lu
   ```

2. `main.js` otomatis download `cloudflared` binary dan start tunnel.

**Note:** Beberapa hosting (e.g. UpCloud trial) block port 7844 yang diperlukan tunnel. Kalau tunnel ga jalan, pake direct A record + Cloudflare proxy aja.

---

## Env Variables

| Variable | Wajib | Default | Keterangan |
|----------|-------|---------|------------|
| `DOMAIN` | Ya | `swhdhlz.my.id` | Domain web uploader |
| `GIT_TOKEN` | Ya | - | GitHub PAT untuk auto pull |
| `GIT_ADDRESS` | Tidak | `https://github.com/hijuki/shirowahd` | URL repo |
| `USERNAME` | Tidak | - | GitHub username |
| `BRANCH` | Tidak | `main` | Git branch |
| `ENABLE_TUNNEL` | Tidak | `0` | `1` = aktifkan Cloudflare Tunnel |
| `CF_ACCOUNT` | Tidak | - | Cloudflare account ID |
| `CF_EMAIL` | Tidak | - | Cloudflare email |
| `CF_KEY` | Tidak | - | Cloudflare API key |
| `CF_TUNNEL_ID` | Tidak | - | Cloudflare tunnel ID |

---

## Konfigurasi Bot (`config.js`)

File ini **harus diedit** sebelum bot jalan. Buka `config.js` dan ubah:

```js
owner: {
  name: "SHIROWAHD",
  number: ["628xxxxxxxxx"],  // Nomor WA owner (format: 628xxx)
},

session: {
  pairingNumber: "628xxxxxxxxx",  // Nomor WA bot yang mau di-pair
  usePairingCode: true,            // true = pairing code, false = QR
},

bot: {
  name: "SHIROWAHD",
  version: "3.3",
  developer: "HILLZ",
},

info: {
  website: "https://domainlu.com",
  grupwa: "https://chat.whatsapp.com/xxxx",
},

command: {
  prefix: ".",  // Prefix command (. / ! / # dll)
},

sticker: {
  packname: "SHIROWAHD",
  author: "HILLZ",
},
```

**Yang WAJIB diubah:**
- `owner.number` — nomor WA owner (buat akses command owner)
- `session.pairingNumber` — nomor WA yang bakal jadi bot

**Optional:**
- `bot.name`, `bot.developer` — branding
- `info.website` — domain web uploader
- `payment` / `donasi` — isi kalau mau fitur pembayaran
- `saluran` — channel WhatsApp bot
- `vercel.token` — kalau mau fitur `.deploy`

---

## Pairing Number (`.pair-number`)

File `.pair-number` berisi nomor WA bot (1 baris, format `628xxx`). Ini dipakai buat auto-pairing.

Bikin/edit:

```bash
echo "628xxxxxxxxx" > .pair-number
```

Ganti `628xxxxxxxxx` dengan nomor WA yang mau dijadiin bot.

Nomor ini **harus sama** dengan `session.pairingNumber` di `config.js`.

Pas pertama kali run `node main.js`, bot bakal minta pairing code. Masukkan code-nya di WhatsApp:
1. Buka WhatsApp di HP
2. Settings > Linked Devices > Link a Device
3. Pilih "Link with phone number instead"
4. Masukkan pairing code yang muncul di terminal

---

## Project Structure

```
main.js             Entry point (auto-kill, git pull, patches, boot)
web-uploader.js     HTTP server, upload handling, admin API
admin.html          Admin panel SPA
upload-page.html    Public upload page
index.js            WhatsApp bot core
config.js           Bot configuration
plugins/            Bot command plugins
src/lib/            Shared libraries
.env                Secrets (gitignored)
```

---

## Troubleshooting

**Port 8080 udah kepake:**
`main.js` otomatis kill proses lama. Kalau masih error, manual: `fuser -k 8080/tcp`

**Git pull gagal:**
Token expired. Bikin PAT baru di GitHub, update `.env` dan git remote:
```bash
git remote set-url origin https://TOKEN_BARU@github.com/hijuki/shirowahd.git
```

**Bot ga connect WhatsApp:**
Hapus folder `session/` dan scan ulang QR:
```bash
rm -rf session/
node main.js
```

**`.env` hilang setelah git pull:**
Bikin ulang. `.env` di-gitignore jadi ga pernah ke-commit.

---

## License

Private project.
