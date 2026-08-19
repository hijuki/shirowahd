import { spawn } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';

const CF_ACCOUNT = 'cb4d13552885f5db1562032de5cf9d09';
const CF_EMAIL = 'shougt12345@gmail.com';
const CF_KEY = 'cfk_PubEcCch4xnHg9n8DB1QXCisJOUMBf2TzIi7PdMg1bdb9525';
const CF_WORKER = 'swhdhlz-redirect';
const CF_TUNNEL_ID = 'a4064acb-4df6-419d-9fc7-39cdfa8ca0af';
const DOMAIN = 'swhdhlz.my.id';

// 1. Start web-uploader as child process
console.log('[START] Launching web-uploader...');
const webUp = spawn('node', ['web-uploader.js'], { stdio: 'inherit' });
webUp.on('error', e => console.error('[WEB-UPLOADER] Error:', e.message));

// 2. Update admin-settings.json with domain
try {
  const sf = './admin-settings.json';
  if (existsSync(sf)) {
    const s = JSON.parse(readFileSync(sf, 'utf8'));
    if (!s.domain || s.domain !== DOMAIN) {
      s.domain = DOMAIN;
      writeFileSync(sf, JSON.stringify(s, null, 2));
      console.log('[START] Domain set to', DOMAIN);
    }
  }
} catch (e) { console.error('[START] Settings update error:', e.message); }

// 3. Try to get tunnel token and run cloudflared via npx
async function startTunnel() {
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/cfd_tunnel/${CF_TUNNEL_ID}/token`, {
      headers: { 'X-Auth-Email': CF_EMAIL, 'X-Auth-Key': CF_KEY }
    });
    const data = await res.json();
    if (!data.success || !data.result) {
      console.error('[TUNNEL] Failed to get token:', data.errors);
      return;
    }
    const token = data.result;
    
    // Try downloading cloudflared binary
    const { execSync } = await import('child_process');
    if (!existsSync('./cloudflared')) {
      console.log('[TUNNEL] Downloading cloudflared...');
      try {
        execSync('curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ./cloudflared && chmod +x ./cloudflared', { timeout: 60000 });
        console.log('[TUNNEL] Downloaded OK');
      } catch (e) {
        console.error('[TUNNEL] Download failed:', e.message);
        return;
      }
    }
    
    console.log('[TUNNEL] Starting cloudflared tunnel...');
    const cf = spawn('./cloudflared', ['tunnel', '--no-autoupdate', 'run', '--token', token], { stdio: 'inherit' });
    cf.on('error', e => console.error('[TUNNEL] Error:', e.message));
    cf.on('exit', code => console.log('[TUNNEL] Exited with code', code));
  } catch (e) {
    console.error('[TUNNEL] Setup error:', e.message);
  }
}

startTunnel();

// 4. Start bot (main process)
console.log('[START] Launching bot...');
await import('./index.js');
