import { db, auth } from "../firebase-config.js";
import { 
  collection, 
  onSnapshot, 
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * TACTICAL STORE — Category Directory Controller (js/category.js)
 * Rewritten for Horizontal Pills style matching Moszxllshop
 */

const DEFAULT_CATEGORIES = [
  { id: 'ammo_acc', name: 'หมวดหมู่ไก่กระสุน', image: 'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800' },
  { id: 'koen_m', name: 'หมวดหมู่ไก่เงินm', image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=800' },
  { id: 'transfer_m', name: 'หมวดหมู่โยกเงินm', image: 'https://images.unsplash.com/photo-1574226516831-e1dff420e5c7?auto=format&fit=crop&q=80&w=800' }
];

const DEFAULT_PRODUCTS = [
  // --- หมวดหมู่ไก่กระสุน ---
  {
    id: '1', name: 'M4A1 Full Mod + T6 Ammo x300', category: 'ammo_acc', price: 350.00, koen: '5,500,000', stock: 12,
    image: 'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800', tags: ['Best Seller', 'พร้อมบวก']
  },
  {
    id: '2', name: 'FAL 7.62 Battle Rifle Heavy Mod', category: 'ammo_acc', price: 290.00, koen: '4,000,000', stock: 18,
    image: 'https://images.unsplash.com/photo-1550985542-f28329b3a364?auto=format&fit=crop&q=80&w=800', tags: ['ดาเมจจัด', 'ยอดนิยม']
  },
  {
    id: '3', name: 'AX-50 One-Shot Sniper Kit + T7 Thermal', category: 'ammo_acc', price: 490.00, koen: '8,200,000', stock: 5,
    image: 'https://images.unsplash.com/photo-1585098906517-8e1008d58544?auto=format&fit=crop&q=80&w=800', tags: ['One-Shot', 'Thermal T7']
  },
  // --- หมวดหมู่ไก่เงินm ---
  {
    id: '4', name: 'Starter Koen Account (15 ล้าน Koen)', category: 'koen_m', price: 150.00, koen: '15,000,000', stock: 45,
    image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=800', tags: ['สายฟาร์ม', 'คุ้มสุด']
  },
  {
    id: '5', name: 'Pro Koen Account (30 ล้าน Koen)', category: 'koen_m', price: 280.00, koen: '30,000,000', stock: 20,
    image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=800', tags: ['ยอดฮิต', 'เงินแน่น']
  },
  {
    id: '6', name: 'Elite Whales Account (50 ล้าน Koen + ไอเทมแดง)', category: 'koen_m', price: 990.00, koen: '50,000,000', stock: 3,
    image: 'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?auto=format&fit=crop&q=80&w=800', tags: ['ระดับตำนาน', 'คลังไอเทมแดง']
  },
  // --- หมวดหมู่โยกเงินm ---
  {
    id: '7', name: 'บริการโยกเงิน 5 ล้าน Koen (ส่งมอบปลอดภัย 100%)', category: 'transfer_m', price: 120.00, koen: '5,000,000', stock: 50,
    image: 'https://images.unsplash.com/photo-1574226516831-e1dff420e5c7?auto=format&fit=crop&q=80&w=800', tags: ['โยกเงิน M', 'ส่งไว']
  },
  {
    id: '8', name: 'บริการโยกเงิน 10 ล้าน Koen (แพ็กเกจยอดนิยม คุ้มค่า)', category: 'transfer_m', price: 220.00, koen: '10,000,000', stock: 30,
    image: 'https://images.unsplash.com/photo-1574226516831-e1dff420e5c7?auto=format&fit=crop&q=80&w=800', tags: ['แพ็กเกจแนะนำ', 'คุ้มสุด']
  },
  {
    id: '9', name: 'บริการโยกเงิน 25 ล้าน Koen (VIP Fast Transfer)', category: 'transfer_m', price: 500.00, koen: '25,000,000', stock: 15,
    image: 'https://images.unsplash.com/photo-1574226516831-e1dff420e5c7?auto=format&fit=crop&q=80&w=800', tags: ['VIP Transfer', 'ส่งด่วนพิเศษ']
  }
];

let categoriesList = [...DEFAULT_CATEGORIES];
let productsList = [...DEFAULT_PRODUCTS];
let currentCategory = 'all'; // เริ่มต้นที่ "ทั้งหมด"
let categorySearchQuery = '';
let categorySortOrder = 'default';
let activeModalProduct = null;

function triggerToast(msg) {
  const box = document.getElementById('toast-box');
  const text = document.getElementById('toast-text');
  if (!box || !text) return;
  text.innerText = msg;
  box.classList.remove('opacity-0', '-translate-y-4', 'scale-95');
  box.classList.add('opacity-100', 'translate-y-0', 'scale-100');
  clearTimeout(box._timer);
  box._timer = setTimeout(() => {
    box.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
    box.classList.add('opacity-0', '-translate-y-4', 'scale-95');
  }, 3200);
}

function initData() {
  const params = new URLSearchParams(window.location.search);
  const requestedCat = params.get('cat');
  if (requestedCat) {
    currentCategory = requestedCat;
  }

  // Load Categories
  try {
    onSnapshot(collection(db, "categories"), (snapshot) => {
      if (!snapshot.empty) categoriesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderCategorySelector();
      renderCategoryProducts();
    }, () => {
      const saved = localStorage.getItem('tactical_categories');
      if(saved) categoriesList = JSON.parse(saved);
      renderCategorySelector();
      renderCategoryProducts();
    });
  } catch (e) {
    renderCategorySelector();
    renderCategoryProducts();
  }

  // Load Products
  try {
    onSnapshot(collection(db, "products"), (snapshot) => {
      if (!snapshot.empty) productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderCategorySelector();
      renderCategoryProducts();
    }, () => {
      const saved = localStorage.getItem('tactical_products');
      if(saved) productsList = JSON.parse(saved);
      renderCategorySelector();
      renderCategoryProducts();
    });
  } catch (e) {
    renderCategorySelector();
    renderCategoryProducts();
  }
}

// แถบสลับหมวดหมู่แนวนอน 
function renderCategorySelector() {
  const container = document.getElementById('category-selector-grid');
  if (!container) return;

  const allSelected = currentCategory === 'all';
  const allClass = allSelected 
      ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
      : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white hover:bg-zinc-800';

  let html = `
      <button onclick="selectCategory('all')" class="flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300 ${allClass} snap-start">
        <div class="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shadow-md border border-white/10 ${allSelected ? 'bg-black/20 border-black/20 text-black' : 'text-zinc-500'}">
           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
        </div>
        <span class="text-sm font-bold whitespace-nowrap">ทั้งหมด</span>
      </button>
  `;

  html += categoriesList.map(cat => {
    const isSelected = cat.id === currentCategory;
    const activeClass = isSelected 
      ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
      : 'bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white hover:bg-zinc-800';

    return `
      <button onclick="selectCategory('${cat.id}')" class="flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300 ${activeClass} snap-start">
        <img src="${cat.image || 'https://placehold.co/100x100/18181b/f59e0b?text=CAT'}" class="w-8 h-8 rounded-full object-cover shadow-md" alt="${cat.name}">
        <span class="text-sm font-bold whitespace-nowrap">${cat.name}</span>
      </button>
    `;
  }).join('');
  
  container.innerHTML = html;
}

function selectCategory(catId) {
  currentCategory = catId;
  const url = new URL(window.location);
  url.searchParams.set('cat', catId);
  window.history.pushState({}, '', url);

  renderCategorySelector();
  renderCategoryProducts();
}

function searchCategoryProducts(val) {
  categorySearchQuery = (val || '').trim();
  renderCategoryProducts();
}

function sortCategoryProducts(val) {
  categorySortOrder = val;
  const desktopSort = document.getElementById('cat-prod-sort');
  const mobileSort = document.getElementById('cat-prod-sort-mobile');
  if (desktopSort && desktopSort.value !== val) desktopSort.value = val;
  if (mobileSort && mobileSort.value !== val) mobileSort.value = val;
  renderCategoryProducts();
}

function renderCategoryProducts() {
  const grid = document.getElementById('category-products-grid');
  const empty = document.getElementById('category-products-empty');
  if (!grid) return;

  let filtered = productsList;
  if (currentCategory !== 'all') {
    filtered = filtered.filter(p => p.category === currentCategory);
  }

  if (categorySearchQuery) {
    const q = categorySearchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.desc && p.desc.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  if (categorySortOrder === 'price-asc') {
    filtered.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (categorySortOrder === 'price-desc') {
    filtered.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  } else if (categorySortOrder === 'stock-desc') {
    filtered.sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (empty) {
      empty.classList.remove('hidden');
      empty.classList.add('flex');
    }
    return;
  }

  if (empty) {
    empty.classList.add('hidden');
    empty.classList.remove('flex');
  }

  grid.innerHTML = filtered.map(product => {
    const isOutOfStock = Number(product.stock) <= 0;
    const stockBadge = isOutOfStock
      ? '<span class="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">สินค้าหมด</span>'
      : `<span class="bg-emerald-500/90 text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><span class="w-1.5 h-1.5 bg-black rounded-full animate-ping"></span>คงเหลือ ${product.stock}</span>`;
      
    const tagHtml = (product.tags && product.tags.length > 0) ? product.tags.map(t => `<span class="bg-black/70 backdrop-blur-md text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">${t}</span>`).join('') : '';

    return `
      <div class="group relative rounded-3xl overflow-hidden bg-zinc-950 border flex flex-col h-full transition-all duration-300 ${isOutOfStock ? 'border-red-950/30 opacity-70' : 'border-white/10 hover:border-amber-500/60 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]'}">
        <div onclick="openProductModal('${product.id}')" class="relative aspect-[16/10] overflow-hidden bg-zinc-900 cursor-pointer">
          <img 
            src="${product.image || 'https://placehold.co/800x500/18181b/f59e0b?text=Item'}" 
            alt="${product.name}" 
            class="w-full h-full object-cover transition-transform duration-700 ${!isOutOfStock ? 'group-hover:scale-105' : 'grayscale'}"
            onerror="this.src='https://placehold.co/800x500/18181b/f59e0b?text=Item'"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10"></div>
          
          <div class="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5">
            ${stockBadge}
            ${tagHtml}
          </div>
        </div>

        <div class="p-5 flex flex-col flex-grow z-20">
          <h3 onclick="openProductModal('${product.id}')" class="text-base font-bold text-white mb-1.5 line-clamp-1 group-hover:text-amber-400 transition-colors cursor-pointer">
            ${product.name}
          </h3>
          
          <p class="text-zinc-500 text-xs line-clamp-2 mb-4 leading-relaxed">
            ${product.desc || '-'}
          </p>

          <div class="mb-4">
            <div class="inline-flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-xl border border-white/5">
              <span class="text-[10px] uppercase font-bold text-zinc-500">มูลค่า Koen</span>
              <span class="font-heading text-xs text-amber-500 font-bold">${product.koen || '0 Koen'}</span>
            </div>
          </div>

          <div class="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
            <div class="flex flex-col">
              <span class="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">ราคา</span>
              <span class="text-lg font-heading font-black text-white">
                ฿${Number(product.price || 0).toFixed(2)}
              </span>
            </div>
            
            <div class="flex items-center gap-2">
              <button onclick="openProductModal('${product.id}')" class="text-xs text-zinc-400 hover:text-white px-2.5 py-2 rounded-xl hover:bg-zinc-900 transition-colors">
                รายละเอียด
              </button>
              <button 
                onclick="startCheckout('${product.id}')" 
                ${isOutOfStock ? 'disabled' : ''} 
                class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                  isOutOfStock 
                  ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' 
                  : 'bg-amber-500 text-black hover:bg-white hover:scale-105 active:scale-95 shadow-md'
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

// Modal View Functions
function openProductModal(prodId) {
  const prod = productsList.find(p => p.id === prodId);
  if (!prod) return;

  activeModalProduct = prod;
  const modal = document.getElementById('detail-modal');
  const catObj = categoriesList.find(c => c.id === prod.category) || { name: 'สินค้าทั่วไป' };

  document.getElementById('modal-title').innerText = prod.name;
  document.getElementById('modal-desc').innerText = prod.desc || 'ไม่มีรายละเอียดเพิ่มเติม';
  document.getElementById('modal-price').innerText = `฿${Number(prod.price || 0).toFixed(2)}`;
  document.getElementById('modal-koen-tag').innerText = `💰 ${prod.koen || '0 Koen'}`;
  document.getElementById('modal-category-name').innerText = catObj.name;
  
  const mainImg = document.getElementById('modal-main-image');
  mainImg.src = prod.image || 'https://placehold.co/800x500/18181b/f59e0b?text=Item';

  const thumbsContainer = document.getElementById('modal-thumbnails');
  const gallery = prod.gallery && prod.gallery.length > 0 ? prod.gallery : [prod.image];
  thumbsContainer.innerHTML = gallery.map((imgUrl) => `
    <div onclick="switchModalGalleryImage('${imgUrl}')" class="w-16 h-12 rounded-xl overflow-hidden border border-white/10 hover:border-amber-500 cursor-pointer shrink-0 transition-all">
      <img src="${imgUrl}" alt="Thumb" class="w-full h-full object-cover">
    </div>
  `).join('');

  const specsContainer = document.getElementById('modal-specs-list');
  specsContainer.innerHTML = (prod.specs || []).map(s => `
    <li class="flex items-center gap-2">
      <span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
      <span>${s}</span>
    </li>
  `).join('');

  document.body.style.overflow = 'hidden';
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function switchModalGalleryImage(url) {
  const mainImg = document.getElementById('modal-main-image');
  if (mainImg) mainImg.src = url;
}

function closeProductModal() {
  const modal = document.getElementById('detail-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  document.body.style.overflow = '';
}

function triggerCheckoutFromModal() {
  closeProductModal();
  if (activeModalProduct) {
    startCheckout(activeModalProduct.id);
  }
}

function startCheckout(prodId) {
  const prod = productsList.find(p => p.id === prodId);
  if (!prod) return;

  activeModalProduct = prod;
  const modal = document.getElementById('checkout-modal');
  document.getElementById('checkout-prod-name').innerText = prod.name;
  document.getElementById('checkout-total-price').innerText = `฿${Number(prod.price || 0).toFixed(2)}`;
  
  document.getElementById('checkout-step-pay').classList.remove('hidden');
  document.getElementById('checkout-step-success').classList.add('hidden');

  document.body.style.overflow = 'hidden';
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  document.body.style.overflow = '';
}

let currentCategoryDeliveredPass = '';
let isCatPwVisible = false;

function toggleCategoryPassword() {
  isCatPwVisible = !isCatPwVisible;
  const el = document.getElementById('success-pass-text');
  const btn = document.getElementById('cat-pw-toggle-btn');
  if (el) el.innerText = isCatPwVisible ? currentCategoryDeliveredPass : '••••••••';
  if (btn) btn.innerText = isCatPwVisible ? '🙈 ซ่อน' : '👁️ แสดง';
}

async function handleCategoryOrderPayment() {
  if (!activeModalProduct) return;
  const btn = document.getElementById('btn-confirm-pay');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'กำลังตรวจสอบการชำระเงินและดึงไอดีจากตู้เซฟ...';
  }

  const orderNum = 'ORD-AB' + Math.floor(100000 + Math.random() * 900000);

  // 1. Dispense from Inventory Vault if available
  const savedVault = JSON.parse(localStorage.getItem('tactical_vault_accounts') || '[]');
  const prodIdStr = String(activeModalProduct.id);
  let vaultAcc = savedVault.find(a => String(a.productId) === prodIdStr && a.status === 'available');

  let deliveredUser = 'TacticalAgent_' + Math.floor(1000 + Math.random() * 9000);
  let deliveredPass = 'Pass_' + Math.random().toString(36).substring(2, 8).toUpperCase() + '!';
  let deliveredNote = 'กรุณาเปลี่ยนรหัสผ่านในเกม Arena Breakout ทันทีหลังได้รับไอดี';

  if (vaultAcc) {
    deliveredUser = vaultAcc.username;
    deliveredPass = vaultAcc.password;
    deliveredNote = vaultAcc.note || deliveredNote;
    vaultAcc.status = 'sold';
    vaultAcc.orderId = orderNum;
    vaultAcc.soldAt = new Date().toISOString();
    localStorage.setItem('tactical_vault_accounts', JSON.stringify(savedVault));
  }

  currentCategoryDeliveredPass = deliveredPass;
  window.currentCategoryDeliveredPass = deliveredPass;

  const orderData = {
    orderNumber: orderNum,
    productId: activeModalProduct.id,
    productName: activeModalProduct.name,
    category: activeModalProduct.category,
    amount: activeModalProduct.price,
    paymentMethod: 'promptpay',
    accountDelivered: {
      username: deliveredUser,
      password: deliveredPass,
      note: deliveredNote
    },
    status: 'จัดส่งสำเร็จ',
    createdAt: new Date().toISOString()
  };

  try {
    await addDoc(collection(db, "orders"), orderData);
  } catch (err) {
    console.warn("Firestore order write failed, save local:", err);
  }

  const savedOrders = JSON.parse(localStorage.getItem('tactical_orders') || '[]');
  savedOrders.unshift({ id: 'ord_' + Date.now(), ...orderData });
  localStorage.setItem('tactical_orders', JSON.stringify(savedOrders));

  const customerOrders = JSON.parse(localStorage.getItem('tactical_my_orders') || '[]');
  customerOrders.unshift({ id: 'ord_' + Date.now(), ...orderData });
  localStorage.setItem('tactical_my_orders', JSON.stringify(customerOrders));

  document.getElementById('checkout-step-pay').classList.add('hidden');
  document.getElementById('checkout-step-success').classList.remove('hidden');
  document.getElementById('success-order-num').innerText = '#' + orderNum;
  document.getElementById('success-user-text').innerText = deliveredUser;
  document.getElementById('success-pass-text').innerText = '••••••••';

  triggerToast('สั่งซื้อและจัดส่งไอดีเกมสำเร็จ!');
  if (btn) {
    btn.disabled = false;
    btn.innerText = 'แจ้งโอนเงินเรียบร้อย (รับไอดีทันที)';
  }
}

window.toggleCategoryPassword = toggleCategoryPassword;

window.selectCategory = selectCategory;
window.searchCategoryProducts = searchCategoryProducts;
window.sortCategoryProducts = sortCategoryProducts;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.switchModalGalleryImage = switchModalGalleryImage;
window.triggerCheckoutFromModal = triggerCheckoutFromModal;
window.startCheckout = startCheckout;
window.closeCheckoutModal = closeCheckoutModal;
window.handleCategoryOrderPayment = handleCategoryOrderPayment;

window.addEventListener('DOMContentLoaded', () => {
  initData();
});
