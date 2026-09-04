/**
 * Registry bot: beberapa nomor WA hidup bareng, tiap nomor bisa dimatikan dan
 * diberi ROLE yang benar-benar membatasi perintah yang boleh jalan.
 *
 * Kenapa role harus digerbang di satu tempat: kalau pembatasan ditulis di
 * masing-masing plugin, 800+ berkas harus disentuh dan tiap plugin baru pasti
 * lupa. Gerbang dipasang di `src/handler.js` tepat sebelum `plugin.handler()`
 * dipanggil, memakai `plugin.config.category` yang MEMANG sudah ada di setiap
 * plugin. Jadi role di sini bukan hiasan panel — ia menolak eksekusi.
 *
 * Kategori yang dipakai adalah kategori nyata di folder `plugins/`, dibaca dari
 * disk lewat `kategoriTersedia()`, bukan daftar tebakan. Kalau nanti ada folder
 * kategori baru, panel otomatis menampilkannya.
 *
 * Nomor utama (`main`) selalu ada dan tidak bisa dihapus: ia sesi bot induk di
 * `storage/session`. Nomor tambahan memakai mesin jadibot yang sudah ada
 * (`session/jadibot/<nomor>`), jadi tidak ada dua implementasi socket.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BERKAS = () => path.join(AKAR, "database", "main", "bots.json");
const PLUGINS_DIR = () => path.join(AKAR, "plugins");

/**
 * Peran bawaan. `kategori: null` berarti TANPA batas (semua kategori jalan).
 * Daftar kategori di sini diverifikasi ada di disk oleh `perbaikiRole()`.
 */
const ROLE_BAWAAN = {
  full: {
    label: "Full Bot",
    deskripsi: "Semua perintah aktif, tanpa batas kategori",
    kategori: null,
  },
  claim: {
    label: "Claim Video",
    deskripsi: "Khusus alur klaim/upload video + info dasar",
    kategori: ["store", "main", "info", "cek", "media", "download", "convert"],
  },
  grup: {
    label: "Pengelola Grup",
    deskripsi: "Moderasi grup, anti-link, welcome, tanpa game/RPG",
    kategori: ["group", "main", "info", "cek", "user", "tools", "utility"],
  },
  hiburan: {
    label: "Hiburan",
    deskripsi: "Game, RPG, fun, sticker, canvas",
    kategori: ["game", "rpg", "fun", "sticker", "canvas", "random", "main", "clan"],
  },
  unduh: {
    label: "Downloader",
    deskripsi: "Fokus unduhan media & pencarian",
    kategori: ["download", "search", "media", "convert", "stalker", "main", "info"],
  },
};

/** Kategori nyata dari folder plugins/ — fakta di disk, bukan daftar hardcode. */
function kategoriTersedia() {
  try {
    return fs
      .readdirSync(PLUGINS_DIR(), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

const KOSONG = { bots: {}, rolesKustom: {} };

function baca() {
  try {
    const d = JSON.parse(fs.readFileSync(BERKAS(), "utf8"));
    return {
      bots: d.bots && typeof d.bots === "object" ? d.bots : {},
      rolesKustom: d.rolesKustom && typeof d.rolesKustom === "object" ? d.rolesKustom : {},
    };
  } catch {
    return { ...KOSONG, bots: {}, rolesKustom: {} };
  }
}

function tulis(data) {
  const dir = path.dirname(BERKAS());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(BERKAS(), JSON.stringify(data, null, 1));
  return data;
}

/** Semua role (bawaan + kustom admin), kategori sudah disaring ke yang nyata. */
function semuaRole() {
  const nyata = new Set(kategoriTersedia());
  const { rolesKustom } = baca();
  const gabung = { ...ROLE_BAWAAN, ...rolesKustom };
  const hasil = {};
  for (const [id, r] of Object.entries(gabung)) {
    hasil[id] = {
      label: r.label || id,
      deskripsi: r.deskripsi || "",
      // Kategori yang tidak ada di disk dibuang, supaya panel tidak menjanjikan
      // pembatasan atas kategori yang tidak pernah ada.
      kategori: Array.isArray(r.kategori)
        ? r.kategori.filter((k) => nyata.has(k))
        : null,
      bawaan: id in ROLE_BAWAAN,
    };
  }
  return hasil;
}

/**
 * Entri bot; `main` selalu disintesis walau berkas belum ada supaya panel
 * tidak pernah kosong di VPS baru.
 */
function daftarBot() {
  const { bots } = baca();
  const hasil = {};
  hasil.main = {
    id: "main",
    nomor: bots.main?.nomor || "",
    label: bots.main?.label || "Bot Utama",
    role: bots.main?.role || "full",
    aktif: bots.main?.aktif !== false,
    utama: true,
  };
  for (const [id, b] of Object.entries(bots)) {
    if (id === "main") continue;
    hasil[id] = {
      id,
      nomor: b.nomor || id,
      label: b.label || b.nomor || id,
      role: b.role || "full",
      aktif: b.aktif !== false,
      utama: false,
    };
  }
  return hasil;
}

function simpanBot(id, patch) {
  const data = baca();
  const kunci = String(id).replace(/[^a-zA-Z0-9_]/g, "");
  if (!kunci) throw new Error("id bot tidak valid");
  const lama = data.bots[kunci] || {};
  const role = patch.role !== undefined ? String(patch.role) : lama.role || "full";
  if (!(role in semuaRole())) throw new Error(`role "${role}" tidak dikenal`);
  data.bots[kunci] = {
    ...lama,
    ...patch,
    role,
    nomor: String(patch.nomor ?? lama.nomor ?? "").replace(/[^0-9]/g, ""),
  };
  tulis(data);
  return daftarBot()[kunci];
}

function hapusBot(id) {
  if (id === "main") throw new Error("bot utama tidak bisa dihapus");
  const data = baca();
  delete data.bots[id];
  tulis(data);
  return true;
}

function simpanRoleKustom(id, role) {
  const kunci = String(id).replace(/[^a-z0-9_-]/gi, "").toLowerCase();
  if (!kunci) throw new Error("id role tidak valid");
  if (kunci in ROLE_BAWAAN) throw new Error("role bawaan tidak bisa ditimpa");
  const nyata = new Set(kategoriTersedia());
  const kategori = Array.isArray(role.kategori)
    ? role.kategori.filter((k) => nyata.has(k))
    : null;
  const data = baca();
  data.rolesKustom[kunci] = {
    label: String(role.label || kunci),
    deskripsi: String(role.deskripsi || ""),
    kategori,
  };
  tulis(data);
  return semuaRole()[kunci];
}

function hapusRoleKustom(id) {
  if (id in ROLE_BAWAAN) throw new Error("role bawaan tidak bisa dihapus");
  const data = baca();
  delete data.rolesKustom[id];
  // Bot yang memakai role terhapus dikembalikan ke `full`, jangan dibiarkan
  // menunjuk role hantu — itu akan memblokir semua perintahnya secara diam-diam.
  for (const b of Object.values(data.bots)) if (b.role === id) b.role = "full";
  tulis(data);
  return true;
}

/**
 * GERBANG UTAMA. Dipanggil handler sebelum plugin dijalankan.
 *
 * @param {string} botId  "main" atau id jadibot (nomor tanpa @s.whatsapp.net)
 * @param {string} kategori  plugin.config.category
 * @returns {{izin: boolean, alasan: string}}
 */
function bolehJalan(botId, kategori) {
  const bots = daftarBot();
  const bot = bots[botId] || bots.main;
  if (!bot) return { izin: true, alasan: "" };
  if (bot.aktif === false) {
    return { izin: false, alasan: `Bot ${bot.label} sedang dimatikan admin` };
  }
  const role = semuaRole()[bot.role];
  if (!role || role.kategori === null) return { izin: true, alasan: "" };
  const kat = String(kategori || "").toLowerCase();
  // Perintah tanpa kategori tidak diblokir: memblokirnya akan mematikan
  // perintah inti yang lupa mengisi `category`.
  if (!kat) return { izin: true, alasan: "" };
  if (role.kategori.includes(kat)) return { izin: true, alasan: "" };
  return {
    izin: false,
    alasan: `Bot ini diatur sebagai *${role.label}* — kategori \`${kat}\` tidak aktif`,
  };
}

/** Apakah bot ini dimatikan admin (dipakai sebelum memproses pesan sama sekali). */
function botAktif(botId) {
  const bots = daftarBot();
  const bot = bots[botId] || bots.main;
  return bot ? bot.aktif !== false : true;
}

export {
  ROLE_BAWAAN,
  kategoriTersedia,
  semuaRole,
  daftarBot,
  simpanBot,
  hapusBot,
  simpanRoleKustom,
  hapusRoleKustom,
  bolehJalan,
  botAktif,
};
