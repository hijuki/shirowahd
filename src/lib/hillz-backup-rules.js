/**
 * ATURAN BACKUP BERSAMA — satu sumber kebenaran untuk semua backup zip.
 *
 * Kenapa modul ini ada: dulu ada DUA daftar exclude terpisah, di
 * `plugins/owner/backupsc.js` dan `src/lib/hillz-auto-backup.js`. Keduanya
 * sudah melenceng satu sama lain (auto-backup mengecualikan `storage/`,
 * plugin tidak), jadi dua tombol "backup" menghasilkan isi berbeda tanpa ada
 * yang tahu. Daftar ganda seperti itu pasti melenceng lagi; sekarang satu.
 *
 * Prinsip:
 *   1. Yang WAJIB ada = kode + konfigurasi + data yang tidak bisa dibangun
 *      ulang: bot, web frontend, panel admin, plugins, database.
 *   2. Yang TIDAK ikut = apa pun yang bisa dibangun ulang (`node_modules`,
 *      `web/.next`) atau yang berbahaya kalau bocor (kredensial, sesi WA).
 *   3. Kredensial tidak pernah masuk mentah. `admin-settings.json` diganti
 *      salinan tersanitasi yang dibuat di memori.
 */
import fs from "fs";
import path from "path";

// Folder yang tidak pernah masuk backup.
export const EXCLUDE_DIRS = new Set([
  // Bisa dibangun ulang dengan `npm install` / `next build`.
  "node_modules", ".next", "dist", "build", "coverage", ".cache", ".npm", ".yarn",
  // Sesi WhatsApp. Ini kredensial login perangkat: siapa pun yang memegangnya
  // bisa memakai identitas bot. Zip backup dikirim lewat chat, jadi sesi TIDAK
  // BOLEH ikut. Untuk pindah VPS pakai `migrate.sh` yang lewat scp, bukan chat.
  "storage", "storages", "session", "sessions", "auth",
  // Sampah runtime.
  "tmp", "temp", "logs", "__pycache__", ".hillz-temp", ".vscode", ".gemini",
  "backups", "backup", "autoreply_media",
  // Aset upload user: bukan kode, ukurannya bisa ratusan MB.
  "brand-assets", "uploads", "vids",
  // Repo bot lain yang pernah ditaruh di sini.
  "Baileys-master", "HillzGlitch-Baileys-main", "starseed-main", "fischit-main",
  "ALYA V8", "DHX-pro", "RTXZY-MD-pro", "BETABOTZ-MD2-pro", "KazzTzyCanvs",
  "Script Lyrra MD V7", "Sky Md V2", "Marin Kitagawa MD V1.0 (1)",
  "AmbaCrash v19 Free (1)", "@blckrose", "animation", "_tools", "PUSHKONTAK",
]);

// Ekstensi yang tidak ikut, KECUALI di dalam `assets/` atau `database/`.
export const EXCLUDE_EXTENSIONS = new Set([
  ".zip", ".7z", ".mp4", ".mp3", ".wav", ".avi", ".mkv",
  ".traineddata", ".log", ".bak", ".lock", ".pack",
]);

// Berkas yang tidak pernah masuk — semuanya kredensial atau sampah.
export const EXCLUDE_FILES = new Set([
  ".env", ".env.local", ".env.production",
  "creds.json",
  // Berisi password admin + token Telegram. Diganti salinan tersanitasi.
  "admin-settings.json",
  // Salinan tersanitasi LAMA di disk (sisa backup panel). Dilewati karena
  // setiap zip meng-append salinan SEGAR dari memori; tanpa baris ini zip
  // berisi dua entri dengan nama sama dan yang terbaca saat ekstrak adalah
  // versi basi.
  "admin-settings.sanitized.json",
  ".pair-number",
  "package-lock.json", "yarn.lock", ".npmrc",
  "boot_final.log", "bot_log.txt", "error.txt", "changelog.txt",
  "cloudflared",
]);

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Daftar isi yang WAJIB ada di setiap zip. Kalau salah satu hilang, backup
 * dilaporkan tidak lengkap alih-alih diam saja. Ini yang bikin "zip-nya harus
 * lengkap sampai web dan admin" bisa dibuktikan, bukan diasumsikan.
 */
export const WAJIB = [
  ["bot utama", "main.js"],
  ["server web", "web-uploader.js"],
  ["config bot", "config.js"],
  ["installer", "install.sh"],
  ["template env", ".env.example"],
  ["web frontend", path.join("web", "app")],
  ["panel admin", path.join("web", "components", "admin")],
  ["web build", path.join("web", "out")],
  ["web lib", path.join("web", "lib")],
  ["plugins", "plugins"],
  ["src", "src"],
  ["database", "database"],
];

export function shouldExclude(filePath, basePath) {
  const rel = path.relative(basePath, filePath);
  if (!rel || rel.startsWith("..")) return true;
  for (const bagian of rel.split(path.sep)) {
    if (EXCLUDE_DIRS.has(bagian)) return true;
    if (bagian.startsWith(".git")) return true;
  }
  const nama = path.basename(rel);
  if (EXCLUDE_FILES.has(nama)) return true;
  if (nama.startsWith(".env.bak")) return true;
  if (nama.endsWith(".tar.gz")) return true;
  const ext = path.extname(nama).toLowerCase();
  if (EXCLUDE_EXTENSIONS.has(ext)) {
    const aset =
      rel.startsWith("assets" + path.sep) ||
      rel.startsWith("database" + path.sep);
    if (!aset) return true;
  }
  return false;
}

/** Kumpulkan daftar berkas yang akan masuk zip. Tidak menulis apa pun. */
export function kumpulkanBerkas(root) {
  const hasil = [];
  (function jalan(dir) {
    let isi;
    try { isi = fs.readdirSync(dir); } catch { return; }
    for (const nama of isi) {
      const penuh = path.join(dir, nama);
      if (shouldExclude(penuh, root)) continue;
      let st;
      try { st = fs.statSync(penuh); } catch { continue; }
      if (st.isDirectory()) jalan(penuh);
      else if (st.isFile() && st.size < MAX_FILE_SIZE) {
        hasil.push({ rel: path.relative(root, penuh), penuh, size: st.size });
      }
    }
  })(root);
  return hasil;
}

/**
 * Salinan `admin-settings.json` tanpa kredensial. Dibuat di memori — tidak
 * pernah menulis berkas tersanitasi ke disk supaya tidak ada salinan nyasar.
 */
export function pengaturanTersanitasi(root) {
  try {
    const p = path.join(root, "admin-settings.json");
    if (!fs.existsSync(p)) return null;
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    for (const k of ["adminPassword", "telegramBotToken", "gitToken", "telegramChatId"]) {
      if (j[k]) j[k] = "__DIISI_LEWAT_ENV__";
    }
    return JSON.stringify(j, null, 2);
  } catch {
    return null;
  }
}

/** Ringkasan isi per bagian, untuk ditampilkan di caption/log. */
export function ringkas(berkas, root) {
  const per = new Map();
  for (const b of berkas) {
    const atas = b.rel.includes(path.sep) ? b.rel.split(path.sep)[0] + "/" : "(akar)";
    if (!per.has(atas)) per.set(atas, { n: 0, bytes: 0 });
    const e = per.get(atas);
    e.n++;
    e.bytes += b.size;
  }
  const hilang = WAJIB.filter(
    ([, pola]) => !berkas.some((b) => b.rel === pola || b.rel.startsWith(pola + path.sep)),
  ).map(([label]) => label);
  return {
    perBagian: [...per].sort((a, b) => b[1].bytes - a[1].bytes),
    hilang,
    total: berkas.length,
    bytes: berkas.reduce((a, b) => a + b.size, 0),
  };
}
