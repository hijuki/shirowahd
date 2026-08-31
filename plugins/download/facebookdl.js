import { fbdown } from '../../src/scraper/fbdown.js'
import te from '../../src/lib/hillz-error.js'
import fs from 'fs'
import { ambilVideoHD, ringkasKualitas } from '../../src/lib/hillz-hdmedia.js'

const pluginConfig = {
    name: 'facebookdl',
    alias: ['fbdown', 'fb', 'facebook', 'fbdl'],
    category: 'download',
    description: 'Download video Facebook',
    usage: '.facebookdl <url>',
    example: '.facebookdl https://www.facebook.com/watch?v=xxx',
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
            `⚠️ *CARA PAKAI*\n\n` +
            `- \`${m.prefix}facebookdl <url>\`\n\n` +
            `*Contoh:*\n` +
            `- \`${m.prefix}fbdown https://www.facebook.com/watch?v=xxx\``
        )
    }
    
    if (!url.match(/facebook\.com|fb\.watch|fb\.com/i)) {
        return m.reply(`❌ URL tidak valid. Gunakan link Facebook.`)
    }
    
    await m.react('🕕')
    
    try {
        const data = await fbdown(url)
        
        if (!data?.status || !data.result || !data.result.medias || data.result.medias.length === 0) {
            await m.react('❌')
            return m.reply(`❌ Gagal mengambil video. Coba link lain atau pastikan postingan bersifat publik.\n\n_Catatan: Sistem saat ini belum mendukung download foto Facebook, hanya video._`)
        }
        
        // Pemilihan `quality === "hd"` persis hanya cocok bila API menulis label
        // itu apa adanya. Kenyataannya label bervariasi ("HD", "720p",
        // "hd_no_watermark"), dan kalau tidak ada yang sama persis, kode lama
        // langsung memakai medias[0] — bisa SD. Penilaian kualitas sekarang
        // memakai skoring (label, dimensi, ukuran) dengan fallback berjenjang.
        const kandidat = (data.result.medias || []).filter(v => v && v.url)
        if (!kandidat.length) {
            await m.react('❌')
            return m.reply(`❌ Video tidak ditemukan di link tersebut.\n\n_Catatan: Sistem saat ini belum mendukung download foto Facebook, hanya video._`)
        }
        
        const siap = await ambilVideoHD(kandidat, { referer: 'https://www.facebook.com/' })

        let caption = `🎥 *FACEBOOK DOWNLOADER*\n\n`
        caption += `*Judul:* ${data.result.title || "Video Facebook"}\n`
        caption += `*Kualitas:* ${ringkasKualitas(siap)}\n`
        caption += `\n_Catatan: Fitur ini tidak mensupport postingan foto._`

        try {
            await sock.sendMedia(m.chat, siap.path, caption, m, {
                type: 'video',
                contextInfo: {
                    forwardingScore: 99,
                    isForwarded: true
                }
            })
        } finally {
            if (siap.temp) { try { fs.unlinkSync(siap.path) } catch {} }
        }
        
        await m.react('✅')
    } catch (err) {
        await m.react('❌')
        return m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }