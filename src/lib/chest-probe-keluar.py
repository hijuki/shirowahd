"""Probe jalur KELUAR non-jaringan: bisakah tap di bubble menghasilkan
perintah WA tanpa satu pun request HTTP?

Kesimpulan yang sudah terbukti mahal: bubble webview MEMBLOKIR SEMUA
jaringan. img, <script>, XHR — tiga-tiganya mati di kelima varian
trusted_sources ([], domain, "*", gabungan). Jadi state TIDAK BISA
digerakkan dari dalam bubble lewat HTTP. Titik.

Yang belum diuji: jalur yang bukan jaringan sama sekali.

  P1 clipboard modern   navigator.clipboard.writeText()
  P2 clipboard lama     textarea + document.execCommand('copy')
  P3 deep link wa       <a href="whatsapp://send?text=...">
  P4 deep link https    <a href="https://wa.me/?text=...">
  P5 target _blank      window.open('whatsapp://send?text=...')

Kalau salah satu hidup, tap di bubble tetap bisa jadi perintah — user cuma
perlu tekan kirim. Kalau semuanya mati, satu-satunya kanal keluar adalah
user mengetik sendiri, dan bubble murni jadi papan tampilan.

Tiap kartu melaporkan hasilnya sendiri dengan huruf besar supaya tuan bisa
lapor satu kata per baris.
"""
import json
import time
import urllib.error
import urllib.request

GRUP = "120363429597398620@g.us"   # grup EXPERIMENT saja

HTML = """<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box;margin:0;-webkit-tap-highlight-color:transparent}
body{background:#0b1020;color:#e8ecf8;font:13px/1.55 -apple-system,system-ui,sans-serif;padding:12px}
.w{max-width:340px;margin:0 auto}
h1{font-size:15px;margin-bottom:3px}
.sub{font-size:10px;color:#8b96b8;margin-bottom:11px}
.row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.bt{flex:1;background:#1e293b;color:#fff;border:1px solid #334155;border-radius:9px;
    padding:11px 12px;font-size:12.5px;font-weight:700;cursor:pointer;text-align:left;
    text-decoration:none;display:block}
.bt:active{background:#2563eb}
.st{width:74px;text-align:right;font-family:ui-monospace,monospace;font-size:12px;font-weight:800}
.wt{color:#8b96b8}.ok{color:#4ade80}.no{color:#fca5a5}
.hint{margin-top:11px;background:#101830;border:1px solid #1f2a48;border-radius:9px;padding:10px}
.hint b{color:#fbbf24}
code{background:#0b1020;border:1px solid #1f2a48;border-radius:5px;padding:2px 6px;
     font-family:ui-monospace,monospace;font-size:12.5px;color:#7dd3fc}
</style></head><body><div class="w">
<h1>UJI JALUR KELUAR (tanpa jaringan)</h1>
<div class="sub">jaringan sudah terbukti mati semua — ini menguji jalur lain</div>

<div class="row"><div class="bt" onclick="p1()">P1 · clipboard modern</div><div class="st wt" id="s1">-</div></div>
<div class="row"><div class="bt" onclick="p2()">P2 · clipboard lama (execCommand)</div><div class="st wt" id="s2">-</div></div>
<div class="row"><a class="bt" href="whatsapp://send?text=.cg%20buka%207" onclick="tandai('s3')">P3 · buka whatsapp://send</a><div class="st wt" id="s3">-</div></div>
<div class="row"><a class="bt" href="https://wa.me/?text=.cg%20buka%207" onclick="tandai('s4')">P4 · buka wa.me/?text</a><div class="st wt" id="s4">-</div></div>
<div class="row"><div class="bt" onclick="p5()">P5 · window.open deep link</div><div class="st wt" id="s5">-</div></div>

<div class="hint">Kalau P1/P2 <b>OK</b>: perintah sudah nempel di clipboard,
tuan tinggal tempel di kolom chat lalu kirim.<br>
Kalau P3/P4/P5 membuka kolom chat berisi <code>.cg buka 7</code>, itu jalur terbaik.<br>
Kalau semua mati: bubble jadi papan tampilan, perintah diketik manual.</div>

<textarea id="tx" style="position:fixed;left:-9999px;top:0;width:1px;height:1px"></textarea>
</div><script>
var PERINTAH='.cg buka 7';
function set(i,t,ok){var e=document.getElementById(i);e.textContent=t;e.className='st '+(ok?'ok':'no')}
function tandai(i){set(i,'DITAP',1)}
function p1(){
  try{
    if(!navigator.clipboard||!navigator.clipboard.writeText){set('s1','TIDAK ADA',0);return}
    navigator.clipboard.writeText(PERINTAH).then(function(){set('s1','OK',1)},
      function(e){set('s1','TOLAK',0)});
    setTimeout(function(){if(document.getElementById('s1').textContent==='-')set('s1','DIAM',0)},4000);
  }catch(e){set('s1','MATI',0)}
}
function p2(){
  try{
    var t=document.getElementById('tx');t.value=PERINTAH;t.focus();t.select();
    var ok=document.execCommand('copy');
    set('s2',ok?'OK':'GAGAL',ok);
  }catch(e){set('s2','MATI',0)}
}
function p5(){
  try{
    var w=window.open('whatsapp://send?text='+encodeURIComponent(PERINTAH),'_blank');
    set('s5',w?'DIBUKA':'DIBLOKIR',!!w);
  }catch(e){set('s5','MATI',0)}
}
</script></body></html>"""


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
        return {"raw": raw[:400]}


kode = """
  const { generateWAMessageFromContent } = await import('hillz');
  const crypto = await import('crypto');
  const html = %s, jid = %s;
  const msg = generateWAMessageFromContent(jid, {
    botForwardedMessage: { message: { richResponseMessage: {
      messageType: 1,
      unifiedResponse: { data: Buffer.from(JSON.stringify({
        __typename: 'GenAIUnifiedResponse',
        response_id: crypto.randomUUID(),
        sections: [{ __typename: 'GenAIUnifiedResponseSection',
          view_model: { __typename: 'GenAISingleLayoutViewModel',
            primitive: { __typename: 'FOAHtmlPrimitiveDemoDONOTUSE',
              trusted_sources: [], payload: html.trim() } } }]
      })).toString('base64') },
      contextInfo: { isForwarded: true, forwardOrigin: 4 }
    } } }
  }, {});
  await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  global.__idKeluar = msg.key.id;
  return msg.key.id;
""" % (json.dumps(HTML), json.dumps(GRUP))

print(f"payload: {len(HTML)} char (batas aman 14553)")
r = ex(kode)
print("kirim ke EXPERIMENT:", r.get("result", r))
time.sleep(3)
print("ack:", ex("""
  const id = global.__idKeluar;
  return JSON.stringify({ id, catatan: 'ack sunyi = tidak ditolak' });
""").get("result", "?"))
