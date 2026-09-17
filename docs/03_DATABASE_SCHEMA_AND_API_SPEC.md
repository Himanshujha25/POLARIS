# POLARIS: Database Schema & API Specifications

## 1. MongoDB Data Models & Entities

### 1.1 User & Auth (`users`)
```json
{
  "_id": "ObjectId",
  "username": "String (unique, indexed)",
  "email": "String (unique, indexed)",
  "passwordHash": "String (bcrypt 12 rounds)",
  "fullName": "String",
  "role": "Enum ['SuperAdmin', 'StationCommander', 'LogisticsOfficer', 'InventoryManager', 'FieldScientist']",
  "station": "Enum ['Bharati', 'Maitri', 'Himadri', 'Headquarters_Goa']",
  "bloodGroup": "String",
  "emergencyContact": {
    "name": "String",
    "relation": "String",
    "phone": "String"
  },
  "isActive": "Boolean",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 1.2 Expedition (`expeditions`)
```json
{
  "_id": "ObjectId",
  "expeditionCode": "String (unique, indexed: e.g., '44-IAE')",
  "title": "String",
  "targetStation": "Enum ['Bharati', 'Maitri', 'Himadri', 'Dakshin_Gangotri']",
  "season": "Enum ['Summer_2026_27', 'Winter_2027', 'Special_Cruise']",
  "startDate": "ISODate",
  "endDate": "ISODate",
  "leaderId": "ObjectId (ref: User)",
  "status": "Enum ['Planning', 'InTransit', 'ActiveOnStation', 'Decommissioned', 'Completed']",
  "scientificObjectives": ["String"],
  "totalPersonnelQuota": "Number",
  "cargoCapacityKg": "Number",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 1.3 Personnel & Field Roster (`personnel`)
```json
{
  "_id": "ObjectId",
  "expeditionId": "ObjectId (ref: Expedition, indexed)",
  "userId": "ObjectId (ref: User, indexed)",
  "badgeId": "String (unique)",
  "roleTitle": "String",
  "currentStatus": "Enum ['StationHab', 'FieldResearch', 'InTransit', 'MedicalQuarantine', 'SOS_Alert']",
  "assignedFieldZone": "String",
  "lastCheckIn": "ISODate",
  "expectedReturn": "ISODate",
  "currentCoordinates": {
    "lat": "Number",
    "lng": "Number",
    "altitudeM": "Number",
    "lastPing": "ISODate"
  },
  "vitals": {
    "heartRate": "Number",
    "bodyTempC": "Number",
    "batteryLevelPercent": "Number"
  }
}
```

### 1.4 Cargo & Consignments (`cargos`)
```json
{
  "_id": "ObjectId",
  "trackingNumber": "String (unique, indexed: e.g., 'CRG-2027-BHR-012')",
  "expeditionId": "ObjectId (ref: Expedition, indexed)",
  "title": "String",
  "category": "Enum ['ScientificInstruments', 'HazardousFuel', 'Provisions', 'HeavySpares', 'MedicalLifeSupport']",
  "weightKg": "Number",
  "volumeM3": "Number",
  "isHazmat": "Boolean",
  "currentLocation": "String",
  "currentNode": "Enum ['NCPOR_Goa', 'Mumbai_Port', 'Cape_Town_Hub', 'Research_Vessel', 'Ice_Shelf_Barrier', 'Bharati_Station', 'Maitri_Station']",
  "transportMode": "Enum ['AirFreight', 'VesselCargo', 'HelicopterAirlift', 'PistenBullyConvoy']",
  "status": "Enum ['Staged', 'InTransit', 'DeliveredStation', 'DelayedWeather', 'Damaged']",
  "eta": "ISODate",
  "qrPayload": "String",
  "items": [
    {
      "name": "String",
      "quantity": "Number",
      "unit": "String",
      "serialNumber": "String"
    }
  ]
}
```

### 1.5 Critical Station Inventory (`inventories`)
```json
{
  "_id": "ObjectId",
  "station": "Enum ['Bharati', 'Maitri', 'Himadri']",
  "category": "Enum ['Fuel', 'FoodRations', 'Medical', 'OxygenCylinders', 'RO_Water', 'GeneratorSpares']",
  "itemName": "String",
  "currentStock": "Number",
  "unit": "Enum ['Liters', 'Kilograms', 'Units', 'Cylinders', 'DaysSupply']",
  "minimumSafeThreshold": "Number",
  "criticalEmergencyThreshold": "Number",
  "dailyConsumptionRate": "Number",
  "daysRemainingCalculated": "Number",
  "storageBunker": "String",
  "expiryDate": "ISODate",
  "status": "Enum ['Optimal', 'Warning', 'CriticalDepletion', 'Exhausted']"
}
```

### 1.6 Station Assets & Machinery (`assets`)
```json
{
  "_id": "ObjectId",
  "assetTag": "String (unique, indexed: e.g., 'AST-GEN-04')",
  "station": "Enum ['Bharati', 'Maitri', 'Himadri']",
  "name": "String",
  "type": "Enum ['SnowVehicle', 'Generator', 'SatelliteDish', 'Spectrometer', 'Drone', 'HeloRefueler']",
  "condition": "Enum ['Operational', 'Degraded', 'ScheduledMaintenance', 'EmergencyOffline']",
  "operatingHours": "Number",
  "maxHoursBeforeService": "Number",
  "assignedToPersonnelId": "ObjectId (ref: Personnel)",
  "lastServicedDate": "ISODate",
  "telemetry": {
    "engineTempC": "Number",
    "vibrationLevel": "Number",
    "fuelLevelPercent": "Number",
    "oilPressurePsi": "Number"
  }
}
```

### 1.7 Alerts & Autonomous Incidents (`alerts`)
```json
{
  "_id": "ObjectId",
  "expeditionId": "ObjectId (ref: Expedition)",
  "type": "Enum ['DEADMAN_TIMEOUT', 'GEOFENCE_BREACH', 'CRITICAL_STOCK_DEPLETION', 'CARGO_ETA_SLIP', 'EQUIPMENT_FAULT', 'SOS_TRIGGER']",
  "severity": "Enum ['INFO', 'WARNING', 'CRITICAL', 'DISASTER']",
  "title": "String",
  "message": "String",
  "sourceEntity": "String",
  "sourceId": "ObjectId",
  "coordinates": {
    "lat": "Number",
    "lng": "Number"
  },
  "isAcknowledged": "Boolean",
  "acknowledgedBy": "ObjectId (ref: User)",
  "resolvedAt": "ISODate",
  "createdAt": "ISODate"
}
```

---

## 2. REST API Route Structure

### Auth & User (`/api/v1/auth`)
- `POST /login` - Issue JWT token & user credentials.
- `GET /me` - Current session details & assigned permissions.
- `POST /register` (Admin only) - Provision personnel account.

### Expeditions (`/api/v1/expeditions`)
- `GET /` - List all polar expeditions with active status filters.
- `POST /` - Create new expedition plan (SuperAdmin/Commander).
- `GET /:id` - Comprehensive expedition dossier (personnel roster, cargo overview, station status).
- `PATCH /:id` - Update status, dates, or objectives.

### Personnel & Tracking (`/api/v1/personnel`)
- `GET /` - Filter personnel by expedition, station, or field activity.
- `POST /checkin` - Field team check-in (resets dead-man countdown).
- `POST /telemetry` - Receive GPS coordinates, battery, and vitals.
- `GET /active-locations` - Real-time coordinates of all field personnel.

### Cargo Tracking (`/api/v1/cargo`)
- `GET /` - List cargo shipments with filters (status, node, expedition).
- `POST /` - Register new cargo crate/container with items.
- `PATCH /:id/stage` - Advance cargo waypoint node (e.g., Vessel -> Bharati).
- `GET /track/:trackingNumber` - Public/field QR scan look-up.

### Station Inventory (`/api/v1/inventory`)
- `GET /` - Station inventory breakdown with depletion risk scores.
- `POST /` - Register new inventory line item.
- `PATCH /:id/consume` - Log daily consumption or resupply.
- `GET /forecast` - Consumption projection calculations (days of life support remaining).

### Asset Management (`/api/v1/assets`)
- `GET /` - List station equipment with telemetry health.
- `POST /` - Provision asset tag.
- `PATCH /:id/telemetry` - Update operating hours and engine telemetry.
- `POST /:id/maintenance` - Record maintenance event.

### Emergency & Smart Alerts (`/api/v1/alerts`)
- `GET /active` - Unresolved critical alerts.
- `POST /sos` - Trigger emergency SOS beacon (broadcasts via WebSocket).
- `PATCH /:id/acknowledge` - Commander acknowledges response dispatch.
- `POST /simulate-telemetry` - Test harness for SIH live evaluation demo.
