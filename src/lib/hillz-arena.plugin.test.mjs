/**
 * UJI PLUGIN WA (tanpa restart bot, tanpa jaringan WA):
 * plugin dipanggil dengan `m` tiruan, lalu balasannya diperiksa.
 *
 * Yang dibuktikan:
 *   - `.arena` mengeluarkan tautan https ke /arena?t=<token>
 *   - token di tautan itu SAH dan berisi jid + nama pemain
 *   - `.arenatop` membaca berkas skor dan menampilkan peringkat
 *   - nomor WA orang lain TIDAK muncul di balasan papan skor
 *   - papan kosong tidak bikin plugin meledak
 */
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const KERJA = mkdtempSync(join(tmpdir(), 'arena-plugin-'));
process.env.ARENA_SCORES = join(KERJA, 'skor.json');
process.env.ARENA_SECRET_FILE = join(KERJA, 'rahasia');
process.env.DOMAIN = 'swhdhlz.my.id';

const { config, handler } = await import('../../plugins/game/arena.js');
const A = await import('./hillz-arena.js');

let lulus = 0, gagal = 0;
function cek(nama, dapat, harus) {
  const ok = JSON.stringify(dapat) === JSON.stringify(harus);
  if (ok) { lulus++; console.log('  LULUS ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + '\n    dapat: ' + JSON.stringify(dapat) + '\n    harus: ' + JSON.stringify(harus)); }
}
function cekBenar(nama, syarat, catatan = '') {
  if (syarat) { lulus++; console.log('  LULUS ' + nama); }
  else { gagal++; console.log('  GAGAL ' + nama + (catatan ? ' — ' + catatan : '')); }
}

/** `m` tiruan: menangkap balasan tanpa menyentuh WhatsApp. */
function mTiruan(cmd, sender, pushName) {
  const keluar = { balasan: [], reaksi: [] };
  return {
    m: {
      command: cmd, sender, pushName, prefix: '.', chat: sender,
      reply: async (t) => { keluar.balasan.push(t); },
      react: async (e) => { keluar.reaksi.push(e); },
    },
    keluar,
  };
}

const AKU = '628111000111@s.whatsapp.net';
const DIA = '628999888777@s.whatsapp.net';

console.log('══ Bentuk plugin ══');
cek('nama plugin', config.name, 'arena');
cek('kategori', config.category, 'game');
cekBenar('alias memuat 2048', config.alias.includes('2048'));
cekBenar('bisa dipakai di private DAN grup', config.isGroup === false && config.isPrivate === false);
cekBenar('bukan khusus owner', config.isOwner === false);

console.log('\n══ .arenatop saat papan kosong ══');
{
  const { m, keluar } = mTiruan('arenatop', AKU, 'Aku');
  await handler(m, { sock: null });
  cek('membalas 1 pesan', keluar.balasan.length, 1);
  cekBenar('bilang masih kosong', /kosong/i.test(keluar.balasan[0]), keluar.balasan[0]);
  cekBenar('tidak error', keluar.reaksi.indexOf('❌') === -1);
}

console.log('\n══ .arena mengeluarkan tautan bertoken ══');
let tokenDitangkap = null;
{
  const { m, keluar } = mTiruan('arena', AKU, 'Aku Pemain');
  await handler(m, { sock: null });
  cek('membalas 1 pesan', keluar.balasan.length, 1);
  const teks = keluar.balasan[0];
  const cocok = teks.match(/https:\/\/swhdhlz\.my\.id\/arena\?t=([A-Za-z0-9_\-.%]+)/);
  cekBenar('ada tautan https ke /arena?t=', !!cocok, teks.slice(0, 200));
  if (cocok) {
    tokenDitangkap = decodeURIComponent(cocok[1]);
    const isi = A.bacaToken(A.rahasiaArena(), tokenDitangkap);
    cekBenar('token di tautan SAH', !!isi, 'token tidak terbaca');
    cek('token berisi jid pengirim', isi && isi.jid, AKU);
    cek('token berisi nama WA', isi && isi.nama, 'Aku Pemain');
    cekBenar('token belum kedaluwarsa', isi && isi.kedaluwarsa > Date.now());
    cekBenar('umur token <= 30 menit', isi && isi.kedaluwarsa - Date.now() <= 30 * 60 * 1000 + 2000);
  }
  cekBenar('reaksi 🎮', keluar.reaksi.includes('🎮'));
  cekBenar('tidak menyebut nomor sendiri mentah', !teks.includes('628111000111@'), teks.slice(0, 120));
}

console.log('\n══ .arenatop dengan isi ══');
{
  A.tambahSkor(A.BERKAS_SKOR, { jid: DIA, nama: 'Dia', skor: 5000, ubin: 512, langkah: 300, waktu: Date.now() });
  A.tambahSkor(A.BERKAS_SKOR, { jid: AKU, nama: 'Aku Pemain', skor: 1200, ubin: 128, langkah: 90, waktu: Date.now() });

  const { m, keluar } = mTiruan('arenatop', AKU, 'Aku Pemain');
  await handler(m, { sock: null });
  const teks = keluar.balasan[0];
  cekBenar('peringkat 1 = skor tertinggi', teks.indexOf('5000') < teks.indexOf('1200'), teks);
  cekBenar('menandai baris milikku', /kamu/i.test(teks), teks);
  cekBenar('menyebut total pemain', /Total pemain/i.test(teks));
  cekBenar('NOMOR WA ORANG LAIN TIDAK BOCOR', !teks.includes('628999888777') && !teks.includes('@s.whatsapp.net'), teks);
  cekBenar('menyebut nama, bukan nomor', teks.includes('Dia') && teks.includes('Aku Pemain'));
}

console.log('\n══ Tautan tiap pemain berbeda ══');
{
  const a = mTiruan('arena', AKU, 'Aku');
  await handler(a.m, { sock: null });
  const b = mTiruan('arena', DIA, 'Dia');
  await handler(b.m, { sock: null });
  const tA = a.keluar.balasan[0].match(/t=([A-Za-z0-9_\-.%]+)/)[1];
  const tB = b.keluar.balasan[0].match(/t=([A-Za-z0-9_\-.%]+)/)[1];
  cekBenar('token dua pemain berbeda', tA !== tB);
  const isiA = A.bacaToken(A.rahasiaArena(), decodeURIComponent(tA));
  const isiB = A.bacaToken(A.rahasiaArena(), decodeURIComponent(tB));
  cek('token A -> jid A', isiA.jid, AKU);
  cek('token B -> jid B', isiB.jid, DIA);
  cekBenar('token A tidak bisa mengaku jadi B', isiA.jid !== isiB.jid);
}

rmSync(KERJA, { recursive: true, force: true });
console.log('\n────────────────────────────────');
console.log(gagal === 0 ? '✓ SEMUA ' + lulus + ' UJI PLUGIN LULUS' : '✗ ' + gagal + ' GAGAL dari ' + (lulus + gagal));
process.exit(gagal === 0 ? 0 : 1);
