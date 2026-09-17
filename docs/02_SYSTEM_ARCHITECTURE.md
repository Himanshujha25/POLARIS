# POLARIS: System Architecture & Technical Specifications

## 1. High-Level Technical Topology

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                          |
|                                                                                         |
|   +---------------------------------------+   +-------------------------------------+   |
|   |         React 19 Single Page App       |   |       Field Mobile / Tablet View    |   |
|   |   (Tactical Polar Command Dashboard)  |   |    (PWA / Offline-Sync Friendly)    |   |
|   +---------------------------------------+   +-------------------------------------+   |
|                      |                                           |                      |
|                      | REST APIs & WebSocket                     | REST & Sync          |
+----------------------|-------------------------------------------|----------------------+
                       |                                           |
+----------------------v-------------------------------------------v----------------------+
|                                 APPLICATION GATEWAY                                     |
|                                                                                         |
|       - JWT Auth & RBAC Interceptor                                                     |
|       - Express Rate Limiter & Helmet Security Headers                                  |
|       - Insecure Direct Object Reference (IDOR) & Role Protection Guard                 |
+-----------------------------------------------------------------------------------------+
                                           |
+------------------------------------------v----------------------------------------------+
|                                NODE.JS / EXPRESS CORE                                   |
|                                                                                         |
|   +-------------------+  +-------------------+  +-------------------+  +------------+   |
|   | Expedition Engine |  | Personnel Service |  | Cargo & Logistics |  | Inventory  |   |
|   +-------------------+  +-------------------+  +-------------------+  +------------+   |
|   +-------------------+  +-------------------+  +-------------------+  +------------+   |
|   | Asset Management  |  | Geofence & Map    |  | Emergency & SOS   |  | Automation |   |
|   +-------------------+  +-------------------+  +-------------------+  +------------+   |
|                                          |                                              |
|                                          | Event Dispatch                               |
|   +--------------------------------------v------------------------------------------+   |
|   |              AUTONOMOUS EVENT LOOP & SMART AUTOMATION ENGINE                    |   |
|   |  - GPS Dead-Man Switch & Anomaly Detector                                       |   |
|   |  - Fuel & Consumable Depletion Forecaster                                       |   |
|   |  - Geofence Boundary Breach Interceptor                                         |   |
|   |  - Cargo Delay / Weather Window Slippage Warner                                 |   |
|   +---------------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------+
                                           |
+------------------------------------------v----------------------------------------------+
|                                 PERSISTENCE TIER                                        |
|                                                                                         |
|             MongoDB Document Database with Optimized Compound Indexes                   |
|       Collections: Users, Expeditions, Personnel, Cargo, Assets, Inventory,             |
|                    GeoTracks, Alerts, MaintenanceLogs, EmergencyIncidents               |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Frontend Tech Stack Specifications
- **Framework:** React 19 (Vite bundler)
- **Styling:** Modern Tactical UI design system with high-contrast polar themes (Deep Navy/Obsidian backdrop `#0B111E`, Ice Cyan `#00E5FF`, Danger Amber/Red `#FF3B30`, Polar Aurora Green `#00E676`).
- **Icons:** Lucide React icons for high-tech telemetry and operational controls.
- **Mapping:** Leaflet / React-Leaflet with polar coordinate support, custom markers, and geo-fenced boundaries.
- **Real-Time Client:** Socket.IO client / event streams for zero-latency alert flashing & telemetry updates.
- **State Management:** React Context API + Custom Hooks with optimistic mutations.

---

## 3. Backend Tech Stack Specifications
- **Runtime:** Node.js (v18+) with Express.js REST API.
- **Database:** MongoDB with Mongoose ODM.
- **Real-Time Communication:** Socket.IO / WebSocket server for live telemetry broadcasting.
- **Security & Authorization:**
  - JWT (JSON Web Tokens) with strict role validation.
  - Resource-level ownership & expedition-level isolation (preventing cross-expedition tampering / IDOR).
  - Sanitization against NoSQL injection via `express-mongo-sanitize`.
  - Rate limiting with `express-rate-limit`.
  - CORS hardened to configured client origin.

---

## 4. Communication & Synchronization Strategy for Extreme Polar Latency
Antarctic stations connect via satellite (INMARSAT / Iridium / Starlink Polar). Bandwidth is constrained and drops during blizzards.
- **Payload Minimization:** Lean JSON payloads without bloated metadata.
- **Delta Sync:** Last-modified timestamps (`updatedAt`) sent during polling/sync so only modified assets or alerts are transferred.
- **Offline Resilient Storage:** Field mobile UI queues check-ins and telemetry points locally in IndexedDB / LocalStorage, flushing to server when uplink resumes.
