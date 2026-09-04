"""Uji bubble v2 di Chrome headless SEBELUM dikirim ke WA.

Yang diuji khusus: keluhan "gabisa pencet masuk". Versi v1 memasang handler
lewat properti (el.onclick = function(){}). Yang pernah terbukti hidup di
bubble cuma ATRIBUT onclick. Jadi uji ini memastikan:
  - tidak ada satu pun handler properti yang tersisa
  - tombol nama benar-benar punya atribut onclick
  - memanggil handler-nya mengubah state yang terlihat
  - tidak ada error JS saat halaman dimuat
"""
import json
import pathlib
import re
import subprocess
import tempfile

AKAR = pathlib.Path("/root/shirowahd")
SUMBER = AKAR / "chest-web" / "bubble.html"

tok = subprocess.run(
    ["node", "-e",
     "import('./src/lib/chest-server.js').then(m=>console.log(m.buatToken('120363426052801497@g.us')))"],
    cwd=AKAR, capture_output=True, text=True, timeout=90,
).stdout.strip()

asli = SUMBER.read_text(encoding="utf-8")
html = asli.replace("__API__", "https://swhdhlz.my.id").replace("__TOKEN__", tok)

# ── pemeriksaan statis atas HTML ASLI (bukan atas skrip uji ini) ──────
statis = []
# Cek dijalankan atas HTML tanpa komentar: komentar penjelas memang MENYEBUT
# pola lama (el.onclick = ...) dan itu bukan kode. Memeriksa berkas mentah
# bikin uji ini gagal karena dokumentasinya sendiri — persis jenis kesalahan
# yang sudah pernah kejadian di harness sebelumnya.
tanpaKomentar = re.sub(r"/\*.*?\*/", "", asli, flags=re.S)
tanpaKomentar = re.sub(r"^\s*//.*$", "", tanpaKomentar, flags=re.M)

statis.append(("nol handler properti .onclick=",
               not re.search(r"\.onclick\s*=", tanpaKomentar)))
statis.append(("nol addEventListener",
               "addEventListener" not in asli))
statis.append(("tombol nama pakai atribut onclick",
               asli.count('class="ch" onclick="masuk(') == 4))
statis.append(("peti dipasang lewat setAttribute('onclick')",
               "setAttribute('onclick','aksi(" in asli))
statis.append(("tombol AMANKAN & LEWAT atribut onclick",
               'onclick="aksi(\'amankan\'' in asli and 'onclick="aksi(\'lewat\'' in asli))
statis.append(("ada tombol TES NET", 'onclick="tesNet()"' in asli))
statis.append(("tiga jalur jaringan tersedia",
               "viaScript" in asli and "viaXhr" in asli and "tesImg" in asli))
statis.append(("semua aksi lewat GET (syarat JSONP)",
               "'POST'" not in asli and '"POST"' not in asli))
statis.append(("nol aset luar", not re.search(r'src="https?://', asli)))
statis.append(("payload < 14553 char", len(html) < 14553))

# ── assertion di dalam Chrome ────────────────────────────────────────
periksa = """
<script>
(function(){
  var h=[]; function c(n,s){h.push({n:n,l:!!s})}
  var galat=[]; window.onerror=function(m){galat.push(m)};

  c('body terpasang', !!document.body);
  c('4 tombol nama ada', document.querySelectorAll('.ch').length===4);
  c('tombol nama punya atribut onclick',
    [].every.call(document.querySelectorAll('.ch'), function(e){return e.getAttribute('onclick')}));
  c('fungsi masuk ada', typeof masuk==='function');
  c('fungsi aksi ada', typeof aksi==='function');
  c('fungsi viaScript (JSONP) ada', typeof viaScript==='function');
  c('fungsi viaXhr ada', typeof viaXhr==='function');
  c('fungsi tesImg ada', typeof tesImg==='function');
  c('fungsi minta ada', typeof minta==='function');

  // Diagnostik harus melaporkan keempat jalur secara terpisah — inilah yang
  // membedakan "jaringan mati" dari "cuma CORS/XHR yang diblokir".
  var dg=document.getElementById('dg').innerHTML;
  c('diagnostik lapor jalur img', /img/.test(dg));
  c('diagnostik lapor jalur script', /script/.test(dg));
  c('diagnostik lapor jalur xhr', /xhr/.test(dg));
  c('diagnostik lapor SIMPAN', /SIMPAN (localStorage|sessionStorage|cookie|GAGAL)/.test(dg));

  // JSONP: pastikan tag script benar-benar dibuat dan callback terdaftar.
  // Dicari lewat src, bukan lewat "script terakhir" — skrip assertion ini
  // sendiri ikut terhitung di querySelectorAll('script'), jadi indeks
  // terakhir bukan tag yang baru disuntik.
  var sebelum=document.querySelectorAll('script').length;
  viaScript('/api/chest/lihat?t=x', function(){}, function(){});
  c('viaScript menambah tag script', document.querySelectorAll('script').length>sebelum);
  var jsonpTag=null;
  [].forEach.call(document.querySelectorAll('script'), function(s){
    if((s.src||'').indexOf('/api/chest/')>=0) jsonpTag=s;
  });
  c('tag JSONP menunjuk /api/chest/', !!jsonpTag);
  c('URL JSONP membawa callback=', !!jsonpTag && /callback=__cb/.test(jsonpTag.src));

  // Tap sungguhan lewat atribut, seperti di bubble.
  var chip=document.querySelector('.ch');
  var kode=chip.getAttribute('onclick');
  c('atribut onclick memanggil masuk()', /masuk\\(/.test(kode));
  try{ eval(kode); c('eval atribut onclick tidak melempar', true) }
  catch(e){ c('eval atribut onclick tidak melempar', false) }
  c('nama terisi setelah tap', typeof nama==='string' && nama.length>0);
  c('nKlik naik setelah tap', nKlik>0);

  // Suara: context dibuat di dalam handler, jadi setelah tap harus ada state.
  c('audio dilaporkan setelah tap', typeof audio==='string' && audio!=='-');

  c('nol error JS saat muat', galat.length===0);

  var d=document.createElement('div'); d.id='HASIL';
  d.textContent=JSON.stringify(h); document.body.appendChild(d);
})();
</script>
"""

with tempfile.TemporaryDirectory() as tmp:
    berkas = pathlib.Path(tmp) / "uji.html"
    berkas.write_text(html.replace("</body>", periksa + "</body>"), encoding="utf-8")
    out = subprocess.run(
        ["google-chrome", "--headless=new", "--disable-gpu", "--no-sandbox",
         "--virtual-time-budget=4000", "--dump-dom", berkas.as_uri()],
        capture_output=True, text=True, timeout=180,
    )
    dom = out.stdout

m = re.search(r'id="HASIL">(\[.*?\])</div>', dom, re.S)
hasil = json.loads(m.group(1)) if m else []

print(f"payload: {len(html)} char (batas 14553)\n")
print("── pemeriksaan statis ──")
for n, l in statis:
    print(("  ✓ " if l else "  ✗ ") + n)
print("\n── di dalam Chrome ──")
if not hasil:
    print("  ✗ blok HASIL tidak ditemukan — skrip tidak jalan")
    print(dom[-900:] if dom else out.stderr[-900:])
for x in hasil:
    print(("  ✓ " if x["l"] else "  ✗ ") + x["n"])

semua = statis + [(x["n"], x["l"]) for x in hasil]
gagal = [n for n, l in semua if not l]
print(f"\n{len(semua) - len(gagal)}/{len(semua)} lulus")
if gagal or not hasil:
    print("GAGAL: " + ", ".join(gagal or ["tidak ada hasil Chrome"]))
    raise SystemExit(1)
