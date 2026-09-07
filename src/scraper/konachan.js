import axios from 'axios';

export async function konachan(tag) {
  try {
    const res = await axios.get(`https://konachan.net/post.json?tags=${encodeURIComponent(tag)}&limit=15`, { timeout: 15000 });
    return res.data?.map(p => ({
      id: p.id,
      tags: p.tags,
      file_url: p.file_url,
      preview_url: p.preview_url,
      rating: p.rating
    })) || [];
  } catch (e) {
    throw new Error('Konachan scraper error: ' + e.message);
  }
}
