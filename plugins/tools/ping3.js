import os from 'os';
import net from 'net';
import { execFile } from 'child_process';
import config from '../../config.js';

const WA_HOST = 'g.whatsapp.net';
const WA_PORT = 443;

function tcpPing(host = WA_HOST, port = WA_PORT, timeout = 3000) {
  return new Promise(resolve => {
    const mulai = Date.now();
    const sock = new net.Socket();
    let selesai = false;
    const tutup = (nilai) => {
      if (selesai) return;
      selesai = true;
      try { sock.destroy(); } catch {}
      resolve(nilai);
    };
    sock.setTimeout(timeout);
    sock.once('connect', () => tutup(Date.now() - mulai));
    sock.once('timeout', () => tutup(null));
    sock.once('error', () => tutup(null));
    sock.connect(port, host);
  });
}

function bacaDisk() {
  return new Promise(resolve => {
    execFile('df', ['-kP', '/'], { timeout: 3000 }, (err, stdout) => {
      if (err) return resolve(null);
      const baris = String(stdout).trim().split('\n').pop().split(/\s+/);
      const total = Number(baris[1]) * 1024;
      const pakai = Number(baris[2]) * 1024;
      if (!total) return resolve(null);
      resolve({ total, pakai, persen: Math.round((pakai / total) * 100) });
    });
  });
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const unit = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${unit[i]}`;
}

function runtime(detik) {
  const d = Math.floor(detik / 86400);
  const j = Math.floor((detik % 86400) / 3600);
  const m = Math.floor((detik % 3600) / 60);
  return `${d}d ${j}h ${m}m`;
}

function renderStatusCard({ ping, ramPersen, ramPakai, ramTotal, diskPersen, diskPakai, diskTotal, uptime, cpuCore, load, timestamp }) {
  const pingNum = ping === null ? '—' : ping;
  const pingColor = ping === null ? '#ef4444' : ping < 60 ? '#10b981' : ping < 150 ? '#38bdf8' : '#f59e0b';
  const pingDesc = ping === null ? 'Offline' : ping < 60 ? 'Sangat Cepat' : ping < 150 ? 'Stabil' : 'Normal';

  return `
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; margin: 0; padding: 0; }
body {
  margin: 0;
  padding: 6px;
  background: #0a0a0c;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
  color: #ffffff;
}
.card {
  width: 100%;
  max-width: 350px;
  margin: 0 auto;
  background: #111216;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}
.title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #a1a1aa;
}
.tag {
  font-size: 10px;
  font-weight: 600;
  color: ${pingColor};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 3px 9px;
  border-radius: 20px;
}
.hero {
  background: #18191f;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hero-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hero-label {
  font-size: 11px;
  color: #71717a;
  font-weight: 600;
}
.hero-sub {
  font-size: 12px;
  color: #e4e4e7;
  font-weight: 600;
}
.hero-speed {
  font-size: 28px;
  font-weight: 800;
  color: ${pingColor};
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
  letter-spacing: -0.5px;
  line-height: 1;
}
.hero-unit {
  font-size: 12px;
  font-weight: 600;
  color: #71717a;
  margin-left: 2px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}
.box {
  background: #18191f;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px 12px;
}
.box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.box-label {
  font-size: 10px;
  color: #71717a;
  font-weight: 600;
}
.box-percent {
  font-size: 10px;
  font-weight: 700;
  color: #a1a1aa;
}
.box-val {
  font-size: 12px;
  font-weight: 700;
  color: #f4f4f5;
  margin-bottom: 8px;
}
.track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
}
.fill {
  height: 100%;
  border-radius: 4px;
}
.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.footer-info {
  font-size: 10px;
  color: #71717a;
  font-weight: 500;
}
.footer-time {
  font-size: 10px;
  color: #a1a1aa;
  font-weight: 600;
}
</style>

<div class="card">
  <div class="header">
    <div class="title-wrap">
      <div class="dot"></div>
      <span class="title">SHIROWAHD</span>
    </div>
    <div class="tag">${pingDesc}</div>
  </div>

  <div class="hero">
    <div class="hero-left">
      <span class="hero-label">Kecepatan Respons</span>
      <span class="hero-sub">Server WhatsApp</span>
    </div>
    <div class="hero-speed">
      ${pingNum}<span class="hero-unit">${ping === null ? '' : 'ms'}</span>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-header">
        <span class="box-label">RAM</span>
        <span class="box-percent">${ramPersen}%</span>
      </div>
      <div class="box-val">${formatSize(ramPakai)}</div>
      <div class="track">
        <div class="fill" style="width: ${ramPersen}%; background: ${ramPersen > 85 ? '#ef4444' : '#10b981'};"></div>
      </div>
    </div>

    <div class="box">
      <div class="box-header">
        <span class="box-label">Penyimpanan</span>
        <span class="box-percent">${diskPersen || 0}%</span>
      </div>
      <div class="box-val">${diskTotal ? formatSize(diskPakai) : 'N/A'}</div>
      <div class="track">
        <div class="fill" style="width: ${diskPersen || 0}%; background: ${diskPersen > 85 ? '#ef4444' : '#38bdf8'};"></div>
      </div>
    </div>
  </div>

  <div class="grid" style="margin-bottom: 8px;">
    <div class="box" style="padding: 8px 12px;">
      <div class="box-label" style="margin-bottom: 2px;">Prosesor</div>
      <div class="box-val" style="margin-bottom: 0;">${cpuCore} Core • ${load[0]}</div>
    </div>
    <div class="box" style="padding: 8px 12px;">
      <div class="box-label" style="margin-bottom: 2px;">Aktif Bot</div>
      <div class="box-val" style="margin-bottom: 0;">${runtime(uptime)}</div>
    </div>
  </div>

  <div class="footer-row">
    <span class="footer-info">Status Sistem</span>
    <span class="footer-time">${timestamp} WIB</span>
  </div>
</div>
`;
}

const pluginConfig = {
  name: 'ping3',
  alias: ['speed3', 'status3', 'vpsstat', 'telemetry'],
  category: 'tools',
  description: 'Monitor VPS status dengan Meta In-Bubble HTML Primitive card',
  usage: '.ping3',
  example: '.ping3',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
};

async function handler(m, { sock }) {
  try {
    if (typeof m.react === 'function') await m.react('🕕');

    const [ping, disk] = await Promise.all([
      tcpPing(WA_HOST, WA_PORT, 2500),
      bacaDisk()
    ]);

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPersen = Math.round((usedMem / totalMem) * 100);

    const htmlPayload = renderStatusCard({
      ping,
      ramPersen,
      ramPakai: usedMem,
      ramTotal: totalMem,
      diskPersen: disk ? disk.persen : 0,
      diskPakai: disk ? disk.pakai : 0,
      diskTotal: disk ? disk.total : 0,
      uptime: os.uptime(),
      cpuCore: os.cpus().length,
      load: os.loadavg().map(n => Math.round(n * 100) / 100),
      timestamp: new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })
    });

    const msgContent = {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        botMetadata: {
          messageDisclaimerText: '',
          botResponseId: 'shirowahd-vps-monitor',
          verificationMetadata: {
            proofs: [
              {
                version: 1,
                useCase: 1,
                signature: 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==',
                certificateChain: [
                  'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg',
                  'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=='
                ]
              }
            ]
          }
        }
      },
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages: [{ messageType: 2, messageText: 'VPS Status Monitor' }],
            unifiedResponse: {
              data: Buffer.from(JSON.stringify({
                response_id: 'shirowahd-vps-monitor',
                sections: [{
                  view_model: {
                    primitive: {
                      __typename: 'GenAIaeacdsnwHtmlPrimitive',
                      payload: htmlPayload,
                      trusted_sources: ['swhdhlz.my.id', 'hirara.dev']
                    },
                    __typename: 'GenAISingleLayoutViewModel'
                  }
                }]
              })).toString('base64')
            },
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
              forwardOrigin: 4
            }
          }
        }
      }
    };

    await sock.relayMessage(m.chat, msgContent, {});
    if (typeof m.react === 'function') await m.react('✅');
  } catch (error) {
    console.error('Ping3 Plugin Error:', error);
    // Fallback teks jika primitif HTML gagal
    await m.reply(
      `📊 *VPS TELEMETRY & STATUS*\n\n` +
      `• *Ping WA:* \`${ping || 'Timeout'} ms\`\n` +
      `• *RAM:* \`${formatSize(usedMem)} / ${formatSize(totalMem)} (${ramPersen}%)\`\n` +
      `• *Uptime:* \`${runtime(os.uptime())}\`\n` +
      `• *CPU:* \`${os.cpus().length} Cores (${os.loadavg()[0]})\``
    );
  }
}

export { pluginConfig as config, handler };
