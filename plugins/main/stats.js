import os from 'os';
import config from '../../config.js';
import te from '../../src/lib/hillz-error.js';
import { AIRich } from '../../src/lib/hillz-builder.js';

const pluginConfig = {
  name: 'stats',
  alias: ['botstats', 'serverstats', 'stat'],
  category: 'main',
  description: 'Menampilkan statistik performa bot (AIRich Table)',
  usage: '.stats',
  example: '.stats',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  return parts.join(' ');
}

async function handler(m, { sock, db, uptime }) {
  try {
    await m.react('📊');

    const users = db?.db?.data?.users || {};
    const groups = db?.db?.data?.groups || {};
    const memUsed = process.memoryUsage();
    const cpuUsage = os.loadavg()[0].toFixed(2);
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const totalUsers = Object.keys(users).length;
    const totalGroups = Object.keys(groups).length;
    const premiumUsers = Object.values(users).filter((u) => u.premium).length;
    const upTimeStr = formatUptime(uptime || (process.uptime() * 1000));

    const rows = [
      ['Bot Name', config.bot?.name || 'SHIROWAHD'],
      ['Version', `v${config.bot?.version || '1.0.0'}`],
      ['Uptime', upTimeStr],
      ['Total Users', totalUsers.toString()],
      ['Premium Users', premiumUsers.toString()],
      ['Total Groups', totalGroups.toString()],
      ['Platform / Arch', `${os.platform()} ${os.arch()}`],
      ['Node.js Engine', process.version],
      ['CPU Load', `${cpuUsage}%`],
      ['RAM VPS', `${formatBytes(usedMem)} / ${formatBytes(totalMem)}`],
      ['Process Heap', `${formatBytes(memUsed.heapUsed)} / ${formatBytes(memUsed.heapTotal)}`]
    ];

    const aiRich = new AIRich(sock);
    aiRich.addHeader(`📊 *STATISTIK BOT & SERVER*`);
    aiRich.addText(`Informasi diagnostik performa server dan database bot realtime.\n`);
    aiRich.addTable('Server & Bot Metrics', ['Parameter', 'Value'], rows);
    aiRich.addFooter(`⚡ Powered by ${config.bot?.name || 'SHIROWAHD'}`);

    try {
      await aiRich.send(m.chat, m);
    } catch (e) {
      let textOut = `📊 *STATISTIK BOT & SERVER*\n\n` +
        rows.map(r => `• *${r[0]}*: \`${r[1]}\``).join('\n');
      await m.reply(textOut);
    }
  } catch (error) {
    await m.react('❌');
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
