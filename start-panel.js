import { spawn, execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';

// ─── Auto Git Pull (panel handles this) ───
try {
  const GIT_REPO = process.env.GIT_ADDRESS || 'https://github.com/hijuki/shirowahd';
  const GIT_TOKEN = process.env.ACCESS_TOKEN || '';
  const GIT_USER = process.env.USERNAME || '';
  const GIT_BRANCH = process.env.BRANCH || 'main';

  if (!existsSync('.git')) {
    console.log('[UPDATE] No .git found — initializing repo...');
    execSync('git init && git checkout -b ' + GIT_BRANCH, { encoding: 'utf8', timeout: 15000 });
    let remoteUrl = GIT_REPO;
    if (GIT_TOKEN && GIT_USER) {
      remoteUrl = GIT_REPO.replace('https://', `https://${GIT_USER}:${GIT_TOKEN}@`);
    } else if (GIT_TOKEN) {
      remoteUrl = GIT_REPO.replace('https://', `https://${GIT_TOKEN}@`);
    }
    execSync(`git remote add origin ${remoteUrl}`, { encoding: 'utf8', timeout: 5000 });
    console.log('[UPDATE] Git repo initialized, pulling...');
    const out = execSync(`git fetch origin ${GIT_BRANCH} && git reset --hard origin/${GIT_BRANCH}`, { encoding: 'utf8', timeout: 60000 }).trim();
    console.log(`[UPDATE] ${out || 'Up to date'}`);
  } else {
    console.log('[UPDATE] Checking for updates...');
    const out = execSync('git fetch origin main && git reset --hard origin/main', { encoding: 'utf8', timeout: 30000 }).trim();
    console.log(`[UPDATE] ${out || 'Up to date'}`);
  }
} catch (e) { console.error(`[UPDATE] git pull failed: ${e.message}`); }

const DOMAIN = 'swhdhlz.my.id';

// ─── Mini Logger ───
import chalk from 'chalk';

const _dim   = chalk.hex('#546E7A');
const _muted = chalk.hex('#37474F');
const _brand = chalk.hex('#7C5CFF');
const _ok    = chalk.hex('#00E676');
const _err   = chalk.hex('#FF5252');
const _info  = chalk.hex('#40C4FF');
const _text  = chalk.hex('#ECEFF1');

function ts() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  const s = String(d.getSeconds()).padStart(2,'0');
  return `${h}:${m}:${s}`;
}

function log(icon, color, tag, msg) {
  const t = _dim(ts());
  const sep = _muted('│');
  const tagStr = color(`${icon} ${tag.padEnd(5)}`);
  console.log(`  ${t} ${sep} ${tagStr} ${sep} ${_text(msg)}`);
}

const ok   = (tag, msg) => log('✔', _ok,   tag, msg);
const info = (tag, msg) => log('●', _info, tag, msg);
const err  = (tag, msg) => log('✖', _err,  tag, msg);
const sys  = (tag, msg) => log('⚙', _brand, tag, msg);

// 0. Patch Baileys for large file upload (80MB+)
try {
  const sendFile = './node_modules/@whiskeysockets/baileys/lib/Socket/messages-send.js';
  const mediaFile = './node_modules/@whiskeysockets/baileys/lib/Utils/messages-media.js';
  
  if (existsSync(sendFile)) {
    let src = readFileSync(sendFile, 'utf8');
    if (src.includes('maxContentLengthBytes:') && !src.includes('maxContentLengthBytes: Infinity')) {
      src = src.replace(/maxContentLengthBytes:\s*\d+/g, 'maxContentLengthBytes: Infinity');
      writeFileSync(sendFile, src);
      ok('PATCH', 'Baileys messages-send.js patched (maxContentLengthBytes → Infinity)');
    }
  }
  
  if (existsSync(mediaFile)) {
    let src = readFileSync(mediaFile, 'utf8');
    if (src.includes('opts?.maxContentLength') && !src.includes('if (false && opts?.maxContentLength')) {
      src = src.replace(/if \(opts\?\.maxContentLength/g, 'if (false && opts?.maxContentLength');
      writeFileSync(mediaFile, src);
      ok('PATCH', 'Baileys messages-media.js patched (maxContentLength check disabled)');
    }
  }
} catch (e) { err('PATCH', `Baileys patch error: ${e.message}`); }

// 1. Start web-uploader
sys('BOOT', 'Launching web-uploader...');
const webUp = spawn('node', ['web-uploader.js'], { stdio: 'inherit' });
webUp.on('error', e => err('WEB', `Error: ${e.message}`));

// 2. Update admin-settings.json with domain
try {
  const sf = './admin-settings.json';
  if (existsSync(sf)) {
    const s = JSON.parse(readFileSync(sf, 'utf8'));
    if (!s.domain || s.domain !== DOMAIN) {
      s.domain = DOMAIN;
      writeFileSync(sf, JSON.stringify(s, null, 2));
      ok('BOOT', `Domain set to ${DOMAIN}`);
    }
  }
} catch (e) { err('BOOT', `Settings update error: ${e.message}`); }

// 3. NO tunnel — panel uses its own tunnel or Cloudflare handles routing
info('TUNL', 'Panel mode — skipping Cloudflare tunnel (use panel tunnel or external proxy)');

// 4. Start bot (main process)
sys('BOOT', 'Launching bot...');
await import('./index.js');
