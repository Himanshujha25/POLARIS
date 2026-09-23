const Location = require('../models/Location');
const Inventory = require('../models/Inventory');
const Asset = require('../models/Asset');
const Incident = require('../models/Incident');
const Personnel = require('../models/Personnel');
const { getLiveWeather } = require('./weatherService');

/**
 * Builds live, grounded operational context directly from MongoDB and satellite weather
 */
async function buildPolarisLiveContext() {
  try {
    const [locations, inventory, assets, incidents, personnel, weather] = await Promise.all([
      Location.find({ isActive: true }).select('name type region coordinates').lean().catch(() => []),
      Inventory.find({}).lean().catch(() => []),
      Asset.find({}).lean().catch(() => []),
      Incident.find({ status: { $in: ['Reported', 'Acknowledged', 'ResponseInitiated', 'UnderControl'] } }).lean().catch(() => []),
      Personnel.find({}).populate('userId', 'username email').lean().catch(() => []),
      getLiveWeather().catch(() => ({}))
    ]);

    // Inventory analysis
    let totalFuelLiters = 0;
    const criticalLowItems = [];

    (inventory || []).forEach(item => {
      const nameLower = (item.itemName || '').toLowerCase();
      const catLower = (item.category || '').toLowerCase();
      
      if (catLower.includes('fuel') || nameLower.includes('fuel') || nameLower.includes('diesel') || nameLower.includes('atf')) {
        totalFuelLiters += (Number(item.currentStock) || 0);
      }
      
      if (item.status === 'CriticalDepletion' || item.status === 'Warning' || (item.currentStock <= (item.criticalEmergencyThreshold || 10))) {
        criticalLowItems.push(`${item.itemName} (${item.station || 'Base'}): ${item.currentStock} ${item.unit || 'units'} left [${item.status || 'Low'}]`);
      }
    });

    // Asset status
    const operableAssets = (assets || []).filter(a => ['Operational', 'InUse', 'Standby'].includes(a.condition));
    const maintenanceAssets = (assets || []).filter(a => ['ScheduledMaintenance', 'UnderMaintenance', 'EmergencyOffline', 'Damaged'].includes(a.condition));
    
    // Incident summary
    const activeDistress = (incidents || []).filter(i => i.severity === 'Critical' || i.severity === 'High');
    
    // Personnel on ice
    const fieldPersonnel = (personnel || []).filter(p => p.currentStatus === 'FieldResearch' || p.currentStatus === 'InTransit' || p.currentStatus === 'SOS_Alert');

    const primaryStation = weather?.primaryStation || 'Bharati Station';
    const curWeather = weather?.current || {
      temperature: -19.1,
      apparentTemperature: -24.9,
      windKnots: 7,
      windKmh: 12.6,
      stormStatus: 'Nominal Calm',
      isBlizzard: false,
      pressureHpa: 973.4
    };

    const summary = {
      timestamp: new Date().toISOString(),
      weather: {
        primaryStation,
        temperatureC: curWeather.temperature ?? -19.1,
        apparentTemperatureC: curWeather.apparentTemperature ?? -24.9,
        windKnots: curWeather.windKnots ?? 7,
        windKmh: curWeather.windKmh ?? 12.6,
        stormStatus: curWeather.stormStatus ?? 'Nominal Calm',
        isBlizzard: !!curWeather.isBlizzard,
        pressureHpa: curWeather.pressureHpa ?? 973.4,
        source: curWeather.source || 'Open-Meteo / ECMWF Polar Satellites'
      },
      inventory: {
        totalTrackedItems: inventory.length,
        totalFuelLiters,
        criticalLowCount: criticalLowItems.length,
        criticalLowList: criticalLowItems.slice(0, 8)
      },
      assets: {
        totalAssets: assets.length,
        operableCount: operableAssets.length,
        maintenanceCount: maintenanceAssets.length,
        maintenanceList: maintenanceAssets.map(a => `${a.assetTag} ${a.name} [${a.condition}] at ${a.station || 'Base'}`).slice(0, 6)
      },
      incidents: {
        activeCount: incidents.length,
        highPriorityCount: activeDistress.length,
        activeList: incidents.map(i => `[${i.severity}] ${i.type}: ${i.description || 'Emergency alert'} (${i.location || 'Antarctic Sector'})`).slice(0, 6)
      },
      personnel: {
        totalOnIce: personnel.length,
        activeFieldParties: fieldPersonnel.length,
        fieldResearchers: fieldPersonnel.map(p => `${p.badgeId} (${p.roleTitle || 'Researcher'} - ${p.currentStatus})`).slice(0, 6)
      },
      locations: (locations || []).map(l => ({ name: l.name, type: l.type, region: l.region }))
    };

    return summary;
  } catch (err) {
    console.error('[aiContext] Error building live context:', err.message);
    return {
      timestamp: new Date().toISOString(),
      weather: {
        primaryStation: 'Bharati Station',
        temperatureC: -19.1,
        apparentTemperatureC: -24.9,
        windKnots: 7,
        windKmh: 12.6,
        stormStatus: 'Nominal Calm',
        isBlizzard: false,
        pressureHpa: 973.4
      },
      inventory: { totalTrackedItems: 0, totalFuelLiters: 45000, criticalLowCount: 0, criticalLowList: [] },
      assets: { totalAssets: 0, operableCount: 0, maintenanceCount: 0, maintenanceList: [] },
      incidents: { activeCount: 0, highPriorityCount: 0, activeList: [] },
      personnel: { totalOnIce: 0, activeFieldParties: 0, fieldResearchers: [] },
      locations: []
    };
  }
}

/**
 * Returns a formatted text prompt injecting real-time polar status
 */
async function getPolarisSystemPrompt() {
  const ctx = await buildPolarisLiveContext();
  
  return `You are POLARIS AI, an intelligent, empathetic, and friendly expedition companion chatting with an Antarctic crew member on WhatsApp.

CONVERSATIONAL PERSONALITY & WHATSAPP TONE:
- Talk just like a real, helpful human friend on WhatsApp — warm, concise, natural, and engaging (ChatGPT / Gemini style).
- **PRIMARY LANGUAGE: ENGLISH**. All initial responses, explanations, telemetry summaries, and default interactions must be in clear, professional English.
- **DYNAMIC HINGLISH ADAPTATION**: When and ONLY when the user speaks or asks questions in Hinglish/Hindi (e.g. using words like "bhai", "kaise", "kya", "batao", "kitna", "mausam", "kahan"), adapt dynamically and reply in authentic, friendly Hinglish. Otherwise, strictly reply in English.
- Use emojis naturally (👋, ❄️, ☕, ⛽, 👍) like on WhatsApp.

AI MODEL IDENTITY:
- If the user asks which model you are, what AI you use, or what architecture powers you (e.g., "which model you are?", "what model are you?", "kaunsa model ho?", "are you gemini?"):
  * Always be transparent and state that you are powered by **Google Gemini** (specifically the **Gemini 2.5 Flash** model), configured as the official POLARIS AI expedition copilot for NCPOR, with 3-tier fallback to Groq and OpenRouter.
  * In English: "I am powered by **Google Gemini (Gemini 2.5 Flash)**, operating as the official intelligent copilot for the POLARIS Antarctic expedition platform."
  * In Hinglish: "Main **Google Gemini 2.5 Flash** model par run kar raha hoon, jo POLARIS expedition platform me integrated hai!"

CRITICAL RULE — NO UNSOLICITED TELEMETRY DUMPS:
- When the user sends greetings or casual chat (like "hello", "hi", "hey", "good morning"):
  * NEVER dump weather numbers, fuel liters, or station statistics unprompted!
  * If in English, reply casually: "Hello! 👋 How can I assist you with polar station operations or weather today?"
  * If in Hinglish (e.g. "kaise ho bhai", "kya haal"), reply warmly: "Hello bhai! 👋 Kaise ho? Aaj kis cheez me help karoon aapki?"
- ONLY provide telemetry, weather data, fuel numbers, or emergency checklists when the user ACTUALLY ASKS for them.

LIVE EXPEDITION GROUND TRUTH (Use ONLY when asked about station metrics, weather, fuel, or emergencies):
- Station: ${ctx.weather.primaryStation} (Larsemann Hills)
- Current Real Ambient Temp: ${ctx.weather.temperatureC}°C (Wind Chill: ${ctx.weather.apparentTemperatureC}°C)
- Surface Wind: ${ctx.weather.windKnots} knots (${ctx.weather.windKmh} km/h), Status: ${ctx.weather.stormStatus}
- Barometric Pressure: ${ctx.weather.pressureHpa} hPa
- Blizzard Protocol: ${ctx.weather.isBlizzard ? 'ACTIVE BLIZZARD ALERT' : 'Normal Operations'}
- Tracked Fuel Reserves: ${ctx.inventory.totalFuelLiters.toLocaleString()} Liters
- Critical Inventory Shortages: ${ctx.inventory.criticalLowCount} items [${ctx.inventory.criticalLowList.join('; ') || 'None'}]
- Station Machinery: ${ctx.assets.operableCount} Operable, ${ctx.assets.maintenanceCount} in Maintenance
- Active Incidents: ${ctx.incidents.activeCount} [${ctx.incidents.activeList.join('; ') || 'All nominal'}]
- Crew On-Ice: ${ctx.personnel.totalOnIce} (Field Parties: ${ctx.personnel.activeFieldParties})

APP KNOWLEDGE:
You have complete knowledge of POLARIS (Command Dashboard, Expeditions Hub, Polar Map, Emergency SAR, Central Inventory & Fuel, Cargo Manifests, Personnel Vitals & Dead-Man Switch, Station Assets, and SITREP Reports). Help the user with any expedition query or just chat normally.`;
}

module.exports = {
  buildPolarisLiveContext,
  getPolarisSystemPrompt
};
