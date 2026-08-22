import axios from "axios";

const APP_ID = "250528";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MOBILE_UA = "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const API_BASES = [
  "https://www.terabox.app",
  "https://www.1024terabox.com",
  "https://www.terabox.com",
  "https://www.teraboxapp.com",
  "https://dm.1024terabox.com",
];

// Hardcoded cookies (from HILLZ's Terabox account)
const HARDCODED_COOKIE = "ndus=Y4VT0dVpeHuiCCJMjb5rw5ZhhLNbFce9AYdhwPBo; csrfToken=y9cXTSHnSzgnNkfXigF6FPIL; ndut_fmt=8B488FB81A62D53906179217A2A9A7872641EA81C12B0AE7F1ACB93F3D9148CD";

// Third-party API endpoints to try as fallbacks
const THIRD_PARTY_APIS = [
  { name: "playterabox", url: "https://api.playterabox.com/api/v1/file?url={URL}", method: "GET", headers: { "x-api-key": "pk_gd1ao2iwfjvvvdml9xyw1j" }, parseResponse: parsePlayTeraboxResponse },
  { name: "tera-dl", url: "https://tera-dl.vercel.app/api?url={URL}", method: "GET", parseResponse: parseTeraBoxDLResponse },
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

const VIDEO_EXTS = ["mp4", "mkv", "avi", "mov", "webm", "3gp", "ts", "m4v", "flv", "wmv"];

function isVideoExt(ext) {
  return VIDEO_EXTS.includes(ext?.toLowerCase());
}

function buildResult(file, extras = {}) {
  const fileName = file.server_filename || file.filename || file.file_name || "file";
  const fileSize = Number(file.size || file.file_size_bytes || 0);
  const ext = fileName.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || "";
  return {
    status: true,
    file_name: fileName,
    file_size: humanSize(fileSize),
    file_size_bytes: fileSize,
    download_url: file.dlink || file.download_url || null,
    thumbnail: file.thumbs?.url3 || file.thumbs?.url2 || file.thumbs?.icon || file.thumbnail || "",
    duration: file.duration || "N/A",
    extension: ext ? "." + ext : "",
    md5: file.md5 || "",
    is_video: isVideoExt(ext),
    ...extras,
  };
}

// ────────────────────────────────────────────────────────────────────
// Strategy 1: Direct Terabox API (works with valid session cookies)
// ────────────────────────────────────────────────────────────────────
async function directTeraboxAPI(inputUrl, surl) {
  // Try to get cookies from page load
  let cookies = "";
  let base = API_BASES[0];
  const surlVariants = [surl, "1" + surl];
  if (surl.startsWith("1") && surl.length > 1) surlVariants.push(surl.slice(1));

  // If env cookie is available, use it (most reliable)
  const envCookie = process.env.TERABOX_COOKIE || HARDCODED_COOKIE;
  if (envCookie) {
    cookies = envCookie;
    base = "https://dm.1024terabox.com";
  } else {
    // Try to get session cookies by visiting the share page
    for (const b of API_BASES) {
      for (const sv of surlVariants) {
        try {
          const r = await axios.get(`${b}/sharing/link?surl=${sv}`, {
            headers: { "User-Agent": UA, Accept: "text/html" },
            timeout: 12000, maxRedirects: 5,
            validateStatus: s => s < 400,
          });
          const setCookies = r.headers["set-cookie"] || [];
          const parsed = setCookies.map(c => c.split(";")[0]).join("; ");
          if (parsed && parsed.length > 10) {
            cookies = parsed;
            base = b;
            break;
          }
        } catch { continue; }
      }
      if (cookies) break;
    }
  }

  if (!cookies) return null;

  const h = { "User-Agent": UA, Cookie: cookies, Referer: base + "/", Origin: base };
  const p = (extra) => ({ app_id: APP_ID, web: "1", channel: "dubox", clienttype: "0", ...extra });

  // Step 1: Get file list via shorturlinfo
  let files = [];
  let shareid, uk, sign, timestamp;

  for (const sv of surlVariants) {
    try {
      const r = await axios.get(`${base}/api/shorturlinfo`, {
        params: p({ shorturl: sv, root: "1" }), headers: h, timeout: 12000,
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
    for (const sv of surlVariants) {
      try {
        const r = await axios.get(`${base}/share/list`, {
          params: p({ shorturl: sv, root: "1", page: "1", num: "100" }), headers: h, timeout: 12000,
        });
        if (r.data?.errno === 0 && Array.isArray(r.data.list)) {
          files = r.data.list;
          break;
        }
      } catch { continue; }
    }
  }

  if (!files.length) return null;

  // Step 2: If root is folder, list inside (1 level)
  const actualFiles = [];
  for (const item of files) {
    if (String(item.isdir) === "1") {
      try {
        const r = await axios.get(`${base}/share/list`, {
          params: p({ shorturl: surl, dir: item.path, page: "1", num: "100" }), headers: h, timeout: 12000,
        });
        if (r.data?.errno === 0 && Array.isArray(r.data.list)) {
          for (const f of r.data.list) {
            if (String(f.isdir) !== "1") actualFiles.push(f);
          }
        }
      } catch { /* skip */ }
    } else {
      actualFiles.push(item);
    }
  }

  if (!actualFiles.length) return null;

  // Step 3: Get sign/timestamp if missing
  if (!sign || !timestamp) {
    try {
      const r = await axios.get(`${base}/share/tplconfig`, {
        params: p({ surl, fields: JSON.stringify(["sign", "timestamp"]) }), headers: h, timeout: 12000,
      });
      const d = r.data?.data || r.data;
      if (d?.sign) { sign = d.sign; timestamp = d.timestamp; }
    } catch { /* non-fatal */ }
  }

  // Step 4: Get dlink for first file
  const file = actualFiles[0];
  let dlink = file.dlink || "";

  if (!dlink && (file.fs_id || file.fsid)) {
    const fsId = file.fs_id || file.fsid;
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
          params: p(dlExtra), headers: h, timeout: 12000,
        });
        if (r.data?.errno === 0) {
          dlink = r.data.dlink || r.data.list?.[0]?.dlink || "";
          if (dlink) break;
        }
      } catch { continue; }
    }
  }

  return buildResult(file, {
    download_url: dlink || null,
    cookies,
    referer: base + "/",
    total_files: actualFiles.length,
    all_files: actualFiles.map(f => ({
      name: f.server_filename || f.filename,
      size: humanSize(Number(f.size || 0)),
      fs_id: f.fs_id || f.fsid,
    })),
    method: "direct",
  });
}

// ────────────────────────────────────────────────────────────────────
// Strategy 2: Third-party APIs
// ────────────────────────────────────────────────────────────────────
function parseTeraBoxDLResponse(data) {
  if (data?.status === "error") return null;
  if (!data || typeof data !== "object") return null;
  // Adapt various known response formats
  const file = data.file || data.data || data;
  if (!file.file_name && !file.filename && !file.name) return null;
  return {
    server_filename: file.file_name || file.filename || file.name,
    size: file.file_size_bytes || file.size || file.sizebytes || 0,
    dlink: file.download_url || file.dlink || file.direct_link || file.link || "",
    thumbs: { url3: file.thumbnail || file.thumb || "" },
    duration: file.duration || "N/A",
    md5: file.md5 || "",
  };
}

function parsePlayTeraboxResponse(data) {
  if (!data || data.error) return null;
  const file = data.data || data.file || data;
  if (!file.file_name && !file.filename && !file.name) return null;
  return {
    server_filename: file.file_name || file.filename || file.name,
    size: file.size || file.file_size || 0,
    dlink: file.download_link || file.download_url || file.dlink || file.direct_link || file.url || "",
    thumbs: { url3: file.thumbnail || file.thumb || file.image || "" },
    duration: file.duration || "N/A",
    md5: file.md5 || "",
  };
}

async function tryThirdPartyAPIs(inputUrl) {
  for (const api of THIRD_PARTY_APIS) {
    try {
      const url = api.url.replace("{URL}", encodeURIComponent(inputUrl));
      const headers = { "User-Agent": UA, ...(api.headers || {}) };
      const r = await axios({ method: api.method || "GET", url, timeout: 15000, headers });
      const parsed = api.parseResponse(r.data);
      if (parsed) {
        return buildResult(parsed, {
          cookies: "",
          referer: "",
          total_files: 1,
          all_files: [{ name: parsed.server_filename, size: humanSize(Number(parsed.size || 0)), fs_id: "" }],
          method: "third-party:" + api.name,
        });
      }
    } catch { continue; }
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────
// Strategy 3: Mobile API (different endpoint, sometimes less restricted)
// ────────────────────────────────────────────────────────────────────
async function mobileTeraboxAPI(inputUrl, surl) {
  const surlVariants = [surl, "1" + surl];
  if (surl.startsWith("1") && surl.length > 1) surlVariants.push(surl.slice(1));

  const mobileUA = "dubox;P2SP;2.2.91.249;dubox;4.2.0.1;I2404;android-android;16;JSbridge1.0.10;jointbridge;1.1.39;";

  for (const base of ["https://dm.1024terabox.com", "https://www.terabox.app"]) {
    // Get cookies
    let cookies = "";
    try {
      const r = await axios.get(`${base}/sharing/link?surl=${surl}`, {
        headers: { "User-Agent": MOBILE_UA, Accept: "text/html" },
        timeout: 12000, maxRedirects: 5, validateStatus: s => s < 400,
      });
      cookies = (r.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ");
    } catch { continue; }

    if (!cookies) continue;

    const h = { "User-Agent": mobileUA, Cookie: cookies, Referer: base + "/", Accept: "application/json" };

    for (const sv of surlVariants) {
      try {
        const r = await axios.get(`${base}/api/shorturlinfo`, {
          params: { app_id: APP_ID, web: "1", channel: "dubox", clienttype: "5", shorturl: sv, root: "1" },
          headers: h, timeout: 12000,
        });
        if (r.data?.errno === 0 && Array.isArray(r.data.list) && r.data.list.length) {
          const files = r.data.list.filter(f => String(f.isdir) !== "1");
          if (!files.length) continue;
          const file = files[0];
          return buildResult(file, {
            download_url: file.dlink || null,
            cookies,
            referer: base + "/",
            total_files: files.length,
            all_files: files.map(f => ({
              name: f.server_filename || f.filename,
              size: humanSize(Number(f.size || 0)),
              fs_id: f.fs_id || f.fsid,
            })),
            method: "mobile",
          });
        }
      } catch { continue; }
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────
// Main entry point — tries all strategies in order
// ────────────────────────────────────────────────────────────────────
async function TeraBoxDL(inputUrl) {
  try {
    const raw = extractSurl(inputUrl);
    if (!raw) return { status: false, error: "URL tidak valid" };
    const surl = plainSurl(raw);

    // Normalize input URL for third-party APIs
    const normalizedUrl = inputUrl.match(/^https?:\/\//) ? inputUrl : `https://teraboxapp.com/s/${raw}`;

    // Strategy 1: Direct API (best if cookies/env available)
    const direct = await directTeraboxAPI(normalizedUrl, surl).catch(() => null);
    if (direct?.status && direct.download_url) return direct;

    // Strategy 2: Mobile API (different client type, sometimes bypasses blocks)
    const mobile = await mobileTeraboxAPI(normalizedUrl, surl).catch(() => null);
    if (mobile?.status && mobile.download_url) return mobile;

    // Strategy 3: Third-party APIs
    const thirdParty = await tryThirdPartyAPIs(normalizedUrl).catch(() => null);
    if (thirdParty?.status && thirdParty.download_url) return thirdParty;

    // Return best partial result (file info without download URL)
    const partial = direct || mobile;
    if (partial?.status) {
      return {
        ...partial,
        error_hint: "File info ditemukan tapi download URL tidak tersedia. " +
          "Set env TERABOX_COOKIE dengan cookie login Terabox untuk akses penuh. " +
          "Atau link mungkin expired/private.",
      };
    }

    return {
      status: false,
      error: "Tidak bisa ambil data. Link mungkin expired, private, atau Terabox sedang blokir akses otomatis. " +
        "Coba set env TERABOX_COOKIE untuk bypass.",
    };
  } catch (e) {
    return { status: false, error: e.message };
  }
}

export { TeraBoxDL };
