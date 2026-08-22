import chalk from "chalk";
import * as timeHelper from "./ourin-time.js";
import { getCachedJid, isLidConverted } from "./ourin-lid.js";

const gradientMock = (text) => text;
const gradient = () => gradientMock;

// ═══════════════════════════════════════════════════
//  COLOR PALETTE
// ═══════════════════════════════════════════════════
const P = {
  brand:   chalk.hex('#7C5CFF'),
  brand2:  chalk.hex('#A78BFA'),
  neon:    chalk.hex('#00E676'),
  red:     chalk.hex('#FF5252'),
  amber:   chalk.hex('#FFD740'),
  sky:     chalk.hex('#40C4FF'),
  purple:  chalk.hex('#B388FF'),
  gray:    chalk.hex('#78909C'),
  dim:     chalk.hex('#455A64'),
  muted:   chalk.hex('#37474F'),
  text:    chalk.hex('#ECEFF1'),
  white:   chalk.hex('#FFFFFF'),
  cyan:    chalk.hex('#18FFFF'),
  orange:  chalk.hex('#FF9100'),
  pink:    chalk.hex('#FF4081'),
  lime:    chalk.hex('#C6FF00'),
  bgBrand: chalk.bgHex('#7C5CFF').hex('#FFFFFF'),
  bgNeon:  chalk.bgHex('#00E676').hex('#000000'),
  bgRed:   chalk.bgHex('#FF5252').hex('#FFFFFF'),
  bgAmber: chalk.bgHex('#FFD740').hex('#000000'),
  bgSky:   chalk.bgHex('#40C4FF').hex('#000000'),
  bgGray:  chalk.bgHex('#455A64').hex('#ECEFF1'),
};

function getTime() {
  return timeHelper.formatTime("HH:mm:ss");
}

// ═══════════════════════════════════════════════════
//  BOOT SEQUENCE — Clean visual splash
// ═══════════════════════════════════════════════════
async function playBootSequence(info = {}) {
  const { name = "SHIROWAHD", version = "3.3", mode = "public" } = info;
  const W = 44;
  const hl = P.brand('═'.repeat(W));
  const s = P.brand('║');
  const sp = ' '.repeat(W);

  // helper: pad colored string to fixed visible width
  const pad = (str, w) => {
    const vis = str.replace(/\x1B\[\d+(?:;\d+)*m/g, '').length;
    return vis < w ? str + ' '.repeat(w - vis) : str;
  };

  // center colored text inside W visible chars
  const centerC = (txt, w) => {
    const vis = txt.replace(/\x1B\[\d+(?:;\d+)*m/g, '').length;
    const gap = Math.max(0, w - vis);
    const left = Math.floor(gap / 2);
    return ' '.repeat(left) + txt + ' '.repeat(gap - left);
  };

  const modeColor = mode === 'self' ? P.orange : P.neon;
  const timeStr = getTime() + ' WIB';

  console.log('');
  // ASCII art - all lines exactly 27 chars
  const art = [
    '███████╗██╗  ██╗██╗██████╗ ',
    '██╔════╝██║  ██║██║██╔══██╗',
    '███████╗███████║██║██████╔╝',
    '╚════██║██╔══██║██║██╔══██╗',
    '███████║██║  ██║██║██║  ██║',
    '╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝',
  ];

  console.log(`  ${P.brand('╔')}${hl}${P.brand('╗')}`);
  console.log(`  ${s}${sp}${s}`);
  for (const a of art) {
    console.log(`  ${s}${centerC(P.cyan(a), W)}${s}`);
  }
  console.log(`  ${s}${sp}${s}`);
  console.log(`  ${P.brand('╠')}${P.brand('─'.repeat(W))}${P.brand('╣')}`);
  console.log(`  ${s}${pad(`  ${P.white(name)}  ${P.dim('│')}  ${P.brand('v' + version)}  ${P.dim('│')}  ${P.dim('WhatsApp Bot')}`, W)}${s}`);
  console.log(`  ${s}${pad(`  ${P.dim('Mode:')} ${modeColor(mode.toUpperCase())}  ${P.dim('│')}  ${P.dim('Time:')} ${P.sky(timeStr)}`, W)}${s}`);
  console.log(`  ${s}${sp}${s}`);
  console.log(`  ${P.brand('╚')}${hl}${P.brand('╝')}`);
  console.log('');

  logger.system("BOOT", "Memulai Sistem Utama...");
}

// ═══════════════════════════════════════════════════
//  LOGGER — Badge-style tags
// ═══════════════════════════════════════════════════
const BADGES = {
  success: { badge: P.bgNeon,  icon: ' ✔ ', label: ' OK ' },
  error:   { badge: P.bgRed,   icon: ' ✖ ', label: ' ERR ' },
  warn:    { badge: P.bgAmber,  icon: ' ⚠ ', label: ' WARN ' },
  info:    { badge: P.bgSky,    icon: ' ● ', label: ' INFO ' },
  system:  { badge: P.bgBrand,  icon: ' ⚙ ', label: ' SYS ' },
  debug:   { badge: P.bgGray,   icon: ' ○ ', label: ' DBG ' },
};

function writeLog(kind, label, detail = "") {
  const b = BADGES[kind] || BADGES.info;
  const time = P.dim(getTime());
  const badge = b.badge(b.label);
  const labelText = P.white(label);
  const detailText = detail ? ` ${P.text(detail)}` : "";
  console.log(`  ${time}  ${badge}  ${labelText}${detailText}`);
}

const logger = {
  info:    (label, detail = "") => writeLog("info",    label, detail),
  success: (label, detail = "") => writeLog("success", label, detail),
  warn:    (label, detail = "") => writeLog("warn",    label, detail),
  error:   (label, detail = "") => writeLog("error",   label, detail),
  system:  (label, detail = "") => writeLog("system",  label, detail),
  debug:   (label, detail = "") => writeLog("debug",   label, detail),
  tag: (label, msg, detail = "") => {
    const time = P.dim(getTime());
    const badge = P.bgGray(` ${label.substring(0,4).toUpperCase()} `);
    const detailText = detail ? ` ${P.dim(detail)}` : "";
    console.log(`  ${time}  ${badge}  ${P.text(msg)}${detailText}`);
  },
};

// ═══════════════════════════════════════════════════
//  SPINNER / LOADER (simplified)
// ═══════════════════════════════════════════════════
function createSpinner(label = "SYS", text = "loading", options = {}) {
  let active = false;
  return {
    start() { active = true; logger.info(label, text + "..."); },
    update(t) { if (active) logger.info(label, t + "..."); },
    stop() { active = false; },
    succeed(d = text) { this.stop(); logger.success(label, d); },
    warn(d = text) { this.stop(); logger.warn(label, d); },
    fail(d = text) { this.stop(); logger.error(label, d); },
    isActive() { return active; },
  };
}

async function spinText(label, text) { logger.success(label || "SYS", text); }
async function typeLine(text) { logger.success("SYS", text.replace(/\x1B\[\d+m/g, "")); }
async function runLoader(text = "memuat") { logger.success("SYS", text); }

// ═══════════════════════════════════════════════════
//  MESSAGE TYPE
// ═══════════════════════════════════════════════════
function getTypeTag(msgType, isNewsletter) {
  if (isNewsletter) return "CH";
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

// ═══════════════════════════════════════════════════
//  MESSAGE LOGGER — Card-style box
// ═══════════════════════════════════════════════════
function logMessage(info) {
  if (typeof info === "string") {
    const [chatType, sender, message] = arguments;
    info = { chatType, sender, message, pushName: sender, groupName: chatType === "group" ? "Unknown" : "Private" };
  }

  const { chatType, groupName, pushName, sender, message, messageType, isNewsletter } = info;
  if (!message || message.trim() === "" || !sender) return;

  const num = sender.replace("@s.whatsapp.net", "");
  let msg = message;

  msg = msg.replace(/@(\d{10,})/g, (match, n) => {
    const lidJid = n + "@lid";
    const resolved = getCachedJid(lidJid);
    if (resolved && !isLidConverted(resolved)) return "@" + resolved.replace(/@.+/g, "");
    const swJid = n + "@s.whatsapp.net";
    const resolved2 = getCachedJid(swJid);
    if (resolved2 && !isLidConverted(resolved2)) return "@" + resolved2.replace(/@.+/g, "");
    return match;
  });

  const time = getTime();
  const typeTag = getTypeTag(messageType, isNewsletter || chatType === "newsletter");
  const location = chatType === "group" || chatType === "newsletter" ? (groupName || "Group") : "Private";
  const senderName = pushName || num;
  const device = info.device || "Unknown";
  const isPrivate = chatType === "private";

  // Word-wrap
  const maxWidth = 48;
  const msgLines = [];
  msg.split('\n').forEach(line => {
    let cur = "";
    line.split(' ').forEach(word => {
      if ((cur + word).length > maxWidth) {
        if (cur) { msgLines.push(cur.trimEnd()); cur = word + " "; }
        else {
          const chunks = word.match(new RegExp(`.{1,${maxWidth}}`, 'g')) || [];
          chunks.slice(0, -1).forEach(ch => msgLines.push(ch));
          cur = (chunks[chunks.length - 1] || "") + " ";
        }
      } else { cur += word + " "; }
    });
    if (cur) msgLines.push(cur.trimEnd());
  });

  // ── Card Design ──
  const W = 56;
  const border = P.dim('─'.repeat(W));
  const locBadge = isPrivate ? P.bgAmber(` PRIVATE `) : P.bgSky(` ${location.substring(0, 20)} `);
  const typeBadge = P.bgBrand(` ${typeTag} `);

  console.log('');
  console.log(`  ${P.dim('┌')}${border}${P.dim('┐')}`);
  console.log(`  ${P.dim('│')} ${P.neon('◆')} ${P.white(senderName)} ${P.dim(`(${num})`)}${' '.repeat(Math.max(0, W - senderName.length - num.length - 7))}${P.dim('│')}`);
  console.log(`  ${P.dim('│')} ${P.dim(time)} ${P.dim('•')} ${typeBadge} ${locBadge} ${P.dim(`• ${device}`)}${' '.repeat(Math.max(0, 5))}${P.dim('│')}`);
  console.log(`  ${P.dim('├')}${P.dim('─'.repeat(W))}${P.dim('┤')}`);

  for (const line of msgLines) {
    const padding = Math.max(0, W - line.length - 3);
    console.log(`  ${P.dim('│')}  ${P.text(line)}${' '.repeat(padding)} ${P.dim('│')}`);
  }

  console.log(`  ${P.dim('└')}${border}${P.dim('┘')}`);
}

// ═══════════════════════════════════════════════════
//  PLUGIN / CONNECTION / ERROR
// ═══════════════════════════════════════════════════
function logPlugin(name, category) {
  console.log(`    ${P.dim('├─')} ${P.text(name)} ${P.dim(`[${category}]`)}`);
}

function logConnection(status, info = "") {
  const detail = info ? ` — ${info}` : "";
  if (status === "connected") {
    console.log('');
    console.log(`  ${P.bgNeon(' ✔ CONNECTED ')} ${P.white(info || 'Bot')}`);
    console.log('');
  } else if (status === "connecting") {
    console.log(`  ${P.bgAmber(' ◌ CONNECTING ')} ${P.text(info || '...')}`);
  } else {
    console.log(`  ${P.bgRed(' ✖ DISCONNECTED ')} ${P.text(info || '')}`);
  }
}

function logErrorBox(title, message) {
  const W = 56;
  console.log('');
  console.log(`  ${P.red('╔')}${P.red('═'.repeat(W))}${P.red('╗')}`);
  console.log(`  ${P.red('║')} ${P.bgRed(' ✖ ERROR ')} ${P.white(title)}${' '.repeat(Math.max(0, W - title.length - 12))}${P.red('║')}`);
  console.log(`  ${P.red('║')} ${P.dim(message.substring(0, W - 2))}${' '.repeat(Math.max(0, W - message.substring(0, W - 2).length - 2))}${P.red('║')}`);
  console.log(`  ${P.red('╚')}${P.red('═'.repeat(W))}${P.red('╝')}`);
  console.log('');
}

function divider() {
  console.log(`  ${P.muted('━'.repeat(56))}`);
}

// ═══════════════════════════════════════════════════
//  COMPAT EXPORTS
// ═══════════════════════════════════════════════════
function printBanner() {}
function printStartup() {}

const CODES = {
  reset: "", bold: "", dim: "", italic: "", underline: "",
  green: "", purple: "", white: "", gray: "", phantom: "",
  lime: "", silver: "", red: "", yellow: "", blue: "",
  cyan: "", magenta: "", bgBlack: "", bgGray: "",
};

const c = {
  green: P.neon, purple: P.brand, white: P.text, gray: P.dim,
  bold: (v) => v, dim: P.dim,
  greenBold: P.neon, purpleBold: P.brand, whiteBold: P.white, grayDim: P.dim,
  red: P.red, yellow: P.amber, cyan: P.cyan, blue: P.sky, magenta: P.pink,
};

function createBanner(lines) {
  return lines.map(l => `  ${P.muted('│')} ${P.text(l)}`).join("\n");
}

function getTimestamp() {
  return P.dim(getTime());
}

const theme = {
  primary: P.brand, secondary: P.text, accent: P.neon,
  text: P.text, dim: P.dim, muted: P.dim,
  success: P.neon, error: P.red, warning: P.amber,
  info: P.sky, debug: P.gray, border: P.muted, tag: P.text,
  pill: (t) => t, rainbow: gradientMock,
  borderFx: (t) => P.muted(t), mintFx: (t) => P.neon(t),
  warmFx: (t) => P.amber(t), colorizeCategory: (t) => P.brand(t),
};

function makeTag(label, isSuccess = false, isError = false) {
  const l = label.toUpperCase().trim().substring(0, 5).padEnd(5);
  if (isSuccess) return P.bgNeon(` ${l} `);
  if (isError) return P.bgRed(` ${l} `);
  return P.bgGray(` ${l} `);
}

export {
  c, CODES, logger, createSpinner, spinText, typeLine, runLoader,
  playBootSequence, logMessage, logPlugin, logConnection, logErrorBox,
  printBanner, printStartup, createBanner, getTimestamp, divider,
  theme, chalk, gradient
};
