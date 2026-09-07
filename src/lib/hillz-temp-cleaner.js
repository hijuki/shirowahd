import fs from "fs";
import path from "path";
import { logger } from "./hillz-logger.js";

const CLEAN_INTERVAL = 30 * 60 * 1000; // 30 menit
const TEMP_DIRS = ["temp", "tmp"];
const MAX_AGE_MS = 60 * 60 * 1000; // 1 jam

let cleanerTimer = null;

function startTempCleaner() {
  if (cleanerTimer) return;
  cleanerTimer = setInterval(() => {
    let totalCleaned = 0;
    const now = Date.now();
    for (const dir of TEMP_DIRS) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) continue;
      try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          try {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile() && (now - stat.mtimeMs) > MAX_AGE_MS) {
              fs.unlinkSync(filePath);
              totalCleaned++;
            }
          } catch {}
        }
      } catch {}
    }
    if (totalCleaned > 0) {
      logger.system("temp-cleaner", "Cleaned " + totalCleaned + " temp files");
    }
  }, CLEAN_INTERVAL);
}

function stopTempCleaner() {
  if (cleanerTimer) {
    clearInterval(cleanerTimer);
    cleanerTimer = null;
  }
}

export { startTempCleaner, stopTempCleaner };
