/**
 * CHEST — mesin permainan sisi server.
 *
 * Kenapa ada di server dan bukan di bubble: bubble WA tidak punya origin
 * tetap, jadi localStorage/sessionStorage/cookie-nya ikut hangus begitu
 * bubble dibuang. Itu sebab progres selalu balik ke nol. Selain itu, dua
 * bubble tidak bisa saling lihat — jadi satu-satunya cara multiplayer
 * adalah lewat perantara, dan perantaranya server ini.
 *
 * Bentuk permainan: SATU PAPAN BERSAMA per ruang (per grup WA), main
 * bergiliran. Giliran cocok dengan batasan bubble — bubble tidak bisa
 * di-push, cuma bisa polling, jadi permainan adu refleks memang tidak
 * mungkin, sedangkan giliran-giliran jalan mulus.
 *
 * Semua berkas ditulis di bawah `storage/` yang sudah gitignored, jadi
 * `git reset --hard` di main.js tidak akan menghapus progres pemain.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const AKAR = join(dirname(new URL(import.meta.url).pathname), '..', '..');
export const BERKAS_RAHASIA = join(AKAR, 'storage', 'chest-secret');
export const BERKAS_RUANG = join(AKAR, 'storage', 'chest-rooms.json');

export const UKURAN = 16;          // 4x4
export const JUMLAH_BOM = 3;
export const MAKS_PEMAIN = 12;
export const MAKS_LOG = 10;
const UMUR_TOKEN_MS = 7 * 24 * 3600 * 1000;   // progres harus tahan seminggu
const UMUR_RUANG_MS = 30 * 24 * 3600 * 1000;  // ruang mati dibuang sebulan

/* ══════════════════ rahasia & token ══════════════════ */

/**
 * Rahasia HMAC. Dibuat sekali lalu dipakai ulang; disimpan di storage/
 * supaya tidak pernah masuk git. Dibaca oleh dua proses (web + bot), jadi
 * bot bisa menandatangani token tanpa perlu endpoint pencetak token publik
 * — kalau endpoint itu ada, siapa pun bisa bikin ruang sembarangan.
 */
export function rahasia() {
  try {
    if (existsSync(BERKAS_RAHASIA)) {
      const isi = readFileSync(BERKAS_RAHASIA, 'utf8').trim();
      if (isi.length >= 32) return isi;
    }
  } catch { /* jatuh ke pembuatan baru */ }
  const baru = randomBytes(32).toString('hex');
  try {
    mkdirSync(dirname(BERKAS_RAHASIA), { recursive: true });
    writeFileSync(BERKAS_RAHASIA, baru, { mode: 0o600 });
  } catch { /* kalau gagal tulis, token jadi berumur seproses — tetap jalan */ }
  return baru;
}

const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/** id ruang dari jid grup — deterministik, jadi grup yang sama selalu dapat ruang yang sama. */
export function idRuang(jid) {
  return createHmac('sha256', rahasia()).update('ruang:' + String(jid)).digest('hex').slice(0, 16);
}

export function buatToken(jid, umurMs = UMUR_TOKEN_MS) {
  const isi = b64u(JSON.stringify({ r: idRuang(jid), exp: Date.now() + umurMs }));
  const tanda = b64u(createHmac('sha256', rahasia()).update(isi).digest());
  return isi + '.' + tanda;
}

/** @returns {{ok:true, ruang:string} | {ok:false, alasan:string}} */
export function bacaToken(token) {
  const bagian = String(token || '').split('.');
  if (bagian.length !== 2) return { ok: false, alasan: 'bentuk token salah' };
  const harus = b64u(createHmac('sha256', rahasia()).update(bagian[0]).digest());
  const a = Buffer.from(bagian[1]);
  const b = Buffer.from(harus);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, alasan: 'tanda tangan tidak cocok' };
  let data;
  try { data = JSON.parse(deB64u(bagian[0]).toString('utf8')); } catch { return { ok: false, alasan: 'isi token rusak' }; }
  if (!data?.r) return { ok: false, alasan: 'token tanpa ruang' };
  if (!data.exp || Date.now() > data.exp) return { ok: false, alasan: 'token kedaluwarsa' };
  return { ok: true, ruang: String(data.r) };
}

/* ══════════════════ nama pemain ══════════════════ */

/**
 * Nama dirender ke HTML, jadi dibersihkan di SATU tempat: di sini, sebelum
 * disimpan. Membersihkan saat render saja berisiko — cukup satu jalur render
 * yang lupa meng-escape dan papan skor jadi lubang XSS.
 */
export function namaAman(n) {
  return String(n ?? '')
    .replace(/[<>&"'`\\]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14);
}

/* ══════════════════ papan ══════════════════ */

export function papanBaru(rng = Math.random) {
  const p = [];
  for (let i = 0; i < UKURAN; i++) {
    p.push({ bom: false, nilai: 10 + Math.floor(rng() * 81), buka: false, oleh: null });
  }
  let taruh = 0;
  while (taruh < JUMLAH_BOM) {
    const k = Math.floor(rng() * UKURAN);
    if (!p[k].bom) { p[k].bom = true; taruh++; }
  }
  return p;
}

export const sisaAman = (papan) => papan.filter((x) => !x.buka && !x.bom).length;

export function ruangBaru() {
  const t = Date.now();
  return { dibuat: t, diubah: t, ronde: 1, papan: papanBaru(), pemain: [], giliran: 0, log: [], seq: 1 };
}

/* ══════════════════ muat & simpan ══════════════════ */

export function muat() {
  try {
    const d = JSON.parse(readFileSync(BERKAS_RUANG, 'utf8'));
    if (d && typeof d === 'object' && d.ruang) return d;
  } catch { /* berkas belum ada atau rusak → mulai bersih */ }
  return { versi: 1, ruang: {} };
}

/** Tulis atomik: tulis ke berkas sebelah lalu rename, supaya tidak pernah ada JSON separuh. */
export function simpan(db) {
  try {
    mkdirSync(dirname(BERKAS_RUANG), { recursive: true });
    const sementara = BERKAS_RUANG + '.tmp';
    writeFileSync(sementara, JSON.stringify(db));
    renameSync(sementara, BERKAS_RUANG);
    return true;
  } catch {
    return false;
  }
}

export function buangRuangMati(db, sekarang = Date.now()) {
  let dibuang = 0;
  for (const [id, r] of Object.entries(db.ruang)) {
    if (sekarang - (r.diubah || 0) > UMUR_RUANG_MS) { delete db.ruang[id]; dibuang++; }
  }
  return dibuang;
}

function ambil(db, idR) {
  if (!db.ruang[idR]) db.ruang[idR] = ruangBaru();
  return db.ruang[idR];
}

function catat(r, teks) {
  r.log.unshift({ t: Date.now(), teks: String(teks).slice(0, 90) });
  if (r.log.length > MAKS_LOG) r.log.length = MAKS_LOG;
}

const majuGiliran = (r) => { if (r.pemain.length) r.giliran = (r.giliran + 1) % r.pemain.length; };
const cariPemain = (r, nama) => r.pemain.findIndex((p) => p.nama === nama);

/* ══════════════════ aksi ══════════════════ */

export function gabung(db, idR, namaMentah) {
  const r = ambil(db, idR);
  const nama = namaAman(namaMentah);
  if (nama.length < 2) return { ok: false, alasan: 'nama minimal 2 huruf' };
  let i = cariPemain(r, nama);
  if (i < 0) {
    if (r.pemain.length >= MAKS_PEMAIN) return { ok: false, alasan: 'ruang penuh' };
    r.pemain.push({ nama, total: 0, bank: 0 });
    i = r.pemain.length - 1;
    catat(r, nama + ' masuk ruang');
    r.seq++; r.diubah = Date.now();
  }
  return { ok: true, nama, indeks: i, kembali: true };
}

export function buka(db, idR, namaMentah, indeksPeti) {
  const r = ambil(db, idR);
  const nama = namaAman(namaMentah);
  const iP = cariPemain(r, nama);
  if (iP < 0) return { ok: false, alasan: 'kamu belum gabung' };
  if (r.pemain.length > 1 && iP !== r.giliran) {
    return { ok: false, alasan: 'bukan giliran kamu — sekarang ' + r.pemain[r.giliran].nama };
  }
  const i = Number(indeksPeti);
  if (!Number.isInteger(i) || i < 0 || i >= UKURAN) return { ok: false, alasan: 'peti tidak ada' };
  const s = r.papan[i];
  if (s.buka) return { ok: false, alasan: 'peti itu sudah dibuka' };

  const pemain = r.pemain[iP];
  s.buka = true;
  s.oleh = nama;
  let jenis;

  if (s.bom) {
    jenis = 'bom';
    const hangus = pemain.bank;
    pemain.bank = 0;
    catat(r, '💥 ' + nama + ' kena bom, ' + hangus + ' koin hangus');
    majuGiliran(r);
  } else {
    pemain.bank += s.nilai;
    jenis = 'koin';
    catat(r, '💰 ' + nama + ' +' + s.nilai + ' koin');
    if (sisaAman(r.papan) === 0) {
      // Papan bersih: koin di tangan otomatis diamankan, papan diganti,
      // giliran pindah supaya ronde baru tidak selalu dimulai orang yang sama.
      pemain.total += pemain.bank;
      catat(r, '🏆 papan bersih — ' + nama + ' amankan ' + pemain.bank + ' koin');
      pemain.bank = 0;
      r.ronde++;
      r.papan = papanBaru();
      majuGiliran(r);
      jenis = 'bersih';
    }
  }
  r.seq++; r.diubah = Date.now();
  return { ok: true, jenis, nilai: s.bom ? 0 : s.nilai };
}

export function amankan(db, idR, namaMentah) {
  const r = ambil(db, idR);
  const nama = namaAman(namaMentah);
  const iP = cariPemain(r, nama);
  if (iP < 0) return { ok: false, alasan: 'kamu belum gabung' };
  if (r.pemain.length > 1 && iP !== r.giliran) return { ok: false, alasan: 'bukan giliran kamu' };
  const pemain = r.pemain[iP];
  if (pemain.bank <= 0) return { ok: false, alasan: 'belum ada koin buat diamankan' };
  const jml = pemain.bank;
  pemain.total += jml;
  pemain.bank = 0;
  catat(r, '✅ ' + nama + ' amankan ' + jml + ' koin');
  majuGiliran(r);
  r.seq++; r.diubah = Date.now();
  return { ok: true, diamankan: jml, total: pemain.total };
}

/** Lewat giliran — jalan keluar kalau pemain yang sedang giliran kabur. */
export function lewat(db, idR, namaMentah) {
  const r = ambil(db, idR);
  const nama = namaAman(namaMentah);
  if (r.pemain.length < 2) return { ok: false, alasan: 'belum ada pemain lain' };
  const skrg = r.pemain[r.giliran];
  if (skrg.bank > 0) { skrg.total += skrg.bank; skrg.bank = 0; }
  catat(r, '⏭ giliran ' + skrg.nama + ' dilewat oleh ' + nama);
  majuGiliran(r);
  r.seq++; r.diubah = Date.now();
  return { ok: true, giliran: r.pemain[r.giliran].nama };
}

/**
 * Pandangan untuk klien. Isi peti yang belum dibuka TIDAK pernah dikirim —
 * kalau dikirim, siapa pun bisa membuka DevTools dan melihat letak bom.
 */
export function pandangan(db, idR, namaMentah) {
  const r = ambil(db, idR);
  const nama = namaAman(namaMentah);
  const iP = cariPemain(r, nama);
  return {
    ok: true,
    seq: r.seq,
    ronde: r.ronde,
    papan: r.papan.map((s) => (s.buka
      ? { buka: true, bom: s.bom, nilai: s.bom ? 0 : s.nilai, oleh: s.oleh }
      : { buka: false })),
    pemain: r.pemain.map((p, i) => ({ nama: p.nama, total: p.total, bank: p.bank, giliran: i === r.giliran })),
    giliran: r.pemain[r.giliran]?.nama || null,
    akuGiliran: iP >= 0 && (r.pemain.length < 2 || iP === r.giliran),
    aku: iP >= 0 ? { nama, total: r.pemain[iP].total, bank: r.pemain[iP].bank } : null,
    sisaAman: sisaAman(r.papan),
    log: r.log.slice(0, 6),
  };
}
