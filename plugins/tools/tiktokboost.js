import axios from 'axios';

const pluginConfig = {
    name: 'tiktokboost',
    alias: ['ttboost', 'boosttiktok'],
    category: 'tools',
    description: 'Boost views and analytics for TikTok video',
    usage: '.tiktokboost <url>',
    example: '.tiktokboost https://vt.tiktok.com/ZSjX.../',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 2,
    isEnabled: true
};

async function getTikTokInfo(url) {
    try {
        const res = await axios.post('https://tikwm.com/api/', new URLSearchParams({ url, count: '12', cursor: '0', web: '1', hd: '1' }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            timeout: 10000
        });
        if (res.data?.code === 0 && res.data?.data) {
            return res.data.data;
        }
    } catch {}
    return null;
}

async function requestBooster(url) {
    // Daftar multi-provider booster API
    const endpoints = [
        `https://omegatech-api.dixonomega.tech/api/Fun/Tiktok-booster?action=boost&url=${encodeURIComponent(url)}`,
        `https://api.zellrayy.com/tools/tiktokboost?url=${encodeURIComponent(url)}`
    ];

    for (const ep of endpoints) {
        try {
            const res = await axios.get(ep, { timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (res.data?.success || res.data?.status) {
                return { success: true, data: res.data };
            }
        } catch {}
    }
    return { success: false };
}

async function handler(m, { sock, conn, args }) {
    const textMsg = m.text || '';
    const text = (args && args.length) ? args.join(' ') : textMsg.trim().split(/ +/).slice(1).join(' ');

    const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
    if (!urlMatch || !text.includes('tiktok.com')) {
        return m.reply(
            `🚀 *TIKTOK BOOSTER*\n\n` +
            `> Masukkan link video TikTok yang valid!\n\n` +
            `*Contoh:* \`${m.prefix || '.'}tiktokboost https://vt.tiktok.com/ZSjX.../\``
        );
    }

    const tiktokUrl = urlMatch[0];
    if (typeof m.react === 'function') await m.react('⏳');

    try {
        const info = await getTikTokInfo(tiktokUrl);
        const boostResult = await requestBooster(tiktokUrl);

        const title = info?.title || 'TikTok Video';
        const author = info?.author?.nickname || info?.author?.unique_id || 'Unknown';
        const playCount = Number(info?.play_count || 0).toLocaleString();
        const diggCount = Number(info?.digg_count || 0).toLocaleString();
        const shareCount = Number(info?.share_count || 0).toLocaleString();

        let teks = `🎯 *TIKTOK BOOSTER*\n\n`;
        teks += `━━━━━━━━━━━━━━━━━━━━━\n`;
        teks += `📹 *Judul:* ${title.slice(0, 60)}${title.length > 60 ? '...' : ''}\n`;
        teks += `👤 *Kreator:* ${author}\n`;
        teks += `👁 *Views Sekarang:* ${playCount}\n`;
        teks += `❤️ *Likes:* ${diggCount} | 🔁 *Shares:* ${shareCount}\n`;
        teks += `📊 *Status Queue:* ${boostResult.success ? '🚀 Antrean Berhasil Terkirim' : '⏳ Server booster sedang antre trafik tinggi'}\n`;
        teks += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        teks += `> _Catatan: Proses view & engagement booster membutuhkan waktu 5-30 menit tergantung antrean server._`;

        if (typeof m.react === 'function') await m.react('✅');
        await m.reply(teks);

    } catch (e) {
        console.error('[tiktokboost ERROR STACK]', e.stack || e);
        if (typeof m.react === 'function') await m.react('❌');
        await m.reply(`❌ *GAGAL*\n\n> Terjadi kendala saat membaca link TikTok.`);
    }
}

export { pluginConfig as config, handler };
