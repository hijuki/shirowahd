import config from '../../config.js'

const pluginConfig = {
    name: 'tqto',
    alias: ['thanksto', 'credits', 'kredit'],
    category: 'main',
    description: 'Credits',
    usage: '.tqto',
    example: '.tqto',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const botName = config.bot?.name || 'SHIROWAHD'

    const text = `*${botName}*

👨‍💻 *HILLZ* — Developer
🤖 *Claude* — AI Assistant

_Terima kasih sudah menggunakan ${botName}!_`

    await m.reply(text)
}

export { pluginConfig as config, handler }
