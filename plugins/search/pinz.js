import axios from 'axios'
import https from 'https'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

const agent = new https.Agent({
    rejectUnauthorized: true,
    maxVersion: 'TLSv1.3',
    minVersion: 'TLSv1.2'
})

const SIG = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA=="
const CERT1 = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg"
const CERT2 = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=="

async function getCookies() {
    try {
        const response = await axios.get('https://www.pinterest.com/csrf_error/', { httpsAgent: agent, timeout: 12000 })
        const setCookieHeaders = response.headers['set-cookie']
        if (!setCookieHeaders) return null
        return setCookieHeaders.map(v => v.split(';')[0].trim()).join('; ')
    } catch {
        return null
    }
}

async function pinterest(query, poolSize = 60) {
    try {
        const cookies = await getCookies()
        if (!cookies) return []
        const url = 'https://www.pinterest.com/resource/BaseSearchResource/get/'
        const headers = {
            accept: 'application/json, text/javascript, */*, q=0.01',
            'accept-language': 'en-US,en;q=0.9',
            cookie: cookies,
            referer: 'https://www.pinterest.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/133.0.0.0 Safari/537.36',
            'x-app-version': 'c056fb7',
            'x-pinterest-appstate': 'active',
            'x-pinterest-pws-handler': 'www/[username]/[slug].js',
            'x-pinterest-source-url': '/search/pins/',
            'x-requested-with': 'XMLHttpRequest'
        }

        const pool = []
        const seenIds = new Set()
        let bookmark = null

        for (let page = 0; page < 4 && pool.length < poolSize; page++) {
            const options = { isPrefetch: false, query, scope: 'pins', no_fetch_context_on_resource: false }
            if (bookmark) options.bookmarks = [bookmark]

            const params = {
                source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
                data: JSON.stringify({ options, context: {} }),
                _: Date.now()
            }

            const { data } = await axios.get(url, { httpsAgent: agent, headers, params, timeout: 15000 })
            const results = data?.resource_response?.data?.results || []

            for (const v of results) {
                if (!v?.images?.orig?.url || !v?.id || seenIds.has(v.id)) continue
                seenIds.add(v.id)
                pool.push({
                    id: v.id,
                    fullname: v?.pinner?.full_name || v?.pinner?.username || 'Pinterest',
                    username: v?.pinner?.username || '',
                    caption: v?.grid_title || v?.title || 'Pinterest image',
                    image: v.images.orig.url,
                    preview: v?.images?.['236x']?.url || v?.images?.['474x']?.url || v?.images?.['564x']?.url || v?.images?.['736x']?.url || v.images.orig.url,
                    source: `https://www.pinterest.com/pin/${v.id}/`
                })
            }

            bookmark = data?.resource_response?.bookmark
            if (!bookmark || bookmark === '-end-' || results.length === 0) break
        }

        return pool
    } catch {
        return []
    }
}

function shuffle(arr) {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

async function fetchImage(url) {
    try {
        const response = await axios.get(url, {
            httpsAgent: agent,
            responseType: 'arraybuffer',
            timeout: 20000,
            maxContentLength: 15 * 1024 * 1024,
            headers: {
                accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                referer: 'https://www.pinterest.com/',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/133.0.0.0 Safari/537.36'
            }
        })
        const type = String(response.headers['content-type'] || 'image/jpeg').split(';')[0]
        if (!type.startsWith('image/')) return null
        return { buffer: Buffer.from(response.data), mimetype: type }
    } catch {
        return null
    }
}

function esc(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function makeHtml(query, results, media) {
    const rawData = results.map((v, i) => ({
        id: i,
        caption: v.caption,
        user: v.fullname + (v.username ? ` · @${v.username}` : ''),
        image: media[i]?.dataUri || v.preview || v.image,
        origUrl: v.image || v.preview
    }))

    const safeData = JSON.stringify(rawData).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e')
    const tags = [`${query} aesthetic`, `${query} wallpaper`, `${query} art`, `${query} icon`]

    return `<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#0d0e12;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent;overflow:hidden}
#app{width:100%;max-width:440px;margin:auto;padding:12px 14px 10px;background:#0d0e12;display:flex;flex-direction:column;border-radius:20px;user-select:none}
.header-brand{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;color:#8e9297;font-size:11px;font-weight:700;letter-spacing:0.5px}
.brand-left{display:flex;align-items:center;gap:6px}
.brand-left span.logo{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;background:#e60023;color:#fff;font-size:11px;font-weight:900;border-radius:50%}
.brand-wm{color:#25d366;font-family:monospace;font-size:9.5px;letter-spacing:1px;font-weight:700}
.search-box{display:flex;gap:6px;margin-bottom:8px}
.search-input{flex:1;background:#1a1c23;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:6px 12px;color:#fff;font-size:11.5px;outline:none}
.chips-container{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:8px;scrollbar-width:none;touch-action:pan-x;-webkit-overflow-scrolling:touch}
.chips-container::-webkit-scrollbar{display:none}
.chip{background:#1a1c23;color:#c4c7cc;padding:3.5px 9px;border-radius:10px;font-size:10.5px;white-space:nowrap;font-weight:500;border:1px solid rgba(255,255,255,0.05)}
.grid-view{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;touch-action:pan-x}
.card{border-radius:12px;overflow:hidden;background:#16181f;cursor:pointer;position:relative;border:1px solid rgba(255,255,255,0.06)}
.card img{width:100%;display:block;border-radius:12px;object-fit:cover;aspect-ratio:3/4}
.card-cap{position:absolute;bottom:0;left:0;right:0;padding:16px 6px 6px;background:linear-gradient(transparent,rgba(0,0,0,0.85));font-size:9.5px;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#e6e8ec}
.pagination{display:flex;align-items:center;justify-content:space-between;background:#16181f;padding:6px 12px;border-radius:14px;border:1px solid rgba(255,255,255,0.06)}
.page-btn{background:#e60023;color:#fff;border:none;padding:5px 12px;border-radius:10px;font-weight:700;font-size:11px;cursor:pointer}
.page-btn:disabled{background:#232630;color:#555964;cursor:not-allowed}
.page-info{font-size:11.5px;font-weight:700;color:#8e9297;font-family:monospace}
.footer-tag{text-align:center;margin-top:6px;font-size:9px;color:rgba(255,255,255,0.3);font-family:monospace;letter-spacing:1.2px}
.modal{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:9999;display:none;flex-direction:column;align-items:center;justify-content:center;padding:12px}
.modal.active{display:flex}
.modal-card{width:100%;max-width:300px;background:#16181f;border-radius:18px;overflow:hidden;position:relative;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,0.1)}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#1f222b;font-size:11.5px;font-weight:700;color:#ccc}
.modal-actions{display:flex;gap:10px;align-items:center}
.icon-btn{background:none;border:none;color:#fff;font-size:15px;cursor:pointer;padding:2px}
.modal-img-wrapper{position:relative;width:100%;height:350px;background:#000;display:flex;align-items:center;justify-content:center}
.modal-img-wrapper img{width:100%;height:100%;object-fit:contain}
.modal-nav{position:absolute;right:8px;bottom:8px;display:flex;flex-direction:column;gap:6px}
.nav-arrow{background:rgba(0,0,0,0.65);border:1px solid rgba(255,255,255,0.15);color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer}
.modal-footer{padding:8px 12px;font-size:10.5px;color:#8e9297}
.modal-cap{color:#fff;font-size:11.5px;font-weight:700;margin-bottom:2px}
.copy-toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#25d366;color:#000;padding:6px 14px;border-radius:16px;font-size:11px;font-weight:800;display:none;z-index:10000}
</style>

<div id="app">
<div class="header-brand">
  <div class="brand-left"><span class="logo">P</span> PINTEREST · ${esc(query)}</div>
  <div class="brand-wm">● SHIROWAHD</div>
</div>
<div class="search-box">
<input type="text" class="search-input" value="${esc(query)}" readonly />
</div>
<div class="chips-container">
${tags.map(t => `<div class="chip">${esc(t)}</div>`).join('')}
</div>
<div class="grid-view" id="grid"></div>
<div class="pagination">
<button class="page-btn" id="btn-prev">◀ Prev</button>
<span class="page-info" id="page-info">1 / 1</span>
<button class="page-btn" id="btn-next">Next ▶</button>
</div>
<div class="footer-tag">SHIROWAHD • INTERACTIVE VISUAL EXPLORER</div>
</div>

<div class="modal" id="modal">
<div class="modal-card">
<div class="modal-header">
<span id="modal-index">1 / ${rawData.length}</span>
<div class="modal-actions">
<button class="icon-btn" id="btn-copy" title="Salin Link">🔗</button>
<button class="icon-btn" id="btn-close" title="Tutup">✕</button>
</div>
</div>
<div class="modal-img-wrapper">
<img id="modal-img" src="" alt="" />
<div class="modal-nav">
<button class="nav-arrow" id="nav-up">▲</button>
<button class="nav-arrow" id="nav-down">▼</button>
</div>
</div>
<div class="modal-footer">
<div class="modal-cap" id="modal-cap"></div>
<div id="modal-user"></div>
</div>
</div>
</div>

<div class="copy-toast" id="toast">Link disalin! Kirim ke chat untuk unduh</div>

<script>
(function(){
var items = ${safeData};
var pageSize = 4;
var currentPage = 0;
var totalPages = Math.ceil(items.length / pageSize) || 1;

var grid = document.getElementById('grid');
var btnPrev = document.getElementById('btn-prev');
var btnNext = document.getElementById('btn-next');
var pageInfo = document.getElementById('page-info');

var modal = document.getElementById('modal');
var modalImg = document.getElementById('modal-img');
var modalIndex = document.getElementById('modal-index');
var modalCap = document.getElementById('modal-cap');
var modalUser = document.getElementById('modal-user');
var toast = document.getElementById('toast');
var currentIndex = 0;

function renderPage(){
    var start = currentPage * pageSize;
    var end = Math.min(start + pageSize, items.length);
    var pageItems = items.slice(start, end);

    grid.innerHTML = pageItems.map(function(item, idx){
        var realIndex = start + idx;
        return '<div class="card" onclick="openModal(' + realIndex + ')">' +
            '<img src="' + item.image + '" loading="lazy" />' +
            '<div class="card-cap">' + (item.caption || '') + '</div>' +
            '</div>';
    }).join('');

    pageInfo.textContent = (currentPage + 1) + ' / ' + totalPages;
    btnPrev.disabled = currentPage === 0;
    btnNext.disabled = currentPage >= totalPages - 1;
}

btnPrev.onclick = function(){
    if(currentPage > 0){
        currentPage--;
        renderPage();
    }
};

btnNext.onclick = function(){
    if(currentPage < totalPages - 1){
        currentPage++;
        renderPage();
    }
};

var touchStartX = 0;
var touchEndX = 0;

grid.addEventListener('touchstart', function(e){
    touchStartX = e.changedTouches[0].screenX;
}, {passive: true});

grid.addEventListener('touchend', function(e){
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, {passive: true});

function handleSwipe(){
    var swipeThreshold = 50;
    if(touchEndX < touchStartX - swipeThreshold){
        if(currentPage < totalPages - 1){
            currentPage++;
            renderPage();
        }
    }
    if(touchEndX > touchStartX + swipeThreshold){
        if(currentPage > 0){
            currentPage--;
            renderPage();
        }
    }
}

window.openModal = function(idx){
    currentIndex = idx;
    updateModal();
    modal.classList.add('active');
};

function updateModal(){
    var item = items[currentIndex];
    modalImg.src = item.image;
    modalIndex.textContent = (currentIndex + 1) + ' / ' + items.length;
    modalCap.textContent = item.caption || '';
    modalUser.textContent = item.user || '';
}

document.getElementById('btn-close').onclick = function(){
    modal.classList.remove('active');
};

document.getElementById('nav-up').onclick = function(){
    if(currentIndex > 0){ currentIndex--; updateModal(); }
};

document.getElementById('nav-down').onclick = function(){
    if(currentIndex < items.length - 1){ currentIndex++; updateModal(); }
};

document.getElementById('btn-copy').onclick = function(){
    var url = items[currentIndex].origUrl;
    var success = false;
    try {
        var tempInput = document.createElement('textarea');
        tempInput.value = url;
        tempInput.style.position = 'fixed';
        tempInput.style.left = '-9999px';
        tempInput.style.top = '0';
        document.body.appendChild(tempInput);
        tempInput.focus();
        tempInput.select();
        success = document.execCommand('copy');
        document.body.removeChild(tempInput);
    } catch(e) {
        success = false;
    }
    if(!success) {
        prompt('Salin link gambar di bawah ini:', url);
    } else {
        toast.style.display = 'block';
        setTimeout(function(){ toast.style.display = 'none'; }, 2000);
    }
};

renderPage();
})();
</script>`
}

async function sendRichHtml(sock, chatId, html, title = 'Pinterest Search') {
    const data = Buffer.from(JSON.stringify({
        __typename: 'GenAIUnifiedResponse',
        response_id: randomUUID(),
        sections: [{
            __typename: 'GenAIUnifiedResponseSection',
            view_model: {
                __typename: 'GenAISingleLayoutViewModel',
                primitive: {
                    __typename: 'GenAIaeacdsnwHtmlPrimitive',
                    payload: html,
                    trusted_sources: ['*', 'pinimg.com', 'pinterest.com']
                }
            }
        }]
    })).toString('base64')

    return sock.relayMessage(chatId, {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: 'SHIROWAHD • Pinterest Interactive',
                sessionTransparencyMetadata: {
                    disclaimerText: 'SHIRO HLZ • Verified Visuals',
                    hcaId: `hca_${Date.now()}`,
                    sessionTransparencyType: 1,
                },
                botResponseId: randomUUID(),
                verificationMetadata: {
                    proofs: [{
                        version: 1,
                        useCase: 1,
                        signature: SIG,
                        certificateChain: [CERT1, CERT2]
                    }]
                }
            }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{ messageType: 2, messageText: `📌 ${title} • SHIROWAHD` }],
                    unifiedResponse: { data },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
                        forwardOrigin: 4
                    }
                }
            }
        }
    }, {})
}

async function prepareMedia(results) {
    return Promise.all(results.map(async item => {
        const media = await fetchImage(item.preview || item.image)
        if (!media) return { dataUri: '', mimetype: '' }
        let buf = media.buffer
        let mime = media.mimetype
        try {
            // Optimasi resolusi thumbnail via sharp agar Base64 payload bubble WhatsApp ringan & tajam
            buf = await sharp(buf)
                .resize(320, null, { withoutEnlargement: true })
                .jpeg({ quality: 72 })
                .toBuffer()
            mime = 'image/jpeg'
        } catch {}
        const base64 = buf.toString('base64')
        return { dataUri: `data:${mime};base64,${base64}`, mimetype: mime }
    }))
}

const pluginConfig = {
    name: 'pinz',
    alias: ['pintap', 'pingallery', 'pinview'],
    category: 'search',
    description: '📌 Cari gambar Pinterest, galeri interaktif (grid + swipe + modal viewer)',
    usage: '.pinz <query> [jumlah]',
    example: '.pinz furina 12',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 8,
    energi: 1,
    isEnabled: true
}

const pinUrlRegex = /(https?:\/\/([a-zA-Z0-9-]+\.)?pinimg\.com\/[^\s]+|https?:\/\/(www\.)?pinterest\.com\/pin\/[^\s]+|https?:\/\/pin\.it\/[^\s]+)/i

/**
 * Otomatis mendownload gambar Pinterest resolusi tinggi jika user mengirim link Pinterest di chat
 */
async function checkPinterestLink(m, sock) {
    if (!m.body) return false
    const match = m.body.match(pinUrlRegex)
    if (!match) return false

    const rawUrl = match[0]
    let directImgUrl = rawUrl

    // Jika berupa link halaman pinterest atau shortlink pin.it, resolve dulu ke direct URL
    if (!/i\.pinimg\.com\/.*\.(jpg|jpeg|png|webp)/i.test(rawUrl)) {
        try {
            const pageRes = await axios.get(rawUrl, {
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/133.0.0.0 Safari/537.36'
                },
                timeout: 12000
            })
            const html = typeof pageRes.data === 'string' ? pageRes.data : JSON.stringify(pageRes.data)
            const mImg = html.match(/https:\/\/i\.pinimg\.com\/originals\/[a-zA-Z0-9\/._-]+/i) ||
                         html.match(/https:\/\/i\.pinimg\.com\/736x\/[a-zA-Z0-9\/._-]+/i)
            if (mImg) {
                directImgUrl = mImg[0]
            }
        } catch {}
    }

    const media = await fetchImage(directImgUrl)
    if (!media) return false

    await sock.sendMessage(
        m.chat,
        {
            image: media.buffer,
            caption: `✨ *ᴘɪɴᴛᴇʀᴇsᴛ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n> Berhasil mengunduh gambar resolusi tinggi.\n> 👤 _SHIROWAHD • Visual Hub_`
        },
        { quoted: m }
    )
    return true
}

async function handler(m, { sock }) {
    const text = m.text
    if (!text?.trim()) {
        return m.reply(
            `╭┈┈⬡「 📌 *ᴘɪɴᴛᴇʀᴇsᴛ ɢᴀʟʟᴇʀʏ* 」\n` +
            `┃ ㊗ *Penggunaan:* \`${m.prefix}${m.command} <query> [jumlah]\`\n` +
            `┃ 💡 *Contoh:* \`${m.prefix}${m.command} furina 12\`\n` +
            `╰┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈⬡`
        )
    }

    let input = text.trim()
    let count = 12
    const last = input.match(/(?:^|\s)(\d+)\s*$/)
    if (last) {
        count = Math.max(1, Math.min(20, Number(last[1])))
        input = input.slice(0, last.index).trim()
    }
    if (!input) return m.reply('Query Pinterest tidak boleh kosong.')

    if (typeof m.react === 'function') {
        try { await m.react('⏳') } catch {}
    }

    try {
        const pool = await pinterest(input)
        if (!pool.length) {
            if (typeof m.react === 'function') try { await m.react('❌') } catch {}
            return m.reply(`❌ Tidak ada hasil Pinterest untuk *"${input}"*.`)
        }
        const results = shuffle(pool).slice(0, count)
        const media = await prepareMedia(results)
        await sendRichHtml(sock, m.chat, makeHtml(input, results, media), input)

        if (typeof m.react === 'function') {
            try { await m.react('📌') } catch {}
        }
    } catch (e) {
        console.error('[Pinz]', e?.message || e)
        if (typeof m.react === 'function') try { await m.react('❌') } catch {}
        await m.reply('❌ Gagal mengambil galeri Pinterest.')
    }
}

export { pluginConfig as config, handler, checkPinterestLink }
