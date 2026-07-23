/* ==========================================================================
   أونلاين كشك - Category Products Fetcher & Internal Product Router
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function () {
    // 🌟 تجميل شكل الـ URL وإخفاء امتداد .html برمجياً من شريط العنوان في المتصفح
    cleanUrlExtension();

    const categoryName = parseUrlCategory();

    const categoryTitleHeading = document.getElementById('categoryTitleHeading');
    if (categoryTitleHeading) {
        categoryTitleHeading.innerText = `منتجات قسم (${categoryName})`;
    }

    highlightActiveSidebarCategory(categoryName);

    await loadCategoryProducts(categoryName);

    const categorySearchInput = document.getElementById('categorySearchInput');
    if (categorySearchInput) {
        categorySearchInput.addEventListener('input', function () {
            const query = this.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.cat-product-col');
            cards.forEach(card => {
                const title = (card.getAttribute('data-title') || '').toLowerCase();
                card.style.display = title.includes(query) ? 'block' : 'none';
            });
        });
    }
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

function parseUrlCategory() {
    const urlParams = new URLSearchParams(window.location.search);
    let rawCategory = urlParams.get('cat') || 'إلكترونيات';
    
    if (window.KoshkEncoder && typeof window.KoshkEncoder.decode === 'function') {
        let decoded = window.KoshkEncoder.decode(rawCategory);
        if (decoded) return decoded.trim();
    }

    try {
        return decodeURIComponent(rawCategory).trim();
    } catch (e) {
        return rawCategory.trim();
    }
}

async function loadCategoryProducts(targetCategory) {
    const grid = document.getElementById('categoryProductsGrid');
    const badge = document.getElementById('categoryCountBadge');

    try {
        let client = window.supabaseClient;
        if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        if (!client) throw new Error("لم يتم الاتصال بـ Supabase");

        const { data: allProducts, error } = await client
            .from('products')
            .select('*');

        if (error) throw error;

        const clean = (s) => (s || '').toString().toLowerCase().replace(/[أإآ]/g, 'ا').trim();
        const targetClean = clean(targetCategory);

        const matchedProducts = (allProducts || []).filter(prod => {
            const catClean = clean(prod.category);
            return catClean.includes(targetClean) || targetClean.includes(catClean);
        });

        if (matchedProducts.length > 0) {
            if (badge) badge.innerText = `متوفر ${matchedProducts.length} منتج حالياً`;
            
            grid.innerHTML = matchedProducts.map(prod => {
                const productDetailUrl = `product.html?id=${prod.id}`;
                return `
                <div class="col cat-product-col" data-title="${prod.title}">
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
        } else {
            if (badge) badge.innerText = '0 منتجات';
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-box-seam display-4 text-muted mb-2 d-block"></i>
                    <h6 class="fw-bold text-dark">لا توجد منتجات مضافة لقسم (${targetCategory}) حالياً</h6>
                    <small class="text-muted fs-8">تأكد من كتابة اسم القسم بشكل صحيح عند إضافة المنتجات في لوحة الأدمن</small>
                </div>
            `;
        }

    } catch (err) {
        console.error("Error loading category products:", err);
        if (grid) {
            grid.innerHTML = `<div class="col-12 text-center py-5 text-danger fs-8">حدث خطأ: ${err.message}</div>`;
        }
    }
}

function highlightActiveSidebarCategory(categoryName) {
    const sidebarLinks = document.querySelectorAll('.sidebar-link-item');
    sidebarLinks.forEach(link => {
        if (link.innerText.includes(categoryName)) {
            link.classList.add('active');
        }
    });
}
```[cite: 14]