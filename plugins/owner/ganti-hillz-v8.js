import te from '../../src/lib/hillz-error.js'
import { updateAssetUrl } from '../../src/lib/hillz-uploader.js'
const pluginConfig = {
    name: 'ganti-hillz-v8.jpg',
    alias: ['gantihillzv8', 'sethillzv8'],
    category: 'owner',
    description: 'Ganti gambar hillz-v8.jpg (thumbnail welcome)',
    usage: '.ganti-hillz-v8.jpg (reply/kirim gambar)',
    example: '.ganti-hillz-welcome.jpg',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && m.quoted.type === 'imageMessage')
    
    if (!isImage) {
        return m.reply(`🖼️ *ɢᴀɴᴛɪ ʜɪʟʟᴢ-ᴠ8.ᴊᴘɢ*\n\n> Kirim/reply gambar untuk mengganti\n> File: assets/images/hillz-v9.jpg`)
    }
    
    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }
        
        if (!buffer) {
            return m.reply(`❌ Gagal mendownload gambar`)
        }
        
        await m.reply(`⏳ Sedang mengupload gambar...`)
        try {
            const newUrl = await updateAssetUrl('hillz-v8', buffer, 'hillz-v8.jpg')
            m.reply(`✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar hillz-v8.jpg telah diganti ke URL baru:\n> ${newUrl}\n> Config telah diupdate secara realtime!`)
        } catch (e) {
            m.reply(`❌ Gagal mengupload gambar: ${e.message}`)
        }
    } catch (error) {
        await m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }