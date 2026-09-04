import axios from "axios";
import { ambilVideoHD, ringkasKualitas } from "../../src/lib/hillz-hdmedia.js";
import fs from "fs";

async function tiktokDl(url) {
  function formatNumber(integer) {
    let numb = parseInt(integer);
    return Number(numb).toLocaleString().replace(/,/g, ".");
  }

  function formatDate(n, locale = "en") {
    let d = new Date(n);
    return d.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
  }

  let data = [];
  const domain = "https://www.tikwm.com/api/";
  const balasan = (
    await axios.post(
      domain,
      {},
      {
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Origin: "https://www.tikwm.com",
          Referer: "https://www.tikwm.com/",
          "Sec-Ch-Ua": '"Not)A;Brand" ;v="24" , "Chromium" ;v="116"',
          "Sec-Ch-Ua-Mobile": "?1",
          "Sec-Ch-Ua-Platform": "Android",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
          "X-Requested-With": "XMLHttpRequest",
        },
        params: { url, count: 12, cursor: 0, web: 1, hd: 1 },
      },
    )
  ).data;

  // tikwm membalas HTTP 200 walau gagal — kegagalan ada di dalam badan JSON
  // (`{"code":-1,"msg":"Url parsing is failed! Please check url."}`) dan `data`
  // bernilai null. Kode lama langsung mengambil `.data.data` lalu menyentuh
  // `res.title`, jadi yang muncul di log adalah
  // `TypeError: Cannot read properties of undefined (reading 'title')` —
  // pesan yang tidak menyebut TikTok sama sekali dan menyesatkan saat dibaca.
  // Sekarang penyebab aslinya dilempar apa adanya supaya `catch` di handler
  // bisa memberi tahu pengguna alasan yang benar.
  const res = balasan?.data;
  if (!res || balasan?.code !== 0) {
    const alasan = balasan?.msg || "tanpa keterangan";
    throw new Error(`tikwm menolak tautan ini: ${alasan}`);
  }

  if (res?.duration == 0) {
    res.images.forEach((v) => data.push({ type: "photo", url: v }));
  } else {
    // URL disimpan APA ADANYA (tanpa concat basis). tikwm kadang mengembalikan
    // URL absolut CDN, kadang path relatif; concat buta menghasilkan
    // "https://www.tikwm.comhttps://v16m…" → ENOTFOUND, unduhan gagal dan
    // pengirim jatuh ke kandidat resolusi lebih rendah. `basis` diteruskan ke
    // ambilVideoHD dan hanya dipakai bila URL-nya memang relatif.
    // `size` disertakan sebagai petunjuk pemilihan kualitas.
    if (res?.wmplay) data.push({ type: "watermark", url: res.wmplay, size: res.wm_size });
    if (res?.play) data.push({ type: "nowatermark", url: res.play, size: res.size });
    if (res?.hdplay) data.push({ type: "nowatermark_hd", url: res.hdplay, size: res.hd_size });
  }

  return {
    status: true,
    title: res.title,
    taken_at: formatDate(res.create_time).replace("1970", ""),
    region: res.region,
    id: res.id,
    durations: res.duration,
    duration: res.duration + " Seconds",
    cover: "https://www.tikwm.com" + res.cover,
    size_wm: res.wm_size,
    size_nowm: res.size,
    size_nowm_hd: res.hd_size,
    data,
    music_info: {
      id: res.music_info.id,
      title: res.music_info.title,
      author: res.music_info.author,
      album: res.music_info.album || null,
      // Tanda kurung wajib: `"a" + x || y` dievaluasi sebagai `("a" + x) || y`,
      // dan string non-kosong selalu truthy → fallback music_info.play tidak pernah jalan.
      url: res.music ? "https://www.tikwm.com" + res.music : res.music_info?.play,
    },
    stats: {
      views: formatNumber(res.play_count),
      likes: formatNumber(res.digg_count),
      comment: formatNumber(res.comment_count),
      share: formatNumber(res.share_count),
      download: formatNumber(res.download_count),
    },
    author: {
      id: res.author.id,
      fullname: res.author.unique_id,
      nickname: res.author.nickname,
      avatar: "https://www.tikwm.com" + res.author.avatar,
    },
  };
}

const pluginConfig = {
  name: ["tiktok", "tt", "ttmp4"],
  alias: ["tiktokdl", "ttdown"],
  category: "download",
  description: "Download video/slide TikTok tanpa watermark",
  usage: ".tiktok <url>",
  example: ".tiktok https://vt.tiktok.com/xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text?.trim();
  const prefix = m.prefix;
  const command = m?.command;
  if (!text) {
    m.react("❌");
    return m.reply(
      `📌 Contoh: *${prefix + command} https://vt.tiktok.com/...*`,
    );
  }
  m.react("🕕");
  try {
    const result = await tiktokDl(text);

    const musicButton = {
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: "🎵 Ambil Music",
        id: `${prefix}ttmp3 ${text}`,
      }),
    };

    if (result.durations > 0 && result.duration !== "0 Seconds") {
      // BUG LAMA: `find(e => e.type === "nowatermark_hd" || e.type === "nowatermark")`
      // berhenti di elemen PERTAMA yang memenuhi salah satu syarat. Urutan array
      // adalah [watermark, nowatermark, nowatermark_hd], jadi yang selalu terpilih
      // `nowatermark` = 576x1024, sementara HD 1080x1920 tidak pernah terpakai.
      // Diukur di tikwm: SD 576x1024 vs HD 1080x1920 (3,5x piksel, ukuran mirip).
      //
      // Sekarang: kandidat diurutkan berdasarkan kualitas, diunduh, lalu
      // dipastikan kompatibel WA. hdplay TikTok berisi HEVC — WhatsApp hanya bisa
      // H.264, jadi memilih HD saja tidak cukup, harus dikonversi TANPA
      // menurunkan resolusi/fps.
      const siap = await ambilVideoHD(result.data, {
        referer: "https://www.tiktok.com/",
        basis: "https://www.tikwm.com",
      });

      const caption =
        `🎵 *𝗧 𝗜 𝗞 𝗧 𝗢 𝗞  -  𝗗 𝗢 𝗪 𝗡 𝗟 𝗢 𝗔 𝗗 𝗘 𝗥*\n\n` +
        `- Author: *${result.author.nickname}* (${result.author.fullname})\n` +
        `- Caption: ${result.title || "-"}\n` +
        `- Music: ${result.music_info.title} - ${result.music_info.author}\n` +
        `- Duration: ${result.duration}\n` +
        `- Uploaded: ${result.taken_at}\n` +
        `- Region: ${result.region}\n\n` +
        `*Statistik Video:*\n` +
        `- Views: *${result.stats.views}*\n` +
        `- Likes: *${result.stats.likes}*\n` +
        `- Comments: *${result.stats.comment}*\n` +
        `- Shares: *${result.stats.share}*\n` +
        `- Downloads: *${result.stats.download}*`;

      const captionHD = caption + `\n\n- Kualitas: *${ringkasKualitas(siap)}*`;
      try {
        // Dikirim sebagai path berkas, bukan { url }: berkasnya sudah diperiksa
        // codec + decode-nya di sini, sesuatu yang tidak mungkin bila Baileys
        // mengunduh sendiri dari URL.
        await sock.sendButton(m.chat, siap.path, captionHD, m, {
          type: "video",
          buttons: [musicButton],
        });
      } finally {
        if (siap.temp) { try { fs.unlinkSync(siap.path); } catch {} }
      }
    } else {
      const caption =
        `📸 *𝗧 𝗜 𝗞 𝗧 𝗢 𝗞  -  𝗗 𝗢 𝗪 𝗡 𝗟 𝗢 𝗔 𝗗 𝗘 𝗥*\n\n` +
        `- Author: *${result.author.nickname}* (${result.author.fullname})\n` +
        `- Caption: ${result.title || "-"}\n` +
        `- Music: ${result.music_info.title} - ${result.music_info.author}\n` +
        `- Uploaded: ${result.taken_at}\n` +
        `- Region: ${result.region}\n\n` +
        `*Statistik Konten:*\n` +
        `- Views: *${result.stats.views}*\n` +
        `- Likes: *${result.stats.likes}*\n` +
        `- Comments: *${result.stats.comment}*\n` +
        `- Shares: *${result.stats.share}*\n` +
        `- Downloads: *${result.stats.download}*`;

      const slides = result.data?.map((zan, idx) => ({
        image: { url: zan.url },
        caption: idx === 0 ? caption : "",
      })) || [];
      await sock.sendMessage(
        m.chat,
        {
          albumMessage: slides,
        },
        { quoted: m },
      );

      await sock.sendButton(m.chat, null, `📸 Slide berhasil dikirim!\nTekan tombol di bawah untuk ambil music.`, m, {
        buttons: [musicButton],
      });
    }
    m.react("✅");
  } catch (e) {
    console.error(e);
    m.react("❌");
    // Tautan yang ditolak tikwm (bukan tautan TikTok, video privat, sudah
    // dihapus) BUKAN gangguan sementara — menyuruh pengguna "coba lagi nanti"
    // membuat mereka menunggu sesuatu yang tidak akan pernah berhasil.
    const ditolak = /tikwm menolak tautan ini/.test(e?.message || "");
    m.reply(
      ditolak
        ? `Tautannya tidak bisa diproses.\n\n${e.message}\n\nPastikan tautan TikTok-nya benar dan videonya publik.`
        : "Coba lagi nanti, atau bisa coba " + m.prefix + "tt2",
    );
  }
}

export { pluginConfig as config, handler };
