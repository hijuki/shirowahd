import axios from "axios";

async function douyinFetch(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get("https://api.azbry.com/api/downloader/douyin?url=" + encodeURIComponent(url), { timeout: 30000 });
      if (res.data?.status && res.data?.result) return res.data;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Gagal mengambil data dari Douyin");
}

async function douyinDl(url) {
  const data = await douyinFetch(url);
  const result = data.result;
  return {
    status: true,
    title: result.title || "Douyin Video",
    platform: result.platform || "Douyin",
    video: result.video || null,
    audio: result.audio || null,
    images: result.images || [],
  };
}

export { douyinDl };
