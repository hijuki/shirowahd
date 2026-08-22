import { videyScraper } from '../../src/scraper/videy.js'
import te from '../../src/lib/ourin-error.js'

const pluginConfig = {
    name: 'videy',
    alias: ['vdl', 'videydownload', 'videydl'],
    category: 'download',
    description: 'Download video dari videy.co',
    usage: '.videy <url>',
    example: '.videy https://videy.co/v?id=7ZH1ZRIF',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const url = m.text?.trim()
    
    if (!url) {
        return m.reply(
            `🎬 *ᴠɪᴅᴇʏ ᴅᴏᴡɴʟᴏᴀᴅ*\n\n` +
            `> Masukkan URL videy.co\n\n` +
            `\`Contoh: ${m.prefix}videy https://videy.co/v?id=7ZH1ZRIF\``
        )
    }
    
    if (!url.match(/videy\.co/i)) {
        return m.reply(`❌ URL tidak valid. Gunakan link dari videy.co`)
    }
    
    m.react('🕕')
    
    try {
        const data = await videyScraper(url)
        
        if (!data?.status || !data?.url) {
            m.react('❌')
            return m.reply(`❌ Gagal mengambil video. Link tidak valid atau sudah expired.`)
        }
        
        await sock.sendMedia(m.chat, data.url, null, m, {
            type: 'video',
            contextInfo: {
                forwardingScore: 99,
                isForwarded: true
            }
        })
        
        m.react('✅')
        
    } catch (error) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }
