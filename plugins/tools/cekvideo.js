import { checkVideo } from '../../src/lib/vid-store.js';

export const config = {
  command: ['cek'],
  tag: 'tools',
  help: 'Cek status video. Gunakan: .cek KODE',
};

export async function handler(m) {
  const code = m.text?.trim();
  if (!code) return m.reply('Masukkan kode. Contoh: .cek AB');
  const v = checkVideo(code.toUpperCase());
  if (!v) return m.reply('Kode tidak ditemukan atau sudah expired.');
  const sisa = Math.round(v.remaining / 60000);
  m.reply(`Video: ${v.name}\nSize: ${(v.size / 1048576).toFixed(1)} MB\nExpired dalam: ${sisa} menit\n\nGunakan .claim ${code.toUpperCase()} untuk download.`);
}
