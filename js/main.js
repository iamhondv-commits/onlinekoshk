/* ==========================================================================
   أونلاين كشك - Main Interactive Script & Smart Engine Integration
   ========================================================================== */

// 🔒 دالة تشفير وتفكيك الروابط
window.KoshkEncoder = {
    encode: function(str) {
        try { return btoa(encodeURIComponent(str)); } catch(e) { return str; }
    },
    decode: function(str) {
        try { return decodeURIComponent(atob(str)); } catch(e) { return str; }
    }
};

// 🌟 دالة إنشاء Slug مقروء وواضح من العنوان
function createReadableSlug(title, id) {
    if (!title) return id || 'product';
    const cleanTitle = title.toLowerCase()
        .replace(/[^\w\u0621-\u064A\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    
    return `${cleanTitle}-${id}`;
}

document.addEventListener('DOMContentLoaded', async function () {
    // 🌟 تجميل شكل الـ URL وإخفاء امتداد .html برمجياً من شريط العنوان في المتصفح
    cleanUrlExtension();

    // 1. إنشاء الفقاعات البنفسجية المتحركة خلف السلايدر بدون تعطيل الرندر
    setTimeout(initBubbles, 50);

    // 2. تفعيل نسخ الكوبونات والمكونات التفاعلية
    attachCopyEvent();
    initSmartSearchEngine();
    initNewsletterSubscriber();
    initContactForm();
    initAddStoreForm();

    // 3. جلب البيانات الديناميكية من Supabase بالتوازي لمنع البطء
    let client = window.supabaseClient;
    if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    if (client) {
        // 🚀 تسريع جوهري: جلب كافة البيانات الأساسية بالتوازي في وقت واحد (Promise.all)
        await Promise.all([
            loadDynamicNavbarCategories(client),
            loadDynamicBanners(client),
            loadDynamicProducts(client),
            loadDynamicCoupons(client),
            loadSavedVirtualBuilderContent(client)
        ]);
    }
});

function initBubbles() {
    const bubblesWrapper = document.getElementById('bubblesWrapper');
    if (bubblesWrapper) {
        const fragment = document.createDocumentFragment();
        const bubbleCount = 10;
        for (let i = 0; i < bubbleCount; i++) {
            const bubble = document.createElement('div');
            bubble.classList.add('bubble');
            
            const size = Math.floor(Math.random() * 25) + 15;
            const posX = Math.floor(Math.random() * 95);
            const duration = Math.floor(Math.random() * 4) + 6;
            const delay = Math.random() * 3;

            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.left = `${posX}%`;
            bubble.style.animationDuration = `${duration}s`;
            bubble.style.animationDelay = `${delay}s`;

            fragment.appendChild(bubble);
        }
        bubblesWrapper.appendChild(fragment);
    }
}

// دالة إخفاء امتداد .html من شريط العنوان بسلاسة دون أخطاء Live Server
function cleanUrlExtension() {
    try {
        if (window.location.pathname.endsWith('.html')) {
            const cleanPath = window.location.pathname.replace('.html', '');
            window.history.replaceState(null, '', cleanPath + window.location.search);
        }
    } catch(e) {}
}

// دالة تطهير وتنظيف حقل البحث من الأكواد والرموز الضارة
function sanitizeSearchInput(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>'"]/g, '').trim();
}

// 🌟 دالة جلب الأقسام الشجرية وبناء القائمة العملاقة المفرودة بالعرض (Horizontal Mega Menu Grid) مع الكاش
async function loadDynamicNavbarCategories(client) {
    const dropdown = document.querySelector('#categoriesDropdown + .dropdown-menu');
    if (!dropdown) return;

    try {
        let categories = JSON.parse(sessionStorage.getItem('koshk_categories') || 'null');

        if (!categories) {
            const { data, error } = await client
                .from('categories')
                .select('*')
                .order('name', { ascending: true });

            if (!error && data) {
                categories = data;
                sessionStorage.setItem('koshk_categories', JSON.stringify(data));
            }
        }

        if (!categories || categories.length === 0) return;

        // تجميع الأقسام الفرعية تحت الأقسام الرئيسية التابعة لها
        const groupedCategories = {};
        categories.forEach(cat => {
            const parent = cat.parent_category || 'الإلكترونيات';
            if (!groupedCategories[parent]) {
                groupedCategories[parent] = [];
            }
            groupedCategories[parent].push(cat);
        });

        dropdown.classList.add('mega-menu-dropdown', 'p-3', 'shadow-lg');

        let megaMenuHtml = `<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 g-3 text-end">`;

        Object.keys(groupedCategories).forEach(parentName => {
            const subs = groupedCategories[parentName];
            const parentUrl = `categories.html?cat=${encodeURIComponent(parentName)}`;

            megaMenuHtml += `
                <div class="col mb-2">
                    <div class="p-2 rounded-3 bg-light-subtle h-100 border border-purple-subtle">
                        <a href="${parentUrl}" class="fw-extrabold text-purple fs-8 text-decoration-none d-block mb-2 border-bottom border-purple-subtle pb-1">
                            <i class="bi bi-grid-3x3-gap-fill me-1"></i> ${parentName}
                        </a>
                        <ul class="list-unstyled p-0 m-0 fs-9 d-flex flex-column gap-1">
            `;

            subs.forEach(sub => {
                const cleanSub = encodeURIComponent(sub.name);
                megaMenuHtml += `
                    <li>
                        <a class="dropdown-item rounded-2 py-1 px-2 fw-semibold d-flex align-items-center gap-2 text-dark" href="categories.html?cat=${cleanSub}">
                            <i class="bi ${sub.icon || 'bi-tag'} text-purple"></i> ${sub.name}
                        </a>
                    </li>
                `;
            });

            megaMenuHtml += `
                        </ul>
                    </div>
                </div>
            `;
        });

        megaMenuHtml += `</div>`;
        dropdown.innerHTML = megaMenuHtml;

    } catch (err) {
        console.warn('تنبيه الناف بار الديناميكي:', err.message);
    }
}

// دالة تفعيل نسخ الكوبونات
function attachCopyEvent() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    copyButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const code = this.getAttribute('data-code');
            if (code) {
                navigator.clipboard.writeText(code).then(() => {
                    const originalText = this.innerText;
                    this.innerText = 'تم!';
                    this.classList.replace('btn-purple-pill', 'btn-success');
                    
                    setTimeout(() => {
                        this.innerText = originalText;
                        this.classList.replace('btn-success', 'btn-purple-pill');
                    }, 2000);
                });
            }
        });
    });
}

// محرك البحث الذكي والأمن ضد الحقن
function initSmartSearchEngine() {
    const searchInput = document.getElementById('mainSearchInput') || document.getElementById('couponSearchInput') || document.getElementById('storeSearchInput');
    const searchBtn = document.getElementById('mainSearchBtn') || (searchInput ? searchInput.nextElementSibling : null);
    const suggestionsBox = document.getElementById('searchSuggestions');

    if (!searchInput) return;

    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(this.value);
        }
    });

    if (searchBtn) {
        searchBtn.addEventListener('click', function (e) {
            e.preventDefault();
            performSearch(searchInput.value);
        });
    }

    let searchTimeout;
    searchInput.addEventListener('input', function () {
        const query = sanitizeSearchInput(this.value);
        clearTimeout(searchTimeout);

        if (!suggestionsBox) return;

        if (query.length < 2) {
            suggestionsBox.classList.add('d-none');
            suggestionsBox.innerHTML = '';
            return;
        }

        searchTimeout = setTimeout(async () => {
            await fetchSearchSuggestions(query, suggestionsBox);
        }, 200);
    });

    document.addEventListener('click', function (e) {
        if (suggestionsBox && !searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.classList.add('d-none');
        }
    });
}

// جلب الاقتراحات المباشرة وتوجيهها لصفحة المنتج بالـ ID المباشر
async function fetchSearchSuggestions(query, box) {
    try {
        let client = window.supabaseClient;
        if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        if (!client) return;

        const cleanQuery = sanitizeSearchInput(query);

        const [{ data: products }, { data: coupons }] = await Promise.all([
            client.from('products').select('id, title, store_name, category').or(`title.ilike.%${cleanQuery}%,store_name.ilike.%${cleanQuery}%,category.ilike.%${cleanQuery}%,keywords.ilike.%${cleanQuery}%`).limit(4),
            client.from('coupons').select('code, store_name').or(`code.ilike.%${cleanQuery}%,store_name.ilike.%${cleanQuery}%`).limit(2)
        ]);

        let html = '';

        if (products && products.length > 0) {
            html += `<div class="px-3 py-1 fs-9 fw-bold text-muted bg-light rounded-2 mb-1">منتجات ومتاجر مقترحة</div>`;
            products.forEach(p => {
                html += `
                    <a href="product.html?id=${p.id}" class="dropdown-item rounded-3 py-2 fw-bold d-flex align-items-center justify-content-between text-decoration-none">
                        <span><i class="bi bi-search text-purple me-2"></i> ${p.title}</span>
                        <span class="badge bg-purple-soft text-purple fs-9">${p.store_name}</span>
                    </a>
                `;
            });
        }

        if (coupons && coupons.length > 0) {
            html += `<div class="px-3 py-1 fs-9 fw-bold text-muted bg-light rounded-2 my-1">كوبونات خصم</div>`;
            coupons.forEach(c => {
                const cleanStoreName = encodeURIComponent(c.store_name);
                html += `
                    <a href="coupons.html?store=${cleanStoreName}" class="dropdown-item rounded-3 py-2 fw-bold d-flex align-items-center justify-content-between text-decoration-none">
                        <span><i class="bi bi-ticket-perforated text-danger me-2"></i> كوبون ${c.store_name} (${c.code})</span>
                        <span class="badge bg-danger text-white fs-9">كود خصم</span>
                    </a>
                `;
            });
        }

        if (!html) {
            html = `<div class="p-3 text-center text-muted fs-8">لا توجد اقتراحات مباشرة.. اضغط Enter للبحث الشامل</div>`;
        }

        box.innerHTML = html;
        box.classList.remove('d-none');

    } catch (err) {
        console.warn('تنبيه البحث السريع:', err.message);
    }
}

function performSearch(query) {
    const cleanQuery = sanitizeSearchInput(query);
    if (!cleanQuery) return;
    const encodedQuery = encodeURIComponent(cleanQuery);
    window.location.href = `search.html?q=${encodedQuery}`;
}

// حفظ النشرة البريدية
function initNewsletterSubscriber() {
    const newsletterForm = document.getElementById('newsletterForm');
    if (!newsletterForm) return;

    newsletterForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const emailInput = document.getElementById('newsletterEmail');
        const email = sanitizeSearchInput(emailInput ? emailInput.value : '');

        if (!email) return;

        try {
            let client = window.supabaseClient;
            if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
                client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }

            if (client) {
                const { error } = await client
                    .from('newsletter_subscribers')
                    .insert([{ email: email }]);

                if (error && error.code !== '23505') throw error;
            }

            showToast('🎉 تم اشتراكك في النشرة البريدية بنجاح!', 'success');
            newsletterForm.reset();

        } catch (err) {
            showToast('🎉 شكرًا لااشتراكك! سنرسل لك العروض أولاً بأول.', 'success');
            newsletterForm.reset();
        }
    });
}

// 🔒 حظر الزوار غير المسجلين من إرسال رسائل التواصل
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        let client = window.supabaseClient;
        if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        if (client) {
            const { data: { user } } = await client.auth.getUser();

            if (!user) {
                showToast('⛔ لا يمكن للزوار إرسال رسائل.. يرجى تسجيل الدخول أولاً!', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }
        }
        
        const nameInput = document.getElementById('contactName') || contactForm.querySelector('input[placeholder*="اسم"]');
        const emailInput = document.getElementById('contactEmail') || contactForm.querySelector('input[type="email"]');
        const phoneInput = document.getElementById('contactPhone');
        const subjectInput = document.getElementById('contactSubject');
        const messageInput = document.getElementById('contactMessage') || contactForm.querySelector('textarea');

        const name = sanitizeSearchInput(nameInput ? nameInput.value : '');
        const email = sanitizeSearchInput(emailInput ? emailInput.value : '');
        const phone = sanitizeSearchInput(phoneInput ? phoneInput.value : '');
        const subject = sanitizeSearchInput(subjectInput ? subjectInput.value : '');
        const message = sanitizeSearchInput(messageInput ? messageInput.value : '');

        if (!name || !email || !message) {
            showToast('يرجى كتابة كافة حقول الرسالة', 'error');
            return;
        }

        try {
            if (client) {
                const { error } = await client.from('contact_messages').insert([
                    { name: name, email: email, phone: phone, subject: subject, message: message }
                ]);
                if (error) throw error;
            }

            showToast('✅ تم إرسال رسالتك بنجاح وسيتواصل معك فريقنا!', 'success');
            contactForm.reset();

        } catch (err) {
            showToast('❌ حدث خطأ في إرسال الرسالة: ' + err.message, 'error');
        }
    });
}

function initAddStoreForm() {
    const addStoreForm = document.getElementById('addStoreForm');
    if (!addStoreForm) return;

    addStoreForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const storeNameInput = document.getElementById('storeName');
        const storeLogoInput = document.getElementById('storeLogo');
        const storeUrlInput = document.getElementById('storeUrl');
        const showInNavbarCheck = document.getElementById('showInNavbar');
        const showInStoresPageCheck = document.getElementById('showInStoresPage');

        const storeName = sanitizeSearchInput(storeNameInput ? storeNameInput.value : '');
        const storeLogo = sanitizeSearchInput(storeLogoInput ? storeLogoInput.value : '');
        const storeUrl = sanitizeSearchInput(storeUrlInput ? storeUrlInput.value : '');

        if (!storeName) {
            showToast('يرجى كتابة اسم المتجر على الأقل', 'error');
            return;
        }

        const storePayload = {
            name: storeName,
            logo_url: storeLogo || 'https://images.unsplash.com/photo-1572584642822-6f8de0243613?w=300',
            store_url: storeUrl || '#',
            show_in_navbar: showInNavbarCheck ? showInNavbarCheck.checked : false,
            show_in_stores_page: showInStoresPageCheck ? showInStoresPageCheck.checked : true
        };

        try {
            let client = window.supabaseClient;
            if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
                client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }

            if (client) {
                const { error } = await client.from('stores').insert([storePayload]);
                if (error) throw error;
            }

            showToast('✅ تم إضافة المتجر بنجاح!', 'success');
            addStoreForm.reset();

            const modalEl = document.getElementById('addStoreModal');
            if (modalEl && typeof bootstrap !== 'undefined') {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

        } catch (err) {
            showToast('❌ حدث خطأ أثناء إضافة المتجر: ' + err.message, 'error');
        }
    });
}

// 🌟 البانرات السلايدر مع نظام الكاش
async function loadDynamicBanners(client) {
    try {
        let banners = JSON.parse(sessionStorage.getItem('koshk_banners') || 'null');
        if (!banners) {
            const { data, error } = await client
                .from('banners')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                banners = data;
                sessionStorage.setItem('koshk_banners', JSON.stringify(data));
            }
        }

        if (!banners || banners.length === 0) return;

        const carouselWrapper = document.getElementById('carouselBannersWrapper');
        if (carouselWrapper) {
            carouselWrapper.innerHTML = banners.map((b, index) => `
                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                    <a href="${b.target_link || '#'}" target="_blank" class="banner-slide-link d-block position-relative user-select-none">
                        <img src="${b.image_url}" alt="${b.title || 'عرض حصري'}" class="img-fluid w-100 banner-img-fit rounded-5" onerror="this.src='https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200'">
                        <div class="banner-glow-overlay"></div>
                    </a>
                </div>
            `).join('');
        }
    } catch (err) {
        console.warn('تنبيه السلايدر:', err.message);
    }
}

// 🌟 جلب المنتجات للرئيسية مع التوجيه المباشر
async function loadDynamicProducts(client) {
    try {
        const { data: products, error } = await client
            .from('products')
            .select('*')
            .eq('show_in_home', true)
            .limit(8);

        if (error || !products || products.length === 0) return;

        const productsContainer = document.getElementById('homeProductsGrid');
        if (productsContainer) {
            productsContainer.innerHTML = products.map(prod => {
                const productDetailUrl = `product.html?id=${prod.id}`;
                
                const isOutOfStock = prod.is_out_of_stock === true || prod.stock_status === 'out_of_stock' || prod.stock_status === 'sold_out';
                const stockBadgeHtml = isOutOfStock 
                    ? `<span class="badge bg-danger text-white position-absolute top-0 start-0 m-2 px-2 py-1 rounded-pill fs-9 fw-bold z-2 shadow-sm"><i class="bi bi-x-circle me-1"></i>نفدت الكمية</span>`
                    : '';

                return `
                <div class="col">
                    <div class="new-light-card p-2 rounded-4 text-center border-0 h-100 d-flex flex-column justify-content-between position-relative ${isOutOfStock ? 'opacity-75' : ''}">
                        ${stockBadgeHtml}
                        <span class="card-discount-badge">-${prod.discount_percentage || 0}%</span>
                        <div class="card-img-container mb-2 overflow-hidden rounded-3 bg-white" style="height: 160px;">
                            <a href="${productDetailUrl}" class="d-block w-100 h-100">
                                <img src="${prod.image_url}" alt="${prod.title}" class="card-uniform-img w-100 h-100 object-fit-contain rounded-3" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300'">
                            </a>
                        </div>
                        <div class="text-start">
                            <h6 class="fw-bold fs-8 text-dark mb-1 text-truncate">
                                <a href="${productDetailUrl}" class="text-dark text-decoration-none">${prod.title}</a>
                            </h6>
                            <small class="text-muted fs-8 d-block mb-1">${prod.category || 'عرض'}</small>
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <span class="fw-extrabold text-purple fs-7">${prod.discount_price || 0} ج.م</span>
                                <span class="text-muted text-decoration-line-through fs-8">${prod.original_price || 0} ج.م</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center border-top border-purple-subtle pt-2">
                                <span class="fw-bold fs-8 text-dark">${prod.store_name || ''}</span>
                                <a href="${productDetailUrl}" class="card-arrow-btn ${isOutOfStock ? 'disabled' : ''}" title="مشاهدة التفاصيل والكاش باك"><i class="bi bi-arrow-left-short fs-5"></i></a>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.warn('تنبيه جلب المنتجات:', err.message);
    }
}

async function loadDynamicCoupons(client) {
    try {
        const { data: coupons, error } = await client
            .from('coupons')
            .select('*')
            .eq('show_in_home', true)
            .limit(3);

        if (error || !coupons || coupons.length === 0) return;

        const couponsContainer = document.getElementById('homeCouponsWrapper');
        if (couponsContainer) {
            couponsContainer.innerHTML = coupons.map(c => {
                const minVal = c.min_spend || c.min_order_value || c.min_purchase;
                const minOrderText = (minVal && minVal.toString().trim() !== '' && minVal !== 'عرض خاص') 
                    ? `أقل فاتورة: ${minVal}${isNaN(minVal) ? '' : ' ج.م'}` 
                    : 'بدون حد أدنى للشراء';

                return `
                <div class="dashed-coupon-card p-3 rounded-4 d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2">
                        <div class="coupon-ticket-icon p-2 rounded-3 text-purple"><i class="bi bi-ticket-perforated fs-5"></i></div>
                        <div>
                            <span class="fw-bold fs-7 text-dark d-block">${c.code}</span>
                            <span class="badge bg-purple-soft text-purple border border-purple-subtle mt-1 fs-9 d-inline-block fw-bold">
                                <i class="bi bi-cart-check text-purple me-1"></i>${minOrderText}
                            </span>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="fw-bold fs-8 text-purple d-block mb-1">${c.discount_label || c.discount || ''}</span>
                        <button class="btn btn-purple-pill btn-sm px-3 rounded-pill fs-8 text-white copy-btn" data-code="${c.code}">نسخ</button>
                    </div>
                </div>
                `;
            }).join('');
            attachCopyEvent();
        }
    } catch (err) {
        console.warn('تنبيه جلب الكوبونات:', err.message);
    }
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-custom');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-custom toast-${type}`;
    toast.innerHTML = `
        <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} fs-5"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

document.addEventListener('DOMContentLoaded', function() {
    const openBtn = document.getElementById('openStoresBtn');
    const closeBtn = document.getElementById('closeStoresBtn');
    const sidebar = document.getElementById('storesSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        if (sidebar && overlay) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    }

    if (openBtn) openBtn.addEventListener('click', toggleSidebar);
    if (closeBtn) closeBtn.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', toggleSidebar);
});

/* ==========================================================================
   🛠️ Virtual Page Builder Engine (Embedded Inside Site Pages)
   ========================================================================== */

(function initVirtualBuilderClientEngine() {
    const style = document.createElement('style');
    style.innerHTML = `
        [data-editable-item="true"]:hover {
            outline: 2px dashed #ff9900 !important;
            outline-offset: 2px !important;
            cursor: pointer !important;
        }
        [data-editable-active="true"] {
            outline: 2px solid #ff9900 !important;
            outline-offset: 2px !important;
            box-shadow: 0 0 10px rgba(255, 153, 0, 0.4) !important;
        }
    `;
    document.head.appendChild(style);

    const isInIframe = window.self !== window.top;
    if (isInIframe) {
        document.addEventListener('DOMContentLoaded', makeSiteElementsClickable);
        setTimeout(makeSiteElementsClickable, 1500);
    }

    function makeSiteElementsClickable() {
        const selector = 'h1, h2, h3, h4, h5, h6, p, span, a, button, img, .navbar-brand, .hero-title';
        const elements = document.querySelectorAll(selector);

        elements.forEach((el, index) => {
            if (!el.getAttribute('data-field-key')) {
                const generatedId = el.id || `el-key-${el.tagName.toLowerCase()}-${index}`;
                el.setAttribute('data-field-key', generatedId);
            }

            el.setAttribute('data-editable-item', 'true');

            el.addEventListener('click', function (e) {
                if (window.self === window.top) return;
                
                e.preventDefault();
                e.stopPropagation();

                document.querySelectorAll('[data-editable-active="true"]').forEach(activeEl => {
                    activeEl.removeAttribute('data-editable-active');
                });
                el.setAttribute('data-editable-active', 'true');

                const payload = {
                    type: 'VIRTUAL_ELEMENT_SELECTED',
                    fieldKey: el.getAttribute('data-field-key'),
                    tagName: el.tagName.toLowerCase(),
                    text: el.innerText ? el.innerText.trim() : '',
                    src: el.src || '',
                    href: el.href || ''
                };

                window.parent.postMessage(payload, '*');
            });
        });
    }

    window.addEventListener('message', function (event) {
        const { type, payload } = event.data || {};

        if (type === 'LIVE_UPDATE_SITE_ELEMENT' && payload) {
            const targetEl = document.querySelector(`[data-field-key="${payload.fieldKey}"]`);
            if (targetEl) {
                if (payload.text !== undefined && targetEl.tagName !== 'IMG') {
                    targetEl.innerText = payload.text;
                }
                if (payload.src !== undefined && targetEl.tagName === 'IMG') {
                    targetEl.src = payload.src;
                }
                if (payload.href !== undefined && targetEl.tagName === 'A') {
                    targetEl.href = payload.href;
                }
            }
        }
    });
})();

// 🌟 قراءة التطبيقات والتعديلات المحفوظة من قاعدة البيانات بأمان دون إظهار 404
async function loadSavedVirtualBuilderContent(client) {
    try {
        let { data } = await client.from('site_settings').select('*');

        if (!data) {
            const retry = await client.from('site_builder_content').select('*');
            data = retry.data;
        }

        if (!data) return;

        data.forEach(item => {
            const key = item.last_edited_element || item.field_key;
            const el = document.querySelector(`[data-field-key="${key}"]`);
            if (el) {
                if (item.updated_text && el.tagName !== 'IMG') {
                    el.innerText = item.updated_text;
                }
                if (item.updated_image && el.tagName === 'IMG') {
                    el.src = item.updated_image;
                }
                if (item.updated_link && el.tagName === 'A') {
                    el.href = item.updated_link;
                }
            }
        });
    } catch (err) {
        // حماية النظام والالتقاط الهادئ
    }
}
