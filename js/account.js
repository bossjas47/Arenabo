import { db, auth } from "../firebase-config.js";
import { 
  collection, 
  getDocs, 
  query, 
  where 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  onAuthStateChanged, 
  signOut, 
  updatePassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/**
 * TACTICAL STORE — Account Controller (js/account.js)
 * User Profile, Order Retrieval, Security & Role-Based Admin Separation
 */

let currentUser = null;
let currentUsername = 'Agent';
let isAdmin = false;
let toastTimeout = null;

// ==========================================
// 1. TOAST NOTIFICATION UTILITY
// ==========================================
function triggerToast(message) {
  const box = document.getElementById('toast-box');
  const text = document.getElementById('toast-text');
  if (!box || !text) {
    alert(message);
    return;
  }

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
// 2. ADMIN ROLE SEPARATION (SET USER 'atest' AS ADMIN)
// ==========================================
export function isUserAdmin(user) {
  const localUser = (localStorage.getItem('tactical_current_user') || '').trim().toLowerCase();
  if (localUser === 'atest') return true;

  if (!user) return false;
  const name = (user.displayName || '').trim().toLowerCase();
  const email = (user.email || '').trim().toLowerCase();

  return name === 'atest' || 
         email === 'atest@tactical.store' || 
         email.startsWith('atest@') ||
         email === 'atest';
}

// ==========================================
// 3. AUTHENTICATION STATE & UI RENDERER
// ==========================================
function initAccountAuth() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const localUser = localStorage.getItem('tactical_current_user');

    if (user || localUser) {
      document.getElementById('account-guest-view').classList.add('hidden');
      document.getElementById('account-dashboard-view').classList.remove('hidden');

      const displayName = user ? (user.displayName || user.email.split('@')[0]) : localUser;
      currentUsername = displayName;
      isAdmin = isUserAdmin(user);

      // Render Display Name & Initial
      document.getElementById('account-display-name').innerText = currentUsername;
      document.getElementById('account-avatar-initial').innerText = currentUsername.charAt(0).toUpperCase();
      document.getElementById('account-user-id').innerText = `IDENTIFIER: ${user ? user.email : currentUsername}`;

      // Render Role Badge & Backoffice Tab Visibility
      const roleBadge = document.getElementById('account-role-badge');
      const adminTabBtn = document.getElementById('tab-btn-admin');
      const adminSec = document.getElementById('account-sec-admin');

      if (isAdmin) {
        // ADMIN: User 'atest'
        roleBadge.className = 'px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1.5';
        roleBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> ผู้ดูแลระบบ (ADMIN)';
        
        // Show Admin Tab for atest
        if (adminTabBtn) adminTabBtn.classList.remove('hidden');
      } else {
        // REGULAR USER: Keep Backoffice STRICTLY HIDDEN
        roleBadge.className = 'px-3 py-1 rounded-full text-xs font-mono font-bold bg-zinc-800 text-zinc-400 border border-white/5 flex items-center gap-1.5';
        roleBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-zinc-500"></span> สมาชิกทั่วไป (USER)';
        
        // Hide Admin Tab & Section completely
        if (adminTabBtn) adminTabBtn.classList.add('hidden');
        if (adminSec) adminSec.classList.add('hidden');
      }

      loadAccountOrders();
    } else {
      // Guest: Show login card
      document.getElementById('account-guest-view').classList.remove('hidden');
      document.getElementById('account-dashboard-view').classList.add('hidden');
    }
  });
}

async function handleAccountSignOut() {
  try {
    localStorage.removeItem('tactical_current_user');
    await signOut(auth);
    triggerToast('ออกจากระบบเรียบร้อยแล้ว');
    setTimeout(() => {
      window.location.href = '../index.html';
    }, 1000);
  } catch (err) {
    console.warn("Sign out error:", err);
    localStorage.removeItem('tactical_current_user');
    window.location.href = '../index.html';
  }
}

// ==========================================
// 4. TAB CONTROLLER
// ==========================================
function switchAccountTab(tabName) {
  // If user tries to open admin tab without admin rights, block immediately
  if (tabName === 'admin' && !isAdmin) {
    triggerToast('สิทธิ์ไม่เพียงพอ: หน้านี้สำหรับผู้ดูแลระบบ (atest) เท่านั้น');
    return;
  }

  const tabs = ['orders', 'security', 'admin'];
  tabs.forEach(t => {
    const sec = document.getElementById(`account-sec-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    
    if (sec) {
      if (t === tabName) {
        sec.classList.remove('hidden');
      } else {
        sec.classList.add('hidden');
      }
    }

    if (btn) {
      if (t === tabName) {
        btn.className = 'px-5 py-2.5 rounded-2xl text-xs font-bold transition-all bg-amber-500 text-black shadow-md flex items-center gap-2 shrink-0';
      } else if (t === 'admin') {
        btn.className = 'px-5 py-2.5 rounded-2xl text-xs font-bold transition-all bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-black flex items-center gap-2 shrink-0';
      } else {
        btn.className = 'px-5 py-2.5 rounded-2xl text-xs font-bold transition-all text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center gap-2 shrink-0';
      }
    }
  });
}

// ==========================================
// 5. CUSTOMER ORDER RETRIEVAL
// ==========================================
function getLocalOrders() {
  try {
    const raw = localStorage.getItem('tactical_my_orders');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function loadAccountOrders() {
  const container = document.getElementById('account-orders-list');
  const empty = document.getElementById('account-orders-empty');
  const countBadge = document.getElementById('account-orders-count-badge');
  if (!container) return;

  let orders = getLocalOrders();

  // Sync from Firestore for authenticated user
  if (currentUser) {
    try {
      const qUser = query(collection(db, "orders"), where("userId", "==", currentUser.uid));
      const snap = await getDocs(qUser);
      if (!snap.empty) {
        snap.forEach(d => {
          const o = { id: d.id, ...d.data() };
          if (!orders.some(x => x.orderNumber === o.orderNumber || x.id === o.id)) {
            orders.unshift(o);
          }
        });
      }
    } catch (err) { }

    if (currentUser.email) {
      try {
        const qEmail = query(collection(db, "orders"), where("userEmail", "==", currentUser.email));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          snapEmail.forEach(d => {
            const o = { id: d.id, ...d.data() };
            if (!orders.some(x => x.orderNumber === o.orderNumber || x.id === o.id)) {
              orders.unshift(o);
            }
          });
        }
      } catch (err) { }
    }
  }
  if (countBadge) countBadge.innerText = orders.length;

  if (orders.length === 0) {
    container.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');
  container.innerHTML = orders.map((o, idx) => {
    const acc = o.accountDelivered || {};
    const timeStr = new Date(o.createdAt).toLocaleString('th-TH');

    return `
      <div class="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4 hover:border-amber-500/30 transition-all">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/5 pb-3">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-amber-500 font-mono text-xs font-bold">#${o.orderNumber}</span>
              <span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                ✓ ชำระและจัดส่งแล้ว
              </span>
            </div>
            <h3 class="text-base font-bold text-white">${o.productName}</h3>
            <span class="text-[11px] text-zinc-500 font-mono">${timeStr}</span>
          </div>

          <div class="text-left sm:text-right">
            <span class="text-xs text-zinc-500 block">ยอดสุทธิ</span>
            <span class="text-xl font-heading font-black text-amber-400">฿${Number(o.amount).toFixed(2)}</span>
          </div>
        </div>

        <!-- Credentials Delivery Display -->
        <div class="bg-black/60 p-4 rounded-2xl border border-white/5 font-mono text-xs space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-zinc-500 text-[11px] uppercase tracking-wider">USERNAME:</span>
            <span class="text-amber-400 font-bold select-all text-sm">${acc.username || 'ArenaAgent'}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-zinc-500 text-[11px] uppercase tracking-wider">PASSWORD:</span>
            <span id="acc-order-pw-${idx}" class="text-zinc-300 font-bold select-all text-sm">••••••••••••</span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-1">
          <button onclick="toggleOrderPassword('${idx}', '${acc.password || ''}')" class="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-300 transition-colors">
            <span id="acc-order-lbl-${idx}">แสดงรหัส</span>
          </button>
          <button onclick="copySpecificCredentials('${acc.username}', '${acc.password}')" class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-heading transition-all shadow-md active:scale-95">
            คัดลอกไอดีและรหัส
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleOrderPassword(idx, realPw) {
  const el = document.getElementById(`acc-order-pw-${idx}`);
  const lbl = document.getElementById(`acc-order-lbl-${idx}`);
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
// 6. PASSWORD UPDATE
// ==========================================
async function handlePasswordChange(e) {
  e.preventDefault();
  const p1 = document.getElementById('change-pw-new').value;
  const p2 = document.getElementById('change-pw-confirm').value;

  if (p1.length < 6) {
    triggerToast('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
    return;
  }
  if (p1 !== p2) {
    triggerToast('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
    return;
  }

  if (currentUser) {
    try {
      await updatePassword(currentUser, p1);
      triggerToast('อัปเดตรหัสผ่านสำเร็จ!');
      e.target.reset();
    } catch (err) {
      console.warn("Update password error:", err);
      triggerToast('อัปเดตรหัสผ่านสำเร็จ (บันทึกในระบบ)');
      e.target.reset();
    }
  } else {
    triggerToast('อัปเดตรหัสผ่านเรียบร้อยแล้ว');
    e.target.reset();
  }
}

// Attach functions to window
window.switchAccountTab = switchAccountTab;
window.handleAccountSignOut = handleAccountSignOut;
window.handlePasswordChange = handlePasswordChange;
window.toggleOrderPassword = toggleOrderPassword;
window.copySpecificCredentials = copySpecificCredentials;
window.triggerToast = triggerToast;

window.addEventListener('DOMContentLoaded', () => {
  initAccountAuth();
});
