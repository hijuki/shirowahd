
import fs from 'fs';
import https from 'https';
const st = JSON.parse(fs.readFileSync('/root/shirowahd/admin-settings.json','utf8'));
const post = (path, body, token, host='swhdhlz.my.id', port=443) => new Promise((res, rej) => {
  const data = JSON.stringify(body || {});
  const r = https.request({ host, port, path, method:'POST',
    headers:{ 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(data),
              ...(token?{Authorization:'Bearer '+token}:{}) } },
    (s)=>{ let b=''; s.on('data',c=>b+=c); s.on('end',()=>res({status:s.statusCode, body:b})); });
  r.on('error', e=>res({status:0, body:'ERR '+e.message})); r.write(data); r.end();
});
const get = (path, token, host='swhdhlz.my.id', port=443) => new Promise((res) => {
  const r = https.request({ host, port, path, method:'GET',
    headers: token?{Authorization:'Bearer '+token}:{} },
    (s)=>{ let b=''; s.on('data',c=>b+=c); s.on('end',()=>res({status:s.statusCode, body:b})); });
  r.on('error', e=>res({status:0, body:'ERR '+e.message})); r.end();
});

const tok = JSON.parse((await post('/admin/login', { password: st.adminPassword })).body).token;
console.log('login:', tok ? 'OK' : 'GAGAL');

console.log('\n--- 1) route /admin/api/cf/dns ---');
const dns = await get('/admin/api/cf/dns', tok);
const dj = JSON.parse(dns.body);
console.log('status', dns.status, '| zone', dj.zone?.name, dj.zone?.plan, '| cap', dj.edgeCapMB, 'MB');
for (const r of (dj.records || [])) console.log('   ', r.name.padEnd(24), 'proxied=' + r.proxied);
console.log('   direct:', JSON.stringify(dj.direct));

console.log('\n--- 2) nyalakan jalur langsung ---');
const on = await post('/admin/api/direct-upload', { enabled: true }, tok);
console.log(on.status, on.body.slice(0,200));
