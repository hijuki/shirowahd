import chalk from "chalk";
import * as timeHelper from "./ourin-time.js";
import { getCachedJid, isLidConverted } from "./ourin-lid.js";

// Detect color support: Pterodactyl console is !isTTY
const supportsColor = process.stdout.isTTY || process.env.FORCE_COLOR === "1";
if (!supportsColor) {
  chalk.level = 0;
}

// Mock gradient-string if any other file imports it from here
const gradientMock = (text) => text;
const gradient = () => gradientMock;

// 3 Main Colors (chalk.level=0 makes these no-ops automatically)
const cGreen = chalk.greenBright;
const cWhite = chalk.whiteBright;
const cGray = chalk.gray;

function getTime() {
  return timeHelper.formatTime("HH:mm:ss");
}

function makeTag(label, isSuccess = false, isError = false) {
  const l = label.toUpperCase().trim();
  const text = l.substring(0, 4).padEnd(4, " ");

  if (!supportsColor) {
    return `[${getTime()}] [${text}]`;
  }

  let icon = "•";
  let colorFn = chalk.white;

  if (isSuccess || l === "OK" || l === "DONE") {
    icon = "✔";
    colorFn = chalk.green;
  } else if (isError || l === "FAIL" || l === "ERR" || l === "NO") {
    icon = "✖";
    colorFn = chalk.red;
  } else if (l === "WARN" || l === "WN") {
    icon = "⚠";
    colorFn = chalk.yellow;
  } else if (l === "INFO") {
    icon = "ℹ";
    colorFn = chalk.blue;
  } else if (l === "BOOT") {
    icon = "❖";
    colorFn = chalk.magenta;
  } else if (l === "SYS") {
    icon = "⚙";
    colorFn = chalk.cyan;
  } else if (l === "WAIT") {
    icon = "⟳";
    colorFn = chalk.yellow;
  } else if (l === "DBG") {
    icon = "🐛";
    colorFn = chalk.white;
  }

  return `  ${colorFn(icon)}  ${colorFn(text)}`;
}

const SYM = {
  ok: () => makeTag("OK", true),
  no: () => makeTag("FAIL", false, true),
  wn: () => makeTag("WARN"),
  info: () => makeTag("INFO"),
  sys: () => makeTag("SYS"),
  dbg: () => makeTag("DBG"),
};

function writeLog(kind, label, detail = "") {
  const tags = {
    info: SYM.info,
    success: SYM.ok,
    warn: SYM.wn,
    error: SYM.no,
    system: SYM.sys,
    debug: SYM.dbg,
  };
  const tagFn = tags[kind] || SYM.info;
  const tag = tagFn();

  if (!supportsColor) {
    const msg = `${tag} ${label}${detail ? " " + detail : ""}`;
    console.log(msg);
    return;
  }

  const msg = `${tag} ${chalk.cyanBright(label)}${detail ? " " + cWhite(detail) : ""}`;
  console.log(msg);
}

const logger = {
  info: (label, detail = "") => writeLog("info", label, detail),
  success: (label, detail = "") => writeLog("success", label, detail),
  warn: (label, detail = "") => writeLog("warn", label, detail),
  error: (label, detail = "") => writeLog("error", label, detail),
  system: (label, detail = "") => writeLog("system", label, detail),
  debug: (label, detail = "") => writeLog("debug", label, detail),
  tag: (label, msg, detail = "") => {
    const tag = makeTag(label.substring(0, 4));
    if (!supportsColor) {
      console.log(`${tag} ${msg}${detail ? " " + detail : ""}`);
    } else {
      console.log(`${tag} ${cWhite(msg)}${detail ? " " + cGray(detail) : ""}`);
    }
  },
};

function createSpinner(label = "SYS", text = "loading", options = {}) {
  let active = false;
  return {
    start() {
      active = true;
      console.log(`${makeTag(label)} ${supportsColor ? cWhite(text) : text}...`);
    },
    update(nextText) {
      if (active) console.log(`${makeTag(label)} ${supportsColor ? cWhite(nextText) : nextText}...`);
    },
    stop() {
      active = false;
    },
    succeed(detail = text) {
      this.stop();
      logger.success(label, detail);
    },
    warn(detail = text) {
      this.stop();
      logger.warn(label, detail);
    },
    fail(detail = text) {
      this.stop();
      logger.error(label, detail);
    },
    isActive() {
      return active;
    }
  };
}

async function spinText(label, text, options = {}) {
  const tag = makeTag("OK", true);
  console.log(`${tag} ${supportsColor ? cWhite(text) : text}`);
}

async function typeLine(text, options = {}) {
  const clean = text.replace(/\x1B\[\d+m/g, "");
  const tag = makeTag("OK", true);
  console.log(`${tag} ${supportsColor ? cWhite(clean) : clean}`);
}

async function runLoader(text = "memuat", options = {}) {
  const tag = makeTag("OK", true);
  console.log(`${tag} ${supportsColor ? cWhite(text) : text}`);
}

async function playBootSequence(info = {}) {
  const { name = "SHIROWAHD", version = "3.3", mode = "public" } = info;

  console.log("");

  if (supportsColor) {
    console.log(chalk.cyan(`
     ███████╗██╗  ██╗██╗██████╗  ██████╗ ██╗    ██╗ █████╗ ██╗  ██╗██████╗
     ██╔════╝██║  ██║██║██╔══██╗██╔═══██╗██║    ██║██╔══██╗██║  ██║██╔══██╗
     ███████╗███████║██║██████╔╝██║   ██║██║ █╗ ██║███████║███████║██║  ██║
     ╚════██║██╔══██║██║██╔══██╗██║   ██║██║███╗██║██╔══██║██╔══██║██║  ██║
     ███████║██║  ██║██║██║  ██║╚██████╔╝╚███╔███╔╝██║  ██║██║  ██║██████╔╝
     ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝
`));
    console.log(`         ${chalk.magenta.bold("►")} ${chalk.white("SHIROWAHD MULTI-DEVICE BOT")} ${chalk.gray(`v${version}`)}`);
    console.log(`         ${chalk.magenta("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}`);
  } else {
    console.log("========================================");
    console.log(`  SHIROWAHD MULTI-DEVICE BOT v${version}`);
    console.log("========================================");
  }

  console.log("");
  console.log(`${makeTag("BOOT", true)} ${supportsColor ? cWhite("Memulai Sistem Utama...") : "Memulai Sistem Utama..."}`);
  console.log(`${makeTag("INFO")} ${supportsColor ? cWhite(`Mode: ${chalk.cyan(mode)}`) : `Mode: ${mode}`}`);
}

function getTypeTag(msgType, isNewsletter) {
  if (isNewsletter) return "Channel";

  const map = {
    imageMessage: "Image",
    videoMessage: "Video",
    audioMessage: "Audio",
    stickerMessage: "Sticker",
    documentMessage: "Doc",
    contactMessage: "Contact",
    locationMessage: "Location",
    viewOnceMessageV2: "1xView",
    extendedTextMessage: "Text",
    conversation: "Text",
    interactiveResponseMessage: "Button",
    pollCreationMessage: "Poll",
    reactionMessage: "Reaction",
  };
  return map[msgType] || "Message";
}

function logMessage(info) {
  if (typeof info === "string") {
    const [chatType, sender, message] = arguments;
    info = {
      chatType,
      sender,
      message,
      pushName: sender,
      groupName: chatType === "group" ? "Unknown" : "Private",
    };
  }

  const { chatType, groupName, pushName, sender, message, messageType, isNewsletter } = info;
  if (!message || message.trim() === "" || !sender) return;

  const num = sender.replace("@s.whatsapp.net", "");
  let msg = message;

  msg = msg.replace(/@(\d{10,})/g, (match, num) => {
    const lidJid = num + "@lid";
    const resolved = getCachedJid(lidJid);
    if (resolved && !isLidConverted(resolved)) return "@" + resolved.replace(/@.+/g, "");
    const swJid = num + "@s.whatsapp.net";
    const resolved2 = getCachedJid(swJid);
    if (resolved2 && !isLidConverted(resolved2)) return "@" + resolved2.replace(/@.+/g, "");
    return match;
  });

  const time = timeHelper.formatTime("HH:mm:ss");
  const typeTag = getTypeTag(messageType, isNewsletter || chatType === "newsletter");
  const location = chatType === "group" || chatType === "newsletter" ? (groupName || "Group") : "Private";
  const senderName = pushName || num;

  // Word-wrap message
  const maxWidth = 55;
  const msgLines = [];
  msg.split('\n').forEach(line => {
    let currentLine = "";
    line.split(' ').forEach(word => {
      if ((currentLine + word).length > maxWidth) {
        if (currentLine) {
          msgLines.push(currentLine.trimEnd());
          currentLine = word + " ";
        } else {
          const chunks = word.match(new RegExp(`.{1,${maxWidth}}`, 'g')) || [];
          chunks.slice(0, -1).forEach(c => msgLines.push(c));
          currentLine = (chunks[chunks.length - 1] || "") + " ";
        }
      } else {
        currentLine += word + " ";
      }
    });
    if (currentLine) {
      msgLines.push(currentLine.trimEnd());
    }
  });

  if (!supportsColor) {
    // Plain text format for Pterodactyl
    const locLabel = chatType === "private" ? "Private" : `Group: ${location}`;
    console.log("");
    console.log(`[${time}] [MSG ] ${locLabel} | ${senderName} (${num}) | ${typeTag}`);
    msgLines.forEach(line => {
      console.log(`         ${line}`);
    });
  } else {
    // Color format for TTY
    console.log("");
    console.log(`  ${cWhite("╭─")} ${chalk.bgWhiteBright("Hey, ada pesan masuk nih :3")} ${cGray("•")} ${chatType === "private" ? chalk.yellow("Private") : chalk.whiteBright("Dari Grup") + " " + chalk.bgCyanBright(location)}`);
    console.log(`  ${cWhite("│")}  👤 ${chalk.greenBright(senderName)} ${cGray(`(${num})`)}`);
    console.log(`  ${cWhite("│")}  📱 ${chalk.yellowBright(info.device || "Unknown")} ${chalk.red(`• ${time} • ${typeTag}`)}`);
    msgLines.forEach((line, index) => {
      if (index === 0) {
        console.log(`  ${cWhite("│")}  💬 ${chalk.whiteBright(line)}`);
      } else {
        console.log(`  ${cWhite("│")}     ${chalk.whiteBright(line)}`);
      }
    });
    console.log(`  ${cWhite("╰─")}`);
  }
}

function logPlugin(name, category) {
  if (!supportsColor) {
    console.log(`  |- ${name} [${category}]`);
  } else {
    console.log(`  ${cGray("├─")} ${cWhite(name)} ${cGray(`[${category}]`)}`);
  }
}

function logConnection(status, info = "") {
  const detail = info ? ` - ${info}` : "";
  if (status === "connected") {
    logger.success("CONN", `Connected${detail}`);
  } else if (status === "connecting") {
    logger.info("CONN", `Connecting${detail}`);
  } else {
    logger.error("CONN", `Disconnected${detail}`);
  }
}

function logErrorBox(title, message) {
  logger.error(title, message);
}

function printBanner(mini = false) {
  // No banner for linux style
}

function printStartup(info = {}) {
  // Already handled by boot sequence
}

const CODES = {
  reset: "", bold: "", dim: "", italic: "", underline: "",
  green: "", purple: "", white: "", gray: "", phantom: "",
  lime: "", silver: "", red: "", yellow: "", blue: "",
  cyan: "", magenta: "", bgBlack: "", bgGray: "",
};

// Map all colors to our 3 colors
const c = {
  green: cGreen,
  purple: cWhite,
  white: cWhite,
  gray: cGray,
  bold: (v) => v,
  dim: cGray,
  greenBold: cGreen,
  purpleBold: cWhite,
  whiteBold: cWhite,
  grayDim: cGray,
  red: cWhite,
  yellow: cWhite,
  cyan: cWhite,
  blue: cWhite,
  magenta: cWhite,
};

function divider() {
  console.log("");
}

function createBanner(lines, color = "green") {
  if (!supportsColor) {
    return lines.map(l => `| ${l}`).join("\n");
  }
  return lines.map(l => `${cGray("│")} ${cWhite(l)}`).join("\n");
}

function getTimestamp() {
  return supportsColor ? cGray(timeHelper.formatTime("HH:mm:ss")) : timeHelper.formatTime("HH:mm:ss");
}

const theme = {
  primary: cWhite,
  secondary: cWhite,
  accent: cGreen,
  text: cWhite,
  dim: cGray,
  muted: cGray,
  success: cGreen,
  error: cWhite,
  warning: cWhite,
  info: cWhite,
  debug: cGray,
  border: cGray,
  tag: cWhite,
  pill: (t) => t,
  rainbow: gradientMock,
  borderFx: (t) => cGray(t),
  mintFx: (t) => cGreen(t),
  warmFx: (t) => cWhite(t),
  colorizeCategory: (t) => cWhite(t),
};

export {
  c,
  CODES,
  logger,
  createSpinner,
  spinText,
  typeLine,
  runLoader,
  playBootSequence,
  logMessage,
  logPlugin,
  logConnection,
  logErrorBox,
  printBanner,
  printStartup,
  createBanner,
  getTimestamp,
  divider,
  theme,
  chalk,
  gradient
};
