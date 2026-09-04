"""Muat plugin chestgame.js ke bot HIDUP tanpa pm2 restart main.

Restart main memutus sesi WA dan berkorelasi dengan insiden 401 sebelumnya,
jadi plugin disuntik lewat loader yang sudah ada di proses berjalan.
"""
import json
import urllib.error
import urllib.request

GRUP = "120363429597398620@g.us"   # EXPERIMENT saja


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


print("═══ sebelum: apakah cg sudah ada ═══")
print(ex("""
  const { getPlugin, getPluginCount } = await import('./hillz-plugins.js');
  return JSON.stringify({ cg: !!getPlugin('cg'), total: getPluginCount() });
""").get("result", "?"))

print("\n═══ muat plugin ═══")
# loadPlugin() cuma MENGURAI berkas dan mengembalikan objek plugin — ia tidak
# mendaftarkan apa pun. Pendaftaran ke pluginStore adalah tugas registerPlugin,
# jadi dua-duanya harus dipanggil. Ini sebabnya percobaan pertama melaporkan
# "ok" tapi getPlugin('cg') tetap false.
print(ex("""
  const { loadPlugin, registerPlugin, getPlugin, getPluginCount } = await import('./hillz-plugins.js');
  const jalur = '/root/shirowahd/plugins/game/chestgame.js';
  let pInfo;
  try { pInfo = await loadPlugin(jalur, true); } catch (e) { return 'GAGAL muat: ' + e.message; }
  if (!pInfo) return 'GAGAL: loadPlugin balas null (config/handler tidak terbaca)';
  const terdaftar = registerPlugin(pInfo);
  const p = getPlugin('cg');
  return JSON.stringify({
    terdaftar,
    cgTerdaftar: !!p,
    namaTerdaftar: p ? p.config?.name : null,
    aliasTerdaftar: p ? p.config?.alias : null,
    adaHandler: p ? typeof p.handler : null,
    isGroup: p ? p.config?.isGroup : null,
    total: getPluginCount(),
  });
""").get("result", "?"))

print("\n═══ alias juga hidup? ═══")
print(ex("""
  const { getPlugin } = await import('./hillz-plugins.js');
  const h = {};
  for (const n of ['cg','chestgame','cgame','petiweb']) h[n] = !!getPlugin(n);
  return JSON.stringify(h);
""").get("result", "?"))
