import te from '../../src/lib/hillz-error.js'
import { updateAssetUrl } from '../../src/lib/hillz-uploader.js'
const pluginConfig = {
    name: 'ganti-hillz-levelup.jpg',
    alias: ['gantihillzlevelup', 'sethillzlevelup'],
    category: 'owner',
    description: 'Ganti gambar hillz-levelup.jpg',
    usage: '.ganti-hillz-levelup.jpg (reply/kirim gambar)',
    example: '.ganti-hillz-levelup.jpg',
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
    if (!isImage) return m.reply(`🖼️ *ɢᴀɴᴛɪ HILLZ-LEVELUP.JPG*\n\n> Kirim/reply gambar untuk mengganti\n> File: assets/images/hillz-levelup.jpg`)
    try {
        let buffer = m.quoted && m.quoted.isMedia ? await m.quoted.download() : await m.download()
        if (!buffer) return m.reply('❌ Gagal mendownload gambar')
        await m.reply(`⏳ Sedang mengupload gambar...`)
        try {
            const newUrl = await updateAssetUrl('hillz-levelup', buffer, 'hillz-levelup.jpg')
            m.reply(`✅ *ʙᴇʀʜᴀsɪʟ*\n\n> Gambar hillz-levelup.jpg telah diganti ke URL baru:\n> ${newUrl}\n> Config telah diupdate secara realtime!`)
        } catch (e) {
            m.reply(`❌ Gagal mengupload gambar: ${e.message}`)
        }
    } catch (error) {
        await m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }