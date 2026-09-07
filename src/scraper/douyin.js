import axios from 'axios';

export async function douyin(url) {
  try {
    const res = await axios.post('https://api.douyin.wtf/api?url=' + encodeURIComponent(url), {}, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 20000
    });
    return res.data;
  } catch (e) {
    throw new Error('Douyin scraper error: ' + e.message);
  }
}

export const douyinDl = douyin;
export default douyin;
