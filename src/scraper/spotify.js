import axios from 'axios';

export async function spotify(query) {
  try {
    const res = await axios.get(`https://api.fabdl.com/spotify/get?url=${encodeURIComponent(query)}`, {
      timeout: 20000
    });
    return res.data?.result || res.data;
  } catch (e) {
    throw new Error('Spotify scraper error: ' + e.message);
  }
}

export const downloadSpotify = spotify;
export default spotify;
