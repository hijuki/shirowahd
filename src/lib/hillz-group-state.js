/**
 * Status hidup/mati bot per grup — persisten dan BENAR-BENAR menggerbang.
 *
 * Sebelum berkas ini, `/groups/toggle` di bot-api hanya mengisi
 * `global.disabledGroups` (Set di memori) dan TIDAK ADA satu pun tempat yang
 * membacanya untuk menolak pesan. Jadi tombol "matikan bot di grup ini" di panel
 * admin hanya berubah warna: bot tetap menjawab, dan setelan itu hilang setiap
 * `pm2 restart main`. Dua cacat sekaligus — tidak menggerbang, tidak persisten.
 *
 * Di sini status disimpan ke `database/main/groups-off.json` (gitignored bersama
 * `database/main/`, jadi aman dari `git reset --hard` saat bot boot) dan dibaca
 * oleh `src/handler.js` sebelum plugin dijalankan.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Sama seperti papan pairing: akar dihitung dari lokasi berkas, bukan cwd,
// supaya proses `web` dan `main` pasti menunjuk berkas yang sama.
const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BERKAS = () => path.join(AKAR, "database", "main", "groups-off.json");

/**
 * Cache supaya tidak membaca+parse JSON untuk setiap pesan masuk.
 *
 * KUNCI CACHE = mtime berkas, BUKAN sekadar umur detik. Ini bukan optimasi,
 * ini koreksi bug nyata: berkas ini ditulis oleh proses `web` tapi dibaca oleh
 * proses `main`, jadi `tulis()` hanya membatalkan cache di prosesnya sendiri.
 * Dengan cache berbasis waktu murni (dulu 3 detik), proses bot bisa memegang
 * daftar BASI selama jendela itu — dan siapa pun yang membaca lebih dulu ikut
 * "menyegarkan" timestamp tanpa menyegarkan isinya.
 *
 * Akibatnya terbukti: `/groups` di bot-api memanggil daftarGrupMati() untuk
 * mengisi field `disabled`, itu mengisi cache dengan daftar KOSONG; toggle dari
 * panel lalu menulis berkas; `/announce` beberapa milidetik kemudian masih
 * membaca cache kosong dan mengirim ke SEMUA grup, termasuk grup yang baru saja
 * dimatikan admin. Membandingkan mtime membuat pembatalan cache berlaku lintas
 * proses, dan biayanya hanya satu statSync.
 */
let cache = null;
let cacheKunci = "";

function baca() {
  // Kunci = mtime + ukuran. Ukuran ikut karena resolusi mtime bisa kasar: dua
  // tulisan dalam milidetik yang sama akan tampak identik kalau hanya mtime
  // yang dibandingkan, dan daftar basi lolos lagi.
  let kunci = "0:0";
  try {
    const s = fs.statSync(BERKAS());
    kunci = `${s.mtimeMs}:${s.size}`;
  } catch {
    kunci = "0:0";
  }
  if (cache && kunci === cacheKunci) return cache;
  try {
    const d = JSON.parse(fs.readFileSync(BERKAS(), "utf8"));
    cache = new Set(Array.isArray(d) ? d : Array.isArray(d.off) ? d.off : []);
  } catch {
    cache = new Set();
  }
  cacheKunci = kunci;
  return cache;
}

function tulis(set) {
  const dir = path.dirname(BERKAS());
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BERKAS(), JSON.stringify([...set], null, 1));
  } catch { }
  cache = set;
  // Kunci di-hitung ULANG dari berkas yang baru ditulis, bukan dikarang.
  try {
    const s = fs.statSync(BERKAS());
    cacheKunci = `${s.mtimeMs}:${s.size}`;
  } catch {
    cacheKunci = "";
  }
  // `global.disabledGroups` tetap disinkronkan supaya kode lama yang membacanya
  // (bot-api `/groups`) melihat kebenaran yang sama.
  global.disabledGroups = set;
}

/** Set berisi JID grup yang bot-nya dimatikan admin. */
function daftarGrupMati() {
  return baca();
}

function grupMati(jid) {
  if (!jid || !String(jid).endsWith("@g.us")) return false;
  return baca().has(jid);
}

/** @returns {boolean} status BARU (true = sekarang mati) */
function toggleGrup(jid) {
  const set = new Set(baca());
  const mati = set.has(jid);
  if (mati) set.delete(jid);
  else set.add(jid);
  tulis(set);
  return !mati;
}

function setGrup(jid, mati) {
  const set = new Set(baca());
  if (mati) set.add(jid);
  else set.delete(jid);
  tulis(set);
  return mati;
}

export { daftarGrupMati, grupMati, toggleGrup, setGrup };
