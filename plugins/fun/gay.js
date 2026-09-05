import config from '../../config.js'
const pluginConfig = {
    // Nama utama diganti dari 'gay' ke 'ngegay', dan alias .howgay dilepas.
    // Alasannya: 'gay' juga ada di daftar 52 nama `plugins/fun/siapa.js`
    // (baris 5), dan berkas itu yang menang, jadi berkas ini mati sepenuhnya —
    // termasuk `.howgay` yang cuma ditulis di sini tapi mengeksekusi siapa.js.
    //
    // Dua-duanya fitur berbeda dan dua-duanya sah: siapa.js menunjuk SATU
    // member ("siapa yang paling X"), berkas ini memasangkan DUA member. Karena
    // itu ganti nama, bukan hapus. `.howgay` sengaja tidak dipakai lagi supaya
    // tidak lagi bertabrakan dengan pola nama siapa.js.
    name: 'ngegay',
    alias: ['gaycouple'],
    category: 'fun',
    description: 'Memasangkan dua member grup secara acak',
    usage: '.ngegay',
    isGroup: true,
    isBotAdmin: false,
    isAdmin: false,
    cooldown: 10,
    energi: 2,
    isEnabled: true
};

async function handler(m, { sock }) {
    if (!m.isGroup) return m.reply(config.messages.groupOnly);
    const groupMetadata = m.groupMetadata;
    const participants = groupMetadata.participants;
    const member = participants.map(u => u.jid);
    const orang1 = member[Math.floor(Math.random() * member.length)];
    const orang2 = member[Math.floor(Math.random() * member.length)];
    const text = `@${orang1.split('@')[0]} *Nge gay sama* @${orang2.split('@')[0]}`;
    await m.reply(text, { mentions: [orang1, orang2] })
}

export { pluginConfig as config, handler }