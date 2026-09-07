import axios from "axios";
import crypto from "crypto";
import qs from "qs";

const CONFIG = {
  BASE_URL: "https://ssyoutube.com",
  API: { CONVERT: "/api/convert" },
  SECRETS: {
    SALT: "384d5028ee4a399f6cae0175025a1708aa924fc0ccb08be1aa359cd856dd1639",
    FIXED_TS: "1765962059039",
  },
  HEADERS: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    Origin: "https://ssyoutube.com",
    Referer: "https://ssyoutube.com/",
  },
};

function generateSignature(url, timestamp) {
  try {
    const rawString = url + timestamp + CONFIG.SECRETS.SALT;
    return crypto.createHash("sha256").update(rawString).digest("hex");
  } catch (e) {
    return null;
  }
}

function formatSize(bytes) {
  if (!bytes) return "Unknown";
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
}

async function ssyoutubeDl(url) {
  try {
    const timestamp = CONFIG.SECRETS.FIXED_TS;
    const signature = generateSignature(url, timestamp);
    if (!signature) throw new Error("Failed to generate signature");
    const payload = qs.stringify({ url, ts: timestamp, sig: signature });
    const { data } = await axios.post(CONFIG.BASE_URL + CONFIG.API.CONVERT, payload, {
      headers: CONFIG.HEADERS,
      timeout: 30000,
    });
    if (!data || !data.data) throw new Error("No data received");
    const info = data.data;
    const results = [];
    if (info.url) {
      results.push({ type: "video", quality: info.quality || "default", format: info.ext || "mp4", size: formatSize(info.filesize), url: info.url });
    }
    if (info.medias) {
      for (const media of info.medias) {
        results.push({
          type: media.type || (media.ext === "mp3" ? "audio" : "video"),
          quality: media.quality || "default",
          format: media.ext || "mp4",
          size: formatSize(media.filesize),
          url: media.url,
        });
      }
    }
    return {
      status: true,
      title: info.title || "YouTube Video",
      thumbnail: info.thumbnail || null,
      duration: info.duration || null,
      results,
    };
  } catch (error) {
    return { status: false, error: error.message };
  }
}

export { ssyoutubeDl };
