/**
 * hillz-reaksi.js — indikator proses berupa reaksi emoji BERANIMASI.
 *
 * Yang user minta: "kalo di proses tuh kaya reaksinya animasi gituloh ga
 * berhenti". Jadi bukan satu ⏳ yang diam, tapi bingkai emoji yang berputar
 * terus selama plugin masih bekerja, lalu berhenti di ✅ / ❌.
 *
 * CARA WHATSAPP BEKERJA, DAN KONSEKUENSINYA:
 * Reaksi WhatsApp cuma punya SATU slot per pesan — react baru menimpa yang
 * lama. Itu justru yang membuat animasi mungkin: kirim 🕐, lalu 🕑, lalu 🕒 ke
 * pesan yang sama, dan user melihat satu emoji yang berubah, bukan tumpukan.
 *
 * TAPI setiap bingkai = satu sendMessage ke server WhatsApp. Ini yang menuntun
 * tiga pagar di bawah — bukan selera saya, tapi supaya nomor tuan tidak kena
 * batas kirim:
 *
 * 1. Animasi baru MULAI setelah ambang (baku 1200 ms). Perintah cepat seperti
 *    .menu tidak dianimasi sama sekali — senyap, dan senyap berarti beres.
 * 2. Jeda antar bingkai minimal 400 ms. Di bawah itu, satu perintah 30 detik
 *    sudah menembak 75+ pesan ke server untuk satu pesan saja.
 * 3. Ada BATAS_BINGKAI. Kalau plugin menggantung (mis. unduhan mati), animasi
 *    membeku di bingkai terakhir alih-alih memutar sampai kiamat. Plugin-nya
 *    tetap jalan; yang berhenti hanya emojinya.
 *
 * DAN: 492 dari 823 plugin sudah memanggil m.react() sendiri (treasure 🎁,
 * enchant ✨→🎉/💔, arena ⚔️). Begitu salah satunya bereaksi, animasi berhenti
 * total dan mundur — kalau tidak, 🎁 hasil mereka ditimpa bingkai berikutnya
 * dan informasinya hilang.
 */

/** Jeda sebelum animasi mulai (ms). Di bawah ini: senyap. */
export const AMBANG_BAKU = 1200;

/** Jeda antar bingkai (ms). */
export const JEDA_BAKU = 1200;

/** Batas jumlah bingkai sebelum animasi membeku (plugin menggantung). */
export const BATAS_BINGKAI = 150;

/**
 * Kumpulan bingkai animasi. Dipilih yang arah gerakannya jelas terbaca di
 * layar kecil — emoji yang cuma beda warna tipis tidak kelihatan bergerak.
 */
export const GAYA = {
  // Jarum jam berputar. Paling jelas "sedang berjalan".
  jam: ["🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛"],
  // Gelas jam dibalik-balik. Paling hemat: 2 bingkai.
  pasir: ["⏳", "⌛"],
  // Fase bulan. Halus, cocok kalau tidak mau ramai.
  bulan: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
  // Panah memutar.
  putar: ["↖️", "⬆️", "↗️", "➡️", "↘️", "⬇️", "↙️", "⬅️"],
};

export const GAYA_BAKU = "jam";

/**
 * Pasang indikator beranimasi di sekitar eksekusi satu plugin.
 *
 * @param {Object} m - Pesan hasil serialize (butuh m.react).
 * @param {Object} [opsi]
 * @param {number} [opsi.ambang] - ms sebelum animasi mulai.
 * @param {number} [opsi.jeda] - ms antar bingkai (dipaksa minimal 400).
 * @param {string|string[]} [opsi.gaya] - nama dari GAYA, atau senarai emoji sendiri.
 * @param {number} [opsi.batasBingkai] - bingkai maksimum sebelum membeku.
 * @param {boolean} [opsi.animasi] - false = satu emoji diam saja.
 * @returns {{selesai: Function, gagal: Function, lepas: Function, status: Object}}
 */
export function pasangReaksi(m, opsi = {}) {
  const ambang = Number.isFinite(opsi.ambang) ? opsi.ambang : AMBANG_BAKU;
  // Lantai 400 ms ditegakkan di sini, bukan cuma di plugin pengatur — supaya
  // pemanggil mana pun tidak bisa membuat bot menembaki server WhatsApp.
  const jeda = Math.max(400, Number.isFinite(opsi.jeda) ? opsi.jeda : JEDA_BAKU);
  const batasBingkai = Number.isFinite(opsi.batasBingkai) ? opsi.batasBingkai : BATAS_BINGKAI;
  const beranimasi = opsi.animasi !== false;

  const bingkai = Array.isArray(opsi.gaya) && opsi.gaya.length
    ? opsi.gaya
    : (GAYA[opsi.gaya] || GAYA[GAYA_BAKU]);

  // Tanpa m.react modul ini wajib jadi no-op, bukan menjatuhkan perintahnya.
  const reactAsli = typeof m?.react === "function" ? m.react : null;
  if (!reactAsli) {
    const kosong = async () => null;
    return { selesai: kosong, gagal: kosong, lepas: kosong, status: {} };
  }

  let pluginBereaksi = false;
  let tampilTunggu = false;
  let tutupSudah = false;
  let berhenti = false;
  let indeks = 0;
  let jumlahBingkai = 0;
  let timer = null;
  // Dipegang supaya bingkai yang masih di udara bisa ditunggu sebelum ✅/❌
  // dikirim — kalau tidak, bingkai yang datang telat menimpa ✅.
  let bingkaiTerakhir = Promise.resolve();

  const pasangTimer = (fn, ms) => {
    timer = setTimeout(fn, ms);
    // unref: timer yang belum jatuh tidak boleh menahan proses tetap hidup.
    if (typeof timer?.unref === "function") timer.unref();
  };

  const hentikanTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  // Rantai setTimeout, bukan setInterval: bingkai berikutnya baru dijadwalkan
  // setelah yang sekarang benar-benar terkirim. Dengan setInterval, jaringan
  // lambat membuat react menumpuk dan bingkainya datang tidak berurutan.
  const putarBingkai = async () => {
    if (berhenti || tutupSudah || pluginBereaksi) return;
    if (jumlahBingkai >= batasBingkai) return; // beku, plugin tetap jalan

    const emoji = bingkai[indeks % bingkai.length];
    indeks++;
    jumlahBingkai++;
    tampilTunggu = true;

    bingkaiTerakhir = reactAsli(emoji).catch(() => { });
    await bingkaiTerakhir;

    if (berhenti || tutupSudah || pluginBereaksi) return;
    if (!beranimasi) return; // mode diam: satu bingkai saja
    pasangTimer(putarBingkai, jeda);
  };

  pasangTimer(putarBingkai, ambang);

  // Sadapan m.react: mendeteksi plugin yang bereaksi sendiri. Animasi
  // dimatikan DULU dan bingkai di udara ditunggu, baru emoji plugin dikirim —
  // supaya emoji plugin yang menang, bukan bingkai kita yang datang telat.
  m.react = async (emoji) => {
    pluginBereaksi = true;
    berhenti = true;
    hentikanTimer();
    await bingkaiTerakhir;
    return reactAsli(emoji);
  };

  const tutup = async (emoji, paksa) => {
    if (tutupSudah) return null;
    tutupSudah = true;
    berhenti = true;
    hentikanTimer();
    m.react = reactAsli;
    await bingkaiTerakhir; // pastikan ✅/❌ jadi reaksi TERAKHIR
    if (pluginBereaksi && !paksa) return null;
    if (!emoji) return null;
    return reactAsli(emoji).catch(() => { });
  };

  return {
    // ✅ hanya kalau animasi pernah tampil — perintah cepat tetap senyap.
    selesai: () => tutup(tampilTunggu ? "✅" : null, false),
    // ❌ SELALU, walau plugin sudah bereaksi: plugin yang throw setelah react
    // 🎁 meninggalkan reaksi menipu (hadiah tidak masuk, tampak sukses).
    gagal: () => tutup("❌", true),
    lepas: () => tutup(null, false),
    get status() {
      return { pluginBereaksi, tampilTunggu, tutupSudah, jumlahBingkai, beku: jumlahBingkai >= batasBingkai };
    },
  };
}

export default { pasangReaksi, AMBANG_BAKU, JEDA_BAKU, BATAS_BINGKAI, GAYA, GAYA_BAKU };
