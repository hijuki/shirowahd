import axios from "axios";
import crypto from "crypto";

function generateCfToken() {
  return [
    "0",
    crypto.randomBytes(16).toString("hex"),
    crypto.randomBytes(32).toString("base64url"),
    crypto.randomBytes(64).toString("base64url"),
    crypto.randomBytes(32).toString("hex"),
  ].join(".");
}

async function x2twitterDl(url) {
  try {
    const cfToken = generateCfToken();
    const sessionToken = crypto.randomBytes(16).toString("hex");
    const searchResponse = await axios.post(
      "https://x2twitter.com/api/ajaxSearch",
      new URLSearchParams({ q: url, lang: "id", cftoken: cfToken }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          Origin: "https://x2twitter.com",
          Referer: "https://x2twitter.com/id",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Cookie: "_session=" + sessionToken + "; lang=id",
        },
      },
    );
    if (searchResponse.data.status !== "ok") {
      return { error: true, message: "Gagal mengambil data dari x2twitter." };
    }
    const html = searchResponse.data.data;
    const thumbnail = (html.match(/<img\s+src="([^"]+)"/) || [])[1] || "-";
    const duration = (html.match(/<p>(\d+:\d+)<\/p>/) || [])[1] || "-";
    const title = (html.match(/<h1[^>]*>([^<]+)<\/h1>/) || [])[1] || "Twitter Video";
    const videoMatches = [...html.matchAll(/href="([^"]*\/dl\/[^"]*\.mp4[^"]*)"/g)];
    const imageMatches = [...html.matchAll(/href="([^"]*\/dl\/[^"]*\.(jpg|png|webp)[^"]*)"/g)];
    const results = [];
    for (const match of videoMatches) {
      const dlUrl = match[1].startsWith("http") ? match[1] : "https://x2twitter.com" + match[1];
      results.push({ type: "video", url: dlUrl });
    }
    for (const match of imageMatches) {
      const dlUrl = match[1].startsWith("http") ? match[1] : "https://x2twitter.com" + match[1];
      results.push({ type: "image", url: dlUrl });
    }
    if (results.length === 0) {
      const fallbackMatches = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].filter((m) => /\.(mp4|jpg|png|webp)/i.test(m[1]));
      for (const match of fallbackMatches) {
        results.push({ type: /\.mp4/i.test(match[1]) ? "video" : "image", url: match[1] });
      }
    }
    return { title, thumbnail, duration, results };
  } catch (error) {
    return { error: true, message: error.message };
  }
}

export { x2twitterDl };
