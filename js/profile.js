document.addEventListener('DOMContentLoaded', async function () {
    let currentUser = null;

    // تفعيل خاصية الفتح والإغلاق المنزلقة للخانة الاحترافية
    const toggleBtn = document.getElementById('toggleProfileBoxBtn');
    const collapsibleArea = document.getElementById('profileCollapsibleArea');
    const toggleIcon = document.getElementById('toggleIcon');

    if (toggleBtn && collapsibleArea) {
        // فتح الخانة تلقائياً كـ انميشن ترحيبي عند تحميل الصفحة
        setTimeout(() => {
            collapsibleArea.classList.add('show');
            if (toggleIcon) toggleIcon.classList.add('active');
        }, 300);

        toggleBtn.addEventListener('click', function() {
            collapsibleArea.classList.toggle('show');
            if (toggleIcon) toggleIcon.classList.toggle('active');
        });
    }

    // 1. التحقق من الجلسة وتأمين الدخول
    try {
        let client = window.supabaseClient;
        if (!client && window.supabase) {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        if (!client) throw new Error("تعذر الاتصال بقاعدة البيانات");

        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;
        await loadUserProfileData(currentUser.id, currentUser.email);

    } catch (err) {
        console.error(err);
        window.location.href = 'login.html';
    }

    // 2. معالجة حفظ وتحديث البيانات الشخصية بدون لمس الأرصدة المادية
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
                if (!client && window.supabase) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

                const { error } = await client
                    .from('profiles')
                    .update({
                        full_name: fullName,
                        phone: phone,
                        state: state,
                        city: city
                    })
                    .eq('id', currentUser.id);

                if (error) throw error;
                showProfileToast('🎉 تم تحديث بيانات ملفك الشخصي بنجاح!', 'success');

            } catch (err) {
                showProfileToast('خطأ أثناء تحديث البيانات: ' + err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = `حفظ وتحديث بيانات الملف <i class="bi bi-check2-all ms-1"></i>`;
            }
        });
    }

    // جلب البيانات وملء الحقول
    async function loadUserProfileData(userId, email) {
        try {
            let client = window.supabaseClient;
            if (!client && window.supabase) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            const { data: profile, error } = await client
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            if (profile) {
                if (document.getElementById('profileFullName')) document.getElementById('profileFullName').value = profile.full_name || '';
                if (document.getElementById('profileEmail')) document.getElementById('profileEmail').value = email;
                if (document.getElementById('profilePhone')) document.getElementById('profilePhone').value = profile.phone || '';
                if (document.getElementById('profileState')) document.getElementById('profileState').value = profile.state || '';
                if (document.getElementById('profileCity')) document.getElementById('profileCity').value = profile.city || '';
            }
        } catch (err) {
            console.error('حدث خطأ أثناء تحميل بيانات العميل:', err.message);
        }
    }

    function showProfileToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-custom toast-${type}`;
        toast.innerHTML = `<i class="bi bi-check-circle-fill fs-5"></i> <span>${message}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // تسجيل الخروج
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function () {
            let client = window.supabaseClient;
            if (client) await client.auth.signOut();
            window.location.href = 'login.html';
        });
    }
});