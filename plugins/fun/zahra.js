import config from '../../config.js';

function renderZahraBouquetCard() {
  return `
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; box-sizing: border-box; margin: 0; padding: 0; }
body {
  margin: 0;
  padding: 0;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
.love-card {
  position: relative;
  width: 100%;
  max-width: 330px;
  background: linear-gradient(165deg, #180812 0%, #0c0309 100%);
  border: 1px solid rgba(255, 77, 121, 0.3);
  border-radius: 16px;
  padding: 8px 10px 6px;
  box-shadow: 0 8px 24px rgba(255, 42, 109, 0.2);
  overflow: hidden;
}

/* Ambient glow */
.ambient-glow {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 130px;
  height: 130px;
  background: radial-gradient(circle, rgba(255, 42, 109, 0.3) 0%, transparent 70%);
  pointer-events: none;
}

/* Floating petals */
.petal {
  position: absolute;
  border-radius: 60% 40% 70% 30% / 60% 30% 70% 40%;
  background: linear-gradient(135deg, #ff2a6d 0%, #bd003c 100%);
  opacity: 0.6;
  pointer-events: none;
  animation: fallPetal linear infinite;
  z-index: 1;
}
.petal:nth-child(1) { width: 8px; height: 6px; left: 10%; top: -8px; animation-duration: 4.5s; animation-delay: 0s; }
.petal:nth-child(2) { width: 7px; height: 5px; left: 45%; top: -8px; animation-duration: 5.5s; animation-delay: 1.2s; }
.petal:nth-child(3) { width: 9px; height: 7px; left: 85%; top: -8px; animation-duration: 4.8s; animation-delay: 0.5s; }

@keyframes fallPetal {
  0% { transform: translateY(0) rotate(0deg); opacity: 0; }
  20% { opacity: 0.8; }
  80% { opacity: 0.8; }
  100% { transform: translateY(280px) rotate(360deg); opacity: 0; }
}

/* Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  position: relative;
  z-index: 2;
}
.header-tag {
  font-size: 7.5px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #ff85a2;
  text-transform: uppercase;
}
.header-pill {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 7.5px;
  font-weight: 700;
  color: #ffd166;
  background: rgba(255, 209, 102, 0.12);
  border: 1px solid rgba(255, 209, 102, 0.3);
  padding: 1px 6px;
  border-radius: 100px;
}

/* Horizontal Hero Row */
.hero-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 77, 121, 0.16);
  border-radius: 10px;
  padding: 4px 8px;
  margin-bottom: 5px;
  position: relative;
  z-index: 2;
  cursor: pointer;
}
.bouquet-visual {
  position: relative;
  width: 44px;
  height: 44px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: floatBouquet 3s ease-in-out infinite;
  filter: drop-shadow(0 2px 8px rgba(255, 42, 109, 0.35));
}
@keyframes floatBouquet {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-2px) rotate(1.5deg); }
}

.bouquet-aura {
  position: absolute;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 77, 121, 0.4) 0%, transparent 70%);
}

.hero-copy {
  overflow: hidden;
  flex: 1;
}
.sub-for {
  font-size: 7.5px;
  color: #ff85a2;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  font-weight: 700;
  line-height: 1;
}
.name-zahra {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 16px;
  font-weight: 700;
  font-style: italic;
  letter-spacing: -0.2px;
  line-height: 1.2;
  background: linear-gradient(135deg, #ffffff 0%, #ffc0d0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Message Box */
.message-box {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 77, 121, 0.12);
  border-radius: 8px;
  padding: 6px 8px;
  margin-bottom: 5px;
  min-height: 38px;
  display: flex;
  align-items: center;
}
.message-text {
  font-size: 10px;
  line-height: 1.42;
  color: #fce7f0;
  transition: opacity 0.15s ease, transform 0.15s ease;
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
  gap: 3px;
}
.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
}
.dot.active {
  width: 12px;
  border-radius: 6px;
  background: #ff2a6d;
  box-shadow: 0 0 5px #ff2a6d;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  background: linear-gradient(135deg, #ff2a6d 0%, #e11d48 100%);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 4px 9px;
  font-size: 9.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 42, 109, 0.35);
  transition: transform 0.15s ease;
}
.action-btn:active {
  transform: scale(0.92);
}

.footer-stamp {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 4px;
  margin-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.stamp-text {
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: #8f5c76;
  text-transform: uppercase;
}
.stamp-heart {
  font-size: 8px;
  color: #ff85a2;
}

/* Easter Egg Secret Screen */
.easter-egg-screen {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, #260a1e 0%, #0d0209 100%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  text-align: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.easter-egg-screen.active {
  opacity: 1;
  pointer-events: auto;
}
.egg-crown {
  font-size: 20px;
  animation: crownBounce 1.8s infinite ease-in-out;
  margin-bottom: 1px;
}
@keyframes crownBounce {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(4deg); }
}
.egg-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #ffd166;
  text-transform: uppercase;
  margin-bottom: 2px;
  text-shadow: 0 0 8px rgba(255, 209, 102, 0.5);
}
.egg-desc {
  font-size: 9.5px;
  line-height: 1.38;
  color: #ffffff;
  margin-bottom: 6px;
}
.burst-btn {
  background: linear-gradient(135deg, #ffd166 0%, #ff9f1c 100%);
  color: #2b0010;
  font-weight: 800;
  font-size: 9.5px;
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(255, 209, 102, 0.4);
}
.burst-btn:active { transform: scale(0.92); }
.close-egg {
  margin-top: 4px;
  font-size: 7.5px;
  color: #ff85a2;
  text-decoration: underline;
  cursor: pointer;
}

/* Burst particle element */
.burst-particle {
  position: absolute;
  pointer-events: none;
  z-index: 20;
  font-size: 12px;
  animation: popFly 1.1s forwards ease-out;
}
@keyframes popFly {
  0% { transform: translate(0, 0) scale(0.5); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(1.3); opacity: 0; }
}
</style>

<div class="love-card" id="mainCard">
  <div class="ambient-glow"></div>
  
  <!-- Falling Petals -->
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

  <!-- Horizontal Hero Row -->
  <div class="hero-row" onclick="nextCard()">
    <div class="bouquet-visual" id="bouquetEl">
      <div class="bouquet-aura"></div>
      <!-- SVG Floral Bouquet -->
      <svg width="40" height="40" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 70 L60 112 L80 70 Z" fill="#D4A373" stroke="#BA7C4D" stroke-width="1.5" />
        <path d="M36 68 L60 114 L52 68 Z" fill="#C59364" />
        <path d="M84 68 L60 114 L68 68 Z" fill="#E2B488" />
        <path d="M50 78 C56 74 64 74 70 78 C65 82 55 82 50 78 Z" fill="#FFD166" />
        <path d="M58 80 L52 94 L57 91 L62 94 Z" fill="#FFD166" />
        <path d="M62 80 L68 94 L63 91 L58 94 Z" fill="#FFC043" />
        <path d="M28 50 C26 38 40 38 44 48 C36 54 30 54 28 50 Z" fill="#2D6A4F" />
        <path d="M92 50 C94 38 80 38 76 48 C84 54 90 54 92 50 Z" fill="#2D6A4F" />
        <circle cx="42" cy="48" r="16" fill="url(#gradRosePink)" />
        <path d="M34 46 C34 40 48 38 50 48 C48 56 36 56 34 46 Z" fill="#FF4D79" />
        <circle cx="78" cy="48" r="16" fill="url(#gradRoseCoral)" />
        <path d="M70 46 C70 40 84 38 86 48 C84 56 72 56 70 46 Z" fill="#FF5E7E" />
        <circle cx="60" cy="42" r="20" fill="url(#gradRoseRed)" />
        <path d="M48 38 C50 28 70 28 72 38 C72 50 48 50 48 38 Z" fill="#E11D48" />
        <path d="M52 38 C54 32 66 32 68 38 C66 45 54 45 52 38 Z" fill="#BE123C" />
        <circle cx="60" cy="38" r="2.5" fill="#FFE4E6" />
        <circle cx="32" cy="36" r="3" fill="#FFFFFF" />
        <circle cx="88" cy="36" r="3" fill="#FFFFFF" />
        <circle cx="60" cy="22" r="3.5" fill="#FFFFFF" />
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
    <div class="hero-copy">
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
      <div class="dot" id="dot4" style="background:rgba(255,209,102,0.4)"></div>
    </div>
    <button class="action-btn" id="btnAction" onclick="nextCard()">
      <span id="btnText">Lanjut</span> 💌
    </button>
  </div>

  <!-- Footer -->
  <div class="footer-stamp">
    <span class="stamp-text">Shiro • Dedicated</span>
    <span class="stamp-heart">Forever with Zahra 🤍</span>
  </div>

  <!-- Easter Egg Screen -->
  <div class="easter-egg-screen" id="easterEggScreen">
    <div class="egg-crown">👑 ✨</div>
    <div class="egg-title">SECRET EASTER EGG!</div>
    <p class="egg-desc">
      Zahra, dari sekian banyak orang di dunia, kamu adalah anugerah paling berharga yang selalu kusyukuri. You are loved endlessly! 💖
    </p>
    <button class="burst-btn" onclick="fireBurst(event)">
      Ledakkan Cinta 💥
    </button>
    <span class="close-egg" onclick="resetCard()">← Kembali ke awal</span>
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
  currentIdx++;
  
  if (currentIdx >= quotes.length) {
    const egg = document.getElementById('easterEggScreen');
    if (egg) egg.classList.add('active');
    triggerAutoHearts();
    return;
  }

  const textEl = document.getElementById('quoteText');
  const bouquetEl = document.getElementById('bouquetEl');
  const btnText = document.getElementById('btnText');

  if (bouquetEl) {
    bouquetEl.style.transform = 'scale(1.15) rotate(-3deg)';
    setTimeout(() => { bouquetEl.style.transform = ''; }, 200);
  }

  if (textEl) {
    textEl.style.opacity = '0';
    textEl.style.transform = 'translateY(2px)';
    setTimeout(() => {
      textEl.innerHTML = quotes[currentIdx];
      textEl.style.opacity = '1';
      textEl.style.transform = 'translateY(0)';
    }, 130);
  }

  if (btnText) {
    btnText.textContent = (currentIdx === quotes.length - 1) ? 'Buka Kejutan' : 'Lanjut';
  }

  for (let i = 0; i < 5; i++) {
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

function resetCard() {
  currentIdx = 0;
  const egg = document.getElementById('easterEggScreen');
  if (egg) egg.classList.remove('active');
  const textEl = document.getElementById('quoteText');
  const btnText = document.getElementById('btnText');
  if (textEl) textEl.innerHTML = quotes[0];
  if (btnText) btnText.textContent = 'Lanjut';
  for (let i = 0; i < 5; i++) {
    const dot = document.getElementById('dot' + i);
    if (dot) {
      if (i === 0) dot.classList.add('active');
      else dot.classList.remove('active');
    }
  }
}

function fireBurst(e) {
  const card = document.getElementById('mainCard');
  if (!card) return;
  const emojis = ['💖', '💐', '✨', '🌸', '👑', '🤍', '🌹'];
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('div');
    p.className = 'burst-particle';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = '50%';
    p.style.top = '60%';
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 70;
    p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    card.appendChild(p);
    setTimeout(() => p.remove(), 1100);
  }
}

function triggerAutoHearts() {
  const card = document.getElementById('mainCard');
  if (!card) return;
  const emojis = ['✨', '💖', '🌟', '🤍'];
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'burst-particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      p.style.left = (20 + Math.random() * 60) + '%';
      p.style.top = (30 + Math.random() * 40) + '%';
      p.style.setProperty('--dx', (Math.random() * 50 - 25) + 'px');
      p.style.setProperty('--dy', (-30 - Math.random() * 40) + 'px');
      card.appendChild(p);
      setTimeout(() => p.remove(), 1100);
    }, i * 100);
  }
}
</script>
`;
}

const pluginConfig = {
  name: 'zahra',
  alias: ['dearzahra', 'lovezahra', 'myzahra', 'zahralove', 'bunga', 'bucketbunga'],
  category: 'fun',
  description: 'Kartu buket bunga beranimasi dan ungkapan interaktif untuk Zahra dengan Easter Egg',
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
