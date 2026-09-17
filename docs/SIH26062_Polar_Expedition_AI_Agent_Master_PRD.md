# SIH 2026 --- PS 26062

# Integrated Polar Expedition Logistics and Asset Management System

## AI Agent Build Specification / Master Product Requirement Document

> **Purpose of this document:** This is the single source of truth for
> an AI coding agent.\
> The agent must understand the problem statement, product goal,
> business workflow, modules, data relationships, UI expectations,
> validations, demo scenario, and acceptance criteria before
> implementing or modifying the application.

------------------------------------------------------------------------

# 1. Problem Statement

**Problem Statement ID:** SIH26062 / PS 26062\
**Title:** Integrated Polar Expedition Logistics and Asset Management
System\
**Organization:** Ministry of Earth Sciences (MoES)\
**Department:** National Centre for Polar and Ocean Research (NCPOR)\
**Category:** Software\
**Theme:** Smart Automation

### Official requirement

> Develop a centralized digital platform for expedition planning, cargo
> tracking, inventory management, personnel movement and emergency
> response.

The official statement is intentionally short. This document converts
that requirement into a complete product specification without changing
the core objective.

------------------------------------------------------------------------

# 2. Core Goal

The application must provide **one centralized operational system for
managing a polar expedition from planning to execution**.

The application should answer these questions at any moment:

1.  What expeditions are active or planned?
2.  What resources are required for each expedition?
3.  What cargo has been planned, dispatched, transported, received,
    delayed, or missing?
4.  What assets and equipment exist, where are they, and what is their
    condition?
5.  What inventory is available at each station/location?
6.  How quickly is inventory being consumed?
7.  What items may become insufficient before the next resupply?
8.  Which personnel are assigned to which expedition/station/field
    activity?
9.  Where are personnel currently deployed?
10. What emergency incidents are active?
11. Which personnel and resources are available at the incident
    location?
12. What actions have been taken and what is still pending?
13. What is the overall operational status of the expedition?

The system is **not merely an inventory CRUD application**. All major
modules must be connected through a common expedition, location, cargo,
personnel, asset and inventory model.

------------------------------------------------------------------------

# 3. Important Real-World Context

The system is intended for polar expedition operations. India operates
Antarctic research stations including **Maitri** and **Bharati**.
NCPOR's official information describes Maitri as an Indian Antarctic
research station and Bharati as another Indian research base,
approximately 3000 km east of Maitri.

These should be treated as realistic example locations in the prototype,
while the application must also allow administrators to create
additional stations, camps, warehouses, vessels, hubs and field
locations.

Do not hard-code the application so that it works only for Maitri and
Bharati.

------------------------------------------------------------------------

# 4. Product Vision

Build a web-based **Polar Mission Control & Logistics Platform**.

Conceptually:

``` text
                         POLAR EXPEDITION PLATFORM
                                   |
        ---------------------------------------------------------
        |            |             |            |               |
   EXPEDITION      CARGO       INVENTORY    PERSONNEL      EMERGENCY
     PLANNING     TRACKING     MANAGEMENT    MOVEMENT       RESPONSE
        |            |             |            |               |
        ------------------- Shared Data Layer -------------------
                                   |
                         Assets + Locations
                                   |
                              Analytics
                                   |
                           Alerts / Audit Log
```

Every module must share data.

Example:

``` text
Expedition
   ↓
Required Cargo
   ↓
Shipment
   ↓
Container
   ↓
Station Receipt
   ↓
Inventory
   ↓
Consumption
   ↓
Low-stock / depletion alert
```

Another example:

``` text
Expedition
   ↓
Personnel Assignment
   ↓
Current Location
   ↓
Emergency Incident
   ↓
Current Roll Call
   ↓
Available Response Resources
```

------------------------------------------------------------------------

# 5. Primary Users / Roles

Implement role-based access.

## 5.1 Super Admin

Can:

-   manage users
-   manage roles
-   manage stations/locations
-   manage master data
-   view all expeditions
-   view all reports
-   view audit logs
-   configure system settings

## 5.2 Expedition Manager

Can:

-   create and plan expeditions
-   define expedition dates
-   assign stations
-   create resource requirements
-   assign personnel
-   monitor logistics
-   monitor inventory
-   monitor assets
-   view emergency situations
-   generate reports

## 5.3 Logistics Officer

Can:

-   create cargo consignments
-   create shipment/container records
-   create manifests
-   update shipment status
-   record movement milestones
-   record station receipt
-   track delays

## 5.4 Inventory Officer

Can:

-   manage stock
-   record stock receipts
-   record consumption
-   perform stock adjustments
-   transfer inventory between locations
-   view low-stock alerts
-   view projected depletion

## 5.5 Personnel Officer

Can:

-   manage personnel profiles
-   assign personnel to expeditions
-   assign station/field locations
-   record movement/rotation
-   update deployment status
-   manage clearance/status information

## 5.6 Asset / Maintenance Officer

Can:

-   register assets
-   assign assets to locations
-   track asset condition
-   record maintenance
-   track maintenance due dates
-   mark assets operational/unavailable/under-maintenance

## 5.7 Emergency / Operations Officer

Can:

-   create emergency incidents
-   view current personnel roll call
-   view nearby/available resources
-   assign responders
-   record incident actions
-   update incident status
-   close incidents
-   maintain incident timeline

------------------------------------------------------------------------

# 6. Main Application Navigation

Recommended sidebar:

``` text
Dashboard
Expeditions
  ├── All Expeditions
  ├── Create Expedition
  └── Expedition Details

Logistics
  ├── Cargo
  ├── Shipments
  ├── Containers
  └── Manifests

Inventory
  ├── Overview
  ├── Stock
  ├── Transactions
  ├── Transfers
  └── Alerts

Assets
  ├── All Assets
  ├── Maintenance
  └── Asset History

Personnel
  ├── Directory
  ├── Assignments
  ├── Movements
  └── Current Locations

Emergency
  ├── Active Incidents
  ├── Incident History
  └── Emergency Plans

Locations
  ├── Stations
  ├── Warehouses
  ├── Camps
  └── Other Locations

Analytics
Reports
Audit Logs
Settings
```

------------------------------------------------------------------------

# 7. Dashboard Requirements

The dashboard must be operational, not decorative.

## Top KPI cards

Show:

-   Active Expeditions
-   Planned Expeditions
-   Cargo In Transit
-   Delayed Shipments
-   Inventory Alerts
-   Personnel Deployed
-   Assets Under Maintenance
-   Active Emergencies

## Operational overview

Include:

### Expedition status

``` text
Planned
Preparing
In Transit
Active
Returning
Completed
Cancelled
```

### Cargo status

``` text
Planned
Packed
Dispatched
In Transit
Arrived
Received
Delayed
Lost/Damaged
```

### Inventory health

Display:

-   healthy stock
-   low stock
-   critical stock
-   projected shortage

### Personnel

Display:

-   total assigned
-   at station
-   in field
-   in transit
-   returned

### Emergency

Display:

-   active incidents
-   critical incidents
-   response status

------------------------------------------------------------------------

# 8. Expedition Planning Module

This is the starting point of the system.

## Expedition creation

Fields:

-   Expedition ID
-   Expedition name
-   expedition type
-   destination region
-   primary station
-   additional locations
-   start date
-   expected end date
-   planning status
-   mission objective
-   expedition manager
-   notes

## Status

``` text
Draft
Planning
Ready
Deployed
Active
Returning
Completed
Cancelled
```

## Expedition requirements

Each expedition must have a requirement list.

Example:

``` text
Food               800 kg
Fuel               5000 L
Medical Supplies   150 units
Batteries          100 units
Research Equipment 20 units
Protective Gear    40 units
Spare Parts        30 units
```

Each requirement should store:

-   item
-   category
-   required quantity
-   unit
-   priority
-   required-by date
-   allocated quantity
-   received quantity
-   pending quantity

Formula:

``` text
Pending Quantity = Required Quantity - Received/Allocated Quantity
```

## Planning completeness

Show a readiness indicator:

``` text
Cargo readiness       92%
Inventory readiness   87%
Personnel readiness   100%
Asset readiness       76%
Overall readiness     88%
```

Do not make this a meaningless decorative percentage. Calculate it from
actual records.

------------------------------------------------------------------------

# 9. Cargo & Logistics Module

Cargo must have a complete lifecycle.

## Cargo lifecycle

``` text
Requirement
    ↓
Procurement / Preparation
    ↓
Packing
    ↓
Manifest Creation
    ↓
Dispatched
    ↓
In Transit
    ↓
Arrived
    ↓
Received
    ↓
Inventory / Asset Registration
```

## Shipment entity

Fields:

-   shipment ID
-   expedition ID
-   origin
-   destination
-   transport mode
-   carrier/vessel/flight reference
-   planned departure
-   actual departure
-   estimated arrival
-   actual arrival
-   status
-   priority
-   notes

## Container entity

Fields:

-   container ID
-   shipment ID
-   container number
-   container type
-   dimensions
-   capacity
-   weight
-   current location
-   status
-   loading priority
-   destination
-   seal/reference
-   contents summary

## Manifest

A shipment must contain one or more manifest items.

Manifest item:

-   item ID
-   item name
-   quantity
-   unit
-   weight
-   category
-   container
-   handling requirement
-   priority

------------------------------------------------------------------------

# 10. Cargo Tracking

Every cargo movement must create a timeline.

Example:

``` text
12 Nov
Cargo prepared

15 Nov
Packed

18 Nov
Manifest created

20 Nov
Dispatched from mainland hub

28 Nov
Loaded for polar transport

08 Dec
Arrived at destination region

10 Dec
Received at station
```

The UI should show this as a visual timeline.

Never overwrite important historical movement events.

Use event records.

------------------------------------------------------------------------

# 11. Cargo Delay / Exception Management

If cargo is delayed:

``` text
Shipment #SHP-1042

Status:
Delayed

Reason:
Transport delay

Expected:
18 Dec

Updated ETA:
21 Dec

Impact:
Medical Supplies
```

The system should identify affected requirements.

Example:

``` text
⚠ Shipment delay may affect:
Medical Supplies

Current station stock:
22 days

New expected arrival:
18 days

Risk:
High
```

This connects logistics with inventory.

------------------------------------------------------------------------

# 12. Inventory Management

Inventory must be **location-aware**.

The same item may exist in multiple locations.

Example:

``` text
Food

Maitri:
550 kg

Bharati:
620 kg

Mainland Warehouse:
2400 kg
```

## Inventory record

Fields:

-   item
-   location
-   quantity
-   unit
-   minimum stock
-   reorder level
-   critical level
-   average consumption rate
-   last updated

------------------------------------------------------------------------

# 13. Inventory Transactions

Every inventory change must create a transaction.

Transaction types:

``` text
RECEIPT
CONSUMPTION
TRANSFER_IN
TRANSFER_OUT
ADJUSTMENT
DAMAGE
LOSS
RETURN
```

Example:

``` text
Food
Opening: 800 kg

Consumption: -50 kg

Current: 750 kg
```

Do not directly mutate stock without creating a transaction.

Stock should be traceable.

------------------------------------------------------------------------

# 14. Inventory Transfers

Example:

``` text
Maitri
Food: 500 kg

       ↓ Transfer 100 kg

Bharati
Food: +100 kg
```

Create:

``` text
TRANSFER_OUT from Maitri
TRANSFER_IN to Bharati
```

Both records must be linked by a transfer ID.

------------------------------------------------------------------------

# 15. Inventory Depletion Forecast

This is an important smart feature.

For each consumable item:

``` text
Current Stock = 600 kg
Average Daily Consumption = 20 kg
```

Calculate:

``` text
Estimated Days Remaining
= Current Stock / Daily Consumption

= 600 / 20
= 30 days
```

Then compare with next resupply date.

Example:

``` text
Current stock: 600 kg
Consumption: 20 kg/day
Days remaining: 30
Next resupply: 20 days
```

Status:

``` text
SAFE
```

If:

``` text
Days remaining: 15
Next resupply: 20 days
```

Then:

``` text
RISK
Projected shortage before resupply
```

This is much more useful than simply displaying a low-stock badge.

------------------------------------------------------------------------

# 16. Inventory Alert Levels

Use:

### Normal

Enough stock until resupply with safety margin.

### Warning

Stock is approaching reorder threshold.

### Critical

Projected shortage before next resupply.

### Out of Stock

Available quantity is zero.

Every alert should explain **why** it exists.

Bad:

``` text
⚠ LOW STOCK
```

Better:

``` text
⚠ Fuel Risk

Current stock: 1,200 L
Daily consumption: 90 L/day
Estimated remaining: 13 days
Next resupply: 20 days

Projected shortage: ~7 days
```

------------------------------------------------------------------------

# 17. Asset Management

Assets are reusable equipment, not normal consumables.

Examples:

``` text
Snow vehicle
Generator
Crane
Research instrument
Communication equipment
Power equipment
Field equipment
```

## Asset fields

-   asset ID
-   asset name
-   asset category
-   serial number
-   location
-   assigned expedition
-   condition
-   operational status
-   purchase/commission date
-   last maintenance
-   next maintenance
-   responsible officer
-   notes

## Asset status

``` text
Operational
In Use
Standby
Under Maintenance
Damaged
Retired
Missing
```

------------------------------------------------------------------------

# 18. Asset Maintenance

Maintenance record:

-   asset ID
-   maintenance type
-   date
-   technician/team
-   description
-   parts used
-   downtime
-   next maintenance date
-   status

Dashboard should show:

``` text
Maintenance Due
Maintenance Overdue
Operational
Under Maintenance
```

------------------------------------------------------------------------

# 19. Personnel Management

Personnel profile:

-   personnel ID
-   name
-   designation
-   department
-   role
-   expedition
-   current location
-   deployment status
-   contact/reference information
-   assignment dates
-   clearance/status fields required by the prototype
-   emergency role

Avoid collecting unnecessary sensitive personal information.

------------------------------------------------------------------------

# 20. Personnel Assignment

Example:

``` text
Expedition:
ANT-2027

Personnel:
Dr. A
Role:
Scientist

Assigned:
Maitri

From:
10 Dec

To:
15 Feb
```

The system must prevent impossible duplicate assignments when dates
overlap.

------------------------------------------------------------------------

# 21. Personnel Movement Tracking

Movement record:

-   person
-   expedition
-   from location
-   to location
-   departure
-   arrival
-   movement status
-   reason
-   created by

Timeline:

``` text
India
 ↓
Transit Hub
 ↓
Maitri
 ↓
Field Camp A
 ↓
Maitri
 ↓
India
```

Current location must be derived from the latest valid
movement/assignment state.

------------------------------------------------------------------------

# 22. Emergency Response Module

Emergency is not just a form.

It must become an operational incident.

## Incident fields

-   incident ID
-   expedition
-   incident type
-   severity
-   location
-   reported by
-   report time
-   description
-   affected personnel
-   affected assets
-   required resources
-   assigned responders
-   status
-   resolution summary

## Incident types

Example categories:

``` text
Medical
Fire
Vehicle/Equipment
Communication
Supply
Weather/Environment
Personnel
Other
```

## Severity

``` text
Low
Medium
High
Critical
```

## Incident status

``` text
Reported
Acknowledged
Response Initiated
Under Control
Resolved
Closed
```

------------------------------------------------------------------------

# 23. Emergency Command View

When an emergency is active, the operator should immediately see:

``` text
INCIDENT
Location
Severity
Time

AFFECTED PEOPLE
Current roll call

AVAILABLE RESOURCES
Medical kit
Vehicle
Personnel
Communication equipment

RESPONDERS
Assigned team

TIMELINE
Report
Acknowledgement
Actions
Updates
Resolution
```

The system should use current personnel and inventory data rather than
requiring the operator to manually re-enter everything.

------------------------------------------------------------------------

# 24. Location Management

Locations should be hierarchical.

Example:

``` text
India
 └── NCPOR / Mainland Hub

Antarctica
 ├── Maitri
 │    ├── Main Station
 │    ├── Warehouse
 │    ├── Fuel Area
 │    └── Field Camp
 │
 └── Bharati
      ├── Main Station
      ├── Storage
      └── Field Camp
```

Also support:

-   warehouses
-   ports
-   transport hubs
-   ships
-   aircraft
-   field camps
-   temporary locations

Do not hard-code only two stations.

------------------------------------------------------------------------

# 25. Global Search

Search should work across:

-   expedition ID
-   shipment ID
-   container ID
-   cargo
-   asset ID
-   personnel ID/name
-   location
-   incident ID

Example:

Searching:

``` text
CNT-1042
```

should open the container and show:

-   current location
-   shipment
-   expedition
-   contents
-   timeline
-   destination
-   receipt status

------------------------------------------------------------------------

# 26. Notifications & Alerts

Create a centralized notification system.

Alert examples:

``` text
Shipment delayed
Inventory critical
Projected shortage
Asset maintenance overdue
Personnel assignment ending
Emergency incident created
Emergency unresolved
Cargo not received
```

Notifications should link directly to the relevant record.

------------------------------------------------------------------------

# 27. Audit Log

Important actions must be logged.

Example:

``` text
User:
Logistics Officer

Action:
Updated shipment status

From:
In Transit

To:
Arrived

Time:
10 Dec 14:32
```

Audit actions:

-   create
-   update
-   delete/archive
-   status change
-   stock adjustment
-   transfer
-   assignment
-   emergency action
-   login/security events

Prefer soft-delete/archive for operational records.

------------------------------------------------------------------------

# 28. Reports

Generate useful reports, not placeholder PDFs.

Required reports:

### Expedition readiness report

-   expedition details
-   personnel readiness
-   cargo readiness
-   inventory readiness
-   asset readiness
-   unresolved issues

### Cargo report

-   shipment status
-   delays
-   containers
-   received/pending cargo

### Inventory report

-   current stock
-   consumption
-   alerts
-   projected depletion

### Personnel report

-   deployed people
-   current locations
-   movements
-   upcoming rotations

### Asset report

-   operational assets
-   maintenance
-   damaged/unavailable assets

### Emergency report

-   incidents
-   severity
-   response timeline
-   resolution status

------------------------------------------------------------------------

# 29. Analytics

Analytics should answer operational questions.

Charts:

-   expedition status
-   cargo movement
-   inventory consumption
-   projected depletion
-   personnel distribution
-   asset condition
-   maintenance schedule
-   emergency trends

Avoid charts that have no decision value.

------------------------------------------------------------------------

# 30. Unified Data Relationships

The database should be relational in concept even if MongoDB is used.

Core relationships:

``` text
EXPEDITION
   |
   ├── requirements
   ├── shipments
   ├── personnel assignments
   ├── assets
   ├── inventory context
   └── incidents
```

``` text
SHIPMENT
   |
   ├── containers
   ├── manifest items
   └── tracking events
```

``` text
INVENTORY
   |
   ├── stock
   ├── transactions
   ├── transfers
   └── depletion calculations
```

``` text
PERSONNEL
   |
   ├── assignments
   └── movement events
```

``` text
ASSET
   |
   ├── assignment
   ├── maintenance
   └── status history
```

``` text
INCIDENT
   |
   ├── affected personnel
   ├── affected assets
   ├── resources
   ├── responders
   └── action timeline
```

------------------------------------------------------------------------

# 31. Recommended MongoDB Collections

If using MERN:

``` text
users
roles
expeditions
expeditionRequirements
locations
shipments
containers
manifestItems
cargoTrackingEvents
inventoryItems
inventoryStocks
inventoryTransactions
inventoryTransfers
assets
assetMaintenance
personnel
personnelAssignments
personnelMovements
incidents
incidentActions
notifications
auditLogs
```

Use references/ObjectIds where appropriate.

Do not put the entire application into one huge document.

------------------------------------------------------------------------

# 32. Backend API Structure

Use REST APIs with clear domain separation.

Example:

``` text
/api/auth
/api/users
/api/expeditions
/api/locations
/api/shipments
/api/containers
/api/manifests
/api/cargo-events
/api/inventory
/api/inventory/transactions
/api/inventory/transfers
/api/assets
/api/assets/maintenance
/api/personnel
/api/personnel/assignments
/api/personnel/movements
/api/incidents
/api/incidents/actions
/api/notifications
/api/reports
/api/analytics
/api/audit-logs
```

Use validation on every write endpoint.

Never trust frontend validation alone.

------------------------------------------------------------------------

# 33. Business Rules

These rules are mandatory.

## Expedition

-   End date cannot be before start date.
-   Expedition must have an owner/manager.
-   Completed expeditions should not accept normal operational updates.
-   Cancelled expeditions should preserve historical data.

## Cargo

-   A shipment must belong to an expedition.
-   A container must belong to a shipment.
-   Received cargo cannot remain in an unresolved transit state.
-   Tracking events must preserve chronological history.

## Inventory

-   Stock cannot become negative unless an explicit emergency override
    is implemented.
-   Every stock change must create a transaction.
-   Transfers must have both source and destination.
-   Stock calculations must be location-aware.

## Personnel

-   Avoid overlapping incompatible assignments.
-   Current location must remain consistent with movement/assignment
    data.
-   Historical movements must not be overwritten.

## Assets

-   One asset cannot simultaneously be marked operational and under
    maintenance.
-   Maintenance must be part of asset history.

## Emergency

-   Every incident must have location, severity and status.
-   Critical incidents must be visually prominent.
-   Incident actions must be timestamped.
-   Closing an incident requires a resolution summary.

------------------------------------------------------------------------

# 34. Smart Automation Layer

The PS theme is Smart Automation, but AI is **not required to be the
core of every feature**.

Use deterministic business logic first.

Good smart features:

## 34.1 Inventory depletion forecasting

Input:

-   current stock
-   average consumption
-   next resupply date

Output:

-   days remaining
-   projected shortage
-   risk level

## 34.2 Cargo impact analysis

If a shipment is delayed:

``` text
Shipment delayed
      ↓
Which requirements depend on it?
      ↓
Which inventory items are affected?
      ↓
Will stock last until revised ETA?
      ↓
Create risk alert
```

## 34.3 Expedition readiness

Calculate readiness from real requirements:

``` text
Personnel
Cargo
Inventory
Assets
Documents/Tasks
```

## 34.4 Maintenance alerts

Identify assets whose maintenance is due or overdue.

## 34.5 Emergency resource lookup

When an incident is created, automatically retrieve:

-   personnel at location
-   available assets
-   relevant inventory/resources
-   current assignments

------------------------------------------------------------------------

# 35. Optional AI Features

AI may be added only where it improves the workflow.

Possible features:

### AI Operations Assistant

User asks:

> "Will the food stock at Maitri last until the next resupply?"

Assistant should query actual system data and answer with calculations.

Another:

> "Which shipments are currently putting the expedition at risk?"

Another:

> "Show critical inventory across all active stations."

AI must not invent operational data.

If AI is unavailable, the core application must still work.

------------------------------------------------------------------------

# 36. Offline / Remote Environment Consideration

Polar stations may have constrained or intermittent connectivity.

Design the prototype with this in mind.

Preferred architecture:

``` text
Web App
   ↓
Local cache / queued actions
   ↓
Backend API
   ↓
Central database
```

For the prototype:

-   show connection state
-   cache important read data
-   queue safe offline updates if implemented
-   synchronize when connection returns
-   prevent duplicate submissions
-   show sync status

Do not claim that the prototype is fully satellite-grade unless it has
actually been tested.

------------------------------------------------------------------------

# 37. UI/UX Requirements

The UI should feel like a professional operational SaaS/control center.

Do not make it look like a generic student CRUD admin panel.

## Design language

-   clean
-   premium
-   minimal
-   information-dense but readable
-   professional
-   responsive
-   accessible
-   clear status indicators

## Theme

Support:

-   Light mode
-   Dark mode

Both must use the same design system.

## Components

Use reusable components:

``` text
Card
DataTable
StatusBadge
Modal
Drawer
Tabs
Timeline
KPI Card
FilterBar
Search
Charts
AlertPanel
EmptyState
LoadingState
ConfirmationDialog
```

Prefer Tailwind CSS and reusable component patterns over large custom
CSS files.

------------------------------------------------------------------------

# 38. Important UI Pages

At minimum:

``` text
/login

/dashboard

/expeditions
/expeditions/:id

/logistics/shipments
/logistics/shipments/:id
/logistics/containers

/inventory
/inventory/:location
/inventory/transactions

/assets
/assets/:id
/assets/maintenance

/personnel
/personnel/:id
/personnel/movements

/emergency
/emergency/:id

/locations
/analytics
/reports
/audit-logs
/settings
```

------------------------------------------------------------------------

# 39. Expedition Detail Page

This should be one of the most important pages.

Header:

``` text
ANT-2027
Antarctic Research Expedition

Status: Active
Station: Maitri
```

Tabs:

``` text
Overview
Planning
Cargo
Inventory
Personnel
Assets
Emergencies
Timeline
Reports
```

Overview should show:

-   readiness
-   cargo status
-   inventory risk
-   personnel
-   assets
-   active incidents
-   upcoming milestones

------------------------------------------------------------------------

# 40. Demo Data

The prototype must include realistic seeded data.

Create:

### Locations

-   Mainland Logistics Hub
-   Maitri
-   Bharati
-   Field Camp A
-   Field Camp B
-   Transport Hub

### Expeditions

At least:

``` text
ANT-2027
Status: Active

ANT-2028
Status: Planning
```

### Personnel

Create fictional personnel.

Do not use real people's private information.

### Inventory

Example:

``` text
Food
Fuel
Medical Supplies
Batteries
Water
Spare Parts
Protective Equipment
```

### Assets

Example:

``` text
Generator
Snow Vehicle
Research Equipment
Communication Unit
Crane
Field Vehicle
```

### Cargo

Create multiple containers with different states:

``` text
Received
In Transit
Delayed
Pending
```

### Emergency

Seed at least:

``` text
One resolved incident
One active medium/high incident
```

------------------------------------------------------------------------

# 41. The Main End-to-End Demo Scenario

The application must support this complete story.

## Scenario

Create:

``` text
Expedition:
ANT-2027
Destination:
Antarctica
Primary Station:
Maitri
```

Add requirements:

``` text
Food 800 kg
Fuel 5000 L
Medicine 150 units
Batteries 100 units
```

Create cargo:

``` text
Container C-001
Food

Container C-002
Fuel

Container C-003
Medicine
```

Dispatch the shipment.

Update tracking:

``` text
Mainland
→ Transit
→ Destination
→ Maitri
```

Receive cargo.

System updates inventory.

Then record consumption:

``` text
Food -20 kg
Fuel -90 L
Medicine -3 units
```

System calculates remaining stock.

Now deliberately create a scenario:

``` text
Medicine:
15 days remaining

Next resupply:
20 days
```

System creates:

``` text
CRITICAL INVENTORY RISK
```

Then create a shipment delay.

System should connect:

``` text
Delayed Shipment
       ↓
Affected Inventory
       ↓
Resupply impact
       ↓
Risk Alert
```

Then create an emergency at a field camp.

System should show:

``` text
Emergency
   ↓
Location
   ↓
Personnel currently there
   ↓
Available assets/resources
   ↓
Assigned responders
   ↓
Incident timeline
```

This is the core demonstration.

------------------------------------------------------------------------

# 42. What the Agent Must NOT Build

Do not turn the project into unrelated features.

Avoid:

-   e-commerce
-   billing
-   social media
-   generic HR software
-   generic hospital management
-   unnecessary chat system
-   cryptocurrency
-   unrelated AI features
-   decorative 3D Antarctica that has no operational purpose

Do not spend most development time on animations.

The core workflow must work first.

------------------------------------------------------------------------

# 43. What Makes This Different From Basic CRUD

The agent must understand this distinction.

### Weak implementation

``` text
Add Item
Edit Item
Delete Item
View Item
```

### Required implementation

``` text
Expedition Requirement
       ↓
Cargo Planning
       ↓
Shipment
       ↓
Tracking
       ↓
Receipt
       ↓
Inventory
       ↓
Consumption
       ↓
Depletion Forecast
       ↓
Risk
       ↓
Operational Action
```

And:

``` text
Personnel Assignment
       ↓
Movement
       ↓
Current Location
       ↓
Emergency
       ↓
Roll Call
       ↓
Resource Availability
       ↓
Response Timeline
```

The second approach actually represents the problem statement.

------------------------------------------------------------------------

# 44. Security Requirements

Implement:

-   JWT authentication
-   password hashing
-   role-based authorization
-   protected routes
-   request validation
-   rate limiting where appropriate
-   secure environment variables
-   safe error responses
-   audit logging
-   input sanitization
-   CORS configuration
-   no secrets in source code

Never expose database credentials or API keys to the frontend.

------------------------------------------------------------------------

# 45. Error Handling

Every page needs:

-   loading state
-   empty state
-   error state
-   retry action
-   success feedback
-   confirmation before destructive operations

Backend errors should have consistent structure.

Example:

``` json
{
  "success": false,
  "message": "Shipment could not be updated",
  "code": "SHIPMENT_UPDATE_FAILED"
}
```

------------------------------------------------------------------------

# 46. Development Strategy for AI Agent

The agent must work incrementally.

## Phase 1 --- Understand existing project

Before changing code:

1.  inspect repository
2.  identify frontend
3.  identify backend
4.  identify database
5.  inspect existing routes
6.  inspect existing components
7.  inspect environment variables
8.  inspect current authentication
9.  inspect current data models
10. identify reusable code

Do not rewrite an existing project blindly.

------------------------------------------------------------------------

## Phase 2 --- Foundation

Implement:

-   authentication
-   roles
-   layout
-   sidebar
-   header
-   theme
-   API client
-   error handling
-   reusable UI components

------------------------------------------------------------------------

## Phase 3 --- Core entities

Implement:

1.  Locations
2.  Expeditions
3.  Personnel
4.  Assets
5.  Inventory Items

------------------------------------------------------------------------

## Phase 4 --- Logistics

Implement:

1.  Shipments
2.  Containers
3.  Manifest
4.  Tracking events
5.  Receiving

------------------------------------------------------------------------

## Phase 5 --- Inventory intelligence

Implement:

1.  transactions
2.  transfers
3.  consumption
4.  stock calculations
5.  depletion forecast
6.  alerts

------------------------------------------------------------------------

## Phase 6 --- Personnel movement

Implement:

1.  assignments
2.  movement records
3.  current location
4.  rotation
5.  deployment status

------------------------------------------------------------------------

## Phase 7 --- Emergency

Implement:

1.  incidents
2.  affected people
3.  resources
4.  responders
5.  action timeline
6.  resolution

------------------------------------------------------------------------

## Phase 8 --- Dashboard & Analytics

Connect all real data.

No hardcoded KPI numbers after backend integration.

------------------------------------------------------------------------

## Phase 9 --- Reports & Audit

Implement:

-   reports
-   audit logs
-   export where useful

------------------------------------------------------------------------

## Phase 10 --- Testing & Demo

Test the full scenario from Section 41.

------------------------------------------------------------------------

# 47. Acceptance Criteria

The project is considered successful only if these workflows work
end-to-end.

## Acceptance Test 1

Create expedition.

Expected:

-   expedition appears on dashboard
-   status is correct
-   manager is assigned
-   station is assigned

## Acceptance Test 2

Create requirement.

Expected:

-   requirement linked to expedition
-   readiness calculation updates

## Acceptance Test 3

Create shipment and container.

Expected:

-   shipment linked to expedition
-   container linked to shipment
-   manifest exists

## Acceptance Test 4

Update cargo tracking.

Expected:

-   timeline updates
-   current status changes
-   history remains visible

## Acceptance Test 5

Receive cargo.

Expected:

-   shipment becomes received
-   inventory increases where applicable
-   transaction is recorded

## Acceptance Test 6

Consume inventory.

Expected:

-   transaction created
-   stock decreases
-   forecast recalculates

## Acceptance Test 7

Create projected shortage.

Expected:

-   risk is automatically detected
-   dashboard alert appears
-   affected expedition/location is shown

## Acceptance Test 8

Move personnel.

Expected:

-   movement event is recorded
-   current location updates
-   history remains available

## Acceptance Test 9

Create emergency.

Expected:

-   incident appears immediately
-   affected location is shown
-   current personnel can be identified
-   available resources can be identified
-   response actions can be recorded

## Acceptance Test 10

Dashboard.

Expected:

All major KPIs reflect actual database records.

------------------------------------------------------------------------

# 48. Quality Rules for the AI Agent

The agent must follow these rules throughout development.

### Rule 1

Do not invent requirements unrelated to the PS.

### Rule 2

Do not remove a working feature without understanding its dependencies.

### Rule 3

Do not replace real backend data with hardcoded mock data after
integration.

### Rule 4

Do not create duplicate models for the same business entity.

### Rule 5

Every important state change should be traceable.

### Rule 6

Every operational module must connect to the expedition/location
context.

### Rule 7

Do not implement AI where deterministic logic is more reliable.

### Rule 8

Do not claim real-time tracking if the prototype is only simulating it.

### Rule 9

Do not claim integration with NCPOR systems unless an actual integration
exists.

### Rule 10

Use fictional demo data unless an official public dataset is explicitly
available and appropriate.

### Rule 11

Keep the system usable without AI.

### Rule 12

Prioritize complete workflows over visual decoration.

------------------------------------------------------------------------

# 49. Definition of Done

The project is done when a user can perform this sequence without manual
database edits:

``` text
Login
  ↓
Create Expedition
  ↓
Add Locations
  ↓
Add Requirements
  ↓
Assign Personnel
  ↓
Register Assets
  ↓
Create Cargo
  ↓
Create Shipment
  ↓
Create Containers + Manifest
  ↓
Dispatch
  ↓
Track Shipment
  ↓
Receive Cargo
  ↓
Inventory Updated
  ↓
Record Consumption
  ↓
Forecast Depletion
  ↓
Generate Risk Alert
  ↓
Move Personnel
  ↓
Create Emergency
  ↓
View Current Roll Call
  ↓
View Available Resources
  ↓
Assign Responders
  ↓
Record Actions
  ↓
Resolve Emergency
  ↓
Generate Expedition Report
```

If this workflow works reliably, the application is directly addressing
the core PS.

------------------------------------------------------------------------

# 50. Final Product Definition

The finished application should feel like:

> **A centralized digital command and logistics platform for planning,
> monitoring and coordinating polar expeditions.**

It should allow an operations team to move from:

``` text
"What are we planning?"
```

to:

``` text
"What has been shipped?"
```

to:

``` text
"Where is it?"
```

to:

``` text
"What have we received?"
```

to:

``` text
"What do we currently have?"
```

to:

``` text
"Will it last until resupply?"
```

to:

``` text
"Where are our people?"
```

to:

``` text
"What is happening in an emergency?"
```

without leaving the platform.

------------------------------------------------------------------------

# 51. Source / Requirement Reference

The official SIH requirement is the source of truth for the five core
domains:

-   expedition planning
-   cargo tracking
-   inventory management
-   personnel movement
-   emergency response

Real-world station context can be grounded using NCPOR's official public
information about Maitri and Bharati.

Do not treat third-party solution ideas as official requirements. They
may inspire implementation, but the official PS remains the authority.

------------------------------------------------------------------------

# 52. AI Agent Instruction --- Start Here

**Before writing code, the AI agent must read this entire document and
create a concise implementation plan based on the existing repository.**

The agent must then:

1.  inspect the current codebase;
2.  identify what already exists;
3.  map existing features to this specification;
4.  identify missing modules;
5.  propose the smallest safe implementation sequence;
6.  implement incrementally;
7.  run the application after meaningful changes;
8.  test affected workflows;
9.  fix errors before moving to the next phase;
10. preserve working functionality.

**Do not build a generic admin dashboard. Build the operational
workflows described in this document.**

**Primary success condition: the application must demonstrate that one
centralized platform can manage the complete expedition lifecycle across
planning, cargo, inventory, assets, personnel and emergency response.**
