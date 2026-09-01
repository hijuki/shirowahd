
process.loadEnvFile('/root/shirowahd/.env');
const email = process.env.CF_EMAIL, key = process.env.CF_KEY;
const H = { 'X-Auth-Email': email, 'X-Auth-Key': key, 'Content-Type': 'application/json' };
const ZONE = '5d17714ababba028c96e7bda3cf81856';
const r = await fetch('https://api.cloudflare.com/client/v4/zones/' + ZONE + '/dns_records?per_page=100', { headers: H });
const j = await r.json();
for (const d of (j.result || [])) {
  if (d.name === 'swhdhlz.my.id' || d.name === 'www.swhdhlz.my.id') {
    if (!d.proxied) {
      const u = await fetch('https://api.cloudflare.com/client/v4/zones/' + ZONE + '/dns_records/' + d.id, {
        method: 'PATCH', headers: H, body: JSON.stringify({ proxied: true })
      });
      console.log('RECOVER:', d.name, u.status);
    } else {
      console.log('OK:', d.name, 'sudah proxied');
    }
  }
}
