import axios from "axios";

async function konachanSearch(query) {
  try {
    const { data } = await axios.get("https://konachan.net/post.json?tags=" + encodeURIComponent(query) + "&limit=10", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const results = (Array.isArray(data) ? data : []).map((post) => ({
      id: post.id,
      tags: post.tags,
      rating: post.rating,
      file_url: post.file_url,
      preview_url: post.preview_url,
      sample_url: post.sample_url,
      width: post.width,
      height: post.height,
    }));
    return { status: true, total: results.length, results };
  } catch (e) {
    return { status: false, error: e.message };
  }
}

export { konachanSearch };
