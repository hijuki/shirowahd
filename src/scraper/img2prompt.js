import axios from 'axios';

export async function img2prompt(imageUrl) {
  try {
    const res = await axios.post('https://api.replicate.com/v1/predictions', {
      version: '50dbf9a38e10304a297cf21cefb11a80eada9709b0be700f6d3e9866e3a69530',
      input: { image: imageUrl }
    }, { timeout: 30000 });
    return res.data;
  } catch (e) {
    throw new Error('Img2Prompt error: ' + e.message);
  }
}

export const imgtoprompt = img2prompt;
export default img2prompt;
