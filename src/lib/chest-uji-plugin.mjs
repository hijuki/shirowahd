/**
 * Uji plugin chestgame.js TANPA WhatsApp dan tanpa jaringan.
 *
 * Yang dibuktikan di sini, karena semuanya sudah pernah gagal di HP:
 *  1. bubble tidak mengandung SATU PUN pemanggil jaringan (fetch/XHR/img/
 *     <script src>) — sebab webview memblokir semuanya dan itu yang bikin
 *     "script timeout"
 *  2. semua interaksi memakai ATRIBUT onclick, bukan properti el.onclick
 *     (properti terbukti mati di bubble)
 *  3. clipboard lama (execCommand) didahulukan di atas navigator.clipboard,
 *     karena probe P1 gagal dan P2 berhasil di HP user
 *  4. state benar-benar selamat di disk lintas pemanggilan berbeda
 *     (inilah "progres ngulang waktu grup ditutup")
 *  5. giliran ditegakkan di server, bukan cuma disembunyikan tombolnya
 *  6. nama nakal tidak bisa menyuntik HTML ke papan skor
 *  7. payload muat di bawah batas 14.553 char
 */
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { config, handler } from '../../plugins/game/chestgame.js';
import { idRuang, muat, simpan, BERKAS_RUANG } from '../lib/chest-server.js';

let lulus = 0;
const gagal = [];
const cek = (nama, benar) => {
  if (benar) { lulus++; console.log('  ✓ ' + nama); }
  else { gagal.push(nama); console.log('  ✗ ' + nama); }
};

const JID = 'uji-chestgame-000@g.us';
const idR = idRuang(JID);

// Simpan isi berkas asli, supaya uji tidak merusak papan grup sungguhan.
const cadangan = existsSync(BERKAS_RUANG) ? readFileSync(BERKAS_RUANG, 'utf8') : null;

function bersihkanRuangUji() {
  const db = muat();
  delete db.ruang[idR];
  simpan(db);
}

/** Palsu minimal: cukup yang benar-benar dipakai handler. */
function bikinM(teks, pushName, opsi = {}) {
  const bagian = teks.trim().split(/\s+/);
  return {
    chat: JID,
    pushName,
    isOwner: !!opsi.isOwner,
    isAdmin: !!opsi.isAdmin,
    balasan: [],
    reply(t) { this.balasan.push(t); return Promise.resolve(); },
    args: bagian.slice(1),
  };
}

const bubbles = [];
const sock = {
  relayMessage(jid, isi, opsi) {
    const b64 = isi.botForwardedMessage.message.richResponseMessage.unifiedResponse.data;
    const d = JSON.parse(Buffer.from(b64, 'base64').toString());
    bubbles.push(d.sections[0].view_model.primitive.payload);
    return Promise.resolve({ id: opsi.messageId });
  },
};

const jalan = (teks, pushName, opsi) => {
  const m = bikinM(teks, pushName, opsi);
  return handler(m, { sock, args: m.args, prefix: '.' }).then(() => m);
};

async function utama() {
  bersihkanRuangUji();

  console.log('── config ──');
  cek('nama perintah cg', config.name === 'cg');
  cek('alias chestgame ada', config.alias.includes('chestgame'));
  cek('grup saja (isGroup)', config.isGroup === true && config.isPrivate === false);

  console.log('\n── bubble: nol jaringan ──');
  await jalan('.cg', 'Shiro');
  const h = bubbles.at(-1);
  cek('bubble terkirim', typeof h === 'string' && h.length > 500);
  cek('nol fetch(', !/fetch\s*\(/.test(h));
  cek('nol XMLHttpRequest', !/XMLHttpRequest/.test(h));
  cek('nol new Image', !/new\s+Image/.test(h));
  cek('nol <img', !/<img/i.test(h));
  cek('nol <script src=', !/<script[^>]+src=/i.test(h));
  cek('nol sendBeacon', !/sendBeacon/.test(h));
  cek('nol http(s) ke luar', !/https?:\/\//.test(h));
  cek('payload < 14553 char', h.length < 14553);

  console.log('\n── bubble: interaksi yang terbukti hidup ──');
  cek('16 petak dirender', (h.match(/class="k /g) || []).length === 16);
  cek('petak tertutup pakai atribut onclick', /class="k tt" onclick="amb\(/.test(h));
  cek('nol properti .onclick=', !/\.onclick\s*=/.test(h));
  cek('execCommand copy dipakai', /execCommand\('copy'\)/.test(h));
  // Perbandingan urutan dilakukan atas KODE saja: komentar penjelas di atas
  // fungsi amb() memang menyebut navigator.clipboard lebih dulu, dan kalau
  // komentar ikut dihitung, uji ini gagal padahal kodenya benar.
  const hKode = h.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  cek('execCommand didahulukan di atas navigator.clipboard',
      hKode.indexOf("execCommand('copy')") < hKode.indexOf('navigator.clipboard'));
  cek('AudioContext dibuat di dalam fungsi bip', /function bip[\s\S]{0,200}AudioContext/.test(h));
  cek('tombol AMANKAN & LEWAT & GABUNG ada',
      /cg aman/.test(h) && /cg lewat/.test(h) && /cg gabung/.test(h));
  cek('perintah yang disalin memakai prefix', /amb\('\.cg buka 1'/.test(h));

  console.log('\n── state: buka peti ──');
  const m1 = await jalan('.cg buka 1', 'Shiro');
  const dbA = muat();
  const rA = dbA.ruang[idR];
  cek('peti 1 tercatat terbuka', rA.papan[0].buka === true);
  cek('peti dicap nama pembuka', rA.papan[0].oleh === 'Shiro');
  cek('ada balasan teks ke chat', m1.balasan.length === 1);
  cek('bubble kedua terkirim', bubbles.length === 2);
  cek('bubble kedua menampilkan hasil peti 1',
      /class="k (koin|bom)"/.test(bubbles.at(-1)));

  console.log('\n── persistensi lintas pemanggilan ──');
  // Muat ulang dari DISK, bukan dari memori: inilah bedanya dengan bubble.
  const dariDisk = JSON.parse(readFileSync(BERKAS_RUANG, 'utf8')).ruang[idR];
  cek('papan tersimpan di disk', dariDisk.papan[0].buka === true);
  cek('pemain tersimpan di disk', dariDisk.pemain.some((p) => p.nama === 'Shiro'));
  cek('seq naik', dariDisk.seq > 1);

  console.log('\n── giliran ditegakkan server ──');
  await jalan('.cg', 'Kedua');            // pemain kedua otomatis gabung
  const db2 = muat();
  cek('dua pemain terdaftar', db2.ruang[idR].pemain.length === 2);
  const giliranSkrg = db2.ruang[idR].pemain[db2.ruang[idR].giliran].nama;
  const bukanGiliran = db2.ruang[idR].pemain.find((p) => p.nama !== giliranSkrg).nama;
  const mSalah = await jalan('.cg buka 5', bukanGiliran);
  cek('pemain bukan-giliran DITOLAK',
      mSalah.balasan.some((t) => /bukan giliran/i.test(t)));
  const sebelum = muat().ruang[idR].papan.filter((s) => s.buka).length;
  const mBenar = await jalan('.cg buka 5', giliranSkrg);
  cek('pemain yang giliran DITERIMA', !mBenar.balasan.some((t) => /bukan giliran/i.test(t)));
  cek('papan berubah setelah gerakan sah',
      muat().ruang[idR].papan.filter((s) => s.buka).length > sebelum);

  console.log('\n── keamanan ──');
  await jalan('.cg gabung <img src=x onerror=alert(1)>', 'Nakal');
  const hN = bubbles.at(-1);
  cek('nama nakal tidak jadi tag HTML', !/<img src=x/.test(hN));
  cek('nama nakal ter-escape', /&lt;img/.test(hN) || !/onerror/.test(hN));
  const mReset = await jalan('.cg reset', 'Shiro');
  cek('reset ditolak untuk non-admin',
      mReset.balasan.some((t) => /admin/i.test(t)));
  const mResetOk = await jalan('.cg reset', 'Shiro', { isAdmin: true });
  cek('reset diterima untuk admin', !mResetOk.balasan.some((t) => /❌/.test(t)));
  cek('papan benar-benar kosong setelah reset',
      muat().ruang[idR].papan.filter((s) => s.buka).length === 0);

  console.log('\n── menu bantuan ──');
  const mBantu = await jalan('.cg apaini', 'Shiro');
  cek('sub-perintah asing → menu', mBantu.balasan.some((t) => /PETI HARTA/.test(t)));

  // Bersihkan jejak uji, lalu pulihkan berkas asli kalau tadi ada.
  bersihkanRuangUji();
  if (cadangan !== null) writeFileSync(BERKAS_RUANG, cadangan);

  console.log(`\n${lulus}/${lulus + gagal.length} lulus`);
  if (gagal.length) {
    console.log('GAGAL:\n  - ' + gagal.join('\n  - '));
    process.exit(1);
  }
}

utama().catch((e) => { console.error('MELEDAK:', e); process.exit(1); });
