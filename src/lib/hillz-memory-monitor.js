import { logger } from "./hillz-logger.js";

const RSS_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 menit

let monitorTimer = null;

function formatMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + "MB";
}

function startMemoryMonitor() {
  if (monitorTimer) return;
  monitorTimer = setInterval(() => {
    const mem = process.memoryUsage();
    if (global.gc) global.gc();
    if (mem.rss >= RSS_LIMIT) {
      logger.warn("memory", "RSS " + formatMB(mem.rss) + " exceeded " + formatMB(RSS_LIMIT) + " limit, restarting");
      process.exit(1);
    }
    logger.system("memory", "rss " + formatMB(mem.rss) + " . heap " + formatMB(mem.heapUsed) + "/" + formatMB(mem.heapTotal));
  }, CHECK_INTERVAL);
}

function stopMemoryMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

export { startMemoryMonitor, stopMemoryMonitor };
