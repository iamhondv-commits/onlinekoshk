(function () {
    'use strict';

    const PAGE_FILES = {
        product: 'index.html',
        cart: 'index.html',
        wishlist: 'index.html',
        checkout: 'index.html',
        register: 'index.html',
        home: 'index.html',
        auth: 'index.html',
        track: 'index.html',
        about: 'index.html',
        privacy: 'index.html',
        terms: 'index.html',
        contact: 'index.html'
    };

    function encodePayload(data) {
        const json = JSON.stringify({
            ...data,
            _ts: Date.now(),
            _r: Math.random().toString(36).slice(2, 10)
        });
        const b64 = btoa(unescape(encodeURIComponent(json)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        return Math.random().toString(36).slice(2, 6) + b64.substring(0, 12);
    }

    function decodePayload(v) {
        if (!v || v.length < 6) return null;
        try {
            const b64 = v.slice(4).replace(/-/g, '+').replace(/_/g, '/');
            const pad = b64.length % 4;
            const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
            const json = decodeURIComponent(escape(atob(padded)));
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    function buildUrl(pageType, extra) {
        const file = PAGE_FILES[pageType] || 'index.html';
        const v = encodePayload({ t: pageType, ...(extra || {}) });
        return `${file}?v=${v}`;
    }

    function openPage(pageType, extra, newTab = true) {
        // [تأمين وحل حاسم للفراغ والتهنيج]: نغير الرابط إجبارياً لإعادة تشغيل الـ Snapshots بنقاء وبدون Loop لا نهائي
        if (!newTab && window.location.pathname.includes('index.html')) {
            const url = buildUrl(pageType, extra || {});
            window.location.href = url;
            return;
        }

        const url = buildUrl(pageType, extra || {});
        if (newTab) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = url;
        }
    }

    function getCurrentPayload() {
        const params = new URLSearchParams(window.location.search);
        const v = params.get('v');
        if (v) return decodePayload(v);
        return null;
    }

    function createProductLink(productId, productName, category) {
        const slug = encodePayload({
            type: 'product',
            id: productId,
            name: productName,
            category: category
        });
        return `index.html?p=${slug}`;
    }

    window.KoshkNav = {
        PAGE_FILES,
        encodePayload,
        decodePayload,
        buildUrl,
        openPage,
        getCurrentPayload,
        createProductLink
    };

    document.addEventListener('click', function (e) {
        const el = e.target.closest('[data-koshk-page]');
        if (!el) return;
        e.preventDefault();
        const page = el.getAttribute('data-koshk-page');
        
        let newTab = true;
        if (page === 'cart' || page === 'checkout' || page === 'home') {
            newTab = false;
        }
        if (el.getAttribute('data-koshk-newtab') === 'false') {
            newTab = false;
        }
        
        let extra = {};
        try {
            const raw = el.getAttribute('data-koshk-data');
            if (raw) extra = JSON.parse(raw);
        } catch (_) { /* ignore */ }
        openPage(page, extra, newTab);
    });
})();

// ==========================================
// اعتراض روابط الفوتر والهيدر لإرسالها لمسار التوجيه الآمن وإحياء الداتا لايف دايماً
// ==========================================
document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link) return;
    const text = link.innerText.trim();
    const href = link.getAttribute('href') || '';

    if (href.includes("showPage('home')") || text === "الصفحة الرئيسية" || text === "الرئيسية" || text === "Online Koshk") {
        if (window.KoshkNav && typeof window.KoshkNav.openPage === 'function') {
            e.preventDefault();
            e.stopPropagation();
            window.KoshkNav.openPage('home', {}, false);
        }
    }
}, true);