/**
 * hillz-reaksi.js — indikator "sedang diproses / selesai / gagal" lewat reaksi emoji.
 *
 * Kenapa berkas sendiri, bukan ditempel ke handler.js: handler.js sudah 2294
 * baris. Logika ambang waktu + hormati-reaksi-plugin perlu diuji tanpa harus
 * menyalakan bot dulu.
 *
 * TIGA ATURAN DI BAWAH BUKAN SELERA — itu konsekuensi keadaan repo ini.
 *
 * 1. 492 dari 823 plugin SUDAH memanggil m.react() sendiri (treasure.js 🎁,
 *    enchant.js ✨ lalu 🎉/💔, arena.js ⚔️). Reaksi WhatsApp cuma punya SATU
 *    slot per pesan: react baru menimpa yang lama. Kalau ✅ global ditempel di
 *    akhir tiap perintah, 🎉 hasil enchant sukses jadi ✅ dan infonya hilang.
 *    → Begitu plugin bereaksi sendiri, modul ini mundur dan tidak ikut campur.
 *
 * 2. Perintah cepat TIDAK diberi ⏳. Kalau .menu balas 200 ms lalu dikasih
 *    ⏳→✅, yang user lihat cuma emoji kedip tanpa guna — dan itu dua panggilan
 *    sendMessage tambahan per perintah, dikali trafik grup.
 *    → ⏳ baru muncul kalau kerjanya melewati ambang (baku 1200 ms). Perintah
 *    cepat senyap, dan senyap itu sendiri sudah berarti "beres".
 *
 * 3. Gagal SELALU ditandai ❌, walau plugin sudah bereaksi sendiri. Plugin yang
 *    throw di tengah jalan meninggalkan reaksi yang menipu — 🎁 terpasang
 *    padahal hadiahnya tidak pernah masuk database.
 */

/** Ambang baku sebelum ⏳ ditampilkan (ms). */
export const AMBANG_BAKU = 1200;

/**
 * Pasang siklus reaksi di sekitar eksekusi satu plugin.
 *
 * @param {Object} m - Objek pesan hasil serialize (butuh m.react).
 * @param {Object} [opsi]
 * @param {number} [opsi.ambang] - ms sebelum ⏳ muncul.
 * @returns {{selesai: Function, gagal: Function, lepas: Function, status: Object}}
 */
export function pasangReaksi(m, opsi = {}) {
  const ambang = Number.isFinite(opsi.ambang) ? opsi.ambang : AMBANG_BAKU;

  // Tanpa m.react (mis. pesan dari jalur yang tidak di-serialize penuh) modul
  // ini harus jadi no-op, bukan melempar galat dan menjatuhkan perintahnya.
  const reactAsli = typeof m?.react === "function" ? m.react : null;
  if (!reactAsli) {
    const kosong = () => null;
    return { selesai: kosong, gagal: kosong, lepas: kosong, status: {} };
  }

  let pluginBereaksi = false;
  let tampilTunggu = false;
  let tutupSudah = false;

  // Sadap m.react supaya tahu plugin bereaksi sendiri. Aslinya dipulihkan di
  // tutup() — kalau tidak, objek m yang dipakai ulang membawa sadapan mati.
  m.react = async (emoji) => {
    pluginBereaksi = true;
    return reactAsli(emoji);
  };

  const timer = setTimeout(() => {
    if (tutupSudah || pluginBereaksi) return;
    tampilTunggu = true;
    reactAsli("⏳").catch(() => { });
  }, ambang);
  // unref: timer yang belum jatuh tidak boleh menahan proses tetap hidup.
  if (typeof timer.unref === "function") timer.unref();

  const tutup = (emoji, paksa) => {
    if (tutupSudah) return null;
    tutupSudah = true;
    clearTimeout(timer);
    m.react = reactAsli;
    if (pluginBereaksi && !paksa) return null;
    if (!emoji) return null;
    return reactAsli(emoji).catch(() => { });
  };

  return {
    // ✅ hanya kalau ⏳ pernah tampil — supaya perintah cepat tetap senyap.
    selesai: () => tutup(tampilTunggu ? "✅" : null, false),
    gagal: () => tutup("❌", true),
    lepas: () => tutup(null, false),
    get status() {
      return { pluginBereaksi, tampilTunggu, tutupSudah };
    },
  };
}

export default { pasangReaksi, AMBANG_BAKU };
