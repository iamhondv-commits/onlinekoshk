import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// تم تعديل الاستدعاء ليعتمد على التخزين المؤقت في الميموري لزيادة سرعة استدعاء المنتجات الفورية
function renderStoreProducts(targetContainerId, selectedCategory = 'all') {
    const container = document.getElementById(targetContainerId);
    if (!container) return;

    onSnapshot(collection(db, "products"), (snapshot) => {
        container.innerHTML = '';
        
        let hasProducts = false;
        
        snapshot.forEach((docSnap) => {
            const prod = docSnap.data();
            const docId = docSnap.id;
            
            if (selectedCategory !== 'all' && prod.category !== selectedCategory) {
                return;
            }
            
            hasProducts = true;
            
            const mainImg = (prod.images && prod.images.length > 0) ? prod.images[0] : 'https://via.placeholder.com/300?text=Online+Koshk';
            
            let badgeHtml = '';
            if (prod.badge) {
                badgeHtml = `<span class="store-prod-badge" style="position:absolute; top:10px; right:10px; background:#ef8121; color:#ffffff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; z-index:2;">${prod.badge}</span>`;
            }

            let priceHtml = `<span class="current-price" style="color:#1c486f; font-weight:700; font-size:16px;">${prod.price} ج.م</span>`;
            if (prod.discountPrice) {
                priceHtml = `
                    <span class="current-price" style="color:#ef8121; font-weight:700; font-size:16px;">${prod.discountPrice} ج.م</span>
                    <span class="old-price" style="text-decoration: line-through; color: #64748b; font-size: 12px; margin-right: 8px;">${prod.price} ج.م</span>
                `;
            }

            const card = document.createElement('div');
            card.className = 'product-ecommerce-card';
            card.style = 'background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:15px; position:relative; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 6px rgba(0,0,0,0.02); transition:transform 0.2s;';
            card.innerHTML = `
                ${badgeHtml}
                <div class="prod-img-wrapper" style="width:100%; height:200px; display:flex; align-items:center; justify-content:center; overflow:hidden; border-radius:8px; margin-bottom:12px;">
                    <img src="${mainImg}" style="max-width:100%; max-height:100%; object-fit:contain;">
                </div>
                <div class="prod-info-block" style="text-align:right;">
                    <span class="brand-caption" style="font-size:11px; color:#ef8121; font-weight:700; display:block;">${prod.brand}</span>
                    <h3 class="prod-title" style="font-size:14px; font-weight:600; color:#1c486f; margin:4px 0 8px 0; min-height:40px; line-height:1.4;">${prod.name}</h3>
                    <div class="price-row" style="margin-bottom:12px;">
                        ${priceHtml}
                    </div>
                    <p style="font-size:11px; color:#64748b; margin-bottom:10px;">الضمان: ${prod.warranty || 'لا يوجد ضمان'}</p>
                </div>
                <button class="add-to-cart-btn" onclick="event.stopPropagation(); window.triggerAddToCartStepLive('${docId}', '${prod.name}', '${prod.discountPrice || prod.price}', '${mainImg}', '${prod.category}')" style="width:100%; background:#1c486f; color:#ffffff; border:none; padding:10px; border-radius:6px; font-family:\'Cairo\'; font-size:13px; font-weight:700; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background=\'#ef8121\'" onmouseout="this.style.background=\'#1c486f\'">
                    <i class="fas fa-shopping-cart" style="margin-left:6px;"></i> أضف إلى السلة
                </button>
            `;
            
            container.appendChild(card);
        });

        if (!hasProducts) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#64748b; font-weight:600;">لا توجد منتجات متاحة في هذا القسم حالياً</div>';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderStoreProducts('homepage-products-grid', 'all');
    renderStoreProducts('electronics-products-grid', 'إلكترونيات');
    renderStoreProducts('clothing-products-grid', 'ملابس رجالي');
});