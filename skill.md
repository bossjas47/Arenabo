# Tactical Store — System Specification & Security Architecture (skill.md)

ข้อกำหนดทางเทคนิค สถาปัตยกรรมความปลอดภัย และระบบการออกแบบสำหรับโปรเจกต์ Tactical Store (Arena Breakout Market)

---

## 1. Security Architecture & Role-Based Access Control (RBAC)

### 1.1 Role Separation & Admin Designation (การคัดแยกสิทธิ์และตั้งแอดมิน)
- **แอดมินหลักของระบบ (Master Admin):** กำหนดให้ผู้ใช้ `atest` เป็นผู้ดูแลระบบ (ADMIN) โดยอัตโนมัติ (ครอบคลุมทั้ง displayName, username ในเครื่อง และอีเมล `atest@...`)
- **การซ่อนระบบหลังบ้านจากผู้ใช้ธรรมดา (Hidden Backoffice for Regular Users):**
  - ในหน้าร้านค้า (`index.html`) และหน้าบัญชี (`front/account.html`): ผู้ใช้ธรรมดาจะไม่เห็นปุ่มหรือแถบเมนูหลังบ้านเลย (`hidden` 100%)
  - เมนูหลังบ้านถูกย้ายเข้าไปอยู่ใน **"หมวดหมู่บัญชี" (`front/account.html`)** และจะปรากฏเฉพาะเมื่อผู้ใช้ที่เข้าสู่ระบบคือ `atest` เท่านั้น
- **การป้องกันการเข้าถึง URL หลังบ้านโดยตรง (Direct Access Blocker):**
  - หากผู้ใช้ทั่วไปพยายามเปิดหน้า `front/admin.html` โดยตรง ระบบจะตรวจสอบสิทธิ์และบล็อกทันที แสดงหน้าต่างแจ้งเตือน `403 ACCESS FORBIDDEN: เฉพาะผู้ใช้ atest เท่านั้น` และรีไดเรกต์กลับอัตโนมัติ

### 1.2 Zero-Trust Credential Vault (การจัดเก็บไอดีเกม)
- **ห้ามฝังรหัสเกมไว้ฝั่ง Client หรือเก็บใน Collection สาธารณะ:** รหัส Username/Password ต้องไม่ถูก query ลงมายังเบราว์เซอร์ล่วงหน้า
- **Vault Subcollection:** แยกบัญชีเกมไปไว้ใน `inventory_vault` ที่ตั้งค่า Firestore Security Rules ปิดการอ่าน/เขียนจาก Client 100%
- **Customer Retrieval:** ลูกค้าสามารถตรวจสอบรหัสผ่านของไอดีที่ตนเองเคยซื้อสำเร็จได้ในหน้า **"บัญชีของฉัน" (`front/account.html`)**

### 1.3 Firestore Security Rules (กฎความปลอดภัยฐานข้อมูล)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /orders/{orderId} {
      allow create: if true;
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || request.auth.token.admin == true);
      allow update, delete: if request.auth != null && request.auth.token.admin == true;
    }
    match /inventory_vault/{vaultId} {
      allow read, write: if false;
    }
  }
}
```

### 1.4 Anti-Abuse & Rate Limiting (การป้องกันการโจมตี)
- **Promo Code Rate Limit:** จำกัดความถี่การกรอกโค้ดส่วนลด (ไม่เกิน 5 ครั้ง/นาที) เพื่อกัน Brute-force สุ่มโค้ด
- **Credential Masking:** ซ่อนรหัสผ่านเป็นจุดไข่ปลา พร้อมปุ่มกดแสดงรหัสและปุ่มคัดลอกในคลิกเดียว

---

## 2. Design System & UI Consistency (การออกแบบ)

### 2.1 Tactical Aesthetics & Icon Matching
- **Icons Consistency:** ไอคอนทั้งหมดในหน้าบัญชี (`front/account.html`) และหน้าร้านค้า (`index.html`) เป็น SVG สไตล์ Tactical เดียวกัน (Stroke Width 2, Amber Accents, Dark Surface)
- **Background & HUD Theme:** Deep Black (`#050505`), Glass-card gradients, ขอบ White Frost (`rgba(255, 255, 255, 0.08)`), Tactical Grid BG
- **Typography:** `Outfit` (Heading font, uppercase HUD style) และ `Prompt` (Body font ภาษาไทยและอังกฤษ)
