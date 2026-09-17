# POLARIS: Integrated Polar Expedition Logistics & Asset Management System
**Problem Statement ID:** 26062 | **Organization:** Ministry of Earth Sciences (MoES) / NCPOR | **Theme:** Smart Automation

---

## 1. Executive Summary & Problem Context
The **National Centre for Polar and Ocean Research (NCPOR)** conducts annual scientific expeditions to Antarctica (Bharati, Maitri stations), the Arctic (Himadri station), and Southern Ocean cruises. 

### Current Operational Pain Points:
1. **Fragmented Tracking:** Personnel rosters, cargo manifests, scientific gear, food, fuel, and medical reserves are scattered across disparate Excel sheets, customs paper forms, and satellite emails.
2. **Extreme Environment Risk:** Antarctica poses blizzards, crevasses, sub-zero temperatures down to -60°C, and whiteouts. Personnel movement tracking without automated dead-man switches or geofencing can be fatal.
3. **Logistics Fragility:** Transport spans 4+ nodes (e.g., Goa HQ -> Mumbai Port -> Cape Town staging -> Icebreaker vessel -> Shelf ice transfer -> Polar station). Delayed cargo or lost mission-critical parts aborts a year-long research cycle.
4. **Isolated Station Survival (Life Support Logistics):** Stations are physically cut off for 8-9 months during polar winter. Running out of aviation turbine fuel (ATF), generator spares, or life-saving antibiotics is catastrophic.

---

## 2. Core Functional Modules (The 8 Pillars)

```
                       POLARIS COMMAND PLATFORM
                                  │
    ┌─────────────┬───────────────┼───────────────┬─────────────┐
    ▼             ▼               ▼               ▼             ▼
1. Expedition  2. Personnel    3. Cargo &      4. Polar Station  5. Emergency
   Planning       Movement        Multimodal      Inventory &       & SOS
   & Rosters      & Safety        Tracking        Life Support      Response
                                       │
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
                 6. Smart Asset               7. Autonomous
                    Lifecycle &                  Automation &
                    Telematics                   Alert Engine
```

### Module 1: Expedition Planning & Governance
- Multi-year mission definitions (e.g., *44th Indian Antarctic Expedition - 44-IAE*).
- Station assignments: **Bharati**, **Maitri**, **Himadri (Svalbard)**, **Dakshin Gangotri ice shelf**, or **Research Vessel Sagar Kanya / Polar Icebreaker**.
- Resource budget allocation (payload capacity, fuel quota, personnel headcount).
- Multi-stage approval workflow (NCPOR Director, Expedition Leader, Logistics Officer).

### Module 2: Personnel Management, Health & Geo-Safety
- Identity, medical clearance, polar survival certification records, blood group, emergency contacts.
- Team allocations (Geology, Meteorology, Biology, Glaciology, Logistics, Medical).
- Daily check-in / check-out from station habitat into the field.
- Automated Dead-Man's Switch: If a field team does not ping or check in within their designated window (e.g., 60 mins), automatic escalation triggers.

### Module 3: Multimodal Cargo & Supply Chain Tracking
- 4-Tier Cargo Hierarchy: `Shipment Manifest` -> `Container` -> `Crate/Palette` -> `Item`.
- Waypoint tracking across hops:
  `NCPOR Goa` ➔ `Gateway Port (Mumbai/Cape Town)` ➔ `Vessel Voyage` ➔ `Ice Shelf Unloading` ➔ `Helicopter/PistenBully Sledge Transfer` ➔ `Station Storage Bunker`.
- QR / RFID generation for cargo labels.
- Customs document & hazmat (dangerous goods, lithium batteries, radioactive tracers) compliance.

### Module 4: Asset Management & Telematics (Heavy Machinery to Micro-Sensors)
- Machinery tracking: PistenBully snowcats, Skidoos, Cranes, Diesel Generators, Helo fuel pumps, satellite dishes, Spectrometers, LIDAR, Drones.
- Condition states: `Operational`, `Degraded`, `Under Maintenance`, `Decommissioned`, `Mothballed (Winter)`.
- Maintenance logs with operating hours tracking & predictive engine service warnings.

### Module 5: Station Inventory & Life Support Monitoring
- Critical consumables categories:
  - **Fuel:** Jet A-1 / ATF, High-speed diesel (Arctic Grade), Lubes.
  - **Food Supplies:** Freeze-dried rations, grains, canned goods, fresh greenhouse yields.
  - **Medical & Trauma:** Oxygen cylinders, plasma, antibiotics, surgical kits, frostbite remedies.
  - **Water & Power:** RO plant consumables, heating coils, generator filter kits.
- Dynamic stock level tracking with automated minimum threshold warnings and replenishment lead-time estimation.

### Module 6: Live Geospatial Tracking & Geofencing
- Polar stereographic / Leaflet map dashboard displaying:
  - Station bases, survival refuges/huts, fuel depots.
  - Field parties & rover vehicles.
  - High-risk zones (Crevasse fields, calving ice shelves, restricted environmental sanctuaries - ASPA/ASMA Antarctic Specially Protected Areas).
- Dynamic Geofence violation detection.

### Module 7: Smart Automation & Anomaly Engine
- Real-time rule execution on telemetry & transactions:
  - **Inventory Anomaly:** Critical supply falls below 30-day polar survival reserve.
  - **Cargo Anomaly:** ETA slip exceeds critical weather window for shelf docking.
  - **Personnel Safety Anomaly:** GPS signal blackout > configured safety threshold.
  - **Cold Chain Failure:** Cryo-cooler temperature excursion for biological ice core samples.

### Module 8: Emergency Response & Mission Control SOS
- One-click SOS dispatch system with automated incident triage.
- Instant coordinates extraction, nearest refuge hut proximity calculation, snowmobile dispatch routing.
- Real-time incident logs, medical evacuation (MEDEVAC) air-bridge protocol checklists.

---

## 3. User Personas & RBAC Architecture

| Role | Responsibility | Scope of Access |
|---|---|---|
| **MoES / NCPOR Super Admin** | Central governance, multi-expedition oversight, policy | Full system read/write |
| **Expedition Leader (Station Commander)** | On-site command at Bharati/Maitri, team safety, daily approvals | Station-wide operations, emergency triggers |
| **Logistics & Cargo Officer** | Supply chain, ports, customs, vessel lading, warehouse manifests | Cargo, shipments, asset transfers |
| **Station Engineer / Inventory Manager** | Fuel, food, generator maintenance, spare parts | Inventory stock, maintenance schedules |
| **Field Scientist / Team Member** | Field check-in, sample tracking, personal SOS beacon | Personal profile, assigned tasks, SOS |

---

## 4. Key Success Metrics for Smart India Hackathon (SIH)
1. **Not just a CRUD app:** Must showcase autonomous backend automation (Cron/event-driven alerts, predictive depletion, geofence alerts).
2. **Extreme-environment considerations:** Offline-capable design (Antarctica satellite link is high-latency, 128-512 kbps, intermittent outages).
3. **Mission-critical UX:** High-contrast Dark Tactical Command theme with instant visibility into red alerts and critical telemetry.
