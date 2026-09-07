import axios from 'axios';

export async function unwatermark(imageUrl) {
  try {
    const res = await axios.post('https://api.unwatermark.ai/api/remove-watermark', {
      image: imageUrl
    }, { timeout: 30000 });
    return res.data;
  } catch (e) {
    throw new Error('Unwatermark error: ' + e.message);
  }
}
