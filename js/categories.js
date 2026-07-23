/* ==========================================================================
   أونلاين كشك - Category Products Fetcher, Router & Sub-Category Engine
   ========================================================================== */

let currentCategoryProducts = [];
let currentPage = 1;
const itemsPerPage = 9;

document.addEventListener('DOMContentLoaded', async function () {
    // 🌟 تجميل شكل الـ URL وإخفاء امتداد .html برمجياً بداخل شريط العنوان
    cleanUrlExtension();

    const categoryName = parseUrlCategory();

    const categoryTitleHeading = document.getElementById('categoryTitleHeading');
    if (categoryTitleHeading) {
        categoryTitleHeading.innerText = `عروض وقسم (${categoryName})`;
    }

    highlightActiveSidebarCategory(categoryName);

    // جلب المنتجات والأقسام الفرعية التابعة للقسم الحالي
    await loadCategoryProductsAndSubCategories(categoryName);

    // تفعيل البحث المباشر بداخل كروت القسم
    setupCategoryLiveSearch();

    // تفعيل الترتيب حسب السعر أو الأحدث إن وجد عنصر الترتيب
    setupSortListener();
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
    let rawCategory = urlParams.get('cat') || 'الإلكترونيات';
    
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

async function loadCategoryProductsAndSubCategories(targetCategory) {
    const grid = document.getElementById('categoryProductsGrid');
    const badge = document.getElementById('categoryCountBadge');
    const badgesContainer = document.getElementById('subCategoriesBadgesContainer');

    try {
        let client = window.supabaseClient;
        if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        if (!client) throw new Error("لم يتم الاتصال بـ Supabase");

        // 1. جلب الأقسام الفرعية الشجرية لهذا القسم لعرض الشارات التفاعلية
        const { data: subCats } = await client
            .from('categories')
            .select('*')
            .eq('parent_category', targetCategory);

        if (subCats && subCats.length > 0 && badgesContainer) {
            badgesContainer.innerHTML = subCats.map(sub => `
                <a href="categories.html?cat=${encodeURIComponent(sub.name)}" class="badge bg-white text-purple border border-purple-subtle px-3 py-2 rounded-pill text-decoration-none shadow-sm fw-bold hover-purple-badge">
                    <i class="bi ${sub.icon || 'bi-tag'} me-1"></i> ${sub.name}
                </a>
            `).join('');
        }

        // 2. جلب جميع منتجات هذا القسم الرئيسي أو الفرعي
        const { data: allProducts, error } = await client
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const clean = (s) => (s || '').toString().toLowerCase().replace(/[أإآ]/g, 'ا').trim();
        const targetClean = clean(targetCategory);

        // تجميع المنتجات المطابقة سواء في اسم القسم المباشر أو الأقسام الفرعية التابعة له
        const validSubCatNames = (subCats || []).map(s => clean(s.name));

        currentCategoryProducts = (allProducts || []).filter(prod => {
            const catClean = clean(prod.category);
            return catClean.includes(targetClean) || targetClean.includes(catClean) || validSubCatNames.includes(catClean);
        });

        if (badge) {
            badge.innerText = currentCategoryProducts.length > 0 
                ? `متوفر ${currentCategoryProducts.length} منتج حالياً` 
                : '0 منتجات';
        }

        currentPage = 1;
        renderCategoryPageProducts();

    } catch (err) {
        console.error("Error loading category products:", err);
        if (grid) {
            grid.innerHTML = `<div class="col-12 text-center py-5 text-danger fs-8">حدث خطأ أثناء جلب المنتجات: ${err.message}</div>`;
        }
    }
}

function renderCategoryPageProducts() {
    const grid = document.getElementById('categoryProductsGrid');
    if (!grid) return;

    if (!currentCategoryProducts || currentCategoryProducts.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-box-seam display-4 text-muted mb-2 d-block"></i>
                <h6 class="fw-bold text-dark">لا توجد منتجات مضافة لهذا القسم حالياً</h6>
                <small class="text-muted fs-8">يمكنك إضافة منتجات جديدة وتحديد هذا القسم لها من لوحة التحكم</small>
            </div>
        `;
        return;
    }

    // حساب تقسيم الصفحات (Pagination)
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = currentCategoryProducts.slice(startIndex, endIndex);

    grid.innerHTML = paginatedProducts.map(prod => {
        const productDetailUrl = `product.html?id=${prod.id}`;
        return `
        <div class="col cat-product-col" data-title="${prod.title}" data-price="${prod.discount_price || 0}">
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

    renderPaginationControls();
}

function renderPaginationControls() {
    const grid = document.getElementById('categoryProductsGrid');
    if (!grid) return;

    const totalPages = Math.ceil(currentCategoryProducts.length / itemsPerPage);
    if (totalPages <= 1) return;

    let paginationHtml = `<div class="col-12 d-flex justify-content-center mt-4"><nav><ul class="pagination pagination-sm gap-2">`;

    for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <button class="page-link rounded-circle fw-bold ${i === currentPage ? 'bg-purple text-white border-purple' : 'text-purple'}" onclick="changeCategoryPage(${i})">${i}</button>
            </li>
        `;
    }

    paginationHtml += `</ul></nav></div>`;
    grid.innerHTML += paginationHtml;
}

window.changeCategoryPage = function(pageNumber) {
    currentPage = pageNumber;
    renderCategoryPageProducts();
    window.scrollTo({ top: 200, behavior: 'smooth' });
};

function setupCategoryLiveSearch() {
    const categorySearchInput = document.getElementById('categorySearchInput');
    if (!categorySearchInput) return;

    categorySearchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.cat-product-col');
        cards.forEach(card => {
            const title = (card.getAttribute('data-title') || '').toLowerCase();
            card.style.display = title.includes(query) ? 'block' : 'none';
        });
    });
}

function setupSortListener() {
    const sortSelect = document.getElementById('categorySortSelect');
    if (!sortSelect) return;

    sortSelect.addEventListener('change', function() {
        const value = this.value;
        if (value === 'price-asc') {
            currentCategoryProducts.sort((a, b) => (a.discount_price || 0) - (b.discount_price || 0));
        } else if (value === 'price-desc') {
            currentCategoryProducts.sort((a, b) => (b.discount_price || 0) - (a.discount_price || 0));
        } else {
            currentCategoryProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        currentPage = 1;
        renderCategoryPageProducts();
    });
}

function highlightActiveSidebarCategory(categoryName) {
    const sidebarLinks = document.querySelectorAll('.sidebar-link-item');
    sidebarLinks.forEach(link => {
        if (link.innerText.includes(categoryName)) {
            link.classList.add('active');
        }
    });
}