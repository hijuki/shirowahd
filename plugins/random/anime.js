import axios from "axios";
import te from "../../src/lib/hillz-error.js";
import { prepareWAMessageMedia, generateWAMessageFromContent } from "hillz";

const nexrayTypes = [
  "waifu", "neko", "shinobu", "megumin", "bully", "cuddle", "cry", "hug",
  "awoo", "kiss", "lick", "pat", "smug", "bonk", "yeet", "blush", "smile",
  "wave", "highfive", "handhold", "nom", "bite", "glomp", "slap", "kill",
  "happy", "wink", "poke", "dance", "cringe"
];

// Daftar di atas dipakai untuk DUA hal sekaligus: nama command dan nilai
// `?type=` ke api.nexray.eu.cc. Keduanya tidak selalu bisa sama.
//
// `wink` adalah kasusnya: nama `.wink` juga dideklarasikan
// `plugins/tools/wink.js` (peningkat kualitas video Wink AI, plus alias
// .winkenhance/.winkhd/.wenhance) dan berkas ITU yang menang di registry.
// Akibatnya reaksi anime `wink` tidak pernah bisa dipanggil — satu dari 31
// reaksi mati diam-diam.
//
// Yang TIDAK boleh dilakukan: mengganti isi `nexrayTypes`, karena nilainya
// dikirim mentah ke API. Jadi nama command-nya saja yang dipetakan.
const NAMA_ALTERNATIF = { winkanime: "wink" };
const namaCommand = nexrayTypes.filter((t) => !Object.values(NAMA_ALTERNATIF).includes(t));

const pluginConfig = {
  name: ["loli", ...namaCommand, ...Object.keys(NAMA_ALTERNATIF)],
  alias: [],
  category: "random",
  description: "Random gambar anime/reaction (Nexray Source)",
  usage: ".<nama> (lihat daftar di bawah)",
  example: ".waifu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const cmd = m.command.toLowerCase();

    if (cmd === "loli") {
      return await sock.sendMessage(
        m.chat,
        {
          image: { url: "https://api.nexray.web.id/random/loli" },
          caption: `👧 *ʀᴀɴᴅᴏᴍ ʟᴏʟɪ*`,
        },
        { quoted: m },
      );
    }

    // `.winkanime` harus diterjemahkan kembali ke type `wink` sebelum dikirim ke
    // API — namanya diganti karena tabrakan, endpoint-nya tidak.
    const tipe = NAMA_ALTERNATIF[cmd] || cmd;

    if (nexrayTypes.includes(tipe)) {
      m.react("🖼️");
      const res = await axios.get(`https://api.nexray.eu.cc/random/anime?type=${tipe}`, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(res.data);
      const isGif = buffer.length > 3 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46; // "GIF"
      
      const media = await prepareWAMessageMedia(
        isGif ? { video: buffer, gifPlayback: true } : { image: buffer },
        { upload: sock.waUploadToServer }
      );
      
      const msg = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: {
              body: { text: `✨ *ʀᴀɴᴅᴏᴍ ${cmd.toUpperCase()}*` },
              footer: { text: "Tekan tombol di bawah untuk memuat gambar lain" },
              header: {
                hasMediaAttachment: true,
                ...(isGif ? { videoMessage: media.videoMessage } : { imageMessage: media.imageMessage })
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: "Lanjut Cari Lagi?",
                      id: `${m.prefix}${cmd}`
                    })
                  }
                ]
              }
            }
          }
        }
      }, { quoted: m });
      
      return await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    }

  } catch (err) {
    m.react("☢");
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
