# POLARIS: Master Application Flow & Role Operation Specification
**Problem Statement ID:** SIH26062 (PS 26062)  
**Title:** Integrated Polar Expedition Logistics and Asset Management System  
**Organization:** Ministry of Earth Sciences (MoES) / National Centre for Polar and Ocean Research (NCPOR)  
**Platform:** POLARIS (Polar Expedition Mission Control & Logistics Platform)

---

## 1. Executive Summary & Problem Statement Alignment

### What is the Problem Statement (PS 26062)?
The **National Centre for Polar and Ocean Research (NCPOR)** conducts high-stakes scientific expeditions to the polar regions:
- **Antarctica:** Bharati Station, Maitri Station, Dakshin Gangotri Ice Shelf, Amery Ice Shelf.
- **Arctic:** Himadri Station (Ny-Ålesund, Svalbard).
- **Southern Ocean:** Research Vessels (e.g., ORV Sagar Kanya, chartered icebreakers).

### The Reality of Polar Expeditions
1. **Life-or-Death Isolation:** Antarctic stations are cut off from the rest of the planet for **8 to 9 months during polar winter** (March to November). Sea ice closes in, temperatures plunge below -60°C, and blizzards reach 150+ km/h. Running out of Arctic-grade High Speed Diesel (HSD), Aviation Turbine Fuel (ATF), generator spares, or surgical supplies is fatal.
2. **Fragmented Multimodal Logistics:** Cargo moves across 4 to 6 hops:
   `NCPOR HQ (Goa)` ➔ `Gateway Port (Mumbai/Cape Town)` ➔ `Chartered Icebreaker Voyage` ➔ `Fast Ice Shelf Docking` ➔ `Helicopter Sling / PistenBully Sledge Convoy` ➔ `Station Bunker/Storage`.
   A single lost container or damaged cold-chain biological core aborts a year of national research.
3. **Severe Environmental Hazards:** Crevasses, whiteouts, and sudden storms risk lives. Field parties venturing out without automated dead-man timers, geofence checks, and rapid SOS muster systems face mortal peril.

POLARIS is **not a generic inventory tool**. It is an integrated, real-time **Mission Control, Multimodal Logistics, Life-Support Inventory Forecasting, Telematics Asset Health, and Emergency Incident Operations System**.

---

## 2. Global Unified Data Architecture

Every subsystem in POLARIS shares a connected data pipeline:

```
                      ┌───────────────────────────┐
                      │    EXPEDITION PLANNING    │
                      │  (Mission, Dates, Station)│
                      └─────────────┬─────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   REQUIREMENTS   │       │PERSONNEL ROSTERS │       │   ASSET FLEET    │
│(Readiness Matrix)│       │ (Field Check-in) │       │(Health, Hours,   │
└────────┬─────────┘       └────────┬─────────┘       │  Telematics)     │
         │                          │                 └────────┬─────────┘
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐                │
│CARGO SUPPLY CHAIN│       │  GEOFENCE & SOS  │                │
│ (Node Pipeline,  │       │(Dead-Man Timers, │                │
│  Shipment/Track) │       │ Live Coordinates)│                │
└────────┬─────────┘       └────────┬─────────┘                │
         │                          │                          │
         ▼                          ▼                          ▼
┌──────────────────┐       ┌─────────────────────────────────────┐
│STATION INVENTORY │       │     EMERGENCY INCIDENT COMMAND      │
│(Stock, Runout    │◄──────┤ (Auto Roll-Call, Proximity Assets,  │
│ Days, Transfers) │       │  Responders, Timeline, Resolution)  │
└──────────────────┘       └─────────────────────────────────────┘
```

---

## 3. Detailed Role-by-Role Specification & Workflows

POLARIS implements a 7-tier strict Role-Based Access Control (RBAC) architecture enforced at 3 levels:
1. **API Middleware:** `requireRoles(...)` checks on every route.
2. **Client Route Guards:** `<Protected roles={[...]}>` with redirect to `/command`.
3. **UI Adaptive Rendering:** Role-tailored dashboards and action gating.

---

### 3.1 Role 1: Super Admin (MoES / NCPOR Headquarters Command)

#### Persona & Scope
Highest authority (e.g., Director NCPOR, MoES IT Chief). Manages user identities, global settings, stations, and oversees all polar expeditions across Arctic, Antarctic, and Ocean missions.

#### Primary Flow & Use Cases:
1. **User & Identity Governance (`/users`):**
   - Create accounts for Expedition Commanders, Logistics Officers, Station Engineers, and Medical/Safety Officers.
   - Assign roles, stations, and active/inactive status.
   - Enforces password strength, session expiration, and identity audit.
2. **Master Station & Location Provisioning (`/locations`):**
   - Register new polar facilities: Permanent Stations (Maitri, Bharati), Field Camps (Camp A, Convoy Staging), Ice Shelf Drops, or Vessel Hubs.
   - Configure coordinates (lat/lng), next scheduled resupply date (critical driver for inventory runout risk), and environmental constraints.
3. **Global Audit Trail (`/audit-logs`):**
   - Inspect immutable audit records: user actions, timestamp, IP address, changed entities, and security exceptions.
4. **Global Analytics & Strategic Oversight (`/analytics`, `/reports`):**
   - Cross-station consumption trends, multimodal cargo throughput, total assets health index, and expedition budget vs execution status.

---

### 3.2 Role 2: Expedition Manager (Station Commander / Mission Leader)

#### Persona & Scope
Mission commander on-site or leading an operational season (e.g., 44th Indian Antarctic Expedition). Responsible for mission success, life safety, resource quotas, and multi-team synchronization.

#### Primary Flow & Use Cases:
1. **Expedition Lifecycle Management (`/expeditions`):**
   - Define new expedition: Mission Code (e.g., `44-IAE`), Year, Season, Target Station(s), Start Date, End Date, Budget, and Operational Goal.
   - State Machine: `Planning` ➔ `Active` ➔ `Completed` (locked against further modifications).
2. **Expedition Requirements Matrix (`/expeditions/:id` -> Requirements Tab):**
   - Define exact quotas: Fuel (Liters), Rations (Kg), Medical Kits (Units), Spare Parts, Science Instruments.
   - Live Readiness Calculation:
     $$\text{Readiness \%} = \frac{\text{Received + In-Transit Quantity}}{\text{Required Quantity}} \times 100$$
   - Instant visual flags for mission readiness before approving departure.
3. **Resource & Team Roster Overview:**
   - Review assigned scientists, engineers, logistics crew, and medical officers.
   - Monitor operational health: active emergency incidents, alerts, and overdue milestones.
4. **Formal Mission Reporting (`/reports`):**
   - Generate official comprehensive expedition summary (PDF-ready printable report) with personnel logs, inventory balances, and cargo manifests.

---

### 3.3 Role 3: Logistics Officer (Supply Chain & Port Hub Master)

#### Persona & Scope
Station logistics head or Cape Town / Goa supply chain coordinator. Ensures goods transition safely across ports, icebreakers, and sledge convoys without loss or cold-chain disruption.

#### Primary Flow & Use Cases:
1. **Cargo Consignment Registration (`/cargo` -> New Consignment):**
   - Record shipment metadata: Tracking #, Origin Station (e.g., `Headquarters_Goa`), Destination (e.g., `Maitri`), Weight (kg), Volume (m³), Priority (`Critical`, `Standard`, `Low`), Hazmat classification.
   - Itemized manifest: item name, SKU, quantity, unit, storage temperature requirement.
2. **Multi-Hop Node Pipeline Tracking (`/cargo` -> Advance Stage):**
   - Move cargo through standardized polar transit nodes:
     `Registered` ➔ `Port Staged` ➔ `Vessel Loaded` ➔ `Ice Shelf Dispatched` ➔ `Delivered Station`.
   - Update current waypoint, ETA, carrier vessel/vehicle details, and weather delay notes.
   - System records timestamped, append-only `CargoEvent` audit history.
3. **Delay & Exception Management (`/command` -> Cargo Dashboard):**
   - Monitor ETA-slip warnings and weather alerts (e.g., blizzard halting sledge convoy).
   - Flag shipments as `DelayedWeather` to automatically alert the Expedition Commander and Station Engineer.
4. **Station Receipt to Inventory Handshake (`/cargo` -> Receive Modal):**
   - When cargo reaches its polar station bunker, the Logistics Officer (or Inventory Officer) marks it `Received`.
   - **Critical Automation:** With one click, items unpack directly into the station's live `Inventory` collection, incrementing stock and creating an `InventoryTransaction` of type `Receipt`.

---

### 3.4 Role 4: Inventory Officer (Station Engineer / Supply Custodian)

#### Persona & Scope
Maintains life-support supplies at Bharati, Maitri, or Himadri. Responsible for heat, power, food rations, and medical inventory to guarantee survival through the 8-month winter blackout.

#### Primary Flow & Use Cases:
1. **Live Stock Ledger (`/inventory`):**
   - Track inventory across 4 survival categories:
     - **Fuel:** Jet A-1 / ATF, Arctic Diesel, Generator Lube Oils.
     - **Food:** Freeze-dried rations, flour, rice, canned meat, greenhouse produce.
     - **Medical:** Oxygen cylinders, antibiotics, IV plasma, hypothermia kits.
     - **Spares & Technical:** Generator fuel filters, RO water filters, heating elements.
2. **Consumption Logging (`/inventory` -> Log Consumption):**
   - Record daily or batch burn rates: Item, Station, Quantity consumed, Purpose (e.g., "Main GenSet #2 24hr run").
   - Automatically decrements stock, records transaction log, and updates average daily consumption rate.
3. **Automated Depletion & Runout Forecasting:**
   - System calculates:
     $$\text{Days of Supply Remaining} = \frac{\text{Current Stock}}{\text{Average Daily Burn Rate}}$$
   - Evaluates remaining days against the **Station Next Resupply Date**:
     - **SAFE (Green):** Days of supply exceed resupply date + 30-day safety reserve.
     - **RISK (Red/Orange):** Stock will deplete BEFORE the next ship docks. Triggers automated high-priority alert on Mission Command.
4. **Inter-Station & Bunker Transfers (`/inventory` -> Transfer Modal):**
   - Transfer supplies between bunkers (e.g., Main Station ➔ Field Camp A refuge).
   - Atomic transaction ensures source stock is decremented and destination stock is incremented with full traceability.

---

### 3.5 Role 5: Personnel Officer (Safety & Field Deployment Coordinator)

#### Persona & Scope
Oversees team assignments, medical clearances, and physical deployment of scientists, technicians, and field parties across harsh Antarctic terrain.

#### Primary Flow & Use Cases:
1. **Personnel Roster Management (`/personnel`):**
   - Profile details: Full Name, Role, Specialization (Glaciology, Meteorology, Diesel Tech, Doctor), Medical Clearance Status, Survival Training Expiry, Blood Group, Emergency Contact.
2. **Deployment & Location Check-In (`/personnel` -> Deploy / Check-in):**
   - Assign member to Station, Field Camp, Sledge Traverse, or Vessel.
   - Records current location, status (`Active`, `In-Transit`, `Medical-Rest`, `Emergency`), and GPS coordinates.
3. **Movement History & Audit Log:**
   - Every station hop creates a permanent `PersonnelMovement` record for search and rescue traceability.

---

### 3.6 Role 6: Asset & Maintenance Officer (Chief Mechanical Engineer)

#### Persona & Scope
Maintains all machinery, vehicles, generators, and scientific sensors in freezing conditions where engine oil congeals and metal becomes brittle.

#### Primary Flow & Use Cases:
1. **Asset Registry & Condition Monitoring (`/assets`):**
   - Register machinery: PistenBully 300 Polar Snowcat, Skidoo snowmobiles, Caterpillar 250kVA generators, satellite dishes, weather LIDAR.
   - Status: `Operational`, `Maintenance Due`, `Degraded`, `Decommissioned`.
2. **Operating Hours & Telemetry Tracking:**
   - Update engine hours, battery voltage, temperature telemetry.
3. **Preventive Maintenance Logs (`/assets` -> Log Service):**
   - Record oil changes, heater replacement, track maintenance.
   - Automated threshold warnings when operating hours approach scheduled overhaul intervals.

---

### 3.7 Role 7: Emergency / Operations Officer (Incident Commander & Search & Rescue)

#### Persona & Scope
Station safety chief or designated SAR commander. When a blizzard strikes, someone goes missing, or a generator catches fire, this role takes control of the Mission Control incident room.

#### Primary Flow & Use Cases:
1. **Emergency Incident Declaration (`/incidents` -> Report Incident):**
   - Incident Types: `Medical Emergency`, `Missing Personnel / Whiteout`, `Equipment / Life-Support Failure`, `Crevasse Breach`, `Fire / Structural`.
   - Severity: `Critical`, `Major`, `Minor`.
   - Location: Target Station or Field Camp.
2. **Instant Automated Station Roll-Call:**
   - The moment an incident is declared at a location, POLARIS queries all personnel whose `currentLocation` matches the incident site.
   - Displays real-time headcount: total personnel on site, accounted for, and deployed in field.
3. **Proximity Asset Identification:**
   - System instantly filters all operational assets stationed at that location (e.g., Snowmobiles, Heated Sledges, Portable Medical Oxygen).
4. **Responder Assignment & Action Timeline (`/incidents/:id` Command View):**
   - Mobilize specific responders (e.g., Doctor, SAR Guide).
   - Log chronological actions with timestamps: "Search party dispatched via Snowcat #1", "Contact re-established", "Hypothermia treatment initiated".
5. **Mandatory Resolution Workflow:**
   - System strictly enforces PRD business rule: **An incident cannot be marked `Resolved` or `Closed` without entering a detailed Resolution Summary.**

---

## 4. Smart Automation & Background Anomaly Engine

POLARIS runs an autonomous 60-second evaluation engine (`automation.js`):

```
┌──────────────────────────────────────────────────────────────┐
│                AUTONOMOUS EVALUATION LOOP                    │
├──────────────────────────────┬───────────────────────────────┤
│ 1. Dead-Man Switch           │ Field member check-in overdue │
│    Timeout Monitor           │ > threshold ➔ High-risk alert  │
├──────────────────────────────┼───────────────────────────────┤
│ 2. Geofence Boundary         │ Coordinates outside safe zone │
│    Breach Detection          │ or in Crevasse Field ➔ SOS   │
├──────────────────────────────┼───────────────────────────────┤
│ 3. Inventory Depletion       │ Stock runout days < resupply  │
│    Forecast Check            │ date ➔ Low Stock Alert        │
├──────────────────────────────┼───────────────────────────────┤
│ 4. Cargo ETA-Slip            │ Current time > ETA + 24h &    │
│    Detection                 │ not delivered ➔ Delay Alert   │
├──────────────────────────────┼───────────────────────────────┤
│ 5. Asset Service Warning     │ Operating hours > service     │
│                              │ threshold ➔ Maintenance Alert │
└──────────────────────────────┴───────────────────────────────┘
```
Alerts are broadcast over **WebSocket (`socket.io`)** in real-time, flashing red on the command header and notifying all active stations.

---

## 5. End-to-End Master Demonstration Scenario (The Judge Flow)

This 5-minute turnkey flow demonstrates the complete integrated power of POLARIS:

```
[1. Super Admin]
    Login 'admin' ➔ View 8 Mission KPIs ➔ Open 'Team & Roles' ➔ Show 7 distinct PRD roles.
       ↓
[2. Expedition Planning]
    Switch to 'commander' ➔ 44th Antarctic Expedition ➔ View Requirements (Fuel/Food 85% ready).
       ↓
[3. Logistics Pipeline]
    Switch to 'logistics' ➔ Advance ATF Cargo consignment from Cape Town to Ice Shelf ➔
    Receive at Maitri Bunker ➔ Auto-unpacks into Inventory!
       ↓
[4. Inventory Runout Forecast]
    Switch to 'inventory' ➔ Show stock incremented ➔ Log 500L consumption ➔
    Show real-time Runout Days recalculated against Resupply Date.
       ↓
[5. Personnel & Field Safety]
    Check in field research team at 'Field Camp A' ➔ View live Polar Map.
       ↓
[6. Emergency SOS Command]
    Switch to 'emergency' (Emergency Officer) ➔ Trigger Incident at 'Field Camp A' ➔
    Auto Roll-Call renders instantly ➔ Mobilize Snowcat & Medics ➔ Add Timeline Action ➔
    Resolve with summary.
       ↓
[7. Formal Report]
    Export print-ready Official Polar Expedition Mission Briefing.
```

---

## 6. Verification & Acceptance Criteria
- All 18 MongoDB data models operate with zero hardcoded values.
- Real-time WebSockets push alerts across active browser sessions.
- Clean, responsive UI with polar-themed dark mode, interactive maps, and role-based views.
- 45+ automated smoke tests verifying 100% route integrity.
