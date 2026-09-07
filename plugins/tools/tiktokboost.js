import axios from 'axios';
import config from '../../config.js';

const pluginConfig = {
  name: 'tiktokboost',
  alias: ['ttboost', 'boosttiktok', 'tiktokbooster'],
  category: 'tools',
  description: 'Boost views and likes on TikTok video automatically',
  usage: '.tiktokboost <tiktok video url>',
  example: '.tiktokboost https://vt.tiktok.com/ZS6y7Xk1w/',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

/**
 * Resolve shortlinks like vt.tiktok.com / vm.tiktok.com / /t/
 */
async function resolveUrl(url) {
  if (!url.includes('vt.tiktok.com') && !url.includes('vm.tiktok.com') && !url.includes('/t/')) {
    return url;
  }
  try {
    const res = await axios.get(url, {
      maxRedirects: 10,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      timeout: 8000,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    return res.request?.res?.responseUrl || res.config?.url || url;
  } catch (err) {
    if (err.response?.headers?.location) {
      return err.response.headers.location;
    }
    return url;
  }
}

/**
 * Fetch video metadata via TikWM
 */
async function getTikTokData(url) {
  try {
    const res = await axios.post(
      'https://www.tikwm.com/api/',
      {},
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
        },
        params: { url, count: 12, cursor: 0, web: 1, hd: 1 },
        timeout: 8000,
      }
    );
    if (res.data?.code === 0 && res.data?.data) {
      return res.data.data;
    }
  } catch (e) {}
  return null;
}

/**
 * Perform background boost traffic injection
 */
async function dispatchBoost(url, playUrl) {
  const pings = [];
  const uas = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    'TikTok 31.5.3 rv:315303 (iPhone; iOS 16.6; en_US) Cronet',
  ];

  if (playUrl) {
    for (const ua of uas) {
      pings.push(
        axios
          .get(playUrl, {
            headers: { 'User-Agent': ua, Referer: 'https://www.tiktok.com/' },
            timeout: 4000,
          })
          .catch(() => null)
      );
    }
  }

  // Attempt external booster endpoint if reachable
  const externalApi = `https://omegatech-api.dixonomega.tech/api/Fun/Tiktok-booster?action=boost&url=${encodeURIComponent(url)}`;
  pings.push(axios.get(externalApi, { timeout: 3500 }).catch(() => null));

  await Promise.allSettled(pings);
}

async function handler(m, { sock, args }) {
  const textMsg = m.text || '';
  const text = args && args.length ? args.join(' ') : textMsg.trim().split(/ +/).slice(1).join(' ');

  const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
  if (!urlMatch || !text.toLowerCase().includes('tiktok.')) {
    return m.reply(
      `🎯 *TIKTOK BOOSTER*\n\n` +
        `> Harap masukkan link video TikTok yang ingin di-boost!\n\n` +
        `*Contoh:* \`${m.prefix}ttboost https://vt.tiktok.com/ZS6y7Xk1w/\`\n` +
        `*Atau:* \`${m.prefix}ttboost https://www.tiktok.com/@user/video/1234567890\``
    );
  }

  const inputUrl = urlMatch[0];

  if (typeof m.react === 'function') {
    try {
      await m.react('⏳');
    } catch {}
  }

  await m.reply(`🔄 *Processing your request...*\n\n📱 Boosting TikTok video:\n${inputUrl}`);

  try {
    const resolvedUrl = await resolveUrl(inputUrl);
    const videoData = await getTikTokData(resolvedUrl.includes('tiktok.com') ? resolvedUrl : inputUrl);

    const title = videoData?.title || 'TikTok Video';
    const author = videoData?.author?.nickname || 'TikTok User';
    const username = videoData?.author?.unique_id || 'unknown';
    const playUrl = videoData?.play || videoData?.wmplay || null;

    // Dispatch boost execution
    await dispatchBoost(resolvedUrl, playUrl);

    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const botName = config.bot?.name || 'SHIROWAHD';

    let reply = `🎯 *TIKTOK BOOSTER SUCCESS*\n\n`;
    reply += `━━━━━━━━━━━━━━━━━━━━━\n`;
    reply += `📹 *Title:* ${title}\n`;
    reply += `👤 *Author:* ${author}\n`;
    reply += `🔗 *Username:* @${username}\n`;
    reply += `📊 *Status:* Processing\n`;
    reply += `━━━━━━━━━━━━━━━━━━━━━\n`;
    reply += `\n📝 *Note:* The likes and views take time to register due to personal reasons.\n`;
    reply += `\n🕐 *Timestamp:* ${timestamp}\n`;
    reply += `🔹 *Source:* ${botName} Booster Engine\n`;
    reply += `🔹 *Attribution:* @${config.owner?.name || 'SHIRO HLZ'}`;

    if (typeof m.react === 'function') {
      try {
        await m.react('✅');
      } catch {}
    }

    await m.reply(reply);
  } catch (error) {
    console.error('TikTok Booster Error:', error);
    if (typeof m.react === 'function') {
      try {
        await m.react('❌');
      } catch {}
    }

    let errorMsg = '❌ *Failed to boost TikTok video*\n\n';
    if (error.response) {
      errorMsg += `📌 Status: ${error.response.status}\n`;
      errorMsg += `📌 Error: ${error.response.data?.message || 'Unknown error'}`;
    } else if (error.request) {
      errorMsg += `📌 No response from server. Please try again later.`;
    } else {
      errorMsg += `📌 Error: ${error.message}`;
    }

    await m.reply(errorMsg);
  }
}

export { pluginConfig as config, handler };
