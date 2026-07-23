/* ==========================================================================
   أونلاين كشك - Dynamic Product Logic & Direct ID Fetcher System
   ========================================================================== */

let currentProductImages = [];
let currentImageIndex = 0;

document.addEventListener('DOMContentLoaded', async function () {
    // 🌟 تجميل شكل الـ URL وإخفاء امتداد .html برمجياً بداخل شريط العنوان
    cleanUrlExtension();

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id') || urlParams.get('p') || urlParams.get('product');

    if (!productId) {
        window.location.href = 'index.html';
        return;
    }

    const cleanId = sanitizeInput(productId);

    let client = window.supabaseClient;
    if (!client && window.supabase && typeof SUPABASE_URL !== 'undefined') {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    if (client) {
        await loadProductDetails(client, cleanId);
    }

    initImageZoomAndLightbox();
});

// دالة إخفاء امتداد .html من شريط العنوان بسلاسة دون أخطاء Live Server
function cleanUrlExtension() {
    try {
        if (window.location.pathname.endsWith('.html')) {
            const cleanPath = window.location.pathname.replace('.html', '');
            window.history.replaceState(null, '', cleanPath + window.location.search);
        }
    } catch(e) {}
}

function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>'"]/g, '').trim();
}

async function loadProductDetails(client, id) {
    try {
        let query = client.from('products').select('*');
        
        // جلب المنتج بالـ ID المباشر أو بالاسم
        if (id.length > 20 && id.includes('-')) {
            query = query.eq('id', id);
        } else {
            query = query.ilike('title', `%${id}%`);
        }

        const { data: productList, error } = await query;

        if (error) {
            console.error('Supabase Query Error:', error);
            throw error;
        }

        if (!productList || productList.length === 0) {
            throw new Error("المنتج غير موجود بجدول المنتجات");
        }

        const product = productList[0];

        const spinner = document.getElementById('productLoadingSpinner');
        const content = document.getElementById('productContentWrapper');
        if (spinner) spinner.classList.add('d-none');
        if (content) content.classList.remove('d-none');

        document.title = `${product.title} - أونلاين كشك`;
        if (document.getElementById('productTitleBreadcrumb')) document.getElementById('productTitleBreadcrumb').innerText = product.title;
        if (document.getElementById('productTitle')) document.getElementById('productTitle').innerText = product.title;
        if (document.getElementById('lightboxProductTitle')) document.getElementById('lightboxProductTitle').innerText = product.title;
        
        if (document.getElementById('productStoreBadge')) document.getElementById('productStoreBadge').innerText = product.store_name || 'أمازون';
        if (document.getElementById('productCategoryBadge')) document.getElementById('productCategoryBadge').innerText = product.category || 'عام';
        
        const brandBadge = document.getElementById('productBrandBadge');
        if (brandBadge) {
            if (product.brand && product.brand.trim() !== '') {
                brandBadge.innerText = product.brand;
                brandBadge.classList.remove('d-none');
            } else {
                brandBadge.classList.add('d-none');
            }
        }

        const stockBadge = document.getElementById('productStockBadge');
        if (stockBadge) {
            if (product.stock_status === 'out_of_stock') {
                stockBadge.innerText = 'نفدت الكمية';
                stockBadge.className = 'badge bg-danger-subtle text-danger px-3 py-1 rounded-pill fs-8';
            } else if (product.stock_status === 'limited') {
                stockBadge.innerText = 'قطع قليلة متبقية';
                stockBadge.className = 'badge bg-warning-subtle text-dark px-3 py-1 rounded-pill fs-8';
            } else {
                stockBadge.innerText = 'متوفر بالمخزن';
                stockBadge.className = 'badge bg-success-subtle text-success px-3 py-1 rounded-pill fs-8';
            }
        }
        
        if (document.getElementById('productDiscountPrice')) document.getElementById('productDiscountPrice').innerText = `${product.discount_price || 0} ج.م`;
        if (document.getElementById('productOriginalPrice')) document.getElementById('productOriginalPrice').innerText = `${product.original_price || 0} ج.م`;
        if (document.getElementById('productCashback')) document.getElementById('productCashback').innerText = `${product.commission_amount || 0} ج.م`;
        if (document.getElementById('productDiscountBadge')) document.getElementById('productDiscountBadge').innerText = `-${product.discount_percentage || 0}%`;

        // كود الخصم الحصري
        const couponBox = document.getElementById('productCouponContainer');
        const couponCodeText = document.getElementById('productCouponCodeText');
        const copyCouponBtn = document.getElementById('copyProductCouponBtn');

        if (product.coupon_code && product.coupon_code.trim() !== '' && couponBox && couponCodeText) {
            couponCodeText.innerText = product.coupon_code.trim();
            couponBox.classList.remove('d-none');

            if (copyCouponBtn) {
                copyCouponBtn.onclick = function () {
                    navigator.clipboard.writeText(product.coupon_code.trim()).then(() => {
                        const originalHtml = copyCouponBtn.innerHTML;
                        copyCouponBtn.innerHTML = `<i class="bi bi-check-lg me-1"></i> تم النسخ!`;
                        copyCouponBtn.classList.replace('btn-purple-pill', 'btn-success');

                        if (typeof showToast === 'function') {
                            showToast(`تم نسخ الكوبون (${product.coupon_code}) بنجاح!`, 'success');
                        }

                        setTimeout(() => {
                            copyCouponBtn.innerHTML = originalHtml;
                            copyCouponBtn.classList.replace('btn-success', 'btn-purple-pill');
                        }, 2500);
                    });
                };
            }
        }

        // جدول المواصفات الفنية
        const specsContainer = document.getElementById('productSpecsContainer');
        const specsTableBody = document.querySelector('#productSpecsTable tbody');
        if (specsContainer && specsTableBody) {
            if (product.specs && product.specs.trim() !== '') {
                const lines = product.specs.split('\n').filter(l => l.trim() !== '');
                if (lines.length > 0) {
                    specsTableBody.innerHTML = lines.map(line => {
                        const parts = line.split(':');
                        const key = parts[0] ? parts[0].trim() : '';
                        const val = parts.slice(1).join(':').trim();
                        return `
                            <tr>
                                <td class="fw-bold text-dark border-bottom" style="width: 35%;">${key}</td>
                                <td class="text-secondary border-bottom">${val || '-'}</td>
                            </tr>
                        `;
                    }).join('');
                    specsContainer.classList.remove('d-none');
                }
            } else {
                specsContainer.classList.add('d-none');
            }
        }

        // الوصف
        const descEl = document.getElementById('productDescription');
        const toggleDescBtn = document.getElementById('toggleDescBtn');

        if (descEl) {
            const descriptionText = product.description || "لا يوجد وصف إضافي متوفر لهذا المنتج حالياً.";
            descEl.innerText = descriptionText;

            if (descriptionText.length > 150 && toggleDescBtn) {
                toggleDescBtn.classList.remove('d-none');
                let isExpanded = false;

                toggleDescBtn.onclick = function () {
                    isExpanded = !isExpanded;
                    if (isExpanded) {
                        descEl.style.maxHeight = 'none';
                        toggleDescBtn.innerHTML = 'عرض أقل <i class="bi bi-chevron-up ms-1"></i>';
                    } else {
                        descEl.style.maxHeight = '180px';
                        toggleDescBtn.innerHTML = 'عرض المزيد <i class="bi bi-chevron-down ms-1"></i>';
                    }
                };
            }
        }

        // 🔒 حماية زر "الشراء الآن" وحصره برابط الأفلييت
        const buyBtn = document.getElementById('buyNowBtn');
        if (buyBtn) {
            buyBtn.onclick = async function (e) {
                e.preventDefault();
                
                const { data: { user } } = await client.auth.getUser();

                if (!user) {
                    const modalEl = document.getElementById('affiliateAuthRequiredModal');
                    if (modalEl && typeof bootstrap !== 'undefined') {
                        const modal = new bootstrap.Modal(modalEl);
                        modal.show();
                    } else {
                        alert('يرجى تسجيل الدخول للحصول على الكاش باك وتوجيهك لصفحة العرض!');
                        window.location.href = 'login.html';
                    }
                } else {
                    if (product.affiliate_url) {
                        window.open(product.affiliate_url, '_blank');
                    } else {
                        alert('رابط الشراء المباشر غير متاح حالياً لهذا المنتج.');
                    }
                }
            };
        }

        const noticeStoreElement = document.getElementById('affiliateNoticeStoreName');
        if (noticeStoreElement) {
            noticeStoreElement.innerText = product.store_name || "المتجر الأصلي";
        }

        // المعرض
        currentProductImages = (product.images && product.images.length > 0) ? product.images : [product.image_url];
        const mainImg = document.getElementById('mainProductImg');
        if (mainImg && currentProductImages.length > 0) mainImg.src = currentProductImages[0];

        const thumbnailsWrapper = document.getElementById('thumbnailsWrapper');
        if (thumbnailsWrapper) {
            thumbnailsWrapper.innerHTML = currentProductImages.map((imgUrl, index) => `
                <img src="${imgUrl}" class="product-thumb-img ${index === 0 ? 'active' : ''}" onclick="switchMainImage(this, ${index})">
            `).join('');
        }

        renderLightboxModalThumbnails();

        await loadRelatedProducts(client, product.category, product.id);
        await loadTrendingProducts(client, product.id);

    } catch (err) {
        console.error("Product Load Error:", err.message || err);
        const spinner = document.getElementById('productLoadingSpinner');
        if (spinner) {
            spinner.innerHTML = `<div class="alert alert-danger rounded-4 py-4">عفواً، لم نتمكن من جلب بيانات هذا المنتج. <a href="index.html" class="fw-bold text-dark ms-2">العودة للرئيسية</a></div>`;
        }
    }
}

function switchMainImage(thumbElement, index) {
    document.querySelectorAll('.product-thumb-img').forEach(t => t.classList.remove('active'));
    if (thumbElement) thumbElement.classList.add('active');
    
    currentImageIndex = index;
    const mainImg = document.getElementById('mainProductImg');
    if (mainImg && currentProductImages[index]) {
        mainImg.src = currentProductImages[index];
    }
}

function renderLightboxModalThumbnails() {
    const thumbsContainer = document.getElementById('lightboxThumbsContainer');
    if (!thumbsContainer) return;

    thumbsContainer.innerHTML = currentProductImages.map((imgUrl, index) => `
        <img src="${imgUrl}" class="lightbox-modal-thumb-item ${index === currentImageIndex ? 'active' : ''}" onclick="switchLightboxImage(${index})">
    `).join('');
}

function switchLightboxImage(index) {
    currentImageIndex = index;
    const lightboxModalImg = document.getElementById('lightboxModalImg');
    if (lightboxModalImg && currentProductImages[index]) {
        lightboxModalImg.src = currentProductImages[index];
    }

    const items = document.querySelectorAll('.lightbox-modal-thumb-item');
    items.forEach((item, i) => {
        if (i === index) item.classList.add('active');
        else item.classList.remove('active');
    });
}

function initImageZoomAndLightbox() {
    const zoomBox = document.getElementById('zoomContainer');
    const zoomImg = document.getElementById('mainProductImg');
    const openLightboxBtn = document.getElementById('openLightboxBtn');
    const lightboxModalImg = document.getElementById('lightboxModalImg');

    if (zoomBox && zoomImg) {
        zoomBox.addEventListener('mousemove', function (e) {
            const rect = zoomBox.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            zoomImg.style.transformOrigin = `${x}% ${y}%`;
            zoomImg.style.transform = 'scale(1.8)';
        });

        zoomBox.addEventListener('mouseleave', function () {
            zoomImg.style.transform = 'scale(1)';
            zoomImg.style.transformOrigin = 'center center';
        });
    }

    if (openLightboxBtn && lightboxModalImg) {
        openLightboxBtn.addEventListener('click', function () {
            switchLightboxImage(currentImageIndex);
            const modalEl = document.getElementById('imageLightboxModal');
            if (modalEl && typeof bootstrap !== 'undefined') {
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            }
        });
    }

    const prevBtn = document.getElementById('prevLightboxImgBtn');
    const nextBtn = document.getElementById('nextLightboxImgBtn');

    if (prevBtn) {
        prevBtn.onclick = function() {
            if (currentImageIndex > 0) switchLightboxImage(currentImageIndex - 1);
            else switchLightboxImage(currentProductImages.length - 1);
        };
    }

    if (nextBtn) {
        nextBtn.onclick = function() {
            if (currentImageIndex < currentProductImages.length - 1) switchLightboxImage(currentImageIndex + 1);
            else switchLightboxImage(0);
        };
    }

    document.addEventListener('keydown', function(e) {
        const modalEl = document.getElementById('imageLightboxModal');
        if (modalEl && modalEl.classList.contains('show')) {
            if (e.key === 'ArrowLeft') {
                if (nextBtn) nextBtn.click();
            } else if (e.key === 'ArrowRight') {
                if (prevBtn) prevBtn.click();
            }
        }
    });

    let currentZoom = 1;
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');

    if (zoomInBtn && lightboxModalImg) {
        zoomInBtn.onclick = () => {
            currentZoom += 0.25;
            lightboxModalImg.style.transform = `scale(${currentZoom})`;
        };
    }

    if (zoomOutBtn && lightboxModalImg) {
        zoomOutBtn.onclick = () => {
            if (currentZoom > 0.5) {
                currentZoom -= 0.25;
                lightboxModalImg.style.transform = `scale(${currentZoom})`;
            }
        };
    }

    if (zoomResetBtn && lightboxModalImg) {
        zoomResetBtn.onclick = () => {
            currentZoom = 1;
            lightboxModalImg.style.transform = `scale(1)`;
        };
    }
}

async function loadRelatedProducts(client, category, currentProductId) {
    const grid = document.getElementById('relatedProductsGrid');
    if (!grid) return;

    try {
        const { data: products, error } = await client
            .from('products')
            .select('*')
            .eq('category', category)
            .neq('id', currentProductId)
            .limit(4);

        if (error || !products || products.length === 0) {
            grid.innerHTML = `<div class="col text-muted fs-8 py-3 w-100 text-center">لا توجد منتجات مشابهة متاحة حالياً.</div>`;
            return;
        }

        grid.innerHTML = products.map(prod => renderProductCardHTML(prod)).join('');

    } catch (err) {
        grid.innerHTML = `<div class="col text-muted fs-8 py-3 w-100 text-center">لا توجد منتجات مشابهة حالياً.</div>`;
    }
}

async function loadTrendingProducts(client, currentProductId) {
    const grid = document.getElementById('trendingProductsGrid');
    if (!grid) return;

    try {
        const { data: products, error } = await client
            .from('products')
            .select('*')
            .neq('id', currentProductId)
            .order('created_at', { ascending: false })
            .limit(4);

        if (error || !products || products.length === 0) {
            grid.innerHTML = `<div class="col text-muted fs-8 py-3 w-100 text-center">لا توجد منتجات رائجة حالياً.</div>`;
            return;
        }

        grid.innerHTML = products.map(prod => renderProductCardHTML(prod)).join('');

    } catch (err) {
        grid.innerHTML = `<div class="col text-muted fs-8 py-3 w-100 text-center">لا توجد منتجات رائجة حالياً.</div>`;
    }
}

function renderProductCardHTML(prod) {
    const productDetailUrl = `product.html?id=${prod.id}`;

    return `
        <div class="col">
            <div class="new-light-card p-3 rounded-4 text-center border-0 h-100 d-flex flex-column justify-content-between">
                <span class="card-discount-badge">-${prod.discount_percentage || 0}%</span>
                <div class="card-img-container mb-2 overflow-hidden rounded-3 bg-white p-2" style="height: 160px;">
                    <a href="${productDetailUrl}" class="d-block w-100 h-100">
                        <img src="${prod.image_url}" alt="${prod.title}" class="card-uniform-img w-100 h-100 object-fit-contain rounded-3" onerror="this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300'">
                    </a>
                </div>
                <div class="text-start">
                    <h6 class="fw-bold fs-8 text-dark mb-1 text-truncate">
                        <a href="${productDetailUrl}" class="text-dark text-decoration-none">${prod.title}</a>
                    </h6>
                    <small class="text-muted fs-8 d-block mb-1">${prod.category || 'عرض'}</small>
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <span class="fw-extrabold text-purple fs-7">${prod.discount_price || 0} ج.م</span>
                        <span class="text-muted text-decoration-line-through fs-8">${prod.original_price || 0} ج.م</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center border-top border-purple-subtle pt-2">
                        <span class="fw-bold fs-8 text-dark">${prod.store_name || 'المتجر'}</span>
                        <a href="${productDetailUrl}" class="card-arrow-btn" title="مشاهدة التفاصيل والكاش باك"><i class="bi bi-arrow-left-short fs-5"></i></a>
                    </div>
                </div>
            </div>
        </div>
    `;
}