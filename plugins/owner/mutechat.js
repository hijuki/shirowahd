const pluginConfig = {
    // Nama 'mute' DILEPAS di sini. Alasannya bukan gaya, tapi fitur yang mati:
    // `plugins/group/mute.js` yang mendeklarasikan `.mute` (admin grup, menulis
    // `group.mute` ke database) kalah oleh berkas ini, padahal `src/handler.js`
    // baris 189 mengimpor `isMuted` dari berkas itu dan baris 735-737 benar-benar
    // menegakkannya — pesan non-admin dihapus saat grup di-mute. Akibatnya
    // penegakan itu tidak pernah bisa aktif: tidak ada satu pun command yang bisa
    // MEN-SET `group.mute`, sementara `.unmute` (group/unmute.js) hidup dan
    // membacanya. Fungsi berkas ini sendiri juga berbeda total — `sock.chatModify`
    // membisukan NOTIFIKASI chat di perangkat bot, bukan membisukan grup — dan
    // `usage`-nya memang hanya mengiklankan `.mutechat`, jadi klaim nama pendek
    // 'mute' tidak pernah disengaja.
    name: ['mutechat'],
    alias: [],
    category: 'owner',
    description: 'Mute/unmute chat',
    usage: '.mutechat <nomor/reply> atau .mutechat buka <nomor>',
    example: '.mutechat 628xxx',
    isOwner: true,
    cooldown: 3,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const action = m.args[0]?.toLowerCase()
    let targetJid = null
    let mute = true

    if (action === 'buka' || action === 'unmute') {
        mute = false
        const num = (m.args[1] || '').replace(/[^0-9]/g, '')
        if (num) targetJid = num + '@s.whatsapp.net'
        else if (m.quoted) targetJid = m.quoted.sender || m.quoted.participant
        else if (!m.isGroup) targetJid = m.chat
    } else {
        if (m.mentionedJid?.length > 0) {
            targetJid = m.mentionedJid[0]
        } else if (m.quoted) {
            targetJid = m.quoted.sender || m.quoted.participant
        } else if (m.args[0]) {
            const num = m.args[0].replace(/[^0-9]/g, '')
            if (num) targetJid = num + '@s.whatsapp.net'
        } else if (!m.isGroup) {
            targetJid = m.chat
        }
    }

    if (!targetJid) {
        return m.reply(
            '🔇 *ᴍᴜᴛᴇ ᴄʜᴀᴛ*\n\n' +
            '> `.mutechat 628xxx` — Mute chat\n' +
            '> `.mutechat` (di private chat) — Mute chat ini\n' +
            '> `.mutechat buka 628xxx` — Unmute chat'
        )
    }

    try {
        await sock.chatModify({ mute: mute ? 1 : null }, targetJid)
        await m.react('✅')
        const target = targetJid.split('@')[0]
        return m.reply(
            mute
                ? `🔇 *ᴄʜᴀᴛ ᴅɪᴍᴜᴛᴇ*\n\n> Target: ${target}`
                : `🔊 *ᴄʜᴀᴛ ᴅɪᴜɴᴍᴜᴛᴇ*\n\n> Target: ${target}`
        )
    } catch (err) {
        return m.reply(`❌ Gagal: ${err.message}`)
    }
}

export { pluginConfig as config, handler }
