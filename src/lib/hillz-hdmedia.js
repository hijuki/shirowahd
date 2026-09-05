import axios from "axios";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execSync, execFile } from "child_process";
import { rencanaFps, filterFps, argKeluaranFps, deteksiVfr, FFMPEG_PUNYA_FPS_MODE, FPS_MAKS } from "./hillz-fps.js";

// ── Kenapa modul ini ada ────────────────────────────────────────────────────
// Dua masalah nyata pada plugin downloader:
//
// 1. RESOLUSI TURUN. Plugin memilih URL dengan `find()` memakai OR, contoh:
//      data.find(e => e.type === 'nowatermark_hd' || e.type === 'nowatermark')
//    `find` berhenti di elemen PERTAMA yang cocok salah satu syarat. Karena
//    urutan arraynya [watermark, nowatermark, nowatermark_hd], yang ketemu
//    lebih dulu adalah `nowatermark` (SD 576x1024) dan varian HD (1080x1920)
//    tidak pernah terpakai. Diukur langsung di API tikwm: SD 576x1024 vs
//    HD 1080x1920 — beda 3,5x jumlah piksel, ukuran berkasnya hampir sama.
//
// 2. HD-nya HEVC. URL `hdplay` TikTok mengirim H.265/HEVC. WhatsApp butuh
//    H.264 — video HEVC sampai ke penerima sebagai berkas yang tidak bisa
//    diputar atau tampil hitam. Jadi memilih HD saja tidak cukup; harus
//    dikonversi, dan konversinya tidak boleh menurunkan resolusi.
//
// Modul ini menyelesaikan keduanya: pilih kandidat resolusi tertinggi, lalu
// pastikan kompatibel WA tanpa mengubah resolusi/fps.

const TMP = os.tmpdir();
const UA_MOBILE =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

function jalankan(cmd, timeout = 20000) {
  try {
    return execSync(cmd, { timeout, stdio: "pipe", shell: "/bin/bash" }).toString().trim();
  } catch {
    return "";
  }
}

/**
 * Rapikan URL yang datang dari API scraper.
 *
 * BUG NYATA yang ini tangani: plugin melakukan concat buta
 *   "https://www.tikwm.com" + res.play
 * padahal tikwm KADANG mengembalikan URL absolut (`https://v16m.tiktokcdn-us.com/…`)
 * dan kadang path relatif (`/video/tos/…`). Kalau sudah absolut, hasil concat jadi
 * `https://www.tikwm.comhttps://v16m…` → `ENOTFOUND www.tikwm.comhttps`.
 * Unduhan gagal, plugin jatuh ke kandidat lain (yang resolusinya lebih rendah)
 * atau gagal total.
 */
export function rapikanUrl(url, basis) {
  let u = String(url || '').trim();
  if (!u) return '';
  // Buang basis yang tertempel di depan URL absolut.
  const m = u.match(/^https?:\/\/[^/]+(https?:\/\/.+)$/i);
  if (m) u = m[1];
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return 'https:' + u;
  if (!basis) return u;
  return String(basis).replace(/\/+$/, '') + (u.startsWith('/') ? u : '/' + u);
}

/**
 * Urutkan kandidat video dari yang paling tinggi kualitasnya.
 * Kandidat boleh berupa string URL atau objek { url, quality, type, size,
 * width, height }. Skor disusun dari petunjuk yang tersedia — label kualitas
 * ("hd", "1080p"), dimensi, lalu ukuran berkas sebagai pemutus terakhir.
 */
export function urutkanKualitas(kandidat) {
  const skor = (c) => {
    if (!c) return -1;
    const url = typeof c === "string" ? c : c.url || "";
    if (!url) return -1;
    const teks = (
      (typeof c === "string" ? "" : `${c.quality || ""} ${c.type || ""} ${c.label || ""}`) + " " + url
    ).toLowerCase();
    let s = 0;
    // Dimensi eksplisit paling dipercaya.
    const w = Number(c.width) || 0;
    const h = Number(c.height) || 0;
    if (w && h) s += Math.min(w, h) * 10;
    // Label resolusi di teks.
    const m = teks.match(/(\d{3,4})p/);
    if (m) s += Number(m[1]) * 10;
    // Batas kata TIDAK boleh pakai \b: underscore dihitung karakter kata, jadi
    // `\bhd\b` tidak cocok dengan "nowatermark_hd" — persis nama field yang
    // dipakai TikTok. Pemisahnya didefinisikan manual: apa pun selain huruf/angka.
    const pisah = (kata) => new RegExp('(?:^|[^a-z0-9])(' + kata + ')(?:[^a-z0-9]|$)');
    if (pisah('hd|hdplay|high|best|original|asli|fhd|uhd').test(teks)) s += 4000;
    if (pisah('sd|low|small|medium|preview').test(teks)) s -= 2000;
    // Watermark selalu kalah — bukan soal resolusi, tapi memang bukan yang diminta.
    if (/watermark/.test(teks) && !/nowatermark|no_watermark|nowm/.test(teks)) s -= 20000;
    const size = Number(c.size) || 0;
    if (size) s += Math.min(size / 100000, 500);
    return s;
  };
  return [...(kandidat || [])]
    .filter((c) => c && (typeof c === "string" ? c : c.url))
    .sort((a, b) => skor(b) - skor(a));
}

/** Ambil URL terbaik saja. */
export function pilihUrlTerbaik(kandidat) {
  const urut = urutkanKualitas(kandidat);
  if (!urut.length) return null;
  const t = urut[0];
  return typeof t === "string" ? t : t.url;
}

function infoVideo(file) {
  const raw = jalankan(
    `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,pix_fmt,profile,r_frame_rate,avg_frame_rate,color_space,color_primaries,color_transfer -of default=nw=1 ${JSON.stringify(file)}`
  );
  const get = (k) => (raw.match(new RegExp(`^${k}=(.*)$`, "m")) || [, ""])[1].trim();
  return {
    codec: get("codec_name").toLowerCase(),
    width: Number(get("width")) || 0,
    height: Number(get("height")) || 0,
    pixFmt: get("pix_fmt").toLowerCase(),
    profile: get("profile"),
    fps: get("r_frame_rate"),
    fpsAvg: get("avg_frame_rate"),
    // Metadata warna dibaca karena inilah biang "ga mulus kaya asli" pada video
    // TikTok modern: banyak di antaranya HDR (HLG/PQ, BT.2020, 10-bit).
    ruang: get("color_space").toLowerCase(),
    primer: get("color_primaries").toLowerCase(),
    transfer: get("color_transfer").toLowerCase(),
  };
}

/**
 * Apakah berkas ini HDR? Dan HDR jenis apa?
 *
 * ═══ TEMUAN YANG MEMBUAT FUNGSI INI ADA (terukur) ═══
 *
 * Video TikTok yang dikeluhkan ternyata HDR:
 *
 *   pix_fmt        = yuv420p10le   (10-bit)
 *   color_space    = bt2020nc
 *   color_primaries= bt2020
 *   color_transfer = arib-std-b67  ← ini HLG, salah satu format HDR
 *
 * Pipeline lama menurunkannya ke 8-bit `yuv420p` TAPI MEMBIARKAN ketiga label
 * itu menempel di keluaran. Terukur pada hasil nyata:
 *
 *   hasil = yuv420p  bt2020nc / bt2020 / arib-std-b67
 *
 * Itu berkas yang isinya SDR 8-bit tapi mengaku HDR. Akibatnya pemutar masuk
 * jalur render HDR — ruang warna lebar, tone mapping tiap frame, komposisi
 * 10-bit — untuk data yang tidak butuh itu. Di HP kelas menengah jalur tersebut
 * jauh lebih berat, dan begitu tidak sanggup, frame mulai dibuang. Berkasnya
 * sendiri sempurna (1731 frame, 59,880 fps, 0 lompatan) — yang tidak sanggup
 * adalah cara pemutar dipaksa menanganinya. Persis "fps-nya ga mulus kaya asli"
 * sementara semua angka teknis kelihatan benar.
 *
 * ═══ KENAPA DUA TINGKAT, BUKAN SATU BENDERA ═══
 *
 * Versi pertama fungsi ini mengembalikan satu boolean dan langsung memicu tone
 * mapping. Uji regresi menangkapnya: empat berkas SDR sehat (8-bit, transfer
 * bt709) ikut dipaksa encode karena label primaries-nya masih `bt2020` warisan
 * sumber. Tone mapping pada berkas yang tidak punya jangkauan HDR = merusak
 * warna tanpa alasan.
 *
 *   "hdr"   → transfer benar-benar HDR (PQ `smpte2084` / HLG `arib-std-b67`).
 *             Perlu tone mapping penuh: kurva HDR harus dikompres.
 *   "gamut" → transfer sudah SDR tapi primaries/space masih BT.2020.
 *             Cukup pindah gamut + betulkan label. Jangan di-tonemap.
 *   null    → SDR biasa, jangan diapa-apakan.
 */
function jenisHdr(info) {
  const t = info.transfer || "";
  const p = info.primer || "";
  const r = info.ruang || "";
  if (/smpte2084|arib-std-b67|smpte428/.test(t)) return "hdr";
  if (/bt2020/.test(t)) return "hdr";
  if (/bt2020/.test(p) || /bt2020/.test(r)) return "gamut";
  return null;
}

/**
 * Rantai filter untuk menurunkan HDR ke SDR dengan BENAR, plus label yang jujur.
 *
 * Tiga langkah, dan ketiganya wajib:
 *   1. `zscale=t=linear:npl=100` — keluar dari kurva HLG/PQ ke cahaya linear.
 *      Tanpa ini, tone mapping bekerja pada angka yang bukan cahaya dan hasilnya
 *      pucat atau gelap.
 *   2. `tonemap=hable` — kompres jangkauan HDR ke SDR. `hable` dipilih karena
 *      menjaga sorotan tetap ada detailnya; `clip` memutihkan langit.
 *   3. `zscale=p=bt709:t=bt709:m=bt709:r=tv` + `format=yuv420p` — pindah ke
 *      ruang warna SDR yang sebenarnya.
 *
 * `-colorspace/-color_primaries/-color_trc bt709` DI SISI KELUARAN tetap perlu
 * walau rantai filter sudah benar: tanpa itu ffmpeg menyalin label lama dari
 * masukan. Terukur — varian yang hanya mengganti `-colorspace` tanpa filter
 * menghasilkan `bt709/bt2020/arib-std-b67`, yaitu label yang justru jadi campur
 * aduk. Filter dan label harus diganti BERSAMAAN.
 *
 * Ketersediaan `zscale` diperiksa sekali saat modul dimuat: ia berasal dari
 * libzimg dan tidak selalu ada di ffmpeg bawaan distro. Kalau tidak ada,
 * dipakai jalur cadangan tanpa tone mapping — warnanya kurang akurat, tetapi
 * labelnya jujur, dan itu yang menentukan beban pemutar.
 *
 * Untuk `jenis === "gamut"` (transfer sudah SDR, cuma primaries yang masih
 * BT.2020) langkah tone mapping DILEWATI. Meng-tonemap berkas yang jangkauannya
 * sudah SDR hanya menggelapkan gambar tanpa memperbaiki apa pun.
 */
const ADA_ZSCALE = (() => {
  try {
    return jalankan("ffmpeg -hide_banner -filters 2>&1").includes("zscale");
  } catch { return false; }
})();

function filterHdrKeSdr(jenis = "hdr") {
  if (ADA_ZSCALE) {
    if (jenis === "gamut") {
      return "zscale=p=bt709:t=bt709:m=bt709:r=tv,format=yuv420p";
    }
    return "zscale=t=linear:npl=100,tonemap=tonemap=hable:desat=0," +
      "zscale=p=bt709:t=bt709:m=bt709:r=tv,format=yuv420p";
  }
  // Cadangan tanpa libzimg. `colorspace` bawaan ffmpeg bisa memindahkan
  // BT.2020→BT.709 tapi tidak melakukan tone mapping, jadi sorotan agak rata.
  return "colorspace=all=bt709:iall=bt2020:irange=tv:range=tv,format=yuv420p";
}

/**
 * Deteksi fps bohong + pembacaan pecahan sekarang tinggal di
 * `src/lib/hillz-fps.js` — dulu logikanya di sini, dan versi di
 * `web-uploader.js` sudah menyimpang (batas 90 vs 120). Satu tempat saja
 * supaya jalur bot dan jalur upload web tidak bisa lagi berbeda.
 */

function adaAudio(file) {
  return jalankan(
    `ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 ${JSON.stringify(file)}`
  ).includes("audio");
}

function kodekAudio(file) {
  return jalankan(
    `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 ${JSON.stringify(file)}`
  ).toLowerCase();
}

/**
 * Hitung keluhan decoder pada sebuah berkas. 0 = benar-benar bersih.
 *
 * JANGAN mencari satu kalimat tertentu. Dulu fungsi ini `grep -c "Error while
 * decoding"`, dan pada ffmpeg 8 kalimat itu TIDAK PERNAH muncul lagi — berkas
 * terpotong sekarang dilaporkan sebagai:
 *
 *   [h264] Invalid NAL unit size (4707 > 2467).
 *   [h264] Error splitting the input into NAL units.
 *   [mov,mp4] stream 1, offset 0xfa98f: partial file
 *   [vist#0:0/h264] Decoding error: Invalid data found when processing input
 *
 * Empat baris keluhan, dan grep lama menghitungnya 0 → berkas rusak dinyatakan
 * "bersih" lalu diloloskan lewat remux. Itulah kenapa video rusak dari VPS
 * masih bisa lewat. Sekarang SEMUA baris pada `-v error` dihitung (kecuali
 * derau muxer yang bukan soal isi berkas), sama seperti jalur upload web.
 */
function errorDecode(file, detik = 8) {
  const out = jalankan(
    `ffmpeg -v error -i ${JSON.stringify(file)} -t ${detik} -f null - 2>&1 ` +
    `| grep -v "to muxer" | grep -v "Last message repeated" | grep -vc "^$" || true`,
    120000
  );
  return parseInt(out, 10) || 0;
}

const execFileP = (cmd, args, timeout) =>
  new Promise((resolve, reject) =>
    execFile(cmd, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) =>
      err ? reject(new Error(String(stderr || err.message).split("\n").filter(Boolean).pop() || "ffmpeg gagal")) : resolve(stdout)
    )
  );

/**
 * Unduh URL ke berkas sementara. Dipakai supaya bisa diperiksa dulu sebelum
 * dikirim — mengirim `{ url }` langsung ke Baileys berarti tidak ada
 * kesempatan memeriksa codecnya.
 */
export async function unduhKeTemp(url, referer, basis) {
  const file = path.join(TMP, "dl_" + crypto.randomBytes(8).toString("hex") + ".mp4");
  const bersih = rapikanUrl(url, basis);
  if (!/^https?:\/\//i.test(bersih)) throw new Error("URL tidak valid: " + String(url).slice(0, 60));
  const res = await axios.get(bersih, {
    responseType: "stream",
    timeout: 120000,
    maxRedirects: 5,
    headers: { "User-Agent": UA_MOBILE, ...(referer ? { Referer: referer } : {}) },
  });
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(file);
    res.data.pipe(w);
    w.on("finish", resolve);
    w.on("error", reject);
    res.data.on("error", reject);
  });
  if (!fs.existsSync(file) || fs.statSync(file).size < 1000) {
    try { fs.unlinkSync(file); } catch {}
    throw new Error("Unduhan kosong");
  }
  return file;
}

/**
 * Level H.264 minimum yang SAH untuk ukuran + fps tertentu.
 *
 * ═══ KESALAHAN YANG INI RALAT ═══
 *
 * Sebelumnya `-level 4.0` dipatok mati untuk semua berkas. Itu SALAH dan
 * terukur salah: 1080x1920@60 fps butuh 8160 makroblok/frame x 60 =
 * 489.600 MB/s, sementara batas Level 4.0 cuma 245.760 MB/s — kurang separuh.
 *
 * x264 tidak menolak; ia menuliskan `level=40` di header padahal isinya butuh
 * 4.2. Terbukti pada berkas hasil: `level=40` untuk 1080x1920@60. Decoder
 * perangkat keras memakai angka level itu untuk menyiapkan buffer dan
 * memperkirakan beban; kalau isinya ternyata dua kali lipat dari yang
 * dijanjikan, hasilnya frame di-drop atau tersendat — persis keluhan yang
 * sedang dikejar. Jadi patokan itu tidak memperbaiki, tapi menambah masalah.
 *
 * Komentar asli di modul ini sudah memperingatkannya ("memaksa level yang lebih
 * rendah dari kebutuhan membuat header berkas berbohong") dan peringatan itu
 * benar.
 *
 * Tabel dari H.264 Annex A: MaxMBPS (makroblok/detik) dan MaxFS
 * (makroblok/frame). Nilai dikembalikan sebagai string ffmpeg ("4.2").
 * null = di atas 5.1, biar x264 menghitung sendiri.
 */
function levelH264(width, height, fps) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  const f = Number(fps) > 0 ? Number(fps) : 30;
  if (!w || !h) return null;
  const fs = Math.ceil(w / 16) * Math.ceil(h / 16);
  const mbps = fs * f;
  const tabel = [
    ["3.0", 40500, 1620], ["3.1", 108000, 3600], ["3.2", 216000, 5120],
    ["4.0", 245760, 8192], ["4.2", 522240, 8704],
    ["5.0", 589824, 22080], ["5.1", 983040, 36864],
  ];
  const cocok = tabel.find(([, maxMbps, maxFs]) => mbps <= maxMbps && fs <= maxFs);
  return cocok ? cocok[0] : null;
}

/**
 * Laju bit rata-rata sebuah berkas dalam Mbps. 0 kalau tidak terbaca.
 */
function lajuMbps(file) {
  const raw = jalankan(
    `ffprobe -v error -show_entries format=bit_rate -of csv=p=0 ${JSON.stringify(file)}`
  );
  return (Number(raw) || 0) / 1e6;
}

/**
 * Batas laju bit untuk encode ulang, diturunkan dari ISI berkas.
 *
 * ═══ MASALAH YANG INI TANGANI (terukur) ═══
 *
 * Perintah encode dulu `-crf 20` tanpa batas laju apa pun. Pada video TikTok
 * 1080x1920 60 fps hasilnya:
 *
 *   sumber HEVC  22,94 MB   6,66 Mbps rata   puncak 14,47 Mbps
 *   hasil  H.264 55,34 MB  15,80 Mbps rata   puncak 28,70 Mbps   (2,4x lebih besar)
 *   detik di atas 10 Mbps: 4 dari 29  →  24 dari 29
 *
 * Berkas hasilnya mulus secara timing (1731 frame, 60,000 fps, 0 lompatan),
 * jadi patah-patah di HP bukan soal frame hilang — itu decoder yang kewalahan.
 * Decoder perangkat keras HP kelas menengah punya batas laju per level H.264;
 * begitu terlampaui, pemutar jatuh ke decode perangkat lunak dan gambarnya
 * tersendat walau berkasnya sempurna. Diukur dengan decode 1 thread: berkas
 * 15,80 Mbps hanya 2,43x realtime, versi 9 Mbps naik ke 3,23x.
 *
 * ═══ KENAPA ANGKANYA DITURUNKAN, BUKAN DIPATOK ═══
 *
 * Satu angka tetap salah untuk dua arah: 9 Mbps memboroskan bit pada klip
 * 576x1024 30 fps, dan mencekik klip 1080p60. Jadi batas dihitung dari dua
 * petunjuk, lalu diambil yang lebih besar:
 *
 *   a) laju sumber x 1,6 — H.264 butuh ~40-60% lebih banyak bit daripada HEVC
 *      untuk mutu yang sama, jadi ini lantai yang menjaga mutu tidak turun.
 *   b) piksel per detik x 0,09 bit — kebutuhan wajar H.264 pada mutu bagus.
 *
 * Lalu dijepit 2-14 Mbps: di bawah 2 Mbps 1080p mulai pecah, di atas 14 Mbps
 * tidak ada perangkat kelas menengah yang nyaman.
 *
 * `-level 4.0` ikut dipatok karena inilah level yang dijamin didukung decoder
 * perangkat keras 1080p mana pun (batasnya 25 Mbps, jauh di atas 14). Tanpa
 * itu x264 menulis Level 4.2 — terukur pada keluaran lama — dan sebagian
 * perangkat lama menolak berkasnya mentah-mentah.
 */
function batasLaju(file, info, fpsEfektif) {
  const sumber = lajuMbps(file);
  const px = (Number(info.width) || 0) * (Number(info.height) || 0);
  const pps = px * (fpsEfektif > 0 ? fpsEfektif : 30);
  const dariSumber = sumber * 1.6;
  const dariPiksel = (pps * 0.09) / 1e6;
  let mbps = Math.max(dariSumber, dariPiksel);
  if (!(mbps > 0)) return null;
  mbps = Math.min(14, Math.max(2, mbps));
  return {
    maxrate: mbps.toFixed(2) + "M",
    // ═══ KENAPA BUFSIZE = MAXRATE (1x), BUKAN 2x ═══
    //
    // Yang membuat decoder tersendat adalah PUNCAK laju, bukan rata-rata.
    // `bufsize` adalah jendela tempat x264 boleh menabung bit: makin lebar,
    // makin lama ia boleh melampaui `maxrate` sebelum dipaksa turun.
    //
    // Diuji pada sumber yang sama (HEVC 1080p60 6,66 Mbps), CRF 20, hanya
    // bufsize yang berubah:
    //
    //   tanpa batas        55,3 MB   rata 15,88   puncak 28,70 Mbps
    //   buf 2x maxrate     40,1 MB   rata 11,46   puncak 18,66 Mbps
    //   buf 1x maxrate     39,0 MB   rata 11,13   puncak 13,87 Mbps
    //
    // Puncak turun 26% dari 2x ke 1x dengan biaya ukuran hampir nol (1,1 MB),
    // jadi 2x memang terlalu longgar. Bit yang "dihemat" oleh jendela lebar itu
    // dipakai untuk lonjakan yang justru bikin patah di HP.
    bufsize: mbps.toFixed(2) + "M",
    mbps,
    sumber,
    dariSumber,
    dariPiksel,
  };
}

/**
 * Pastikan sebuah berkas video bisa diputar WhatsApp. RESOLUSI tidak diturunkan;
 * fps dibatasi 60 (WhatsApp tidak memutar di atas itu dengan mulus).
 * Mengembalikan { path, temp, info, tindakan }.
 *
 * - Sudah H.264 8-bit yuv420p + AAC + fps ≤ 60 + timing rata → hanya remux
 *   `+faststart` (stream copy, kualitas 100% utuh). faststart wajib: tanpa moov
 *   di depan, penerima harus mengunduh penuh dulu dan di WA sering terlihat
 *   sebagai unduhan gagal.
 * - HEVC / VP9 / 10-bit / 4:2:2 / fps > 60 / **timing tidak rata (VFR)** →
 *   encode ulang ke H.264 8-bit, resolusi DIBIARKAN.
 *
 * `-level` DIHITUNG dari ukuran+fps lewat `levelH264()`, tidak dipatok. Patokan
 * `4.0` sempat dicoba dan itu keliru: 1080x1920@60 butuh Level 4.2, dan
 * menuliskan 4.0 membuat header menjanjikan beban separuh dari isi sebenarnya.
 * Peringatan yang sudah lama ada di sini — "memaksa level lebih rendah dari
 * kebutuhan membuat header berkas berbohong" — memang benar.
 */
export async function siapkanVideoWA(fileMasuk, opts = {}) {
  const hapusSumber = opts.hapusSumber !== false;
  const info = infoVideo(fileMasuk);
  // Codec benar TIDAK berarti berkasnya siap kirim. Selain codec/pix_fmt, fps
  // header yang menipu juga memaksa encode ulang: jalur remux menyalin header
  // itu apa adanya sehingga videonya "jernih tapi timing-nya ngaco".
  //
  // fps di atas 60 juga memaksa encode ulang, dan itu tidak bisa ditawar lewat
  // remux: `-c:v copy` menyalin setiap frame apa adanya, jadi berkas 120 fps
  // yang codecnya sudah H.264 dulu lolos utuh ke penerima.
  const rFps = rencanaFps(fileMasuk);
  const fpsNgaco = rFps.bohong;
  // VFR = biang patah-patah yang paling sering lolos. Diukur pada video TikTok
  // nyata: header 30/1, rata-rata 27,74 fps, jarak antar frame 33,33 ms x136
  // TAPI 66,67 ms x10 — sebelas frame hilang. `bohong` tidak menangkapnya
  // (selisih 7,5%, di bawah toleransi 20%) dan `perluTurun` juga false
  // (27,74 < 60), jadi berkas itu dulu lewat jalur remux dan timestamp rusaknya
  // disalin apa adanya ke penerima. Piksel utuh, timing tidak — persis keluhan
  // "kualitas udah oke tapi fps-nya ga bener".
  const vfr = deteksiVfr(fileMasuk);
  // HDR wajib masuk gerbang encode. Berkas HDR yang codecnya sudah H.264 dulu
  // lolos lewat remux dengan label BT.2020/HLG utuh, dan itu memaksa pemutar
  // masuk jalur render HDR yang berat. Lihat jenisHdr() untuk pengukurannya.
  //
  // `hdrJenis` bisa "hdr" (kurva HDR asli → wajib tone mapping), "gamut"
  // (transfer sudah SDR, cuma label BT.2020 yang nyangkut → cukup pindah gamut),
  // atau null. Yang "gamut" TIDAK memicu encode: uji regresi menunjukkan empat
  // berkas SDR sehat ikut ter-encode sia-sia karena label primaries warisan.
  const hdrJenis = jenisHdr(info);
  const hdr = hdrJenis === "hdr";
  const perluEncode =
    info.codec !== "h264" ||
    (info.pixFmt && info.pixFmt !== "yuv420p") ||
    /10|4:4:4|4:2:2/.test(info.profile) ||
    fpsNgaco ||
    vfr.vfr ||
    hdr ||
    rFps.perluTurun;

  const out = path.join(TMP, "wa_" + crypto.randomBytes(8).toString("hex") + ".mp4");
  const audioArgs = !adaAudio(fileMasuk)
    ? ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-shortest", "-c:a", "aac", "-b:a", "128k"]
    : kodekAudio(fileMasuk) === "aac"
      ? ["-c:a", "copy"]
      : ["-c:a", "aac", "-b:a", "192k"];

  const bersihkan = () => { if (hapusSumber) { try { fs.unlinkSync(fileMasuk); } catch {} } };

  if (!perluEncode) {
    try {
      const args = ["-y", "-i", fileMasuk, ...audioArgs, "-c:v", "copy", "-movflags", "+faststart", out];
      await execFileP("ffmpeg", args, 300000);
      if (fs.existsSync(out) && fs.statSync(out).size > 1000 && errorDecode(out) === 0) {
        bersihkan();
        return { path: out, temp: true, info, tindakan: "remux" };
      }
    } catch {}
    try { fs.unlinkSync(out); } catch {}
  }

  // Encode ulang. RESOLUSI tidak disentuh sama sekali.
  //
  // fps:
  //   > 60          → diratakan ke 60 (lihat hillz-fps.js; 120/240 lewat
  //                   pembagi bulat, 90/100 dipaksa 60)
  //   header bohong → fps NYATA dipaksa sebagai PECAHAN, bukan desimal.
  //                   Diukur: tanpa ini, ffmpeg percaya header 25/1 dan membuang
  //                   630 dari 1083 paket; dengan fps nyata semuanya bertahan.
  //   sudah wajar   → dibiarkan apa adanya (passthrough)
  //
  // Filter `fps=` dipakai, bukan cuma `-r`: filter bekerja di dalam rantai
  // filter dengan timestamp yang dihitung ulang konsisten, sedangkan `-r`
  // sendirian hanya menambal timestamp di akhir dan pada sumber VFR bisa
  // menduplikasi frame diam-diam.
  //
  // SEMUA filter dikumpulkan ke satu rantai. Ini penting: `-vf` hanya boleh
  // muncul SEKALI di satu perintah ffmpeg — yang terakhir menang dan yang
  // sebelumnya hilang tanpa peringatan. Sebelum ada HDR di sini, `-vf` cuma
  // dipakai satu tempat sehingga masalahnya tidak terlihat; begitu tone mapping
  // masuk, dua `-vf` akan membuat salah satunya lenyap diam-diam.
  const filters = [];
  const fpsArgs = [];
  if (rFps.perluTurun) {
    filters.push(filterFps(rFps));
    fpsArgs.push(...argKeluaranFps(rFps, FFMPEG_PUNYA_FPS_MODE));
  } else if (vfr.vfr) {
    // VFR: timing sumber TIDAK BOLEH diteruskan. `fps=` dengan angka nyata
    // menaruh setiap frame di slot yang berjarak sama, dan `-fps_mode cfr`
    // memaksa keluarannya benar-benar rata.
    //
    // Angka target diambil dari fps NYATA hasil pengukuran per frame
    // (`vfr.fpsNyata`), bukan dari header — pada berkas yang bermasalah header
    // bilang 30/1 sementara isinya 27,74 fps. Memakai header berarti ffmpeg
    // harus menciptakan frame yang tidak ada, dan itu menduplikasi frame
    // (gerakan tersendat dengan cara yang berbeda, bukan lebih baik).
    //
    // Dibulatkan ke fps umum terdekat kalau selisihnya di bawah 8%: sumber
    // 27,74 fps yang sebenarnya rekaman 30 fps dengan frame hilang lebih baik
    // keluar sebagai 30 fps rata daripada 27,74 fps rata, karena durasinya jadi
    // pas dan audio tidak bergeser.
    const nyata = vfr.fpsNyata > 0 ? vfr.fpsNyata : (rFps.detail.nyata || 30);
    const umum = [24, 25, 30, 50, 60];
    const dekat = umum.find((u) => Math.abs(nyata - u) / u < 0.08);
    const target = Math.min(FPS_MAKS, dekat || Math.round(nyata * 100) / 100);
    filters.push(`fps=${target}`);
    fpsArgs.push(
      ...(FFMPEG_PUNYA_FPS_MODE
        ? ["-fps_mode", "cfr", "-r", String(target)]
        : ["-vsync", "1", "-r", String(target)]),
    );
  } else if (fpsNgaco) {
    // Header bohong tapi fps nyatanya masih di bawah batas: pakai angka nyata.
    // Dijepit di FPS_MAKS untuk berkas VFR ngawur yang melaporkan angka raksasa.
    const nyata = rFps.detail.nyata;
    if (nyata > 0) {
      fpsArgs.push("-r", nyata > FPS_MAKS ? String(FPS_MAKS) : rFps.detail.nyataStr);
    }
  } else {
    fpsArgs.push(...argKeluaranFps(rFps, FFMPEG_PUNYA_FPS_MODE));
  }

  // HDR → SDR. Ditaruh SESUDAH filter fps supaya tone mapping (bagian termahal
  // dari seluruh rantai) hanya mengerjakan frame yang benar-benar ikut keluar.
  // Label warna keluaran diganti bersamaan; terukur bahwa mengganti label saja
  // tanpa filter menghasilkan campuran `bt709/bt2020/arib-std-b67` yang justru
  // lebih membingungkan pemutar daripada label HDR yang utuh.
  const argWarna = [];
  if (hdrJenis) {
    filters.push(filterHdrKeSdr(hdrJenis));
    argWarna.push(
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      // `-color_range tv` ikut dipatok: tanpa ini sebagian berkas keluar tanpa
      // keterangan rentang dan pemutar menebak, yang membuat hitam jadi kelabu.
      "-color_range", "tv",
    );
  }
  const vfArgs = filters.length ? ["-vf", filters.join(",")] : [];

  // `-g` dipatok ~2 detik: keyint default 250 berarti 4+ detik antar keyframe,
  // dan seek di tengah gerakan terasa tersendat. CRF 20 dipertahankan (jalur ini
  // untuk video unduhan yang sudah terkompresi sekali; CRF lebih rendah hanya
  // memperbesar berkas tanpa menambah detail yang sudah hilang).
  const fpsGop = rFps.perluTurun ? rFps.target : (rFps.detail.nyata || 30);
  const gop = Math.max(24, Math.round(fpsGop * 2));

  // Batas laju + level: tanpa ini keluaran terukur 15,88 Mbps rata / 28,70 Mbps
  // puncak dari sumber 6,66 Mbps, dan decoder HP kelas menengah tersendat walau
  // timing berkasnya sempurna. Lihat batasLaju() untuk asal angkanya.
  //
  // Level DIHITUNG dari ukuran+fps, tidak dipatok. `-level 4.0` untuk
  // 1080x1920@60 menuliskan janji yang tidak bisa dipenuhi isinya (butuh 4.2)
  // dan itu justru bikin decoder salah menyiapkan buffer.
  const fpsAkhir = rFps.perluTurun ? rFps.target : (vfr.vfr ? (vfr.fpsNyata || 30) : (rFps.detail.nyata || 30));
  const laju = batasLaju(fileMasuk, info, fpsGop);
  const lvl = levelH264(info.width, info.height, fpsAkhir);
  const argLaju = [
    ...(laju ? ["-maxrate", laju.maxrate, "-bufsize", laju.bufsize] : []),
    ...(lvl ? ["-level", lvl] : []),
  ];

  const argsEnc = [
    "-y", "-err_detect", "ignore_err", "-fflags", "+genpts+discardcorrupt",
    "-i", fileMasuk,
    ...(adaAudio(fileMasuk) ? [] : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-shortest"]),
    ...vfArgs,
    ...fpsArgs,
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-preset", "fast", "-crf", "20",
    ...argWarna,
    ...argLaju,
    "-g", String(gop), "-keyint_min", String(Math.round(gop / 2)), "-sc_threshold", "0",
    "-c:a", "aac", "-b:a", "192k", "-ac", "2",
    "-movflags", "+faststart", out,
  ];
  try {
    await execFileP("ffmpeg", argsEnc, 600000);
  } catch (e) {
    // exit code ffmpeg TIDAK menentukan: sumber cacat membuat ffmpeg mengeluh
    // soal INPUT dan keluar non-nol walau keluarannya utuh. Hasil yang menilai.
  }
  if (fs.existsSync(out) && fs.statSync(out).size > 1000 && errorDecode(out) === 0) {
    bersihkan();
    return {
      path: out,
      temp: true,
      info: infoVideo(out),
      tindakan: "encode",
      // Alasan ikut dikembalikan supaya jalur pemanggil bisa melaporkannya dan
      // keputusan encode bisa dilacak dari log, bukan ditebak.
      alasan: {
        vfr: vfr.vfr ? vfr.alasan : null,
        fps: rFps.perluTurun ? rFps.alasan : null,
        hdr: hdrJenis ? `${hdrJenis === "hdr" ? "HDR" : "gamut BT.2020"} ${info.transfer || "?"}/${info.primer || "?"} → SDR bt709` : null,
        laju: laju ? `dibatasi ${laju.maxrate} (sumber ${laju.sumber.toFixed(2)} Mbps)` : null,
        level: lvl ? `level ${lvl}` : null,
      },
    };
  }
  try { fs.unlinkSync(out); } catch {}
  // Gagal menyiapkan: pakai berkas asli, biar tetap terkirim apa adanya.
  return { path: fileMasuk, temp: hapusSumber, info, tindakan: "apa-adanya" };
}

/**
 * Jalur lengkap: dari daftar kandidat URL → berkas siap kirim ke WA.
 * Kandidat diurutkan dari kualitas tertinggi dan dicoba satu per satu, jadi
 * kalau URL HD mati, HD berikutnya (bukan langsung SD) yang dicoba.
 */
export async function ambilVideoHD(kandidat, opts = {}) {
  const urut = urutkanKualitas(kandidat);
  if (!urut.length) throw new Error("Tidak ada URL video");
  let errTerakhir;
  for (const c of urut) {
    const url = typeof c === "string" ? c : c.url;
    // `basis` per-kandidat menang atas basis global: satu daftar bisa memuat URL
    // dari beberapa sumber (mis. aio menggabungkan tikwm + API lain).
    const basis = (typeof c === "object" && c.basis) || opts.basis;
    try {
      const mentah = await unduhKeTemp(url, opts.referer, basis);
      const siap = await siapkanVideoWA(mentah);
      return { ...siap, url };
    } catch (e) {
      errTerakhir = e;
    }
  }
  throw errTerakhir || new Error("Semua URL video gagal diunduh");
}

/** Ringkasan singkat untuk caption, mis. "1080x1920 · H.264 · dikonversi". */
export function ringkasKualitas(siap) {
  if (!siap || !siap.info) return "";
  const { width, height, codec } = siap.info;
  const dim = width && height ? `${width}x${height}` : "";
  const kode = codec === "h264" ? "H.264" : (codec || "").toUpperCase();
  // "1080x1920 · H.264 · dikonversi ke H.264" itu mengulang diri sendiri.
  // Codec hasil selalu H.264, jadi yang berguna disebut adalah apa yang terjadi.
  const aksi =
    siap.tindakan === "encode" ? "dikonversi" :
    siap.tindakan === "remux" ? "kualitas asli" : "apa adanya";
  return [dim, kode, aksi].filter(Boolean).join(" · ");
}
