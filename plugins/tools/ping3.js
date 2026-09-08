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
  const isOnline = ping !== null;
  const pingColor = ping === null ? '#ef4444' : ping < 50 ? '#10b981' : ping < 120 ? '#38bdf8' : '#f59e0b';
  const pingStatus = ping === null ? 'OFFLINE' : ping < 50 ? 'OPTIMAL' : ping < 120 ? 'STABLE' : 'FAIR';

  return `
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; margin: 0; padding: 0; }
body {
  margin: 0;
  padding: 6px;
  background: #090a0f;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
  color: #f8fafc;
}
.telemetry-card {
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  background: #0d1117;
  background-image: 
    radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.12) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.08) 0px, transparent 50%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 14px 14px 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.brand-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}
.brand-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}
.brand-text {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #94a3b8;
  text-transform: uppercase;
}
.status-pill {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: ${pingColor};
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 3px 8px;
  border-radius: 100px;
  text-transform: uppercase;
}
.hero-latency {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.latency-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.latency-label {
  font-size: 9px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.latency-target {
  font-size: 11px;
  font-weight: 700;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, monospace;
}
.latency-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 24px;
  font-weight: 800;
  color: ${pingColor};
  line-height: 1;
}
.latency-unit {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-left: 2px;
}
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}
.stat-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 9px 10px;
}
.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.stat-label {
  font-size: 9px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}
.stat-percent {
  font-size: 9.5px;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, monospace;
  color: #94a3b8;
}
.stat-value {
  font-size: 11.5px;
  font-weight: 700;
  color: #f1f5f9;
  font-family: ui-monospace, SFMono-Regular, monospace;
  margin-bottom: 6px;
}
.progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 6px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 6px;
}
.system-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}
.system-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 8px 10px;
}
.system-label {
  font-size: 8.5px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 2px;
}
.system-val {
  font-size: 11px;
  font-weight: 700;
  color: #cbd5e1;
  font-family: ui-monospace, SFMono-Regular, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.footer-text {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #475569;
  text-transform: uppercase;
}
.footer-time {
  font-size: 8.5px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, monospace;
  color: #64748b;
}
</style>

<div class="telemetry-card">
  <div class="card-header">
    <div class="brand-badge">
      <div class="brand-dot"></div>
      <span class="brand-text">SHIROWAHD NODE</span>
    </div>
    <div class="status-pill">${pingStatus}</div>
  </div>

  <div class="hero-latency">
    <div class="latency-meta">
      <span class="latency-label">TCP Handshake</span>
      <span class="latency-target">g.whatsapp.net:443</span>
    </div>
    <div class="latency-value">
      ${ping === null ? 'FAIL' : ping}<span class="latency-unit">${ping === null ? '' : 'ms'}</span>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-top">
        <span class="stat-label">RAM Memory</span>
        <span class="stat-percent">${ramPersen}%</span>
      </div>
      <div class="stat-value">${formatSize(ramPakai)}</div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${ramPersen}%; background: ${ramPersen > 85 ? '#ef4444' : '#10b981'};"></div>
      </div>
    </div>

    <div class="stat-box">
      <div class="stat-top">
        <span class="stat-label">NVMe Disk</span>
        <span class="stat-percent">${diskPersen || 0}%</span>
      </div>
      <div class="stat-value">${diskTotal ? formatSize(diskPakai) : 'N/A'}</div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${diskPersen || 0}%; background: ${diskPersen > 85 ? '#ef4444' : '#0ea5e9'};"></div>
      </div>
    </div>
  </div>

  <div class="system-row">
    <div class="system-item">
      <div class="system-label">CPU Cores & Load</div>
      <div class="system-val">${cpuCore}C • ${load[0]}</div>
    </div>
    <div class="system-item">
      <div class="system-label">Node Uptime</div>
      <div class="system-val">${runtime(uptime)}</div>
    </div>
  </div>

  <div class="card-footer">
    <span class="footer-text">SECURE TELEMETRY</span>
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
