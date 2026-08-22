import axios from 'axios'
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

        // Download to buffer first — sendMedia with URL sometimes fails
        const res = await axios.get(data.url, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://videy.co/',
            },
        })

        const buffer = Buffer.from(res.data)
        if (buffer.length < 1000) {
            m.react('❌')
            return m.reply('❌ Video tidak ditemukan atau sudah dihapus.')
        }

        const mimetype = data.ext === 'mov' ? 'video/quicktime' : 'video/mp4'

        await sock.sendMessage(m.chat, {
            video: buffer,
            mimetype,
            caption: `🎬 *Videy Download*\n> ID: ${data.id}\n> Format: ${data.ext}`,
        }, { quoted: m })
        
        m.react('✅')
        
    } catch (error) {
        console.error('[videy]', error.message)
        m.react('☢')
        if (error.response?.status === 404) {
            m.reply('❌ Video tidak ditemukan. Mungkin sudah dihapus dari videy.co')
        } else {
            m.reply(te(m.prefix, m.command, m.pushName))
        }
    }
}

export { pluginConfig as config, handler }
