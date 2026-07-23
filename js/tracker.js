/* ==========================================================================
   أونلاين كشك - Real-Time User Analytics & Interaction Tracker
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function () {
    let client = window.supabaseClient;
    if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined') {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    if (!client) return;

    const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
    const pagePath = window.location.pathname.replace('.html', '') || '/';
    
    // 1. تسجيل زيارة الصفحة (Page View)
    try {
        const { data: { user } } = await client.auth.getUser();
        await client.from('analytics_events').insert([{
            page_path: pagePath,
            event_type: 'page_view',
            device_type: deviceType,
            user_id: user ? user.id : null
        }]);
    } catch (e) {
        console.warn('Analytics Notice:', e.message);
    }

    // 2. تسجيل نقرات الشراء ورابط الأفلييت (Affiliate Clicks)
    document.addEventListener('click', async function (e) {
        const targetBtn = e.target.closest('[data-affiliate-link="true"]') || e.target.closest('#buyNowBtn');
        if (targetBtn) {
            const productId = targetBtn.getAttribute('data-product-id');
            const storeName = targetBtn.getAttribute('data-store-name');

            try {
                const { data: { user } } = await client.auth.getUser();
                await client.from('analytics_events').insert([{
                    page_path: pagePath,
                    event_type: 'click',
                    product_id: productId || null,
                    store_name: storeName || null,
                    device_type: deviceType,
                    user_id: user ? user.id : null
                }]);
            } catch (err) {}
        }
    });
});