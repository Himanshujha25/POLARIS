// POLARIS API smoke test — hits every route group. Run: npm run smoke (server must be running)
const BASE = process.env.BASE || 'http://localhost:5000';
const results = [];
let token = null;
let ids = {};

async function req(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

function check(name, cond, extra = '') {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
}

(async () => {
  // 0. health
  let r = await req('GET', '/api/v1/health', null, false);
  check('health', r.status === 200);

  // 1. auth login (seeded admin)
  r = await req('POST', '/api/v1/auth/login', { username: 'admin', password: 'Test@123' }, false);
  check('auth/login', r.status === 200 && r.data.token, `status=${r.status}`);
  token = r.data.token;

  r = await req('GET', '/api/v1/auth/me');
  check('auth/me', r.status === 200 && r.data.username === 'admin');

  // 2. expeditions
  r = await req('GET', '/api/v1/expeditions');
  check('expeditions/list', r.status === 200 && Array.isArray(r.data) && r.data.length > 0, `count=${r.data?.length}`);
  const expId = r.data[0]._id; ids.expId = expId;

  r = await req('POST', '/api/v1/expeditions', {
    expeditionCode: 'TEST-' + Date.now(), title: 'Smoke Test Exp', targetStation: 'Maitri'
  });
  check('expeditions/create', r.status === 201 && r.data._id, `status=${r.status}`);
  const newExpId = r.data?._id;

  r = await req('GET', `/api/v1/expeditions/${expId}`);
  check('expeditions/dossier', r.status === 200 && r.data.expedition && Array.isArray(r.data.personnel));

  r = await req('PATCH', `/api/v1/expeditions/${newExpId}`, { status: 'InTransit' });
  check('expeditions/patch', r.status === 200 && r.data.status === 'InTransit');

  // 3. personnel
  r = await req('GET', '/api/v1/personnel');
  check('personnel/list', r.status === 200 && r.data.length > 0, `count=${r.data?.length}`);
  const person = r.data.find(p => p.currentStatus === 'FieldResearch') || r.data[0];
  ids.badgeId = person.badgeId;

  r = await req('POST', '/api/v1/personnel/checkin', { badgeId: ids.badgeId });
  check('personnel/checkin', r.status === 200);

  r = await req('POST', '/api/v1/personnel/telemetry', { badgeId: ids.badgeId, lat: -70.77, lng: 11.73, batteryLevelPercent: 80 });
  check('personnel/telemetry', r.status === 200 && !r.data.geofenceBreach, `breach=${r.data?.geofenceBreach}`);

  // geofence breach must trigger inside danger polygon (Bharati crevasse zone)
  r = await req('POST', '/api/v1/personnel/telemetry', { badgeId: ids.badgeId, lat: -69.385, lng: 76.19 });
  check('personnel/geofence-breach', r.status === 200 && !!r.data.geofenceBreach);

  r = await req('GET', '/api/v1/personnel/active-locations');
  check('personnel/active-locations', r.status === 200 && Array.isArray(r.data));

  // 4. cargo (self-sufficient: create first, then operate on it)
  const smokeTracking = 'SMOKE-' + Date.now();
  r = await req('POST', '/api/v1/cargo', {
    trackingNumber: smokeTracking, expeditionId: expId,
    title: 'Smoke Crate', category: 'Provisions', weightKg: 10,
    items: [{ name: 'Smoke Rations', quantity: 20, unit: 'kg' }]
  });
  check('cargo/create', r.status === 201, `status=${r.status}`);
  const cargoId = r.data?._id;

  r = await req('PATCH', `/api/v1/cargo/${cargoId}/stage`, { node: 'Mumbai_Port', location: 'Mumbai Port' });
  check('cargo/stage', r.status === 200 && r.data.currentNode === 'Mumbai_Port');

  r = await req('GET', `/api/v1/cargo/track/${smokeTracking}`);
  check('cargo/track-qr', r.status === 200 && r.data.trackingNumber === smokeTracking);

  // Receive flow: stage to station then receive → inventory + timeline
  await req('PATCH', `/api/v1/cargo/${cargoId}/stage`, { node: 'Maitri_Station', location: 'Maitri Station' });
  r = await req('POST', `/api/v1/cargo/${cargoId}/receive`, { station: 'Maitri' });
  check('cargo/receive-to-inventory', r.status === 200 && r.data.receipts?.length > 0, `status=${r.status}`);
  r = await req('GET', `/api/v1/cargo/${cargoId}/timeline`);
  check('cargo/timeline', r.status === 200 && r.data.length >= 2, `events=${r.data?.length}`);

  // 5. inventory (use the Smoke Rations receipt created above)
  r = await req('GET', '/api/v1/inventory');
  check('inventory/list', r.status === 200 && Array.isArray(r.data));
  let invId = r.data.find(i => i.itemName === 'Smoke Rations')?._id;
  if (!invId) {
    r = await req('POST', '/api/v1/inventory', {
      station: 'Maitri', category: 'Medical', itemName: 'Smoke Kit',
      currentStock: 50, unit: 'Units', minimumSafeThreshold: 30, criticalEmergencyThreshold: 10, dailyConsumptionRate: 2
    });
    check('inventory/create', r.status === 201, `status=${r.status}`);
    invId = r.data?._id;
  }

  r = await req('PATCH', `/api/v1/inventory/${invId}/consume`, { consume: 5 });
  check('inventory/consume', r.status === 200 && r.data.daysRemainingCalculated !== undefined);

  r = await req('GET', '/api/v1/inventory/forecast');
  check('inventory/forecast', r.status === 200 && Array.isArray(r.data) && r.data.length > 0 && r.data[0].daysRemaining !== undefined);

  // 6. assets (create one if none exist)
  r = await req('GET', '/api/v1/assets');
  check('assets/list', r.status === 200 && Array.isArray(r.data));
  let assetId = r.data[0]?._id;
  if (!assetId) {
    r = await req('POST', '/api/v1/assets', {
      assetTag: 'SMOKE-GEN-' + Date.now(), station: 'Maitri', name: 'Smoke Generator',
      type: 'Generator', operatingHours: 100, maxHoursBeforeService: 500
    });
    check('assets/create', r.status === 201, `status=${r.status}`);
    assetId = r.data?._id;
  }

  r = await req('PATCH', `/api/v1/assets/${assetId}/telemetry`, { operatingHours: 490, engineTempC: 85 });
  check('assets/telemetry', r.status === 200);

  r = await req('POST', `/api/v1/assets/${assetId}/maintenance`, { description: 'Smoke service', partsUsed: ['filter'] });
  check('assets/maintenance', r.status === 201 && r.data.asset.condition === 'Operational');

  // 7. alerts
  r = await req('GET', '/api/v1/alerts/active');
  check('alerts/active', r.status === 200 && Array.isArray(r.data), `active=${r.data?.length}`);

  r = await req('POST', '/api/v1/alerts/sos', { badgeId: ids.badgeId, message: 'Smoke SOS test', lat: -70.77, lng: 11.73 });
  check('alerts/sos', r.status === 201 && r.data.type === 'SOS_TRIGGER');
  const sosId = r.data._id;

  r = await req('PATCH', `/api/v1/alerts/${sosId}/acknowledge`);
  check('alerts/acknowledge', r.status === 200 && r.data.isAcknowledged === true);

  r = await req('POST', '/api/v1/alerts/simulate-telemetry', { scenario: 'fuel-drop' });
  check('alerts/simulate-fuel-drop', r.status === 200 && !!r.data.alert, `status=${r.status}`);

  r = await req('POST', '/api/v1/alerts/simulate-telemetry', { scenario: 'deadman-timeout' });
  check('alerts/simulate-deadman', r.status === 200, `status=${r.status}`);

  // PRD gaps: locations, requirements+readiness, incidents lifecycle, txns, movements, search, analytics, audit
  r = await req('POST', '/api/v1/locations', { name: 'Smoke Camp ' + Date.now(), type: 'Camp' });
  check('locations/create', r.status === 201, `status=${r.status}`);
  r = await req('GET', '/api/v1/locations');
  check('locations/list', r.status === 200 && r.data.length > 0);

  r = await req('POST', '/api/v1/requirements', { expeditionId: expId, item: 'Smoke Food', category: 'Provisions', requiredQty: 100, unit: 'kg' });
  check('requirements/create', r.status === 201, `status=${r.status}`);
  const reqId = r.data?._id;
  r = await req('GET', `/api/v1/requirements/readiness/${expId}`);
  check('requirements/readiness', r.status === 200 && r.data.overall !== undefined, `overall=${r.data?.overall}`);

  r = await req('POST', '/api/v1/incidents', { type: 'Supply', severity: 'Medium', location: 'Smoke Camp', description: 'Smoke test incident' });
  check('incidents/create', r.status === 201, `status=${r.status}`);
  const incId = r.data?.incident?._id;
  r = await req('GET', `/api/v1/incidents/${incId}`);
  check('incidents/command-view', r.status === 200 && r.data.timeline && r.data.rollCall, `status=${r.status}`);
  r = await req('POST', `/api/v1/incidents/${incId}/actions`, { description: 'Smoke response action' });
  check('incidents/action', r.status === 201, `status=${r.status}`);
  r = await req('PATCH', `/api/v1/incidents/${incId}/status`, { status: 'Acknowledged' });
  check('incidents/status-flow', r.status === 200 && r.data.status === 'Acknowledged', `status=${r.status}`);
  r = await req('PATCH', `/api/v1/incidents/${incId}/status`, { status: 'Closed' });
  check('incidents/close-needs-summary', r.status === 400, `status=${r.status}`);
  r = await req('PATCH', `/api/v1/incidents/${incId}/status`, { status: 'Closed', resolutionSummary: 'Smoke resolved' });
  check('incidents/close', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/api/v1/inventory/transactions');
  check('inventory/transactions', r.status === 200 && Array.isArray(r.data));
  r = await req('GET', `/api/v1/inventory/forecast`);
  check('inventory/risk-why', r.status === 200 && r.data[0]?.risk !== undefined && r.data[0]?.why !== undefined);

  r = await req('GET', '/api/v1/personnel/movements');
  check('personnel/movements', r.status === 200 && Array.isArray(r.data));

  r = await req('GET', '/api/v1/search?q=SMOKE');
  check('search', r.status === 200 && r.data.cargos !== undefined, `status=${r.status}`);
  r = await req('GET', '/api/v1/reports/analytics/overview');
  check('analytics', r.status === 200 && r.data.cargo !== undefined, `status=${r.status}`);
  r = await req('GET', '/api/v1/audit-logs');
  check('audit-logs', r.status === 200 && Array.isArray(r.data), `count=${r.data?.length}`);
  const rSci = await req('POST', '/api/v1/auth/login', { username: 'rahul', password: 'Test@123' }, false);
  const sciToken = rSci.data.token;
  const old = token; token = sciToken;
  r = await req('POST', '/api/v1/auth/register', { username: 'x', email: 'x@x.in', password: 'Test@123', fullName: 'X', role: 'PersonnelOfficer' });
  check('rbac/register-blocked-for-nonadmin', r.status === 403, `status=${r.status}`);
  token = old;

  if (newExpId) {
    await req('DELETE', `/api/v1/expeditions/${newExpId}`);
  }

  const failed = results.filter(x => !x.pass);
  console.log(`\n==== ${results.length - failed.length}/${results.length} passed ====`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('SMOKE ERROR', e); process.exit(1); });
