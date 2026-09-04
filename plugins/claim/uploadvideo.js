import { storeVideo, getTTL } from '../../src/lib/vid-store.js';

// Format lama `command:`/`tag:` tidak pernah dibaca loader — lihat catatan di
// claim.js. Satu catatan penting: `upload` TIDAK dikembalikan sebagai nama
// perintah. Kata itu sekarang dipegang `tools/tourl.js` (dan `main/web.js`)
// sebagai alias yang benar-benar hidup; `commands` menang atas `aliases` di
// getPlugin(), jadi mendaftarkannya di sini akan MEREBUT perintah yang sedang
// bekerja. Yang dipulihkan hanya alias yang memang belum dipakai siapa pun.
export const config = {
  name: 'uploadvideo',
  alias: ['simpanvideo'],
  category: 'claim',
  description: 'Simpan video ke server dan dapatkan kodenya',
  usage: 'reply video dengan .uploadvideo',
  help: 'Upload video ke server. Reply video dengan .uploadvideo / .simpanvideo',
};

export async function handler(m, { sock }) {
  const q = m.quoted || m;
  const mime = q.mimetype || '';
  if (!mime.startsWith('video')) return m.reply('Reply video dengan .upload');
  const buf = await q.download();
  if (!buf || !buf.length) return m.reply('Gagal download video.');
  const sender = (m.sender || '').replace(/@.+/, '');
  const code = storeVideo(buf, q.fileName || 'video.mp4', sender);
  if (!code) return m.reply('Server penuh. Coba lagi nanti.');
  const expMin = Math.round(getTTL() / 60000);
  m.reply(`Video tersimpan!\n\nKode: *${code}*\nExpired: ${expMin} menit\n\nGunakan .claim ${code} untuk download.`);
}
