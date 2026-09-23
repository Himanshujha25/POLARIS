const express = require('express');
const router = express.Router();
const { generateAIResponse } = require('../services/aiService');
const { buildPolarisLiveContext } = require('../services/aiContext');
const { authRequired } = require('../middleware/auth');

// GET /api/v1/ai/status - Provider availability & configuration health (Public health check)
router.get('/status', (req, res) => {
  const geminiConfigured = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);
  const groqConfigured = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 5);
  const openRouterConfigured = !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 5);

  let activePrimary = 'polar-local-engine';
  if (geminiConfigured) activePrimary = 'gemini';
  else if (groqConfigured) activePrimary = 'groq';
  else if (openRouterConfigured) activePrimary = 'openrouter';

  res.json({
    status: 'ok',
    primaryProvider: activePrimary,
    fallbackChain: ['gemini', 'groq', 'openrouter', 'polar-local-engine'],
    providers: {
      gemini: { configured: geminiConfigured, model: 'gemini-1.5-flash' },
      groq: { configured: groqConfigured, model: 'llama-3.3-70b-versatile' },
      openrouter: { configured: openRouterConfigured, model: 'llama-3.3-70b-instruct' },
      polarEngine: { configured: true, model: 'Polar Tactical Heuristic v2.4 (Always Online)' }
    }
  });
});

// Protect all generative & analytical AI endpoints with authentication
router.use(authRequired);

// POST /api/v1/ai/chat - Universal Copilot conversational assistant
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const aiResult = await generateAIResponse({
      userMessage: message,
      conversationHistory: Array.isArray(history) ? history : []
    });
    res.json({
      text: aiResult.text,
      provider: aiResult.provider,
      model: aiResult.model,
      attempts: aiResult.attempts,
      fallbackNotice: aiResult.fallbackNotice,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[ai/chat error]', err.message);
    res.status(500).json({ error: 'Failed to process AI query', details: err.message });
  }
});

// POST /api/v1/ai/predictive-depletion - Winterover fuel & consumables predictor
router.post('/predictive-depletion', async (req, res) => {
  try {
    const ctx = await buildPolarisLiveContext();
    const prompt = `Analyze the station's winterover consumable reserves based on real weather conditions:
- Real Temperature: ${ctx.weather.temperatureC}°C (Wind Chill ${ctx.weather.apparentTemperatureC}°C)
- Current Fuel Stock: ${ctx.inventory.totalFuelLiters} L
- Personnel Headcount: ${ctx.personnel.totalOnIce}
- Active Blizzard: ${ctx.weather.isBlizzard}

Provide:
1. Estimated days of fuel supply remaining (accounting for sub-zero generator load).
2. Risk assessment for upcoming winter freeze-in window.
3. 3 specific operational conservation recommendations.`;

    const aiResult = await generateAIResponse({ userMessage: prompt });
    res.json({
      prediction: aiResult.text,
      provider: aiResult.provider,
      model: aiResult.model,
      context: {
        totalFuelLiters: ctx.inventory.totalFuelLiters,
        temperatureC: ctx.weather.temperatureC,
        apparentTemperatureC: ctx.weather.apparentTemperatureC
      }
    });
  } catch (err) {
    console.error('[ai/predictive-depletion error]', err.message);
    res.status(500).json({ error: 'Depletion prediction failed', details: err.message });
  }
});

// POST /api/v1/ai/triage-incident - Emergency action plan & resource dispatch SOP
router.post('/triage-incident', async (req, res) => {
  try {
    const { title, severity, category, locationName, description } = req.body;
    const ctx = await buildPolarisLiveContext();

    const incidentPrompt = `EMERGENCY INCIDENT TRIAGE & RESCUE DISPATCH REQUEST:
- Incident: ${title || 'Distress SOS'}
- Severity Level: ${severity || 'Critical'}
- Category: ${category || 'Medical'}
- Location: ${locationName || 'Field Sector'}
- Field Report: ${description || 'No additional details logged'}
- Real Weather at Base: ${ctx.weather.temperatureC}°C, Wind ${ctx.weather.windKnots} kts (${ctx.weather.stormStatus})
- Available Operable Assets: ${ctx.assets.operableCount} units ready

Generate an immediate Antarctic Emergency SOP Plan:
1. Immediate Medical / Hypothermia Life-Support Action.
2. Vehicle & Equipment Dispatch (Specify snowcat/sled requirements).
3. Satellite Communications & Navigational Protocol.
4. Risk Mitigation for Rescue Crew under current wind and chill conditions.`;

    const aiResult = await generateAIResponse({ userMessage: incidentPrompt });
    res.json({
      sop: aiResult.text,
      provider: aiResult.provider,
      model: aiResult.model,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[ai/triage-incident error]', err.message);
    res.status(500).json({ error: 'Incident triage generation failed', details: err.message });
  }
});

// POST /api/v1/ai/sitrep-summary - 24-Hour NCPOR Executive Situation Report
router.post('/sitrep-summary', async (req, res) => {
  try {
    const { expeditionId } = req.body || {};
    const ctx = await buildPolarisLiveContext();
    const Expedition = require('../models/Expedition');
    let expDetails = '';
    if (expeditionId) {
      const exp = await Expedition.findById(expeditionId).catch(() => null);
      if (exp) {
        expDetails = `\n- Target Mission: ${exp.expeditionCode} (${exp.title}) at ${exp.targetStation || 'Antarctica'}`;
      }
    }

    const prompt = `Generate an official 24-Hour Executive SITREP (Situation Report) for NCPOR Headquarters, Goa & Ministry of Earth Sciences:
- Station: ${ctx.weather.primaryStation}${expDetails}
- Surface Conditions: Temp ${ctx.weather.temperatureC}°C, Wind ${ctx.weather.windKnots} kts, Barometer ${ctx.weather.pressureHpa} hPa
- Station Crew: ${ctx.personnel.totalOnIce} On-Ice (${ctx.personnel.activeFieldParties} in Field)
- Machinery Status: ${ctx.assets.operableCount} Operable / ${ctx.assets.maintenanceCount} in Maintenance
- Open Incidents: ${ctx.incidents.activeCount}
- Fuel Reserves: ${ctx.inventory.totalFuelLiters} L

Format in clean executive headers:
1. Executive Polar Summary
2. Weather & Environmental Window
3. Personnel & Field Sortie Status
4. Critical Supply & Logistics Posture
5. Commander's Operational Directives`;

    const aiResult = await generateAIResponse({ userMessage: prompt });
    res.json({
      sitrep: aiResult.text,
      provider: aiResult.provider,
      model: aiResult.model,
      attempts: aiResult.attempts || [aiResult.provider],
      fallbackNotice: aiResult.fallbackNotice || (aiResult.attempts?.length > 1 ? `Fell back from ${aiResult.attempts[0]} to ${aiResult.provider}` : null),
      date: new Date().toISOString()
    });
  } catch (err) {
    console.error('[ai/sitrep-summary error]', err.message);
    res.status(500).json({ error: 'SITREP generation failed', details: err.message });
  }
});

module.exports = router;
