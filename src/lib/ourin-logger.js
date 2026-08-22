import chalk from "chalk";
import * as timeHelper from "./ourin-time.js";
import { getCachedJid, isLidConverted } from "./ourin-lid.js";

// Mock gradient-string if any other file imports it from here
const gradientMock = (text) => text;
const gradient = () => gradientMock;

// ─── Color Palette ───
const colors = {
  brand:    chalk.hex('#7C5CFF'),   // purple accent
  success:  chalk.hex('#00E676'),   // neon green
  error:    chalk.hex('#FF5252'),   // red
  warn:     chalk.hex('#FFD740'),   // amber
  info:     chalk.hex('#40C4FF'),   // sky blue
  system:   chalk.hex('#B388FF'),   // light purple
  debug:    chalk.hex('#78909C'),   // blue-gray
  dim:      chalk.hex('#546E7A'),   // muted
  text:     chalk.hex('#ECEFF1'),   // near-white
  bright:   chalk.hex('#FFFFFF'),   // white
  muted:    chalk.hex('#37474F'),   // dark muted
  cyan:     chalk.hex('#18FFFF'),   // cyan accent
  orange:   chalk.hex('#FF9100'),   // orange
  pink:     chalk.hex('#FF4081'),   // pink
  lime:     chalk.hex('#C6FF00'),   // lime
};

// ─── Tag Builder ───
const TAG_CONFIG = {
  'OK':   { icon: '✔', color: colors.success },
  'DONE': { icon: '✔', color: colors.success },
  'FAIL': { icon: '✖', color: colors.error },
  'ERR':  { icon: '✖', color: colors.error },
  'NO':   { icon: '✖', color: colors.error },
  'WARN': { icon: '⚠', color: colors.warn },
  'WN':   { icon: '⚠', color: colors.warn },
  'INFO': { icon: '●', color: colors.info },
  'BOOT': { icon: '◆', color: colors.brand },
  'SYS':  { icon: '⚙', color: colors.system },
  'WAIT': { icon: '◌', color: colors.warn },
  'DBG':  { icon: '○', color: colors.debug },
};

function getTime() {
  return timeHelper.formatTime("HH:mm:ss");
}

function makeTag(label, isSuccess = false, isError = false) {
  const l = label.toUpperCase().trim();
  const text = l.substring(0, 5).padEnd(5, " ");

  let cfg = TAG_CONFIG[l];
  if (!cfg) {
    if (isSuccess) cfg = TAG_CONFIG['OK'];
    else if (isError) cfg = TAG_CONFIG['FAIL'];
    else cfg = { icon: '●', color: colors.info };
  }

  const time = colors.dim(getTime());
  const tag = cfg.color(`${cfg.icon} ${text}`);
  return `  ${time} ${colors.muted('│')} ${tag} ${colors.muted('│')}`;
}

// ─── Core Logger ───
function writeLog(kind, label, detail = "") {
  const kindMap = {
    info:    { isSuccess: false, isError: false },
    success: { isSuccess: true,  isError: false },
    warn:    { isSuccess: false, isError: false },
    error:   { isSuccess: false, isError: true  },
    system:  { isSuccess: false, isError: false },
    debug:   { isSuccess: false, isError: false },
  };
  const tagLabelMap = {
    info: 'INFO', success: 'OK', warn: 'WARN',
    error: 'FAIL', system: 'SYS', debug: 'DBG',
  };

  const { isSuccess, isError } = kindMap[kind] || kindMap.info;
  const tagLabel = tagLabelMap[kind] || 'INFO';
  const tag = makeTag(tagLabel, isSuccess, isError);

  const kindColorMap = {
    info:    colors.info,
    success: colors.success,
    warn:    colors.warn,
    error:   colors.error,
    system:  colors.system,
    debug:   colors.debug,
  };
  const colorFn = kindColorMap[kind] || colors.text;

  const labelText = colors.bright(label);
  const detailText = detail ? ` ${colors.text(detail)}` : "";
  console.log(`${tag} ${labelText}${detailText}`);
}

const logger = {
  info:    (label, detail = "") => writeLog("info",    label, detail),
  success: (label, detail = "") => writeLog("success", label, detail),
  warn:    (label, detail = "") => writeLog("warn",    label, detail),
  error:   (label, detail = "") => writeLog("error",   label, detail),
  system:  (label, detail = "") => writeLog("system",  label, detail),
  debug:   (label, detail = "") => writeLog("debug",   label, detail),
  tag: (label, msg, detail = "") => {
    const tag = makeTag(label.substring(0, 5));
    const detailText = detail ? ` ${colors.dim(detail)}` : "";
    console.log(`${tag} ${colors.text(msg)}${detailText}`);
  },
};

// ─── Spinner (simplified) ───
function createSpinner(label = "SYS", text = "loading", options = {}) {
  let active = false;
  return {
    start() {
      active = true;
      console.log(`${makeTag(label)} ${colors.text(text)}...`);
    },
    update(nextText) {
      if (active) console.log(`${makeTag(label)} ${colors.text(nextText)}...`);
    },
    stop() { active = false; },
    succeed(detail = text) { this.stop(); logger.success(label, detail); },
    warn(detail = text) { this.stop(); logger.warn(label, detail); },
    fail(detail = text) { this.stop(); logger.error(label, detail); },
    isActive() { return active; },
  };
}

async function spinText(label, text, options = {}) {
  logger.success(label || "SYS", text);
}

async function typeLine(text, options = {}) {
  const clean = text.replace(/\x1B\[\d+m/g, "");
  logger.success("SYS", clean);
}

async function runLoader(text = "memuat", options = {}) {
  logger.success("SYS", text);
}

// ─── Boot Sequence ───
async function playBootSequence(info = {}) {
  const { name = "SHIROWAHD", version = "3.3", mode = "public" } = info;

  console.log("");
  console.log(colors.brand(`
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                       │
  │   ███████╗██╗  ██╗██╗██████╗  ██████╗ ██╗    ██╗ █████╗ ██╗  ██╗██████╗  │
  │   ██╔════╝██║  ██║██║██╔══██╗██╔═══██╗██║    ██║██╔══██╗██║  ██║██╔══██╗ │
  │   ███████╗███████║██║██████╔╝██║   ██║██║ █╗ ██║███████║███████║██║  ██║ │
  │   ╚════██║██╔══██║██║██╔══██╗██║   ██║██║███╗██║██╔══██║██╔══██║██║  ██║ │
  │   ███████║██║  ██║██║██║  ██║╚██████╔╝╚███╔███╔╝██║  ██║██║  ██║██████╔╝│
  │   ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ │
  │                                                                       │
  └─────────────────────────────────────────────────────────────────────────┘`));
  console.log("");
  console.log(`  ${colors.brand('▸')} ${colors.bright('SHIROWAHD')} ${colors.dim('Multi-Device WhatsApp Bot')} ${colors.brand(`v${version}`)}`);
  console.log(`  ${colors.dim('━'.repeat(55))}`);
  console.log("");

  logger.system("BOOT", "Memulai Sistem Utama...");
  logger.info("MODE", mode.toUpperCase());
}

// ─── Message Type Tag ───
function getTypeTag(msgType, isNewsletter) {
  if (isNewsletter) return "Channel";
  const map = {
    imageMessage: "IMG", videoMessage: "VID", audioMessage: "AUD",
    stickerMessage: "STK", documentMessage: "DOC", contactMessage: "VCF",
    locationMessage: "LOC", viewOnceMessageV2: "1xV",
    extendedTextMessage: "TXT", conversation: "TXT",
    interactiveResponseMessage: "BTN", pollCreationMessage: "POL",
    reactionMessage: "RCT",
  };
  return map[msgType] || "MSG";
}

// ─── Message Logger ───
function logMessage(info) {
  if (typeof info === "string") {
    const [chatType, sender, message] = arguments;
    info = {
      chatType, sender, message,
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

  const time = getTime();
  const typeTag = getTypeTag(messageType, isNewsletter || chatType === "newsletter");
  const location = chatType === "group" || chatType === "newsletter" ? (groupName || "Group") : "Private";
  const senderName = pushName || num;
  const device = info.device || "Unknown";

  // Word-wrap
  const maxWidth = 50;
  const msgLines = [];
  msg.split('\n').forEach(line => {
    let cur = "";
    line.split(' ').forEach(word => {
      if ((cur + word).length > maxWidth) {
        if (cur) { msgLines.push(cur.trimEnd()); cur = word + " "; }
        else {
          const chunks = word.match(new RegExp(`.{1,${maxWidth}}`, 'g')) || [];
          chunks.slice(0, -1).forEach(c => msgLines.push(c));
          cur = (chunks[chunks.length - 1] || "") + " ";
        }
      } else { cur += word + " "; }
    });
    if (cur) msgLines.push(cur.trimEnd());
  });

  // Pretty message box
  const isPrivate = chatType === "private";
  const locColor = isPrivate ? colors.orange : colors.cyan;
  const locLabel = isPrivate ? "PRIVATE" : location;
  const typeBadge = colors.brand(`[${typeTag}]`);

  console.log("");
  console.log(`  ${colors.dim(time)} ${colors.muted('│')} ${colors.success('▶')} ${colors.bright('MESSAGE')} ${typeBadge} ${locColor(locLabel)}`);
  console.log(`  ${colors.dim('     ')} ${colors.muted('│')}   ${colors.dim('from')} ${colors.success(senderName)} ${colors.dim(`(${num})`)} ${colors.dim('via')} ${colors.dim(device)}`);

  msgLines.forEach((line, i) => {
    if (i === 0) {
      console.log(`  ${colors.dim('     ')} ${colors.muted('│')}   ${colors.dim('»')} ${colors.text(line)}`);
    } else {
      console.log(`  ${colors.dim('     ')} ${colors.muted('│')}     ${colors.text(line)}`);
    }
  });
}

// ─── Plugin Logger ───
function logPlugin(name, category) {
  console.log(`  ${colors.dim('├─')} ${colors.text(name)} ${colors.dim(`[${category}]`)}`);
}

// ─── Connection Logger ───
function logConnection(status, info = "") {
  const detail = info ? ` — ${info}` : "";
  if (status === "connected") {
    logger.success("CONN", `Connected${detail}`);
  } else if (status === "connecting") {
    logger.info("CONN", `Connecting${detail}`);
  } else {
    logger.error("CONN", `Disconnected${detail}`);
  }
}

// ─── Error Box ───
function logErrorBox(title, message) {
  console.log("");
  console.log(`  ${colors.error('┌─ ERROR ──────────────────────────────────')}`);
  console.log(`  ${colors.error('│')} ${colors.bright(title)}`);
  console.log(`  ${colors.error('│')} ${colors.dim(message)}`);
  console.log(`  ${colors.error('└──────────────────────────────────────────')}`);
}

function printBanner(mini = false) {}
function printStartup(info = {}) {}

const CODES = {
  reset: "", bold: "", dim: "", italic: "", underline: "",
  green: "", purple: "", white: "", gray: "", phantom: "",
  lime: "", silver: "", red: "", yellow: "", blue: "",
  cyan: "", magenta: "", bgBlack: "", bgGray: "",
};

// Compat color map
const c = {
  green: colors.success,
  purple: colors.brand,
  white: colors.text,
  gray: colors.dim,
  bold: (v) => v,
  dim: colors.dim,
  greenBold: colors.success,
  purpleBold: colors.brand,
  whiteBold: colors.bright,
  grayDim: colors.dim,
  red: colors.error,
  yellow: colors.warn,
  cyan: colors.cyan,
  blue: colors.info,
  magenta: colors.pink,
};

function divider() {
  console.log(`  ${colors.muted('─'.repeat(55))}`);
}

function createBanner(lines, color = "green") {
  return lines.map(l => `  ${colors.muted('│')} ${colors.text(l)}`).join("\n");
}

function getTimestamp() {
  return colors.dim(getTime());
}

const theme = {
  primary: colors.brand,
  secondary: colors.text,
  accent: colors.success,
  text: colors.text,
  dim: colors.dim,
  muted: colors.dim,
  success: colors.success,
  error: colors.error,
  warning: colors.warn,
  info: colors.info,
  debug: colors.debug,
  border: colors.muted,
  tag: colors.text,
  pill: (t) => t,
  rainbow: gradientMock,
  borderFx: (t) => colors.muted(t),
  mintFx: (t) => colors.success(t),
  warmFx: (t) => colors.warn(t),
  colorizeCategory: (t) => colors.brand(t),
};

export {
  c, CODES, logger, createSpinner, spinText, typeLine, runLoader,
  playBootSequence, logMessage, logPlugin, logConnection, logErrorBox,
  printBanner, printStartup, createBanner, getTimestamp, divider,
  theme, chalk, gradient
};
