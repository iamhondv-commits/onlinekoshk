/* ==========================================================================
   أونلاين كشك - Enhanced Authentication & Navbar Dynamic State Manager
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async function () {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authAlert = document.getElementById('authAlert');

    // استرجاع الإيميل وحالة "تذكرني" إن وجِدت عند تحميل الصفحة
    initRememberMeState();

    // حقن زر ونافذة "نسيت كلمة المرور" تلقائياً في الصفحة إذا لم تكن موجودة لضمان عملها فوراً
    injectForgotPasswordUI();

    // 1. فحص الجلسة وتحديث الناف بار في جميع أرجاء الموقع
    await checkAuthStatus();

    // 2. معالجة نموذج تسجيل الدخول
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            const rememberMeInput = document.getElementById('userRememberMe') || document.getElementById('rememberMe');
            const rememberMe = rememberMeInput ? rememberMeInput.checked : false;
            const loginBtn = document.getElementById('loginBtn') || loginForm.querySelector('button[type="submit"]');

            showAlert('جاري التحقق من بيانات الدخول...', 'info');
            if (loginBtn) loginBtn.disabled = true;

            try {
                let client = window.supabaseClient;
                if (!client && window.supabase) {
                    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                }

                // ضبط جلسة Supabase لتكون دائمة ومستمرة بناءً على اختيار تذكرني
                if (client && client.auth) {
                    await client.auth.setSession({
                        persistSession: true
                    });
                }

                // تسجيل الدخول
                const { data, error } = await client.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // حفظ أو إزالة بيانات "تذكرني" بداخل localStorage
                if (rememberMe) {
                    localStorage.setItem('koshk_remember_user', 'true');
                    localStorage.setItem('koshk_saved_email', email);
                } else {
                    localStorage.removeItem('koshk_remember_user');
                    localStorage.removeItem('koshk_saved_email');
                }

                // التحقق مما إذا كان المسجل هو الأدمن الرئيسي (iamhondv@gmail.com)
                if (data.user && data.user.email === 'iamhondv@gmail.com') {
                    showToast('أهلاً بك يا مالك الكشك! جاري توجيهك للوحة التحكم الشاملة...', 'success');
                    setTimeout(() => {
                        window.location.href = 'admin/index.html';
                    }, 1200);
                    return;
                }

                showToast('تم تسجيل الدخول بنجاح! جاري تحويلك إلى محفظتك...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1200);

            } catch (err) {
                showAlert('خطأ في تسجيل الدخول: ' + (err.message || 'بيانات الاعتماد غير صحيحة أو الحساب لم يتفعل عبر الإيميل بعد'), 'danger');
                if (loginBtn) loginBtn.disabled = false;
            }
        });
    }

    // 3. معالجة نموذج إنشاء حساب جديد (تم تصحيح الأرصدة إلى 0.00 معتمدة على العمليات المباشرة)
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const fullName = document.getElementById('regFullName') ? document.getElementById('regFullName').value.trim() : '';
            const phone = document.getElementById('regPhone') ? document.getElementById('regPhone').value.trim() : '';
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value.trim();
            const regBtn = document.getElementById('regBtn') || registerForm.querySelector('button[type="submit"]');

            showAlert('جاري إنشاء الحساب...', 'info');
            if (regBtn) regBtn.disabled = true;

            try {
                let client = window.supabaseClient;
                if (!client && window.supabase) {
                    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                }

                // إنشاء المستخدم في Supabase Auth مع حفظ البيانات في user_metadata
                const { data: authData, error: authError } = await client.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: fullName,
                            phone: phone
                        }
                    }
                });

                if (authError) throw authError;

                if (authData.user) {
                    // إنشاء وتأكيد الهيكل المالي الشامل للبروفايل بأرصدة أولية صفرية 0.00
                    try {
                        await client
                            .from('profiles')
                            .upsert([
                                {
                                    id: authData.user.id,
                                    full_name: fullName || email.split('@')[0],
                                    phone: phone,
                                    role: email === 'iamhondv@gmail.com' ? 'admin' : 'customer',
                                    pending_cashback: 0.00,
                                    available_balance: 0.00,
                                    pending_payout: 0.00,
                                    total_withdrawn: 0.00,
                                    total_earnings: 0.00
                                }
                            ]);
                    } catch (pErr) {
                        console.warn('Profile sync fallback warning:', pErr.message);
                    }

                    showAlert('🎉 تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول مباشرًة.', 'success');
                    
                    if (document.getElementById('login-tab')) {
                        setTimeout(() => {
                            document.getElementById('login-tab').click();
                            if (document.getElementById('loginEmail')) document.getElementById('loginEmail').value = email;
                            registerForm.reset();
                            if (regBtn) regBtn.disabled = false;
                        }, 1500);
                    }
                }
            } catch (err) {
                showAlert('خطأ أثناء التسجيل: ' + err.message, 'danger');
                if (regBtn) regBtn.disabled = false;
            }
        });
    }

    // دالة استرجاع وتعبئة بيانات خيار "تذكرني"
    function initRememberMeState() {
        const isRemembered = localStorage.getItem('koshk_remember_user');
        const savedEmail = localStorage.getItem('koshk_saved_email');
        const loginEmailInput = document.getElementById('loginEmail');
        const rememberCheckbox = document.getElementById('userRememberMe') || document.getElementById('rememberMe');

        if (isRemembered === 'true' && savedEmail && loginEmailInput) {
            loginEmailInput.value = savedEmail;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }

    // حقن زر "نسيت كلمة المرور" والـ Modal الخاص به تلقائياً في صفحات الدخول
    function injectForgotPasswordUI() {
        if (document.getElementById('forgotPasswordModal')) return;

        // إضافة الزر تحت خانة الباسورد أو الفورم لو مش موجود
        const passwordGroup = document.querySelector('#loginForm .mb-3:has(#loginPassword)') || document.querySelector('#loginForm button[type="submit"]')?.parentElement;
        if (passwordGroup && !document.getElementById('forgotPasswordBtnLink')) {
            const forgotLinkDiv = document.createElement('div');
            forgotLinkDiv.className = 'text-end mb-3';
            forgotLinkDiv.innerHTML = `<a href="javascript:void(0);" id="forgotPasswordBtnLink" class="text-purple fw-bold fs-9 text-decoration-none">هل نسيت كلمة المرور؟</a>`;
            passwordGroup.before(forgotLinkDiv);
        }

        // حقن الـ Modal في نهاية الصفحة (تم تصحيح type="email" هنا)
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = `
            <div class="modal fade" id="forgotPasswordModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content rounded-4 border-0 shadow-lg p-3">
                        <div class="modal-header border-0 pb-0">
                            <h5 class="modal-title fw-bold text-dark"><i class="bi bi-key-fill text-purple me-2"></i> استعادة كلمة المرور</h5>
                            <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="text-secondary fs-8 mb-3">أدخل البريد الإلكتروني المسجل بحسابك، وسنرسل لك رابطاً مباشراً لإنشاء كلمة مرور جديدة.</p>
                            <form id="forgotPasswordForm">
                                <div class="mb-3">
                                    <label class="form-label fw-bold fs-8 text-dark">البريد الإلكتروني</label>
                                    <input type="email" id="forgotEmailInput" class="form-control rounded-pill px-3 py-2 fs-8" placeholder="name@example.com" required>
                                </div>
                                <div id="forgotAlert" class="alert d-none fs-9 text-center rounded-3 p-2 mb-3"></div>
                                <div class="d-grid">
                                    <button type="submit" id="forgotSubmitBtn" class="btn btn-purple rounded-pill py-2 fw-bold text-white shadow-sm">
                                        إرسال رابط الاستعادة <i class="bi bi-send-check ms-1"></i>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);

        // ربط الأحداث للفتح والإرسال
        document.getElementById('forgotPasswordBtnLink')?.addEventListener('click', function() {
            const emailVal = document.getElementById('loginEmail')?.value || '';
            if (emailVal) document.getElementById('forgotEmailInput').value = emailVal;
            new bootstrap.Modal(document.getElementById('forgotPasswordModal')).show();
        });

        document.getElementById('forgotPasswordForm')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('forgotEmailInput').value.trim();
            const btn = document.getElementById('forgotSubmitBtn');
            const alertBox = document.getElementById('forgotAlert');

            if (!email) return;

            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> جاري الإرسال...`;

            try {
                let client = window.supabaseClient;
                if (!client && window.supabase) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

                const { error } = await client.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/reset-password.html',
                });

                if (error) throw error;

                alertBox.className = 'alert alert-success fs-9 text-center rounded-3 p-2 mb-3';
                alertBox.innerText = '🎉 تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح!';
                alertBox.classList.remove('d-none');

                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'))?.hide();
                    alertBox.classList.add('d-none');
                    btn.disabled = false;
                    btn.innerHTML = `إرسال رابط الاستعادة <i class="bi bi-send-check ms-1"></i>`;
                }, 3000);

            } catch (err) {
                alertBox.className = 'alert alert-danger fs-9 text-center rounded-3 p-2 mb-3';
                alertBox.innerText = 'خطأ: ' + (err.message || 'تعذر إرسال الإيميل');
                alertBox.classList.remove('d-none');
                btn.disabled = false;
                btn.innerHTML = `إرسال رابط الاستعادة <i class="bi bi-send-check ms-1"></i>`;
            }
        });
    }

    // دالة فحص وتحديث الناف بار ديناميكياً بحسب حالة الجلسة
    async function checkAuthStatus() {
        const authSection = document.getElementById('authSection');
        if (!authSection) return;

        try {
            let client = window.supabaseClient;
            if (!client && window.supabase) {
                client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            }

            if (!client) return;

            const { data: { user } } = await client.auth.getUser();

            if (user) {
                // جلب اسم المستخدم من قاعدة البيانات
                let displayName = user.user_metadata?.full_name || user.email.split('@')[0];
                try {
                    const { data: profile } = await client
                        .from('profiles')
                        .select('full_name')
                        .eq('id', user.id)
                        .single();

                    if (profile && profile.full_name) displayName = profile.full_name;
                } catch (pErr) {
                    console.warn('Profile name fetch fallback:', pErr.message);
                }

                // تحديث الناف بار لإظهار الاسم وزر تسجيل الخروج
                authSection.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        <a href="${user.email === 'iamhondv@gmail.com' ? 'admin/index.html' : 'dashboard.html'}" class="btn btn-purple-soft btn-sm rounded-pill px-3 fw-bold fs-8 d-flex align-items-center gap-1">
                            <i class="bi bi-person-circle fs-6"></i>
                            <span>${displayName}</span>
                        </a>
                        <button id="navLogoutBtn" class="btn btn-outline-danger btn-sm rounded-pill px-3 fs-8 fw-bold">
                            خروج <i class="bi bi-box-arrow-right ms-1"></i>
                        </button>
                    </div>
                `;

                // تفعيل خيار الخروج الفوري
                const logoutBtn = document.getElementById('navLogoutBtn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', async function () {
                        await client.auth.signOut();
                        localStorage.removeItem('koshk_remember_user');
                        localStorage.removeItem('koshk_saved_email');
                        showToast('تم تسجيل الخروج بنجاح!', 'info');
                        setTimeout(() => window.location.reload(), 1000);
                    });
                }
            } else {
                authSection.innerHTML = `
                    <a href="login.html" id="navLoginBtn" class="btn btn-outline-purple btn-sm rounded-pill px-3 fw-bold glow-btn-outline">تسجيل الدخول</a>
                `;
            }
        } catch (err) {
            console.warn('تنبيه فحص الجلسة:', err.message);
        }
    }

    // دالة التنبيهات المخصصة داخل الصفحات
    function showAlert(message, type) {
        if (authAlert) {
            authAlert.className = `alert alert-${type} fs-8 rounded-4 text-center mb-3`;
            authAlert.innerText = message;
            authAlert.classList.remove('d-none');
        } else {
            showToast(message, type === 'danger' ? 'error' : 'success');
        }
    }
});

// دالة Toast عائمة ومتحركة في الزاوية
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