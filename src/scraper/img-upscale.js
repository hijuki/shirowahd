import axios from 'axios';

export async function imgUpscale(imageUrl) {
  try {
    const res = await axios.post('https://api.imglarger.com/api/Upscaler/Upload', {
      type: 1,
      scaleRadio: 2,
      base64: imageUrl
    }, { timeout: 30000 });
    return res.data;
  } catch (e) {
    throw new Error('ImgUpscale error: ' + e.message);
  }
}
