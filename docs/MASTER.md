# POLARIS — MASTER DOC
**Problem Statement ID: 26062 | MoES / NCPOR | Theme: Smart Automation**
**Title: Integrated Polar Expedition Logistics & Asset Management System**

> Single source of truth. Ye file 5 docs (01-05) ka condensed master hai.

---

## 1. Real-Life Problem (Simple me)

India ke scientists Antarctica (Maitri, Bharati) / Arctic (Himadri) months tak rehte hain.
Unko pehle se bhejna padta hai: Food, Fuel, Medicine, Equipment, Vehicles, Spares, Clothes.

Problem: Ye sab Excel sheets, paper forms, satellite email me bikhra hai.
- Saman kahan hai? Pata nahi.
- Station par kitna stock bacha? Pata nahi.
- Kaun banda kahan hai? Pata nahi.
- Emergency aayi to coordinate kaise kare?
- Winter me 8-9 mahine koi ship/plane nahi aayegi. Fuel/khana khatam = death.

**Requirement ek line me:**
> NCPOR ko ek centralized web platform chahiye jo planning se lekar cargo, inventory, people aur emergency tak sab ek jagah manage kare.

Isko **"Antarctica Expedition ERP"** samjho.

---

## 2. Core 5 Modules (Official Requirement — Compulsory)

### 1️⃣ Expedition Planning
Expedition create karo: Code (ANT-2027 / 44-IAE), Destination (Maitri/Bharati/Himadri), Dates, Team size, Required resources.
Example: 35 people, 120 items, 800kg food, 5000L fuel, 150 medicines, 4 vehicles.

### 2️⃣ Cargo Tracking
India se Antarctica bheje gaye containers kahan hain?
Flow: `NCPOR Goa → Port (Mumbai/Cape Town) → Ship → Ice Shelf → Station`
Status: `Staged / InTransit / DeliveredStation / DelayedWeather / Damaged`
Example: Container #003 — In Transit — Current: Ship — ETA: 18 Dec.

### 3️⃣ Inventory Management
Station par delivered saman ka stock + daily consumption.
Example: Food 800→600kg, Fuel 5000→4200L.
**Most important logic:** Low-stock alert.
`Days Remaining = Current Stock / Daily Consumption`
Agar `Days Remaining < Next Resupply tak ke din` → `CriticalDepletion` + Draft Resupply Manifest.

### 4️⃣ Personnel Movement
Kaun kahan hai: `Maitri (20) / Bharati (10) / Field (5)`
Check-in/out, Status: `StationHab / FieldResearch / InTransit / MedicalQuarantine / SOS_Alert`
Example: Dr. Rahul — Maitri → Field Camp A — On Field Research.

### 5️⃣ Emergency Response 🚨
Emergency report → affected people + nearby medical team/vehicle/kit → authorities ko notification → response coordinate.
Example: Medical Emergency, Field Camp A, 14:32, 6 people, Medical team: Available.

**Winning Flow (Judges ko ye dikhana hai):**
```
Planning → Cargo → Shipment → Station Arrival → Inventory → Consumption → Shortage Prediction → Resupply / Emergency
```

---

## 3. Smart 3 Extensions (SIH me jeetne ke liye — Docs ke 8 pillars pure karne ke liye)

CRUD se kaam nahi chalega. System ko **autonomously act** karna chahiye.

### 6️⃣ Asset Telematics
PistenBully, Generator, Drone, Spectrometer.
Condition: `Operational / Degraded / ScheduledMaintenance / EmergencyOffline`
Logic: `operatingHours >= maxHoursBeforeService - 25` → Maintenance Required + spares check.

### 7️⃣ Geofencing + Live Map
Leaflet polar map: stations, field parties, rovers, crevasse/ASPA danger polygons.
Rule: GPS packet danger polygon ke andar → instant `GEOFENCE_BREACH` alert.

### 8️⃣ Automation Engine (5 rules)
1. **Dead-Man Switch:** Field banda 45 min me ping/checkin na kare → `DEADMAN_TIMEOUT` Critical + last GPS + nearest refuge + siren.
2. **Geofence Breach:** upar wala rule.
3. **Depletion Forecaster:** `Stock / DailyRate` wala formula.
4. **Cargo ETA Slip:** Ship weather window (3-5 din) miss kare → `CARGO_ETA_SLIP` + Fuel/Medicine ko P1 Airlift.
5. **Predictive Maintenance:** hours wala rule.

**Demo Harness (Evaluation ke liye 3 buttons):**
- Simulate Crevasse Stray
- Simulate Dead-Man Timeout
- Drop Fuel Below 20%

---

## 4. Tech Stack (Final)

**Frontend — `client/`:**
- React 19 + Vite, React Router, Context API + Hooks
- Tailwind CSS (Tactical Dark Theme)
- Colors: Bg `#0B111E`, Cyan `#00E5FF`, Red `#FF3B30`, Green `#00E676`
- Lucide React icons
- Leaflet / React-Leaflet (polar map)
- Socket.IO client (live alerts)
- PWA + IndexedDB offline queue (satellite 128-512 kbps ke liye)

**Backend — `server/` (banana hai):**
- Node.js v18+ + Express.js REST `/api/v1`
- MongoDB + Mongoose
- Socket.IO server
- JWT + RBAC (SuperAdmin, StationCommander, LogisticsOfficer, InventoryManager, FieldScientist)
- Helmet, express-rate-limit, express-mongo-sanitize, CORS
- Node-cron / event loop for automation engine

**Roles:**
| Role | Access |
|---|---|
| SuperAdmin | Full |
| StationCommander | Station ops + emergency |
| LogisticsOfficer | Cargo/shipments |
| InventoryManager | Stock/maintenance |
| FieldScientist | Self profile + checkin + SOS |

---

## 5. Architecture (Short)

```
React 19 SPA (Tactical Dashboard + Field PWA)
   │ REST + WebSocket
   ▼
Express Gateway (JWT/RBAC, Helmet, Rate-limit, IDOR guard)
   ▼
Node Core: Expedition | Personnel | Cargo | Inventory | Asset | Geo | Emergency | Automation
   │ Event Dispatch (cron loop)
   ▼
MongoDB: users, expeditions, personnel, cargos, inventories, assets, alerts, geotracks, maintenancelogs
```

Sync strategy: Lean JSON, `updatedAt` delta-sync, offline queue flush on uplink.

---

## 6. Database (Important Fields Only)

- **users:** username, email, passwordHash(bcrypt12), role, station(Bharati/Maitri/Himadri/Goa), bloodGroup, emergencyContact
- **expeditions:** expeditionCode(44-IAE), title, targetStation, season, dates, leaderId, status(Planning/InTransit/ActiveOnStation/Completed), quotas
- **personnel:** expeditionId, userId, badgeId, currentStatus, assignedFieldZone, lastCheckIn, expectedReturn, currentCoordinates{lat,lng,alt,lastPing}, vitals{hr,temp,battery}
- **cargos:** trackingNumber(CRG-2027-BHR-012), expeditionId, category, weightKg, isHazmat, currentNode(Goa/Mumbai/CapeTown/Vessel/IceShelf/Bharati/Maitri), transportMode, status, eta, items[]
- **inventories:** station, category(Fuel/Food/Medical/Oxygen/RO_Water/Spares), itemName, currentStock, unit, minimumSafeThreshold, criticalEmergencyThreshold, dailyConsumptionRate, daysRemainingCalculated, status(Optimal/Warning/CriticalDepletion/Exhausted)
- **assets:** assetTag(AST-GEN-04), station, name, type, condition, operatingHours, maxHoursBeforeService, telemetry{engineTemp,vibration,fuelLevel,oilPressure}
- **alerts:** expeditionId, type(DEADMAN/GEOFENCE/STOCK_DEPLETION/ETA_SLIP/EQUIPMENT_FAULT/SOS), severity(INFO/WARNING/CRITICAL/DISASTER), title, message, sourceEntity/Id, coordinates, isAcknowledged

---

## 7. API Routes (`/api/v1`)

- **auth:** `POST /login`, `GET /me`, `POST /register` (Admin)
- **expeditions:** `GET /`, `POST /`, `GET /:id`, `PATCH /:id`
- **personnel:** `GET /`, `POST /checkin`, `POST /telemetry`, `GET /active-locations`
- **cargo:** `GET /`, `POST /`, `PATCH /:id/stage`, `GET /track/:trackingNumber`
- **inventory:** `GET /`, `POST /`, `PATCH /:id/consume`, `GET /forecast`
- **assets:** `GET /`, `POST /`, `PATCH /:id/telemetry`, `POST /:id/maintenance`
- **alerts:** `GET /active`, `POST /sos`, `PATCH /:id/acknowledge`, `POST /simulate-telemetry`

---

## 8. Kya NAHI Banana ❌

Hardware, satellite, drone, robot, weather AI, ML compulsory nahi. Language prescribed nahi. Sirf web platform kaafi hai.

---

## 9. Roadmap

- **P1:** `server/` setup, Mongoose models, seed data (Bharati/Maitri, 44-IAE, vehicles, fuel, scientists)
- **P2:** JWT/RBAC + CRUD + state machines (cargo nodes, checkin, consume, telemetry)
- **P3:** Automation loop + Socket.IO live alerts
- **P4:** React Tactical Dashboard (Overview, Cargo timeline, Inventory gauges, Asset health, Personnel roster)
- **P5:** Polar Map + live markers + danger polygons + dispatch overlay
- **P6:** Simulation bar + siren + role switcher (Commander/Logistics/Field view)

---

## 10. Current Repo Status

- `docs/01-05` — detailed specs (done)
- `client/` — Vite+React19 scaffold only, Tailwind/Router/Leaflet/Socket abhi add karna hai
- `server/` — built + verified (29/29 smoke tests pass). Run: `cd server; if ($?) { npm install }; if ($?) { npm start }` (:5000, admin / Test@123)
- Root `package.json` — placeholder

**Next:** Client — Tactical Command Dashboard.
