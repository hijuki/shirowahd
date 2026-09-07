import axios from 'axios';

export async function rednote(url) {
  try {
    const res = await axios.post('https://rednote.savevideodown.com/api/rednote', { url }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });
    return res.data;
  } catch (e) {
    throw new Error('RedNote download failed: ' + e.message);
  }
}

export const RedNoteDL = rednote;
export default rednote;
