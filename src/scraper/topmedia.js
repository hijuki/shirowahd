import axios from 'axios';

export async function topmedia(text, speaker = '001') {
  try {
    const res = await axios.post('https://api.topmediai.com/v1/text2speech', {
      text,
      speaker,
      emotion: 'neutral'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    return res.data;
  } catch (e) {
    throw new Error('TopMedia TTS error: ' + e.message);
  }
}
