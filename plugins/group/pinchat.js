const pluginConfig = {
    // Nama utama diganti dari 'pinchat' ke 'pinpesan'. Bukan kosmetik: nama
    // 'pinchat' juga dideklarasikan `plugins/owner/pinchat.js` (isOwner: true,
    // `sock.chatModify` = pin CHAT di daftar obrolan), dan berkas itu yang
    // menang. Akibatnya seluruh berkas ini mati — termasuk alias `.pinmsg` dan
    // `.pinpesan` yang malah mengeksekusi versi owner, jadi admin grup yang
    // mengetiknya ditolak "khusus owner", bukan mendapat pin pesan.
    //
    // Dua fitur ini memang berbeda dan dua-duanya sah: yang ini mem-pin PESAN
    // di dalam grup (`sock.sendMessage({ pin: key })`, admin grup boleh), yang
    // di owner/ mem-pin CHAT-nya. Karena itu solusinya ganti nama, bukan hapus.
    name: 'pinpesan',
    alias: ['pinmsg', 'pinmessage'],
    category: 'group',
    description: 'Pin pesan penting di grup',
    usage: '.pinpesan (reply pesan)',
    example: '.pinpesan',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true,
    isAdmin: true,
    isBotAdmin: true
};

async function handler(m, { sock, args }) {
    if (!m.quoted || !m.quoted.key || !m.quoted.key.id) {
        await m.reply(
            `⚠️ *ᴠᴀʟɪᴅᴀsɪ ɢᴀɢᴀʟ*\n\n` +
            `> Reply pesan yang ingin di-pin!\n\n` +
            `*Cara penggunaan:*\n` +
            `> Reply pesan → ketik \`.pinpesan\`\n` +
            `> Optional: \`.pinpesan 24\` (pin 24 jam)`
        );
        return;
    }
    
    let duration = 86400;
    if (args && args.length > 0 && args[0]) {
        const hours = parseInt(args[0]);
        if (!isNaN(hours) && hours >= 1 && hours <= 720) {
            duration = hours * 3600;
        }
    }
    
    try {
        const pinKey = {
            remoteJid: m.chat,
            fromMe: m.quoted.key.fromMe || false,
            id: m.quoted.key.id,
            participant: m.quoted.key.participant || m.quoted.sender
        };
        
        await sock.sendMessage(m.chat, {
            pin: pinKey,
            type: 1,
            time: duration
        });
        
        const durationText = duration >= 86400 
            ? `${Math.floor(duration / 86400)} hari` 
            : `${Math.floor(duration / 3600)} jam`;
        
        const successMsg = `✅ Success pin pesan ini`;
        await m.reply(successMsg, { mentions: [m.sender] })
        
    } catch (error) {
        await m.reply(
            `❌ *ᴇʀʀᴏʀ*\n\n` +
            `> Gagal mem-pin pesan.\n` +
            `> _${error.message}_`
        );
    }
}

export { pluginConfig as config, handler }