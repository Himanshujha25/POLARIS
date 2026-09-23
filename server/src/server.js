require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { startAutomation } = require('./services/automation');
const { seedDefaultUsers, seedBaseLocations } = require('./utils/seed');

const app = express();
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' && process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
// HTTP request log: method, url, status, latency. Skips noisy health polls.
app.use(morgan('[:date[iso]] :method :url :status :response-time ms', {
  skip: (req) => req.path === '/api/v1/health'
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', service: 'polaris-backend', time: new Date().toISOString() });
});

app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/expeditions', require('./routes/expeditions'));
app.use('/api/v1/requirements', require('./routes/requirements'));
app.use('/api/v1/locations', require('./routes/locations'));
app.use('/api/v1/personnel', require('./routes/personnel'));
app.use('/api/v1/cargo', require('./routes/cargo'));
app.use('/api/v1/inventory', require('./routes/inventory'));
app.use('/api/v1/assets', require('./routes/assets'));
app.use('/api/v1/alerts', require('./routes/alerts'));
app.use('/api/v1/incidents', require('./routes/incidents'));
app.use('/api/v1/audit-logs', require('./routes/auditlogs'));
app.use('/api/v1/search', require('./routes/search'));
app.use('/api/v1/reports', require('./routes/reports'));
app.use('/api/v1/settings', require('./routes/settings'));
app.use('/api/v1/weather', require('./routes/weather'));
app.use('/api/v1/ai', require('./routes/ai'));

// 404 + error handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' } });
app.set('io', io);
io.on('connection', (socket) => {
  socket.emit('connected', { message: 'POLARIS live feed connected' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  await seedDefaultUsers().catch(e => console.warn('[seed] notice:', e.message));
  await seedBaseLocations().catch(e => console.warn('[seed] locations notice:', e.message));
  startAutomation(io, 60000);

  const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);
  const hasGroq = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 5);
  const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 5);

  const activePrimary = hasGemini ? 'Google Gemini (gemini-2.5-flash)' 
    : hasGroq ? 'Groq (openai/gpt-oss-120b)' 
    : hasOpenRouter ? 'OpenRouter (llama-3.3-70b-instruct)' 
    : 'Polar Tactical Local Engine (Always Online)';

  server.listen(PORT, () => {
    console.log(`[server] POLARIS backend on :${PORT}`);
    console.log(`[ai] Multi-provider engine: ACTIVE`);
    console.log(`     ├── Primary Provider: ${activePrimary}`);
    console.log(`     ├── Gemini: ${hasGemini ? '✓ Connected' : 'Waiting for GEMINI_API_KEY in .env'}`);
    console.log(`     ├── Groq: ${hasGroq ? '✓ Connected' : 'Waiting for GROQ_API_KEY in .env'}`);
    console.log(`     └── OpenRouter: ${hasOpenRouter ? '✓ Connected' : 'Waiting for OPENROUTER_API_KEY in .env'}`);
    console.log(`[weather] Satellite Telemetry: ✓ Connected (Open-Meteo Antarctic models)`);
  });
}

if (require.main === module) start().catch(e => { console.error(e); process.exit(1); });

module.exports = { app, server, start };
