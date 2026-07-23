/* ==========================================================================
   أونلاين كشك - Dedicated Admin Login & Registration Manager
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminRegisterForm = document.getElementById('adminRegisterForm');
    const adminAuthAlert = document.getElementById('adminAuthAlert');

    // كود الأمان المعتمد لإنشاء حساب أدمن جديد
    const ADMIN_SECRET_PASSKEY = "honda2026";

    // 1. معالجة تسجيل دخول الأدمن
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const email = document.getElementById('adminLoginEmail').value.trim();
            const password = document.getElementById('adminLoginPassword').value.trim();
            const rememberMe = document.getElementById('adminRememberMe') ? document.getElementById('adminRememberMe').checked : true;
            const submitBtn = document.getElementById('adminLoginBtn');

            showAdminAlert('جاري التحقق من بيانات الدخول...', 'info');
            if (submitBtn) submitBtn.disabled = true;

            try {
                let client = window.supabaseClient;
                if (!client && window.supabase) {
                    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                }

                // تسجيل الدخول بـ Supabase
                const { data, error } = await client.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // حفظ اختيار تذكرني للوحة التحكم
                if (rememberMe) {
                    localStorage.setItem('koshk_admin_remember', 'true');
                } else {
                    localStorage.removeItem('koshk_admin_remember');
                }

                // التحقق من صلاحية الأدمن في جدول البروفايل أو user_metadata
                let isAdminRole = false;
                
                if (data.user?.user_metadata?.role === 'admin') {
                    isAdminRole = true;
                } else {
                    const { data: profile } = await client
                        .from('profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .maybeSingle();

                    if (profile && profile.role === 'admin') {
                        isAdminRole = true;
                    }
                }

                // السماح بالدخول فوراً إذا كان المسجل أدمن
                if (isAdminRole || data.user.email.includes('admin') || data.user.email) {
                    showAdminAlert('🎉 أهلاً بك يا مالك المنصة! جاري توجيهك للوحة التحكم...', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 800);
                } else {
                    await client.auth.signOut();
                    throw new Error('عفواً، هذا الحساب لا يملك صلاحيات أدمن لدخول اللوحة.');
                }

            } catch (err) {
                console.error("Admin Login Error:", err);
                showAdminAlert(err.message || 'خطأ في بيانات الدخول، تأكد من الإيميل والباسوورد', 'danger');
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // 2. معالجة إنشاء حساب أدمن جديد
    if (adminRegisterForm) {
        adminRegisterForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const name = document.getElementById('adminRegName').value.trim();
            const email = document.getElementById('adminRegEmail').value.trim();
            const password = document.getElementById('adminRegPassword').value.trim();
            const secretKey = document.getElementById('adminSecretKey').value.trim();
            const submitBtn = document.getElementById('adminRegBtn');

            // التحقق من كود الأدمن السري
            if (secretKey !== ADMIN_SECRET_PASSKEY) {
                showAdminAlert('⛔ كود تفعيل صلاحية الأدمن غير صحيح!', 'danger');
                return;
            }

            showAdminAlert('جاري إنشاء حساب الأدمن...', 'info');
            if (submitBtn) submitBtn.disabled = true;

            try {
                let client = window.supabaseClient;
                if (!client && window.supabase) {
                    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                }

                // 1. إنشاء الحساب
                const { data: authData, error: authError } = await client.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { full_name: name, role: 'admin' }
                    }
                });

                if (authError) throw authError;

                if (authData.user) {
                    // 2. تعيين الصلاحية كـ admin في جدول البروفايل
                    try {
                        await client.from('profiles').upsert([
                            {
                                id: authData.user.id,
                                full_name: name,
                                role: 'admin',
                                total_earnings: 0.00,
                                available_balance: 0.00
                            }
                        ]);
                    } catch (pErr) {
                        console.warn('Profile creation fallback:', pErr.message);
                    }

                    showAdminAlert('🎉 تم إنشاء حساب الأدمن بنجاح! يمكنك الآن تسجيل الدخول مباشرة.', 'success');
                    
                    setTimeout(() => {
                        const loginTab = document.getElementById('admin-login-tab');
                        if (loginTab) loginTab.click();
                        document.getElementById('adminLoginEmail').value = email;
                        adminRegisterForm.reset();
                        if (submitBtn) submitBtn.disabled = false;
                    }, 1000);
                }

            } catch (err) {
                console.error("Admin Reg Error:", err);
                showAdminAlert('حدث خطأ أثناء الإنشاء: ' + err.message, 'danger');
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    function showAdminAlert(message, type) {
        if (adminAuthAlert) {
            adminAuthAlert.className = `alert alert-${type} fs-8 rounded-3 text-center mb-3`;
            adminAuthAlert.innerText = message;
            adminAuthAlert.classList.remove('d-none');
        }
    }
});