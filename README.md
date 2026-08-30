<div align="center">

<img src="web/public/logo.svg" width="88" alt="SHIROWAHD" />

# SHIROWAHD

**WhatsApp Multi-Device Bot · Web Cloud Uploader · Admin Panel**

Node.js 22 · Baileys · Next.js 15 · Zero-framework HTTP backend

<br>

</div>

## Install — satu perintah

VPS Ubuntu/Debian baru, login sebagai `root`:

```bash
curl -fsSL https://raw.githubusercontent.com/hijuki/shirowahd/main/install.sh -o install.sh && bash install.sh
```

> Repo private — installer akan minta GitHub token (PAT scope `repo`).

Installer otomatis mengurus: Node.js 22, git + ffmpeg, pm2, clone repo, `npm install` bot & web, build frontend, membuat `.env` interaktif, set nomor pairing, dan mendaftarkan `main` (bot) + `web` (uploader) ke pm2 dengan auto-start saat boot.

Setelah selesai:

```bash
pm2 logs main        # ambil 8-digit pairing code
```

WhatsApp di HP → **Perangkat Tertaut** → **Tautkan Perangkat** → **Tautkan dengan nomor telepon** → masukkan code.

<br>

## Arsitektur

```
main.js            bootloader bot (pm2: main)
index.js           core WhatsApp — Baileys multi-device
web-uploader.js    HTTP server :80 tanpa framework (pm2: web)
web/               frontend Next.js → static export ke web/out/
plugins/           800+ command modular (33 kategori)
src/lib/           helper bersama (vid-store, scrapers, dll)
```

Dua proses, satu repo. Bot dan web berbagi `vids/` — file yang di-upload lewat web diklaim lewat bot dengan kode 2 huruf.

<br>

## Konfigurasi

Semua secret di **`.env`** (template: [`.env.example`](.env.example)) — `config.js` hanya berisi referensi `process.env`, aman di-commit.

| Variabel | Wajib | Fungsi |
|---|---|---|
| `DOMAIN` | ✓ | Domain publik uploader |
| `GIT_TOKEN` + `GIT_ADDRESS` | untuk backup | Push backup ke GitHub dari panel |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | untuk notif | Notif upload / claim / error |
| `APIKEY_*` | per fitur | Key plugin (lolhuman, neoxr, groq, dll) |
| `WATCHDOG_MINUTES` | – | Reconnect paksa jika idle (default 180, `0` = mati) |
| `ENABLE_TUNNEL` + `CF_*` | – | Cloudflare Tunnel otomatis (`1` = aktif) |

Setting non-secret (password admin, limit, branding) dikelola dari **panel admin**, tersimpan di `admin-settings.json` (gitignored).

<br>

## Panel Admin

`http://IP-VPS/admin` — ubah password default lewat **Settings** segera setelah install.

- **Dashboard** — telemetri live, analytics upload
- **Files** — kelola file, extend expiry, bersihkan orphan
- **Settings** — limit, branding, backup GitHub + riwayat, status tunnel
- **Security** — blacklist IP, log upload
- **Bot** — status koneksi, restart, live log viewer, exec

<br>

## Operasional

```bash
pm2 status                  # kedua proses
pm2 logs main               # log bot
pm2 restart main            # restart bot   (bisa juga dari panel admin)
pm2 restart web             # restart web

# update manual
cd /root/shirowahd && git pull && cd web && npx next build && pm2 restart all
```

**Backup** — tombol di panel admin men-commit & push kode + settings tersanitasi ke GitHub. Secret (`.env`, `admin-settings.json`, `vids/`) tidak pernah ikut.

<br>

## Pindah VPS — tanpa pairing ulang

```bash
# VPS lama — bungkus semua identitas (sesi WA, .env, settings, database):
bash migrate.sh export
scp /root/shirowahd-migrate.tar.gz root@IP_BARU:/root/

# VPS baru — installer mendeteksi bundle & restore otomatis:
curl -fsSL https://raw.githubusercontent.com/hijuki/shirowahd/main/install.sh -o install.sh && bash install.sh
```

Bot langsung konek pakai sesi lama, domain & semua setting terbawa. Tidak ada pairing ulang, tidak ada isi ulang config.

<br>

## Troubleshooting

| Gejala | Solusi |
|---|---|
| Port 80 bentrok | `fuser -k 80/tcp` lalu `pm2 restart web` |
| Sesi WA logout | `rm -rf session/ && pm2 restart main`, pairing ulang |
| Bot sering reconnect | Naikkan `WATCHDOG_MINUTES` di `.env`, `pm2 restart main --update-env` |
| Backup gagal | Cek `GIT_TOKEN` masih valid di `.env` |
| Upload ditolak 503 | Matikan mode maintenance di panel Settings |

<br>

<div align="center">
<sub><a href="https://github.com/hijuki">SHIRO HLZ</a></sub>
</div>
