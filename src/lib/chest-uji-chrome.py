#!/usr/bin/env python3
"""Uji CHEST di Chrome sungguhan sebelum apa pun dikirim ke WA.

Cara kerja: ambil `chest-web/index.html` apa adanya, tempelkan skrip
assertion di akhir, buka di Chrome headless, baca vonisnya dari DOM.

Yang diuji PERILAKU, bukan keberadaan elemen:
  - klik peti aman -> bank naik sesuai nilai peti itu
  - klik peti bom  -> bank hangus, level balik 1, papan mati
  - AMANKAN        -> bank pindah ke total, level naik
  - papan bersih   -> semua peti aman kebuka = total naik
  - warna & tema   -> getComputedStyle, bukan tebakan
"""
import re
import subprocess
import sys
from pathlib import Path

AKAR = Path("/root/shirowahd")
SUMBER = AKAR / "chest-web" / "index.html"
UJI = Path("/tmp/_chest_uji.html")

ASSERT = r"""
<script>
/* ── Harness uji. Tidak pernah ikut ke berkas produksi: hanya ditempel
      pada salinan /tmp saat pengujian. ── */
var log = [];
function cek(n, d, h){
  var ok = String(d) === String(h);
  log.push((ok ? 'LULUS ' : 'GAGAL ') + n + '=' + d + (ok ? '' : ' harus ' + h));
}
function cekBenar(n, s){ cek(n, !!s, true); }

function nilaiTotal(){ return parseInt(document.querySelector('#nTotal b').textContent, 10); }
function nilaiBank(){  return parseInt(document.querySelector('#nBank b').textContent, 10); }
function nilaiLevel(){ return parseInt(document.querySelector('#nLevel b').textContent, 10); }
function sel(i){ return document.querySelectorAll('#papan .peti')[i]; }

/* ── 1. Struktur dasar ── */
cek('jumlah peti', document.querySelectorAll('#papan .peti').length, 16);
cek('total awal', nilaiTotal(), 0);
cek('bank awal', nilaiBank(), 0);
cek('level awal', nilaiLevel(), 1);
cekBenar('tombol AMANKAN mati saat bank 0', document.getElementById('bAman').disabled);

/* ── 2. Papan punya bom sebanyak yang dijanjikan ── */
var totalBom = papan.filter(function(x){ return x.bom; }).length;
cek('jumlah bom = jumlahBom()', totalBom, jumlahBom());
cekBenar('bom lebih sedikit dari peti', totalBom < 16);

/* ── 3. Buka peti AMAN -> bank naik tepat sebesar nilai peti itu ── */
var iAman = -1;
for (var i = 0; i < 16; i++) if (!papan[i].bom) { iAman = i; break; }
var nilaiAman = papan[iAman].nilai;
sel(iAman).click();
cek('bank naik sesuai nilai peti', nilaiBank(), nilaiAman);
cek('total belum berubah sebelum diamankan', nilaiTotal(), 0);
cekBenar('peti jadi terbuka', papan[iAman].buka);
cekBenar('sel dapat kelas buka', sel(iAman).className.indexOf('buka') >= 0);
cekBenar('tombol AMANKAN hidup setelah dapat koin', !document.getElementById('bAman').disabled);

/* ── 4. Peti yang sama tidak bisa diklik dua kali ── */
var bankSebelum = nilaiBank();
sel(iAman).click();
cek('klik ulang tidak menambah bank', nilaiBank(), bankSebelum);

/* ── 5. AMANKAN memindahkan bank ke total dan menaikkan level ── */
document.getElementById('bAman').click();
cek('total = bank yang diamankan', nilaiTotal(), nilaiAman);
cek('bank kosong setelah amankan', nilaiBank(), 0);
cek('level naik jadi 2', nilaiLevel(), 2);
cekBenar('papan mati setelah amankan', selesai);

/* ── 6. Ronde baru: papan segar, total TETAP (tidak ikut hangus) ── */
document.getElementById('bBaru').click();
cek('total bertahan lintas ronde', nilaiTotal(), nilaiAman);
cek('bank nol di ronde baru', nilaiBank(), 0);
cekBenar('papan hidup lagi', !selesai);
cek('semua peti tertutup lagi', papan.filter(function(x){ return x.buka; }).length, 0);
cek('bom naik di level 2', jumlahBom(), 3);

/* ── 7. Kena BOM: bank hangus, level balik 1, total TIDAK hangus ── */
var totalSebelumBom = nilaiTotal();
var iAman2 = -1, iBom = -1;
for (var j = 0; j < 16; j++) {
  if (iAman2 < 0 && !papan[j].bom) iAman2 = j;
  if (iBom < 0 && papan[j].bom) iBom = j;
}
sel(iAman2).click();
cekBenar('dapat koin dulu sebelum bom', nilaiBank() > 0);
sel(iBom).click();
cek('bank hangus kena bom', nilaiBank(), 0);
cek('level balik ke 1', nilaiLevel(), 1);
cek('TOTAL tidak hangus kena bom', nilaiTotal(), totalSebelumBom);
cekBenar('papan mati kena bom', selesai);
cekBenar('sel bom dapat kelas bom', sel(iBom).className.indexOf('bom') >= 0);
cekBenar('status menyebut BOM', document.getElementById('lap').textContent.indexOf('BOM') >= 0);

/* ── 8. Papan mati: peti sisa tidak bisa diklik ── */
var bankMati = nilaiBank();
for (var k = 0; k < 16; k++) if (!papan[k].buka) { sel(k).click(); break; }
cek('klik saat papan mati tidak berefek', nilaiBank(), bankMati);

/* ── 9. Bersihkan seluruh papan aman -> total naik sendiri ── */
document.getElementById('bBaru').click();
var totalSebelumBersih = nilaiTotal(), harusDapat = 0;
for (var a = 0; a < 16; a++) if (!papan[a].bom) harusDapat += papan[a].nilai;
for (var b = 0; b < 16; b++) if (!papan[b].bom) sel(b).click();
cek('papan bersih -> total naik penuh', nilaiTotal(), totalSebelumBersih + harusDapat);
cekBenar('status menyebut menang', document.getElementById('lap').textContent.indexOf('🏆') >= 0);

/* ── 10. Tema: tombol benar-benar mengubah warna yang dipakai ── */
var inkGelap = getComputedStyle(document.body).color;
document.getElementById('tema').click();
cek('tema jadi light', document.documentElement.getAttribute('data-theme'), 'light');
var inkTerang = getComputedStyle(document.body).color;
cekBenar('warna teks BERUBAH saat tema ganti', inkGelap !== inkTerang);
document.getElementById('tema').click();
cek('tema balik dark', document.documentElement.getAttribute('data-theme'), 'dark');

/* ── 11. Baris diagnostik melaporkan rung penyimpanan yang menang ── */
var d = document.getElementById('diag').textContent;
cekBenar('diag menyebut SIMPAN', d.indexOf('SIMPAN') >= 0);
cekBenar('diag menyebut SUARA', d.indexOf('SUARA') >= 0);
cekBenar('simpan tidak GAGAL di Chrome', d.indexOf('SIMPAN GAGAL') < 0);

/* ── 12. Halaman berdiri sendiri: tidak ada panggilan ke API bot/web.
      Yang diperiksa hanya HTML ASLI, bukan skrip uji ini sendiri — harness
      menyebut '/api/' di teks assertion-nya, jadi memeriksa outerHTML utuh
      selalu gagal palsu. Itu sebabnya potongan uji dibuang dulu. ── */
var htmlAsli = document.documentElement.outerHTML.split('UJICHROME')[0];
var tanpaUji = htmlAsli.replace(/var log = \[\][\s\S]*$/, '');
cek('tidak ada fetch ke API', /fetch\s*\(/.test(tanpaUji) ? 'ada' : 'tidak', 'tidak');
cek('tidak ada XMLHttpRequest', /XMLHttpRequest/.test(tanpaUji) ? 'ada' : 'tidak', 'tidak');
cek('tidak menyentuh /api/', tanpaUji.indexOf('/api/') >= 0 ? 'ada' : 'tidak', 'tidak');

var gagal = log.filter(function(x){ return x.indexOf('GAGAL') === 0; }).length;
document.getElementById('hasil').textContent =
  'UJICHROME ' + (gagal === 0 ? 'SEMUALULUS' : 'ADAGAGAL') + ' || ' + log.join(' | ');
</script>
"""


def main() -> int:
    if not SUMBER.is_file():
        print(f"✗ tidak ada: {SUMBER}")
        return 2

    html = SUMBER.read_text(encoding="utf-8")
    UJI.write_text(html.replace("</body>", ASSERT + "</body>"), encoding="utf-8")

    cmd = ["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu",
           "--virtual-time-budget=9000", "--dump-dom", UJI.resolve().as_uri()]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=240)
    except FileNotFoundError:
        print("✗ google-chrome tidak ada")
        return 2
    except subprocess.TimeoutExpired:
        print("✗ Chrome timeout")
        return 2

    m = re.search(r"UJICHROME (\w+) \|\| (.*?)<", proc.stdout, re.S)
    if not m:
        print("✗ vonis tidak ditemukan — skrip assertion tidak jalan.")
        print("STDERR:", proc.stderr[-800:])
        print("DOM tail:", proc.stdout[-900:])
        return 2

    vonis, detail = m.group(1), m.group(2)
    cek = [c.strip() for c in detail.split(" | ") if c.strip()]
    gagal = [c for c in cek if c.startswith("GAGAL")]
    for c in cek:
        print("   " + c)
    print(f"\n  {len(cek) - len(gagal)}/{len(cek)} lulus — VONIS: {vonis}")
    return 0 if (vonis == "SEMUALULUS" and not gagal) else 1


if __name__ == "__main__":
    sys.exit(main())
