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
// Pola lama `node.*(main|bot|index|start|web-uploader)` MEMBUNUH PROSES WEB.
// Akibatnya berantai dan nyata: setiap `pm2 restart main` mematikan pm2 `web`,
// pm2 menghidupkannya kembali (itu sebabnya restart web menumpuk sampai 49),
// dan di sela itu panel admin mati — persis saat pairing sedang berlangsung,
// karena pairing memang me-restart `main`. Kode pairing muncul di papan status
// tapi panel tidak bisa mengambilnya.
//
// Pola sekarang menyasar HANYA proses bot dari repo ini: main.js / index.js.
// `web-uploader.js` sengaja tidak ikut — itu proses milik pm2 `web`, bukan
// sampah sisa bot. Kata `bot|start` juga dibuang karena terlalu longgar
// (`pgrep -f` mencocokkan seluruh baris perintah, termasuk milik proses lain
// yang kebetulan menyebut kata itu).
try {
  const myPid = process.pid;
  execSync(
    `pgrep -f 'node .*/(main|index)\\.js' 2>/dev/null | grep -v ${myPid} | xargs -r kill -9 2>/dev/null`,
    { stdio: 'ignore', timeout: 5000 },
  );
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
// 3. Git sync (OPT-IN — default MATI)
// ═══════════════════════════════════════
// Dulu blok ini SELALU menjalankan `git fetch && git reset --hard origin/main`
// pada SETIAP boot bot. Akibatnya nyata dan merusak: setiap berkas yang diedit
// di VPS tapi belum di-push akan dikembalikan ke versi remote tanpa peringatan
// apa pun — termasuk perbaikan darurat yang baru ditulis semenit sebelumnya.
//
// Sekarang default MATI. Nyalakan sadar-sadar dengan GIT_AUTO_SYNC=1 di .env
// kalau memang mau VPS ini selalu mengikuti remote (mis. deploy otomatis).
//
// `git reset --hard` TIDAK menyentuh berkas gitignored, jadi sesi WA,
// database/main/, .env, dan admin-settings.json aman dalam kasus apa pun.
const GIT_AUTO_SYNC = process.env.GIT_AUTO_SYNC === '1';

step('Git sync');
if (!GIT_AUTO_SYNC) {
  done('dilewati (GIT_AUTO_SYNC≠1) — edit lokal dipertahankan');
} else {
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
      // Peringatkan dulu kalau ada edit lokal yang akan hilang, supaya kejadian
      // "kode gw balik ke semula" punya jejak di log, bukan senyap.
      let kotor = '';
      try { kotor = execSync('git status --porcelain', { encoding: 'utf8', timeout: 15000 }).trim(); } catch { /* abaikan */ }
      if (kotor) {
        const n = kotor.split('\n').filter(Boolean).length;
        console.log(c.err(`  [GIT] ${n} berkas berubah lokal akan DITIMPA oleh remote`));
      }
      const out = execSync(`git fetch origin ${GIT_BRANCH} && git reset --hard origin/${GIT_BRANCH} 2>&1`, { encoding: 'utf8', timeout: 30000 }).trim();
      const short = out.includes('Already up to date') ? 'up to date' : out.split('\n').pop();
      done(short);
    }
  } catch (e) { fail(e.message.split('\n')[0]); }
}

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
// Web uploader mendengarkan port 80. Di deploy produksi ia adalah proses pm2
// sendiri (`web`) yang HARUS sudah hidup sebelum bot, karena pairing dilakukan
// dari panel web. Jadi di sini bot hanya menutup lubang saat seseorang
// menjalankan `node main.js` mentah tanpa pm2 — bukan mengambil alih.
const WEB_PORT = 80;
const portBusy = () => {
  try {
    execSync(`fuser ${WEB_PORT}/tcp 2>/dev/null`, { stdio: 'ignore' });
    return true;
  } catch { return false; }
};

// Kalau pm2 sudah mengelola `web`, JANGAN spawn duplikat. Dulu pengecekannya
// hanya "port dipakai?" — dan karena langkah 1 baru saja membunuh proses web
// (pola pgrep terlalu longgar), port sempat kosong dan bot men-spawn web kedua
// sebagai anak proses bot. Dua server di port 80 = EADDRINUSE, dan web mati
// setiap kali bot restart.
const webDikelolaPm2 = () => {
  try {
    const out = execSync('pm2 jlist 2>/dev/null', { encoding: 'utf8', timeout: 8000 });
    return JSON.parse(out).some(
      (p) => p.name === 'web' && p.pm2_env?.status === 'online',
    );
  } catch { return false; }
};

if (webDikelolaPm2()) {
  skip('pm2 "web" sudah mengelola port 80');
} else if (portBusy()) {
  skip(`port ${WEB_PORT} sudah dipakai proses lain`);
} else {
  const webUp = spawn('node', ['web-uploader.js'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  webUp.stderr.on('data', d => {
    const msg = d.toString().trim();
    if (msg) console.log(c.err(`  [WEB] ${msg}`));
  });
  webUp.on('error', e => console.log(c.err(`  [WEB] ${e.message}`)));

  // Tunggu sampai port benar-benar terpakai (maks 5 detik). Sebelumnya yang
  // dicek port 8080 — bukan port yang dipakai web-uploader — jadi loop ini
  // selalu habis waktu dan status "port 80" dilaporkan sukses walau gagal.
  const bound = await new Promise(resolve => {
    const check = setInterval(() => {
      if (portBusy()) { clearInterval(check); resolve(true); }
    }, 500);
    setTimeout(() => { clearInterval(check); resolve(false); }, 5000);
  });
  if (bound) done(`port ${WEB_PORT}`);
  else fail(`gagal bind port ${WEB_PORT}`);
}

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
        // Arsitektur DIDETEKSI, bukan diasumsikan amd64. VPS ARM (Oracle/AWS
        // Graviton/Hetzner CAX) akan mengunduh biner yang tidak bisa dieksekusi
        // dan tunnel gagal dengan "Exec format error" yang membingungkan.
        const arch = process.arch === 'arm64' ? 'arm64'
                   : process.arch === 'arm'   ? 'arm'
                   : process.arch === 'ia32'  ? '386'
                   : 'amd64';
        execSync(`curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch} -o ./cloudflared && chmod +x ./cloudflared`, { stdio: 'ignore', timeout: 120000 });
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
