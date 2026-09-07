import axios from 'axios';

export async function gsmarena(query) {
  try {
    const res = await axios.get(`https://api.fdci.se/sosmed/gsmarena?query=${encodeURIComponent(query)}`, { timeout: 15000 });
    return res.data;
  } catch (e) {
    throw new Error('GSMArena scraper error: ' + e.message);
  }
}
