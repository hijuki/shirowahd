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
                    fullname: v?.pinner?.full_name || v?.pinner?.username || 'Pinterest Creator',
                    username: v?.pinner?.username || '',
                    caption: v?.grid_title || v?.title || `${query} pin`,
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
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function makeHtml(query, results, media) {
    const rawData = results.map((v, i) => {
        const fullname = v.fullname || v.username || 'Pinterest';
        const initial = (fullname || 'P').charAt(0).toUpperCase();
        return {
            id: i,
            caption: v.caption || 'Pinterest Pin',
            user: fullname,
            initial: initial,
            image: media[i]?.dataUri || v.preview || v.image,
            origUrl: v.image || v.preview
        };
    });

    const safeData = JSON.stringify(rawData).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e')

    return `<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;padding:0;background:#111111;color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;user-select:none;overflow:hidden}
#app{width:100%;max-width:440px;margin:0 auto;padding:12px 14px 14px;background:#111111;display:flex;flex-direction:column;position:relative}

/* Authentic Pinterest Header */
.pin-topbar{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.pin-logo-box{display:flex;align-items:center;gap:6px;flex:none}
.pin-logo{width:26px;height:26px;fill:#e60023}
.pin-search-capsule{flex:1;display:flex;align-items:center;gap:8px;background:#262626;border-radius:999px;padding:7px 14px;height:36px;border:1px solid rgba(255,255,255,0.06)}
.pin-search-icon{width:13px;height:13px;fill:#8e8e8e;flex:none}
.pin-search-text{flex:1;font-size:12.5px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pin-badge-count{font-size:10px;font-weight:700;color:#a0a0a0;background:#1a1a1a;padding:2px 8px;border-radius:12px;font-family:monospace}

/* Authentic Pinterest Pin Grid (Cards with metadata UNDERNEATH, no AI gradients) */
.pin-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.pin-card{display:flex;flex-direction:column;cursor:pointer;background:transparent;border-radius:16px}
.pin-photo-box{position:relative;width:100%;border-radius:16px;overflow:hidden;background:#1c1c1e;aspect-ratio:3/4}
.pin-photo-box img{width:100%;height:100%;object-fit:cover;display:block;border-radius:16px;transition:transform 0.2s ease}
.pin-card:active .pin-photo-box img{transform:scale(0.97)}
.pin-save-overlay{position:absolute;top:7px;right:7px;background:#e60023;color:#fff;font-size:9.5px;font-weight:700;padding:3.5px 9px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,0.4);opacity:0.95}
.pin-info{padding:6px 2px 2px;display:flex;flex-direction:column;gap:3px}
.pin-title{font-size:11.5px;font-weight:600;color:#f2f2f2;line-height:1.25;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.pin-author{display:flex;align-items:center;gap:5px}
.pin-avatar{width:15px;height:15px;border-radius:50%;background:#2e2e2e;color:#ddd;font-size:8.5px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;text-transform:uppercase}
.pin-name{font-size:10px;color:#8e8e8e;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* Authentic Pinterest Dock Pagination */
.pin-dock{display:flex;align-items:center;justify-content:space-between;background:#1c1c1e;border-radius:999px;padding:4px 6px;border:1px solid rgba(255,255,255,0.06)}
.dock-btn{background:#2a2a2c;color:#fff;border:none;width:30px;height:30px;border-radius:50%;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.15s}
.dock-btn:disabled{background:transparent;color:#444;cursor:not-allowed}
.dock-info{font-size:11.5px;font-weight:600;color:#8e8e8e;font-family:monospace}
.dock-info span{color:#fff;font-weight:700}
.dock-brand{display:flex;align-items:center;gap:4px;font-size:9px;color:rgba(255,255,255,0.4);font-family:monospace;letter-spacing:1px;padding-right:6px}
.dock-brand .dot{width:4px;height:4px;border-radius:50%;background:#e60023}

/* Authentic Pinterest Pin Detail Modal Sheet */
.modal-sheet{position:fixed;inset:0;background:rgba(0,0,0,0.88);backdrop-filter:blur(8px);z-index:9999;display:none;align-items:center;justify-content:center;padding:14px}
.modal-sheet.active{display:flex}
.modal-box{width:100%;max-width:315px;background:#1c1c1e;border-radius:24px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 14px 40px rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.08)}
.modal-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06)}
.modal-author{display:flex;align-items:center;gap:8px;min-width:0;flex:1}
.modal-avatar{width:24px;height:24px;border-radius:50%;background:#333;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.modal-author-name{font-size:12px;font-weight:600;color:#eee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.modal-save-btn{background:#e60023;color:#fff;border:none;padding:6px 14px;border-radius:999px;font-size:11.5px;font-weight:700;cursor:pointer;flex:none;box-shadow:0 2px 8px rgba(230,0,35,0.4)}
.modal-img-area{position:relative;width:100%;height:350px;background:#0c0c0d;display:flex;align-items:center;justify-content:center}
.modal-img-area img{width:100%;height:100%;object-fit:contain}
.modal-arrow{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;background:rgba(28,28,30,0.8);border:1px solid rgba(255,255,255,0.12);color:#fff;font-size:16px;font-weight:bold;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(4px)}
.modal-arrow.left{left:8px}
.modal-arrow.right{right:8px}
.modal-foot{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px}
.modal-caption{font-size:12.5px;font-weight:700;color:#fff;line-height:1.3}
.modal-action-row{display:flex;align-items:center;justify-content:space-between;margin-top:6px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06)}
.modal-domain{font-size:11px;color:#8e8e8e;text-decoration:none;font-weight:500}
.modal-close-btn{background:#2a2a2c;border:none;color:#ddd;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px}
.copy-toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#e60023;color:#fff;padding:7px 16px;border-radius:999px;font-size:11px;font-weight:700;display:none;z-index:10000;box-shadow:0 4px 16px rgba(0,0,0,0.6)}
</style>

<div id="app">
  <div class="pin-topbar">
    <div class="pin-logo-box">
      <svg class="pin-logo" viewBox="0 0 24 24">
        <path d="M12 0a12 12 0 0 0-4.37 23.17c-.07-.94-.13-2.38.03-3.41l1.1-4.7s-.28-.56-.28-1.39c0-1.3.75-2.27 1.7-2.27.8 0 1.18.6 1.18 1.33 0 .81-.51 2.01-.78 3.13-.22.94.47 1.7 1.4 1.7 1.68 0 2.97-1.77 2.97-4.33 0-2.26-1.63-3.85-3.95-3.85-2.69 0-4.27 2.02-4.27 4.1 0 .81.31 1.68.7 2.16.08.09.09.18.06.32l-.27 1.1c-.04.18-.15.22-.34.13-1.28-.6-2.07-2.46-2.07-3.96 0-3.23 2.35-6.2 6.77-6.2 3.56 0 6.32 2.53 6.32 5.92 0 3.53-2.23 6.38-5.32 6.38-1.04 0-2.02-.54-2.35-1.18l-.64 2.44c-.23.89-.86 2-1.28 2.69A12 12 0 1 0 12 0z"/>
      </svg>
    </div>
    <div class="pin-search-capsule">
      <svg class="pin-search-icon" viewBox="0 0 24 24">
        <path d="M10 2a8 8 0 0 1 6.32 12.9l5.39 5.39-1.42 1.42-5.39-5.39A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/>
      </svg>
      <span class="pin-search-text">${esc(query)}</span>
      <span class="pin-badge-count">${rawData.length} Pins</span>
    </div>
  </div>

  <div class="pin-grid" id="grid"></div>

  <div class="pin-dock">
    <button class="dock-btn" id="btn-prev">‹</button>
    <div class="dock-info"><span id="page-cur">1</span> / <span id="page-total">1</span></div>
    <div class="dock-brand"><span class="dot"></span> SHIROWAHD</div>
    <button class="dock-btn" id="btn-next">›</button>
  </div>
</div>

<div class="modal-sheet" id="modal">
  <div class="modal-box">
    <div class="modal-head">
      <div class="modal-author">
        <div class="modal-avatar" id="modal-avatar">P</div>
        <div class="modal-author-name" id="modal-user">Pinterest Creator</div>
      </div>
      <button class="modal-save-btn" id="btn-save">Simpan</button>
    </div>
    <div class="modal-img-area">
      <img id="modal-img" src="" alt="" />
      <button class="modal-arrow left" id="nav-prev">‹</button>
      <button class="modal-arrow right" id="nav-next">›</button>
    </div>
    <div class="modal-foot">
      <div class="modal-caption" id="modal-cap"></div>
      <div class="modal-action-row">
        <span class="modal-domain">pinterest.com</span>
        <button class="modal-close-btn" id="btn-close">✕</button>
      </div>
    </div>
  </div>
</div>

<div class="copy-toast" id="toast">Tautan Pin disalin!</div>

<script>
(function(){
var items = ${safeData};
var pageSize = 4;
var currentPage = 0;
var totalPages = Math.ceil(items.length / pageSize) || 1;

var grid = document.getElementById('grid');
var btnPrev = document.getElementById('btn-prev');
var btnNext = document.getElementById('btn-next');
var pageCur = document.getElementById('page-cur');
var pageTotal = document.getElementById('page-total');

var modal = document.getElementById('modal');
var modalImg = document.getElementById('modal-img');
var modalAvatar = document.getElementById('modal-avatar');
var modalUser = document.getElementById('modal-user');
var modalCap = document.getElementById('modal-cap');
var toast = document.getElementById('toast');
var currentIndex = 0;

function renderPage(){
    var start = currentPage * pageSize;
    var end = Math.min(start + pageSize, items.length);
    var pageItems = items.slice(start, end);

    grid.innerHTML = pageItems.map(function(item, idx){
        var realIndex = start + idx;
        return '<div class="pin-card" onclick="openModal(' + realIndex + ')">' +
            '<div class="pin-photo-box">' +
                '<img src="' + item.image + '" loading="lazy" />' +
                '<div class="pin-save-overlay">Simpan</div>' +
            '</div>' +
            '<div class="pin-info">' +
                '<div class="pin-title">' + (item.caption || 'Pinterest Pin') + '</div>' +
                '<div class="pin-author">' +
                    '<div class="pin-avatar">' + item.initial + '</div>' +
                    '<div class="pin-name">' + item.user + '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');

    pageCur.textContent = currentPage + 1;
    pageTotal.textContent = totalPages;
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
    modalAvatar.textContent = item.initial;
    modalUser.textContent = item.user;
    modalCap.textContent = item.caption || '';
}

document.getElementById('btn-close').onclick = function(){
    modal.classList.remove('active');
};

document.getElementById('nav-prev').onclick = function(){
    if(currentIndex > 0){ currentIndex--; updateModal(); }
};

document.getElementById('nav-next').onclick = function(){
    if(currentIndex < items.length - 1){ currentIndex++; updateModal(); }
};

function copyLink(){
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
        prompt('Salin link gambar Pinterest:', url);
    } else {
        toast.style.display = 'block';
        setTimeout(function(){ toast.style.display = 'none'; }, 2000);
    }
}

document.getElementById('btn-save').onclick = copyLink;

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
