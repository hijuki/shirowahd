#!/bin/bash
# ============================================================
#  SHIROWAHD installer — satu perintah, VPS baru siap jalan.
#  Pakai:  bash install.sh          (interaktif)
#  Env override: SW_DIR, SW_REPO, SW_TOKEN, SW_NO_PM2=1 (test)
# ============================================================
set -euo pipefail

SW_DIR="${SW_DIR:-/root/shirowahd}"
SW_REPO="${SW_REPO:-https://github.com/hijuki/shirowahd.git}"
NODE_MAJOR=22

say()  { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }
# read yang tidak mematikan script saat non-interaktif (set -e + EOF)
ask()  { local v; read -rp "$1" v </dev/tty 2>/dev/null || v=""; printf '%s' "$v"; }

[ "$(id -u)" = 0 ] || die "Jalankan sebagai root."
command -v curl >/dev/null || { apt-get update -qq; apt-get install -y -qq curl; }

# ---------- 1. Node.js 22 + tools ----------
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt $NODE_MAJOR ]; then
  say "Install Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null
  apt-get install -y -qq nodejs
fi
say "Node $(node -v)"
apt-get install -y -qq git ffmpeg >/dev/null 2>&1 || apt-get install -y git ffmpeg
command -v pm2 >/dev/null || { say "Install pm2"; npm install -g pm2 >/dev/null; }

# ---------- 2. Clone / update repo ----------
if [ -d "$SW_DIR/.git" ]; then
  say "Repo sudah ada di $SW_DIR — skip clone"
else
  if [ -z "${SW_TOKEN:-}" ]; then
    SW_TOKEN=$(ask "GitHub Personal Access Token (repo scope): ")
  fi
  [ -n "$SW_TOKEN" ] || die "Token kosong."
  AUTH_REPO="${SW_REPO/https:\/\//https:\/\/${SW_TOKEN}@}"
  say "Clone repo → $SW_DIR"
  git clone --depth 1 "$AUTH_REPO" "$SW_DIR"
fi
cd "$SW_DIR"

# ---------- 3. Dependencies ----------
say "npm install (bot)"
npm install --omit=dev --no-audit --no-fund
say "npm install + build (web)"
( cd web && npm install --no-audit --no-fund && npx next build )

# ---------- 4. Restore migrasi (pindah VPS) ----------
MIG=""
for c in /root/shirowahd-migrate.tar.gz "$SW_DIR"/../shirowahd-migrate.tar.gz; do
  [ -f "$c" ] && MIG="$c" && break
done
if [ -n "$MIG" ] && [ ! -f .env ]; then
  say "Bundle migrasi ditemukan: $MIG — restore identitas VPS lama"
  tar -xzf "$MIG" -C "$SW_DIR"
  chmod 600 .env 2>/dev/null || true
  say "Sesi WA + .env + settings dipulihkan → tidak perlu pairing ulang"
fi

# ---------- 5. .env ----------
if [ ! -f .env ]; then
  say "Buat .env (Enter = pakai default / kosong)"
  D=$(ask  "  Domain publik [swhdhlz.my.id]: "); D=${D:-swhdhlz.my.id}
  GT=$(ask "  GitHub token untuk backup (kosong = skip): ")
  TT=$(ask "  Telegram bot token untuk notif (kosong = skip): ")
  TC=$(ask "  Telegram chat id (kosong = skip): ")
  cp .env.example .env
  sed -i "s|^DOMAIN=.*|DOMAIN=$D|" .env
  [ -n "$GT" ] && sed -i "s|^GIT_TOKEN=.*|GIT_TOKEN=$GT|" .env
  [ -n "$TT" ] && sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$TT|" .env
  [ -n "$TC" ] && sed -i "s|^TELEGRAM_CHAT_ID=.*|TELEGRAM_CHAT_ID=$TC|" .env
  chmod 600 .env
  say ".env dibuat — lengkapi API key lain kapan saja: nano $SW_DIR/.env"
else
  say ".env sudah ada — skip"
fi

# ---------- 6. Pairing number ----------
if [ ! -s .pair-number ]; then
  PN=$(ask "Nomor WhatsApp bot (62xxx): ")
  [ -n "$PN" ] && echo "$PN" > .pair-number
fi

# ---------- 7. pm2 ----------
if [ "${SW_NO_PM2:-0}" != 1 ]; then
  say "Daftarkan ke pm2"
  pm2 describe main >/dev/null 2>&1 || pm2 start main.js --name main --cwd "$SW_DIR"
  pm2 describe web  >/dev/null 2>&1 || pm2 start web-uploader.js --name web --cwd "$SW_DIR"
  pm2 save >/dev/null
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
fi

say "Selesai!"
echo
echo "  Web     : http://$(hostname -I | awk '{print $1}')  (port 80)"
echo "  Admin   : /admin  (password default: ubah di panel!)"
echo "  Pairing : pm2 logs main   → masukkan 8-digit code di WhatsApp"
echo "  Kontrol : pm2 status | pm2 logs main | pm2 restart main"
