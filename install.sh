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
#    SW_NO_SWAP=1    → jangan bikin swap walau RAM kecil
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

# ── 1b. Baca spek VPS dan sesuaikan ─────────────────────────────────────
# VPS berikutnya belum tentu sekelas yang sekarang. Angka build di-turunkan
# dari RAM nyata, bukan dipatok. Tanpa ini `next build` di VPS 1 GB kena
# OOM-killer dan installer mati di tengah tanpa penjelasan.
CPU=$(nproc 2>/dev/null || echo 1)
RAM_MB=$(awk '/MemTotal/{printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 1024)
SWAP_MB=$(awk '/SwapTotal/{printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 0)
DISK_MB=$(df -Pm / 2>/dev/null | awk 'NR==2{print $4}' || echo 0)
ARCH=$(uname -m)
say "Spek VPS: ${CPU} core, ${RAM_MB} MB RAM, ${SWAP_MB} MB swap, ${DISK_MB} MB disk bebas, $ARCH"

[ "$DISK_MB" -lt 3000 ] && warn "Disk bebas < 3 GB — node_modules bot+web butuh ~1.4 GB"

# Heap build: ~50% RAM, dibatasi 512-4096 MB.
BUILD_HEAP=$(( RAM_MB / 2 ))
[ "$BUILD_HEAP" -lt 512 ] && BUILD_HEAP=512
[ "$BUILD_HEAP" -gt 4096 ] && BUILD_HEAP=4096

# Swap: `next build` butuh ~1.5 GB. RAM < 2 GB tanpa swap = OOM hampir pasti.
TOTAL_MB=$(( RAM_MB + SWAP_MB ))
if [ "$TOTAL_MB" -lt 2048 ] && [ "${SW_NO_SWAP:-0}" != 1 ]; then
  if [ ! -f /swapfile ]; then
    say "RAM+swap hanya ${TOTAL_MB} MB — bikin swapfile 2 GB supaya build tidak kena OOM"
    if fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none; then
      chmod 600 /swapfile && mkswap /swapfile >/dev/null 2>&1 && swapon /swapfile 2>/dev/null \
        && grep -q '^/swapfile' /etc/fstab 2>/dev/null || echo '/swapfile none swap sw 0 0' >> /etc/fstab
      ok "swap 2 GB aktif"
    else
      warn "gagal bikin swap — build mungkin kena OOM"
    fi
  else
    ok "swapfile sudah ada"
  fi
fi
ok "heap build diset ${BUILD_HEAP} MB"

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
( cd web && npm install --no-audit --no-fund && NODE_OPTIONS=--max-old-space-size=${BUILD_HEAP} npx next build )
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
  # Batas memori pm2 diturunkan dari RAM nyata, bukan dipatok. Di VPS kecil
  # tanpa batas ini satu kebocoran memori bot bikin OOM-killer membunuh
  # SSH/sshd, bukan cuma bot — VPS jadi tidak bisa dimasuki.
  BOT_MAXMEM=$(( RAM_MB * 45 / 100 ))
  WEB_MAXMEM=$(( RAM_MB * 25 / 100 ))
  [ "$BOT_MAXMEM" -lt 400 ] && BOT_MAXMEM=400
  [ "$WEB_MAXMEM" -lt 200 ] && WEB_MAXMEM=200
  [ "$BOT_MAXMEM" -gt 2048 ] && BOT_MAXMEM=2048
  [ "$WEB_MAXMEM" -gt 1024 ] && WEB_MAXMEM=1024
  ok "batas memori pm2: bot ${BOT_MAXMEM}M, web ${WEB_MAXMEM}M"

  # Port 80 harus bebas. nginx/apache bawaan image VPS sering sudah memegangnya,
  # dan pm2 akan melaporkan "online" walau proses langsung mati EADDRINUSE.
  if command -v ss >/dev/null 2>&1 && ss -ltnH '( sport = :80 )' 2>/dev/null | grep -q .; then
    PEMILIK=$(ss -ltnpH '( sport = :80 )' 2>/dev/null | grep -oE 'users:\(\("[^"]+' | head -1 | sed 's/.*"//')
    if [ "$PEMILIK" != "node" ] && [ -n "$PEMILIK" ]; then
      warn "Port 80 dipakai '$PEMILIK' — dimatikan supaya web bisa hidup"
      systemctl stop "$PEMILIK" 2>/dev/null || true
      systemctl disable "$PEMILIK" 2>/dev/null || true
    fi
  fi

  # DIPERBAIKI 2026-09-05 setelah diukur di produksi: `pm2 restart` TIDAK BISA
  # mengubah --max-memory-restart. Proses yang sudah ada dari sebelum baris ini
  # ditambahkan tetap berjalan TANPA batas memori (terukur: main 1180 MB,
  # batas=TIDAK AKTIF), jadi pengaman OOM-nya tidak pernah menyala.
  # Satu-satunya cara menerapkan batas ke proses lama: delete lalu start ulang.
  pm2_nyalakan() {
    local nama="$1" berkas="$2" batas="$3"
    local sekarang
    sekarang=$(pm2 jlist 2>/dev/null | node -e '
      let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
        try{const p=JSON.parse(s).find(x=>x.name===process.argv[1]);
          process.stdout.write(String(p?Math.round((p.pm2_env?.max_memory_restart||0)/1048576):-1));
        }catch(e){process.stdout.write("-1")}});' "$nama" 2>/dev/null || echo -1)

    if [ "$sekarang" = "$batas" ]; then
      pm2 restart "$nama" --update-env >/dev/null
    else
      # -1 = belum ada prosesnya; angka lain = batasnya salah/tidak aktif.
      [ "$sekarang" != "-1" ] && pm2 delete "$nama" >/dev/null 2>&1
      pm2 start "$berkas" --name "$nama" --cwd "$SW_DIR" --max-memory-restart "${batas}M" >/dev/null
    fi
  }

  say "Nyalakan WEB (port 80)"
  pm2_nyalakan web web-uploader.js "$WEB_MAXMEM"

  # Tunggu web benar-benar menjawab, bukan sekadar "pm2 bilang online".
  for i in $(seq 1 20); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1/ 2>/dev/null || echo 000)
    [ "$code" = "200" ] && break
    sleep 1
  done
  [ "${code:-000}" = "200" ] && ok "web menjawab 200" || warn "web belum menjawab 200 (cek: pm2 logs web)"

  say "Nyalakan BOT (mode menunggu pairing)"
  pm2_nyalakan main main.js "$BOT_MAXMEM"
  pm2 save >/dev/null
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
  ok "pm2 tersimpan (auto-start saat VPS reboot)"

  # Rotasi log: panel admin membaca main-out.log / main-error.log, jadi log yang
  # tumbuh tanpa batas bukan cuma memakan disk — ia memperlambat panel juga.
  # Tanpa modul ini log pm2 TIDAK pernah dipangkas sama sekali.
  if ! pm2 ls 2>/dev/null | grep -qi logrotate; then
    say "Pasang rotasi log pm2"
    pm2 install pm2-logrotate >/dev/null 2>&1 || warn "pm2-logrotate gagal dipasang (tidak fatal)"
  fi
  pm2 set pm2-logrotate:max_size 10M      >/dev/null 2>&1 || true
  pm2 set pm2-logrotate:retain 7          >/dev/null 2>&1 || true
  pm2 set pm2-logrotate:compress true     >/dev/null 2>&1 || true
  pm2 set pm2-logrotate:rotateInterval '0 0 * * *' >/dev/null 2>&1 || true
  ok "rotasi log: maks 10 MB, simpan 7 berkas, dikompresi"
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
