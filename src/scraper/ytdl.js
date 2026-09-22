import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const YOUTUBE_ID_REGEX =
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
const run = promisify(exec);

const SAVETUBE_SEED_HEX = "C5D58EF67A7584E4A29F6C35BBC4EB12";
const SAVETUBE_KEY_BYTES = Buffer.from(SAVETUBE_SEED_HEX, "hex");

function extractVideoId(url) {
  const str = String(url || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  return str.match(YOUTUBE_ID_REGEX)?.[1] || null;
}

async function fallbackToMp3Buffer(url) {
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const id = crypto.randomBytes(6).toString("hex");
  const inputPath = path.join(tempDir, `ytfb_${id}.bin`);
  const outputPath = path.join(tempDir, `ytfb_${id}.mp3`);

  try {
    const { data } = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 60000,
    });

    const buffer = Buffer.from(data);
    if (!buffer.length) {
      throw new Error("Audio fallback kosong");
    }

    fs.writeFileSync(inputPath, buffer);

    await run(
      `ffmpeg -y -i "${inputPath}" -vn -map_metadata -1 -ac 2 -ar 44100 -c:a libmp3lame -b:a 192k "${outputPath}"`,
      { timeout: 120000 },
    );

    const mp3Buffer = fs.readFileSync(outputPath);
    if (!mp3Buffer.length) {
      throw new Error("Konversi fallback ke MP3 gagal");
    }

    return mp3Buffer;
  } finally {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch { /* cleanup */ }
    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch { /* cleanup */ }
  }
}

async function scrapeSaveTube(url, format = "mp3") {
  const isVideo = ["video", "mp4"].includes(String(format).toLowerCase());
  const cdnRes = await axios.get("https://media.savetube.vip/api/random-cdn", { timeout: 10000 });
  const cdn = cdnRes.data?.cdn;
  if (!cdn) throw new Error("Gagal mendapatkan CDN SaveTube");

  const infoRes = await axios.post(`https://${cdn}/v2/info`, { url }, {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Origin": "https://yt-mp4.net",
      "Referer": "https://yt-mp4.net/"
    },
    timeout: 15000
  });

  const infoJson = infoRes.data;
  if (!infoJson.status || !infoJson.data) throw new Error("Gagal mengambil info video");

  const rawBuffer = Buffer.from(infoJson.data, "base64");
  const iv = rawBuffer.subarray(0, 16);
  const cipherText = rawBuffer.subarray(16);

  const decipher = crypto.createDecipheriv("aes-128-cbc", SAVETUBE_KEY_BYTES, iv);
  let decrypted = decipher.update(cipherText, null, "utf8");
  decrypted += decipher.final("utf8");

  const videoData = JSON.parse(decrypted);

  const dlRes = await axios.post(`https://${cdn}/download`, {
    downloadType: isVideo ? "video" : "audio",
    quality: isVideo ? "720" : "128",
    key: videoData.key
  }, {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Origin": "https://yt-mp4.net",
      "Referer": "https://yt-mp4.net/"
    },
    timeout: 15000
  });

  const dlUrl = dlRes.data?.data?.downloadUrl;
  if (!dlUrl) throw new Error("Gagal mengambil URL unduhan SaveTube");

  return {
    status: true,
    title: videoData.title || "",
    dl: dlUrl
  };
}

async function scrapeAzbry(url, format = "mp3") {
  const isVideo = ["video", "mp4"].includes(String(format).toLowerCase());
  const endpoint = isVideo ? "ytmp4" : "ytmp3";
  const res = await axios.get(`https://api.azbry.com/api/download/${endpoint}?url=${encodeURIComponent(url)}`, {
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  if (res.data?.status && res.data?.result?.download) {
    return {
      status: true,
      title: res.data.result.title || "",
      dl: res.data.result.download
    };
  }
  throw new Error("Azbry API gagal mengembalikan URL unduhan");
}

async function scrapeYmcdn(videoId, format = "mp3") {
  const normalizedFormat = String(format || "mp3").toLowerCase() === "mp4" ? "mp4" : "mp3";
  const client = axios.create({
    timeout: 30000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 16; NX729J) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7271.123 Mobile Safari/537.36",
      Referer: "https://id.ytmp3.mobi/",
    },
  });

  const { data: init } = await client.get("https://d.ymcdn.org/api/v1/init", {
    params: {
      p: "y",
      23: "1llum1n471",
      _: Math.random(),
    },
  });

  if (!init?.convertURL) {
    throw new Error("Init failed");
  }

  const { data: convert } = await client.get(init.convertURL, {
    params: {
      v: videoId,
      f: normalizedFormat,
      _: Math.random(),
    },
  });

  if (!convert?.progressURL || !convert?.downloadURL) {
    throw new Error("Gagal konversi ymcdn");
  }

  let progress = 0;
  let title = convert.title || "";
  let attempts = 0;
  const maxAttempts = 15;

  while (progress < 3 && attempts < maxAttempts) {
    const { data } = await client.get(convert.progressURL);
    if ((data?.error || 0) > 0) {
      throw new Error(`Error dari server: ${data.error}`);
    }
    progress = Number(data?.progress || 0);
    title = data?.title || title;
    if (progress < 3) {
      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  if (attempts >= maxAttempts && progress < 3) {
    throw new Error("Request timeout (proses terlalu lama)");
  }

  return { status: true, title, dl: convert.downloadURL };
}

async function ytdl(url, format = "mp3") {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      return {
        status: false,
        mess: "Format URL tidak dikenali atau bukan link YouTube yang valid.",
      };
    }

    const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const normalizedFormat =
      String(format || "mp3").toLowerCase() === "mp4" ? "mp4" : "mp3";

    // Tier 1: SaveTube Direct (Fast & Decrypted)
    try {
      const res = await scrapeSaveTube(standardUrl, normalizedFormat);
      if (res?.status && res?.dl) return res;
    } catch (e1) {
      // lanjut tier 2
    }

    // Tier 2: Azbry API (Reliable Wrapper)
    try {
      const res = await scrapeAzbry(standardUrl, normalizedFormat);
      if (res?.status && res?.dl) return res;
    } catch (e2) {
      // lanjut tier 3
    }

    // Tier 3: YMCDN
    try {
      const res = await scrapeYmcdn(videoId, normalizedFormat);
      if (res?.status && res?.dl) return res;
    } catch (e3) {
      // semua gagal
    }

    return {
      status: false,
      mess: "Semua server downloader YouTube sedang tidak dapat dijangkau.",
    };
  } catch (e) {
    return { status: false, mess: `System Error: ${e.message}` };
  }
}

class Youtube {
  constructor() {
    this.CREATED_BY = "Ditzzy";
    this.NOTE = "Thank you for using this scrape";
  }

  wrapResponse(data) {
    return {
      created_by: this.CREATED_BY,
      note: this.NOTE,
      results: data,
    };
  }

  async download(url, format = "audio") {
    const outputFormat = ["video", "mp4"].includes(
      String(format || "audio").toLowerCase(),
    )
      ? "mp4"
      : "mp3";
    const result = await ytdl(url, outputFormat);

    if (!result?.status || !result?.dl) {
      throw new Error(result?.mess || "Gagal mengunduh konten YouTube");
    }

    return this.wrapResponse({
      title: result.title,
      download: result.dl,
      url: result.dl,
      format: outputFormat,
    });
  }
}

export { ytdl, Youtube, fallbackToMp3Buffer };
export default ytdl;
