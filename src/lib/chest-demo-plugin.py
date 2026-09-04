"""Panggil handler chestgame ASLI di proses bot hidup, kirim ke EXPERIMENT.

Bedanya dengan uji offline (38 uji): ini memakai sock sungguhan, jadi yang
sampai ke HP adalah bubble yang benar-benar dihasilkan plugin — bukan HTML
yang ditulis terpisah oleh skrip uji. Kalau bubble ini bisa ditap dan
perintahnya tersalin, seluruh rantai terbukti: tap → clipboard → perintah
WA → state server → bubble baru.
"""
import json
import urllib.error
import urllib.request

GRUP = "120363429597398620@g.us"   # EXPERIMENT saja


def ex(code, timeout=200):
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
        return {"raw": raw[:500]}


print("═══ reset papan grup EXPERIMENT lalu kirim bubble lewat plugin ═══")
print(ex("""
  const { getPlugin } = await import('./hillz-plugins.js');
  const cs = await import('./chest-server.js');
  const jid = %s;

  // Mulai bersih supaya yang tuan lihat papan ronde 1.
  const db = cs.muat();
  delete db.ruang[cs.idRuang(jid)];
  cs.simpan(db);

  const p = getPlugin('cg');
  if (!p) return 'GAGAL: plugin cg tidak terdaftar';

  const balasan = [];
  const m = {
    chat: jid,
    pushName: 'SHIRO HLZ',
    isOwner: true,
    isAdmin: true,
    args: [],
    reply: async (t) => { balasan.push(t); await sock.sendMessage(jid, { text: t }); },
  };

  await p.handler(m, { sock, args: [], prefix: '.' });

  const v = cs.pandangan(cs.muat(), cs.idRuang(jid), 'SHIRO HLZ');
  return JSON.stringify({
    balasanKeChat: balasan.length,
    pemainTerdaftar: v.pemain.map(x => x.nama),
    ronde: v.ronde,
    sisaAman: v.sisaAman,
    giliran: v.giliran,
  });
""" % json.dumps(GRUP)).get("result", "?"))
