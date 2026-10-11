import { db, auth } from "../firebase-config.js";
import { 
  collection, 
  doc, 
  addDoc, 
  onSnapshot, 
  setDoc, 
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/**
 * TACTICAL STORE — Master Frontend Controller (js/index.js)
 * Live Firestore Sync, Multi-Image Gallery, Customer Orders, Anti-Abuse
 */

// ==========================================
// 1. DEFAULT DATA & FALLBACK REPOSITORY
// ==========================================
const DEFAULT_PRODUCTS = [
  {
    id: '1',
    name: 'M4A1 Full Mod + T6 Ammo x300',
    category: 'ammo_acc',
    price: 350.00,
    koen: '5,500,000',
    stock: 12,
    image: 'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1574226516831-e1dff420e5c7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=800'
    ],
    tags: ['Best Seller', 'พร้อมบวก'],
    desc: 'ปืน M4A1 ฟูลม็อดแต่งลดแรงถีบสูงสุด พร้อมกระสุนระดับ T6 M995 เจาะเกราะทะลวงระดับพระกาฬ x300 นัด พร้อมเล่นทันที',
    specs: ['เกราะ T5 ครบชุด', 'กระสุน T6 x300', 'Koen เงินสด 5.5M', 'กระเป๋า 28 ช่อง']
  },
  {
    id: '2',
    name: 'Starter Koen Account (15 Million)',
    category: 'koen',
    price: 150.00,
    koen: '15,000,000',
    stock: 45,
    image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?auto=format&fit=crop&q=80&w=800'
    ],
    tags: ['สายฟาร์ม', 'คุ้มสุด'],
    desc: 'ไอดีเปล่าเริ่มต้นที่มีเงิน Koen สะสม 15 ล้านในคลัง ไม่เคยโดนแบน ผูกอีเมลสะอาดพร้อมโอนกรรมสิทธิ์',
    specs: ['Koen สะสม 15,000,000', 'เลเวล 12+', 'ไม่เคยติดโทษแบน', 'เปลี่ยนอีเมลได้ทันที']
  },
  {
    id: '3',
    name: 'Sniper God Tier (AX50 + T7 Thermal)',
    category: 'full_acc',
    price: 890.00,
    koen: '30,000,000',
    stock: 0,
    image: 'https://images.unsplash.com/photo-1585098906517-8e1008d58544?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1585098906517-8e1008d58544?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800'
    ],
    tags: ['Premium', 'เทพสไน'],
    desc: 'เซ็ตสไนเปอร์ระดับสูงสุด AX50 ติดกล้องความร้อน T7 มองทะลุหมอกและใบไม้ เงินสดในตัว 30M เหมาะสำหรับสายซุ่มแนวหลัง',
    specs: ['สไนเปอร์ AX50 Mod เต็ม', 'กล้อง T7 Thermal', 'กระสุน T7 x100', 'Koen เงินสด 30M']
  },
  {
    id: '4',
    name: 'FAL Full Mod + M61 (T6) x300',
    category: 'ammo_acc',
    price: 420.00,
    koen: '8,000,000',
    stock: 7,
    image: 'https://images.unsplash.com/photo-1550985542-f28329b3a364?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1550985542-f28329b3a364?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800'
    ],
    tags: ['ดาเมจจัด', 'ยอดนิยม'],
    desc: 'FAL แต่งเต็มคุมแรงถีบขั้นสุด บรรจุกระสุน M61 เจาะเกราะหนัก 2 นัดร่วงทุกรายใน Kamona',
    specs: ['FAL Full Mod Recoil ต่ำ', 'กระสุน M61 T6 x300', 'เกราะ T6 พร้อมหมวก', 'Koen เงินสด 8M']
  },
  {
    id: '5',
    name: 'Mega Wealthy Koen (100 Million)',
    category: 'koen',
    price: 1190.00,
    koen: '100,000,000',
    stock: 3,
    image: 'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=800'
    ],
    tags: ['มหาเศรษฐี', 'VIP'],
    desc: 'เงินสด Koen 100 ล้าน ซื้อได้ทุกอย่างในตลาดกลาง จัดเป็นไอดีสายสะสมหรือเปิดคลังบวกยาวตลอดทั้งซีซั่น',
    specs: ['Koen 100,000,000 เต็ม', 'กล่องเซฟใหญ่ 3x3', 'ปลดล็อกพ่อค้าทุกตัว', 'รับประกันตลอดชีพ']
  },
  {
    id: '6',
    name: 'Budget Runner Set + MPX 9mm 7N31',
    category: 'full_acc',
    price: 120.00,
    koen: '3,000,000',
    stock: 18,
    image: 'https://images.unsplash.com/photo-1574226516831-e1dff420e5c7?auto=format&fit=crop&q=80&w=800',
    gallery: [
      'https://images.unsplash.com/photo-1574226516831-e1dff420e5c7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800'
    ],
    tags: ['สายประหยัด', 'วิ่งไว'],
    desc: 'เซ็ตวิ่งฟาร์มของไว ปืน SMG MPX ยิงไว ดาเมจทะลุเกราะ 7N31 ของครบตัวพร้อมลุย',
    specs: ['MPX Full Mod ไวสุด', 'กระสุน 7N31 x250', 'เกราะเบา T4 วิ่งเร็ว', 'Koen เงินสด 3M']
  }
];

const CATEGORIES = [
  { id: 'all', name: 'ทั้งหมด' },
  { id: 'ammo_acc', name: 'ไอดีไก่กระสุน' },
  { id: 'koen', name: 'ไอดีเงิน Koen' },
  { id: 'full_acc', name: 'ไอดีพร้อมเล่น' },
  { id: 'skins', name: 'สกินปืน / เซ็ตชุด' }
];

// App State
let PRODUCTS = [...DEFAULT_PRODUCTS];
let currentCategory = 'all';
let searchQuery = '';
let stockFilter = 'all'; // 'all' or 'instock'
let sortOrder = 'default';
let selectedProduct = null;
let currentPaymentMethod = 'promptpay';
let discountAmount = 0;
let timerCountdown = 600;
let timerInterval = null;
let isPasswordRevealed = false;
let toastTimeout = null;
let currentDeliveredUsername = 'ArenaAgent9910';
let currentDeliveredPassword = 'KamonaStrike#2026';
let currentUser = null;
let currentModalGallery = [];
let currentGalleryIdx = 0;

// Security & Anti-Abuse (Promo code rate limiting)
let promoFailedAttempts = 0;
let promoLockoutExpiry = 0;

// ==========================================
// 2. TOAST NOTIFICATION UTILITY
// ==========================================
function triggerToast(message) {
  const box = document.getElementById('toast-box');
  const text = document.getElementById('toast-text');
  if (!box || !text) return;

  text.innerText = message;
  box.classList.remove('opacity-0', '-translate-y-4', 'scale-95');
  box.classList.add('opacity-100', 'translate-y-0', 'scale-100');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    box.classList.add('opacity-0', '-translate-y-4', 'scale-95');
    box.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
  }, 3000);
}

// ==========================================
// 3. FIREBASE AUTH & LIVE LISTENERS
// ==========================================
function initAuthListener() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const loggedOutContainer = document.getElementById('auth-logged-out');
    const loggedInContainer = document.getElementById('auth-logged-in');
    const displayNameEl = document.getElementById('user-display-name');
    const avatarInitialEl = document.getElementById('user-avatar-initial');
    const mobileAuthText = document.getElementById('mobile-nav-auth-text');

    if (user) {
      const name = user.displayName || user.email.split('@')[0];
      if (loggedOutContainer) loggedOutContainer.classList.add('hidden');
      if (loggedInContainer) {
        loggedInContainer.classList.remove('hidden');
        loggedInContainer.classList.add('flex');
      }
      if (displayNameEl) displayNameEl.innerText = name;
      if (avatarInitialEl) avatarInitialEl.innerText = name.charAt(0).toUpperCase();
      if (mobileAuthText) mobileAuthText.innerText = name.slice(0, 5) + '...';
      updateMyOrdersBadge();
    } else {
      if (loggedOutContainer) loggedOutContainer.classList.remove('hidden');
      if (loggedInContainer) {
        loggedInContainer.classList.add('hidden');
        loggedInContainer.classList.remove('flex');
      }
      if (mobileAuthText) mobileAuthText.innerText = 'บัญชี';
    }
  });
}

async function handleSignOut() {
  try {
    await signOut(auth);
    triggerToast('ออกจากระบบเรียบร้อยแล้ว');
  } catch (error) {
    console.error("Sign out error:", error);
    triggerToast('เกิดข้อผิดพลาดในการออกจากระบบ');
  }
}

function updateFirebaseStatus(isOnline, message) {
  const dot = document.getElementById('firebase-status-dot');
  const text = document.getElementById('firebase-status-text');
  if (dot && text) {
    dot.className = isOnline 
      ? 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse' 
      : 'w-2 h-2 rounded-full bg-amber-500';
    text.innerText = message;
  }
}

// ซิงค์สินค้าสดจาก Cloud Firestore
function initFirebaseProductsListener() {
  try {
    const productsRef = collection(db, "products");
    onSnapshot(productsRef, (snapshot) => {
      if (!snapshot.empty) {
        const firestoreList = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          firestoreList.push({
            id: docSnap.id,
            name: data.name || 'ไม่มีชื่อสินค้า',
            category: data.category || 'all',
            price: Number(data.price) || 0,
            koen: data.koen || '-',
            stock: data.stock !== undefined ? Number(data.stock) : 0,
            image: data.image || 'https://placehold.co/800x500/18181b/f59e0b?text=Arena+Breakout',
            gallery: Array.isArray(data.gallery) && data.gallery.length > 0 ? data.gallery : [data.image],
            tags: Array.isArray(data.tags) ? data.tags : [],
            desc: data.desc || '',
            specs: Array.isArray(data.specs) ? data.specs : []
          });
        });
        PRODUCTS = firestoreList;
        updateFirebaseStatus(true, `Firebase: ${PRODUCTS.length} รายการ`);
      } else {
        PRODUCTS = [...DEFAULT_PRODUCTS];
        updateFirebaseStatus(true, "Firebase: ข้อมูลเริ่มต้น");
      }
      renderCategoryTabs();
      renderProducts();
      updateHeroMetrics();
    }, (err) => {
      console.warn("Firestore listener fallback to default:", err);
      PRODUCTS = [...DEFAULT_PRODUCTS];
      updateFirebaseStatus(false, "Firebase: โหมดออฟไลน์");
      renderCategoryTabs();
      renderProducts();
      updateHeroMetrics();
    });
  } catch (e) {
    PRODUCTS = [...DEFAULT_PRODUCTS];
    renderCategoryTabs();
    renderProducts();
  }
}

// ฟังการอัปเดตข้อความประกาศร้านค้า
function initSettingsListener() {
  try {
    const sDoc = doc(db, "system", "settings");
    onSnapshot(sDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.marqueeText) {
          const track = document.getElementById('marquee-track-container');
          if (track) {
            track.innerHTML = `
              <span class="mx-4 flex items-center gap-1.5 font-bold">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                ${data.marqueeText}
              </span>
              <span class="mx-4 text-black/50">•</span>
              <span class="mx-4">🔒 รับประกันทุกไอดี ปลอดภัย ไม่เสี่ยงโดนแบน บัญชีสะอาด 100%</span>
            `;
          }
        }
      }
    });
  } catch (err) {
    console.warn("Settings listener error:", err);
  }
}

function updateHeroMetrics() {
  const inStockTotal = PRODUCTS.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const el = document.getElementById('hero-instock-count');
  if (el) el.innerText = inStockTotal > 0 ? inStockTotal.toLocaleString() : '1,405';
}

// ==========================================
// 4. CATALOG FILTERING & SORTING
// ==========================================
function renderCategoryTabs() {
  const tabsContainer = document.getElementById('category-tabs');
  if (!tabsContainer) return;

  tabsContainer.innerHTML = CATEGORIES.map(cat => {
    const isActive = cat.id === currentCategory;
    const btnClass = isActive 
      ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5';
    return `
      <button onclick="filterCategory('${cat.id}')" class="px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${btnClass}">
        ${cat.name}
      </button>
    `;
  }).join('');
}

function filterCategory(catId) {
  currentCategory = catId;
  renderCategoryTabs();
  renderProducts();
}

function handleSearch(val) {
  searchQuery = val;
  renderProducts();
}

function setStockFilter(mode) {
  stockFilter = mode;
  const btnAll = document.getElementById('filter-stock-all');
  const btnIn = document.getElementById('filter-stock-instock');
  if (btnAll && btnIn) {
    if (mode === 'all') {
      btnAll.className = 'px-3.5 py-1.5 rounded-xl font-bold transition-all bg-amber-500 text-black';
      btnIn.className = 'px-3.5 py-1.5 rounded-xl font-bold transition-all text-zinc-400 hover:text-white';
    } else {
      btnIn.className = 'px-3.5 py-1.5 rounded-xl font-bold transition-all bg-amber-500 text-black';
      btnAll.className = 'px-3.5 py-1.5 rounded-xl font-bold transition-all text-zinc-400 hover:text-white';
    }
  }
  renderProducts();
}

function handleSortChange(val) {
  sortOrder = val;
  renderProducts();
}

function clearSearchAndFilters() {
  currentCategory = 'all';
  searchQuery = '';
  stockFilter = 'all';
  sortOrder = 'default';
  
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'default';

  setStockFilter('all');
  renderCategoryTabs();
  renderProducts();
}

function scrollToCatalog() {
  const el = document.getElementById('catalog-section');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  const emptyState = document.getElementById('empty-state');
  if (!grid || !emptyState) return;

  let filtered = PRODUCTS.filter(p => {
    const matchCat = currentCategory === 'all' || p.category === currentCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStock = stockFilter === 'all' || (stockFilter === 'instock' && Number(p.stock) > 0);
    return matchCat && matchSearch && matchStock;
  });

  // Sorting
  if (sortOrder === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortOrder === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortOrder === 'stock-desc') {
    filtered.sort((a, b) => b.stock - a.stock);
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
    return;
  }

  emptyState.classList.add('hidden');
  emptyState.classList.remove('flex');

  grid.innerHTML = filtered.map(product => {
    const isOutOfStock = Number(product.stock) === 0;
    const borderClass = isOutOfStock 
      ? 'border-red-950/30 opacity-70' 
      : 'border-white/10 hover:border-amber-500/60 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]';

    return `
      <div class="group relative rounded-3xl overflow-hidden bg-zinc-950 border flex flex-col h-full transition-all duration-300 ${borderClass}">
        <!-- Thumbnail -->
        <div onclick="openDetailModal('${product.id}')" class="relative aspect-[16/10] overflow-hidden bg-zinc-900 cursor-pointer">
          <img 
            src="${product.image}" 
            alt="${product.name}" 
            class="w-full h-full object-cover transition-transform duration-700 ${!isOutOfStock ? 'group-hover:scale-105' : 'grayscale'}"
            onerror="this.src='https://placehold.co/800x500/18181b/f59e0b?text=Arena+Breakout'"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10"></div>
          
          <!-- Badges -->
          <div class="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5">
            ${isOutOfStock ? `
              <span class="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                สินค้าหมด
              </span>
            ` : `
              <span class="bg-emerald-500/90 text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span class="w-1.5 h-1.5 bg-black rounded-full animate-ping"></span>
                คงเหลือ ${product.stock}
              </span>
            `}
            ${product.tags.map(t => `
              <span class="bg-black/70 backdrop-blur-md text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                ${t}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Body -->
        <div class="p-5 flex flex-col flex-grow z-20">
          <h3 onclick="openDetailModal('${product.id}')" class="text-base font-bold text-white mb-1.5 line-clamp-1 group-hover:text-amber-400 transition-colors cursor-pointer">
            ${product.name}
          </h3>
          
          <p class="text-zinc-500 text-xs line-clamp-2 mb-4 leading-relaxed">
            ${product.desc}
          </p>

          <div class="mb-4">
            <div class="inline-flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-xl border border-white/5">
              <span class="text-[10px] uppercase font-bold text-zinc-500">มูลค่า Koen</span>
              <span class="font-heading text-xs text-amber-500 font-bold">${product.koen}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
            <div class="flex flex-col">
              <span class="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">ราคา</span>
              <span class="text-lg font-heading font-black text-white">
                ฿${Number(product.price).toFixed(2)}
              </span>
            </div>
            
            <div class="flex items-center gap-1.5">
              <button onclick="openDetailModal('${product.id}')" class="text-xs text-zinc-400 hover:text-white px-2 py-2 rounded-xl hover:bg-zinc-900 transition-colors" title="ดูรายละเอียดไอดี">
                รายละเอียด
              </button>
              <button 
                onclick="addToCart('${product.id}')" 
                ${isOutOfStock ? 'disabled' : ''} 
                class="p-2 rounded-xl text-xs font-bold transition-all ${
                  isOutOfStock ? 'text-zinc-600 bg-zinc-900 cursor-not-allowed' : 'text-amber-400 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-amber-500/40 active:scale-95'
                }" title="เพิ่มลงตะกร้า">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              </button>
              <button 
                onclick="startCheckout('${product.id}')" 
                ${isOutOfStock ? 'disabled' : ''} 
                class="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                  isOutOfStock 
                  ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' 
                  : 'bg-amber-500 text-black hover:bg-white hover:scale-105 active:scale-95 shadow-md font-heading'
                }">
                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                <span>ซื้อทันที</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 5. PRODUCT DETAIL MODAL & MULTI-IMAGE GALLERY (MOSZXLLSHOP STYLE)
// ==========================================
function openDetailModal(productId) {
  const p = PRODUCTS.find(item => item.id === productId);
  if (!p) return;

  currentModalGallery = Array.isArray(p.gallery) && p.gallery.length > 0 ? p.gallery : [p.image];
  currentGalleryIdx = 0;

  document.getElementById('modal-img').src = currentModalGallery[0];
  document.getElementById('modal-title').innerText = p.name;
  document.getElementById('modal-koen').innerText = `Koen Value: ${p.koen}`;
  document.getElementById('modal-desc').innerText = p.desc;
  document.getElementById('modal-price').innerText = `฿${Number(p.price).toFixed(2)}`;

  const stockBadge = document.getElementById('modal-stock-badge');
  if (Number(p.stock) === 0) {
    stockBadge.innerText = 'สินค้าหมด';
    stockBadge.className = 'inline-block bg-red-500/10 text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-500/20';
  } else {
    stockBadge.innerText = `พร้อมส่ง (เหลือ ${p.stock})`;
    stockBadge.className = 'inline-block bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20';
  }

  // Render Gallery Thumbnails Strip
  renderGalleryThumbnails();

  // Specs
  const specsContainer = document.getElementById('modal-specs');
  if (specsContainer) {
    specsContainer.innerHTML = p.specs.map(item => `
      <div class="flex items-center gap-2">
        <span class="text-amber-500 font-bold">✓</span>
        <span>${item}</span>
      </div>
    `).join('');
  }

  const buyBtn = document.getElementById('modal-buy-btn');
  if (Number(p.stock) === 0) {
    buyBtn.innerText = 'สินค้าหมด';
    buyBtn.disabled = true;
    buyBtn.className = 'px-6 py-3 rounded-full font-bold text-xs uppercase bg-zinc-800 text-zinc-600 cursor-not-allowed';
  } else {
    buyBtn.innerText = 'สั่งซื้อทันที';
    buyBtn.disabled = false;
    buyBtn.className = 'px-6 py-3 rounded-full font-bold text-xs uppercase bg-amber-500 hover:bg-white text-black shadow-lg hover:scale-105 active:scale-95 font-heading';
    buyBtn.onclick = () => {
      closeDetailModal();
      startCheckout(p.id);
    };
    
    // Wire modal add-to-cart button if exists
    const modalCartBtn = document.getElementById('modal-add-cart-btn');
    if (modalCartBtn) {
      modalCartBtn.disabled = Number(p.stock) === 0;
      modalCartBtn.onclick = () => {
        addToCart(p.id);
      };
    }
  }

  const modal = document.getElementById('product-detail-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function renderGalleryThumbnails() {
  const strip = document.getElementById('modal-gallery-strip');
  const counter = document.getElementById('modal-img-counter');
  if (!strip) return;

  if (currentModalGallery.length <= 1) {
    strip.innerHTML = '';
    strip.classList.add('hidden');
    if (counter) counter.innerText = 'ภาพ 1 / 1';
    return;
  }

  strip.classList.remove('hidden');
  if (counter) counter.innerText = `ภาพ ${currentGalleryIdx + 1} / ${currentModalGallery.length}`;

  strip.innerHTML = currentModalGallery.map((imgUrl, idx) => `
    <button type="button" onclick="switchGalleryImage(${idx})" class="w-16 h-12 rounded-xl overflow-hidden bg-zinc-900 border-2 border-white/10 shrink-0 gallery-thumb ${idx === currentGalleryIdx ? 'active' : ''}">
      <img src="${imgUrl}" alt="Thumb" class="w-full h-full object-cover">
    </button>
  `).join('');
}

function switchGalleryImage(idx) {
  if (idx < 0 || idx >= currentModalGallery.length) return;
  currentGalleryIdx = idx;
  const modalImg = document.getElementById('modal-img');
  if (modalImg) modalImg.src = currentModalGallery[idx];
  renderGalleryThumbnails();
}

function closeDetailModal() {
  const modal = document.getElementById('product-detail-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// ==========================================
// 6. CHECKOUT & PAYMENT FLOW (SECURITY HARDENED)
// ==========================================
function startCheckout(productId) {
  selectedProduct = PRODUCTS.find(p => p.id === productId);
  if (!selectedProduct || Number(selectedProduct.stock) === 0) return;

  discountAmount = 0;
  document.getElementById('promo-input').value = '';
  document.getElementById('discount-row').classList.add('hidden');
  document.getElementById('discount-row').classList.remove('flex');

  document.getElementById('checkout-product-img').src = selectedProduct.image;
  document.getElementById('checkout-product-name').innerText = selectedProduct.name;
  document.getElementById('checkout-product-koen').innerText = `Koen: ${selectedProduct.koen}`;
  document.getElementById('checkout-product-desc').innerText = selectedProduct.desc;
  document.getElementById('checkout-base-price').innerText = `฿${Number(selectedProduct.price).toFixed(2)}`;
  
  updateCheckoutTotal();
  switchPaymentTab('promptpay');
  startTimer();
  navigateTo('checkout');
}

function updateCheckoutTotal() {
  if (!selectedProduct) return;
  const finalPrice = Math.max(0, selectedProduct.price - discountAmount);
  
  document.getElementById('checkout-final-price').innerText = `฿${finalPrice.toFixed(2)}`;
  document.getElementById('qr-amount-label').innerText = `฿${finalPrice.toFixed(2)}`;
  document.getElementById('promptpay-sum-label').innerText = `฿${finalPrice.toFixed(2)}`;
  document.getElementById('voucher-exact-amount').innerText = `฿${finalPrice.toFixed(2)}`;
  document.getElementById('nav-cart-text').innerText = `฿${finalPrice.toFixed(2)}`;
}

// Anti-Brute-Force Rate Limiting for Promo Codes
function applyPromoCode() {
  const now = Date.now();
  if (now < promoLockoutExpiry) {
    const secLeft = Math.ceil((promoLockoutExpiry - now) / 1000);
    triggerToast(`โปรดรอ ${secLeft} วินาที ก่อนลองใส่โค้ดส่วนลดอีกครั้ง (Rate Limit)`);
    return;
  }

  const input = document.getElementById('promo-input');
  const code = input.value.trim().toUpperCase();
  if (!selectedProduct) return;

  // Active Promo Code Engine
  if (code === 'TACTICAL') {
    discountAmount = 50;
    triggerToast('ใช้โค้ด TACTICAL สำเร็จ! ลดทันที 50 บาท');
    promoFailedAttempts = 0;
  } else if (code === 'ARENA10') {
    discountAmount = Math.round(selectedProduct.price * 0.1);
    triggerToast(`ใช้โค้ด ARENA10 สำเร็จ! ลด 10% (฿${discountAmount})`);
    promoFailedAttempts = 0;
  } else if (code === 'MOSZXLL') {
    discountAmount = 100;
    triggerToast('ใช้โค้ด MOSZXLL สำเร็จ! ลดทันที 100 บาท');
    promoFailedAttempts = 0;
  } else {
    promoFailedAttempts++;
    if (promoFailedAttempts >= 5) {
      promoLockoutExpiry = Date.now() + 60000;
      triggerToast('กรอกโค้ดผิดเกิน 5 ครั้ง ระบบล็อกการใช้งานโค้ด 60 วินาที');
      document.getElementById('promo-rate-warning').classList.remove('hidden');
      setTimeout(() => {
        document.getElementById('promo-rate-warning').classList.add('hidden');
        promoFailedAttempts = 0;
      }, 60000);
    } else {
      triggerToast(`โค้ดไม่ถูกต้อง (เหลือโอกาสลองอีก ${5 - promoFailedAttempts} ครั้ง)`);
    }
    return;
  }

  document.getElementById('discount-row').classList.remove('hidden');
  document.getElementById('discount-row').classList.add('flex');
  document.getElementById('checkout-discount').innerText = `-฿${discountAmount.toFixed(2)}`;
  updateCheckoutTotal();
}

function switchPaymentTab(tab) {
  currentPaymentMethod = tab;
  const pTab = document.getElementById('payment-promptpay-panel');
  const vTab = document.getElementById('payment-truemoney-panel');
  const btnP = document.getElementById('btn-tab-promptpay');
  const btnV = document.getElementById('btn-tab-truemoney');

  if (!pTab || !vTab || !btnP || !btnV) return;

  if (tab === 'promptpay') {
    pTab.classList.remove('hidden');
    pTab.classList.add('flex');
    vTab.classList.add('hidden');
    vTab.classList.remove('flex');
    btnP.className = 'flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all bg-amber-500 text-black shadow-md';
    btnV.className = 'flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all text-zinc-400 hover:text-white';
  } else {
    vTab.classList.remove('hidden');
    vTab.classList.add('flex');
    pTab.classList.add('hidden');
    pTab.classList.remove('flex');
    btnV.className = 'flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all bg-amber-500 text-black shadow-md';
    btnP.className = 'flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all text-zinc-400 hover:text-white';
  }
}

function startTimer() {
  stopTimer();
  timerCountdown = 600;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerCountdown--;
    if (timerCountdown <= 0) {
      stopTimer();
      navigateTo('store');
      triggerToast('หมดเวลาชำระเงิน ระบบได้คืนสต็อกสินค้าแล้ว');
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

function updateTimerDisplay() {
  const m = Math.floor(timerCountdown / 60);
  const s = timerCountdown % 60;
  const formatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  const el = document.getElementById('checkout-timer');
  if (el) el.innerText = formatted;
}

// State for uploaded payment slip
let currentSlipFile = null;
let currentSlipDataUrl = null;

function handleSlipFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    triggerToast('ขนาดไฟล์สลิปใหญ่เกิน 10MB กรุณาเลือกไฟล์ใหม่');
    return;
  }

  currentSlipFile = file;
  const reader = new FileReader();
  reader.onload = (event) => {
    currentSlipDataUrl = event.target.result;
    const previewImg = document.getElementById('slip-preview-img');
    const filenameEl = document.getElementById('slip-filename');
    const container = document.getElementById('slip-preview-container');
    const prompt = document.getElementById('slip-upload-prompt');

    if (previewImg) previewImg.src = currentSlipDataUrl;
    if (filenameEl) filenameEl.innerText = file.name;
    if (container) container.classList.remove('hidden');
    if (prompt) prompt.classList.add('hidden');
    triggerToast('แนบสลิปเรียบร้อย พร้อมตรวจสอบการโอน');
  };
  reader.readAsDataURL(file);
}

function removeSlipFile() {
  currentSlipFile = null;
  currentSlipDataUrl = null;
  const input = document.getElementById('slip-file-input');
  if (input) input.value = '';
  document.getElementById('slip-preview-container')?.classList.add('hidden');
  document.getElementById('slip-upload-prompt')?.classList.remove('hidden');
}

// Payment Fulfill & Record Order with Real Inventory Vault Delivery
async function simulateOrderSuccess() {
  const btn = document.getElementById('btn-verify-promptpay');
  if (btn) {
    btn.innerText = 'กำลังตรวจสอบสลิปและดึงไอดีจากตู้เซฟ...';
    btn.disabled = true;
  }

  const orderNum = Math.floor(100000 + Math.random() * 900000);
  const orderId = `ORD-AB${orderNum}`;
  const finalPrice = selectedProduct ? Math.max(0, selectedProduct.price - discountAmount) : 0;

  // 1. DYNAMIC INVENTORY VAULT DISPENSING (REAL CREDENTIAL DELIVERY)
  const savedVault = JSON.parse(localStorage.getItem('tactical_vault_accounts') || '[]');
  const prodIdStr = selectedProduct ? String(selectedProduct.id) : '';
  let availableAcc = savedVault.find(a => String(a.productId) === prodIdStr && a.status === 'available');

  let deliveredNote = 'เมลสะอาด เปลี่ยนรหัสผ่านในเกมได้ทันที';

  if (availableAcc) {
    currentDeliveredUsername = availableAcc.username;
    currentDeliveredPassword = availableAcc.password;
    deliveredNote = availableAcc.note || deliveredNote;

    // Mark account as SOLD in vault
    availableAcc.status = 'sold';
    availableAcc.orderId = orderId;
    availableAcc.soldAt = new Date().toISOString();
    localStorage.setItem('tactical_vault_accounts', JSON.stringify(savedVault));

    try {
      await updateDoc(doc(db, "inventory_vault", availableAcc.id), {
        status: 'sold',
        orderId: orderId,
        soldAt: new Date().toISOString()
      });
    } catch (err) { }

    // Reduce product stock in products list
    if (selectedProduct && selectedProduct.stock > 0) {
      selectedProduct.stock--;
      const pIdx = PRODUCTS.findIndex(p => String(p.id) === prodIdStr);
      if (pIdx !== -1) PRODUCTS[pIdx].stock = selectedProduct.stock;
      localStorage.setItem('tactical_products', JSON.stringify(PRODUCTS));
      renderProducts();
    }
  } else {
    // Fallback secure generated credential if vault is empty
    currentDeliveredUsername = `ArenaAgent${Math.floor(1000 + Math.random() * 9000)}`;
    currentDeliveredPassword = `Kamona#${Math.floor(100000 + Math.random() * 900000)}!`;
  }

  const orderRecord = {
    orderNumber: orderId,
    productId: selectedProduct ? selectedProduct.id : 'unknown',
    productName: selectedProduct ? selectedProduct.name : 'Unknown Product',
    amount: finalPrice,
    discount: discountAmount,
    paymentMethod: currentPaymentMethod,
    status: 'completed',
    userEmail: currentUser ? currentUser.email : 'guest',
    userId: currentUser ? currentUser.uid : null,
    slipUploaded: currentSlipFile ? currentSlipFile.name : null,
    accountDelivered: {
      username: currentDeliveredUsername,
      password: currentDeliveredPassword,
      note: deliveredNote
    },
    createdAt: new Date().toISOString()
  };

  // Save to LocalStorage for customer order history
  saveOrderToLocal(orderRecord);

  // Save to Firestore
  try {
    const ordersRef = collection(db, "orders");
    await addDoc(ordersRef, {
      ...orderRecord,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("Save order to Firestore error (saved locally):", err);
  }

  // Dispatch Discord Notification to Admin
  dispatchDiscordNotification('order', orderRecord);

  // Remove purchased item from cart if in cart
  if (selectedProduct) {
    removeFromCart(selectedProduct.id);
  }

  setTimeout(() => {
    if (btn) {
      btn.innerText = 'ยืนยันการโอนเงิน (ตรวจสลิปอัตโนมัติ)';
      btn.disabled = false;
    }
    
    document.getElementById('success-product-name').innerText = selectedProduct ? selectedProduct.name : '';
    document.getElementById('success-order-id').innerText = `ORDER ID: #${orderId}`;
    isPasswordRevealed = false;
    document.getElementById('acc-username').innerText = currentDeliveredUsername;
    document.getElementById('acc-password').innerText = '••••••••••••••••';
    document.getElementById('pw-toggle-label').innerText = 'แสดงรหัส';
    
    navigateTo('success');
    triggerToast('ชำระเงินสำเร็จ ส่งมอบไอดีจากตู้เซฟเรียบร้อย!');
    updateMyOrdersBadge();
    removeSlipFile();
  }, 1400);
}

function simulateVoucherPayment() {
  const url = document.getElementById('voucher-url-input').value.trim();
  if (!url.includes('gift.truemoney.com/campaign/?v=') && url.length < 25) {
    triggerToast('กรุณากรอกลิงก์ซองของขวัญ TrueMoney ให้ถูกต้อง (https://gift.truemoney.com/campaign/?v=...)');
    return;
  }

  // Extract Voucher Hash
  let voucherHash = '';
  try {
    const u = new URL(url);
    voucherHash = u.searchParams.get('v') || '';
  } catch (err) {
    voucherHash = url.split('?v=')[1] || '';
  }

  if (!voucherHash || voucherHash.length < 8) {
    triggerToast('ไม่พบรหัสซองของขวัญที่ถูกต้องในลิงก์ที่กรอก');
    return;
  }

  // Anti-Replay Attack Protection: Check if voucher was previously redeemed
  const usedVouchers = JSON.parse(localStorage.getItem('tactical_used_vouchers') || '[]');
  if (usedVouchers.includes(voucherHash)) {
    triggerToast('⛔ ซองของขวัญนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้งานซ้ำได้ (Anti-Replay)');
    return;
  }

  triggerToast('กำลังเชื่อมต่อเซิร์ฟเวอร์ TrueMoney เพื่อตัดยอดซองของขวัญ...');
  setTimeout(() => {
    usedVouchers.push(voucherHash);
    localStorage.setItem('tactical_used_vouchers', JSON.stringify(usedVouchers));
    document.getElementById('voucher-url-input').value = '';
    triggerToast(`ตัดยอดเงินซองของขวัญสำเร็จ! (Hash: ${voucherHash.substring(0, 8)}...)`);
    simulateOrderSuccess();
  }, 1200);
}

function togglePasswordVisibility() {
  isPasswordRevealed = !isPasswordRevealed;
  const pwText = document.getElementById('acc-password');
  const toggleLabel = document.getElementById('pw-toggle-label');
  
  if (isPasswordRevealed) {
    pwText.innerText = currentDeliveredPassword;
    toggleLabel.innerText = 'ซ่อนรหัส';
  } else {
    pwText.innerText = '••••••••••••••••';
    toggleLabel.innerText = 'แสดงรหัส';
  }
}

function copyCredentials() {
  const textToCopy = `User: ${currentDeliveredUsername}
Pass: ${currentDeliveredPassword}`;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textToCopy);
    } else {
      const temp = document.createElement("textarea");
      temp.value = textToCopy;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
    }
  } catch (err) {
    console.warn("Copy error:", err);
  }

  const copyLabel = document.getElementById('copy-btn-text');
  if (copyLabel) {
    copyLabel.innerText = 'คัดลอกข้อมูลเรียบร้อยแล้ว!';
    triggerToast('คัดลอก Username & Password เรียบร้อยแล้ว!');
    setTimeout(() => {
      copyLabel.innerText = 'คัดลอก Username & Password ทั้งหมด';
    }, 2500);
  }
}

// ==========================================
// 7. CUSTOMER "MY ORDERS" HISTORY MODAL
// ==========================================
function getLocalOrders() {
  try {
    const raw = localStorage.getItem('tactical_my_orders');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOrderToLocal(order) {
  try {
    const list = getLocalOrders();
    list.unshift(order);
    localStorage.setItem('tactical_my_orders', JSON.stringify(list));
  } catch (err) {
    console.warn("Local storage error:", err);
  }
}

function updateMyOrdersBadge() {
  const list = getLocalOrders();
  const badge = document.getElementById('nav-order-badge');
  if (badge) {
    if (list.length > 0) {
      badge.innerText = list.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function openMyOrdersModal() {
  const modal = document.getElementById('my-orders-modal');
  const container = document.getElementById('my-orders-list');
  const empty = document.getElementById('my-orders-empty');
  if (!modal || !container) return;

  const orders = getLocalOrders();

  if (orders.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    empty.classList.add('flex');
  } else {
    empty.classList.add('hidden');
    empty.classList.remove('flex');
    container.innerHTML = orders.map((o, idx) => {
      const acc = o.accountDelivered || {};
      const timeStr = new Date(o.createdAt).toLocaleString('th-TH');

      return `
        <div class="glass-card p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
          <div class="flex justify-between items-start gap-2 border-b border-white/5 pb-2.5">
            <div>
              <span class="text-[10px] font-mono text-amber-500 font-bold">#${o.orderNumber}</span>
              <h4 class="font-bold text-white text-sm">${o.productName}</h4>
              <span class="text-[10px] text-zinc-500">${timeStr}</span>
            </div>
            <div class="text-right">
              <span class="text-sm font-heading font-black text-amber-400">฿${Number(o.amount).toFixed(2)}</span>
              <span class="block text-[10px] text-emerald-400 font-bold">✓ จัดส่งสำเร็จ</span>
            </div>
          </div>

          <div class="bg-black/50 p-3 rounded-xl border border-white/5 font-mono text-xs space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-zinc-500 text-[10px]">USERNAME:</span>
              <span class="text-amber-400 font-bold select-all">${acc.username || 'ArenaAgent'}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-zinc-500 text-[10px]">PASSWORD:</span>
              <span id="order-pw-${idx}" class="text-zinc-300 font-bold select-all">••••••••••••</span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button onclick="toggleOrderPassword('${idx}', '${acc.password || ''}')" class="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-bold text-zinc-300">
              <span id="order-btn-lbl-${idx}">แสดงรหัส</span>
            </button>
            <button onclick="copySpecificCredentials('${acc.username}', '${acc.password}')" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[11px] font-bold text-black font-heading">
              คัดลอกไอดี
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeMyOrdersModal() {
  const modal = document.getElementById('my-orders-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function toggleOrderPassword(idx, realPw) {
  const el = document.getElementById(`order-pw-${idx}`);
  const lbl = document.getElementById(`order-btn-lbl-${idx}`);
  if (!el || !lbl) return;

  if (el.innerText.includes('•')) {
    el.innerText = realPw || 'KamonaStrike#2026';
    lbl.innerText = 'ซ่อนรหัส';
  } else {
    el.innerText = '••••••••••••';
    lbl.innerText = 'แสดงรหัส';
  }
}

function copySpecificCredentials(u, p) {
  const text = `User: ${u}
Pass: ${p}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
  triggerToast('คัดลอกข้อมูลไอดีนี้เรียบร้อยแล้ว!');
}

// ==========================================
// 8. LIVE ORDER NOTIFICATION TICKER (MOSZXLLSHOP STYLE)
// ==========================================

// ==========================================
// 9. SHOPPING CART SYSTEM (ตะกร้าสินค้า)
// ==========================================
let cart = [];

function loadCart() {
  try {
    cart = JSON.parse(localStorage.getItem('tactical_cart') || '[]');
  } catch (err) {
    cart = [];
  }
  updateCartBadge();
}

function saveCart() {
  localStorage.setItem('tactical_cart', JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId) {
  const p = PRODUCTS.find(item => String(item.id) === String(productId));
  if (!p) return;
  if (Number(p.stock) === 0) {
    triggerToast('ขออภัย สินค้านี้หมดสต็อกแล้ว');
    return;
  }

  const existing = cart.find(i => String(i.id) === String(productId));
  if (existing) {
    if (existing.qty >= p.stock) {
      triggerToast(`สต็อกมีจำกัด ไม่สามารถเพิ่มเกิน ${p.stock} ชิ้นได้`);
      return;
    }
    existing.qty++;
  } else {
    cart.push({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      koen: p.koen,
      qty: 1
    });
  }

  saveCart();
  triggerToast(`เพิ่ม "${p.name}" ลงในตะกร้าเรียบร้อย!`);
}

function removeFromCart(productId) {
  cart = cart.filter(i => String(i.id) !== String(productId));
  saveCart();
  renderCartDrawer();
}

function updateCartQty(productId, delta) {
  const item = cart.find(i => String(i.id) === String(productId));
  if (!item) return;

  const p = PRODUCTS.find(x => String(x.id) === String(productId));
  const maxStock = p ? p.stock : 99;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeFromCart(productId);
  } else if (newQty > maxStock) {
    triggerToast(`สินค้าเหลือสต็อกเพียง ${maxStock} ชิ้น`);
  } else {
    item.qty = newQty;
    saveCart();
    renderCartDrawer();
  }
}

function clearCart() {
  cart = [];
  saveCart();
  renderCartDrawer();
  triggerToast('ล้างตะกร้าสินค้าเรียบร้อย');
}

function updateCartBadge() {
  const totalCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  const badge = document.getElementById('nav-cart-badge');
  const text = document.getElementById('nav-cart-text');
  if (badge) badge.innerText = totalCount;
  if (text) text.innerText = `฿${totalPrice.toFixed(2)}`;
}

function openCartDrawer() {
  renderCartDrawer();
  const drawer = document.getElementById('cart-drawer-modal');
  if (drawer) {
    drawer.classList.remove('hidden');
    drawer.classList.add('flex');
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer-modal');
  if (drawer) {
    drawer.classList.add('hidden');
    drawer.classList.remove('flex');
  }
}

function renderCartDrawer() {
  const container = document.getElementById('cart-drawer-items');
  const empty = document.getElementById('cart-drawer-empty');
  const countEl = document.getElementById('cart-drawer-count');
  const subtotalEl = document.getElementById('cart-subtotal-price');
  const grandtotalEl = document.getElementById('cart-grandtotal-price');

  if (!container) return;

  const totalCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  if (countEl) countEl.innerText = `${totalCount} รายการ`;
  if (subtotalEl) subtotalEl.innerText = `฿${totalPrice.toFixed(2)}`;
  if (grandtotalEl) grandtotalEl.innerText = `฿${totalPrice.toFixed(2)}`;

  if (cart.length === 0) {
    container.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  container.innerHTML = cart.map(item => `
    <div class="flex items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-white/5">
      <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded-xl border border-white/10 shrink-0">
      <div class="flex-grow overflow-hidden text-left">
        <h4 class="text-xs font-bold text-white truncate">${item.name}</h4>
        <div class="text-[10px] text-amber-500 font-mono">฿${Number(item.price).toFixed(2)}</div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0 bg-zinc-950 p-1 rounded-xl border border-white/10">
        <button onclick="updateCartQty('${item.id}', -1)" class="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 text-xs">-</button>
        <span class="w-5 text-center text-xs font-mono font-bold text-white">${item.qty}</span>
        <button onclick="updateCartQty('${item.id}', 1)" class="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 text-xs">+</button>
      </div>
      <button onclick="removeFromCart('${item.id}')" class="text-zinc-500 hover:text-red-400 p-1.5" title="ลบ">✕</button>
    </div>
  `).join('');
}

function checkoutCart() {
  if (cart.length === 0) {
    triggerToast('ตะกร้าสินค้าว่างเปล่า กรุณาเลือกสินค้าก่อนสั่งซื้อ');
    return;
  }
  closeCartDrawer();
  // Checkout with the first item in cart
  startCheckout(cart[0].id);
}

// ==========================================
// 10. ORDER TRACKING LOOKUP (ค้นหาออเดอร์ด้วย ID)
// ==========================================
function openOrderTrackingModal() {
  const modal = document.getElementById('order-tracking-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('order-track-input')?.focus();
  }
}

function closeOrderTrackingModal() {
  const modal = document.getElementById('order-tracking-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function handleOrderTrackSearch() {
  const queryVal = document.getElementById('order-track-input')?.value.trim();
  const resContainer = document.getElementById('order-track-result');
  if (!queryVal) {
    triggerToast('กรุณากรอกเลขออเดอร์หรืออีเมลที่ใช้สั่งซื้อ');
    return;
  }

  triggerToast('กำลังค้นหาข้อมูลคำสั่งซื้อ...');
  if (resContainer) {
    resContainer.classList.remove('hidden');
    resContainer.innerHTML = '<div class="py-8 text-center text-zinc-400 text-xs">กำลังค้นหาในฐานข้อมูล Firestore...</div>';
  }

  // 1. Search in Local Storage orders
  const localOrders = getLocalOrders();
  let matched = localOrders.find(o => 
    (o.orderNumber && o.orderNumber.toLowerCase() === queryVal.toLowerCase()) ||
    (o.userEmail && o.userEmail.toLowerCase() === queryVal.toLowerCase())
  );

  // 2. Search in Firestore if db available
  if (!matched) {
    try {
      const snap = await getDocs(query(collection(db, "orders"), where("orderNumber", "==", queryVal.toUpperCase())));
      if (!snap.empty) {
        matched = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    } catch (err) { }
  }

  if (!matched) {
    if (resContainer) {
      resContainer.innerHTML = `
        <div class="p-6 text-center bg-zinc-900/60 rounded-2xl border border-red-500/20">
          <div class="text-3xl mb-2">🔍</div>
          <div class="text-sm font-bold text-white mb-1">ไม่พบคำสั่งซื้อ: "${queryVal}"</div>
          <div class="text-xs text-zinc-500 mb-4">โปรดตรวจสอบหมายเลขคำสั่งซื้อให้ถูกต้อง หรือติดต่อแอดมินทาง Discord / Facebook</div>
          <a href="https://discord.gg/tacticalstore" target="_blank" class="inline-block bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-bold">
            ติดต่อซัพพอร์ตแอดมิน
          </a>
        </div>
      `;
    }
    return;
  }

  // Matched order rendering
  const acc = matched.accountDelivered || {};
  if (resContainer) {
    resContainer.innerHTML = `
      <div class="bg-zinc-900/80 p-5 rounded-2xl border border-amber-500/30 space-y-4">
        <div class="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <span class="text-[10px] text-zinc-500 uppercase font-mono block">ORDER NUMBER</span>
            <span class="text-base font-heading font-black text-amber-400 font-mono">${matched.orderNumber || matched.id}</span>
          </div>
          <div class="text-right">
            <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              ✓ ${matched.status || 'จัดส่งสำเร็จ'}
            </span>
            <div class="text-[10px] text-zinc-500 mt-1">${matched.createdAt ? new Date(matched.createdAt).toLocaleString('th-TH') : '-'}</div>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-400">สินค้า: <strong class="text-white">${matched.productName}</strong></span>
          <span class="font-mono font-bold text-white">฿${Number(matched.amount || 0).toFixed(2)} (${matched.paymentMethod})</span>
        </div>

        <!-- Credential Vault Box -->
        <div class="bg-black/90 p-4 rounded-xl border border-white/10 space-y-2.5">
          <div class="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span>🔐</span> บัญชีเกมที่ได้รับมอบ (TACTICAL CREDENTIAL)
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs font-mono">
            <div class="bg-zinc-900/90 p-2.5 rounded-lg border border-white/5">
              <span class="text-zinc-500 text-[10px] block">Username:</span>
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-white font-bold truncate">${acc.username || '-'}</span>
                <button onclick="navigator.clipboard.writeText('${acc.username}'); triggerToast('คัดลอก Username สำเร็จ');" class="text-zinc-400 hover:text-amber-400 text-xs">📋</button>
              </div>
            </div>

            <div class="bg-zinc-900/90 p-2.5 rounded-lg border border-white/5">
              <span class="text-zinc-500 text-[10px] block">Password:</span>
              <div class="flex items-center justify-between mt-0.5">
                <span id="track-pw-val" class="text-white font-bold truncate">••••••••</span>
                <div class="flex items-center gap-1">
                  <button onclick="
                    const el = document.getElementById('track-pw-val');
                    if (el.innerText === '••••••••') el.innerText = '${acc.password}';
                    else el.innerText = '••••••••';
                  " class="text-zinc-400 hover:text-amber-400 text-xs">👁️</button>
                  <button onclick="navigator.clipboard.writeText('${acc.password}'); triggerToast('คัดลอก Password สำเร็จ');" class="text-zinc-400 hover:text-amber-400 text-xs">📋</button>
                </div>
              </div>
            </div>
          </div>

          <div class="text-[10px] text-zinc-400 leading-relaxed bg-zinc-900/40 p-2 rounded-lg border border-white/5">
            ⚠️ <span class="text-amber-400 font-bold">คำแนะนำ:</span> ${acc.note || 'กรุณาล็อกอินและเปลี่ยนรหัสผ่านในเกม Arena Breakout ทันทีหลังได้รับไอดี'}
          </div>
        </div>
      </div>
    `;
  }
}

// ==========================================
// 11. SELL ACCOUNT SYSTEM (ส่งขายไอดีไก่ให้ร้าน)
// ==========================================
function openSellAccountModal() {
  const modal = document.getElementById('sell-account-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeSellAccountModal() {
  const modal = document.getElementById('sell-account-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function handleSellAccountSubmit(e) {
  e.preventDefault();
  const subId = `SUB-AB${Math.floor(100000 + Math.random() * 900000)}`;

  const subRecord = {
    id: subId,
    accountType: document.getElementById('sell-acc-type').value,
    quantity: Number(document.getElementById('sell-acc-qty').value) || 1,
    askingPrice: Number(document.getElementById('sell-acc-price').value) || 0,
    paymentMethod: 'PromptPay',
    accountNumber: document.getElementById('sell-acc-payout').value.trim(),
    accountName: document.getElementById('sell-acc-name').value.trim(),
    contactType: 'Contact',
    contactDetail: document.getElementById('sell-acc-contact').value.trim(),
    credentials: document.getElementById('sell-acc-creds').value.trim(),
    notes: document.getElementById('sell-acc-notes').value.trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  // Save to localStorage
  const savedSubs = JSON.parse(localStorage.getItem('tactical_sell_submissions') || '[]');
  savedSubs.unshift(subRecord);
  localStorage.setItem('tactical_sell_submissions', JSON.stringify(savedSubs));

  // Save to Firestore
  try {
    await addDoc(collection(db, "sell_submissions"), {
      ...subRecord,
      createdAt: serverTimestamp()
    });
  } catch (err) { }

  // Send Discord Webhook
  dispatchDiscordNotification('sell_submission', subRecord);

  closeSellAccountModal();
  e.target.reset();
  alert(`ส่งรายการเสนอขายสำเร็จ!\n\nหมายเลขติดตามงานของคุณ: #${subId}\nแอดมินจะตรวจสอบและโอนเงินเข้าบัญชีของคุณโดยเร็วที่สุด`);
  triggerToast(`ส่งรายการเสนอขาย #${subId} เรียบร้อย!`);
}

// ==========================================
// 12. CUSTOMER REVIEWS SUBSYSTEM
// ==========================================
let storeReviews = [
  { id: 'rev_1', name: 'Agent_Zero', rating: 5, productName: 'M4A1 Full Mod + T6 Ammo x300', text: 'ไอดีพร้อมเล่น ปืนแต่งแน่นมาก ซื้อปุ๊บได้รหัสทันที ลุยลงเรดได้เลย แนะนำครับ', date: '2026-10-09' },
  { id: 'rev_2', name: 'KoenKing', rating: 5, productName: 'Starter Koen Account (15 Million)', text: 'เงิน 15M ครบถ้วน เมลสะอาด เปลี่ยนรหัสผ่านได้จริง รวดเร็วมากครับ', date: '2026-10-10' },
  { id: 'rev_3', name: 'GhostSniper', rating: 5, productName: 'FAL Full Mod + M61 (T6) x300', text: 'สลิปตรวจอัตโนมัติ ไม่ต้องทักแชทรอนาน ไก่กระสุน T6 เล่นมันส์มาก', date: '2026-10-11' }
];

function initReviewsListener() {
  try {
    onSnapshot(collection(db, "reviews"), (snapshot) => {
      if (!snapshot.empty) {
        storeReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        const saved = localStorage.getItem('tactical_reviews');
        if (saved) storeReviews = JSON.parse(saved);
      }
      renderReviewsFeed();
    }, () => {
      const saved = localStorage.getItem('tactical_reviews');
      if (saved) storeReviews = JSON.parse(saved);
      renderReviewsFeed();
    });
  } catch (err) {
    const saved = localStorage.getItem('tactical_reviews');
    if (saved) storeReviews = JSON.parse(saved);
    renderReviewsFeed();
  }
}

function renderReviewsFeed() {
  const grid = document.getElementById('reviews-grid');
  if (!grid) return;

  grid.innerHTML = storeReviews.map(r => `
    <div class="glass-card p-6 rounded-3xl border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between">
      <div>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
              ${(r.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="text-xs font-bold text-white">${r.name || 'ผู้เล่นนิรนาม'}</div>
              <div class="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span class="w-1 h-1 rounded-full bg-emerald-400"></span> ยืนยันผู้ซื้อจริง
              </div>
            </div>
          </div>
          <div class="text-amber-400 text-xs font-bold font-mono">
            ${'⭐'.repeat(r.rating || 5)}
          </div>
        </div>

        <p class="text-xs text-zinc-300 leading-relaxed mb-4">
          "${r.text}"
        </p>
      </div>

      <div class="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
        <span class="truncate max-w-[180px]">${r.productName || 'ไอดี Arena Breakout'}</span>
        <span class="font-mono">${r.date ? new Date(r.date).toLocaleDateString('th-TH') : 'เมื่อเร็วๆนี้'}</span>
      </div>
    </div>
  `).join('');
}

function openReviewModal() {
  const modal = document.getElementById('add-review-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeReviewModal() {
  const modal = document.getElementById('add-review-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function handleReviewSubmit(e) {
  e.preventDefault();
  const rating = Number(document.getElementById('review-rating').value) || 5;
  const author = document.getElementById('review-author').value.trim();
  const prod = document.getElementById('review-product').value.trim() || 'ไอดี Arena Breakout';
  const text = document.getElementById('review-text').value.trim();

  const newRev = {
    id: `rev_${Date.now()}`,
    name: author,
    rating,
    productName: prod,
    text,
    date: new Date().toISOString()
  };

  storeReviews.unshift(newRev);
  localStorage.setItem('tactical_reviews', JSON.stringify(storeReviews));

  try {
    await addDoc(collection(db, "reviews"), newRev);
  } catch (err) { }

  renderReviewsFeed();
  closeReviewModal();
  e.target.reset();
  triggerToast('ขอบคุณสำหรับรีวิวของคุณ!');
}

// ==========================================
// 13. DISCORD NOTIFICATION DISPATCHER
// ==========================================
async function dispatchDiscordNotification(type, data) {
  const settings = JSON.parse(localStorage.getItem('tactical_store_settings') || '{}');
  const webhookUrl = settings.discordWebhook;
  if (!webhookUrl || !webhookUrl.startsWith('http')) return;

  try {
    let payload = null;
    if (type === 'order') {
      payload = {
        content: `🛒 **[คำสั่งซื้อใหม่ #${data.orderNumber}]** ได้รับการชำระเงินเรียบร้อย!`,
        embeds: [{
          title: `📦 ${data.productName}`,
          description: `ลูกค้าได้ชำระเงินและรับไอดีเกมจากระบบตู้เซฟเรียบร้อยแล้ว`,
          color: 16103179, // Amber
          fields: [
            { name: "ยอดชำระ", value: `฿${Number(data.amount).toFixed(2)}`, inline: true },
            { name: "ช่องทาง", value: data.paymentMethod, inline: true },
            { name: "ผู้ซื้อ", value: data.userEmail || 'Guest', inline: true },
            { name: "Username ที่ส่งมอบ", value: data.accountDelivered?.username || '-', inline: true }
          ],
          timestamp: new Date().toISOString()
        }]
      };
    } else if (type === 'sell_submission') {
      payload = {
        content: `💰 **[มีคนส่งไอดีมาขาย #${data.id}]** รายการใหม่รอการตรวจสอบ!`,
        embeds: [{
          title: `📥 ${data.accountType} (${data.quantity} ตัว)`,
          description: `ผู้เล่นเสนอขายไอดีไก่ในราคา ฿${Number(data.askingPrice).toFixed(2)}`,
          color: 3066993, // Green
          fields: [
            { name: "ราคาเสนอขาย", value: `฿${Number(data.askingPrice).toFixed(2)}`, inline: true },
            { name: "บัญชีรับเงิน", value: `${data.accountNumber} (${data.accountName})`, inline: true },
            { name: "ช่องทางติดต่อ", value: data.contactDetail, inline: true }
          ],
          timestamp: new Date().toISOString()
        }]
      };
    }

    if (payload) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
  } catch (err) {
    console.warn("Discord Webhook dispatch failed:", err);
  }
}

function startLiveOrderTicker() {
  const sampleTickerItems = [
    { product: 'M4A1 Full Mod + T6 Ammo', price: '฿350.00', mins: 2 },
    { product: 'Starter Koen 15 Million', price: '฿150.00', mins: 5 },
    { product: 'FAL Full Mod + M61 (T6)', price: '฿420.00', mins: 8 },
    { product: 'Mega Wealthy Koen 100M', price: '฿1,190.00', mins: 12 },
    { product: 'Budget Runner Set + MPX', price: '฿120.00', mins: 15 }
  ];

  let tickerIdx = 0;
  setInterval(() => {
    const item = sampleTickerItems[tickerIdx % sampleTickerItems.length];
    tickerIdx++;

    const tickerEl = document.getElementById('live-order-ticker');
    const prodEl = document.getElementById('ticker-product');
    const priceEl = document.getElementById('ticker-price');
    const timeEl = document.getElementById('ticker-time');

    if (!tickerEl) return;

    prodEl.innerText = `ลูกค้าเพิ่งสั่งซื้อ: ${item.product}`;
    priceEl.innerText = `จัดส่งสำเร็จ • ${item.price}`;
    timeEl.innerText = `เมื่อ ${item.mins} นาทีที่แล้ว`;

    tickerEl.classList.remove('hidden');
    tickerEl.classList.add('animate-ticker');

    setTimeout(() => {
      tickerEl.classList.remove('animate-ticker');
      tickerEl.classList.add('hidden');
    }, 6000);
  }, 22000);
}

// ==========================================
// 9. NAVIGATION VIEW CONTROLLER
// ==========================================
function navigateTo(viewName) {
  const storeView = document.getElementById('view-store');
  const checkoutView = document.getElementById('view-checkout');
  const successView = document.getElementById('view-success');

  if (storeView) storeView.classList.add('hidden');
  if (checkoutView) checkoutView.classList.add('hidden');
  if (successView) successView.classList.add('hidden');

  if (viewName === 'store' && storeView) {
    storeView.classList.remove('hidden');
    stopTimer();
  } else if (viewName === 'checkout' && checkoutView) {
    checkoutView.classList.remove('hidden');
  } else if (viewName === 'success' && successView) {
    successView.classList.remove('hidden');
    stopTimer();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// 10. ATTACH TO WINDOW & INITIALIZE
// ==========================================
window.navigateTo = navigateTo;
window.filterCategory = filterCategory;
window.triggerToast = triggerToast;
window.handleSearch = handleSearch;
window.setStockFilter = setStockFilter;
window.handleSortChange = handleSortChange;
window.clearSearchAndFilters = clearSearchAndFilters;
window.scrollToCatalog = scrollToCatalog;
window.openDetailModal = openDetailModal;
window.closeDetailModal = closeDetailModal;
window.switchGalleryImage = switchGalleryImage;
window.startCheckout = startCheckout;
window.applyPromoCode = applyPromoCode;
window.switchPaymentTab = switchPaymentTab;
window.simulateOrderSuccess = simulateOrderSuccess;
window.simulateVoucherPayment = simulateVoucherPayment;
window.togglePasswordVisibility = togglePasswordVisibility;
window.copyCredentials = copyCredentials;
window.handleSignOut = handleSignOut;
window.openMyOrdersModal = openMyOrdersModal;
window.closeMyOrdersModal = closeMyOrdersModal;
window.toggleOrderPassword = toggleOrderPassword;
window.copySpecificCredentials = copySpecificCredentials;

// Cart Exports
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQty = updateCartQty;
window.clearCart = clearCart;
window.checkoutCart = checkoutCart;

// Order Tracking Exports
window.openOrderTrackingModal = openOrderTrackingModal;
window.closeOrderTrackingModal = closeOrderTrackingModal;
window.handleOrderTrackSearch = handleOrderTrackSearch;

// Sell Account Exports
window.openSellAccountModal = openSellAccountModal;
window.closeSellAccountModal = closeSellAccountModal;
window.handleSellAccountSubmit = handleSellAccountSubmit;

// Slip Upload Exports
window.handleSlipFileChange = handleSlipFileChange;
window.removeSlipFile = removeSlipFile;

// Reviews Exports
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.handleReviewSubmit = handleReviewSubmit;

window.addEventListener('DOMContentLoaded', () => {
  initAuthListener();
  renderCategoryTabs();
  renderProducts();
  initFirebaseProductsListener();
  initSettingsListener();
  updateMyOrdersBadge();
  startLiveOrderTicker();
loadCart();
initReviewsListener();
});
