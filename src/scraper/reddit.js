import axios from 'axios';

export async function reddit(url) {
  try {
    const jsonUrl = url.replace(/\/$/, '') + '.json';
    const res = await axios.get(jsonUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 15000
    });
    const post = res.data[0]?.data?.children[0]?.data;
    if (!post) throw new Error('Post not found');

    const videoUrl = post.secure_media?.reddit_video?.fallback_url || post.media?.reddit_video?.fallback_url;
    return {
      title: post.title,
      author: post.author,
      ups: post.ups,
      num_comments: post.num_comments,
      url: post.url,
      isVideo: !!videoUrl,
      videoUrl: videoUrl || null,
      thumbnail: post.thumbnail
    };
  } catch (e) {
    throw new Error('Reddit scraper error: ' + e.message);
  }
}

export const RedditDL = reddit;
export default reddit;
