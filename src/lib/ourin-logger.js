import chalk from "chalk";
import * as timeHelper from "./ourin-time.js";
import { getCachedJid, isLidConverted } from "./ourin-lid.js";

const gradientMock = (text) => text;
const gradient = () => gradientMock;

// ═══════════════════════════════════════
//  PALETTE
// ═══════════════════════════════════════
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

// ═══════════════════════════════════════
//  BOOT STATE — suppress loading logs
// ═══════════════════════════════════════
let _booting = true;
let _bootLogs = [];
let _bootStart = Date.now();

function finishBoot() {
  if (!_booting) return;
  _booting = false;
  const elapsed = ((Date.now() - _bootStart) / 1000).toFixed(1);

  // Clear screen for clean look
  process.stdout.write('\x1Bc');

  const W = 50;
  const sep = P.muted('─'.repeat(W));

  console.log('');
  console.log(`  ${P.brand('S H I R O W A H D')}`);
  console.log(`  ${sep}`);
  console.log('');

  // Status dashboard
  const bootCount = _bootLogs.length;
  const errors = _bootLogs.filter(l => l.kind === 'error').length;
  const warns = _bootLogs.filter(l => l.kind === 'warn').length;

  console.log(`  ${P.bgBrand(' STATUS ')}  ${P.neon('● Online')}    ${P.bgGray(' BOOT ')}  ${P.text(elapsed + 's')}    ${P.bgGray(' LOGS ')}  ${P.text(bootCount + ' loaded')}`);

  if (errors > 0 || warns > 0) {
    const parts = [];
    if (errors > 0) parts.push(P.red(`${errors} error${errors > 1 ? 's' : ''}`));
    if (warns > 0) parts.push(P.amber(`${warns} warning${warns > 1 ? 's' : ''}`));
    console.log(`  ${P.bgAmber(' ISSUES ')}  ${parts.join('  ')}`);
  }

  console.log('');
  console.log(`  ${sep}`);
  console.log(`  ${P.dim('Ready — listening for messages')}`);
  console.log(`  ${sep}`);
  console.log('');
}

// ═══════════════════════════════════════
//  LOGGER
// ═══════════════════════════════════════
function writeLog(kind, label, detail = "") {
  // During boot: collect silently, don't print
  if (_booting) {
    _bootLogs.push({ kind, label, detail, time: getTime() });
    return;
  }

  const time = P.dim(getTime());
  const badges = {
    success: P.bgNeon(' ✔ '),
    error:   P.bgRed(' ✖ '),
    warn:    P.bgAmber(' ⚠ '),
    info:    P.bgSky(' ● '),
    system:  P.bgBrand(' ⚙ '),
    debug:   P.bgGray(' ○ '),
  };
  const badge = badges[kind] || badges.info;
  const detailText = detail ? ` ${P.text(detail)}` : "";
  console.log(`  ${time}  ${badge}  ${P.white(label)}${detailText}`);
}

const logger = {
  info:    (label, detail = "") => writeLog("info",    label, detail),
  success: (label, detail = "") => writeLog("success", label, detail),
  warn:    (label, detail = "") => writeLog("warn",    label, detail),
  error:   (label, detail = "") => writeLog("error",   label, detail),
  system:  (label, detail = "") => writeLog("system",  label, detail),
  debug:   (label, detail = "") => writeLog("debug",   label, detail),
  tag: (label, msg, detail = "") => {
    if (_booting) { _bootLogs.push({ kind: 'info', label, detail: msg + (detail ? ' ' + detail : ''), time: getTime() }); return; }
    const time = P.dim(getTime());
    const badge = P.bgGray(` ${label.substring(0,3).toUpperCase()} `);
    console.log(`  ${time}  ${badge}  ${P.text(msg)}${detail ? ' ' + P.dim(detail) : ''}`);
  },
};

// ═══════════════════════════════════════
//  SPINNER / LOADER — silent during boot
// ═══════════════════════════════════════
function createSpinner(label = "SYS", text = "loading") {
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

async function spinText(label, text) { logger.info(label || "SYS", text); }
async function typeLine(text) { logger.info("SYS", text.replace(/\x1B\[\d+m/g, "")); }
async function runLoader(text = "memuat") { logger.info("SYS", text); }

// ═══════════════════════════════════════
//  BOOT SEQUENCE — just mark start
// ═══════════════════════════════════════
async function playBootSequence(info = {}) {
  _booting = true;
  _bootStart = Date.now();
  _bootLogs = [];
  // Show a simple loading indicator
  process.stdout.write(P.dim('  Loading SHIROWAHD...'));
}

// ═══════════════════════════════════════
//  MESSAGE TYPE
// ═══════════════════════════════════════
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

// ═══════════════════════════════════════
//  MESSAGE — clean card
// ═══════════════════════════════════════
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
    const resolved = getCachedJid(n + "@lid");
    if (resolved && !isLidConverted(resolved)) return "@" + resolved.replace(/@.+/g, "");
    const resolved2 = getCachedJid(n + "@s.whatsapp.net");
    if (resolved2 && !isLidConverted(resolved2)) return "@" + resolved2.replace(/@.+/g, "");
    return match;
  });

  const time = getTime();
  const typeTag = getTypeTag(messageType, isNewsletter || chatType === "newsletter");
  const location = chatType === "group" || chatType === "newsletter" ? (groupName || "Group") : "Private";
  const senderName = pushName || num;
  const isPrivate = chatType === "private";

  // Truncate message for single line display
  const maxLen = 60;
  const flat = msg.replace(/\n/g, ' ').trim();
  const preview = flat.length > maxLen ? flat.substring(0, maxLen) + '…' : flat;

  const locBadge = isPrivate ? P.bgAmber(` DM `) : P.bgSky(` ${location.substring(0, 15)} `);
  const typeBadge = P.bgBrand(` ${typeTag} `);

  console.log(`  ${P.dim(time)}  ${typeBadge} ${locBadge}  ${P.neon(senderName)} ${P.dim('›')} ${P.text(preview)}`);
}

// ═══════════════════════════════════════
//  PLUGIN / CONNECTION / ERROR
// ═══════════════════════════════════════
function logPlugin(name, category) {
  // Silent during boot
  if (_booting) { _bootLogs.push({ kind: 'info', label: 'plugin', detail: name, time: getTime() }); return; }
  console.log(`    ${P.dim('·')} ${P.text(name)} ${P.dim(category)}`);
}

function logConnection(status, info = "") {
  if (status === "connected") {
    // Connection = boot finished! Show clean dashboard
    finishBoot();
  } else if (status === "connecting") {
    // Silent during boot
    if (_booting) { _bootLogs.push({ kind: 'info', label: 'conn', detail: 'Connecting' + (info ? ' — ' + info : ''), time: getTime() }); return; }
    logger.info("CONN", `Connecting${info ? ' — ' + info : ''}`);
  } else {
    logger.error("CONN", `Disconnected${info ? ' — ' + info : ''}`);
  }
}

function logErrorBox(title, message) {
  console.log(`  ${P.bgRed(' ERROR ')}  ${P.white(title)} ${P.dim('—')} ${P.dim(message.substring(0, 80))}`);
}

function divider() {
  console.log(`  ${P.muted('─'.repeat(50))}`);
}

// ═══════════════════════════════════════
//  COMPAT EXPORTS
// ═══════════════════════════════════════
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

function makeTag(label, isSuccess = false, isError = false) {
  const l = label.toUpperCase().trim().substring(0, 5).padEnd(5);
  if (isSuccess) return P.bgNeon(` ${l} `);
  if (isError) return P.bgRed(` ${l} `);
  return P.bgGray(` ${l} `);
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

export {
  c, CODES, logger, createSpinner, spinText, typeLine, runLoader,
  playBootSequence, logMessage, logPlugin, logConnection, logErrorBox,
  printBanner, printStartup, createBanner, getTimestamp, divider,
  theme, chalk, gradient, makeTag, finishBoot
};
