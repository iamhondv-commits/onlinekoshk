/* ==========================================================================
   أونلاين كشك - Customer Cashback Wallet & Dynamic Balance Manager
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function () {
    let currentUser = null;

    // 1. التحقق من أمان الجلسة وتسجيل دخول العميل
    try {
        let client = window.supabaseClient;
        if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        if (!client) throw new Error("لم يتم الاتصال بـ Supabase");

        const { data: { user }, error } = await client.auth.getUser();

        if (error || !user) {
            window.location.href = 'login.html';
            return;
        }

        currentUser = user;
        await loadUserProfile(currentUser.id, currentUser.email);
        await loadUserCommissions(currentUser.id);
        await loadUserPayoutRequests(currentUser.id);
        
        // جلب البيانات الإدارية الديناميكية بتأمين حماية مستقل
        try { await loadDashboardCategories(client); } catch (e) { console.warn('Categories:', e.message); }
        try { await loadDashboardStores(client); } catch (e) { console.warn('Stores:', e.message); }
        try { await loadDashboardBanners(client); } catch (e) { console.warn('Banners:', e.message); }
        try { await loadDashboardMessages(client); } catch (e) { console.warn('Messages:', e.message); }
        try { await initProductCategoriesDropdown(client); } catch (e) { console.warn('Dropdown:', e.message); }

    } catch (err) {
        console.error('خطأ أمان الجلسة:', err.message);
        window.location.href = 'login.html';
    }

    // 2. تسجيل الخروج
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function () {
            let client = window.supabaseClient;
            if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
                client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }
            if (client) {
                await client.auth.signOut();
            }
            window.location.href = 'login.html';
        });
    }

    // 3. تقديم طلب سحب الكاش باك والمكافآت بحد أدنى 250 ج.م
    const payoutForm = document.getElementById('payoutForm');
    if (payoutForm) {
        payoutForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('payoutAmount').value);
            const method = document.getElementById('payoutMethod').value;
            const account = document.getElementById('payoutAccount').value.trim();

            if (amount < 250) {
                showDashboardToast('❌ عذراً، خطأ في العملية: الحد الأدنى لطلب سحب الكاش باك هو 250 ج.م', 'error');
                return;
            }

            const payoutSubmitBtn = document.getElementById('payoutSubmitBtn');

            try {
                let client = window.supabaseClient;
                if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
                    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                }

                if (payoutSubmitBtn) {
                    payoutSubmitBtn.disabled = true;
                    payoutSubmitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> جاري إرسال الطلب...`;
                }

                // جلب أحدث بيانات البروفايل مباشرة من قاعدة البيانات
                const { data: freshProfile, error: fetchErr } = await client
                    .from('profiles')
                    .select('available_balance, pending_payout')
                    .eq('id', currentUser.id)
                    .single();

                if (fetchErr || !freshProfile) throw new Error("تعذر جلب رصيد الحساب الحالي");

                const availableBalance = parseFloat(freshProfile.available_balance || 0.00);
                const currentPendingPayout = parseFloat(freshProfile.pending_payout || 0.00);
                
                if (amount > availableBalance) {
                    showDashboardToast(`عفواً، رصيد الحساب المتاح غير كافي. رصيدك المتاح حالياً هو: ${availableBalance} ج.م`, 'error');
                    if (payoutSubmitBtn) {
                        payoutSubmitBtn.disabled = false;
                        payoutSubmitBtn.innerHTML = `ارسال طلب سحب المكافأة <i class="bi bi-send-check ms-1"></i>`;
                    }
                    return;
                }

                const updatedAvailable = parseFloat((availableBalance - amount).toFixed(2));
                const updatedPendingPayout = parseFloat((currentPendingPayout + amount).toFixed(2));

                // تحديث الرصيد بجدول profiles
                const { error: profileErr } = await client
                    .from('profiles')
                    .update({
                        available_balance: updatedAvailable,
                        pending_payout: updatedPendingPayout
                    })
                    .eq('id', currentUser.id);

                if (profileErr) throw profileErr;

                // إدراج الطلب بجدول payout_requests
                const { error: insertErr } = await client
                    .from('payout_requests')
                    .insert([
                        {
                            user_id: currentUser.id,
                            amount: amount,
                            method: method,
                            account_details: account,
                            status: 'pending',
                            hidden_for_user: false
                        }
                    ]);

                if (insertErr) throw insertErr;

                showDashboardToast('🎉 تم إرسال طلب سحب الكاش باك بنجاح!', 'success');
                payoutForm.reset();

                await loadUserProfile(currentUser.id, currentUser.email);
                await loadUserPayoutRequests(currentUser.id);

            } catch (err) {
                console.error("Payout Error:", err);
                showDashboardToast('حدث خطأ أثناء إرسال طلب السحب: ' + (err.message || 'يرجى المحاولة لاحقاً'), 'error');
            } finally {
                if (payoutSubmitBtn) {
                    payoutSubmitBtn.disabled = false;
                    payoutSubmitBtn.innerHTML = `ارسال طلب سحب المكافأة <i class="bi bi-send-check ms-1"></i>`;
                }
            }
        });
    }

    // 4. معالجة تحديث وحفظ بيانات الملف الشخصي
    const userProfileForm = document.getElementById('userProfileForm');
    if (userProfileForm) {
        userProfileForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const fullName = document.getElementById('profileFullName').value.trim();
            const phone = document.getElementById('profilePhone').value.trim();
            const state = document.getElementById('profileState').value.trim();
            const city = document.getElementById('profileCity').value.trim();
            const btn = document.getElementById('profileUpdateBtn');

            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> جاري الحفظ...`;

            try {
                let client = window.supabaseClient;
                if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
                    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                }

                const { data: testProfile, error: testErr } = await client
                    .from('profiles')
                    .select('*')
                    .eq('id', currentUser.id)
                    .single();

                if (testErr) throw testErr;

                const updateData = {};
                
                if ('full_name' in testProfile && fullName !== '') updateData.full_name = fullName;
                if ('phone' in testProfile && phone !== '') updateData.phone = phone;
                if ('state' in testProfile && state !== '') updateData.state = state;
                if ('city' in testProfile && city !== '') updateData.city = city;

                if (Object.keys(updateData).length === 0) {
                    showDashboardToast('⚠️ لم تقم بتغيير أي بيانات أو الخانات فارغة.', 'warning');
                    btn.disabled = false;
                    btn.innerHTML = `حفظ وتحديث بيانات الملف <i class="bi bi-check2-all ms-1"></i>`;
                    return;
                }

                const { error: updateError } = await client
                    .from('profiles')
                    .update(updateData)
                    .eq('id', currentUser.id);

                if (updateError) throw updateError;

                showDashboardToast('🎉 تم تحديث بيانات الملف الشخصي بنجاح!', 'success');
                await loadUserProfile(currentUser.id, currentUser.email);

            } catch (err) {
                console.error("Profile Update Catch Error:", err);
                showDashboardToast('خطأ أثناء التحديث: ' + (err.message || 'يرجى المحاولة لاحقاً'), 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = `حفظ وتحديث بيانات الملف <i class="bi bi-check2-all ms-1"></i>`;
            }
        });
    }

    // 5. نموذج إضافة قسم جديد
    const addCategoryForm = document.getElementById('addCategoryForm');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const categoryName = document.getElementById('categoryName') ? document.getElementById('categoryName').value.trim() : '';
            const categoryIcon = document.getElementById('categoryIcon') ? document.getElementById('categoryIcon').value.trim() : 'bi-tag';

            if (!categoryName) return;

            try {
                let client = window.supabaseClient;
                if (!client && window.supabase) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

                const { error } = await client
                    .from('categories')
                    .insert([{ name: categoryName, icon: categoryIcon }]);

                if (error) throw error;

                showDashboardToast('🎉 تم إضافة القسم بنجاح!', 'success');
                addCategoryForm.reset();
                await loadDashboardCategories(client);
                await initProductCategoriesDropdown(client);

            } catch (err) {
                showDashboardToast('خطأ أثناء إضافة القسم: ' + err.message, 'error');
            }
        });
    }

    // 6. نموذج إضافة متجر جديد
    const addStoreForm = document.getElementById('addStoreForm');
    if (addStoreForm) {
        addStoreForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const name = document.getElementById('storeName') ? document.getElementById('storeName').value.trim() : '';
            const logo = document.getElementById('storeLogoUrl') ? document.getElementById('storeLogoUrl').value.trim() : '';

            if (!name) return;

            try {
                let client = window.supabaseClient;
                if (!client && window.supabase) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

                const { error } = await client
                    .from('stores')
                    .insert([{ name: name, logo_url: logo }]);

                if (error) throw error;

                showDashboardToast('🎉 تم إضافة المتجر بنجاح!', 'success');
                addStoreForm.reset();
                await loadDashboardStores(client);

            } catch (err) {
                showDashboardToast('خطأ أثناء إضافة المتجر: ' + err.message, 'error');
            }
        });
    }

    // 7. نموذج إضافة بانر جديد لسلايدر الصفحة الرئيسية
    const addBannerForm = document.getElementById('addBannerForm');
    if (addBannerForm) {
        addBannerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const imageUrl = document.getElementById('bannerImageUrl') ? document.getElementById('bannerImageUrl').value.trim() : '';
            const targetLink = document.getElementById('bannerTargetLink') ? document.getElementById('bannerTargetLink').value.trim() : '';
            const title = document.getElementById('bannerTitle') ? document.getElementById('bannerTitle').value.trim() : '';

            if (!imageUrl) return;

            try {
                let client = window.supabaseClient;
                if (!client && window.supabase) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

                const { error } = await client
                    .from('banners')
                    .insert([{ image_url: imageUrl, target_link: targetLink, title: title, is_active: true }]);

                if (error) throw error;

                showDashboardToast('🎉 تم إضافة البانر بنجاح!', 'success');
                addBannerForm.reset();
                await loadDashboardBanners(client);

            } catch (err) {
                showDashboardToast('خطأ أثناء إضافة البانر: ' + err.message, 'error');
            }
        });
    }

    // دالة جلب بيانات البروفايل والأرصدة
    async function loadUserProfile(userId, email) {
        try {
            let client = window.supabaseClient;
            if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
                client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }

            let { data: profile, error } = await client
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            const nameDisplay = document.getElementById('userNameDisplay');
            const earningsDisplay = document.getElementById('totalEarnings');
            const balanceDisplay = document.getElementById('availableBalance');
            const pendingPayoutDisplay = document.getElementById('pendingPayout');
            const withdrawnDisplay = document.getElementById('totalWithdrawn');

            const inputFullName = document.getElementById('profileFullName');
            const inputEmail = document.getElementById('profileEmail');
            const inputPhone = document.getElementById('profilePhone');
            const inputState = document.getElementById('profileState');
            const inputCity = document.getElementById('profileCity');

            if (profile) {
                if (nameDisplay) nameDisplay.innerText = profile.full_name || email.split('@')[0];
                if (earningsDisplay) earningsDisplay.innerText = `${parseFloat(profile.total_earnings || 0).toFixed(2)} ج.م`;
                if (balanceDisplay) balanceDisplay.innerText = `${parseFloat(profile.available_balance || 0).toFixed(2)} ج.م`;
                if (pendingPayoutDisplay) pendingPayoutDisplay.innerText = `${parseFloat(profile.pending_payout || 0).toFixed(2)} ج.م`;
                if (withdrawnDisplay) withdrawnDisplay.innerText = `${parseFloat(profile.total_withdrawn || 0).toFixed(2)} ج.م`;

                if (inputFullName) inputFullName.value = profile.full_name || '';
                if (inputEmail) inputEmail.value = email;
                if (inputPhone) inputPhone.value = profile.phone || '';
                if (inputState) inputState.value = profile.state || '';
                if (inputCity) inputCity.value = profile.city || '';
            }
        } catch (err) {
            console.warn('تنبيه البروفايل:', err.message);
        }
    }

    // دالة جلب حالة طلبات السحب مع ضمان عرض إشعار مرفوض واحد فقط لأحدث طلب
    async function loadUserPayoutRequests(userId) {
        const historyTable = document.getElementById('payoutsHistoryTableBody');
        try {
            let client = window.supabaseClient;
            if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
                client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }

            const { data: payouts, error } = await client
                .from('payout_requests')
                .select('*')
                .eq('user_id', userId)
                .neq('hidden_for_user', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            let statusContainer = document.getElementById('payoutStatusNotifications');

            if (payouts && payouts.length > 0) {
                // فلترة وعرض أحدث طلب فقط لمنع تكرار الرسائل المرفوضة
                const latest = payouts[0];
                const cardId = `payout-alert-${latest.id}`;

                if (statusContainer) {
                    if (latest.status === 'approved') {
                        statusContainer.innerHTML = `
                            <div id="${cardId}" class="alert alert-success rounded-4 border-0 shadow-sm p-3 d-flex align-items-center justify-content-between fade show">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="bg-success text-white p-2 rounded-circle fs-5 d-flex align-items-center justify-content-center" style="width: 42px; height: 42px;">
                                        <i class="bi bi-check-lg"></i>
                                    </div>
                                    <div>
                                        <h6 class="fw-bold mb-1">تمت الموافقة على طلب سحب الكاش باك! 🎉</h6>
                                        <small class="d-block text-secondary">تم تحويل مبلغ <strong>${latest.amount} ج.م</strong> وإضافته للمسحوبات المكتملة.</small>
                                    </div>
                                </div>
                                <button type="button" onclick="dismissPayoutAlert('${cardId}')" class="btn-close shadow-none p-2 fs-8"></button>
                            </div>
                        `;
                    } else if (latest.status === 'rejected') {
                        statusContainer.innerHTML = `
                            <div id="${cardId}" class="alert alert-danger rounded-4 border-0 shadow-sm p-3 d-flex align-items-start justify-content-between fade show">
                                <div class="d-flex align-items-start gap-3">
                                    <div class="bg-danger text-white p-2 rounded-circle fs-5 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 42px; height: 42px;">
                                        <i class="bi bi-x-lg"></i>
                                    </div>
                                    <div class="flex-grow-1">
                                        <h6 class="fw-bold mb-1">تم رفض طلب سحب مبلغ (${latest.amount} ج.م)</h6>
                                        <div class="p-2 rounded-3 bg-white border border-danger-subtle fs-8 text-danger fw-bold mb-2">
                                            "${latest.rejection_reason || 'يرجى مراجعة تفاصيل الحساب.'}"
                                        </div>
                                        <small class="text-muted d-block">تم إعادة المبلغ إلى رصيدك المتاح.</small>
                                    </div>
                                </div>
                                <button type="button" onclick="dismissPayoutAlert('${cardId}')" class="btn-close shadow-none p-2 fs-8"></button>
                            </div>
                        `;
                    } else {
                        statusContainer.innerHTML = `
                            <div id="${cardId}" class="alert alert-warning rounded-4 border-0 shadow-sm p-3 d-flex align-items-center justify-content-between fade show">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="bg-warning text-dark p-2 rounded-circle fs-5 d-flex align-items-center justify-content-center" style="width: 42px; height: 42px;">
                                        <i class="bi bi-hourglass-split"></i>
                                    </div>
                                    <div>
                                        <h6 class="fw-bold mb-1">طلب سحب الكاش باك قيد المراجعة ⏳</h6>
                                        <small class="d-block text-secondary">جاري مراجعة طلب سحب مبلغ <strong>${latest.amount} ج.م</strong> من قِبل الإدارة.</small>
                                    </div>
                                </div>
                                <button type="button" onclick="dismissPayoutAlert('${cardId}')" class="btn-close shadow-none p-2 fs-8"></button>
                            </div>
                        `;
                    }
                }

                if (historyTable) {
                    historyTable.innerHTML = payouts.map((p, idx) => `
                        <tr id="payout-row-${p.id}">
                            <td>${new Date(p.created_at).toLocaleDateString('ar-EG')}</td>
                            <td class="fw-bold text-purple">${p.amount} ج.م</td>
                            <td><span class="badge bg-light text-dark border">${p.method === 'vodafone_cash' ? 'فودافون كاش' : 'إنستا باي'}</span></td>
                            <td class="fw-bold text-muted">${p.account_details}</td>
                            <td>
                                <span class="badge ${p.status === 'approved' ? 'bg-success' : p.status === 'rejected' ? 'bg-danger' : 'bg-warning text-dark'} rounded-pill px-3 py-1">
                                    ${p.status === 'approved' ? 'تم التحويل' : p.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                </span>
                            </td>
                            <td>
                                <div class="d-flex align-items-center justify-content-center gap-2">
                                    <span>${p.status === 'rejected' ? (p.rejection_reason || 'ملاحظات') : 'مكتمل'}</span>
                                    <button type="button" onclick="hidePayoutFromUser('${p.id}')" class="btn btn-outline-danger btn-sm rounded-pill px-2 fs-9" title="إخفاء السجل">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('');
                }

            } else {
                if (statusContainer) statusContainer.innerHTML = '';
                if (historyTable) historyTable.innerHTML = `<tr><td colspan="6" class="text-muted py-4">لا توجد طلبات سحب مسجلة.</td></tr>`;
            }

        } catch (err) {
            console.warn('تنبيه حالة السحب:', err.message);
            if (historyTable) historyTable.innerHTML = `<tr><td colspan="6" class="text-muted py-4">لا توجد طلبات سحب</td></tr>`;
        }
    }

    // دالة جلب سجل العمولات والكاش باك المعلق
    async function loadUserCommissions(userId) {
        const tbody = document.getElementById('commissionsTableBody');
        const clicksDisplay = document.getElementById('totalClicks');

        try {
            let client = window.supabaseClient;
            if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
                client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }

            const { data: commissions, error } = await client
                .from('commissions')
                .select('*')
                .eq('affiliate_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (clicksDisplay) {
                clicksDisplay.innerText = commissions ? commissions.length : 0;
            }

            if (commissions && commissions.length > 0) {
                tbody.innerHTML = commissions.map((c, idx) => `
                    <tr id="comm-row-${idx}">
                        <td>${new Date(c.created_at).toLocaleDateString('ar-EG')}</td>
                        <td class="fw-bold text-purple">${c.amount} ج.م</td>
                        <td>
                            <div class="d-flex align-items-center justify-content-center gap-2">
                                <span class="badge ${c.status === 'approved' ? 'bg-success' : c.status === 'rejected' ? 'bg-danger' : 'bg-warning text-dark'} rounded-pill px-3 py-1">
                                    ${c.status === 'approved' ? 'مؤكد ومتاح' : c.status === 'rejected' ? 'مرفوض' : 'قيد موافقة الأدمن (معلق)'}
                                </span>
                                <button type="button" onclick="removeRowFromUI('comm-row-${idx}')" class="btn btn-outline-danger btn-sm rounded-pill px-2 fs-9" title="إخفاء من الواجهة">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = `<tr><td colspan="3" class="text-muted py-4">لا توجد عمليات كاش باك معلقة حتى الآن.</td></tr>`;
            }
        } catch (err) {
            console.warn('تنبيه سجل الكاش باك:', err.message);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="3" class="text-muted py-4">لا توجد عمليات مسجلة</td></tr>`;
            }
        }
    }

    // ---------------------- الدوال المضافة للإدارة ----------------------

    async function loadDashboardCategories(client) {
        const table = document.getElementById('categoriesTableBody');
        if (!table) return;

        try {
            const { data: categories, error } = await client
                .from('categories')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (categories && categories.length > 0) {
                table.innerHTML = categories.map(cat => `
                    <tr>
                        <td><i class="bi ${cat.icon || 'bi-tag'} fs-5 text-purple me-2"></i> ${cat.name}</td>
                        <td>${new Date(cat.created_at || Date.now()).toLocaleDateString('ar-EG')}</td>
                    </tr>
                `).join('');
            } else {
                table.innerHTML = `<tr><td colspan="2" class="text-muted py-3">لا توجد أقسام مسجلة حالياً.</td></tr>`;
            }
        } catch (err) {
            console.warn('تنبيه الأقسام:', err.message);
        }
    }

    async function loadDashboardStores(client) {
        const table = document.getElementById('storesTableBody');
        if (!table) return;

        try {
            const { data: stores, error } = await client
                .from('stores')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (stores && stores.length > 0) {
                table.innerHTML = stores.map(st => `
                    <tr>
                        <td><img src="${st.logo_url}" width="35" height="35" class="rounded-circle object-fit-cover me-2" onerror="this.src='https://via.placeholder.com/35'">${st.name}</td>
                        <td>${new Date(st.created_at || Date.now()).toLocaleDateString('ar-EG')}</td>
                    </tr>
                `).join('');
            } else {
                table.innerHTML = `<tr><td colspan="2" class="text-muted py-3">لا توجد متاجر مربوطة حالياً.</td></tr>`;
            }
        } catch (err) {
            console.warn('تنبيه المتاجر:', err.message);
        }
    }

    async function loadDashboardBanners(client) {
        const table = document.getElementById('bannersTableBody');
        if (!table) return;

        try {
            const { data: banners, error } = await client
                .from('banners')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (banners && banners.length > 0) {
                table.innerHTML = banners.map(b => `
                    <tr>
                        <td><img src="${b.image_url}" width="80" height="40" class="rounded-3 object-fit-cover me-2">${b.title || 'بدون عنوان'}</td>
                        <td><a href="${b.target_link || '#'}" target="_blank" class="text-purple">رابط العرض</a></td>
                        <td><span class="badge ${b.is_active ? 'bg-success' : 'bg-secondary'}">${b.is_active ? 'نشط' : 'غير نشط'}</span></td>
                    </tr>
                `).join('');
            } else {
                table.innerHTML = `<tr><td colspan="3" class="text-muted py-3">لا توجد بنرات مسجلة.</td></tr>`;
            }
        } catch (err) {
            console.warn('تنبيه البنرات:', err.message);
        }
    }

    async function loadDashboardMessages(client) {
        const table = document.getElementById('messagesTableBody');
        if (!table) return;

        try {
            const { data: messages, error } = await client
                .from('contact_messages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (messages && messages.length > 0) {
                table.innerHTML = messages.map(msg => `
                    <tr>
                        <td>${msg.name || 'زائر'}</td>
                        <td>${msg.email || '-'}</td>
                        <td>${msg.message || ''}</td>
                        <td>${new Date(msg.created_at || Date.now()).toLocaleDateString('ar-EG')}</td>
                    </tr>
                `).join('');
            } else {
                table.innerHTML = `<tr><td colspan="4" class="text-muted py-3">لا توجد رسائل مستلمة حتى الآن.</td></tr>`;
            }
        } catch (err) {
            console.warn('تنبيه الرسائل:', err.message);
        }
    }

    async function initProductCategoriesDropdown(client) {
        const select = document.getElementById('productCategorySelect');
        if (!select) return;

        try {
            const { data: categories, error } = await client
                .from('categories')
                .select('name')
                .order('name', { ascending: true });

            if (error || !categories) return;

            select.innerHTML = `<option value="">اختر القسم...</option>` + 
                categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

        } catch (err) {
            console.warn('تنبيه القائمة المنسدلة للأقسام:', err.message);
        }
    }

    function showDashboardToast(message, type = 'success') {
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
});

window.dismissPayoutAlert = function(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-15px) scale(0.95)';
        setTimeout(() => el.remove(), 400);
    }
};

window.removeRowFromUI = function(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '0';
        setTimeout(() => row.remove(), 300);
    }
};

// دالة مسح السجل من واجهة العميل بدون Popups بدائية مع استبدالها بـ Toast
window.hidePayoutFromUser = async function(payoutId) {
    const row = document.getElementById(`payout-row-${payoutId}`);
    if (row) {
        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '0';
        setTimeout(() => row.remove(), 300);
    }

    try {
        let client = window.supabaseClient;
        if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        await client
            .from('payout_requests')
            .update({ hidden_for_user: true })
            .eq('id', payoutId);

        if (typeof showDashboardToast === 'function') {
            showDashboardToast('تم إخفاء السجل من قائمتك بنجاح', 'success');
        }

    } catch (err) {
        console.error('خطأ إخفاء السجل:', err.message);
    }
};