import axios from "axios";

async function topmediaDl(url) {
  try {
    const { data } = await axios.post("https://topmediadl.com/wp-json/aio-dl/video-data/", { url }, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://topmediadl.com/",
        Origin: "https://topmediadl.com",
      },
      transformRequest: [(data) => new URLSearchParams(data).toString()],
    });
    if (!data) throw new Error("No data received");
    const results = [];
    if (data.medias) {
      for (const m of data.medias) {
        results.push({ type: m.type?.includes("video") ? "video" : m.type?.includes("audio") ? "audio" : "unknown", quality: m.quality || "default", url: m.url, size: m.formattedSize || m.size });
      }
    }
    return { status: true, title: data.title || "Media", thumbnail: data.thumbnail || null, results };
  } catch (e) {
    return { status: false, error: e.message };
  }
}

export { topmediaDl };
