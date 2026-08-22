/**
 * Videy.co scraper
 * CDN pattern: https://cdn.videy.co/{id}.{ext}
 * Extension rules (from videy.co JS bundle):
 *   - id length 8, or length 9 ending in "1" → mp4
 *   - id length 9 ending in "2" → mov
 *   - default → mp4
 */

const CDN_BASE = "https://cdn.videy.co";

function getExtension(id) {
  if (!id || id.length === 8) return "mp4";
  if (id.length === 9 && id.endsWith("1")) return "mp4";
  if (id.length === 9 && id.endsWith("2")) return "mov";
  return "mp4";
}

function extractId(url) {
  const match = url.match(/videy\.co\/v\/?.*[?&]id=([A-Za-z0-9]+)/i);
  return match ? match[1] : null;
}

async function videyScraper(url) {
  const id = extractId(url);
  if (!id) throw new Error("ID video tidak ditemukan dari URL");

  const ext = getExtension(id);
  const videoUrl = `${CDN_BASE}/${id}.${ext}`;

  // ponytail: HEAD check skipped — CDN is reliable, saves a round trip. Add if false positives appear.
  return {
    status: true,
    id,
    url: videoUrl,
    ext,
  };
}

export default videyScraper;
export { videyScraper, extractId, getExtension };
