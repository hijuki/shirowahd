import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database', 'totalchat.json');

function loadDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function saveDB(data) {
    try {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify(data));
    } catch (e) {
        console.error('TotalChat saveDB error:', e);
    }
}

function tambahHitungan(chat, sender) {
    if (!chat || !sender) return;
    const data = loadDB();
    if (!data[chat]) data[chat] = {};
    data[chat][sender] = (data[chat][sender] || 0) + 1;
    saveDB(data);
}

function nomorDari(jid) {
    return String(jid || '').split('@')[0].split(':')[0];
}

function renderLeaderboardCard({ namaGrup, ranking, totalPesan }) {
    const baris = ranking.map((r, i) => {
        const medali = ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;
        return `
        <div class="row">
          <div class="rank">${medali}</div>
          <div class="rowInfo">
            <div class="rowName">${r.nomor}</div>
            <div class="barTrack"><div class="barFill" style="width:${r.persen}%"></div></div>
          </div>
          <div class="rowCount">${r.jumlah}</div>
        </div>`;
    }).join('');

    return `
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; }
body { margin:0; background:transparent; font-family:'Segoe UI',Roboto,Arial,sans-serif; color:#f2e9e4; display:flex; justify-content:center; padding:10px; }
.wrap { width:100%; max-width:400px; }
.card { background:linear-gradient(160deg,#0b0f24 0%,#10162e 100%); border:1px solid #232b52; border-radius:20px; padding:22px; }
.header { text-align:center; margin-bottom:4px; }
.title { font-size:18px; font-weight:800; color:#fff; }
.subtitle { font-size:12px; color:#8b93c4; margin-top:2px; }
.totalBox { text-align:center; margin:16px 0; padding:12px; background:#1a2247; border:1px solid #2a3466; border-radius:14px; }
.totalLabel { font-size:10.5px; color:#8b93c4; text-transform:uppercase; letter-spacing:1px; }
.totalValue { font-size:24px; font-weight:800; color:#fbbf24; }
.row { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid rgba(255,255,255,0.06); }
.row:last-child { border-bottom:none; }
.rank { width:28px; text-align:center; font-size:14px; font-weight:700; color:#a78bfa; }
.rowInfo { flex:1; min-width:0; }
.rowName { font-size:13px; color:#fff; font-weight:600; margin-bottom:4px; font-family:monospace; }
.barTrack { background:rgba(255,255,255,0.08); border-radius:6px; height:6px; overflow:hidden; }
.barFill { background:linear-gradient(90deg,#4ade80,#22c55e); height:100%; border-radius:6px; }
.rowCount { font-size:13px; font-weight:700; color:#4ade80; min-width:36px; text-align:right; }
.footer { text-align:center; font-size:10px; color:#4a5488; margin-top:14px; letter-spacing:0.5px; text-transform:uppercase; }
</style>
<div class="wrap">
  <div class="card">
    <div class="header">
      <div class="title">📊 TOTAL CHAT</div>
      <div class="subtitle">${namaGrup}</div>
    </div>
    <div class="totalBox">
      <div class="totalLabel">Total Pesan Grup</div>
      <div class="totalValue">${totalPesan}</div>
    </div>
    ${baris || '<div class="subtitle" style="text-align:center;padding:20px 0;">Belum ada data pesan.</div>'}
    <div class="footer">Shirowahd • Total Chat Leaderboard</div>
  </div>
</div>`;
}

const pluginConfig = {
    name: 'totalchat',
    alias: ['tc', 'ranking', 'leaderboard'],
    category: 'group',
    description: 'Ranking member paling aktif chat di grup',
    usage: '.totalchat',
    example: '.totalchat',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
};

async function handler(m, { sock, conn }) {
    const client = sock || conn;
    try {
        const data = loadDB();
        const chatData = data[m.chat] || {};

        const totalPesan = Object.values(chatData).reduce((a, b) => a + b, 0);
        const urutan = Object.entries(chatData)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const maxJumlah = urutan[0]?.[1] || 1;
        const ranking = urutan.map(([jid, jumlah]) => ({
            nomor: nomorDari(jid),
            jumlah,
            persen: Math.round((jumlah / maxJumlah) * 100)
        }));

        let namaGrup = 'Grup Ini';
        if (String(m.chat || '').endsWith('@g.us')) {
            try {
                const meta = await client.groupMetadata(m.chat);
                namaGrup = meta?.subject || namaGrup;
            } catch {}
        }

        const htmlPayload = renderLeaderboardCard({ namaGrup, ranking, totalPesan });

        const msgContent = {
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: {
                    messageDisclaimerText: '',
                    botResponseId: 'kurumi-music-player',
                    verificationMetadata: {
                        proofs: [
                            {
                                version: 1,
                                useCase: 1,
                                signature: 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==',
                                certificateChain: [
                                    'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg',
                                    'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=='
                                ]
                            }
                        ]
                    }
                }
            },
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages: [{ messageType: 2, messageText: `Total Chat - ${namaGrup}` }],
                        unifiedResponse: {
                            data: Buffer.from(JSON.stringify({
                                response_id: 'kurumi-music-player',
                                sections: [{
                                    view_model: {
                                        primitive: {
                                            __typename: 'GenAIaeacdsnwHtmlPrimitive',
                                            payload: htmlPayload,
                                            trusted_sources: ['hirara.dev']
                                        },
                                        __typename: 'GenAISingleLayoutViewModel'
                                    }
                                }]
                            })).toString('base64')
                        },
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
                            forwardOrigin: 4
                        }
                    }
                }
            }
        };

        await client.relayMessage(m.chat, msgContent, {});
    } catch (error) {
        console.error('TotalChat Plugin Error:', error);
        await m.reply('❌ *GAGAL*\n\n> ' + error.message);
    }
}

async function before(m) {
    try {
        if (!String(m.chat || '').endsWith('@g.us')) return;
        tambahHitungan(m.chat, m.sender);
    } catch (error) {
        console.error('TotalChat before() Error:', error);
    }
}

export { pluginConfig as config, handler, before };
