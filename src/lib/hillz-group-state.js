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

/** Cache supaya tidak membaca disk untuk setiap pesan masuk. */
let cache = null;
let cacheWaktu = 0;
const UMUR_CACHE_MS = 3000;

function baca() {
  if (cache && Date.now() - cacheWaktu < UMUR_CACHE_MS) return cache;
  try {
    const d = JSON.parse(fs.readFileSync(BERKAS(), "utf8"));
    cache = new Set(Array.isArray(d) ? d : Array.isArray(d.off) ? d.off : []);
  } catch {
    cache = new Set();
  }
  cacheWaktu = Date.now();
  return cache;
}

function tulis(set) {
  const dir = path.dirname(BERKAS());
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BERKAS(), JSON.stringify([...set], null, 1));
  } catch { }
  cache = set;
  cacheWaktu = Date.now();
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
