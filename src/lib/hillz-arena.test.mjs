/**
 * Uji mesin ARENA — tanpa jaringan, tanpa WA.
 * Jalankan: node /root/shirowahd/src/lib/hillz-arena.test.mjs
 */
import {
  rngBaru, papanBaru, geser, adaLangkah, ubinTertinggi, putarUlang,
  buatToken, bacaToken, papanSkor, peringkat, seedBaru, idBaru, ARAH, MAKS_LANGKAH,
  bacaSkor, tulisSkor, tambahSkor, BATAS_SKOR,
} from './hillz-arena.js';
import { unlinkSync, existsSync, writeFileSync } from 'fs';

let lulus = 0, gagal = 0;
function cek(nama, dapat, harus) {
  const ok = JSON.stringify(dapat) === JSON.stringify(harus);
  if (ok) { lulus++; console.log('  LULUS ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + '\n         dapat: ' + JSON.stringify(dapat) + '\n         harus: ' + JSON.stringify(harus)); }
}
function cekBenar(nama, v) { cek(nama, !!v, true); }

console.log('\n══ RNG deterministik ══');
const r1 = rngBaru(12345), r2 = rngBaru(12345);
cek('seed sama -> 5 angka sama', [r1(), r1(), r1(), r1(), r1()], [r2(), r2(), r2(), r2(), r2()]);
const r3 = rngBaru(999);
cekBenar('seed beda -> angka beda', rngBaru(12345)() !== r3());
const rr = rngBaru(7);
let dalamRentang = true;
for (let i = 0; i < 5000; i++) { const v = rr(); if (v < 0 || v >= 1) dalamRentang = false; }
cekBenar('5000 angka selalu di [0,1)', dalamRentang);

console.log('\n══ Papan awal ══');
const st = papanBaru(42);
cek('16 kotak', st.p.length, 16);
cek('2 kotak terisi di awal', st.p.filter((v) => v !== 0).length, 2);
cekBenar('nilai awal 2 atau 4', st.p.filter((v) => v !== 0).every((v) => v === 2 || v === 4));
cek('skor awal 0', st.skor, 0);
const st2 = papanBaru(42);
cek('papan awal deterministik', st2.p, st.p);

console.log('\n══ Aturan geser & gabung ══');
function buat(p, skor = 0) { const s = papanBaru(1); s.p = p.slice(); s.skor = skor; s.rng = rngBaru(1); return s; }

let s = buat([2,2,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]);
let h = geser(s, ARAH.KIRI);
cek('2+2 kiri -> dapat 4', h.dapat, 4);
cek('hasil di kotak 0 = 4', s.p[0], 4);
cek('skor jadi 4', s.skor, 4);

s = buat([2,2,2,2, 0,0,0,0, 0,0,0,0, 0,0,0,0]);
h = geser(s, ARAH.KIRI);
cek('2,2,2,2 kiri -> dua pasang = 8', h.dapat, 8);
cek('baris jadi 4,4', [s.p[0], s.p[1]], [4, 4]);

s = buat([4,4,8,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]);
h = geser(s, ARAH.KIRI);
cek('4,4,8 -> 8,8 tapi TIDAK berantai jadi 16', [s.p[0], s.p[1]], [8, 8]);
cek('dapat hanya 8 (bukan 24)', h.dapat, 8);

s = buat([2,0,0,0, 2,0,0,0, 0,0,0,0, 0,0,0,0]);
h = geser(s, ARAH.ATAS);
cek('gabung vertikal ke atas', s.p[0], 4);

s = buat([0,0,0,2, 0,0,0,2, 0,0,0,0, 0,0,0,0]);
geser(s, ARAH.BAWAH);
cek('gabung vertikal ke bawah (kolom 3)', s.p[15], 4);

s = buat([2,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]);
h = geser(s, ARAH.KIRI);
cek('geser mentok kiri -> tidak pindah', h.pindah, false);
cek('langkah tidak bertambah', s.langkah, 0);

s = buat([2,4,2,4, 4,2,4,2, 2,4,2,4, 4,2,4,2]);
h = geser(s, ARAH.KIRI);
cek('papan penuh tanpa pasangan -> tidak pindah', h.pindah, false);
cekBenar('adaLangkah = false (mati)', !adaLangkah(s));

s = buat([2,2,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]);
geser(s, ARAH.KIRI);
cek('setelah pindah, kotak terisi 2 (1 gabungan + 1 tumbuh)', s.p.filter((v) => v !== 0).length, 2);

console.log('\n══ Ubin tertinggi ══');
cek('ubinTertinggi', ubinTertinggi(buat([2,4,1024,8, 0,0,0,0, 0,0,0,0, 0,0,0,0])), 1024);

console.log('\n══ Replay: sumber skor yang sah ══');
const seed = 987654;
const langkah = [];
const main = papanBaru(seed);
for (let i = 0; i < 300 && !main.selesai; i++) {
  const a = i % 4;
  const before = main.p.join(',');
  geser(main, a);
  if (main.p.join(',') !== before) langkah.push(a);
}
const ulang = putarUlang(seed, langkah);
cekBenar('replay ok', ulang.ok);
cek('skor replay == skor asli', ulang.skor, main.skor);
cek('ubin replay == ubin asli', ulang.ubin, ubinTertinggi(main));
cek('papan replay == papan asli', ulang.papan, main.p);

const ulang2 = putarUlang(seed, langkah);
cek('replay dua kali -> skor sama', ulang2.skor, ulang.skor);
cekBenar('seed beda -> skor beda', putarUlang(seed + 1, langkah).skor !== ulang.skor);

console.log('\n══ Replay menolak curang ══');
cek('arah 9 ditolak', putarUlang(seed, [0, 1, 9]).ok, false);
cek('arah -1 ditolak', putarUlang(seed, [-1]).ok, false);
cek('arah pecahan ditolak', putarUlang(seed, [1.5]).ok, false);
cek('bukan array ditolak', putarUlang(seed, 'kiri').ok, false);
cek('langkah > MAKS ditolak', putarUlang(seed, new Array(MAKS_LANGKAH + 1).fill(0)).ok, false);
cek('langkah kosong -> skor 0', putarUlang(seed, []).skor, 0);
const palsu = putarUlang(seed, langkah);
cekBenar('skor tidak bisa dititipkan klien (hasil murni hitung server)', palsu.skor === main.skor);

console.log('\n══ Token WA (HMAC) ══');
const RAHASIA = 'rahasia-uji-bukan-produksi';
const tok = buatToken(RAHASIA, '628123@s.whatsapp.net', 'SHIRO');
const baca = bacaToken(RAHASIA, tok);
cekBenar('token sah terbaca', !!baca);
cek('jid utuh', baca.jid, '628123@s.whatsapp.net');
cek('nama utuh', baca.nama, 'SHIRO');
cek('rahasia salah -> null', bacaToken('rahasia-lain', tok), null);
cek('tanda tangan diubah -> null', bacaToken(RAHASIA, tok.slice(0, -1) + (tok.slice(-1) === 'a' ? 'b' : 'a')), null);
cek('badan diubah -> null', bacaToken(RAHASIA, 'x' + tok.slice(1)), null);
cek('token asal -> null', bacaToken(RAHASIA, 'ngawur.ngawur'), null);
cek('tanpa titik -> null', bacaToken(RAHASIA, 'ngawur'), null);
cek('token kedaluwarsa -> null', bacaToken(RAHASIA, buatToken(RAHASIA, 'a@s.whatsapp.net', 'X', -1000)), null);
cekBenar('token panjangnya wajar (<200 char)', tok.length < 200);
cekBenar('dua token beda (waktu/nonce)', buatToken(RAHASIA, 'a@x', 'A') !== buatToken(RAHASIA, 'b@x', 'B'));

console.log('\n══ Papan skor ══');
const kirim = [
  { jid: 'a@x', nama: 'A', skor: 100, waktu: 1 },
  { jid: 'b@x', nama: 'B', skor: 500, waktu: 2 },
  { jid: 'a@x', nama: 'A', skor: 900, waktu: 3 },
  { jid: 'c@x', nama: 'C', skor: 500, waktu: 4 },
];
const top = papanSkor(kirim);
cek('hanya skor TERBAIK per pemain', top.length, 3);
cek('juara = A 900', [top[0].jid, top[0].skor], ['a@x', 900]);
cek('seri dimenangkan yang lebih dulu', top[1].jid, 'b@x');
cek('peringkat A = 1', peringkat(kirim, 'a@x').posisi, 1);
cek('peringkat C = 3', peringkat(kirim, 'c@x').posisi, 3);
cek('pemain tak ada -> null', peringkat(kirim, 'zz@x'), null);
cek('daftar kosong -> []', papanSkor([]), []);
cek('daftar null -> []', papanSkor(null), []);
cek('batas dihormati', papanSkor(kirim, 2).length, 2);

console.log('\n══ Seed & id ══');
const seeds = new Set();
for (let i = 0; i < 200; i++) seeds.add(seedBaru());
cekBenar('200 seed hampir semua unik (>190)', seeds.size > 190);
cekBenar('seed selalu uint32', [...seeds].every((v) => Number.isInteger(v) && v >= 0 && v <= 0xffffffff));
cekBenar('idBaru 18 hex char', /^[0-9a-f]{18}$/.test(idBaru()));
const ids = new Set();
for (let i = 0; i < 200; i++) ids.add(idBaru());
cek('200 id semua unik', ids.size, 200);

console.log('\n══ Penyimpanan skor (atomik) ══');
const BERKAS = '/tmp/_uji_skor_arena.json';
try { unlinkSync(BERKAS); } catch {}
cek('berkas belum ada -> []', bacaSkor(BERKAS), []);
tambahSkor(BERKAS, { jid: 'a@x', nama: 'A', skor: 10, waktu: 1 });
tambahSkor(BERKAS, { jid: 'b@x', nama: 'B', skor: 20, waktu: 2 });
cek('2 entri tersimpan', bacaSkor(BERKAS).length, 2);
cek('terbaru di depan', bacaSkor(BERKAS)[0].jid, 'b@x');
cekBenar('tidak ada file .tmp tertinggal', !existsSync(BERKAS + '.tmp'));
tulisSkor(BERKAS, new Array(BATAS_SKOR + 500).fill({ jid: 'c@x', skor: 1, waktu: 1 }));
cek('dipotong ke BATAS_SKOR', bacaSkor(BERKAS).length, BATAS_SKOR);
writeFileSync(BERKAS, 'bukan json{{{');
cek('JSON rusak -> [] (tidak melempar)', bacaSkor(BERKAS), []);
writeFileSync(BERKAS, '{"bukan":"array"}');
cek('bukan array -> []', bacaSkor(BERKAS), []);
try { unlinkSync(BERKAS); } catch {}

console.log('\n────────────────────────────────');
console.log(gagal === 0 ? `✓ SEMUA ${lulus} UJI LULUS` : `✗ ${gagal} GAGAL dari ${lulus + gagal}`);
process.exit(gagal === 0 ? 0 : 1);
