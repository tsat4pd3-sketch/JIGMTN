# PM JIG — Thai Summit Automotive (Branch 1)

ระบบ Preventive Maintenance JIG สำหรับ Line 061  
FM-JIG-003 Rev.00 | 26 JIGs | JHYD06 + GPHYD06

🌐 **URL:** https://tsat4pd3-sketch.github.io/JIGMTN/

---

## การตั้งค่าครั้งแรก (ทำครั้งเดียว)

### ขั้นตอนที่ 1 — สร้าง GitHub Token

1. ไปที่ https://github.com/settings/tokens/new
2. ตั้งชื่อ: `PM JIG App`
3. Expiration: **No expiration** (หรือตามนโยบายบริษัท)
4. เลือก scope: ✅ **`repo`** (ติ๊กทั้ง repo group)
5. กด **Generate token** → คัดลอก token (ขึ้นต้นด้วย `ghp_`)

### ขั้นตอนที่ 2 — เพิ่ม Token เป็น Secret

1. ไปที่ repo นี้ → **Settings** → **Secrets and variables** → **Actions**
2. กด **New repository secret**
3. Name: `VITE_GITHUB_TOKEN`
4. Value: วาง token ที่ได้
5. กด **Add secret**

### ขั้นตอนที่ 3 — เปิด GitHub Pages

1. ไปที่ **Settings** → **Pages**
2. Source: เลือก **GitHub Actions**
3. กด Save

### ขั้นตอนที่ 4 — Deploy

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

รอ ~2 นาที → เข้าใช้งานได้ที่ https://tsat4pd3-sketch.github.io/JIGMTN/

---

## วิธีใช้งาน (ทีมงาน)

- เปิด URL บน Browser (PC หรือมือถือ)
- เลือก JIG → กรอกข้อมูล PM → กด **บันทึก**
- ข้อมูลเก็บใน GitHub Issues (shared ทั้งทีม)
- กด **🖨 Print / PDF** เพื่อพิมพ์ใบ PM

---

## โครงสร้างข้อมูล

ข้อมูล PM แต่ละรายการเก็บเป็น GitHub Issue:
- Label: `pm-record`
- Title: `{JIG ID} | {วันที่} | {ผู้ตรวจ}`
- Body: JSON ของ record ทั้งหมด

---

## พัฒนาใน local (สำหรับ IT)

```bash
npm install
cp .env.example .env.local
# แก้ไข VITE_GITHUB_TOKEN ใน .env.local
npm run dev
```
