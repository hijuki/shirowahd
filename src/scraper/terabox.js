import axios from "axios";

const APP_ID = "250528";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const API_BASES = [
  "https://www.1024terabox.com",
  "https://www.terabox.com",
  "https://www.teraboxapp.com",
  "https://www.1024tera.com",
];

function extractSurl(url) {
  let m = url.match(/\/s\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = url.match(/[?&]surl=([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  m = url.match(/([A-Za-z0-9_-]{18,})/);
  if (m) return m[1];
  return null;
}

function plainSurl(s) {
  return s.startsWith("1") && s.length > 1 ? s.slice(1) : s;
}

function humanSize(n) {
  if (n > 1073741824) return (n / 1073741824).toFixed(2) + " GB";
  if (n > 1048576) return (n / 1048576).toFixed(1) + " MB";
  return (n / 1024).toFixed(0) + " KB";
}

async function TeraBoxDL(inputUrl) {
  try {
    const raw = extractSurl(inputUrl);
    if (!raw) return { status: false, error: "URL tidak valid" };
    const surl = plainSurl(raw);

    // Get cookies from page load
    let cookies = "";
    let base = API_BASES[0];
    for (const b of API_BASES) {
      try {
        const r = await axios.get(`${b}/sharing/link?surl=${surl}`, {
          headers: { "User-Agent": UA, Accept: "text/html" },
          timeout: 15000, maxRedirects: 5,
        });
        cookies = (r.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ");
        if (cookies) { base = b; break; }
      } catch { continue; }
    }

    const h = { "User-Agent": UA, Cookie: cookies, Referer: base + "/", Origin: base };
    const p = (extra) => ({ app_id: APP_ID, web: "1", channel: "dubox", clienttype: "0", ...extra });

    // Step 1: List root
    let files = [];
    let shareid, uk, sign, timestamp;

    // Try shorturlinfo
    for (const s of [surl, "1" + surl]) {
      try {
        const r = await axios.get(`${base}/api/shorturlinfo`, {
          params: p({ shorturl: s, root: "1" }), headers: h, timeout: 15000,
        });
        if (r.data?.errno === 0) {
          shareid = r.data.shareid; uk = r.data.uk;
          sign = r.data.sign; timestamp = r.data.timestamp;
          if (Array.isArray(r.data.list)) files = r.data.list;
          break;
        }
      } catch { continue; }
    }

    // Fallback: share/list
    if (!files.length) {
      try {
        const r = await axios.get(`${base}/share/list`, {
          params: p({ shorturl: surl, root: "1", page: "1", num: "100" }), headers: h, timeout: 15000,
        });
        if (r.data?.errno === 0 && Array.isArray(r.data.list)) files = r.data.list;
      } catch {}
    }

    if (!files.length) return { status: false, error: "Tidak ada file ditemukan atau link expired" };

    // Step 2: If root is folder, list inside it (recursive 1 level)
    const actualFiles = [];
    for (const item of files) {
      if (String(item.isdir) === "1") {
        try {
          const r = await axios.get(`${base}/share/list`, {
            params: p({ shorturl: surl, dir: item.path, page: "1", num: "100" }), headers: h, timeout: 15000,
          });
          if (r.data?.errno === 0 && Array.isArray(r.data.list)) {
            for (const f of r.data.list) {
              if (String(f.isdir) !== "1") actualFiles.push(f);
            }
          }
        } catch {}
      } else {
        actualFiles.push(item);
      }
    }

    if (!actualFiles.length) return { status: false, error: "Folder kosong atau link expired" };

    // Step 3: Get sign/timestamp if missing
    if (!sign || !timestamp) {
      try {
        const r = await axios.get(`${base}/share/tplconfig`, {
          params: p({ surl, fields: JSON.stringify(["sign", "timestamp"]) }), headers: h, timeout: 15000,
        });
        const d = r.data?.data || r.data;
        if (d?.sign) { sign = d.sign; timestamp = d.timestamp; }
      } catch {}
    }

    // Step 4: Get dlink for first file
    const file = actualFiles[0];
    const fileName = file.server_filename || file.filename || "file";
    const fileSize = Number(file.size || 0);
    const fsId = file.fs_id || file.fsid;
    let dlink = file.dlink || "";

    if (!dlink && fsId) {
      const dlExtra = {
        fid_list: JSON.stringify([Number(fsId)]),
        product: "share", nozip: "0", type: "nolimit",
      };
      if (sign) dlExtra.sign = sign;
      if (timestamp) dlExtra.timestamp = timestamp;
      if (uk) dlExtra.uk = String(uk);
      if (shareid) { dlExtra.shareid = String(shareid); dlExtra.primaryid = String(shareid); }

      for (const path of ["/api/sharedownload", "/share/download"]) {
        try {
          const r = await axios.get(`${base}${path}`, {
            params: p(dlExtra), headers: h, timeout: 15000,
          });
          if (r.data?.errno === 0) {
            dlink = r.data.dlink || r.data.list?.[0]?.dlink || "";
            if (dlink) break;
          }
        } catch { continue; }
      }
    }

    const ext = fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || "";
    const isVideo = ["mp4", "mkv", "avi", "mov", "webm", "3gp", "ts", "m4v"].includes(ext);

    return {
      status: true,
      file_name: fileName,
      file_size: humanSize(fileSize),
      file_size_bytes: fileSize,
      download_url: dlink || null,
      thumbnail: file.thumbs?.url3 || file.thumbs?.url2 || file.thumbs?.icon || "",
      duration: file.duration || "N/A",
      extension: ext ? "." + ext : "",
      md5: file.md5 || "",
      is_video: isVideo,
      total_files: actualFiles.length,
      all_files: actualFiles.map(f => ({
        name: f.server_filename || f.filename,
        size: humanSize(Number(f.size || 0)),
        fs_id: f.fs_id || f.fsid,
      })),
    };
  } catch (e) {
    return { status: false, error: e.message };
  }
}

export { TeraBoxDL };
