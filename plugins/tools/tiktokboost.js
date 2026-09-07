import axios from 'axios';

const pluginConfig = {
    name: 'tiktokboost',
    alias: ['ttboost', 'boosttiktok'],
    category: 'tools',
    description: 'Boost views TikTok video URL',
    usage: '.tiktokboost <url>',
    example: '.tiktokboost https://vt.tiktok.com/ZSjX.../',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 2,
    isEnabled: true
};

async function handler(m, { sock, conn, args }) {
    const client = sock || conn;
    const text = (args && args.length) ? args.join(' ') : (m.text || '').trim();

    if (!text || !text.includes('tiktok.com')) {
        return m.reply(`🚀 *TIKTOK BOOST*\n\n> Masukkan URL video TikTok yang valid!\n\n\`Contoh: ${m.prefix || '.'}tiktokboost https://vt.tiktok.com/xxxx/\``);
    }

    if (typeof m.react === 'function') await m.react('⏳');

    try {
        const targetUrl = text.match(/https?:\/\/[^\s]+/)?.[0] || text;
        const res = await axios.get(`https://api.zellrayy.com/tools/tiktokboost?url=${encodeURIComponent(targetUrl)}`, {
            timeout: 25000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (res.data?.status || res.data?.success) {
            if (typeof m.react === 'function') await m.react('✅');
            return m.reply(`🚀 *TIKTOK BOOST SUCCESS*\n\n> ${res.data?.message || 'Permintaan boost view berhasil dikirim ke server queue.'}`);
        } else {
            if (typeof m.react === 'function') await m.react('❌');
            return m.reply(`❌ *GAGAL*\n\n> ${res.data?.message || 'Server boost sedang antre atau tidak merespons.'}`);
        }
    } catch (e) {
        if (typeof m.react === 'function') await m.react('❌');
        return m.reply(`❌ *GAGAL*\n\n> Server boost sedang offline / timeout.`);
    }
}

export { pluginConfig as config, handler };
