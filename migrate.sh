#!/bin/bash
# ════════════════════════════════════════════════════════════════════════
#  SHIROWAHD — buat bundle migrasi untuk pindah VPS.
#
#  Jalankan di VPS LAMA. Hasilnya satu berkas .tar.gz berisi semua yang
#  TIDAK ada di git: sesi WhatsApp, .env, database, aset brand.
#
#  Di VPS BARU:
#    scp shirowahd-migrate.tar.gz root@vps-baru:/root/
#    bash install.sh          ← bundle otomatis terdeteksi & dipulihkan
#
#  Kenapa perlu bundle: `git clone` hanya membawa kode. Sesi WhatsApp,
#  aktivasi user, sewa, dan .env sengaja gitignored (kredensial + data
#  hidup). Tanpa bundle, VPS baru harus pairing ulang dari nol dan
#  kehilangan aktivasi.
# ════════════════════════════════════════════════════════════════════════
set -euo pipefail

SW_DIR="${SW_DIR:-/root/shirowahd}"
# Argumen pertama boleh berupa path keluaran, atau kata `export` (kompatibel
# dengan README lama). Tanpa penanganan ini `bash migrate.sh export` akan
# membuat berkas bernama "export" di direktori kerja.
ARG1="${1:-}"
[ "$ARG1" = "export" ] && ARG1=""
OUT="${ARG1:-/root/shirowahd-migrate.tar.gz}"

say() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32m  ✓\033[0m %s\n' "$*"; }

cd "$SW_DIR" || { echo "ERROR: $SW_DIR tidak ada"; exit 1; }

# Hanya yang benar-benar tidak bisa diambil dari git.
ISI=()
for p in .env storage/session database admin-settings.json brand-assets .pair-number; do
  [ -e "$p" ] && ISI+=("$p")
done
[ ${#ISI[@]} -gt 0 ] || { echo "ERROR: tidak ada yang bisa dibundel"; exit 1; }

say "Isi bundle:"
for p in "${ISI[@]}"; do
  printf '    %-24s %s\n' "$p" "$(du -sh "$p" 2>/dev/null | cut -f1)"
done

# Sesi WA berisi kunci enkripsi perangkat. Bundle wajib 600 dan JANGAN
# pernah dimasukkan ke git atau dikirim lewat kanal terbuka.
tar -czf "$OUT" "${ISI[@]}"
chmod 600 "$OUT"

ok "Bundle: $OUT ($(du -sh "$OUT" | cut -f1))"
echo
echo "  Kirim ke VPS baru:"
echo "    scp -P <port> $OUT root@<ip-baru>:/root/"
echo "  Lalu di VPS baru:"
echo "    bash install.sh"
echo
printf '\033[1;33m  !\033[0m Bundle ini berisi sesi WhatsApp + .env. Hapus setelah dipakai.\n'
