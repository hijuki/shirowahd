import { getDatabase } from '../../src/lib/hillz-database.js'
const pluginConfig = {
    // Nama diganti dari 'botmode' ke 'gcmode' (alias .modegrup). Nama lama juga
    // dideklarasikan `plugins/owner/botmode.js` dan berkas itu yang menang, jadi
    // handler di sini mati total — hanya ekspor `MODES`/`getGroupMode`-nya yang
    // masih hidup, dipakai plugins/main/menu.js, allmenu.js, dan menucat.js.
    // Karena itu berkas ini TIDAK boleh dihapus.
    //
    // Fiturnya juga berbeda dan sah: versi ini `isAdmin: true, isGroup: true` —
    // admin grup mengatur mode grupnya sendiri; versi owner `isOwner: true` dan
    // bisa mengubah mode global. Dengan nama lama, izin admin-grup itu tidak
    // pernah bisa dipakai: yang menjawab selalu versi owner.
    name: 'gcmode',
    alias: ['modegrup'],
    category: 'group',
    description: 'Atur mode bot untuk grup ini',
    usage: '.gcmode <md/cpanel/pushkontak/store/otp/all>',
    example: '.gcmode store',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    isAdmin: true,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

const MODES = {
    md: {
        name: 'Multi-Device',
        desc: 'Mode default dengan semua fitur standar',
        allowedCategories: null,
        excludeCategories: ['cpanel', 'pushkontak', 'store']
    },
    all: {
        name: 'All Features',
        desc: 'Semua fitur dari semua mode bisa diakses',
        allowedCategories: null,
        excludeCategories: null
    },
    cpanel: {
        name: 'CPanel Pterodactyl',
        desc: 'Mode khusus untuk panel server',
        allowedCategories: ['main', 'group', 'sticker', 'owner', 'tools', 'panel'],
        excludeCategories: null
    },
    pushkontak: {
        name: 'Push Kontak',
        desc: 'Mode khusus untuk push kontak ke member',
        allowedCategories: ['owner', 'main', 'group', 'sticker', 'pushkontak'],
        excludeCategories: null
    },
    store: {
        name: 'Store/Toko',
        desc: 'Mode khusus untuk toko manual',
        allowedCategories: ['main', 'group', 'sticker', 'owner', 'store'],
        excludeCategories: null
    },
    otp: {
        name: 'OTP Service',
        desc: 'Mode layanan OTP otomatis',
        allowedCategories: ['main', 'group', 'sticker', 'owner', 'otp'],
        excludeCategories: null
    }
}

function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args || []
    let mode = (args[0] || '').toLowerCase()
    const flags = args.slice(1).map(f => f.toLowerCase())

    const groupData = db.getGroup(m.chat) || {}
    const currentMode = groupData.botMode || 'all'

    if (!mode) {
        let modeList = ''
        for (const [key, val] of Object.entries(MODES)) {
            const isCurrent = key === currentMode ? ' ⬅️' : ''
            modeList += `┃ \`${m.prefix}gcmode ${key}\`${isCurrent}\n`
            modeList += `┃ └ ${val.desc}\n`
        }

        return m.reply(
            `🔧 *ʙᴏᴛ ᴍᴏᴅᴇ*\n\n` +
            `> Mode saat ini: *${currentMode.toUpperCase()}* (${MODES[currentMode]?.name || 'Unknown'})\n` +
            `\n╭─「 📋 *ᴘɪʟɪʜᴀɴ* 」\n` +
            `${modeList}` +
            `╰───────────────\n\n` +
            `*ꜰʟᴀɢ sᴛᴏʀᴇ:*\n` +
            `> \`${m.prefix}gcmode store\` - Manual order\n\n` +
            `> _Pengaturan per-grup_`
        )
    }

    if (!Object.keys(MODES).includes(mode)) {
        return m.reply(`❌ Mode tidak valid. Pilihan: \`${Object.keys(MODES).join(', ')}\``)
    }



    const newGroupData = {
        ...groupData,
        botMode: mode
    }

    if (mode === 'store') {
        newGroupData.storeConfig = {
            ...(groupData.storeConfig || {}),
            products: groupData.storeConfig?.products || []
        }
    }

    db.setGroup(m.chat, newGroupData)
    db.save()

    m.react('✅')

    let extraInfo = ''
    if (mode === 'store') {
        const products = newGroupData.storeConfig?.products || []
        extraInfo = `\n\n📋 *Manual mode*\n` +
            `> Admin perlu confirm order manual\n` +
            `> Product: \`${products.length}\` item\n\n` +
            `*ᴘᴀɴᴅᴜᴀɴ:*\n` +
            `> \`${m.prefix}addprod <kode> <harga> <nama>\`\n` +
            `> \`${m.prefix}listprod\` - Lihat produk`
    }

    return m.reply(
        `✅ *ᴍᴏᴅᴇ ᴅɪᴜʙᴀʜ*\n\n` +
        `> Mode: *${mode.toUpperCase()}* (${MODES[mode].name})\n` +
        `> Grup: *${m.chat.split('@')[0]}*\n` +
        extraInfo +
        `\n\n> Ketik \`${m.prefix}menu\` untuk melihat menu.`
    )
}

function getGroupMode(chatJid, db) {
    const globalMode = db.setting('botMode') || 'all'
    if (!chatJid?.endsWith('@g.us')) return globalMode
    const groupData = db.getGroup(chatJid) || {}
    return groupData.botMode || globalMode
}

function getModeCategories(mode) {
    const modeConfig = MODES[mode] || MODES.md
    return {
        allowed: modeConfig.allowedCategories,
        excluded: modeConfig.excludeCategories
    }
}

function filterCategoriesByMode(categories, mode) {
    const modeConfig = MODES[mode] || MODES.md

    if (modeConfig.allowedCategories) {
        return categories.filter(cat => modeConfig.allowedCategories.includes(cat.toLowerCase()))
    }

    if (modeConfig.excludeCategories) {
        return categories.filter(cat => !modeConfig.excludeCategories.includes(cat.toLowerCase()))
    }

    return categories
}

export { pluginConfig as config, handler, getGroupMode, getModeCategories, filterCategoriesByMode, MODES }