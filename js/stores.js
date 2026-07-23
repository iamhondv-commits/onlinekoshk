/* ==========================================================================
   أونلاين كشك - Store Fetcher & Internal Product Router
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function () {
    // 🌟 تجميل شكل الـ URL وإخفاء امتداد .html برمجياً من شريط العنوان في المتصفح
    cleanUrlExtension();

    const storeName = parseUrlStoreName();

    const storeTitleHeading = document.getElementById('storeTitleHeading');
    if (storeTitleHeading) {
        storeTitleHeading.innerText = `عروض ومنتجات متجر (${storeName})`;
    }

    highlightActiveSidebarStore(storeName);
    setupStoreLiveSearch();

    await loadStoreProductsDirectly(storeName);
});

// دالة إخفاء امتداد .html من شريط العنوان بسلاسة دون أخطاء Live Server
function cleanUrlExtension() {
    try {
        if (window.location.pathname.endsWith('.html')) {
            const cleanPath = window.location.pathname.replace('.html', '');
            window.history.replaceState(null, '', cleanPath + window.location.search);
        }
    } catch(e) {}
}

function parseUrlStoreName() {
    const urlParams = new URLSearchParams(window.location.search);
    let rawName = urlParams.get('name') || 'أمازون';

    if (window.KoshkEncoder && typeof window.KoshkEncoder.decode === 'function') {
        let decoded = window.KoshkEncoder.decode(rawName);
        if (decoded) return decoded.trim();
    }

    try {
        return decodeURIComponent(rawName).trim();
    } catch (e) {
        return rawName.trim();
    }
}

async function loadStoreProductsDirectly(targetStore) {
    const grid = document.getElementById('storeProductsGrid');
    const badge = document.getElementById('productCountBadge');

    try {
        let client = window.supabaseClient;
        if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        if (!client) {
            grid.innerHTML = `<div class="col-12 text-center py-5 text-danger fs-8">خطأ: مكتبة Supabase لم تُحمل في الصفحة.</div>`;
            return;
        }

        const { data: allProducts, error } = await client
            .from('products')
            .select('*');

        if (error) throw error;

        if (!allProducts || allProducts.length === 0) {
            if (badge) badge.innerText = '0 عروض';
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-exclamation-circle text-warning display-4 mb-2 d-block"></i>
                    <h6 class="fw-bold text-dark">جدول المنتجات في قاعدة البيانات فارغ حالياً!</h6>
                    <small class="text-muted fs-8">يرجى الذهاب إلى لوحة الأدمن (admin/index.html) وإضافة منتج جديد أولاً.</small>
                </div>
            `;
            return;
        }

        const clean = (s) => (s || '').toString().toLowerCase().replace(/[أإآ]/g, 'ا').trim();
        const targetClean = clean(targetStore);

        const matchedProducts = allProducts.filter(p => {
            const storeClean = clean(p.store_name);
            return storeClean.includes(targetClean) || targetClean.includes(storeClean);
        });

        const displayList = matchedProducts.length > 0 ? matchedProducts : allProducts;

        if (badge) {
            badge.innerText = matchedProducts.length > 0 
                ? `متوفر ${matchedProducts.length} عرض متطابق` 
                : `عرض الكل (${allProducts.length} منتج)`;
        }

        grid.innerHTML = displayList.map(prod => {
            const productDetailUrl = `product.html?id=${prod.id}`;
            return `
            <div class="col store-product-col" data-title="${prod.title}">
                <div class="new-light-card p-3 rounded-4 text-center border-0 h-100 d-flex flex-column justify-content-between shadow-sm">
                    <span class="card-discount-badge">-${prod.discount_percentage || 10}%</span>
                    <div class="card-img-container mb-2 overflow-hidden rounded-3" style="height: 160px;">
                        <a href="${productDetailUrl}" class="d-block w-100 h-100">
                            <img src="${prod.image_url}" alt="${prod.title}" class="card-uniform-img w-100 h-100 object-fit-contain rounded-3" onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300'">
                        </a>
                    </div>
                    <div class="text-start">
                        <h6 class="fw-bold fs-8 text-dark mb-1 text-truncate">
                            <a href="${productDetailUrl}" class="text-dark text-decoration-none">${prod.title}</a>
                        </h6>
                        <small class="text-muted fs-8 d-block mb-1">${prod.category}</small>
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <span class="fw-extrabold text-purple fs-7">${prod.discount_price} ج.م</span>
                            <span class="text-muted text-decoration-line-through fs-8">${prod.original_price} ج.م</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center border-top border-purple-subtle pt-2">
                            <span class="fw-bold fs-8 text-dark">${prod.store_name}</span>
                            <a href="${productDetailUrl}" class="card-arrow-btn" title="عرض التفاصيل والشراء">
                                <i class="bi bi-arrow-left-short fs-5"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        }).join('');

    } catch (err) {
        console.error("Database Fetch Error:", err);
        grid.innerHTML = `<div class="col-12 text-center py-5 text-danger fs-8">خطأ في جلب البيانات: ${err.message}</div>`;
    }
}

function setupStoreLiveSearch() {
    const searchInput = document.getElementById('storeSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase().trim();
        const productCols = document.querySelectorAll('.store-product-col');

        productCols.forEach(col => {
            const title = (col.getAttribute('data-title') || '').toLowerCase();
            if (title.includes(query)) {
                col.style.display = 'block';
            } else {
                col.style.display = 'none';
            }
        });
    });
}

function highlightActiveSidebarStore(storeName) {
    const sidebarLinks = document.querySelectorAll('.sidebar-link-item');
    sidebarLinks.forEach(link => {
        if (link.innerText.includes(storeName)) {
            link.classList.add('active');
        }
    });
}