# POLARIS — Roles, Login & Access Guide
**RBAC source:** Master PRD §5 · **Enforced in 3 layers:** API (`requireRoles`) → Routes (`Protected roles=`) → UI (nav filter + button gating)

## 1. Login
- URL: `/login` · JWT (7-day) stored in `localStorage` + cached user → **refresh-safe** (only a 401 drops the session).
- Already signed in + open `/login` → auto-redirect `/command`. Logout → landing `/`.

### Demo accounts (password `Test@123` for all)
| Username | Role | Station |
|---|---|---|
| `admin` | SuperAdmin | Headquarters_Goa |
| `commander` | ExpeditionManager | Bharati |
| `logistics` | LogisticsOfficer | Headquarters_Goa |
| `inventory` | InventoryOfficer | Maitri |
| `rahul` | EmergencyOfficer | Maitri |

New users: **Team & Roles page** (SuperAdmin only) → Create user → pick any of the 7 roles. Role/status changes via same page (API: `PATCH /auth/users/:id`).

## 2. Role → Dashboard (after login, `/command`)
| Role | Sees |
|---|---|
| SuperAdmin | Full mission overview (8 KPIs, alerts, RISK cards, expeditions) |
| ExpeditionManager | Same full overview (plans + monitors everything) |
| LogisticsOfficer | Logistics Command (shipments, live pipeline, delayed attention) |
| InventoryOfficer | Station Engineering (runout watch, machines due service) |
| PersonnelOfficer | Personnel operations page directly (deployment groups, roster, movements) |
| AssetOfficer | Assets page directly (health, hours, maintenance) |
| EmergencyOfficer | Emergency Operations (active/critical incidents, unacked alerts) |

## 3. Role → Navigation & pages
| Page | SA | EM | LO | IO | PO | AO | EO |
|---|---|---|---|---|---|---|---|
| Command | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Expeditions (+detail/tabs) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Locations | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cargo | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inventory (+txns/transfers) | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Personnel (+deploy/movements) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Assets (+maintenance) | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Emergency incidents (+command view) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Polar Map, Alerts & SOS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analytics, Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Team & Roles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

Typing a blocked URL manually → bounced back to `/command`.

## 4. Role → Actions (what each can DO)
- **SuperAdmin:** everything incl. user create/role change, all writes, SOS ack, incident manage.
- **ExpeditionManager:** create expeditions + requirements, edit status, cargo/inventory/personnel/asset writes, incident manage, ack alerts. Cannot manage users.
- **LogisticsOfficer:** cargo register/stage/receive, locations, tracking. Cannot touch stock, roster, incidents.
- **InventoryOfficer:** stock create/consume/receipt, transfers, forecast. Cannot touch cargo, roster, incidents.
- **PersonnelOfficer:** deploy members, check-ins, movements. Cannot touch cargo, stock, incidents.
- **AssetOfficer:** asset register, hours/telemetry, maintenance. Cannot touch cargo, stock, roster.
- **EmergencyOfficer:** report/manage incidents, responders, timeline actions, resolve/close, SOS + ack alerts. Cannot touch cargo/stock/roster.

Negative proof: non-admin `POST /auth/register` → 403 (smoke `rbac/register-blocked-for-nonadmin`); closing incident without summary → 400; writing to Completed expedition → 400.

## 5. Suggested role demo (2 min, judges)
1. `admin` → Team & Roles → show 7-role creation.
2. `logistics` → Command shows pipeline → Cargo → advance a node → Timeline.
3. `inventory` → Command shows runout → log consumption → Transactions tab.
4. `rahul` (Emergency) → report incident at Field Camp A → auto roll-call → assign responders → timeline → resolve with summary.
5. `commander` → expedition readiness % + report.
