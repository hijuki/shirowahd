/**
 * Uji mesin CHEST — menjalankan logika sungguhan, bukan mengecek keberadaan fungsi.
 *
 * Fokus pada tiga keluhan yang jadi alasan mesin ini ditulis:
 *   1. multiplayer  → giliran, penolakan giliran orang lain, papan bersama
 *   2. persistensi  → state selamat walau modul dimuat ulang dari nol
 *   3. keamanan     → token palsu/kedaluwarsa ditolak, isi bom tidak bocor
 */
import { existsSync, unlinkSync } from 'fs';

const uji = [];
const cek = (nama, syarat) => uji.push({ nama, lulus: !!syarat });

// Berkas uji dipisah dari berkas produksi supaya progres nyata tidak tersentuh.
const ASLI = process.env.CHEST_TEST_FILE;
process.env.CHEST_TEST_FILE = '1';

const M = await import('./chest-server.js');
const BERKAS = M.BERKAS_RUANG;
const cadangan = existsSync(BERKAS) ? (await import('fs')).readFileSync(BERKAS, 'utf8') : null;

try {
  /* ── token ────────────────────────────────────────────────────── */
  const JID = '120363426052801497@g.us';
  const tok = M.buatToken(JID);
  const baca = M.bacaToken(tok);
  cek('token sah terbaca', baca.ok);
  cek('token → ruang deterministik', baca.ruang === M.idRuang(JID));
  cek('grup beda → ruang beda', M.idRuang(JID) !== M.idRuang('120363410151020360@g.us'));
  cek('token diubah ditolak', !M.bacaToken(tok.slice(0, -3) + 'zzz').ok);
  cek('token kosong ditolak', !M.bacaToken('').ok);
  cek('token asal ditolak', !M.bacaToken('halo.dunia').ok);
  cek('token kedaluwarsa ditolak', !M.bacaToken(M.buatToken(JID, -1000)).ok);

  /* ── nama ─────────────────────────────────────────────────────── */
  cek('tag HTML dibuang dari nama', M.namaAman('<img src=x onerror=alert(1)>').indexOf('<') < 0);
  cek('kutip dibuang dari nama', M.namaAman('a"b\'c`d').indexOf('"') < 0);
  cek('nama dipotong 14 huruf', M.namaAman('a'.repeat(50)).length === 14);

  /* ── papan ────────────────────────────────────────────────────── */
  const p = M.papanBaru();
  cek('papan 16 petak', p.length === 16);
  cek('bom tepat 3', p.filter((x) => x.bom).length === 3);
  cek('nilai koin 10-90', p.every((x) => x.nilai >= 10 && x.nilai <= 90));
  cek('semua tertutup di awal', p.every((x) => !x.buka));

  /* ── multiplayer: giliran ─────────────────────────────────────── */
  let db = { versi: 1, ruang: {} };
  const R = M.idRuang(JID);
  cek('pemain 1 gabung', M.gabung(db, R, 'Hillz').ok);
  cek('pemain 2 gabung', M.gabung(db, R, 'Rehan').ok);
  cek('gabung ulang tidak duplikat', M.gabung(db, R, 'Hillz').ok && db.ruang[R].pemain.length === 2);
  cek('nama 1 huruf ditolak', !M.gabung(db, R, 'x').ok);
  cek('orang asing tidak bisa buka', !M.buka(db, R, 'Bukan Pemain', 0).ok);

  const giliranAwal = db.ruang[R].pemain[db.ruang[R].giliran].nama;
  const bukanGiliran = giliranAwal === 'Hillz' ? 'Rehan' : 'Hillz';
  const tolak = M.buka(db, R, bukanGiliran, 0);
  cek('bukan giliran → ditolak', !tolak.ok && /giliran/i.test(tolak.alasan));

  // Cari petak aman untuk pemain yang sedang giliran.
  const idxAman = db.ruang[R].papan.findIndex((s) => !s.bom);
  const hasil = M.buka(db, R, giliranAwal, idxAman);
  cek('petak aman → koin masuk bank', hasil.ok && hasil.jenis === 'koin' && hasil.nilai > 0);
  cek('bank pemain naik tepat', db.ruang[R].pemain.find((x) => x.nama === giliranAwal).bank === hasil.nilai);
  cek('petak sama tidak bisa dibuka 2x', !M.buka(db, R, giliranAwal, idxAman).ok);
  cek('indeks di luar papan ditolak', !M.buka(db, R, giliranAwal, 99).ok);
  cek('indeks bukan angka ditolak', !M.buka(db, R, giliranAwal, 'abc').ok);

  /* ── amankan memindah bank ke total ───────────────────────────── */
  const seb = db.ruang[R].pemain.find((x) => x.nama === giliranAwal);
  const bankSeb = seb.bank;
  const am = M.amankan(db, R, giliranAwal);
  cek('amankan berhasil', am.ok && am.diamankan === bankSeb);
  cek('bank jadi 0 setelah amankan', seb.bank === 0);
  cek('total naik sejumlah bank', seb.total === bankSeb);
  cek('giliran pindah setelah amankan', db.ruang[R].pemain[db.ruang[R].giliran].nama !== giliranAwal);
  cek('amankan tanpa koin ditolak', !M.amankan(db, R, db.ruang[R].pemain[db.ruang[R].giliran].nama).ok);

  /* ── bom menghanguskan bank, bukan total ─────────────────────── */
  let db2 = { versi: 1, ruang: {} };
  M.gabung(db2, R, 'Solo');
  const r2 = db2.ruang[R];
  r2.pemain[0].total = 500;
  r2.pemain[0].bank = 77;
  const iBom = r2.papan.findIndex((s) => s.bom);
  const hb = M.buka(db2, R, 'Solo', iBom);
  cek('bom terdeteksi', hb.ok && hb.jenis === 'bom');
  cek('bom menghanguskan bank', r2.pemain[0].bank === 0);
  cek('bom TIDAK menyentuh total', r2.pemain[0].total === 500);

  /* ── papan bersih → ronde naik ────────────────────────────────── */
  let db3 = { versi: 1, ruang: {} };
  M.gabung(db3, R, 'Sapu');
  const r3 = db3.ruang[R];
  const rondeSeb = r3.ronde;
  let langkah = 0;
  // Berhenti TEPAT saat papan bersih. Kalau loop diteruskan, papan
  // pengganti ikut dibuka dan ronde naik dua kali — itu yang bikin uji
  // ini gagal sebelumnya, bukan mesinnya.
  while (langkah < 30) {
    const i = r3.papan.findIndex((s) => !s.buka && !s.bom);
    if (i < 0) break;
    const h = M.buka(db3, R, 'Sapu', i);
    langkah++;
    if (h.jenis === 'bersih') break;
  }
  cek('papan bersih → ronde naik', r3.ronde === rondeSeb + 1);
  cek('papan diganti baru', r3.papan.filter((s) => s.buka).length === 0);
  cek('koin ronde otomatis diamankan', r3.pemain[0].total > 0 && r3.pemain[0].bank === 0);

  /* ── lewat giliran ───────────────────────────────────────────── */
  cek('lewat butuh >1 pemain', !M.lewat(db3, R, 'Sapu').ok);
  M.gabung(db3, R, 'Dua');
  cek('lewat berhasil dengan 2 pemain', M.lewat(db3, R, 'Sapu').ok);

  /* ── pandangan tidak membocorkan bom ─────────────────────────── */
  const v = M.pandangan(db, R, 'Hillz');
  cek('pandangan punya seq', typeof v.seq === 'number');
  const tertutup = v.papan.filter((s) => !s.buka);
  cek('petak tertutup tidak bawa info bom', tertutup.every((s) => s.bom === undefined && s.nilai === undefined));
  cek('petak terbuka tetap terlihat', v.papan.some((s) => s.buka));
  cek('pandangan bawa daftar pemain', v.pemain.length === 2);
  cek('pandangan tandai giliran', v.pemain.filter((x) => x.giliran).length === 1);
  cek('pandangan orang luar: aku null', M.pandangan(db, R, 'Asing').aku === null);

  /* ── seq naik tiap perubahan (dasar polling) ─────────────────── */
  const seqSeb = db.ruang[R].seq;
  const gilNow = db.ruang[R].pemain[db.ruang[R].giliran].nama;
  const iA2 = db.ruang[R].papan.findIndex((s) => !s.buka && !s.bom);
  M.buka(db, R, gilNow, iA2);
  cek('seq naik setelah aksi', db.ruang[R].seq > seqSeb);
  cek('seq TIDAK naik saat cuma dilihat', M.pandangan(db, R, gilNow).seq === db.ruang[R].seq);

  /* ── PERSISTENSI: inti keluhan "progres ngulang" ─────────────── */
  cek('simpan ke disk', M.simpan(db));
  const dbMuat = M.muat();
  cek('muat kembali dapat ruang', !!dbMuat.ruang[R]);
  cek('total pemain selamat', dbMuat.ruang[R].pemain.find((x) => x.nama === 'Hillz').total ===
    db.ruang[R].pemain.find((x) => x.nama === 'Hillz').total);
  cek('ronde selamat', dbMuat.ruang[R].ronde === db.ruang[R].ronde);
  cek('petak terbuka selamat', dbMuat.ruang[R].papan.filter((s) => s.buka).length ===
    db.ruang[R].papan.filter((s) => s.buka).length);
  cek('giliran selamat', dbMuat.ruang[R].giliran === db.ruang[R].giliran);
  // Ini yang membuktikan keluhan teratasi: token dibuat ulang dari nol
  // (seperti bubble baru dibuka lagi) dan tetap menunjuk ruang yang sama.
  const tokBaru = M.buatToken(JID);
  cek('token baru → ruang lama (progres tidak ngulang)', M.bacaToken(tokBaru).ruang === R);

  /* ── ruang mati dibuang ──────────────────────────────────────── */
  const dbTua = { versi: 1, ruang: { lama: { diubah: Date.now() - 40 * 24 * 3600 * 1000, pemain: [] }, baru: { diubah: Date.now(), pemain: [] } } };
  M.buangRuangMati(dbTua);
  cek('ruang 40 hari dibuang', !dbTua.ruang.lama);
  cek('ruang baru dipertahankan', !!dbTua.ruang.baru);

  /* ── berkas rusak tidak membuat proses mati ──────────────────── */
  const fs = await import('fs');
  fs.writeFileSync(BERKAS, '{ini bukan json');
  const dbRusak = M.muat();
  cek('JSON rusak → mulai bersih, tidak crash', dbRusak && typeof dbRusak.ruang === 'object');
} finally {
  const fs = await import('fs');
  if (cadangan !== null) fs.writeFileSync(BERKAS, cadangan);
  else if (existsSync(BERKAS)) unlinkSync(BERKAS);
  if (ASLI === undefined) delete process.env.CHEST_TEST_FILE;
}

const gagal = uji.filter((u) => !u.lulus);
for (const u of uji) console.log((u.lulus ? '  ✓ ' : '  ✗ ') + u.nama);
console.log('\n' + (uji.length - gagal.length) + '/' + uji.length + ' uji lulus');
if (gagal.length) { console.log('GAGAL: ' + gagal.map((u) => u.nama).join(', ')); process.exit(1); }
