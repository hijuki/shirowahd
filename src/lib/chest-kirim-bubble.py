"""Kirim bubble CHEST multiplayer ke grup — versi state-di-server.

Beda dari probe sebelumnya: HTML-nya bukan game mandiri lagi, tapi klien
tipis yang menembak /api/chest/*. Token HMAC ditanam di sini, dicetak oleh
mesin yang sama seperti server, jadi tidak perlu endpoint pencetak token
publik yang bisa disalahgunakan.

Sekalian membersihkan sisa pemain uji (UjiA/UjiB) dari ruang grup ini,
supaya papan yang tuan lihat benar-benar mulai bersih.
"""
import json
import pathlib
import subprocess
import urllib.error
import urllib.request

GRUP = "120363429597398620@g.us"   # grup EXPERIMENT — satu-satunya tempat uji
                                    # yang diizinkan user. Grup lain jangan.
BASIS = "https://swhdhlz.my.id"
AKAR = pathlib.Path("/root/shirowahd")
BUBBLE = AKAR / "chest-web" / "bubble.html"

# ── 1. bersihkan ruang dari pemain uji ────────────────────────────────
bersih = subprocess.run(
    ["node", "-e", """
      const m = await import('./src/lib/chest-server.js');
      const id = m.idRuang(process.argv[1]);
      const db = m.muat();
      const ada = !!db.ruang[id];
      delete db.ruang[id];
      m.simpan(db);
      console.log(JSON.stringify({ ruang: id, adaSebelumnya: ada, dibersihkan: true }));
    """.replace("await import", "await import"), GRUP],
    cwd=AKAR, capture_output=True, text=True, timeout=90,
)
print("bersihkan ruang uji:", (bersih.stdout or bersih.stderr).strip()[:200])

# ── 2. cetak token untuk grup ini ─────────────────────────────────────
tok = subprocess.run(
    ["node", "-e",
     "import('./src/lib/chest-server.js').then(m=>console.log(m.buatToken(process.argv[1])))",
     GRUP],
    cwd=AKAR, capture_output=True, text=True, timeout=90,
).stdout.strip()
if not tok or "." not in tok:
    raise SystemExit("gagal mencetak token: " + tok[:200])
print(f"token grup dicetak: {len(tok)} char")

# ── 3. siapkan payload ────────────────────────────────────────────────
html = BUBBLE.read_text(encoding="utf-8").replace("__API__", BASIS).replace("__TOKEN__", tok)
print(f"payload bubble: {len(html)} char (batas aman 14553)"
      f" → {'✓ masuk' if len(html) < 14553 else '✗ KEBESARAN'}")
if len(html) >= 14553:
    raise SystemExit("payload kebesaran, hentikan")


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


# ── 4. hapus bubble v1 kalau ada, lalu kirim v2 + sadap ack ───────────
kode = """
  const { generateWAMessageFromContent } = await import('hillz');
  const crypto = await import('crypto');
  const html = %s;
  const jid = %s;

  // Buang bubble versi lama supaya chat tidak menumpuk dan tuan tidak
  // perlu menebak bubble mana yang terbaru.
  const lama = global.__chestBubbleId;
  if (lama) {
    try { await sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: true, id: lama } }); } catch {}
    await new Promise(s => setTimeout(s, 700));
  }

  const catat = {};
  const onU = (arr) => { for (const u of arr) if (u.key?.id) catat[u.key.id] = { st: u.update?.status, err: u.update?.messageStubParameters }; };
  sock.ev.on('messages.update', onU);

  const msg = generateWAMessageFromContent(jid, {
    botForwardedMessage: { message: { richResponseMessage: {
      messageType: 1,
      unifiedResponse: { data: Buffer.from(JSON.stringify({
        __typename: 'GenAIUnifiedResponse',
        response_id: crypto.randomUUID(),
        sections: [{
          __typename: 'GenAIUnifiedResponseSection',
          view_model: {
            __typename: 'GenAISingleLayoutViewModel',
            primitive: {
              __typename: 'FOAHtmlPrimitiveDemoDONOTUSE',
              trusted_sources: [],
              payload: html.trim()
            }
          }
        }]
      })).toString('base64') },
      contextInfo: { isForwarded: true, forwardOrigin: 4 }
    } } }
  }, {});

  await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  const id = msg.key.id;
  global.__chestBubbleId = id;

  await new Promise(s => setTimeout(s, 20000));
  sock.ev.off('messages.update', onU);
  const a = catat[id];
  return JSON.stringify({ id, hapusLama: lama || null, ack: a || 'sunyi (tidak ditolak)', ditolak463: a?.err?.[0] === '463' });
""" % (json.dumps(html), json.dumps(GRUP))

hasil = ex(kode)
print("\nhasil kirim:", json.dumps(hasil.get("result", hasil), ensure_ascii=False)[:400])
