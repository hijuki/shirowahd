/**
 * Mesin status pairing — supaya penautan nomor bisa dikendalikan dari panel
 * admin, bukan dari terminal VPS.
 *
 * Kenapa perlu berkas status, bukan variabel di memori saja: proses web
 * (`web-uploader.js`) dan proses bot (`main.js`) adalah dua proses pm2 yang
 * berbeda. Panel admin bicara ke web, sedangkan kode pairing lahir di bot.
 * Berkas ini jadi papan tulis bersama yang bisa dibaca kedua proses, dan tetap
 * benar walaupun salah satu proses baru saja restart.
 *
 * Alur yang dituju (VPS baru, nol sesi):
 *   1. install.sh hanya menyalakan `web`. Bot BELUM jalan.
 *   2. Admin buka panel → isi nomor → tombol Pair.
 *   3. Web menulis permintaan ke berkas ini, lalu menyalakan `main`.
 *   4. Bot start, melihat ada permintaan, meminta kode ke WhatsApp,
 *      menuliskan kodenya ke berkas ini.
 *   5. Panel polling `/pair/state` → kode muncul di layar admin.
 *   6. Admin masukkan kode di HP → bot tersambung → status jadi `connected`.
 *
 * Tanpa berkas ini, kode pairing hanya ada di banner terminal (`pm2 logs main`)
 * dan `startConnection` bahkan sempat memanggil prompt stdin — yang di bawah
 * pm2 tidak punya TTY, jadi bot menggantung tanpa pernah minta kode.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Akar repo dihitung dari lokasi berkas ini, BUKAN dari process.cwd().
// Alasannya penting: papan status ini dibaca oleh dua proses pm2 (`web` dan
// `main`) yang cwd-nya bisa berbeda. Kalau memakai cwd, kedua proses bisa
// menulis ke dua berkas berbeda dan kode pairing tidak akan pernah muncul di
// panel.
const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BERKAS = () => path.join(AKAR, "storage", "pairing-state.json");

/** Umur maksimal permintaan pairing. Kode WA sendiri mati ~2-3 menit; setelah
 *  15 menit permintaan dianggap basi supaya bot tidak minta kode terus-menerus
 *  untuk nomor yang sudah ditinggalkan admin. */
const UMUR_PERMINTAAN_MS = 15 * 60 * 1000;

const KOSONG = {
  tahap: "idle", // idle | diminta | kode-siap | tersambung | gagal
  nomor: "",
  kode: "",
  kodeRapi: "",
  pesan: "",
  device: "",
  nama: "",
  diminta: 0,
  diperbarui: 0,
};

function bacaMentah() {
  try {
    const isi = fs.readFileSync(BERKAS(), "utf8");
    const d = JSON.parse(isi);
    return { ...KOSONG, ...d };
  } catch {
    return { ...KOSONG };
  }
}

function tulis(data) {
  const dir = path.dirname(BERKAS());
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const isi = { ...data, diperbarui: Date.now() };
    fs.writeFileSync(BERKAS(), JSON.stringify(isi, null, 1));
    return isi;
  } catch {
    // Kegagalan tulis tidak boleh menjatuhkan bot: pairing lewat web akan
    // gagal, tapi jalur terminal lama masih hidup.
    return data;
  }
}

/** Status pairing sekarang. Permintaan yang lewat umur otomatis dianggap basi
 *  supaya panel tidak menampilkan kode mati sebagai kode aktif. */
function statusPairing() {
  const d = bacaMentah();
  if (
    (d.tahap === "diminta" || d.tahap === "kode-siap") &&
    d.diminta &&
    Date.now() - d.diminta > UMUR_PERMINTAAN_MS
  ) {
    return { ...d, tahap: "kadaluarsa", kode: "", kodeRapi: "" };
  }
  if (d.tahap === "kode-siap" && d.kode) {
    // Kode WA berlaku singkat. Umurnya dilaporkan apa adanya supaya panel bisa
    // menampilkan hitungan dan admin tahu kapan harus minta ulang.
    d.umurKodeDetik = Math.round((Date.now() - (d.kodeDibuat || d.diminta)) / 1000);
  }
  return d;
}

/** Admin meminta penautan nomor baru. Dipanggil dari sisi web/bot-api. */
function mintaPairing(nomor) {
  const bersih = String(nomor || "").replace(/[^0-9]/g, "");
  if (bersih.length < 10 || bersih.length > 15) {
    throw new Error("Nomor tidak valid (10-15 digit, format 628xxx)");
  }
  return tulis({
    ...KOSONG,
    tahap: "diminta",
    nomor: bersih,
    pesan: "Menunggu bot meminta kode ke WhatsApp",
    diminta: Date.now(),
  });
}

/** Nomor yang sedang diminta admin, atau "" kalau tidak ada permintaan aktif. */
function nomorTertunda() {
  const d = statusPairing();
  if (d.tahap === "diminta" || d.tahap === "kode-siap") return d.nomor || "";
  return "";
}

/** Bot sudah dapat kode dari WhatsApp — publikasikan supaya panel bisa lihat. */
function simpanKode(nomor, kode) {
  const rapi = String(kode).match(/.{1,4}/g)?.join("-") || String(kode);
  const d = bacaMentah();
  return tulis({
    ...d,
    tahap: "kode-siap",
    nomor: String(nomor || d.nomor || "").replace(/[^0-9]/g, ""),
    kode: String(kode),
    kodeRapi: rapi,
    kodeDibuat: Date.now(),
    pesan: "Masukkan kode di HP: WhatsApp > Perangkat Tertaut > Tautkan dengan nomor telepon",
  });
}

/** Sambungan terbuka. Menyimpan identitas perangkat supaya panel bisa
 *  menampilkan nomor mana yang benar-benar tertaut, bukan nomor yang diminta. */
function tandaiTersambung(user) {
  const d = bacaMentah();
  return tulis({
    ...d,
    tahap: "tersambung",
    kode: "",
    kodeRapi: "",
    device: user?.id || "",
    nama: user?.name || "",
    pesan: "Perangkat tertaut",
  });
}

function tandaiGagal(pesan) {
  const d = bacaMentah();
  return tulis({ ...d, tahap: "gagal", kode: "", kodeRapi: "", pesan: String(pesan || "gagal") });
}

/** Bersihkan status (mis. setelah sesi dihapus admin). */
function resetPairing() {
  return tulis({ ...KOSONG, pesan: "" });
}

// ── Papan status untuk bot TAMBAHAN (jadibot) ────────────────────────────────
// Bot tambahan tidak restart proses, jadi sebenarnya bisa pakai memori saja.
// Tapi panel bicara ke web (proses lain), jadi kodenya tetap harus lewat berkas
// supaya terlihat. Disimpan di berkas yang sama, di bawah kunci `sub`.

function bacaSub() {
  const d = bacaMentah();
  return d.sub && typeof d.sub === "object" ? d.sub : {};
}

/** Simpan kode pairing bot tambahan. `nomor` dipakai sebagai kunci slot. */
function simpanKodeSub(nomor, kode, pesan) {
  const kunci = String(nomor).replace(/[^0-9]/g, "");
  const rapi = kode ? String(kode).match(/.{1,4}/g)?.join("-") || String(kode) : "";
  const d = bacaMentah();
  const sub = { ...bacaSub() };
  sub[kunci] = {
    nomor: kunci,
    kode: kode ? String(kode) : "",
    kodeRapi: rapi,
    tahap: kode ? "kode-siap" : "diminta",
    pesan: pesan || (kode ? "Masukkan kode di HP nomor tersebut" : "Menyiapkan sesi"),
    diperbarui: Date.now(),
  };
  return tulis({ ...d, sub });
}

function tandaiSub(nomor, tahap, pesan) {
  const kunci = String(nomor).replace(/[^0-9]/g, "");
  const d = bacaMentah();
  const sub = { ...bacaSub() };
  sub[kunci] = {
    ...(sub[kunci] || { nomor: kunci }),
    tahap,
    pesan: pesan || "",
    kode: tahap === "tersambung" ? "" : sub[kunci]?.kode || "",
    kodeRapi: tahap === "tersambung" ? "" : sub[kunci]?.kodeRapi || "",
    diperbarui: Date.now(),
  };
  return tulis({ ...d, sub });
}

/** Status semua bot tambahan; entri lewat 15 menit dianggap basi. */
function statusSub() {
  const sub = bacaSub();
  const hasil = {};
  for (const [k, v] of Object.entries(sub)) {
    const basi = v.diperbarui && Date.now() - v.diperbarui > UMUR_PERMINTAAN_MS;
    hasil[k] =
      basi && v.tahap !== "tersambung"
        ? { ...v, tahap: "kadaluarsa", kode: "", kodeRapi: "" }
        : v;
  }
  return hasil;
}

function hapusSub(nomor) {
  const kunci = String(nomor).replace(/[^0-9]/g, "");
  const d = bacaMentah();
  const sub = { ...bacaSub() };
  delete sub[kunci];
  return tulis({ ...d, sub });
}

export {
  statusPairing,
  mintaPairing,
  nomorTertunda,
  simpanKode,
  tandaiTersambung,
  tandaiGagal,
  resetPairing,
  simpanKodeSub,
  tandaiSub,
  statusSub,
  hapusSub,
  UMUR_PERMINTAAN_MS,
};
