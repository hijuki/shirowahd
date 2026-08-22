import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';

const CF_ACCOUNT = 'cb4d13552885f5db1562032de5cf9d09';
const CF_EMAIL = 'shougt12345@gmail.com';
const CF_KEY = 'cfk_PubEcCch4xnHg9n8DB1QXCisJOUMBf2TzIi7PdMg1bdb9525';
const CF_WORKER = 'swhdhlz-redirect';
const CF_TUNNEL_ID = 'a4064acb-4df6-419d-9fc7-39cdfa8ca0af';
const DOMAIN = 'swhdhlz.my.id';

// ─── Mini Logger (matches ourin-logger style) ───
import chalk from 'chalk';

const _dim   = chalk.hex('#546E7A');
const _muted = chalk.hex('#37474F');
const _brand = chalk.hex('#7C5CFF');
const _ok    = chalk.hex('#00E676');
const _err   = chalk.hex('#FF5252');
const _info  = chalk.hex('#40C4FF');
const _text  = chalk.hex('#ECEFF1');
const _bright = chalk.hex('#FFFFFF');

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
  const { execSync } = await import('child_process');
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

// 1. Start web-uploader as child process
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

// 3. Try to get tunnel token and run cloudflared via npx
async function startTunnel() {
  try {
    info('TUNL', 'Fetching tunnel token...');
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/cfd_tunnel/${CF_TUNNEL_ID}/token`, {
      headers: { 'X-Auth-Email': CF_EMAIL, 'X-Auth-Key': CF_KEY }
    });
    const data = await res.json();
    if (!data.success || !data.result) {
      err('TUNL', `Failed to get token: ${JSON.stringify(data.errors)}`);
      return;
    }
    const token = data.result;
    
    // Try downloading cloudflared binary
    const { execSync } = await import('child_process');
    if (!existsSync('./cloudflared')) {
      info('TUNL', 'Downloading cloudflared...');
      try {
        execSync('curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ./cloudflared && chmod +x ./cloudflared', { timeout: 60000 });
        ok('TUNL', 'Downloaded OK');
      } catch (e) {
        err('TUNL', `Download failed: ${e.message}`);
        return;
      }
    }
    
    sys('TUNL', 'Starting cloudflared tunnel...');
    const cf = spawn('./cloudflared', ['tunnel', '--no-autoupdate', 'run', '--token', token], { stdio: 'inherit' });
    cf.on('error', e => err('TUNL', `Error: ${e.message}`));
    cf.on('exit', code => info('TUNL', `Exited with code ${code}`));
  } catch (e) {
    err('TUNL', `Setup error: ${e.message}`);
  }
}

startTunnel();

// 4. Start bot (main process)
sys('BOOT', 'Launching bot...');
await import('./index.js');
