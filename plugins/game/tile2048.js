/**
 * ARENA 2048 — jembatan WhatsApp ke game di website.
 *
 * Bot TIDAK menyimpan skor dan TIDAK menghitung skor. Tugasnya cuma dua:
 *   1. `.arena`    -> buat token bertanda tangan (HMAC, 30 menit) lalu kirim tautan
 *   2. `.arenatop` -> BACA berkas papan skor dan tampilkan 10 teratas
 *
 * Penulis berkas papan skor hanya satu: web-uploader.js. Bot cuma pembaca.
 * Dua proses menulis satu berkas = data hilang, jadi dihindari sejak awal.
 */

import { join } from 'path';
import config from '../../config.js';
import { buatToken, bacaSkor, papanSkor, peringkat, rahasiaArena, BERKAS_SKOR } from '../../src/lib/hillz-arena.js';

const pluginConfig = {
  name: '2048',
  // top2048/2048top WAJIB ada di alias — kalau tidak, `.top2048` tidak akan
  // pernah sampai ke handler ini (router memakai name+alias, bukan isi kode).
  alias: ['tile2048', 'arena2048', 'top2048', '2048top'],
  category: 'game',
  description: 'Main 2048 di website, skor masuk papan skor WhatsApp',
  usage: '.2048',
  example: '.2048',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const DOMAIN = process.env.DOMAIN || 'swhdhlz.my.id';

function medali(i) {
  return ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
}

async function handler(m, { sock }) {
  try {
    const cmd = String(m.command || '').toLowerCase();

    /* ── Papan skor: dibaca dari berkas, tanpa jaringan ── */
    if (cmd === 'top2048' || cmd === '2048top') {
      const daftar = bacaSkor(BERKAS_SKOR);
      const top = papanSkor(daftar, 10);
      if (!top.length) {
        await m.reply(`🎮 *ARENA 2048*\n\nPapan skor masih kosong. Ketik *${m.prefix}2048* buat jadi yang pertama.`);
        return;
      }
      const aku = peringkat(daftar, m.sender);
      let teks = '🏆 *PAPAN SKOR ARENA 2048*\n\n';
      top.forEach((s, i) => {
        const tanda = s.jid === m.sender ? ' ⬅️ kamu' : '';
        teks += `${medali(i)} *${s.skor}* — ${s.nama || 'Anonim'} _(ubin ${s.ubin})_${tanda}\n`;
      });
      teks += `\n👥 Total pemain: *${papanSkor(daftar, 9999).length}*`;
      if (aku && aku.posisi > 10) teks += `\n📍 Posisimu: *#${aku.posisi}* dengan skor *${aku.skor}*`;
      teks += `\n\nMain lagi: *${m.prefix}2048*`;
      await m.reply(teks);
      return;
    }

    /* ── Tautan main: token HMAC berumur 30 menit ── */
    const rahasia = rahasiaArena();
    const token = buatToken(rahasia, m.sender, m.pushName || 'Pemain', 30 * 60 * 1000);
    const tautan = `https://${DOMAIN}/arena?t=${encodeURIComponent(token)}`;

    const daftar = bacaSkor(BERKAS_SKOR);
    const aku = peringkat(daftar, m.sender);
    const jml = papanSkor(daftar, 9999).length;

    let teks = '🎮 *ARENA 2048*\n\n';
    teks += 'Gabungkan ubin sampai 2048. Skor dihitung ulang di server, jadi tidak bisa dipalsukan.\n\n';
    teks += `🔗 ${tautan}\n\n`;
    teks += '⏳ Tautan berlaku *30 menit* dan terikat ke nomormu.\n';
    if (aku) teks += `📍 Rekormu: *${aku.skor}* (peringkat *#${aku.posisi}* dari ${aku.dari})\n`;
    else if (jml) teks += `👥 Sudah ada *${jml}* pemain di papan skor.\n`;
    teks += `\n🏆 Lihat papan skor: *${m.prefix}top2048*`;

    await m.reply(teks);
    await m.react('🎮');
  } catch (e) {
    await m.react('❌');
    await m.reply(`Gagal membuat sesi arena: ${e.message}`);
  }
}

export { pluginConfig as config, handler };
