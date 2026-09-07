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
  return `
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; }
body { margin: 0; background: transparent; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f2e9e4; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 10px; }
.card-wrap { width: 100%; max-width: 390px; margin: auto; }
.ping-card { background: linear-gradient(145deg, #090d16 0%, #111827 100%); border: 1px solid rgba(0,255,178,0.25); border-radius: 20px; box-shadow: 0 16px 40px rgba(0,0,0,0.8); overflow: hidden; padding: 20px; position: relative; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px; }
.header-title { font-size: 13px; font-weight: 700; color: #00ffb2; text-transform: uppercase; letter-spacing: 1px; }
.badge-status { background: ${isOnline ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}; color: ${isOnline ? '#4ade80' : '#f87171'}; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 20px; border: 1px solid ${isOnline ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}; text-transform: uppercase; }
.info-group { margin-bottom: 14px; }
.info-label { font-size: 10.5px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
.info-value { font-size: 14.5px; color: #fff; font-weight: 600; word-break: break-all; font-family: monospace; }
.ping-box { background: rgba(0,255,178,0.08); border: 1px solid rgba(0,255,178,0.3); border-radius: 14px; padding: 14px; text-align: center; margin: 16px 0; }
.ping-title { font-size: 11px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
.ping-score { font-size: 26px; font-weight: 800; color: #38bdf8; }
.grid-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.bar-track { background: rgba(255,255,255,0.08); border-radius: 8px; height: 8px; overflow: hidden; margin-top: 6px; }
.bar-fill { height: 100%; border-radius: 8px; }
.card-footer { text-align: center; font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 14px; letter-spacing: 0.5px; text-transform: uppercase; }
</style>

<div class="card-wrap">
  <div class="ping-card">
    <div class="card-header">
      <span class="header-title">VPS Telemetry & Status</span>
      <span class="badge-status">${isOnline ? 'ONLINE' : 'OFFLINE'}</span>
    </div>

    <div class="ping-box">
      <div class="ping-title">TCP Latency to WhatsApp Server</div>
      <div class="ping-score">${ping === null ? 'Timeout' : ping + ' ms'}</div>
    </div>

    <div class="grid-row">
      <div class="info-group">
        <div class="info-label">RAM Usage</div>
        <div class="info-value">${formatSize(ramPakai)} / ${formatSize(ramTotal)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${ramPersen}%; background:${ramPersen > 85 ? '#f87171' : '#00ffb2'};"></div></div>
      </div>
      <div class="info-group">
        <div class="info-label">Disk Storage</div>
        <div class="info-value">${diskTotal ? formatSize(diskPakai) + ' / ' + formatSize(diskTotal) : 'N/A'}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${diskPersen || 0}%; background:${diskPersen > 85 ? '#f87171' : '#38bdf8'};"></div></div>
      </div>
    </div>

    <div class="grid-row">
      <div class="info-group">
        <div class="info-label">Uptime VPS</div>
        <div class="info-value">${runtime(uptime)}</div>
      </div>
      <div class="info-group">
        <div class="info-label">CPU Cores & Load</div>
        <div class="info-value">${cpuCore} Cores (${load[0]})</div>
      </div>
    </div>

    <div class="card-footer">
      SHIROWAHD ENGINE • ${timestamp}
    </div>
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
