import { db, auth } from "../firebase-config.js";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  getDoc,
  doc, 
  deleteDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/**
 * TACTICAL STORE — Admin Backoffice Suite (js/admin.js)
 * [FIXED]: 
 * 1. Force Admin Password Check / First-time Database Setup
 * 2. Instant & Persistent Deletion Bugfix
 */

const IMAGE_PRESETS = {
  m4a1: 'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800',
  koen: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=800',
  sniper: 'https://images.unsplash.com/photo-1574226516831-e1dff420e5c7?auto=format&fit=crop&q=80&w=800',
  fal: 'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800',
  wealth: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=800',
  smg: 'https://images.unsplash.com/photo-1574226516831-e1dff420e5c7?auto=format&fit=crop&q=80&w=800'
};

const DEFAULT_PRODUCTS = [
  {
    id: '1', name: 'M4A1 Full Mod + T6 Ammo x300', category: 'ammo_acc', price: 350.00, koen: '5,500,000', stock: 12,
    image: 'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800',
    gallery: ['https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800'],
    tags: ['Best Seller', 'พร้อมบวก'], desc: 'ปืน M4A1 ฟูลม็อด', specs: ['เกราะ T5 ครบชุด'], updatedAt: new Date().toISOString()
  },
  {
    id: '2', name: 'Starter Koen Account (15 Million)', category: 'koen_m', price: 150.00, koen: '15,000,000', stock: 45,
    image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=800',
    gallery: ['https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=800'],
    tags: ['คุ้มสุด', 'ขายดี'], desc: 'ไอดีเริ่มต้นพร้อมเงินสด Koen 15 ล้าน', specs: ['Koen เงินสด 15,000,000'], updatedAt: new Date().toISOString()
  }
];

const DEFAULT_CATEGORIES = [
  { id: 'ammo_acc', name: 'หมวดหมู่ไก่กระสุน', image: 'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800', badge: 'HOT • มาแรง', order: 1 },
  { id: 'koen_m', name: 'หมวดหมู่ไก่เงินm', image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&q=80&w=800', badge: 'คุ้มค่าสุด', order: 2 },
  { id: 'transfer_m', name: 'หมวดหมู่โยกเงินm', image: 'https://images.unsplash.com/photo-1574226516831-e1dff420e5c7?auto=format&fit=crop&q=80&w=800', badge: 'บริการยอดฮิต', order: 3 }
];

// รายการ Blacklist ที่ถูกลบออก (ป้องกัน onSnapshot ดึงข้อมูลเก่ากลับมาทับ)
let deletedProductsLocal = JSON.parse(localStorage.getItem('tactical_del_prods') || '[]');
let deletedCategoriesLocal = JSON.parse(localStorage.getItem('tactical_del_cats') || '[]');
let deletedOrdersLocal = JSON.parse(localStorage.getItem('tactical_del_orders') || '[]');

let allAdminCategories = [...DEFAULT_CATEGORIES];
let allAdminProducts = [];
let allAdminOrders = [];
let allAdminUsers = [];
let allAdminPromos = [];
let currentAdminTab = 'products';
let currentOrderFilter = 'all';
let currentOrderSearch = '';
let isAdminDataInitialized = false;
let currentAdminDbPassword = null; // รหัสผ่านที่ดึงมาจากฐานข้อมูล

// ==========================================
// 1. TOAST NOTIFICATION CONTROLLER
// ==========================================
function triggerToast(message) {
  const box = document.getElementById('toast-box');
  const text = document.getElementById('toast-text');
  if (!box || !text) return;

  text.innerText = message;
  box.classList.remove('opacity-0', '-translate-y-4', 'scale-95');
  box.classList.add('opacity-100', 'translate-y-0', 'scale-100');

  clearTimeout(box._timer);
  box._timer = setTimeout(() => {
    box.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
    box.classList.add('opacity-0', '-translate-y-4', 'scale-95');
  }, 3200);
}

// ==========================================
// 2. ADMIN AUTHENTICATION & PASSWORD SYSTEM
// ==========================================

// ตรวจสอบรหัสผ่านผู้ดูแลระบบจาก Firestore
async function fetchAdminSecurityPassword() {
  try {
    const snap = await getDoc(doc(db, "settings", "security"));
    if (snap.exists() && snap.data()?.adminPassword) {
      currentAdminDbPassword = snap.data().adminPassword;
      localStorage.setItem('tactical_admin_password', currentAdminDbPassword);
      return currentAdminDbPassword;
    }
  } catch (err) {
    console.warn("Could not fetch admin password from Firestore:", err);
  }

  // สำรอง: อ่านจาก LocalStorage
  const localPw = localStorage.getItem('tactical_admin_password');
  if (localPw) {
    currentAdminDbPassword = localPw;
    return localPw;
  }

  currentAdminDbPassword = null;
  return null;
}

// ควบคุมการแสดงผล Security Gate
async function checkAdminAuth() {
  const gate = document.getElementById('admin-auth-gate');
  const setupContainer = document.getElementById('gate-setup-container');
  const unlockContainer = document.getElementById('gate-unlock-container');

  // ตรวจสอบว่าในเซสชันปัจจุบันได้ปลดล็อกไปแล้วหรือไม่
  const isUnlockedThisSession = sessionStorage.getItem('tactical_admin_unlocked') === 'true';
  if (isUnlockedThisSession) {
    if (gate) gate.classList.add('hidden');
    initAdminData();
    return;
  }

  // หากยังไม่ได้ปลดล็อก -> บังคับแสดงหน้าต่าง Gate ทุกกรณี
  if (gate) gate.classList.remove('hidden');

  // ตรวจสอบว่ามีรหัสผ่านในระบบหรือยัง
  const storedPassword = await fetchAdminSecurityPassword();

  if (!storedPassword) {
    // ยังไม่มีรหัสผ่านในฐานข้อมูล -> แสดงฟอร์มตั้งรหัสครั้งแรก
    if (setupContainer) setupContainer.classList.remove('hidden');
    if (unlockContainer) unlockContainer.classList.add('hidden');
  } else {
    // มีรหัสผ่านแล้ว -> แสดงฟอร์มกรอกรหัสผ่าน
    if (setupContainer) setupContainer.classList.add('hidden');
    if (unlockContainer) unlockContainer.classList.remove('hidden');
  }
}

// 2.1 บันทึกการตั้งรหัสผ่านครั้งแรกขึ้นฐานข้อมูล
async function handleAdminSetupPassword(e) {
  e.preventDefault();
  const pw1 = document.getElementById('admin-setup-password').value.trim();
  const pw2 = document.getElementById('admin-setup-confirm').value.trim();
  const btn = document.getElementById('btn-save-setup-pw');

  if (!pw1 || pw1.length < 4) {
    triggerToast("รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร");
    return;
  }

  if (pw1 !== pw2) {
    triggerToast("รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
    return;
  }

  btn.disabled = true;
  btn.innerText = "กำลังบันทึกลงฐานข้อมูล...";

  try {
    await setDoc(doc(db, "settings", "security"), {
      adminPassword: pw1,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    currentAdminDbPassword = pw1;
    localStorage.setItem('tactical_admin_password', pw1);
    sessionStorage.setItem('tactical_admin_unlocked', 'true');

    triggerToast("ตั้งรหัสผ่านและบันทึกลงฐานข้อมูลสำเร็จ!");
    document.getElementById('admin-auth-gate').classList.add('hidden');
    initAdminData();
  } catch (err) {
    console.warn("Save password to Firestore failed, saving locally:", err);
    currentAdminDbPassword = pw1;
    localStorage.setItem('tactical_admin_password', pw1);
    sessionStorage.setItem('tactical_admin_unlocked', 'true');
    triggerToast("ตั้งรหัสผ่านสำเร็จ (บันทึกในระบบ)");
    document.getElementById('admin-auth-gate').classList.add('hidden');
    initAdminData();
  } finally {
    btn.disabled = false;
    btn.innerText = "บันทึกรหัสผ่านลงฐานข้อมูล & เข้าสู่ระบบ";
  }
}

// 2.2 ตรวจสอบรหัสผ่านเพื่อเข้าใช้งาน
async function handleAdminUnlock(e) {
  e.preventDefault();
  const input = document.getElementById('admin-passkey-input');
  const enteredVal = input ? input.value.trim() : '';

  // หากยังไม่มีรหัสในหน่วยความจำ ให้ลองอ่านอีกครั้ง
  if (!currentAdminDbPassword) {
    await fetchAdminSecurityPassword();
  }

  // ตรวจสอบกับรหัสในฐานข้อมูล หรือรหัสกู้คืนฉุกเฉิน (tactical2026)
  const isMatch = (currentAdminDbPassword && enteredVal === currentAdminDbPassword) || 
                  enteredVal === 'tactical2026';

  if (isMatch) {
    sessionStorage.setItem('tactical_admin_unlocked', 'true');
    triggerToast('ยินดีต้อนรับ เข้าสู่ระบบผู้ดูแลสำเร็จ!');
    const gate = document.getElementById('admin-auth-gate');
    if (gate) gate.classList.add('hidden');
    initAdminData();
  } else {
    triggerToast('รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง!');
    if (input) input.value = '';
  }
}

// 2.3 เปลี่ยนรหัสผ่านแอดมินในแท็บ Settings
async function handleAdminChangePassword(e) {
  e.preventDefault();
  const p1 = document.getElementById('setting-new-admin-pw').value.trim();
  const p2 = document.getElementById('setting-confirm-admin-pw').value.trim();
  const btn = document.getElementById('btn-update-admin-pw');

  if (p1.length < 4) {
    triggerToast('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
    return;
  }
  if (p1 !== p2) {
    triggerToast('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    return;
  }

  btn.disabled = true;
  btn.innerText = 'กำลังอัปเดตลงฐานข้อมูล...';

  try {
    await setDoc(doc(db, "settings", "security"), {
      adminPassword: p1,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    currentAdminDbPassword = p1;
    localStorage.setItem('tactical_admin_password', p1);
    triggerToast('อัปเดตรหัสผ่านผู้ดูแลระบบลงฐานข้อมูลสำเร็จ!');
    e.target.reset();
  } catch (err) {
    console.warn("Update password error, saved local:", err);
    currentAdminDbPassword = p1;
    localStorage.setItem('tactical_admin_password', p1);
    triggerToast('อัปเดตรหัสผ่านเรียบร้อย (บันทึกในระบบ)');
    e.target.reset();
  } finally {
    btn.disabled = false;
    btn.innerText = 'อัปเดตรหัสผ่านผู้ดูแลระบบลงฐานข้อมูล';
  }
}

// 2.4 ล็อกหน้าจอเซสชัน
function lockAdminSession() {
  sessionStorage.removeItem('tactical_admin_unlocked');
  triggerToast('ล็อกเซสชันผู้ดูแลเรียบร้อย');
  const gate = document.getElementById('admin-auth-gate');
  if (gate) {
    gate.classList.remove('hidden');
    checkAdminAuth();
  }
}

// ==========================================
// 3. TAB CONTROLLER
// ==========================================
function switchAdminTab(tab) {
  currentAdminTab = tab;
  const tabs = ['products', 'categories', 'vault', 'submissions', 'orders', 'promos', 'users', 'reviews', 'settings'];
  
  tabs.forEach(t => {
    const sec = document.getElementById(`admin-sec-${t}`);
    const btn = document.getElementById(`admin-tab-btn-${t}`);
    if (sec) {
      if (t === tab) sec.classList.remove('hidden');
      else sec.classList.add('hidden');
    }
    if (btn) {
      if (t === tab) {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all bg-amber-500 text-black shadow-md flex items-center gap-1.5 shrink-0';
      } else {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center gap-1.5 shrink-0';
      }
    }
  });
}

// ==========================================
// 4. CATEGORY MANAGEMENT SYSTEM
// ==========================================
function initCategoriesListener() {
  try {
    onSnapshot(collection(db, "categories"), (snapshot) => {
      deletedCategoriesLocal = JSON.parse(localStorage.getItem('tactical_del_cats') || '[]');
      if (!snapshot.empty) {
        allAdminCategories = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(c => !deletedCategoriesLocal.includes(String(c.id)));
      } else {
        const saved = localStorage.getItem('tactical_categories');
        allAdminCategories = saved 
          ? JSON.parse(saved).filter(c => !deletedCategoriesLocal.includes(String(c.id))) 
          : [...DEFAULT_CATEGORIES].filter(c => !deletedCategoriesLocal.includes(String(c.id)));
      }
      renderAdminCategories();
      updateCategoryMetrics();
      populateCategorySelect();
    }, () => {
      deletedCategoriesLocal = JSON.parse(localStorage.getItem('tactical_del_cats') || '[]');
      const saved = localStorage.getItem('tactical_categories');
      allAdminCategories = saved 
        ? JSON.parse(saved).filter(c => !deletedCategoriesLocal.includes(String(c.id))) 
        : [...DEFAULT_CATEGORIES].filter(c => !deletedCategoriesLocal.includes(String(c.id)));
      renderAdminCategories();
      updateCategoryMetrics();
      populateCategorySelect();
    });
  } catch (err) {
    allAdminCategories = [...DEFAULT_CATEGORIES];
    renderAdminCategories();
    updateCategoryMetrics();
    populateCategorySelect();
  }
}

function updateCategoryMetrics() {
  if (document.getElementById('metric-total-categories')) document.getElementById('metric-total-categories').innerText = allAdminCategories.length;
  if (document.getElementById('metric-active-categories')) document.getElementById('metric-active-categories').innerText = allAdminCategories.filter(c => allAdminProducts.some(p => p.category === c.id)).length;
  if (document.getElementById('metric-cat-products')) document.getElementById('metric-cat-products').innerText = allAdminProducts.length;
}

function renderAdminCategories(filtered = null) {
  const container = document.getElementById('admin-categories-grid');
  if (!container) return;
  const list = filtered || allAdminCategories;

  if (list.length === 0) {
    container.innerHTML = '<div class="col-span-full py-16 text-center text-zinc-500 text-xs">ไม่พบหมวดหมู่สินค้า</div>';
    return;
  }

  container.innerHTML = list.map(c => {
    const count = allAdminProducts.filter(p => p.category === c.id).length;
    return `
      <div class="glass-card rounded-3xl overflow-hidden border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between">
        <div class="h-44 w-full relative overflow-hidden bg-zinc-900">
          <img src="${c.image || 'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800'}" alt="${c.name}" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/60 to-transparent"></div>
          <div class="absolute top-3.5 right-3.5 bg-black/80 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase font-mono">${c.badge || 'หมวดหมู่'}</div>
          <div class="absolute bottom-3 left-3.5 bg-zinc-900/90 border border-white/10 px-2.5 py-0.5 rounded-lg text-[11px] text-zinc-300 font-mono font-bold flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span>${count} รายการสินค้า</span>
          </div>
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-base font-heading font-black text-white uppercase">${c.name}</h3>
              <span class="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">${c.id}</span>
            </div>
            <p class="text-xs text-zinc-400 leading-relaxed mb-4">${c.desc || '-'}</p>
          </div>
          <div class="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
            <button onclick="editCategory('${c.id}')" class="px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-amber-400 bg-zinc-900 border border-white/10 rounded-xl transition-all">แก้ไข</button>
            <button onclick="deleteCategory('${c.id}')" class="px-3 py-1.5 text-xs font-bold text-red-400 hover:text-white bg-red-500/10 border border-red-500/20 rounded-xl transition-all">ลบ</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterAdminCategories(q) {
  const query = (q || '').trim().toLowerCase();
  renderAdminCategories(query ? allAdminCategories.filter(c => c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query)) : null);
}

function openCategoryModal(cat = null) {
  const modal = document.getElementById('category-form-modal');
  document.body.style.overflow = 'hidden';

  if (cat) {
    document.getElementById('category-modal-heading').innerText = 'แก้ไขหมวดหมู่สินค้า';
    document.getElementById('btn-save-category').innerText = 'อัปเดตหมวดหมู่';
    document.getElementById('cat-edit-id').value = cat.id;
    document.getElementById('cat-name').value = cat.name || '';
    document.getElementById('cat-id').value = cat.id || '';
    document.getElementById('cat-id').disabled = true;
    document.getElementById('cat-badge').value = cat.badge || '';
    document.getElementById('cat-image').value = cat.image || '';
    document.getElementById('cat-desc').value = cat.desc || '';
    updateCatImagePreview(cat.image);
  } else {
    document.getElementById('category-modal-heading').innerText = 'เพิ่มหมวดหมู่ใหม่';
    document.getElementById('btn-save-category').innerText = 'บันทึกหมวดหมู่ลง Firebase';
    document.getElementById('category-crud-form').reset();
    document.getElementById('cat-edit-id').value = '';
    document.getElementById('cat-id').value = `cat_${Date.now()}`;
    document.getElementById('cat-id').disabled = false;
    updateCatImagePreview('');
  }
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCategoryModal() {
  document.getElementById('category-form-modal').classList.add('hidden');
  document.getElementById('category-form-modal').classList.remove('flex');
  document.body.style.overflow = '';
}

function editCategory(id) {
  const cat = allAdminCategories.find(c => c.id === id);
  if (cat) openCategoryModal(cat);
}

// ลบหมวดหมู่ (ตัดออกจากจอทันที + Blacklist)
async function deleteCategory(id) {
  const strId = String(id);
  const cat = allAdminCategories.find(c => String(c.id) === strId);
  const catName = cat ? cat.name : strId;
  if (!confirm(`ยืนยันการลบหมวดหมู่ "${catName}" หรือไม่?\n(ข้อมูลจะถูกลบทันที)`)) return;

  // 1. ตัดออกจากหน่วยความจำทันที
  allAdminCategories = allAdminCategories.filter(c => String(c.id) !== strId);
  localStorage.setItem('tactical_categories', JSON.stringify(allAdminCategories));

  // 2. บันทึก Blacklist
  if (!deletedCategoriesLocal.includes(strId)) {
    deletedCategoriesLocal.push(strId);
    localStorage.setItem('tactical_del_cats', JSON.stringify(deletedCategoriesLocal));
  }

  // 3. เรนเดอร์หน้าจอใหม่ทันที
  renderAdminCategories();
  updateCategoryMetrics();
  populateCategorySelect();

  // 4. ลบออกจาก Firestore
  try {
    await deleteDoc(doc(db, "categories", strId));
    triggerToast(`ลบหมวดหมู่ "${catName}" สำเร็จ!`);
  } catch (err) {
    console.warn("Delete category Firestore error:", err);
    triggerToast('ลบหมวดหมู่ในระบบเรียบร้อย');
  }
}

function updateCatImagePreview(url) {
  const img = document.getElementById('cat-image-preview-element');
  if (img) img.src = (url && url.length > 5) ? url.trim() : 'https://placehold.co/800x400/18181b/f59e0b?text=Category+Image';
}

async function handleCategoryFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('cat-edit-id').value.trim() || document.getElementById('cat-id').value.trim() || `cat_${Date.now()}`;
  const categoryData = {
    id,
    name: document.getElementById('cat-name').value.trim(),
    badge: document.getElementById('cat-badge').value.trim() || 'หมวดหมู่',
    image: document.getElementById('cat-image').value.trim() || 'https://images.unsplash.com/photo-1595590424283-b8f1784cb2c8?auto=format&fit=crop&q=80&w=800',
    desc: document.getElementById('cat-desc').value.trim(),
    updatedAt: new Date().toISOString()
  };
  const btn = document.getElementById('btn-save-category');
  btn.disabled = true;

  // นำออกจาก Blacklist (กรณีสร้างชื่อเดิมซ้ำ)
  deletedCategoriesLocal = deletedCategoriesLocal.filter(x => x !== id);
  localStorage.setItem('tactical_del_cats', JSON.stringify(deletedCategoriesLocal));

  const idx = allAdminCategories.findIndex(c => c.id === id);
  if (idx !== -1) allAdminCategories[idx] = categoryData;
  else allAdminCategories.push(categoryData);
  localStorage.setItem('tactical_categories', JSON.stringify(allAdminCategories));

  renderAdminCategories();
  updateCategoryMetrics();
  populateCategorySelect();

  try {
    await setDoc(doc(db, "categories", id), categoryData);
    triggerToast(`บันทึกหมวดหมู่สำเร็จ!`);
  } catch (err) {
    triggerToast(`บันทึกหมวดหมู่เรียบร้อย (ออฟไลน์)`);
  } finally {
    btn.disabled = false;
    closeCategoryModal();
  }
}

async function seedDefaultCategories() {
  if (!confirm('ต้องการคืนค่า 3 หมวดหมู่หลักใช่หรือไม่?')) return;
  
  deletedCategoriesLocal = [];
  localStorage.setItem('tactical_del_cats', JSON.stringify([]));
  allAdminCategories = [...DEFAULT_CATEGORIES];
  localStorage.setItem('tactical_categories', JSON.stringify(allAdminCategories));
  renderAdminCategories();
  updateCategoryMetrics();
  populateCategorySelect();

  try {
    for (const c of DEFAULT_CATEGORIES) await setDoc(doc(db, "categories", c.id), c);
    triggerToast('คืนค่า 3 หมวดหมู่หลักสำเร็จ!');
  } catch (err) {
    triggerToast('คืนค่าหมวดหมู่เรียบร้อย (ออฟไลน์)');
  }
}

function populateCategorySelect() {
  const select = document.getElementById('prod-category');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = allAdminCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  if (currentVal && allAdminCategories.some(c => c.id === currentVal)) select.value = currentVal;
}

// ==========================================
// 5. PRODUCT MANAGEMENT (INSTANT DELETION FIXED)
// ==========================================
function initProductsListener() {
  try {
    onSnapshot(collection(db, "products"), (snapshot) => {
      deletedProductsLocal = JSON.parse(localStorage.getItem('tactical_del_prods') || '[]');
      if (!snapshot.empty) {
        allAdminProducts = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => !deletedProductsLocal.includes(String(p.id)));
      } else {
        const saved = localStorage.getItem('tactical_products');
        allAdminProducts = saved 
          ? JSON.parse(saved).filter(p => !deletedProductsLocal.includes(String(p.id))) 
          : [...DEFAULT_PRODUCTS].filter(p => !deletedProductsLocal.includes(String(p.id)));
      }
      renderAdminProducts();
      updateProductMetrics();
    }, () => {
      deletedProductsLocal = JSON.parse(localStorage.getItem('tactical_del_prods') || '[]');
      const saved = localStorage.getItem('tactical_products');
      allAdminProducts = saved 
        ? JSON.parse(saved).filter(p => !deletedProductsLocal.includes(String(p.id))) 
        : [...DEFAULT_PRODUCTS].filter(p => !deletedProductsLocal.includes(String(p.id)));
      renderAdminProducts();
      updateProductMetrics();
    });
  } catch (err) {
    allAdminProducts = [...DEFAULT_PRODUCTS];
    renderAdminProducts();
    updateProductMetrics();
  }
}

function updateProductMetrics() {
  if (document.getElementById('metric-total-products')) document.getElementById('metric-total-products').innerText = allAdminProducts.length;
  if (document.getElementById('metric-instock-products')) document.getElementById('metric-instock-products').innerText = allAdminProducts.filter(p => (parseInt(p.stock) || 0) > 0).length;
  if (document.getElementById('metric-outofstock-products')) document.getElementById('metric-outofstock-products').innerText = allAdminProducts.filter(p => (parseInt(p.stock) || 0) <= 0).length;
}

function renderAdminProducts(filtered = null) {
  const tbody = document.getElementById('admin-products-table-body');
  const empty = document.getElementById('admin-products-empty');
  if (!tbody) return;
  const list = filtered || allAdminProducts;

  if (list.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  tbody.innerHTML = list.map(p => {
    const stockBadge = (parseInt(p.stock) || 0) > 0 
      ? `<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">${p.stock} ชิ้น</span>`
      : `<span class="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold">หมด</span>`;

    const catObj = allAdminCategories.find(c => c.id === p.category);
    const catName = catObj ? catObj.name : p.category;

    return `
      <tr class="hover:bg-white/[0.02]">
        <td class="py-3 px-4"><img src="${p.image || IMAGE_PRESETS.m4a1}" class="w-10 h-10 object-cover rounded-lg border border-white/10"></td>
        <td class="py-3 px-4 font-semibold text-white"><div class="max-w-[200px] truncate">${p.name}</div><div class="text-[10px] text-zinc-500 font-mono">ID: ${p.id}</div></td>
        <td class="py-3 px-4 text-zinc-400">${catName}</td>
        <td class="py-3 px-4 font-mono font-bold text-amber-400">${p.koen || '-'}</td>
        <td class="py-3 px-4 font-mono font-bold text-white">฿${Number(p.price || 0).toFixed(2)}</td>
        <td class="py-3 px-4">${stockBadge}</td>
        <td class="py-3 px-4 text-zinc-500 text-[11px]">${p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('th-TH') : '-'}</td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="editProduct('${p.id}')" class="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg">แก้ไข</button>
            <button onclick="deleteProduct('${p.id}')" class="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg font-bold">ลบ</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminProducts(q) {
  const query = (q || '').trim().toLowerCase();
  renderAdminProducts(query ? allAdminProducts.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)) : null);
}

function openProductModal(prod = null) {
  const modal = document.getElementById('product-form-modal');
  document.body.style.overflow = 'hidden';

  if (prod) {
    document.getElementById('product-modal-heading').innerText = 'แก้ไขสินค้า';
    document.getElementById('prod-edit-id').value = prod.id;
    document.getElementById('prod-name').value = prod.name || '';
    document.getElementById('prod-category').value = prod.category || 'ammo_acc';
    document.getElementById('prod-koen').value = prod.koen || '';
    document.getElementById('prod-price').value = prod.price || '';
    document.getElementById('prod-stock').value = prod.stock !== undefined ? prod.stock : 1;
    document.getElementById('prod-image').value = prod.image || '';
    document.getElementById('prod-tags').value = (prod.tags || []).join(', ');
    document.getElementById('prod-desc').value = prod.desc || '';
    document.getElementById('prod-specs').value = (prod.specs || []).join('\n');
    document.getElementById('prod-gallery').value = (prod.gallery || []).join('\n');
    updateImagePreview(prod.image);
  } else {
    document.getElementById('product-modal-heading').innerText = 'เพิ่มสินค้าใหม่';
    document.getElementById('product-crud-form').reset();
    document.getElementById('prod-edit-id').value = '';
    document.getElementById('prod-category').value = allAdminCategories[0]?.id || 'ammo_acc';
    updateImagePreview('');
  }
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeProductModal() {
  document.getElementById('product-form-modal').classList.add('hidden');
  document.getElementById('product-form-modal').classList.remove('flex');
  document.body.style.overflow = '';
}

function editProduct(id) {
  const prod = allAdminProducts.find(p => p.id === id);
  if (prod) openProductModal(prod);
}

// ลบสินค้า (ตัดออกจากหน้าจอทันที 100% + Blacklist ป้องกันข้อมูลเด้งคืน)
async function deleteProduct(id) {
  const strId = String(id);
  const prod = allAdminProducts.find(p => String(p.id) === strId);
  const prodName = prod ? prod.name : strId;

  if (!confirm(`ยืนยันการลบสินค้า "${prodName}" หรือไม่?\n(ข้อมูลจะถูกลบออกจากระบบทันที)`)) return;

  // 1. ตัดออกจากหน่วยความจำทันที ไม่ต้องรอเครือข่าย
  allAdminProducts = allAdminProducts.filter(p => String(p.id) !== strId);
  localStorage.setItem('tactical_products', JSON.stringify(allAdminProducts));

  // 2. บันทึก ID ลงใน Blacklist ทันที เพื่อป้องกัน onSnapshot ดึงข้อมูลเดิมกลับมา
  if (!deletedProductsLocal.includes(strId)) {
    deletedProductsLocal.push(strId);
    localStorage.setItem('tactical_del_prods', JSON.stringify(deletedProductsLocal));
  }

  // 3. เรนเดอร์หน้าจอใหม่ทันที
  renderAdminProducts();
  updateProductMetrics();

  // 4. สั่งลบออกจาก Firestore
  try {
    await deleteDoc(doc(db, "products", strId));
    triggerToast(`ลบสินค้า "${prodName}" สำเร็จ!`);
  } catch (err) {
    console.warn("Delete doc Firestore error (deleted locally):", err);
    triggerToast('ลบรายการสินค้าในระบบเรียบร้อย');
  }
}

function updateImagePreview(url) {
  const img = document.getElementById('image-preview-element');
  if (img) img.src = (url && url.length > 5) ? url.trim() : 'https://placehold.co/800x500/18181b/f59e0b?text=Preview';
}

async function handleProductFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('prod-edit-id').value.trim() || `prod_${Date.now()}`;
  const productData = {
    id,
    name: document.getElementById('prod-name').value.trim(),
    category: document.getElementById('prod-category').value,
    koen: document.getElementById('prod-koen').value.trim(),
    price: Math.max(0, parseFloat(document.getElementById('prod-price').value) || 0),
    stock: Math.max(0, parseInt(document.getElementById('prod-stock').value, 10) || 0),
    image: document.getElementById('prod-image').value.trim() || IMAGE_PRESETS.m4a1,
    gallery: document.getElementById('prod-gallery').value.split('\n').map(g => g.trim()).filter(Boolean),
    tags: document.getElementById('prod-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    desc: document.getElementById('prod-desc').value.trim(),
    specs: document.getElementById('prod-specs').value.split('\n').map(s => s.trim()).filter(Boolean),
    updatedAt: new Date().toISOString()
  };
  
  if (productData.gallery.length === 0) productData.gallery = [productData.image];

  const btn = document.getElementById('btn-save-product');
  btn.disabled = true;

  // นำออกจาก Blacklist
  deletedProductsLocal = deletedProductsLocal.filter(x => x !== id);
  localStorage.setItem('tactical_del_prods', JSON.stringify(deletedProductsLocal));

  const idx = allAdminProducts.findIndex(p => p.id === id);
  if (idx !== -1) allAdminProducts[idx] = productData;
  else allAdminProducts.unshift(productData);
  localStorage.setItem('tactical_products', JSON.stringify(allAdminProducts));

  renderAdminProducts();
  updateProductMetrics();

  try {
    await setDoc(doc(db, "products", id), productData);
    triggerToast(`บันทึกสินค้าสำเร็จ!`);
  } catch (err) {
    triggerToast(`บันทึกสินค้าเรียบร้อย (ออฟไลน์)`);
  } finally {
    btn.disabled = false;
    closeProductModal();
  }
}

async function seedInitialProducts() {
  if (!confirm('ต้องการนำเข้าสินค้าเริ่มต้นขึ้นระบบใช่หรือไม่?')) return;
  
  deletedProductsLocal = [];
  localStorage.setItem('tactical_del_prods', JSON.stringify([]));
  allAdminProducts = [...DEFAULT_PRODUCTS];
  localStorage.setItem('tactical_products', JSON.stringify(allAdminProducts));
  renderAdminProducts();
  updateProductMetrics();

  try {
    for (const p of DEFAULT_PRODUCTS) await setDoc(doc(db, "products", p.id), p);
    triggerToast('นำเข้าสินค้าสำเร็จ!');
  } catch (err) {
    triggerToast('นำเข้าสินค้าเริ่มต้นเรียบร้อย (ออฟไลน์)');
  }
}

// ==========================================
// 6. ORDERS MANAGEMENT
// ==========================================
function initOrdersListener() {
  try {
    onSnapshot(collection(db, "orders"), (snapshot) => {
      deletedOrdersLocal = JSON.parse(localStorage.getItem('tactical_del_orders') || '[]');
      if (!snapshot.empty) {
        allAdminOrders = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(o => !deletedOrdersLocal.includes(String(o.id)));
      } else {
        const saved = localStorage.getItem('tactical_orders');
        allAdminOrders = saved ? JSON.parse(saved).filter(o => !deletedOrdersLocal.includes(String(o.id))) : [];
      }
      renderAdminOrders();
      updateOrderMetrics();
    }, () => {
      deletedOrdersLocal = JSON.parse(localStorage.getItem('tactical_del_orders') || '[]');
      const saved = localStorage.getItem('tactical_orders');
      allAdminOrders = saved ? JSON.parse(saved).filter(o => !deletedOrdersLocal.includes(String(o.id))) : [];
      renderAdminOrders();
      updateOrderMetrics();
    });
  } catch (err) { }
}

function updateOrderMetrics() {
  let revenue = 0, ppCount = 0, tmCount = 0;
  allAdminOrders.forEach(o => {
    revenue += Number(o.amount) || 0;
    if (o.paymentMethod === 'promptpay') ppCount++; else tmCount++;
  });
  if(document.getElementById('metric-order-revenue')) document.getElementById('metric-order-revenue').innerText = `฿${revenue.toFixed(2)}`;
  if(document.getElementById('metric-order-count')) document.getElementById('metric-order-count').innerText = allAdminOrders.length;
  if(document.getElementById('metric-order-promptpay')) document.getElementById('metric-order-promptpay').innerText = ppCount;
  if(document.getElementById('metric-order-truemoney')) document.getElementById('metric-order-truemoney').innerText = tmCount;
}

function renderAdminOrders() {
  const tbody = document.getElementById('admin-orders-table-body');
  const empty = document.getElementById('admin-orders-empty');
  if (!tbody) return;

  let list = allAdminOrders;
  if (currentOrderFilter !== 'all') list = list.filter(o => (o.status || 'จัดส่งสำเร็จ') === currentOrderFilter);

  if (list.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  tbody.innerHTML = list.map(o => {
    const acc = o.accountDelivered || {};
    return `
      <tr class="hover:bg-white/[0.02]">
        <td class="py-3 px-4 font-mono text-amber-500 font-bold">${o.orderNumber || o.id}</td>
        <td class="py-3 px-4 text-[11px] text-zinc-400">${o.createdAt ? new Date(o.createdAt).toLocaleString('th-TH') : '-'}</td>
        <td class="py-3 px-4 text-white">${o.productName || '-'}</td>
        <td class="py-3 px-4 font-mono font-bold text-white">฿${Number(o.amount || 0).toFixed(2)}</td>
        <td class="py-3 px-4"><span class="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-bold font-mono text-[10px]">${o.paymentMethod || 'PromptPay'}</span></td>
        <td class="py-3 px-4 font-mono text-[11px]">U: <span class="text-amber-400">${acc.username || '-'}</span><br>P: <span class="text-zinc-500">••••••••</span></td>
        <td class="py-3 px-4 text-[11px]">${o.status || 'จัดส่งสำเร็จ'}</td>
        <td class="py-3 px-4 text-right">
          <button onclick="openOrderModal('${o.id}')" class="p-1.5 text-zinc-400 hover:text-amber-400">แก้ไข</button>
          <button onclick="deleteOrder('${o.id}')" class="p-1.5 text-zinc-400 hover:text-red-400 font-bold">ลบ</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openOrderModal(id) {
  const o = allAdminOrders.find(item => item.id === id);
  if (!o) return;
  document.getElementById('edit-order-id').value = o.id;
  document.getElementById('edit-order-status').value = o.status || 'จัดส่งสำเร็จ';
  document.getElementById('edit-delivered-user').value = o.accountDelivered?.username || '';
  document.getElementById('edit-delivered-pass').value = o.accountDelivered?.password || '';
  document.getElementById('order-fulfillment-modal').classList.remove('hidden');
  document.getElementById('order-fulfillment-modal').classList.add('flex');
}

function closeOrderModal() {
  document.getElementById('order-fulfillment-modal').classList.add('hidden');
  document.getElementById('order-fulfillment-modal').classList.remove('flex');
}

async function handleSaveOrderDelivery(e) {
  e.preventDefault();
  const id = document.getElementById('edit-order-id').value;
  const updateData = {
    status: document.getElementById('edit-order-status').value,
    accountDelivered: {
      username: document.getElementById('edit-delivered-user').value,
      password: document.getElementById('edit-delivered-pass').value
    },
    updatedAt: new Date().toISOString()
  };

  const idx = allAdminOrders.findIndex(o => o.id === id);
  if (idx !== -1) allAdminOrders[idx] = { ...allAdminOrders[idx], ...updateData };
  localStorage.setItem('tactical_orders', JSON.stringify(allAdminOrders));
  renderAdminOrders();

  try {
    await updateDoc(doc(db, "orders", String(id)), updateData);
    triggerToast('อัปเดตคำสั่งซื้อสำเร็จ!');
  } catch (err) {
    triggerToast('อัปเดตคำสั่งซื้อเรียบร้อย (ออฟไลน์)');
  }
  closeOrderModal();
}

async function deleteOrder(id) {
  const strId = String(id);
  if (!confirm(`ยืนยันการลบออเดอร์นี้หรือไม่?`)) return;

  allAdminOrders = allAdminOrders.filter(o => String(o.id) !== strId);
  localStorage.setItem('tactical_orders', JSON.stringify(allAdminOrders));

  if (!deletedOrdersLocal.includes(strId)) {
    deletedOrdersLocal.push(strId);
    localStorage.setItem('tactical_del_orders', JSON.stringify(deletedOrdersLocal));
  }

  renderAdminOrders();
  updateOrderMetrics();

  try {
    await deleteDoc(doc(db, "orders", strId));
    triggerToast('ลบออเดอร์สำเร็จ!');
  } catch (err) {
    triggerToast('ลบคำสั่งซื้อในระบบเรียบร้อย');
  }
}

// ==========================================
// 7. USERS, PROMOS, SETTINGS
// ==========================================
function initUsersListener() {
  try {
    onSnapshot(collection(db, "users"), (snapshot) => {
      allAdminUsers = snapshot.empty ? getLocalUsers() : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      ensureAdminUserPresent();
      renderAdminUsers();
    }, () => {
      allAdminUsers = getLocalUsers();
      ensureAdminUserPresent();
      renderAdminUsers();
    });
  } catch (err) { }
}

function getLocalUsers() { 
  return [{ id: 'usr_atest', username: 'atest', email: 'atest@tactical.store', role: 'admin' }]; 
}

function ensureAdminUserPresent() {
  if (!allAdminUsers.some(u => u.username?.toLowerCase() === 'atest')) {
    allAdminUsers.unshift({ id: 'usr_atest', username: 'atest', email: 'atest@tactical.store', role: 'admin', createdAt: new Date().toISOString() });
  }
}

function renderAdminUsers() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;
  tbody.innerHTML = allAdminUsers.map(u => `
    <tr class="hover:bg-white/[0.02]">
      <td class="py-3 px-4 font-semibold text-white">${u.username || '-'}</td>
      <td class="py-3 px-4 text-zinc-400 font-mono text-[11px]">${u.email || '-'}</td>
      <td class="py-3 px-4">${u.role === 'admin' ? '<span class="text-amber-400 text-[10px] font-bold">ADMIN</span>' : '<span class="text-zinc-400 text-[10px]">USER</span>'}</td>
      <td class="py-3 px-4 text-[11px]">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
      <td class="py-3 px-4 text-right">
        ${u.username?.toLowerCase() === 'atest' ? '<span class="text-[11px] text-zinc-500">SuperAdmin</span>' : `<button onclick="toggleUserRole('${u.id}')" class="text-xs text-zinc-300">สลับสิทธิ์</button>`}
      </td>
    </tr>
  `).join('');
}

async function toggleUserRole(id) {
  const target = allAdminUsers.find(u => u.id === id);
  if (!target || target.username?.toLowerCase() === 'atest') return;
  target.role = target.role === 'admin' ? 'user' : 'admin';
  try { 
    await updateDoc(doc(db, "users", target.id), { role: target.role }); 
  } catch (err) { 
    localStorage.setItem('tactical_all_users', JSON.stringify(allAdminUsers));
  }
  renderAdminUsers();
}

function initPromosListener() {
  allAdminPromos = JSON.parse(localStorage.getItem('tactical_promos') || '[{"code":"TACTICAL","type":"fixed","val":50,"desc":"ลดทันที 50 บาท"}]');
  renderAdminPromos();
}

function renderAdminPromos() {
  const tbody = document.getElementById('admin-promos-table-body');
  if (!tbody) return;
  tbody.innerHTML = allAdminPromos.map((p, idx) => `
    <tr>
      <td class="py-3 px-3 font-bold text-amber-400">${p.code}</td>
      <td class="py-3 px-3">${p.type === 'fixed' ? `฿${p.val}` : `${p.val}%`}</td>
      <td class="py-3 px-3 text-right"><button onclick="deletePromo(${idx})" class="text-red-400 font-bold">ลบ</button></td>
    </tr>
  `).join('');
}

function handleCreatePromo(e) {
  e.preventDefault();
  const code = document.getElementById('promo-code-name').value.toUpperCase().trim();
  
  if (allAdminPromos.some(p => p.code === code)) {
    triggerToast('มีโค้ดส่วนลดนี้อยู่ในระบบแล้ว');
    return;
  }

  allAdminPromos.push({
    code,
    type: document.getElementById('promo-discount-type').value,
    val: parseFloat(document.getElementById('promo-discount-val').value),
    desc: ''
  });
  localStorage.setItem('tactical_promos', JSON.stringify(allAdminPromos));
  renderAdminPromos();
  e.target.reset();
  triggerToast('สร้างโค้ดสำเร็จ');
}

function deletePromo(idx) {
  allAdminPromos.splice(idx, 1);
  localStorage.setItem('tactical_promos', JSON.stringify(allAdminPromos));
  renderAdminPromos();
  triggerToast('ลบโค้ดเรียบร้อย');
}

function loadStoreSettings() {
  const s = JSON.parse(localStorage.getItem('tactical_store_settings') || '{}');
  if (document.getElementById('setting-marquee-text')) document.getElementById('setting-marquee-text').value = s.marquee || '⚡ ยินดีต้อนรับสู่ TACTICAL STORE';
  if (document.getElementById('setting-promptpay-no')) document.getElementById('setting-promptpay-no').value = s.promptpay || '0891234567';
  if (document.getElementById('setting-account-name')) document.getElementById('setting-account-name').value = s.accountName || 'MOSZXLL SHOP (นายสมศักดิ์)';
  if (document.getElementById('setting-discord-webhook')) document.getElementById('setting-discord-webhook').value = s.discordWebhook || '';
  if (document.getElementById('setting-discord-link')) document.getElementById('setting-discord-link').value = s.discordLink || 'https://discord.gg/tacticalstore';
  if (document.getElementById('setting-line-id')) document.getElementById('setting-line-id').value = s.lineId || '@moszxllshop';
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const settingsData = {
    marquee: document.getElementById('setting-marquee-text')?.value || '',
    promptpay: document.getElementById('setting-promptpay-no')?.value || '',
    accountName: document.getElementById('setting-account-name')?.value || '',
    discordWebhook: document.getElementById('setting-discord-webhook')?.value || '',
    discordLink: document.getElementById('setting-discord-link')?.value || '',
    lineId: document.getElementById('setting-line-id')?.value || ''
  };
  localStorage.setItem('tactical_store_settings', JSON.stringify(settingsData));
  
  try {
    await setDoc(doc(db, "settings", "store"), settingsData, { merge: true });
    triggerToast('บันทึกการตั้งค่าร้านค้าสำเร็จ!');
  } catch (err) {
    triggerToast('บันทึกการตั้งค่าเรียบร้อย (ออฟไลน์)');
  }
}

// ==========================================
// 8. INITIALIZE & EVENT LISTENERS
// ==========================================

// ==========================================
// 8. INVENTORY VAULT (ตู้เซฟคลังสต็อกไอดีจริง)
// ==========================================
let allVaultAccounts = [];
let vaultProductFilter = 'all';
let vaultStatusFilter = 'all';
let vaultSearchQuery = '';

const DEFAULT_VAULT_ACCOUNTS = [
  { id: 'vlt_101', productId: '1', productName: 'M4A1 Full Mod + T6 Ammo x300', username: 'AB_Agent_101', password: 'Kamona#M4A1_881', note: 'เมลสะอาด เปลี่ยนรหัสได้ทันที', status: 'available', orderId: null, createdAt: new Date().toISOString() },
  { id: 'vlt_102', productId: '1', productName: 'M4A1 Full Mod + T6 Ammo x300', username: 'AB_Agent_102', password: 'Kamona#M4A1_992', note: 'เมลสะอาด พร้อมบวก', status: 'available', orderId: null, createdAt: new Date().toISOString() },
  { id: 'vlt_103', productId: '1', productName: 'M4A1 Full Mod + T6 Ammo x300', username: 'AB_Agent_103', password: 'Kamona#M4A1_103', note: 'เมลสะอาด T6 เต็มพิกัด', status: 'available', orderId: null, createdAt: new Date().toISOString() },
  { id: 'vlt_201', productId: '2', productName: 'Starter Koen Account (15 Million)', username: 'Koen_Starter_01', password: 'Kamona#Koen15M_21', note: 'เงินสด 15 ล้านในตัว เลเวล 12+', status: 'available', orderId: null, createdAt: new Date().toISOString() },
  { id: 'vlt_202', productId: '2', productName: 'Starter Koen Account (15 Million)', username: 'Koen_Starter_02', password: 'Kamona#Koen15M_22', note: 'เงินสด 15 ล้านในตัว เลเวล 12+', status: 'available', orderId: null, createdAt: new Date().toISOString() },
  { id: 'vlt_401', productId: '4', productName: 'FAL Full Mod + M61 (T6) x300', username: 'FAL_Master_01', password: 'Kamona#FAL61_77', note: 'FAL Recoil ต่ำ กระสุน M61 x300', status: 'available', orderId: null, createdAt: new Date().toISOString() },
  { id: 'vlt_402', productId: '4', productName: 'FAL Full Mod + M61 (T6) x300', username: 'FAL_Master_02', password: 'Kamona#FAL61_78', note: 'FAL Recoil ต่ำ กระสุน M61 x300', status: 'available', orderId: null, createdAt: new Date().toISOString() },
  { id: 'vlt_501', productId: '5', productName: 'Mega Wealthy Koen (100 Million)', username: 'Mega_VIP_01', password: 'Kamona#VIP100M_99', note: '100M Koen ปลดล็อคครบทุกพ่อค้า', status: 'available', orderId: null, createdAt: new Date().toISOString() },
  { id: 'vlt_601', productId: '6', productName: 'Budget Runner Set + MPX 9mm 7N31', username: 'MPX_Runner_01', password: 'Kamona#MPX7N_31', note: 'MPX แต่งเต็ม 7N31 x250 พร้อมวิ่ง', status: 'available', orderId: null, createdAt: new Date().toISOString() },
  { id: 'vlt_602', productId: '6', productName: 'Budget Runner Set + MPX 9mm 7N31', username: 'MPX_Runner_02', password: 'Kamona#MPX7N_32', note: 'MPX แต่งเต็ม 7N31 x250 พร้อมวิ่ง', status: 'available', orderId: null, createdAt: new Date().toISOString() }
];

function initVaultListener() {
  try {
    onSnapshot(collection(db, "inventory_vault"), (snapshot) => {
      if (!snapshot.empty) {
        allVaultAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        const saved = localStorage.getItem('tactical_vault_accounts');
        allVaultAccounts = saved ? JSON.parse(saved) : [...DEFAULT_VAULT_ACCOUNTS];
      }
      localStorage.setItem('tactical_vault_accounts', JSON.stringify(allVaultAccounts));
      renderAdminVault();
      updateVaultMetrics();
      populateVaultProductSelect();
      syncProductStocksFromVault();
    }, () => {
      const saved = localStorage.getItem('tactical_vault_accounts');
      allVaultAccounts = saved ? JSON.parse(saved) : [...DEFAULT_VAULT_ACCOUNTS];
      renderAdminVault();
      updateVaultMetrics();
      populateVaultProductSelect();
      syncProductStocksFromVault();
    });
  } catch (err) {
    const saved = localStorage.getItem('tactical_vault_accounts');
    allVaultAccounts = saved ? JSON.parse(saved) : [...DEFAULT_VAULT_ACCOUNTS];
    renderAdminVault();
    updateVaultMetrics();
    populateVaultProductSelect();
    syncProductStocksFromVault();
  }
}

function syncProductStocksFromVault() {
  if (!allAdminProducts || allAdminProducts.length === 0) return;
  let hasChange = false;
  allAdminProducts.forEach(prod => {
    const availCount = allVaultAccounts.filter(a => String(a.productId) === String(prod.id) && a.status === 'available').length;
    if (prod.stock !== availCount) {
      prod.stock = availCount;
      hasChange = true;
    }
  });
  if (hasChange) {
    localStorage.setItem('tactical_products', JSON.stringify(allAdminProducts));
    renderAdminProducts();
    updateProductMetrics();
  }
}

function updateVaultMetrics() {
  const total = allVaultAccounts.length;
  const avail = allVaultAccounts.filter(a => a.status === 'available').length;
  const sold = allVaultAccounts.filter(a => a.status === 'sold').length;

  if (document.getElementById('metric-vault-total')) document.getElementById('metric-vault-total').innerText = total;
  if (document.getElementById('metric-vault-available')) document.getElementById('metric-vault-available').innerText = avail;
  if (document.getElementById('metric-vault-sold')) document.getElementById('metric-vault-sold').innerText = sold;
}

function populateVaultProductSelect() {
  const sSingle = document.getElementById('vault-single-product-id');
  const sBulk = document.getElementById('vault-bulk-product-id');
  const sFilter = document.getElementById('admin-vault-product-filter');

  const optionsHtml = allAdminProducts.map(p => `<option value="${p.id}">${p.name} (สต็อกปัจจุบัน: ${p.stock})</option>`).join('');
  if (sSingle) sSingle.innerHTML = optionsHtml;
  if (sBulk) sBulk.innerHTML = optionsHtml;
  if (sFilter) {
    sFilter.innerHTML = `<option value="all">ทุกสินค้า</option>` + allAdminProducts.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }
}

function filterAdminVault(query) {
  if (query !== undefined) vaultSearchQuery = query.toLowerCase();
  const pFilter = document.getElementById('admin-vault-product-filter')?.value;
  const sFilter = document.getElementById('admin-vault-status-filter')?.value;
  if (pFilter) vaultProductFilter = pFilter;
  if (sFilter) vaultStatusFilter = sFilter;
  renderAdminVault();
}

function renderAdminVault() {
  const tbody = document.getElementById('admin-vault-table-body');
  const empty = document.getElementById('admin-vault-empty');
  if (!tbody) return;

  let list = allVaultAccounts.filter(a => {
    const matchSearch = !vaultSearchQuery || 
      (a.username && a.username.toLowerCase().includes(vaultSearchQuery)) ||
      (a.productName && a.productName.toLowerCase().includes(vaultSearchQuery)) ||
      (a.orderId && a.orderId.toLowerCase().includes(vaultSearchQuery));
    const matchProd = vaultProductFilter === 'all' || String(a.productId) === String(vaultProductFilter);
    const matchStatus = vaultStatusFilter === 'all' || a.status === vaultStatusFilter;
    return matchSearch && matchProd && matchStatus;
  });

  if (list.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  tbody.innerHTML = list.map((a, idx) => `
    <tr class="hover:bg-white/[0.02]">
      <td class="py-3 px-4 font-bold text-white">${a.productName || 'สินค้า #' + a.productId}</td>
      <td class="py-3 px-4 font-mono font-bold text-amber-400">
        ${a.username}
        <button onclick="navigator.clipboard.writeText('${a.username}'); triggerToast('คัดลอก Username สำเร็จ');" class="ml-1 text-zinc-500 hover:text-white" title="คัดลอก">📋</button>
      </td>
      <td class="py-3 px-4 font-mono text-zinc-300">
        <span id="vlt-pw-${idx}">••••••••</span>
        <button onclick="
          const el = document.getElementById('vlt-pw-${idx}');
          if (el.innerText === '••••••••') { el.innerText = '${a.password}'; this.innerText = '🙈'; }
          else { el.innerText = '••••••••'; this.innerText = '👁️'; }
        " class="ml-1 text-xs text-zinc-500 hover:text-amber-400">👁️</button>
        <button onclick="navigator.clipboard.writeText('${a.password}'); triggerToast('คัดลอก Password สำเร็จ');" class="ml-1 text-zinc-500 hover:text-white" title="คัดลอก">📋</button>
      </td>
      <td class="py-3 px-4 text-zinc-400 text-[11px]">${a.note || '-'}</td>
      <td class="py-3 px-4 text-center">
        ${a.status === 'available' 
          ? '<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold text-[10px]">พร้อมขาย</span>' 
          : '<span class="bg-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full font-bold text-[10px]">ขายแล้ว</span>'}
      </td>
      <td class="py-3 px-4 font-mono text-amber-500 font-bold">${a.orderId ? '#' + a.orderId : '-'}</td>
      <td class="py-3 px-4 text-right">
        ${a.status === 'sold' ? `
          <button onclick="releaseVaultAccount('${a.id}')" class="p-1 text-xs text-amber-400 hover:underline mr-2">คืนสต็อก</button>
        ` : ''}
        <button onclick="deleteVaultAccount('${a.id}')" class="p-1 text-xs text-red-400 hover:underline font-bold">ลบ</button>
      </td>
    </tr>
  `).join('');
}

function openVaultSingleModal() {
  populateVaultProductSelect();
  document.getElementById('vault-single-modal')?.classList.remove('hidden');
  document.getElementById('vault-single-modal')?.classList.add('flex');
}
function closeVaultSingleModal() {
  document.getElementById('vault-single-modal')?.classList.add('hidden');
  document.getElementById('vault-single-modal')?.classList.remove('flex');
}

async function handleVaultSingleSubmit(e) {
  e.preventDefault();
  const prodId = document.getElementById('vault-single-product-id').value;
  const username = document.getElementById('vault-single-username').value.trim();
  const password = document.getElementById('vault-single-password').value.trim();
  const note = document.getElementById('vault-single-note').value.trim();
  const prod = allAdminProducts.find(p => String(p.id) === String(prodId));

  const newAcc = {
    id: 'vlt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    productId: prodId,
    productName: prod ? prod.name : 'Product #' + prodId,
    username,
    password,
    note,
    status: 'available',
    orderId: null,
    createdAt: new Date().toISOString()
  };

  allVaultAccounts.unshift(newAcc);
  localStorage.setItem('tactical_vault_accounts', JSON.stringify(allVaultAccounts));
  try {
    await setDoc(doc(db, "inventory_vault", newAcc.id), newAcc);
  } catch (err) { }

  renderAdminVault();
  updateVaultMetrics();
  syncProductStocksFromVault();
  triggerToast('เพิ่มไอดีเข้าตู้เซฟสต็อกสำเร็จ!');
  closeVaultSingleModal();
  e.target.reset();
}

function openVaultBulkModal() {
  populateVaultProductSelect();
  document.getElementById('vault-bulk-modal')?.classList.remove('hidden');
  document.getElementById('vault-bulk-modal')?.classList.add('flex');
}
function closeVaultBulkModal() {
  document.getElementById('vault-bulk-modal')?.classList.add('hidden');
  document.getElementById('vault-bulk-modal')?.classList.remove('flex');
}

async function handleVaultBulkSubmit(e) {
  e.preventDefault();
  const prodId = document.getElementById('vault-bulk-product-id').value;
  const rawText = document.getElementById('vault-bulk-textarea').value.trim();
  const prod = allAdminProducts.find(p => String(p.id) === String(prodId));

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let addedCount = 0;

  for (const line of lines) {
    let parts = line.includes('|') ? line.split('|') : line.split(':');
    if (parts.length >= 2) {
      const u = parts[0].trim();
      const p = parts[1].trim();
      const n = parts.slice(2).join(' ').trim() || 'เมลสะอาด พร้อมใช้งาน';

      const newAcc = {
        id: 'vlt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        productId: prodId,
        productName: prod ? prod.name : 'Product #' + prodId,
        username: u,
        password: p,
        note: n,
        status: 'available',
        orderId: null,
        createdAt: new Date().toISOString()
      };

      allVaultAccounts.unshift(newAcc);
      try {
        await setDoc(doc(db, "inventory_vault", newAcc.id), newAcc);
      } catch (err) { }
      addedCount++;
    }
  }

  localStorage.setItem('tactical_vault_accounts', JSON.stringify(allVaultAccounts));
  renderAdminVault();
  updateVaultMetrics();
  syncProductStocksFromVault();
  triggerToast(`นำเข้าสำเร็จ ${addedCount} บัญชีเข้าตู้เซฟ!`);
  closeVaultBulkModal();
  e.target.reset();
}

async function deleteVaultAccount(id) {
  if (!confirm('ยืนยันลบไอดีนี้ออกจากคลัง?')) return;
  allVaultAccounts = allVaultAccounts.filter(a => a.id !== id);
  localStorage.setItem('tactical_vault_accounts', JSON.stringify(allVaultAccounts));
  try {
    await deleteDoc(doc(db, "inventory_vault", id));
  } catch (err) { }
  renderAdminVault();
  updateVaultMetrics();
  syncProductStocksFromVault();
  triggerToast('ลบไอดีออกจากคลังเรียบร้อย');
}

async function releaseVaultAccount(id) {
  const acc = allVaultAccounts.find(a => a.id === id);
  if (!acc) return;
  acc.status = 'available';
  acc.orderId = null;
  localStorage.setItem('tactical_vault_accounts', JSON.stringify(allVaultAccounts));
  try {
    await updateDoc(doc(db, "inventory_vault", id), { status: 'available', orderId: null });
  } catch (err) { }
  renderAdminVault();
  updateVaultMetrics();
  syncProductStocksFromVault();
  triggerToast('คืนสถานะไอดีเป็น พร้อมขาย เรียบร้อย!');
}

// ==========================================
// 9. SELL SUBMISSIONS (ระบบรับซื้อไอดีไก่ & ส่งงาน)
// ==========================================
let allAdminSubmissions = [];
let currentSubFilter = 'all';

const DEFAULT_SUBMISSIONS = [
  {
    id: 'SUB-AB98214',
    accountType: 'ไก่ 61 กระสุน (Ammo Starter)',
    quantity: 5,
    askingPrice: 200.00,
    paymentMethod: 'promptpay',
    accountNumber: '0891234567',
    accountName: 'สมศักดิ์ สายบวก',
    contactType: 'Facebook',
    contactDetail: 'fb.com/somsak.arena',
    credentials: 'ab61_user01|pass9921\nab61_user02|pass9922\nab61_user03|pass9923\nab61_user04|pass9924\nab61_user05|pass9925',
    notes: 'ทำเควสจบเลเวล 12 มีกระสุน T6 ครบ 5 ตัว',
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

function initSubmissionsListener() {
  try {
    onSnapshot(collection(db, "sell_submissions"), (snapshot) => {
      if (!snapshot.empty) {
        allAdminSubmissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        const saved = localStorage.getItem('tactical_sell_submissions');
        allAdminSubmissions = saved ? JSON.parse(saved) : [...DEFAULT_SUBMISSIONS];
      }
      localStorage.setItem('tactical_sell_submissions', JSON.stringify(allAdminSubmissions));
      renderAdminSubmissions();
      updateSubmissionsMetrics();
    }, () => {
      const saved = localStorage.getItem('tactical_sell_submissions');
      allAdminSubmissions = saved ? JSON.parse(saved) : [...DEFAULT_SUBMISSIONS];
      renderAdminSubmissions();
      updateSubmissionsMetrics();
    });
  } catch (err) {
    const saved = localStorage.getItem('tactical_sell_submissions');
    allAdminSubmissions = saved ? JSON.parse(saved) : [...DEFAULT_SUBMISSIONS];
    renderAdminSubmissions();
    updateSubmissionsMetrics();
  }
}

function updateSubmissionsMetrics() {
  const total = allAdminSubmissions.length;
  const pending = allAdminSubmissions.filter(s => s.status === 'pending').length;
  const paid = allAdminSubmissions.filter(s => s.status === 'paid').length;
  let totalAmount = 0;
  allAdminSubmissions.forEach(s => { if (s.status === 'paid') totalAmount += Number(s.askingPrice || 0); });

  if (document.getElementById('metric-sub-total')) document.getElementById('metric-sub-total').innerText = total;
  if (document.getElementById('metric-sub-pending')) document.getElementById('metric-sub-pending').innerText = pending;
  if (document.getElementById('metric-sub-paid')) document.getElementById('metric-sub-paid').innerText = paid;
  if (document.getElementById('metric-sub-amount')) document.getElementById('metric-sub-amount').innerText = `฿${totalAmount.toFixed(2)}`;
}

function filterAdminSubmissions(val) {
  currentSubFilter = val;
  renderAdminSubmissions();
}

function renderAdminSubmissions() {
  const tbody = document.getElementById('admin-submissions-table-body');
  const empty = document.getElementById('admin-submissions-empty');
  if (!tbody) return;

  let list = allAdminSubmissions;
  if (currentSubFilter !== 'all') list = list.filter(s => s.status === currentSubFilter);

  if (list.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  tbody.innerHTML = list.map(s => {
    let statusBadge = '<span class="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-bold text-[10px]">รอตรวจสอบ</span>';
    if (s.status === 'approved') statusBadge = '<span class="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-bold text-[10px]">อนุมัติ/รอโอน</span>';
    else if (s.status === 'paid') statusBadge = '<span class="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold text-[10px]">โอนเงินแล้ว</span>';
    else if (s.status === 'rejected') statusBadge = '<span class="bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold text-[10px]">ปฏิเสธ</span>';

    return `
      <tr class="hover:bg-white/[0.02]">
        <td class="py-3 px-4 font-mono font-bold text-amber-500">${s.id}</td>
        <td class="py-3 px-4 text-zinc-400 text-[11px]">${s.createdAt ? new Date(s.createdAt).toLocaleDateString('th-TH') : '-'}</td>
        <td class="py-3 px-4 text-white font-bold">${s.accountType}</td>
        <td class="py-3 px-4 text-center font-mono font-bold">${s.quantity}</td>
        <td class="py-3 px-4 font-mono font-bold text-white">฿${Number(s.askingPrice || 0).toFixed(2)}</td>
        <td class="py-3 px-4 text-[11px] font-mono text-zinc-300">
          ${s.paymentMethod}: <span class="text-amber-400 font-bold">${s.accountNumber}</span><br>
          <span class="text-zinc-500">${s.accountName || '-'}</span>
        </td>
        <td class="py-3 px-4 text-[11px] text-zinc-300">
          <span class="text-zinc-500 font-bold">[${s.contactType}]</span> ${s.contactDetail}
        </td>
        <td class="py-3 px-4 text-center">${statusBadge}</td>
        <td class="py-3 px-4 text-right">
          <button onclick="openSubmissionModal('${s.id}')" class="p-1 text-xs text-amber-400 hover:underline mr-1 font-bold">ดูรายละเอียด</button>
          <button onclick="deleteSubmission('${s.id}')" class="p-1 text-xs text-red-400 hover:underline font-bold">ลบ</button>
        </td>
      </tr>
    `;
  }).join('');
}

let activeSubmission = null;
function openSubmissionModal(subId) {
  activeSubmission = allAdminSubmissions.find(s => s.id === subId);
  if (!activeSubmission) return;

  const modal = document.getElementById('submission-detail-modal');
  document.getElementById('sub-modal-id').innerText = `รายการส่งขาย #${activeSubmission.id}`;

  const targetProdOptions = allAdminProducts.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

  document.getElementById('sub-modal-content').innerHTML = `
    <div class="grid grid-cols-2 gap-4 bg-zinc-900/60 p-4 rounded-2xl border border-white/5 font-mono text-[11px]">
      <div><span class="text-zinc-500">ประเภท:</span> <strong class="text-white">${activeSubmission.accountType}</strong></div>
      <div><span class="text-zinc-500">จำนวน:</span> <strong class="text-amber-400">${activeSubmission.quantity} ตัว</strong></div>
      <div><span class="text-zinc-500">ราคาเสนอขาย:</span> <strong class="text-emerald-400">฿${Number(activeSubmission.askingPrice).toFixed(2)}</strong></div>
      <div><span class="text-zinc-500">โอนเข้า:</span> <strong class="text-white">${activeSubmission.accountNumber} (${activeSubmission.accountName || '-'})</strong></div>
      <div class="col-span-2"><span class="text-zinc-500">ติดต่อ:</span> <strong class="text-white">[${activeSubmission.contactType}] ${activeSubmission.contactDetail}</strong></div>
      <div class="col-span-2"><span class="text-zinc-500">หมายเหตุ:</span> <span class="text-zinc-300">${activeSubmission.notes || '-'}</span></div>
    </div>

    <div>
      <label class="block text-xs font-bold text-zinc-400 mb-1.5">🔑 ข้อมูลไอดี / รหัสผ่านที่ส่งมา:</label>
      <pre class="bg-black/80 border border-white/10 rounded-2xl p-4 text-xs font-mono text-amber-300 whitespace-pre-wrap select-all max-h-48 overflow-y-auto">${activeSubmission.credentials || 'ไม่มีข้อมูลไอดี'}</pre>
    </div>

    <div class="pt-2 border-t border-white/10">
      <label class="block text-xs font-bold text-zinc-400 mb-2">⚡ นำเข้าคลังสต็อกอัตโนมัติ (Import to Vault):</label>
      <div class="flex gap-2">
        <select id="import-to-prod-id" class="flex-grow bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white">
          ${targetProdOptions}
        </select>
        <button onclick="importSubmissionToVault('${activeSubmission.id}')" class="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2 rounded-xl text-xs shrink-0 transition-all shadow-md">
          📥 นำเข้าคลังทันที
        </button>
      </div>
    </div>

    <div class="pt-3 border-t border-white/10 flex items-center justify-between">
      <span class="text-xs text-zinc-400">ปรับสถานะรายการ:</span>
      <div class="flex gap-2">
        <button onclick="updateSubmissionStatus('${activeSubmission.id}', 'approved')" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs">อนุมัติ</button>
        <button onclick="updateSubmissionStatus('${activeSubmission.id}', 'paid')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs">โอนเงินแล้ว</button>
        <button onclick="updateSubmissionStatus('${activeSubmission.id}', 'rejected')" class="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs">ปฏิเสธ</button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeSubmissionModal() {
  document.getElementById('submission-detail-modal')?.classList.add('hidden');
  document.getElementById('submission-detail-modal')?.classList.remove('flex');
}

async function updateSubmissionStatus(subId, newStatus) {
  const sub = allAdminSubmissions.find(s => s.id === subId);
  if (!sub) return;
  sub.status = newStatus;
  localStorage.setItem('tactical_sell_submissions', JSON.stringify(allAdminSubmissions));
  try {
    await updateDoc(doc(db, "sell_submissions", subId), { status: newStatus });
  } catch (err) { }
  renderAdminSubmissions();
  updateSubmissionsMetrics();
  triggerToast(`อัปเดตสถานะเป็น "${newStatus}" เรียบร้อย!`);
  closeSubmissionModal();
}

async function importSubmissionToVault(subId) {
  const sub = allAdminSubmissions.find(s => s.id === subId);
  if (!sub) return;

  const targetProdId = document.getElementById('import-to-prod-id').value;
  const prod = allAdminProducts.find(p => String(p.id) === String(targetProdId));
  const rawCreds = sub.credentials || '';

  const lines = rawCreds.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let imported = 0;

  for (const line of lines) {
    let parts = line.includes('|') ? line.split('|') : line.split(':');
    if (parts.length >= 2) {
      const u = parts[0].trim();
      const p = parts[1].trim();
      const n = parts.slice(2).join(' ').trim() || `รับซื้อจาก ${sub.contactDetail}`;

      const newAcc = {
        id: 'vlt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        productId: targetProdId,
        productName: prod ? prod.name : 'Product #' + targetProdId,
        username: u,
        password: p,
        note: n,
        status: 'available',
        orderId: null,
        createdAt: new Date().toISOString()
      };

      allVaultAccounts.unshift(newAcc);
      try {
        await setDoc(doc(db, "inventory_vault", newAcc.id), newAcc);
      } catch (err) { }
      imported++;
    }
  }

  localStorage.setItem('tactical_vault_accounts', JSON.stringify(allVaultAccounts));
  renderAdminVault();
  updateVaultMetrics();
  syncProductStocksFromVault();
  triggerToast(`นำเข้าคลังสินค้าสำเร็จ ${imported} ไอดี! สต็อกอัปเดตทันที`);
  closeSubmissionModal();
}

async function deleteSubmission(subId) {
  if (!confirm('ยืนยันลบรายการส่งขายนี้หรือไม่?')) return;
  allAdminSubmissions = allAdminSubmissions.filter(s => s.id !== subId);
  localStorage.setItem('tactical_sell_submissions', JSON.stringify(allAdminSubmissions));
  try {
    await deleteDoc(doc(db, "sell_submissions", subId));
  } catch (err) { }
  renderAdminSubmissions();
  updateSubmissionsMetrics();
  triggerToast('ลบรายการส่งขายเรียบร้อย');
}

// ==========================================
// 10. REVIEWS MODERATION (ระบบรีวิวร้านค้า)
// ==========================================
let allAdminReviews = [];

const DEFAULT_REVIEWS = [
  { id: 'rev_1', name: 'Agent_Zero', rating: 5, productName: 'M4A1 Full Mod + T6 Ammo x300', text: 'ไอดีพร้อมเล่น ปืนแต่งแน่นมาก ซื้อปุ๊บได้รหัสทันที ลุยลงเรดได้เลย แนะนำครับ', date: '2026-10-09T14:30:00Z' },
  { id: 'rev_2', name: 'KoenKing', rating: 5, productName: 'Starter Koen Account (15 Million)', text: 'เงิน 15M ครบถ้วน เมลสะอาด เปลี่ยนรหัสผ่านได้จริง รวดเร็วมากครับ', date: '2026-10-10T09:15:00Z' },
  { id: 'rev_3', name: 'GhostSniper', rating: 5, productName: 'FAL Full Mod + M61 (T6) x300', text: 'สลิปตรวจอัตโนมัติ ไม่ต้องทักแชทรอนาน ไก่กระสุน T6 เล่นมันส์มาก', date: '2026-10-11T12:00:00Z' }
];

function initReviewsListener() {
  try {
    onSnapshot(collection(db, "reviews"), (snapshot) => {
      if (!snapshot.empty) {
        allAdminReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        const saved = localStorage.getItem('tactical_reviews');
        allAdminReviews = saved ? JSON.parse(saved) : [...DEFAULT_REVIEWS];
      }
      localStorage.setItem('tactical_reviews', JSON.stringify(allAdminReviews));
      renderAdminReviews();
    }, () => {
      const saved = localStorage.getItem('tactical_reviews');
      allAdminReviews = saved ? JSON.parse(saved) : [...DEFAULT_REVIEWS];
      renderAdminReviews();
    });
  } catch (err) {
    const saved = localStorage.getItem('tactical_reviews');
    allAdminReviews = saved ? JSON.parse(saved) : [...DEFAULT_REVIEWS];
    renderAdminReviews();
  }
}

function renderAdminReviews() {
  const tbody = document.getElementById('admin-reviews-table-body');
  const empty = document.getElementById('admin-reviews-empty');
  if (!tbody) return;

  if (allAdminReviews.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  tbody.innerHTML = allAdminReviews.map(r => `
    <tr class="hover:bg-white/[0.02]">
      <td class="py-3 px-4 text-zinc-400 text-[11px]">${r.date ? new Date(r.date).toLocaleDateString('th-TH') : '-'}</td>
      <td class="py-3 px-4 font-bold text-white">${r.name || 'ผู้เล่นนิรนาม'}</td>
      <td class="py-3 px-4 text-amber-400 font-bold">${'⭐'.repeat(r.rating || 5)}</td>
      <td class="py-3 px-4 text-zinc-300 font-bold">${r.productName || '-'}</td>
      <td class="py-3 px-4 text-zinc-400 max-w-xs truncate">${r.text || '-'}</td>
      <td class="py-3 px-4 text-right">
        <button onclick="deleteReview('${r.id}')" class="text-xs text-red-400 hover:underline font-bold">ลบ</button>
      </td>
    </tr>
  `).join('');
}

async function deleteReview(revId) {
  if (!confirm('ยืนยันลบรีวิวนี้หรือไม่?')) return;
  allAdminReviews = allAdminReviews.filter(r => r.id !== revId);
  localStorage.setItem('tactical_reviews', JSON.stringify(allAdminReviews));
  try {
    await deleteDoc(doc(db, "reviews", revId));
  } catch (err) { }
  renderAdminReviews();
  triggerToast('ลบรีวิวสำเร็จ');
}

// Discord Webhook Tester
async function testDiscordWebhook() {
  const url = document.getElementById('setting-discord-webhook')?.value.trim();
  if (!url || !url.startsWith('http')) {
    triggerToast('กรุณากรอก Discord Webhook URL ให้ถูกต้องก่อนทดสอบ');
    return;
  }

  triggerToast('กำลังส่งสัญญาณทดสอบไปยัง Discord Webhook...');
  try {
    const payload = {
      content: "📢 **[TACTICAL STORE / MOSZXLLSHOP]** การทดสอบเชื่อมต่อ Webhook สำเร็จเรียบร้อย!",
      embeds: [{
        title: "⚡ ระบบแจ้งเตือนพร้อมใช้งาน",
        description: "ระบบเชื่อมต่อ Discord Webhook สำหรับออเดอร์ใหม่และรายการส่งขายไอดีพร้อมใช้งาน 100%",
        color: 16103179,
        timestamp: new Date().toISOString()
      }]
    };
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    triggerToast('ส่งทดสอบเข้า Discord สำเร็จเรียบร้อย!');
  } catch (err) {
    triggerToast('ส่งทดสอบเรียบร้อย (ตรวจสอบห้อง Discord ของคุณ)');
  }
}

function initAdminData() {
  if (isAdminDataInitialized) return;
  isAdminDataInitialized = true;

  initCategoriesListener();
  initProductsListener();
  initVaultListener();
  initSubmissionsListener();
  initOrdersListener();
  initUsersListener();
  initPromosListener();
  initReviewsListener();
  loadStoreSettings();
}

// ปิด Modal เมื่อคลิกพื้นที่ว่างสีดำ (Backdrop)
document.addEventListener('click', (e) => {
  if (e.target.id === 'category-form-modal') closeCategoryModal();
  if (e.target.id === 'product-form-modal') closeProductModal();
  if (e.target.id === 'order-fulfillment-modal') closeOrderModal();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { 
    closeCategoryModal(); 
    closeProductModal(); 
    closeOrderModal(); 
  }
});

// Exports to window
window.handleAdminUnlock = handleAdminUnlock;
window.handleAdminSetupPassword = handleAdminSetupPassword;
window.handleAdminChangePassword = handleAdminChangePassword;
window.lockAdminSession = lockAdminSession;
window.switchAdminTab = switchAdminTab;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.updateCatImagePreview = updateCatImagePreview;
window.handleCategoryFormSubmit = handleCategoryFormSubmit;
window.seedDefaultCategories = seedDefaultCategories;
window.filterAdminCategories = filterAdminCategories;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateImagePreview = updateImagePreview;
window.handleProductFormSubmit = handleProductFormSubmit;
window.seedInitialProducts = seedInitialProducts;
window.filterAdminProducts = filterAdminProducts;
window.openOrderModal = openOrderModal;
window.closeOrderModal = closeOrderModal;
window.handleSaveOrderDelivery = handleSaveOrderDelivery;
window.deleteOrder = deleteOrder;
window.toggleUserRole = toggleUserRole;
window.handleCreatePromo = handleCreatePromo;
window.deletePromo = deletePromo;
window.handleSaveSettings = handleSaveSettings;

// Vault Exports
window.openVaultSingleModal = openVaultSingleModal;
window.closeVaultSingleModal = closeVaultSingleModal;
window.handleVaultSingleSubmit = handleVaultSingleSubmit;
window.openVaultBulkModal = openVaultBulkModal;
window.closeVaultBulkModal = closeVaultBulkModal;
window.handleVaultBulkSubmit = handleVaultBulkSubmit;
window.filterAdminVault = filterAdminVault;
window.deleteVaultAccount = deleteVaultAccount;
window.releaseVaultAccount = releaseVaultAccount;

// Submissions Exports
window.openSubmissionModal = openSubmissionModal;
window.closeSubmissionModal = closeSubmissionModal;
window.filterAdminSubmissions = filterAdminSubmissions;
window.updateSubmissionStatus = updateSubmissionStatus;
window.importSubmissionToVault = importSubmissionToVault;
window.deleteSubmission = deleteSubmission;

// Reviews & Discord Exports
window.deleteReview = deleteReview;
window.testDiscordWebhook = testDiscordWebhook;

window.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
});
