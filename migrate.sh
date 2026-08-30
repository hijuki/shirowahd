#!/bin/bash
# ============================================================
#  SHIROWAHD migrate — pindah VPS tanpa pairing ulang.
#
#  VPS LAMA : bash migrate.sh export
#             → /root/shirowahd-migrate.tar.gz (semua identitas)
#  VPS BARU : taruh file itu di /root/, lalu jalankan installer:
#             bash install.sh   (auto-detect & restore)
#  Manual   : bash migrate.sh import /path/ke/file.tar.gz
# ============================================================
set -euo pipefail
SW_DIR="${SW_DIR:-/root/shirowahd}"
BUNDLE="${2:-/root/shirowahd-migrate.tar.gz}"

# Semua yang membuat instalasi "dikenali": sesi WA, secret, settings,
# nomor pairing, database user/RPG, file video aktif.
ITEMS=(storage/session session .env admin-settings.json .pair-number database vids backup-history.json upload-log.json)

case "${1:-}" in
  export)
    cd "$SW_DIR"
    EX=(); for i in "${ITEMS[@]}"; do [ -e "$i" ] && EX+=("$i"); done
    tar -czf "$BUNDLE" "${EX[@]}"
    chmod 600 "$BUNDLE"
    echo "✔ Export: $BUNDLE ($(du -h "$BUNDLE" | cut -f1))"
    echo "  Isi: ${EX[*]}"
    echo "  Salin ke VPS baru: scp $BUNDLE root@IP_BARU:/root/"
    ;;
  import)
    [ -f "$BUNDLE" ] || { echo "ERROR: $BUNDLE tidak ada"; exit 1; }
    [ -d "$SW_DIR" ]  || { echo "ERROR: $SW_DIR tidak ada — jalankan install.sh dulu"; exit 1; }
    # jangan timpa identitas hidup tanpa backup
    TS=$(date +%s)
    cd "$SW_DIR"
    for i in "${ITEMS[@]}"; do [ -e "$i" ] && mv "$i" "$i.pre-import.$TS" 2>/dev/null || true; done
    tar -xzf "$BUNDLE" -C "$SW_DIR"
    chmod 600 .env 2>/dev/null || true
    echo "✔ Import selesai (backup lama: *.pre-import.$TS)"
    # Hanya restart pm2 kalau proses main/web memang menunjuk ke $SW_DIR.
    # Sebelumnya `pm2 restart main web` jalan tanpa syarat, jadi import ke
    # direktori lain (mis. sandbox atau instalasi kedua) ikut me-restart
    # instalasi produksi yang tidak ada hubungannya.
    if command -v pm2 >/dev/null; then
      PM_CWD=$(pm2 jlist 2>/dev/null | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const p=JSON.parse(d).find(x=>x.name==="main");process.stdout.write(p?p.pm2_env.pm_cwd:"")}catch{process.stdout.write("")}})' 2>/dev/null || echo "")
      if [ -n "$PM_CWD" ] && [ "$PM_CWD" = "$(pwd)" ]; then
        pm2 restart main web --update-env 2>/dev/null || true
      else
        echo "  (pm2 tidak di-restart: proses 'main' menunjuk ke '${PM_CWD:-tidak ada}', bukan $(pwd))"
        echo "  Restart manual kalau ini instalasi utama: pm2 restart main web --update-env"
      fi
    fi
    echo "  Bot akan konek pakai sesi lama — tidak perlu pairing ulang."
    ;;
  *)
    echo "Pakai: bash migrate.sh export | import [file.tar.gz]"; exit 1 ;;
esac
