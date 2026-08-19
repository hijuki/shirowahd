const { Bot } = require("grammy");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const TOKEN = "8631201304:AAFkoRB-gigsHwSUFYe_4JLc_jjryu1w_fQ";
const OWNER_ID = 6343065438;
const SESSION_DIR = "/opt/ourin/storage/session";
const CONFIG_PATH = "/opt/ourin/config.js";

const bot = new Bot(TOKEN);

bot.command("start", (ctx) => {
  if (ctx.from.id !== OWNER_ID) return ctx.reply("Unauthorized.");
  ctx.reply("HILLZ BOT Manager\n\n/pair <nomor> - Pair + start bot\n/stopbot - Stop bot\n/status - Status\n/unpair - Hapus session\n/logs - Log bot");
});

bot.command("pair", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) return ctx.reply("Unauthorized.");
  const number = ctx.match?.trim()?.replace(/[^0-9]/g, "");
  if (!number || number.length < 10) return ctx.reply("Format: /pair 6285624537308");

  // Stop bot, clean session
  try { execSync("pm2 stop ourin 2>/dev/null", { stdio: "pipe" }); } catch {}
  try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(SESSION_DIR, { recursive: true });

  // Update config
  let cfg = fs.readFileSync(CONFIG_PATH, "utf8");
  cfg = cfg.replace(/pairingNumber:\s*"[^"]*"/, "pairingNumber: \"" + number + "\"");
  cfg = cfg.replace(/usePairingCode:\s*(true|false)/, "usePairingCode: true");
  fs.writeFileSync(CONFIG_PATH, cfg);

  await ctx.reply("⏳ Starting pair untuk " + number + "...");

  // Flush & start ourin
  try { execSync("pm2 flush ourin 2>/dev/null", { stdio: "pipe" }); } catch {}
  try {
    try { execSync("pm2 describe ourin", { stdio: "pipe" }); execSync("pm2 restart ourin"); }
    catch { execSync("pm2 start /opt/ourin/index.js --name ourin", { cwd: "/opt/ourin" }); }
  } catch (e) {
    return ctx.reply("❌ Error start: " + e.message);
  }

  let found = false;
  let connected = false;
  let attempts = 0;

  const poll = setInterval(async () => {
    attempts++;
    try {
      const logs = execSync("pm2 logs ourin --nostream --lines 80 2>&1", { encoding: "utf8" });

      // Connected?
      if (logs.includes("Udah siap nerima chat") || logs.includes("Tersambung ke")) {
        clearInterval(poll);
        if (!connected) {
          connected = true;
          await ctx.reply("✅ WA Connected! Bot OURIN jalan.").catch(() => {});
        }
        return;
      }

      // Find pairing code
      if (!found) {
        const clean = logs.replace(/\x1B\[[0-9;]*m/g, "").replace(/\u001b\[[0-9;]*m/g, "");
        const lines = clean.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes("PAIRING CODE")) {
            for (let j = i + 1; j < lines.length && j < i + 5; j++) {
              const m = lines[j].match(/([A-Z0-9]{8})/);
              if (m) {
                found = true;
                await ctx.reply("🔑 Pairing Code:\n\n" + m[1] + "\n\nMasukin di WA > Settings > Linked Devices > Link a Device\n\nMenunggu koneksi...").catch(() => {});
                break;
              }
            }
            if (found) break;
          }
        }
      }

      // Logged out
      if (logs.includes("sesi habis") || logs.includes("perlu login ulang")) {
        // OURIN handles reconnect internally
      }
    } catch {}

    if (attempts >= 90) {
      clearInterval(poll);
      if (!connected) {
        await ctx.reply("⏰ Timeout 3 menit. Cek /logs atau /pair lagi.").catch(() => {});
      }
    }
  }, 2000);
});

bot.command("startbot", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) return ctx.reply("Unauthorized.");
  try {
    try { execSync("pm2 describe ourin", { stdio: "pipe" }); execSync("pm2 restart ourin"); }
    catch { execSync("pm2 start /opt/ourin/index.js --name ourin", { cwd: "/opt/ourin" }); }
    await ctx.reply("✅ Bot started.");
  } catch (e) { await ctx.reply("❌ Error: " + e.message); }
});

bot.command("stopbot", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) return ctx.reply("Unauthorized.");
  try { execSync("pm2 stop ourin"); await ctx.reply("⛔ Bot stopped."); }
  catch (e) { await ctx.reply("❌ Error: " + e.message); }
});

bot.command("status", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) return ctx.reply("Unauthorized.");
  try {
    const out = execSync("pm2 jlist", { encoding: "utf8" });
    const procs = JSON.parse(out);
    let msg = "📊 PM2 Status:\n\n";
    for (const p of procs) msg += p.name + ": " + p.pm2_env.status + " (↺" + p.pm2_env.restart_time + ")\n";
    msg += "\nSession: " + (fs.existsSync(path.join(SESSION_DIR, "creds.json")) ? "✅ Ada" : "❌ Belum");
    await ctx.reply(msg);
  } catch (e) { await ctx.reply("Error: " + e.message); }
});

bot.command("unpair", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) return ctx.reply("Unauthorized.");
  try { execSync("pm2 stop ourin"); } catch {}
  try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  await ctx.reply("🗑 Session dihapus. /pair <nomor> untuk pair ulang.");
});

bot.command("logs", async (ctx) => {
  if (ctx.from.id !== OWNER_ID) return ctx.reply("Unauthorized.");
  try {
    const logs = execSync("pm2 logs ourin --nostream --lines 30 2>&1", { encoding: "utf8" });
    await ctx.reply(logs.slice(-3500) || "No logs.");
  } catch (e) { await ctx.reply("Error: " + e.message); }
});

bot.catch((err) => console.error("Bot error:", err));
console.log("Telegram bot manager starting...");
bot.start();
