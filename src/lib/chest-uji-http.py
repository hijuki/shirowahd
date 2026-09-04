"""Uji API CHEST lewat HTTP sungguhan (bukan lewat impor modul).

Kenapa perlu terpisah dari uji mesin: 56 uji itu membuktikan LOGIKA benar.
Ini membuktikan RUTE-nya hidup di proses web yang sedang jalan, token
ditolak/diterima sebagaimana mestinya, dan dua "pemain" HTTP terpisah
benar-benar melihat papan yang sama.
"""
import json
import subprocess
import urllib.error
import urllib.parse
import urllib.request

BASIS = "https://swhdhlz.my.id"
JID = "120363429597398620@g.us"   # grup EXPERIMENT

# Token dicetak lewat mesin yang sama seperti bot nanti — bukan lewat
# endpoint publik, karena endpoint pencetak token memang sengaja tidak ada.
tok = subprocess.run(
    ["node", "-e",
     "import('./src/lib/chest-server.js').then(m=>console.log(m.buatToken(process.argv[1])))",
     JID],
    cwd="/root/shirowahd", capture_output=True, text=True, timeout=60,
).stdout.strip()

uji = []


UA = ("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")


def cek(nama, syarat):
    uji.append((nama, bool(syarat)))


def panggil(aksi, data=None, token=None, metode=None):
    token = tok if token is None else token
    metode = metode or ("GET" if aksi == "lihat" else "POST")
    url = f"{BASIS}/api/chest/{aksi}"
    body = None
    if metode == "GET":
        url += "?" + urllib.parse.urlencode({"t": token, **(data or {})})
    else:
        body = json.dumps({**(data or {}), "t": token}).encode()
    # UA browser wajib: Cloudflare menolak urllib tanpa UA dan menjawab 403,
    # yang tadi terbaca seolah rute-nya rusak padahal cuma diblokir di depan.
    req = urllib.request.Request(url, data=body, method=metode,
                                 headers={"Content-Type": "application/json",
                                          "User-Agent": UA})
    try:
        r = urllib.request.urlopen(req, timeout=25)
        return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}
    except Exception as e:
        return 0, {"gagal": f"{type(e).__name__}: {e}"}


print(f"token dicetak: {len(tok)} char\n")

st, d = panggil("lihat", {"nama": "UjiA"})
cek("GET /lihat dengan token sah → 200", st == 200 and d.get("ok"))
cek("pandangan bawa papan 16 petak", len(d.get("papan", [])) == 16)
cek("petak tertutup tidak bocorkan bom",
    all("bom" not in s for s in d.get("papan", []) if not s.get("buka")))

st, d = panggil("lihat", {"nama": "UjiA"}, token="palsu.token")
cek("token palsu → 403", st == 403)
st, d = panggil("lihat", {"nama": "UjiA"}, token="")
cek("token kosong → 403", st == 403)

st, d = panggil("gabung", {"nama": "UjiA"})
cek("POST /gabung → 200", st == 200 and d.get("ok"))
cek("jawaban gabung bawa papanBaru", "papanBaru" in d)

st, d = panggil("gabung", {"nama": "UjiB"})
cek("pemain kedua gabung", st == 200 and d.get("ok"))
nama_pemain = [p["nama"] for p in d.get("papanBaru", {}).get("pemain", [])]
cek("dua pemain di papan yang SAMA", "UjiA" in nama_pemain and "UjiB" in nama_pemain)

st, d = panggil("gabung", {"nama": "<script>x</script>"})
cek("nama dengan tag HTML dibersihkan",
    st == 200 and "<" not in json.dumps(d.get("papanBaru", {}).get("pemain", [])))

# Giliran: satu boleh, yang lain harus ditolak.
_, v = panggil("lihat", {"nama": "UjiA"})
giliran = v.get("giliran")
bukan = "UjiB" if giliran == "UjiA" else "UjiA"
st, d = panggil("buka", {"nama": bukan, "i": 0})
cek("bukan giliran → 409 ditolak", st == 409 and not d.get("ok"))

st, d = panggil("buka", {"nama": giliran, "i": 0})
cek("giliran benar → petak terbuka", st == 200 and d.get("ok"))
st, d = panggil("buka", {"nama": giliran, "i": 0})
cek("petak sama 2x → ditolak", st == 409)

st, d = panggil("buka", {"nama": giliran, "i": 999})
cek("indeks di luar papan → ditolak", st == 409)

st, d = panggil("lihat", {"nama": "UjiA"}, metode="POST")
cek("aksi tak dikenal → 404", panggil("ngaco", {"nama": "UjiA"})[0] == 404)

# PERSISTENSI: token baru (seolah bubble dibuka ulang) harus lihat papan lama.
tok2 = subprocess.run(
    ["node", "-e",
     "import('./src/lib/chest-server.js').then(m=>console.log(m.buatToken(process.argv[1])))",
     JID],
    cwd="/root/shirowahd", capture_output=True, text=True, timeout=60,
).stdout.strip()
st, d2 = panggil("lihat", {"nama": "UjiA"}, token=tok2)
cek("token BARU lihat papan LAMA (progres tidak ngulang)",
    st == 200 and any(s.get("buka") for s in d2.get("papan", [])))
cek("skor pemain selamat", any(p["nama"] == "UjiA" for p in d2.get("pemain", [])))

# Rute lama tidak terganggu.
for p in ["/", "/chest", "/api/stats/public", "/api/settings/public"]:
    try:
        rq = urllib.request.Request(BASIS + p, headers={"User-Agent": UA})
        c = urllib.request.urlopen(rq, timeout=20).status
    except urllib.error.HTTPError as e:
        c = e.code
    except Exception:
        c = 0
    cek(f"rute lama {p} tetap 200", c == 200)

for nama, lulus in uji:
    print(("  ✓ " if lulus else "  ✗ ") + nama)
gagal = [n for n, l in uji if not l]
print(f"\n{len(uji) - len(gagal)}/{len(uji)} uji HTTP lulus")
if gagal:
    print("GAGAL: " + ", ".join(gagal))
