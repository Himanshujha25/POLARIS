const mongoose = require('mongoose');

// Hierarchical locations: stations, warehouses, camps, vessels, hubs (#24)
const locationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  type: {
    type: String, required: true,
    enum: ['Station', 'Warehouse', 'Camp', 'Vessel', 'Port', 'Hub', 'Aircraft', 'Temporary', 'Headquarters']
  },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  region: String,
  coordinates: { lat: Number, lng: Number },
  // Optional danger polygon for map + geofence interceptor: array of [lat, lng].
  // Locations carrying a non-empty dangerPolygon are served as map danger zones
  // and evaluated by the geofence engine (DB wins, code constants are fallback).
  dangerPolygon: { type: [[Number]], default: undefined },
  // Days until next resupply window — drives SAFE/RISK forecast (#15)
  nextResupplyDate: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Location', locationSchema);
