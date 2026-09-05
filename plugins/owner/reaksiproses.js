import { getDatabase } from "../../src/lib/hillz-database.js";
import { saluranCtx } from "../../src/lib/hillz-context.js";
import { AMBANG_BAKU } from "../../src/lib/hillz-reaksi.js";
import config from "../../config.js";

const pluginConfig = {
  name: "reaksiproses",
  alias: ["reaksi", "loadingreact"],
  category: "owner",
  description: "Reaksi ⏳ → ✅/❌ pada perintah yang lama diproses",
  usage: ".reaksiproses on/off/<ms>",
  example: ".reaksiproses 1500",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const opsi = m.text?.toLowerCase()?.trim();

  const aktif = db.setting("reaksiProses") ?? config.features?.reaksiProses ?? true;
  const ambang = db.setting("reaksiAmbang") ?? config.features?.reaksiAmbang ?? AMBANG_BAKU;

  if (!opsi) {
    return m.reply(
      `⏳ *Reaksi Proses*\n\n` +
        `> Status: *${aktif ? "Aktif ✅" : "Nonaktif ❌"}*\n` +
        `> Ambang: *${ambang} ms*\n\n` +
        `*CARA KERJA:*\n` +
        `> Perintah selesai di bawah *${ambang} ms* → tidak ada reaksi\n` +
        `> Lebih lama dari itu → ⏳ lalu ✅ saat kelar\n` +
        `> Perintah error → ❌\n` +
        `> Plugin yang sudah punya reaksi sendiri tidak diganggu\n\n` +
        `*PENGGUNAAN:*\n` +
        `> *${m.prefix}reaksiproses on* — Aktifkan\n` +
        `> *${m.prefix}reaksiproses off* — Nonaktifkan\n` +
        `> *${m.prefix}reaksiproses 2000* — Ubah ambang ke 2000 ms`
    );
  }

  if (opsi === "on") {
    db.setting("reaksiProses", true);
    return m.reply(
      `⏳ *Reaksi Proses Aktif*\n\n> Perintah yang lebih lama dari *${ambang} ms* akan ditandai ⏳ lalu ✅`,
      { contextInfo: saluranCtx() }
    );
  }

  if (opsi === "off") {
    db.setting("reaksiProses", false);
    return m.reply(`⏳ *Reaksi Proses Nonaktif*\n\n> Bot tidak menandai perintah dengan reaksi lagi`);
  }

  // Angka = ubah ambang. Batas 200–15000 ms bukan asal:
  // di bawah 200 ms hampir semua perintah kena ⏳ (boros sendMessage),
  // di atas 15000 ms indikatornya jadi tidak berguna karena telat muncul.
  const angka = Number.parseInt(opsi, 10);
  if (Number.isFinite(angka)) {
    if (angka < 200 || angka > 15000) {
      return m.reply(
        `❌ *Ambang Di Luar Batas*\n\n> Masukkan antara *200* dan *15000* ms\n> Sekarang: *${ambang} ms*`
      );
    }
    db.setting("reaksiAmbang", angka);
    return m.reply(
      `⏳ *Ambang Diubah*\n\n> Dari *${ambang} ms* → *${angka} ms*\n\n` +
        `_Perintah yang selesai lebih cepat dari ini tetap senyap_`
    );
  }

  return m.reply(
    `❌ *Opsi Tidak Valid*\n\n> Gunakan *${m.prefix}reaksiproses on*, *off*, atau angka ms (contoh *1500*)`
  );
}

export { pluginConfig as config, handler };
