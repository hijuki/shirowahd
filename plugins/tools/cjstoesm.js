import config from '../../config.js';
import te from '../../src/lib/hillz-error.js';
import { AIRich } from '../../src/lib/hillz-builder.js';

const pluginConfig = {
  name: 'cjstoesm',
  alias: ['cjs2esm', 'cjsconvert'],
  category: 'tools',
  description: 'Convert JavaScript CommonJS (require) ke ESM (import/export)',
  usage: '.cjstoesm <kode / reply kode>',
  example: '.cjstoesm const fs = require("fs");',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true
};

function convertCjsToEsm(code) {
  let esm = code;
  esm = esm.replace(/const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);?/g, "import $1 from '$2';");
  esm = esm.replace(/const\s*\{\s*([^}]+)\s*\}\s*=\s*require\(['"]([^'"]+)['"]\);?/g, "import { $1 } from '$2';");
  esm = esm.replace(/module\.exports\s*=\s*\{([^}]+)\};?/g, 'export { $1 };');
  esm = esm.replace(/module\.exports\s*=\s*(\w+);?/g, 'export default $1;');
  esm = esm.replace(/exports\.(\w+)\s*=\s*/g, 'export const $1 = ');
  return esm;
}

async function handler(m, { sock, args }) {
  let code = args.join(' ');
  if (!code && m.quoted?.text) {
    code = m.quoted.text;
  }

  if (!code) {
    return m.reply(`🛠️ *CONVERT CJS ➔ ESM*\n\n> Masukkan kode CommonJS atau reply pesan kode!\n\n*Contoh:* \`${m.prefix}cjstoesm const axios = require("axios");\``);
  }

  try {
    const esmCode = convertCjsToEsm(code);

    let sentSuccess = false;
    try {
      const rich = new AIRich(sock);
      rich.addText('✨ *HASIL CONVERT KE ES MODULES (ESM)*');
      rich.addCode('javascript', esmCode);
      await rich.send(m.chat, { quoted: m.raw || m });
      sentSuccess = true;
    } catch {}

    if (!sentSuccess) {
      await m.reply(`✨ *HASIL CONVERT KE ESM:*\n\n\`\`\`javascript\n${esmCode}\n\`\`\``);
    }
  } catch (err) {
    console.error('[CjsToEsm Error]:', err);
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
