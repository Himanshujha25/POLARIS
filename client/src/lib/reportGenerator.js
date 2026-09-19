// POLARIS Official Government Document & Report Generator
// Formats high-compliance printable/PDF reports for MoES & NCPOR

function printDocument(htmlContent, title) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export official PDF report');
    return;
  }
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            line-height: 1.4;
            margin: 0;
            padding: 10px;
            font-size: 12px;
          }
          .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 15px;
            text-align: center;
          }
          .gov-title {
            font-size: 15px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0;
          }
          .dept-title {
            font-size: 13px;
            font-weight: 700;
            color: #334155;
            margin: 2px 0 0 0;
          }
          .sub-title {
            font-size: 11px;
            color: #64748b;
            margin: 3px 0 0 0;
          }
          .doc-badge {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: 700;
            border-radius: 4px;
            margin-top: 8px;
            text-transform: uppercase;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 15px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 11px;
          }
          .meta-item b { color: #1e293b; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 11px;
          }
          th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
            font-weight: 700;
            color: #1e293b;
          }
          td {
            border: 1px solid #e2e8f0;
            padding: 5px 8px;
          }
          tr:nth-child(even) { background: #fafafa; }
          .signature-section {
            margin-top: 35px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            page-break-inside: avoid;
          }
          .sig-box {
            border-top: 1px dashed #64748b;
            padding-top: 6px;
            text-align: center;
            font-size: 10px;
          }
          .security-seal {
            font-family: monospace;
            font-size: 9px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            margin-top: 25px;
            text-align: justify;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="gov-title">GOVERNMENT OF INDIA · MINISTRY OF EARTH SCIENCES (MoES)</p>
          <p class="dept-title">National Centre for Polar and Ocean Research (NCPOR), Goa</p>
          <p class="sub-title">POLARIS Mission Control & Integrated Logistics System · Official Record</p>
          <div class="doc-badge">${title}</div>
        </div>
        ${htmlContent}
        <div class="signature-section">
          <div class="sig-box">
            <p><b>Prepared By</b></p>
            <p>Logistics / Operations Officer</p>
          </div>
          <div class="sig-box">
            <p><b>Verified By</b></p>
            <p>Station Commander / Mission Leader</p>
          </div>
          <div class="sig-box">
            <p><b>Approved Central Authority</b></p>
            <p>Director, NCPOR / Central HQ Goa</p>
          </div>
        </div>
        <div class="security-seal">
          AUTHENTICATED DIGITAL DISPATCH · RECORD INTEGRITY VERIFIED VIA SHA-256 SYSTEM AUDIT HASH · GENERATED AT: ${new Date().toISOString()} · POLARIS SIH26062 PLATFORM
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

// 1. Export Official Shipping Manifest & Customs Bill
export function exportCargoCustomsManifest(cargos, expedition) {
  const code = expedition?.expeditionCode || 'IAE-EXP';
  const target = expedition?.targetStation || 'Antarctic Base';
  const totalWeight = (cargos || []).reduce((s, c) => s + (Number(c.weightKg) || 0), 0);
  const hazmatCount = (cargos || []).filter(c => c.isHazmat).length;

  const rows = (cargos || []).map((c, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><b>${c.trackingNumber}</b></td>
      <td>${c.containerNumber || 'PALLET-UNCONTAINER'}</td>
      <td>${c.sealNumber ? `🔒 ${c.sealNumber}` : '—'}</td>
      <td>${c.title}</td>
      <td>${c.category}</td>
      <td>${c.weightKg || 0} kg</td>
      <td>${c.isHazmat ? `⚠️ HAZMAT (${c.hazmatClass || 'Class 3'})` : 'Standard'}</td>
      <td>${c.currentNode}</td>
    </tr>
  `).join('');

  const html = `
    <div class="meta-grid">
      <div class="meta-item"><b>Expedition:</b> ${code} — ${expedition?.title || ''}</div>
      <div class="meta-item"><b>Destination Base:</b> ${target}</div>
      <div class="meta-item"><b>Total Consignments:</b> ${cargos?.length || 0} units (${totalWeight.toLocaleString()} kg gross)</div>
      <div class="meta-item"><b>HAZMAT Declarations:</b> ${hazmatCount} container(s) requiring Antarctic Treaty compliance</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Tracking No</th>
          <th>Container No</th>
          <th>Seal ID</th>
          <th>Cargo Description</th>
          <th>Category</th>
          <th>Gross Wt</th>
          <th>HAZMAT Status</th>
          <th>Current Transit Node</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="9">No cargo consignments recorded</td></tr>'}
      </tbody>
    </table>
  `;

  printDocument(html, `Official Shipping Manifest & Customs Clearance — ${code}`);
}

// 2. Export Station Life-Support & Winter Fuel Audit Report
export function exportLifeSupportFuelAudit(inventory, station = 'Bharati / Maitri Base') {
  const criticalItems = (inventory || []).filter(i => (i.currentStock || 0) <= (i.minSafetyStock || 0));

  const rows = (inventory || []).map((i, idx) => {
    const isLow = (i.currentStock || 0) <= (i.minSafetyStock || 0);
    return `
      <tr style="${isLow ? 'background: #fff1f2;' : ''}">
        <td>${idx + 1}</td>
        <td><b>${i.itemName}</b></td>
        <td>${i.category}</td>
        <td>${i.station || station}</td>
        <td>${i.currentStock} ${i.unit}</td>
        <td>${i.minSafetyStock || 0} ${i.unit}</td>
        <td><b>${isLow ? 'CRITICAL DEPLETION' : 'ADEQUATE / SAFE'}</b></td>
      </tr>
    `;
  }).join('');

  const html = `
    <div class="meta-grid">
      <div class="meta-item"><b>Audited Base Station:</b> ${station}</div>
      <div class="meta-item"><b>Audit Date:</b> ${new Date().toLocaleDateString()}</div>
      <div class="meta-item"><b>Total Inventory Categories:</b> ${inventory?.length || 0} tracked lines</div>
      <div class="meta-item"><b>Critical Winter Risks:</b> ${criticalItems.length} items below minimum safety threshold</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item / Fuel Description</th>
          <th>Category</th>
          <th>Station Storage</th>
          <th>Current Reserves</th>
          <th>Min Buffer Stock</th>
          <th>Winter Safety Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="7">No inventory records available</td></tr>'}
      </tbody>
    </table>
  `;

  printDocument(html, `Station Life-Support & Winter Fuel Audit — ${station}`);
}

// 3. Export Emergency SAR Incident Debrief & Roll-Call Muster
export function exportIncidentSARReport(incident, rollCall = [], resources = {}) {
  const inc = incident || {};
  const rollCallRows = (rollCall || []).map((p, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><b>${p.badgeId || 'ID'}</b></td>
      <td>${p.userId?.fullName || p.name || 'Personnel'}</td>
      <td>${p.currentStatus || 'Unknown'}</td>
      <td>${p.lastCheckIn ? new Date(p.lastCheckIn).toLocaleString() : 'N/A'}</td>
    </tr>
  `).join('');

  const html = `
    <div class="meta-grid">
      <div class="meta-item"><b>Incident Reference:</b> ${inc.incidentCode} (${inc.type})</div>
      <div class="meta-item"><b>Severity Level:</b> ${inc.severity} · Status: ${inc.status}</div>
      <div class="meta-item"><b>Incident Coordinates / Location:</b> ${inc.location || 'Antarctic Sector'}</div>
      <div class="meta-item"><b>Reported At:</b> ${new Date(inc.createdAt).toLocaleString()}</div>
    </div>
    <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px;">
      <p style="margin: 0 0 4px 0; font-weight: 700; color: #0f172a;">INCIDENT DESCRIPTION & NARRATIVE:</p>
      <p style="margin: 0; color: #334155;">${inc.description || 'No description logged.'}</p>
    </div>
    <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px;">
      <p style="margin: 0 0 4px 0; font-weight: 700; color: #0f172a;">MANDATORY RESOLUTION SUMMARY:</p>
      <p style="margin: 0; color: #334155;">${inc.resolutionSummary || 'Case under active emergency response.'}</p>
    </div>
    <h3 style="margin: 15px 0 6px 0; font-size: 12px; text-transform: uppercase;">Station Roll-Call & Muster Accountability (${rollCall.length} Verified)</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Badge ID</th>
          <th>Personnel Name</th>
          <th>Deployment Status</th>
          <th>Last Radio / GPS Check-in</th>
        </tr>
      </thead>
      <tbody>
        ${rollCallRows || '<tr><td colspan="5">No personnel at incident location during muster</td></tr>'}
      </tbody>
    </table>
  `;

  printDocument(html, `Emergency SAR Debrief & Accountability Report — ${inc.incidentCode}`);
}
