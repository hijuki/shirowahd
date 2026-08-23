import { spawn, execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';

// ─── Load .env ───
try { process.loadEnvFile(); } catch {}

// ─── Config ───
const CF_ACCOUNT   = process.env.CF_ACCOUNT   || '';
const CF_EMAIL     = process.env.CF_EMAIL      || '';
const CF_KEY       = process.env.CF_KEY        || '';
const CF_TUNNEL_ID = process.env.CF_TUNNEL_ID  || '';
const DOMAIN       = process.env.DOMAIN        || 'swhdhlz.my.id';
const ENABLE_TUNNEL = process.env.ENABLE_TUNNEL === '1';

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
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
}

function log(icon, color, tag, msg) {
  const sep = _muted('│');
  console.log(`  ${_dim(ts())} ${sep} ${color(`${icon} ${tag.padEnd(5)}`)} ${sep} ${_text(msg)}`);
}

const ok   = (tag, msg) => log('✔', _ok,   tag, msg);
const info = (tag, msg) => log('●', _info, tag, msg);
const err  = (tag, msg) => log('✖', _err,  tag, msg);
const sys  = (tag, msg) => log('⚙', _brand, tag, msg);

// ─── 0. Auto Git Pull ───
try {
  const GIT_REPO   = process.env.GIT_ADDRESS  || 'https://github.com/hijuki/shirowahd';
  const GIT_TOKEN  = process.env.ACCESS_TOKEN  || '';
  const GIT_USER   = process.env.USERNAME      || '';
  const GIT_BRANCH = process.env.BRANCH        || 'main';

  if (!existsSync('.git')) {
    info('GIT', 'No .git found — initializing repo...');
    execSync('git init && git checkout -b ' + GIT_BRANCH, { encoding: 'utf8', timeout: 15000 });
    let remoteUrl = GIT_REPO;
    if (GIT_TOKEN && GIT_USER) remoteUrl = GIT_REPO.replace('https://', `https://${GIT_USER}:${GIT_TOKEN}@`);
    else if (GIT_TOKEN) remoteUrl = GIT_REPO.replace('https://', `https://${GIT_TOKEN}@`);
    execSync(`git remote add origin ${remoteUrl}`, { encoding: 'utf8', timeout: 5000 });
    const out = execSync(`git fetch origin ${GIT_BRANCH} && git reset --hard origin/${GIT_BRANCH}`, { encoding: 'utf8', timeout: 60000 }).trim();
    ok('GIT', out || 'Up to date');
  } else {
    info('GIT', 'Checking for updates...');
    const out = execSync('git fetch origin main && git reset --hard origin/main', { encoding: 'utf8', timeout: 30000 }).trim();
    ok('GIT', out || 'Up to date');
  }
} catch (e) { err('GIT', `git pull failed: ${e.message}`); }

// ─── 1. Patch Baileys (large file upload 80MB+) ───
try {
  const sendFile  = './node_modules/@whiskeysockets/baileys/lib/Socket/messages-send.js';
  const mediaFile = './node_modules/@whiskeysockets/baileys/lib/Utils/messages-media.js';

  if (existsSync(sendFile)) {
    let src = readFileSync(sendFile, 'utf8');
    if (src.includes('maxContentLengthBytes:') && !src.includes('maxContentLengthBytes: Infinity')) {
      src = src.replace(/maxContentLengthBytes:\s*\d+/g, 'maxContentLengthBytes: Infinity');
      writeFileSync(sendFile, src);
      ok('PATCH', 'Baileys messages-send.js (maxContentLengthBytes → Infinity)');
    }
  }

  if (existsSync(mediaFile)) {
    let src = readFileSync(mediaFile, 'utf8');
    if (src.includes('opts?.maxContentLength') && !src.includes('if (false && opts?.maxContentLength')) {
      src = src.replace(/if \(opts\?\.maxContentLength/g, 'if (false && opts?.maxContentLength');
      writeFileSync(mediaFile, src);
      ok('PATCH', 'Baileys messages-media.js (maxContentLength check disabled)');
    }
  }
} catch (e) { err('PATCH', `Baileys patch error: ${e.message}`); }

// ─── 2. Web Uploader ───
sys('BOOT', 'Launching web-uploader...');
const webUp = spawn('node', ['web-uploader.js'], { stdio: 'inherit' });
webUp.on('error', e => err('WEB', `Error: ${e.message}`));

// ─── 3. Admin Settings ───
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

// ─── 4. Cloudflare Tunnel (optional) ───
async function startTunnel() {
  if (!ENABLE_TUNNEL) {
    info('TUNL', 'Tunnel disabled — using direct A record + Cloudflare proxy');
    return;
  }
  if (!CF_ACCOUNT || !CF_KEY || !CF_TUNNEL_ID) {
    err('TUNL', 'Missing CF_ACCOUNT / CF_KEY / CF_TUNNEL_ID in .env');
    return;
  }
  try {
    info('TUNL', 'Fetching tunnel token...');
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/cfd_tunnel/${CF_TUNNEL_ID}/token`, {
      headers: { 'X-Auth-Email': CF_EMAIL, 'X-Auth-Key': CF_KEY }
    });
    const data = await res.json();
    if (!data.success || !data.result) {
      err('TUNL', `Token fetch failed: ${JSON.stringify(data.errors)}`);
      return;
    }

    if (!existsSync('./cloudflared')) {
      info('TUNL', 'Downloading cloudflared...');
      try {
        execSync('curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ./cloudflared && chmod +x ./cloudflared', { timeout: 60000 });
        ok('TUNL', 'Downloaded OK');
      } catch (e) { err('TUNL', `Download failed: ${e.message}`); return; }
    }

    sys('TUNL', 'Starting cloudflared tunnel...');
    const cf = spawn('./cloudflared', ['tunnel', '--no-autoupdate', '--protocol', 'http2', 'run', '--token', data.result], { stdio: 'inherit' });
    cf.on('error', e => err('TUNL', `Error: ${e.message}`));
    cf.on('exit', code => info('TUNL', `Exited with code ${code}`));
  } catch (e) { err('TUNL', `Setup error: ${e.message}`); }
}

startTunnel();

// ─── 5. Bot ───
sys('BOOT', 'Launching bot...');
await import('./index.js');
