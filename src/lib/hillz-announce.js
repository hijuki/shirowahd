/**
 * Pengumuman "BOT ON" ke grup setelah bot benar-benar tersambung.
 *
 * Dipicu sekali per sesi baru: begitu pairing berhasil dan socket terbuka, bot
 * memberi kabar ke grup supaya admin tahu bot sudah hidup tanpa perlu mengetes
 * perintah manual.
 *
 * Aturan yang dipatuhi:
 * - Grup yang DIMATIKAN di panel admin dilewati. Mengirim ke grup yang sengaja
 *   dimatikan sama dengan mengabaikan setelan admin.
 * - Ada penanda per-perangkat (`storage/.announce-<device>`), jadi restart biasa
 *   tidak mengulang pengumuman. Hanya sesi/perangkat BARU yang mengumumkan.
 *   Tanpa ini setiap `pm2 restart main` akan menyemprot semua grup.
 * - Jeda antar kirim, supaya tidak terlihat seperti spam oleh WhatsApp.
 * - Bisa dimatikan sepenuhnya dari `admin-settings.json` (`announceOnConnect`).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./hillz-logger.js";
import { daftarGrupMati } from "./hillz-group-state.js";

const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const JEDA_ANTAR_GRUP_MS = 1500;
const BATAS_GRUP = 60;

function berkasPenanda(device) {
  const aman = String(device || "unknown").replace(/[^0-9a-zA-Z:_-]/g, "");
  return path.join(AKAR, "storage", `.announce-${aman}`);
}

function setelan() {
  try {
    const s = JSON.parse(
      fs.readFileSync(path.join(AKAR, "admin-settings.json"), "utf8"),
    );
    return {
      aktif: s.announceOnConnect !== false,
      teks: typeof s.announceText === "string" ? s.announceText : "",
    };
  } catch {
    return { aktif: true, teks: "" };
  }
}

function teksBawaan(namaBot, nomor) {
  return (
    `╭─「 *${namaBot} ON* 」\n` +
    `│ Bot sudah tersambung dan siap dipakai.\n` +
    `│ Nomor: wa.me/${nomor}\n` +
    `╰─ Ketik *.menu* untuk daftar perintah`
  );
}

/**
 * @param {object} sock socket WhatsApp yang sudah `open`
 * @param {object} opsi { namaBot, paksa } — `paksa` melewati penanda sekali-jalan
 */
async function umumkanBotOn(sock, opsi = {}) {
  const { aktif, teks } = setelan();
  if (!aktif && !opsi.paksa) {
    logger.info("announce", "dilewati — dimatikan di admin-settings.json");
    return { terkirim: 0, dilewati: 0, alasan: "dimatikan" };
  }

  const device = sock?.user?.id || "";
  const nomor = device.split(":")[0].split("@")[0] || "";
  const penanda = berkasPenanda(device);
  if (!opsi.paksa && fs.existsSync(penanda)) {
    return { terkirim: 0, dilewati: 0, alasan: "sudah pernah" };
  }

  let grup = {};
  try {
    grup = await sock.groupFetchAllParticipating();
  } catch (e) {
    logger.warn("announce", `gagal ambil daftar grup: ${e.message}`);
    return { terkirim: 0, dilewati: 0, alasan: e.message };
  }

  const mati = daftarGrupMati();
  const daftar = Object.values(grup || {}).filter((g) => g?.id && !mati.has(g.id));
  const pesan = (teks && teks.trim()) || teksBawaan(opsi.namaBot || "BOT SWHD", nomor);

  let terkirim = 0;
  let gagal = 0;
  for (const g of daftar.slice(0, BATAS_GRUP)) {
    try {
      await sock.sendMessage(g.id, { text: pesan });
      terkirim++;
    } catch {
      gagal++;
    }
    await new Promise((r) => setTimeout(r, JEDA_ANTAR_GRUP_MS));
  }

  try {
    fs.mkdirSync(path.dirname(penanda), { recursive: true });
    fs.writeFileSync(penanda, new Date().toISOString());
  } catch { }

  logger.success(
    "announce",
    `pengumuman ON: ${terkirim} grup terkirim, ${gagal} gagal, ${Object.keys(grup).length - daftar.length} dilewati (dimatikan admin)`,
  );
  return { terkirim, gagal, dilewati: Object.keys(grup).length - daftar.length };
}

export { umumkanBotOn };
