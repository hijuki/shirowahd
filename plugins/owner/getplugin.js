import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import config from "../../config.js";
const pluginConfig = {
  name: "getplugin",
  alias: ["gp", "getcode", "plugincode", "sourcecode"],
  category: "owner",
  description: "Dapatkan source code plugin",
  usage: ".getplugin <nama plugin>",
  example: ".getplugin menu",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function searchPlugin(name, pluginsDir) {
  const categories = fs.readdirSync(pluginsDir).filter((f) => {
    return fs.statSync(path.join(pluginsDir, f)).isDirectory();
  });

  for (const category of categories) {
    const categoryPath = path.join(pluginsDir, category);
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const baseName = file.replace(".js", "").toLowerCase();
      if (baseName === name.toLowerCase()) {
        return {
          path: path.join(categoryPath, file),
          category,
          file,
        };
      }
    }
  }

  for (const category of categories) {
    const categoryPath = path.join(pluginsDir, category);
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const aliasMatch = content.match(/alias:\s*\[([^\]]+)\]/);
        if (aliasMatch) {
          const aliases = aliasMatch[1].match(/['"`]([^'"`]+)['"`]/g);
          if (aliases) {
            const cleanAliases = aliases.map((a) =>
              a.replace(/['"`]/g, "").toLowerCase(),
            );
            if (cleanAliases.includes(name.toLowerCase())) {
              return {
                path: filePath,
                category,
                file,
              };
            }
          }
        }
      } catch { /* ignored */ }
    }
  }

  return null;
}

function getSimilarPlugins(name, pluginsDir) {
  const results = [];
  const categories = fs.readdirSync(pluginsDir).filter((f) => {
    return fs.statSync(path.join(pluginsDir, f)).isDirectory();
  });

  for (const category of categories) {
    const categoryPath = path.join(pluginsDir, category);
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const baseName = file.replace(".js", "").toLowerCase();
      if (
        baseName.includes(name.toLowerCase()) ||
        name.toLowerCase().includes(baseName)
      ) {
        results.push(`${category}/${file}`);
      }
    }
  }

  return results.slice(0, 5);
}

async function handler(m, { sock }) {
  if (!config.isOwner(m.sender)) {
    return m.reply("❌ *Owner Only!*");
  }

  const rawArg = (m.args?.[0] || "").trim();
  const isZipRequested = m.args?.some((a) => /^(zip|--zip|-z)$/i.test(a));

  if (!rawArg) {
    return m.reply(
      `╭┈┈⬡「 📦 *ɢᴇᴛ ᴘʟᴜɢɪɴ* 」\n` +
      `┃ ㊗ *Format Single:* \`${m.prefix}getplugin <nama plugin>\`\n` +
      `┃ ㊗ *Format Kategori:* \`${m.prefix}getplugin <kategori> zip\`\n` +
      `┃ ㊗ *Format Semua:* \`${m.prefix}getplugin all zip\`\n` +
      `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n` +
      `*Contoh:*\n` +
      `> \`${m.prefix}getplugin menu\`\n` +
      `> \`${m.prefix}getplugin ai zip\`\n` +
      `> \`${m.prefix}getplugin all zip\``
    );
  }

  const pluginsDir = path.join(process.cwd(), "plugins");

  // Mode ZIP: Seluruh Plugin (all / semua)
  if (rawArg.toLowerCase() === "all" || rawArg.toLowerCase() === "semua") {
    await m.react("⏳");
    try {
      const zip = new AdmZip();
      zip.addLocalFolder(pluginsDir, "plugins");
      const zipBuffer = zip.toBuffer();
      const zipName = `shirowahd_all_plugins_${Date.now()}.zip`;

      await sock.sendMessage(
        m.chat,
        {
          document: zipBuffer,
          mimetype: "application/zip",
          fileName: zipName,
          caption:
            `╭┈┈⬡「 📦 *ɢᴇᴛ ᴀʟʟ ᴘʟᴜɢɪɴs ᴢɪᴘ* 」\n` +
            `┃ 📦 *Koleksi:* Seluruh Plugin Bot\n` +
            `┃ ⚖️ *Ukuran:* ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB\n` +
            `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n` +
            `> 💡 _Bisa langsung di-reply dengan \`${m.prefix}addplugin\` untuk batch install ke bot lain._`,
        },
        { quoted: m }
      );
      await m.react("✅");
      return;
    } catch (err) {
      await m.react("❌");
      return m.reply(`❌ Gagal mengompresi plugin: ${err.message}`);
    }
  }

  // Mode ZIP: Per Kategori (misal: .getplugin ai zip ATAU .getplugin ai)
  const catFolder = path.join(pluginsDir, rawArg.toLowerCase());
  if (
    fs.existsSync(catFolder) &&
    fs.statSync(catFolder).isDirectory() &&
    (isZipRequested || !rawArg.endsWith(".js"))
  ) {
    // Cek apakah ada file spesifik bernama sama di kategori lain, jika tidak ada atau minta zip -> ekspor folder
    const hasSpecificFile = fs.existsSync(path.join(catFolder, `${rawArg}.js`));
    if (isZipRequested || !hasSpecificFile) {
      await m.react("⏳");
      try {
        const zip = new AdmZip();
        zip.addLocalFolder(catFolder, rawArg.toLowerCase());
        const zipBuffer = zip.toBuffer();
        const filesCount = fs.readdirSync(catFolder).filter((f) => f.endsWith(".js")).length;
        const zipName = `plugins_${rawArg.toLowerCase()}_${Date.now()}.zip`;

        await sock.sendMessage(
          m.chat,
          {
            document: zipBuffer,
            mimetype: "application/zip",
            fileName: zipName,
            caption:
              `╭┈┈⬡「 📦 *ɢᴇᴛ ᴘʟᴜɢɪɴ ᴢɪᴘ* 」\n` +
              `┃ 📁 *Kategori:* \`${rawArg.toLowerCase()}\`\n` +
              `┃ 📊 *Jumlah Modul:* ${filesCount} berkas .js\n` +
              `┃ ⚖️ *Ukuran:* ${(zipBuffer.length / 1024).toFixed(1)} KB\n` +
              `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n` +
              `> 💡 _Reply berkas zip ini dengan \`${m.prefix}addplugin\` untuk batch install._`,
          },
          { quoted: m }
        );
        await m.react("✅");
        return;
      } catch (err) {
        await m.react("❌");
        return m.reply(`❌ Gagal membuat zip kategori: ${err.message}`);
      }
    }
  }

  const pluginName = rawArg;
  let pluginInfo = null;

  if (pluginName.includes("/")) {
    const [category, file] = pluginName.split("/");
    const filePath = path.join(
      pluginsDir,
      category,
      file.endsWith(".js") ? file : `${file}.js`,
    );
    if (fs.existsSync(filePath)) {
      pluginInfo = {
        path: filePath,
        category,
        file: file.endsWith(".js") ? file : `${file}.js`,
      };
    }
  } else {
    pluginInfo = await searchPlugin(pluginName, pluginsDir);
  }

  if (!pluginInfo) {
    const similar = getSimilarPlugins(pluginName, pluginsDir);
    let text = `Maaf ya *${m.pushName}*, plugin dengan nama *${pluginName}* tidak dapat ditemukan.\n\n`;

    if (similar.length > 0) {
      text += `Mungkin maksud kamu salah satu dari plugin ini:\n`;
      similar.forEach((s) => {
        text += `- ${s}\n`;
      });
    }

    return m.reply(text);
  }

  const code = fs.readFileSync(pluginInfo.path);

  await sock.sendMessage(
    m.chat,
    {
      document: code,
      mimetype: "application/javascript",
      fileName: pluginInfo.file,
      caption:
        `╭┈┈⬡「 📦 *ɢᴇᴛ ᴘʟᴜɢɪɴ* 」\n` +
        `┃ 📄 *Berkas:* \`${pluginInfo.category}/${pluginInfo.file}\`\n` +
        `┃ 📁 *Kategori:* \`${pluginInfo.category}\`\n` +
        `┃ ⚖️ *Ukuran:* ${(code.length / 1024).toFixed(2)} KB\n` +
        `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡\n\n` +
        `> 💡 _Reply berkas dokumen di atas dengan \`${m.prefix}addplugin\` untuk menduplikasi / install._`,
    },
    { quoted: m }
  );

  if (code.length <= 4000) {
    await m.reply(`\`\`\`javascript\n${code.toString("utf-8")}\n\`\`\``);
  }

  return true;
}

export { pluginConfig as config, handler };
