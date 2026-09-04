"""Uji hipotesis `trusted_sources` — kenapa SEMUA jalur jaringan mati.

Petunjuk yang selama ini terlewat ada di envelope-nya sendiri:

    primitive: {
      __typename: 'FOAHtmlPrimitiveDemoDONOTUSE',
      trusted_sources: [],      <-- SELALU KOSONG selama ini
      payload: html
    }

Nama field itu terlalu pas untuk kebetulan: daftar sumber yang dipercaya.
Kalau isinya kosong, wajar kalau webview memblokir SEMUA request keluar —
dan itu persis gejalanya: CSS jalan, onclick jalan, suara jalan (semua
inline, nol jaringan), tapi img/script/xhr tiga-tiganya mati.

Server sudah dipastikan sehat dari luar: ping.gif 200 image/gif 42 byte,
JSONP 200, dari UA WhatsApp maupun tanpa UA. Jadi yang menolak bukan server.

Dikirim 5 varian bertag N1-N5 dengan isi HTML IDENTIK dan hanya
`trusted_sources` yang berbeda. Bubble-nya sengaja kecil dan cuma menampilkan
hasil tiga probe dengan huruf besar, supaya tuan bisa lapor satu kata.
"""
import json
import pathlib
import subprocess
import time
import urllib.error
import urllib.request

GRUP = "120363429597398620@g.us"   # grup EXPERIMENT saja
BASIS = "https://swhdhlz.my.id"
AKAR = pathlib.Path("/root/shirowahd")

tok = subprocess.run(
    ["node", "-e",
     "import('./src/lib/chest-server.js').then(m=>console.log(m.buatToken(process.argv[1])))",
     GRUP],
    cwd=AKAR, capture_output=True, text=True, timeout=90,
).stdout.strip()

# Bubble probe: kecil, tiga jalur, hasil ditampilkan besar-besar.
HTML = """<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box;margin:0}
body{background:#0b1020;color:#e8ecf8;font:13px/1.5 -apple-system,system-ui,sans-serif;padding:12px}
.w{max-width:330px;margin:0 auto}
h1{font-size:16px;margin-bottom:2px}
.tag{display:inline-block;background:#2563eb;color:#fff;border-radius:6px;padding:2px 9px;font-size:15px;font-weight:800;letter-spacing:1px}
.sub{font-size:10px;color:#8b96b8;margin:6px 0 10px}
.b{display:block;background:#334155;color:#fff;border:1px solid #475569;border-radius:8px;
   padding:11px;font-size:13px;font-weight:800;text-align:center;cursor:pointer;margin-bottom:9px}
.r{background:#101830;border:1px solid #1f2a48;border-radius:8px;padding:9px 11px;font-family:ui-monospace,monospace;font-size:13px;line-height:1.9}
.r div{display:flex;justify-content:space-between}
.ok{color:#4ade80;font-weight:800}.no{color:#fca5a5;font-weight:800}.wt{color:#8b96b8}
img.p{width:1px;height:1px;opacity:.01}
</style></head><body><div class="w">
<h1><span class="tag">__TAG__</span> uji jaringan</h1>
<div class="sub">trusted_sources: __KET__</div>
<div class="b" onclick="jalan()">TAP UNTUK MULAI UJI</div>
<div class="r">
  <div><span>img</span><span id="a" class="wt">-</span></div>
  <div><span>script</span><span id="b" class="wt">-</span></div>
  <div><span>xhr</span><span id="c" class="wt">-</span></div>
</div>
<img class="p" id="pas" alt="">
</div><script>
var API='__API__',T='__TOKEN__';
function set(i,t,ok){var e=document.getElementById(i);e.textContent=t;e.className=ok?'ok':'no'}
function jalan(){
  document.getElementById('a').textContent='...';
  document.getElementById('b').textContent='...';
  document.getElementById('c').textContent='...';
  var im=new Image(),sudahI=0;
  im.onload=function(){sudahI=1;set('a','OK',1)};
  im.onerror=function(){if(!sudahI)set('a','TOLAK',0)};
  setTimeout(function(){if(!sudahI&&document.getElementById('a').textContent==='...')set('a','TIMEOUT',0)},8000);
  im.src=API+'/api/chest/ping.gif?x='+Date.now();

  var nm='__jp'+Math.floor(Math.random()*1e6),sudahS=0;
  window[nm]=function(d){sudahS=1;set('b','OK',1)};
  var s=document.createElement('script');
  s.onerror=function(){if(!sudahS)set('b','TOLAK',0)};
  setTimeout(function(){if(!sudahS&&document.getElementById('b').textContent==='...')set('b','TIMEOUT',0)},9000);
  s.src=API+'/api/chest/lihat?t='+encodeURIComponent(T)+'&nama=Probe&callback='+nm;
  document.head.appendChild(s);

  try{
    var x=new XMLHttpRequest();x.open('GET',API+'/api/chest/ping.gif?y='+Date.now(),true);x.timeout=9000;
    x.onload=function(){set('c','OK',1)};
    x.onerror=function(){set('c','TOLAK',0)};
    x.ontimeout=function(){set('c','TIMEOUT',0)};
    x.send(null);
  }catch(e){set('c','MATI',0)}
}
document.getElementById('pas').src=API+'/api/chest/ping.gif?pasif='+Date.now();
</script></body></html>"""

# Isi HTML identik; HANYA trusted_sources yang beda.
VARIAN = [
    ("N1", [], "[] (kosong — seperti selama ini)"),
    ("N2", [BASIS], '["https://swhdhlz.my.id"]'),
    ("N3", ["swhdhlz.my.id"], '["swhdhlz.my.id"]'),
    ("N4", ["*"], '["*"]'),
    ("N5", [BASIS, "swhdhlz.my.id", BASIS + "/", "*"], "gabungan 4 bentuk"),
]


def ex(code, timeout=180):
    req = urllib.request.Request(
        "http://127.0.0.1:8081/exec",
        data=json.dumps({"code": code, "target": GRUP}).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        raw = urllib.request.urlopen(req, timeout=timeout).read().decode()
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
    except Exception as e:
        return {"gagal": f"{type(e).__name__}: {e}"}
    try:
        return json.loads(raw)
    except Exception:
        return {"raw": raw[:300]}


# Buang bubble CHEST v3 dulu supaya grup tidak penuh.
buang = ex("""
  const id = global.__chestBubbleId;
  if (!id) return 'tidak ada bubble tercatat';
  try { await sock.sendMessage(%s, { delete: { remoteJid: %s, fromMe: true, id } }); } catch (e) { return 'gagal: ' + e.message; }
  delete global.__chestBubbleId;
  return 'bubble v3 dihapus: ' + id;
""" % (json.dumps(GRUP), json.dumps(GRUP)))
print("bersihkan:", buang.get("result", buang))

hasil = []
for tag, ts, ket in VARIAN:
    html = (HTML.replace("__TAG__", tag).replace("__KET__", ket)
            .replace("__API__", BASIS).replace("__TOKEN__", tok))
    kode = """
      const { generateWAMessageFromContent } = await import('hillz');
      const crypto = await import('crypto');
      const html = %s, jid = %s, ts = %s;
      const msg = generateWAMessageFromContent(jid, {
        botForwardedMessage: { message: { richResponseMessage: {
          messageType: 1,
          unifiedResponse: { data: Buffer.from(JSON.stringify({
            __typename: 'GenAIUnifiedResponse',
            response_id: crypto.randomUUID(),
            sections: [{ __typename: 'GenAIUnifiedResponseSection',
              view_model: { __typename: 'GenAISingleLayoutViewModel',
                primitive: { __typename: 'FOAHtmlPrimitiveDemoDONOTUSE',
                  trusted_sources: ts, payload: html.trim() } } }]
          })).toString('base64') },
          contextInfo: { isForwarded: true, forwardOrigin: 4 }
        } } }
      }, {});
      await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
      if (!global.__idNet) global.__idNet = {};
      global.__idNet[%s] = msg.key.id;
      return msg.key.id;
    """ % (json.dumps(html), json.dumps(GRUP), json.dumps(ts), json.dumps(tag))
    r = ex(kode)
    ok = isinstance(r.get("result"), str) and len(r.get("result", "")) > 10
    hasil.append(f"  {'✓' if ok else '✗'} {tag}  trusted_sources={ket:34s} {r.get('result', r)}")
    time.sleep(4)

print(f"payload per bubble: {len(HTML)} char\n")
print("\n".join(hasil))
print("\nTuan tap 'TAP UNTUK MULAI UJI' di TIAP bubble N1-N5,")
print("lalu lapor tag mana yang img/script/xhr-nya OK.")
