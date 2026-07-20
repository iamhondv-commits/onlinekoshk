import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    doc, 
    deleteDoc,
    updateDoc,
    getDoc,
    setDoc,
    query,
    where,
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const showToast = window.showKoshkToast || function(message, type = 'success') {
    console.log(`[Toast - ${type}]: ${message}`);
};

const showConfirm = window.showKoshkCustomConfirmModal || async function(title, message) {
    return confirm(`${title}\n${message}`);
};

// [تأمين وحماية السيادة]: فحص صارم ومبعد لمنع الـ DOM Rendering قبل التحقق من الهوية الحية
onAuthStateChanged(auth, (user) => {
    if (!user) {
        document.body.innerHTML = '<div style="background:#0f172a; color:#fff; height:100vh; display:flex; align-items:center; justify-content:center; font-family:\'Cairo\'; font-weight:700;">جاري التحقق الأمني وإعادة توجيهك...</div>';
        window.location.href = 'admin-auth.html';
    }
});

document.getElementById('adminLogoutLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
        window.location.href = 'admin-auth.html';
    });
});

function changeDashboardTab(tabName) {
    const panes = document.querySelectorAll('.tab-pane');
    const links = document.querySelectorAll('.sidebar-navigation .nav-link');
    
    panes.forEach(pane => pane.classList.remove('active-pane'));
    links.forEach(link => link.classList.remove('active'));
    
    const targetPane = document.getElementById(`tab-${tabName}`);
    if (targetPane) targetPane.classList.add('active-pane');
    
    const tabsOrder = ['live-center', 'product-vault', 'reviews-moderator', 'shipping-gateways-vault', 'staff-permissions', 'users-vault', 'homepage-cards-vault', 'sales-analytics', 'pending-orders', 'shipping-orders', 'cancelled-orders', 'maintenance-vault'];
    const targetIndex = tabsOrder.indexOf(tabName);
    if(targetIndex !== -1 && links[targetIndex]) {
        links[targetIndex].classList.add('active');
    }

    // شحن البيانات المخزنة لايف فور التبديل لتبويب الكروت الرئيسية
    if (tabName === 'homepage-cards-vault') {
        fetchAndFillHomepageCardsSettings();
    }
}

async function triggerLiveToggle(type) {
    const isChecked = document.getElementById(`${type}Toggle`) ? document.getElementById(`${type}Toggle`).checked : (document.getElementById(`toggleGateway_${type.replace('gateway_', '')}`) ? document.getElementById(`toggleGateway_${type.replace('gateway_', '')}`).checked : false);
    try {
        await setDoc(doc(db, "system_settings", type), { value: isChecked }, { merge: true });
        if(type === 'maintenance') {
            await setDoc(doc(db, "adminSettings", "general"), { maintenanceMode: isChecked }, { merge: true });
        }
        showToast(`تم تحديث حالة (${type}) في السيرفر بنجاح!`, "success");
    } catch (err) {
        console.error(err);
        showToast("فشل تحديث الإعدادات لايف", "error");
    }
}

async function saveGlobalNotice() {
    const el = document.getElementById('globalNoticeText');
    if (!el) return;
    const text = el.value;
    try {
        await setDoc(doc(db, "system_settings", "globalNotice"), { value: text }, { merge: true });
        showToast(`تم بنجاح ربط وحقن الشعار العاجل لايف: ${text}`, "success");
    } catch (err) {
        showToast("فشل تحديث شريط الإعلانات", "error");
    }
}

async function updateTaxRate() {
    const el = document.getElementById('taxRateInput');
    if (!el) return;
    const rate = el.value;
    try {
        await setDoc(doc(db, "system_settings", "taxRate"), { value: parseFloat(rate) }, { merge: true });
        showToast(`تم تحديث قيمة ضريبة الشراء العامة لتصبح: ${rate}%`, "success");
    } catch (err) {
        showToast("فشل تحديث نسبة الضريبة", "error");
    }
}

function listenToSystemSettings() {
    const toggles = ['maintenance', 'cashback', 'freeShipping', 'tracking', 'gateway_cod', 'gateway_vodafone', 'gateway_etisalat', 'gateway_orange', 'gateway_instapay', 'gateway_fawry', 'gateway_bank'];
    toggles.forEach(type => {
        onSnapshot(doc(db, "system_settings", type), (docSnap) => {
            if (docSnap.exists()) {
                const isMaintenanceActive = docSnap.data().value;
                const el = document.getElementById(`${type}Toggle`) || document.getElementById(`toggleGateway_${type.replace('gateway_', '')}`);
                if(el) el.checked = isMaintenanceActive;
                
                if (type === 'maintenance' && isMaintenanceActive && window.location.pathname.includes('index.html')) {
                    window.location.href = 'maintenance.html'; 
                }
            }
        });
    });

    onSnapshot(doc(db, "system_settings", "globalNotice"), (docSnap) => {
        const el = document.getElementById('globalNoticeText');
        if (docSnap.exists() && el) el.value = docSnap.data().value || '';
    });
    onSnapshot(doc(db, "system_settings", "taxRate"), (docSnap) => {
        const el = document.getElementById('taxRateInput');
        if (docSnap.exists() && el) el.value = docSnap.data().value || '14';
    });
}

function listenToOrdersAndFinance() {
    onSnapshot(collection(db, "orders"), (snapshot) => {
        let totalSales = 0;
        let pendingCount = 0;
        let returnedSales = 0;
        let shippingCount = 0;

        const salesAnalyticsBody = document.getElementById('salesAnalyticsTableBody');
        const pendingOrdersContainer = document.getElementById('koshkLivePendingOrdersAreaContainer');
        const shippingOrdersContainer = document.getElementById('koshkLiveShippingOrdersAreaContainer');
        const cancelledOrdersContainer = document.getElementById('koshkLiveCancelledOrdersAreaContainer');

        if (salesAnalyticsBody) salesAnalyticsBody.innerHTML = '';
        if (pendingOrdersContainer) pendingOrdersContainer.innerHTML = '';
        if (shippingOrdersContainer) shippingOrdersContainer.innerHTML = '';
        if (cancelledOrdersContainer) cancelledOrdersContainer.innerHTML = '';

        if (snapshot.empty) {
            if (document.getElementById('totalSalesBox')) document.getElementById('totalSalesBox').innerText = "0 ج.م";
            if (document.getElementById('pendingOrdersBox')) document.getElementById('pendingOrdersBox').innerText = "0 طلبات";
            if (document.getElementById('returnedSalesBox')) document.getElementById('returnedSalesBox').innerText = "0 ج.م";
            if (document.getElementById('shippingOrdersBox')) document.getElementById('shippingOrdersBox').innerText = "0 طلبات";
            if (salesAnalyticsBody) salesAnalyticsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد مبيعات مكتملة حالياً</td></tr>';
            if (pendingOrdersContainer) pendingOrdersContainer.innerHTML = '<p style="text-align:center; padding:20px; font-weight:700;">لا توجد أوردرات معلقة</p>';
            if (shippingOrdersContainer) shippingOrdersContainer.innerHTML = '<p style="text-align:center; padding:20px; font-weight:700;">لا توجد أوردرات قيد الشحن</p>';
            if (cancelledOrdersContainer) cancelledOrdersContainer.innerHTML = '<p style="text-align:center; padding:20px; font-weight:700;">لا توجد أوردرات ملغاة</p>';
            return;
        }

        snapshot.forEach(docSnap => {
            const order = docSnap.data();
            const orderId = docSnap.id;
            const amount = parseFloat(order.total) || 0;
            const orderNumber = order.orderNumber || orderId.substring(0, 8);
            const dateStr = order.orderedAt ? new Date(order.orderedAt.seconds * 1000).toLocaleString('ar-EG') : 'الآن';

            if (order.status === 'delivered') {
                totalSales += amount;
            } else if (order.status === 'pending') {
                pendingCount++;
            } else if (order.status === 'cancelled') {
                returnedSales += amount;
            } else if (order.status === 'shipping') {
                shippingCount++;
            }

            let productsHtml = (order.products || []).map(p => `
                <div class="order-product-item">
                    <img src="${p.image || 'https://via.placeholder.com/50'}">
                    <div class="order-product-item-details">
                        <h5>${p.name}</h5>
                        <span>الكمية: ${p.quantity || 1} | السعر: ${p.price} ج.م</span>
                    </div>
                </div>
            `).join('');

            const orderCardHtml = `
                <div class="dynamic-order-card">
                    <div class="dynamic-order-header">
                        <div class="order-client-info">
                            <h4>كود الأوردر: <span style="color:#ff9900;">${orderNumber}</span></h4>
                            <p><i class="fas fa-user"></i> العميل: ${order.clientName || 'عميل مجهول'}</p>
                            <p><i class="fas fa-phone-alt"></i> الهاتف: <code>${order.clientPhone || 'بدون رقم'}</code></p>
                            <p><i class="fas fa-envelope"></i> الإيميل: <code>${order.clientEmail || 'بدون بريد'}</code></p>
                            <p><i class="fas fa-map-marker-alt"></i> العنوان: ${order.province || ''} - ${order.city || ''}، ${order.address || ''}</p>
                            ${order.notes ? `<p><i class="fas fa-comment-dots"></i> ملاحظات: <span style="color:#ef4444;">${order.notes}</span></p>` : ''}
                        </div>
                        <div style="text-align:left; display:flex; flex-direction:column; gap:10px; align-items:flex-end;">
                            <strong style="color:#ff9900; font-size:18px; font-weight:800;">${amount} ج.م</strong>
                            <div style="display:flex; gap:8px;">
                                <select class="custom-select" style="padding:6px; font-size:12px; width:auto;" onchange="updateOrderStatus('${orderId}', this.value)">
                                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>معلق / قيد المعالجة</option>
                                    <option value="shipping" ${order.status === 'shipping' ? 'selected' : ''}>جاري الشحن والتوصيل</option>
                                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>مكتمل / تم التسليم</option>
                                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغي / مرتجع</option>
                                </select>
                                <button class="action-circle-btn delete-btn" onclick="deleteOrderLive('${orderId}')" title="حذف الأوردر كلياً"><i class="fas fa-trash-alt"></i></button>
                            </div>
                        </div>
                    </div>
                    <div class="order-products-list">${productsHtml}</div>
                </div>
            `;

            if (order.status === 'delivered' && salesAnalyticsBody) {
                salesAnalyticsBody.insertAdjacentHTML('beforeend', `
                    <tr>
                        <td><code>${orderNumber}</code></td>
                        <td>${order.clientName || 'عميل مجهول'}</td>
                        <td><div style="max-height:80px; overflow-y:auto;">${(order.products || []).map(p => p.name + ` (x${p.quantity || 1})`).join('، ')}</div></td>
                        <td><span class="status-pill active-pill">${order.paymentGateway === 'cod' ? 'كاش عند الاستلام' : 'دفع إلكتروني'}</span></td>
                        <td style="color:#10b981; font-weight:700;">${amount} ج.م</td>
                        <td><small>${dateStr}</small></td>
                    </tr>
                `);
            } else if (order.status === 'pending' && pendingOrdersContainer) {
                pendingOrdersContainer.insertAdjacentHTML('beforeend', orderCardHtml);
            } else if (order.status === 'shipping' && shippingOrdersContainer) {
                shippingOrdersContainer.insertAdjacentHTML('beforeend', orderCardHtml);
            } else if (order.status === 'cancelled' && cancelledOrdersContainer) {
                cancelledOrdersContainer.insertAdjacentHTML('beforeend', orderCardHtml);
            }
        });

        if (document.getElementById('totalSalesBox')) document.getElementById('totalSalesBox').innerText = `${totalSales.toLocaleString()} ج.م`;
        if (document.getElementById('pendingOrdersBox')) document.getElementById('pendingOrdersBox').innerText = `${pendingCount} طلبات`;
        if (document.getElementById('returnedSalesBox')) document.getElementById('returnedSalesBox').innerText = `${returnedSales.toLocaleString()} ج.م`;
        if (document.getElementById('shippingOrdersBox')) document.getElementById('shippingOrdersBox').innerText = `${shippingCount} طلبات`;

        if (salesAnalyticsBody && salesAnalyticsBody.innerHTML === '') salesAnalyticsBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد مبيعات مكتملة حالياً</td></tr>';
        if (pendingOrdersContainer && pendingOrdersContainer.innerHTML === '') pendingOrdersContainer.innerHTML = '<p style="text-align:center; padding:20px; font-weight:700; color:#64748b;">لا توجد أوردرات معلقة حالياً</p>';
        if (shippingOrdersContainer && shippingOrdersContainer.innerHTML === '') shippingOrdersContainer.innerHTML = '<p style="text-align:center; padding:20px; font-weight:700; color:#64748b;">لا توجد أوردرات قيد الشحن حالياً</p>';
        if (cancelledOrdersContainer && cancelledOrdersContainer.innerHTML === '') cancelledOrdersContainer.innerHTML = '<p style="text-align:center; padding:20px; font-weight:700; color:#64748b;">لا توجد أوردرات ملغاة في الأرشيف</p>';
    });
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await updateDoc(doc(db, "orders", orderId), { status: newStatus });
        showToast("تم تحديث حالة الطلب بنجاح وتعديلها بالداتا بيز!", "success");
    } catch (err) {
        showToast("فشل تحديث الطلب: " + err.message, "error");
    }
}

async function deleteOrderLive(orderId) {
    const confirmAction = await showConfirm("حذف أوردر نهائياً", "هل أنت متأكد من رغبتك في حذف هذا الأوردر وإزالة سجلاته من قواعد البيانات تماماً؟");
    if (confirmAction) {
        try {
            await deleteDoc(doc(db, "orders", orderId));
            showToast("تم حذف وإبطال الأوردر بنجاح تام.", "success");
        } catch(err) {
            showToast("فشل الحذف: " + err.message, "error");
        }
    }
}

function listenToForgotPasswordsLive() {
    const tbody = document.getElementById('forgotPasswordsTableBody');
    if(!tbody) return;
    onSnapshot(collection(db, "forgot_passwords"), (snapshot) => {
        tbody.innerHTML = '';
        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#64748b;">لا توجد طلبات استعادة كلمة سر معلقة حالياً</td></tr>';
            return;
        }
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const dateStr = data.requestedAt ? new Date(data.requestedAt.seconds * 1000).toLocaleString('ar-EG') : 'الآن';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.clientName || 'غير معروف'}</td>
                <td>${data.clientPhone || 'بدون رقم'}</td>
                <td>${dateStr}</td>
                <td>
                    <button class="action-circle-btn delete-btn" onclick="resolveForgotPasswordRequest('${docSnap.id}')"><i class="fas fa-check"></i> تم التواصل</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}

async function resolveForgotPasswordRequest(id) {
    try {
        await deleteDoc(doc(db, "forgot_passwords", id));
        showToast("تم إنهاء وتأشير طلب استعادة كلمة المرور بنجاح.", "success");
    } catch(err) {
        showToast("خطأ أثناء العملية: " + err.message, "error");
    }
}

function listenToDynamicContactMessagesLive() {
    const tbody = document.getElementById('contactDashboardMessagesTableBody');
    if(!tbody) return;
    onSnapshot(collection(db, "contact_messages"), (snapshot) => {
        tbody.innerHTML = '';
        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">لا توجد رسائل تواصل واردة من الفورم الديناميكي حالياً</td></tr>';
            return;
        }
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const dateStr = data.sentAt ? new Date(data.sentAt.seconds * 1000).toLocaleString('ar-EG') : 'الآن';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.name}</td>
                <td>${data.email}</td>
                <td>${data.subject || 'بدون موضوع'}</td>
                <td>${data.message}</td>
                <td>${dateStr}</td>
            `;
            tbody.appendChild(row);
        });
    });
}

function listenToMaintenanceMessages() {
    const tbody = document.getElementById('maintenanceMessagesTableBody');
    if (!tbody) return;
    onSnapshot(collection(db, "maintenance_messages"), (snapshot) => {
        tbody.innerHTML = '';
        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">لا توجد رسائل صيانة واردة حالياً</td></tr>';
            return;
        }
        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            const docId = docSnap.id;
            const row = document.createElement('tr');
            const dateStr = msg.sentAt ? new Date(msg.sentAt.seconds * 1000).toLocaleString('ar-EG') : 'الآن';
            row.innerHTML = `
                <td><strong>${msg.name || 'عميل'}</strong></td>
                <td><code>${msg.email || 'بدون بريد'}</code></td>
                <td>${msg.message || ''}</td>
                <td><small>${dateStr}</small></td>
                <td>
                    <button class="action-circle-btn delete-btn" onclick="deleteMaintenanceMessageLive('${docId}')"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}

async function deleteMaintenanceMessageLive(id) {
    if (await showConfirm("حذف رسالة الصيانة", "هل أنت متأكد من رغبتك في حذف هذه الرسالة نهائياً من السيرفر؟")) {
        try {
            await deleteDoc(doc(db, "maintenance_messages", id));
            showToast("تم حذف رسالة الصيانة بنجاح.", "success");
        } catch(err) {
            showToast("فشل الحذف: " + err.message, "error");
        }
    }
}

function openZoom(imgSrc) {
    const overlay = document.getElementById('zoomOverlay');
    const zoomedImg = document.getElementById('zoomedImg');
    if (overlay && zoomedImg) {
        zoomedImg.src = imgSrc;
        overlay.style.display = 'flex';
        setTimeout(() => { overlay.classList.add('open'); }, 10);
    }
}

function closeZoom() {
    const overlay = document.getElementById('zoomOverlay');
    if (overlay) {
        overlay.classList.remove('open');
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }
}

function openSliderModal() { if(document.getElementById('sliderModalCard')) document.getElementById('sliderModalCard').style.display = 'block'; }
function closeSliderModal() { if(document.getElementById('sliderModalCard')) document.getElementById('sliderModalCard').style.display = 'none'; }

async function handleSliderSubmit(e) {
    e.preventDefault();
    const sliderPayload = {
        title: document.getElementById('sTitle').value,
        desc: document.getElementById('sDesc').value,
        url: document.getElementById('sUrl').value,
        btnText: document.getElementById('sBtnText').value,
        bg: document.getElementById('sBg').value
    };
    try {
        await addDoc(collection(db, "sliders"), sliderPayload);
        closeSliderModal();
        e.target.reset();
        showToast("تم إضافة وإدراج السلايدر الجديد بنجاح لايف!", "success");
    } catch(err) { 
        showToast("حدث خطأ أثناء حفظ السلايدر: " + err.message, "error"); 
    }
}

function loadSlidersLive() {
    const tbody = document.getElementById('adminSliderTableBody');
    onSnapshot(collection(db, "sliders"), (snapshot) => {
        if(!tbody) return;
        tbody.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.title}</td>
                <td>${data.desc}</td>
                <td>${data.btnText}</td>
                <td><button class="action-circle-btn delete-btn" onclick="deleteSliderLive('${docSnap.id}')"><i class="fas fa-trash"></i> إزالة</button></td>
            `;
            tbody.appendChild(row);
        });
    });
}

async function deleteSliderLive(id) {
    const confirmAction = await showConfirm("حذف السلايدر", "هل أنت متأكد تماماً من رغبتك في حذف وإزالة هذا السلايدر نهائياً؟");
    if (confirmAction) {
        try {
            await deleteDoc(doc(db, "sliders", id));
            showToast("تم إزالة السلايدر الإعلاني بنجاح.", "success");
        } catch (err) {
            showToast("خطأ في حذف السلايدر: " + err.message, "error");
        }
    }
}

let encodedImageString = "";
let encodedImagesArray = [];
let productRealFilesArray = [];

function previewImages(event) {
    const gallery = event.target.id === 'pImagesModal' ? document.getElementById('previewGalleryModal') : document.getElementById('previewGallery');
    
    if(gallery) gallery.innerHTML = '';
    const files = event.target.files;
    
    if (files && files.length > 0) {
        encodedImagesArray = [];
        productRealFilesArray = []; 
        Array.from(files).forEach(file => {
            productRealFilesArray.push(file); 
            const reader = new FileReader();
            reader.onload = function(e) {
                const resultStr = e.target.result;
                encodedImagesArray.push(resultStr);
                
                const box = document.createElement('div');
                box.className = 'preview-img-box';
                box.onclick = function() { openZoom(resultStr); };
                const img = document.createElement('img');
                img.src = resultStr;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-img-btn';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.onclick = function(event) {
                    event.stopPropagation();
                    box.remove();
                    encodedImagesArray = encodedImagesArray.filter(src => src !== resultStr);
                    productRealFilesArray = productRealFilesArray.filter(f => f.name !== file.name); 
                };
                box.appendChild(img);
                box.appendChild(removeBtn);
                if(gallery) gallery.appendChild(box);
            };
            reader.readAsDataURL(file);
        });
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const isModal = e.target.id === 'productSubmissionFormModal';
    const pSuff = isModal ? 'Modal' : '';
    const submitBtn = document.getElementById('mainSubmitBtn' + pSuff);
    const editingId = document.getElementById('pEditingId' + pSuff).value;
    
    if(!submitBtn) return;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    
    try {
        const productPayload = {
            name: document.getElementById('pName' + pSuff).value,
            brand: document.getElementById('pBrand' + pSuff) ? document.getElementById('pBrand' + pSuff).value : '',
            category: document.getElementById('pCategory' + pSuff) ? document.getElementById('pCategory' + pSuff).value : 'إلكترونيات',
            sku: document.getElementById('pSku' + pSuff) ? document.getElementById('pSku' + pSuff).value : '',
            price: parseFloat(document.getElementById('pPrice' + pSuff).value) || 0,
            discountPrice: parseFloat(document.getElementById('pDiscountPrice' + pSuff) ? document.getElementById('pDiscountPrice' + pSuff).value : 0) || 0,
            cost: parseFloat(document.getElementById('pCost' + pSuff) ? document.getElementById('pCost' + pSuff).value : 0) || 0,
            stock: parseInt(document.getElementById('pStock' + pSuff) ? document.getElementById('pStock' + pSuff).value : 0) || 0,
            minOrder: parseInt(document.getElementById('pMinOrder' + pSuff) ? document.getElementById('pMinOrder' + pSuff).value : 1) || 1,
            weight: document.getElementById('pWeight' + pSuff) ? document.getElementById('pWeight' + pSuff).value : '',
            warranty: document.getElementById('pWarranty' + pSuff) ? document.getElementById('pWarranty' + pSuff).value : '',
            colors: document.getElementById('pColors' + pSuff) ? document.getElementById('pColors' + pSuff).value.split(',').map(c => c.trim()).filter(Boolean) : [],
            sizes: document.getElementById('pSizes' + pSuff) ? document.getElementById('pSizes' + pSuff).value.split(',').map(s => s.trim()).filter(Boolean) : [],
            badge: document.getElementById('pBadge' + pSuff) ? document.getElementById('pBadge' + pSuff).value : '',
            desc: document.getElementById('pDesc' + pSuff) ? document.getElementById('pDesc' + pSuff).value : '',
            images: encodedImagesArray.length > 0 ? encodedImagesArray : ['https://via.placeholder.com/300'],
            createdAt: new Date()
        };

        if (editingId) {
            await updateDoc(doc(db, "products", editingId), productPayload);
            showToast('تم التعديل بنجاح', "success");
        } else {
            await addDoc(collection(db, "products"), productPayload);
            showToast('تمت إضافة المنتج بنجاح', "success");
        }
        
        if(isModal && window.closeProductModal) window.closeProductModal();
        resetProductForm();
    } catch (error) {
        showToast('خطأ: ' + error.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> نشر المنتج';
    }
}
window.handleProductSubmit = handleProductSubmit;

async function triggerProductEdit(docId) {
    const isModalFormExist = document.getElementById('productSubmissionFormModal');
    const pSuff = isModalFormExist ? 'Modal' : '';
    
    if(isModalFormExist) { window.openAddProductModal(); }
    
    const formTitle = document.getElementById('formActionTitle' + pSuff);
    const submitBtn = document.getElementById('mainSubmitBtn' + pSuff);
    if(formTitle) formTitle.innerHTML = '<i class="fas fa-edit" style="color:#ef8121;"></i> تعديل بيانات المنتج الحالي';
    if(submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-edit"></i> حفظ وتعديل المنتج الحالي لايف';
        submitBtn.style.background = "#ef8121";
    }
    
    try {
        const docSnap = await getDoc(doc(db, "products", docId));
        if (docSnap.exists()) {
            const prod = docSnap.data();
            document.getElementById('pEditingId' + pSuff).value = docId;
            document.getElementById('pName' + pSuff).value = prod.name || '';
            document.getElementById('pBrand' + pSuff).value = prod.brand || '';
            document.getElementById('pCategory' + pSuff).value = prod.category || 'إلكترونيات';
            document.getElementById('pSku' + pSuff).value = prod.sku || '';
            document.getElementById('pPrice' + pSuff).value = prod.price || '';
            document.getElementById('pDiscountPrice' + pSuff).value = prod.discountPrice || '';
            document.getElementById('pCost' + pSuff).value = prod.cost || '';
            document.getElementById('pStock' + pSuff).value = prod.stock || '';
            document.getElementById('pMinOrder' + pSuff).value = prod.minOrder || '1';
            document.getElementById('pWeight' + pSuff).value = prod.weight || '';
            document.getElementById('pWarranty' + pSuff).value = prod.warranty || '';
            document.getElementById('pColors' + pSuff).value = (prod.colors || []).join(', ');
            document.getElementById('pSizes' + pSuff).value = (prod.sizes || []).join(', ');
            document.getElementById('pBadge' + pSuff).value = prod.badge || '';
            document.getElementById('pDesc' + pSuff).value = prod.desc || '';
            
            const gallery = document.getElementById('previewGallery' + pSuff);
            if(gallery) {
                gallery.innerHTML = '';
                if (prod.images && prod.images.length > 0) {
                    encodedImagesArray = [...prod.images];
                    productRealFilesArray = []; 
                    prod.images.forEach(imgSrc => {
                        const box = document.createElement('div');
                        box.className = 'preview-img-box';
                        box.innerHTML = `<img src="${imgSrc}">`;
                        gallery.appendChild(box);
                    });
                }
            }
            if(!isModalFormExist) window.scrollTo({ top: document.getElementById('formActionTitle').offsetTop - 20, behavior: 'smooth' });
        }
    } catch(err) { 
        showToast("خطأ في جلب بيانات المنتج: " + err.message, "error"); 
    }
}

async function duplicateProductLive(docId) {
    const confirmAction = await showConfirm("استنساخ المنتج", "هل أنت متأكد من رغبتك في استنساخ وتكرار هذا المنتج كنسخة جديدة؟");
    if (confirmAction) {
        try {
            const docSnap = await getDoc(doc(db, "products", docId));
            if (docSnap.exists()) {
                const originalData = docSnap.data();
                const duplicatedData = {
                    ...originalData,
                    sku: `${originalData.sku}-DUP-${Math.floor(1000 + Math.random() * 9000)}`,
                    isDuplicate: true,
                    createdAt: new Date()
                };
                await addDoc(collection(db, "products"), duplicatedData);
                showToast(`تم استنساخ وتكرار المنتج بنجاح كنسخة جديدة!`, "success");
            }
        } catch (error) { 
            showToast("فشل استنساخ المنتج: " + error.message, "error"); 
        }
    }
}

function openAddProductModal() {
    const modal = document.getElementById('addProductModalWrapper');
    if(modal) {
        modal.style.display = 'flex';
        setTimeout(() => { modal.style.opacity = '1'; }, 50);
    }
}

function closeProductModal() {
    const modal = document.getElementById('addProductModalWrapper');
    if(modal) {
        modal.style.opacity = '0';
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
    resetProductForm();
}

function resetProductForm() {
    const form = document.getElementById('productSubmissionForm') || document.getElementById('productSubmissionFormModal');
    if (form) form.reset();
    const gallery = document.getElementById('previewGallery') || document.getElementById('previewGalleryModal');
    if(gallery) gallery.innerHTML = '';
    const editingIdField = document.getElementById('pEditingId') || document.getElementById('pEditingIdModal');
    if(editingIdField) editingIdField.value = "";
    encodedImageString = "";
    encodedImagesArray = [];
    productRealFilesArray = []; 
    
    const formTitle = document.getElementById('formActionTitle') || document.getElementById('formActionTitleModal');
    if(formTitle) formTitle.innerHTML = 'حقن منتج جديد بتفاصيل عميقة ومتقدمة جداً';
    
    const submitBtn = document.getElementById('mainSubmitBtn') || document.getElementById('mainSubmitBtnModal');
    if(submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> نشر وإتاحة فورية بالمتجر لايف';
        submitBtn.style.background = "#5EEAD4";
    }
}

function loadProductsLive() {
    const tbody = document.getElementById('adminProductsTableBody');
    if(!tbody) return;
    onSnapshot(collection(db, "products"), (snapshot) => {
        tbody.innerHTML = '';
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">المخزن فارغ تماماً</td></tr>';
            return;
        }
        snapshot.forEach((docSnap) => {
            const prod = docSnap.data();
            const docId = docSnap.id;
            const imgUrl = (prod.images && prod.images.length > 0) ? prod.images[0] : 'https://via.placeholder.com/300?text=Online+Koshk';
            
            const displayName = prod.isDuplicate ? `${prod.name} <span style="color:#a855f7; font-size:11px;">(نسخة مكررة)</span>` : prod.name;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="table-product-cell">
                        <div class="table-prod-img" onclick="window.openZoom('${imgUrl}')"><img src="${imgUrl}"></div>
                        <div>
                            <strong>${displayName}</strong>
                            <span style="display:block; font-size:11px; color:#64748b;">SKU: ${prod.sku}</span>
                        </div>
                    </div>
                </td>
                <td>${prod.category}</td>
                <td>${prod.price} ج.م</td>
                <td>${prod.cost} ج.م</td>
                <td>${prod.stock} قطعة</td>
                <td>
                    <button class="action-circle-btn edit-btn" onclick="triggerProductEdit('${docId}')"><i class="fas fa-pen"></i></button>
                    <button class="action-circle-btn duplicate-btn" style="background:#8b5cf6;" onclick="duplicateProductLive('${docId}')"><i class="fas fa-copy"></i></button>
                    <button class="action-circle-btn delete-btn" onclick="deleteProductLive('${docId}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}

async function deleteProductLive(docId) {
    const confirmAction = await showConfirm("حذف منتج", "هل أنت متأكد تماماً من رغبتك في حذف هذا المنتج من المخزن لايف؟");
    if (confirmAction) {
        try {
            await deleteDoc(doc(db, "products", docId));
            showToast("تم حذف المنتج وإزالته نهائياً بنجاح.", "success");
        } catch (error) {
            showToast("فشل حذف المنتج: " + error.message, "error");
        }
    }
}

function listenToConstants() {
    onSnapshot(doc(db, "page_contents", "constants"), (docSnap) => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            if(document.getElementById('cAboutUs')) document.getElementById('cAboutUs').value = data.aboutUs || '';
            if(document.getElementById('cPrivacy')) document.getElementById('cPrivacy').value = data.privacy || '';
            if(document.getElementById('cFacebook')) document.getElementById('cFacebook').value = data.facebook || '';
            if(document.getElementById('cInstagram')) document.getElementById('cInstagram').value = data.instagram || '';
            if(document.getElementById('cHotline')) document.getElementById('cHotline').value = data.hotline || '';
        }
    });
}

async function approveStaffRow(btn, staffName, selectId, email, password) {
    const roleSelect = document.getElementById(selectId);
    const selectedRole = roleSelect.options[roleSelect.selectedIndex].value;
    try {
        await addDoc(collection(db, "active_staff"), {
            name: staffName,
            email: email,
            role: selectedRole,
            status: "active",
            approvedAt: new Date()
        });
        showToast(`تم تفعيل حساب المشرف ${staffName} كـ ${selectedRole}`, "success");
    } catch (error) { 
        showToast("خطأ في قبول المشرف: " + error.message, "error"); 
    }
}

async function approveStaffLive(docId, staffName, selectId, email, password) {
    await approveStaffRow(null, staffName, selectId, email, password);
    await deleteDoc(doc(db, "pending_staff", docId));
}

async function rejectStaffLive(docId) {
    try {
        await deleteDoc(doc(db, "pending_staff", docId));
        showToast('تم رفض وطلب حذف حساب المشرف بنجاح.', "success");
    } catch (error) {
        showToast("حدث خطأ في الرفض", "error");
    }
}

function loadPendingStaff() {
    const tbody = document.getElementById('pendingStaffTableBody');
    onSnapshot(collection(db, "pending_staff"), (snapshot) => {
        if(!tbody) return;
        tbody.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const staff = docSnap.data();
            const docId = docSnap.id;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${staff.name}</td>
                <td>${staff.email}</td>
                <td><code>${staff.inviteCode}</code></td>
                <td>
                    <select class="custom-select" style="padding:6px; font-size:12px;" id="role-${docId}">
                        <option value="أدمن منتجات فقط">أدمن منتجات فقط</option>
                        <option value="أدمن محتوى وإعلانات">أدمن محتوى وإعلانات</option>
                        <option value="أدمن شامل">أدمن شامل</option>
                    </select>
                </td>
                <td>
                    <button class="action-circle-btn edit-btn" style="width:auto; padding:6px 14px;" onclick="approveStaffLive('${docId}', '${staff.name}', 'role-${docId}', '${staff.email}', '${staff.password}')">موافقة</button>
                    <button class="action-circle-btn delete-btn" style="width:auto; padding:6px 14px;" onclick="rejectStaffLive('${docId}')">رفض</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}

function loadActiveStaff() {
    const tbody = document.getElementById('activeStaffTableBody');
    onSnapshot(collection(db, "active_staff"), (snapshot) => {
        if(!tbody) return;
        tbody.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const staff = docSnap.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${staff.name}</td>
                <td>${staff.email}</td>
                <td>${staff.role}</td>
                <td><span class="status-pill active-pill">متصل</span></td>
                <td><button class="action-circle-btn delete-btn" style="width:auto; padding:6px 14px;" onclick="removeActiveStaffLive('${docSnap.id}')">طرد</button></td>
            `;
            tbody.appendChild(row);
        });
    });
}

async function removeActiveStaffLive(id) {
    const confirmAction = await showConfirm("طرد مشرف", "هل تريد بالتأكيد سحب الصلاحيات وطرد هذا الأدمن من النظام؟");
    if (confirmAction) {
        try {
            await deleteDoc(doc(db, "active_staff", id));
            showToast("تم طرد المشرف بنجاح وسحب الصلاحية.", "success");
        } catch (err) {
            showToast("حدث خطأ في العملية", "error");
        }
    }
}

function toggleAdminTheme() {
    const icon = document.getElementById('main-theme-icon');
    if (document.body.classList.contains('light-mode')) {
        document.body.classList.remove('light-mode');
        icon.className = 'fas fa-moon';
        localStorage.setItem('adminTheme', 'dark');
    } else {
        document.body.classList.add('light-mode');
        icon.className = 'fas fa-sun';
        localStorage.setItem('adminTheme', 'light');
    }
}

function listenToPendingReviewsLive() {
    const tbodyPending = document.getElementById('adminPendingReviewsTableBody');
    const tbodyApproved = document.getElementById('adminApprovedReviewsTableBody');

    onSnapshot(collection(db, "reviews"), (snapshot) => {
        if (tbodyPending) tbodyPending.innerHTML = '';
        if (tbodyApproved) tbodyApproved.innerHTML = '';
        
        let hasPending = false;
        let hasApproved = false;

        snapshot.forEach(docSnap => {
            const review = docSnap.data();
            const docId = docSnap.id;
            const row = document.createElement('tr');

            if (review.status === "pending") {
                hasPending = true;
                row.innerHTML = `
                    <td>${review.userName}</td>
                    <td><small>${review.productId}</small></td>
                    <td><span style="color:#ff9900;">${review.rating} / 5</span></td>
                    <td>${review.comment}</td>
                    <td>
                        <button class="action-circle-btn edit-btn" style="width:auto; padding:6px 14px; background:#ff9900; color:#1a1e22;" onclick="approveKoshkReviewLive('${docId}')">موافقة ونشر</button>
                        <button class="action-circle-btn delete-btn" style="width:auto; padding:6px 14px;" onclick="rejectKoshkReviewLive('${docId}')">حذف ورفض</button>
                    </td>
                `;
                if (tbodyPending) tbodyPending.appendChild(row);
            } else if (review.status === "approved" || review.approved === true) {
                hasApproved = true;
                row.innerHTML = `
                    <td>${review.userName}</td>
                    <td><small>${review.productId}</small></td>
                    <td><span style="color:#ff9900;">${review.rating} / 5</span></td>
                    <td>${review.comment}</td>
                    <td>
                        <button class="action-circle-btn delete-btn" style="width:auto; padding:6px 14px;" onclick="rejectKoshkReviewLive('${docId}')"><i class="fas fa-trash-alt"></i> حذف</button>
                    </td>
                `;
                if (tbodyApproved) tbodyApproved.appendChild(row);
            }
        });

        if (!hasPending && tbodyPending) {
            tbodyPending.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">لا توجد تقييمات معلقة حالياً</td></tr>';
        }
        if (!hasApproved && tbodyApproved) {
            tbodyApproved.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">لا توجد تقييمات معروضة حالياً</td></tr>';
        }
    });
}

window.approveKoshkReviewLive = async function(docId) {
    try {
        await updateDoc(doc(db, "reviews", docId), { status: "approved" });
        showToast("تم الموافقة على التقييم ونشره في صفحة المنتج فوراً!", "success");
    } catch(err) { showToast("فشل قبول التقييم: " + err.message, "error"); }
};

window.rejectKoshkReviewLive = async function(docId) {
    if(await showConfirm("حذف التقييم", "هل أنت متأكد من حذف ورفض هذا التقييم نهائياً؟")) {
        try {
            await deleteDoc(doc(db, "reviews", docId));
            showToast("تم رفض وحذف التعليق بنجاح.", "success");
        } catch(err) { showToast("فشل حذف التقييم: " + err.message, "error"); }
    }
};

function listenToGatewaysAndShippingPolicyVaultLive() {
    onSnapshot(doc(db, "system_settings", "payment_accounts"), (docSnap) => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            if(document.getElementById('gVodafone')) document.getElementById('gVodafone').value = data.vodafone || '';
            if(document.getElementById('gEtisalat')) document.getElementById('gEtisalat').value = data.etisalat || '';
            if(document.getElementById('gOrange')) document.getElementById('gOrange').value = data.orange || '';
            if(document.getElementById('gInstapay')) document.getElementById('gInstapay').value = data.instapay || '';
            if(document.getElementById('gWe')) document.getElementById('gWe').value = data.we || '';
            if(document.getElementById('gFawry')) document.getElementById('gFawry').value = data.fawry || '';
            if(document.getElementById('gBankAccount')) document.getElementById('gBankAccount').value = data.bankAccount || '';
        }
    });

    onSnapshot(doc(db, "page_contents", "shipping_policy"), (docSnap) => {
        if(docSnap.exists() && document.getElementById('gShippingText')) {
            document.getElementById('gShippingText').value = docSnap.data().text || '';
        }
    });
}

const gatewaysForm = document.getElementById('koshkLiveGatewaysFormBlock');
if(gatewaysForm) {
    gatewaysForm.onsubmit = async (e) => {
        e.preventDefault();
        try {
            const paymentPayload = {
                vodafone: document.getElementById('gVodafone').value.trim(),
                etisalat: document.getElementById('gEtisalat').value.trim(),
                orange: document.getElementById('gOrange') ? document.getElementById('gOrange').value.trim() : '',
                instapay: document.getElementById('gInstapay') ? document.getElementById('gInstapay').value.trim() : '',
                we: document.getElementById('gWe') ? document.getElementById('gWe').value.trim() : '',
                fawry: document.getElementById('gFawry').value.trim(),
                bankAccount: document.getElementById('gBankAccount') ? document.getElementById('gBankAccount').value.trim() : ''
            };
            await setDoc(doc(db, "system_settings", "payment_accounts"), paymentPayload, { merge: true });
            await setDoc(doc(db, "paymentGateways", "cash"), {
                vodafoneCash: paymentPayload.vodafone,
                etisalatCash: paymentPayload.etisalat,
                orangeCash: paymentPayload.orange,
                instapay: paymentPayload.instapay,
                bankAccount: paymentPayload.bankAccount,
                updatedAt: new Date()
            }, { merge: true });
            showToast("تم تحديث وحفظ أرقام بوابات الكاش بنجاح بالسيرفر لايف!", "success");
        } catch(err) { showToast("فشل حفظ البوابات: " + err.message, "error"); }
    };
}

const policyForm = document.getElementById('koshkLiveShippingPolicyTextFormBlock');
if(policyForm) {
    policyForm.onsubmit = async (e) => {
        e.preventDefault();
        try {
            await setDoc(doc(db, "page_contents", "shipping_policy"), {
                text: document.getElementById('gShippingText').value.trim(),
                updatedAt: new Date()
            }, { merge: true });
            showToast("تم نشر وتحديث نص سياسة الشحن بالمتجر بنجاح!", "success");
        } catch(err) { showToast("فشل الحفظ: " + err.message, "error"); }
    };
}

function listenToRegisteredUsersLive() {
    const tbody = document.getElementById('registeredUsersTableBody');
    if(!tbody) return;
    
    onSnapshot(collection(db, "users"), (snapshot) => {
        tbody.innerHTML = '';
        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">لا يوجد عملاء مسجلين بالنظام حالياً</td></tr>';
            return;
        }
        
        snapshot.forEach(docSnap => {
            const user = docSnap.data();
            const userId = docSnap.id;
            if (user.role === 'owner' || user.role === 'admin' || user.role === 'manager') return;
            
            const dateStr = user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('ar-EG') : 'غير محدد';
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td><strong>${user.name || 'عميل كشك'}</strong></td>
                <td><code>${user.phone || 'بدون رقم'}</code></td>
                <td>${user.email}</td>
                <td>${user.city || 'N/A'}</td>
                <td>${dateStr}</td>
                <td>
                    <button class="action-circle-btn edit-btn" style="width:auto; padding:4px 10px; background:#25d366; color:#fff;" onclick="contactUserLive('${user.phone}')"><i class="fab fa-whatsapp"></i> تواصل</button>
                    <button class="action-circle-btn delete-btn" style="width:auto; padding:4px 10px;" onclick="deleteUserLive('${userId}')"><i class="fas fa-trash-alt"></i> حذف</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
}

function contactUserLive(phone) {
    if(!phone || phone === 'بدون رقم') {
        showToast("عفواً، لا يوجد رقم هاتف مسجل لهذا المستخدم!", "error");
        return;
    }
    const cleanPhone = phone.trim().replace('+', '');
    const formattedPhone = cleanPhone.startsWith('01') ? '2' + cleanPhone : cleanPhone;
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
}

async function deleteUserLive(id) {
    const confirmAction = await showConfirm("حذف حساب مستخدم", "هل أنت متأكد تماماً من رغبتك في حذف وإلغاء هذا المستخدم نهائياً من المتجر؟");
    if (confirmAction) {
        try {
            await deleteDoc(doc(db, "users", id));
            showToast("تم حذف وإبطال حساب المستخدم بنجاح تامة.", "success");
        } catch (err) {
            showToast("خطأ في حذف المستخدم: " + err.message, "error");
        }
    }
}

window.koshkCardsBase64Data = window.koshkCardsBase64Data || {
    electronics: "", makeup: "", clothing: "", bestSeller: "", beautyOffers: "", children: ""
};

function previewKoshkCardImageLive(event, cardKey) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            window.koshkCardsBase64Data[cardKey] = e.target.result;
            showToast(`تم تجهيز صورة ${cardKey} بنجاح!`, "success");
        };
        reader.readAsDataURL(file);
    }
}

async function fetchAndFillHomepageCardsSettings() {
    try {
        const docSnap = await getDoc(doc(db, "homepage_settings", "premium_cards"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            const cardKeys = ['electronics', 'makeup', 'clothing', 'bestSeller', 'beautyOffers', 'children'];
            
            cardKeys.forEach(key => {
                if (data[key]) {
                    const targetField = document.getElementById(`cardTarget_${key}`);
                    if (targetField && data[key].targetSection) targetField.value = data[key].targetSection;
                    if (data[key].image) window.koshkCardsBase64Data[key] = data[key].image;
                }
            });
        }
    } catch (err) {
        console.error("Error loading homepage cards settings:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // تصدير فوري للدوال قبل استدعائها أو ربطها بأي شكل
    window.previewKoshkCardImageLive = previewKoshkCardImageLive;
    window.fetchAndFillHomepageCardsSettings = fetchAndFillHomepageCardsSettings;

    listenToSystemSettings();
    listenToOrdersAndFinance();
    listenToMaintenanceMessages();
    loadProductsLive();
    listenToConstants();
    loadPendingStaff();
    loadActiveStaff();
    listenToPendingReviewsLive();
    listenToGatewaysAndShippingPolicyVaultLive();
    listenToRegisteredUsersLive();

    const cardsForm = document.getElementById('koshkHomepagePremiumCardsForm');
    if (cardsForm) {
        cardsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = cardsForm.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.innerHTML : "";
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري حقن صور وأقسام الكروت بالسيرفر...';
            }
            
            try {
                const docSnap = await getDoc(doc(db, "homepage_settings", "premium_cards"));
                const serverData = docSnap.exists() ? docSnap.data() : {};

                const premiumCardsPayload = {
                    electronics: {
                        image: window.koshkCardsBase64Data.electronics || (serverData.electronics?.image || ""),
                        targetSection: document.getElementById('cardTarget_electronics') ? document.getElementById('cardTarget_electronics').value.trim() : ""
                    },
                    makeup: {
                        image: window.koshkCardsBase64Data.makeup || (serverData.makeup?.image || ""),
                        targetSection: document.getElementById('cardTarget_makeup') ? document.getElementById('cardTarget_makeup').value.trim() : ""
                    },
                    clothing: {
                        image: window.koshkCardsBase64Data.clothing || (serverData.clothing?.image || ""),
                        targetSection: document.getElementById('cardTarget_clothing') ? document.getElementById('cardTarget_clothing').value.trim() : ""
                    },
                    bestSeller: {
                        image: window.koshkCardsBase64Data.bestSeller || (serverData.bestSeller?.image || ""),
                        targetSection: document.getElementById('cardTarget_bestSeller') ? document.getElementById('cardTarget_bestSeller').value.trim() : ""
                    },
                    beautyOffers: {
                        image: window.koshkCardsBase64Data.beautyOffers || (serverData.beautyOffers?.image || ""),
                        targetSection: document.getElementById('cardTarget_beautyOffers') ? document.getElementById('cardTarget_beautyOffers').value.trim() : ""
                    },
                    children: {
                        image: window.koshkCardsBase64Data.children || (serverData.children?.image || ""),
                        targetSection: document.getElementById('cardTarget_children') ? document.getElementById('cardTarget_children').value.trim() : ""
                    },
                    updatedAt: new Date()
                };
            
                await setDoc(doc(db, "homepage_settings", "premium_cards"), premiumCardsPayload, { merge: true });
                showToast("تم مزامنة وحفظ صور وأقسام الكروت الـ 6 بنجاح وسوف تظهر في المتجر فوراً!", "success");
                
                // تحديث واجهة المستخدم وقراءة البيانات الجديدة مباشرة دون إعادة تحميل الصفحة كاملاً
                await fetchAndFillHomepageCardsSettings();
            } catch (error) {
                showToast("حدث خطأ أثناء الاتصال بالسيرفر: " + error.message, "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        });
    }

    const modalProdForm = document.getElementById('productSubmissionFormModal');
    if (modalProdForm) {
        modalProdForm.addEventListener('submit', handleProductSubmit);
    }
});

// [إخراج كافة الدوال للنطاق العالمي للوصول الفوري]:
window.changeDashboardTab = changeDashboardTab;
window.triggerLiveToggle = triggerLiveToggle;
window.saveGlobalNotice = saveGlobalNotice;
window.updateTaxRate = updateTaxRate;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrderLive = deleteOrderLive;
window.resolveForgotPasswordRequest = resolveForgotPasswordRequest;
window.openZoom = openZoom;
window.closeZoom = closeZoom;
window.openSliderModal = openSliderModal;
window.closeSliderModal = closeSliderModal;
window.handleSliderSubmit = handleSliderSubmit;
window.deleteSliderLive = deleteSliderLive;
window.previewImages = previewImages;
window.handleProductSubmit = handleProductSubmit;
window.triggerProductEdit = triggerProductEdit;
window.duplicateProductLive = duplicateProductLive;
window.openAddProductModal = openAddProductModal;
window.closeProductModal = closeProductModal;
window.resetProductForm = resetProductForm;
window.deleteProductLive = deleteProductLive;
window.approveStaffRow = approveStaffRow;
window.approveStaffLive = approveStaffLive;
window.rejectStaffLive = rejectStaffLive;
window.removeActiveStaffLive = removeActiveStaffLive;
window.toggleAdminTheme = toggleAdminTheme;
window.deleteUserLive = deleteUserLive;
window.contactUserLive = contactUserLive;
window.previewKoshkCardImageLive = previewKoshkCardImageLive;
window.fetchAndFillHomepageCardsSettings = fetchAndFillHomepageCardsSettings;
window.deleteMaintenanceMessageLive = deleteMaintenanceMessageLive;