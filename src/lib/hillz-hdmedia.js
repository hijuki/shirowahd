import axios from "axios";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { execSync, execFile } from "child_process";

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
    `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,pix_fmt,profile,r_frame_rate -of default=nw=1 ${JSON.stringify(file)}`
  );
  const get = (k) => (raw.match(new RegExp(`^${k}=(.*)$`, "m")) || [, ""])[1].trim();
  return {
    codec: get("codec_name").toLowerCase(),
    width: Number(get("width")) || 0,
    height: Number(get("height")) || 0,
    pixFmt: get("pix_fmt").toLowerCase(),
    profile: get("profile"),
    fps: get("r_frame_rate"),
  };
}

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

function errorDecode(file, detik = 8) {
  const out = jalankan(
    `ffmpeg -v error -i ${JSON.stringify(file)} -t ${detik} -f null - 2>&1 | grep -c "Error while decoding" || true`,
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
 * Pastikan sebuah berkas video bisa diputar WhatsApp, TANPA menurunkan
 * resolusi atau fps. Mengembalikan { path, temp, info, tindakan }.
 *
 * - Sudah H.264 8-bit yuv420p + AAC → hanya remux `+faststart` (stream copy,
 *   kualitas 100% utuh). faststart wajib: tanpa moov di depan, penerima harus
 *   mengunduh penuh dulu dan di WA sering terlihat sebagai unduhan gagal.
 * - HEVC / VP9 / 10-bit / 4:2:2 → encode ulang ke H.264 8-bit dengan resolusi
 *   dan fps DIBIARKAN APA ADANYA. `-level` tidak dipaksa: memaksa level yang
 *   lebih rendah dari kebutuhan membuat header berkas berbohong, dan decoder
 *   perangkat keras menolaknya.
 */
export async function siapkanVideoWA(fileMasuk, opts = {}) {
  const hapusSumber = opts.hapusSumber !== false;
  const info = infoVideo(fileMasuk);
  const perluEncode =
    info.codec !== "h264" ||
    (info.pixFmt && info.pixFmt !== "yuv420p") ||
    /10|4:4:4|4:2:2/.test(info.profile);

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

  // Encode ulang. Resolusi & fps tidak disentuh — hanya codec dan pix_fmt.
  const argsEnc = [
    "-y", "-err_detect", "ignore_err", "-fflags", "+genpts+discardcorrupt",
    "-i", fileMasuk,
    ...(adaAudio(fileMasuk) ? [] : ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-shortest"]),
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-preset", "faster", "-crf", "20",
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
    return { path: out, temp: true, info: infoVideo(out), tindakan: "encode" };
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
