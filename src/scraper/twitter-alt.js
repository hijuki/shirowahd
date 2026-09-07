import axios from 'axios';

export async function twitterAlt(url) {
  try {
    const res = await axios.post('https://twitsave.com/info', new URLSearchParams({ url }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 20000
    });
    return res.data;
  } catch (e) {
    throw new Error('Twitter Alt error: ' + e.message);
  }
}
