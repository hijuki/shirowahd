import axios from "axios";

const APP_ID = "250528";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const API_BASES = [
  "https://www.terabox.com",
  "https://www.1024terabox.com",
  "https://www.teraboxapp.com",
];
const CHANNELS = ["dubox", "chunlei"];

function extractSurl(url) {
  // /s/1xxxx or ?surl=xxxx
  let m = url.match(/\/s\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = url.match(/[?&]surl=([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  // bare code
  m = url.match(/([A-Za-z0-9_-]{18,})/);
  if (m) return m[1];
  return null;
}

function plainSurl(surl) {
  return surl.startsWith("1") && surl.length > 1 ? surl.slice(1) : surl;
}

async function TeraBoxDL(inputUrl) {
  try {
    const surl = extractSurl(inputUrl);
    if (!surl) return { status: false, error: "URL tidak valid" };

    const session = axios.create({
      headers: {
        "User-Agent": UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 20000,
      maxRedirects: 5,
    });

    // Step 1: Load share page to get cookies + jsToken + yunData
    let base = API_BASES[0];
    let jsToken = null;
    let yun = {};
    let cookies = "";

    for (const b of API_BASES) {
      try {
        const shareUrl = `${b}/s/1${plainSurl(surl)}`;
        const r = await session.get(shareUrl, {
          headers: { Accept: "text/html", Referer: b + "/" },
        });
        cookies = (r.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ");

        const html = r.data || "";
        // Extract jsToken
        const jt = html.match(/fn\("([0-9a-fA-F]{24,})"\)/) ||
                   html.match(/jsToken["']?\s*[:=]\s*["']([0-9a-fA-F]{24,})/) ||
                   html.match(/%22jsToken%22%3A%22([0-9a-fA-F]{24,})%22/);
        if (jt) jsToken = jt[1];

        // Extract yunData
        const yunMatch = html.match(/window\.yunData\s*=\s*(\{[\s\S]*?\});/) ||
                         html.match(/yunData\s*=\s*(\{[\s\S]*?\});/);
        if (yunMatch) {
          try { yun = JSON.parse(yunMatch[1]); } catch {}
        }

        // Extract individual fields via regex
        for (const [key, re] of [
          ["sign", /"sign"\s*:\s*"([^"]{6,})"/],
          ["timestamp", /"timestamp"\s*:\s*"?(\d{8,})"?/],
          ["shareid", /"share(?:_)?id"\s*:\s*"?(\d+)"?/],
          ["uk", /"uk"\s*:\s*"?(\d+)"?/],
          ["bdstoken", /bdstoken["']?\s*[:=]\s*["']([0-9a-f]{16,})/],
        ]) {
          if (!yun[key]) {
            const fm = html.match(re);
            if (fm) yun[key] = fm[1];
          }
        }

        // Extract file_list from HTML
        const flMatch = html.match(/"file_list"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
        if (flMatch) {
          try { yun.file_list = JSON.parse(flMatch[1]); } catch {}
        }

        if (jsToken || yun.shareid) {
          base = b;
          break;
        }
      } catch { continue; }
    }

    // Common params builder
    const params = (extra) => ({
      app_id: APP_ID, web: "1", channel: CHANNELS[0], clienttype: "0",
      ...(jsToken ? { jsToken } : {}),
      ...extra,
    });

    const apiHeaders = {
      "User-Agent": UA,
      "Cookie": cookies,
      "Referer": base + "/",
      "Origin": base,
    };

    // Step 2: Get sign/timestamp if missing via tplconfig
    if (!yun.sign || !yun.timestamp) {
      for (const s of [surl, plainSurl(surl)]) {
        try {
          const r = await session.get(`${base}/share/tplconfig`, {
            params: params({ surl: s, fields: JSON.stringify(["sign", "timestamp"]) }),
            headers: apiHeaders,
          });
          const data = r.data?.data || r.data;
          if (data?.sign) { yun.sign = data.sign; yun.timestamp = data.timestamp; break; }
        } catch { continue; }
      }
    }

    // Step 3: Get file list via share/list or shorturlinfo
    let files = [];

    // Try shorturlinfo first
    for (const s of [surl, plainSurl(surl)]) {
      try {
        const r = await session.get(`${base}/api/shorturlinfo`, {
          params: params({ shorturl: s, root: "1" }),
          headers: apiHeaders,
        });
        if (r.data?.errno === 0) {
          if (r.data.shareid) yun.shareid = r.data.shareid;
          if (r.data.uk) yun.uk = r.data.uk;
          if (r.data.sign) yun.sign = r.data.sign;
          if (r.data.timestamp) yun.timestamp = r.data.timestamp;
          if (Array.isArray(r.data.list)) {
            files = r.data.list.filter(f => String(f.isdir) !== "1");
          }
          if (files.length) break;
        }
      } catch { continue; }
    }

    // Fallback: share/list
    if (!files.length) {
      for (const s of [surl, plainSurl(surl)]) {
        try {
          const r = await session.get(`${base}/share/list`, {
            params: params({ shorturl: s, root: "1", page: "1", num: "100" }),
            headers: apiHeaders,
          });
          if (r.data?.errno === 0 && Array.isArray(r.data.list)) {
            files = r.data.list.filter(f => String(f.isdir) !== "1");
            if (files.length) break;
          }
        } catch { continue; }
      }
    }

    // Fallback: file_list from HTML
    if (!files.length && Array.isArray(yun.file_list)) {
      files = yun.file_list.filter(f => String(f.isdir) !== "1");
    }

    if (!files.length) {
      return { status: false, error: "Tidak ada file ditemukan atau link expired" };
    }

    const file = files[0];
    const fileName = file.server_filename || file.filename || "file";
    const fileSize = Number(file.size || 0);
    const fsId = file.fs_id || file.fsid;
    const md5 = file.md5 || "";
    let dlink = file.dlink || "";

    // Step 4: Get download link if not available
    if (!dlink && fsId) {
      const dlExtra = {
        fid_list: JSON.stringify([Number(fsId)]),
        product: "share",
        nozip: "0",
        type: "nolimit",
      };
      if (yun.sign) dlExtra.sign = yun.sign;
      if (yun.timestamp) dlExtra.timestamp = yun.timestamp;
      if (yun.uk) dlExtra.uk = yun.uk;
      if (yun.shareid) { dlExtra.shareid = yun.shareid; dlExtra.primaryid = yun.shareid; }

      for (const path of ["/api/sharedownload", "/share/download"]) {
        try {
          const r = await session.get(`${base}${path}`, {
            params: params(dlExtra),
            headers: apiHeaders,
          });
          if (r.data?.errno === 0) {
            dlink = r.data.dlink || (r.data.list?.[0]?.dlink) || "";
            if (dlink) break;
          }
        } catch { continue; }
      }
    }

    // Step 5: Try PlayTerabox API as final fallback
    if (!dlink) {
      try {
        const r = await axios.get(`https://api.playterabox.com/api/proxy`, {
          params: { url: inputUrl },
          timeout: 15000,
        });
        if (r.data?.download_link || r.data?.fast_download_link) {
          dlink = r.data.fast_download_link || r.data.download_link;
        }
      } catch {}
    }

    const ext = fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || "";
    const isVideo = ["mp4", "mkv", "avi", "mov", "webm", "3gp", "ts", "m4v"].includes(ext);
    const sizeStr = fileSize > 1073741824
      ? (fileSize / 1073741824).toFixed(2) + " GB"
      : fileSize > 1048576
        ? (fileSize / 1048576).toFixed(1) + " MB"
        : (fileSize / 1024).toFixed(0) + " KB";

    return {
      status: true,
      file_name: fileName,
      file_size: sizeStr,
      file_size_bytes: fileSize,
      download_url: dlink || null,
      thumbnail: file.thumbs?.url3 || file.thumbs?.url2 || file.thumbs?.icon || "",
      duration: file.duration || "N/A",
      extension: ext ? "." + ext : "",
      md5,
      is_video: isVideo,
    };
  } catch (e) {
    return { status: false, error: e.message };
  }
}

export { TeraBoxDL };
