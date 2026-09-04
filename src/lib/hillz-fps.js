/**
 * BATAS FPS 60 — satu sumber kebenaran untuk semua jalur encode.
 *
 * Kenapa modul ini ada: aturan fps sebelumnya tersebar di dua tempat
 * (`web-uploader.js` untuk upload web, `src/lib/hillz-hdmedia.js` untuk bot
 * downloader) dengan batas yang berbeda — 120 di satu sisi, 90 di sisi lain —
 * dan keduanya MELOLOSKAN video 120 fps lewat jalur stream copy tanpa disentuh
 * sama sekali. Jadi "maksimal 60 fps" tidak mungkin dijamin selama aturannya
 * masih dua.
 *
 * ═══ SEMUA DIRATAKAN KE 60 ═══
 *
 * Target selalu 60, apa pun sumbernya. Ada dua cara mencapainya, dan yang
 * dipakai tergantung apakah sumbernya kelipatan bulat dari 60:
 *
 * 1. KELIPATAN BULAT (120, 180, 240, 300, dan 119,88) → **pembagi bulat**.
 *    Ambil setiap frame ke-N, sisanya dibuang. Jarak antar frame SELALU sama,
 *    jadi gerakannya mulus sempurna:
 *
 *      120 fps → N=2 → 60 fps
 *      180 fps → N=3 → 60 fps
 *      240 fps → N=4 → 60 fps
 *      119,88  → N=2 → 59,94 fps  (pecahan NTSC dipertahankan)
 *
 * 2. BUKAN KELIPATAN (90, 100, 144) → tetap dipaksa **60**.
 *    Di sini ffmpeg harus memilih frame terdekat untuk setiap slot 1/60 detik.
 *    Contoh 90 fps: frame sumber ada di 0 / 11,1 / 22,2 / 33,3 ms sedangkan
 *    slot target minta 0 / 16,7 / 33,3 ms, jadi isi gambar maju bergantian
 *    22,2 ms lalu 11,1 ms — pola 3:2, judder yang sama seperti film 24p di
 *    TV 60Hz. Timestamp keluarannya tetap rata (CFR), yang bergantian adalah
 *    isinya.
 *
 *    Judder ini TIDAK BISA dihilangkan tanpa menciptakan frame baru
 *    (`minterpolate`), dan itu menimbulkan ghosting pada tepi yang bergerak
 *    plus biaya encode berkali-kali lipat. Diputuskan: 60 rata lebih penting
 *    daripada menghindari judder pada sumber yang jarang muncul — rekaman HP
 *    hampir selalu 30/60/120/240, dan semua angka itu masuk kategori 1.
 *
 * ═══ FRAKSI, BUKAN DESIMAL ═══
 *
 * fps disimpan sebagai pecahan apa adanya dari ffprobe. Sumber 120000/1001
 * (119,88 fps) jadi 60000/1001, BUKAN "59.94". Membulatkan pecahan bikin audio
 * dan video pelan-pelan bergeser — pada klip 3 menit selisihnya sudah terdengar.
 */

import { execSync } from "child_process";

/** Batas keras: WhatsApp tidak menangani di atas ini dengan mulus. */
export const FPS_MAKS = 60;

/**
 * Batas bawah "masih kisaran 60an".
 *
 * Pembagi bulat hanya dipakai kalau hasilnya mendarat di kisaran ini (59,94 dan
 * 60 lolos). Kalau pembagi bulat menjatuhkan hasil lebih rendah dari ini —
 * misal 90 fps ÷ 2 = 45 — pembagi DIBUANG dan 60 dipaksa, karena permintaannya
 * adalah semua diratakan ke 60an, bukan dibiarkan turun sejauh yang kebetulan
 * dihasilkan pembagi.
 */
export const FPS_KISARAN_MIN = 58;

/** Selisih di bawah ini dianggap pembulatan internal, bukan kebohongan header. */
const TOLERANSI_BOHONG = 0.2;

/** Sumber di bawah ini + sedikit kelonggaran dianggap sudah aman, tidak disentuh. */
const KELONGGARAN = 0.5;

function jalankan(cmd, timeout = 15000) {
  try {
    return execSync(cmd, { timeout, stdio: "pipe", shell: "/bin/bash" }).toString();
  } catch {
    return "";
  }
}

function pbt(a, b) {
  return b ? pbt(b, a % b) : a;
}

/**
 * Apakah ffmpeg di mesin ini mengenal `-fps_mode`?
 *
 * `-vsync` sudah usang dan pada ffmpeg 7+ memicu peringatan; `-fps_mode` baru
 * ada sejak 5.1. Dideteksi sekali saat modul dimuat, bukan tiap encode, dan
 * dibagi ke semua jalur supaya upload web dan bot tidak memakai flag berbeda.
 */
export const FFMPEG_PUNYA_FPS_MODE = (() => {
  const h = jalankan('ffmpeg -h full 2>&1 | grep -c -- "-fps_mode" || true', 10000);
  return h.trim() !== "" && h.trim() !== "0";
})();

/** "30000/1001" → 29.97. 0 kalau bukan pecahan sah. */
export function fraksiKeAngka(f) {
  if (!f) return 0;
  const s = String(f).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  if (!/^\d+\/\d+$/.test(s)) return 0;
  const [n, d] = s.split("/").map(Number);
  return d ? n / d : 0;
}

/** Pecahan sebagai pasangan angka; [0,0] kalau tidak terbaca. */
function fraksiKePasangan(f) {
  if (!f) return [0, 0];
  const s = String(f).trim();
  if (/^\d+\/\d+$/.test(s)) {
    const [n, d] = s.split("/").map(Number);
    return d ? [n, d] : [0, 0];
  }
  if (/^\d+$/.test(s)) return [Number(s), 1];
  // Desimal: dijadikan pecahan supaya pembagian tetap eksak.
  if (/^\d+\.\d+$/.test(s)) {
    const desimal = s.split(".")[1].length;
    const kali = 10 ** desimal;
    return [Math.round(Number(s) * kali), kali];
  }
  return [0, 0];
}

/**
 * Baca fps sebuah berkas dari beberapa sudut, karena satu angka saja bisa bohong.
 *
 * - `r_frame_rate`  = yang ditulis di header (paling sering bohong)
 * - `avg_frame_rate`= rata-rata nyata dari isi berkas (paling bisa dipercaya)
 * - hitung manual   = jumlah frame ÷ durasi, penentu kalau dua di atas bentrok
 *
 * BUG NYATA yang `bohong` tangani (dilaporkan user: "kadang fps nya ngebug di
 * ttv2, kadang fps nya ga bener seperti video aslinya, tapi segi kualitas udh
 * oke"). Diukur pada rekaman HP nyata:
 *
 *   r_frame_rate  = 25/1                 ← yang ditulis di header
 *   avg_frame_rate= 216600000/3603737    = 60,1 fps  ← isi sebenarnya
 *   1083 paket / 18,027 s                = 60,08 fps ← dihitung manual, cocok
 *
 * Kalimat "kualitas oke tapi fps ngebug" itu tanda tangan jalur REMUX: `-c:v
 * copy` menyalin piksel sempurna (karena itu kualitas oke) tapi ikut menyalin
 * header fps yang salah, jadi pemutar memainkannya dengan timing keliru.
 *
 * Selisih >20% dianggap bohong; di bawah itu wajar (pembulatan internal, mis.
 * 29,974 vs 29,970 = 0,1%).
 */
export function bacaFps(file) {
  const raw = jalankan(
    "ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate,avg_frame_rate,nb_frames,duration -show_entries format=duration -of default=nw=1 " +
      JSON.stringify(file),
  );
  const ambil = (k) => (raw.match(new RegExp("^" + k + "=(.*)$", "m")) || [, ""])[1].trim();

  const nominalStr = ambil("r_frame_rate");
  const avgStr = ambil("avg_frame_rate");
  const nominal = fraksiKeAngka(nominalStr);
  const avg = fraksiKeAngka(avgStr);

  const nbFrames = Number(ambil("nb_frames")) || 0;
  const durasi = Number(ambil("duration")) || 0;
  const hitung = nbFrames > 0 && durasi > 0 ? nbFrames / durasi : 0;

  // Header bohong = selisih nominal vs rata-rata di atas 20%.
  const bohong = nominal > 0 && avg > 0 && Math.abs(avg - nominal) / nominal > TOLERANSI_BOHONG;

  // Yang dipakai untuk keputusan: rata-rata nyata kalau ada, kalau tidak baru
  // header. Hitungan manual dipakai sebagai penengah saat rata-rata mustahil
  // (berkas VFR ngawur melaporkan angka raksasa seperti 1000000/1).
  let nyata = avg > 0 ? avg : nominal;
  let nyataStr = avg > 0 ? avgStr : nominalStr;
  if (nyata > 300 && hitung > 0 && hitung < 300) {
    nyata = hitung;
    nyataStr = String(Math.round(hitung * 1000)) + "/1000";
  }

  return { nominal, nominalStr, avg, avgStr, hitung, nyata, nyataStr, bohong };
}

/**
 * Rencana penurunan fps untuk satu berkas.
 *
 * Mengembalikan:
 *   perluTurun  — true kalau fps sumber di atas 60
 *   fpsSumber   — angka fps nyata yang terbaca
 *   pembagi     — N pada target = sumber/N (1 = tidak ada penurunan)
 *   targetStr   — pecahan siap dipakai ffmpeg, mis. "60000/1001"
 *   target      — angka target, untuk log/laporan
 *   eksak       — true kalau target hasil pembagi bulat (mulus sempurna)
 *   alasan      — kalimat untuk log, supaya keputusan bisa dilacak
 */
export function rencanaFps(file) {
  const f = bacaFps(file);
  const sumber = f.nyata;

  if (!(sumber > 0)) {
    return {
      perluTurun: false, fpsSumber: 0, pembagi: 1, target: 0, targetStr: "",
      eksak: true, bohong: f.bohong, detail: f,
      alasan: "fps tidak terbaca — dibiarkan apa adanya",
    };
  }

  if (sumber <= FPS_MAKS + KELONGGARAN) {
    return {
      perluTurun: false, fpsSumber: sumber, pembagi: 1, target: sumber,
      targetStr: f.nyataStr, eksak: true, bohong: f.bohong, detail: f,
      alasan: `${sumber.toFixed(2)} fps sudah di bawah ${FPS_MAKS} — dibiarkan asli`,
    };
  }

  // Pembagi bulat terkecil yang menaruh hasil di bawah batas.
  const N = Math.ceil(sumber / FPS_MAKS);
  let [n, d] = fraksiKePasangan(f.nyataStr);
  if (!n || !d) {
    // Pecahan tidak terbaca: jatuh ke angka bulat 60. Judder mungkin, tapi
    // batasnya tetap dihormati.
    return {
      perluTurun: true, fpsSumber: sumber, pembagi: 0, target: FPS_MAKS,
      targetStr: String(FPS_MAKS), eksak: false, bohong: f.bohong, detail: f,
      alasan: `fps sumber ${sumber.toFixed(2)} tapi pecahannya tidak terbaca — dipaksa ${FPS_MAKS}`,
    };
  }

  const targetEksak = sumber / N;
  if (targetEksak < FPS_KISARAN_MIN) {
    // Pembagi bulat mendarat di luar kisaran 60an (90→45, 100→50, 144→48).
    // Dibuang: 60 dipaksa supaya semua sumber keluar di angka yang sama.
    return {
      perluTurun: true, fpsSumber: sumber, pembagi: 0, target: FPS_MAKS,
      targetStr: String(FPS_MAKS), eksak: false, bohong: f.bohong, detail: f,
      alasan: `${sumber.toFixed(2)} fps → pembagi ${N} mendarat di ${targetEksak.toFixed(1)} fps (di luar kisaran 60an) — diratakan ke ${FPS_MAKS}`,
    };
  }

  // target = n / (d*N), lalu disederhanakan supaya rapi di log dan di header.
  let tn = n;
  let td = d * N;
  const g = pbt(tn, td) || 1;
  tn /= g;
  td /= g;

  return {
    perluTurun: true,
    fpsSumber: sumber,
    pembagi: N,
    target: tn / td,
    targetStr: td === 1 ? String(tn) : `${tn}/${td}`,
    eksak: true,
    bohong: f.bohong,
    detail: f,
    alasan: `${sumber.toFixed(2)} fps → ambil 1 dari ${N} frame → ${(tn / td).toFixed(2)} fps rata (tanpa judder)`,
  };
}

/**
 * Potongan filter fps untuk digabung ke `-vf`. Kosong kalau tidak perlu turun.
 *
 * Dipakai filter `fps=`, BUKAN `-r` saja: filter bekerja di dalam rantai filter
 * dengan timestamp yang dihitung ulang secara konsisten, sedangkan `-r` di sisi
 * keluaran hanya menambal timestamp di akhir dan pada sumber VFR bisa
 * menduplikasi frame diam-diam.
 */
export function filterFps(rencana) {
  if (!rencana || !rencana.perluTurun) return "";
  return `fps=${rencana.targetStr}`;
}

/**
 * Argumen sisi keluaran. Saat fps diturunkan, keluaran DIPAKSA CFR: pemutar
 * WhatsApp menangani frame rate tetap jauh lebih baik daripada VFR, dan VFR
 * inilah biang "patah-patah" pada rekaman HP walau angka fps-nya wajar.
 * Saat tidak ada penurunan, timing sumber dibiarkan (passthrough) supaya
 * rekaman 30/50/60 fps yang sudah benar tidak diusik.
 */
export function argKeluaranFps(rencana, ffmpegPunyaFpsMode) {
  if (rencana && rencana.perluTurun) {
    // "1" = cfr pada ffmpeg lama yang hanya menerima angka di -vsync.
    return ffmpegPunyaFpsMode
      ? ["-fps_mode", "cfr", "-r", rencana.targetStr]
      : ["-vsync", "1", "-r", rencana.targetStr];
  }
  return ffmpegPunyaFpsMode ? ["-fps_mode", "passthrough"] : ["-vsync", "0"];
}

/** Apakah berkas ini WAJIB di-encode ulang hanya karena fps-nya kelewat tinggi? */
export function fpsMelewatiBatas(file) {
  return rencanaFps(file).perluTurun;
}
