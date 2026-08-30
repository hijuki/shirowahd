import te from '../../src/lib/hillz-error.js'
import { updateAssetUrl } from '../../src/lib/hillz-uploader.js'
const pluginConfig = {
    name: 'ganti-hillz.mp4',
    alias: ['gantihillzvideo', 'sethillzvideo'],
    category: 'owner',
    description: 'Ganti video hillz.mp4',
    usage: '.ganti-hillz.mp4 (reply/kirim video)',
    example: '.ganti-hillz.mp4',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const isVideo = m.type === 'videoMessage' || (m.quoted && m.quoted.type === 'videoMessage')
    
    if (!isVideo) {
        return m.reply(`🎬 *ɢᴀɴᴛɪ ʜɪʟʟᴢ.ᴍᴘ4*\n\n> Kirim/reply video untuk mengganti\n> File: assets/video/hillz.mp4`)
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(`❌ Gagal mendownload video`)
        }
        
        await m.reply(`⏳ Sedang mengupload gambar...`)
        try {
            const newUrl = await updateAssetUrl('hillz-mp4', buffer, 'hillz.mp4')
            m.reply(`✅ *ʙᴇʀʜᴀsɪʟ*\n\n> File hillz.mp4 telah diganti ke URL baru:\n> ${newUrl}\n> Config telah diupdate secara realtime!`)
        } catch (e) {
            m.reply(`❌ Gagal mengupload file: ${e.message}`)
        }
    } catch (error) {
        await m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }