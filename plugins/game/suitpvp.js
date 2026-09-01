
import { getDatabase } from '../../src/lib/hillz-database.js'
import config from '../../config.js'

const pluginConfig = {
    name: 'suitpvp',
    alias: ['suit', 'rps', 'janken'],
    category: 'game',
    description: 'Main suit (batu gunting kertas) interaktif dengan player lain',
    usage: '.suit @tag',
    example: '.suit @628xxx',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

if (!global.suitGames) global.suitGames = {}

const TIMEOUT = 90000
const WIN_REWARD = 1000

const EMOJI = {
    batu: '✊',
    gunting: '✌️',
    kertas: '✋'
}

async function handler(m, { sock }) {
    const db = getDatabase()
    
    const existingRoom = Object.values(global.suitGames).find(
        room => [room.p, room.p2].includes(m.sender)
    )
    
    if (existingRoom) {
        return m.reply(
            `❌ Kamu masih dalam game suit!\n\n` +
            `> Selesaikan game kamu dulu.`
        )
    }
    
    let target = null
    if (m.quoted) {
        target = m.quoted.sender
    } else if (m.mentionedJid?.[0]) {
        target = m.mentionedJid[0]
    }
    
    if (!target) {
        return m.reply(
            `✊✌️✋ *sᴜɪᴛ ᴘᴠᴘ*\n\n` +
            `> Tag orang yang mau kamu tantang!\n\n` +
            `*Contoh:*\n` +
            `> \`.suit @628xxx\``
        )
    }
    
    if (target === m.sender) {
        return m.reply('❌ Tidak bisa menantang diri sendiri!')
    }
    
    const targetInGame = Object.values(global.suitGames).find(
        room => [room.p, room.p2].includes(target)
    )
    
    if (targetInGame) {
        return m.reply('❌ Orang itu sedang bermain suit dengan orang lain!')
    }
    
    const roomId = 'suit_' + Date.now()
    
    global.suitGames[roomId] = {
        id: roomId,
        chat: m.chat,
        p: m.sender,
        p2: target,
        status: 'waiting',
        pilih: null,
        pilih2: null,
        createdAt: Date.now(),
        timeout: setTimeout(() => {
            if (global.suitGames[roomId]) {
                sock.sendMessage(m.chat, {
                    text: `⏱️ *TIMEOUT!*\n\n@${target.split('@')[0]} tidak merespon!\nSuit dibatalkan.`,
                    mentions: [target]
                })
                delete global.suitGames[roomId]
            }
        }, TIMEOUT)
    }
    
    await m.react?.('✊')
    
    const challengeButtons = [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "⚔️ Gas Terima",
                id: "gas",
            }),
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "❌ Tolak",
                id: "tolak",
            }),
        },
    ]

    const captionText = `✊✌️✋ *TANTANGAN SUIT PVP*\n\n` +
        `@${m.sender.split('@')[0]} menantang @${target.split('@')[0]} untuk adu suit!\n\n` +
        `Hadiah Pemenang: *+Rp ${WIN_REWARD.toLocaleString()} Koin*\n` +
        `Waktu respon: *90 detik*\n\n` +
        `_Klik tombol di bawah untuk merespon!_`

    await sock.sendButton(
        m.chat,
        null,
        captionText,
        m,
        {
            buttons: challengeButtons,
            footer: `${config.bot?.name || "SHIROWAHD"} ⚔️ Suit PvP`,
            mentions: [m.sender, target]
        }
    )
}

async function answerHandler(m, sock) {
    if (!m.body) return false
    
    const text = m.body.trim().toLowerCase()
    const db = getDatabase()
    
    let room = null
    let roomId = null
    
    for (const [id, r] of Object.entries(global.suitGames)) {
        if (r.chat === m.chat && [r.p, r.p2].includes(m.sender)) {
            room = r
            roomId = id
            break
        }
        if (!m.isGroup && [r.p, r.p2].includes(m.sender)) {
            room = r
            roomId = id
            break
        }
    }
    
    if (!room) return false
    
    // Player 2 accepting or rejecting challenge
    if (room.status === 'waiting' && m.sender === room.p2 && m.chat === room.chat) {
        if (/^(acc(ept)?|terima|gas|oke?|ok|iya|yoi|⚔️ gas terima)$/i.test(text)) {
            clearTimeout(room.timeout)
            room.status = 'playing'
            
            await m.react?.('🎮')
            
            await m.reply(`✊✌️✋ *sᴜɪᴛ ᴅɪᴍᴜʟᴀɪ!*\n\n` +
                    `@${room.p.split('@')[0]} vs @${room.p2.split('@')[0]}\n\n` +
                    `> 📩 Cek *Private Chat* untuk memilih kartu!\n` +
                    `> ⏱️ Timeout: 90 detik`, { mentions: [room.p, room.p2] })
            
            const choiceButtons = [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "✊ Batu",
                        id: "batu",
                    }),
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "✌️ Gunting",
                        id: "gunting",
                    }),
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "✋ Kertas",
                        id: "kertas",
                    }),
                },
            ]

            const pmCaption = `✊✌️✋ *PILIH KARTU SUIT ANDA*\n\n` +
                `Pilih salah satu kartu di bawah ini:\n\n` +
                `┃ ✊ *Batu* (Mengalahkan Gunting)\n` +
                `┃ ✌️ *Gunting* (Mengalahkan Kertas)\n` +
                `┃ ✋ *Kertas* (Mengalahkan Batu)\n\n` +
                `_Pilihan Anda bersifat rahasia sampai kedua pemain memilih._`

            try {
                await sock.sendButton(room.p, null, pmCaption, null, {
                    buttons: choiceButtons,
                    footer: `${config.bot?.name || "SHIROWAHD"} 🎮 Private Choice`
                })
            } catch (e) {
                console.log('[Suit] Failed to PM player 1:', e.message)
            }
            
            try {
                await sock.sendButton(room.p2, null, pmCaption, null, {
                    buttons: choiceButtons,
                    footer: `${config.bot?.name || "SHIROWAHD"} 🎮 Private Choice`
                })
            } catch (e) {
                console.log('[Suit] Failed to PM player 2:', e.message)
            }
            
            room.timeout = setTimeout(async () => {
                if (global.suitGames[roomId]) {
                    if (!room.pilih && !room.pilih2) {
                        await sock.sendMessage(room.chat, { 
                            text: '⏱️ Kedua pemain tidak memilih, suit dibatalkan!' 
                        })
                    } else if (!room.pilih || !room.pilih2) {
                        const afk = !room.pilih ? room.p : room.p2
                        const winner = !room.pilih ? room.p2 : room.p
                        
                        db.updateKoin(winner, WIN_REWARD)
                        
                        await sock.sendMessage(room.chat, {
                            text: `⏱️ *TIMEOUT!*\n\n` +
                                `@${afk.split('@')[0]} tidak memilih!\n` +
                                `@${winner.split('@')[0]} menang! +Rp ${WIN_REWARD.toLocaleString()} Koin`,
                            mentions: [afk, winner]
                        })
                    }
                    delete global.suitGames[roomId]
                }
            }, TIMEOUT)
            
            return true
        }
        
        if (/^(tolak|gamau|nanti|ga(k.)?bisa|no|tidak|❌ tolak)$/i.test(text)) {
            clearTimeout(room.timeout)
            
            await sock.sendMessage(room.chat, {
                text: `❌ @${room.p2.split('@')[0]} menolak tantangan!\nSuit dibatalkan.`,
                mentions: [room.p2]
            })
            
            delete global.suitGames[roomId]
            return true
        }
    }
    
    // Players making choices in private chat
    if (room.status === 'playing' && !m.isGroup) {
        const choices = /^(batu|gunting|kertas|✊ batu|✌️ gunting|✋ kertas)$/i
        
        if (!choices.test(text)) return false
        
        let cleanedChoice = text.replace(/[^a-z]/gi, '').toLowerCase()
        if (cleanedChoice.includes('batu')) cleanedChoice = 'batu'
        else if (cleanedChoice.includes('gunting')) cleanedChoice = 'gunting'
        else if (cleanedChoice.includes('kertas')) cleanedChoice = 'kertas'

        const isPlayer1 = m.sender === room.p
        const isPlayer2 = m.sender === room.p2
        
        if (isPlayer1) {
            if (room.pilih) {
                return m.reply(`⚠️ Kamu sudah memilih ${EMOJI[room.pilih]} ${room.pilih.toUpperCase()}!\nTunggu lawanmu.`)
            }
            room.pilih = cleanedChoice
            await m.reply(`✅ Kamu memilih: ${EMOJI[cleanedChoice]} *${cleanedChoice.toUpperCase()}*\n\n> Menunggu lawan memilih...`)
        }
        
        if (isPlayer2) {
            if (room.pilih2) {
                return m.reply(`⚠️ Kamu sudah memilih ${EMOJI[room.pilih2]} ${room.pilih2.toUpperCase()}!\nTunggu lawanmu.`)
            }
            room.pilih2 = cleanedChoice
            await m.reply(`✅ Kamu memilih: ${EMOJI[cleanedChoice]} *${cleanedChoice.toUpperCase()}*\n\n> Menunggu lawan memilih...`)
        }
        
        // Both players selected!
        if (room.pilih && room.pilih2) {
            clearTimeout(room.timeout)
            
            const p1 = room.pilih
            const p2 = room.pilih2
            
            let resultText = ''
            let winner = null
            
            if (p1 === p2) {
                resultText = `🤝 *HASIL: SERI / DRAW!*\n\n` +
                    `Kedua pemain sama-sama memilih ${EMOJI[p1]} *${p1.toUpperCase()}*\n` +
                    `Tidak ada pemenang.`
            } else if (
                (p1 === 'batu' && p2 === 'gunting') ||
                (p1 === 'gunting' && p2 === 'kertas') ||
                (p1 === 'kertas' && p2 === 'batu')
            ) {
                winner = room.p
                db.updateKoin(winner, WIN_REWARD)
                resultText = `🏆 *PEMENANG: @${room.p.split('@')[0]}!*\n\n` +
                    `@${room.p.split('@')[0]}: ${EMOJI[p1]} *${p1.toUpperCase()}*\n` +
                    `@${room.p2.split('@')[0]}: ${EMOJI[p2]} *${p2.toUpperCase()}*\n\n` +
                    `🎉 Hadiah: *+Rp ${WIN_REWARD.toLocaleString()} Koin*`
            } else {
                winner = room.p2
                db.updateKoin(winner, WIN_REWARD)
                resultText = `🏆 *PEMENANG: @${room.p2.split('@')[0]}!*\n\n` +
                    `@${room.p.split('@')[0]}: ${EMOJI[p1]} *${p1.toUpperCase()}*\n` +
                    `@${room.p2.split('@')[0]}: ${EMOJI[p2]} *${p2.toUpperCase()}*\n\n` +
                    `🎉 Hadiah: *+Rp ${WIN_REWARD.toLocaleString()} Koin*`
            }
            
            await sock.sendMessage(room.chat, {
                text: `✊✌️✋ *sᴜɪᴛ ᴘᴠᴘ - sᴇʟᴇsᴀɪ*\n\n${resultText}`,
                mentions: [room.p, room.p2]
            })
            
            delete global.suitGames[roomId]
        }
        
        return true
    }
    
    return false
}

export {
    pluginConfig as config,
    handler,
    answerHandler
}
