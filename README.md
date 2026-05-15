# PM JIG-FIXTURE Planner & Inspection — Thai Summit Automotive

โปรแกรมสำหรับให้ **วิศวกรวางแผน PM JIG-FIXTURE** และให้ **ช่างเทคนิคตรวจสอบตามแผน** พร้อมบันทึกผลตรวจลงฐานข้อมูลแบบ SQL ผ่าน REST API

## ความสามารถหลัก

| Area | รายละเอียด |
|---|---|
| JIG/FIXTURE Config | Supervisor เพิ่ม/แก้ไข/ลบ JIG, section, point of checking, standard type, range, dimension และ diameter |
| PM Planning | วิศวกร/หัวหน้างานสร้างแผน PM ตาม JIG, due date, frequency, priority และมอบหมายช่าง |
| Technician Execution | ช่างเห็นงานที่ถูกมอบหมาย กดเริ่มตรวจจากแผน และบันทึกผลวัด/OK-NG ตาม checkpoint |
| SQL-ready Storage | รองรับ `VITE_SQL_API_URL` เพื่อบันทึก `pm_plans`, `pm_records`, `pm_record_items` ใน SQL backend |
| Auto Next Plan | เมื่อปิดงานตามแผน ระบบสร้างแผนรอบถัดไปตาม frequency อัตโนมัติ |
| Dashboard & History | ดู KPI, NG ล่าสุด, problem jigs และประวัติการตรวจ |
| Calibration & Admin | ทะเบียนเครื่องมือวัด, จัดการ user roster และสิทธิ์ role |
| Offline/Demo Fallback | หากยังไม่มี SQL API ระบบยังรันเดโมได้ด้วย GitHub Issues/localStorage |

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173

### Demo accounts

| EMP | PIN | Role | ใช้งาน |
|---|---|---|---|
| TECH-04821 | 1234 | technician | ตรวจ PM ตามแผน |
| ENG-001 | 2468 | engineer | สร้างแผน PM |
| SUP-001 | 9999 | supervisor | Dashboard + planning |
| ADM-001 | 0000 | admin | เห็นทุกเมนู |

## SQL backend configuration

Frontend ไม่ควรต่อ database โดยตรง ให้ตั้งค่า REST API ที่เขียนข้อมูลลง SQL:

```env
VITE_SQL_API_URL=https://pm-jig-api.example.com/api
VITE_SQL_API_KEY=replace-with-api-token
```

API contract ที่ frontend เรียกใช้:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | ตรวจว่า SQL API พร้อมใช้งาน |
| `GET` | `/jig-fixtures` | โหลด master JIG/FIXTURE + check sheet config |
| `PUT` | `/jig-fixtures/:jigId` | เพิ่ม/แก้ไข JIG, section, point of checking และ standard |
| `DELETE` | `/jig-fixtures/:jigId` | ปิดใช้งาน/ลบ JIG config |
| `GET` | `/pm-plans` | โหลดแผน PM ทั้งหมด |
| `POST` | `/pm-plans` | สร้างแผน PM |
| `PUT` | `/pm-plans/:planId` | อัปเดตสถานะแผน เช่น `in_progress` |
| `POST` | `/pm-plans/:planId/complete` | ปิดแผนเดิมและสร้างแผนรอบถัดไป |
| `GET` | `/pm-records` | โหลดผลตรวจ |
| `POST` | `/pm-records` | บันทึกผลตรวจ PM |
| `PUT` | `/pm-records/:recordId` | แก้ไขผลตรวจ |
| `DELETE` | `/pm-records/:recordId` | ลบ/ยกเลิกผลตรวจ |

ดู schema เริ่มต้นได้ที่ [`sql/schema.sql`](sql/schema.sql)

> Merge note: README intentionally keeps the SQL backend contract and JIG/FIXTURE configuration contract in one section to avoid split conflict blocks during PR merges.

## Architecture

```
src/
├── main.jsx                  entry
├── Root.jsx                  top-level router + plan/record workflow
├── PMPlanningScreen.jsx      engineer planning board
├── JigConfigScreen.jsx       supervisor JIG/FIXTURE + check-point master
├── jigConfig.js              check-sheet config helpers
├── pmPlan.js                 PM plan date/status helpers
├── App.jsx                   JIG data definitions + legacy print helpers
├── auth.js                   PIN login + roster + RBAC roles
├── db.js                     SQL API gateway with GitHub/localStorage fallback
├── offline.js                offline queue + sync drain
├── MobileHome.jsx            technician home + assigned PM plans
├── MobileForm.jsx            inspection execution form
├── DashboardScreen.jsx       supervisor/engineer analytics
├── CalibrationScreen.jsx     calibration register
├── AdminScreen.jsx           user roster CRUD
└── theme.css                 industrial hi-vis theme
```

## Production checklist

- [ ] Implement REST API backed by PostgreSQL / MS SQL using `sql/schema.sql`
- [ ] Map existing `App.jsx` JIG check sheet definitions into `jig_fixtures`, `jig_check_sections`, and `jig_check_points`
- [ ] Hash PINs or replace local roster with LDAP / Active Directory federation
- [ ] Move offline queue from localStorage to IndexedDB + Service Worker
- [ ] Add immutable audit trail for IATF 16949 traceability
- [ ] Add QR/barcode scan to open JIG/plan directly
- [ ] Deploy tablets via MDM and lock down environment variables

## License

Internal — Thai Summit Automotive Co., Ltd.
