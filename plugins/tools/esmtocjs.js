import config from '../../config.js';
import te from '../../src/lib/hillz-error.js';
import { AIRich } from '../../src/lib/hillz-builder.js';

const pluginConfig = {
  name: 'esmtocjs',
  alias: ['esm2cjs', 'esmconvert'],
  category: 'tools',
  description: 'Convert JavaScript ESM (import/export) ke CommonJS (require)',
  usage: '.esmtocjs <kode / reply kode>',
  example: '.esmtocjs import fs from "fs";',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true
};

function convertEsmToCjs(code) {
  let cjs = code;
  cjs = cjs.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g, "const $1 = require('$2');");
  cjs = cjs.replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s+['"]([^'"]+)['"];?/g, "const { $1 } = require('$2');");
  cjs = cjs.replace(/export\s+default\s+(\w+);?/g, 'module.exports = $1;');
  cjs = cjs.replace(/export\s*\{\s*([^}]+)\s*\};?/g, 'module.exports = { $1 };');
  cjs = cjs.replace(/export\s+const\s+(\w+)\s*=\s*/g, 'exports.$1 = ');
  return cjs;
}

async function handler(m, { sock, args }) {
  let code = args.join(' ');
  if (!code && m.quoted?.text) {
    code = m.quoted.text;
  }

  if (!code) {
    return m.reply(`🛠️ *CONVERT ESM ➔ CJS*\n\n> Masukkan kode ES Modules atau reply pesan kode!\n\n*Contoh:* \`${m.prefix}esmtocjs import axios from "axios";\``);
  }

  try {
    const cjsCode = convertEsmToCjs(code);

    let sentSuccess = false;
    try {
      const rich = new AIRich(sock);
      rich.addText('✨ *HASIL CONVERT KE COMMONJS (CJS)*');
      rich.addCode('javascript', cjsCode);
      await rich.send(m.chat, { quoted: m.raw || m });
      sentSuccess = true;
    } catch {}

    if (!sentSuccess) {
      await m.reply(`✨ *HASIL CONVERT KE CJS:*\n\n\`\`\`javascript\n${cjsCode}\n\`\`\``);
    }
  } catch (err) {
    console.error('[EsmToCjs Error]:', err);
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
