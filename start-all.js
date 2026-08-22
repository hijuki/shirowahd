import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';

const CF_ACCOUNT = 'cb4d13552885f5db1562032de5cf9d09';
const CF_EMAIL = 'shougt12345@gmail.com';
const CF_KEY = 'cfk_PubEcCch4xnHg9n8DB1QXCisJOUMBf2TzIi7PdMg1bdb9525';
const CF_WORKER = 'swhdhlz-redirect';
const CF_TUNNEL_ID = 'a4064acb-4df6-419d-9fc7-39cdfa8ca0af';
const DOMAIN = 'swhdhlz.my.id';

function ts() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

function log(tag, msg) {
  console.log(`[${ts()}] [${tag.padEnd(4)}] ${msg}`);
}

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
      log('PTCH', 'Baileys messages-send.js patched (maxContentLengthBytes -> Infinity)');
    }
  }
  
  if (existsSync(mediaFile)) {
    let src = readFileSync(mediaFile, 'utf8');
    if (src.includes('opts?.maxContentLength') && !src.includes('if (false && opts?.maxContentLength')) {
      src = src.replace(/if \(opts\?\.maxContentLength/g, 'if (false && opts?.maxContentLength');
      writeFileSync(mediaFile, src);
      log('PTCH', 'Baileys messages-media.js patched (maxContentLength check disabled)');
    }
  }
} catch (e) { log('PTCH', `Baileys patch error: ${e.message}`); }

// 1. Start web-uploader as child process
log('BOOT', 'Launching web-uploader...');
const webUp = spawn('node', ['web-uploader.js'], { stdio: 'inherit' });
webUp.on('error', e => log('WEBU', `Error: ${e.message}`));

// 2. Update admin-settings.json with domain
try {
  const sf = './admin-settings.json';
  if (existsSync(sf)) {
    const s = JSON.parse(readFileSync(sf, 'utf8'));
    if (!s.domain || s.domain !== DOMAIN) {
      s.domain = DOMAIN;
      writeFileSync(sf, JSON.stringify(s, null, 2));
      log('BOOT', `Domain set to ${DOMAIN}`);
    }
  }
} catch (e) { log('BOOT', `Settings update error: ${e.message}`); }

// 3. Try to get tunnel token and run cloudflared via npx
async function startTunnel() {
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/cfd_tunnel/${CF_TUNNEL_ID}/token`, {
      headers: { 'X-Auth-Email': CF_EMAIL, 'X-Auth-Key': CF_KEY }
    });
    const data = await res.json();
    if (!data.success || !data.result) {
      log('TUNL', `Failed to get token: ${JSON.stringify(data.errors)}`);
      return;
    }
    const token = data.result;
    
    // Try downloading cloudflared binary
    const { execSync } = await import('child_process');
    if (!existsSync('./cloudflared')) {
      log('TUNL', 'Downloading cloudflared...');
      try {
        execSync('curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ./cloudflared && chmod +x ./cloudflared', { timeout: 60000 });
        log('TUNL', 'Downloaded OK');
      } catch (e) {
        log('TUNL', `Download failed: ${e.message}`);
        return;
      }
    }
    
    log('TUNL', 'Starting cloudflared tunnel...');
    const cf = spawn('./cloudflared', ['tunnel', '--no-autoupdate', 'run', '--token', token], { stdio: 'inherit' });
    cf.on('error', e => log('TUNL', `Error: ${e.message}`));
    cf.on('exit', code => log('TUNL', `Exited with code ${code}`));
  } catch (e) {
    log('TUNL', `Setup error: ${e.message}`);
  }
}

startTunnel();

// 4. Start bot (main process)
log('BOOT', 'Launching bot...');
await import('./index.js');
