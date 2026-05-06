# PM JIG v2 — Thai Summit Automotive

Production-ready upgrade of the PM JIG inspection system. Bilingual TH/EN, mobile-friendly, offline-first.

## What's new in v2

| Area | v1 | v2 |
|---|---|---|
| **Auth** | None — anyone could submit | PIN login, three roles (inspector / supervisor / admin) |
| **Dashboard** | None | Supervisor analytics — KPIs, trend, problem jigs, inspector leaderboard |
| **Calibration** | None | Tool calibration register with overdue/due/valid status |
| **Admin** | None | User roster CRUD + system controls |
| **Offline** | Best-effort | Real queue + status indicator + drain on reconnect |
| **Branding** | Generic dark | Industrial hi-vis (orange/black, ANSI-style) |

## Quick start

```bash
npm install
cp .env.example .env   # then edit — paste GitHub token
npm run dev
```

Open http://localhost:5173

### Demo accounts

| EMP | PIN | Role |
|---|---|---|
| EMP-04821 | 1234 | Inspector |
| SUP-001 | 9999 | Supervisor (sees Dashboard) |
| ADM-001 | 0000 | Admin (sees everything) |

## Architecture

```
src/
├── main.jsx              entry
├── Root.jsx              top-level router (login → app/dashboard/cal/admin)
├── App.jsx               PM JIG main app (home, form, history) — ported from v1
├── auth.js               PIN login + roster + RBAC
├── offline.js            offline queue + sync drain
├── db.js                 GitHub Issues backend
├── theme.css             industrial hi-vis tokens
├── diagrams.js           jig engineering drawings (data URLs)
├── LoginScreen.jsx
├── DashboardScreen.jsx   supervisor analytics
├── CalibrationScreen.jsx tool calibration register
├── AdminScreen.jsx       user roster CRUD
└── OfflineIndicator.jsx  floating status pill
```

## Deployment

GitHub Pages workflow lives in `.github/workflows/deploy.yml`. Push to `main` and it builds + deploys.

For factory tablets, install as a PWA (Add to Home Screen on Chrome / Edge).

## Roadmap to real production

This v2 is a strong staging-ready upgrade, but for a true shop-floor system you still need:

- [ ] Replace GitHub Issues backend with PostgreSQL / MS SQL + REST API
- [ ] Replace localStorage roster with LDAP / Active Directory federation
- [ ] Move offline queue to IndexedDB + Service Worker (larger quota, true PWA)
- [ ] Add IATF 16949 audit trail (immutable revision history)
- [ ] Integrate label printer for borrow slips (if extending to tool crib)
- [ ] Hardware barcode/QR scanner integration via `BarcodeDetector` API
- [ ] MDM (Mobile Device Management) for tablet rollout

## License

Internal — Thai Summit Automotive Co., Ltd.
