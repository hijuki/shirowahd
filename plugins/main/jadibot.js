import { startJadibot, isJadibotActive } from '../../src/lib/hillz-jadibot-manager.js'

const pluginConfig = {
    name: 'jadibot',
    alias: ['jadibotqr', 'becomebot', 'bot'],
    category: 'main',
    description: 'Jadikan nomor kamu menjadi bot (Pairing Code / QR)',
    usage: '.jadibot <nomor> atau .jadibot qr',
    example: '.jadibot 628123456789',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 0,
    isEnabled: true
}

// Normalisasi input nomor -> JID WhatsApp. Menerima 08xxx / 628xxx / +628xxx /
// spasi / strip. 08xxx otomatis dikonversi ke 628xxx.
function normalNomor(raw) {
    let d = String(raw || '').replace(/[^0-9]/g, '')
    if (!d) return null
    if (d.startsWith('0')) d = '62' + d.slice(1)
    if (d.startsWith('8')) d = '62' + d
    if (d.length < 10 || d.length > 15) return null
    return d
}

async function handler(m, { sock }) {
    const sender = m.sender
    if (!sender) return m.reply('❌ Gagal mengidentifikasi nomor kamu')

    const senderNum = sender.replace(/[^0-9]/g, '')

    // Argumen pertama bisa berupa "qr" (mode QR) atau nomor tujuan.
    const rawArgs = m.args || []
    const first = (rawArgs[0] || '').toLowerCase()
    const useQR = first === 'qr'

    // Kalau mode QR, nomor tujuan ada di argumen kedua; kalau tidak, di argumen pertama.
    const rawNomor = useQR ? (rawArgs[1] || '') : (rawArgs[0] || '')

    let targetNum
    if (!rawNomor) {
        // Kosong = pakai nomor pengirim sendiri. Ini sengaja: paling aman & umum.
        targetNum = senderNum
    } else {
        targetNum = normalNomor(rawNomor)
        if (!targetNum) {
            return m.reply(
                `❌ *ɴᴏᴍᴏʀ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ*\n\n` +
                `> Format: 10-15 digit, contoh \`628123456789\`\n\n` +
                `*Cara pakai:*\n` +
                `> \`${m.prefix}jadibot\` — pakai nomor kamu sendiri\n` +
                `> \`${m.prefix}jadibot 628123456789\` — nomor tertentu\n` +
                `> \`${m.prefix}jadibot qr\` — mode QR (nomor sendiri)`
            )
        }
    }

    // Menautkan nomor MILIK ORANG LAIN hanya untuk owner/premium — supaya orang
    // biasa tidak bisa iseng menautkan nomor sembarang orang.
    const targetLain = targetNum !== senderNum
    if (targetLain && !m.isOwner && !m.isPremium) {
        return m.reply(
            `🚫 *ᴀᴋꜱᴇꜱ ᴅɪᴛᴏʟᴀᴋ*\n\n` +
            `> Menautkan nomor selain nomor kamu sendiri hanya untuk *Owner / Premium*.\n\n` +
            `> Ketik \`${m.prefix}jadibot\` (tanpa nomor) untuk menautkan nomormu sendiri.`
        )
    }

    const targetJid = `${targetNum}@s.whatsapp.net`

    if (isJadibotActive(targetJid)) {
        return m.reply(
            `⚠️ *ᴊᴀᴅɪʙᴏᴛ ꜱᴜᴅᴀʜ ᴀᴋᴛɪꜰ*\n\n` +
            `> Nomor *${targetNum}* sudah menjadi bot\n` +
            `> Ketik \`${m.prefix}stopjadibot\` untuk menghentikan`
        )
    }

    if (useQR) {
        await m.reply(
            `🤖 *ᴊᴀᴅɪʙᴏᴛ — Qʀ ᴍᴏᴅᴇ*\n\n` +
            `> Target: *${targetNum}*\n` +
            `> Menyiapkan koneksi...\n` +
            `> Scan QR Code yang akan dikirim`
        )
    } else {
        await m.reply(
            `🤖 *ᴊᴀᴅɪʙᴏᴛ — ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ*\n\n` +
            `> Target: *${targetNum}*\n` +
            `> Menyiapkan koneksi...`
        )
    }

    try {
        await startJadibot(sock, m, targetJid, !useQR)
    } catch (e) {
        await m.reply(
            `❌ *ᴊᴀᴅɪʙᴏᴛ ɢᴀɢᴀʟ*\n\n` +
            `> ${e.message || 'Terjadi kesalahan'}\n\n` +
            `Coba lagi dalam beberapa menit.`
        )
    }
}

export { pluginConfig as config, handler }
