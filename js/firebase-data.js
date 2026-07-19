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
    limit,
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Global state
let productsCache = [];
let categoriesCache = [];
let ordersCache = [];
let usersCache = [];

// ====== PRODUCTS FUNCTIONS ======

// Load all products from Firebase
export async function loadProducts() {
    try {
        const productsRef = collection(db, 'products');
        const querySnapshot = await getDocs(productsRef);
        
        productsCache = [];
        querySnapshot.forEach((doc) => {
            productsCache.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return productsCache;
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

// Load products by category
export async function loadProductsByCategory(categoryName) {
    try {
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where('category', '==', categoryName));
        const querySnapshot = await getDocs(q);
        
        const categoryProducts = [];
        querySnapshot.forEach((doc) => {
            categoryProducts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return categoryProducts;
    } catch (error) {
        console.error('Error loading products by category:', error);
        return [];
    }
}

// Get product by ID
export async function getProductById(productId) {
    try {
        const productRef = doc(db, 'products', productId);
        const docSnap = await getDoc(productRef);
        
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error getting product:', error);
        return null;
    }
}

// Add new product (Admin)
export async function addProduct(productData) {
    try {
        const docRef = await addDoc(collection(db, 'products'), {
            ...productData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error adding product:', error);
        throw error;
    }
}

// Update product (Admin)
export async function updateProduct(productId, productData) {
    try {
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, {
            ...productData,
            updatedAt: new Date()
        });
        return true;
    } catch (error) {
        console.error('Error updating product:', error);
        throw error;
    }
}

// Delete product (Admin)
export async function deleteProduct(productId) {
    try {
        await deleteDoc(doc(db, 'products', productId));
        return true;
    } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
    }
}

// ====== CATEGORIES FUNCTIONS ======

// Load all categories
export async function loadCategories() {
    try {
        const categoriesRef = collection(db, 'categories');
        const querySnapshot = await getDocs(categoriesRef);
        
        categoriesCache = [];
        querySnapshot.forEach((doc) => {
            categoriesCache.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return categoriesCache;
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

// ====== ORDERS FUNCTIONS ======

// Load all orders (Admin)
export async function loadOrders() {
    try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        ordersCache = [];
        querySnapshot.forEach((doc) => {
            ordersCache.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return ordersCache;
    } catch (error) {
        console.error('Error loading orders:', error);
        return [];
    }
}

// Load orders by user ID
export async function loadUserOrders(userId) {
    try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const userOrders = [];
        querySnapshot.forEach((doc) => {
            userOrders.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return userOrders;
    } catch (error) {
        console.error('Error loading user orders:', error);
        return [];
    }
}

// Get order by ID
export async function getOrderById(orderId) {
    try {
        const orderRef = doc(db, 'orders', orderId);
        const docSnap = await getDoc(orderRef);
        
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error getting order:', error);
        return null;
    }
}

// Update order status (Admin)
export async function updateOrderStatus(orderId, status) {
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            status: status,
            updatedAt: new Date()
        });
        return true;
    } catch (error) {
        console.error('Error updating order status:', error);
        throw error;
    }
}

// Create new order
export async function createOrder(orderData) {
    try {
        const ordersRef = collection(db, 'orders');
        const docRef = await addDoc(ordersRef, orderData);
        return {
            id: docRef.id,
            ...orderData
        };
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
}

// ====== USERS FUNCTIONS ======

// Load all users (Admin)
export async function loadUsers() {
    try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        usersCache = [];
        querySnapshot.forEach((doc) => {
            usersCache.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return usersCache;
    } catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
}

// Get user by ID
export async function getUserById(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Update user profile
export async function updateUserProfile(userId, userData) {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            ...userData,
            updatedAt: new Date()
        });
        return true;
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
}

// ====== REAL-TIME LISTENERS ======

// Listen to products changes (for admin dashboard)
export function listenToProducts(callback) {
    const productsRef = collection(db, 'products');
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
        const products = [];
        snapshot.forEach((doc) => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        callback(products);
    });
    return unsubscribe;
}

// Listen to orders changes (for admin dashboard)
export function listenToOrders(callback) {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const orders = [];
        snapshot.forEach((doc) => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });
        callback(orders);
    });
    return unsubscribe;
}

// Listen to users changes (for admin dashboard)
export function listenToUsers(callback) {
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
        const users = [];
        snapshot.forEach((doc) => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        callback(users);
    });
    return unsubscribe;
}

// ====== CART FUNCTIONS ======

// Add item to cart (localStorage)
export function addToCart(product, quantity = 1) {
    let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: quantity
        });
    }
    
    localStorage.setItem('cartItems', JSON.stringify(cart));
    updateCartCount();
    
    if (window.KoshkToast) {
        KoshkToast.success('تمت إضافة المنتج إلى العربة');
    }
    
    return cart;
}

// Remove item from cart
export function removeFromCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cartItems', JSON.stringify(cart));
    updateCartCount();
    return cart;
}

// Update cart item quantity
export function updateCartItemQuantity(productId, quantity) {
    let cart = JSON.parse(localStorage.getItem('cartItems')) || [];
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity = quantity;
        if (item.quantity <= 0) {
            cart = cart.filter(item => item.id !== productId);
        }
        localStorage.setItem('cartItems', JSON.stringify(cart));
        updateCartCount();
    }
    
    return cart;
}

// Get cart items
export function getCartItems() {
    return JSON.parse(localStorage.getItem('cartItems')) || [];
}

// Clear cart
export function clearCart() {
    localStorage.removeItem('cartItems');
    updateCartCount();
}

// Update cart count in UI
function updateCartCount() {
    const cart = getCartItems();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const cartCountElements = document.querySelectorAll('.cart-count, .mobile-cart-count');
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
    });
}

// ====== WISHLIST FUNCTIONS ======

// Add item to wishlist (localStorage)
export function addToWishlist(product) {
    let wishlist = JSON.parse(localStorage.getItem('wishlistItems')) || [];
    
    const existingItem = wishlist.find(item => item.id === product.id);
    
    if (!existingItem) {
        wishlist.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image
        });
        localStorage.setItem('wishlistItems', JSON.stringify(wishlist));
        
        if (window.KoshkToast) {
            KoshkToast.success('تمت إضافة المنتج إلى المفضلة');
        }
    } else {
        if (window.KoshkToast) {
            KoshkToast.info('المنتج موجود بالفعل في المفضلة');
        }
    }
    
    return wishlist;
}

// Remove item from wishlist
export function removeFromWishlist(productId) {
    let wishlist = JSON.parse(localStorage.getItem('wishlistItems')) || [];
    wishlist = wishlist.filter(item => item.id !== productId);
    localStorage.setItem('wishlistItems', JSON.stringify(wishlist));
    return wishlist;
}

// Get wishlist items
export function getWishlistItems() {
    return JSON.parse(localStorage.getItem('wishlistItems')) || [];
}

// ====== SUGGESTED PRODUCTS FUNCTIONS ======

// Get suggested products for auth page
export async function getSuggestedProducts(count = 4) {
    try {
        const productsRef = collection(db, 'products');
        const q = query(productsRef, limit(count));
        const querySnapshot = await getDocs(q);
        
        const suggestedProducts = [];
        querySnapshot.forEach((doc) => {
            suggestedProducts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return suggestedProducts;
    } catch (error) {
        console.error('Error loading suggested products:', error);
        return [];
    }
}

// ====== ADMIN SETTINGS FUNCTIONS ======

// Get admin settings
export async function getAdminSettings() {
    try {
        const settingsRef = doc(db, 'adminSettings', 'general');
        const docSnap = await getDoc(settingsRef);
        
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            // Return default settings
            return {
                maintenanceMode: false,
                cashbackEnabled: true,
                suggestedProductsCount: 4,
                primaryColor: '#ff9900',
                textColor: '#1a1e22',
                backgroundColor: '#ffffff',
                fontSize: '16px',
                fontFamily: "'Cairo', sans-serif",
                showHeroSlider: true,
                showCategoryCarousel: true,
                showQuickCategories: true
            };
        }
    } catch (error) {
        console.error('Error getting admin settings:', error);
        return null;
    }
}

// Update admin settings
export async function updateAdminSettings(settings) {
    try {
        const settingsRef = doc(db, 'adminSettings', 'general');
        await updateDoc(settingsRef, {
            ...settings,
            updatedAt: new Date()
        });
        return true;
    } catch (error) {
        console.error('Error updating admin settings:', error);
        throw error;
    }
}

// Listen to admin settings changes
export function listenToAdminSettings(callback) {
    const settingsRef = doc(db, 'adminSettings', 'general');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        }
    });
    return unsubscribe;
}

// ====== HERO CARDS IMAGES FUNCTIONS ======

// Get hero cards images
export async function getHeroCardsImages() {
    try {
        const imagesRef = doc(db, 'siteContent', 'heroCards');
        const docSnap = await getDoc(imagesRef);
        if (docSnap.exists()) {
            return docSnap.data().images || [];
        }
        return [];
    } catch (error) {
        console.error('Error getting hero cards images:', error);
        return [];
    }
}

// Update hero cards images
export async function updateHeroCardsImages(images) {
    try {
        const imagesRef = doc(db, 'siteContent', 'heroCards');
        await setDoc(imagesRef, { images }, { merge: true });
        return true;
    } catch (error) {
        console.error('Error updating hero cards images:', error);
        return false;
    }
}

// Listen to hero cards images changes
export function listenToHeroCardsImages(callback) {
    const imagesRef = doc(db, 'siteContent', 'heroCards');
    const unsubscribe = onSnapshot(imagesRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data().images || []);
        }
    });
    return unsubscribe;
}

// ====== SLIDER IMAGES FUNCTIONS ======

// Get slider images
export async function getSliderImages() {
    try {
        const imagesRef = doc(db, 'siteContent', 'slider');
        const docSnap = await getDoc(imagesRef);
        if (docSnap.exists()) {
            return docSnap.data().images || [];
        }
        return [];
    } catch (error) {
        console.error('Error getting slider images:', error);
        return [];
    }
}

// Update slider images
export async function updateSliderImages(images) {
    try {
        const imagesRef = doc(db, 'siteContent', 'slider');
        await setDoc(imagesRef, { images }, { merge: true });
        return true;
    } catch (error) {
        console.error('Error updating slider images:', error);
        return false;
    }
}

// Listen to slider images changes
export function listenToSliderImages(callback) {
    const imagesRef = doc(db, 'siteContent', 'slider');
    const unsubscribe = onSnapshot(imagesRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data().images || []);
        }
    });
    return unsubscribe;
}

// ====== REVIEWS AND COMMENTS FUNCTIONS ======

// Get all reviews
export async function getReviews() {
    try {
        const reviewsRef = collection(db, 'reviews');
        const snapshot = await getDocs(reviewsRef);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting reviews:', error);
        return [];
    }
}

// Update review status (approve/reject)
export async function updateReviewStatus(reviewId, approved) {
    try {
        const reviewRef = doc(db, 'reviews', reviewId);
        await updateDoc(reviewRef, { approved, updatedAt: new Date() });
        return true;
    } catch (error) {
        console.error('Error updating review status:', error);
        return false;
    }
}

// Delete review
export async function deleteReview(reviewId) {
    try {
        await deleteDoc(doc(db, 'reviews', reviewId));
        return true;
    } catch (error) {
        console.error('Error deleting review:', error);
        return false;
    }
}

// Listen to reviews changes
export function listenToReviews(callback) {
    const reviewsRef = collection(db, 'reviews');
    const unsubscribe = onSnapshot(reviewsRef, (snapshot) => {
        const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(reviews);
    });
    return unsubscribe;
}

// ====== PAYMENT GATEWAYS FUNCTIONS ======

// Get payment gateways
export async function getPaymentGateways() {
    try {
        const gatewaysRef = doc(db, 'paymentGateways', 'cash');
        const docSnap = await getDoc(gatewaysRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return {};
    } catch (error) {
        console.error('Error getting payment gateways:', error);
        return {};
    }
}

// Update payment gateways
export async function updatePaymentGateways(gateways) {
    try {
        const gatewaysRef = doc(db, 'paymentGateways', 'cash');
        await setDoc(gatewaysRef, gateways, { merge: true });
        return true;
    } catch (error) {
        console.error('Error updating payment gateways:', error);
        return false;
    }
}

// Initialize cart count on page load
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
});

// Export functions for global use
window.FirebaseData = {
    loadProducts,
    loadProductsByCategory,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct,
    loadCategories,
    loadOrders,
    loadUserOrders,
    getOrderById,
    updateOrderStatus,
    createOrder,
    loadUsers,
    getUserById,
    updateUserProfile,
    listenToProducts,
    listenToOrders,
    listenToUsers,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    getCartItems,
    clearCart,
    addToWishlist,
    removeFromWishlist,
    getWishlistItems,
    getSuggestedProducts,
    getAdminSettings,
    updateAdminSettings,
    listenToAdminSettings,
    getHeroCardsImages,
    updateHeroCardsImages,
    listenToHeroCardsImages,
    getSliderImages,
    updateSliderImages,
    listenToSliderImages,
    getReviews,
    updateReviewStatus,
    deleteReview,
    listenToReviews,
    getPaymentGateways,
    updatePaymentGateways
};