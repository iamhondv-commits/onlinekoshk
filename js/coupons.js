/* ==========================================================================
   أونلاين كشك - Dynamic Coupons Fetcher & One-Click Copy
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function () {
    await fetchAllCoupons();

    // تصفية الكوبونات أثناء الكتابة في شريط البحث
    const searchInput = document.getElementById('couponSearchInput') || document.getElementById('mainSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const query = this.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.coupon-card-col');
            cards.forEach(card => {
                const text = card.getAttribute('data-search-text').toLowerCase();
                card.style.display = text.includes(query) ? 'block' : 'none';
            });
        });
    }
});

async function fetchAllCoupons() {
    const grid = document.getElementById('couponsGrid');
    const badgeCount = document.getElementById('couponsCountBadge');

    try {
        let client = window.supabaseClient;
        if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        if (!client) throw new Error("لم يتم الاتصال بـ Supabase");

        // قراءة باراميتر المتجر المحدد من الرابط مع دعم فك التشفير الآلي
        const urlParams = new URLSearchParams(window.location.search);
        let selectedStore = urlParams.get('store');

        if (selectedStore && window.KoshkEncoder && typeof window.KoshkEncoder.decode === 'function') {
            let decoded = window.KoshkEncoder.decode(selectedStore);
            if (decoded) selectedStore = decoded.trim();
        }

        // جلب الكوبونات من جدول coupons
        let query = client.from('coupons').select('*').order('created_at', { ascending: false });

        if (selectedStore) {
            query = query.ilike('store_name', `%${selectedStore.trim()}%`);
        }

        const { data: coupons, error } = await query;

        if (error) throw error;

        if (coupons && coupons.length > 0) {
            if (badgeCount) {
                badgeCount.innerHTML = `<i class="bi bi-stars"></i> يتوفر الآن ${coupons.length} كوبون فعال`;
            }

            grid.innerHTML = coupons.map(coup => {
                // إبراز وتنسيق الحد الأدنى للفاتورة بمرونة لكافة المسميات بجدول قاعدة البيانات
                const minVal = coup.min_spend || coup.min_order_value || coup.min_purchase;
                const minOrderFormatted = (minVal && minVal.toString().trim() !== '' && minVal !== 'عرض خاص') 
                    ? `أقل قيمة للفاتورة: ${minVal}${isNaN(minVal) ? '' : ' ج.م'}` 
                    : 'بدون حد أدنى للشراء';

                return `
                <div class="col coupon-card-col" data-search-text="${coup.store_name} ${coup.code} ${coup.discount_label} ${minOrderFormatted}">
                    <div class="dashed-coupon-card p-4 rounded-4 shadow-subtle-glow bg-white h-100 d-flex flex-column justify-content-between position-relative overflow-hidden">
                        
                        <div>
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <div class="d-flex align-items-center gap-2">
                                    <div class="bg-purple-soft rounded-circle p-2 text-purple shadow-sm fw-bold fs-6">
                                        <i class="bi bi-ticket-perforated"></i>
                                    </div>
                                    <div>
                                        <h6 class="fw-extrabold text-dark mb-0 fs-7">${coup.store_name}</h6>
                                        <span class="badge bg-purple-soft text-purple border border-purple-subtle mt-1 fs-9 d-inline-block fw-bold">
                                            <i class="bi bi-cart-check text-purple me-1"></i>${minOrderFormatted}
                                        </span>
                                    </div>
                                </div>
                                <span class="badge bg-purple-soft text-purple fs-8 px-3 py-1 rounded-pill fw-bold">${coup.discount_label || ''}</span>
                            </div>

                            <!-- كارت الكود والزرار -->
                            <div class="bg-light p-2 rounded-4 border border-dashed text-center my-3">
                                <small class="text-muted fs-8 d-block mb-1">كود الخصم الحصري:</small>
                                <span class="fw-extrabold text-purple fs-5 tracking-wide user-select-all">${coup.code}</span>
                            </div>
                        </div>

                        <button onclick="copyCouponCode('${coup.code}', this)" class="btn btn-purple-pill w-100 py-2 rounded-pill fw-bold text-white shadow-purple-glow fs-8">
                            <i class="bi bi-copy me-1"></i> نسخ الكود واقتناص الخصم
                        </button>

                    </div>
                </div>
                `;
            }).join('');
        } else {
            if (badgeCount) badgeCount.innerHTML = `<i class="bi bi-stars"></i> لا توجد كوبونات متاحة حالياً`;
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-ticket-detailed display-4 text-muted mb-2 d-block"></i>
                    <h6 class="fw-bold text-dark">لا توجد كوبونات خصم متاحة حالياً ${selectedStore ? `لمتجر (${selectedStore})` : ''}</h6>
                    <small class="text-muted fs-8">يمكنك إضافة كوبونات جديدة من لوحة تحكم الأدمن (admin/index.html)</small>
                </div>
            `;
        }

    } catch (err) {
        console.error("Error fetching coupons:", err);
        if (grid) {
            grid.innerHTML = `<div class="col-12 text-center py-5 text-danger fs-8">حدث خطأ أثناء تحميل الكوبونات: ${err.message}</div>`;
        }
    }
}

// دالة النسخ التفاعلية
function copyCouponCode(code, btnElement) {
    navigator.clipboard.writeText(code).then(() => {
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = `<i class="bi bi-check-lg me-1"></i> تم النسخ بنجاح!`;
        btnElement.classList.replace('btn-purple-pill', 'btn-success');

        if (typeof showToast === 'function') {
            showToast(`تم نسخ كود الخصم (${code}) بنجاح!`, 'success');
        }

        setTimeout(() => {
            btnElement.innerHTML = originalText;
            btnElement.classList.replace('btn-success', 'btn-purple-pill');
        }, 2500);
    }).catch(err => {
        if (typeof showToast === 'function') {
            showToast('كود الخصم هو: ' + code, 'info');
        } else {
            alert('كود الخصم هو: ' + code);
        }
    });
}