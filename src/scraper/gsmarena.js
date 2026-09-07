import axios from "axios";
import * as cheerio from "cheerio";

async function gsmarena(query) {
  try {
    const { data } = await axios.get("https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=" + encodeURIComponent(query), {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    const $ = cheerio.load(data);
    const results = [];
    $(".makers li").each((i, el) => {
      const name = $(el).find("span").first().text().trim();
      const img = $(el).find("img").attr("src");
      const link = $(el).find("a").attr("href");
      if (name) results.push({ name, img, link: link ? "https://www.gsmarena.com/" + link : null });
    });
    return { status: true, results: results.slice(0, 5) };
  } catch (e) {
    return { status: false, error: e.message };
  }
}

export { gsmarena };
