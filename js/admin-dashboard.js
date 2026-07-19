import { db, auth } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    onSnapshot,
    orderBy,
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ====== DASHBOARD TAB SWITCHING ======
window.changeDashboardTab = function(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(tab => {
        tab.classList.remove('active-pane');
    });
    
    // Remove active class from nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById('tab-' + tabName);
    if (selectedTab) {
        selectedTab.classList.add('active-pane');
    }
    
    // Add active class to clicked nav link
    if (event && event.target) {
        const closestLink = event.target.closest('.nav-link');
        if (closestLink) closestLink.classList.add('active');
    }
    
    // Load data for specific tabs
    if (tabName === 'live-center') {
        loadDashboardMetrics();
    } else if (tabName === 'product-vault') {
        // تم إلغاء الاستدعاء القديم المتكرر للاعتماد الكامل على منظومة onSnapshot الحية بملف admin.js لمنع تضارب الجداول
        if (typeof window.loadProductsLive === 'function') { window.loadProductsLive(); }
    } else if (tabName === 'visual-customizer') {
        loadVisualCustomizer();
    }
};

// ====== LIVE CENTER - METRICS ======
async function loadDashboardMetrics() {
    try {
        // Load orders for metrics
        const ordersRef = collection(db, 'orders');
        const ordersSnapshot = await getDocs(ordersRef);

        let totalSales = 0;
        let pendingOrders = 0;
        let shippingOrders = 0;
        let returnedSales = 0;
        let deliveredOrders = 0;

        ordersSnapshot.forEach((doc) => {
            const order = doc.data();
            // دعم قراءة الحقلين الماليين لتأكيد مزامنة داتا بيز المبيعات والمرتجع بدقة
            const amount = parseFloat(order.total) || parseFloat(order.totalAmount) || 0;
            if (order.status === 'delivered' || order.status === 'completed' || order.status === 'مكتمل / تم التسليم') {
                totalSales += amount;
                deliveredOrders++;
            } else if (order.status === 'pending' || order.status === 'معلق') {
                pendingOrders++;
            } else if (order.status === 'shipping' || order.status === 'جاري الشحن والتوصيل') {
                shippingOrders++;
            } else if (order.status === 'cancelled' || order.status === 'returned' || order.status === 'ملغي') {
                returnedSales += amount;
            }
        });

        // Update UI
        document.getElementById('totalSalesBox').textContent = totalSales.toLocaleString() + ' ج.م';
        document.getElementById('pendingOrdersBox').textContent = pendingOrders + ' طلبات';
        document.getElementById('shippingOrdersBox').textContent = shippingOrders + ' طلبات';
        document.getElementById('returnedSalesBox').textContent = returnedSales.toLocaleString() + ' ج.م';

    } catch (error) {
        console.error('Error loading dashboard metrics:', error);
    }
}

// ====== LIVE CENTER - TOGGLES ======
window.triggerLiveToggle = async function(toggleType) {
    try {
        // [مزامنة المسار الموحد لايف]: تحويل وتوحيد تفعيل الأزرار على المسار الرئيسي للمتجر system_settings
        const isChecked = document.getElementById(`${toggleType}Toggle`).checked;
        await setDoc(doc(db, "system_settings", toggleType), { value: isChecked }, { merge: true });

        const settingsRef = doc(db, 'adminSettings', 'general');
        const settingsDoc = await getDoc(settingsRef);
        
        let currentSettings = {};
        if (settingsDoc.exists()) {
            currentSettings = settingsDoc.data();
        }
        
        if (toggleType === 'maintenance') {
            currentSettings.maintenanceMode = isChecked;
        } else if (toggleType === 'cashback') {
            currentSettings.cashbackEnabled = isChecked;
        }
        
        await setDoc(settingsRef, currentSettings, { merge: true });
        
        const showToast = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.success : null);
        if (showToast) {
            showToast('تم تحديث الإعدادات بالسيرفر لايف بنجاح', 'success');
        }
        
    } catch (error) {
        console.error('Error updating toggle:', error);
        const showError = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.error : null);
        if (showError) {
            showError('حدث خطأ أثناء تحديث الإعدادات لايف', 'error');
        }
    }
};

// ====== ORDERS MODAL ======
window.openOrdersModal = async function() {
    document.getElementById('ordersModal').style.display = 'flex';
    await loadOrdersForModal();
};

window.closeOrdersModal = function() {
    document.getElementById('ordersModal').style.display = 'none';
};

async function loadOrdersForModal() {
    try {
        const ordersRef = collection(db, 'orders');
        const snapshot = await getDocs(ordersRef);
        
        const tbody = document.getElementById('modalOrdersTableBody');
        tbody.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const order = doc.data();
            const amount = parseFloat(order.total) || parseFloat(order.totalAmount) || 0;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doc.id.substring(0,8)}...</td>
                <td>${order.clientName || order.customerName || 'غير معروف'}</td>
                <td>${amount.toLocaleString()} ج.م</td>
                <td><span class="status-pill active-pill" style="background:rgba(255,153,0,0.1); color:#f59e0b;">${order.status || 'pending'}</span></td>
                <td>
                    <select class="custom-select" style="padding:4px 8px; font-size:12px; width:auto;" onchange="window.updateOrderStatus('${doc.id}', this.value)">
                        <option value="pending" ${order.status === 'pending' || order.status === 'معلق' ? 'selected' : ''}>معلق</option>
                        <option value="shipping" ${order.status === 'shipping' || order.status === 'جاري الشحن والتوصيل' ? 'selected' : ''}>جاري الشحن</option>
                        <option value="delivered" ${order.status === 'delivered' || order.status === 'مكتمل / تم التسليم' ? 'selected' : ''}>تم التسليم</option>
                        <option value="cancelled" ${order.status === 'cancelled' || order.status === 'ملغي' ? 'selected' : ''}>ملغي</option>
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            status: newStatus,
            updatedAt: new Date()
        });
        
        const showToast = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.success : null);
        if (showToast) {
            showToast('تم تحديث حالة الطلب بنجاح وتعديلها بالداتا بيز!', 'success');
        }
        
        await loadOrdersForModal();
        await loadDashboardMetrics();
        
    } catch (error) {
        console.error('Error updating order status:', error);
        const showError = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.error : null);
        if (showError) {
            showError('حدث خطأ أثناء تحديث الحالة', 'error');
        }
    }
};

// ====== MAINTENANCE MESSAGES MODAL ======
window.openMaintenanceMessagesModal = async function() {
    document.getElementById('maintenanceMessagesModal').style.display = 'flex';
    await loadMaintenanceMessages();
};

window.closeMaintenanceMessagesModal = function() {
    document.getElementById('maintenanceMessagesModal').style.display = 'none';
};

async function loadMaintenanceMessages() {
    try {
        const messagesRef = collection(db, 'maintenance_messages');
        const snapshot = await getDocs(messagesRef);
        
        const tbody = document.getElementById('maintenanceMessagesTableBody');
        tbody.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const message = doc.data();
            const row = document.createElement('tr');
            const dateStr = message.sentAt ? new Date(message.sentAt.seconds * 1000).toLocaleDateString('ar-EG') : 'الآن';
            row.innerHTML = `
                <td>${message.name || 'غير معروف'}</td>
                <td>${message.email || 'غير معروف'}</td>
                <td>${message.message || 'لا يوجد'}</td>
                <td>${dateStr}</td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading maintenance messages:', error);
    }
};

// ====== PRODUCT VAULT ======
async function loadProductsForAdmin() {
    try {
        const productsRef = collection(db, 'products');
        const snapshot = await getDocs(productsRef);
        
        const tbody = document.getElementById('adminProductsTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const product = doc.data();
                const row = document.createElement('tr');
                const imgUrl = (product.images && product.images.length > 0) ? product.images[0] : 'https://via.placeholder.com/40';
                row.innerHTML = `
                    <td>
                        <div class="table-product-cell">
                            <div class="table-prod-img" onclick="window.openZoom('${imgUrl}')">
                                <img src="${imgUrl}" alt="${product.name}">
                            </div>
                            <span>${product.name || 'غير معروف'}</span>
                        </div>
                    </td>
                    <td>${product.category || 'غير معروف'}</td>
                    <td>${product.price?.toLocaleString() || 0} ج.م</td>
                    <td>${product.stock || 0} قطعة</td>
                    <td><span class="status-pill active-pill">نشط لايف</span></td>
                    <td>
                        <button class="action-circle-btn edit-btn" onclick="window.triggerProductEdit('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-circle-btn duplicate-btn" style="background:#8b5cf6;" onclick="window.duplicateProductLive('${doc.id}')">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="action-circle-btn delete-btn" onclick="window.deleteProductLive('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// ====== VISUAL CUSTOMIZER ======
async function loadVisualCustomizer() {
    try {
        const settingsRef = doc(db, 'adminSettings', 'general');
        const settingsDoc = await getDoc(settingsRef);

        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();

            // Load content settings
            if (settings.heroTitle) {
                document.getElementById('heroTitle').value = settings.heroTitle;
            }
            if (settings.heroSubtitle) {
                document.getElementById('heroSubtitle').value = settings.heroSubtitle;
            }
            if (settings.heroButtonText) {
                document.getElementById('heroButtonText').value = settings.heroButtonText;
            }

            // Load element toggles
            if (settings.showHeroSlider !== undefined) {
                document.getElementById('showHeroSlider').checked = settings.showHeroSlider;
            }
            if (settings.showCategoryCarousel !== undefined) {
                document.getElementById('showCategoryCarousel').checked = settings.showCategoryCarousel;
            }
            if (settings.showQuickCategories !== undefined) {
                document.getElementById('showQuickCategories').checked = settings.showQuickCategories;
            }

            // Load suggested products count
            if (settings.suggestedProductsCount) {
                document.getElementById('suggestedProductsCount').value = settings.suggestedProductsCount;
            }
        }

    } catch (error) {
        console.error('Error loading visual customizer settings:', error);
    }
}

window.updatePreviewColor = function(colorType, colorValue) {
    if (colorType === 'primary') {
        document.getElementById('primaryColorValue').textContent = colorValue;
    } else if (colorType === 'text') {
        document.getElementById('textColorValue').textContent = colorValue;
    } else if (colorType === 'background') {
        document.getElementById('bgColorValue').textContent = colorValue;
    }
};

window.updatePreviewFontSize = function(fontSize) {
    const previewFrame = document.getElementById('livePreview');
    if (previewFrame && previewFrame.contentDocument) {
        previewFrame.contentDocument.body.style.fontSize = fontSize;
    }
};

window.updatePreviewFontFamily = function(fontFamily) {
    const previewFrame = document.getElementById('livePreview');
    if (previewFrame && previewFrame.contentDocument) {
        previewFrame.contentDocument.body.style.fontFamily = fontFamily;
    }
};

window.toggleElement = function(elementId, show) {
    const previewFrame = document.getElementById('livePreview');
    if (previewFrame && previewFrame.contentDocument) {
        const element = previewFrame.contentDocument.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }
};

window.updateSuggestedProductsCount = function(count) {
    // Update suggested products count setting
};

window.openSuggestedProductsManager = function() {
    const showToast = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.info : null);
    if (showToast) {
        showToast('مدير المنتجات المقترحة قيد التحكم الإداري الحي', 'success');
    }
};

window.saveVisualCustomizations = async function() {
    try {
        const settings = {
            heroTitle: document.getElementById('heroTitle') ? document.getElementById('heroTitle').value : '',
            heroSubtitle: document.getElementById('heroSubtitle') ? document.getElementById('heroSubtitle').value : '',
            heroButtonText: document.getElementById('heroButtonText') ? document.getElementById('heroButtonText').value : '',
            showHeroSlider: document.getElementById('showHeroSlider').checked,
            showCategoryCarousel: document.getElementById('showCategoryCarousel').checked,
            showQuickCategories: document.getElementById('showQuickCategories').checked,
            suggestedProductsCount: parseInt(document.getElementById('suggestedProductsCount').value),
            updatedAt: new Date()
        };

        const settingsRef = doc(db, 'adminSettings', 'general');
        await setDoc(settingsRef, settings, { merge: true });

        const showToast = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.success : null);
        if (showToast) {
            showToast('تم حفظ التعديلات البصرية بنجاح', 'success');
        }

    } catch (error) {
        console.error('Error saving visual customizations:', error);
        const showError = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.error : null);
        if (showError) {
            showError('حدث خطأ أثناء حفظ التعديلات', 'error');
        }
    }
};

window.resetVisualCustomizations = async function() {
    try {
        const defaultSettings = {
            primaryColor: '#ff9900',
            textColor: '#1a1e22',
            backgroundColor: '#ffffff',
            fontSize: '16px',
            fontFamily: "'Cairo', sans-serif",
            showHeroSlider: true,
            showCategoryCarousel: true,
            showQuickCategories: true,
            suggestedProductsCount: 4,
            updatedAt: new Date()
        };
        
        const settingsRef = doc(db, 'adminSettings', 'general');
        await setDoc(settingsRef, defaultSettings, { merge: true });
        
        await loadVisualCustomizer();
        
        const showToast = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.success : null);
        if (showToast) {
            showToast('تم إعادة تعيين الإعدادات الافتراضية', 'success');
        }
        
    } catch (error) {
        console.error('Error resetting visual customizations:', error);
        const showError = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.error : null);
        if (showError) {
            showError('حدث خطأ أثناء إعادة التعيين', 'error');
        }
    }
};

window.refreshPreview = function() {
    const previewFrame = document.getElementById('livePreview');
    if (previewFrame) {
        previewFrame.src = previewFrame.src;
    }
};

window.openSiteInNewTab = function() {
    window.open('index.html', '_blank');
};

// ====== PRODUCT MANAGEMENT ======
window.editProduct = function(productId) {
    if (typeof window.triggerProductEdit === 'function') {
        window.triggerProductEdit(productId);
    }
};

window.duplicateProduct = async function(productId) {
    if (typeof window.duplicateProductLive === 'function') {
        window.duplicateProductLive(productId);
    }
};

window.deleteProduct = async function(productId) {
    if (typeof window.deleteProductLive === 'function') {
        window.deleteProductLive(productId);
    }
};

// ====== CONTENT MANAGER ======
document.addEventListener('DOMContentLoaded', function() {
    const contentForm = document.getElementById('globalConstantsForm');
    if (contentForm) {
        contentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const contentData = {
                    aboutUs: document.getElementById('cAboutUs').value,
                    privacy: document.getElementById('cPrivacy').value,
                    updatedAt: new Date()
                };
                
                const contentRef = doc(db, 'siteContent', 'general');
                await setDoc(contentRef, contentData, { merge: true });
                
                const showToast = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.success : null);
                if (showToast) {
                    showToast('تم حفظ المحتوى بنجاح', 'success');
                }
                
            } catch (error) {
                console.error('Error saving content:', error);
                const showError = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.error : null);
                if (showError) {
                    showError('حدث خطأ أثناء حفظ المحتوى', 'error');
                }
            }
        });
    }
    
    loadSiteContent();
});

async function loadSiteContent() {
    try {
        const contentRef = doc(db, 'siteContent', 'general');
        const contentDoc = await getDoc(contentRef);
        
        if (contentDoc.exists()) {
            const content = contentDoc.data();
            
            if (content.aboutUs && document.getElementById('cAboutUs')) {
                document.getElementById('cAboutUs').value = content.aboutUs;
            }
            if (content.privacy && document.getElementById('cPrivacy')) {
                document.getElementById('cPrivacy').value = content.privacy;
            }
        }
        
    } catch (error) {
        console.error('Error loading site content:', error);
    }
}

// ====== SHIPPING GATEWAYS ======
document.addEventListener('DOMContentLoaded', function() {
    const gatewaysForm = document.getElementById('koshkLiveGatewaysFormBlock');
    if (gatewaysForm) {
        gatewaysForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const gatewaysData = {
                    vodafoneCash: document.getElementById('gVodafone').value,
                    etisalatCash: document.getElementById('gEtisalat').value,
                    updatedAt: new Date()
                };
                
                const gatewaysRef = doc(db, 'paymentGateways', 'cash');
                await setDoc(gatewaysRef, gatewaysData, { merge: true });
                
                const showToast = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.success : null);
                if (showToast) {
                    showToast('تم حفظ بوابات الدفع بنجاح', 'success');
                }
                
            } catch (error) {
                console.error('Error saving payment gateways:', error);
                const showError = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.error : null);
                if (showError) {
                    showError('حدث خطأ أثناء حفظ بوابات الدفع', 'error');
                }
            }
        });
    }
    
    loadPaymentGateways();
});

async function loadPaymentGateways() {
    try {
        const gatewaysRef = doc(db, 'paymentGateways', 'cash');
        const gatewaysDoc = await getDoc(gatewaysRef);
        
        if (gatewaysDoc.exists()) {
            const gateways = gatewaysDoc.data();
            
            if (gateways.vodafoneCash && document.getElementById('gVodafone')) {
                document.getElementById('gVodafone').value = gateways.vodafoneCash;
            }
            if (gateways.etisalatCash && document.getElementById('gEtisalat')) {
                document.getElementById('gEtisalat').value = gateways.etisalatCash;
            }
        }
        
    } catch (error) {
        console.error('Error loading payment gateways:', error);
    }
}

// ====== THEME TOGGLE ======
window.toggleAdminTheme = function() {
    document.body.classList.toggle('light-mode');
    
    const icon = document.getElementById('main-theme-icon');
    if (document.body.classList.contains('light-mode')) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
};

// ====== IMAGE MANAGEMENT ======
window.openImageManager = async function(imageType) {
    try {
        if (imageType === 'heroCards') {
            const images = await window.FirebaseData?.getHeroCardsImages() || [];
            displayImageManagerModal('heroCards', images);
        } else if (imageType === 'slider') {
            const images = await window.FirebaseData?.getSliderImages() || [];
            displayImageManagerModal('slider', images);
        }
    } catch (error) {
        console.error('Error opening image manager:', error);
        const showError = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.error : null);
        if (showError) {
            showError('حدث خطأ أثناء فتح مدير الصور', 'error');
        }
    }
};

function displayImageManagerModal(imageType, images) {
    const modalId = imageType === 'heroCards' ? 'heroCardsModal' : 'sliderModal';
    const modal = document.getElementById(modalId);
    
    if (!modal) {
        const modalHTML = `
            <div id="${modalId}" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2>${imageType === 'heroCards' ? 'إدارة صور الكروت' : 'إدارة صور السلايدر'}</h2>
                        <button onclick="document.getElementById('${modalId}').style.display='none'" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                    </div>
                    <div id="${modalId}Images" class="images-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-bottom: 20px;">
                        ${images.map((img, index) => `
                            <div class="image-item" style="position: relative;">
                                <img src="${img}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px;">
                                <button onclick="window.removeImage('${imageType}', ${index})" style="position: absolute; top: 5px; right: 5px; background: rgba(239, 68, 68, 0.8); color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer;">&times;</button>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 700;">إضافة صورة جديدة</label>
                        <input type="text" id="${modalId}NewImage" placeholder="أدخل رابط الصورة" style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px;">
                    </div>
                    <button onclick="window.addImage('${imageType}')" style="background: #FF9900; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 700;">إضافة صورة</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById(modalId).style.display = 'flex';
    } else {
        modal.style.display = 'flex';
    }
}

window.addImage = async function(imageType) {
    try {
        const modalId = imageType === 'heroCards' ? 'heroCardsModal' : 'sliderModal';
        const imageInput = document.getElementById(modalId + 'NewImage');
        const imageUrl = imageInput.value.trim();
        
        if (!imageUrl) {
            const showError = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.error : null);
            if (showError) {
                showError('يرجى إدخال رابط الصورة', 'error');
            }
            return;
        }
        
        let currentImages = [];
        if (imageType === 'heroCards') {
            currentImages = await window.FirebaseData?.getHeroCardsImages() || [];
            currentImages.push(imageUrl);
            await window.FirebaseData?.updateHeroCardsImages(currentImages);
        } else if (imageType === 'slider') {
            currentImages = await window.FirebaseData?.getSliderImages() || [];
            currentImages.push(imageUrl);
            await window.FirebaseData?.updateSliderImages(currentImages);
        }
        
        imageInput.value = '';
        displayImageManagerModal(imageType, currentImages);
        
        const showToast = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.success : null);
        if (showToast) {
            showToast('تمت إضافة الصورة بنجاح', 'success');
        }
        
    } catch (error) {
        console.error('Error adding image:', error);
        const showError = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.error : null);
        if (showError) {
            showError('حدث خطأ أثناء إضافة الصورة', 'error');
        }
    }
};

window.removeImage = async function(imageType, index) {
    try {
        let currentImages = [];
        if (imageType === 'heroCards') {
            currentImages = await window.FirebaseData?.getHeroCardsImages() || [];
            currentImages.splice(index, 1);
            await window.FirebaseData?.updateHeroCardsImages(currentImages);
        } else if (imageType === 'slider') {
            currentImages = await window.FirebaseData?.getSliderImages() || [];
            currentImages.splice(index, 1);
            await window.FirebaseData?.updateSliderImages(currentImages);
        }
        
        displayImageManagerModal(imageType, currentImages);
        
        const showToast = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.success : null);
        if (showToast) {
            showToast('تم حذف الصورة بنجاح', 'success');
        }
        
    } catch (error) {
        console.error('Error removing image:', error);
        const showError = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.error : null);
        if (showError) {
            showError('حدث خطأ أثناء حذف الصورة', 'error');
        }
    }
};

// ====== REVIEWS MANAGEMENT ======
window.openReviewsManager = async function() {
    try {
        const reviews = await window.FirebaseData?.getReviews() || [];
        displayReviewsManagerModal(reviews);
    } catch (error) {
        console.error('Error opening reviews manager:', error);
        const showError = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.error : null);
        if (showError) {
            showError('حدث خطأ أثناء فتح مدير التقييمات', 'error');
        }
    }
};

function displayReviewsManagerModal(reviews) {
    const modal = document.getElementById('reviewsModal');
    
    if (!modal) {
        const modalHTML = `
            <div id="reviewsModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center;">
                <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2>إدارة التقييمات والتعليقات</h2>
                        <button onclick="document.getElementById('reviewsModal').style.display='none'" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                    </div>
                    <div id="reviewsContainer">
                        ${reviews.map(review => `
                            <div class="review-item" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <div>
                                        <strong>${review.userName || 'مستخدم'}</strong>
                                        <span style="color: #64748b; font-size: 12px; margin-right: 10px;">${review.rating}/5</span>
                                    </div>
                                    <span class="status-pill ${review.approved ? 'active-pill' : ''}" style="background: ${review.approved ? 'rgba(45, 212, 191, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${review.approved ? '#2dd4bf' : '#ef4444'}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">
                                        ${review.approved ? 'معروض' : 'غير معروض'}
                                    </span>
                                </div>
                                <p style="color: #64748b; margin-bottom: 10px;">${review.comment || 'لا يوجد تعليق'}</p>
                                <div style="display: flex; gap: 10px;">
                                    <button onclick="window.toggleReviewApproval('${review.id}', ${!review.approved})" style="background: ${review.approved ? '#ef4444' : '#2dd4bf'}; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                        ${review.approved ? 'إخفاء' : 'عرض'}
                                    </button>
                                    <button onclick="window.deleteReview('${review.id}')" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">حذف</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.getElementById('reviewsModal').style.display = 'flex';
    } else {
        modal.style.display = 'flex';
    }
}

window.toggleReviewApproval = async function(reviewId, approved) {
    try {
        await window.FirebaseData?.updateReviewStatus(reviewId, approved);
        const reviews = await window.FirebaseData?.getReviews() || [];
        displayReviewsManagerModal(reviews);
        
        const showToast = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.success : null);
        if (showToast) {
            showToast('تم تحديث حالة التقييم بنجاح', 'success');
        }
    } catch (error) {
        console.error('Error toggling review approval:', error);
    }
};

window.deleteReview = async function(reviewId) {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم؟')) {
        return;
    }
    
    try {
        await window.FirebaseData?.deleteReview(reviewId);
        const reviews = await window.FirebaseData?.getReviews() || [];
        displayReviewsManagerModal(reviews);
        
        const showToast = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.success : null);
        if (showToast) {
            showToast('تم حذف التقييم بنجاح', 'success');
        }
    } catch (error) {
        console.error('Error deleting review:', error);
    }
};

// ====== PAYMENT GATEWAYS ENHANCED ======
window.loadPaymentGatewaysEnhanced = async function() {
    try {
        const gateways = await window.FirebaseData?.getPaymentGateways() || {};
        
        if (gateways.vodafoneCash && document.getElementById('gVodafone')) {
            document.getElementById('gVodafone').value = gateways.vodafoneCash;
        }
        if (gateways.etisalatCash && document.getElementById('gEtisalat')) {
            document.getElementById('gEtisalat').value = gateways.etisalatCash;
        }
        if (gateways.orangeCash && document.getElementById('gOrange')) {
            document.getElementById('gOrange').value = gateways.orangeCash;
        }
        if (gateways.instapay && document.getElementById('gInstapay')) {
            document.getElementById('gInstapay').value = gateways.instapay;
        }
        if (gateways.bankAccount && document.getElementById('gBankAccount')) {
            document.getElementById('gBankAccount').value = gateways.bankAccount;
        }
        
    } catch (error) {
        console.error('Error loading payment gateways:', error);
    }
};

window.savePaymentGatewaysEnhanced = async function() {
    try {
        const gatewaysData = {
            vodafoneCash: document.getElementById('gVodafone').value,
            etisalatCash: document.getElementById('gEtisalat').value,
            orangeCash: document.getElementById('gOrange').value,
            instapay: document.getElementById('gInstapay').value,
            bankAccount: document.getElementById('gBankAccount').value,
            updatedAt: new Date()
        };
        
        await window.FirebaseData?.updatePaymentGateways(gatewaysData);
        
        const showToast = window.showKoshkToast || (window.KoshkToast ? window.KoshkToast.success : null);
        if (showToast) {
            showToast('تم حفظ بوابات الدفع بنجاح', 'success');
        }
        
    } catch (error) {
        console.error('Error saving payment gateways:', error);
    }
};

// ====== MAINTENANCE MODE ======
window.checkMaintenanceMode = async function() {
    try {
        const settings = await window.FirebaseData?.getAdminSettings() || {};
        if (settings.maintenanceMode) {
            document.body.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f1f5f9; text-align: center; padding: 20px;">
                    <div style="font-size: 80px; margin-bottom: 20px;">🔧</div>
                    <h1 style="color: #1a1e22; margin-bottom: 10px;">الموقع في وضع الصيانة</h1>
                    <p style="color: #64748b; max-width: 500px;">نحن نقوم بتحسينات على الموقع. سنعود قريباً بشيء أفضل!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error checking maintenance mode:', error);
    }
};

// Initialize maintenance check on page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname !== '/admin.html') {
        window.checkMaintenanceMode();
    }
    // شحن أولي للمقاييس فور فتح لوحة التحكم
    loadDashboardMetrics();
});