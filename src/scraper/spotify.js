import axios from "axios";

async function downloadSpotify(spotifyUrl) {
  try {
    const response = await axios.post(
      "https://spotyloader.com/api/spotify/track",
      { url: spotifyUrl },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://spotyloader.com/",
          Origin: "https://spotyloader.com",
        },
      },
    );
    const data = response.data;
    if (data.downloadLink) {
      return {
        status: true,
        title: data.post?.name || "Unknown",
        artist: data.post?.artist || "Unknown",
        format: data.post?.mime || "audio/mpeg",
        downloadUrl: data.downloadLink,
      };
    }
    return { status: false, error: "Gagal mendapatkan link download" };
  } catch (error) {
    return { status: false, error: error.response?.data || error.message };
  }
}

export { downloadSpotify };
