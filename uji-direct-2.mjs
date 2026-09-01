import fs from 'fs';
import https from 'https';
import { execSync } from 'child_process';

// UJI INTI: apakah jalur langsung benar-benar melewati cap Cloudflare?
//
// Yang dibandingkan pada BERKAS YANG SAMA:
//   A. lewat Cloudflare  (swhdhlz.my.id:443)  → harus 413, ini cap 100 MB
//   B. lewat jalur langsung (up.swhdhlz.my.id:8443) → harus 200
//
// Berkas uji 142 MB — cukup di atas cap supaya hasilnya tidak ambigu.

const BESAR = '/tmp/uji/besar142.mp4';
if (!fs.existsSync(BESAR)) {
  console.log('membuat berkas uji 142 MB...');
  execSync('ffmpeg -y -v error -f lavfi -i testsrc2=size=1920x1080:rate=30 -f lavfi -i sine=frequency=440 ' +
    '-t 120 -c:v libx264 -preset ultrafast -b:v 9500k -maxrate 11M -bufsize 20M -c:a aac -b:a 192k ' +
    '-movflags +faststart ' + JSON.stringify(BESAR), { timeout: 900000, stdio: 'pipe' });
}
const size = fs.statSync(BESAR).size;
console.log('berkas uji: ' + size + ' B (' + (size / 1048576).toFixed(1) + ' MB)\n');

// Kirim multipart satu tembakan. Field 'video' — nama yang diterima parseMultipartFiles.
function kirim(host, port, label) {
  return new Promise((res) => {
    const B = '----uji' + Date.now();
    const kepala = Buffer.from('--' + B + '\r\nContent-Disposition: form-data; name="video"; filename="besar142.mp4"\r\n' +
      'Content-Type: video/mp4\r\n\r\n');
    const kaki = Buffer.from('\r\n--' + B + '--\r\n');
    const total = kepala.length + size + kaki.length;
    const t0 = Date.now();
    const req = https.request({
      host, port, path: '/upload', method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + B, 'Content-Length': total },
      timeout: 600000,
      // Sertifikat up.swhdhlz.my.id sah dari Let's Encrypt; tidak ada pelonggaran TLS.
    }, (s) => {
      let b = '';
      s.on('data', c => b += c);
      s.on('end', () => res({ label, status: s.statusCode, body: b.slice(0, 200).replace(/\s+/g, ' '), detik: ((Date.now() - t0) / 1000).toFixed(1) }));
    });
    req.on('error', e => res({ label, status: 0, body: 'ERR ' + e.message, detik: ((Date.now() - t0) / 1000).toFixed(1) }));
    req.on('timeout', () => { req.destroy(); res({ label, status: 0, body: 'TIMEOUT', detik: '600' }); });
    req.write(kepala);
    const s = fs.createReadStream(BESAR);
    s.pipe(req, { end: false });
    s.on('end', () => { req.end(kaki); });
  });
}

for (const [host, port, label] of [
  ['swhdhlz.my.id', 443, 'A lewat Cloudflare  '],
  ['up.swhdhlz.my.id', 8443, 'B jalur langsung   '],
]) {
  const r = await kirim(host, port, label);
  console.log(r.label + ' -> HTTP ' + r.status + ' (' + r.detik + ' s)  ' + r.body.slice(0, 150));
}
