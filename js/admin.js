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

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'auth.html';
    }
});

document.getElementById('adminLogoutLink').addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
        window.location.href = 'auth.html';
    });
});

function changeDashboardTab(tabName) {
    const panes = document.querySelectorAll('.tab-pane');
    const links = document.querySelectorAll('.sidebar-navigation .nav-link');
    
    panes.forEach(pane => pane.classList.remove('active-pane'));
    links.forEach(link => link.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active-pane');
    
    const tabsOrder = ['live-center', 'product-vault', 'dynamic-slider', 'content-manager', 'reviews-moderator', 'shipping-gateways-vault', 'staff-permissions', 'forgot-passwords-vault', 'contact-dashboard-vault'];
    const targetIndex = tabsOrder.indexOf(tabName);
    if(targetIndex !== -1) {
        links[targetIndex].classList.add('active');
    }
}
window.changeDashboardTab = changeDashboardTab;

async function triggerLiveToggle(type) {
    const isChecked = document.getElementById(`${type}Toggle`).checked;
    try {
        await setDoc(doc(db, "system_settings", type), { value: isChecked }, { merge: true });
        showToast(`تم تحديث حالة (${type}) في السيرفر بنجاح!`, "success");
    } catch (err) {
        console.error(err);
        showToast("فشل تحديث الإعدادات لايف", "error");
    }
}
window.triggerLiveToggle = triggerLiveToggle;

async function saveGlobalNotice() {
    const text = document.getElementById('globalNoticeText').value;
    try {
        await setDoc(doc(db, "system_settings", "globalNotice"), { value: text }, { merge: true });
        showToast(`تم بنجاح ربط وحقن الشعار العاجل لايف: ${text}`, "success");
    } catch (err) {
        showToast("فشل تحديث شريط الإعلانات", "error");
    }
}
window.saveGlobalNotice = saveGlobalNotice;

async function updateTaxRate() {
    const rate = document.getElementById('taxRateInput').value;
    try {
        await setDoc(doc(db, "system_settings", "taxRate"), { value: parseFloat(rate) }, { merge: true });
        showToast(`تم تحديث قيمة ضريبة الشراء العامة لتصبح: ${rate}%`, "success");
    } catch (err) {
        showToast("فشل تحديث نسبة الضريبة", "error");
    }
}
window.updateTaxRate = updateTaxRate;

function listenToSystemSettings() {
    const toggles = ['maintenance', 'cashback', 'freeShipping', 'tracking'];
    toggles.forEach(type => {
        onSnapshot(doc(db, "system_settings", type), (docSnap) => {
            if (docSnap.exists()) {
                const isMaintenanceActive = docSnap.data().value;
                const el = document.getElementById(`${type}Toggle`);
                if(el) el.checked = isMaintenanceActive;
                
                if (type === 'maintenance' && isMaintenanceActive && window.location.pathname.includes('index.html')) {
                    window.location.href = 'maintenance.html'; 
                }
            }
        });
    });
    onSnapshot(doc(db, "system_settings", "globalNotice"), (docSnap) => {
        if (docSnap.exists()) document.getElementById('globalNoticeText').value = docSnap.data().value || '';
    });
    onSnapshot(doc(db, "system_settings", "taxRate"), (docSnap) => {
        if (docSnap.exists()) document.getElementById('taxRateInput').value = docSnap.data().value || '14';
    });
}

function listenToOrdersAndFinance() {
    onSnapshot(collection(db, "orders"), (snapshot) => {
        let totalSales = 0;
        let pendingCount = 0;
        let returnedSales = 0;
        let shippingCount = 0;
        const modalTableBody = document.getElementById('modalOrdersTableBody');
        modalTableBody.innerHTML = '';

        if (snapshot.empty) {
            document.getElementById('totalSalesBox').innerText = "0 ج.م";
            document.getElementById('pendingOrdersBox').innerText = "0 طلبات";
            document.getElementById('returnedSalesBox').innerText = "0 ج.م";
            document.getElementById('shippingOrdersBox').innerText = "0 طلبات";
            modalTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد طلبات في المتجر حالياً</td></tr>';
            return;
        }

        snapshot.forEach(docSnap => {
            const order = docSnap.data();
            const orderId = docSnap.id;
            const amount = parseFloat(order.total) || 0;
            
            if (order.status === 'delivered' || order.status === 'مكتمل / تم التسليم') {
                totalSales += amount;
            } else if (order.status === 'pending' || order.status === 'معلق') {
                pendingCount++;
            } else if (order.status === 'cancelled' || order.status === 'ملغي') {
                returnedSales += amount;
            } else if (order.status === 'shipping' || order.status === 'جاري الشحن والتوصيل') {
                shippingCount++;
            }
            
            const row = document.createElement('tr');
            let statusPillColor = order.status === 'pending' ? '#f59e0b' : order.status === 'shipping' ? '#3b82f6' : order.status === 'delivered' ? '#10b981' : '#ef4444';
            row.innerHTML = `
                <td>${orderId.substring(0,8)}...</td>
                <td>${order.clientName || 'عميل مجهول'}</td>
                <td>${amount} ج.م</td>
                <td><span class="status-pill active-pill" style="background:rgba(255,153,0,0.1); color:${statusPillColor};">${order.status}</span></td>
                <td>
                    <select class="custom-select" style="padding:4px 8px; font-size:12px; width:auto;" onchange="updateOrderStatus('${orderId}', this.value)">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>معلق</option>
                        <option value="shipping" ${order.status === 'shipping' ? 'selected' : ''}>جاري الشحن والتوصيل</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>مكتمل / تم التسليم</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
                    </select>
                </td>
            `;
            modalTableBody.appendChild(row);
        });

        document.getElementById('totalSalesBox').innerText = `${totalSales.toLocaleString()} ج.م`;
        document.getElementById('pendingOrdersBox').innerText = `${pendingCount} طلبات`;
        document.getElementById('returnedSalesBox').innerText = `${returnedSales.toLocaleString()} ج.م`;
        document.getElementById('shippingOrdersBox').innerText = `${shippingCount} طلبات`;
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
window.updateOrderStatus = updateOrderStatus;

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
window.resolveForgotPasswordRequest = resolveForgotPasswordRequest;

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

window.openOrdersModal = function() { document.getElementById('ordersModal').style.display = 'flex'; }
window.closeOrdersModal = function() { document.getElementById('ordersModal').style.display = 'none'; }
window.openMaintenanceMessagesModal = function() { document.getElementById('maintenanceMessagesModal').style.display = 'flex'; }
window.closeMaintenanceMessagesModal = function() { document.getElementById('maintenanceMessagesModal').style.display = 'none'; }

function listenToMaintenanceMessages() {
    const tbody = document.getElementById('maintenanceMessagesTableBody');
    onSnapshot(collection(db, "maintenance_messages"), (snapshot) => {
        if(!tbody) return;
        tbody.innerHTML = '';
        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#64748b;">لا توجد رسائل واردة</td></tr>';
            return;
        }
        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            const row = document.createElement('tr');
            const dateStr = msg.sentAt ? new Date(msg.sentAt.seconds * 1000).toLocaleDateString('ar-EG') : 'الآن';
            row.innerHTML = `
                <td>${msg.name || ''}</td>
                <td>${msg.email || ''}</td>
                <td>${msg.message || ''}</td>
                <td>${dateStr}</td>
            `;
            tbody.appendChild(row);
        });
    });
}

function openZoom(imgSrc) {
    const overlay = document.getElementById('zoomOverlay');
    const zoomedImg = document.getElementById('zoomedImg');
    zoomedImg.src = imgSrc;
    overlay.style.display = 'flex';
    setTimeout(() => { overlay.classList.add('open'); }, 10);
}
window.openZoom = openZoom;

function closeZoom() {
    const overlay = document.getElementById('zoomOverlay');
    overlay.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
}
window.closeZoom = closeZoom;

function openSliderModal() { document.getElementById('sliderModalCard').style.display = 'block'; }
window.openSliderModal = openSliderModal;

function closeSliderModal() { document.getElementById('sliderModalCard').style.display = 'none'; }
window.closeSliderModal = closeSliderModal;

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
window.handleSliderSubmit = handleSliderSubmit;

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
window.deleteSliderLive = deleteSliderLive;

let encodedImageString = "";

function previewImages(event) {
    const gallery = document.getElementById('previewGallery');
    gallery.innerHTML = '';
    const file = event.target.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            encodedImageString = e.target.result;
            const box = document.createElement('div');
            box.className = 'preview-img-box';
            box.onclick = function() { openZoom(encodedImageString); };
            const img = document.createElement('img');
            img.src = encodedImageString;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-img-btn';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.onclick = function(event) {
                event.stopPropagation();
                box.remove();
                encodedImageString = "";
            };
            box.appendChild(img);
            box.appendChild(removeBtn);
            gallery.appendChild(box);
        };
        reader.readAsDataURL(file);
    }
}
window.previewImages = previewImages;

async function handleProductSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('mainSubmitBtn');
    const editingId = document.getElementById('pEditingId').value;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المزامنة...';

    const finalImageUrls = [];
    if (encodedImageString) {
        finalImageUrls.push(encodedImageString);
    } else {
        if(editingId) {
            const fallbackDoc = await getDoc(doc(db, "products", editingId));
            if(fallbackDoc.exists() && fallbackDoc.data().images) {
                finalImageUrls.push(...fallbackDoc.data().images);
            }
        } else {
            finalImageUrls.push('https://via.placeholder.com/300?text=Online+Koshk');
        }
    }

    const productPayload = {
        name: document.getElementById('pName').value,
        brand: document.getElementById('pBrand').value,
        category: document.getElementById('pCategory').value,
        sku: document.getElementById('pSku').value,
        price: parseFloat(document.getElementById('pPrice').value),
        discountPrice: parseFloat(document.getElementById('pDiscountPrice').value) || null,
        cost: parseFloat(document.getElementById('pCost').value),
        stock: parseInt(document.getElementById('pStock').value),
        minOrder: parseInt(document.getElementById('pMinOrder').value) || 1,
        weight: parseFloat(document.getElementById('pWeight').value) || null,
        warranty: document.getElementById('pWarranty').value || '',
        colors: document.getElementById('pColors').value.split(',').map(c => c.trim()).filter(c => c),
        sizes: document.getElementById('pSizes').value.split(',').map(s => s.trim()).filter(s => s),
        badge: document.getElementById('pBadge').value || '',
        desc: document.getElementById('pDesc').value,
        images: finalImageUrls,
        isDuplicate: editingId ? false : false
    };
    
    try {
        if (editingId) {
            await updateDoc(doc(db, "products", editingId), productPayload);
            showToast('تم حفظ كافة التعديلات على المنتج بنجاح!', "success");
        } else {
            productPayload.createdAt = new Date();
            await addDoc(collection(db, "products"), productPayload);
            showToast('تم نشر وحقن المنتج بنجاح بالمتجر لايف!', "success");
        }
        resetProductForm();
    } catch (error) {
        showToast('حدث خطأ أثناء المزامنة: ' + error.message, "error");
    } finally {
        submitBtn.disabled = false;
        resetProductForm();
    }
}
window.handleProductSubmit = handleProductSubmit;

window.triggerProductEdit = async function(docId) {
    const formTitle = document.getElementById('formActionTitle');
    const submitBtn = document.getElementById('mainSubmitBtn');
    formTitle.innerHTML = '<i class="fas fa-edit" style="color:#ef8121;"></i> تعديل بيانات المنتج الحالي';
    submitBtn.innerHTML = '<i class="fas fa-edit"></i> حفظ وتعديل المنتج الحالي لايف';
    submitBtn.style.background = "#ef8121";
    
    try {
        const docSnap = await getDoc(doc(db, "products", docId));
        if (docSnap.exists()) {
            const prod = docSnap.data();
            document.getElementById('pEditingId').value = docId;
            document.getElementById('pName').value = prod.name || '';
            document.getElementById('pBrand').value = prod.brand || '';
            document.getElementById('pCategory').value = prod.category || 'إلكترونيات';
            document.getElementById('pSku').value = prod.sku || '';
            document.getElementById('pPrice').value = prod.price || '';
            document.getElementById('pDiscountPrice').value = prod.discountPrice || '';
            document.getElementById('pCost').value = prod.cost || '';
            document.getElementById('pStock').value = prod.stock || '';
            document.getElementById('pMinOrder').value = prod.minOrder || '1';
            document.getElementById('pWeight').value = prod.weight || '';
            document.getElementById('pWarranty').value = prod.warranty || '';
            document.getElementById('pColors').value = (prod.colors || []).join(', ');
            document.getElementById('pSizes').value = (prod.sizes || []).join(', ');
            document.getElementById('pBadge').value = prod.badge || '';
            document.getElementById('pDesc').value = prod.desc || '';
            
            const gallery = document.getElementById('previewGallery');
            gallery.innerHTML = '';
            if (prod.images && prod.images.length > 0) {
                const box = document.createElement('div');
                box.className = 'preview-img-box';
                box.innerHTML = `<img src="${prod.images[0]}">`;
                gallery.appendChild(box);
            }
            window.scrollTo({ top: document.getElementById('formActionTitle').offsetTop - 20, behavior: 'smooth' });
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
window.duplicateProductLive = duplicateProductLive;

function resetProductForm() {
    const form = document.getElementById('productSubmissionForm');
    if (form) form.reset();
    document.getElementById('previewGallery').innerHTML = '';
    document.getElementById('pEditingId').value = "";
    encodedImageString = "";
    document.getElementById('formActionTitle').innerHTML = 'حقن منتج جديد بتفاصيل عميقة ومتقدمة جداً';
    const submitBtn = document.getElementById('mainSubmitBtn');
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> نشر وإتاحة فورية بالمتجر لايف';
    submitBtn.style.background = "#5EEAD4";
}
window.resetProductForm = resetProductForm;

function loadProductsLive() {
    const tbody = document.getElementById('adminProductsTableBody');
    onSnapshot(collection(db, "products"), (snapshot) => {
        if(!tbody) return;
        tbody.innerHTML = '';
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">المخزن فارغ تماماً</td></tr>';
            return;
        }
        snapshot.forEach((docSnap) => {
            const prod = docSnap.data();
            const docId = docSnap.id;
            const imgUrl = (prod.images && prod.images.length > 0) ? prod.images[0] : 'https://via.placeholder.com/40';
            
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
    const confirmAction = await showConfirm("حذف منتج", "هل أنت متأكد تماماً من رغبتك في حذف هذا المنتج من المخزن لايف?").
    if (confirmAction) {
        try {
            await deleteDoc(doc(db, "products", docId));
            showToast("تم حذف المنتج وإزالته نهائياً بنجاح.", "success");
        } catch (error) {
            showToast("فشل حذف المنتج: " + error.message, "error");
        }
    }
}
window.deleteProductLive = deleteProductLive;

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

document.getElementById('globalConstantsForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
        await setDoc(doc(db, "page_contents", "constants"), {
            aboutUs: document.getElementById('cAboutUs').value,
            privacy: document.getElementById('cPrivacy').value,
            facebook: document.getElementById('cFacebook').value,
            instagram: document.getElementById('cInstagram').value,
            hotline: document.getElementById('cHotline').value
        }, { merge: true });
        showToast('تم حفظ ونشر كل الثوابت والمحتويات لايف بنجاح بالتزامن مع جميع الصفحات الديناميكية للموقع!', "success");
    } catch(err) { 
        showToast("حدث خطأ أثناء حفظ الثوابت: " + err.message, "error"); 
    }
};

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
window.approveStaffRow = approveStaffRow;

async function approveStaffLive(docId, staffName, selectId, email, password) {
    await approveStaffRow(null, staffName, selectId, email, password);
    await deleteDoc(doc(db, "pending_staff", docId));
}
window.approveStaffLive = approveStaffLive;

async function rejectStaffLive(docId) {
    try {
        await deleteDoc(doc(db, "pending_staff", docId));
        showToast('تم رفض وطلب حذف حساب المشرف بنجاح.', "success");
    } catch (error) {
        showToast("حدث خطأ في الرفض", "error");
    }
}
window.rejectStaffLive = rejectStaffLive;

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
    const confirmAction = await showConfirm("طرد مشرف", "هل تريد بالتأكيد سحب الصلاحيات وطرد هذا الأدمن من النظام exchange؟");
    if (confirmAction) {
        try {
            await deleteDoc(doc(db, "active_staff", id));
            showToast("تم طرد المشرف بنجاح وسحب الصلاحية.", "success");
        } catch (err) {
            showToast("حدث خطأ في العملية", "error");
        }
    }
}
window.removeActiveStaffLive = removeActiveStaffLive;

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
window.toggleAdminTheme = toggleAdminTheme;

function listenToPendingReviewsLive() {
    const tbody = document.getElementById('adminPendingReviewsTableBody');
    if(!tbody) return;

    onSnapshot(query(collection(db, "reviews"), where("status", "==", "pending")), (snapshot) => {
        tbody.innerHTML = '';
        if(snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">لا توجد تقييمات معلقة حالياً</td></tr>';
            return;
        }
        snapshot.forEach(docSnap => {
            const review = docSnap.data();
            const docId = docSnap.id;
            const row = document.createElement('tr');
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
            tbody.appendChild(row);
        });
    });
}

window.approveKoshkReviewLive = async function(docId) {
    try {
        await updateDoc(doc(db, "reviews", docId), { status: "approved" });
        showToast("تم الموافقة على التقييم ونشره في صفحة المنتج فوراً!", "success");
    } catch(err) { showToast("فشل قبول التقييم: " + err.message, "error"); }
};

window.rejectKoshkReviewLive = async function(docId) {
    if(confirm("هل أنت متأكد من حذف ورفض هذا التقييم نهائياً؟")) {
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
            if(document.getElementById('gWe')) document.getElementById('gWe').value = data.we || '';
            if(document.getElementById('gFawry')) document.getElementById('gFawry').value = data.fawry || '';
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
            await setDoc(doc(db, "system_settings", "payment_accounts"), {
                vodafone: document.getElementById('gVodafone').value.trim(),
                etisalat: document.getElementById('gEtisalat').value.trim(),
                we: document.getElementById('gWe').value.trim(),
                fawry: document.getElementById('gFawry').value.trim()
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

document.addEventListener('DOMContentLoaded', () => {
    listenToSystemSettings();
    listenToOrdersAndFinance();
    listenToMaintenanceMessages();
    loadProductsLive();
    loadSlidersLive();
    listenToConstants();
    loadPendingStaff();
    loadActiveStaff();
    listenToPendingReviewsLive();
    listenToGatewaysAndShippingPolicyVaultLive();
    listenToForgotPasswordsLive();
    listenToDynamicContactMessagesLive();

    if (document.getElementById('productSubmissionForm')) {
        document.getElementById('productSubmissionForm').addEventListener('submit', handleProductSubmit);
    }
    if (localStorage.getItem('adminTheme') === 'light') {
        document.body.classList.add('light-mode');
    }
});