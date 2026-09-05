import { getDatabase } from "../../src/lib/hillz-database.js";
import { saluranCtx } from "../../src/lib/hillz-context.js";
import { AMBANG_BAKU, JEDA_BAKU, GAYA, GAYA_BAKU } from "../../src/lib/hillz-reaksi.js";
import config from "../../config.js";

const pluginConfig = {
  name: "reaksiproses",
  alias: ["reaksi", "loadingreact"],
  category: "owner",
  description: "Reaksi beranimasi 🕐🕑🕒 saat perintah diproses, lalu ✅/❌",
  usage: ".reaksiproses on/off/<ms>/gaya <nama>/jeda <ms>",
  example: ".reaksiproses gaya pasir",
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
  const teks = m.text?.trim() || "";
  const opsi = teks.toLowerCase();

  const aktif = db.setting("reaksiProses") ?? config.features?.reaksiProses ?? true;
  const ambang = db.setting("reaksiAmbang") ?? config.features?.reaksiAmbang ?? AMBANG_BAKU;
  const jeda = db.setting("reaksiJeda") ?? config.features?.reaksiJeda ?? JEDA_BAKU;
  const gaya = db.setting("reaksiGaya") ?? config.features?.reaksiGaya ?? GAYA_BAKU;

  const contohGaya = (nama) => (GAYA[nama] || []).slice(0, 6).join("");

  if (!opsi) {
    let daftar = "";
    for (const nama of Object.keys(GAYA)) {
      daftar += `> *${nama}*${nama === gaya ? " ← dipakai" : ""} — ${contohGaya(nama)}\n`;
    }
    return m.reply(
      `🕐 *Reaksi Proses Beranimasi*\n\n` +
        `> Status: *${aktif ? "Aktif ✅" : "Nonaktif ❌"}*\n` +
        `> Gaya: *${gaya}* ${contohGaya(gaya)}\n` +
        `> Mulai setelah: *${ambang} ms*\n` +
        `> Jeda bingkai: *${jeda} ms*\n\n` +
        `*CARA KERJA:*\n` +
        `> Perintah kelar di bawah *${ambang} ms* → tidak ada reaksi\n` +
        `> Lebih lama → emoji BERPUTAR terus sampai kelar\n` +
        `> Selesai → ✅ | Error → ❌\n` +
        `> Plugin yang sudah punya reaksi sendiri tidak diganggu\n\n` +
        `*GAYA TERSEDIA:*\n${daftar}\n` +
        `*PENGGUNAAN:*\n` +
        `> *${m.prefix}reaksiproses on* / *off*\n` +
        `> *${m.prefix}reaksiproses 2000* — ubah kapan animasi mulai\n` +
        `> *${m.prefix}reaksiproses gaya pasir* — ganti gaya\n` +
        `> *${m.prefix}reaksiproses jeda 800* — kecepatan putaran`
    );
  }

  if (opsi === "on") {
    db.setting("reaksiProses", true);
    return m.reply(
      `🕐 *Reaksi Proses Aktif*\n\n` +
        `> Gaya *${gaya}* ${contohGaya(gaya)}\n` +
        `> Berputar tiap *${jeda} ms* pada perintah yang lewat *${ambang} ms*`,
      { contextInfo: saluranCtx() }
    );
  }

  if (opsi === "off") {
    db.setting("reaksiProses", false);
    return m.reply(`🕐 *Reaksi Proses Nonaktif*\n\n> Bot tidak menandai perintah dengan reaksi lagi`);
  }

  // ── ganti gaya ──
  if (opsi.startsWith("gaya")) {
    const pilih = opsi.replace(/^gaya\s*/, "").trim();
    if (!pilih) {
      return m.reply(
        `🎨 *Pilih Gaya*\n\n` +
          Object.keys(GAYA).map((n) => `> *${n}* — ${contohGaya(n)}`).join("\n") +
          `\n\n_Contoh: ${m.prefix}reaksiproses gaya pasir_`
      );
    }
    if (!GAYA[pilih]) {
      return m.reply(
        `❌ *Gaya "${pilih}" Tidak Ada*\n\n> Yang tersedia: *${Object.keys(GAYA).join(", ")}*`
      );
    }
    db.setting("reaksiGaya", pilih);
    return m.reply(
      `🎨 *Gaya Diubah*\n\n> Dari *${gaya}* → *${pilih}*\n> ${GAYA[pilih].join("")}`
    );
  }

  // ── ganti jeda antar bingkai ──
  if (opsi.startsWith("jeda")) {
    const angka = Number.parseInt(opsi.replace(/^jeda\s*/, ""), 10);
    if (!Number.isFinite(angka)) {
      return m.reply(`❌ *Butuh Angka*\n\n> Contoh: *${m.prefix}reaksiproses jeda 800*`);
    }
    // Lantai 400 ms: tiap bingkai satu sendMessage ke server WhatsApp. Di 100 ms,
    // perintah 30 detik menembakkan 300 pesan untuk satu pesan saja — itu cara
    // cepat kena batas kirim. Atap 10 detik: lebih lambat dari itu tidak terlihat
    // sebagai animasi lagi.
    if (angka < 400 || angka > 10000) {
      return m.reply(
        `❌ *Jeda Di Luar Batas*\n\n` +
          `> Masukkan *400* – *10000* ms\n` +
          `> Sekarang: *${jeda} ms*\n\n` +
          `_Di bawah 400 ms bot menembakkan terlalu banyak reaksi ke server WhatsApp_`
      );
    }
    db.setting("reaksiJeda", angka);
    return m.reply(`⏱️ *Jeda Diubah*\n\n> Dari *${jeda} ms* → *${angka} ms* per bingkai`);
  }

  // ── angka polos = ambang mulai ──
  const angka = Number.parseInt(opsi, 10);
  if (Number.isFinite(angka)) {
    if (angka < 200 || angka > 15000) {
      return m.reply(
        `❌ *Ambang Di Luar Batas*\n\n> Masukkan *200* – *15000* ms\n> Sekarang: *${ambang} ms*`
      );
    }
    db.setting("reaksiAmbang", angka);
    return m.reply(
      `⏱️ *Ambang Diubah*\n\n> Dari *${ambang} ms* → *${angka} ms*\n\n` +
        `_Perintah yang kelar lebih cepat dari ini tetap senyap_`
    );
  }

  return m.reply(
    `❌ *Opsi Tidak Valid*\n\n` +
      `> *${m.prefix}reaksiproses* — lihat status\n` +
      `> *on* / *off* / *<ms>* / *gaya <nama>* / *jeda <ms>*`
  );
}

export { pluginConfig as config, handler };
