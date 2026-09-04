#!/bin/bash
# ════════════════════════════════════════════════════════════════════════
#  SHIROWAHD — installer satu perintah untuk VPS BARU.
#
#  Alur yang dijamin:
#    1. Node + pm2 + ffmpeg dipasang
#    2. Repo di-clone
#    3. .env dibuat (semua opsional, password admin di-generate acak)
#    4. WEB dinyalakan LEBIH DULU  ← bot belum butuh nomor apa pun
#    5. Bot dinyalakan dalam mode MENUNGGU pairing
#    6. Admin buka /admin > Bot > Pairing, masukkan nomor, kode muncul di web
#
#  Tidak ada satu pun pertanyaan soal nomor WhatsApp di sini. Itu urusan
#  panel admin — begitu bot hidup tanpa nomor, ia menunggu dengan sabar.
#
#  Pakai:
#    bash install.sh
#
#  Env override (untuk otomasi / uji):
#    SW_DIR=/root/shirowahd  SW_REPO=<url>  SW_TOKEN=<PAT>
#    SW_NO_PM2=1     → jangan daftarkan ke pm2 (uji kering)
#    SW_NONINTERAKTIF=1 → jangan tanya apa pun, pakai default semua
# ════════════════════════════════════════════════════════════════════════
set -euo pipefail

SW_DIR="${SW_DIR:-/root/shirowahd}"
SW_REPO="${SW_REPO:-https://github.com/hijuki/shirowahd.git}"
NODE_MAJOR=22

say()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m  ✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m  !\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# `read` yang tidak mematikan script saat dijalankan non-interaktif.
# Tanpa `|| v=""`, `set -e` + EOF pada stdin akan menghentikan installer.
ask() {
  local v=""
  [ "${SW_NONINTERAKTIF:-0}" = 1 ] && { printf ''; return; }
  read -rp "$1" v 2>/dev/null </dev/tty || v=""
  printf '%s' "$v"
}

[ "$(id -u)" = 0 ] || die "Jalankan sebagai root."

# ── 1. Paket dasar ──────────────────────────────────────────────────────
say "Cek paket dasar"
command -v curl >/dev/null || { apt-get update -qq; apt-get install -y -qq curl; }

NODE_CUR=0
command -v node >/dev/null && NODE_CUR=$(node -v 2>/dev/null | sed 's/^v//; s/\..*//')
[ -n "$NODE_CUR" ] || NODE_CUR=0
if [ "$NODE_CUR" -lt "$NODE_MAJOR" ]; then
  say "Pasang Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null
  apt-get install -y -qq nodejs
fi
ok "Node $(node -v)"

apt-get install -y -qq git ffmpeg >/dev/null 2>&1 || apt-get install -y git ffmpeg
ok "git + ffmpeg"
command -v pm2 >/dev/null || { say "Pasang pm2"; npm install -g pm2 >/dev/null; }
ok "pm2 $(pm2 -v 2>/dev/null || echo '?')"

# ── 2. Repo ─────────────────────────────────────────────────────────────
if [ -d "$SW_DIR/.git" ]; then
  ok "Repo sudah ada di $SW_DIR"
else
  if [ -z "${SW_TOKEN:-}" ]; then
    echo
    echo "  Repo ini private, jadi butuh GitHub Personal Access Token (scope: repo)."
    echo "  Buat di: https://github.com/settings/tokens"
    SW_TOKEN=$(ask "  Token: ")
  fi
  [ -n "$SW_TOKEN" ] || die "Token kosong — tidak bisa clone repo private."
  AUTH_REPO="${SW_REPO/https:\/\//https:\/\/${SW_TOKEN}@}"
  say "Clone repo → $SW_DIR"
  git clone --depth 1 "$AUTH_REPO" "$SW_DIR"
  # Remote disimpan TANPA token supaya tidak bocor lewat `git remote -v`.
  ( cd "$SW_DIR" && git remote set-url origin "$SW_REPO" )
  ok "Repo siap"
fi
cd "$SW_DIR"

# ── 3. Bundle migrasi (pindah VPS) ──────────────────────────────────────
# Dijalankan SEBELUM .env dibuat: kalau bundle punya .env sendiri, itu yang
# dipakai dan langkah 4 dilewati. Sesi WA ikut di dalamnya, jadi bot langsung
# tersambung tanpa pairing ulang.
MIG=""
for c in /root/shirowahd-migrate.tar.gz "$SW_DIR/../shirowahd-migrate.tar.gz"; do
  [ -f "$c" ] && MIG="$c" && break
done
if [ -n "$MIG" ]; then
  say "Bundle migrasi ditemukan: $MIG"
  tar -xzf "$MIG" -C "$SW_DIR"
  chmod 600 .env 2>/dev/null || true
  ok "Sesi WA + .env + database dipulihkan — tidak perlu pairing ulang"
fi

# ── 4. Dependencies ─────────────────────────────────────────────────────
say "npm install (bot)"
npm install --omit=dev --no-audit --no-fund
ok "dependencies bot"

say "npm install + build (web)"
( cd web && npm install --no-audit --no-fund && NODE_OPTIONS=--max-old-space-size=2048 npx next build )
ok "web ter-build ke web/out/"

# ── 5. .env ─────────────────────────────────────────────────────────────
# Semua isian OPSIONAL. Bot + web bisa jalan tanpa .env sama sekali.
# Password admin di-generate acak, bukan default yang sama di semua VPS.
if [ -f .env ]; then
  ok ".env sudah ada — tidak disentuh"
  ADMIN_PASS=""
else
  say "Buat .env"
  cp .env.example .env
  chmod 600 .env

  # Password admin acak. Ini yang paling penting: tanpa ini setiap VPS baru
  # memakai password default yang sama dan panel admin bisa dimasuki siapa pun
  # yang pernah melihat repo.
  ADMIN_PASS=$(head -c 18 /dev/urandom | base64 | tr -d '/+=' | head -c 16)
  sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$ADMIN_PASS|" .env

  echo
  echo "  Semua isian di bawah OPSIONAL — Enter untuk lewati."
  echo "  Bisa dilengkapi kapan saja lewat panel admin atau: nano $SW_DIR/.env"
  echo
  D=$(ask  "  Domain publik (mis. contoh.my.id) : ")
  GA=$(ask "  URL repo GitHub untuk backup      : ")
  GT=$(ask "  GitHub token untuk backup         : ")
  TT=$(ask "  Telegram bot token (notif)        : ")
  TC=$(ask "  Telegram chat id (notif)          : ")

  [ -n "$D"  ] && sed -i "s|^DOMAIN=.*|DOMAIN=$D|" .env
  [ -n "$GA" ] && sed -i "s|^GIT_ADDRESS=.*|GIT_ADDRESS=$GA|" .env
  [ -n "$GT" ] && sed -i "s|^GIT_TOKEN=.*|GIT_TOKEN=$GT|" .env
  [ -n "$TT" ] && sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$TT|" .env
  [ -n "$TC" ] && sed -i "s|^TELEGRAM_CHAT_ID=.*|TELEGRAM_CHAT_ID=$TC|" .env
  ok ".env dibuat (chmod 600)"
fi

# ── 6. Folder data ──────────────────────────────────────────────────────
# Dibuat lebih dulu supaya proses web bisa menulis papan status pairing
# walaupun bot belum pernah jalan sekali pun.
mkdir -p storage/session database/main brand-assets uploads
ok "folder data siap"

# ── 7. pm2 — WEB DULU, BOT BELAKANGAN ───────────────────────────────────
# Urutan ini bukan kosmetik. Pairing dilakukan dari panel web, jadi web wajib
# sudah menerima request sebelum bot punya gunanya. Bot yang dinyalakan tanpa
# nomor tidak error — ia menunggu papan status diisi panel.
if [ "${SW_NO_PM2:-0}" != 1 ]; then
  say "Nyalakan WEB (port 80)"
  if pm2 describe web >/dev/null 2>&1; then
    pm2 restart web --update-env >/dev/null
  else
    pm2 start web-uploader.js --name web --cwd "$SW_DIR" >/dev/null
  fi

  # Tunggu web benar-benar menjawab, bukan sekadar "pm2 bilang online".
  for i in $(seq 1 20); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1/ 2>/dev/null || echo 000)
    [ "$code" = "200" ] && break
    sleep 1
  done
  [ "${code:-000}" = "200" ] && ok "web menjawab 200" || warn "web belum menjawab 200 (cek: pm2 logs web)"

  say "Nyalakan BOT (mode menunggu pairing)"
  if pm2 describe main >/dev/null 2>&1; then
    pm2 restart main --update-env >/dev/null
  else
    pm2 start main.js --name main --cwd "$SW_DIR" >/dev/null
  fi
  pm2 save >/dev/null
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
  ok "pm2 tersimpan (auto-start saat VPS reboot)"
fi

# ── 8. Ringkasan ────────────────────────────────────────────────────────
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
DOM=$(grep -E '^DOMAIN=' .env 2>/dev/null | cut -d= -f2)
URL="http://${IP:-127.0.0.1}"
[ -n "$DOM" ] && URL="https://$DOM"

echo
printf '\033[1;32m═══ SELESAI ═══\033[0m\n'
echo
echo "  Web       : $URL"
echo "  Admin     : $URL/admin"
if [ -n "${ADMIN_PASS:-}" ]; then
  echo "  Password  : $ADMIN_PASS"
  echo "              ^ CATAT SEKARANG. Tersimpan juga di $SW_DIR/.env"
else
  echo "  Password  : lihat $SW_DIR/.env (ADMIN_PASSWORD)"
fi
echo
if [ -z "$MIG" ]; then
  echo "  LANGKAH TERAKHIR — tautkan nomor WhatsApp:"
  echo "    1. Buka $URL/admin lalu login"
  echo "    2. Tab \"BOT WA\" → kartu \"Pairing Perangkat\""
  echo "    3. Masukkan nomor bot (mis. 628xxx) → tombol \"Pair\""
  echo "    4. Kode 8 digit muncul DI HALAMAN ITU (bukan di terminal)"
  echo "    5. WhatsApp → Perangkat Tertaut → Tautkan dengan nomor telepon"
  echo
  echo "  Setelah tersambung, bot otomatis kirim \"BOT ON\" ke semua grup"
  echo "  yang tidak dimatikan di panel."
else
  echo "  Sesi WA dipulihkan dari bundle migrasi — bot langsung tersambung."
  echo "  Cek: pm2 logs main --lines 30"
fi
echo
echo "  Kontrol   : pm2 status | pm2 logs main | pm2 logs web"
echo "  Pindah VPS: bash migrate.sh   (buat bundle dari VPS ini)"
echo
