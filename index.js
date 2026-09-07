import path from "path";
import fs from "fs";
import config from "./config.js";
import { startConnection } from "./src/connection.js";
import {
  messageHandler,
  groupHandler,
  messageUpdateHandler,
  groupSettingsHandler,
  handleAntiRemoveFromUpsert,
} from "./src/handler.js";
import { loadPlugins, pluginStore } from "./src/lib/hillz-plugins.js";
import { initDatabase, getDatabase } from "./src/lib/hillz-database.js";
import {
  initScheduler,
  loadScheduledMessages,
  startGroupScheduleChecker,
  startSewaChecker,
} from "./src/lib/hillz-scheduler.js";
import { handleAntiTagSW } from "./src/lib/hillz-group-protection.js";
import { initSholatScheduler } from "./src/lib/hillz-sholat-scheduler.js";
import { initNotifScheduler } from "./src/lib/hillz-notif-scheduler.js";
import { initAutoJpmScheduler } from "./src/lib/hillz-auto-jpm.js";
import { startMemoryMonitor } from "./src/lib/hillz-memory-monitor.js";
import { startTempCleaner } from "./src/lib/hillz-temp-cleaner.js";
import { startDailyPruner } from "./src/lib/hillz-data-pruner.js";
import { preloadAssets } from "./src/lib/hillz-asset-manager.js";
import {
  logger,
  c,
  playBootSequence,
  spinText,
  logConnection,
  logErrorBox,
  divider,
} from "./src/lib/hillz-logger.js";

await import("./src/lib/hillz-agent.js")
  .then((m) => m.initializeAgent())
  .catch(() => { });

// ═════════════════════════════════════════════════════════════════════════════
// 🛡️ ADVANCED NOISE FILTER & COMPACT ERROR FORMATTER
// ═════════════════════════════════════════════════════════════════════════════
const NOISE_PATTERNS = [
  "Blocking on the main thread is very dangerous",
  "emscripten.org/docs/porting/pthreads",
  "Closing session: SessionEntry",
  "Session already",
  "prekey",
  "_chains",
  "registrationId",
  "chainKey",
  "ephemeralKeyPair",
  "rootKey",
  "indexInfo",
  "pendingPreKey",
  "currentRatchet",
  "baseKey",
  "privKey",
  "ExperimentalWarning",
  "punycode",
  "DEP0040",
  "rate-overlimit",
];

function isLogNoise(str) {
  if (typeof str !== "string") return false;
  for (const pattern of NOISE_PATTERNS) {
    if (str.includes(pattern)) return true;
  }
  return false;
}

function formatArg(arg) {
  if (!arg) return arg;
  if (arg.isAxiosError || (arg.config && arg.name === "AxiosError")) {
    const url = arg.config?.url || "Unknown URL";
    const method = (arg.config?.method || "GET").toUpperCase();
    const status = arg.response?.status ? `HTTP ${arg.response.status}` : (arg.code || "Network Error");
    return `[Axios] ${method} ${url} -> ${status}: ${arg.message}`;
  }
  if (arg instanceof Error) {
    if (arg.code === "ENOTFOUND" || arg.code === "ECONNRESET" || arg.code === "ETIMEDOUT") {
      return `[Network ${arg.code}] ${arg.message}`;
    }
  }
  return arg;
}

// Intercept low-level stderr write (menangkap output C++/Emscripten/WASM noise)
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, encoding, callback) => {
  const str = typeof chunk === "string" ? chunk : chunk?.toString() || "";
  if (isLogNoise(str)) {
    if (typeof callback === "function") callback();
    return true;
  }
  return originalStderrWrite(chunk, encoding, callback);
};

const _log = console.log;
const _info = console.info;
const _warn = console.warn;
const _error = console.error;

console.log = (...args) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (isLogNoise(first)) return;
  _log.apply(console, args.map(formatArg));
};

console.info = (...args) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (isLogNoise(first)) return;
  _info.apply(console, args.map(formatArg));
};

console.warn = (...args) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (isLogNoise(first)) return;
  _warn.apply(console, args.map(formatArg));
};

console.error = (...args) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (isLogNoise(first)) return;
  _error.apply(console, args.map(formatArg));
};

// Tangkap unhandled errors agar tidak merusak console
process.on("unhandledRejection", (reason) => {
  const msg = reason?.message || String(reason || "Unknown Rejection");
  if (!isLogNoise(msg)) {
    logger.warn("UNHANDLED", formatArg(reason));
  }
});

process.on("uncaughtException", (err) => {
  const msg = err?.message || String(err || "Unknown Exception");
  if (!isLogNoise(msg)) {
    logger.error("FATAL", `${err.name}: ${err.message}`);
  }
});

const startTime = Date.now();

let pluginWatcher = null;
const reloadDebounce = new Map();
const fileStatCache = new Map();

function startDevWatcher(pluginsPath) {
  if (pluginWatcher) pluginWatcher.close();

  logger.system("dev", "Hot-Reload watcher active for plugins");

  pluginWatcher = fs.watch(
    pluginsPath,
    { recursive: true },
    async (eventType, filename) => {
      if (!filename || !filename.endsWith(".js")) return;
      if (filename.includes(".test.") || filename.includes(".spec.")) return;

      const fullPath = path.join(pluginsPath, filename);

      try {
        if (!fs.existsSync(fullPath)) return;
        const stat = fs.statSync(fullPath);
        const lastMtime = fileStatCache.get(fullPath);
        if (lastMtime && stat.mtimeMs === lastMtime) return;
        fileStatCache.set(fullPath, stat.mtimeMs);
      } catch {
        return;
      }

      if (reloadDebounce.has(fullPath)) {
        clearTimeout(reloadDebounce.get(fullPath));
      }

      reloadDebounce.set(
        fullPath,
        setTimeout(async () => {
          reloadDebounce.delete(fullPath);
          const relativePath = path.relative(pluginsPath, fullPath);
          const parts = relativePath.split(path.sep);
          const category = parts.length > 1 ? parts[0] : "uncategorized";
          const file = parts[parts.length - 1];

          logger.system(
            "reload",
            `Change detected: ${c.yellow(file)} in ${c.purple(category)}`,
          );

          try {
            await loadPlugins(pluginsPath);
            logger.success("reload", `Plugin reloaded successfully`);
          } catch (err) {
            logger.error("reload", `Failed: ${err.message}`);
          }
        }, 300),
      );
    },
  );
}

async function main() {
  process.on("SIGINT", () => {
    logger.system("SHUTDOWN", "Stopping bot gracefully...");
    if (pluginWatcher) pluginWatcher.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.system("SHUTDOWN", "Received SIGTERM, exiting...");
    if (pluginWatcher) pluginWatcher.close();
    process.exit(0);
  });

  const pluginsPath = path.join(process.cwd(), "plugins");
  await loadPlugins(pluginsPath);

  if (config.dev?.hotReload) {
    startDevWatcher(pluginsPath);
  }

  await initDatabase();
  preloadAssets();

  startConnection({
    onMessage: async (m, sock) => {
      try {
        await messageHandler(m, sock);
      } catch (error) {
        logger.error("HANDLER", error.message);
      }
    },

    onGroupUpdate: async (update, sock) => {
      try {
        await groupHandler(update, sock);
      } catch (error) {
        logger.error("GROUP", error.message);
      }
    },

    onMessageUpdate: async (update, sock) => {
      try {
        await messageUpdateHandler(update, sock);
      } catch (error) {
        logger.error("MSG_UPDATE", error.message);
      }
    },

    onGroupSettingsUpdate: async (update, sock) => {
      try {
        await groupSettingsHandler(update, sock);
      } catch (error) {
        logger.error("GROUP_SETTINGS", error.message);
      }
    },

    onAntiTagSW: async (m, sock) => {
      try {
        await handleAntiTagSW(m, sock);
      } catch (error) {
        logger.error("ANTITAG_SW", error.message);
      }
    },

    onAntiDeleteFromUpsert: async (m, sock) => {
      try {
        await handleAntiRemoveFromUpsert(m, sock);
      } catch (error) {
        logger.error("ANTIDELETE", error.message);
      }
    },

    onConnectionUpdate: async (update, sock) => {
      if (update.connection === "open") {
        logConnection("connected", sock.user?.name || "Bot");
        try {
          const { startBotApi } = await import("./src/lib/hillz-bot-api.js");
          startBotApi();
        } catch (e) {
          logger.warn("bot-api", `Failed to start bot API: ${e.message}`);
        }
        loadScheduledMessages(sock);
        startGroupScheduleChecker(sock);
        startSewaChecker(sock);
        initScheduler(config, sock);
        initAutoJpmScheduler(sock);
        initSholatScheduler(sock);
        initNotifScheduler(sock);
        try {
          const { initSahurCron } =
            await import("./plugins/religi/autosahur.js");
          initSahurCron(sock);
        } catch { }
        try {
          const { startOtpPoller: _startOtp } =
            await import("./src/lib/hillz-otp-poller.js");
          _startOtp(sock);
        } catch { }

        try {
          const { getAllJadibotSessions, restartJadibotSession } =
            await import("./src/lib/hillz-jadibot-manager.js");
          const sessions = getAllJadibotSessions();
          if (sessions.length > 0) {
            logger.info("JADIBOT", `Restoring ${sessions.length} session(s)`);
            for (const session of sessions) {
              try {
                await restartJadibotSession(sock, session.id);
                await new Promise((r) => setTimeout(r, 3000));
              } catch (e) {
                logger.error(
                  "JADIBOT",
                  `Failed restore ${session.id}: ${e.message}`,
                );
              }
            }
          }
        } catch (e) {
          logger.error("JADIBOT", `Gagal memulihkan: ${e.message}`);
        }

        const devLabel = config.dev?.enabled ? ` ${c.yellow("• dev")}` : "";
        startMemoryMonitor();
        startTempCleaner();
        startDailyPruner();
        logger.success("YEYYYY", `Semua sistem udah jalan mantap, langsug saja🚀`);
        divider();
      }
    },
  });
}

main().catch((error) => {
  logErrorBox("Fatal Error", error.message);
  console.error(c.gray(error.stack));
  process.exit(1);
});
