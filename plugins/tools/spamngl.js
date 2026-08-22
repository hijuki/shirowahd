import axios from 'axios'
import te from '../../src/lib/ourin-error.js'
const pluginConfig = {
    name: 'spamngl',
    alias: [],
    category: 'tools',
    description: 'Send NGL Spam',
    usage: '.spamngl <url> | <text> | <jumlah>',
    example: '.spamngl https://ngl.link/xxxx | hai | 10',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true
}

async function sendNGL(username, message) {
    const r = await axios.post("https://ngl.link/api/submit", {
        username,
        question: message,
        deviceId: "wa-" + Math.random().toString(36).slice(2) + Date.now(),
        gameSlug: "",
        referrer: ""
    }, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Content-Type": "application/json",
            "Origin": "https://ngl.link",
            "Referer": "https://ngl.link/" + username,
        },
        timeout: 15000
    });
    return r.data;
}

function extractUsername(link) {
    // Support: https://ngl.link/username, ngl.link/username, just username
    const match = link.trim().match(/(?:https?:\/\/)?ngl\.link\/([a-zA-Z0-9_.]+)/i);
    if (match) return match[1];
    // If no ngl.link format, treat as raw username
    const clean = link.trim().replace(/[^a-zA-Z0-9_.]/g, '');
    return clean || null;
}

async function handler(m, { sock }) {
    const text = m.text?.split('|')
    if (!text || !text[0]) return m.reply(`*LINK NGL NYA MANA ??*\nContoh: \`${m?.prefix}spamngl https://ngl.link/xxxx | hai | 10\``)
    
    const link = text[0]?.trim()
    const kata = text[1]?.trim()
    const jumlah = parseInt(text[2]?.trim())
    
    if(!kata) return m.reply(`*KATA KATA NYA MANA ??*\n\nContoh: \`${m?.prefix}spamngl https://ngl.link/xxxx | hai | 10\``)
    if(!jumlah || isNaN(jumlah)) return m.reply(`*JUMLAH NYA MANA ??*\n\nContoh: \`${m?.prefix}spamngl https://ngl.link/xxxx | hai | 10\``)
    if(jumlah > 100) return m.reply(`*MAKSIMAL 100 YA*`)
    
    const username = extractUsername(link)
    if(!username) return m.reply(`*USERNAME NGL TIDAK VALID*\n\nContoh: \`${m?.prefix}spamngl https://ngl.link/xxxx | hai | 10\``)
    
    m.react('🎴')
    
    let success = 0, failed = 0;
    try {
        for(let i = 0; i < jumlah; i++) {
            try {
                await sendNGL(username, kata)
                success++
            } catch {
                failed++
            }
            if (i < jumlah - 1) await new Promise(resolve => setTimeout(resolve, 2000))
        }
        await m.react('✅')
        await sock.sendMessage(m.chat, {
            text: `✅ *DONE*\n\n` +
                  `Target: ngl.link/${username}\n` +
                  `Pesan: ${kata}\n` +
                  `Berhasil: ${success}/${jumlah}\n` +
                  (failed > 0 ? `Gagal: ${failed}` : '')
        }, { quoted: m })
        
    } catch (error) {
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }
