import axios from 'axios';

export async function reelsvideo(url) {
  try {
    const res = await axios.post('https://reelsvideo.io/api/ajaxSearch', new URLSearchParams({ q: url, t: 'media', lang: 'en' }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 20000
    });
    return res.data;
  } catch (e) {
    throw new Error('ReelsVideo error: ' + e.message);
  }
}
