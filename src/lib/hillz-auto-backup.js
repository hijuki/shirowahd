import fs from "fs";
import path from "path";
import archiver from "archiver";
import { CronJob } from "cron";
import config from "../../config.js";
import * as timeHelper from "./hillz-time.js";
import { logger } from "./hillz-logger.js";
// Aturan isi backup dipakai BERSAMA dengan plugins/owner/backupsc.js.
// Dulu modul ini punya daftar exclude sendiri yang sudah melenceng dari daftar
// plugin (mis. `storage/` dikecualikan di sini tapi tidak di plugin), sehingga
// dua tombol "backup" menghasilkan isi berbeda tanpa ada yang tahu.
import {
  kumpulkanBerkas,
  pengaturanTersanitasi,
  ringkas,
} from "./hillz-backup-rules.js";

const BACKUP_STATE_FILE = path.join(
  process.cwd(),
  "database",
  "autobackup.json",
);
let sockInstance = null;
let activeCronJob = null;

// Batas dokumen WhatsApp. Baileys membaca seluruh berkas ke RAM sebelum
// mengunggah, jadi zip raksasa bisa membunuh proses bot — diperiksa sebelum
// kirim, bukan dibiarkan gagal di tengah.
const BATAS_KIRIM = 90 * 1024 * 1024;

function loadBackupState() {
  try {
    if (fs.existsSync(BACKUP_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(BACKUP_STATE_FILE, "utf8"));
    }
  } catch (e) { console.error('[AutoBackup] loadBackupState failed:', e.message); }
  return {
    enabled: false,
    intervalMs: 3600000,
    intervalStr: "1h",
    lastBackup: null,
    backupCount: 0,
  };
}

function saveBackupState(state) {
  try {
    const dir = path.dirname(BACKUP_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BACKUP_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    logger.error("AutoBackup", `Save state failed: ${e.message}`);
  }
}

function parseInterval(str) {
  const match = str.match(/^(\d+)(m|h|d)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  let ms = 0;
  switch (unit) {
    case "m":
      ms = value * 60 * 1000;
      break;
    case "h":
      ms = value * 60 * 60 * 1000;
      break;
    case "d":
      ms = value * 24 * 60 * 60 * 1000;
      break;
    default:
      return null;
  }
  if (ms < 60000 || ms > 7 * 24 * 60 * 60 * 1000) return null;
  return { ms, str: `${value}${unit}` };
}

function formatInterval(ms) {
  if (ms >= 24 * 60 * 60 * 1000)
    return `${Math.floor(ms / (24 * 60 * 60 * 1000))} hari`;
  if (ms >= 60 * 60 * 1000) return `${Math.floor(ms / (60 * 60 * 1000))} jam`;
  return `${Math.floor(ms / (60 * 1000))} menit`;
}

function intervalToCron(ms) {
  if (ms >= 24 * 60 * 60 * 1000) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    return `0 0 */${days} * *`;
  }
  if (ms >= 60 * 60 * 1000) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    return `0 */${hours} * * *`;
  }
  const minutes = Math.floor(ms / (60 * 1000));
  return `*/${minutes} * * * *`;
}

async function createBackup() {
  return new Promise((resolve, reject) => {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const backupPath = path.join(tmpDir, `backup_${timestamp}.zip`);

    const rootDir = process.cwd();
    // Isi dihitung lebih dulu dari aturan bersama, jadi auto-backup dan
    // `.backupsc` menghasilkan zip yang IDENTIK isinya.
    const daftar = kumpulkanBerkas(rootDir);
    const info = ringkas(daftar, rootDir);

    const output = fs.createWriteStream(backupPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    let fileCount = 0;

    output.on("close", () => {
      resolve({
        path: backupPath,
        size: archive.pointer(),
        fileCount,
        timestamp,
        hilang: info.hilang,
        perBagian: info.perBagian,
      });
    });
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);

    for (const b of daftar) {
      archive.file(b.penuh, { name: b.rel });
      fileCount++;
    }

    // Pengaturan panel admin ikut, tapi tersanitasi — zip ini dikirim lewat
    // chat, jadi password admin dan token Telegram tidak boleh ada di dalamnya.
    const bersih = pengaturanTersanitasi(rootDir);
    if (bersih) {
      archive.append(bersih, { name: "admin-settings.sanitized.json" });
      fileCount++;
    }

    if (fileCount === 0) {
      reject(new Error("Tidak ada berkas yang masuk backup"));
      return;
    }
    archive.finalize();
  });
}

async function sendBackupToOwner(backupInfo) {
  if (!sockInstance) {
    logger.error("AutoBackup", "Socket not initialized");
    return false;
  }

  const ownerNumbers = config.owner?.number || [];
  if (ownerNumbers.length === 0) {
    logger.error("AutoBackup", "No owner number configured");
    return false;
  }

  const ownerNumber = String(ownerNumbers[0]).replace(/[^0-9]/g, "");
  if (!ownerNumber) {
    logger.error("AutoBackup", "Invalid owner number");
    return false;
  }

  const ownerJid = `${ownerNumber}@s.whatsapp.net`;

  try {
    const sizeInMB = (backupInfo.size / (1024 * 1024)).toFixed(2);
    const state = loadBackupState();

    // Gerbang ukuran: kalau zip melewati batas WhatsApp, lapor lokasi berkasnya
    // alih-alih mencoba unggah dan menghabiskan RAM bot.
    if (backupInfo.size > BATAS_KIRIM) {
      await sockInstance.sendMessage(ownerJid, {
        text:
          `⚠ *ᴀᴜᴛᴏ ʙᴀᴄᴋᴜᴘ ᴛᴇʀʟᴀʟᴜ ʙᴇsᴀʀ*\n\n` +
          `Ukuran ${sizeInMB} MB melewati batas kirim WhatsApp (~90 MB).\n` +
          `Zip tersimpan di VPS:\n\`${backupInfo.path}\``,
      });
      logger.error("AutoBackup", `Zip ${sizeInMB} MB melewati batas kirim`);
      return false;
    }

    const bagian = (backupInfo.perBagian || [])
      .slice(0, 6)
      .map(([k, v]) => `┃ ${k} ${v.n}`)
      .join("\n");

    const caption =
      `🗂️ *ᴀᴜᴛᴏ ʙᴀᴄᴋᴜᴘ*\n\n` +
      `╭┈┈⬡「 📋 *ɪɴꜰᴏ* 」\n` +
      `┃ 📅 Waktu: ${timeHelper.formatDateTime("DD MMMM YYYY HH:mm:ss")} WIB\n` +
      `┃ 📦 Size: ${sizeInMB} MB\n` +
      `┃ 📁 Files: ${backupInfo.fileCount}\n` +
      `┃ ⏱️ Interval: ${formatInterval(state.intervalMs)}\n` +
      `┃ #️⃣ Backup ke-${state.backupCount + 1}\n` +
      `╰┈┈┈┈┈┈┈┈⬡\n\n` +
      (bagian ? `╭┈┈⬡「 📂 *ɪsɪ* 」\n${bagian}\n╰┈┈⬡\n\n` : "") +
      (backupInfo.hilang?.length
        ? `⚠ bagian hilang: ${backupInfo.hilang.join(", ")}\n\n`
        : `✓ lengkap: bot + web + panel admin\n\n`) +
      `> Sesi WA & .env TIDAK ikut (kredensial).\n` +
      `> ${config.bot?.name || "SHIROWAHD"} Auto Backup System`;

    await sockInstance.sendMessage(ownerJid, {
      document: { url: backupInfo.path },
      mimetype: "application/zip",
      fileName: path.basename(backupInfo.path),
      caption,
    });

    state.lastBackup = new Date().toISOString();
    state.backupCount++;
    saveBackupState(state);

    try {
      await fs.promises.unlink(backupInfo.path);
    } catch (e) { /* cleanup */ }

    logger.success("AutoBackup", `Backup sent to owner (${sizeInMB} MB)`);
    return true;
  } catch (error) {
    logger.error("AutoBackup", `Send failed: ${error.message}`);
    return false;
  }
}

async function doBackup() {
  try {
    logger.info("AutoBackup", "Starting backup...");
    const backupInfo = await createBackup();
    await sendBackupToOwner(backupInfo);
  } catch (error) {
    logger.error("AutoBackup", `Backup failed: ${error.message}`);
  }
}

function startAutoBackup(sock) {
  sockInstance = sock;
  const state = loadBackupState();

  if (!state.enabled) {
    logger.info("AutoBackup", "Auto backup is disabled");
    return;
  }

  stopAutoBackup();

  const cronExp = intervalToCron(state.intervalMs);
  activeCronJob = new CronJob(cronExp, doBackup, null, true, "Asia/Jakarta");
  logger.info(
    "AutoBackup",
    `Started with interval: ${formatInterval(state.intervalMs)} (cron: ${cronExp})`,
  );
}

function stopAutoBackup() {
  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
    logger.info("AutoBackup", "Stopped");
  }
}

function enableAutoBackup(intervalStr, sock) {
  const parsed = parseInterval(intervalStr);
  if (!parsed) {
    return {
      success: false,
      error: "Format interval tidak valid. Contoh: 5m, 1h, 2d",
    };
  }

  sockInstance = sock;

  const state = loadBackupState();
  state.enabled = true;
  state.intervalMs = parsed.ms;
  state.intervalStr = parsed.str;
  saveBackupState(state);

  stopAutoBackup();
  startAutoBackup(sock);

  return {
    success: true,
    interval: formatInterval(parsed.ms),
    intervalStr: parsed.str,
  };
}

function disableAutoBackup() {
  const state = loadBackupState();
  state.enabled = false;
  saveBackupState(state);
  stopAutoBackup();
  return { success: true };
}

function getBackupStatus() {
  const state = loadBackupState();
  return {
    enabled: state.enabled,
    interval: formatInterval(state.intervalMs),
    intervalStr: state.intervalStr,
    lastBackup: state.lastBackup,
    backupCount: state.backupCount,
    isRunning: activeCronJob !== null,
  };
}

async function triggerManualBackup(sock) {
  sockInstance = sock;
  await doBackup();
}

function initAutoBackup(sock) {
  sockInstance = sock;
  startAutoBackup(sock);
}

export {
  initAutoBackup,
  startAutoBackup,
  stopAutoBackup,
  enableAutoBackup,
  disableAutoBackup,
  getBackupStatus,
  triggerManualBackup,
  createBackup,
  parseInterval,
  formatInterval,
};
