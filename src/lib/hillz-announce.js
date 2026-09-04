/**
 * Pengumuman bot ke grup.
 *
 * ATURAN PEMICU (dikoreksi 2026-09-04 atas permintaan user):
 * Bot TIDAK lagi menyemprot semua grup begitu tersambung. Kata user:
 * "bot konek chat ke grup otomatis mksdnya bukan gitu, jadi pas masuk grup
 * baru doang". Jadi:
 *
 * - `sapaGrupBaru()` — SATU grup, hanya saat bot benar-benar dimasukkan ke
 *   grup yang belum pernah disapa. Ini jalur normalnya.
 * - `umumkanBotOn()` — siaran ke semua grup, sekarang HANYA lewat tombol di
 *   panel admin (`POST /announce`, `paksa: true`). Tidak dipanggil otomatis
 *   oleh `connection.js` lagi.
 *
 * Aturan yang tetap dipatuhi keduanya:
 * - Grup yang DIMATIKAN di panel admin dilewati. Mengirim ke grup yang sengaja
 *   dimatikan sama dengan mengabaikan setelan admin.
 * - Jeda antar kirim pada siaran, supaya tidak terlihat seperti spam oleh WhatsApp.
 * - Bisa dimatikan dari `admin-settings.json` (`announceOnConnect` untuk siaran,
 *   `greetOnJoin` untuk sapaan grup baru).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./hillz-logger.js";
import { daftarGrupMati, grupMati } from "./hillz-group-state.js";

const AKAR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const JEDA_ANTAR_GRUP_MS = 1500;
const BATAS_GRUP = 60;

/**
 * Daftar grup yang sudah pernah disapa.
 *
 * Perlu persisten karena `group-participants.update` bisa datang lebih dari
 * sekali untuk satu penambahan (WhatsApp mengirim ulang event saat sinkronisasi
 * riwayat, dan `groupCache` kosong setelah restart). Tanpa catatan ini, satu
 * grup bisa disapa dua-tiga kali dan itu justru terlihat seperti spam.
 *
 * Ditaruh di `database/main/` yang gitignored, jadi aman dari `git reset --hard`
 * saat boot.
 */
const BERKAS_SAPA = () => path.join(AKAR, "database", "main", "groups-greeted.json");

function bacaSapa() {
  try {
    const d = JSON.parse(fs.readFileSync(BERKAS_SAPA(), "utf8"));
    return new Set(Array.isArray(d) ? d : []);
  } catch {
    return new Set();
  }
}

function tandaiDisapa(jid) {
  const set = bacaSapa();
  set.add(jid);
  tulisSapa(set);
  return set;
}

function tulisSapa(set) {
  try {
    const dir = path.dirname(BERKAS_SAPA());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BERKAS_SAPA(), JSON.stringify([...set], null, 1));
  } catch { }
}

/**
 * Tandai SEMUA grup yang bot sudah berada di dalamnya sebagai "pernah disapa" —
 * sekali saja, saat catatan itu belum ada.
 *
 * Kenapa perlu: `group-participants.update` dengan `action: "add"` tidak dijamin
 * hanya datang saat penambahan nyata. WhatsApp memutar ulang event saat
 * menyinkronkan riwayat, dan setelah sesi baru dibuat bot bisa menerima event
 * `add` untuk grup yang sudah lama dimasuki. Tanpa penyemaian ini, grup lama
 * bisa kebanjiran sapaan — persis perilaku yang user tolak.
 *
 * Dipanggil dari `connection.js` saat socket `open`. Hanya satu `fetch`, dan
 * hanya pada boot pertama setelah fitur ini ada.
 */
async function semaiGrupLama(sock) {
  if (fs.existsSync(BERKAS_SAPA())) return { disemai: 0, alasan: "sudah ada" };
  let grup = {};
  try {
    grup = await sock.groupFetchAllParticipating();
  } catch (e) {
    // Sengaja TIDAK menulis berkas kosong kalau fetch gagal: berkas kosong akan
    // dianggap "sudah disemai" dan penyemaian tidak pernah dicoba lagi, membuat
    // seluruh grup lama rawan tersapa.
    logger.warn("sapa", `penyemaian ditunda — gagal ambil daftar grup: ${e.message}`);
    return { disemai: 0, alasan: e.message };
  }
  const jids = Object.keys(grup || {});
  tulisSapa(new Set(jids));
  logger.info("sapa", `${jids.length} grup lama ditandai sudah disapa — hanya grup BARU yang akan disapa`);
  return { disemai: jids.length };
}

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
      sapaGrup: s.greetOnJoin !== false,
      teks: typeof s.announceText === "string" ? s.announceText : "",
      teksSapa: typeof s.greetText === "string" ? s.greetText : "",
      domain: typeof s.domain === "string" ? s.domain : "",
    };
  } catch {
    return { aktif: true, sapaGrup: true, teks: "", teksSapa: "", domain: "" };
  }
}

/**
 * Teks siaran manual dari panel. Sengaja pendek: ini dikirim ke banyak grup
 * sekaligus, jadi tiap baris tambahan dikalikan jumlah grup.
 */
function teksBawaan(namaBot, nomor) {
  return (
    `*${namaBot}* sudah online.\n\n` +
    `Ketik *.menu* untuk daftar perintah.\n` +
    `Chat langsung: wa.me/${nomor}`
  );
}

/**
 * Teks sapaan saat bot dimasukkan ke grup baru.
 *
 * Ditulis ulang 2026-09-04 — versi lama ditolak user ("kata-katanya jelek").
 * Yang dibuang: huruf kapital-kecil unicode (`ʜᴀɪ, sᴀʟᴀᴍ ᴋᴇɴᴀʟ`) yang di
 * sebagian perangkat tampil sebagai kotak, bingkai `╭┈┈⬡「 」` dua lapis, dan
 * emoji di tiap baris. Yang tinggal: satu kalimat perkenalan, lalu perintah
 * yang benar-benar bisa langsung dipakai. Sebuah sapaan gunanya memberi tahu
 * cara memakai bot, bukan memamerkan hiasan.
 */
function teksSapaBawaan({ namaBot, namaGrup, pengundang, prefix, domain }) {
  // `null` = baris opsional yang dibuang kalau datanya tidak ada.
  // `""`   = baris kosong yang MEMANG dikehendaki sebagai pemisah paragraf.
  // Keduanya harus dibedakan: filter yang membuang semua string kosong pernah
  // membuat sapaan menjadi satu blok padat tanpa jeda sama sekali.
  const baris = [
    `Halo *${namaGrup}* — aku *${namaBot}*.`,
    pengundang ? `Dimasukkan ke sini oleh ${pengundang}.` : null,
    "",
    "Yang paling sering dipakai:",
    `• *${prefix}menu* — semua perintah`,
    `• *${prefix}claim KODE* — ambil berkas dari website`,
    `• *${prefix}cekvideo KODE* — lihat status berkas dulu`,
    `• kirim/reply link TikTok, IG, YouTube — langsung diunduh`,
    "",
    domain ? `Upload videonya di ${domain}` : null,
    `Prefix bot di grup ini: *${prefix}*`,
  ];
  return baris.filter((b) => b !== null).join("\n");
}

/**
 * Sapa SATU grup yang baru saja memasukkan bot.
 *
 * Inilah pemicu yang benar menurut user: "pas masuk grup baru doang".
 * Dipanggil dari `group-participants.update` di `src/connection.js` setelah
 * dipastikan yang ditambahkan memang bot ini sendiri.
 *
 * @param {object} sock socket WhatsApp
 * @param {string} jid  JID grup
 * @param {object} opsi { namaBot, namaGrup, pengundang, prefix, saluranId, saluranName }
 */
async function sapaGrupBaru(sock, jid, opsi = {}) {
  const { sapaGrup, teksSapa, domain } = setelan();
  if (!sapaGrup) {
    logger.info("sapa", "dilewati — greetOnJoin=false di admin-settings.json");
    return { terkirim: false, alasan: "dimatikan" };
  }
  // Grup yang sengaja dimatikan admin tidak disapa: bot yang dimatikan lalu
  // tetap bicara adalah bug, bukan keramahan.
  if (grupMati(jid)) {
    logger.info("sapa", `dilewati — grup dimatikan admin: ${jid}`);
    return { terkirim: false, alasan: "grup dimatikan" };
  }
  // Satu grup cukup sekali. Event `add` bisa datang berulang saat WhatsApp
  // menyinkronkan riwayat, dan sapaan berulang terlihat seperti spam.
  if (bacaSapa().has(jid)) {
    logger.info("sapa", `dilewati — grup sudah pernah disapa: ${jid}`);
    return { terkirim: false, alasan: "sudah pernah" };
  }

  const pesan =
    (teksSapa && teksSapa.trim()) ||
    teksSapaBawaan({
      namaBot: opsi.namaBot || "BOT SWHD",
      namaGrup: opsi.namaGrup || "grup ini",
      pengundang: opsi.pengundang || "",
      prefix: opsi.prefix || ".",
      domain: domain ? `https://${domain.replace(/^https?:\/\//, "")}` : "",
    });

  await sock.sendMessage(jid, {
    text: pesan,
    contextInfo: {
      mentionedJid: opsi.mention || [],
      forwardingScore: 9999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: opsi.saluranId || "120363413208281480@newsletter",
        newsletterName: opsi.saluranName || opsi.namaBot || "SHIROWAHD",
        serverMessageId: 127,
      },
    },
  });

  tandaiDisapa(jid);
  logger.success("sapa", `grup baru disapa: ${opsi.namaGrup || jid}`);
  return { terkirim: true };
}

/**
 * SIARAN ke semua grup. Sejak 2026-09-04 ini hanya dipanggil dari tombol panel
 * admin (`POST /announce` dengan `paksa: true`), TIDAK lagi otomatis saat bot
 * tersambung — user menolak perilaku itu secara eksplisit.
 *
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

export { umumkanBotOn, sapaGrupBaru, semaiGrupLama, teksSapaBawaan };
