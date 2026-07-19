let currentSlideIndex = 0;
let autoSlider;
let carouselPosition = 0;

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
    autoSlider = setInterval(() => { window.moveSlide(1); }, 5000);
}

// Hero Carousel Manual Scroll
window.scrollCarousel = function(direction) {
    const track = document.getElementById('heroCarouselTrack');
    if (!track) return;

    const cardWidth = 220; // 200px + 20px gap
    const maxScroll = track.scrollWidth - track.parentElement.offsetWidth;

    carouselPosition += direction * cardWidth;

    if (carouselPosition > 0) carouselPosition = 0;
    if (carouselPosition < -maxScroll) carouselPosition = -maxScroll;

    track.style.transform = `translateX(${carouselPosition}px)`;
};

// Add scroll wheel support for carousel
document.addEventListener('DOMContentLoaded', function() {
    const carouselTrack = document.getElementById('heroCarouselTrack');
    if (carouselTrack) {
        carouselTrack.addEventListener('wheel', function(e) {
            e.preventDefault();
            const delta = Math.sign(e.deltaY);
            window.scrollCarousel(delta);
        });
    }
});

// Filter by Category (Connected to Firebase)
window.filterByCategoryLive = async function(categoryName) {
    // Store filter in localStorage for dynamic loading
    localStorage.setItem('currentCategoryFilter', categoryName);
    
    // ربط الفلترة بالحقن الحركي لايف بدلاً من عمل ريلود للصفحة
    if (window.showPageCustomLive) {
        window.showPageCustomLive('home');
        setTimeout(() => {
            const catGrid = document.getElementById('category-filter-output-grid');
            if (!catGrid && window.currentProductsListInMemory) {
                // استدعاء واجهة عرض الفلترة الديناميكية المجهزة
                const mainContainer = document.getElementById('koshkMainHomepageFeedContentGridArea');
                if (mainContainer) {
                    mainContainer.innerHTML = `
                        <div style="width:100%; text-align:right;">
                            <a href="?page=home" onclick="event.preventDefault(); window.showPage('home')" style="color:#1a1e22; font-weight:700; font-size:15px; margin-bottom:20px; display:inline-block;"><i class="fas fa-arrow-right"></i> العودة للرئيسية</a>
                            <h2 style="color:#1a1e22; font-size:20px; margin-bottom:20px;">قسم السلع: <span style="color:#ff9900;">${categoryName}</span></h2>
                            <div class="products-grid" id="category-filter-output-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px,1fr)); gap:20px; width:100%;"></div>
                        </div>
                    `;
                    const innerGrid = document.getElementById('category-filter-output-grid');
                    let count = 0;
                    window.currentProductsListInMemory.forEach((item) => {
                        if (item.category === categoryName) {
                            count++;
                            const mainImg = (item.images && item.images.length > 0) ? item.images[0] : 'https://via.placeholder.com/300?text=Online+Koshk';
                            let priceHtml = `<span class="current-price">${item.price} ج.م</span>`;
                            if (item.discountPrice) priceHtml = `<span class="current-price">${item.discountPrice} ج.م</span>`;
                            innerGrid.insertAdjacentHTML('beforeend', `
                                <div class="product-card" onclick="window.viewProductDetailsLive('${item.id}')" style="cursor:pointer;">
                                    <div class="product-img-wrapper"><img src="${mainImg}" style="max-width:100%; max-height:100%; object-fit:contain;"></div>
                                    <div class="product-info">
                                        <span class="product-brand">${item.brand || 'عام'}</span>
                                        <h3 class="product-name">${item.name}</h3>
                                        <div class="product-price-wrapper">${priceHtml}</div>
                                    </div>
                                </div>
                            `);
                        }
                    });
                }
            }
        }, 100);
    } else {
        if (window.KoshkNav && window.KoshkNav.buildUrl) {
            window.location.href = window.KoshkNav.buildUrl('home', { category: categoryName });
        } else {
            window.location.href = 'index.html?category=' + encodeURIComponent(categoryName);
        }
    }
};

// Show Page Function (Dynamic Page Loading)
window.showPage = function(pageName) {
    const mainContainer = document.querySelector('main .full-width-container');
    
    // إذا كنت في صفحة فرعية (مش index.html)، وجه المتجر بالكامل لـ index.html مع إضافة الـ query parameter المطلوبة
    if (!mainContainer && !window.location.pathname.includes('index.html') && window.location.pathname !== '/' && window.location.pathname !== '') {
        window.location.href = 'index.html?page=' + pageName;
        return;
    }
    if (!mainContainer) return;
    
    // Store current page
    localStorage.setItem('currentPage', pageName);
    
    // تعديل المنطق لمنع ريلود الصفحة وتفعيل الشاشات الحركية مباشرة بدلاً من إعادة التوجيه الخارجي
    if (window.showPageCustomLive) {
        window.showPageCustomLive(pageName);
        
        // شحن كاش الصفحات فور التبديل التفاعلي
        if (pageName === 'cart') setTimeout(() => { if(window.loadCustomerCartLive) window.loadCustomerCartLive(); }, 50);
        if (pageName === 'wishlist') setTimeout(() => { if(window.loadCustomerWishlistLive) window.loadCustomerWishlistLive(); }, 50);
    } else {
        if (window.KoshkNav && window.KoshkNav.buildUrl) {
            let isNewTab = true;
            if (pageName === 'cart' || pageName === 'checkout' || pageName === 'home' || pageName === 'feed') {
                isNewTab = false;
            }
            if (isNewTab) {
                window.open(window.KoshkNav.buildUrl(pageName, {}), '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = window.KoshkNav.buildUrl(pageName, {});
            }
        } else {
            window.location.href = 'index.html?page=' + pageName;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initSlider();
    const mainViewport = document.querySelector('main .full-width-container');
    if (mainViewport) {
        window.homePageHTML = mainViewport.innerHTML;
    }

    // Check for URL parameters on load or decrypted payload
    let page = null;
    let category = null;

    if (window.KoshkNav && window.KoshkNav.getCurrentPayload) {
        const payload = window.KoshkNav.getCurrentPayload();
        if (payload) {
            page = payload.t || payload.page;
            category = payload.category;
        }
    }

    if (!page || !category) {
        const urlParams = new URLSearchParams(window.location.search);
        category = category || urlParams.get('category');
        page = page || urlParams.get('page');
    }

    if (category) {
        // Apply category filter
        localStorage.setItem('currentCategoryFilter', category);
        // Trigger filter function if products are loaded
        if (window.loadProductsByCategory) {
            window.loadProductsByCategory(category);
        }
    }

    if (page) {
        // Load dynamic page
        loadDynamicPage(page);
    }

    // Load hero cards images from Firebase
    loadHeroCardsFromFirebase();

    // Load slider images from Firebase
    loadSliderFromFirebase();

    // ==========================================
    // منظومة اعتراض الروابط الذكية (Global Catch-All Interceptor)
    // تضمن عمل كل اللينكات والفوتر بكفاءة تامة من أي مكان
    // ==========================================
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href') || '';
        const text = link.innerText.trim();

        // فحص وجهة الرابط بناءً على النص أو الـ href
        if (href.includes("showPage('home')") || text === "الصفحة الرئيسية" || text === "الرئيسية") {
            e.preventDefault(); e.stopPropagation(); window.showPage('home');
        } else if (href.includes("showPage('about')") || text === "من نحن") {
            e.preventDefault(); e.stopPropagation(); window.showPage('about');
        } else if (href.includes("showPage('shipping-policy')") || text.includes("سياسة الشحن")) {
            e.preventDefault(); e.stopPropagation(); window.showPage('shipping-policy');
        } else if (href.includes("showPage('privacy')") || text === "سياسة الخصوصية") {
            e.preventDefault(); e.stopPropagation(); window.showPage('privacy');
        } else if (href.includes("showPage('terms')") || text === "الشروط والأحكام") {
            e.preventDefault(); e.stopPropagation(); window.showPage('terms');
        } else if (href.includes("showPage('contact')") || text === "إتصل بنا") {
            e.preventDefault(); e.stopPropagation(); window.showPage('contact');
        } else if (href.includes("showPage('wishlist')") || text === "المفضلة") {
            e.preventDefault(); e.stopPropagation(); window.showPage('wishlist');
        } else if (href.includes("showPage('cart')") || text.includes("عربة التسوق") || text === "العربة") {
            e.preventDefault(); e.stopPropagation(); window.showPage('cart');
        } else if (href.includes("showPage('track')") || text === "تتبع طلباتك" || text === "طلباتي") {
            e.preventDefault(); e.stopPropagation(); window.showPage('track');
        } else if (href.includes("auth.html") || text.includes("تسجيل الدخول") || link.dataset.footerAuth === "true") {
            e.preventDefault(); e.stopPropagation(); window.showPage('auth');
        }
    }, true); // تفعيل الـ Capturing Mode لضمان الأولوية القصوى للاعتراض

    // مزامنة نصوص روابط تسجيل الدخول والحساب في الفوتر مع الهيدر لايف
    setInterval(() => {
        const navText = document.getElementById('user-nav-text');
        if (navText) {
            const currentStatusText = navText.innerText.trim();
            document.querySelectorAll('footer a, .mobile-bottom-nav a').forEach(el => {
                const text = el.innerText.trim();
                if (text.includes("تسجيل الدخول / التسجيل") || el.dataset.footerAuth === "true" || text === window.lastFooterAuthValue) {
                    el.dataset.footerAuth = "true";
                    if (currentStatusText && currentStatusText !== "حسابي" && currentStatusText !== "") {
                        el.innerText = currentStatusText;
                    } else {
                        el.innerText = "تسجيل الدخول / التسجيل";
                    }
                    window.lastFooterAuthValue = el.innerText;
                }
            });
        }
    }, 300);
});

// Load hero cards images from Firebase
async function loadHeroCardsFromFirebase() {
    try {
        if (window.FirebaseData && window.FirebaseData.getHeroCardsImages) {
            const images = await window.FirebaseData.getHeroCardsImages();
            if (images && images.length > 0) {
                const heroCarouselTrack = document.getElementById('heroCarouselTrack');
                if (heroCarouselTrack) {
                    heroCarouselTrack.innerHTML = images.map((image, index) => `
                        <div class="hero-carousel-card" data-index="${index}">
                            <img src="${image}" alt="Hero Card ${index + 1}">
                        </div>
                    `).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error loading hero cards from Firebase:', error);
    }
}

// Load slider images from Firebase
async function loadSliderFromFirebase() {
    try {
        if (window.FirebaseData && window.FirebaseData.getSliderImages) {
            const images = await window.FirebaseData.getSliderImages();
            if (images && images.length > 0) {
                const sliderContainer = document.querySelector('.hero-slider-container');
                if (sliderContainer) {
                    const sliderTrack = sliderContainer.querySelector('.slider-track');
                    if (sliderTrack) {
                        sliderTrack.innerHTML = images.map((image, index) => `
                            <div class="slider-slide" data-index="${index}">
                                <img src="${image}" alt="Slider ${index + 1}">
                            </div>
                        `).join('');
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading slider from Firebase:', error);
    }
}

// Load Dynamic Page Content
function loadDynamicPage(pageName) {
    const mainContainer = document.querySelector('main .full-width-container');
    if (!mainContainer) return;
    
    // Page content templates
    const pageTemplates = {
        'track': `
            <div class="page-container">
                <div class="page-header">
                    <h1><i class="fas fa-truck"></i> تتبع الطلبات</h1>
                </div>
                <div class="track-order-container">
                    <div class="track-form">
                        <input type="text" id="trackOrderId" placeholder="أدخل رقم الطلب">
                        <button onclick="trackOrder()">تتبع</button>
                    </div>
                    <div id="trackResult" class="track-result"></div>
                </div>
            </div>
        `,
        'about': `
            <div class="page-container">
                <div class="page-header">
                    <h1><i class="fas fa-info-circle"></i> من نحن</h1>
                </div>
                <div class="about-content">
                    <p>Online Koshk هو متجر إلكتروني متكامل يقدم أفضل المنتجات بأسعار تنافسية.</p>
                </div>
            </div>
        `,
        'contact': `
            <div class="page-container">
                <div class="page-header">
                    <h1><i class="fas fa-envelope"></i> اتصل بنا</h1>
                </div>
                <div class="contact-form">
                    <form onsubmit="submitContactForm(event)">
                        <input type="text" placeholder="الاسم" required>
                        <input type="email" placeholder="البريد الإلكتروني" required>
                        <textarea placeholder="الرسالة" required></textarea>
                        <button type="submit">إرسال</button>
                    </form>
                </div>
            </div>
        `,
        'privacy': `
            <div class="page-container">
                <div class="page-header">
                    <h1><i class="fas fa-shield-alt"></i> سياسة الخصوصية</h1>
                </div>
                <div class="privacy-content">
                    <p>نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.</p>
                </div>
            </div>
        `,
        'terms': `
            <div class="page-container">
                <div class="page-header">
                    <h1><i class="fas fa-file-contract"></i> الشروط والأحكام</h1>
                </div>
                <div class="terms-content">
                    <p>استخدامك لهذا الموقع يعني موافقتك على الشروط والأحكام التالية.</p>
                </div>
            </div>
        `,
        'shipping-policy': `
            <div class="page-container">
                <div class="page-header">
                    <h1><i class="fas fa-shipping-fast"></i> سياسة الشحن والاسترجاع</h1>
                </div>
                <div class="shipping-content">
                    <p>نقدم شحن سريع ومجاني للطلبات فوق 500 ج.م.</p>
                </div>
            </div>
        `
    };
    
    if (pageTemplates[pageName]) {
        mainContainer.innerHTML = pageTemplates[pageName];
    } else if (pageName === 'cart' || pageName === 'basket') {
        loadCartPage();
    } else if (pageName === 'wishlist') {
        loadWishlistPage();
    } else if (pageName === 'checkout') {
        loadCheckoutPage();
    } else if (pageName === 'product') {
        loadProductPage();
    } else if (pageName === 'register') {
        loadRegisterPage();
    }
}

// Load Cart Page Dynamically
function loadCartPage() {
    const mainContainer = document.querySelector('main .full-width-container');
    if (!mainContainer) return;

    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];

    if (cartItems.length === 0) {
        mainContainer.innerHTML = `
            <div class="cart-page-container">
                <div class="cart-header">
                    <h1><i class="fas fa-shopping-basket"></i> عربة التسوق</h1>
                </div>
                <div class="empty-cart">
                    <div class="empty-cart-icon">
                        <i class="fas fa-shopping-basket"></i>
                    </div>
                    <h3>عربة التسوق فارغة</h3>
                    <p>لم تقم بإضافة أي منتجات إلى عربة التسوق بعد.</p>
                    <button class="continue-shopping-btn" onclick="window.showPage('home')">
                        <i class="fas fa-arrow-left"></i> متابعة التسوق
                    </button>
                </div>
            </div>
        `;
    } else {
        let cartItemsHTML = cartItems.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.image || 'https://via.placeholder.com/100'}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p class="cart-item-price">${item.price?.toLocaleString() || 0} ج.م</p>
                </div>
                <div class="cart-item-quantity">
                    <button onclick="window.updateCartQuantity('${item.id}', ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="window.updateCartQuantity('${item.id}', ${item.quantity + 1})">+</button>
                </div>
                <div class="cart-item-total">
                    <p>${(item.price * item.quantity)?.toLocaleString() || 0} ج.م</p>
                </div>
                <div class="cart-item-remove">
                    <button onclick="window.removeCartItem('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        mainContainer.innerHTML = `
            <div class="cart-page-container">
                <div class="cart-header">
                    <h1><i class="fas fa-shopping-basket"></i> عربة التسوق</h1>
                </div>
                <div class="cart-content">
                    <div class="cart-items">
                        ${cartItemsHTML}
                    </div>
                    <div class="cart-summary">
                        <h3>ملخص الطلب</h3>
                        <div class="summary-row">
                            <span>المجموع الفرعي</span>
                            <span>${total.toLocaleString()} ج.م</span>
                        </div>
                        <div class="summary-row">
                            <span>الشحن</span>
                            <span>مجاني</span>
                        </div>
                        <div class="summary-row total">
                            <span>الإجمالي</span>
                            <span>${total.toLocaleString()} ج.م</span>
                        </div>
                        <button class="checkout-btn" onclick="window.showPage('checkout')">
                            <i class="fas fa-lock"></i> إتمام الشراء
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

// Update cart quantity
window.updateCartQuantity = function(productId, newQuantity) {
    if (newQuantity < 1) {
        window.removeCartItem(productId);
        return;
    }

    let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    const item = cart.find(item => item.id === productId);

    if (item) {
        item.quantity = newQuantity;
        localStorage.setItem('cartItems', JSON.stringify(cart));
        loadCartPage();
        updateCartCount();
    }
};

// Remove cart item
window.removeCartItem = function(productId) {
    let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cartItems', JSON.stringify(cart));
    loadCartPage();
    updateCartCount();
};

// Update cart count
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const cartCountElements = document.querySelectorAll('.cart-count, .mobile-cart-count');
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
    });
}

// Add product to cart from product cards
window.triggerAddToCartStepLive = function(productId, productName, price, image, category) {
    const product = {
        id: productId,
        name: productName,
        price: parseFloat(price),
        image: image,
        category: category
    };

    let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }

    localStorage.setItem('cartItems', JSON.stringify(cart));
    updateCartCount();

    if (window.KoshkToast) {
        KoshkToast.success('تمت إضافة المنتج إلى العربة');
    } else {
        alert('تمت إضافة المنتج إلى العربة');
    }
};

// Show checkout page directly
window.showCheckoutPageDirectly = function(productId) {
    if (productId && window.showCheckoutPageDirectlyCustom) {
        window.showCheckoutPageDirectlyCustom(productId);
    } else {
        window.showPage('checkout');
    }
};

// Toggle product wishlist
window.toggleProductWishlistLive = function(event, productId) {
    event.stopPropagation();
    
    let wishlist = JSON.parse(localStorage.getItem('wishlistItems')) || [];
    const index = wishlist.findIndex(item => item.productId === productId);

    if (index > -1) {
        wishlist.splice(index, 1);
        if (window.KoshkToast) {
            KoshkToast.success('تمت إزالة المنتج من المفضلة');
        }
    } else {
        wishlist.push({ productId: productId });
        if (window.KoshkToast) {
            KoshkToast.success('تمت إضافة المنتج إلى المفضلة');
        }
    }

    localStorage.setItem('wishlistItems', JSON.stringify(wishlist));
};

// View product details
window.viewProductDetailsLive = function(productId) {
    if (window.KoshkNav && window.KoshkNav.createProductLink) {
        // فتح تفاصيل المنتج لايف داخل الشاشة الحركية
        const targetProd = window.currentProductsListInMemory ? window.currentProductsListInMemory.find(p => p.id === productId) : null;
        if (targetProd && window.showPageCustomLive) {
            window.showPageCustomLive('product');
        } else {
            window.open(window.KoshkNav.createProductLink(productId), '_blank');
        }
    } else {
        if (window.showPageCustomLive) {
            window.showPageCustomLive('product');
        } else {
            window.location.href = `index.html?page=product&product=${productId}`;
        }
    }
};

// Load Wishlist Page Dynamically
function loadWishlistPage() {
    const mainContainer = document.querySelector('main .full-width-container');
    if (!mainContainer) return;
    
    const wishlistItems = JSON.parse(localStorage.getItem('wishlistItems')) || [];
    
    if (wishlistItems.length === 0) {
        mainContainer.innerHTML = `
            <div class="wishlist-page-container">
                <div class="wishlist-header">
                    <h1><i class="fas fa-heart"></i> المفضلة</h1>
                </div>
                <div class="empty-wishlist">
                    <div class="empty-wishlist-icon">
                        <i class="fas fa-heart"></i>
                    </div>
                    <h3>قائمة المفضلة فارغة</h3>
                    <p>لم تقم بإضافة أي منتجات إلى المفضلة بعد.</p>
                    <button class="continue-shopping-btn" onclick="window.showPage('home')">
                        <i class="fas fa-arrow-left"></i> متابعة التسوق
                    </button>
                </div>
            </div>
        `;
    } else {
        let wishlistItemsHTML = wishlistItems.map(item => `
            <div class="wishlist-item">
                <div class="wishlist-item-image">
                    <img src="${item.image || 'https://via.placeholder.com/100'}" alt="${item.name}">
                </div>
                <div class="wishlist-item-details">
                    <h4>${item.name}</h4>
                    <p class="wishlist-item-price">${item.price?.toLocaleString() || 0} ج.م</p>
                </div>
                <div class="wishlist-item-actions">
                    <button class="add-to-cart-btn" onclick="window.FirebaseData?.addToCart({id: '${item.id}', name: '${item.name}', price: ${item.price}, image: '${item.image}'})">
                        <i class="fas fa-shopping-basket"></i> إضافة للعربة
                    </button>
                    <button class="remove-btn" onclick="window.FirebaseData?.removeFromWishlist('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        mainContainer.innerHTML = `
            <div class="wishlist-page-container">
                <div class="wishlist-header">
                    <h1><i class="fas fa-heart"></i> المفضلة</h1>
                </div>
                <div class="wishlist-items">
                    ${wishlistItemsHTML}
                </div>
            </div>
        `;
    }
}

// Load Checkout Page Dynamically
function loadCheckoutPage() {
    const mainContainer = document.querySelector('main .full-width-container');
    if (!mainContainer) return;
    
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    
    if (cartItems.length === 0) {
        mainContainer.innerHTML = `
            <div class="checkout-page-container">
                <div class="checkout-header">
                    <h1><i class="fas fa-credit-card"></i> إتمام الشراء</h1>
                </div>
                <div class="empty-checkout">
                    <div class="empty-checkout-icon">
                        <i class="fas fa-shopping-basket"></i>
                    </div>
                    <h3>لا توجد منتجات في العربة</h3>
                    <p>يرجى إضافة منتجات إلى عربة التسوق أولاً.</p>
                    <button class="continue-shopping-btn" onclick="window.showPage('home')">
                        <i class="fas fa-arrow-left"></i> متابعة التسوق
                    </button>
                </div>
            </div>
        `;
    } else {
        let orderItemsHTML = cartItems.map(item => `
            <div class="order-item">
                <div class="order-item-image">
                    <img src="${item.image || 'https://via.placeholder.com/100'}" alt="${item.name}">
                </div>
                <div class="order-item-details">
                    <div class="order-item-name">${item.name}</div>
                    <div class="order-item-quantity">الكمية: ${item.quantity}</div>
                </div>
                <div class="order-item-price">${(item.price * item.quantity)?.toLocaleString() || 0} ج.م</div>
            </div>
        `).join('');
        
        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        mainContainer.innerHTML = `
            <div class="checkout-page-container">
                <div class="checkout-header">
                    <h1><i class="fas fa-credit-card"></i> إتمام الشراء</h1>
                    <button class="add-product-btn" onclick="window.openAddProductModal()">
                        <i class="fas fa-plus"></i> أضف منتج جديد
                    </button>
                </div>
                <div class="checkout-content">
                    <div class="checkout-form">
                        <div class="form-card">
                            <h3><i class="fas fa-user"></i> معلومات الشحن</h3>
                            <div class="form-group">
                                <label>الاسم الكامل</label>
                                <input type="text" id="checkoutName" placeholder="أدخل اسمك الكامل" required>
                            </div>
                            <div class="form-group">
                                <label>رقم الهاتف</label>
                                <input type="tel" id="checkoutPhone" placeholder="أدخل رقم هاتفك" required>
                            </div>
                            <div class="form-group">
                                <label>المدينة</label>
                                <input type="text" id="checkoutCity" placeholder="أدخل مدينتك" required>
                            </div>
                            <div class="form-group">
                                <label>العنوان بالتفصيل</label>
                                <input type="text" id="checkoutAddress" placeholder="أدخل عنوانك بالتفصيل" required>
                            </div>
                        </div>
                        <div class="form-card">
                            <h3><i class="fas fa-credit-card"></i> طريقة الدفع</h3>
                            <div class="payment-methods">
                                <div class="payment-method" onclick="window.selectPaymentMethod(this, 'cod')">
                                    <i class="fas fa-money-bill-wave"></i>
                                    <h4>الدفع عند الاستلام</h4>
                                </div>
                                <div class="payment-method" onclick="window.selectPaymentMethod(this, 'card')">
                                    <i class="fas fa-credit-card"></i>
                                    <h4>بطاقة ائتمان</h4>
                                </div>
                                <div class="payment-method" onclick="window.selectPaymentMethod(this, 'wallet')">
                                    <i class="fas fa-wallet"></i>
                                    <h4>محفظة إلكترونية</h4>
                                </div>
                            </div>
                        </div>
                        <div class="form-card">
                            <h3><i class="fas fa-sticky-note"></i> ملاحظات الطلب</h3>
                            <div class="form-group">
                                <textarea id="checkoutNotes" rows="3" placeholder="أضف أي ملاحظات خاصة بطلبك (اختياري)"></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="order-summary">
                        <h3>ملخص الطلب</h3>
                        <div class="order-items">
                            ${orderItemsHTML}
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">المجموع الفرعي</span>
                            <span class="summary-value">${total.toLocaleString()} ج.م</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">الشحن</span>
                            <span class="summary-value">مجاني</span>
                        </div>
                        <div class="summary-row summary-total">
                            <span class="summary-label">الإجمالي</span>
                            <span class="summary-value">${total.toLocaleString()} ج.م</span>
                        </div>
                        <button class="place-order-btn" onclick="window.placeOrder()">
                            <i class="fas fa-lock"></i> تأكيد الطلب
                        </button>
                        <div class="secure-checkout">
                            <i class="fas fa-shield-alt"></i>
                            <span>دفع آمن ومشفر 100%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Select payment method
window.selectPaymentMethod = function(element, method) {
    document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    window.selectedPaymentMethod = method;
};

// Place order
window.placeOrder = async function() {
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    
    if (cartItems.length === 0) {
        alert('عربة التسوق فارغة');
        return;
    }
    
    const name = document.getElementById('checkoutName').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim();
    const city = document.getElementById('checkoutCity').value.trim();
    const address = document.getElementById('checkoutAddress').value.trim();
    const notes = document.getElementById('checkoutNotes').value.trim();
    
    if (!name || !phone || !city || !address) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }
    
    if (!window.selectedPaymentMethod) {
        alert('يرجى اختيار طريقة الدفع');
        return;
    }
    
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const order = {
        id: Date.now().toString(),
        customerName: name,
        customerPhone: phone,
        customerCity: city,
        customerAddress: address,
        customerNotes: notes,
        items: cartItems,
        totalAmount: total,
        paymentMethod: window.selectedPaymentMethod,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    try {
        if (window.FirebaseData && window.FirebaseData.createOrder) {
            const docRef = await window.FirebaseData.createOrder(order);
            localStorage.removeItem('cartItems');
            updateCartCount();
            
            // تحويل المستخدم حركياً لشاشة الفاتورة الاحترافية الموحدة (Thank You Page)
            if (window.renderKoshkSuccessReceiptViewLive) {
                window.renderKoshkSuccessReceiptViewLive({
                    orderNumber: docRef.id || order.id,
                    clientName: name,
                    clientPhone: phone,
                    province: city,
                    city: city,
                    address: address,
                    paymentGateway: window.selectedPaymentMethod === 'cod' ? 'cod' : 'online',
                    total: total
                });
            } else {
                alert('تم إرسال طلبك بنجاح!');
                window.location.href = 'index.html';
            }
        } else {
            // Fallback to localStorage
            let orders = JSON.parse(localStorage.getItem('orders')) || [];
            orders.push(order);
            localStorage.setItem('orders', JSON.stringify(orders));
            localStorage.removeItem('cartItems');
            updateCartCount();
            
            if (window.renderKoshkSuccessReceiptViewLive) {
                window.renderKoshkSuccessReceiptViewLive({
                    orderNumber: order.id,
                    clientName: name,
                    clientPhone: phone,
                    province: city,
                    city: city,
                    address: address,
                    paymentGateway: window.selectedPaymentMethod === 'cod' ? 'cod' : 'online',
                    total: total
                });
            } else {
                alert('تم إرسال طلبك بنجاح!');
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error('Error placing order:', error);
        alert('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
    }
};

// Load Product Page Dynamically
function loadProductPage() {
    const mainContainer = document.querySelector('main .full-width-container');
    if (!mainContainer) return;
    
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product');
    
    if (!productId) {
        mainContainer.innerHTML = `
            <div class="product-page-container">
                <div class="product-header">
                    <h1>المنتج غير موجود</h1>
                </div>
                <p>يرجى اختيار منتج صحيح.</p>
                <button onclick="window.location.href='index.html'">العودة للرئيسية</button>
            </div>
        `;
        return;
    }
    
    // Load product data (placeholder - will be connected to Firebase)
    mainContainer.innerHTML = `
        <div class="product-page-container">
            <div class="product-header">
                <h1>تفاصيل المنتج</h1>
            </div>
            <div class="product-content">
                <p>جاري تحميل بيانات المنتج...</p>
            </div>
        </div>
    `;
    
    // This will be connected to Firebase to load actual product data
    if (window.FirebaseData && window.FirebaseData.getProductById) {
        window.FirebaseData.getProductById(productId).then(product => {
            if (product) {
                if (window.viewProductDetailsLive) {
                    window.viewProductDetailsLive(productId);
                } else {
                    renderProductDetails(product);
                }
            } else {
                mainContainer.innerHTML = `
                    <div class="product-page-container">
                        <div class="product-header">
                            <h1>المنتج غير موجود</h1>
                        </div>
                        <p>يرجى اختيار منتج صحيح.</p>
                        <button onclick="window.location.href='index.html'">العودة للرئيسية</button>
                    </div>
                `;
            }
        });
    }
}

// Load Register Page Dynamically
function loadRegisterPage() {
    const mainContainer = document.querySelector('main .full-width-container');
    if (!mainContainer) return;
    
    mainContainer.innerHTML = `
        <div class="register-page-container">
            <div class="register-card">
                <div class="register-header">
                    <h1><i class="fas fa-user-plus"></i> إنشاء حساب جديد</h1>
                    <p>انضم إلينا واستمتع بتجربة تسوق فريدة</p>
                </div>
                <form onsubmit="window.handleRegister(event)">
                    <div class="form-group">
                        <label>الاسم بالكامل</label>
                        <input type="text" id="regName" placeholder="أدخل اسمك الكامل" required>
                    </div>
                    <div class="form-group">
                        <label>رقم الهاتف</label>
                        <input type="tel" id="regPhone" placeholder="مثال: 01500812929" required>
                    </div>
                    <div class="form-group">
                        <label>البريد الإلكتروني (يجب أن يكون من نطاق موثق)</label>
                        <input type="email" id="regEmail" placeholder="example@gmail.com" required>
                        <small>النطاقات المسموحة: gmail.com, yahoo.com, outlook.com, hotmail.com</small>
                    </div>
                    <div class="form-group">
                        <label>المدينة / المحافظة</label>
                        <select id="regCity" required>
                            <option value="" disabled selected>اختر المحافظة للتوصيل</option>
                            <option value="القاهرة">القاهرة</option>
                            <option value="القاهرة الجديدة">القاهرة الجديدة</option>
                            <option value="الجيزة">الجيزة</option>
                            <option value="الأسكندرية">الأسكندرية</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>كلمة المرور</label>
                        <input type="password" id="regPassword" placeholder="كلمة مرور قوية (على الأقل 6 أحرف)" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>تأكيد كلمة المرور</label>
                        <input type="password" id="regConfirmPassword" placeholder="أعد إدخال كلمة المرور" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="regTerms" required>
                            <span>أوافق على <a href="index.html?page=terms">الشروط والأحكام</a> و <a href="index.html?page=privacy">سياسة الخصوصية</a></span>
                        </label>
                    </div>
                    <button type="submit" class="register-btn">
                        <i class="fas fa-user-plus"></i> إنشاء حساب جديد
                    </button>
                    <div class="register-footer">
                        <p>لديك حساب بالفعل؟ <a href="auth.html">تسجيل الدخول</a></p>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// Select Payment Method
window.selectPaymentMethod = function(element) {
    document.querySelectorAll('.payment-method').forEach(method => {
        method.classList.remove('selected');
    });
    element.classList.add('selected');
};

// Track Order Function
window.trackOrder = async function() {
    const orderId = document.getElementById('trackOrderId').value.trim();
    if (!orderId) {
        if (window.KoshkToast) {
            KoshkToast.error('يرجى إدخال رقم الطلب');
        }
        return;
    }
    
    const resultDiv = document.getElementById('trackResult');
    resultDiv.innerHTML = '<p>جاري البحث عن الطلب...</p>';
    
    setTimeout(() => {
        resultDiv.innerHTML = `
            <div class="order-status">
                <h3>رقم الطلب: ${orderId}</h3>
                <p>الحالة: قيد المعالجة</p>
                <p>آخر تحديث: ${new Date().toLocaleDateString('ar-EG')}</p>
            </div>
        `;
    }, 1000);
};

// Submit Contact Form
window.submitContactForm = function(event) {
    event.preventDefault();
    if (window.KoshkToast) {
        KoshkToast.success('تم إرسال رسالتك بنجاح! سنتوصل معك قريباً');
    }
};

function updateLocation(provinceName) {
    const loc = document.getElementById('current-location');
    const locMob = document.getElementById('current-location-mobile');
    if (loc) loc.innerText = provinceName;
    if (locMob) locMob.innerText = provinceName;
}

function toggleSidebar() {
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    }
}

function toggleLocationMobile() {
    const list = document.getElementById('mobileLocationList');
    if (list) list.classList.toggle('open');
}

function updateLocationMobile(provinceName) {
    const loc = document.getElementById('current-location');
    const locMob = document.getElementById('current-location-mobile');
    if (loc) loc.innerText = provinceName;
    if (locMob) locMob.innerText = provinceName;
    toggleLocationMobile();
    toggleSidebar();
}

function scrollProducts(containerId, direction) {
    const container = document.getElementById(containerId);
    if (!container) return;
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
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (tabs[0]) tabs[0].classList.add('active');
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (tabs[1]) tabs[1].classList.add('active');
    }
}

function showPage(pageName) {
    const mainContainer = document.querySelector('main .full-width-container');
    if (!mainContainer) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if(sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
    }

    const navItems = document.querySelectorAll('.mobile-nav-item');
    navItems.forEach(item => item.classList.remove('active-bottom-item'));
    
    if (pageName === 'home' || pageName === 'feed') {
        mainContainer.innerHTML = window.homePageHTML || mainContainer.innerHTML;
        if (navItems[2]) navItems[2].classList.add('active-bottom-item');
        initSlider();
        return;
    }

    let pageHTML = '';

    if (pageName === 'auth') {
        window.location.href = 'auth.html';
        return;
    } 
    else if (pageName === 'track') {
        if (navItems[3]) navItems[3].classList.add('active-bottom-item');
        pageHTML = `
            <div class="container">
                <div class="page-card">
                    <h2 class="page-title"><i class="fas fa-truck"></i> تتبع حالة طلبك</h2>
                    <p style="margin-bottom: 20px; color:#64748b;">أدخل رقم الطلب الطلب المرسل إليك في رسالة نصية لمتابعة خط سير الشحنة.</p>
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
        if (navItems[1]) navItems[1].classList.add('active-bottom-item');
        pageHTML = `
            <div class="container">
                <div class="page-card">
                    <h2 class="page-title"><i class="far fa-heart"></i> المنتجات المفضلة</h2>
                    <p style="color:#64748b; text-align:center; padding:40px 0;">قائمة المفضلة فارغة حالياً. اضغط على علامة القلب in أي منتج لحفظه هنا.</p>
                </div>
            </div>
        `;
    }
    else if (pageName === 'cart') {
        if (navItems[4]) navItems[4].classList.add('active-bottom-item');
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

    // الحقن المباشر في المنظومة التفاعلية لايف
    window.showPageCustomLive = function(targetPage) {
        if (targetPage === 'home' || targetPage === 'feed') {
            const wrap1 = document.getElementById('amazonStyleCategoriesWrapper');
            const wrap2 = document.getElementById('koshkMainHeroSliderContainerBlock');
            if (wrap1) wrap1.style.display = 'block';
            if (wrap2) wrap2.style.display = 'block';
        } else {
            const wrap1 = document.getElementById('amazonStyleCategoriesWrapper');
            const wrap2 = document.getElementById('koshkMainHeroSliderContainerBlock');
            if (wrap1) wrap1.style.display = 'none';
            if (wrap2) wrap2.style.display = 'none';
        }
        showPage(targetPage);
    };

    mainContainer.innerHTML = pageHTML;
}