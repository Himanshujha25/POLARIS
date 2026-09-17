const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

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
