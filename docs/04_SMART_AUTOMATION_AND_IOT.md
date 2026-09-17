# POLARIS: Smart Automation & Telemetry Engine

## 1. Why "Smart Automation" is the Winning Differentiator in SIH
Standard logistics portals merely record that an item or person exists. In a polar mission with sub-zero isolation and death hazards:
> **The system must act autonomously before a human realizes a disaster has occurred.**

The POLARIS Automation Engine runs background evaluators and event listeners across 5 dedicated safety workflows.

---

## 2. The 5 Autonomous Polar Automation Engines

### Engine 1: Personnel Dead-Man Switch & Anomaly Detector
- **Trigger:** Field personnel marked as `FieldResearch` must transmit GPS ping or manual check-in every `X` minutes (configurable, e.g., 45 mins).
- **Rule:** If `CurrentTime - LastPing > SafetyWindow`:
  1. Escalates status from `Normal` -> `Warning` (30 mins overdue).
  2. If still unacknowledged at 45 mins: Automatically creates a `DEADMAN_TIMEOUT` Critical Alert.
  3. Emits a high-priority sound & screen takeover on the Station Commander's Tactical Dashboard via WebSocket.
  4. Automatically computes and displays the **Last Known GPS Coordinates**, terrain altitude, weather conditions, and distance to the nearest survival refuge hut.

### Engine 2: Real-Time Polar Geofencing & Crevasse Zone Interceptor
- **Antarctic Reality:** Coastal areas near ice shelves and glacier tongues have hidden crevasses (snow bridges that collapse under weight) and restricted Antarctic Specially Protected Areas (ASPA).
- **Rule:** When a personnel GPS telemetry packet arrives:
  1. Computes ray-casting or Haversine distance against known danger polygon coordinates (e.g., Crevasse Field Beta at Bharati).
  2. If point falls inside a danger polygon or breaches safety perimeter:
     - Instantly pushes a `GEOFENCE_BREACH` critical alert.
     - Logs alert to emergency incident audit trail.

### Engine 3: Predictive Life-Support & Consumable Depletion Forecaster
- **Antarctic Reality:** When winter sets in, no ship or plane can reach for 8 months. If heating fuel or rations run out, the base perishes.
- **Rule:**
  $$\text{Days Remaining} = \frac{\text{Current Stock}}{\text{Average Daily Consumption Rate}}$$
  - If $\text{Days Remaining} \le \text{Expedition Days Until Next Resupply Window}$:
    - Flags status as `CriticalDepletion`.
    - Automatically generates a **Draft Resupply Manifest** for the next voyage or emergency air-drop container.

### Engine 4: Cargo ETA Slip & Weather Window Correlator
- **Antarctic Reality:** Icebreaker vessels only have narrow 3-5 day weather windows before sea ice refreezes (frazil ice formation).
- **Rule:** If a cargo vessel or supply convoy speed/ETA drifts past the safe polar weather window:
  - System flags `CARGO_ETA_SLIP`.
  - Automatically reroutes cargo priority: Flags life support / medicine / fuel as `P1 Emergency Airlift` while deferring non-urgent building materials.

### Engine 5: Heavy Machinery Predictive Maintenance
- **Rule:** Monitors PistenBully snowcats, heavy generators, and water desalination plants:
  - Tracks running hours.
  - If `operatingHours >= maxHoursBeforeService - 25`:
    - Automatically marks equipment as `ScheduledMaintenanceRequired`.
    - Cross-references spare parts inventory (e.g., fuel filters, synthetic sub-zero lube) to verify spares exist on station before the machine breaks down.

---

## 3. SIH Live Demo Simulation Harness
To impress judges during hackathon evaluation, POLARIS includes a built-in **"Mission Simulation Controller"**:
- **Button: "Simulate Blizzard Crevasse Stray"** -> Injects walking scientist drift into restricted crevasse zone -> Triggers instant audio-visual siren on commander dashboard.
- **Button: "Simulate Generator Breakdown & Fuel Freeze"** -> Fuel temperature drops below -35°C -> Automatic life-support emergency alert & backup power switch trigger.
- **Button: "Simulate Dead-Man Switch Timeout"** -> Field team signal cuts off -> Countdown timer expires -> Auto SOS escalation.
