/**
 * ARENA — mesin game 2048 + verifikasi skor sisi server.
 *
 * Dipakai DUA proses:
 *   - web-uploader.js  : memutar ulang langkah pemain untuk menghitung skor
 *                        yang sah (klien tidak bisa mengarang skor)
 *   - plugins/game/*   : membaca papan skor untuk perintah WA
 *
 * Tanpa dependensi. Murni fungsi, jadi bisa diuji tanpa jaringan.
 *
 * Kunci anti-curang: skor TIDAK PERNAH dikirim klien. Server memberi `seed`,
 * klien mengirim urutan langkah, server memutar ulang dengan seed yang sama
 * dan menghitung skornya sendiri. Angka apa pun dari klien diabaikan.
 */

import { createHmac, randomBytes } from 'crypto';
import { readFileSync, writeFileSync, renameSync, existsSync, openSync, writeSync, closeSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Berkas papan skor. SATU penulis: web-uploader.js. Bot hanya membaca. */
export const BERKAS_SKOR = process.env.ARENA_SCORES || join(AKAR, 'arena-scores.json');

/**
 * Rahasia bersama untuk tanda tangan. Dua proses bisa memanggil ini
 * bersamaan saat pertama kali, jadi pembuatannya pakai flag 'wx'
 * (buat-hanya-jika-belum-ada): satu proses menang, yang lain membaca hasilnya.
 * Tanpa itu, dua proses bisa menulis rahasia berbeda dan semua token gugur.
 *
 * Letak berkas dibaca SAAT DIPANGGIL, bukan saat modul dimuat: kalau tidak,
 * pemanggil yang mengatur ARENA_SECRET_FILE setelah `import` akan diam-diam
 * memakai berkas produksi (ini pernah terjadi dan lolos sampai uji hidup).
 */
let _rahasia = null;
export function rahasiaArena() {
  if (_rahasia) return _rahasia;
  if (process.env.ARENA_SECRET) { _rahasia = process.env.ARENA_SECRET; return _rahasia; }
  const berkas = process.env.ARENA_SECRET_FILE || join(AKAR, 'arena-secret');
  try {
    const fd = openSync(berkas, 'wx', 0o600);
    const baru = randomBytes(32).toString('hex');
    writeSync(fd, baru);
    closeSync(fd);
    _rahasia = baru;
  } catch {
    try { _rahasia = readFileSync(berkas, 'utf8').trim(); } catch { _rahasia = ''; }
  }
  if (!_rahasia) throw new Error('rahasia arena tidak bisa dibuat/dibaca di ' + berkas);
  return _rahasia;
}

/* ═══════════════════ RNG deterministik (mulberry32) ═══════════════════ */
/** Seed sama -> urutan angka sama, di proses mana pun. Itu dasar replay. */
export function rngBaru(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ═══════════════════ Aturan 2048 ═══════════════════ */
export const ARAH = { ATAS: 0, KANAN: 1, BAWAH: 2, KIRI: 3 };

export function papanBaru(seed) {
  const st = { p: new Array(16).fill(0), skor: 0, seed: seed >>> 0, rng: rngBaru(seed), langkah: 0, selesai: false };
  tumbuh(st);
  tumbuh(st);
  return st;
}

/** Munculkan satu angka baru di kotak kosong: 2 (90%) atau 4 (10%). */
export function tumbuh(st) {
  const kosong = [];
  for (let i = 0; i < 16; i++) if (st.p[i] === 0) kosong.push(i);
  if (!kosong.length) return false;
  const idx = kosong[Math.floor(st.rng() * kosong.length)];
  st.p[idx] = st.rng() < 0.9 ? 2 : 4;
  return true;
}

/** Indeks satu baris/kolom sesuai arah geser. */
function jalur(arah, k) {
  const out = [];
  for (let i = 0; i < 4; i++) {
    if (arah === ARAH.KIRI) out.push(k * 4 + i);
    else if (arah === ARAH.KANAN) out.push(k * 4 + (3 - i));
    else if (arah === ARAH.ATAS) out.push(i * 4 + k);
    else out.push((3 - i) * 4 + k);
  }
  return out;
}

/**
 * Geser + gabung. Mengembalikan { pindah, dapat }.
 * `dapat` = jumlah nilai hasil penggabungan = tambahan skor.
 */
export function geser(st, arah) {
  let pindah = false, dapat = 0;
  for (let k = 0; k < 4; k++) {
    const idx = jalur(arah, k);
    const nilai = idx.map((i) => st.p[i]).filter((v) => v !== 0);
    const hasil = [];
    for (let i = 0; i < nilai.length; i++) {
      if (i + 1 < nilai.length && nilai[i] === nilai[i + 1]) {
        const gabung = nilai[i] * 2;
        hasil.push(gabung);
        dapat += gabung;
        i++;
      } else hasil.push(nilai[i]);
    }
    while (hasil.length < 4) hasil.push(0);
    for (let i = 0; i < 4; i++) {
      if (st.p[idx[i]] !== hasil[i]) pindah = true;
      st.p[idx[i]] = hasil[i];
    }
  }
  if (pindah) {
    st.skor += dapat;
    st.langkah++;
    tumbuh(st);
    st.selesai = !adaLangkah(st);
  }
  return { pindah, dapat };
}

export function adaLangkah(st) {
  for (let i = 0; i < 16; i++) {
    if (st.p[i] === 0) return true;
    const r = i >> 2, c = i & 3;
    if (c < 3 && st.p[i] === st.p[i + 1]) return true;
    if (r < 3 && st.p[i] === st.p[i + 4]) return true;
  }
  return false;
}

export function ubinTertinggi(st) {
  let m = 0;
  for (const v of st.p) if (v > m) m = v;
  return m;
}

/* ═══════════════════ Verifikasi replay ═══════════════════ */
export const MAKS_LANGKAH = 20000;

/**
 * Putar ulang urutan langkah dari seed. Ini SATU-SATUNYA sumber skor yang sah.
 * Langkah yang tidak mengubah papan dianggap tidak sah (klien nakal / bug).
 */
export function putarUlang(seed, langkah) {
  if (!Array.isArray(langkah)) return { ok: false, alasan: 'langkah bukan array' };
  if (langkah.length > MAKS_LANGKAH) return { ok: false, alasan: 'langkah kebanyakan (maks ' + MAKS_LANGKAH + ')' };
  const st = papanBaru(seed);
  let ditolak = 0;
  for (let i = 0; i < langkah.length; i++) {
    const a = langkah[i];
    if (!Number.isInteger(a) || a < 0 || a > 3) return { ok: false, alasan: 'arah tidak sah di langkah ke-' + (i + 1) };
    if (st.selesai) return { ok: false, alasan: 'ada langkah setelah game selesai (ke-' + (i + 1) + ')' };
    const { pindah } = geser(st, a);
    if (!pindah) ditolak++;
  }
  return {
    ok: true,
    skor: st.skor,
    langkahSah: st.langkah,
    langkahKosong: ditolak,
    ubin: ubinTertinggi(st),
    selesai: st.selesai,
    papan: st.p.slice(),
  };
}

/* ═══════════════════ Tanda tangan HMAC (tanpa penyimpanan bersama) ═══════════════════ */
/**
 * Bot dan web-uploader itu DUA proses. Menyimpan token di file berarti dua
 * penulis untuk satu file. Dihindari: semua yang perlu dipercaya
 * ditandatangani HMAC, jadi penerima cukup memverifikasi tanda tangannya.
 */
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function dariB64url(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Bungkus objek jadi "isi.tanda". Kunci `e` (kedaluwarsa) diperiksa saat dibaca. */
export function tandaTangan(rahasia, obj) {
  const badan = b64url(JSON.stringify(obj));
  const tag = b64url(createHmac('sha256', rahasia).update(badan).digest()).slice(0, 27);
  return badan + '.' + tag;
}

/** Balikan: objek asli, atau null kalau tanda tangan salah / sudah kedaluwarsa. */
export function bacaTanda(rahasia, s) {
  if (typeof s !== 'string' || s.length > 600) return null;
  const bagi = s.split('.');
  if (bagi.length !== 2) return null;
  const [badan, tag] = bagi;
  const benar = b64url(createHmac('sha256', rahasia).update(badan).digest()).slice(0, 27);
  if (tag.length !== benar.length) return null;
  let beda = 0; // banding waktu-tetap sederhana
  for (let i = 0; i < benar.length; i++) beda |= tag.charCodeAt(i) ^ benar.charCodeAt(i);
  if (beda !== 0) return null;
  try {
    const o = JSON.parse(dariB64url(badan).toString('utf8'));
    if (!o || typeof o !== 'object') return null;
    if (o.e && Date.now() > o.e) return null;
    return o;
  } catch { return null; }
}

/* ═══════════════════ Token pemain WA ═══════════════════ */
export function buatToken(rahasia, jid, nama, umurMs = 30 * 60 * 1000) {
  return tandaTangan(rahasia, { j: jid, n: String(nama || '').slice(0, 40), e: Date.now() + umurMs });
}

export function bacaToken(rahasia, token) {
  const o = bacaTanda(rahasia, token);
  if (!o || !o.j || !o.e) return null;
  return { jid: o.j, nama: o.n || '', kedaluwarsa: o.e };
}

/* ═══════════════════ Sesi permainan (stateless) ═══════════════════ */
/**
 * Sesi ikut ditandatangani, bukan disimpan di memori: web-uploader kadang
 * restart, dan sesi yang hilang berarti skor pemain hangus. Dengan tanda
 * tangan, sesi tetap sah setelah restart.
 */
export function sesiBaru(rahasia, jid, nama, umurMs = 3 * 60 * 60 * 1000) {
  const seed = seedBaru();
  return {
    seed,
    sesi: tandaTangan(rahasia, { s: seed, j: jid || '', n: String(nama || '').slice(0, 40), i: idBaru(), e: Date.now() + umurMs }),
  };
}

export function bacaSesi(rahasia, sesi) {
  const o = bacaTanda(rahasia, sesi);
  if (!o || typeof o.s !== 'number' || !o.i) return null;
  return { seed: o.s >>> 0, jid: o.j || '', nama: o.n || '', id: o.i, kedaluwarsa: o.e };
}

export function seedBaru() {
  return randomBytes(4).readUInt32BE(0);
}

export function idBaru() {
  return randomBytes(9).toString('hex');
}

/* ═══════════════════ Papan skor ═══════════════════ */
/** Ambil skor terbaik per pemain, urut menurun. */
export function papanSkor(daftar, batas = 10) {
  const terbaik = new Map();
  for (const s of daftar || []) {
    if (!s || !s.jid) continue;
    const ada = terbaik.get(s.jid);
    if (!ada || s.skor > ada.skor) terbaik.set(s.jid, s);
  }
  return [...terbaik.values()].sort((a, b) => b.skor - a.skor || a.waktu - b.waktu).slice(0, batas);
}

export function peringkat(daftar, jid) {
  const urut = papanSkor(daftar, 9999);
  const i = urut.findIndex((s) => s.jid === jid);
  return i < 0 ? null : { posisi: i + 1, dari: urut.length, skor: urut[i].skor };
}

/* ═══════════════════ Penyimpanan skor ═══════════════════ */
/**
 * SATU penulis saja: web-uploader.js. Bot hanya MEMBACA.
 * Dua proses menulis satu file = kehilangan data; ini dihindari sejak awal.
 * Tulis atomik: file sementara lalu rename (rename di filesystem sama = atomik).
 */
export const BATAS_SKOR = 2000;

export function bacaSkor(berkas) {
  try {
    if (!existsSync(berkas)) return [];
    const d = JSON.parse(readFileSync(berkas, 'utf8'));
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

export function tulisSkor(berkas, daftar) {
  const potong = daftar.slice(0, BATAS_SKOR);
  const sementara = berkas + '.tmp';
  writeFileSync(sementara, JSON.stringify(potong), 'utf8');
  renameSync(sementara, berkas);
}

export function tambahSkor(berkas, entri) {
  const daftar = bacaSkor(berkas);
  daftar.unshift(entri);
  tulisSkor(berkas, daftar);
  return daftar;
}
