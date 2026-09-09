import fs from "fs";
import path from "path";
import { hotReloadPlugin } from "../../src/lib/hillz-plugins.js";
import te from "../../src/lib/hillz-error.js";

const pluginConfig = {
  name: "addplugin",
  alias: ["addpl", "tambahplugin"],
  category: "owner",
  description: "Tambah plugin baru dari code yang di-reply",
  usage: ".addplugin [namafile] [folder]",
  example: ".addplugin bliblidl downloader",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function extractPluginInfo(code) {
  const info = { name: null, category: null };
  const nameMatch = code.match(/name:\s*['"`]([^'"`]+)['"]/i);
  if (nameMatch) info.name = nameMatch[1];
  const categoryMatch = code.match(/category:\s*['"`]([^'"`]+)['"]/i);
  if (categoryMatch) info.category = categoryMatch[1];
  return info;
}

async function handler(m, { sock }) {
  const quoted = m.quoted;

  if (!quoted) {
    return m.reply(
      `Halo *${m.pushName}*, sepertinya kamu belum mereply kode atau berkas pluginnya.\n\n` +
      `Silakan reply pesan dengan perintah:\n` +
      `- .addplugin (reply kode / file .js / file .zip)\n` +
      `- .addplugin <nama file> (untuk nama kustom)\n` +
      `- .addplugin <nama file> <folder> (untuk nama dan folder kustom)`
    );
  }

  // Dukung instalasi massal dari arsip berkas .ZIP
  const isZip =
    quoted.fileName?.endsWith(".zip") ||
    quoted.filename?.endsWith(".zip") ||
    quoted.mimetype?.includes("zip");

  if (isZip) {
    await m.react("⏳");
    let zipBuffer = null;
    try {
      zipBuffer = await quoted.download();
    } catch (e) {
      await m.react("❌");
      return m.reply("❌ Gagal mengunduh berkas ZIP dari WhatsApp.");
    }

    if (!zipBuffer || !zipBuffer.length) {
      await m.react("❌");
      return m.reply("❌ Berkas ZIP kosong atau rusak.");
    }

    try {
      const AdmZip = (await import("adm-zip")).default;
      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();
      const installed = [];
      const failed = [];
      const pluginsDir = path.join(process.cwd(), "plugins");

      for (const entry of entries) {
        if (entry.isDirectory || !entry.entryName.endsWith(".js")) continue;
        const entryCode = zip.readAsText(entry);
        if (!entryCode || entryCode.length < 30) continue;

        // Validasi export
        if (!entryCode.includes("export ") && !entryCode.includes("module.exports")) continue;

        // Sanitasi path (anti traversal)
        const cleanPath = entry.entryName.replace(/^\/+/, "").replace(/\.\./g, "");
        const parts = cleanPath.split("/").filter(Boolean);
        let folderName = parts.length > 1 ? parts[parts.length - 2] : null;
        let fileName = path.basename(cleanPath, ".js");

        const info = extractPluginInfo(entryCode);
        if (!folderName) folderName = info.category || "other";
        if (!fileName) fileName = info.name || `plugin_${Date.now()}`;

        folderName = folderName.toLowerCase().replace(/[^a-z0-9\-_]/g, "");
        fileName = fileName.toLowerCase().replace(/[^a-z0-9\-_]/g, "");

        const targetFolder = path.join(pluginsDir, folderName);
        if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });

        const targetFile = path.join(targetFolder, `${fileName}.js`);
        fs.writeFileSync(targetFile, entryCode);

        try {
          await hotReloadPlugin(targetFile);
          installed.push(`${folderName}/${fileName}.js`);
        } catch {
          failed.push(`${folderName}/${fileName}.js`);
        }
      }

      await m.react("✅");
      let msg =
        `╭┈┈⬡「 📦 *ɪɴsᴛᴀʟʟ ᴘʟᴜɢɪɴ ᴢɪᴘ* 」\n` +
        `┃ ✅ *Berhasil Dipasang:* ${installed.length} modul\n`;
      if (failed.length > 0) msg += `┃ ⚠️ *Gagal Reload:* ${failed.length} modul\n`;
      msg += `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n`;

      if (installed.length > 0) {
        msg += `*Daftar Modul Terpasang:*\n`;
        installed.slice(0, 15).forEach((p) => {
          msg += `> • \`${p}\`\n`;
        });
        if (installed.length > 15) {
          msg += `> _...dan ${installed.length - 15} modul lainnya._\n`;
        }
        msg += `\n✨ Seluruh plugin baru sudah aktif dan siap digunakan!`;
      } else {
        msg += `Tidak ada berkas plugin .js yang valid ditemukan di dalam arsip ZIP.`;
      }
      return m.reply(msg);
    } catch (err) {
      await m.react("❌");
      return m.reply(`❌ Gagal mengekstrak arsip ZIP: ${err.message}`);
    }
  }

  let code = quoted.text || quoted.body || "";

  // Dukung unduh berkas .js / text dari dokumen WhatsApp
  if (
    quoted.mimetype?.includes("javascript") ||
    quoted.mimetype?.includes("text") ||
    quoted.mimetype?.includes("octet-stream") ||
    quoted.fileName?.endsWith(".js") ||
    quoted.filename?.endsWith(".js") ||
    quoted.mtype === "documentMessage"
  ) {
    try {
      const downloaded = await quoted.download();
      if (downloaded && downloaded.length > 0) {
        code = downloaded.toString("utf-8");
      }
    } catch (e) {
      // jika gagal download buffer, fallback ke text
    }
  }

  // Bersihkan markdown code blocks (```javascript ... ```) jika di-copy langsung dari chat
  code = code.trim().replace(/^```(?:javascript|js)?\r?\n([\s\S]*?)\r?\n```$/i, "$1").trim();

  if (!code || code.length < 50) {
    return m.reply(`Maaf *${m.pushName}*, proses gagal karena kode terlalu pendek atau tidak valid.`);
  }

  const hasExport = code.includes("module.exports") || code.includes("export ");
  const hasConfig = code.includes("pluginConfig") || code.includes("config");
  if (!hasExport || !hasConfig) {
    return m.reply(
      `Maaf *${m.pushName}*, proses gagal karena kode bukan format plugin yang valid. Pastikan ada export dan config di dalamnya.`
    );
  }

  const extracted = extractPluginInfo(code);
  const args = m.args;

  let fileName = args[0] || extracted.name;
  let folderName = args[1] || extracted.category;

  if (!fileName) {
    return m.reply(
      `Maaf *${m.pushName}*, aku tidak bisa mendeteksi nama pluginnya. Silakan gunakan perintah dengan format .addplugin <nama file>.`
    );
  }

  if (!folderName) folderName = "other";

  fileName = fileName.toLowerCase().replace(/[^a-z0-9\-_]/g, "");
  folderName = folderName.toLowerCase().replace(/[^a-z0-9\-_]/g, "");

  if (!fileName) {
    return m.reply(`Maaf *${m.pushName}*, proses gagal karena nama file tidak valid.`);
  }

  await m.react("🕕");

  try {
    const pluginsDir = path.join(process.cwd(), "plugins");
    const folderPath = path.join(pluginsDir, folderName);
    const filePath = path.join(folderPath, `${fileName}.js`);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      await m.react("❌");
      return m.reply(
        `Maaf *${m.pushName}*, file ${fileName}.js sudah ada di folder ${folderName}.\n\n` +
        `💡 Tips: Gunakan perintah .ganticode ${fileName} ${folderName} jika kamu ingin mengganti kode plugin yang sudah ada.`
      );
    }

    fs.writeFileSync(filePath, code);

    let reloadResult = { success: false };
    try {
      reloadResult = (await hotReloadPlugin(filePath)) || { success: true };
    } catch { /* reload optional */ }

    await m.react("✅");
    let replyText =
      `Proses selesai! Plugin berhasil ditambahkan ke dalam sistem.\n\n` +
      `- File: ${fileName}.js\n` +
      `- Folder: ${folderName}\n` +
      `- Ukuran: ${code.length} bytes\n` +
      `- Status Reload: ${reloadResult.success ? "Berhasil" : "Pending"}\n\n` +
      `Plugin sudah aktif dan siap digunakan, silakan dicoba ya!`;

    return m.reply(replyText);
  } catch (error) {
    await m.react("☢");
    await m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
