import { storeVideo, getTTL } from '../../src/lib/vid-store.js';

export const config = {
  command: ['upload', 'simpanvideo'],
  tag: 'tools',
  help: 'Upload video ke server. Reply video dengan .upload',
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
