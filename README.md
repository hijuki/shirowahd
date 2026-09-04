<div align="center">

<img src="web/public/logo.svg" width="88" alt="SHIROWAHD" />

# SHIROWAHD

**WhatsApp Multi-Device Bot · Web Cloud Uploader · Admin Panel**

Node.js 22 · Baileys · Next.js 15 · Backend HTTP tanpa framework

</div>

---

## Pasang di VPS baru

VPS Ubuntu/Debian bersih, login sebagai `root`:

```bash
curl -fsSL https://raw.githubusercontent.com/hijuki/shirowahd/main/install.sh -o install.sh && bash install.sh
```

Repo private, jadi installer akan minta GitHub Personal Access Token (scope `repo`). Itu satu-satunya isian yang wajib.

Installer mengurus: Node.js 22, git, ffmpeg, pm2, clone repo, `npm install` bot + web, build frontend, `.env` dengan password admin acak, lalu **menyalakan web dulu, bot belakangan**.

Selesai install, installer mencetak URL panel dan password admin. **Catat password itu** — tersimpan juga di `.env`.

### Tautkan nomor WhatsApp — dari panel, bukan terminal

Bot yang baru dipasang hidup tanpa nomor. Ia menunggu, bukan error.

1. Buka `http://IP-VPS/admin`, login pakai password dari installer
2. Tab **BOT WA** → kartu **Pairing Perangkat**
3. Masukkan nomor bot (contoh `628xxxxxxxxxx`) → tombol **Pair**
4. Kode 8 digit muncul **di halaman itu**, dengan hitung mundur
5. Di HP: WhatsApp → Perangkat Tertaut → Tautkan dengan nomor telepon → masukkan kode

Kode WhatsApp hanya hidup 2–3 menit. Kalau habis, tekan **Ulangi**.

Begitu tersambung, bot otomatis mengirim **BOT ON** ke semua grup yang tidak dimatikan di panel. Pengumuman ini hanya jalan sekali per nomor/sesi baru — `pm2 restart main` biasa tidak mengulanginya.

---

## Pindah VPS

Semua identitas yang tidak ada di git (sesi WhatsApp, `.env`, database aktivasi, aset brand) dibungkus jadi satu berkas.

```bash
# di VPS LAMA
bash migrate.sh
scp -P <port> /root/shirowahd-migrate.tar.gz root@<ip-baru>:/root/

# di VPS BARU
curl -fsSL https://raw.githubusercontent.com/hijuki/shirowahd/main/install.sh -o install.sh && bash install.sh
```

Installer mendeteksi bundle sebelum membuat `.env`, memulihkannya, dan melewati pairing. Bot langsung tersambung pakai sesi lama — aktivasi user, sewa, dan setting terbawa utuh.

Bundle berisi sesi WhatsApp dan `.env`. Mode-nya `600`; hapus setelah dipakai, jangan pernah masuk git.

---

## Arsitektur

```
main.js            bootloader bot          → pm2: main
index.js           core WhatsApp (Baileys multi-device)
web-uploader.js    HTTP server :80         → pm2: web
web/               frontend Next.js        → static export ke web/out/
plugins/           command modular per kategori
src/lib/           helper bersama
```

Dua proses, satu repo. Keduanya berbagi berkas di disk — itu sebabnya papan status pairing berupa berkas, bukan variabel:

| Berkas | Ditulis oleh | Dibaca oleh | Isi |
|---|---|---|---|
| `storage/pairing-state.json` | bot & web | panel admin | tahap pairing + kode |
| `.pair-number` | web | bot saat start | nomor yang mau ditautkan |
| `database/main/bots.json` | web | bot | daftar bot tambahan + role |
| `database/main/groups-off.json` | web | bot | grup yang dimatikan admin |

Semuanya gitignored, jadi aman dari `git reset --hard` yang dijalankan bot saat boot.

---

## Konfigurasi

`.env` (template: [`.env.example`](.env.example)). **Tidak ada variabel yang wajib** — bot dan web jalan tanpa `.env` sama sekali, nomor WhatsApp ditautkan dari panel.

| Variabel | Untuk apa |
|---|---|
| `ADMIN_PASSWORD` | Password panel. Di-generate acak oleh installer. Kalah dari password yang di-set lewat panel. |
| `DOMAIN` | Domain publik, dipakai untuk og:image dan tautan |
| `GIT_ADDRESS` + `GIT_TOKEN` + `BRANCH` | Tombol Backup di panel |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Notifikasi upload/claim/error |
| `WATCHDOG_MINUTES` | Reconnect paksa kalau tidak ada pesan masuk. `0` = mati, default 180 |
| `ENABLE_TUNNEL` + `CF_*` | Cloudflare Tunnel otomatis, `1` = aktif |
| `APIKEY_*`, `*_COOKIE` | Key per plugin. Kosong = plugin itu saja yang bilang key belum diatur |

`.env.example` ter-commit ke git, jadi **nilainya harus selalu kosong**. Isi hanya di `.env` (gitignored, mode 600).

---

## Panel Admin

`http://IP-VPS/admin`

- **Dashboard** — telemetri live, analytics upload
- **Files** — kelola file, extend expiry, bersihkan orphan
- **Settings** — limit, branding, backup GitHub, status tunnel
- **Security** — blacklist IP, log upload
- **Bot** — pairing, multi-bot, status koneksi, grup, broadcast, log, exec

### Multi-bot

Kartu **Bot Tambahan** di tab Bot: satu nomor utama plus beberapa nomor tambahan hidup bersamaan dalam satu proses, berbagi plugin dan database.

Per bot tambahan tersedia:
- **Tautkan** — kode pairing muncul di panel, sama seperti bot utama
- **On/Off** — mematikan bot memutus soketnya; perintah tidak diproses
- **Role** — batasi kategori plugin yang boleh jalan di bot itu

Role menggerbang di `src/handler.js`, satu langkah sebelum handler plugin dipanggil, jadi batasannya nyata dan bukan cuma tampilan.

---

## Operasional

```bash
pm2 status
pm2 logs main            # log bot
pm2 logs web             # log web
pm2 restart web          # aman
pm2 restart main         # bot terputus ~30 detik
```

### Urutan wajib saat mengubah kode di server

`main.js` menjalankan `git fetch` + `git reset --hard origin/main` setiap bot start. Berkas yang diubah di server tapi belum di-push akan hilang saat `pm2 restart main`.

```
1. edit          →  2. node --check / npx next build
3. git push      ←  WAJIB sebelum langkah 4
4. pm2 restart
```

`database/`, `storage/`, `.env`, `admin-settings.json` gitignored, jadi tidak ikut ter-reset.

---

## Troubleshooting

| Gejala | Sebab & solusi |
|---|---|
| Panel bilang bot OFFLINE | `pm2 logs main`. Kalau berhenti di "menunggu nomor dari panel admin", itu normal — belum ada nomor. |
| Kode pairing tidak muncul | Kode hidup 2–3 menit. Tekan Minta Kode lagi. Kalau tetap kosong, `pm2 logs main` cari baris `pairing`. |
| Pairing sukses tapi langsung terputus | Status `515` = normal, bot menyambung ulang sendiri. Status `401` = perangkat dicabut WhatsApp, minta kode baru. |
| DM keluar tidak terkirim, grup jalan | Ack `463` — timelock tingkat akun WhatsApp, bukan bug bot. Pairing ulang tidak menyembuhkan; ganti nomor yang menyembuhkan. |
| Port 80 bentrok | `fuser -k 80/tcp` lalu `pm2 restart web` |
| Bot sering reconnect | Naikkan `WATCHDOG_MINUTES`, lalu `pm2 restart main --update-env` |
| Backup gagal | Cek `GIT_TOKEN` masih valid |
| Upload ditolak 503 | Matikan mode maintenance di Settings |
| Lupa password admin | Lihat `ADMIN_PASSWORD` di `.env`, atau hapus `adminPassword` dari `admin-settings.json` lalu `pm2 restart web` |

---

<div align="center">
<sub><a href="https://github.com/hijuki">SHIRO HLZ</a></sub>
</div>
