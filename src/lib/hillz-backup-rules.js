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
  //
  // DIPERBAIKI 2026-09-05: dulu di sini ada "storage" dan "storages", yang
  // membuang SELURUH folder storage/ — padahal isinya bukan cuma sesi.
  // `storage/pairing-state.json` ikut hilang tanpa alasan. Sekarang yang dibuang
  // hanya folder sesinya sendiri.
  "session", "sessions", "auth",
  // Sampah runtime.
  "tmp", "temp", "logs", "__pycache__", ".hillz-temp", ".vscode", ".gemini",
  "backups", "backup",
  // Skrip audit sekali pakai + keluaran pengukuran. 329 berkas / 7,45 MB terukur
  // ikut masuk zip sebelum ini: bukan data bot, dan bisa memuat cuplikan hasil
  // grep atas berkas rahasia.
  ".audit",
  // Ruang antar upload web: berkas video yang sedang diproses, bisa ratusan MB
  // dan lahir kembali setiap kali ada upload. Kalau ini ikut, zip melewati batas
  // kirim WhatsApp (90 MB) dan backup gagal total.
  "uploads", "vids",
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
  // `package-lock.json` / `web/package-lock.json` DULU dikecualikan demi ukuran.
  // Dikembalikan 2026-09-06: gabungannya cuma 412 KB dari zip 20 MB, dan tanpa
  // lockfile pemulihan memasang versi dependensi yang berbeda — itu justru sumber
  // "di VPS lama jalan, di VPS baru rusak". Lockfile bukan rahasia.
  // `.npmrc` TETAP dibuang: berkas itu bisa memuat token registry.
  "yarn.lock", ".npmrc",
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
  ["aturan git", ".gitignore"],
  // Lockfile: menjamin VPS baru memasang versi dependensi yang SAMA.
  ["lockfile bot", "package-lock.json"],
  ["web frontend", path.join("web", "app")],
  ["panel admin", path.join("web", "components", "admin")],
  ["web build", path.join("web", "out")],
  ["web lib", path.join("web", "lib")],
  ["plugins", "plugins"],
  ["src", "src"],
  ["database", "database"],
  // Data yang paling mahal kalau hilang: saldo, premium, level, sewa, toko.
  // Dicantumkan sebagai berkas TERSENDIRI, bukan cuma "database", karena folder
  // `database/` bisa ada tapi kosong dan laporan tetap bilang lengkap.
  ["data user", path.join("database", "main", "users.json")],
  ["data grup", path.join("database", "main", "groups.json")],
];

export function shouldExclude(filePath, basePath) {
  const rel = path.relative(basePath, filePath);
  if (!rel || rel.startsWith("..")) return true;
  const bagianRel = rel.split(path.sep);
  for (const bagian of bagianRel) {
    if (EXCLUDE_DIRS.has(bagian)) return true;
    // DIPERBAIKI 2026-09-05: dulu `bagian.startsWith(".git")` membuang
    // `.gitignore` dan `.gitattributes` juga — dua berkas konfigurasi yang WAJIB
    // ada di backup, karena tanpa `.gitignore` pemulihan berikutnya bisa
    // meng-commit `.env` dan sesi WA. Yang perlu dibuang cuma folder `.git`.
    if (bagian === ".git") return true;
  }
  // `storage/` ikut, KECUALI folder sesi WhatsApp di dalamnya. Sesi = kredensial
  // perangkat; sisanya (mis. pairing-state.json) data biasa yang boleh dibawa.
  if (bagianRel[0] === "storage" && /^session/i.test(bagianRel[1] || "")) return true;
  const nama = path.basename(rel);
  if (EXCLUDE_FILES.has(nama)) return true;
  if (nama.startsWith(".env.bak")) return true;
  if (nama.endsWith(".tar.gz")) return true;
  const ext = path.extname(nama).toLowerCase();
  if (EXCLUDE_EXTENSIONS.has(ext)) {
    // Folder yang isinya memang media/aset: ekstensi besar tetap boleh ikut,
    // karena di sini berkas ITULAH datanya, bukan sampah build.
    // `brand-assets` = gambar & GIF yang tuan unggah lewat panel (logo, hero).
    // `database/autoreply_media` = media balasan otomatis yang diunggah member.
    // Keduanya tidak bisa dibangun ulang dari mana pun.
    const aset =
      rel.startsWith("assets" + path.sep) ||
      rel.startsWith("database" + path.sep) ||
      rel.startsWith("brand-assets" + path.sep);
    // Media di AKAR proyek yang dilayani langsung oleh web-uploader (mis.
    // `header-video.mp4` di rute GET /header-video.mp4). Terukur 2026-09-06:
    // berkas ini satu-satunya berkas TER-TRACK GIT yang hilang dari zip, jadi
    // memulihkan backup menghasilkan hero web tanpa video. Batas ukurannya
    // dijaga MAX_FILE_SIZE, jadi tidak bisa membengkakkan zip.
    const mediaAkar = !rel.includes(path.sep) && ext !== ".zip" && ext !== ".log" &&
      ext !== ".bak" && ext !== ".lock" && ext !== ".pack";
    if (!aset && !mediaAkar) return true;
  }
  return false;
}

/** Kumpulkan daftar berkas yang akan masuk zip. Tidak menulis apa pun. */
export function kumpulkanBerkas(root) {
  const hasil = [];
  // Berkas yang lolos semua aturan tapi terlalu besar. DULU dibuang tanpa jejak:
  // kalau tuan mengunggah GIF brand 12 MB lewat panel, ia hilang dari backup dan
  // laporan tetap berbunyi "lengkap". Sekarang dicatat dan dilaporkan di caption,
  // supaya kehilangan data tidak pernah senyap.
  hasil.terlewat = [];
  (function jalan(dir) {
    let isi;
    try { isi = fs.readdirSync(dir); } catch { return; }
    for (const nama of isi) {
      const penuh = path.join(dir, nama);
      if (shouldExclude(penuh, root)) continue;
      let st;
      try { st = fs.statSync(penuh); } catch { continue; }
      if (st.isDirectory()) jalan(penuh);
      else if (st.isFile()) {
        const rel = path.relative(root, penuh);
        if (st.size < MAX_FILE_SIZE) hasil.push({ rel, penuh, size: st.size });
        else hasil.terlewat.push({ rel, size: st.size });
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
    // DIPERBAIKI 2026-09-06: dulu hanya 4 nama kunci yang ditulis manual di sini.
    // Zip backup dikirim lewat chat, jadi satu kunci rahasia baru yang lupa
    // didaftarkan = kebocoran. Sekarang penyensoran berdasarkan POLA nama, jadi
    // kunci rahasia yang ditambahkan nanti tersensor otomatis tanpa perlu ingat
    // memperbarui daftar ini.
    const POLA_RAHASIA = /pass|token|secret|apikey|api_key|webhook|chatid|chat_id|credential|auth|cookie|private|signature/i;
    for (const k of Object.keys(j)) {
      if (POLA_RAHASIA.test(k) && j[k]) j[k] = "__DIISI_LEWAT_ENV__";
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
    // Berkas yang sengaja dilewati karena >= MAX_FILE_SIZE. Diteruskan ke caption
    // supaya tuan tahu ada yang tidak ikut, bukan menduga backup sudah utuh.
    terlewat: berkas.terlewat || [],
    total: berkas.length,
    bytes: berkas.reduce((a, b) => a + b.size, 0),
  };
}
