import os from "os";
import { logger } from "./hillz-logger.js";

// Batas RSS dulu dipatok mati 3072 MB. Di VPS ini (7887 MB) angka itu memang
// masuk akal, tapi di VPS 1 GB batas itu TIDAK PERNAH tercapai — OOM killer
// kernel lebih dulu membunuh proses, jadi jaring pengamannya tidak pernah
// bekerja justru di mesin yang paling membutuhkannya.
//
// Sekarang diturunkan dari RAM nyata, dijepit 512–3072 MB. Di mesin ini
// hasilnya tetap 3072 MB (55% dari 7887 = 4338 → dijepit ke 3072), jadi
// perilaku produksi tidak berubah sama sekali; yang berubah cuma mesin kecil.
// `hitungAmbang` dipisah sebagai fungsi MURNI supaya bisa diuji untuk RAM yang
// tidak dimiliki mesin penguji (1 GB, 64 GB) — tanpa itu uji cuma bisa memeriksa
// satu angka, yaitu RAM mesin yang sedang dipakai, dan jepitannya tak terbukti.
function hitungAmbang(ramMb, envMb) {
  const paksa = Number(envMb);
  if (paksa > 0) return paksa;
  return Math.min(3072, Math.max(512, Math.round(ramMb * 0.55)));
}

const RAM_MB = Math.round(os.totalmem() / 1024 / 1024);
const BATAS_MB = hitungAmbang(RAM_MB, process.env.RSS_LIMIT_MB);
const RSS_LIMIT = BATAS_MB * 1024 * 1024;
const CHECK_INTERVAL = 5 * 60 * 1000;

// Kenapa ada gerbang pelaporan: pemeriksaan tiap 5 menit menulis 288 baris
// "memory rss …" per hari ke main-out.log. Panel admin membaca berkas log itu,
// jadi baris berulang itulah yang menenggelamkan galat sungguhnya — terukur
// 337 baris dari satu jenis pesan, pola terbanyak di seluruh log.
//
// Pemeriksaannya TETAP jalan tiap 5 menit (jaring pengaman tidak dikurangi).
// Yang berubah hanya kapan hasilnya dicetak: saat RSS bergerak berarti,
// saat masuk zona waspada, atau sekali tiap 6 jam sebagai denyut hidup.
const AMBANG_GESER = 0.15;          // 15% dari batas
const AMBANG_WASPADA = 0.75;        // 75% dari batas
const JEDA_DENYUT = 6 * 60 * 60 * 1000;

let monitorTimer = null;
let rssTerakhirDilapor = 0;
let waktuTerakhirDilapor = 0;

function formatMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + "MB";
}

// Fungsi MURNI: seluruh keadaan lewat argumen, jadi bisa diuji tanpa menjalankan
// timer 5 menit atau menyentuh keadaan modul. Versi sebelumnya membaca variabel
// modul langsung sehingga satu-satunya cara mengujinya adalah menunggu — dan uji
// yang tidak bisa dijalankan sama dengan tidak ada uji.
function perluLaporMurni(rss, rssTerakhir, waktuTerakhir, sekarang, batas) {
  if (!waktuTerakhir) return true;                                  // baris pertama
  if (rss >= batas * AMBANG_WASPADA) return true;                   // zona waspada
  if (Math.abs(rss - rssTerakhir) >= batas * AMBANG_GESER) return true;
  if (sekarang - waktuTerakhir >= JEDA_DENYUT) return true;         // denyut hidup
  return false;
}

function perluLapor(rss, sekarang) {
  return perluLaporMurni(rss, rssTerakhirDilapor, waktuTerakhirDilapor, sekarang, RSS_LIMIT);
}

function startMemoryMonitor() {
  if (monitorTimer) return;

  monitorTimer = setInterval(() => {
    const mem = process.memoryUsage();

    if (global.gc) global.gc();

    if (mem.rss >= RSS_LIMIT) {
      logger.warn(
        "memory",
        `RSS ${formatMB(mem.rss)} exceeded ${formatMB(RSS_LIMIT)} limit, restarting`,
      );
      process.exit(1);
    }

    const sekarang = Date.now();
    if (!perluLapor(mem.rss, sekarang)) return;
    rssTerakhirDilapor = mem.rss;
    waktuTerakhirDilapor = sekarang;

    const persen = Math.round((mem.rss / RSS_LIMIT) * 100);
    logger.system(
      "memory",
      `rss ${formatMB(mem.rss)} (${persen}% batas) · heap ${formatMB(mem.heapUsed)}/${formatMB(mem.heapTotal)}`,
    );
  }, CHECK_INTERVAL);

  if (monitorTimer.unref) monitorTimer.unref();
  logger.success(
    "memory",
    `Pantau RAM aktif, limit ${formatMB(RSS_LIMIT)} (RAM ${RAM_MB}MB), cek tiap ${CHECK_INTERVAL / 60000} menit`,
  );
}

function stopMemoryMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  rssTerakhirDilapor = 0;
  waktuTerakhirDilapor = 0;
}

export {
  startMemoryMonitor,
  stopMemoryMonitor,
  perluLapor,
  perluLaporMurni,
  hitungAmbang,
  RSS_LIMIT,
  BATAS_MB,
};
