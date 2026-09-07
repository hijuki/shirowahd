import axios from 'axios';

export async function youtubeAlt(url) {
  try {
    const res = await axios.post('https://ssyoutube.com/api/convert', { url }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000
    });
    return res.data;
  } catch (e) {
    throw new Error('YouTube Alt error: ' + e.message);
  }
}
