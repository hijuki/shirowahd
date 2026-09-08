import config from '../../config.js';

function renderZahraBouquetCard() {
  return `
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; margin: 0; padding: 0; }
body {
  margin: 0;
  padding: 8px;
  background: #080306;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
.love-card {
  position: relative;
  width: 100%;
  max-width: 355px;
  background: linear-gradient(170deg, #180812 0%, #0d040a 100%);
  border: 1px solid rgba(255, 77, 121, 0.25);
  border-radius: 22px;
  padding: 16px 16px 14px;
  box-shadow: 0 16px 40px rgba(255, 42, 109, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

/* Ambient glow */
.ambient-glow {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(255, 42, 109, 0.3) 0%, rgba(255, 110, 160, 0.08) 50%, transparent 75%);
  pointer-events: none;
}

/* Floating petals */
.petal {
  position: absolute;
  border-radius: 60% 40% 70% 30% / 60% 30% 70% 40%;
  background: linear-gradient(135deg, #ff2a6d 0%, #bd003c 100%);
  opacity: 0.65;
  pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
  animation: fallPetal linear infinite;
}
.petal:nth-child(1) { width: 14px; height: 10px; left: 12%; top: -10px; animation-duration: 4.8s; animation-delay: 0s; }
.petal:nth-child(2) { width: 10px; height: 8px; left: 35%; top: -10px; animation-duration: 6.2s; animation-delay: 1.5s; }
.petal:nth-child(3) { width: 16px; height: 12px; left: 75%; top: -10px; animation-duration: 5.4s; animation-delay: 0.8s; }
.petal:nth-child(4) { width: 12px; height: 9px; left: 90%; top: -10px; animation-duration: 7.1s; animation-delay: 2.2s; }

@keyframes fallPetal {
  0% { transform: translateY(0) rotate(0deg) scale(0.8); opacity: 0; }
  15% { opacity: 0.8; }
  85% { opacity: 0.8; }
  100% { transform: translateY(460px) rotate(360deg) scale(1.1); opacity: 0; }
}

/* Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  position: relative;
  z-index: 2;
}
.header-tag {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.8px;
  color: #ff85a2;
  text-transform: uppercase;
}
.header-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #ffd166;
  background: rgba(255, 209, 102, 0.12);
  border: 1px solid rgba(255, 209, 102, 0.3);
  padding: 3px 9px;
  border-radius: 100px;
}

/* Bouquet Hero Stage */
.bouquet-stage {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 0 6px;
  cursor: pointer;
}
.bouquet-container {
  position: relative;
  width: 140px;
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 8px 20px rgba(255, 42, 109, 0.35));
  animation: floatBouquet 3.5s ease-in-out infinite;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.bouquet-container:active {
  transform: scale(1.08) rotate(-2deg);
}
@keyframes floatBouquet {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-6px) rotate(1.5deg); }
}

.bouquet-aura {
  position: absolute;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 77, 121, 0.4) 0%, transparent 70%);
  animation: auraPulse 2.8s ease-in-out infinite;
}
@keyframes auraPulse {
  0%, 100% { transform: scale(0.9); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.9; }
}

/* Sparkle stars */
.sparkle-star {
  position: absolute;
  color: #ffd166;
  font-size: 13px;
  animation: sparkleAnim 2s infinite ease-in-out;
  pointer-events: none;
}
.sparkle-1 { top: 10px; left: 15px; animation-delay: 0.3s; }
.sparkle-2 { top: 20px; right: 15px; animation-delay: 1.1s; }
.sparkle-3 { bottom: 20px; left: 25px; animation-delay: 0.7s; }

@keyframes sparkleAnim {
  0%, 100% { transform: scale(0.6) rotate(0deg); opacity: 0.3; }
  50% { transform: scale(1.2) rotate(45deg); opacity: 1; }
}

.stage-title {
  text-align: center;
  margin-top: 4px;
}
.sub-for {
  font-size: 10px;
  color: #ff85a2;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  font-weight: 700;
}
.name-zahra {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 26px;
  font-weight: 700;
  font-style: italic;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #ffffff 0%, #ffc0d0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Message Card */
.message-box {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 77, 121, 0.2);
  border-radius: 14px;
  padding: 13px 14px;
  margin: 10px 0 12px;
  backdrop-filter: blur(8px);
}
.message-text {
  font-size: 12px;
  line-height: 1.6;
  color: #fce7f0;
  min-height: 58px;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

/* Controls */
.controls-row {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-dots {
  display: flex;
  gap: 5px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.25s ease;
}
.dot.active {
  width: 18px;
  border-radius: 10px;
  background: #ff2a6d;
  box-shadow: 0 0 8px #ff2a6d;
}

.tap-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #ff2a6d 0%, #e11d48 100%);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
  box-shadow: 0 4px 14px rgba(255, 42, 109, 0.4);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.tap-btn:active {
  transform: scale(0.94);
  box-shadow: 0 2px 6px rgba(255, 42, 109, 0.3);
}

.footer-stamp {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.stamp-text {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #a17188;
  text-transform: uppercase;
}
.stamp-heart {
  font-size: 11px;
  color: #ff85a2;
}
</style>

<div class="love-card">
  <div class="ambient-glow"></div>
  
  <!-- Falling Petals -->
  <div class="petal"></div>
  <div class="petal"></div>
  <div class="petal"></div>
  <div class="petal"></div>

  <!-- Header -->
  <div class="card-header">
    <span class="header-tag">EXCLUSIVE BOUQUET</span>
    <div class="header-pill">
      <span>BLOOMING</span> 🌸
    </div>
  </div>

  <!-- Bouquet Hero -->
  <div class="bouquet-stage" onclick="nextCard()">
    <div class="bouquet-container" id="bouquetEl">
      <div class="bouquet-aura"></div>
      <span class="sparkle-star sparkle-1">✨</span>
      <span class="sparkle-star sparkle-2">🌟</span>
      <span class="sparkle-star sparkle-3">✨</span>

      <!-- High-Quality Handcrafted SVG Floral Bouquet -->
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Bouquet Wrap / Paper -->
        <path d="M40 70 L60 112 L80 70 Z" fill="#D4A373" stroke="#BA7C4D" stroke-width="1.5" />
        <path d="M36 68 L60 114 L52 68 Z" fill="#C59364" />
        <path d="M84 68 L60 114 L68 68 Z" fill="#E2B488" />
        
        <!-- Golden Satin Ribbon -->
        <path d="M50 78 C56 74 64 74 70 78 C65 82 55 82 50 78 Z" fill="#FFD166" stroke="#E0A620" stroke-width="1" />
        <path d="M58 80 L52 94 L57 91 L62 94 Z" fill="#FFD166" />
        <path d="M62 80 L68 94 L63 91 L58 94 Z" fill="#FFC043" />

        <!-- Green Leaves -->
        <path d="M28 50 C26 38 40 38 44 48 C36 54 30 54 28 50 Z" fill="#2D6A4F" />
        <path d="M92 50 C94 38 80 38 76 48 C84 54 90 54 92 50 Z" fill="#2D6A4F" />
        <path d="M45 32 C48 22 60 25 58 36 C52 38 46 36 45 32 Z" fill="#40916C" />
        <path d="M75 32 C72 22 60 25 62 36 C68 38 74 36 75 32 Z" fill="#40916C" />

        <!-- Outer Rose Left (Pink Rose) -->
        <circle cx="42" cy="48" r="16" fill="url(#gradRosePink)" />
        <path d="M34 46 C34 40 48 38 50 48 C48 56 36 56 34 46 Z" fill="#FF4D79" />
        <path d="M38 46 C38 42 46 42 46 48 C44 52 40 52 38 46 Z" fill="#FF1E56" />

        <!-- Outer Rose Right (Bright Coral Rose) -->
        <circle cx="78" cy="48" r="16" fill="url(#gradRoseCoral)" />
        <path d="M70 46 C70 40 84 38 86 48 C84 56 72 56 70 46 Z" fill="#FF5E7E" />
        <path d="M74 46 C74 42 82 42 82 48 C80 52 76 52 74 46 Z" fill="#E61E50" />

        <!-- Center Main Velvet Red Rose (Blooming) -->
        <circle cx="60" cy="42" r="20" fill="url(#gradRoseRed)" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.3))" />
        <path d="M48 38 C50 28 70 28 72 38 C72 50 48 50 48 38 Z" fill="#E11D48" />
        <path d="M52 38 C54 32 66 32 68 38 C66 45 54 45 52 38 Z" fill="#BE123C" />
        <path d="M56 38 C57 34 63 34 64 38 C63 42 57 42 56 38 Z" fill="#9F1239" />
        <circle cx="60" cy="38" r="2.5" fill="#FFE4E6" />

        <!-- Tiny White Baby Breath Flowers -->
        <circle cx="32" cy="36" r="3" fill="#FFFFFF" />
        <circle cx="88" cy="36" r="3" fill="#FFFFFF" />
        <circle cx="60" cy="22" r="3.5" fill="#FFFFFF" />
        <circle cx="36" cy="62" r="2.5" fill="#FFFFFF" />
        <circle cx="84" cy="62" r="2.5" fill="#FFFFFF" />

        <!-- Gradients -->
        <defs>
          <radialGradient id="gradRoseRed" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stop-color="#FF4D6D" />
            <stop offset="60%" stop-color="#E11D48" />
            <stop offset="100%" stop-color="#880D28" />
          </radialGradient>
          <radialGradient id="gradRosePink" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stop-color="#FF85A2" />
            <stop offset="70%" stop-color="#FF2A6D" />
            <stop offset="100%" stop-color="#B0003A" />
          </radialGradient>
          <radialGradient id="gradRoseCoral" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stop-color="#FFA8BA" />
            <stop offset="70%" stop-color="#FF3366" />
            <stop offset="100%" stop-color="#9C002B" />
          </radialGradient>
        </defs>
      </svg>
    </div>

    <div class="stage-title">
      <div class="sub-for">Buket Bunga Untuk</div>
      <div class="name-zahra">Zahra 💐</div>
    </div>
  </div>

  <!-- Message Box -->
  <div class="message-box">
    <p class="message-text" id="quoteText">
      Sebuket bunga yang mekar khusus buat Zahra. Terima kasih udah selalu hadir bawa senyum dan suasana yang selalu bikin tenang setiap hari.
    </p>
  </div>

  <!-- Interactive Controls -->
  <div class="controls-row">
    <div class="page-dots">
      <div class="dot active" id="dot0"></div>
      <div class="dot" id="dot1"></div>
      <div class="dot" id="dot2"></div>
      <div class="dot" id="dot3"></div>
    </div>
    <button class="tap-btn" onclick="nextCard()">
      <span>Buka Pesan</span> 💌
    </button>
  </div>

  <!-- Footer -->
  <div class="footer-stamp">
    <span class="stamp-text">Shiro • Special Dedicated</span>
    <span class="stamp-heart">Forever with Zahra 🤍</span>
  </div>
</div>

<script>
const quotes = [
  "Sebuket bunga yang mekar khusus buat Zahra. Terima kasih udah selalu hadir bawa senyum dan suasana yang selalu bikin tenang setiap hari.",
  "Dunia di luar mungkin sering berisik dan bikin capek. Tapi kalau sama kamu, semuanya selalu terasa sederhana dan cukup.",
  "Nggak butuh momen yang serba mewah, asal ada kamu di setiap ceritanya, itu udah lebih dari kata sempurna.",
  "Bunga ini mungkin bisa layu, tapi rasa sayang dan tempat istimewa buat kamu nggak akan pernah pudar. Tetap jadi Zahra yang kukenal ya."
];
let currentIdx = 0;

function nextCard() {
  currentIdx = (currentIdx + 1) % quotes.length;
  const textEl = document.getElementById('quoteText');
  const bouquetEl = document.getElementById('bouquetEl');

  // Flower burst animation
  if (bouquetEl) {
    bouquetEl.style.transform = 'scale(1.15) rotate(' + (Math.random() * 6 - 3) + 'deg)';
    setTimeout(() => {
      bouquetEl.style.transform = '';
    }, 300);
  }

  // Text transition
  if (textEl) {
    textEl.style.opacity = '0';
    textEl.style.transform = 'translateY(4px)';
    setTimeout(() => {
      textEl.innerHTML = quotes[currentIdx];
      textEl.style.opacity = '1';
      textEl.style.transform = 'translateY(0)';
    }, 180);
  }

  // Update dots
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('dot' + i);
    if (dot) {
      if (i === currentIdx) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    }
  }
}
</script>
`;
}

const pluginConfig = {
  name: 'zahra',
  alias: ['dearzahra', 'lovezahra', 'myzahra', 'zahralove', 'bunga', 'bucketbunga'],
  category: 'fun',
  description: 'Kartu buket bunga beranimasi dan ungkapan interaktif untuk Zahra',
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

  const htmlPayload = renderZahraBouquetCard();

  const msgContent = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: '',
        botResponseId: 'shirowahd-zahra-bouquet',
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
                response_id: 'shirowahd-zahra-bouquet',
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
