import config from '../../config.js';

function renderZahraEditorialCard() {
  return `
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; margin: 0; padding: 0; }
body {
  margin: 0;
  padding: 6px;
  background: #09090b;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  color: #f4f4f5;
  display: flex;
  justify-content: center;
  align-items: center;
}
.editorial-card {
  position: relative;
  width: 100%;
  max-width: 350px;
  margin: 0 auto;
  background: #111114;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 18px;
  padding: 16px 16px 14px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);
  overflow: hidden;
}
.card-ambient {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, rgba(225, 29, 72, 0.22) 0%, transparent 70%);
  pointer-events: none;
}
.top-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.edition-tag {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #a1a1aa;
  text-transform: uppercase;
}
.status-node {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 600;
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.2);
  padding: 3px 8px;
  border-radius: 100px;
}
.node-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f43f5e;
  box-shadow: 0 0 6px #f43f5e;
  animation: pulseNode 2.4s infinite ease-in-out;
}
@keyframes pulseNode {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.2); }
}

.bouquet-hero {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #17171c;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 10px 14px;
  margin-bottom: 12px;
}
.bouquet-visual {
  width: 44px;
  height: 44px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(225, 29, 72, 0.1);
  border: 1px solid rgba(225, 29, 72, 0.25);
  border-radius: 12px;
  font-size: 24px;
  animation: floatBouquet 3s ease-in-out infinite;
  box-shadow: 0 4px 12px rgba(225, 29, 72, 0.15);
}
@keyframes floatBouquet {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(-3deg); }
}
.hero-copy {
  overflow: hidden;
}
.to-label {
  font-size: 9.5px;
  color: #71717a;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 600;
}
.recipient-name {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 20px;
  font-weight: 400;
  font-style: italic;
  color: #ffffff;
  letter-spacing: -0.3px;
  line-height: 1.2;
}

.letter-surface {
  background: #17171c;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 13px 14px 12px;
  margin-bottom: 12px;
  position: relative;
}
.letter-surface::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: #e11d48;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}
.letter-text {
  font-size: 11.5px;
  line-height: 1.58;
  color: #d4d4d8;
  font-weight: 400;
  letter-spacing: 0.1px;
  transition: opacity 0.2s ease;
}

.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.page-indicator {
  font-size: 9.5px;
  font-weight: 600;
  color: #71717a;
  font-family: ui-monospace, SFMono-Regular, monospace;
}
.next-btn {
  background: #ffffff;
  color: #09090b;
  border: none;
  border-radius: 7px;
  padding: 5px 12px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s;
}
.next-btn:active {
  transform: scale(0.95);
  background: #e4e4e7;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.footer-brand {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #52525b;
  text-transform: uppercase;
}
.footer-sig {
  font-family: Georgia, serif;
  font-style: italic;
  font-size: 10.5px;
  color: #a1a1aa;
}
</style>

<div class="editorial-card">
  <div class="card-ambient"></div>
  
  <div class="top-meta">
    <span class="edition-tag">SPECIAL ARCHIVE • NO. 01</span>
    <div class="status-node">
      <div class="node-dot"></div>
      <span>FOR YOU</span>
    </div>
  </div>

  <div class="bouquet-hero">
    <div class="bouquet-visual">💐</div>
    <div class="hero-copy">
      <div class="to-label">Buket Bunga & Catatan Untuk</div>
      <div class="recipient-name">Zahra.</div>
    </div>
  </div>

  <div class="letter-surface">
    <p class="letter-text" id="quoteText">
      Sebuket bunga dan sejuta hal sederhana yang selalu bikin hariku tenang. Nggak butuh banyak alasan untuk ngebuat hari biasa jadi berharga—cukup ada kamu di dalamnya.
    </p>
  </div>

  <div class="action-row">
    <span class="page-indicator" id="pageNumber">01 / 04</span>
    <button class="next-btn" onclick="nextQuote()">Lanjut Baca →</button>
  </div>

  <div class="card-footer">
    <span class="footer-brand">SHIRO ARCHIVE</span>
    <span class="footer-sig">Selalu untuk Zahra 🤍</span>
  </div>
</div>

<script>
const quotes = [
  "Sebuket bunga dan sejuta hal sederhana yang selalu bikin hariku tenang. Nggak butuh banyak alasan untuk ngebuat hari biasa jadi berharga—cukup ada kamu di dalamnya.",
  "Dunia di luar sana mungkin sering berisik dan nuntut banyak hal. Tapi kalau sama kamu, semuanya selalu terasa cukup dan sederhana.",
  "Aku nggak pernah butuh cerita yang rumit atau berlebihan. Asal langkah ke depannya bareng kamu, itu udah lebih dari cukup.",
  "Bunga ini mungkin bisa layu, tapi rasa tenang setiap kali ingat kamu nggak akan pernah pudar. Tetaplah jadi Zahra yang selalu apa adanya."
];
let currentIdx = 0;

function nextQuote() {
  currentIdx = (currentIdx + 1) % quotes.length;
  const textEl = document.getElementById('quoteText');
  const pageEl = document.getElementById('pageNumber');
  
  if (textEl) {
    textEl.style.opacity = '0';
    setTimeout(() => {
      textEl.innerHTML = quotes[currentIdx];
      textEl.style.opacity = '1';
    }, 150);
  }
  
  if (pageEl) {
    pageEl.textContent = '0' + (currentIdx + 1) + ' / 0' + quotes.length;
  }
}
</script>
`;
}

const pluginConfig = {
  name: 'zahra',
  alias: ['dearzahra', 'lovezahra', 'myzahra', 'zahralove', 'bunga', 'bucketbunga'],
  category: 'fun',
  description: 'Kartu buket bunga editorial dan ungkapan untuk Zahra',
  usage: '.zahra',
  example: '.zahra',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, conn }) {
  const client = sock || conn;

  if (typeof m.react === 'function') {
    try {
      await m.react('💐');
    } catch {}
  }

  const htmlPayload = renderZahraEditorialCard();

  const msgContent = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: '',
        botResponseId: 'shirowahd-zahra-editorial',
        verificationMetadata: {
          proofs: [
            {
              version: 1,
              useCase: 1,
              signature: 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==',
              certificateChain: [
                'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg',
                'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ==',
              ],
            },
          ],
        },
      },
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [{ messageType: 2, messageText: 'Buket Bunga untuk Zahra 💐' }],
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                response_id: 'shirowahd-zahra-editorial',
                sections: [
                  {
                    view_model: {
                      primitive: {
                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                        payload: htmlPayload,
                        trusted_sources: ['*'],
                      },
                      __typename: 'GenAISingleLayoutViewModel',
                    },
                  },
                ],
              })
            ).toString('base64'),
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botJid: '867051314767696@bot',
            },
            forwardOrigin: 4,
          },
        },
      },
    },
  };

  await client.relayMessage(m.chat, msgContent, {});
}

export { pluginConfig as config, handler };
