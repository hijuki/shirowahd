import axios from "axios";

// Satu endpoint = satu titik gagal. Diukur langsung: `azbry/instagramv2`
// menjawab HTTP 500 dengan pesan "Semua provider gagal: 403" karena Instagram
// memblokir scraper di sisi hulu, dan saat itu terjadi perintah `.ig` mati total.
// Endpoint dicoba berurutan, dan yang pertama memberi tautan dipakai.
const ENDPOINT_IG = [
  { nama: "azbry", url: "https://api.azbry.com/api/download/instagramv2" },
  { nama: "nexray", url: "https://api.nexray.web.id/downloader/v2/instagram" },
];

/** Ambil daftar tautan dari bentuk respons yang berbeda-beda antar provider. */
function ambilTautan(data) {
  if (!data) return [];
  if (Array.isArray(data.links)) return data.links;
  if (Array.isArray(data.result)) return data.result;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.result?.media)) return data.result.media;
  if (Array.isArray(data.data?.media)) return data.data.media;
  return [];
}

async function instagramDownloader(url) {
  let data = null;
  let galatTerakhir = null;
  for (const ep of ENDPOINT_IG) {
    try {
      const response = await axios.get(ep.url, {
        params: { url: url },
        timeout: 30000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (ambilTautan(response.data).length) { data = response.data; break; }
      galatTerakhir = new Error(ep.nama + ": respons tanpa tautan");
    } catch (e) {
      galatTerakhir = new Error(ep.nama + ": " + (e.response?.data?.message || e.message));
    }
  }
  if (!data) {
    throw new Error(
      "Semua sumber Instagram menolak. Instagram sedang memblokir pengunduh — coba lagi nanti. (" +
        (galatTerakhir?.message || "tanpa detail") + ")",
    );
  }
  data = { ...data, links: ambilTautan(data) };

  const media = data.links.map((item) => {
    const itemType = String(item.type || "").toLowerCase();
    const itemUrl = String(item.url || "").toLowerCase();
    const isVideo = itemType === "video" || itemType === "mp4" || itemUrl.includes(".mp4");
    return {
      type: isVideo ? "video" : "image",
      url: item.url,
      thumbnail: item.thumbnail || "",
      // Petunjuk kualitas diteruskan apa adanya bila API menyediakannya.
      // Tanpa ini, pemilih kualitas hanya bisa menebak dari teks URL.
      quality: item.quality || item.label || item.resolution || "",
      width: item.width || 0,
      height: item.height || 0,
      size: item.size || item.filesize || 0,
    };
  });

  const firstLink = data.links[0] || {};
  const captionText = firstLink.text && firstLink.text !== "null" ? firstLink.text.trim() : "";
  const authorName = data.author && data.author !== "Unknown" ? data.author : "-";
  const thumbUrl = firstLink.thumbnail || data.thumbnail || "";

  return {
    status: true,
    username: authorName,
    title: captionText || authorName,
    caption: captionText,
    thumbnail: thumbUrl,
    avatar: data.avatar || "",
    media: media,
  };
}

export default instagramDownloader;
