/**
 * UJI SILANG MESIN: klien (di dalam arena-web/index.html) vs server (hillz-arena.js).
 *
 * Kalau dua mesin ini beda satu langkah saja, skor di layar tidak akan pernah
 * cocok dengan skor server dan SEMUA pengiriman skor gagal. Jadi ini uji
 * paling penting di seluruh fitur.
 *
 * Cara: ambil fungsi mesin dari HTML apa adanya (tanpa menyalin ulang), jalankan
 * di Node, lalu bandingkan dengan modul server memakai seed & langkah acak.
 */
import { readFileSync } from 'fs';
import { putarUlang, papanBaru, geser as geserServer, adaLangkah as adaServer, ubinTertinggi } from './hillz-arena.js';

const html = readFileSync(new URL('../../arena-web/index.html', import.meta.url), 'utf8');

/* Ambil blok <script> lalu potong bagian yang butuh DOM. Yang dibutuhkan hanya
   rngBaru, tumbuh, jalur, geser, adaLangkah. */
function ambil(nama, awal) {
  const i = html.indexOf(awal);
  if (i < 0) throw new Error('tidak ketemu di HTML: ' + nama);
  // hitung kurung kurawal sampai seimbang
  let mulai = html.indexOf('{', i), dalam = 0, j = mulai;
  for (; j < html.length; j++) {
    if (html[j] === '{') dalam++;
    else if (html[j] === '}') { dalam--; if (dalam === 0) break; }
  }
  return html.slice(i, j + 1);
}

const kode = [
  ambil('rngBaru', 'function rngBaru(seed)'),
  'var ATAS=0, KANAN=1, BAWAH=2, KIRI=3;',
  ambil('tumbuh', 'function tumbuh(st, tandai)'),
  ambil('jalur', 'function jalur(arah,k)'),
  ambil('geser', 'function geser(st,arah)'),
  ambil('adaLangkah', 'function adaLangkah(st)'),
  'return { rngBaru:rngBaru, tumbuh:tumbuh, geser:geser, adaLangkah:adaLangkah };',
].join('\n');

const klien = new Function(kode)();

console.log('Kode mesin diambil dari HTML: ' + kode.length + ' char');

let lulus = 0, gagal = 0;
function cek(nama, dapat, harus) {
  const ok = JSON.stringify(dapat) === JSON.stringify(harus);
  if (ok) { lulus++; console.log('  LULUS ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + '\n    dapat: ' + JSON.stringify(dapat) + '\n    harus: ' + JSON.stringify(harus)); }
}

/* ── 1. RNG identik ── */
{
  const a = klien.rngBaru(123456789), b = (await import('./hillz-arena.js')).rngBaru(123456789);
  const ka = [], kb = [];
  for (let i = 0; i < 500; i++) { ka.push(a()); kb.push(b()); }
  cek('RNG 500 angka identik (seed 123456789)', ka, kb);
}

/* ── 2. Papan awal identik untuk 300 seed ── */
{
  let beda = 0;
  for (let s = 0; s < 300; s++) {
    const seed = (s * 2654435761) >>> 0;
    const kl = { p: new Array(16).fill(0), skor: 0, rng: klien.rngBaru(seed), langkah: [], selesai: false };
    klien.tumbuh(kl); klien.tumbuh(kl);
    const sv = papanBaru(seed);
    if (JSON.stringify(kl.p) !== JSON.stringify(sv.p)) beda++;
  }
  cek('300 papan awal identik', beda, 0);
}

/* ── 3. Main penuh acak: skor & papan akhir wajib identik ── */
{
  let bedaSkor = 0, bedaPapan = 0, bedaSelesai = 0, totalLangkah = 0, skorMaks = 0, ubinMaks = 0;
  for (let putaran = 0; putaran < 120; putaran++) {
    const seed = (Math.random() * 4294967296) >>> 0;
    const acak = klien.rngBaru((seed ^ 0x9e3779b9) >>> 0);

    const kl = { p: new Array(16).fill(0), skor: 0, rng: klien.rngBaru(seed), langkah: [], selesai: false };
    klien.tumbuh(kl); klien.tumbuh(kl);

    const urut = [];
    let putus = 0;
    while (!kl.selesai && urut.length < 3000 && putus < 40) {
      const arah = Math.floor(acak() * 4);
      const h = klien.geser(kl, arah);
      if (h.pindah) { urut.push(arah); putus = 0; } else putus++;
    }
    totalLangkah += urut.length;
    if (kl.skor > skorMaks) skorMaks = kl.skor;

    const sv = putarUlang(seed, urut);
    if (!sv.ok) { bedaSkor++; console.log('    putarUlang menolak: ' + sv.alasan); continue; }
    if (sv.skor !== kl.skor) bedaSkor++;
    if (JSON.stringify(sv.papan) !== JSON.stringify(kl.p)) bedaPapan++;
    if (sv.selesai !== kl.selesai) bedaSelesai++;
    if (sv.ubin > ubinMaks) ubinMaks = sv.ubin;
  }
  cek('120 permainan penuh: skor server = skor klien', bedaSkor, 0);
  cek('120 permainan penuh: papan akhir identik', bedaPapan, 0);
  cek('120 permainan penuh: status selesai identik', bedaSelesai, 0);
  console.log('  (info) total ' + totalLangkah + ' langkah, skor tertinggi ' + skorMaks + ', ubin tertinggi ' + ubinMaks);
}

/* ── 4. Langkah palsu ditolak ── */
{
  const seed = 42;
  const kl = { p: new Array(16).fill(0), skor: 0, rng: klien.rngBaru(seed), langkah: [], selesai: false };
  klien.tumbuh(kl); klien.tumbuh(kl);
  const urut = [];
  for (let i = 0; i < 30; i++) { const a = i % 4; if (klien.geser(kl, a).pindah) urut.push(a); }

  cek('langkah asli diterima', putarUlang(seed, urut).ok, true);
  cek('arah 9 ditolak', putarUlang(seed, urut.concat([9])).ok, false);
  cek('arah desimal ditolak', putarUlang(seed, urut.concat([1.5])).ok, false);
  cek('bukan array ditolak', putarUlang(seed, 'AAAA').ok, false);
  cek('20001 langkah ditolak', putarUlang(seed, new Array(20001).fill(0)).ok, false);

  // seed beda -> skor beda (bukti skor benar-benar terikat seed)
  const lain = putarUlang((seed + 1) >>> 0, urut);
  cek('seed lain menghasilkan skor lain', lain.ok && lain.skor !== putarUlang(seed, urut).skor, true);
}

console.log('\n────────────────────────────────');
console.log(gagal === 0 ? '✓ SEMUA ' + lulus + ' UJI SILANG LULUS' : '✗ ' + gagal + ' GAGAL dari ' + (lulus + gagal));
process.exit(gagal === 0 ? 0 : 1);
