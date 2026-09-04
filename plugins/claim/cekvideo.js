import { checkVideo } from '../../src/lib/vid-store.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTINGS_FILE = join(__dirname, '..', '..', 'admin-settings.json');

function loadSettings() {
  try {
    if (existsSync(SETTINGS_FILE)) return JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'));
  } catch { /* parse skip */ }
  return {};
}

// Format lama `command:`/`tag:` tidak pernah dibaca loader — lihat catatan di
// claim.js. `cek` dipulihkan sebagai alias karena kata itu terbukti belum
// dipegang plugin mana pun (folder plugins/cek/ isinya `cekumur`, `cekjodoh`,
// dst — tidak ada yang bernama `cek` polos), jadi tidak ada yang direbut.
export const config = {
  name: 'cekvideo',
  alias: ['cek', 'cekkode'],
  category: 'claim',
  description: 'Lihat status berkas sebelum diklaim',
  usage: '.cekvideo KODE',
  help: 'Cek status file sebelum diklaim. Gunakan: .cekvideo KODE',
};

// Sisa waktu dibuat terbaca: menit mentah tidak berguna kalau masa simpan 1440
// menit (24 jam) — pengguna tidak menghitung sendiri.
function fmtSisa(ms) {
  const menit = Math.max(0, Math.round(ms / 60000));
  if (menit >= 1440) {
    const hari = Math.floor(menit / 1440);
    const jam = Math.floor((menit % 1440) / 60);
    return hari + ' hari' + (jam ? ' ' + jam + ' jam' : '');
  }
  if (menit >= 60) {
    const jam = Math.floor(menit / 60);
    const sisa = menit % 60;
    return jam + ' jam' + (sisa ? ' ' + sisa + ' menit' : '');
  }
  return menit + ' menit';
}

export async function handler(m) {
  const raw = m.text?.trim();
  if (!raw) return m.reply('\u26a0\ufe0f Masukkan kode.\n\n\ud83d\udcdd Contoh: *.cek AB*');

  // Terima beberapa kode sekaligus, seperti .claim
  const codes = raw.toUpperCase().split(/[\s,]+/).filter(Boolean).slice(0, 10);
  const settings = loadSettings();
  const docMB = Number(settings.videoAsDocumentMB);
  const batasDoc = Number.isFinite(docMB) && docMB > 0 ? docMB : 180;

  const baris = [];
  const valid = [];
  for (const code of codes) {
    const v = checkVideo(code);
    if (!v) {
      baris.push('\u274c *' + code + '* \u2014 tidak ada atau sudah expired');
      continue;
    }
    valid.push(code);
    const mb = v.size / 1048576;
    const jenis = mb > batasDoc ? 'dokumen (di atas ' + batasDoc + ' MB)' : 'video';
    baris.push(
      '\u2705 *' + code + '*\n' +
      '   \ud83d\udcc4 ' + v.name + '\n' +
      '   \ud83d\udcbe ' + mb.toFixed(1) + ' MB\n' +
      '   \u23f3 sisa ' + fmtSisa(v.remaining) + '\n' +
      '   \ud83d\udce4 dikirim sebagai ' + jenis
    );
  }

  // Saran perintah hanya memuat kode yang benar-benar ada, supaya user tidak
  // menyalin kode mati dan mengira klaimnya gagal.
  const footer = valid.length
    ? '\n\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\ud83d\udce5 Ambil filenya: *.claim ' + valid.join(' ') + '*'
    : '\n\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\ud83d\udca1 Upload dulu di *' + (settings.domain ? 'https://' + settings.domain : 'website') + '* untuk dapat kode baru.';
  m.reply(baris.join('\n\n') + footer);
}
