/* ==========================================================================
   أونلاين كشك - Product Details Dynamic Loader Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        let client = window.supabaseClient;
        if (!client && window.supabase) {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        const { data: product, error } = await client
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error || !product) throw new Error("المنتج غير موجود");

        // 1. تحديث الـ Meta Data
        document.title = `${product.title} - أونلاين كشك`;
        if (product.description) document.getElementById('productMetaDesc').content = product.description;
        if (product.keywords) document.getElementById('productMetaKeywords').content = product.keywords;

        // 2. تعبئة النصوص والبيانات
        document.getElementById('breadcrumbTitle').innerText = product.title;
        document.getElementById('breadcrumbStore').querySelector('a').innerText = product.store_name;
        document.getElementById('breadcrumbStore').querySelector('a').href = `stores.html?name=${encodeURIComponent(product.store_name)}`;

        document.getElementById('pTitle').innerText = product.title;
        document.getElementById('pStoreBadge').innerText = product.store_name;
        document.getElementById('pCategoryBadge').innerText = product.category || 'عام';
        document.getElementById('pDiscountPrice').innerText = `${product.discount_price} ج.م`;
        document.getElementById('pOriginalPrice').innerText = `${product.original_price} ج.م`;
        document.getElementById('pDiscountBadge').innerText = `-${product.discount_percentage || 10}%`;
        document.getElementById('pCashbackAmount').innerText = product.commission_amount || 0;
        document.getElementById('pDescription').innerText = product.description || 'احصل على هذا العرض الممتاز بخصم حصري وكاش باك مباشر إلى محفظتك في أونلاين كشك عند الشراء من المتجر المعتمد.';

        // 3. زر الأفيليت المباشر
        const affiliateBtn = document.getElementById('pAffiliateBtn');
        affiliateBtn.href = product.affiliate_url;

        // 4. معالجة الصور المتعددة (Gallery)
        const mainImg = document.getElementById('pMainImage');
        mainImg.src = product.image_url;

        const thumbsWrapper = document.getElementById('pThumbsWrapper');
        let allImages = [product.image_url];
        
        if (product.gallery_images && Array.isArray(product.gallery_images)) {
            allImages = allImages.concat(product.gallery_images.filter(img => img.trim() !== ''));
        }

        if (allImages.length > 1) {
            thumbsWrapper.innerHTML = allImages.map((imgUrl, idx) => `
                <div class="thumb-box border ${idx === 0 ? 'border-purple' : 'border-light'} rounded-3 overflow-hidden cursor-pointer bg-white" style="width: 65px; height: 65px; flex-shrink: 0;" onclick="changeMainImage('${imgUrl}', this)">
                    <img src="${imgUrl}" class="w-100 h-100 object-fit-contain p-1">
                </div>
            `).join('');
        }

        // إظهار المحتوى وإخفاء الـ Loader
        document.getElementById('productLoader').classList.add('d-none');
        document.getElementById('productContent').classList.remove('d-none');

    } catch (err) {
        console.error(err);
        document.getElementById('productLoader').innerHTML = `<div class="alert alert-danger">عفواً، لم نتمكن من إيجاد هذا المنتج! <a href="index.html">العودة للرئيسية</a></div>`;
    }
});

// دالة تغيير الصورة الرئيسية عند الضغط على المصغرات
function changeMainImage(imgUrl, thumbElement) {
    document.getElementById('pMainImage').src = imgUrl;
    document.querySelectorAll('.thumb-box').forEach(el => el.classList.replace('border-purple', 'border-light'));
    thumbElement.classList.replace('border-light', 'border-purple');
}