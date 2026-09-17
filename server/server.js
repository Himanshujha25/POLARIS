// Convenience entry point so `node server.js` works from the server/ folder.
// Real server code lives in src/server.js — edit that, not this file.
module.exports = require('./src/server.js').start().catch((e) => {
  console.error(e);
  process.exit(1);
});
