const express = require('express');
const router = express.Router();
const { getLiveWeather } = require('../services/weatherService');

// GET /api/v1/weather/live - Live real-time Antarctic and Arctic stations weather
router.get('/live', async (req, res) => {
  try {
    const data = await getLiveWeather();
    res.json(data);
  } catch (err) {
    console.error('[weather/live error]', err.message);
    res.status(500).json({ error: 'Failed to fetch live weather telemetry' });
  }
});

module.exports = router;
