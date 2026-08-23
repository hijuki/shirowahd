import { spawn, execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import chalk from 'chalk';

// ─── Colors ───
const c = {
  brand:  chalk.hex('#7C5CFF'),
  ok:     chalk.hex('#00E676'),
  err:    chalk.hex('#FF5252'),
  dim:    chalk.hex('#546E7A'),
  muted:  chalk.hex('#37474F'),
  info:   chalk.hex('#40C4FF'),
  white:  chalk.hex('#FFFFFF'),
  text:   chalk.hex('#B0BEC5'),
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Boot Banner ───
console.clear();
console.log('');
console.log(c.brand('  ╔══════════════════════════════════════╗'));
console.log(c.brand('  ║') + c.white.bold('      ⚡ SHIROWAHD BOT ENGINE ⚡      ') + c.brand('║'));
console.log(c.brand('  ╚══════════════════════════════════════╝'));
console.log('');

// ─── Step Logger ───
let stepNum = 0;
function step(label) {
  stepNum++;
  process.stdout.write(c.dim(`  [${stepNum}] `) + c.text(label) + c.dim(' ... '));
}
function done(msg) { console.log(c.ok('✔ ') + c.dim(msg || '')); }
function fail(msg) { console.log(c.err('✖ ') + c.err(msg)); }
function skip(msg) { console.log(c.info('⊘ ') + c.dim(msg || 'skipped')); }

// ═══════════════════════════════════════
// 1. Kill old processes
// ═══════════════════════════════════════
step('Cleaning old processes');
try {
  const myPid = process.pid;
  execSync(`pgrep -f 'node.*(main|bot|index|start|web-uploader)' 2>/dev/null | grep -v ${myPid} | xargs -r kill -9 2>/dev/null`, { stdio: 'ignore', timeout: 5000 });
  execSync('fuser -k 8080/tcp 2>/dev/null', { stdio: 'ignore', timeout: 3000 });
  done('killed');
} catch { done('clean'); }

await sleep(300);

// ═══════════════════════════════════════
// 2. Load .env
// ═══════════════════════════════════════
step('Loading .env');
try {
  process.loadEnvFile();
  done();
} catch { skip('no .env found'); }

const CF_ACCOUNT   = process.env.CF_ACCOUNT   || '';
const CF_EMAIL     = process.env.CF_EMAIL      || '';
const CF_KEY       = process.env.CF_KEY        || '';
const CF_TUNNEL_ID = process.env.CF_TUNNEL_ID  || '';
const DOMAIN       = process.env.DOMAIN        || 'swhdhlz.my.id';
const ENABLE_TUNNEL = process.env.ENABLE_TUNNEL === '1';

await sleep(200);

// ═══════════════════════════════════════
// 3. Git Pull
// ═══════════════════════════════════════
step('Git pull');
try {
  const GIT_REPO   = process.env.GIT_ADDRESS || 'https://github.com/hijuki/shirowahd';
  const GIT_TOKEN  = process.env.GIT_TOKEN   || '';
  const GIT_USER   = process.env.USERNAME    || '';
  const GIT_BRANCH = process.env.BRANCH      || 'main';

  if (!existsSync('.git')) {
    execSync('git init && git checkout -b ' + GIT_BRANCH, { stdio: 'ignore', timeout: 15000 });
    let remoteUrl = GIT_REPO;
    if (GIT_TOKEN && GIT_USER) remoteUrl = GIT_REPO.replace('https://', `https://${GIT_USER}:${GIT_TOKEN}@`);
    else if (GIT_TOKEN) remoteUrl = GIT_REPO.replace('https://', `https://${GIT_TOKEN}@`);
    execSync(`git remote add origin ${remoteUrl}`, { stdio: 'ignore', timeout: 5000 });
    execSync(`git fetch origin ${GIT_BRANCH} && git reset --hard origin/${GIT_BRANCH}`, { stdio: 'ignore', timeout: 60000 });
    done('initialized');
  } else {
    const out = execSync('git fetch origin main && git reset --hard origin/main 2>&1', { encoding: 'utf8', timeout: 30000 }).trim();
    const short = out.includes('Already up to date') ? 'up to date' : out.split('\n').pop();
    done(short);
  }
} catch (e) { fail(e.message.split('\n')[0]); }

await sleep(200);

// ═══════════════════════════════════════
// 4. Patch Baileys
// ═══════════════════════════════════════
step('Patching Baileys');
try {
  let patched = 0;
  const sendFile  = './node_modules/@whiskeysockets/baileys/lib/Socket/messages-send.js';
  const mediaFile = './node_modules/@whiskeysockets/baileys/lib/Utils/messages-media.js';

  if (existsSync(sendFile)) {
    let src = readFileSync(sendFile, 'utf8');
    if (src.includes('maxContentLengthBytes:') && !src.includes('maxContentLengthBytes: Infinity')) {
      src = src.replace(/maxContentLengthBytes:\s*\d+/g, 'maxContentLengthBytes: Infinity');
      writeFileSync(sendFile, src);
      patched++;
    }
  }
  if (existsSync(mediaFile)) {
    let src = readFileSync(mediaFile, 'utf8');
    if (src.includes('opts?.maxContentLength') && !src.includes('if (false && opts?.maxContentLength')) {
      src = src.replace(/if \(opts\?\.maxContentLength/g, 'if (false && opts?.maxContentLength');
      writeFileSync(mediaFile, src);
      patched++;
    }
  }
  patched ? done(`${patched} file(s)`) : done('already patched');
} catch (e) { fail(e.message.split('\n')[0]); }

await sleep(200);

// ═══════════════════════════════════════
// 5. Admin Settings
// ═══════════════════════════════════════
step('Setting domain');
try {
  const sf = './admin-settings.json';
  if (existsSync(sf)) {
    const s = JSON.parse(readFileSync(sf, 'utf8'));
    if (!s.domain || s.domain !== DOMAIN) {
      s.domain = DOMAIN;
      writeFileSync(sf, JSON.stringify(s, null, 2));
      done(DOMAIN);
    } else {
      done(DOMAIN);
    }
  } else { skip('no settings file'); }
} catch (e) { fail(e.message.split('\n')[0]); }

await sleep(200);

// ═══════════════════════════════════════
// 6. Web Uploader
// ═══════════════════════════════════════
step('Starting web uploader');
const webUp = spawn('node', ['web-uploader.js'], {
  stdio: ['ignore', 'pipe', 'pipe']
});
let webReady = false;
webUp.stdout.on('data', d => {
  if (!webReady && d.toString().includes('listening')) {
    webReady = true;
  }
});
webUp.stderr.on('data', d => {
  const msg = d.toString().trim();
  if (msg) console.log(c.err(`  [WEB] ${msg}`));
});
webUp.on('error', e => console.log(c.err(`  [WEB] ${e.message}`)));

// Wait for web uploader to bind port (max 5s)
await new Promise(resolve => {
  const check = setInterval(() => {
    try {
      execSync('fuser 8080/tcp 2>/dev/null', { stdio: 'ignore' });
      clearInterval(check);
      resolve();
    } catch {}
  }, 500);
  setTimeout(() => { clearInterval(check); resolve(); }, 5000);
});
done('port 8080');

await sleep(200);

// ═══════════════════════════════════════
// 7. Cloudflare Tunnel
// ═══════════════════════════════════════
step('Cloudflare tunnel');
if (!ENABLE_TUNNEL) {
  skip('disabled');
} else if (!CF_ACCOUNT || !CF_KEY || !CF_TUNNEL_ID) {
  fail('missing CF credentials in .env');
} else {
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/cfd_tunnel/${CF_TUNNEL_ID}/token`, {
      headers: { 'X-Auth-Email': CF_EMAIL, 'X-Auth-Key': CF_KEY }
    });
    const data = await res.json();
    if (!data.success || !data.result) {
      fail(JSON.stringify(data.errors));
    } else {
      if (!existsSync('./cloudflared')) {
        execSync('curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ./cloudflared && chmod +x ./cloudflared', { stdio: 'ignore', timeout: 60000 });
      }
      const cf = spawn('./cloudflared', ['tunnel', '--no-autoupdate', '--protocol', 'http2', 'run', '--token', data.result], { stdio: 'ignore' });
      cf.on('error', e => console.log(c.err(`  [TUNNEL] ${e.message}`)));
      done('running');
    }
  } catch (e) { fail(e.message.split('\n')[0]); }
}

await sleep(300);

// ═══════════════════════════════════════
// 8. Bot
// ═══════════════════════════════════════
console.log('');
console.log(c.muted('  ──────────────────────────────────────'));
console.log(c.brand('  ⚡ ') + c.white.bold('Starting SHIROWAHD Bot...'));
console.log(c.muted('  ──────────────────────────────────────'));
console.log('');

await import('./index.js');
