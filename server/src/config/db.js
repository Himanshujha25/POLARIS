const mongoose = require('mongoose');
const dns = require('dns');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Resolve MongoDB Atlas SRV records by setting reliable public DNS servers
if (typeof dns.setServers === 'function') {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (err) {
    // Non-fatal if setting servers fails
  }
}

let memServer = null;

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (uri) {
    try {
      await mongoose.connect(uri);
      console.log('[db] connected to MONGO_URI');
      return;
    } catch (e) {
      console.warn('[db] MONGO_URI failed, falling back to in-memory:', e.message);
    }
  }
  memServer = await MongoMemoryServer.create();
  await mongoose.connect(memServer.getUri());
  console.log('[db] connected to in-memory MongoDB');
}

module.exports = connectDB;
