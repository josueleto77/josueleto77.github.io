/* OpsBoss — CRM de operaciones para Solar, Roofing y HVAC.
   App de una sola página, sin dependencias. Los datos se guardan en localStorage del navegador. */
(() => {
'use strict';

/* ───────────── Utilidades ───────────── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const money = n => (n < 0 ? '-$' : '$') + Math.abs(Number(n || 0)).toLocaleString('en-US', { maximumFractionDigits: 0 });
const money2 = n => (n < 0 ? '-$' : '$') + Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kmoney = n => Math.abs(n) >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : Math.abs(n) >= 1e4 ? '$' + (n / 1e3).toFixed(1) + 'k' : money(n);
const pct = n => (isFinite(n) ? Math.round(n * 100) : 0) + '%';
const DAY = 864e5;
const sod = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => a && b && sod(a).getTime() === sod(b).getTime();
const iso = d => new Date(d).toISOString();
const ymd = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const hm = d => { const x = new Date(d); return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };
const fDate = d => d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fDay = d => new Date(d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
const fTime = d => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const ago = d => { const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min'; if (s < 86400) return Math.floor(s / 3600) + ' h'; return Math.floor(s / 86400) + ' d'; };
const weekStart = d => { const x = sod(d); const w = (x.getDay() + 6) % 7; return addDays(x, -w); };
const initials = n => String(n || '?').split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
const parseLocal = (dateStr, timeStr = '08:00') => { const [y, m, d] = dateStr.split('-').map(Number); const [h, mi] = timeStr.split(':').map(Number); return new Date(y, m - 1, d, h || 0, mi || 0); };

/* ───────────── Constantes de negocio ───────────── */
const DIV = {
  solar: { name: 'Solar', icon: '☀', color: '#f59e0b' },
  roofing: { name: 'Roofing', icon: '⌂', color: '#b45309' },
  hvac: { name: 'HVAC', icon: '❄', color: '#0ea5e9' },
};
const divPill = d => d && DIV[d] ? `<span class="pill"><span class="div-dot d-${d}"></span>${DIV[d].name}</span>` : '';
const JOB_ST = { unscheduled: ['Unscheduled', 'warn'], scheduled: ['Scheduled', 'info'], enroute: ['On the way', 'brand'], inprogress: ['In progress', 'brand'], completed: ['Completed', 'ok'], cancelled: ['Cancelled', 'bad'] };
const JOB_FLOW = ['unscheduled', 'scheduled', 'enroute', 'inprogress', 'completed'];
const EST_ST = { draft: ['Draft', ''], sent: ['Sent', 'info'], approved: ['Approved', 'ok'], declined: ['Declined', 'bad'] };
const INV_ST = { draft: ['Draft', ''], sent: ['Sent', 'info'], partial: ['Partially paid', 'warn'], paid: ['Paid', 'ok'], overdue: ['Overdue', 'bad'], void: ['Void', ''] };
const STAGES = [['new', 'New'], ['contacted', 'Contacted'], ['visit', 'Appointment Set'], ['proposal', 'Proposal Sent'], ['won', 'Won'], ['lost', 'Lost']];
const SOURCES = ['Google', 'Referral', 'Facebook/Instagram', 'Door to door', 'Website', 'Yelp', 'Event', 'Repeat customer'];
// Valores antiguos (en español) que se migran a inglés al cargar
const SOURCE_EN = { 'Referido': 'Referral', 'Puerta a puerta': 'Door to door', 'Sitio web': 'Website', 'Evento': 'Event', 'Cliente recurrente': 'Repeat customer' };
const srcEN = s => SOURCE_EN[s] || s || '';
const PAY_METHODS = ['Card', 'ACH / Bank transfer', 'Check', 'Cash', 'Financing', 'Zelle'];
const PERMIT_TYPES = ['Building', 'Electrical', 'Roofing', 'Mechanical', 'Utility interconnection', 'PTO (Permission to Operate)', 'HOA'];
const PERMIT_TYPE_EN = { 'Construcción': 'Building', 'Eléctrico': 'Electrical', 'Techado': 'Roofing', 'Mecánico': 'Mechanical', 'Interconexión (utility)': 'Utility interconnection', 'PTO (permiso para operar)': 'PTO (Permission to Operate)' };
const PERMIT_ST = { todo: ['To submit', 'warn'], submitted: ['Submitted', 'info'], approved: ['Approved', 'ok'], inspection: ['Inspection scheduled', 'brand'], passed: ['Inspection passed', 'ok'], rejected: ['Rejected / corrections', 'bad'] };
const CHECKLISTS = {
  solar: ['Site survey and roof photos', 'Utility bill review', 'System design and layout', 'Contract signed', 'Building / electrical permit', 'Interconnection application', 'Equipment order', 'Racking and panel install', 'Inverter / microinverters and conduit', 'City inspection', 'Utility PTO', 'Monitoring activation and customer handoff'],
  roofing: ['Roof inspection and measurement', 'Damage photos (before)', 'Insurance claim / adjuster (if applicable)', 'Roofing permit', 'Material and dumpster delivery', 'Tear-off of existing roof', 'Deck inspection and wood replacement', 'Underlayment, ice & water, flashing', 'Shingle / metal install', 'Magnet sweep cleanup and photos (after)', 'Final inspection', 'Warranty registration'],
  hvac: ['System diagnosis', 'Refrigerant pressure check', 'Coil cleaning', 'Filter change', 'Capacitor and contactor check', 'Thermostat test', 'Supply/return temperature reading', 'Condensate drain check', 'Customer recommendations', 'Photos and customer signature'],
};
const STORE_KEY = 'opsboss.v1';

/* ───────────── Datos ───────────── */
let db;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function seed() {
  const R = rng(42), pick = a => a[Math.floor(R() * a.length)], now = new Date(), ws = weekStart(now);
  const d = {
    settings: { lang: 'en', company: 'Nexis Power', phone: '(555) 210-4400', email: 'office@nexispower.com', address: '1200 Energy Way, Suite 4', license: 'Lic. #C-10 / C-39 / C-20', taxRate: 0, apr: 7.99, term: 120, counters: { est: 1040, job: 2100, inv: 3050 }, terms: 'Payment due within 15 days. Workmanship warranty per contract.' },
    techs: [], customers: [], leads: [], estimates: [], jobs: [], invoices: [], plans: [], permits: [], pricebook: [], activity: [],
  };
  d.techs = [
    { id: 't1', name: 'Carlos Méndez', role: 'Solar install lead', division: 'solar', color: '#f59e0b', phone: '(555) 301-1101' },
    { id: 't2', name: 'Andrea Ruiz', role: 'Solar electrician', division: 'solar', color: '#eab308', phone: '(555) 301-1102' },
    { id: 't3', name: 'Mike Johnson', role: 'Roofing foreman', division: 'roofing', color: '#b45309', phone: '(555) 301-1103' },
    { id: 't4', name: 'Luis Herrera', role: 'Roofer', division: 'roofing', color: '#a16207', phone: '(555) 301-1104' },
    { id: 't5', name: 'Sara Kim', role: 'HVAC technician', division: 'hvac', color: '#0ea5e9', phone: '(555) 301-1105' },
    { id: 't6', name: 'Diego Torres', role: 'HVAC technician', division: 'hvac', color: '#06b6d4', phone: '(555) 301-1106' },
  ];
  d.pricebook = [
    ['solar', '410W monocrystalline solar panel (installed)', 'panel', 820, 430], ['solar', 'Microinverter', 'each', 260, 160], ['solar', '7.6kW string inverter', 'each', 2900, 1800], ['solar', '13.5 kWh battery', 'each', 13500, 9200], ['solar', 'Racking and mounting per panel', 'panel', 95, 45], ['solar', '200A main panel upgrade', 'job', 3200, 1400], ['solar', 'Permits and engineering', 'job', 1200, 600], ['solar', 'Monitoring and app', 'job', 0, 0],
    ['roofing', 'Architectural asphalt shingle (per square)', 'square', 520, 260], ['roofing', 'Standing seam metal roof (per square)', 'square', 1150, 620], ['roofing', 'Tear-off and disposal (per square)', 'square', 95, 40], ['roofing', 'Plywood replacement (sheet)', 'sheet', 85, 38], ['roofing', 'Ice & water shield (roll)', 'roll', 140, 70], ['roofing', 'Ridge vent (linear ft)', 'ft', 12, 5], ['roofing', 'Chimney flashing', 'each', 450, 120], ['roofing', 'Leak repair', 'job', 650, 180], ['roofing', 'Seamless gutters (linear ft)', 'ft', 14, 6],
    ['hvac', 'Diagnostic visit', 'visit', 89, 20], ['hvac', 'AC + heating maintenance', 'visit', 179, 45], ['hvac', 'Dual run capacitor', 'each', 245, 35], ['hvac', 'R-454B refrigerant recharge (lb)', 'lb', 140, 45], ['hvac', 'Smart thermostat installed', 'each', 395, 160], ['hvac', '3 ton 16 SEER2 heat pump (installed)', 'system', 11800, 6900], ['hvac', '4 ton 18 SEER2 split system (installed)', 'system', 15400, 8900], ['hvac', 'Ductless mini-split, 1 zone', 'system', 5200, 2700], ['hvac', 'Duct cleaning', 'job', 550, 150], ['hvac', 'Blower motor', 'each', 690, 220],
  ].map(([division, name, unit, price, cost]) => ({ id: uid(), division, name, unit, price, cost }));
  const people = ['María González', 'James Carter', 'Rosa Martínez', 'Kevin Nguyen', 'Patricia Lopez', 'Robert Williams', 'Elena Vargas', 'David Chen', 'Lucía Fernández', 'Thomas Brown', 'Gabriela Soto', 'Brian Miller', 'Ana Castillo', 'Steven Davis', 'Valeria Rojas', 'Mark Wilson', 'Isabel Moreno', 'Jason Lee'];
  const streets = ['Oak St', 'Maple Ave', 'Sunset Blvd', 'Pine Rd', 'Cedar Ln', 'Willow Dr', 'Elm St', 'Lakeview Ct', 'Highland Ave', 'River Rd'];
  const cities = ['Riverside', 'Corona', 'Ontario', 'Fontana', 'Moreno Valley', 'Rancho Cucamonga'];
  d.customers = people.map((name, i) => ({
    id: 'c' + (i + 1), name, phone: `(555) ${400 + i}-${String(1000 + i * 37).slice(-4)}`, email: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.') + '@mail.com',
    address: `${100 + Math.floor(R() * 8900)} ${pick(streets)}`, city: pick(cities), zip: String(91700 + Math.floor(R() * 200)),
    source: pick(SOURCES), tags: [], createdAt: iso(addDays(now, -Math.floor(R() * 400) - 20)), notes: '',
    property: { roofType: pick(['Asphalt shingle', 'Clay tile', 'Metal', 'Flat / TPO']), roofAge: 5 + Math.floor(R() * 20), sqft: 1400 + Math.floor(R() * 2200), utility: pick(['SCE', 'SDG&E', 'PG&E', 'IID']), avgBill: 120 + Math.floor(R() * 260), stories: R() > .7 ? 2 : 1 },
    equipment: [],
  }));
  const C = d.customers;
  C[2].equipment.push({ id: uid(), type: 'Heat pump', brand: 'Carrier', model: '25VNA4', serial: 'CR2291XK', installed: ymd(addDays(now, -900)), warranty: ymd(addDays(now, 2700)) });
  C[5].equipment.push({ id: uid(), type: 'Solar system 8.2 kW', brand: 'REC / Enphase', model: 'Alpha Pure 410 / IQ8+', serial: 'SYS-55102', installed: ymd(addDays(now, -400)), warranty: ymd(addDays(now, 8700)) });
  C[0].equipment.push({ id: uid(), type: 'AC split 3 ton', brand: 'Trane', model: 'XR16', serial: 'TR88123', installed: ymd(addDays(now, -3200)), warranty: ymd(addDays(now, -100)) });

  const leadDefs = [
    [6, 'solar', 'Solar system + battery', 34000, 'new'], [7, 'roofing', 'Hail damage roof replacement', 18500, 'new'], [8, 'hvac', 'AC not cooling', 450, 'contacted'],
    [9, 'solar', '10 kW solar quote', 29500, 'contacted'], [10, 'roofing', 'Roof leak inspection', 900, 'visit'], [11, 'hvac', 'Full system replacement', 15400, 'visit'],
    [12, 'solar', 'Commercial warehouse solar', 96000, 'proposal'], [13, 'roofing', 'New metal roof', 31000, 'proposal'], [14, 'hvac', 'Garage mini-split', 5200, 'won'],
    [15, 'solar', 'Panels for new home', 24000, 'lost'], [16, 'roofing', 'Gutters and fascia', 3200, 'new'], [17, 'hvac', 'Maintenance plan', 199, 'contacted'],
  ];
  d.leads = leadDefs.map(([ci, division, title, value, stage], i) => ({ id: uid(), customerId: C[ci].id, division, title, value, stage, source: C[ci].source, createdAt: iso(addDays(now, -i * 2 - 1)), next: ymd(addDays(now, (i % 5) - 1)), notes: '' }));

  const mkItems = (division, list) => list.map(([idx, qty]) => { const p = d.pricebook.filter(x => x.division === division)[idx]; return { id: uid(), name: p.name, qty, price: p.price, cost: p.cost }; });
  const estDefs = [
    [0, 'solar', '8.2 kW solar system', 'sent', [[[0, 20], [1, 20], [4, 20], [6, 1]], [[0, 20], [1, 20], [4, 20], [6, 1], [3, 1]]], -3],
    [1, 'roofing', '24-square roof replacement', 'approved', [[[0, 24], [2, 24], [4, 3]], [[1, 24], [2, 24], [4, 3]]], -12],
    [2, 'hvac', 'Heat pump replacement', 'approved', [[[5, 1], [4, 1]], [[6, 1], [4, 1]]], -20],
    [3, 'solar', '6 kW solar + 200A panel', 'draft', [[[0, 15], [1, 15], [4, 15], [5, 1], [6, 1]]], -1],
    [4, 'roofing', 'Leak repair and flashing', 'sent', [[[7, 1], [6, 1]]], -6],
    [5, 'hvac', 'Thermostat + maintenance', 'declined', [[[4, 1], [1, 1]]], -25],
    [6, 'solar', '11 kW solar with battery', 'sent', [[[0, 27], [2, 1], [4, 27], [6, 1]], [[0, 27], [2, 1], [4, 27], [6, 1], [3, 1]]], -9],
    [7, 'hvac', 'Mini-split, 1 zone', 'approved', [[[7, 1]]], -15],
  ];
  const optNames = ['Good', 'Better', 'Best'];
  d.estimates = estDefs.map(([ci, division, title, status, opts, off]) => ({
    id: uid(), number: 'E-' + (++d.settings.counters.est), customerId: C[ci].id, division, title, status, createdAt: iso(addDays(now, off)), validUntil: ymd(addDays(now, off + 30)),
    options: opts.map((items, k) => ({ id: uid(), name: optNames[k], items: mkItems(division, items) })), selected: status === 'approved' ? 0 : null, notes: '', deposit: division === 'solar' ? 10 : division === 'roofing' ? 30 : 0,
  }));
  d.estimates.forEach(e => { if (e.status === 'approved') e.selected = e.options.length - 1; });

  const jobDefs = [
    [1, 'roofing', 'Roof replacement — Carter', ['t3', 't4'], 0, 7, 9, 'inprogress'], [2, 'hvac', 'Heat pump install', ['t5'], 0, 8, 6, 'completed'],
    [0, 'hvac', 'Annual AC maintenance', ['t6'], 0, 13, 1.5, 'scheduled'], [5, 'solar', 'Panel cleaning and inspection', ['t2'], 1, 9, 2, 'scheduled'],
    [8, 'hvac', 'Diagnosis: AC not cooling', ['t6'], 1, 10, 1.5, 'scheduled'], [7, 'hvac', 'Mini-split install', ['t5'], 1, 8, 7, 'scheduled'],
    [9, 'solar', 'Site survey 10 kW', ['t1'], 2, 9, 2, 'scheduled'], [10, 'roofing', 'Roof leak inspection', ['t3'], 2, 14, 1.5, 'scheduled'],
    [11, 'hvac', 'System replacement assessment', ['t5'], 3, 11, 2, 'scheduled'], [12, 'solar', 'Solar install 8.2 kW', ['t1', 't2'], 3, 7, 9, 'scheduled'],
    [13, 'roofing', 'Gutter install', ['t4'], 4, 8, 5, 'scheduled'], [14, 'hvac', 'Membership maintenance', ['t6'], 4, 9, 1.5, 'scheduled'],
    [3, 'solar', 'City solar inspection', ['t2'], -2, 10, 2, 'completed'], [4, 'roofing', 'Leak repair', ['t4'], -1, 9, 3, 'completed'],
    [15, 'hvac', 'Capacitor replacement', ['t5'], -1, 15, 1, 'completed'], [16, 'roofing', 'New roof estimate', [], null, 0, 1.5, 'unscheduled'],
    [17, 'hvac', 'Heating check', [], null, 0, 1.5, 'unscheduled'], [6, 'solar', 'Design and permits 11 kW', [], null, 0, 3, 'unscheduled'],
  ];
  const todayIdx = (now.getDay() + 6) % 7;
  d.jobs = jobDefs.map(([ci, division, title, techIds, dayOff, hour, dur, status]) => {
    let start = null;
    if (dayOff !== null) { const base = addDays(sod(now), dayOff); base.setHours(hour, 0, 0, 0); start = iso(base); }
    const pb = d.pricebook.filter(x => x.division === division);
    const items = division === 'hvac' ? [{ id: uid(), name: pb[1].name, qty: 1, price: pb[1].price, cost: pb[1].cost }] : division === 'roofing' ? [{ id: uid(), name: pb[7].name, qty: 1, price: pb[7].price, cost: pb[7].cost }] : [{ id: uid(), name: pb[6].name, qty: 1, price: pb[6].price, cost: pb[6].cost }];
    const cl = CHECKLISTS[division].map(t => ({ id: uid(), t, done: status === 'completed' }));
    return { id: uid(), number: 'J-' + (++d.settings.counters.job), customerId: C[ci].id, division, title, techIds, start, duration: dur, status, items, checklist: cl, notes: '', photos: [], estimateId: null, createdAt: iso(addDays(now, -5)) };
  });
  void todayIdx; void ws;
  // vincular trabajos con estimados aprobados
  const appr = d.estimates.filter(e => e.status === 'approved');
  appr.forEach(e => { const j = d.jobs.find(j => j.customerId === e.customerId && j.division === e.division); if (j) { j.estimateId = e.id; j.items = e.options[e.selected].items.map(x => ({ ...x, id: uid() })); } });
  d.jobs[0].checklist.forEach((c, i) => c.done = i < 6);

  // facturas históricas (6 meses) para reportes
  const invDefs = [];
  for (let m = 5; m >= 0; m--) {
    const n = 4 + Math.floor(R() * 3);
    for (let k = 0; k < n; k++) {
      const division = pick(['solar', 'roofing', 'hvac', 'hvac']);
      const amt = division === 'solar' ? 18000 + R() * 20000 : division === 'roofing' ? 6000 + R() * 18000 : 180 + R() * 9000;
      const dt = new Date(now.getFullYear(), now.getMonth() - m, 1 + Math.floor(R() * 26));
      if (dt > now) continue;
      invDefs.push({ division, amt: Math.round(amt), dt, ci: Math.floor(R() * C.length) });
    }
  }
  d.invoices = invDefs.map(({ division, amt, dt, ci }, i) => {
    const age = (now - dt) / DAY;
    const paidFull = age > 45 || R() > 0.35;
    const inv = { id: uid(), number: 'F-' + (++d.settings.counters.inv), customerId: C[ci].id, jobId: null, division, items: [{ id: uid(), name: division === 'solar' ? 'Solar system installed' : division === 'roofing' ? 'Roofing work' : 'HVAC service', qty: 1, price: amt, cost: Math.round(amt * (0.5 + R() * 0.15)) }], status: 'sent', createdAt: iso(dt), due: ymd(addDays(dt, 15)), payments: [] };
    if (paidFull) inv.payments.push({ id: uid(), amount: amt, date: iso(addDays(dt, Math.min(age, 3 + Math.floor(R() * 12)))), method: pick(PAY_METHODS) });
    else if (R() > 0.5) inv.payments.push({ id: uid(), amount: Math.round(amt * 0.3), date: iso(addDays(dt, 1)), method: 'Card' });
    void i; return inv;
  });
  // factura del trabajo completado de HVAC
  const doneJob = d.jobs[1];
  d.invoices.push({ id: uid(), number: 'F-' + (++d.settings.counters.inv), customerId: doneJob.customerId, jobId: doneJob.id, division: 'hvac', items: doneJob.items.map(x => ({ ...x, id: uid() })), status: 'draft', createdAt: iso(now), due: ymd(addDays(now, 15)), payments: [] });
  doneJob.invoiceId = d.invoices[d.invoices.length - 1].id;

  d.plans = [
    [0, 'HVAC Comfort Annual', 19, 'month'], [2, 'HVAC Comfort Annual', 19, 'month'], [14, 'HVAC Comfort Premium', 29, 'month'], [5, 'Solar Care (cleaning + monitoring)', 249, 'year'], [11, 'HVAC Comfort Annual', 199, 'year'], [1, 'Roof Shield (annual inspection)', 149, 'year'],
  ].map(([ci, name, price, interval], i) => ({ id: uid(), customerId: C[ci].id, name, price, interval, division: name.includes('HVAC') ? 'hvac' : name.includes('Solar') ? 'solar' : 'roofing', status: 'active', startDate: ymd(addDays(now, -200 - i * 30)), nextVisit: ymd(addDays(now, i * 9 - 6)), visitsPerYear: name.includes('Premium') ? 3 : 2 }));

  const solarJob = d.jobs.find(j => j.title.startsWith('Solar install'));
  const roofJob = d.jobs[0];
  d.permits = [
    { id: uid(), jobId: solarJob.id, type: 'Electrical', jurisdiction: 'City of ' + C[12].city, number: 'BE-26-4471', status: 'approved', submitted: ymd(addDays(now, -18)), updated: ymd(addDays(now, -4)), notes: '' },
    { id: uid(), jobId: solarJob.id, type: 'Utility interconnection', jurisdiction: C[12].property.utility, number: 'NEM-88123', status: 'submitted', submitted: ymd(addDays(now, -10)), updated: ymd(addDays(now, -10)), notes: 'NEM 3.0 / net billing' },
    { id: uid(), jobId: roofJob.id, type: 'Roofing', jurisdiction: 'City of ' + C[1].city, number: 'RF-26-1029', status: 'inspection', submitted: ymd(addDays(now, -9)), updated: ymd(addDays(now, -1)), notes: 'Deck inspection tomorrow' },
    { id: uid(), jobId: d.jobs[17].id, type: 'Building', jurisdiction: 'City of ' + C[6].city, number: '', status: 'todo', submitted: '', updated: ymd(now), notes: 'Missing structural engineering letter' },
    { id: uid(), jobId: d.jobs[12].id, type: 'PTO (Permission to Operate)', jurisdiction: C[3].property.utility, number: 'PTO-55621', status: 'submitted', submitted: ymd(addDays(now, -2)), updated: ymd(addDays(now, -2)), notes: '' },
  ];
  d.activity = [
    ['Payment received from ' + C[4].name, -0.1], ['Estimate ' + d.estimates[0].number + ' sent to ' + C[0].name, -0.3], ['New lead: ' + C[6].name + ' (Solar)', -0.6], ['Job completed: Heat pump install', -1], ['Permit RF-26-1029 inspection scheduled', -1.4],
  ].map(([text, off]) => ({ id: uid(), text, ts: iso(new Date(Date.now() + off * DAY)) }));
  d.workflows = wfTemplates().slice(0, 6).map(t => ({ id: uid(), ...t, active: true, activatedAt: iso(now), createdAt: iso(now), runs: 0, lastRun: null }));
  d.tasks = [
    { id: uid(), title: 'Call ' + C[6].name + ' — Solar system + battery', due: ymd(now), assignee: '', done: false, customerId: C[6].id, link: { kind: 'customer', id: C[6].id }, wf: d.workflows[0].name, createdAt: iso(now) },
    { id: uid(), type: 'message', channel: 'sms', title: 'Send SMS to ' + C[0].name, body: 'Hi ' + C[0].name.split(' ')[0] + ', did you get a chance to review estimate ' + d.estimates[0].number + ' from ' + d.settings.company + '? Happy to answer any questions or walk you through financing options.', due: ymd(now), assignee: '', done: false, customerId: C[0].id, link: { kind: 'estimate', id: d.estimates[0].id }, wf: d.workflows[1].name, createdAt: iso(now) },
    { id: uid(), title: 'Schedule site survey — ' + C[12].name, due: ymd(addDays(now, -1)), assignee: 't1', done: false, customerId: C[12].id, link: { kind: 'customer', id: C[12].id }, wf: d.workflows[2].name, createdAt: iso(addDays(now, -2)) },
    { id: uid(), title: 'Confirm shingle delivery with supplier', due: ymd(addDays(now, 2)), assignee: 't3', done: false, customerId: C[1].id, link: { kind: 'customer', id: C[1].id }, createdAt: iso(now) },
  ];
  return d;
}

function normalize(d) {
  ['customers', 'leads', 'estimates', 'jobs', 'invoices', 'plans', 'permits', 'pricebook', 'techs', 'activity', 'tasks'].forEach(k => d[k] = d[k] || []);
  if (!d.workflows) d.workflows = wfTemplates().slice(0, 6).map(t => wfFromTemplate(t));
  if (d.settings && migrateEn(d)) d._migrated = true;
  return d;
}
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const d = normalize(JSON.parse(raw)); if (d._migrated) { delete d._migrated; localStorage.setItem(STORE_KEY, JSON.stringify(d)); } return d; } } catch (e) { /* sin acceso */ }
  return seed();
}
function save() {
  if (cloud.on) { setSync('saving'); clearTimeout(cloud.timer); cloud.timer = setTimeout(sync, 450); return; }
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { toast('Could not save locally (storage full or blocked).'); }
}
function log(text) { db.activity.unshift({ id: uid(), text, ts: iso(new Date()), by: cloud.user ? cloud.user.email : undefined }); db.activity = db.activity.slice(0, 200); }
function blankDb() { const d = seed(); return { ...d, techs: [], customers: [], leads: [], estimates: [], jobs: [], invoices: [], plans: [], permits: [], activity: [], tasks: [], workflows: d.workflows.map(w => ({ ...w, runs: 0, lastRun: null })) }; }

/* ───────────── Migración de datos a inglés (una sola vez) ───────────── */
const ROOF_EN = { 'Teja asfáltica': 'Asphalt shingle', 'Teja de barro': 'Clay tile', 'Teja de concreto': 'Concrete tile', 'Plano / TPO': 'Flat / TPO', 'Madera': 'Wood shake' };
const PAY_EN = { 'Tarjeta': 'Card', 'ACH / Transferencia': 'ACH / Bank transfer', 'Efectivo': 'Cash', 'Financiamiento': 'Financing', 'Pago en línea (Stripe)': 'Online payment (Stripe)', 'Tarjeta (en línea)': 'Card (online)' };
const ROLE_EN = { 'Líder instalación solar': 'Solar install lead', 'Electricista solar': 'Solar electrician', 'Capataz de techado': 'Roofing foreman', 'Techador': 'Roofer', 'Técnica HVAC': 'HVAC technician', 'Técnico HVAC': 'HVAC technician' };
const PLAN_EN = { 'Confort Anual HVAC': 'HVAC Comfort Annual', 'Confort Premium HVAC': 'HVAC Comfort Premium', 'Solar Care (limpieza + monitoreo)': 'Solar Care (cleaning + monitoring)', 'Roof Shield (inspección anual)': 'Roof Shield (annual inspection)' };
const UNIT_EN = { unidad: 'each', trabajo: 'job', hoja: 'sheet', rollo: 'roll', pie: 'ft', visita: 'visit', sistema: 'system' };
const PB_EN = {
  'Panel solar 410W monocristalino (instalado)': '410W monocrystalline solar panel (installed)', 'Microinversor': 'Microinverter', 'Inversor string 7.6kW': '7.6kW string inverter', 'Batería 13.5 kWh': '13.5 kWh battery', 'Racking y montaje por panel': 'Racking and mounting per panel', 'Actualización de panel eléctrico 200A': '200A main panel upgrade', 'Permisos e ingeniería': 'Permits and engineering', 'Monitoreo y app': 'Monitoring and app',
  'Teja asfáltica arquitectónica (por square)': 'Architectural asphalt shingle (per square)', 'Techo de metal standing seam (por square)': 'Standing seam metal roof (per square)', 'Remoción y disposición (por square)': 'Tear-off and disposal (per square)', 'Reemplazo de plywood (hoja)': 'Plywood replacement (sheet)', 'Ice & water shield (rollo)': 'Ice & water shield (roll)', 'Ventilación de cumbrera (pie lineal)': 'Ridge vent (linear ft)', 'Flashing de chimenea': 'Chimney flashing', 'Reparación de fuga': 'Leak repair', 'Canaletas seamless (pie lineal)': 'Seamless gutters (linear ft)',
  'Visita de diagnóstico': 'Diagnostic visit', 'Mantenimiento AC + calefacción': 'AC + heating maintenance', 'Capacitor dual': 'Dual run capacitor', 'Recarga de refrigerante R-454B (lb)': 'R-454B refrigerant recharge (lb)', 'Termostato inteligente instalado': 'Smart thermostat installed', 'Bomba de calor 3 ton 16 SEER2 (instalada)': '3 ton 16 SEER2 heat pump (installed)', 'Sistema split 4 ton 18 SEER2 (instalado)': '4 ton 18 SEER2 split system (installed)', 'Mini-split ductless 1 zona': 'Ductless mini-split, 1 zone', 'Limpieza de ductos': 'Duct cleaning', 'Motor de ventilador': 'Blower motor',
};
const CHECK_ES = {
  solar: ['Site survey y fotos del techo', 'Revisión de factura eléctrica', 'Diseño y layout del sistema', 'Contrato firmado', 'Permiso de construcción / eléctrico', 'Solicitud de interconexión', 'Pedido de equipos', 'Instalación de racking y paneles', 'Inversor / microinversores y conduit', 'Inspección de la ciudad', 'PTO de la utility', 'Activación del monitoreo y entrega al cliente'],
  roofing: ['Inspección y medición del techo', 'Fotos de daños (antes)', 'Reclamo de seguro / ajustador (si aplica)', 'Permiso de techado', 'Entrega de materiales y dumpster', 'Remoción del techo existente', 'Inspección de deck y reemplazo de madera', 'Underlayment, ice & water, flashing', 'Instalación de tejas / metal', 'Limpieza con imán y fotos (después)', 'Inspección final', 'Registro de garantía'],
  hvac: ['Diagnóstico del sistema', 'Revisión de presión de refrigerante', 'Limpieza de serpentines', 'Cambio de filtro', 'Revisión de capacitores y contactores', 'Prueba de termostato', 'Medición de temperatura de suministro/retorno', 'Revisión de drenaje de condensado', 'Recomendaciones al cliente', 'Fotos y firma del cliente'],
};
const OPT_EN = { 'Bueno': 'Good', 'Mejor': 'Better', 'Óptimo': 'Best' };
const TERMS_ES = 'Pago debido a 15 días. Garantía de mano de obra según contrato.';
// Traduce los valores por defecto que venían en español. Devuelve true si cambió algo.
function migrateEn(d) {
  if (!d || !d.settings || d.settings.lang === 'en') return false;
  const tr = (map, v) => (v != null && map[v]) || v, tpls = wfTemplates();
  d.customers.forEach(c => { c.source = srcEN(c.source); if (c.property) c.property.roofType = tr(ROOF_EN, c.property.roofType); });
  d.leads.forEach(l => { l.source = srcEN(l.source); });
  d.permits.forEach(p => { p.type = tr(PERMIT_TYPE_EN, p.type); });
  d.pricebook.forEach(p => { p.name = tr(PB_EN, p.name); p.unit = tr(UNIT_EN, p.unit); });
  d.techs.forEach(t => { t.role = tr(ROLE_EN, t.role); });
  d.plans.forEach(p => { p.name = tr(PLAN_EN, p.name); });
  d.invoices.forEach(i => (i.payments || []).forEach(p => { p.method = tr(PAY_EN, p.method); }));
  d.jobs.forEach(j => (j.checklist || []).forEach(c => { const k = (CHECK_ES[j.division] || []).indexOf(c.t); if (k >= 0) c.t = CHECKLISTS[j.division][k]; }));
  d.estimates.forEach(e => (e.options || []).forEach(o => { o.name = tr(OPT_EN, o.name); }));
  const TASK_ES = [[/^Enviar SMS a /, 'Send SMS to '], [/^Enviar email a /, 'Send email to '], [/^Llamar para cobrar /, 'Collections call for '], [/^Llamar a /, 'Call '], [/^Dar seguimiento al estimado (\S+) de /, 'Follow up on estimate $1 for '], [/^Agendar site survey — /, 'Schedule site survey — '], [/^Diseño y paquete de permisos — /, 'Design and permit package — '], [/^Enviar solicitud de interconexión — /, 'Submit interconnection application — '], [/^Solicitar permiso de techado — /, 'Apply for roofing permit — '], [/^Ordenar materiales y dumpster — /, 'Order materials and dumpster — '], [/^Agendar visita de membresía — /, 'Schedule membership visit — '], [/^Reactivar lead estancado: /, 'Revive stale lead: '], [/^Confirmar entrega de tejas con proveedor$/, 'Confirm shingle delivery with supplier']];
  d.tasks.forEach(t => { for (const [re, en] of TASK_ES) t.title = String(t.title || '').replace(re, en); if (t.wf) { const k = WF_TEMPLATE_ES.indexOf(t.wf); if (k >= 0) t.wf = tpls[k].name; } });
  d.workflows.forEach(w => { const k = WF_TEMPLATE_ES.indexOf(w.name); if (k >= 0) { const t = tpls[k]; Object.assign(w, { name: t.name, trigger: { ...t.trigger, days: w.trigger.days ?? t.trigger.days }, cond: { ...t.cond }, actions: JSON.parse(JSON.stringify(t.actions)) }); } else if (w.cond && w.cond.source) w.cond.source = srcEN(w.cond.source); });
  if (d.settings.terms === TERMS_ES) d.settings.terms = 'Payment due within 15 days. Workmanship warranty per contract.';
  d.settings.lang = 'en';
  return true;
}

/* ───────────── Nube (Supabase) ───────────── */
const CFG = window.OPSBOSS_CONFIG || {};
const COLLS = ['customers', 'leads', 'estimates', 'jobs', 'invoices', 'plans', 'permits', 'pricebook', 'techs', 'activity', 'workflows', 'tasks'];
const TABLE = 'opsboss_records';
const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', office: 'Office', tech: 'Technician' };
const cloud = { on: false, sb: null, user: null, role: null, shadow: new Map(), timer: null, busy: false, again: false, pendingRender: false };
const canon = v => JSON.stringify(v, (k, val) => val && typeof val === 'object' && !Array.isArray(val) ? Object.keys(val).sort().reduce((o, key) => (o[key] = val[key], o), {}) : val);
const SEP = '\u0001';
function snapshot() {
  const m = new Map();
  COLLS.forEach(c => (db[c] || []).forEach(r => { if (r && r.id) m.set(c + SEP + r.id, canon(r)); }));
  if (db.settings) m.set('settings' + SEP + 'main', canon(db.settings));
  return m;
}
function setSync(st, msg) {
  const el = $('#syncStatus'); if (!el) return;
  const txt = { ok: 'Synced', saving: 'Saving…', error: 'Sync error', local: 'Local mode', offline: 'Offline' }[st];
  el.className = 'sync ' + st; el.textContent = txt; el.title = msg || txt;
}
async function sync() {
  if (!cloud.on) return;
  if (cloud.busy) { cloud.again = true; return; }
  cloud.busy = true; setSync('saving');
  try {
    const cur = snapshot(), ups = [], dels = {};
    for (const [k, v] of cur) if (cloud.shadow.get(k) !== v) { const [coll, id] = k.split(SEP); ups.push({ coll, id, data: JSON.parse(v), _k: k, _v: v }); }
    for (const k of cloud.shadow.keys()) if (!cur.has(k)) { const [coll, id] = k.split(SEP); (dels[coll] = dels[coll] || []).push(id); }
    for (let i = 0; i < ups.length; i += 200) {
      const chunk = ups.slice(i, i + 200);
      const { error } = await cloud.sb.from(TABLE).upsert(chunk.map(({ coll, id, data }) => ({ coll, id, data })));
      if (error) throw error;
      chunk.forEach(u => cloud.shadow.set(u._k, u._v));
    }
    for (const [coll, ids] of Object.entries(dels)) for (let i = 0; i < ids.length; i += 200) {
      const part = ids.slice(i, i + 200);
      const { error } = await cloud.sb.from(TABLE).delete().eq('coll', coll).in('id', part);
      if (error) throw error;
      part.forEach(id => cloud.shadow.delete(coll + SEP + id));
    }
    setSync('ok');
  } catch (e) {
    console.error('OpsBoss sync', e);
    setSync(navigator.onLine === false ? 'offline' : 'error', e.message || String(e));
    clearTimeout(cloud.timer); cloud.timer = setTimeout(sync, 5000);
  } finally {
    cloud.busy = false;
    if (cloud.again) { cloud.again = false; sync(); }
  }
}
async function cloudLoad() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await cloud.sb.from(TABLE).select('coll,id,data').order('coll').order('id').range(from, from + 999);
    if (error) throw error;
    rows.push(...data); if (data.length < 1000) break;
  }
  const d = { settings: null }; COLLS.forEach(c => d[c] = []);
  rows.forEach(r => { if (r.coll === 'settings') d.settings = r.data; else if (d[r.coll]) d[r.coll].push(r.data); });
  const by = k => (a, b) => String(b[k] || '').localeCompare(String(a[k] || ''));
  ['customers', 'leads', 'estimates', 'jobs', 'invoices'].forEach(c => d[c].sort(by('createdAt')));
  d.activity.sort(by('ts'));
  d.pricebook.sort((a, b) => a.division.localeCompare(b.division) || a.name.localeCompare(b.name));
  d.techs.sort((a, b) => a.name.localeCompare(b.name));
  return { d, count: rows.length };
}
function applyRemote(p) {
  const rec = p.eventType === 'DELETE' ? p.old : p.new; if (!rec || !rec.coll) return;
  const { coll, id } = rec, key = coll + SEP + id;
  if (p.eventType === 'DELETE') {
    if (!cloud.shadow.has(key)) return;
    cloud.shadow.delete(key);
    if (coll !== 'settings' && db[coll]) db[coll] = db[coll].filter(x => x.id !== id);
  } else {
    const v = canon(p.new.data); if (cloud.shadow.get(key) === v) return;
    cloud.shadow.set(key, v);
    if (coll === 'settings') db.settings = p.new.data;
    else if (db[coll]) { const i = db[coll].findIndex(x => x.id === id); if (i >= 0) db[coll][i] = p.new.data; else db[coll].unshift(p.new.data); }
  }
  remoteRender();
  clearTimeout(cloud.pp); cloud.pp = setTimeout(processPortal, 800);
}
function remoteRender() {
  const busy = $('#modalRoot').children.length || (document.activeElement && document.activeElement.closest('#view') && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  if (busy) { clearTimeout(cloud.rr); cloud.rr = setTimeout(remoteRender, 1500); return; }
  render();
}
function subscribe() {
  if (cloud.channel) cloud.sb.removeChannel(cloud.channel);
  cloud.channel = cloud.sb.channel('opsboss-records')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, applyRemote)
    .subscribe(st => { if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setSync('error', 'Live updates disconnected; reload to see teammates’ changes.'); });
}


/* ───────────── Cálculos ───────────── */
const cust = id => db.customers.find(c => c.id === id) || { name: '(deleted customer)', id: '' };
const tech = id => db.techs.find(t => t.id === id);
const subtotal = items => (items || []).reduce((s, i) => s + num(i.qty) * num(i.price), 0);
const costOf = items => (items || []).reduce((s, i) => s + num(i.qty) * num(i.cost), 0);
const taxOf = items => subtotal(items) * num(db.settings.taxRate) / 100;
const totalOf = items => subtotal(items) + taxOf(items);
const invTotal = inv => totalOf(inv.items);
const invPaid = inv => (inv.payments || []).reduce((s, p) => s + num(p.amount), 0);
const invBal = inv => Math.max(0, invTotal(inv) - invPaid(inv));
const invStatus = inv => {
  if (inv.status === 'void') return 'void';
  if (inv.status === 'draft') return 'draft';
  if (invTotal(inv) > 0 && invBal(inv) <= 0.009) return 'paid';
  if (sod(parseLocal(inv.due)) < sod(new Date())) return 'overdue';
  if (invPaid(inv) > 0) return 'partial';
  return 'sent';
};
const estTotal = (e, k) => { const o = e.options[k ?? (e.selected ?? 0)] || e.options[0]; return o ? totalOf(o.items) : 0; };
const estMax = e => Math.max(0, ...e.options.map(o => totalOf(o.items)));
const monthly = (P, apr, n) => { const r = apr / 1200; return r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n; };
const jobEnd = j => j.start ? new Date(new Date(j.start).getTime() + num(j.duration) * 36e5) : null;
const divOK = x => state.div === 'all' || x.division === state.div;
const custLTV = id => db.invoices.filter(i => i.customerId === id && i.status !== 'void').reduce((s, i) => s + invPaid(i), 0);
const custBal = id => db.invoices.filter(i => i.customerId === id && !['void', 'draft'].includes(i.status)).reduce((s, i) => s + invBal(i), 0);
const allPayments = () => db.invoices.flatMap(i => (i.payments || []).map(p => ({ ...p, division: i.division, inv: i })));
const nextNum = k => { const p = { est: 'E-', job: 'J-', inv: 'INV-' }[k], coll = { est: 'estimates', job: 'jobs', inv: 'invoices' }[k]; const max = Math.max(db.settings.counters[k] || 0, ...db[coll].map(x => parseInt(String(x.number || '').replace(/\D/g, ''), 10) || 0)); db.settings.counters[k] = max + 1; return p + (max + 1); };

/* ───────────── Estado UI ───────────── */
const state = { div: 'all', week: weekStart(new Date()), tabs: {}, filters: {} };
try { state.div = localStorage.getItem('opsboss.div') || 'all'; } catch (e) { /* ignore */ }

/* ───────────── UI: toast, modal ───────────── */
function toast(msg) { const r = $('#toastRoot'); while (r.children.length >= 3) r.firstChild.remove(); const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; r.appendChild(t); setTimeout(() => t.remove(), 3200); }
function modal({ title, body, foot = '', wide = false, onMount }) {
  const root = $('#modalRoot');
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-h"><h2>${title}</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div><div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
  root.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
  bg.querySelector('[data-close]').onclick = close;
  $$('[data-dismiss]', bg).forEach(b => b.onclick = close);
  const f = bg.querySelector('input,select,textarea'); if (f) setTimeout(() => f.focus(), 30);
  onMount && onMount(bg, close);
  return { el: bg, close };
}
function field(f) {
  const v = f.value ?? '';
  const cls = f.full ? 'f full' : 'f';
  if (f.type === 'select') return `<label class="${cls}">${f.label}<select name="${f.k}">${f.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select></label>`;
  if (f.type === 'textarea') return `<label class="${cls}">${f.label}<textarea name="${f.k}">${esc(v)}</textarea></label>`;
  return `<label class="${cls}">${f.label}<input name="${f.k}" type="${f.type || 'text'}" value="${esc(v)}" ${f.step ? `step="${f.step}"` : ''} ${f.required ? 'required' : ''} ${f.list ? `list="${f.list}"` : ''} placeholder="${esc(f.ph || '')}"></label>`;
}
function form({ title, fields, onSave, saveLabel = 'Save', cancelLabel = 'Cancel', extraFoot = '', wide }) {
  return modal({
    title, wide,
    body: `<form class="form" id="mform">${fields.map(field).join('')}<button type="submit" hidden></button></form>`,
    foot: `${extraFoot}<button class="btn" data-dismiss>${cancelLabel}</button><button class="btn primary" data-save>${saveLabel}</button>`,
    onMount(bg, close) {
      const submit = e => {
        e && e.preventDefault();
        const vals = {}; $$('[name]', bg).forEach(i => vals[i.name] = i.type === 'number' ? num(i.value) : i.value.trim());
        for (const f of fields) if (f.required && !vals[f.k]) { toast(`"${f.label}" is required`); return; }
        if (onSave(vals, bg) !== false) { close(); save(); render(); }
      };
      $('#mform', bg).addEventListener('submit', submit);
      $('[data-save]', bg).onclick = submit;
    },
  });
}
const custOptions = () => [...db.customers].sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.id, c.name]);
const divOptions = () => Object.entries(DIV).map(([k, v]) => [k, v.name]);
const techOptions = () => [['', '— Unassigned —'], ...db.techs.map(t => [t.id, t.name])];
const confirmDlg = (msg, yes) => { return modal({ title: 'Confirm', body: `<p>${msg}</p>`, foot: `<button class="btn" data-dismiss>Cancel</button><button class="btn primary" id="cfYes">Confirm</button>`, onMount(bg, close) { $('#cfYes', bg).onclick = () => { close(); yes(); save(); render(); }; } }); };

/* ───────────── Navegación ───────────── */
const NAV = [
  ['sec', 'Operations'], ['dashboard', '◧', 'Dashboard'], ['tasks', '☑', 'Tasks'], ['schedule', '▦', 'Schedule & Dispatch'], ['pipeline', '⇶', 'Sales Pipeline'], ['customers', '☺', 'Customers'],
  ['sec', 'Sales & Jobs'], ['estimates', '✎', 'Estimates'], ['jobs', '⚒', 'Jobs'], ['invoices', '$', 'Invoices & Payments'], ['plans', '↻', 'Memberships'],
  ['sec', 'Projects'], ['permits', '⚑', 'Permits & Inspections'], ['tools', '∑', 'Calculators'],
  ['sec', 'Business'], ['workflows', '⚡', 'Workflows'], ['reports', '▤', 'Reports'], ['pricebook', '☰', 'Price Book'], ['team', '◎', 'Team'], ['settings', '⚙', 'Settings'],
];
function renderNav() {
  const route = (location.hash.slice(2) || 'dashboard').split('/')[0];
  const parentOf = { customer: 'customers', estimate: 'estimates', job: 'jobs', invoice: 'invoices' };
  const active = parentOf[route] || route;
  const badges = { tasks: (db.tasks || []).filter(t => !t.done && t.due <= ymd(new Date())).length, schedule: db.jobs.filter(j => j.status === 'unscheduled').length, invoices: db.invoices.filter(i => invStatus(i) === 'overdue').length, pipeline: db.leads.filter(l => l.stage === 'new').length, permits: db.permits.filter(p => ['todo', 'rejected'].includes(p.status)).length };
  $('#nav').innerHTML = NAV.map(n => n[0] === 'sec' ? `<div class="sec">${n[1]}</div>` : `<a href="#/${n[0]}" class="${active === n[0] ? 'active' : ''}"><span class="ic">${n[1]}</span>${n[2]}${badges[n[0]] ? `<span class="badge">${badges[n[0]]}</span>` : ''}</a>`).join('');
  $('#divFilter').innerHTML = [['all', 'All'], ...divOptions()].map(([k, v]) => `<button data-div="${k}" class="${state.div === k ? 'on' : ''}">${k !== 'all' ? `<span class="div-dot d-${k}"></span> ` : ''}${v}</button>`).join('');
}
const ROUTES = {};
function render() {
  const [route, id] = (location.hash.slice(2) || 'dashboard').split('/');
  renderNav();
  const fn = ROUTES[route] || ROUTES.dashboard;
  $('#view').innerHTML = fn(id) || '';
  const after = ROUTES[route + ':after']; after && after(id);
  $('#sidebar').classList.remove('open');
}
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

/* ───────────── Componentes ───────────── */
const pill = (map, k) => map[k] ? `<span class="pill ${map[k][1]}">${map[k][0]}</span>` : '';
const avatar = t => t ? `<span class="avatar" style="background:${t.color}" title="${esc(t.name)}">${initials(t.name)}</span>` : '';
const head = (title, sub, actions = '') => `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="row">${actions}</div></div>`;
const kpi = (l, v, s = '') => `<div class="card kpi"><div class="l">${l}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
const custLink = id => { const c = cust(id); return `<a href="#/customer/${c.id}" onclick="event.stopPropagation()">${esc(c.name)}</a>`; };
function itemsTable(items, editable, ctx) {
  const rows = items.map((it, i) => editable ? `<tr><td><input data-li="${ctx}" data-i="${i}" data-f="name" value="${esc(it.name)}"></td><td style="width:80px"><input data-li="${ctx}" data-i="${i}" data-f="qty" type="number" step="any" value="${it.qty}"></td><td style="width:120px"><input data-li="${ctx}" data-i="${i}" data-f="price" type="number" step="any" value="${it.price}"></td><td class="right b" style="width:110px">${money2(num(it.qty) * num(it.price))}</td><td style="width:36px"><button class="btn ghost sm danger" data-act="liDel" data-ctx="${ctx}" data-i="${i}" title="Remove">✕</button></td></tr>`
    : `<tr><td>${esc(it.name)}</td><td class="right">${it.qty}</td><td class="right">${money2(it.price)}</td><td class="right b">${money2(num(it.qty) * num(it.price))}</td></tr>`).join('');
  const sub = subtotal(items), tax = taxOf(items), cost = costOf(items);
  return `<div class="table-wrap"><table class="line-items"><thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Total</th>${editable ? '<th></th>' : ''}</tr></thead><tbody>${rows || `<tr><td colspan="5" class="muted">No line items yet.</td></tr>`}</tbody></table></div>
  ${editable ? `<div class="row mt"><button class="btn sm" data-act="liAdd" data-ctx="${ctx}">＋ Line</button><button class="btn sm" data-act="liBook" data-ctx="${ctx}">☰ From price book</button></div>` : ''}
  <div style="display:flex;justify-content:flex-end;margin-top:12px"><table style="width:auto;min-width:260px"><tr><td class="muted">Subtotal</td><td class="right">${money2(sub)}</td></tr>${num(db.settings.taxRate) ? `<tr><td class="muted">Tax (${db.settings.taxRate}%)</td><td class="right">${money2(tax)}</td></tr>` : ''}<tr><td class="b">Total</td><td class="right b" style="font-size:17px">${money2(sub + tax)}</td></tr>${editable && sub ? `<tr class="no-print"><td class="muted small">Gross margin</td><td class="right small ${sub - cost >= 0 ? 'up' : 'down'}">${money(sub - cost)} · ${pct((sub - cost) / sub)}</td></tr>` : ''}</table></div>`;
}
// contexto de líneas editables: "est:<id>:<opt>" | "job:<id>" | "inv:<id>"
function liTarget(ctx) {
  const [k, id, o] = ctx.split(':');
  if (k === 'est') return db.estimates.find(e => e.id === id).options[+o].items;
  if (k === 'job') return db.jobs.find(j => j.id === id).items;
  if (k === 'inv') return db.invoices.find(i => i.id === id).items;
}
function bookPicker(division, onPick) {
  const list = db.pricebook.filter(p => !division || p.division === division);
  modal({
    title: 'Add from price book', wide: true,
    body: `<input class="inp" id="pbq" placeholder="Search items…"><div class="table-wrap mt"><table><thead><tr><th>Item</th><th>Division</th><th>Unit</th><th class="right">Price</th><th></th></tr></thead><tbody id="pbl"></tbody></table></div>`,
    onMount(bg, close) {
      const draw = q => { $('#pbl', bg).innerHTML = list.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).map(p => `<tr><td>${esc(p.name)}</td><td>${divPill(p.division)}</td><td>${esc(p.unit)}</td><td class="right">${money2(p.price)}</td><td class="right"><button class="btn sm primary" data-pb="${p.id}">Add</button></td></tr>`).join(''); };
      draw('');
      $('#pbq', bg).oninput = e => draw(e.target.value);
      bg.addEventListener('click', e => { const b = e.target.closest('[data-pb]'); if (!b) return; const p = db.pricebook.find(x => x.id === b.dataset.pb); onPick({ id: uid(), name: p.name, qty: 1, price: p.price, cost: p.cost }); toast('Added: ' + p.name); save(); render(); });
    },
  });
}

/* ───────────── PANEL ───────────── */
ROUTES.dashboard = () => {
  const now = new Date(), mStart = new Date(now.getFullYear(), now.getMonth(), 1), pmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const pays = allPayments().filter(divOK);
  const mRev = pays.filter(p => new Date(p.date) >= mStart).reduce((s, p) => s + num(p.amount), 0);
  const pmRev = pays.filter(p => new Date(p.date) >= pmStart && new Date(p.date) < mStart).reduce((s, p) => s + num(p.amount), 0);
  const invs = db.invoices.filter(divOK).filter(i => !['void', 'draft'].includes(i.status));
  const ar = invs.reduce((s, i) => s + invBal(i), 0), overdue = invs.filter(i => invStatus(i) === 'overdue');
  const leads = db.leads.filter(divOK), openLeads = leads.filter(l => !['won', 'lost'].includes(l.stage));
  const ests = db.estimates.filter(divOK), sentEst = ests.filter(e => e.status === 'sent');
  const pipe = openLeads.reduce((s, l) => s + num(l.value), 0) + sentEst.reduce((s, e) => s + estMax(e), 0);
  const decided = ests.filter(e => ['approved', 'declined'].includes(e.status)), close = decided.length ? ests.filter(e => e.status === 'approved').length / decided.length : 0;
  const todays = db.jobs.filter(divOK).filter(j => j.start && sameDay(j.start, now) && j.status !== 'cancelled').sort((a, b) => new Date(a.start) - new Date(b.start));
  const mrr = db.plans.filter(divOK).filter(p => p.status === 'active').reduce((s, p) => s + (p.interval === 'month' ? p.price : p.price / 12), 0);
  const delta = pmRev ? (mRev - pmRev) / pmRev : 0;
  // gráfico 6 meses
  const months = []; for (let m = 5; m >= 0; m--) { const s = new Date(now.getFullYear(), now.getMonth() - m, 1), e = new Date(now.getFullYear(), now.getMonth() - m + 1, 1); const by = {}; Object.keys(DIV).forEach(k => by[k] = allPayments().filter(p => p.division === k && new Date(p.date) >= s && new Date(p.date) < e).reduce((a, p) => a + num(p.amount), 0)); months.push({ label: s.toLocaleDateString('en-US', { month: 'short' }), by }); }
  const keys = state.div === 'all' ? Object.keys(DIV) : [state.div];
  const maxM = Math.max(1, ...months.map(m => keys.reduce((s, k) => s + m.by[k], 0)));
  const bars = months.map(m => { const tot = keys.reduce((s, k) => s + m.by[k], 0); return `<div class="bar" title="${m.label}: ${money(tot)}"><div class="small b">${kmoney(tot)}</div><div class="stack" style="height:${tot / maxM * 130}px">${keys.map(k => `<div style="height:${tot ? m.by[k] / tot * 100 : 0}%;background:${DIV[k].color}"></div>`).join('')}</div><div class="lbl">${m.label}</div></div>`; }).join('');
  const attention = [
    ...(db.tasks || []).filter(t => !t.done && t.due <= ymd(new Date())).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4).map(t => `<div class="list-item"><span class="pill ${t.due < ymd(new Date()) ? 'bad' : 'warn'}">${t.due < ymd(new Date()) ? 'Task overdue' : 'Task today'}</span><div style="flex:1"><a href="#/tasks">${esc(t.title)}</a></div></div>`),
    ...overdue.slice(0, 4).map(i => `<div class="list-item"><span class="pill bad">Overdue</span><div style="flex:1"><a href="#/invoice/${i.id}">${i.number}</a> · ${esc(cust(i.customerId).name)}</div><b>${money(invBal(i))}</b></div>`),
    ...db.jobs.filter(divOK).filter(j => j.status === 'unscheduled').slice(0, 3).map(j => `<div class="list-item"><span class="pill warn">Unscheduled</span><div style="flex:1"><a href="#/job/${j.id}">${esc(j.title)}</a></div>${divPill(j.division)}</div>`),
    ...db.permits.filter(p => ['todo', 'rejected'].includes(p.status)).slice(0, 3).map(p => `<div class="list-item">${pill(PERMIT_ST, p.status)}<div style="flex:1"><a href="#/permits">${esc(p.type)}</a> · ${esc(p.jurisdiction)}</div></div>`),
    ...sentEst.filter(e => (Date.now() - new Date(e.createdAt)) / DAY > 5).slice(0, 3).map(e => `<div class="list-item"><span class="pill info">Follow up</span><div style="flex:1"><a href="#/estimate/${e.id}">${e.number}</a> · ${esc(cust(e.customerId).name)}</div><b>${money(estMax(e))}</b></div>`),
  ];
  const srcCount = {}; leads.forEach(l => srcCount[l.source] = (srcCount[l.source] || 0) + 1); const srcMax = Math.max(1, ...Object.values(srcCount));
  return head(`${now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'} 👋`, `${now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })} · ${todays.length} jobs today · ${state.div === 'all' ? 'all divisions' : DIV[state.div].name}`, `<a class="btn" href="#/schedule">View schedule</a><button class="btn primary" data-act="newJob">＋ Job</button>`) + `
  <div class="grid g4">
    ${kpi('Collected this month', money(mRev), `<span class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${pct(Math.abs(delta))}</span> vs. last month`)}
    ${kpi('Accounts receivable', money(ar), `${overdue.length} overdue invoices · ${money(overdue.reduce((s, i) => s + invBal(i), 0))}`)}
    ${kpi('Open pipeline', kmoney(pipe), `${openLeads.length} leads · ${sentEst.length} estimates sent`)}
    ${kpi('Close rate', pct(close), `Recurring revenue: ${money(mrr)}/mo`)}
  </div>
  <div class="grid g-2-1 mt">
    <div class="card"><div class="card-h"><h3>Revenue collected — last 6 months</h3><div class="legend">${keys.map(k => `<span><span class="div-dot d-${k}"></span>${DIV[k].name}</span>`).join('')}</div></div><div class="card-b"><div class="bars">${bars}</div></div></div>
    <div class="card"><div class="card-h"><h3>Today’s jobs</h3><a href="#/schedule" class="small">Dispatch →</a></div><div class="card-b">${todays.length ? todays.map(j => `<div class="list-item click" data-go="#/job/${j.id}" style="cursor:pointer"><div style="width:62px" class="small b">${fTime(j.start)}</div><div style="flex:1;min-width:0"><div class="b" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(j.title)}</div><div class="small muted">${esc(cust(j.customerId).name)} · ${esc(cust(j.customerId).city || '')}</div></div><div class="row">${j.techIds.map(t => avatar(tech(t))).join('')}</div></div>`).join('') : '<div class="empty">No jobs today.</div>'}</div></div>
  </div>
  <div class="grid g3 mt">
    <div class="card"><div class="card-h"><h3>Needs attention</h3></div><div class="card-b">${attention.join('') || '<div class="empty">All caught up ✓</div>'}</div></div>
    <div class="card"><div class="card-h"><h3>Lead sources</h3></div><div class="card-b">${Object.entries(srcCount).sort((a, b) => b[1] - a[1]).map(([s, n]) => `<div style="margin-bottom:10px"><div class="row" style="justify-content:space-between"><span>${esc(srcEN(s))}</span><b>${n}</b></div><div class="progress"><div style="width:${n / srcMax * 100}%"></div></div></div>`).join('') || '<div class="empty">No leads yet.</div>'}</div></div>
    <div class="card"><div class="card-h"><h3>Recent activity</h3></div><div class="card-b"><div class="timeline">${db.activity.slice(0, 7).map(a => `<div class="ev"><div>${esc(a.text)}</div><div class="small muted">${ago(a.ts)}${/^\d/.test(ago(a.ts)) ? ' ago' : ''}</div></div>`).join('')}</div></div></div>
  </div>`;
};

/* ───────────── AGENDA / DESPACHO ───────────── */
ROUTES.schedule = () => {
  const ws = state.week, days = [...Array(7)].map((_, i) => addDays(ws, i));
  const techs = db.techs.filter(t => state.div === 'all' || t.division === state.div);
  const jobs = db.jobs.filter(divOK).filter(j => j.status !== 'cancelled');
  const chip = j => { const c = cust(j.customerId); return `<div class="jchip ${j.division} ${j.status === 'completed' ? 'done' : ''}" draggable="true" data-job="${j.id}" data-go="#/job/${j.id}" title="${esc(j.title)} — ${esc(c.name)}"><b>${j.start ? fTime(j.start) + ' · ' : ''}${esc(j.title)}</b>${esc(c.name)} · ${num(j.duration)}h${j.status === 'completed' ? ' ✓' : ''}</div>`; };
  const unsched = jobs.filter(j => j.status === 'unscheduled' || !j.start);
  let grid = `<div class="bh">Technician</div>` + days.map(d => `<div class="bh ${sameDay(d, new Date()) ? 'today' : ''}">${fDay(d)}</div>`).join('');
  techs.forEach(t => {
    const hrs = jobs.filter(j => j.start && j.techIds.includes(t.id) && new Date(j.start) >= ws && new Date(j.start) < addDays(ws, 7)).reduce((s, j) => s + num(j.duration), 0);
    grid += `<div class="tech">${avatar(t)}<div style="min-width:0"><div class="b small">${esc(t.name)}</div><div class="small muted">${hrs}h / 40h</div></div></div>`;
    days.forEach(d => {
      const list = jobs.filter(j => j.start && j.techIds.includes(t.id) && sameDay(j.start, d)).sort((a, b) => new Date(a.start) - new Date(b.start));
      grid += `<div class="cell ${sameDay(d, new Date()) ? 'today' : ''}" data-drop="${t.id}|${ymd(d)}">${list.map(chip).join('')}${list.length ? `<a class="small muted" href="${routeUrl(list)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Open route in Google Maps">↗ route</a>` : ''}</div>`;
    });
  });
  return head('Schedule & Dispatch', 'Drag jobs between technicians and days. Drop on "Unscheduled" to unschedule.', `<button class="btn" data-act="wk" data-n="-7">‹</button><button class="btn" data-act="wk" data-n="0">Today</button><button class="btn" data-act="wk" data-n="7">›</button><button class="btn primary" data-act="newJob">＋ Job</button>`) + `
  <div class="card mb"><div class="card-h"><h3>Unscheduled (${unsched.length})</h3><span class="small muted">Week of ${fDate(ws)}</span></div><div class="card-b"><div class="tray" data-drop="unscheduled">${unsched.map(chip).join('') || '<span class="muted small">No jobs waiting to be scheduled.</span>'}</div></div></div>
  <div class="board" style="grid-template-columns:190px repeat(7,minmax(150px,1fr))">${grid}</div>`;
};
function routeUrl(jobs) { const addrs = jobs.map(j => { const c = cust(j.customerId); return encodeURIComponent(`${c.address || ''}, ${c.city || ''}`); }); return 'https://www.google.com/maps/dir/' + addrs.join('/'); }
ROUTES['schedule:after'] = () => {
  $$('[draggable][data-job]').forEach(el => el.addEventListener('dragstart', e => { const from = el.closest('[data-drop]')?.dataset.drop.split('|')[0] || ''; e.dataTransfer.setData('text/plain', el.dataset.job + '|' + from); e.dataTransfer.effectAllowed = 'move'; }));
  $$('[data-drop]').forEach(cell => {
    cell.addEventListener('dragover', e => { e.preventDefault(); cell.classList.add('over'); });
    cell.addEventListener('dragleave', () => cell.classList.remove('over'));
    cell.addEventListener('drop', e => {
      e.preventDefault(); cell.classList.remove('over');
      const [jid, from] = e.dataTransfer.getData('text/plain').split('|'); const j = db.jobs.find(x => x.id === jid); if (!j) return;
      const target = cell.dataset.drop;
      if (target === 'unscheduled') { j.start = null; j.techIds = []; j.status = 'unscheduled'; log(`${j.number} unscheduled`); }
      else {
        const [tid, day] = target.split('|');
        const time = j.start ? hm(j.start) : '08:00';
        j.start = iso(parseLocal(day, time));
        if (!j.techIds.includes(tid)) { if (from && j.techIds.includes(from)) j.techIds = j.techIds.map(x => x === from ? tid : x); else if (j.techIds.length) j.techIds[0] = tid; else j.techIds = [tid]; }
        if (j.status === 'unscheduled') j.status = 'scheduled';
        log(`${j.number} assigned to ${tech(tid).name} on ${fDay(j.start)}`);
        toast(`Scheduled: ${fDay(j.start)} ${fTime(j.start)} · ${tech(tid).name}`);
      }
      save(); render();
    });
  });
};

/* ───────────── PIPELINE ───────────── */
ROUTES.pipeline = () => {
  const leads = db.leads.filter(divOK);
  const cols = STAGES.map(([k, label]) => {
    const list = leads.filter(l => l.stage === k);
    return `<div class="kcol" data-stage="${k}"><div class="kcol-h"><span>${label} <span class="muted">${list.length}</span></span><span class="sum">${kmoney(list.reduce((s, l) => s + num(l.value), 0))}</span></div><div class="kcol-b">${list.map(l => { const c = cust(l.customerId); const late = l.next && parseLocal(l.next) < sod(new Date()) && !['won', 'lost'].includes(l.stage); return `<div class="kcard" draggable="true" data-lead="${l.id}"><div class="t">${esc(l.title)}</div><div class="small">${esc(c.name)}</div><div class="m"><span>${divPill(l.division)}</span><b>${money(l.value)}</b></div><div class="m"><span>${esc(srcEN(l.source))}</span><span class="${late ? 'down b' : ''}">${l.next ? '⏱ ' + new Date(l.next + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span></div></div>`; }).join('')}</div></div>`;
  }).join('');
  const open = leads.filter(l => !['won', 'lost'].includes(l.stage));
  return head('Sales Pipeline', `${open.length} open opportunities · ${money(open.reduce((s, l) => s + num(l.value), 0))} in play`, `<button class="btn primary" data-act="newLead">＋ New Lead</button>`) + `<div class="kanban">${cols}</div>`;
};
ROUTES['pipeline:after'] = () => {
  $$('[data-lead]').forEach(el => {
    el.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', el.dataset.lead));
    el.addEventListener('click', () => leadModal(db.leads.find(l => l.id === el.dataset.lead)));
  });
  $$('[data-stage]').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('over'); const l = db.leads.find(x => x.id === e.dataTransfer.getData('text/plain')); if (!l || l.stage === col.dataset.stage) return; l.stage = col.dataset.stage; l.stageAt = iso(new Date()); log(`Lead "${l.title}" → ${STAGES.find(s => s[0] === l.stage)[1]}`); emit('lead.stage', 'lead', l, { to: l.stage }); save(); render(); });
  });
};
function leadModal(l) {
  const isNew = !l;
  l = l || { id: uid(), stage: 'new', createdAt: iso(new Date()), division: state.div !== 'all' ? state.div : 'solar', value: 0, source: 'Google', next: ymd(addDays(new Date(), 1)) };
  const m = form({
    title: isNew ? 'New Lead' : 'Lead: ' + esc(l.title),
    fields: [
      { k: 'customerId', label: 'Customer', type: 'select', options: [['__new', '＋ New customer…'], ...custOptions()], value: l.customerId || '__new' },
      { k: 'newName', label: 'Name (if new)', value: '' }, { k: 'newPhone', label: 'Phone (if new)', value: '' },
      { k: 'title', label: 'Opportunity', value: l.title, required: true, ph: 'e.g. 8 kW solar system' },
      { k: 'division', label: 'Division', type: 'select', options: divOptions(), value: l.division },
      { k: 'value', label: 'Estimated value ($)', type: 'number', value: l.value },
      { k: 'stage', label: 'Stage', type: 'select', options: STAGES, value: l.stage },
      { k: 'source', label: 'Lead source', type: 'select', options: SOURCES, value: srcEN(l.source) },
      { k: 'next', label: 'Next follow-up', type: 'date', value: l.next },
      { k: 'notes', label: 'Notes', type: 'textarea', full: true, value: l.notes },
    ],
    extraFoot: isNew ? '' : `<button class="btn danger" id="ldDel" style="margin-right:auto">Delete</button><button class="btn" id="ldEst">→ Create estimate</button>`,
    onSave(v) {
      if (v.customerId === '__new') { if (!v.newName) { toast('Enter the new customer\'s name'); return false; } const c = newCustomer({ name: v.newName, phone: v.newPhone, source: v.source }); v.customerId = c.id; }
      delete v.newName; delete v.newPhone;
      const prevStage = l.stage; Object.assign(l, v);
      if (isNew) { l.stageAt = l.createdAt; db.leads.unshift(l); log(`New lead: ${cust(l.customerId).name} (${DIV[l.division].name})`); toast('Lead created'); emit('lead.created', 'lead', l); }
      else if (prevStage !== l.stage) { l.stageAt = iso(new Date()); emit('lead.stage', 'lead', l, { to: l.stage }); }
    },
  });
  if (!isNew) {
    $('#ldDel', m.el).onclick = () => { m.close(); confirmDlg('Delete this lead?', () => { db.leads = db.leads.filter(x => x.id !== l.id); }); };
    $('#ldEst', m.el).onclick = () => { m.close(); const e = createEstimate({ customerId: l.customerId, division: l.division, title: l.title }); l.stage = 'proposal'; l.estimateId = e.id; save(); location.hash = '#/estimate/' + e.id; };
  }
}

/* ───────────── CLIENTES ───────────── */
function newCustomer(v) {
  const c = { id: uid(), name: v.name, phone: v.phone || '', email: v.email || '', address: v.address || '', city: v.city || '', zip: v.zip || '', source: v.source || 'Google', tags: [], createdAt: iso(new Date()), notes: v.notes || '', property: { roofType: '', roofAge: '', sqft: '', utility: '', avgBill: '', stories: 1 }, equipment: [] };
  db.customers.unshift(c); log('New customer: ' + c.name); emit('customer.created', 'customer', c); return c;
}
function customerModal(c) {
  const isNew = !c; c = c || {};
  form({
    title: isNew ? 'New customer' : 'Edit customer',
    fields: [
      { k: 'name', label: 'Full name', value: c.name, required: true }, { k: 'phone', label: 'Phone', type: 'tel', value: c.phone },
      { k: 'email', label: 'Email', type: 'email', value: c.email }, { k: 'source', label: 'Lead source', type: 'select', options: SOURCES, value: srcEN(c.source) },
      { k: 'address', label: 'Address', value: c.address, full: true }, { k: 'city', label: 'City', value: c.city }, { k: 'zip', label: 'ZIP code', value: c.zip },
      { k: 'notes', label: 'Notes', type: 'textarea', full: true, value: c.notes },
    ],
    onSave(v) { if (isNew) { const n = newCustomer(v); toast('Customer created'); setTimeout(() => location.hash = '#/customer/' + n.id); } else Object.assign(c, v); },
  });
}
ROUTES.customers = () => {
  const q = (state.filters.cq || '').toLowerCase();
  const rows = db.customers.filter(c => !q || [c.name, c.phone, c.email, c.address, c.city].join(' ').toLowerCase().includes(q)).filter(c => state.div === 'all' || [...db.jobs, ...db.leads, ...db.estimates, ...db.invoices].some(x => x.customerId === c.id && x.division === state.div));
  const divsOf = id => [...new Set([...db.jobs, ...db.leads, ...db.estimates, ...db.invoices].filter(x => x.customerId === id).map(x => x.division))];
  return head('Customers', `${db.customers.length} customers total`, `<button class="btn" data-act="exportCsv" data-what="customers">⇩ CSV</button><button class="btn primary" data-act="newCustomer">＋ Customer</button>`) + `
  <div class="card"><div class="toolbar"><input id="cq" placeholder="Search by name, phone, address…" value="${esc(state.filters.cq || '')}" style="flex:1;min-width:200px"></div>
  <div class="table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Address</th><th>Divisions</th><th class="right">Lifetime value</th><th class="right">Balance</th></tr></thead><tbody>
  ${rows.map(c => { const bal = custBal(c.id); return `<tr class="click" data-go="#/customer/${c.id}"><td><div class="row"><span class="avatar" style="background:#6366f1">${initials(c.name)}</span><div><div class="b">${esc(c.name)}</div><div class="small muted">${esc(srcEN(c.source))}</div></div></div></td><td><div>${esc(c.phone)}</div><div class="small muted">${esc(c.email)}</div></td><td>${esc(c.address)}<div class="small muted">${esc(c.city)} ${esc(c.zip)}</div></td><td><div class="row">${divsOf(c.id).map(divPill).join('')}</div></td><td class="right">${money(custLTV(c.id))}</td><td class="right ${bal ? 'b down' : 'muted'}">${bal ? money(bal) : '—'}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">No results</td></tr>'}
  </tbody></table></div></div>`;
};
ROUTES['customers:after'] = () => { const i = $('#cq'); if (!i) return; i.oninput = () => { state.filters.cq = i.value; const pos = i.selectionStart; render(); const n = $('#cq'); n.focus(); n.setSelectionRange(pos, pos); }; };

ROUTES.customer = id => {
  const c = db.customers.find(x => x.id === id); if (!c) return '<div class="empty">Customer not found</div>';
  const tab = state.tabs.cust || 'overview';
  const jobs = db.jobs.filter(j => j.customerId === id), ests = db.estimates.filter(e => e.customerId === id), invs = db.invoices.filter(i => i.customerId === id), leads = db.leads.filter(l => l.customerId === id), plans = db.plans.filter(p => p.customerId === id);
  const addr = encodeURIComponent(`${c.address}, ${c.city} ${c.zip}`);
  const p = c.property || {};
  let body = '';
  if (tab === 'overview') body = `
    <div class="grid g2">
      <div class="card"><div class="card-h"><h3>Jobs (${jobs.length})</h3><button class="btn sm" data-act="newJob" data-cust="${c.id}">＋</button></div><div class="card-b">${jobs.map(j => `<div class="list-item click" data-go="#/job/${j.id}" style="cursor:pointer"><div style="flex:1"><div class="b">${j.number} · ${esc(j.title)}</div><div class="small muted">${j.start ? fDate(j.start) : 'No date'}</div></div>${divPill(j.division)} ${pill(JOB_ST, j.status)}</div>`).join('') || '<div class="muted">No jobs</div>'}</div></div>
      <div class="card"><div class="card-h"><h3>Estimates (${ests.length})</h3><button class="btn sm" data-act="newEstimate" data-cust="${c.id}">＋</button></div><div class="card-b">${ests.map(e => `<div class="list-item click" data-go="#/estimate/${e.id}" style="cursor:pointer"><div style="flex:1"><div class="b">${e.number} · ${esc(e.title)}</div><div class="small muted">${fDate(e.createdAt)}</div></div><b>${money(e.status === 'approved' ? estTotal(e) : estMax(e))}</b> ${pill(EST_ST, e.status)}</div>`).join('') || '<div class="muted">No estimates</div>'}</div></div>
      <div class="card"><div class="card-h"><h3>Invoices (${invs.length})</h3><button class="btn sm" data-act="newInvoice" data-cust="${c.id}">＋</button></div><div class="card-b">${invs.map(i => `<div class="list-item click" data-go="#/invoice/${i.id}" style="cursor:pointer"><div style="flex:1"><div class="b">${i.number}</div><div class="small muted">${fDate(i.createdAt)}</div></div><b>${money(invTotal(i))}</b> ${pill(INV_ST, invStatus(i))}</div>`).join('') || '<div class="muted">No invoices</div>'}</div></div>
      <div class="card"><div class="card-h"><h3>Leads & memberships</h3><button class="btn sm" data-act="newPlan" data-cust="${c.id}">＋ Membership</button></div><div class="card-b">${leads.map(l => `<div class="list-item"><div style="flex:1">${esc(l.title)}</div>${divPill(l.division)}<span class="pill">${STAGES.find(s => s[0] === l.stage)[1]}</span></div>`).join('')}${plans.map(pl => `<div class="list-item"><div style="flex:1"><b>${esc(pl.name)}</b><div class="small muted">Next visit ${fDate(parseLocal(pl.nextVisit))}</div></div><span class="pill ok">${money(pl.price)}/${pl.interval === 'month' ? 'mo' : 'yr'}</span></div>`).join('') || (leads.length ? '' : '<div class="muted">Nothing yet</div>')}</div></div>
    </div>`;
  if (tab === 'property') body = `
    <div class="grid g2">
      <div class="card"><div class="card-h"><h3>Property</h3><button class="btn sm" data-act="editProperty" data-id="${c.id}">Edit</button></div><div class="card-b"><div class="calc-out">
        <div><div class="l">Roof type</div><div class="b">${esc(p.roofType || '—')}</div></div><div><div class="l">Roof age</div><div class="b">${p.roofAge ? p.roofAge + ' years' : '—'}</div></div>
        <div><div class="l">Living area</div><div class="b">${p.sqft ? Number(p.sqft).toLocaleString() + ' ft²' : '—'}</div></div><div><div class="l">Stories</div><div class="b">${esc(p.stories || '—')}</div></div>
        <div><div class="l">Utility</div><div class="b">${esc(p.utility || '—')}</div></div><div><div class="l">Average bill</div><div class="b">${p.avgBill ? money(p.avgBill) + '/mo' : '—'}</div></div>
      </div>${p.roofAge >= 15 ? `<p class="small"><span class="pill warn">Opportunity</span> ${p.roofAge}-year-old roof: good candidate for replacement before going solar.</p>` : ''}${p.avgBill >= 200 ? `<p class="small"><span class="pill brand">Opportunity</span> High bill (${money(p.avgBill)}/mo): strong candidate for solar + battery.</p>` : ''}</div></div>
      <div class="card"><div class="card-h"><h3>Installed equipment</h3><button class="btn sm" data-act="addEquip" data-id="${c.id}">＋ Equipment</button></div><div class="card-b">${(c.equipment || []).map(eq => { const exp = eq.warranty && parseLocal(eq.warranty) < new Date(); return `<div class="list-item"><div style="flex:1"><div class="b">${esc(eq.type)} — ${esc(eq.brand)}</div><div class="small muted">Model ${esc(eq.model)} · S/N ${esc(eq.serial)} · Installed ${fDate(parseLocal(eq.installed))}</div></div><span class="pill ${exp ? 'bad' : 'ok'}">${exp ? 'Warranty expired' : 'Warranty until ' + fDate(parseLocal(eq.warranty))}</span><button class="btn ghost sm danger" data-act="delEquip" data-id="${c.id}" data-eq="${eq.id}">✕</button></div>`; }).join('') || '<div class="muted">Track HVAC units, inverters, panels or batteries to follow up on warranties.</div>'}</div></div>
    </div>`;
  if (tab === 'notes') body = `<div class="card"><div class="card-b"><label class="f">Internal notes<textarea id="custNotes" style="min-height:200px">${esc(c.notes)}</textarea></label><div class="row mt"><button class="btn primary" data-act="saveNotes" data-id="${c.id}">Save notes</button></div></div></div>`;
  return `<div class="small muted mb"><a href="#/customers">Customers</a> / ${esc(c.name)}</div>` + head(esc(c.name), `${esc(c.address)}, ${esc(c.city)} ${esc(c.zip)} · Customer since ${fDate(c.createdAt)} · ${esc(srcEN(c.source))}`,
    `<a class="btn" href="tel:${esc(c.phone)}">✆ Call</a><a class="btn" href="sms:${esc(c.phone)}">✉ SMS</a><a class="btn" href="mailto:${esc(c.email)}">@ Email</a><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${addr}">⌖ Map</a><button class="btn" data-act="editCustomer" data-id="${c.id}">Edit</button><button class="btn primary" data-act="newEstimate" data-cust="${c.id}">＋ Estimate</button>`) + `
  <div class="grid g4 mb">${kpi('Lifetime value', money(custLTV(id)))}${kpi('Balance due', money(custBal(id)))}${kpi('Jobs', jobs.length, jobs.filter(j => j.status === 'completed').length + ' completed')}${kpi('Contact', `<span style="font-size:15px">${esc(c.phone)}</span>`, esc(c.email))}</div>
  <div class="tabs">${[['overview', 'Overview'], ['property', 'Property & equipment'], ['notes', 'Notes']].map(([k, v]) => `<button data-act="tab" data-t="cust" data-v="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>${body}`;
};

/* ───────────── ESTIMADOS ───────────── */
function createEstimate({ customerId, division, title, items }) {
  const e = { id: uid(), number: nextNum('est'), customerId, division: division || 'solar', title: title || 'New estimate', status: 'draft', createdAt: iso(new Date()), validUntil: ymd(addDays(new Date(), 30)), options: [{ id: uid(), name: 'Good', items: items || [] }], selected: null, notes: '', deposit: division === 'roofing' ? 30 : division === 'solar' ? 10 : 0 };
  db.estimates.unshift(e); log(`Estimate ${e.number} created for ${cust(customerId).name}`); return e;
}
function newEstimateModal(customerId) {
  form({ title: 'New estimate', fields: [{ k: 'customerId', label: 'Customer', type: 'select', options: custOptions(), value: customerId }, { k: 'division', label: 'Division', type: 'select', options: divOptions(), value: state.div !== 'all' ? state.div : 'solar' }, { k: 'title', label: 'Title', full: true, required: true, ph: 'e.g. 28-square roof replacement' }], saveLabel: 'Create', onSave(v) { const e = createEstimate(v); setTimeout(() => location.hash = '#/estimate/' + e.id); } });
}
ROUTES.estimates = () => {
  const f = state.filters.est || 'all';
  const list = db.estimates.filter(divOK).filter(e => f === 'all' || e.status === f);
  const all = db.estimates.filter(divOK);
  const sum = s => all.filter(e => e.status === s).reduce((a, e) => a + (s === 'approved' ? estTotal(e) : estMax(e)), 0);
  return head('Estimates', 'Good / Better / Best proposals with financing', `<button class="btn primary" data-act="newEstimate">＋ Estimate</button>`) + `
  <div class="grid g4 mb">${kpi('Drafts', all.filter(e => e.status === 'draft').length, money(sum('draft')))}${kpi('Sent', all.filter(e => e.status === 'sent').length, money(sum('sent')) + ' pending')}${kpi('Approved', all.filter(e => e.status === 'approved').length, money(sum('approved')))}${kpi('Declined', all.filter(e => e.status === 'declined').length, money(sum('declined')))}</div>
  <div class="card"><div class="toolbar">${[['all', 'All'], ...Object.entries(EST_ST).map(([k, v]) => [k, v[0]])].map(([k, v]) => `<button class="btn sm ${f === k ? 'primary' : ''}" data-act="filt" data-f="est" data-v="${k}">${v}</button>`).join('')}</div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Customer</th><th>Title</th><th>Division</th><th>Options</th><th>Date</th><th class="right">Amount</th><th>Status</th></tr></thead><tbody>
  ${list.map(e => `<tr class="click" data-go="#/estimate/${e.id}"><td class="b">${e.number}</td><td>${custLink(e.customerId)}</td><td>${esc(e.title)}</td><td>${divPill(e.division)}</td><td>${e.options.length}</td><td>${fDate(e.createdAt)}</td><td class="right b">${e.options.length > 1 && e.status !== 'approved' ? money(Math.min(...e.options.map(o => totalOf(o.items)))) + '–' : ''}${money(e.status === 'approved' ? estTotal(e) : estMax(e))}</td><td>${pill(EST_ST, e.status)}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No estimates</td></tr>'}
  </tbody></table></div></div>`;
};
ROUTES.estimate = id => {
  const e = db.estimates.find(x => x.id === id); if (!e) return '<div class="empty">Estimate not found</div>';
  const k = Math.min(state.tabs['opt' + id] ?? (e.selected ?? 0), e.options.length - 1), opt = e.options[k];
  const tot = totalOf(opt.items), mo = monthly(tot, num(db.settings.apr), num(db.settings.term));
  const editable = e.status !== 'approved';
  const c = cust(e.customerId);
  return `<div class="small muted mb"><a href="#/estimates">Estimates</a> / ${e.number}</div>` + head(`${e.number} · ${esc(e.title)}`, `${custLink(e.customerId)} · ${divPill(e.division)} · Created ${fDate(e.createdAt)} · Valid until ${fDate(parseLocal(e.validUntil))}`,
    `${pill(EST_ST, e.status)}<button class="btn" data-act="previewEst" data-id="${e.id}">⎙ Preview / PDF</button>${e.status !== 'declined' ? `<button class="btn primary" data-act="portalLink" data-kind="estimate" data-id="${e.id}">🔗 Send signing link</button>` : ''}${e.status === 'draft' ? `<button class="btn" data-act="sendEst" data-id="${e.id}">Mark as sent</button>` : ''}${['sent', 'draft'].includes(e.status) ? `<button class="btn ok" data-act="approveEst" data-id="${e.id}" data-k="${k}">✓ Approve "${esc(opt.name)}"</button><button class="btn danger" data-act="declineEst" data-id="${e.id}">Decline</button>` : ''}${e.status === 'approved' ? `<span class="small muted">Approved option: <b>${esc(e.options[e.selected].name)}</b>${e.signedBy ? ` · ✍ signed online by <b>${esc(e.signedBy)}</b>` : ''}</span>` : ''}${e.status === 'declined' && e.declineReason ? `<span class="small muted">Reason: ${esc(e.declineReason)}</span>` : ''}${e.status === 'declined' ? `<button class="btn" data-act="reopenEst" data-id="${e.id}">Reopen</button>` : ''}`) + `
  <div id="portalInfo" class="mb" hidden></div>
  <div class="opt-tabs">${e.options.map((o, i) => `<button data-act="optTab" data-id="${e.id}" data-k="${i}" class="${i === k ? 'on' : ''}"><div class="b">${esc(o.name)} ${e.selected === i ? '✓' : ''}</div><div class="small muted">${money(totalOf(o.items))} · ${o.items.length} items</div></button>`).join('')}${editable && e.options.length < 3 ? `<button data-act="addOpt" data-id="${e.id}"><div class="b">＋ Option</div><div class="small muted">Duplicates the current one</div></button>` : ''}</div>
  <div class="grid g-2-1">
    <div class="card"><div class="card-h"><h3>${editable ? `<input class="inp" style="width:220px;padding:6px 9px" data-act-input="optName" data-id="${e.id}" data-k="${k}" value="${esc(opt.name)}">` : esc(opt.name)}</h3>${editable && e.options.length > 1 ? `<button class="btn sm danger" data-act="delOpt" data-id="${e.id}" data-k="${k}">Delete option</button>` : ''}</div><div class="card-b">${itemsTable(opt.items, editable, `est:${e.id}:${k}`)}</div></div>
    <div>
      <div class="card"><div class="card-h"><h3>Financing</h3></div><div class="card-b"><div class="kpi" style="padding:0"><div class="l">Estimated monthly payment</div><div class="v">${money(mo)}<span class="small muted">/mo</span></div><div class="s">${db.settings.term} months · ${db.settings.apr}% APR · on ${money(tot)}</div></div><p class="small muted">Set rate and term in Settings. Subject to credit approval.</p></div></div>
      <div class="card mt"><div class="card-h"><h3>Terms</h3></div><div class="card-b form" style="grid-template-columns:1fr">
        <label class="f">Deposit on approval (%)<input type="number" class="inp" data-act-input="estDeposit" data-id="${e.id}" value="${e.deposit || 0}" ${editable ? '' : 'disabled'}></label>
        <label class="f">Valid until<input type="date" class="inp" data-act-input="estValid" data-id="${e.id}" value="${e.validUntil}" ${editable ? '' : 'disabled'}></label>
        <label class="f">Notes for the customer<textarea class="inp" data-act-input="estNotes" data-id="${e.id}" ${editable ? '' : 'disabled'}>${esc(e.notes)}</textarea></label>
        ${num(e.deposit) ? `<div class="small">Deposit: <b>${money(tot * num(e.deposit) / 100)}</b></div>` : ''}
      </div></div>
      <div class="card mt"><div class="card-h"><h3>Customer</h3></div><div class="card-b"><div class="b">${esc(c.name)}</div><div class="small muted">${esc(c.address)}, ${esc(c.city)}<br>${esc(c.phone)} · ${esc(c.email)}</div>${db.jobs.filter(j => j.estimateId === e.id).map(j => `<div class="mt"><a class="btn sm" href="#/job/${j.id}">→ Job ${j.number}</a></div>`).join('')}<div class="mt"><button class="btn sm danger" data-act="delEst" data-id="${e.id}">Delete estimate</button></div></div></div>
    </div>
  </div>`;
};
function docHTML({ kind, number, date, extraMeta = '', customerId, items, notes, footer = '', bodyHTML }) {
  const s = db.settings, c = cust(customerId);
  return `<div class="doc"><div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap"><div><div style="display:flex;align-items:center;gap:10px"><div class="logo">O<span></span></div><div><div style="font-weight:800;font-size:20px">${esc(s.company)}</div><div style="color:#64748b;font-size:12px">${esc(s.license)}</div></div></div><div style="color:#64748b;font-size:12.5px;margin-top:8px">${esc(s.address)}<br>${esc(s.phone)} · ${esc(s.email)}</div></div>
  <div style="text-align:right"><div style="font-size:22px;font-weight:800;letter-spacing:.02em">${kind}</div><div style="color:#64748b">${number}</div><div style="font-size:12.5px;margin-top:6px">${date}${extraMeta}</div></div></div>
  <div style="margin:22px 0;padding:14px;background:#f8fafc;border-radius:10px"><div style="font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.06em">Prepared for</div><div style="font-weight:700">${esc(c.name)}</div><div style="font-size:12.5px;color:#475569">${esc(c.address)}, ${esc(c.city)} ${esc(c.zip)}<br>${esc(c.phone)} · ${esc(c.email)}</div></div>
  ${bodyHTML ?? itemsTable(items, false)}${notes ? `<div style="margin-top:16px;font-size:12.5px;color:#475569;white-space:pre-wrap"><b>Notes:</b> ${esc(notes)}</div>` : ''}${footer}<div style="margin-top:24px;font-size:11.5px;color:#94a3b8">${esc(s.terms)}</div></div>`;
}
function previewEstimate(e) {
  const blocks = e.options.map((o, i) => `<h3 style="margin:20px 0 8px">Option ${i + 1}: ${esc(o.name)} — ${money2(totalOf(o.items))} <span style="font-weight:400;color:#64748b;font-size:13px">· or ${money(monthly(totalOf(o.items), num(db.settings.apr), num(db.settings.term)))}/mo financed</span></h3>${itemsTable(o.items, false)}`).join('');
  const html = docHTML({ kind: 'ESTIMATE', number: e.number, date: 'Date: ' + fDate(e.createdAt), extraMeta: `<br>Valid until: ${fDate(parseLocal(e.validUntil))}`, customerId: e.customerId, items: [], notes: e.notes, bodyHTML: `<h2 style="margin:0">${esc(e.title)}</h2>${blocks}` });
  modal({ title: 'Customer view', wide: true, body: html + `<div style="margin-top:20px;display:flex;gap:40px;flex-wrap:wrap"><div style="flex:1;min-width:200px;border-top:1px solid #cbd5e1;padding-top:6px;font-size:12px;color:#64748b">Customer signature</div><div style="width:160px;border-top:1px solid #cbd5e1;padding-top:6px;font-size:12px;color:#64748b">Date</div></div>`, foot: `<button class="btn" data-dismiss>Close</button><button class="btn primary" onclick="window.print()">⎙ Print / PDF</button>` });
}

function jobFromEstimate(e) {
  const k = e.selected ?? 0, items = e.options[k].items.map(x => ({ ...x, id: uid() }));
  const j = { id: uid(), number: nextNum('job'), customerId: e.customerId, division: e.division, title: e.title, techIds: [], start: null, duration: e.division === 'hvac' ? 6 : 8, status: 'unscheduled', items, checklist: CHECKLISTS[e.division].map(t => ({ id: uid(), t, done: false })), photos: [], notes: e.notes, estimateId: e.id, createdAt: iso(new Date()) };
  db.jobs.unshift(j); e.jobId = j.id;
  const lead = db.leads.find(l => l.estimateId === e.id || (l.customerId === e.customerId && l.division === e.division && !['won', 'lost'].includes(l.stage)));
  if (lead && lead.stage !== 'won') { lead.stage = 'won'; lead.stageAt = iso(new Date()); emit('lead.stage', 'lead', lead, { to: 'won' }); }
  return j;
}

/* ───────────── PORTAL DEL CLIENTE ───────────── */
const portalUrl = token => location.origin + location.pathname.replace(/[^/]*$/, '') + 'portal.html?t=' + token;
const portalSeen = new Set();
// Procesa lo que el cliente hizo en el portal (firmas, rechazos, pagos). Un candado en el servidor
// evita que dos personas del equipo creen el mismo trabajo.
async function processPortal() {
  if (!cloud.on || cloud.portalBusy) return; cloud.portalBusy = true;
  let changed = false;
  try {
    for (const e of db.estimates) {
      if (e.status === 'approved' && e.approvedVia === 'portal' && !e.jobId && !portalSeen.has('a' + e.id)) {
        portalSeen.add('a' + e.id);
        const { data: mine } = await cloud.sb.rpc('opsboss_lock', { p_key: 'est-approved:' + e.id });
        if (!mine) continue;
        const j = jobFromEstimate(e);
        log(`✍ ${cust(e.customerId).name} signed and approved estimate ${e.number} online — ${money(estTotal(e))}`);
        emit('estimate.approved', 'estimate', e); emit('job.created', 'job', j);
        toast(`✍ ${cust(e.customerId).name} approved ${e.number} online. Job ${j.number} created.`); changed = true;
      }
      if (e.status === 'declined' && e.declinedVia === 'portal' && !e.declineSeen && !portalSeen.has('d' + e.id)) {
        portalSeen.add('d' + e.id);
        const { data: mine } = await cloud.sb.rpc('opsboss_lock', { p_key: 'est-declined:' + e.id });
        e.declineSeen = true; changed = true;
        if (!mine) continue;
        log(`${cust(e.customerId).name} declined estimate ${e.number} online${e.declineReason ? ': ' + e.declineReason : ''}`);
        emit('estimate.declined', 'estimate', e); toast(`${cust(e.customerId).name} declined ${e.number}`);
      }
    }
    for (const i of db.invoices) for (const pay of i.payments || []) {
      if (!pay.online || pay.seen || portalSeen.has('p' + pay.id)) continue;
      portalSeen.add('p' + pay.id);
      const { data: mine } = await cloud.sb.rpc('opsboss_lock', { p_key: 'pay:' + (pay.ref || pay.id) });
      pay.seen = true; changed = true;
      if (!mine) continue;
      log(`💳 Online payment of ${money2(pay.amount)} — ${cust(i.customerId).name} (${i.number})`);
      toast(`💳 ${cust(i.customerId).name} paid ${money2(pay.amount)} online`);
      emit('payment.received', 'invoice', i); if (invBal(i) <= 0.009) emit('invoice.paid', 'invoice', i);
    }
  } catch (err) { console.error('portal', err); }
  finally { cloud.portalBusy = false; }
  if (changed) { save(); remoteRender(); }
}
async function portalInfo(kind, id) {
  const box = $('#portalInfo'); if (!box || !cloud.on) return;
  const [{ data: links }, { data: evs }] = await Promise.all([
    cloud.sb.from('opsboss_portal_links').select('token,view_count,first_viewed_at,last_viewed_at,created_at,revoked').eq('kind', kind).eq('record_id', id).order('created_at', { ascending: false }),
    cloud.sb.from('opsboss_portal_events').select('id,event,signer_name,option_index,amount,reason,ip,created_at').eq('kind', kind).eq('record_id', id).order('created_at', { ascending: false }),
  ]);
  if (!$('#portalInfo') || (!links?.length && !evs?.length)) return;
  const views = (links || []).reduce((a, l) => a + l.view_count, 0), lastView = (links || []).map(l => l.last_viewed_at).filter(Boolean).sort().pop();
  const evTxt = { approved: '✍ Signed and approved', declined: '✕ Declined', paid: '💳 Paid online' };
  box.hidden = false;
  box.innerHTML = `<div class="card"><div class="card-b row" style="gap:16px;justify-content:space-between"><div class="row" style="gap:16px"><span class="pill ${views ? 'brand' : ''}">👁 ${views ? `Viewed ${views} ${views === 1 ? 'time' : 'times'} · last ${ago(lastView)}${/^\d/.test(ago(lastView)) ? ' ago' : ''}` : 'Customer has not opened the link yet'}</span>${(evs || []).map(ev => `<span class="small">${evTxt[ev.event] || ev.event}${ev.signer_name ? ' — ' + esc(ev.signer_name) : ''}${ev.amount ? ' · ' + money2(ev.amount) : ''} · ${fDate(ev.created_at)}${ev.event === 'approved' ? ` <button class="btn sm" data-act="viewSig" data-ev="${ev.id}">View signature</button>` : ''}</span>`).join('')}</div>${links?.length ? `<button class="btn sm" data-act="portalCopy" data-url="${esc(portalUrl(links[0].token))}">Copy link</button>` : ''}</div></div>`;
}
ROUTES['estimate:after'] = id => portalInfo('estimate', id);
ROUTES['invoice:after'] = id => portalInfo('invoice', id);

/* ───────────── TRABAJOS ───────────── */
function jobModal(j, preset = {}) {
  const isNew = !j; j = j || {};
  const st = j.start ? new Date(j.start) : null;
  form({
    title: isNew ? 'New job' : 'Edit job ' + j.number,
    fields: [
      { k: 'customerId', label: 'Customer', type: 'select', options: custOptions(), value: j.customerId || preset.customerId },
      { k: 'division', label: 'Division', type: 'select', options: divOptions(), value: j.division || preset.division || (state.div !== 'all' ? state.div : 'hvac') },
      { k: 'title', label: 'Job description', full: true, required: true, value: j.title || preset.title, ph: 'e.g. AC maintenance' },
      { k: 'date', label: 'Date', type: 'date', value: st ? ymd(st) : (preset.date || '') }, { k: 'time', label: 'Time', type: 'time', value: st ? hm(st) : '08:00' },
      { k: 'duration', label: 'Duration (hours)', type: 'number', step: '0.5', value: j.duration ?? 2 },
      { k: 'tech1', label: 'Lead technician', type: 'select', options: techOptions(), value: (j.techIds || [])[0] || '' },
      { k: 'tech2', label: 'Additional technician', type: 'select', options: techOptions(), value: (j.techIds || [])[1] || '' },
      { k: 'notes', label: 'Instructions / notes', type: 'textarea', full: true, value: j.notes },
    ],
    onSave(v) {
      const techIds = [v.tech1, v.tech2].filter((x, i, a) => x && a.indexOf(x) === i);
      const start = v.date ? iso(parseLocal(v.date, v.time)) : null;
      const data = { customerId: v.customerId, division: v.division, title: v.title, duration: v.duration, techIds, start, notes: v.notes };
      if (isNew) {
        const nj = { id: uid(), number: nextNum('job'), ...data, status: start ? 'scheduled' : 'unscheduled', items: preset.items || [], checklist: CHECKLISTS[v.division].map(t => ({ id: uid(), t, done: false })), photos: [], estimateId: preset.estimateId || null, createdAt: iso(new Date()) };
        db.jobs.unshift(nj); log(`Job ${nj.number} created: ${nj.title}`); toast('Job created'); emit('job.created', 'job', nj); setTimeout(() => location.hash = '#/job/' + nj.id);
      } else { Object.assign(j, data); if (!start) j.status = 'unscheduled'; else if (j.status === 'unscheduled') j.status = 'scheduled'; }
    },
  });
}
ROUTES.jobs = () => {
  const f = state.filters.job || 'open';
  const all = db.jobs.filter(divOK);
  const list = all.filter(j => f === 'all' ? true : f === 'open' ? !['completed', 'cancelled'].includes(j.status) : j.status === f).sort((a, b) => (a.start ? new Date(a.start) : 9e15) - (b.start ? new Date(b.start) : 9e15));
  return head('Jobs', `${all.filter(j => !['completed', 'cancelled'].includes(j.status)).length} open jobs`, `<button class="btn" data-act="exportCsv" data-what="jobs">⇩ CSV</button><button class="btn primary" data-act="newJob">＋ Job</button>`) + `
  <div class="card"><div class="toolbar">${[['open', 'Open'], ['all', 'All'], ...Object.entries(JOB_ST).map(([k, v]) => [k, v[0]])].map(([k, v]) => `<button class="btn sm ${f === k ? 'primary' : ''}" data-act="filt" data-f="job" data-v="${k}">${v} <span class="muted">${k === 'all' ? all.length : k === 'open' ? all.filter(j => !['completed', 'cancelled'].includes(j.status)).length : all.filter(j => j.status === k).length}</span></button>`).join('')}</div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Job</th><th>Customer</th><th>Scheduled</th><th>Crew</th><th>Progress</th><th class="right">Amount</th><th>Status</th></tr></thead><tbody>
  ${list.map(j => { const done = j.checklist.filter(c => c.done).length; return `<tr class="click" data-go="#/job/${j.id}"><td class="b">${j.number}</td><td><div class="b">${esc(j.title)}</div>${divPill(j.division)}</td><td>${custLink(j.customerId)}<div class="small muted">${esc(cust(j.customerId).city || '')}</div></td><td>${j.start ? fDay(j.start) + '<div class="small muted">' + fTime(j.start) + ' · ' + j.duration + 'h</div>' : '<span class="muted">—</span>'}</td><td><div class="row">${j.techIds.map(t => avatar(tech(t))).join('') || '<span class="muted small">Unassigned</span>'}</div></td><td style="min-width:110px"><div class="progress"><div style="width:${j.checklist.length ? done / j.checklist.length * 100 : 0}%"></div></div><div class="small muted">${done}/${j.checklist.length}</div></td><td class="right">${money(totalOf(j.items))}</td><td>${pill(JOB_ST, j.status)}</td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">No jobs</td></tr>'}
  </tbody></table></div></div>`;
};
ROUTES.job = id => {
  const j = db.jobs.find(x => x.id === id); if (!j) return '<div class="empty">Job not found</div>';
  const c = cust(j.customerId), idx = JOB_FLOW.indexOf(j.status), next = JOB_FLOW[idx + 1];
  const nextLabel = { scheduled: 'Schedule', enroute: '🚚 On the way', inprogress: '▶ Start job', completed: '✓ Complete' }[next];
  const inv = j.invoiceId && db.invoices.find(i => i.id === j.invoiceId);
  const permits = db.permits.filter(p => p.jobId === j.id);
  const done = j.checklist.filter(x => x.done).length;
  return `<div class="small muted mb"><a href="#/jobs">Jobs</a> / ${j.number}</div>` + head(`${j.number} · ${esc(j.title)}`, `${custLink(j.customerId)} · ${divPill(j.division)} · ${j.start ? fDay(j.start) + ' ' + fTime(j.start) + '–' + fTime(jobEnd(j)) : 'Unscheduled'}`,
    `${pill(JOB_ST, j.status)}<button class="btn" data-act="editJob" data-id="${j.id}">Edit</button>${next && j.status !== 'cancelled' ? (next === 'scheduled' ? `<button class="btn primary" data-act="editJob" data-id="${j.id}">Schedule</button>` : `<button class="btn primary" data-act="jobStatus" data-id="${j.id}" data-s="${next}">${nextLabel}</button>`) : ''}${inv ? `<a class="btn" href="#/invoice/${inv.id}">Invoice ${inv.number}</a>` : `<button class="btn ok" data-act="invoiceJob" data-id="${j.id}">$ Invoice</button>`}`) + `
  <div class="card mb"><div class="card-b"><div class="steps">${JOB_FLOW.map((s, i) => `<div class="${i <= idx ? 'on' : ''}">${JOB_ST[s][0]}</div>`).join('')}</div></div></div>
  <div class="grid g-2-1">
    <div>
      <div class="card"><div class="card-h"><h3>Job line items</h3>${j.estimateId ? `<a class="small" href="#/estimate/${j.estimateId}">From estimate →</a>` : ''}</div><div class="card-b">${itemsTable(j.items, !inv, `job:${j.id}`)}</div></div>
      <div class="card mt"><div class="card-h"><h3>Checklist ${DIV[j.division].name} (${done}/${j.checklist.length})</h3><button class="btn sm" data-act="addCheck" data-id="${j.id}">＋ Task</button></div><div class="card-b"><div class="progress mb"><div style="width:${j.checklist.length ? done / j.checklist.length * 100 : 0}%"></div></div>${j.checklist.map(x => `<label class="check"><input type="checkbox" data-act-input="check" data-id="${j.id}" data-c="${x.id}" ${x.done ? 'checked' : ''}><span style="${x.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(x.t)}</span></label>`).join('')}</div></div>
      <div class="card mt"><div class="card-h"><h3>Photos (${j.photos.length})</h3><label class="btn sm">＋ Upload photos<input type="file" accept="image/*" multiple hidden data-act-input="photos" data-id="${j.id}"></label></div><div class="card-b"><div class="row">${j.photos.map((p, i) => `<div style="position:relative"><img src="${p}" alt="Photo ${i + 1}" style="width:120px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><button class="btn sm" style="position:absolute;top:4px;right:4px;padding:1px 6px" data-act="delPhoto" data-id="${j.id}" data-i="${i}">✕</button></div>`).join('') || '<span class="muted small">Upload before/after photos, damage, equipment and nameplates.</span>'}</div></div></div>
    </div>
    <div>
      <div class="card"><div class="card-h"><h3>Customer & location</h3></div><div class="card-b"><div class="b">${esc(c.name)}</div><div class="small muted">${esc(c.address)}, ${esc(c.city)} ${esc(c.zip)}</div><div class="row mt"><a class="btn sm" href="tel:${esc(c.phone)}">✆ Call</a><a class="btn sm" href="sms:${esc(c.phone)}?body=${encodeURIComponent(`Hi ${c.name}, your ${db.settings.company} technician is on the way.`)}">✉ "On the way"</a><a class="btn sm" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.address + ', ' + c.city)}">⌖ Navigate</a></div></div></div>
      <div class="card mt"><div class="card-h"><h3>Assigned crew</h3></div><div class="card-b">${j.techIds.map(t => { const x = tech(t); return x ? `<div class="list-item">${avatar(x)}<div><div class="b">${esc(x.name)}</div><div class="small muted">${esc(x.role)}</div></div></div>` : ''; }).join('') || '<span class="muted">Unassigned</span>'}</div></div>
      ${j.division !== 'hvac' || permits.length ? `<div class="card mt"><div class="card-h"><h3>Permits</h3><button class="btn sm" data-act="newPermit" data-job="${j.id}">＋</button></div><div class="card-b">${permits.map(p => `<div class="list-item"><div style="flex:1"><div class="b">${esc(p.type)}</div><div class="small muted">${esc(p.jurisdiction)} ${p.number ? '· ' + esc(p.number) : ''}</div></div>${pill(PERMIT_ST, p.status)}</div>`).join('') || '<span class="muted small">No permits recorded.</span>'}</div></div>` : ''}
      <div class="card mt"><div class="card-h"><h3>Notes</h3></div><div class="card-b"><textarea class="inp" style="min-height:110px" data-act-input="jobNotes" data-id="${j.id}" placeholder="Internal notes, gate codes, pets…">${esc(j.notes)}</textarea></div></div>
      <div class="row mt"><button class="btn sm danger" data-act="cancelJob" data-id="${j.id}">${j.status === 'cancelled' ? 'Reactivate' : 'Cancel job'}</button><button class="btn sm danger" data-act="delJob" data-id="${j.id}">Delete</button></div>
    </div>
  </div>`;
};
function compressImage(file) {
  return new Promise(res => { const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, 900 / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = img.width * s; cv.height = img.height * s; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', 0.7)); }; img.onerror = () => res(null); img.src = r.result; }; r.readAsDataURL(file); });
}

/* ───────────── FACTURAS ───────────── */
function createInvoice({ customerId, jobId, division, items, note }) {
  const inv = { id: uid(), number: nextNum('inv'), customerId, jobId: jobId || null, division: division || 'hvac', items: items || [], status: 'draft', createdAt: iso(new Date()), due: ymd(addDays(new Date(), 15)), payments: [], notes: note || '' };
  db.invoices.unshift(inv); log(`Invoice ${inv.number} created for ${cust(customerId).name}`); return inv;
}
ROUTES.invoices = () => {
  const f = state.filters.inv || 'all';
  const all = db.invoices.filter(divOK);
  const list = all.filter(i => f === 'all' || invStatus(i) === f).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const open = all.filter(i => ['sent', 'partial', 'overdue'].includes(invStatus(i)));
  const aging = [0, 0, 0, 0]; open.forEach(i => { const d = (Date.now() - parseLocal(i.due)) / DAY; aging[d <= 30 ? 0 : d <= 60 ? 1 : d <= 90 ? 2 : 3] += invBal(i); });
  const m30 = allPayments().filter(divOK).filter(p => (Date.now() - new Date(p.date)) / DAY <= 30).reduce((s, p) => s + num(p.amount), 0);
  return head('Invoices & Payments', 'Invoice, collect and track your receivables', `<button class="btn" data-act="exportCsv" data-what="invoices">⇩ CSV</button><button class="btn primary" data-act="newInvoice">＋ Invoice</button>`) + `
  <div class="grid g4 mb">${kpi('Receivable', money(open.reduce((s, i) => s + invBal(i), 0)), open.length + ' open invoices')}${kpi('Overdue', money(all.filter(i => invStatus(i) === 'overdue').reduce((s, i) => s + invBal(i), 0)), all.filter(i => invStatus(i) === 'overdue').length + ' invoices')}${kpi('Collected (30 days)', money(m30))}${kpi('Aging', `<span style="font-size:13px;font-weight:600">0-30: ${kmoney(aging[0])} · 31-60: ${kmoney(aging[1])}<br>61-90: ${kmoney(aging[2])} · 90+: ${kmoney(aging[3])}</span>`)}</div>
  <div class="card"><div class="toolbar">${[['all', 'All'], ...Object.entries(INV_ST).map(([k, v]) => [k, v[0]])].map(([k, v]) => `<button class="btn sm ${f === k ? 'primary' : ''}" data-act="filt" data-f="inv" data-v="${k}">${v}</button>`).join('')}</div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Customer</th><th>Division</th><th>Issued</th><th>Due</th><th class="right">Total</th><th class="right">Balance</th><th>Status</th></tr></thead><tbody>
  ${list.map(i => `<tr class="click" data-go="#/invoice/${i.id}"><td class="b">${i.number}</td><td>${custLink(i.customerId)}</td><td>${divPill(i.division)}</td><td>${fDate(i.createdAt)}</td><td>${fDate(parseLocal(i.due))}</td><td class="right">${money2(invTotal(i))}</td><td class="right b">${invBal(i) ? money2(invBal(i)) : '—'}</td><td>${pill(INV_ST, invStatus(i))}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No invoices</td></tr>'}
  </tbody></table></div></div>`;
};
ROUTES.invoice = id => {
  const i = db.invoices.find(x => x.id === id); if (!i) return '<div class="empty">Invoice not found</div>';
  const st = invStatus(i), editable = !i.payments.length && st !== 'void';
  return `<div class="small muted mb"><a href="#/invoices">Invoices</a> / ${i.number}</div>` + head(`${i.kind === 'deposit' ? 'Deposit' : 'Invoice'} ${i.number}`, `${custLink(i.customerId)} · ${divPill(i.division)} · Issued ${fDate(i.createdAt)} · Due ${fDate(parseLocal(i.due))}`,
    `${pill(INV_ST, st)}<button class="btn" data-act="previewInv" data-id="${i.id}">⎙ Preview / PDF</button>${!['paid', 'void'].includes(st) ? `<button class="btn primary" data-act="portalLink" data-kind="invoice" data-id="${i.id}">🔗 Payment link</button>` : ''}${st === 'draft' ? `<button class="btn primary" data-act="sendInv" data-id="${i.id}">Send invoice</button>` : ''}${!['paid', 'void'].includes(st) ? `<button class="btn ok" data-act="payInv" data-id="${i.id}">$ Record payment</button>` : ''}${st === 'overdue' ? `<button class="btn" data-act="remindInv" data-id="${i.id}">✉ Reminder</button>` : ''}`) + `
  <div id="portalInfo" class="mb" hidden></div>
  <div class="grid g-2-1">
    <div class="card"><div class="card-h"><h3>Line items</h3>${i.jobId ? `<a class="small" href="#/job/${i.jobId}">Job →</a>` : ''}</div><div class="card-b">${itemsTable(i.items, editable, `inv:${i.id}`)}</div></div>
    <div>
      <div class="card"><div class="card-b"><div class="calc-out"><div><div class="l">Total</div><div class="v">${money2(invTotal(i))}</div></div><div><div class="l">Balance</div><div class="v ${invBal(i) ? 'down' : 'up'}">${money2(invBal(i))}</div></div></div>
      <label class="f mt">Due date<input type="date" class="inp" data-act-input="invDue" data-id="${i.id}" value="${i.due}"></label></div></div>
      <div class="card mt"><div class="card-h"><h3>Payments (${i.payments.length})</h3></div><div class="card-b">${i.payments.map(p => `<div class="list-item"><div style="flex:1"><div class="b">${money2(p.amount)}</div><div class="small muted">${fDate(p.date)} · ${esc(p.method)}${p.ref ? ' · ' + esc(p.ref) : ''}</div></div><button class="btn ghost sm danger" data-act="delPay" data-id="${i.id}" data-p="${p.id}">✕</button></div>`).join('') || '<span class="muted small">No payments recorded.</span>'}</div></div>
      <div class="row mt">${st !== 'void' ? `<button class="btn sm danger" data-act="voidInv" data-id="${i.id}">Void invoice</button>` : ''}</div>
    </div>
  </div>`;
};
function payModal(i) {
  form({ title: `Record payment — ${i.number}`, fields: [{ k: 'amount', label: 'Amount ($)', type: 'number', step: '0.01', value: invBal(i).toFixed(2), required: true }, { k: 'method', label: 'Method', type: 'select', options: PAY_METHODS, value: 'Card' }, { k: 'date', label: 'Date', type: 'date', value: ymd(new Date()) }, { k: 'ref', label: 'Reference / check #', value: '' }], saveLabel: 'Record payment',
    onSave(v) { if (v.amount <= 0) { toast('Invalid amount'); return false; } i.payments.push({ id: uid(), amount: v.amount, method: v.method, date: iso(parseLocal(v.date, '12:00')), ref: v.ref }); if (i.status === 'draft') i.status = 'sent'; log(`Payment of ${money2(v.amount)} received from ${cust(i.customerId).name} (${i.number})`); toast('Payment recorded ✓'); emit('payment.received', 'invoice', i); if (invBal(i) <= 0.009) emit('invoice.paid', 'invoice', i); } });
}

/* ───────────── MEMBRESÍAS ───────────── */
ROUTES.plans = () => {
  const list = db.plans.filter(divOK);
  const active = list.filter(p => p.status === 'active');
  const mrr = active.reduce((s, p) => s + (p.interval === 'month' ? p.price : p.price / 12), 0);
  const due = active.filter(p => parseLocal(p.nextVisit) <= addDays(new Date(), 14));
  return head('Memberships & Maintenance', 'Recurring revenue from HVAC maintenance, Solar Care and Roof Shield plans', `<button class="btn primary" data-act="newPlan">＋ Membership</button>`) + `
  <div class="grid g4 mb">${kpi('Active members', active.length)}${kpi('Monthly recurring revenue', money(mrr))}${kpi('Projected annual revenue', money(mrr * 12))}${kpi('Upcoming visits (14 days)', due.length)}</div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Customer</th><th>Plan</th><th>Division</th><th>Price</th><th>Since</th><th>Next visit</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.map(p => { const late = parseLocal(p.nextVisit) < sod(new Date()); return `<tr><td>${custLink(p.customerId)}</td><td class="b">${esc(p.name)}<div class="small muted">${p.visitsPerYear} visits/year</div></td><td>${divPill(p.division)}</td><td>${money(p.price)}/${p.interval === 'month' ? 'mo' : 'yr'}</td><td>${fDate(parseLocal(p.startDate))}</td><td class="${late && p.status === 'active' ? 'down b' : ''}">${fDate(parseLocal(p.nextVisit))}</td><td>${p.status === 'active' ? '<span class="pill ok">Active</span>' : '<span class="pill">Cancelled</span>'}</td><td class="right"><div class="row" style="justify-content:flex-end">${p.status === 'active' ? `<button class="btn sm primary" data-act="planVisit" data-id="${p.id}">Schedule visit</button>` : ''}<button class="btn sm" data-act="togglePlan" data-id="${p.id}">${p.status === 'active' ? 'Cancel' : 'Reactivate'}</button></div></td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">No memberships</td></tr>'}
  </tbody></table></div></div>`;
};

/* ───────────── PERMISOS ───────────── */
ROUTES.permits = () => {
  const list = db.permits.filter(p => { const j = db.jobs.find(x => x.id === p.jobId); return !j || divOK(j); });
  return head('Permits & Inspections', 'Building, electrical, roofing, utility interconnection and PTO', `<button class="btn primary" data-act="newPermit">＋ Permit</button>`) + `
  <div class="grid g4 mb">${Object.entries(PERMIT_ST).slice(0, 4).map(([k, v]) => kpi(v[0], list.filter(p => p.status === k).length)).join('')}</div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Type</th><th>Job</th><th>Jurisdiction</th><th>Permit #</th><th>Submitted</th><th>Days</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.map(p => { const j = db.jobs.find(x => x.id === p.jobId); const days = p.submitted ? Math.floor((Date.now() - parseLocal(p.submitted)) / DAY) : '—'; return `<tr><td class="b">${esc(p.type)}</td><td>${j ? `<a href="#/job/${j.id}">${j.number}</a> · ${esc(cust(j.customerId).name)}` : '—'}</td><td>${esc(p.jurisdiction)}</td><td>${esc(p.number || '—')}</td><td>${p.submitted ? fDate(parseLocal(p.submitted)) : '—'}</td><td>${days}</td><td><select class="inp" style="padding:5px 8px;width:auto" data-act-input="permitSt" data-id="${p.id}">${Object.entries(PERMIT_ST).map(([k, v]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></td><td class="right"><button class="btn sm" data-act="editPermit" data-id="${p.id}">Edit</button></td></tr>${p.notes ? `<tr><td></td><td colspan="7" class="small muted" style="padding-top:0">↳ ${esc(p.notes)}</td></tr>` : ''}`; }).join('') || '<tr><td colspan="8" class="empty">No permits</td></tr>'}
  </tbody></table></div></div>`;
};
function permitModal(p, jobId) {
  const isNew = !p; p = p || { status: 'todo', jobId };
  form({ title: isNew ? 'New permit' : 'Edit permit', fields: [
    { k: 'jobId', label: 'Job', type: 'select', options: db.jobs.map(j => [j.id, `${j.number} · ${j.title} (${cust(j.customerId).name})`]), value: p.jobId, full: true },
    { k: 'type', label: 'Type', type: 'select', options: PERMIT_TYPES, value: p.type }, { k: 'jurisdiction', label: 'Jurisdiction / utility', value: p.jurisdiction, required: true },
    { k: 'number', label: 'Permit #', value: p.number }, { k: 'status', label: 'Status', type: 'select', options: Object.entries(PERMIT_ST).map(([k, v]) => [k, v[0]]), value: p.status },
    { k: 'submitted', label: 'Submitted on', type: 'date', value: p.submitted }, { k: 'notes', label: 'Notes', type: 'textarea', full: true, value: p.notes },
  ], extraFoot: isNew ? '' : '<button class="btn danger" id="pmDel" style="margin-right:auto">Delete</button>',
  onSave(v) { v.updated = ymd(new Date()); if (isNew) { db.permits.unshift({ id: uid(), ...v }); log(`${v.type} permit added`); } else Object.assign(p, v); } });
  if (!isNew) $('#pmDel').onclick = () => { $('.modal-bg:last-child').remove(); confirmDlg('Delete this permit?', () => { db.permits = db.permits.filter(x => x.id !== p.id); }); };
}

/* ───────────── CALCULADORAS ───────────── */
ROUTES.tools = () => {
  const tab = state.tabs.tools || 'solar';
  const t = state.tools = state.tools || { solar: { kwh: 1100, sun: 5.2, offset: 100, watts: 410, ppw: 3.1, rate: 0.32, esc: 3, incentive: 0, battery: 0 }, roof: { area: 2200, pitch: 6, waste: 12, material: 0, tearoff: 1, layers: 1 }, hvac: { sqft: 2000, zone: 30, ceiling: 8, insul: 1, people: 4 } };
  let body = '';
  if (tab === 'solar') {
    const s = t.solar, annual = s.kwh * 12 * s.offset / 100, kw = annual / (s.sun * 365 * 0.8), panels = Math.ceil(kw * 1000 / s.watts), sysKw = panels * s.watts / 1000;
    const prod = sysKw * s.sun * 365 * 0.8, gross = sysKw * 1000 * s.ppw + (s.battery ? 13500 * s.battery : 0), net = gross * (1 - s.incentive / 100);
    let sav = 0, y1 = Math.min(prod, s.kwh * 12) * s.rate, payback = null, cum = 0; for (let y = 0; y < 25; y++) { const v = Math.min(prod * Math.pow(0.995, y), s.kwh * 12) * s.rate * Math.pow(1 + s.esc / 100, y); sav += v; cum += v; if (payback === null && cum >= net) payback = y + 1; }
    body = calcCard('Solar system sizing', [
      ['solar.kwh', 'Monthly usage (kWh)', s.kwh], ['solar.rate', 'Utility rate ($/kWh)', s.rate, '0.01'], ['solar.sun', 'Peak sun hours / day', s.sun, '0.1'], ['solar.offset', 'Target offset (%)', s.offset],
      ['solar.watts', 'Panel wattage (W)', s.watts], ['solar.ppw', 'Price per watt ($/W)', s.ppw, '0.05'], ['solar.esc', 'Annual rate increase (%)', s.esc, '0.5'], ['solar.incentive', 'Incentives / rebates (%)', s.incentive], ['solar.battery', '13.5 kWh batteries (qty)', s.battery],
    ], [['System size', sysKw.toFixed(2) + ' kW'], ['Panels', panels + ' × ' + s.watts + 'W'], ['Annual production', Math.round(prod).toLocaleString() + ' kWh'], ['Gross price', money(gross)], ['Net cost', money(net)], ['Year 1 savings', money(y1)], ['25-year savings', money(sav)], ['Payback', payback ? payback + ' years' : '> 25 years']],
    'The residential federal tax credit (25D) ended for systems installed after 12/31/2025. Use "Incentives" for state or utility programs, or the commercial credit (48E) where it applies.', `data-act="calcEst" data-k="solar" data-panels="${panels}" data-bat="${s.battery}"`);
  }
  if (tab === 'roof') {
    const r = t.roof, factor = Math.sqrt(1 + Math.pow(r.pitch / 12, 2)), surface = r.area * factor, sq = surface / 100 * (1 + r.waste / 100), sqR = Math.ceil(sq * 3) / 3;
    const mats = [['Architectural asphalt shingle', 0], ['Standing seam metal', 1]], matPb = db.pricebook.filter(p => p.division === 'roofing');
    const unitP = matPb[r.material ? 1 : 0]?.price || 520, tear = r.tearoff ? (matPb[2]?.price || 95) * Math.ceil(surface / 100) * r.layers : 0;
    const total = unitP * sqR + tear + Math.ceil(surface / 100 / 10) * (matPb[4]?.price || 140);
    body = calcCard('Roof measurement', [
      ['roof.area', 'Footprint area (ft²)', r.area], ['roof.pitch', 'Pitch (x/12)', r.pitch, '1'], ['roof.waste', 'Waste (%)', r.waste], ['roof.material', 'Material (0 = asphalt, 1 = metal)', r.material, '1'], ['roof.tearoff', 'Tear-off (1 = yes, 0 = no)', r.tearoff, '1'], ['roof.layers', 'Layers to remove', r.layers, '1'],
    ], [['Pitch factor', factor.toFixed(3)], ['Actual roof surface', Math.round(surface).toLocaleString() + ' ft²'], ['Squares (with waste)', sqR.toFixed(1)], ['Shingle bundles', r.material ? 'N/A' : Math.ceil(sqR * 3)], ['Underlayment rolls', Math.ceil(surface / 1000)], ['Material', mats[r.material ? 1 : 0][0]], ['Estimated price', money(total)], ['Price per square', money(total / Math.max(sqR, 1))]],
    'Pitches of 8/12 or steeper and 2-story roofs usually need a safety surcharge. Verify measurements with a drone or aerial report.', `data-act="calcEst" data-k="roof" data-sq="${sqR.toFixed(1)}" data-tear="${r.tearoff ? Math.ceil(surface / 100) * r.layers : 0}" data-mat="${r.material ? 1 : 0}" data-ice="${Math.ceil(surface / 100 / 10)}"`);
  }
  if (tab === 'hvac') {
    const h = t.hvac, mult = [1.15, 1, 0.9][h.insul] ?? 1, btu = h.sqft * h.zone * (h.ceiling / 8) * mult + Math.max(0, h.people - 2) * 600, tons = Math.max(1.5, Math.round(btu / 12000 * 2) / 2);
    body = calcCard('Approximate load calculation', [
      ['hvac.sqft', 'Conditioned area (ft²)', h.sqft], ['hvac.zone', 'BTU per ft² (climate: 20 cold – 35 very hot)', h.zone], ['hvac.ceiling', 'Ceiling height (ft)', h.ceiling], ['hvac.insul', 'Insulation (0 poor, 1 average, 2 good)', h.insul, '1'], ['hvac.people', 'Occupants', h.people],
    ], [['Estimated load', Math.round(btu).toLocaleString() + ' BTU/h'], ['Recommended size', tons + ' tons'], ['Good', `${tons} ton · 14.3 SEER2`], ['Better', `${tons} ton · 16 SEER2 heat pump`], ['Best', `${tons} ton · 18+ SEER2 inverter`], ['Approx. CFM', Math.round(tons * 400) + ' CFM']],
    'Quick estimate for sales. Run a full Manual J calculation for the final design.', `data-act="calcEst" data-k="hvac" data-tons="${tons}"`);
  }
  return head('Calculators', 'Field tools to quote faster — turn any result into an estimate with one click') + `<div class="tabs">${[['solar', '☀ Solar'], ['roof', '⌂ Roofing'], ['hvac', '❄ HVAC']].map(([k, v]) => `<button data-act="tab" data-t="tools" data-v="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>${body}`;
};
function calcCard(title, inputs, outputs, note, estAttrs) {
  return `<div class="grid g2"><div class="card"><div class="card-h"><h3>${title}</h3></div><div class="card-b form">${inputs.map(([k, l, v, step]) => `<label class="f">${l}<input type="number" step="${step || 'any'}" value="${v}" data-act-input="calc" data-k="${k}"></label>`).join('')}</div></div>
  <div class="card"><div class="card-h"><h3>Result</h3></div><div class="card-b"><div class="calc-out">${outputs.map(([l, v]) => `<div><div class="l">${l}</div><div class="v">${v}</div></div>`).join('')}</div><p class="small muted">${note}</p><button class="btn primary" ${estAttrs}>→ Create estimate from this result</button></div></div></div>`;
}

/* ───────────── REPORTES ───────────── */
ROUTES.reports = () => {
  const range = state.filters.range || 90, since = Date.now() - range * DAY;
  const pays = allPayments().filter(p => new Date(p.date) >= since);
  const byDiv = Object.keys(DIV).map(k => { const inv = db.invoices.filter(i => i.division === k && new Date(i.createdAt) >= since && i.status !== 'void'); const rev = inv.reduce((s, i) => s + subtotal(i.items), 0), cost = inv.reduce((s, i) => s + costOf(i.items), 0); return { k, collected: pays.filter(p => p.division === k).reduce((s, p) => s + num(p.amount), 0), billed: rev, margin: rev ? (rev - cost) / rev : 0, count: inv.length, avg: inv.length ? rev / inv.length : 0 }; });
  const maxB = Math.max(1, ...byDiv.map(d => d.billed));
  const techRows = db.techs.map(t => { const js = db.jobs.filter(j => j.techIds.includes(t.id) && j.status === 'completed' && j.start && new Date(j.start) >= since); return { t, n: js.length, hrs: js.reduce((s, j) => s + num(j.duration), 0), rev: js.reduce((s, j) => s + subtotal(j.items) / Math.max(1, j.techIds.length), 0) }; });
  const srcRows = SOURCES.map(s => { const ls = db.leads.filter(l => l.source === s); const won = ls.filter(l => l.stage === 'won'); return { s, n: ls.length, won: won.length, val: won.reduce((a, l) => a + num(l.value), 0) }; }).filter(r => r.n);
  const ests = db.estimates.filter(e => new Date(e.createdAt) >= since);
  return head('Reports', 'Performance by division, technician and lead source', `<select class="inp" style="width:auto" data-act-input="range">${[[30, 'Last 30 days'], [90, 'Last 90 days'], [180, 'Last 6 months'], [365, 'Last year']].map(([v, l]) => `<option value="${v}" ${+range === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`) + `
  <div class="grid g4 mb">${kpi('Collected', money(pays.reduce((s, p) => s + num(p.amount), 0)))}${kpi('Billed', money(byDiv.reduce((s, d) => s + d.billed, 0)))}${kpi('Estimates created', ests.length, pct(ests.filter(e => e.status === 'approved').length / Math.max(1, ests.length)) + ' approved')}${kpi('Average ticket', money(byDiv.reduce((s, d) => s + d.billed, 0) / Math.max(1, byDiv.reduce((s, d) => s + d.count, 0))))}</div>
  <div class="grid g2">
    <div class="card"><div class="card-h"><h3>By division</h3></div><div class="card-b">${byDiv.map(d => `<div class="mb"><div class="row" style="justify-content:space-between"><span>${divPill(d.k)}</span><span class="small muted">${d.count} invoices · avg ticket ${money(d.avg)} · margin ${pct(d.margin)}</span></div><div class="progress mt" style="height:12px"><div style="width:${d.billed / maxB * 100}%;background:${DIV[d.k].color}"></div></div><div class="row small mt" style="justify-content:space-between"><span>Billed <b>${money(d.billed)}</b></span><span>Collected <b>${money(d.collected)}</b></span></div></div>`).join('')}</div></div>
    <div class="card"><div class="card-h"><h3>Technician performance</h3></div><div class="table-wrap"><table><thead><tr><th>Technician</th><th class="right">Jobs</th><th class="right">Hours</th><th class="right">Revenue</th></tr></thead><tbody>${techRows.map(r => `<tr><td><div class="row">${avatar(r.t)} ${esc(r.t.name)}</div></td><td class="right">${r.n}</td><td class="right">${r.hrs}</td><td class="right b">${money(r.rev)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>Lead source ROI</h3></div><div class="table-wrap"><table><thead><tr><th>Source</th><th class="right">Leads</th><th class="right">Won</th><th class="right">Conversion</th><th class="right">Won value</th></tr></thead><tbody>${srcRows.map(r => `<tr><td>${esc(r.s)}</td><td class="right">${r.n}</td><td class="right">${r.won}</td><td class="right">${pct(r.won / r.n)}</td><td class="right b">${money(r.val)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>Estimate funnel</h3></div><div class="card-b">${Object.entries(EST_ST).map(([k, v]) => { const n = ests.filter(e => e.status === k).length; return `<div class="mb"><div class="row" style="justify-content:space-between"><span>${v[0]}</span><b>${n} · ${money(ests.filter(e => e.status === k).reduce((s, e) => s + (k === 'approved' ? estTotal(e) : estMax(e)), 0))}</b></div><div class="progress"><div style="width:${n / Math.max(1, ests.length) * 100}%"></div></div></div>`; }).join('')}</div></div>
  </div>`;
};

/* ───────────── LISTA DE PRECIOS ───────────── */
ROUTES.pricebook = () => {
  const list = db.pricebook.filter(divOK);
  return head('Price Book', 'Standard services and materials with cost and margin', `<button class="btn primary" data-act="newPb">＋ Item</button>`) + `
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Item</th><th>Division</th><th>Unit</th><th class="right">Cost</th><th class="right">Price</th><th class="right">Margin</th><th></th></tr></thead><tbody>
  ${list.map(p => `<tr class="click" data-act="editPb" data-id="${p.id}"><td class="b">${esc(p.name)}</td><td>${divPill(p.division)}</td><td>${esc(p.unit)}</td><td class="right">${money2(p.cost)}</td><td class="right b">${money2(p.price)}</td><td class="right ${p.price && (p.price - p.cost) / p.price < 0.3 ? 'down' : 'up'}">${p.price ? pct((p.price - p.cost) / p.price) : '—'}</td><td class="right muted">Edit</td></tr>`).join('')}
  </tbody></table></div></div>`;
};
function pbModal(p) {
  const isNew = !p; p = p || { division: state.div !== 'all' ? state.div : 'hvac', unit: 'each', price: 0, cost: 0 };
  form({ title: isNew ? 'New item' : 'Edit item', fields: [{ k: 'name', label: 'Name', value: p.name, required: true, full: true }, { k: 'division', label: 'Division', type: 'select', options: divOptions(), value: p.division }, { k: 'unit', label: 'Unit', value: p.unit }, { k: 'cost', label: 'Cost ($)', type: 'number', step: '0.01', value: p.cost }, { k: 'price', label: 'Price ($)', type: 'number', step: '0.01', value: p.price }],
    extraFoot: isNew ? '' : '<button class="btn danger" id="pbDel" style="margin-right:auto">Delete</button>',
    onSave(v) { if (isNew) db.pricebook.unshift({ id: uid(), ...v }); else Object.assign(p, v); } });
  if (!isNew) $('#pbDel').onclick = () => { $('.modal-bg:last-child').remove(); confirmDlg('Delete this item?', () => { db.pricebook = db.pricebook.filter(x => x.id !== p.id); }); };
}

/* ───────────── EQUIPO ───────────── */
ROUTES.team = () => {
  const ws = weekStart(new Date());
  return head('Team', 'Technicians, roles and this week’s workload', `<button class="btn primary" data-act="newTech">＋ Technician</button>`) + `<div class="grid g3">${db.techs.filter(t => state.div === 'all' || t.division === state.div).map(t => {
    const wk = db.jobs.filter(j => j.techIds.includes(t.id) && j.start && new Date(j.start) >= ws && new Date(j.start) < addDays(ws, 7)), hrs = wk.reduce((s, j) => s + num(j.duration), 0);
    const today = db.jobs.filter(j => j.techIds.includes(t.id) && j.start && sameDay(j.start, new Date()));
    const cur = today.find(j => ['enroute', 'inprogress'].includes(j.status));
    return `<div class="card"><div class="card-b"><div class="row">${avatar(t).replace('width:28px', '')}<div style="flex:1"><div class="b">${esc(t.name)}</div><div class="small muted">${esc(t.role)}</div></div>${divPill(t.division)}</div>
    <div class="mt small">${cur ? `<span class="pill brand">${JOB_ST[cur.status][0]}</span> ${esc(cur.title)}` : today.length ? `<span class="pill info">${today.length} jobs today</span>` : '<span class="pill">Available</span>'}</div>
    <div class="mt"><div class="row small" style="justify-content:space-between"><span>Weekly utilization</span><b>${hrs}h / 40h</b></div><div class="progress"><div style="width:${Math.min(100, hrs / 40 * 100)}%;background:${hrs > 40 ? 'var(--bad)' : t.color}"></div></div></div>
    <div class="row mt"><a class="btn sm" href="tel:${esc(t.phone)}">✆ ${esc(t.phone)}</a><button class="btn sm" data-act="editTech" data-id="${t.id}">Edit</button></div></div></div>`;
  }).join('')}</div>`;
};
function techModal(t) {
  const isNew = !t; t = t || { color: '#6366f1', division: 'hvac' };
  form({ title: isNew ? 'New technician' : 'Edit technician', fields: [{ k: 'name', label: 'Name', value: t.name, required: true }, { k: 'role', label: 'Role', value: t.role }, { k: 'division', label: 'Division', type: 'select', options: divOptions(), value: t.division }, { k: 'phone', label: 'Phone', value: t.phone }, { k: 'color', label: 'Schedule color', type: 'color', value: t.color }],
    extraFoot: isNew ? '' : '<button class="btn danger" id="tDel" style="margin-right:auto">Delete</button>',
    onSave(v) { if (isNew) db.techs.push({ id: uid(), ...v }); else Object.assign(t, v); } });
  if (!isNew) $('#tDel').onclick = () => { $('.modal-bg:last-child').remove(); confirmDlg('Delete this technician? Their jobs will become unassigned.', () => { db.techs = db.techs.filter(x => x.id !== t.id); db.jobs.forEach(j => j.techIds = j.techIds.filter(x => x !== t.id)); }); };
}

/* ───────────── CONFIGURACIÓN ───────────── */
const canAdmin = () => !cloud.on || ['owner', 'admin'].includes(cloud.role);
ROUTES['settings:after'] = async () => {
  const box = $('#acl'); if (!box) return;
  const [{ data: mem, error: e1 }, inv] = await Promise.all([cloud.sb.from('opsboss_members').select('*').order('created_at'), canAdmin() ? cloud.sb.from('opsboss_invites').select('*').order('created_at') : Promise.resolve({ data: [] })]);
  if (!$('#acl')) return;
  if (e1) { box.innerHTML = `<div class="auth-msg bad">${esc(e1.message)}</div>`; return; }
  const roles = Object.entries(ROLE_LABEL).filter(([k]) => k !== 'owner' || cloud.role === 'owner');
  box.innerHTML = `${mem.map(m => `<div class="list-item"><span class="avatar" style="background:#6366f1">${initials(m.name || m.email)}</span><div style="flex:1;min-width:0"><div class="b">${esc(m.name || '')}</div><div class="small muted">${esc(m.email)}</div></div>${canAdmin() && m.user_id !== cloud.user.id && (m.role !== 'owner' || cloud.role === 'owner') ? `<select class="inp" style="width:auto;padding:5px 8px" data-act-input="memberRole" data-id="${m.user_id}">${roles.map(([k, v]) => `<option value="${k}" ${m.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn ghost sm danger" data-act="removeMember" data-id="${m.user_id}" title="Remove access">✕</button>` : `<span class="pill">${ROLE_LABEL[m.role]}</span>`}</div>`).join('')}
  ${canAdmin() ? `${(inv.data || []).map(i => `<div class="list-item"><span class="pill warn">Invited</span><div style="flex:1;min-width:0" class="small">${esc(i.email)} · ${ROLE_LABEL[i.role]}</div><button class="btn ghost sm danger" data-act="removeInvite" data-email="${esc(i.email)}">✕</button></div>`).join('')}
  <form class="row mt" id="inviteForm"><input class="inp" type="email" name="email" required placeholder="email@nexispower.com" style="flex:1;min-width:180px"><select class="inp" name="role" style="width:auto">${roles.map(([k, v]) => `<option value="${k}" ${k === 'office' ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn primary">Invite</button></form>
  <p class="small muted">The invited person signs in at <b>${esc(location.origin + location.pathname)}</b> with that email (the first time, using "Create account").</p>` : ''}`;
  const f = $('#inviteForm');
  if (f) f.onsubmit = async ev => { ev.preventDefault(); const email = f.email.value.trim().toLowerCase(), role = f.role.value; const { error } = await cloud.sb.from('opsboss_invites').upsert({ email, role, invited_by: cloud.user.id }); if (error) toast(error.message); else { toast('Invitation created for ' + email); ROUTES['settings:after'](); } };
};
ROUTES.settings = () => {
  const s = db.settings;
  const f = (k, l, type = 'text', step) => `<label class="f">${l}<input class="inp" type="${type}" ${step ? `step="${step}"` : ''} data-act-input="setting" data-k="${k}" value="${esc(s[k])}"></label>`;
  return head('Settings', 'Company info, tax, financing and backups') + `
  <div class="grid g2">
    <div class="card"><div class="card-h"><h3>Company</h3></div><div class="card-b form">${f('company', 'Business name')}${f('license', 'Licenses')}${f('phone', 'Phone')}${f('email', 'Email', 'email')}<div class="full">${f('address', 'Address')}</div><label class="f full">Terms on documents<textarea class="inp" data-act-input="setting" data-k="terms">${esc(s.terms)}</textarea></label></div></div>
    <div>
      <div class="card mb"><div class="card-h"><h3>Customer portal & online payments</h3></div><div class="card-b">
        <label class="check"><input type="checkbox" data-act-input="settingBool" data-k="paymentsEnabled" ${s.paymentsEnabled ? 'checked' : ''}><span><b>Accept card / ACH payments (Stripe)</b> in the portal</span></label>
        <p class="small muted">Requires a one-time Stripe setup (see the OpsBoss README). When off, customers can still view, sign and approve; they just won’t see the Pay button.</p>
        <label class="f">Other payment methods (shown in the portal)<textarea class="inp" data-act-input="setting" data-k="payInstructions" placeholder="e.g. Zelle: payments@nexispower.com · Checks payable to Nexis Power">${esc(s.payInstructions || '')}</textarea></label>
      </div></div>
      <div class="card"><div class="card-h"><h3>Tax & financing</h3></div><div class="card-b form">${f('taxRate', 'Sales tax (%)', 'number', '0.01')}${f('apr', 'Financing APR (%)', 'number', '0.01')}${f('term', 'Term (months)', 'number')}</div></div>
      <div class="card mt"><div class="card-h"><h3>Data & backup</h3></div><div class="card-b"><p class="small muted">${cloud.on ? 'Data is stored in Supabase and shared live with your team. Export a backup from time to time.' : 'Local mode: data is stored only in this browser. Export backups often.'}</p><div class="row"><button class="btn" data-act="exportJson">⇩ Export backup (JSON)</button>${canAdmin() ? `<label class="btn">⇧ Import backup<input type="file" accept="application/json" hidden data-act-input="importJson"></label><button class="btn danger" data-act="resetDemo">Reset demo data</button><button class="btn danger" data-act="wipe">Start blank</button>` : ''}</div></div></div>
      ${cloud.on ? `<div class="card mt"><div class="card-h"><h3>Team & access</h3><span class="pill brand">Your role: ${ROLE_LABEL[cloud.role] || cloud.role}</span></div><div class="card-b" id="acl"><span class="muted small">Loading…</span></div></div>` : ''}
    </div>
  </div>`;
};

/* ───────────── WORKFLOWS (automatizaciones) ───────────── */
const WF_TRIGGERS = {
  'lead.created': { label: 'A lead is created', kind: 'lead', group: 'Sales' },
  'lead.stage': { label: 'A lead changes stage', kind: 'lead', group: 'Sales', param: 'stage' },
  'customer.created': { label: 'A customer is created', kind: 'customer', group: 'Sales' },
  'estimate.sent': { label: 'An estimate is sent', kind: 'estimate', group: 'Sales' },
  'estimate.approved': { label: 'An estimate is approved', kind: 'estimate', group: 'Sales' },
  'estimate.declined': { label: 'An estimate is declined', kind: 'estimate', group: 'Sales' },
  'job.created': { label: 'A job is created', kind: 'job', group: 'Operations' },
  'job.status': { label: 'A job changes status', kind: 'job', group: 'Operations', param: 'status' },
  'invoice.sent': { label: 'An invoice is sent', kind: 'invoice', group: 'Billing' },
  'payment.received': { label: 'A payment is recorded', kind: 'invoice', group: 'Billing' },
  'invoice.paid': { label: 'An invoice is paid in full', kind: 'invoice', group: 'Billing' },
  'time.estimate_no_reply': { label: 'Estimate sent with no reply for N days', kind: 'estimate', group: 'Time-based', timer: true },
  'time.lead_stale': { label: 'Lead stuck in the same stage for N days', kind: 'lead', group: 'Time-based', timer: true },
  'time.invoice_overdue': { label: 'Invoice overdue by N days', kind: 'invoice', group: 'Time-based', timer: true },
  'time.job_completed_ago': { label: 'N days after a job is completed', kind: 'job', group: 'Time-based', timer: true },
  'time.plan_visit_due': { label: 'Membership visit due in N days', kind: 'plan', group: 'Time-based', timer: true },
};
const WF_ACTIONS = {
  task: 'Create task', message: 'Prepare SMS / email to customer', move_lead: 'Move lead to a stage', invoice_job: 'Create invoice from job',
  assign_tech: 'Assign technician to job', tag: 'Tag the customer', note: 'Log a note in activity', notify: 'Show on-screen notice',
};
const WF_VARS = ['{{customer}}', '{{first_name}}', '{{phone}}', '{{title}}', '{{number}}', '{{amount}}', '{{balance}}', '{{division}}', '{{company}}', '{{company_phone}}'];
const wfTemplates = () => [
  { name: 'Speed to lead', trigger: { type: 'lead.created' }, cond: {}, actions: [{ type: 'task', title: 'Call {{customer}} — {{title}}', days: 0 }, { type: 'message', channel: 'sms', body: 'Hi {{first_name}}, thanks for reaching out to {{company}}! We’ll call you today about your {{division}} project.' }] },
  { name: 'Estimate follow-up', trigger: { type: 'time.estimate_no_reply', days: 3 }, cond: {}, actions: [{ type: 'task', title: 'Follow up on estimate {{number}} for {{customer}} ({{amount}})', days: 0 }, { type: 'message', channel: 'sms', body: 'Hi {{first_name}}, did you get a chance to review estimate {{number}} from {{company}}? Happy to answer any questions or walk you through financing options.' }] },
  { name: 'Solar project kickoff', trigger: { type: 'estimate.approved' }, cond: { division: 'solar' }, actions: [{ type: 'task', title: 'Schedule site survey — {{customer}}', days: 1 }, { type: 'task', title: 'Design and permit package — {{customer}}', days: 3 }, { type: 'task', title: 'Submit interconnection application — {{customer}}', days: 5 }, { type: 'message', channel: 'email', body: 'Hi {{first_name}}, welcome to {{company}}! Your solar project is approved. We’ll reach out within 48 hours to schedule your site visit.' }] },
  { name: 'Roofing project kickoff', trigger: { type: 'estimate.approved' }, cond: { division: 'roofing' }, actions: [{ type: 'task', title: 'Apply for roofing permit — {{customer}}', days: 1 }, { type: 'task', title: 'Order materials and dumpster — {{customer}}', days: 2 }] },
  { name: 'Job completed → invoice + review', trigger: { type: 'job.status', status: 'completed' }, cond: {}, actions: [{ type: 'invoice_job' }, { type: 'message', channel: 'sms', body: 'Thanks {{first_name}} for choosing {{company}}! If you’re happy with the work, would you leave us a Google review? It means a lot to us.' }] },
  { name: 'Overdue invoice collections', trigger: { type: 'time.invoice_overdue', days: 1 }, cond: {}, actions: [{ type: 'message', channel: 'sms', body: 'Hi {{first_name}}, friendly reminder that invoice {{number}} from {{company}} has a balance of {{balance}}. You can reach us at {{company_phone}}. Thank you!' }, { type: 'task', title: 'Collections call for {{number}} ({{balance}}) — {{customer}}', days: 2 }] },
  { name: 'Schedule membership visits', trigger: { type: 'time.plan_visit_due', days: 7 }, cond: {}, actions: [{ type: 'task', title: 'Schedule membership visit — {{customer}}', days: 0 }] },
  { name: 'Stale lead alert', trigger: { type: 'time.lead_stale', days: 5 }, cond: {}, actions: [{ type: 'task', title: 'Revive stale lead: {{title}} ({{customer}})', days: 0 }, { type: 'notify', text: 'Stale lead: {{title}} for {{customer}}' }] },
];
// Nombres de las plantillas anteriores (en español), para migrarlas a inglés
const WF_TEMPLATE_ES = ['Responder rápido a nuevos leads', 'Seguimiento de estimados sin respuesta', 'Arranque de proyecto solar', 'Arranque de proyecto de techo', 'Trabajo completado → factura y reseña', 'Cobranza de facturas vencidas', 'Agendar visitas de membresía', 'Alerta de leads estancados'];
const wfFromTemplate = (t, active = true) => ({ id: uid(), ...JSON.parse(JSON.stringify(t)), active, activatedAt: iso(new Date()), createdAt: iso(new Date()), runs: 0, lastRun: null });

function wfInfo(kind, rec) {
  const c = kind === 'customer' ? rec : cust(rec.customerId);
  const value = kind === 'lead' ? num(rec.value) : kind === 'estimate' ? (rec.status === 'approved' ? estTotal(rec) : estMax(rec)) : kind === 'job' ? totalOf(rec.items) : kind === 'invoice' ? invTotal(rec) : kind === 'plan' ? num(rec.price) : custLTV(rec.id);
  return { c, value, division: rec.division || null, balance: kind === 'invoice' ? invBal(rec) : 0 };
}
function wfFill(tpl, kind, rec) {
  const { c, value, division, balance } = wfInfo(kind, rec), s = db.settings;
  const vars = { customer: c.name, first_name: String(c.name || '').split(' ')[0], phone: c.phone, email: c.email, title: rec.title || rec.name || '', number: rec.number || '', amount: money(value), balance: money2(balance), division: division ? DIV[division].name : '', company: s.company, company_phone: s.phone };
  // alias en español para workflows antiguos
  Object.assign(vars, { cliente: vars.customer, nombre: vars.first_name, telefono: vars.phone, titulo: vars.title, numero: vars.number, monto: vars.amount, saldo: vars.balance, empresa: vars.company, telefono_empresa: vars.company_phone });
  return String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => vars[k] ?? m);
}
function wfMatches(wf, kind, rec, extra) {
  const t = wf.trigger, k = wf.cond || {}, info = wfInfo(kind, rec);
  if (t.stage && t.stage !== 'any' && extra.to !== t.stage) return false;
  if (t.status && t.status !== 'any' && extra.to !== t.status) return false;
  if (k.division && k.division !== 'any' && info.division !== k.division) return false;
  if (num(k.minValue) && info.value < num(k.minValue)) return false;
  if (k.source && k.source !== 'any' && srcEN(rec.source || info.c.source) !== srcEN(k.source)) return false;
  return true;
}
let wfDepth = 0;
function wfRun(wf, kind, rec) {
  const now = new Date(), c = wfInfo(kind, rec).c, link = { kind, id: rec.id };
  for (const a of wf.actions) {
    if (a.type === 'task') db.tasks.unshift({ id: uid(), title: wfFill(a.title, kind, rec), due: ymd(addDays(now, num(a.days))), assignee: a.tech || (kind === 'job' ? rec.techIds[0] || '' : ''), done: false, customerId: c.id, link, wf: wf.name, createdAt: iso(now) });
    if (a.type === 'message') db.tasks.unshift({ id: uid(), type: 'message', channel: a.channel || 'sms', body: wfFill(a.body, kind, rec), title: `${a.channel === 'email' ? 'Send email' : 'Send SMS'} to ${c.name}`, due: ymd(addDays(now, num(a.days))), assignee: '', done: false, customerId: c.id, link, wf: wf.name, createdAt: iso(now) });
    if (a.type === 'move_lead' && a.stage) {
      const lead = kind === 'lead' ? rec : db.leads.find(l => l.customerId === c.id && (!rec.division || l.division === rec.division) && !['won', 'lost'].includes(l.stage));
      if (lead && lead.stage !== a.stage) { lead.stage = a.stage; lead.stageAt = iso(now); emit('lead.stage', 'lead', lead, { to: a.stage }); }
    }
    if (a.type === 'invoice_job' && kind === 'job' && !rec.invoiceId) invoiceFromJob(rec);
    if (a.type === 'assign_tech' && kind === 'job' && a.tech && !rec.techIds.includes(a.tech)) rec.techIds.push(a.tech);
    if (a.type === 'tag' && a.tag && c.id) { c.tags = c.tags || []; if (!c.tags.includes(a.tag)) c.tags.push(a.tag); }
    if (a.type === 'note') log(wfFill(a.text, kind, rec));
    if (a.type === 'notify') toast('⚡ ' + wfFill(a.text, kind, rec));
  }
  wf.runs = (wf.runs || 0) + 1; wf.lastRun = iso(now);
  log(`⚡ Workflow "${wf.name}" — ${c.name || ''}`);
}
// Dispara los workflows de un evento. Devuelve cuántos se ejecutaron.
function emit(event, kind, rec, extra = {}) {
  if (!db.workflows || wfDepth > 3) return 0;
  let n = 0; wfDepth++;
  try { for (const wf of db.workflows) if (wf.active && wf.trigger.type === event && wfMatches(wf, kind, rec, extra)) { wfRun(wf, kind, rec); n++; } } catch (e) { console.error('workflow', e); }
  finally { wfDepth--; }
  if (n && wfDepth === 0) { save(); toast(`⚡ ${n} workflow${n > 1 ? 's' : ''} ran`); }
  return n;
}
// Disparadores por tiempo: se revisan al abrir la app y cada 5 minutos.
function wfTimers() {
  if (!db || !db.workflows) return;
  const now = Date.now(); let n = 0;
  for (const wf of db.workflows) {
    const T = WF_TRIGGERS[wf.trigger.type]; if (!wf.active || !T || !T.timer) continue;
    const days = num(wf.trigger.days) * DAY, since = new Date(wf.activatedAt || wf.createdAt).getTime() - DAY;
    let cands = [];
    if (wf.trigger.type === 'time.estimate_no_reply') cands = db.estimates.filter(e => e.status === 'sent').map(e => [e, new Date(e.sentAt || e.createdAt).getTime() + days, 'x']);
    if (wf.trigger.type === 'time.lead_stale') cands = db.leads.filter(l => !['won', 'lost'].includes(l.stage)).map(l => [l, new Date(l.stageAt || l.createdAt).getTime() + days, l.stage]);
    if (wf.trigger.type === 'time.invoice_overdue') cands = db.invoices.filter(i => invStatus(i) === 'overdue').map(i => [i, parseLocal(i.due).getTime() + days, i.due]);
    if (wf.trigger.type === 'time.job_completed_ago') cands = db.jobs.filter(j => j.status === 'completed').map(j => [j, new Date(j.completedAt || j.start || j.createdAt).getTime() + days, 'x']);
    if (wf.trigger.type === 'time.plan_visit_due') cands = db.plans.filter(p => p.status === 'active').map(p => [p, parseLocal(p.nextVisit).getTime() - days, p.nextVisit]);
    for (const [rec, at, ver] of cands) {
      if (at > now || at < since) continue;
      const key = wf.id + ':' + ver; rec._wf = rec._wf || {};
      if (rec._wf[key]) continue;
      if (!wfMatches(wf, T.kind, rec, {})) continue;
      rec._wf[key] = iso(new Date()); wfRun(wf, T.kind, rec); n++;
    }
  }
  if (n) { save(); toast(`⚡ ${n} scheduled automation${n > 1 ? 's' : ''} ran`); if (!$('#modalRoot').children.length) render(); }
}
function invoiceFromJob(j) {
  const est = j.estimateId && byId('estimates', j.estimateId);
  const deps = est ? db.invoices.filter(i => i.status !== 'void' && (i.estimateId === est.id || (i.customerId === j.customerId && i.items.some(it => it.name.includes(est.number))))) : [];
  const items = j.items.map(x => ({ ...x, id: uid() }));
  deps.forEach(d => items.push({ id: uid(), name: `Less deposit (${d.number})`, qty: 1, price: -subtotal(d.items), cost: 0 }));
  const inv = createInvoice({ customerId: j.customerId, jobId: j.id, division: j.division, items }); j.invoiceId = inv.id; return inv;
}
const wfTriggerText = t => { const T = WF_TRIGGERS[t.type]; if (!T) return t.type; let s = T.label.replace('N days', `${num(t.days)} day${num(t.days) === 1 ? '' : 's'}`); if (t.stage && t.stage !== 'any') s += ` → ${STAGES.find(x => x[0] === t.stage)?.[1]}`; if (t.status && t.status !== 'any') s += ` → ${JOB_ST[t.status]?.[0]}`; return s; };
const wfCondText = k => { const p = []; if (k.division && k.division !== 'any') p.push('Division ' + DIV[k.division].name); if (num(k.minValue)) p.push('Amount ≥ ' + money(k.minValue)); if (k.source && k.source !== 'any') p.push('Source ' + srcEN(k.source)); return p.join(' · ') || 'Always'; };
const wfActionText = a => a.type === 'task' ? `Task: "${a.title}"${num(a.days) ? ` (due in ${a.days} d)` : ''}` : a.type === 'message' ? `${a.channel === 'email' ? 'Email' : 'SMS'}: "${String(a.body || '').slice(0, 70)}${String(a.body || '').length > 70 ? '…' : ''}"` : a.type === 'move_lead' ? `Move lead to ${STAGES.find(x => x[0] === a.stage)?.[1] || '—'}` : a.type === 'assign_tech' ? `Assign to ${tech(a.tech)?.name || '—'}` : a.type === 'tag' ? `Tag "${a.tag}"` : a.type === 'note' || a.type === 'notify' ? `${WF_ACTIONS[a.type]}: "${a.text}"` : WF_ACTIONS[a.type];

ROUTES.workflows = () => {
  const list = db.workflows || [];
  const unused = wfTemplates().filter(t => !list.some(w => w.name === t.name));
  return head('Workflows', 'Automate your operation: when something happens, OpsBoss creates tasks, prepares messages, moves leads or invoices for you.', `<button class="btn primary" data-act="wfNew">＋ New workflow</button>`) + `
  <div class="grid g3">${list.map(w => `<div class="card" style="${w.active ? '' : 'opacity:.6'}"><div class="card-h"><h3>⚡ ${esc(w.name)}</h3><button class="btn sm ${w.active ? 'ok' : ''}" data-act="wfToggle" data-id="${w.id}">${w.active ? '● Active' : '○ Paused'}</button></div><div class="card-b">
    <div class="small muted b">WHEN</div><div class="mb">${esc(wfTriggerText(w.trigger))}</div>
    <div class="small muted b">IF</div><div class="mb">${esc(wfCondText(w.cond || {}))}</div>
    <div class="small muted b">THEN</div><ol style="margin:4px 0 12px;padding-left:18px">${w.actions.map(a => `<li class="small" style="margin-bottom:4px">${esc(wfActionText(a))}</li>`).join('')}</ol>
    <div class="row" style="justify-content:space-between"><span class="small muted">${w.runs || 0} runs${w.lastRun ? ' · last ' + ago(w.lastRun) + (/^\d/.test(ago(w.lastRun)) ? ' ago' : '') : ''}</span><div class="row"><button class="btn sm" data-act="wfEdit" data-id="${w.id}">Edit</button><button class="btn sm" data-act="wfDup" data-id="${w.id}" title="Duplicate">⧉</button><button class="btn sm danger" data-act="wfDel" data-id="${w.id}" title="Delete">✕</button></div></div>
  </div></div>`).join('') || '<div class="card"><div class="empty">No workflows yet. Create one or start from a template.</div></div>'}</div>
  ${unused.length ? `<h3 class="mt" style="margin-top:28px">Templates</h3><div class="grid g3">${unused.map(t => `<div class="card"><div class="card-b"><div class="b">${esc(t.name)}</div><div class="small muted mt">When: ${esc(wfTriggerText(t.trigger))}${t.cond.division ? ' · ' + DIV[t.cond.division].name : ''}</div><div class="small muted">${t.actions.length} actions</div><button class="btn sm primary mt" data-act="wfAddTpl" data-name="${esc(t.name)}">＋ Use template</button></div></div>`).join('')}</div>` : ''}
  <div class="card mt"><div class="card-b small muted">Workflows run inside OpsBoss when a teammate takes the action, and time-based ones are checked whenever someone has the app open (every 5 minutes). SMS and emails are prepared in <a href="#/tasks">Tasks</a> so you can send them with one click from your phone or email.</div></div>`;
};
function wfEditor(wf) {
  const isNew = !wf;
  const d = JSON.parse(JSON.stringify(wf || { name: '', trigger: { type: 'lead.created' }, cond: {}, actions: [{ type: 'task', title: 'Call {{customer}}', days: 0 }] }));
  const sel = (f, opts, val, extra = '') => `<select class="inp" data-f="${f}" ${extra}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const techOpts = [['', '— None —'], ...db.techs.map(t => [t.id, t.name])];
  const draw = () => {
    const T = WF_TRIGGERS[d.trigger.type];
    const groups = [...new Set(Object.values(WF_TRIGGERS).map(x => x.group))];
    const trigSel = `<select class="inp" data-f="trigger.type">${groups.map(g => `<optgroup label="${g}">${Object.entries(WF_TRIGGERS).filter(([, v]) => v.group === g).map(([k, v]) => `<option value="${k}" ${k === d.trigger.type ? 'selected' : ''}>${v.label}</option>`).join('')}</optgroup>`).join('')}</select>`;
    const act = (a, i) => {
      let p = '';
      if (a.type === 'task') p = `<label class="f full">Task title<input class="inp" data-a="${i}" data-f="title" value="${esc(a.title || '')}"></label><label class="f">Due in (days)<input class="inp" type="number" min="0" data-a="${i}" data-f="days" value="${num(a.days)}"></label><label class="f">Assign to${sel('tech', techOpts, a.tech, `data-a="${i}"`)}</label>`;
      if (a.type === 'message') p = `<label class="f">Channel${sel('channel', [['sms', 'SMS'], ['email', 'Email']], a.channel, `data-a="${i}"`)}</label><label class="f">Send in (days)<input class="inp" type="number" min="0" data-a="${i}" data-f="days" value="${num(a.days)}"></label><label class="f full">Message<textarea class="inp" data-a="${i}" data-f="body">${esc(a.body || '')}</textarea></label>`;
      if (a.type === 'move_lead') p = `<label class="f">Stage${sel('stage', STAGES, a.stage, `data-a="${i}"`)}</label>`;
      if (a.type === 'assign_tech') p = `<label class="f">Technician${sel('tech', techOpts, a.tech, `data-a="${i}"`)}</label><div class="small muted" style="align-self:end">Only applies when the trigger is a job.</div>`;
      if (a.type === 'invoice_job') p = `<div class="small muted full">Creates the invoice from the job’s line items (less deposits). Only applies when the trigger is a job.</div>`;
      if (a.type === 'tag') p = `<label class="f">Tag<input class="inp" data-a="${i}" data-f="tag" value="${esc(a.tag || '')}" placeholder="e.g. VIP, Warranty, Insurance"></label>`;
      if (a.type === 'note' || a.type === 'notify') p = `<label class="f full">Text<input class="inp" data-a="${i}" data-f="text" value="${esc(a.text || '')}"></label>`;
      return `<div class="card mb" style="box-shadow:none"><div class="card-h" style="padding:10px 14px"><div class="row"><span class="pill brand">${i + 1}</span>${sel('type', Object.entries(WF_ACTIONS), a.type, `data-a="${i}" style="width:auto"`)}</div><button class="btn ghost sm danger" data-wfdel="${i}" title="Remove action">✕</button></div><div class="card-b form" style="padding:12px 14px">${p}</div></div>`;
    };
    $('#wfEd').innerHTML = `
      <label class="f">Workflow name<input class="inp" data-f="name" value="${esc(d.name)}" placeholder="e.g. Estimate follow-up"></label>
      <h4 style="margin:18px 0 8px">1. When…</h4>
      <div class="form"><label class="f ${T.param || T.timer ? '' : 'full'}">Trigger${trigSel}</label>
      ${T.param === 'stage' ? `<label class="f">New stage${sel('trigger.stage', [['any', 'Any'], ...STAGES], d.trigger.stage || 'any')}</label>` : ''}
      ${T.param === 'status' ? `<label class="f">New status${sel('trigger.status', [['any', 'Any'], ...Object.entries(JOB_ST).map(([k, v]) => [k, v[0]])], d.trigger.status || 'any')}</label>` : ''}
      ${T.timer ? `<label class="f">Number of days (N)<input class="inp" type="number" min="0" data-f="trigger.days" value="${num(d.trigger.days)}"></label>` : ''}</div>
      <h4 style="margin:18px 0 8px">2. Only if… <span class="small muted" style="font-weight:400">(optional)</span></h4>
      <div class="form" style="grid-template-columns:repeat(3,minmax(0,1fr))"><label class="f">Division${sel('cond.division', [['any', 'Any'], ...divOptions()], d.cond.division || 'any')}</label><label class="f">Minimum amount ($)<input class="inp" type="number" min="0" data-f="cond.minValue" value="${num(d.cond.minValue) || ''}" placeholder="0"></label><label class="f">Lead source${sel('cond.source', [['any', 'Any'], ...SOURCES.map(x => [x, x])], d.cond.source ? srcEN(d.cond.source) : 'any')}</label></div>
      <h4 style="margin:18px 0 8px">3. Then…</h4>
      ${d.actions.map(act).join('')}
      <button class="btn sm" id="wfAddAct">＋ Add action</button>
      <p class="small muted mt">Variables you can use in text: ${WF_VARS.map(v => `<code>${v}</code>`).join(' ')}</p>`;
  };
  const m = modal({
    title: isNew ? 'New workflow' : 'Edit workflow', wide: true, body: '<div id="wfEd"></div>',
    foot: `<button class="btn" data-dismiss>Cancel</button><button class="btn primary" id="wfSave">Save workflow</button>`,
    onMount(bg) {
      const ed = () => $('#wfEd', bg);
      const setVal = el => {
        const v = el.type === 'number' ? num(el.value) : el.value;
        if (el.dataset.a !== undefined) { const a = d.actions[+el.dataset.a]; if (el.dataset.f === 'type') { d.actions[+el.dataset.a] = { type: v, ...(v === 'task' ? { title: '', days: 0 } : v === 'message' ? { channel: 'sms', body: '' } : v === 'move_lead' ? { stage: 'contacted' } : {}) }; draw(); return; } a[el.dataset.f] = v; return; }
        const [o, k] = el.dataset.f.split('.');
        if (k) { d[o][k] = v; if (el.dataset.f === 'trigger.type') { d.trigger = { type: v, ...(WF_TRIGGERS[v].timer ? { days: 3 } : {}) }; draw(); } } else d[o] = v;
      };
      bg.addEventListener('input', e => { const el = e.target.closest('[data-f]'); if (el && el.tagName !== 'SELECT') setVal(el); });
      bg.addEventListener('change', e => { const el = e.target.closest('[data-f]'); if (el && el.tagName === 'SELECT') setVal(el); });
      bg.addEventListener('click', e => {
        if (e.target.closest('#wfAddAct')) { d.actions.push({ type: 'task', title: '', days: 0 }); draw(); }
        const del = e.target.closest('[data-wfdel]'); if (del) { d.actions.splice(+del.dataset.wfdel, 1); draw(); }
      });
      $('#wfSave', bg).onclick = () => {
        if (!d.name.trim()) { toast('Give the workflow a name'); return; }
        if (!d.actions.length) { toast('Add at least one action'); return; }
        if (isNew) db.workflows.unshift({ ...d, id: uid(), active: true, activatedAt: iso(new Date()), createdAt: iso(new Date()), runs: 0, lastRun: null });
        else Object.assign(wf, d);
        bg.remove(); save(); render(); toast('Workflow saved ✓'); wfTimers();
      };
      draw(); void ed;
    },
  });
  return m;
}

/* ───────────── TAREAS ───────────── */
const taskLink = t => { if (!t.link) return t.customerId ? `<a href="#/customer/${t.customerId}">${esc(cust(t.customerId).name)}</a>` : ''; const r = { lead: ['leads', '#/pipeline'], estimate: ['estimates', '#/estimate/'], job: ['jobs', '#/job/'], invoice: ['invoices', '#/invoice/'], plan: ['plans', '#/plans'], customer: ['customers', '#/customer/'] }[t.link.kind]; if (!r) return ''; const rec = byId(r[0], t.link.id); const href = r[1].endsWith('/') ? r[1] + t.link.id : r[1]; return `<a href="${href}">${esc(rec?.number || rec?.title || rec?.name || cust(t.customerId).name)}</a>${t.customerId && t.link.kind !== 'customer' ? ' · ' + esc(cust(t.customerId).name) : ''}`; };
ROUTES.tasks = () => {
  const who = state.filters.taskWho || 'all', today = ymd(new Date());
  const all = (db.tasks || []).filter(t => who === 'all' || t.assignee === who || (who === 'none' && !t.assignee));
  const open = all.filter(t => !t.done).sort((a, b) => a.due.localeCompare(b.due));
  const groups = [['Overdue', open.filter(t => t.due < today), 'bad'], ['Today', open.filter(t => t.due === today), 'warn'], ['Upcoming', open.filter(t => t.due > today), 'info'], ['Completed', all.filter(t => t.done).sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt))).slice(0, 25), 'ok']];
  const row = t => { const c = cust(t.customerId); const tk = tech(t.assignee); return `<div class="list-item" style="align-items:flex-start"><input type="checkbox" style="width:18px;height:18px;margin-top:2px;accent-color:var(--brand)" data-act-input="taskDone" data-id="${t.id}" ${t.done ? 'checked' : ''}><div style="flex:1;min-width:0"><div class="b" style="${t.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${t.type === 'message' ? (t.channel === 'email' ? '@ ' : '✉ ') : ''}${esc(t.title)}</div>${t.type === 'message' ? `<div class="small" style="white-space:pre-wrap;background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin:6px 0">${esc(t.body)}</div>` : ''}${t.notes ? `<div class="small muted">${esc(t.notes)}</div>` : ''}<div class="small muted">${taskLink(t)} · ${t.due === today ? 'Today' : fDate(parseLocal(t.due))}${t.wf ? ` · <span class="pill brand" style="font-size:11px">⚡ ${esc(t.wf)}</span>` : ''}</div></div>${tk ? avatar(tk) : ''}${t.type === 'message' && !t.done ? (t.channel === 'email' ? `<a class="btn sm primary" data-act="taskSend" data-id="${t.id}" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(db.settings.company)}&body=${encodeURIComponent(t.body)}">@ Send</a>` : `<a class="btn sm primary" data-act="taskSend" data-id="${t.id}" href="sms:${esc(c.phone)}?body=${encodeURIComponent(t.body)}">✉ Send</a>`) : ''}<button class="btn ghost sm danger" data-act="taskDel" data-id="${t.id}" title="Delete">✕</button></div>`; };
  return head('Tasks', `${open.length} open · ${open.filter(t => t.due < today).length} overdue`, `<select class="inp" style="width:auto" data-act-input="taskWho"><option value="all">Whole team</option><option value="none" ${who === 'none' ? 'selected' : ''}>Unassigned</option>${db.techs.map(t => `<option value="${t.id}" ${who === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select><a class="btn" href="#/workflows">⚡ Workflows</a><button class="btn primary" data-act="taskNew">＋ Task</button>`) +
    groups.map(([label, list, cls]) => list.length || label !== 'Completed' ? `<div class="card mb"><div class="card-h"><h3><span class="pill ${cls}">${label}</span> <span class="muted small">${list.length}</span></h3></div><div class="card-b" style="padding-top:4px;padding-bottom:4px">${list.map(row).join('') || '<div class="muted small" style="padding:10px 0">Nothing here.</div>'}</div></div>` : '').join('');
};

/* ───────────── Búsqueda / paleta de comandos ───────────── */
function openPalette() {
  const pages = NAV.filter(n => n[0] !== 'sec').map(n => ({ label: n[2], type: 'Page', go: '#/' + n[0] }));
  const actions = [['New lead', 'newLead'], ['New customer', 'newCustomer'], ['New estimate', 'newEstimate'], ['New job', 'newJob'], ['New invoice', 'newInvoice']].map(([label, act]) => ({ label: '＋ ' + label, type: 'Action', act }));
  const records = () => [
    ...db.customers.map(c => ({ label: c.name, sub: `${c.phone} · ${c.address}, ${c.city}`, type: 'Customer', go: '#/customer/' + c.id, hay: [c.name, c.phone, c.email, c.address, c.city].join(' ') })),
    ...db.jobs.map(j => ({ label: `${j.number} · ${j.title}`, sub: cust(j.customerId).name, type: 'Job', go: '#/job/' + j.id })),
    ...db.estimates.map(e => ({ label: `${e.number} · ${e.title}`, sub: cust(e.customerId).name, type: 'Estimate', go: '#/estimate/' + e.id })),
    ...db.invoices.map(i => ({ label: `${i.number} · ${money(invTotal(i))}`, sub: cust(i.customerId).name, type: 'Invoice', go: '#/invoice/' + i.id })),
  ];
  const m = modal({ title: 'Search', body: `<div class="cmd" style="margin:0;width:100%"><input id="cmdq" placeholder="Type a name, phone, job #, invoice…" autocomplete="off"><div class="cmd-list" id="cmdl"></div></div>` });
  m.el.querySelector('.modal').classList.add('cmd'); m.el.querySelector('.modal-b').style.padding = 0; m.el.querySelector('.modal-h').style.display = 'none';
  let items = [], sel = 0;
  const draw = () => {
    const q = $('#cmdq', m.el).value.trim().toLowerCase();
    items = q ? [...actions, ...pages, ...records()].filter(x => (x.label + ' ' + (x.hay || x.sub || '')).toLowerCase().includes(q)).slice(0, 30) : [...actions, ...pages];
    sel = Math.min(sel, Math.max(0, items.length - 1));
    $('#cmdl', m.el).innerHTML = items.map((x, i) => `<div class="cmd-item ${i === sel ? 'sel' : ''}" data-i="${i}"><div><div>${esc(x.label)}</div>${x.sub ? `<div class="small muted">${esc(x.sub)}</div>` : ''}</div><span class="t">${x.type}</span></div>`).join('') || '<div class="empty">No results</div>';
  };
  const run = x => { if (!x) return; m.close(); if (x.go) location.hash = x.go; else ACT[x.act]({ dataset: {} }); };
  $('#cmdq', m.el).addEventListener('input', () => { sel = 0; draw(); });
  $('#cmdq', m.el).addEventListener('keydown', e => { if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); } if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); } if (e.key === 'Enter') run(items[sel]); if (e.key === 'Escape') m.close(); });
  $('#cmdl', m.el).addEventListener('click', e => { const it = e.target.closest('[data-i]'); if (it) run(items[+it.dataset.i]); });
  draw();
}

/* ───────────── Acciones ───────────── */
const byId = (arr, id) => db[arr].find(x => x.id === id);
const ACT = {
  wk: el => { const n = +el.dataset.n; state.week = n === 0 ? weekStart(new Date()) : addDays(state.week, n); render(); },
  tab: el => { state.tabs[el.dataset.t] = el.dataset.v; render(); },
  filt: el => { state.filters[el.dataset.f] = el.dataset.v; render(); },
  newLead: () => leadModal(null),
  newCustomer: () => customerModal(null),
  editCustomer: el => customerModal(byId('customers', el.dataset.id)),
  newEstimate: el => newEstimateModal(el.dataset.cust),
  newJob: el => jobModal(null, { customerId: el.dataset.cust }),
  editJob: el => jobModal(byId('jobs', el.dataset.id)),
  newInvoice: el => form({ title: 'New invoice', fields: [{ k: 'customerId', label: 'Customer', type: 'select', options: custOptions(), value: el.dataset.cust }, { k: 'division', label: 'Division', type: 'select', options: divOptions(), value: state.div !== 'all' ? state.div : 'hvac' }], saveLabel: 'Create', onSave(v) { const i = createInvoice(v); setTimeout(() => location.hash = '#/invoice/' + i.id); } }),
  saveNotes: el => { byId('customers', el.dataset.id).notes = $('#custNotes').value; save(); toast('Notes saved'); },
  editProperty: el => { const c = byId('customers', el.dataset.id), p = c.property = c.property || {}; form({ title: 'Property', fields: [{ k: 'roofType', label: 'Roof type', type: 'select', options: ['', 'Asphalt shingle', 'Clay tile', 'Concrete tile', 'Metal', 'Flat / TPO', 'Wood shake'], value: ROOF_EN[p.roofType] || p.roofType }, { k: 'roofAge', label: 'Roof age (years)', type: 'number', value: p.roofAge }, { k: 'sqft', label: 'Living area (ft²)', type: 'number', value: p.sqft }, { k: 'stories', label: 'Stories', type: 'number', value: p.stories }, { k: 'utility', label: 'Utility company', value: p.utility }, { k: 'avgBill', label: 'Average electric bill ($)', type: 'number', value: p.avgBill }], onSave(v) { Object.assign(p, v); } }); },
  addEquip: el => { const c = byId('customers', el.dataset.id); form({ title: 'Add equipment', fields: [{ k: 'type', label: 'Type', value: '', required: true, ph: 'e.g. 3 ton heat pump / Inverter / Battery' }, { k: 'brand', label: 'Brand', value: '' }, { k: 'model', label: 'Model', value: '' }, { k: 'serial', label: 'Serial number', value: '' }, { k: 'installed', label: 'Install date', type: 'date', value: ymd(new Date()) }, { k: 'warranty', label: 'Warranty until', type: 'date', value: ymd(addDays(new Date(), 3650)) }], onSave(v) { (c.equipment = c.equipment || []).push({ id: uid(), ...v }); } }); },
  delEquip: el => { const c = byId('customers', el.dataset.id); c.equipment = c.equipment.filter(x => x.id !== el.dataset.eq); save(); render(); },
  liAdd: el => { liTarget(el.dataset.ctx).push({ id: uid(), name: 'New item', qty: 1, price: 0, cost: 0 }); save(); render(); },
  liDel: el => { liTarget(el.dataset.ctx).splice(+el.dataset.i, 1); save(); render(); },
  liBook: el => { const [k, id] = el.dataset.ctx.split(':'); const rec = byId({ est: 'estimates', job: 'jobs', inv: 'invoices' }[k], id); bookPicker(rec.division, it => liTarget(el.dataset.ctx).push(it)); },
  optTab: el => { state.tabs['opt' + el.dataset.id] = +el.dataset.k; render(); },
  addOpt: el => { const e = byId('estimates', el.dataset.id); const k = state.tabs['opt' + e.id] ?? 0; const names = ['Good', 'Better', 'Best']; e.options.push({ id: uid(), name: names[e.options.length] || 'Option', items: e.options[k].items.map(x => ({ ...x, id: uid() })) }); state.tabs['opt' + e.id] = e.options.length - 1; save(); render(); },
  delOpt: el => { const e = byId('estimates', el.dataset.id); e.options.splice(+el.dataset.k, 1); state.tabs['opt' + e.id] = 0; save(); render(); },
  sendEst: el => { const e = byId('estimates', el.dataset.id); e.status = 'sent'; e.sentAt = iso(new Date()); const c = cust(e.customerId); log(`Estimate ${e.number} sent to ${c.name}`); emit('estimate.sent', 'estimate', e); save(); render(); modal({ title: 'Estimate marked as sent', body: `<p>Send the estimate to the customer:</p><div class="row"><a class="btn" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(`Your estimate ${e.number} from ${db.settings.company}`)}&body=${encodeURIComponent(`Hi ${c.name},\n\nAttached is your estimate ${e.number} (${e.title}) for ${money(estMax(e))}.\nFinancing options start at ${money(monthly(Math.min(...e.options.map(o => totalOf(o.items))), num(db.settings.apr), num(db.settings.term)))}/mo.\n\nLet us know if you have any questions,\n${db.settings.company}\n${db.settings.phone}`)}">@ Email</a><a class="btn" href="sms:${esc(c.phone)}?body=${encodeURIComponent(`Hi ${c.name}, we just sent your estimate ${e.number} from ${db.settings.company} for ${money(estMax(e))}. Any questions?`)}">✉ SMS</a><button class="btn" data-act="previewEst" data-id="${e.id}">⎙ PDF</button></div>`, foot: '<button class="btn primary" data-dismiss>Done</button>' }); },
  approveEst: el => {
    const e = byId('estimates', el.dataset.id), k = +el.dataset.k; e.status = 'approved'; e.selected = k; e.approvedAt = iso(new Date());
    const items = e.options[k].items.map(x => ({ ...x, id: uid() }));
    const j = jobFromEstimate(e);
    let msg = `Estimate approved. Job ${j.number} created.`;
    if (num(e.deposit)) { const dep = totalOf(items) * num(e.deposit) / 100; const inv = createInvoice({ customerId: e.customerId, jobId: null, division: e.division, items: [{ id: uid(), name: `Deposit ${e.deposit}% — ${e.number} ${e.title}`, qty: 1, price: Math.round(dep * 100) / 100 / (1 + num(db.settings.taxRate) / 100), cost: 0 }] }); inv.status = 'sent'; inv.kind = 'deposit'; inv.estimateId = e.id; e.depositInvoiceId = inv.id; msg += ` Deposit invoice ${inv.number}.`; }
    log(`Estimate ${e.number} approved (${e.options[k].name}) — ${money(totalOf(items))}`); emit('estimate.approved', 'estimate', e); emit('job.created', 'job', j); save(); toast(msg); location.hash = '#/job/' + j.id;
  },
  declineEst: el => { const e = byId('estimates', el.dataset.id); e.status = 'declined'; log(`Estimate ${e.number} declined`); emit('estimate.declined', 'estimate', e); save(); render(); },
  reopenEst: el => { byId('estimates', el.dataset.id).status = 'draft'; save(); render(); },
  delEst: el => confirmDlg('Delete this estimate?', () => { db.estimates = db.estimates.filter(x => x.id !== el.dataset.id); location.hash = '#/estimates'; }),
  previewEst: el => previewEstimate(byId('estimates', el.dataset.id)),
  jobStatus: el => { const j = byId('jobs', el.dataset.id); j.status = el.dataset.s; if (j.status === 'completed') { j.completedAt = iso(new Date()); j.checklist.forEach(c => c.done = true); } log(`${j.number} → ${JOB_ST[j.status][0]}`); emit('job.status', 'job', j, { to: j.status }); save(); render(); toast(JOB_ST[j.status][0]); if (j.status === 'enroute') { const c = cust(j.customerId); modal({ title: 'Notify the customer', body: `<p>Send an "on the way" text to ${esc(c.name)}?</p>`, foot: `<button class="btn" data-dismiss>No</button><a class="btn primary" href="sms:${esc(c.phone)}?body=${encodeURIComponent(`Hi ${c.name}, your ${db.settings.company} technician is on the way for "${j.title}".`)}">✉ Send SMS</a>` }); } },
  cancelJob: el => { const j = byId('jobs', el.dataset.id); j.status = j.status === 'cancelled' ? (j.start ? 'scheduled' : 'unscheduled') : 'cancelled'; save(); render(); },
  delJob: el => confirmDlg('Delete this job?', () => { db.jobs = db.jobs.filter(x => x.id !== el.dataset.id); location.hash = '#/jobs'; }),
  invoiceJob: el => { const inv = invoiceFromJob(byId('jobs', el.dataset.id)); save(); location.hash = '#/invoice/' + inv.id; },
  addCheck: el => { const j = byId('jobs', el.dataset.id); form({ title: 'Add checklist task', fields: [{ k: 't', label: 'Task', full: true, required: true }], onSave(v) { j.checklist.push({ id: uid(), t: v.t, done: false }); } }); },
  delPhoto: el => { byId('jobs', el.dataset.id).photos.splice(+el.dataset.i, 1); save(); render(); },
  sendInv: el => { const i = byId('invoices', el.dataset.id); i.status = 'sent'; const c = cust(i.customerId); log(`Invoice ${i.number} sent to ${c.name}`); emit('invoice.sent', 'invoice', i); save(); render(); modal({ title: 'Invoice sent', body: `<p>Share the invoice with the customer:</p><div class="row"><a class="btn" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(`Invoice ${i.number} — ${db.settings.company}`)}&body=${encodeURIComponent(`Hi ${c.name},\n\nYour invoice ${i.number} for ${money2(invTotal(i))} is due on ${fDate(parseLocal(i.due))}.\n\nThank you for your business,\n${db.settings.company}`)}">@ Email</a><a class="btn" href="sms:${esc(c.phone)}?body=${encodeURIComponent(`Hi ${c.name}, your invoice ${i.number} from ${db.settings.company} for ${money2(invTotal(i))} is ready.`)}">✉ SMS</a></div>`, foot: '<button class="btn primary" data-dismiss>Done</button>' }); },
  remindInv: el => { const i = byId('invoices', el.dataset.id), c = cust(i.customerId); location.href = `sms:${c.phone}?body=${encodeURIComponent(`Hi ${c.name}, friendly reminder that invoice ${i.number} from ${db.settings.company} has a balance of ${money2(invBal(i))}, due ${fDate(parseLocal(i.due))}. Thank you!`)}`; log(`Reminder sent: ${i.number}`); save(); },
  payInv: el => payModal(byId('invoices', el.dataset.id)),
  delPay: el => confirmDlg('Delete this payment?', () => { const i = byId('invoices', el.dataset.id); i.payments = i.payments.filter(p => p.id !== el.dataset.p); }),
  voidInv: el => confirmDlg('Void this invoice?', () => { byId('invoices', el.dataset.id).status = 'void'; }),
  previewInv: el => { const i = byId('invoices', el.dataset.id); const paid = invPaid(i); modal({ title: 'Invoice ' + i.number, wide: true, body: docHTML({ kind: i.kind === 'deposit' ? 'DEPOSIT INVOICE' : 'INVOICE', number: i.number, date: 'Issued: ' + fDate(i.createdAt), extraMeta: `<br>Due: ${fDate(parseLocal(i.due))}`, customerId: i.customerId, items: i.items, notes: i.notes, footer: paid ? `<div style="text-align:right;margin-top:8px">Paid: <b>${money2(paid)}</b><br><span style="font-size:18px">Balance: <b>${money2(invBal(i))}</b></span></div>` : '' }), foot: `<button class="btn" data-dismiss>Close</button><button class="btn primary" onclick="window.print()">⎙ Print / PDF</button>` }); },
  newPlan: el => form({ title: 'New membership', fields: [{ k: 'customerId', label: 'Customer', type: 'select', options: custOptions(), value: el.dataset.cust }, { k: 'name', label: 'Plan', type: 'select', options: ['HVAC Comfort Annual', 'HVAC Comfort Premium', 'Solar Care (cleaning + monitoring)', 'Roof Shield (annual inspection)'] }, { k: 'price', label: 'Price ($)', type: 'number', value: 19 }, { k: 'interval', label: 'Billing', type: 'select', options: [['month', 'Monthly'], ['year', 'Yearly']] }, { k: 'visitsPerYear', label: 'Visits per year', type: 'number', value: 2 }, { k: 'nextVisit', label: 'First visit', type: 'date', value: ymd(addDays(new Date(), 14)) }], onSave(v) { db.plans.unshift({ id: uid(), ...v, division: v.name.includes('HVAC') ? 'hvac' : v.name.includes('Solar') ? 'solar' : 'roofing', status: 'active', startDate: ymd(new Date()) }); log(`New membership: ${cust(v.customerId).name} — ${v.name}`); } }),
  togglePlan: el => { const p = byId('plans', el.dataset.id); p.status = p.status === 'active' ? 'cancelled' : 'active'; save(); render(); },
  planVisit: el => { const p = byId('plans', el.dataset.id); const pb = db.pricebook.find(x => x.division === p.division && /maintenance|cleaning|repair|Mantenimiento|Limpieza|Reparación/i.test(x.name)); jobModal(null, { customerId: p.customerId, division: p.division, title: 'Membership visit — ' + p.name, date: p.nextVisit, items: pb ? [{ id: uid(), name: pb.name + ' (included in membership)', qty: 1, price: 0, cost: pb.cost }] : [] }); p.nextVisit = ymd(addDays(parseLocal(p.nextVisit), Math.round(365 / Math.max(1, p.visitsPerYear)))); save(); },
  newPermit: el => permitModal(null, el.dataset.job),
  editPermit: el => permitModal(byId('permits', el.dataset.id)),
  calcEst: el => {
    const k = el.dataset.k, pb = d => db.pricebook.filter(p => p.division === d), it = (p, q) => p ? { id: uid(), name: p.name, qty: q, price: p.price, cost: p.cost } : null;
    let division, title, items;
    if (k === 'solar') { const P = pb('solar'), n = +el.dataset.panels; division = 'solar'; title = `${(n * state.tools.solar.watts / 1000).toFixed(1)} kW solar system`; items = [it(P[0], n), it(P[1], n), it(P[4], n), it(P[6], 1), +el.dataset.bat ? it(P[3], +el.dataset.bat) : null]; }
    if (k === 'roof') { const P = pb('roofing'); division = 'roofing'; title = `New roof, ${el.dataset.sq} squares`; items = [it(P[+el.dataset.mat], +el.dataset.sq), +el.dataset.tear ? it(P[2], +el.dataset.tear) : null, it(P[4], +el.dataset.ice)]; }
    if (k === 'hvac') { const P = pb('hvac'); division = 'hvac'; title = `${el.dataset.tons} ton HVAC system`; items = [it(P.find(p => /heat pump|Bomba de calor/i.test(p.name)), 1), it(P.find(p => /thermostat|Termostato/i.test(p.name)), 1)]; }
    form({ title: 'Create estimate', fields: [{ k: 'customerId', label: 'Customer', type: 'select', options: custOptions() }, { k: 'title', label: 'Title', value: title, full: true }], saveLabel: 'Create estimate', onSave(v) { const e = createEstimate({ customerId: v.customerId, division, title: v.title, items: items.filter(Boolean) }); setTimeout(() => location.hash = '#/estimate/' + e.id); } });
  },
  newPb: () => pbModal(null),
  editPb: el => pbModal(byId('pricebook', el.dataset.id)),
  newTech: () => techModal(null),
  editTech: el => techModal(byId('techs', el.dataset.id)),
  exportCsv: el => {
    const w = el.dataset.what; let rows;
    if (w === 'customers') rows = [['Name', 'Phone', 'Email', 'Address', 'City', 'ZIP', 'Source', 'Lifetime value', 'Balance'], ...db.customers.map(c => [c.name, c.phone, c.email, c.address, c.city, c.zip, c.source, custLTV(c.id).toFixed(2), custBal(c.id).toFixed(2)])];
    if (w === 'jobs') rows = [['#', 'Job', 'Division', 'Customer', 'Date', 'Hours', 'Technicians', 'Status', 'Amount'], ...db.jobs.map(j => [j.number, j.title, DIV[j.division].name, cust(j.customerId).name, j.start ? ymd(j.start) + ' ' + hm(j.start) : '', j.duration, j.techIds.map(t => tech(t)?.name).join(' / '), JOB_ST[j.status][0], totalOf(j.items).toFixed(2)])];
    if (w === 'invoices') rows = [['#', 'Customer', 'Division', 'Issued', 'Due', 'Total', 'Paid', 'Balance', 'Status'], ...db.invoices.map(i => [i.number, cust(i.customerId).name, DIV[i.division].name, ymd(i.createdAt), i.due, invTotal(i).toFixed(2), invPaid(i).toFixed(2), invBal(i).toFixed(2), INV_ST[invStatus(i)][0]])];
    download(`opsboss-${w}-${ymd(new Date())}.csv`, '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
  },
  exportJson: () => download(`opsboss-backup-${ymd(new Date())}.json`, JSON.stringify(db, null, 2), 'application/json'),
  portalLink: async el => {
    if (!cloud.on) { toast('The customer portal requires signing in (cloud mode).'); return; }
    const kind = el.dataset.kind, rec = byId(kind === 'estimate' ? 'estimates' : 'invoices', el.dataset.id), c = cust(rec.customerId);
    el.disabled = true;
    await sync();
    const { data: token, error } = await cloud.sb.rpc('opsboss_portal_link', { p_kind: kind, p_id: rec.id });
    el.disabled = false;
    if (error) { toast('Could not create the link: ' + error.message); return; }
    const url = portalUrl(token), co = db.settings.company;
    if (kind === 'estimate' && rec.status === 'draft') { rec.status = 'sent'; rec.sentAt = iso(new Date()); log(`Estimate ${rec.number} sent to ${c.name} (portal)`); emit('estimate.sent', 'estimate', rec); }
    if (kind === 'invoice' && rec.status === 'draft') { rec.status = 'sent'; log(`Invoice ${rec.number} sent to ${c.name} (portal)`); emit('invoice.sent', 'invoice', rec); }
    save(); render();
    const first = String(c.name || '').split(' ')[0];
    const smsTxt = kind === 'estimate' ? `Hi ${first}, here is your estimate ${rec.number} from ${co}. You can review the options, sign and approve right from your phone: ${url}` : `Hi ${first}, you can view and pay your ${rec.kind === 'deposit' ? 'deposit' : 'invoice'} ${rec.number} from ${co} here: ${url}`;
    const subj = kind === 'estimate' ? `Your estimate ${rec.number} — ${co}` : `${rec.kind === 'deposit' ? 'Deposit' : 'Invoice'} ${rec.number} — ${co}`;
    const body = kind === 'estimate' ? `Hi ${c.name},\n\nThank you for the opportunity. You can review estimate ${rec.number} (${rec.title}), compare the options and approve it with your electronic signature here:\n\n${url}\n\nLet us know if you have any questions,\n${co}\n${db.settings.phone}` : `Hi ${c.name},\n\nYou can view and pay your ${rec.kind === 'deposit' ? 'deposit' : 'invoice'} ${rec.number} for ${money2(invBal(rec))} here:\n\n${url}\n\nThank you,\n${co}\n${db.settings.phone}`;
    modal({ title: kind === 'estimate' ? 'Link to review and sign' : 'Payment link', body: `<p class="muted">The customer doesn’t need an account. The link is private and expires in 90 days; you’ll see here when they open it.</p><input class="inp" readonly value="${esc(url)}" onclick="this.select()"><div class="row mt"><button class="btn" data-act="portalCopy" data-url="${esc(url)}">Copy</button><a class="btn" href="sms:${esc(c.phone)}?body=${encodeURIComponent(smsTxt)}">✉ SMS</a><a class="btn" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}">@ Email</a><a class="btn" href="${esc(url)}" target="_blank" rel="noopener">View as customer ↗</a></div>`, foot: '<button class="btn primary" data-dismiss>Done</button>' });
  },
  portalCopy: el => { try { navigator.clipboard.writeText(el.dataset.url); toast('Link copied'); } catch (e) { toast(el.dataset.url); } },
  viewSig: async el => { const { data } = await cloud.sb.from('opsboss_portal_events').select('signer_name,signature,created_at,ip,user_agent,option_index,amount').eq('id', el.dataset.ev).single(); if (!data) return; modal({ title: 'Electronic signature', body: `<div class="doc" style="padding:16px"><img src="${esc(data.signature)}" alt="Signature" style="width:100%;max-width:520px;border-bottom:1px solid #cbd5e1"><div class="small" style="margin-top:8px"><b>${esc(data.signer_name)}</b> · ${new Date(data.created_at).toLocaleString('en-US')}<br>Approved amount: ${money2(data.amount)} · Option #${(data.option_index ?? 0) + 1}<br>IP: ${esc(data.ip || '—')}<br><span style="color:#94a3b8">${esc(data.user_agent || '')}</span></div></div>`, foot: '<button class="btn" data-dismiss>Close</button><button class="btn primary" onclick="window.print()">⎙ Print</button>' }); },
  wfNew: () => wfEditor(null),
  wfEdit: el => wfEditor(byId('workflows', el.dataset.id)),
  wfToggle: el => { const w = byId('workflows', el.dataset.id); w.active = !w.active; if (w.active) w.activatedAt = iso(new Date()); save(); render(); toast(w.active ? 'Workflow activated' : 'Workflow paused'); if (w.active) wfTimers(); },
  wfDup: el => { const w = byId('workflows', el.dataset.id); db.workflows.unshift({ ...JSON.parse(JSON.stringify(w)), id: uid(), name: w.name + ' (copy)', active: false, runs: 0, lastRun: null, createdAt: iso(new Date()) }); save(); render(); },
  wfDel: el => confirmDlg('Delete this workflow? Tasks it already created are kept.', () => { db.workflows = db.workflows.filter(x => x.id !== el.dataset.id); }),
  wfAddTpl: el => { const t = wfTemplates().find(x => x.name === el.dataset.name); if (!t) return; db.workflows.push(wfFromTemplate(t)); save(); render(); toast('Template added and active'); wfTimers(); },
  taskNew: () => form({ title: 'New task', fields: [{ k: 'title', label: 'Task', full: true, required: true }, { k: 'due', label: 'Due date', type: 'date', value: ymd(new Date()) }, { k: 'assignee', label: 'Assign to', type: 'select', options: techOptions() }, { k: 'customerId', label: 'Customer (optional)', type: 'select', options: [['', '—'], ...custOptions()] }, { k: 'notes', label: 'Notes', type: 'textarea', full: true }], onSave(v) { db.tasks.unshift({ id: uid(), ...v, done: false, link: v.customerId ? { kind: 'customer', id: v.customerId } : null, createdAt: iso(new Date()) }); } }),
  taskDel: el => { db.tasks = db.tasks.filter(t => t.id !== el.dataset.id); save(); render(); },
  taskSend: el => { const t = byId('tasks', el.dataset.id); t.done = true; t.doneAt = iso(new Date()); log(`${t.channel === 'email' ? 'Email' : 'SMS'} sent to ${cust(t.customerId).name}`); save(); setTimeout(render, 300); location.href = el.getAttribute('href'); },
  removeMember: el => confirmDlg('Remove this person’s access to OpsBoss?', async () => { const { error } = await cloud.sb.from('opsboss_members').delete().eq('user_id', el.dataset.id); toast(error ? error.message : 'Access removed'); render(); }),
  removeInvite: async el => { const { error } = await cloud.sb.from('opsboss_invites').delete().eq('email', el.dataset.email); toast(error ? error.message : 'Invitation removed'); ROUTES['settings:after'](); },
  signOut: async () => { if (cloud.on) { clearTimeout(cloud.timer); await sync(); } await cloud.sb.auth.signOut(); location.reload(); },
  exitDemo: () => { try { localStorage.removeItem('opsboss.mode'); } catch (e) { /* ignore */ } location.href = location.pathname; },
  resetDemo: () => confirmDlg('This replaces all data with demo data. Continue?', () => { db = seed(); toast('Demo data restored'); }),
  wipe: () => confirmDlg('This deletes all customers, jobs, estimates and invoices (settings, team and price book are kept). Continue?', () => { Object.assign(db, { customers: [], leads: [], estimates: [], jobs: [], invoices: [], plans: [], permits: [], activity: [] }); toast('Done — start adding your data'); }),
};
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

/* Entradas con guardado inmediato */
const INPUT = {
  check: el => { const j = byId('jobs', el.dataset.id); const c = j.checklist.find(x => x.id === el.dataset.c); c.done = el.checked; save(); render(); },
  jobNotes: el => { byId('jobs', el.dataset.id).notes = el.value; save(); },
  optName: el => { byId('estimates', el.dataset.id).options[+el.dataset.k].name = el.value; save(); },
  estDeposit: el => { byId('estimates', el.dataset.id).deposit = num(el.value); save(); render(); },
  estValid: el => { byId('estimates', el.dataset.id).validUntil = el.value; save(); },
  estNotes: el => { byId('estimates', el.dataset.id).notes = el.value; save(); },
  invDue: el => { byId('invoices', el.dataset.id).due = el.value; save(); render(); },
  permitSt: el => { const p = byId('permits', el.dataset.id); p.status = el.value; p.updated = ymd(new Date()); if (el.value === 'submitted' && !p.submitted) p.submitted = ymd(new Date()); log(`${p.type} permit → ${PERMIT_ST[p.status][0]}`); save(); render(); },
  range: el => { state.filters.range = +el.value; render(); },
  settingBool: el => { db.settings[el.dataset.k] = el.checked; save(); toast(el.checked ? 'Online payments enabled' : 'Online payments disabled'); },
  taskDone: el => { const t = byId('tasks', el.dataset.id); t.done = el.checked; t.doneAt = el.checked ? iso(new Date()) : null; save(); render(); },
  taskWho: el => { state.filters.taskWho = el.value; render(); },
  memberRole: async el => { const { error } = await cloud.sb.from('opsboss_members').update({ role: el.value }).eq('user_id', el.dataset.id); toast(error ? error.message : 'Role updated'); },
  setting: el => { db.settings[el.dataset.k] = el.type === 'number' ? num(el.value) : el.value; save(); },
  calc: el => { const [g, k] = el.dataset.k.split('.'); state.tools[g][k] = num(el.value); const pos = el.dataset.k; render(); const n = $(`[data-k="${pos}"]`); if (n) { n.focus(); } },
  photos: async el => { const j = byId('jobs', el.dataset.id); for (const f of el.files) { const d = await compressImage(f); if (d) j.photos.push(d); } save(); render(); toast('Photos added'); },
  importJson: el => { const f = el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d.customers || !d.settings) throw 0; db = normalize(d); save(); render(); toast('Backup imported ✓'); } catch (e) { toast('Invalid file'); } }; r.readAsText(f); },
};
// edición de líneas (sin re-render en cada tecla para no perder el foco)
document.addEventListener('input', e => {
  const li = e.target.closest('[data-li]');
  if (li) { const it = liTarget(li.dataset.li)[+li.dataset.i]; it[li.dataset.f] = li.dataset.f === 'name' ? li.value : num(li.value); save(); return; }
  const el = e.target.closest('[data-act-input]');
  if (el && ['jobNotes', 'optName', 'estNotes', 'setting'].includes(el.dataset.actInput)) INPUT[el.dataset.actInput](el);
});
document.addEventListener('change', e => {
  const li = e.target.closest('[data-li]'); if (li) { render(); return; }
  const el = e.target.closest('[data-act-input]');
  if (el && !['jobNotes', 'optName', 'estNotes', 'setting'].includes(el.dataset.actInput)) INPUT[el.dataset.actInput](el);
  if (el && el.dataset.actInput === 'optName') render();
});

/* Delegación global de clics */
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (a && !a.closest('.modal-bg [data-close]')) { if (ACT[a.dataset.act]) { e.preventDefault(); ACT[a.dataset.act](a, e); return; } }
  const g = e.target.closest('[data-go]');
  if (g && !e.target.closest('a,button,input,select,label')) { location.hash = g.dataset.go; return; }
  const dv = e.target.closest('[data-div]');
  if (dv) { state.div = dv.dataset.div; try { localStorage.setItem('opsboss.div', state.div); } catch (er) { /* ignore */ } render(); return; }
  const nw = e.target.closest('[data-new]');
  if (nw) { $('#newMenu').classList.remove('open'); ({ lead: ACT.newLead, customer: ACT.newCustomer, estimate: ACT.newEstimate, job: ACT.newJob, invoice: ACT.newInvoice })[nw.dataset.new]({ dataset: {} }); return; }
  if (e.target.closest('#newBtn')) { $('#newMenu').classList.toggle('open'); return; }
  if (!e.target.closest('#newMenu')) $('#newMenu').classList.remove('open');
  if (e.target.closest('#searchBtn')) openPalette();
  if (e.target.closest('#menuBtn')) $('#sidebar').classList.toggle('open');
  if (e.target.closest('#themeBtn')) { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const n = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('opsboss.theme', n); } catch (er) { /* ignore */ } }
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  if (e.key === 'Escape') { const m = $$('.modal-bg').pop(); if (m) m.remove(); }
  if (e.key === '/' && !e.target.closest('input,textarea,select')) { e.preventDefault(); openPalette(); }
});
try { const th = localStorage.getItem('opsboss.theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { /* ignore */ }

/* ───────────── Arranque y login ───────────── */
function renderUserBox() {
  const b = $('#userBox'); if (!b) return;
  if (cloud.on) b.innerHTML = `<div class="em" title="${esc(cloud.user.email)}">${esc(cloud.user.email)}</div><div>${ROLE_LABEL[cloud.role] || ''} · <button data-act="signOut">Sign out</button></div>`;
  else if (CFG.url) b.innerHTML = `<div>Local demo mode · <button data-act="exitDemo">Sign in</button></div>`;
  else b.innerHTML = '';
}
function start() { renderUserBox(); render(); setTimeout(processPortal, 1200); setTimeout(wfTimers, 1500); if (!window.__wfTimer) window.__wfTimer = setInterval(wfTimers, 5 * 60 * 1000); }
function authScreen(mode = 'login', msg = '', kind = 'bad') {
  const el = $('#auth'); el.hidden = false;
  const logo = '<div class="logo" style="width:44px;height:44px;font-size:22px">O<span></span></div>';
  const note = msg ? `<div class="auth-msg ${kind}">${msg}</div>` : '';
  if (mode === 'loading') { el.innerHTML = `<div class="auth-card">${logo}<h1>OpsBoss</h1><p>Loading your data…</p></div>`; return; }
  if (mode === 'noaccess' || mode === 'setup') {
    el.innerHTML = `<div class="auth-card">${logo}<h1>${mode === 'setup' ? 'Database setup needed' : 'No access yet'}</h1>${note}<p>${mode === 'setup' ? 'Run <code>opsboss/supabase/schema.sql</code> in the Supabase SQL Editor and reload this page.' : `Your account <b>${esc(cloud.user && cloud.user.email)}</b> hasn’t been invited to OpsBoss yet. Ask an admin to invite you from Settings → Team & access, then sign in again.`}</p><div class="row"><button class="btn" id="aRetry">Retry</button><button class="btn" id="aOut">Sign out</button><button class="btn ghost" id="aDemo">View demo</button></div></div>`;
    $('#aRetry').onclick = () => location.reload();
    $('#aOut').onclick = async () => { await cloud.sb.auth.signOut(); location.reload(); };
    $('#aDemo').onclick = enterDemo;
    return;
  }
  const titles = { login: ['Sign in', 'Sign in with your OpsBoss account.', 'Sign in'], signup: ['Create account', 'Use the email you were invited with.', 'Create account'], magic: ['Magic link', 'We’ll email you a link to sign in without a password.', 'Send link'], reset: ['Reset password', 'We’ll email you a link to set a new one.', 'Send link'], newpass: ['New password', 'Enter your new password.', 'Save'] }[mode];
  const needEmail = mode !== 'newpass', needPass = ['login', 'signup', 'newpass'].includes(mode);
  el.innerHTML = `<div class="auth-card">${logo}<h1>${titles[0]}</h1><p>${titles[1]}</p>${note}<form id="aForm">
    ${mode === 'signup' ? '<label class="f">Name<input name="name" autocomplete="name" required></label>' : ''}
    ${needEmail ? '<label class="f">Email<input name="email" type="email" autocomplete="email" required></label>' : ''}
    ${needPass ? `<label class="f">Password<input name="password" type="password" minlength="8" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required></label>` : ''}
    <button class="btn primary full" id="aSubmit">${titles[2]}</button></form>
    <div class="links">${mode !== 'login' ? '<button data-m="login">← Sign in</button>' : '<button data-m="signup">Create account</button>'}${mode === 'login' ? '<button data-m="magic">Magic link</button><button data-m="reset">Forgot your password?</button>' : ''}</div>
    <div class="links" style="border-top:1px solid var(--border);padding-top:12px"><button id="aDemo">Try it with demo data →</button></div></div>`;
  $$('[data-m]', el).forEach(b => b.onclick = () => authScreen(b.dataset.m));
  $('#aDemo').onclick = enterDemo;
  $('#aForm').onsubmit = async ev => {
    ev.preventDefault();
    const f = ev.target, btn = $('#aSubmit'), redirect = location.origin + location.pathname;
    btn.disabled = true; btn.textContent = 'One moment…';
    const email = f.email ? f.email.value.trim() : '', password = f.password ? f.password.value : '';
    let r;
    if (mode === 'login') r = await cloud.sb.auth.signInWithPassword({ email, password });
    if (mode === 'signup') r = await cloud.sb.auth.signUp({ email, password, options: { data: { name: f.name.value.trim() }, emailRedirectTo: redirect } });
    if (mode === 'magic') r = await cloud.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: false } });
    if (mode === 'reset') r = await cloud.sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
    if (mode === 'newpass') r = await cloud.sb.auth.updateUser({ password });
    if (r.error) { authScreen(mode, esc(r.error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : /fetch|network/i.test(r.error.message) ? 'Could not reach the server. Check your internet connection.' : r.error.message)); return; }
    if (mode === 'signup' && !r.data.session) { authScreen('login', 'Account created. Check your email to confirm it, then sign in.', 'ok'); return; }
    if (mode === 'magic' || mode === 'reset') { authScreen('login', 'Done — check your email and open the link.', 'ok'); return; }
    if (mode === 'newpass') toast('Password updated');
    const { data } = await cloud.sb.auth.getUser(); if (data.user) enter(data.user);
  };
}
function enterDemo() {
  try { localStorage.setItem('opsboss.mode', 'demo'); } catch (e) { /* ignore */ }
  cloud.on = false; db = load(); $('#auth').hidden = true; setSync('local', 'Demo mode: data is stored only in this browser.'); start();
}
async function enter(user) {
  if (cloud.entering || cloud.on) return; cloud.entering = true;
  cloud.user = user; authScreen('loading');
  try {
    const { data: role, error } = await cloud.sb.rpc('opsboss_claim');
    if (error) { authScreen('setup', esc(error.message)); return; }
    if (!role) { authScreen('noaccess'); return; }
    cloud.role = role;
    const { d, count } = await cloudLoad();
    db = d;
    cloud.shadow = snapshot();
    migrateEn(db);
    if (!db.settings) { const b = blankDb(); db.settings = b.settings; if (!db.pricebook.length) db.pricebook = b.pricebook; }
    if (count && !db.workflows.length && !db.settings.wfSeeded) { db.workflows = wfTemplates().slice(0, 6).map(t => wfFromTemplate(t)); db.settings.wfSeeded = true; }
    cloud.on = true; $('#auth').hidden = true; setSync('ok');
    subscribe(); start(); sync();
    if (!count && canAdmin()) firstRun();
  } catch (e) { authScreen('setup', esc(e.message || String(e))); } finally { cloud.entering = false; }
}
function firstRun() {
  let local = null; try { const raw = localStorage.getItem(STORE_KEY); if (raw) local = JSON.parse(raw); } catch (e) { /* ignore */ }
  modal({ title: 'Welcome to OpsBoss in the cloud', body: `<p>The database is empty. How would you like to start?</p><div class="grid" style="gap:10px">
    ${local && local.customers ? `<button class="btn" data-fr="local" style="justify-content:flex-start">⇧ Upload this browser’s data <span class="muted small">(${local.customers.length} customers, ${local.jobs.length} jobs)</span></button>` : ''}
    <button class="btn" data-fr="blank" style="justify-content:flex-start">✦ Start blank <span class="muted small">(with a starter price book)</span></button>
    <button class="btn" data-fr="demo" style="justify-content:flex-start">◧ Load demo data <span class="muted small">(to try it with your team)</span></button></div>`,
    onMount(bg, close) { bg.addEventListener('click', e => { const b = e.target.closest('[data-fr]'); if (!b) return; const k = b.dataset.fr; db = k === 'local' ? normalize(local) : k === 'demo' ? seed() : { ...blankDb(), settings: db.settings, pricebook: db.pricebook }; db.settings.wfSeeded = true; COLLS.forEach(c => db[c] = db[c] || []); log('Database initialized'); close(); save(); render(); toast('Done ✓'); }); },
  });
}
async function boot() {
  let demo = false; try { demo = localStorage.getItem('opsboss.mode') === 'demo' || new URLSearchParams(location.search).has('demo'); } catch (e) { /* ignore */ }
  if (!CFG.url || !window.supabase || !window.supabase.createClient) { cloud.on = false; db = load(); setSync('local', 'Local mode: data is stored only in this browser.'); start(); return; }
  cloud.sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'opsboss-auth' } });
  if (demo) { enterDemo(); return; }
  cloud.sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY') { setTimeout(() => authScreen('newpass'), 0); return; }
    if (ev === 'SIGNED_IN' && session && !cloud.on) setTimeout(() => enter(session.user), 0);
  });
  const { data: { session } } = await cloud.sb.auth.getSession();
  if (session) enter(session.user); else if (!cloud.entering) authScreen('login');
  window.addEventListener('beforeunload', e => { if (cloud.on && (cloud.busy || $('#syncStatus').classList.contains('saving'))) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('online', () => cloud.on && sync());
}
boot();
})();
