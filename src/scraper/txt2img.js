import axios from 'axios';

export async function txt2img(prompt) {
  try {
    const res = await axios.get(`https://api.pollinations.ai/prompt/${encodeURIComponent(prompt)}`, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    return Buffer.from(res.data);
  } catch (e) {
    throw new Error('Txt2Img error: ' + e.message);
  }
}
