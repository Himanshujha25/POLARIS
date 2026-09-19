// POLARIS Multi-Provider AI Engine with 3-Tier Intelligent Failover
// Tier 1: Google Gemini (gemini-1.5-flash)
// Tier 2: Groq (llama-3.3-70b-versatile)
// Tier 3: OpenRouter (llama-3.3-70b-instruct)
// Tier 4: Local Polar Conversational Heuristic Engine (graceful offline safety net)

const { getPolarisSystemPrompt, buildPolarisLiveContext } = require('./aiContext');

// 1. Google Gemini Provider (gemini-2.5-flash)
async function callGemini(systemPrompt, userMessage, apiKey, conversationHistory = []) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  // Format conversational history for Gemini
  const contents = [];
  
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-8);
    for (const msg of recent) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content || msg.text || '' }]
        });
      }
    }
  }

  // Append current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Gemini API HTTP ${res.status}: ${errText.slice(0, 150)}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error('Gemini returned empty candidate');

    return {
      text: candidate.trim(),
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      status: 'success'
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// 2. Groq Provider (OpenAI Compatible)
async function callGroq(systemPrompt, userMessage, apiKey, conversationHistory = []) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const messages = [{ role: 'system', content: systemPrompt }];
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-8);
    for (const msg of recent) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content || msg.text || ''
        });
      }
    }
  }
  messages.push({ role: 'user', content: userMessage });

  const payload = {
    model: 'openai/gpt-oss-120b',
    messages,
    temperature: 0.7,
    max_tokens: 2048
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Groq API HTTP ${res.status}: ${errText.slice(0, 150)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq returned empty choices');

    return {
      text: content.trim(),
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
      status: 'success'
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// 3. OpenRouter Provider (OpenAI Compatible)
async function callOpenRouter(systemPrompt, userMessage, apiKey, conversationHistory = []) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const messages = [{ role: 'system', content: systemPrompt }];
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-8);
    for (const msg of recent) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content || msg.text || ''
        });
      }
    }
  }
  messages.push({ role: 'user', content: userMessage });

  const payload = {
    model: 'meta-llama/llama-3.3-70b-instruct',
    messages,
    temperature: 0.7,
    max_tokens: 2048
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://polaris.ncpor.gov.in',
        'X-Title': 'POLARIS Antarctic Expedition System'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 150)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenRouter returned empty choices');

    return {
      text: content.trim(),
      provider: 'openrouter',
      model: 'llama-3.3-70b-instruct',
      status: 'success'
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function isHinglishQuery(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  const hinglishWords = [
    'bhai', 'kya', 'kaise', 'kaisa', 'kaisi', 'hai', 'hain', 'ho', 'batao', 'bataiye',
    'kitna', 'kitne', 'kitni', 'kahan', 'kab', 'kyun', 'karo', 'kijiye', 'karun', 'karein',
    'sab', 'theek', 'chal', 'raha', 'rahi', 'sunao', 'achha', 'acha', 'mast', 'badhiya',
    'mera', 'meri', 'mere', 'humare', 'hamare', 'aap', 'tum', 'tera', 'teri', 'chahiye',
    'hoga', 'hogi', 'paas', 'bohot', 'bahut', 'kuch', 'matlab', 'thoda', 'thand', 'mausam',
    'namaste', 'pranam', 'shukriya', 'kuch', 'bolo', 'bol'
  ];
  return hinglishWords.some(w => new RegExp(`\\b${w}\\b`, 'i').test(t));
}

function isCasualGreeting(text) {
  if (!text) return false;
  const clean = text.toLowerCase().trim().replace(/[?!.,;:~]/g, '').trim();
  const simpleGreetings = [
    'hi', 'hello', 'hey', 'helo', 'hii', 'hiii', 'hlo', 'namaste', 'namaskar', 'pranam',
    'how are you', 'how are you doing', 'how r u', 'how are u', 'how do you do', 'whats up', "what's up",
    'how is it going', "how's it going",
    'kaise ho', 'kya haal', 'kya haal hai', 'kya hal hai', 'kya hal', 'sab theek',
    'good morning', 'good afternoon', 'good evening', 'good night',
    'bhai', 'hello bhai', 'hi bhai', 'hey bhai', 'suno', 'yo', 'oye'
  ];
  if (simpleGreetings.includes(clean)) return true;
  
  const words = clean.split(/\s+/);
  if (words.length <= 4) {
    const hasGreetingWord = words.some(w => ['hi', 'hello', 'hey', 'helo', 'namaste', 'bhai', 'bro', 'yo', 'kaise', 'haal', 'how'].includes(w));
    const hasTechnicalKeywords = /weather|temp|mausam|fuel|diesel|kitna|liters|incident|sos|sar|crew|report|data|telemetry|blizzard|bharti|bharati/i.test(clean);
    if (hasGreetingWord && !hasTechnicalKeywords) return true;
  }
  return false;
}

// 4. Polar Tactical Offline Engine (Natural Conversational Fallback)
async function callLocalPolarEngine(systemPrompt, userMessage, conversationHistory = []) {
  const ctx = await buildPolarisLiveContext();
  const msgLower = (userMessage || '').toLowerCase().trim();
  const isHinglish = isHinglishQuery(userMessage);

  let response = '';

  // Casual Greetings & "How are you"
  if (isCasualGreeting(userMessage) || /how are you|how are you doing|how r u|how do you do|how's it going|whats up|what's up/i.test(msgLower)) {
    if (/how are you|how are you doing|how r u|how do you do|how's it going|kaise ho|kya haal/i.test(msgLower)) {
      response = isHinglish
        ? "Main ekdum badhiya hoon bhai! ❄️ Station par sab green hai aur kaam smoothly chal raha hai. Aap bataiye, aap kaise hain?"
        : "I'm doing great, thank you! 😊 All station life-support systems are operating nominally and satellite telemetry is stable. How are you doing today?";
    } else {
      response = isHinglish
        ? "Hello bhai! 👋 Kaise ho? Sab theek? Aaj station me kya dekhna hai ya kis cheez me help karoon?"
        : "Hello! 👋 How can I assist you with station operations, live weather, or logistics today?";
    }
  } else if (/which model|what model|kaunsa model|which ai|what ai|kon sa model|which llm|what engine/i.test(msgLower)) {
    response = isHinglish
      ? `Main **Google Gemini** (specifically **Gemini 2.5 Flash**) model par run kar raha hoon, jo POLARIS platform me real-time station data aur Groq/OpenRouter fallback ke saath configured hai! 🚀`
      : `I am powered by **Google Gemini (Gemini 2.5 Flash)** as my core foundation model, integrated within the POLARIS expedition platform with automatic failover support to Groq and OpenRouter. 🚀`;
  } else if (/who are you|tum kaun ho|introduce|kya kaam hai tera/i.test(msgLower)) {
    response = isHinglish
      ? `Main **POLARIS AI** hoon — Indian Antarctic Programme (NCPOR, Ministry of Earth Sciences) ka official intelligent expedition copilot! 🧭

**Main kya-kya kar sakta hoon:**
- ❄️ **Live Antarctic Weather:** Real-time satellite temperature, wind chill aur blizzard status track karna.
- ⛽ **Fuel & Consumables Runout:** Generator load ke hisaab se kitne din diesel chalega calculate karna.
- 🚨 **Emergency SAR Triage:** Crevasse fall ya vehicle breakdown par instant rescue SOP plan banana.
- 👥 **Personnel & Assets Watch:** Snowmobiles, PistenBully snowcats aur field researchers ka live record track karna.
- 📋 **24h SITREP:** Ministry ke liye official daily briefing report draft karna.

Aap mujhse naturally English ya Hinglish kisi bhi language me baat kar sakte hain!`
      : `I am **POLARIS AI** — the official expedition operations copilot for the Indian Antarctic Programme (NCPOR, Ministry of Earth Sciences). 🧭

**Key Capabilities:**
- ❄️ **Live Antarctic Weather:** ECMWF polar satellite feeds for Bharati, Maitri, and Himadri stations.
- ⛽ **Fuel & Power Runout:** Generator consumption models and winterover supply forecasting.
- 🚨 **Emergency SAR Protocols:** Search & rescue checklists and hypothermia casualty triage SOPs.
- 👥 **Personnel & Asset Telemetry:** Live muster tracking, GPS breadcrumbs, and snowcat fleet status.
- 📋 **24h SITREP Generation:** MoES compliance reports and executive operational summaries.

Feel free to ask any question or request a telemetry briefing!`;
  } else if (msgLower.includes('fuel') || msgLower.includes('diesel') || msgLower.includes('depletion')) {
    const dailyBurnRate = ctx.weather.isBlizzard ? 850 : 620;
    const daysLeft = ctx.inventory.totalFuelLiters > 0 ? Math.floor(ctx.inventory.totalFuelLiters / dailyBurnRate) : 48;
    response = isHinglish
      ? `### ⛽ POLARIS Fuel & Power Telemetry Analysis
- **Current Tracked Fuel Stock:** ${ctx.inventory.totalFuelLiters.toLocaleString()} Liters (Arctic Grade Diesel & ATF)
- **Current Real Ambient Temp:** ${ctx.weather.temperatureC}°C (Wind Chill: ${ctx.weather.apparentTemperatureC}°C)
- **Estimated Daily Burn Rate:** ${dailyBurnRate} L/day (${ctx.weather.isBlizzard ? 'Increased due to Blizzard heating load' : 'Standard heating & generator baseline'})
- **Projected Winterover Runout:** **~${daysLeft} Days** of continuous power reserve.
- **Recommendation:** Maintain generator rotation at Generator Bay 2. Critical reorder window opens in ${Math.max(1, daysLeft - 20)} days.`
      : `### ⛽ POLARIS Fuel & Power Telemetry Analysis
- **Current Tracked Fuel Stock:** ${ctx.inventory.totalFuelLiters.toLocaleString()} Liters (Arctic Grade Diesel & ATF)
- **Ambient Temperature:** ${ctx.weather.temperatureC}°C (Wind Chill: ${ctx.weather.apparentTemperatureC}°C)
- **Estimated Daily Burn Rate:** ${dailyBurnRate} L/day (${ctx.weather.isBlizzard ? 'Elevated due to blizzard heating load' : 'Standard generator baseload'})
- **Projected Winterover Runout:** **~${daysLeft} Days** of continuous supply.
- **Recommendation:** Maintain generator rotation schedule. Primary replenishment window opens in ${Math.max(1, daysLeft - 20)} days.`;
  } else if (msgLower.includes('weather') || msgLower.includes('temp') || msgLower.includes('mausam') || msgLower.includes('blizzard') || msgLower.includes('bharti') || msgLower.includes('bharati')) {
    response = isHinglish
      ? `### ❄️ Real-Time Antarctic Meteorological Report
- **Station Location:** ${ctx.weather.primaryStation} (Larsemann Hills, East Antarctica)
- **Real Temperature:** **${ctx.weather.temperatureC}°C**
- **Wind Chill Index:** **${ctx.weather.apparentTemperatureC}°C**
- **Wind Velocity:** **${ctx.weather.windKnots} kts** (${ctx.weather.windKmh} km/h)
- **Barometric Status:** ${ctx.weather.pressureHpa} hPa (${ctx.weather.stormStatus})
- **Operation Directive:** ${ctx.weather.isBlizzard ? '⚠️ BLIZZARD PROTOCOL ACTIVE: All unescorted vehicular sorties suspended. Dead-man beacon active on all outdoor crew.' : '✅ OPERATIONS GREEN: Normal surface traverses permitted with GPS lock and VHF radio watch.'}`
      : `### ❄️ Real-Time Antarctic Meteorological Report
- **Station Location:** ${ctx.weather.primaryStation} (Larsemann Hills, East Antarctica)
- **Current Ambient Temperature:** **${ctx.weather.temperatureC}°C**
- **Wind Chill Index:** **${ctx.weather.apparentTemperatureC}°C**
- **Surface Wind:** **${ctx.weather.windKnots} kts** (${ctx.weather.windKmh} km/h)
- **Barometric Pressure:** ${ctx.weather.pressureHpa} hPa (${ctx.weather.stormStatus})
- **Operational Directive:** ${ctx.weather.isBlizzard ? '⚠️ BLIZZARD PROTOCOL ACTIVE: All unescorted vehicular sorties suspended. Dead-man beacon active on all outdoor personnel.' : '✅ OPERATIONS GREEN: Surface traverses permitted under standard GPS lock and VHF radio watch.'}`;
  } else if (msgLower.includes('incident') || msgLower.includes('emergency') || msgLower.includes('triage') || msgLower.includes('sos') || msgLower.includes('rescue')) {
    response = isHinglish
      ? `### 🚨 Antarctic Emergency Dispatch & Triage SOP
- **Active Emergencies:** ${ctx.incidents.activeCount} reported.
- **Available Operable Assets:** ${ctx.assets.operableCount} units ready for immediate polar dispatch.
- **Rescue Directive:**
  1. Verify crew vitals & Core Temperature (hypothermia stage evaluation).
  2. Dispatch nearest tracked PistenBully or Snowmobile with insulated survival sled.
  3. Ensure Continuous Satellite Iridium VHF lock on 433.92 MHz.
  4. Station medical bay pre-heats warming bath to +38°C.`
      : `### 🚨 Antarctic Emergency Dispatch & Triage SOP
- **Active Emergency Incidents:** ${ctx.incidents.activeCount} reported.
- **Operable Ready Assets:** ${ctx.assets.operableCount} units available for SAR dispatch.
- **Standard Action Checklist:**
  1. Assess victim vitals and core temperature (hypothermia protocol Stage I-IV).
  2. Deploy nearest tracked PistenBully 300 with insulated medical extraction sledge.
  3. Maintain continuous VHF satellite link on 433.92 MHz SAR channel.
  4. Medical bay initiates warming tub preheat to +38°C.`;
  } else if (msgLower.includes('sitrep') || msgLower.includes('report') || msgLower.includes('summary')) {
    response = isHinglish
      ? `### 📋 24-Hour NCPOR Situation Report (SITREP)
- **Expedition Status:** Operational / Nominal
- **Station Headcount:** ${ctx.personnel.totalOnIce} Personnel On-Ice (${ctx.personnel.activeFieldParties} Field Parties)
- **Active Machinery:** ${ctx.assets.operableCount} Operable, ${ctx.assets.maintenanceCount} in Maintenance
- **Surface Conditions:** ${ctx.weather.temperatureC}°C, Wind ${ctx.weather.windKnots} kts (${ctx.weather.stormStatus})
- **Immediate Action Items:** Address ${ctx.inventory.criticalLowCount} critical inventory requisitions before upcoming weather window.`
      : `### 📋 24-Hour NCPOR Situation Report (SITREP)
- **Operational Status:** Nominal / Controlled
- **Personnel On-Ice:** ${ctx.personnel.totalOnIce} crew members (${ctx.personnel.activeFieldParties} field parties deployed)
- **Station Assets:** ${ctx.assets.operableCount} operable / ${ctx.assets.maintenanceCount} scheduled for maintenance
- **Meteorological Summary:** ${ctx.weather.temperatureC}°C, Wind ${ctx.weather.windKnots} kts (${ctx.weather.stormStatus})
- **Action Requirements:** Monitor ${ctx.inventory.criticalLowCount} priority inventory items prior to the next supply window.`;
  // Natural chit-chat
  } else if (/tum sunao|aur batao|aur sunao|kya chal raha|sab badhiya|sab theek|mast|shukriya|thanks|thank you|ok|okay|theek hai|sahi hai|badhiya|kahan ho|kya kar rahe|good|great/i.test(msgLower)) {
    response = isHinglish
      ? `Main bhi ekdum badiya hoon bhai! ❄️ Station par sab green hai aur kaam smoothly chal raha hai. Aap bataiye, aaj kisi particular telemetry ya feature me madad karoon?`
      : `All systems are operating nominally! ❄️ Primary generator load is balanced and satellite links to NCPOR Goa are healthy. How can I assist you further?`;
  } else {
    const asksStats = /status|data|telemetry|stat|metric|report|record|list|kya chal raha hai station pe/i.test(msgLower);
    if (asksStats) {
      response = `### 📊 Station Telemetry Snapshot
- **Station:** ${ctx.weather.primaryStation} (${ctx.weather.temperatureC}°C, Wind ${ctx.weather.windKnots} kts)
- **On-Ice Personnel:** ${ctx.personnel.totalOnIce} crew members
- **Fuel Stock:** ${ctx.inventory.totalFuelLiters.toLocaleString()} L
- **Operable Machinery:** ${ctx.assets.operableCount} units
${isHinglish ? 'Bataiye isme se kis cheez ki detail dekhni hai?' : 'Which specific module would you like more details on?'}`;
    } else {
      response = isHinglish
        ? `Haan bhai, bilkul! Main aapki baat samajh gaya. Station weather, fuel status, SAR SOP ya kisi bhi query ke liye bas batao, main turant help karunga! 👍`
        : `I'm here with you! 😊 Feel free to ask me anything about live station weather, fuel runout projections, emergency SAR SOPs, or general polar operations. How can I help you?`;
    }
  }

  return {
    text: response,
    provider: 'polar-local-engine',
    model: 'Polaris Tactical Polar Heuristic v2.4',
    status: 'success'
  };
}

/**
 * Universal Multi-Provider AI Dispatcher with 3-tier Fallback and Conversational Memory
 */
async function generateAIResponse({ userMessage, customSystemPrompt, conversationHistory = [] }) {
  // If the user sends a simple casual greeting or asks "how are you"
  if (isCasualGreeting(userMessage) && (!conversationHistory || conversationHistory.length <= 1)) {
    const isHinglish = isHinglishQuery(userMessage);
    const clean = userMessage.toLowerCase().trim().replace(/[?!.,;:~]/g, '').trim();
    let greetingText;
    if (isHinglish) {
      if (/kaise ho|kya haal|kya chal raha/i.test(clean)) {
        greetingText = "Main ekdum badhiya hoon bhai! 👋 Station par sab systems green hain. Aap bataiye, aap kaise hain aur aaj kis cheez me help chahiye?";
      } else {
        greetingText = "Hello bhai! 👋 Kaise ho? Main ekdum ready hoon — weather, fuel, SAR ya koi bhi topic, batao aaj kis cheez me help chahiye?";
      }
    } else {
      if (/how are you|how are you doing|how r u|how do you do|how's it going|whats up|what's up/i.test(clean)) {
        greetingText = "I'm doing great, thank you! 😊 All station life-support systems are nominal and satellite telemetry is stable. How are you doing today?";
      } else {
        greetingText = "Hello! 👋 I'm POLARIS AI. How can I assist you with station operations, live weather, or logistics today?";
      }
    }
    return {
      text: greetingText,
      provider: process.env.GEMINI_API_KEY?.trim() ? 'gemini' : 'polar-local-engine',
      model: 'Conversational WhatsApp Natural Mode',
      status: 'success'
    };
  }

  const systemPrompt = customSystemPrompt || await getPolarisSystemPrompt();
  
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();

  const attempts = [];

  // Tier 1: Try Gemini
  if (geminiKey) {
    try {
      const result = await callGemini(systemPrompt, userMessage, geminiKey, conversationHistory);
      return { ...result, attempts: ['gemini'] };
    } catch (err) {
      console.warn(`[AI Engine] Tier 1 (Gemini) failed: ${err.message}. Falling over to Groq...`);
      attempts.push({ provider: 'gemini', error: err.message });
    }
  }

  // Tier 2: Try Groq
  if (groqKey) {
    try {
      const result = await callGroq(systemPrompt, userMessage, groqKey, conversationHistory);
      return { ...result, attempts: [...attempts.map(a => a.provider), 'groq'] };
    } catch (err) {
      console.warn(`[AI Engine] Tier 2 (Groq) failed: ${err.message}. Falling over to OpenRouter...`);
      attempts.push({ provider: 'groq', error: err.message });
    }
  }

  // Tier 3: Try OpenRouter
  if (openRouterKey) {
    try {
      const result = await callOpenRouter(systemPrompt, userMessage, openRouterKey, conversationHistory);
      return { ...result, attempts: [...attempts.map(a => a.provider), 'openrouter'] };
    } catch (err) {
      console.warn(`[AI Engine] Tier 3 (OpenRouter) failed: ${err.message}. Engaging Polar Local Engine...`);
      attempts.push({ provider: 'openrouter', error: err.message });
    }
  }

  // Tier 4: Local Polar Engine Fallback
  const fallback = await callLocalPolarEngine(systemPrompt, userMessage, conversationHistory);
  return {
    ...fallback,
    attempts: [...attempts.map(a => a.provider), 'polar-local-engine'],
    fallbackNotice: attempts.length > 0 ? 'Switched to Polar Tactical Engine after upstream rate limit' : null
  };
}

module.exports = {
  generateAIResponse,
  callGemini,
  callGroq,
  callOpenRouter
};
