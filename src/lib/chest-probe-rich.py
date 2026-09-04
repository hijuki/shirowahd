"""PROBE 6 VARIAN RICH MESSAGE — kirim ke owner, tanpa plugin, tanpa restart.

Kenapa lewat /exec dan bukan plugin: plugin butuh restart `main`, dan
restart itu yang minggu ini bikin sesi WA kena 401. Probe ini nol risiko —
cuma memanggil metode kirim pada sock yang sudah hidup.

Tiap pesan diberi tag C1..C6 di badannya supaya tuan bisa lapor mana yang
render. Semua id pesan dicatat ke /tmp/_chest_probe_ids.json biar bisa
dihapus bersih setelahnya.
"""
import json
import pathlib
import urllib.error
import urllib.request

OWNER = "6282262421536@s.whatsapp.net"
BUBBLE = pathlib.Path("/root/shirowahd/chest-web/bubble.html")
CATATAN = pathlib.Path("/tmp/_chest_probe_ids.json")


def ex(code, timeout=90):
    """Panggil /exec.

    Dua hal yang bikin percobaan pertama gagal, dan sengaja ditulis di sini:

    1. /exec mewajibkan field `target` kalau KODE-nya menyebut kata 'target'
       (`/\\btarget\\b/`). HTML bubble punya `target="_blank"` di tag <a>,
       jadi pengecekan itu ikut kena walau tidak ada hubungannya. Karena itu
       `target` selalu dikirim.
    2. /exec menjawab error sebagai HTTP 500/400 dengan badan JSON. urllib
       melempar HTTPError, jadi badannya harus dibaca dari exception —
       kalau tidak, pesan error aslinya hilang dan semua kegagalan tampak
       seperti "Bad Request".
    """
    req = urllib.request.Request(
        "http://127.0.0.1:8081/exec",
        data=json.dumps({"code": code, "target": OWNER}).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        raw = urllib.request.urlopen(req, timeout=timeout).read().decode()
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}
    try:
        return json.loads(raw)
    except Exception:
        return {"raw": raw[:500]}


html = BUBBLE.read_text(encoding="utf-8").strip()
print(f"bubble.html = {len(html)} char (batas aman 14553) "
      f"→ {'✓ masuk' if len(html) < 14553 else '✗ KEBESARAN'}\n")

JID = json.dumps(OWNER)
HTML = json.dumps(html)

VARIAN = {
    # C1 — HTML primitive. Satu-satunya jalur yang bisa merender game
    # sungguhan DI DALAM bubble. Payload lewat unifiedResponse base64.
    "C1 html-primitive": f"""
      const m = await import('hillz');
      const crypto = await import('crypto');
      const payload = {{
        __typename: "GenAIUnifiedResponse",
        response_id: crypto.randomUUID(),
        sections: [{{
          __typename: "GenAIUnifiedResponseSection",
          view_model: {{
            __typename: "GenAISingleLayoutViewModel",
            primitive: {{
              __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
              trusted_sources: [],
              payload: {HTML}
            }}
          }}
        }}]
      }};
      const msg = m.generateWAMessageFromContent({JID}, {{
        botForwardedMessage: {{ message: {{ richResponseMessage: {{
          messageType: 1,
          unifiedResponse: {{ data: Buffer.from(JSON.stringify(payload)).toString('base64') }},
          contextInfo: {{ isForwarded: true, forwardOrigin: 4 }}
        }} }} }}
      }}, {{}});
      await sock.relayMessage({JID}, msg.message, {{ messageId: msg.key.id }});
      return msg.key.id;
    """,

    # C2 — sendRichMessage: TEXT + TABLE, jalur resmi lib. Tidak bisa
    # interaktif, tapi paling mungkin selamat di semua versi WA.
    "C2 rich text+table": f"""
      const r = await sock.sendRichMessage({JID}, [
        {{ messageType: 2, messageText: "🎁 *CHEST* — probe C2 (rich text+table)\\n\\nBuka peti, cari koin, hindari bom." }},
        {{ messageType: 4, tableMetadata: {{ title: "Aturan CHEST", rows: [
          {{ items: ["Aksi", "Efek"], isHeading: true }},
          {{ items: ["Buka peti aman", "+10..90 koin"] }},
          {{ items: ["Kena bom", "koin ronde hangus"] }},
          {{ items: ["AMANKAN", "koin ronde → total"] }},
          {{ items: ["Papan bersih", "level naik"] }}
        ] }} }},
        {{ messageType: 2, messageText: "Versi penuh: https://swhdhlz.my.id/chest" }}
      ]);
      return r.messageId;
    """,

    # C3 — tombol interaktif dengan cta_url. Kalau ini hidup, entri game
    # jadi satu tap tanpa perlu HTML primitive sama sekali.
    "C3 tombol cta_url": f"""
      const r = await sock.sendButton({JID}, null,
        "🎁 *CHEST* — probe C3 (tombol interaktif)\\n\\nGame peti harta. Tap tombol buat main.",
        null, {{
          footer: "SHIROWAHD",
          buttons: [
            {{ name: "cta_url", buttonParamsJson: JSON.stringify({{
              display_text: "MAIN CHEST ↗", url: "https://swhdhlz.my.id/chest", merchant_url: "https://swhdhlz.my.id" }}) }},
            {{ name: "quick_reply", buttonParamsJson: JSON.stringify({{
              display_text: "Aturan main", id: ".chestgame aturan" }}) }}
          ]
        }});
      return r?.messageId || (r?.key?.id) || 'terkirim';
    """,

    # C4 — sendList. Bentuk tabel juga, tapi lewat jalur berbeda; dipakai
    # buat memisahkan apakah yang gagal itu TABLE-nya atau pembungkusnya.
    "C4 list": f"""
      const r = await sock.sendList({JID}, "CHEST — probe C4 (list)", [
        ["📦 16 peti tiap ronde"],
        ["💣 3 bom, jangan kena"],
        ["💰 Koin 10–90 per peti"],
        ["✅ AMANKAN sebelum kena bom"],
        ["🔗 swhdhlz.my.id/chest"]
      ], null, {{ headerText: "Cara main:", footer: "SHIROWAHD" }});
      return r.messageId;
    """,

    # C5 — code block. Bukan buat game, tapi menguji apakah submessage
    # non-teks selain tabel ikut selamat di klien tuan.
    "C5 codeblock": f"""
      const r = await sock.sendCodeBlockV2({JID},
        "// CHEST — probe C5\\nfunction buka(peti) {{\\n  if (peti.bom) return hangus();\\n  return bank + peti.nilai;\\n}}",
        null, {{ title: "🎁 CHEST — probe C5 (codeblock)", language: "javascript", footer: "swhdhlz.my.id/chest" }});
      return r.messageId;
    """,

    # C6 — link preview biasa (externalAdReply). Paling konservatif; kalau
    # semua varian rich gagal, ini pasti masih jalan sebagai jalan masuk.
    "C6 link preview": f"""
      const r = await sock.sendMessage({JID}, {{
        text: "🎁 *CHEST* — probe C6 (link preview)\\n\\nGame peti harta di web. Tap kartu di bawah.",
        contextInfo: {{ externalAdReply: {{
          title: "CHEST — Peti Harta",
          body: "Buka peti, kumpulkan koin, hindari bom",
          mediaType: 1,
          sourceUrl: "https://swhdhlz.my.id/chest",
          thumbnailUrl: "https://swhdhlz.my.id/icon-192.png",
          renderLargerThumbnail: true,
          showAdAttribution: false
        }} }}
      }});
      return r?.key?.id || 'terkirim';
    """,
}

hasil, ids = [], {}
for nama, kode in VARIAN.items():
    out = ex(kode)
    if out.get("ok"):
        ids[nama] = out.get("result")
        hasil.append(f"  ✓ {nama:22s} terkirim  id={out.get('result')}")
    else:
        err = (out.get("error") or out.get("raw") or "?")
        hasil.append(f"  ✗ {nama:22s} GAGAL: {str(err)[:150]}")

CATATAN.write_text(json.dumps(ids, indent=1), encoding="utf-8")
print("\n".join(hasil))
print(f"\n{sum(1 for h in hasil if h.strip().startswith('✓'))}/{len(VARIAN)} varian berhasil dikirim ke sisi server.")
print("Yang menentukan tetap RENDER di HP — tuan yang lapor.")
