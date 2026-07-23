/* ==========================================================================
   أونلاين كشك - Direct Customer Cashback Click Tracker
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

    // الاستماع لأي ضغطة على روابط المنتجات أو الأفيليت في جميع أرجاء الموقع
    document.body.addEventListener('click', async function (e) {
        const affiliateLinkBtn = e.target.closest('a.card-arrow-btn, a[data-affiliate-link="true"], a.btn-purple-pill');

        if (affiliateLinkBtn) {
            const productId = affiliateLinkBtn.getAttribute('data-product-id');
            const cashbackAmount = parseFloat(affiliateLinkBtn.getAttribute('data-commission-amount') || '5.00');

            try {
                // 1. التأكد من الاتصال بـ Supabase
                let client = window.supabaseClient;
                if (!client && window.supabase) {
                    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                }

                if (!client) return;

                // 2. الحصول على المستخدم المسجل دخوله حالياً (العميل المشتري)
                const { data: { user } } = await client.auth.getUser();

                if (user) {
                    // 3. تسجيل عملية الكاش باك المعلق لحساب العميل
                    await client
                        .from('commissions')
                        .insert([
                            {
                                affiliate_id: user.id, // تمثّل المعرف الخاص بالعميل المشتري
                                product_id: productId || null,
                                amount: cashbackAmount,
                                status: 'pending' // حالة الكاش باك معلق لحين تأكيد الشراء من المتجر
                            }
                        ]);

                    console.log(`✅ تم تسجيل كاش باك معلق بقيمة ${cashbackAmount} ج.م لحساب العميل!`);
                } else {
                    console.log('ℹ️ الزائر غير مسجل دخول، لم يتم احتساب كاش باك معلق.');
                }

            } catch (err) {
                console.error('خطأ في تسجيل تتبع الكاش باك:', err.message);
            }
        }
    });
});