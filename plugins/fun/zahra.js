import config from '../../config.js';

function renderZahraLoveCard() {
  return `
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; margin: 0; padding: 0; }
body {
  margin: 0;
  padding: 6px;
  background: #090507;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
  color: #ffffff;
  overflow: hidden;
}
.love-card {
  position: relative;
  width: 100%;
  max-width: 350px;
  margin: 0 auto;
  background: #12080e;
  background-image: 
    radial-gradient(at 0% 0%, rgba(244, 63, 94, 0.22) 0px, transparent 60%),
    radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.18) 0px, transparent 60%);
  border: 1px solid rgba(244, 63, 94, 0.25);
  border-radius: 20px;
  padding: 18px 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
.particles-wrap {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}
.p-heart {
  position: absolute;
  color: rgba(244, 63, 94, 0.35);
  font-size: 14px;
  animation: floatUp 6s linear infinite;
}
.p1 { left: 10%; bottom: -20px; animation-duration: 5s; animation-delay: 0s; font-size: 12px; }
.p2 { left: 30%; bottom: -20px; animation-duration: 7s; animation-delay: 1.5s; font-size: 16px; }
.p3 { left: 60%; bottom: -20px; animation-duration: 6s; animation-delay: 3s; font-size: 11px; }
.p4 { left: 85%; bottom: -20px; animation-duration: 8s; animation-delay: 0.5s; font-size: 15px; }

@keyframes floatUp {
  0% { transform: translateY(0) scale(0.8) rotate(0deg); opacity: 0; }
  20% { opacity: 0.7; }
  80% { opacity: 0.7; }
  100% { transform: translateY(-380px) scale(1.2) rotate(25deg); opacity: 0; }
}

.content-layer {
  position: relative;
  z-index: 2;
}
.header-tag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.badge-special {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #fb7185;
  background: rgba(244, 63, 94, 0.12);
  border: 1px solid rgba(244, 63, 94, 0.28);
  padding: 4px 10px;
  border-radius: 100px;
  text-transform: uppercase;
}
.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f43f5e;
  box-shadow: 0 0 8px #f43f5e;
  animation: pulseDot 2s infinite ease-in-out;
}
@keyframes pulseDot {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}
.love-meter {
  font-size: 9.5px;
  font-weight: 700;
  color: #f43f5e;
  background: rgba(255, 255, 255, 0.04);
  padding: 3px 8px;
  border-radius: 12px;
}

.hero-heart-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 8px 0 14px;
}
.main-heart {
  font-size: 38px;
  display: inline-block;
  animation: heartbeat 1.4s infinite ease-in-out;
  cursor: pointer;
  filter: drop-shadow(0 0 14px rgba(244, 63, 94, 0.7));
  transition: transform 0.2s;
}
.main-heart:active {
  transform: scale(1.3) !important;
}
@keyframes heartbeat {
  0% { transform: scale(1); }
  14% { transform: scale(1.18); }
  28% { transform: scale(1); }
  42% { transform: scale(1.18); }
  70% { transform: scale(1); }
}

.name-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: #ffffff;
  margin-top: 4px;
  text-shadow: 0 2px 10px rgba(244, 63, 94, 0.3);
}
.name-sub {
  font-size: 11px;
  font-weight: 600;
  color: #fda4af;
  margin-top: 1px;
  letter-spacing: 0.4px;
}

.letter-box {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  padding: 13px 14px;
  margin-bottom: 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.letter-quote {
  font-size: 12.5px;
  line-height: 1.55;
  color: #fce7f3;
  font-weight: 500;
  text-align: justify;
  letter-spacing: -0.1px;
}
.letter-highlight {
  color: #fb7185;
  font-weight: 700;
}

.interactive-btn-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}
.tap-heart-btn {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  color: #ffffff;
  border: none;
  border-radius: 100px;
  padding: 8px 18px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 15px rgba(244, 63, 94, 0.45);
  transition: transform 0.15s, box-shadow 0.15s;
}
.tap-heart-btn:active {
  transform: scale(0.94);
  box-shadow: 0 2px 8px rgba(244, 63, 94, 0.3);
}

.footer-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.footer-text {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #6b7280;
  text-transform: uppercase;
}
.footer-love {
  font-size: 10px;
  color: #f43f5e;
  font-weight: 700;
}
</style>

<div class="love-card">
  <div class="particles-wrap">
    <div class="p-heart p1">💖</div>
    <div class="p-heart p2">✨</div>
    <div class="p-heart p3">🌸</div>
    <div class="p-heart p4">💕</div>
  </div>

  <div class="content-layer">
    <div class="header-tag">
      <div class="badge-special">
        <div class="badge-dot"></div>
        <span>FOR ZAHRA</span>
      </div>
      <div class="love-meter" id="loveCount">❤️ 100% Love</div>
    </div>

    <div class="hero-heart-box">
      <div class="main-heart" id="bigHeart" onclick="kirimCinta()">💖</div>
      <div class="name-title">Dear Zahra 🤍</div>
      <div class="name-sub">You are my sweetest serendipity ✨</div>
    </div>

    <div class="letter-box">
      <p class="letter-quote" id="pesanCinta">
        Di antara miliaran detik di dunia, bertemumu adalah ketidaksengajaan terindah yang selalu kusyukuri. Terima kasih telah hadir, membawa hangat di setiap hariku, dan menjadi alasan terbaik di balik setiap senyumanku. <br><br>
        <span class="letter-highlight">Aku cuma mau kamu, hari ini, esok, dan seterusnya. Tetaplah jadi Zahra yang selalu ada di hatiku. 🌹✨</span>
      </p>
    </div>

    <div class="interactive-btn-wrap">
      <button class="tap-heart-btn" id="loveBtn" onclick="kirimCinta()">
        <span>Tekan Hatiku</span> <span>💌</span>
      </button>
    </div>

    <div class="footer-info">
      <span class="footer-text">FOREVER & ALWAYS</span>
      <span class="footer-love">I Love You Zahra 🤍</span>
    </div>
  </div>
</div>

<script>
let count = 100;
const kataKata = [
  "Di antara miliaran manusia, mataku cuma tertuju padamu, Zahra. Terima kasih sudah menjadi orang paling berharga di hidupku. 🤍",
  "Kamu adalah alasan kenapa setiap hari selalu terasa lebih manis. Jangan pernah ragu, rasa ini selalu utuh untukmu. 🌹",
  "Dunia mungkin berisik, tapi bersamamu selalu terasa tenang. Tetaplah jadi rumah ternyaman tempat hatiku pulang. ✨",
  "Aku tidak butuh dunia yang sempurna, aku cuma butuh kamu di setiap langkahku. I love you more than words can say. 💕",
  "Terima kasih telah hadir membawa warna indah. Selamanya namamu terukir paling indah di hatiku, Zahra. 🌸"
];
let idxPesan = 0;

function kirimCinta() {
  count += 10;
  const lc = document.getElementById('loveCount');
  if (lc) lc.textContent = '❤️ ' + count + '% Love';

  idxPesan = (idxPesan + 1) % kataKata.length;
  const p = document.getElementById('pesanCinta');
  if (p) {
    p.style.opacity = '0';
    setTimeout(() => {
      p.innerHTML = kataKata[idxPesan];
      p.style.opacity = '1';
    }, 180);
  }

  const bh = document.getElementById('bigHeart');
  if (bh) {
    bh.style.transform = 'scale(1.35)';
    setTimeout(() => { bh.style.transform = 'scale(1)'; }, 200);
  }
}
</script>
`;
}

const pluginConfig = {
  name: 'zahra',
  alias: ['dearzahra', 'lovezahra', 'myzahra', 'zahralove'],
  category: 'fun',
  description: 'Kartu ungkapan cinta romantis interaktif untuk Zahra dengan animasi in-bubble HTML',
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
      await m.react('💖');
    } catch {}
  }

  const htmlPayload = renderZahraLoveCard();

  const msgContent = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: '',
        botResponseId: 'shirowahd-zahra-love',
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
          submessages: [{ messageType: 2, messageText: 'Special Love Letter for Zahra 🤍' }],
          unifiedResponse: {
            data: Buffer.from(
              JSON.stringify({
                response_id: 'shirowahd-zahra-love',
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
