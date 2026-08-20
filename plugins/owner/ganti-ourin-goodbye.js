import fs from 'fs'
import path from 'path'
import te from '../../src/lib/ourin-error.js'
import { updateAssetUrl } from '../../src/lib/ourin-uploader.js'
const pluginConfig = {
    name: 'ganti-hillz-goodbye.jpg',
    alias: ['gantigoodbye', 'sethillzgoodbye'],
    category: 'owner',
    description: 'Ganti gambar hillz-goodbye.jpg (thumbnail goodbye)',
    usage: '.ganti-hillz-goodbye.jpg (reply/kirim gambar)',
    example: '.ganti-hillz-goodbye.jpg',
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
        return m.reply(`🖼️ *ɢᴀɴᴛɪ ʜɪʟʟᴢ-ɢᴏᴏᴅʙʏᴇ.ᴊᴘɢ*\n\n> Kirim/reply gambar untuk mengganti\n> File: assets/images/hillz-goodbye.jpg`)
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
            const newUrl = await updateAssetUrl('hillz-goodbye', buffer, 'hillz-goodbye.jpg')
            m.reply(`✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar hillz-goodbye.jpg telah diganti ke URL baru:\n> ${newUrl}\n> Config telah diupdate secara realtime!`)
        } catch (e) {
            m.reply(`❌ Gagal mengupload gambar: ${e.message}`)
        }
    } catch (error) {
        await m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }