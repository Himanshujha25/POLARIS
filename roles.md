# POLARIS: Master Roles, Responsibilities & Operational Cases Specification
**Problem Statement ID:** SIH26062 (PS 26062)  
**Organization:** Ministry of Earth Sciences (MoES) / National Centre for Polar and Ocean Research (NCPOR)  
**Platform:** POLARIS (Polar Expedition Mission Control & Logistics System)

    ---

## Executive Summary of the RBAC Architecture

In a life-critical polar mission (where Antarctic stations are cut off from civilization for 8–9 months during the polar winter), responsibilities must be strictly segregated. A field scientist must not alter generator diesel fuel reserves, and a logistics officer cannot dismiss an active SAR emergency.

POLARIS enforces a **7-tier strict Role-Based Access Control (RBAC)** model implemented across 3 defense layers:
1. **API Middleware:** `requireRoles(...)` prevents unauthorized API calls (e.g. non-admin `POST /auth/register` returns `403 Forbidden`).
2. **Client Route Guards:** `<Protected roles={[...]}>` bounces unauthorized direct URL access back to `/command`.
3. **UI Adaptive Gating:** Navigation tabs, action buttons, and command dashboards dynamically tailor to the authenticated user's exact designation.

---

## Quick Reference: Role Credentials & Permissions Matrix

| # | Role Key | Default Username | Official Title | Scope / Station | Accessible Pages |
|---|---|---|---|---|---|
| **1** | `SuperAdmin` | `admin` | Director NCPOR / MoES IT Head | Central HQ (Goa) | **ALL 16 pages** (Full system access) |
| **2** | `ExpeditionManager` | `commander` | Dr. S. K. Sharma (Mission Leader) | Bharati / Maitri | Command, Expeditions, Map, Alerts, Locations, Cargo, Inventory, Personnel, Assets, Incidents, Reports, Analytics, Audit |
| **3** | `LogisticsOfficer` | `logistics` | Vikram Singh (Supply Chain Master) | Goa HQ / Cape Town Hub | Command, Expeditions, Polar Map, Locations, Cargo Manifests, Reports, Alerts |
| **4** | `InventoryOfficer` | `inventory` | Ananya Verma (Life Support Engineer) | Maitri Station | Command, Expeditions, Polar Map, Central Inventory, Reports, Alerts |
| **5** | `PersonnelOfficer` | `personnel` | Meera Nair (Field Safety Coordinator) | Bharati Station | Command, Expeditions, Polar Map, Personnel Roster, Reports, Alerts |
| **6** | `AssetOfficer` | `assets` | Tenzing Norbu (Chief Mechanical Eng.) | Maitri Station | Command, Expeditions, Polar Map, Station Assets, Reports, Alerts |
| **7** | `EmergencyOfficer` | `emergency` | Capt. R. Deshmukh (SAR Commander) | Maitri Station | Command, Expeditions, Polar Map, Emergency Incidents, Alerts & SOS, Reports |

*(Standard password for all accounts: `Test@123`)*

---

## Detailed Role Specifications & Operational Cases

---

### Role 1: Super Admin (MoES / NCPOR Central Headquarters)

#### 1. Identity & Scope
* **Real-World Persona:** Director of NCPOR, Goa or Ministry IT Governance Head.
* **Scope:** Highest executive authority across all Antarctic bases (Bharati, Maitri), Arctic station (Himadri), and Southern Ocean research vessels.

#### 2. Accessible Pages
* **All Platform Pages:** Command, Expeditions, Polar Map, Emergency, Alerts, Locations, Central Inventory, Cargo Manifests, Personnel Roster, Station Assets, Reports, Analytics, **Team & Roles**, **Audit Logs**, **Settings**.

#### 3. What They CAN & CANNOT Do
* **CAN:**
  * Provision and manage user credentials across all 7 roles (`/users`).
  * Activate or deactivate accounts, reset roles, and audit security events.
  * Register new polar stations, field refuges, and logistics waypoints (`/locations`).
  * Inspect immutable audit logs with user IP, entity changes, and timestamps (`/audit`).
  * View cross-expedition high-level analytics and resource burn trends (`/analytics`).
* **CANNOT:**
  * Bypass business rules (e.g. even a SuperAdmin cannot close an emergency incident without providing a mandatory resolution summary).

#### 4. Operational Use Cases
* **Case 1.1: Provisioning a New Expedition Team Member**
  * *Trigger:* New glaciologist or medical doctor joins the 44th Indian Antarctic Expedition.
  * *Action:* SuperAdmin opens `/users`, clicks `+ Create User`, inputs full name, email, role (`PersonnelOfficer` / `EmergencyOfficer`), and assigned base station.
  * *System Validation:* Bcrypt password hashing (salt 12), unique username/email check, instant RBAC propagation.
* **Case 1.2: Registering a New Antarctic Field Camp / Fuel Refuge**
  * *Trigger:* Field party establishes a temporary summer camp at Amery Ice Shelf.
  * *Action:* Opens `/locations`, clicks `+ Add Location`, sets name `Field Camp C`, type `Camp`, coordinates (-69.5, 71.0), and next scheduled resupply date.

---

### Role 2: Expedition Manager (Mission Commander / Station Leader)

#### 1. Identity & Scope
* **Real-World Persona:** Expedition Leader (e.g., Station Commander at Bharati or Maitri).
* **Scope:** On-site strategic command of the operational season, life safety, resource quotas, and mission success.

#### 2. Accessible Pages
* Command, Expeditions Hub, Polar Map, Emergency, Alerts, Stations & Hubs, Central Inventory, Cargo, Personnel, Assets, Reports, Analytics, Audit Logs.

#### 3. What They CAN & CANNOT Do
* **CAN:**
  * Create and configure expeditions (e.g., `44-IAE`), operational dates, and target stations.
  * Define critical resource quotas (Fuel, Rations, Medical Units, Spares).
  * Lock completed expeditions (preventing post-mission data tampering).
  * Monitor real-time readiness % based on received vs pending supplies.
  * Generate official printable mission reports (`/reports`).
* **CANNOT:**
  * Create or delete user accounts (reserved for SuperAdmin).
  * Overwrite stock transaction logs directly without proper transaction types.

#### 4. Operational Use Cases
* **Case 2.1: Defining Expedition Resource Requirements & Tracking Readiness**
  * *Trigger:* Planning phase for the upcoming Antarctic summer/winter cycle.
  * *Action:* Opens `Expeditions Hub` ➔ `Enter Mission Workspace` ➔ `Requirements Tab` ➔ `+ Add Requirement`.
  * *Data Entered:* Category: `Fuel`, Item: `Jet A-1 (ATF)`, Required: `50,000 Liters`, Criticality: `Critical`.
  * *System Outcome:* Automatically computes readiness % as cargo arrives or is dispatched:
    $$\text{Readiness \%} = \frac{\text{Allocated + Received Qty}}{\text{Required Qty}} \times 100$$
* **Case 2.2: Completing and Locking an Expedition Mission**
  * *Trigger:* Mission concludes at season end.
  * *Action:* Updates expedition status to `Completed`.
  * *System Outcome:* Locks all cargo consignments and requirements under this expedition against subsequent edits.

---

### Role 3: Logistics Officer (Multimodal Supply Chain Master)

#### 1. Identity & Scope
* **Real-World Persona:** Chief Cargo & Supply Chain Officer stationed at Goa HQ, Cape Town logistics hub, or aboard the polar icebreaker.
* **Scope:** Guarantees materials travel from mainland suppliers through ports, ships, and sledge traverses to polar station storage bunkers without loss.

#### 2. Accessible Pages
* Command, Expeditions Hub, Polar Map, Stations & Hubs, Cargo Manifests, Alerts & SOS, Reports.

#### 3. What They CAN & CANNOT Do
* **CAN:**
  * Register cargo consignments with tracking numbers, weight, Hazmat flags, and itemized manifests (`/cargo`).
  * Advance cargo through standardized transit nodes (`Registered` ➔ `Port Staged` ➔ `Vessel Loaded` ➔ `Ice Shelf Dispatched` ➔ `Delivered Station`).
  * Update ETAs and flag weather delays (`DelayedWeather`).
  * Handshake arrival with station bunkers via the **Receive Cargo** dialog.
* **CANNOT:**
  * Modify personnel rosters, initiate emergency incidents, or alter user permissions.

#### 4. Operational Use Cases
* **Case 3.1: Registering Multimodal Cargo with Container Manifest**
  * *Trigger:* Packing 20-foot container at Goa port for shipment to Bharati Station.
  * *Action:* Opens `/cargo`, clicks `+ Register Cargo`, enters tracking `CRG-2027-BHR-002`, Category: `Provisions`, Weight: `1,200 kg`, Hazmat: `No`, and manifest: `Arctic Freeze Dried Rations: 300 Kilograms, Multivitamins: 50 Units`.
* **Case 3.2: Advancing Cargo Node & Handling Weather Delays**
  * *Trigger:* Heavy sea ice halts the research vessel 50 miles off the Antarctic ice shelf.
  * *Action:* Edits consignment, changes status to `DelayedWeather`, updates ETA by +48 hours.
  * *System Outcome:* Anomaly engine flags ETA-slip warning to the Expedition Commander.
* **Case 3.3: Receiving at Station & Auto-Unpacking into Live Inventory**
  * *Trigger:* PistenBully sledge convoy delivers container to Maitri station storage.
  * *Action:* Logistics Officer clicks `Receive at station`, selects `Maitri`.
  * *System Outcome:* Automatically credits items into the live `Inventory` database with verified `RECEIPT` transaction records, updating station stock immediately!

---

### Role 4: Inventory Officer (Station Life Support Engineer)

#### 1. Identity & Scope
* **Real-World Persona:** Station Inventory Engineer or Chief Supply Custodian residing at Maitri, Bharati, or Himadri.
* **Scope:** Ensures life-support essentials (heating fuel, drinking water RO filters, food rations, surgical kits) never run out during the 8-month winter isolation.

#### 2. Accessible Pages
* Command (Station Engineering view), Expeditions Hub, Polar Map, Central Inventory, Alerts & SOS, Reports.

#### 3. What They CAN & CANNOT Do
* **CAN:**
  * View real-time inventory balances across all station bunkers.
  * Log daily consumption (burn rates) with purpose and audit tracking.
  * Transfer stock between main stations and emergency refuge huts (`/inventory`).
  * Monitor automated **Depletion Forecasting (SAFE vs. RISK)** against the next resupply date.
* **CANNOT:**
  * Create negative stock balances (enforced by database validation).
  * Assign personnel to field expeditions or modify user accounts.

#### 4. Operational Use Cases
* **Case 4.1: Logging Daily Generator Fuel Consumption**
  * *Trigger:* Daily 24-hour generator run cycle completed.
  * *Action:* Opens `/inventory`, clicks `Log Consumption`, selects `Arctic High Speed Diesel (Maitri)`, Quantity: `450 Liters`, Reason: `Main GenSet #1 & #2 24h heating`.
  * *System Outcome:* Decrements live stock, writes an append-only `InventoryTransaction` of type `CONSUMPTION`, and updates the moving daily burn rate.
* **Case 4.2: Automated Runout Forecasting (The Winter Resupply Alert)**
  * *System Math:*
    $$\text{Days of Supply Remaining} = \frac{\text{Current Stock}}{\text{Average Daily Burn Rate}}$$
  * *Evaluation:* If days remaining is less than days until the **Station Next Resupply Date**, the system automatically flags the item as **`RISK` (Red)** and broadcasts an audio-visual siren across the Command Center.
* **Case 4.3: Transferring Emergency Rations to a Remote Refuge Hut**
  * *Trigger:* Stocking emergency food at Field Camp A shelter.
  * *Action:* Opens `Transfer Modal`, Source: `Maitri Station`, Destination: `Field Camp A`, Item: `Emergency High-Calorie Rations`, Qty: `50 Units`.
  * *System Outcome:* Atomic transaction decrements source and increments destination simultaneously.

---

### Role 5: Personnel Officer (Field Safety & Roster Coordinator)

#### 1. Identity & Scope
* **Real-World Persona:** Field Safety Manager, Medical Clearance Officer, or Polar Survival Instructor.
* **Scope:** Oversees personnel identity, medical fitness, field deployments, daily health clearances, and geofence tracking.

#### 2. Accessible Pages
* Command, Expeditions Hub, Polar Map, Personnel Roster, Alerts & SOS, Reports.

#### 3. What They CAN & CANNOT Do
* **CAN:**
  * Deploy personnel to expeditions with unique badge IDs and field specializations (`/personnel`).
  * Record daily check-in / check-out with **vitals (Body Temperature, Pulse/BPM)** and expected return times.
  * Track personnel locations across Base Stations, Field Camps, and Traverses.
  * Inspect movement histories for SAR traceability.
* **CANNOT:**
  * Deploy the same member to multiple concurrent active locations without marking `Returned`.
  * Edit cargo shipments or modify station inventory ledgers.

#### 4. Operational Use Cases
* **Case 5.1: Pre-Departure Field Health Clearance & Vitals Check-in**
  * *Trigger:* Scientist prepares to leave Maitri Station habitat to survey Schirmacher Oasis.
  * *Action:* Opens `/personnel`, finds member `POL-003 (Dr. Sharma)`, clicks `Check-in`.
  * *Data Entered:*
    * Status: `FieldResearch`
    * Location: `Field Camp A`
    * **Pulse:** `74 bpm`
    * **Body Temp:** `36.6 °C`
    * **Expected Return:** Today at `18:00`
  * *System Outcome:*
    * Resets the **45-minute Dead-Man Switch** safety timer.
    * Updates roster vitals.
    * If body temperature is `< 35°C`, flags `⚠️ Low (Hypothermia Warning)` instantly!
* **Case 5.2: Automated Dead-Man Switch Triggering**
  * *Trigger:* Field party fails to ping GPS or check in within the configured 45-minute window.
  * *System Outcome:* The background automation loop (`automation.js`) triggers a **`DEADMAN_TIMEOUT` Critical Alert**, broadcasts an SOS across all active screens, and identifies the missing scientist's last known coordinates.

---

### Role 6: Asset Officer (Chief Mechanical & Heavy Machinery Engineer)

#### 1. Identity & Scope
* **Real-World Persona:** Chief Mechanical Engineer or Polar Workshop Manager at Maitri / Bharati.
* **Scope:** Keeps snowcats, skidoos, diesel generators, cranes, and scientific LIDAR sensors operational in extreme sub-zero weather where engine oil freezes and metals become brittle.

#### 2. Accessible Pages
* Command, Expeditions Hub, Polar Map, Station Assets, Alerts & SOS, Reports.

#### 3. What They CAN & CANNOT Do
* **CAN:**
  * Register new vehicles, machinery, and sensors with asset tags (`/assets`).
  * Log operating hours, battery voltages, and temperature telemetry.
  * Record service maintenance logs (oil change, track replacement, heater service).
  * Mark asset condition (`Operational`, `Maintenance Due`, `Degraded`, `Decommissioned`).
* **CANNOT:**
  * Discard or delete machinery without recording in the system audit trail.
  * Modify personnel deployments or declare official emergency incidents.

#### 4. Operational Use Cases
* **Case 6.1: Logging PistenBully Snowcat Operating Hours**
  * *Trigger:* PistenBully 300 returns from a 60 km ice-shelf traverse.
  * *Action:* Opens `/assets`, locates `AST-PB-001`, clicks `Log Service / Hours`, adds +18 hours.
  * *System Outcome:* If cumulative hours exceed maintenance threshold (e.g. 250 hours), status automatically switches to `Maintenance Due` with an alert to service filters before the next traverse.

---

### Role 7: Emergency Officer (Incident Commander & SAR Chief)

#### 1. Identity & Scope
* **Real-World Persona:** Search & Rescue (SAR) Incident Commander, Senior Field Doctor, or Station Safety Chief.
* **Scope:** Life-and-death crisis management. Takes absolute control of the Mission Control incident room when a blizzard strikes, someone goes missing, or life-support equipment fails.

#### 2. Accessible Pages
* Command (Emergency Command Center), Expeditions Hub, Polar Map, Emergency Incidents, Alerts & SOS, Reports.

#### 3. What They CAN & CANNOT Do
* **CAN:**
  * Declare emergency incidents with category (`Medical`, `Crevasse`, `Fire`, `Equipment`, `Blizzard`), severity (`Critical`, `Major`), and location (`/incidents`).
  * Review automated station roll-call headcounts at the incident site.
  * Mobilize responders and deploy nearby emergency assets (Snowcats, portable oxygen, heated sledges).
  * Record chronological timeline actions during the response.
  * Resolve and close incidents.
* **CANNOT:**
  * **Resolve or Close an incident without entering a mandatory Resolution Summary** (PRD Rule §22.4).
  * Arbitrarily delete emergency timeline actions (tamper-proof crisis log).

#### 4. Operational Use Cases
* **Case 7.1: Declaring a Critical Blizzard / Missing Scientist Incident**
  * *Trigger:* Dr. Sharma misses 45-minute check-in during an incoming whiteout blizzard near Field Camp A.
  * *Action:* Emergency Officer opens `/incidents`, clicks `+ Report Incident`, Category: `WeatherEnvironment`, Severity: `Critical`, Location: `Field Camp A`.
  * *System Outcome:*
    1. Instantly triggers global **`SOS_TRIGGER` / DISASTER** audio-visual siren.
    2. Automatically executes **Instant Station Roll-Call**: queries all personnel stationed at `Field Camp A` to determine who is on site vs deployed in the field.
    3. Surfaces all operational machinery (e.g. PistenBully Snowcat #1) and medical stock at that location.
* **Case 7.2: Incident Command Room Coordination (`/incidents/:id`)**
  * *Action:*
    * Assigns Responders: `Capt. R. Deshmukh` & `Dr. Rahul (Field Medic)`.
    * Deploys Assets: `AST-PB-001 (PistenBully Snowcat)`.
    * Records Timeline Action: *"Search party dispatched equipped with GPS beacon and thermal trauma kit."*
    * Records Timeline Action: *"Contact re-established at Shelter Hut 2. Dr. Sharma located safe; mild hypothermia treatment administered."*
* **Case 7.3: Mandatory Resolution Summary before Incident Closure**
  * *Trigger:* Search party returns safely to habitat.
  * *Action:* Selects `Status: Resolved`.
  * *System Rule:* The system strictly blocks resolution unless the officer enters a detailed `Resolution Summary`: *"Subject located in Shelter Hut 2, warmed with heated sledge, core body temp restored to 36.7°C. Incident concluded."*
  * *System Outcome:* Timestamped `closedAt` recorded, permanently sealed in the audit log.

---

## The Master 5-Minute Evaluation Script for Hackathon Judges

When presenting to SIH judges, execute this exact sequence to demonstrate all roles:

1. **Login as `admin` (SuperAdmin):**
   * Show the 8 live KPI metrics (zero hardcoded values).
   * Open `Team & Roles` to prove all 7 distinct roles exist.
2. **Switch to `commander` (ExpeditionManager):**
   * Open `Expeditions Hub` ➔ Show **Mission Readiness %** dynamically calculated from requirements.
3. **Switch to `logistics` (LogisticsOfficer):**
   * Open `Cargo Manifests` ➔ Advance a container consignment to `Ice Shelf` ➔ Click `Receive at station` ➔ Show items auto-unpacking.
4. **Switch to `inventory` (InventoryOfficer):**
   * Open `Central Inventory` ➔ Show stock automatically incremented from the cargo receipt.
   * Log consumption ➔ Show **Days of Supply Remaining vs. Resupply Date (SAFE vs RISK)**.
5. **Switch to `personnel` (PersonnelOfficer):**
   * Open `Personnel Roster` ➔ Click `Check-in` on a scientist ➔ Log **Pulse (72 bpm) & Body Temp (36.6°C)**.
6. **Switch to `emergency` (EmergencyOfficer):**
   * Open `Emergency` ➔ Open active incident ➔ Show **Auto Roll-Call**, mobilize responders & Snowcat ➔ Log action ➔ Resolve with mandatory summary.
7. **Official Report:**
   * Open `Reports` ➔ Export the print-ready Official Polar Expedition Mission Briefing.
