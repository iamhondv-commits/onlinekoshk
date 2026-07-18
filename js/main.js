let currentSlideIndex = 0;
let autoSlider;

function initSlider() {
    const sliderContainer = document.querySelector('.hero-slider-container');
    if (!sliderContainer) return;

    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const sliderWrapper = document.getElementById('slider-wrapper');
    const totalSlides = slides.length;

    function updateSliderPosition() {
        if (!sliderWrapper) return;
        sliderWrapper.style.transform = `translateX(${currentSlideIndex * (100 / totalSlides)}%)`;
        dots.forEach(dot => dot.classList.remove('active-dot'));
        slides.forEach(slide => slide.classList.remove('active-slide'));
        if (dots[currentSlideIndex]) dots[currentSlideIndex].classList.add('active-dot');
        if (slides[currentSlideIndex]) slides[currentSlideIndex].classList.add('active-slide');
    }

    window.moveSlide = function(direction) {
        currentSlideIndex += direction;
        if (currentSlideIndex >= totalSlides) currentSlideIndex = 0;
        else if (currentSlideIndex < 0) currentSlideIndex = totalSlides - 1;
        updateSliderPosition();
    }

    window.currentSlide = function(index) {
        currentSlideIndex = index;
        updateSliderPosition();
    }

    clearInterval(autoSlider);
    autoSlider = setInterval(() => { moveSlide(1); }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    initSlider();
    window.homePageHTML = document.querySelector('main .full-width-container').innerHTML;
});

function updateLocation(provinceName) {
    document.getElementById('current-location').innerText = provinceName;
    document.getElementById('current-location-mobile').innerText = provinceName;
}

function toggleSidebar() {
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

function toggleLocationMobile() {
    const list = document.getElementById('mobileLocationList');
    list.classList.toggle('open');
}

function updateLocationMobile(provinceName) {
    document.getElementById('current-location').innerText = provinceName;
    document.getElementById('current-location-mobile').innerText = provinceName;
    toggleLocationMobile();
    toggleSidebar();
}

function scrollProducts(containerId, direction) {
    const container = document.getElementById(containerId);
    const scrollAmount = 280;
    if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
    } else {
        container.scrollLeft += scrollAmount;
    }
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.auth-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    
    if(tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabs[0].classList.add('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabs[1].classList.add('active');
    }
}

function showPage(pageName) {
    const mainContainer = document.querySelector('main .full-width-container');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if(sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }

    const navItems = document.querySelectorAll('.mobile-nav-item');
    navItems.forEach(item => item.classList.remove('active-bottom-item'));
    
    if (pageName === 'home') {
        mainContainer.innerHTML = window.homePageHTML;
        navItems[2].classList.add('active-bottom-item');
        initSlider();
        return;
    }

    let pageHTML = '';

    if (pageName === 'auth') {
        // تم تفعيل فصل الأقسام وتحويل المستخدم للموقع الثابت الجديد الفاخر وعلاج الـ OTP
        window.location.href = 'auth.html';
        return;
    } 
    else if (pageName === 'track') {
        navItems[3].classList.add('active-bottom-item');
        pageHTML = `
            <div class="container">
                <div class="page-card">
                    <h2 class="page-title"><i class="fas fa-truck"></i> تتبع حالة طلبك</h2>
                    <p style="margin-bottom: 20px; color:#64748b;">أدخل رقم الطلب المرسل إليك في رسالة نصية لمتابعة خط سير الشحنة.</p>
                    <div class="search-bar" style="margin: 0 auto 30px auto; max-width: 500px;">
                        <input type="text" placeholder="أدخل رقم الطلب (مثال: #OK-98745)...">
                        <button type="button" style="background:#0f172a; color:#5EEAD4; border-radius:0 6px 6px 0; left:auto; right:0; width:60px;"><i class="fas fa-search"></i></button>
                    </div>
                    <div class="tracking-timeline">
                        <div class="timeline-step completed">
                            <div class="step-icon"><i class="fas fa-check"></i></div>
                            <div class="step-info"><h4>تم تأكيد الطلب</h4><p>جاري تجهيز منتجاتك في المخزن</p></div>
                        </div>
                        <div class="timeline-step active">
                            <div class="step-icon"><i class="fas fa-box"></i></div>
                            <div class="step-info"><h4>جاري التغليف والشحن</h4><p>تم تسليم الشحنة لمندوب التوصيل</p></div>
                        </div>
                        <div class="timeline-step">
                            <div class="step-icon"><i class="fas fa-home"></i></div>
                            <div class="step-info"><h4>تم التوصيل</h4><p>في الطريق إلى عنوانك المحدد</p></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    else if (pageName === 'wishlist') {
        navItems[1].classList.add('active-bottom-item');
        pageHTML = `
            <div class="container">
                <div class="page-card">
                    <h2 class="page-title"><i class="far fa-heart"></i> المنتجات المفضلة</h2>
                    <p style="color:#64748b; text-align:center; padding:40px 0;">قائمة المفضلة فارغة حالياً. اضغط على علامة القلب في أي منتج لحفظه هنا.</p>
                </div>
            </div>
        `;
    }
    else if (pageName === 'cart') {
        navItems[4].classList.add('active-bottom-item');
        pageHTML = `
            <div class="container">
                <div class="page-card">
                    <h2 class="page-title"><i class="fas fa-shopping-basket"></i> عربة التسوق</h2>
                    <p style="color:#64748b; text-align:center; padding:40px 0;">العربة فارغة. تصفح المتجر وأضف منتجاتك المفضلة للبدء في الشراء.</p>
                </div>
            </div>
        `;
    }
    else if (pageName === 'about') {
        pageHTML = `
            <div class="container">
                <div class="page-card text-page">
                    <h2>من نحن</h2>
                    <p>مرحباً بكم في <strong>Online Koshk</strong>، فكرتنا بدأت من روح الحارة المصرية الأصيلة حيث يعتبر "الكشك" هو الملجأ السريع واليومي لكل الاحتياجات، فقررنا نقل هذه التجربة الفريدة إلى العصر الرقمي الحديث عبر براند تكنولوجي متكامل يوفر لك كل ما تحتاجه بضغطة زر واحدة.</p>
                    <p>نحن نطمح لتقديم تجربة تسوق إلكتروني استثنائية تجمع بين السرعة التامة، الأمان المطلق، والأسعار المنافسة التي تدعم المستهلك العربي في كل مكان.</p>
                </div>
            </div>
        `;
    }
    else if (pageName === 'privacy') {
        pageHTML = `
            <div class="container">
                <div class="page-card text-page">
                    <h2>سياسة الخصوصية</h2>
                    <p>في Online Koshk.، نضع خصوصية بياناتك في مقدمة أولوياتنا. نحن ملتزمون بحماية كافة المعلومات الشخصية التي تشاركها معنا (مثل الاسم، رقم الهاتف، البريد الإلكتروني، وعنوان التوصيل).</p>
                    <p>يتم استخدام بياناتك فقط لغرض معالجة طلبات الشحن وتوصيلها لك وتطوير مستوى الخدمة، ولا يتم بيع أو مشاركة هذه البيانات مع أي جهات خارجية تابعة لأطراف ثالثة خارج نطاق الشحن والتوصيل الرسمي.</p>
                </div>
            </div>
        `;
    }
    else if (pageName === 'terms') {
        pageHTML = `
            <div class="container">
                <div class="page-card text-page">
                    <h2>الشروط والأحكام</h2>
                    <p>باستخدامك لموقع onlinekoshk.com فأنت توافق تماماً على الالتزام بالشروط والأحكام المذكورة سلفاً:</p>
                    <ul>
                        <li>يجب أن تكون كافة البيانات المدخلة أثناء الشراء دقيقة وصحيحة لضمان وصول الشحنة.</li>
                        <li>الأسعار المعروضة قابلة للتحديث بناءً على العروض والخصومات الجارية ومخزون المنتجات.</li>
                        <li>يحق للمتجر إلغاء أو تعليق أي طلب في حال وجود شبهة احتيال أو إدخال بيانات وهمية.</li>
                    </ul>
                </div>
            </div>
        `;
    }
    else if (pageName === 'contact') {
        pageHTML = `
            <div class="container">
                <div class="page-card">
                    <h2 class="page-title"><i class="fas fa-headset"></i> اتصل بنا</h2>
                    <p style="margin-bottom:30px; color:#64748b;">يسعدنا دائماً الاستماع إلى استفساراتك واقتراحاتك. تواصل معنا مباشرة:</p>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:30px;">
                        <form class="auth-form" style="box-shadow:none; padding:0; border:none;" onsubmit="event.preventDefault();">
                            <div class="form-group"><label>الاسم</label><input type="text" placeholder="أدخل اسمك" required></div>
                            <div class="form-group"><label>البريد الإلكتروني</label><input type="email" placeholder="email@domain.com" required></div>
                            <div class="form-group"><label>نص الرسالة</label><textarea placeholder="اكتب استفسارك هنا..." style="width:100%; height:120px; padding:12px; border-radius:6px; border:1px solid #e2e8f0; font-family:'Cairo'; outline:none; resize:none;"></textarea></div>
                            <button type="submit" class="auth-btn">إرسال الرسالة</button>
                        </form>
                        <div style="background:#f8fafc; padding:25px; border-radius:8px; border:1px solid #e2e8f0; display:flex; flex-direction:column; gap:20px;">
                            <div><h4 style="color:#0f172a; margin-bottom:5px;"><i class="fas fa-envelope" style="color:#2dd4bf;"></i> البريد الإلكتروني الدعم</h4><p>support@onlinekoshk.com</p></div>
                            <div><h4 style="color:#0f172a; margin-bottom:5px;"><i class="fas fa-phone-alt" style="color:#2dd4bf;"></i> الخط الساخن</h4><p>19XXX (متاح 24 ساعة)</p></div>
                            <div><h4 style="color:#0f172a; margin-bottom:5px;"><i class="fas fa-map-marker-alt" style="color:#2dd4bf;"></i> المقر الرئيسي</h4><p>القاهرة، جمهورية مصر العربية</p></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    mainContainer.innerHTML = pageHTML;
}