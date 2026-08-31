import axios from 'axios'
import * as cheerio from 'cheerio'
import crypto from 'crypto'
import { generateWAMessage, generateWAMessageFromContent, jidNormalizedUser } from 'hillz'
import config from '../../config.js'
import te from '../../src/lib/hillz-error.js'
import fs from 'fs'
import { ambilVideoHD, ringkasKualitas } from '../../src/lib/hillz-hdmedia.js'
const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    Origin: 'https://savett.cc',
    Referer: 'https://savett.cc/en1/download',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
}

async function getToken() {
    const res = await axios.get('https://savett.cc/en1/download')
    return {
        csrf: res.data.match(/name="csrf_token" value="([^"]+)"/)?.[1],
        cookie: res.headers['set-cookie'].map(v => v.split(';')[0]).join('; ')
    }
}

async function fetchTikTok(url, csrf, cookie) {
    const res = await axios.post(
        'https://savett.cc/en1/download',
        `csrf_token=${encodeURIComponent(csrf)}&url=${encodeURIComponent(url)}`,
        { headers: { ...headers, Cookie: cookie } }
    )
    return res.data
}

function parseResponse(html) {
    const $ = cheerio.load(html)

    const stats = []
    $('#video-info .my-1 span').each((_, el) => {
        stats.push($(el).text().trim())
    })

    const data = {
        username: $('#video-info h3').first().text().trim(),
        views: stats[0] || null,
        likes: stats[1] || null,
        bookmarks: stats[2] || null,
        comments: stats[3] || null,
        shares: stats[4] || null,
        duration: $('#video-info p.text-muted').first().text().replace(/Duration:/i, '').trim() || null,
        type: null,
        downloads: { nowm: [], wm: [] },
        mp3: [],
        slides: []
    }

    const slides = $('.carousel-item[data-data]')

    if (slides.length) {
        data.type = 'photo'
        slides.each((_, el) => {
            try {
                const json = JSON.parse($(el).attr('data-data').replace(/&quot;/g, '"'))
                if (Array.isArray(json.URL)) {
                    json.URL.forEach(url => {
                        data.slides.push({ index: data.slides.length + 1, url })
                    })
                }
            } catch { /* parse skip */ }
        })
        return data
    }

    data.type = 'video'

    $('#formatselect option').each((_, el) => {
        const label = $(el).text().toLowerCase()
        const raw = $(el).attr('value')
        if (!raw) return

        try {
            const json = JSON.parse(raw.replace(/&quot;/g, '"'))
            if (!json.URL) return

            // Label opsi ikut disimpan ("download mp4 hd", "download mp4 [1080p]", …).
            // Tanpa label, semua URL terlihat sama dan kode lama memakai nowm[0]
            // begitu saja — padahal urutan opsi di halaman TIDAK dijamin
            // tertinggi dulu. Label inilah yang membuat pemilihan HD mungkin.
            if (label.includes('mp4') && !label.includes('watermark')) {
                json.URL.forEach((u) => data.downloads.nowm.push({ url: u, quality: label }))
            }
            if (label.includes('watermark')) {
                json.URL.forEach((u) => data.downloads.wm.push({ url: u, quality: label }))
            }
            if (label.includes('mp3')) {
                data.mp3.push(...json.URL)
            }
        } catch { /* parse skip */ }
    })

    return data
}

async function savett(url) {
    const { csrf, cookie } = await getToken()
    const html = await fetchTikTok(url, csrf, cookie)
    return parseResponse(html)
}

const pluginConfig = {
    // `ttmp4` DIBUANG dari sini. Nama itu juga dipakai tiktokdl.js, dan plugin
    // yang dimuat terakhir menimpa yang pertama — akibatnya `.ttmp4` menjalankan
    // tiktokdl2, bukan tiktokdl seperti yang tertulis di menu. Satu nama harus
    // dimiliki satu plugin.
    name: ['tiktok2', 'tt2', 'ttv2'],
    alias: ['tiktokdl2', 'ttdown2'],
    category: 'download',
    description: 'Download video/slide TikTok tanpa watermark',
    usage: '.tiktok2 <url>',
    example: '.tiktok2 https://vt.tiktok.com/xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const url = m.text?.trim()

    if (!url) {
        return m.reply(
            `╭┈┈⬡「 🎵 *ᴛɪᴋᴛᴏᴋ ᴅᴏᴡɴʟᴏᴀᴅ* 」\n` +
            `┃ ㊗ ᴜsᴀɢᴇ: \`${m.prefix}tiktok2 <url>\`\n` +
            `╰┈┈⬡\n\n` +
            `> Contoh: ${m.prefix}tiktok2 https://vt.tiktok.com/xxx`
        )
    }

    if (!url.match(/tiktok\.com|vt\.tiktok/i)) {
        return m.reply('❌ URL tidak valid. Gunakan link TikTok.')
    }

    m.react('⏱️')

    try {
        const result = await savett(url)

        const caption =
            `✅ *Done kak*\n\n` +
            `👤 *${result.username || '-'}*\n` +
            `👁️ Views: ${result.views || '-'} | ❤️ Likes: ${result.likes || '-'}\n` +
            `� Comments: ${result.comments || '-'} | 🔗 Shares: ${result.shares || '-'}\n` +
            `⏱️ Duration: ${result.duration || '-'}`

        if (result.type === 'video' && result.downloads.nowm.length > 0) {
            // Dulu: `nowm[0]` + `arraybuffer` + `Buffer.from`. Dua masalah —
            // (a) opsi pertama belum tentu resolusi tertinggi, (b) memuat video
            // penuh ke RAM. Sekarang kandidat diurutkan pakai label kualitas,
            // diunduh ke berkas, dipastikan H.264 (WA tidak bisa HEVC) tanpa
            // menurunkan resolusi/fps, lalu dikirim sebagai path (stream).
            // savett memberi URL CDN TikTok yang bertanda tangan, dan tanda tangan
            // itu tidak selalu berlaku untuk IP kita: diuji langsung, host
            // `v16-webapp-prime.us.tiktok.com` menjawab 403 sementara
            // `api16-normal-useastred.tiktokv.eu` menjawab 200 — untuk video yang
            // SAMA, hanya beda token. Karena itu kandidat tikwm ditambahkan
            // sebagai cadangan; ambilVideoHD mencoba berurutan dan berhenti di
            // yang pertama berhasil, jadi perintah tidak lagi mati total saat
            // CDN savett menolak.
            const kandidat = [...result.downloads.nowm]
            try {
                const cad = await axios.post('https://www.tikwm.com/api/', {}, {
                    headers: { 'User-Agent': headers['User-Agent'] },
                    params: { url, count: 12, cursor: 0, web: 1, hd: 1 },
                    timeout: 30000,
                })
                const d = cad.data?.data
                if (d?.hdplay) kandidat.push({ url: d.hdplay, quality: 'hd', size: d.hd_size, basis: 'https://www.tikwm.com' })
                if (d?.play) kandidat.push({ url: d.play, quality: 'sd', size: d.size, basis: 'https://www.tikwm.com' })
            } catch { /* cadangan gagal, lanjut dengan kandidat savett saja */ }

            const siap = await ambilVideoHD(kandidat, {
                referer: 'https://www.tiktok.com/'
            })
            try {
                await sock.sendMessage(
                    m.chat,
                    {
                        video: { url: siap.path },
                        mimetype: 'video/mp4',
                        caption: caption + `\n📺 Kualitas: *${ringkasKualitas(siap)}*`,
                    },
                    { quoted: m }
                )
            } finally {
                if (siap.temp) { try { fs.unlinkSync(siap.path) } catch {} }
            }

            m.react('✅')
            return
        }

        if (result.type === 'photo' && result.slides.length > 0) {
            await m.reply(`📸 *Mengirim ${result.slides.length} slide...*`)

            const mediaList = []
            for (let i = 0; i < result.slides.length; i++) {
                const imgUrl = result.slides[i].url
                if (!imgUrl) continue

                try {
                    const res = await axios.get(imgUrl, {
                        responseType: 'arraybuffer',
                        timeout: 30000
                    })
                    mediaList.push({
                        image: Buffer.from(res.data),
                        caption: i === 0 ? caption : ''
                    })
                } catch (e) {
                    console.error(`[TikTok2] Failed to download slide ${i}:`, e.message)
                }
            }

            if (mediaList.length === 0) {
                throw new Error('Gagal mengunduh gambar slide')
            }

            const opener = generateWAMessageFromContent(
                m.chat,
                {
                    messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                    albumMessage: {
                        expectedImageCount: mediaList.length,
                        expectedVideoCount: 0
                    }
                },
                {
                    userJid: jidNormalizedUser(sock.user.id),
                    quoted: m,
                    upload: sock.waUploadToServer
                }
            )

            await sock.relayMessage(opener.key.remoteJid, opener.message, {
                messageId: opener.key.id
            })

            for (const content of mediaList) {
                const msg = await generateWAMessage(
                    opener.key.remoteJid,
                    content,
                    { upload: sock.waUploadToServer }
                )

                msg.message.messageContextInfo = {
                    messageSecret: crypto.randomBytes(32),
                    messageAssociation: {
                        associationType: 1,
                        parentMessageKey: opener.key
                    }
                }

                await sock.relayMessage(msg.key.remoteJid, msg.message, {
                    messageId: msg.key.id
                })
            }

            if (result.mp3.length > 0) {
                await sock.sendMessage(
                    m.chat,
                    {
                        audio: { url: result.mp3[0] },
                        mimetype: 'audio/mpeg'
                    },
                    { quoted: m }
                )
            }

            m.react('✅')
            return
        }

        if (result.mp3.length > 0) {
            m.reply(`🍀 *NOTE*\n> Konten ini tidak memiliki video/slide, mengirim audio saja...`)
            await sock.sendMessage(
                m.chat,
                {
                    audio: { url: result.mp3[0] },
                    mimetype: 'audio/mpeg'
                },
                { quoted: m }
            )
            m.react('✅')
            return
        }

        throw new Error('Tidak ada media yang dapat diunduh')

    } catch (err) {
        console.error('[TikTokDL2] Error:', err)
        m.react('☢')
        m.reply(te(m.prefix, m.command, m.pushName))
    }
}

export { pluginConfig as config, handler }