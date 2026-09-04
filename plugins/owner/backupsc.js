import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import config from "../../config.js";
import te from "../../src/lib/hillz-error.js";
import {
  kumpulkanBerkas,
  pengaturanTersanitasi,
  ringkas,
} from "../../src/lib/hillz-backup-rules.js";

const pluginConfig = {
  name: "backupsc",
  alias: ["backup", "backupscript", "backupsource"],
  category: "owner",
  description: "Backup script bot dalam bentuk zip (bot + web + panel admin)",
  usage: ".backupsc",
  example: ".backupsc",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 60,
  energi: 0,
  isEnabled: true,
};

// Batas dokumen WhatsApp. Baileys membaca SELURUH berkas ke RAM sebelum
// mengunggah, jadi zip raksasa bukan cuma gagal kirim — ia bisa membunuh proses
// bot. Diperiksa SEBELUM upload, bukan dibiarkan gagal di tengah.
const BATAS_KIRIM = 90 * 1024 * 1024;

function getBackupOutputDir(projectRoot) {
  const backupDir = path.join(projectRoot, "backups", "script");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  return backupDir;
}

async function handler(m, { sock }) {
  await m.react("🕕");

  const projectRoot = process.cwd();

  // Hitung isi DULU, sebelum menulis apa pun. Kalau ada bagian wajib yang
  // hilang (mis. panel admin), owner tahu sebelum menunggu zip selesai.
  const daftar = kumpulkanBerkas(projectRoot);
  const info = ringkas(daftar, projectRoot);

  await m.reply(
    `📦 *ʙᴀᴄᴋᴜᴘ sᴄʀɪᴘᴛ*\n\n` +
      `> ${info.total} berkas (${(info.bytes / 1048576).toFixed(1)} MB) sedang di-zip...\n` +
      `> Isi: bot + web + panel admin + plugins + database\n` +
      (info.hilang.length ? `> ⚠ bagian hilang: ${info.hilang.join(", ")}\n` : "") +
      `> Mohon tunggu...`,
  );

  try {
    const timestamp = moment().tz("Asia/Jakarta").format("YYYY-MM-DD_HH-mm-ss");
    const botName =
      config.bot?.name?.replace(/[^a-zA-Z0-9]/g, "") || "SHIROWAHD";
    const zipFileName = `${botName}_backup_${timestamp}.zip`;
    const backupDir = getBackupOutputDir(projectRoot);
    const zipFilePath = path.join(backupDir, zipFileName);

    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    let fileCount = 0;

    await new Promise((resolve, reject) => {
      let settled = false;
      const fail = (error) => {
        if (settled) return;
        settled = true;
        try { output.destroy(); } catch { /* cleanup */ }
        try { if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath); } catch { /* cleanup */ }
        reject(error);
      };
      const succeed = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      output.on("error", fail);
      output.on("close", () => {
        try {
          if (!fs.existsSync(zipFilePath)) {
            fail(new Error("File backup tidak ditemukan setelah proses zip"));
            return;
          }
          if (fs.statSync(zipFilePath).size <= 0) {
            fail(new Error("File backup kosong atau 0KB"));
            return;
          }
          succeed();
        } catch (error) {
          fail(error);
        }
      });
      archive.on("error", fail);
      archive.on("warning", (error) => {
        if (error?.code !== "ENOENT") fail(error);
      });
      archive.pipe(output);

      // Berkas biasa, memakai aturan bersama (satu sumber kebenaran).
      for (const b of daftar) {
        archive.file(b.penuh, { name: b.rel });
        fileCount += 1;
      }

      // Pengaturan panel admin IKUT, tapi versi tersanitasi: password admin dan
      // token Telegram diganti penanda. Tanpa ini, memulihkan backup berarti
      // mengatur ulang seluruh panel dari nol; dengan versi mentah, zip yang
      // beredar di chat membocorkan password.
      const bersih = pengaturanTersanitasi(projectRoot);
      if (bersih) {
        archive.append(bersih, { name: "admin-settings.sanitized.json" });
        fileCount += 1;
      }

      // Petunjuk pemulihan di dalam zip itu sendiri.
      archive.append(
        [
          "CARA MEMULIHKAN BACKUP INI",
          "==========================",
          "",
          `Dibuat  : ${moment().tz("Asia/Jakarta").format("DD/MM/YYYY HH:mm")} WIB`,
          `Berkas  : ${fileCount}`,
          "",
          "Isi zip: kode bot, web frontend (Next.js), panel admin, plugins,",
          "database, installer, dan template .env.",
          "",
          "TIDAK ADA di zip ini (memang disengaja):",
          "  - .env                  → kredensial; salin manual",
          "  - admin-settings.json   → password admin; lihat versi .sanitized",
          "  - storage/session       → sesi WhatsApp; pakai migrate.sh (scp)",
          "  - node_modules          → jalankan `npm install`",
          "",
          "Langkah:",
          "  1. Ekstrak zip ke folder tujuan",
          "  2. npm install --omit=dev",
          "  3. cd web && npm install && npx next build",
          "  4. cp .env.example .env  lalu isi",
          "  5. mv admin-settings.sanitized.json admin-settings.json",
          "     (ganti __DIISI_LEWAT_ENV__ dengan nilai asli, atau isi lewat .env)",
          "  6. pm2 start web-uploader.js --name web",
          "  7. pm2 start main.js --name main",
          "  8. Buka /admin → tab BOT WA → Pairing Perangkat → tautkan nomor",
          "",
          "Cara lebih cepat: jalankan `bash install.sh` di VPS baru.",
        ].join("\n"),
        { name: "CARA-PULIHKAN.txt" },
      );
      fileCount += 1;

      if (fileCount === 0) {
        fail(new Error("Tidak ada file yang masuk ke backup script"));
        return;
      }
      archive.finalize();
    });

    const stats = fs.statSync(zipFilePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    // Gerbang ukuran: lapor jujur alih-alih mencoba unggah lalu mati.
    if (stats.size > BATAS_KIRIM) {
      await m.react("⚠");
      await m.reply(
        `⚠ *ʙᴀᴄᴋᴜᴘ ᴛᴇʀʟᴀʟᴜ ʙᴇsᴀʀ*\n\n` +
          `Ukuran \`${fileSizeMB} MB\` melewati batas kirim WhatsApp (~90 MB).\n` +
          `Zip TETAP tersimpan di VPS:\n\`${zipFilePath}\`\n\n` +
          `Ambil lewat: \`scp root@<ip>:${zipFilePath} .\``,
      );
      return;
    }

    const bagian = info.perBagian
      .slice(0, 6)
      .map(([k, v]) => `┃ ${k} ${v.n}`)
      .join("\n");
    const saluranId = config.saluran?.id || "120363413208281480@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "SHIROWAHD";

    await sock.sendMessage(
      m.chat,
      {
        document: fs.readFileSync(zipFilePath),
        fileName: zipFileName,
        mimetype: "application/zip",
        caption:
          `✅ *ʙᴀᴄᴋᴜᴘ sᴇʟᴇsᴀɪ*\n\n` +
          `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
          `┃ 📝 \`${zipFileName}\`\n` +
          `┃ 📊 sɪᴢᴇ: \`${fileSizeMB} MB\`\n` +
          `┃ 📁 ꜰɪʟᴇ: \`${fileCount}\`\n` +
          `┃ 📅 \`${moment().tz("Asia/Jakarta").format("DD/MM/YYYY HH:mm")}\`\n` +
          `╰┈┈⬡\n\n` +
          `╭┈┈⬡「 📂 *ɪsɪ* 」\n${bagian}\n╰┈┈⬡\n\n` +
          (info.hilang.length
            ? `⚠ bagian hilang: ${info.hilang.join(", ")}\n\n`
            : `✓ lengkap: bot + web + panel admin\n\n`) +
          `> Sesi WA & .env TIDAK ikut (kredensial).\n` +
          `> Baca \`CARA-PULIHKAN.txt\` di dalam zip.`,
        contextInfo: {
          forwardingScore: 9999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: saluranId,
            newsletterName: saluranName,
            serverMessageId: 127,
          },
        },
      },
      { quoted: m },
    );

    await m.react("✅");

    try { fs.unlinkSync(zipFilePath); } catch { /* cleanup */ }
  } catch (error) {
    await m.react("☢");
    // Pesan error nyata dilaporkan, bukan ditelan template generik. Dulu setiap
    // kegagalan tampak sama sehingga tidak mungkin didiagnosis dari chat.
    const pesan = String(error?.message || error).slice(0, 200);
    await m.reply(`☢ *ʙᴀᴄᴋᴜᴘ ɢᴀɢᴀʟ*\n\n\`${pesan}\`\n\n${te(m.prefix, m.command, m.pushName)}`);
  }
}

export { pluginConfig as config, handler };
