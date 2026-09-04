/**
 * CHEST GAME — papan bersama per grup, digerakkan PERINTAH WA.
 *
 * Kenapa bentuknya begini, bukan bubble yang menembak server sendiri:
 * webview bubble WA memblokir SELURUH jaringan keluar. Sudah diuji lima
 * varian trusted_sources ([], domain penuh, domain tanpa skema, "*", dan
 * gabungan keempatnya) — img, <script>, dan XHR ditolak di semua varian,
 * sementara server dipastikan sehat dari luar (ping.gif 200, 42 byte).
 * Jadi state TIDAK MUNGKIN digerakkan dari dalam bubble lewat HTTP.
 *
 * Yang hidup di dalam bubble: CSS, atribut onclick, AudioContext, dan
 * clipboard lewat document.execCommand('copy'). Maka jalurnya dibalik:
 *
 *   tap peti di bubble  →  perintah nempel di clipboard
 *   user tempel + kirim →  plugin ini jalan
 *   plugin ubah state   →  chest-server.js (berkas di disk)
 *   plugin kirim bubble baru berisi papan terkini
 *
 * Persistensi jadi milik server, bukan milik bubble — inilah yang membuat
 * progres tidak ngulang waktu grup ditutup, dan yang membuat multiplayer
 * mungkin: satu papan per grup, semua anggota menggerakkan papan yang sama.
 */
import { generateWAMessageFromContent } from 'hillz';
import crypto from 'crypto';
import {
  UKURAN, MAKS_PEMAIN,
  idRuang, muat, simpan, buangRuangMati,
  gabung, buka, amankan, lewat, pandangan, namaAman,
} from '../../src/lib/chest-server.js';

const pluginConfig = {
  name: 'cg',
  alias: ['chestgame', 'cgame', 'petiweb'],
  category: 'game',
  description: 'Peti harta papan bersama — satu papan per grup, giliran-giliran',
  usage: '.cg | .cg gabung <nama> | .cg buka <1-16> | .cg aman | .cg lewat',
  example: '.cg gabung Shiro',
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 2,
  energi: 0,
  isEnabled: true,
};

/* ══════════════════ bubble ══════════════════ */

const esc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => (
  { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]
));

/**
 * Papan dirender jadi HTML sekali cetak. Tidak ada jaringan di dalamnya —
 * satu-satunya interaksi adalah menyalin perintah ke clipboard, dan itu
 * dipasang sebagai ATRIBUT onclick karena properti el.onclick mati di bubble.
 */
function bubbleHtml(v, prefix) {
  const p = esc(prefix);
  const petak = v.papan.map((s, i) => {
    const n = i + 1;
    if (s.buka) {
      return s.bom
        ? `<div class="k bom"><span class="ik">💥</span><span class="ket">${esc(s.oleh || '')}</span></div>`
        : `<div class="k koin"><span class="ik">+${s.nilai}</span><span class="ket">${esc(s.oleh || '')}</span></div>`;
    }
    return `<div class="k tt" onclick="amb('${p}cg buka ${n}',this)">`
      + `<span class="ik">?</span><span class="ket">${n}</span></div>`;
  }).join('');

  const skor = v.pemain.length
    ? v.pemain.map((x) => `<div class="pm${x.giliran ? ' now' : ''}">`
        + `<span class="nm">${x.giliran ? '▶ ' : ''}${esc(x.nama)}</span>`
        + `<span class="ag"><b>${x.total}</b> aman · <i>${x.bank}</i> tangan</span></div>`).join('')
    : '<div class="kosong">belum ada pemain — tap GABUNG</div>';

  const log = v.log.length
    ? v.log.map((l) => `<div class="lg">${esc(l.teks)}</div>`).join('')
    : '<div class="lg dim">—</div>';

  const giliran = v.giliran
    ? `giliran <b>${esc(v.giliran)}</b>`
    : 'menunggu pemain';

  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
body{background:#0b1020;color:#e8ecf8;font:13px/1.5 -apple-system,system-ui,sans-serif;padding:11px}
.w{max-width:340px;margin:0 auto}
.hd{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px}
h1{font-size:15px;letter-spacing:.3px}
.rd{font-size:10px;color:#8b96b8}
.gl{font-size:11px;color:#a5b4fc;margin-bottom:9px}
.gl b{color:#c7d2fe}
.gr{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:9px}
.k{aspect-ratio:1;border-radius:9px;display:flex;flex-direction:column;
   align-items:center;justify-content:center;gap:1px;border:1px solid #1f2a48;background:#131c34}
.k .ik{font-size:15px;font-weight:800;line-height:1}
.k .ket{font-size:8.5px;color:#8b96b8;max-width:95%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.tt{cursor:pointer;background:#1e293b;border-color:#334155}
.tt:active{background:#2563eb;border-color:#3b82f6}
.tt .ik{color:#93c5fd}
.koin{background:#0f2a1e;border-color:#166534}.koin .ik{color:#4ade80;font-size:13px}
.bom{background:#2b1114;border-color:#7f1d1d}
.br{display:flex;gap:6px;margin-bottom:9px}
.b{flex:1;background:#1e293b;color:#fff;border:1px solid #334155;border-radius:8px;
   padding:9px 6px;font-size:11.5px;font-weight:800;text-align:center;cursor:pointer}
.b:active{background:#2563eb}
.b.hj{background:#14532d;border-color:#166534}
.pn{background:#101830;border:1px solid #1f2a48;border-radius:9px;padding:8px 10px;margin-bottom:8px}
.pm{display:flex;justify-content:space-between;align-items:baseline;padding:2px 0;font-size:11.5px}
.pm.now{color:#fde68a}
.nm{font-weight:700}
.ag{font-size:10px;color:#8b96b8}.ag b{color:#4ade80}.ag i{color:#fbbf24;font-style:normal}
.kosong{font-size:11px;color:#8b96b8;text-align:center;padding:3px}
.lg{font-size:10px;color:#94a3b8;padding:1px 0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.lg.dim{color:#475569}
.ts{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);background:#2563eb;color:#fff;
    font-size:11.5px;font-weight:800;padding:8px 14px;border-radius:20px;opacity:0;pointer-events:none;
    max-width:88%;text-align:center}
.ts.on{opacity:1}
.hint{font-size:9.5px;color:#64748b;text-align:center;margin-top:7px;line-height:1.45}
textarea.sp{position:fixed;left:-9999px;top:0;width:1px;height:1px}
</style></head><body><div class="w">
<div class="hd"><h1>🎁 PETI HARTA</h1><span class="rd">ronde ${v.ronde} · sisa aman ${v.sisaAman}</span></div>
<div class="gl">${giliran}</div>
<div class="gr">${petak}</div>
<div class="br">
  <div class="b hj" onclick="amb('${p}cg aman',this)">💰 AMANKAN</div>
  <div class="b" onclick="amb('${p}cg lewat',this)">⏭ LEWAT</div>
  <div class="b" onclick="amb('${p}cg gabung ',this)">＋ GABUNG</div>
</div>
<div class="pn">${skor}</div>
<div class="pn">${log}</div>
<div class="hint">tap peti → perintahnya tersalin → tempel di kolom chat lalu kirim.<br>
bubble tidak bisa mengirim sendiri; webview WA memblokir semua jaringan.</div>
<textarea class="sp" id="sp"></textarea><div class="ts" id="ts"></div>
</div><script>
var suara=null;
function bip(ok){
  try{
    if(!suara){var C=window.AudioContext||window.webkitAudioContext; if(!C)return; suara=new C()}
    if(suara.state==='suspended'&&suara.resume)suara.resume();
    var o=suara.createOscillator(),g=suara.createGain();
    o.type='triangle'; o.frequency.value=ok?880:220;
    g.gain.value=.05; o.connect(g); g.connect(suara.destination);
    o.start(); o.stop(suara.currentTime+.07);
  }catch(e){}
}
function kabar(t,ok){
  var e=document.getElementById('ts'); e.textContent=t; e.className='ts on';
  setTimeout(function(){e.className='ts'},2600); bip(ok);
}
/* Clipboard lama SENGAJA didahulukan: navigator.clipboard terbukti ditolak
   di webview bubble (probe P1 gagal), execCommand('copy') terbukti jalan. */
function amb(cmd,el){
  var ok=false;
  try{
    var t=document.getElementById('sp');
    t.value=cmd; t.focus(); t.setSelectionRange(0,cmd.length);
    ok=document.execCommand('copy');
  }catch(e){ok=false}
  if(!ok&&navigator.clipboard&&navigator.clipboard.writeText){
    try{navigator.clipboard.writeText(cmd);ok=true}catch(e){}
  }
  if(el){el.style.borderColor=ok?'#3b82f6':'#7f1d1d'}
  kabar(ok?('tersalin: '+cmd+'  → tempel & kirim'):('salin gagal — ketik: '+cmd),ok);
}
</script></body></html>`;
}

async function kirimBubble(sock, jid, html) {
  const msg = generateWAMessageFromContent(jid, {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          unifiedResponse: {
            data: Buffer.from(JSON.stringify({
              __typename: 'GenAIUnifiedResponse',
              response_id: crypto.randomUUID(),
              sections: [{
                __typename: 'GenAIUnifiedResponseSection',
                view_model: {
                  __typename: 'GenAISingleLayoutViewModel',
                  primitive: {
                    __typename: 'FOAHtmlPrimitiveDemoDONOTUSE',
                    trusted_sources: [],
                    payload: html.trim(),
                  },
                },
              }],
            })).toString('base64'),
          },
          contextInfo: { isForwarded: true, forwardOrigin: 4 },
        },
      },
    },
  }, {});
  await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  return msg.key.id;
}

/* ══════════════════ handler ══════════════════ */

async function handler(m, { sock, args, prefix }) {
  const jid = m.chat;
  const idR = idRuang(jid);
  const sub = (args[0] || '').toLowerCase();

  const db = muat();
  buangRuangMati(db);

  // Nama pemain diambil dari pushName WA — bukan deklarasi bebas, jadi
  // orang tidak bisa mengaku jadi orang lain semudah mengetik nama.
  const namaKu = namaAman(m.pushName || 'Pemain');
  const p = prefix || '.';

  const tampil = async (pesan) => {
    const v = pandangan(muat(), idR, namaKu);
    await kirimBubble(sock, jid, bubbleHtml(v, p));
    if (pesan) await m.reply(pesan);
  };

  if (!sub || sub === 'papan' || sub === 'lihat') {
    gabung(db, idR, namaKu);           // otomatis terdaftar saat pertama lihat
    simpan(db);
    return tampil();
  }

  if (sub === 'gabung' || sub === 'join') {
    const pilih = args.slice(1).join(' ').trim();
    const r = gabung(db, idR, pilih || namaKu);
    if (!r.ok) return m.reply(`❌ ${r.alasan}`);
    simpan(db);
    return tampil(`✅ *${r.nama}* masuk ruang. Maks ${MAKS_PEMAIN} pemain.`);
  }

  if (sub === 'buka' || sub === 'b') {
    const n = Number(args[1]);
    if (!Number.isInteger(n) || n < 1 || n > UKURAN) {
      return m.reply(`❌ nomor peti 1–${UKURAN}. Contoh: *${p}cg buka 7*`);
    }
    const r = buka(db, idR, namaKu, n - 1);
    if (!r.ok) return m.reply(`❌ ${r.alasan}`);
    simpan(db);
    const kabar = r.jenis === 'bom' ? '💥 BOM! koin di tangan hangus'
      : r.jenis === 'bersih' ? `🏆 papan bersih! +${r.nilai} lalu semua koin diamankan`
      : `💰 +${r.nilai} koin masuk tangan`;
    return tampil(kabar);
  }

  if (sub === 'aman' || sub === 'amankan' || sub === 'a') {
    const r = amankan(db, idR, namaKu);
    if (!r.ok) return m.reply(`❌ ${r.alasan}`);
    simpan(db);
    return tampil(`🏦 ${r.diamankan} koin diamankan. Total kamu ${r.total}.`);
  }

  if (sub === 'lewat' || sub === 'skip' || sub === 'l') {
    const r = lewat(db, idR, namaKu);
    if (!r.ok) return m.reply(`❌ ${r.alasan}`);
    simpan(db);
    return tampil('⏭ giliran dilewat.');
  }

  if (sub === 'reset') {
    if (!m.isOwner && !m.isAdmin) return m.reply('❌ cuma admin grup atau owner yang bisa reset.');
    delete db.ruang[idR];
    // Ruang langsung dibuat ulang dan disimpan, bukan dibiarkan kosong:
    // kalau cuma dihapus, papan baru hanya hidup di memori sampai ada
    // perintah berikutnya, dan bubble yang dikirim sekarang tidak cocok
    // dengan isi disk.
    gabung(db, idR, namaKu);
    simpan(db);
    return tampil('♻️ papan direset dari nol.');
  }

  return m.reply(
    `🎁 *PETI HARTA* — papan bersama grup\n\n`
    + `*${p}cg* — lihat papan\n`
    + `*${p}cg buka <1-${UKURAN}>* — buka peti\n`
    + `*${p}cg aman* — amankan koin di tangan\n`
    + `*${p}cg lewat* — lewat giliran\n`
    + `*${p}cg reset* — admin saja\n\n`
    + `Koin di tangan hangus kalau kena bom. Diamankan = aman permanen.\n`
    + `Di bubble: tap peti → perintah tersalin → tempel di chat lalu kirim.`,
  );
}

export { pluginConfig as config, handler };
