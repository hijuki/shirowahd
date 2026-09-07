import axios from 'axios';

export async function wallpaper(query) {
  try {
    const res = await axios.get(`https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(query)}`, { timeout: 15000 });
    return res.data?.data?.map(w => ({
      id: w.id,
      url: w.path,
      thumbs: w.thumbs?.large || w.thumbs?.original,
      resolution: w.resolution,
      category: w.category
    })) || [];
  } catch (e) {
    throw new Error('Wallpaper scraper error: ' + e.message);
  }
}
