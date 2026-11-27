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
const pct2 = n => (isFinite(n) ? (Math.round(n * 10000) / 100).toFixed(2) : '0.00') + '%';
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
// Un pipeline de ventas por servicio. Las claves de etapa son compartidas (new, visit, proposal, won, lost…)
// para que automatizaciones, HighLevel y reportes funcionen igual en los tres; cada servicio tiene sus propias etapas y nombres.
const SERVICE_PIPES = {
  solar: [['new', 'New lead'], ['contacted', 'Contacting'], ['qualified', 'Qualified (bill received)'], ['visit', 'Site survey scheduled'], ['design', 'Design'], ['proposal', 'Proposal sent'], ['financing', 'Financing approval'], ['negotiation', 'Negotiation'], ['won', 'Contract signed'], ['nurture', 'Long-term follow-up'], ['lost', 'Lost']],
  hvac: [['new', 'New lead'], ['contacted', 'Contacting'], ['qualified', 'Qualified'], ['visit', 'Home assessment scheduled'], ['proposal', 'Proposal sent'], ['rebate', 'Rebate / HEAT Loan'], ['negotiation', 'Negotiation'], ['won', 'Contract signed'], ['nurture', 'Long-term follow-up'], ['lost', 'Lost']],
  roofing: [['new', 'New lead'], ['contacted', 'Contacting'], ['visit', 'Inspection scheduled'], ['measured', 'Measured / scoped'], ['proposal', 'Estimate sent'], ['insurance', 'Insurance claim'], ['negotiation', 'Negotiation'], ['won', 'Contract signed'], ['nurture', 'Long-term follow-up'], ['lost', 'Lost']],
};
// Todas las etapas de venta (para reportes y automatizaciones), con nombre genérico.
const STAGES = [['new', 'New lead'], ['contacted', 'Contacting'], ['qualified', 'Qualified'], ['visit', 'Visit / inspection scheduled'], ['design', 'Design'], ['measured', 'Measured / scoped'], ['proposal', 'Proposal sent'], ['financing', 'Financing approval'], ['rebate', 'Rebate / HEAT Loan'], ['insurance', 'Insurance claim'], ['negotiation', 'Negotiation'], ['won', 'Contract signed'], ['nurture', 'Long-term follow-up'], ['lost', 'Lost']];
// Pipeline de marketing (leads que entran desde HighLevel). Las claves de etapa son únicas entre pipelines.
const MKT_STAGES = [['warm', 'Warm Leads'], ['mcontacted', 'Contacted'], ['mappt', 'Appointment Set'], ['qualified', 'Qualified'], ['notint', 'Not Interested']];
const PIPELINES = { solar: { name: 'Solar Pipeline', stages: SERVICE_PIPES.solar, entry: 'new', division: 'solar' }, hvac: { name: 'HVAC Pipeline', stages: SERVICE_PIPES.hvac, entry: 'new', division: 'hvac' }, roofing: { name: 'Roofing Pipeline', stages: SERVICE_PIPES.roofing, entry: 'new', division: 'roofing' }, marketing: { name: 'Marketing Leads', stages: MKT_STAGES, entry: 'warm' } };
const CLOSED = ['won', 'lost', 'notint'];
// Marketing si está en una etapa de marketing; si no, el pipeline de su servicio.
const pipeOf = (stage, division) => MKT_STAGES.some(x => x[0] === stage) ? 'marketing' : (SERVICE_PIPES[division] ? division : 'solar');
const leadPipe = l => pipeOf(l.stage, l.division);
const stageName = (k, division) => ((SERVICE_PIPES[division] || []).find(x => x[0] === k) || [...STAGES, ...MKT_STAGES].find(x => x[0] === k) || [k, k])[1];
const ALL_STAGES = [...STAGES.map(([k, v]) => [k, 'Sales · ' + v]), ...MKT_STAGES.map(([k, v]) => [k, 'Marketing · ' + v])];
const stageOptionsFor = division => [...(SERVICE_PIPES[division] || STAGES).map(([k, v]) => [k, `${DIV[division] ? DIV[division].name : 'Sales'} · ${v}`]), ...MKT_STAGES.map(([k, v]) => [k, 'Marketing · ' + v])];
const SOURCES = ['HighLevel', 'Google', 'Referral', 'Facebook/Instagram', 'Door to door', 'Website', 'Yelp', 'Event', 'Repeat customer'];
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
  ['customers', 'leads', 'estimates', 'jobs', 'invoices', 'plans', 'permits', 'pricebook', 'techs', 'activity', 'tasks', 'pos', 'bills', 'ledger', 'exceptions', 'runs', 'alerts', 'appts', 'tickets', 'warranties', 'comp'].forEach(k => d[k] = d[k] || []);
  migrateComp(d);
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
const COLLS = ['customers', 'leads', 'estimates', 'comp', 'jobs', 'invoices', 'plans', 'permits', 'pricebook', 'techs', 'activity', 'workflows', 'tasks', 'pos', 'bills', 'ledger', 'exceptions', 'runs', 'alerts', 'appts', 'tickets', 'warranties'];
const TABLE = 'opsboss_records';
const ROLE_LABEL = { owner: 'Owner', admin: 'Admin (direction)', sales: 'Sales', ops: 'Operations', purchasing: 'Purchasing', finance: 'Finance', office: 'Office', tech: 'Field technician', sub: 'Subcontractor' };
const cloud = { on: false, sb: null, user: null, role: null, shadow: new Map(), timer: null, busy: false, again: false, pendingRender: false };
const canon = v => JSON.stringify(v, (k, val) => val && typeof val === 'object' && !Array.isArray(val) ? Object.keys(val).sort().reduce((o, key) => (o[key] = val[key], o), {}) : val);
const SEP = '\u0001';
const PRIVATE_SETTINGS = ['commRules', 'techRates'];
function snapshot() {
  const m = new Map();
  COLLS.forEach(c => { if (c === 'comp' && !canRates()) return; (db[c] || []).forEach(r => { if (r && r.id) m.set(c + SEP + r.id, canon(r)); }); });
  if (db.settings) {
    const main = { ...db.settings }; PRIVATE_SETTINGS.forEach(k => delete main[k]); m.set('settings' + SEP + 'main', canon(main));
    if (canRates()) { const pv = {}; PRIVATE_SETTINGS.forEach(k => { if (db.settings[k] !== undefined) pv[k] = db.settings[k]; }); m.set('settings' + SEP + 'private', canon(pv)); }
  }
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
    const cur = snapshot(), ups = [], dels = {}, rejected = [];
    for (const [k, v] of cur) if (cloud.shadow.get(k) !== v) { const [coll, id] = k.split(SEP); ups.push({ coll, id, data: JSON.parse(v), _k: k, _v: v }); }
    for (const k of cloud.shadow.keys()) if (!cur.has(k)) { const [coll, id] = k.split(SEP); (dels[coll] = dels[coll] || []).push(id); }
    for (let i = 0; i < ups.length; i += 200) {
      const chunk = ups.slice(i, i + 200);
      const { error } = await cloud.sb.from(TABLE).upsert(chunk.map(({ coll, id, data }) => ({ coll, id, data })));
      if (error) {
        if (!permErr(error)) throw error;
        for (const u of chunk) {
          const { error: e1 } = await cloud.sb.from(TABLE).upsert([{ coll: u.coll, id: u.id, data: u.data }]);
          if (e1 && !permErr(e1)) throw e1;
          cloud.shadow.set(u._k, u._v); if (e1) rejected.push(u);
        }
      } else chunk.forEach(u => cloud.shadow.set(u._k, u._v));
    }
    for (const [coll, ids] of Object.entries(dels)) for (let i = 0; i < ids.length; i += 200) {
      const part = ids.slice(i, i + 200);
      const { error } = await cloud.sb.from(TABLE).delete().eq('coll', coll).in('id', part);
      if (error) throw error;
      part.forEach(id => cloud.shadow.delete(coll + SEP + id));
    }
    setSync('ok');
    if (rejected.length) rejectedRows(rejected);
  } catch (e) {
    console.error('OpsBoss sync', e);
    setSync(navigator.onLine === false ? 'offline' : 'error', e.message || String(e));
    clearTimeout(cloud.timer); cloud.timer = setTimeout(sync, 5000);
  } finally {
    cloud.busy = false;
    if (cloud.again) { cloud.again = false; sync(); }
  }
}
const permErr = e => e && (e.code === '42501' || /row-level security|permission denied|not allowed/i.test(e.message || ''));
// El servidor rechazó cambios que este rol no puede hacer: se avisa y se recarga la versión del servidor.
async function rejectedRows(list) {
  const names = { jobs: 'projects', customers: 'customers', settings: 'settings', pos: 'purchase orders', bills: 'vendor bills', ledger: 'accounting', comp: 'rates & commissions', permits: 'permits', techs: 'team', pricebook: 'price book', invoices: 'invoices', estimates: 'estimates', leads: 'leads' };
  toast(`Not saved — your role (${ROLE_LABEL[cloud.role] || cloud.role}) can’t change ${[...new Set(list.map(u => names[u.coll] || u.coll))].join(', ')}`);
  for (const u of list) {
    const { data } = await cloud.sb.from(TABLE).select('coll,id,data').eq('coll', u.coll).eq('id', u.id).maybeSingle();
    if (u.coll === 'settings') continue;
    if (data) { cloud.shadow.set(u._k, canon(data.data)); const arr = db[u.coll]; if (arr) { const i = arr.findIndex(x => x.id === u.id); if (i >= 0) arr[i] = data.data; else arr.unshift(data.data); } }
    else { cloud.shadow.delete(u._k); if (db[u.coll]) db[u.coll] = db[u.coll].filter(x => x.id !== u.id); }
  }
  remoteRender();
}
async function cloudLoad() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await cloud.sb.from(TABLE).select('coll,id,data').order('coll').order('id').range(from, from + 999);
    if (error) throw error;
    rows.push(...data); if (data.length < 1000) break;
  }
  const d = { settings: null }; COLLS.forEach(c => d[c] = []);
  let priv = null;
  rows.forEach(r => { if (r.coll === 'settings') { if (r.id === 'private') priv = r.data; else d.settings = r.data; } else if (d[r.coll]) d[r.coll].push(r.data); });
  if (priv && d.settings) Object.assign(d.settings, priv);
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
    if (coll === 'settings') { if (id === 'private') db.settings = { ...(db.settings || {}), ...p.new.data }; else { const keep = {}; PRIVATE_SETTINGS.forEach(k => { if (db.settings && db.settings[k] !== undefined) keep[k] = db.settings[k]; }); db.settings = { ...p.new.data, ...keep }; } }
    else if (db[coll]) { const i = db[coll].findIndex(x => x.id === id); if (i >= 0) db[coll][i] = p.new.data; else db[coll].unshift(p.new.data); }
  }
  remoteRender();
  clearTimeout(cloud.pp); cloud.pp = setTimeout(() => { processPortal(); processGhlLeads(); }, 800);
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
  ['sec', 'Operations'], ['mywork', '★', 'My Work'], ['alerts', '🔔', 'Alerts'], ['dashboard', '◧', 'Dashboard'], ['boards', '▥', 'Team dashboards'], ['tasks', '☑', 'Tasks'], ['field', '📱', 'Field work orders'], ['schedule', '▦', 'Schedule & Dispatch'], ['pipeline', '⇶', 'Pipelines'], ['customers', '☺', 'Customers'],
  ['sec', 'Sales & Jobs'], ['estimates', '✎', 'Estimates'], ['jobs', '⚒', 'Projects'], ['invoices', '$', 'Invoices & Payments'], ['plans', '↻', 'Memberships'], ['service', '🛠', 'Service & warranties'],
  ['sec', 'Projects'], ['permits', '⚑', 'Permits & Inspections'], ['tools', '∑', 'Calculators'],
  ['sec', 'Business'], ['finance', '◔', 'Finance'], ['accounting', '⚖', 'Accounting (QuickBooks)'], ['exceptions', '⚠', 'Exceptions'], ['purchasing', '⛟', 'Purchasing & Bills'], ['commissions', '%', 'Commissions'], ['workflows', '⚡', 'Workflows'], ['runs', '⟳', 'Automation log'], ['audit', '🛡', 'Audit log'], ['reports', '▤', 'Reports'], ['pricebook', '☰', 'Price Book'], ['team', '◎', 'Team'], ['settings', '⚙', 'Settings'],
];
function renderNav() {
  const route = (location.hash.slice(2).split('?')[0] || 'mywork').split('/')[0];
  const parentOf = { customer: 'customers', estimate: 'estimates', job: 'jobs', invoice: 'invoices', photos: 'field', wo: 'field', ticket: 'service', duplicates: 'customers' };
  let exN = 0; try { exN = isFin() ? exceptionsOpen().length : 0; } catch (e) { exN = 0; }
  const active = parentOf[route] || route;
  const badges = { service: (db.tickets || []).filter(t => t.status === 'new').length, tasks: (db.tasks || []).filter(t => !t.done && t.due <= ymd(new Date())).length, schedule: db.jobs.filter(j => j.status === 'unscheduled').length, invoices: db.invoices.filter(i => invStatus(i) === 'overdue').length, pipeline: db.leads.filter(l => l.stage === 'new' || l.stage === 'warm').length, permits: db.permits.filter(p => ['todo', 'rejected'].includes(p.status)).length, exceptions: exN, runs: (db.runs || []).filter(r => r.status === 'error').length };
  const NAVV = NAV.filter(n => n[0] === 'sec' || routeAllowed(n[0])).filter((n, i, a) => n[0] !== 'sec' || (a[i + 1] && a[i + 1][0] !== 'sec'));
  $('#nav').innerHTML = NAVV.map(n => n[0] === 'sec' ? `<div class="sec">${n[1]}</div>` : `<a href="#/${n[0]}" class="${active === n[0] ? 'active' : ''}"><span class="ic">${n[1]}</span>${n[2]}${badges[n[0]] ? `<span class="badge">${badges[n[0]]}</span>` : ''}</a>`).join('');
  $('#divFilter').innerHTML = [['all', 'All'], ...divOptions()].map(([k, v]) => `<button data-div="${k}" class="${state.div === k ? 'on' : ''}">${k !== 'all' ? `<span class="div-dot d-${k}"></span> ` : ''}${v}</button>`).join('');
}
const ROUTES = {};
// Páginas por rol (el servidor aplica los mismos límites a los datos).
const ROLE_ALLOW = { sub: ['mywork', 'alerts', 'tasks', 'field', 'wo', 'photos', 'schedule'] };
const ROLE_DENY = {
  tech: ['finance', 'accounting', 'exceptions', 'purchasing', 'commissions', 'runs', 'reports', 'audit'],
  sales: ['accounting', 'exceptions', 'purchasing', 'commissions', 'runs', 'finance', 'audit'],
  office: ['accounting', 'exceptions', 'commissions', 'runs', 'audit'],
  ops: ['accounting', 'commissions', 'audit'], purchasing: ['accounting', 'commissions', 'audit'],
};
const routeAllowed = r => { if (!cloud.on || !cloud.role) return true; const a = ROLE_ALLOW[cloud.role]; if (a) return a.includes(r); return !(ROLE_DENY[cloud.role] || []).includes(r); };
function render() {
  const [route, id] = (location.hash.slice(2).split('?')[0] || 'mywork').split('/');
  renderNav(); renderBell();
  const fn = !routeAllowed(route || 'mywork') ? () => head('Not available', '') + `<div class="card"><div class="empty">This page isn’t available for your role (${esc(ROLE_LABEL[cloud.role] || cloud.role)}). Ask an admin if you need access.</div></div>` : (ROUTES[route] || ROUTES.dashboard);
  $('#view').innerHTML = fn(id) || '';
  const after = ROUTES[route + ':after']; after && after(id);
}
window.addEventListener('hashchange', () => { $('#sidebar').classList.remove('open'); render(); window.scrollTo(0, 0); });

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
  const leads = db.leads.filter(divOK), openLeads = leads.filter(l => !CLOSED.includes(l.stage));
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
        const time = j.start ? hm(j.start) : '08:00', oldStart = j.start;
        j.start = iso(parseLocal(day, time));
        if (oldStart && oldStart !== j.start) { projInit(j); hist(j, `Rescheduled from ${fDay(oldStart)} ${fTime(oldStart)} to ${fDay(j.start)} ${fTime(j.start)}`); j.reschedules = (j.reschedules || 0) + 1; }
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
  let pk = state.filters.pipe; if (!PIPELINES[pk]) pk = state.div !== 'all' && PIPELINES[state.div] ? state.div : 'solar'; const P = PIPELINES[pk];
  const leads = db.leads.filter(l => pk === 'marketing' ? divOK(l) : true).filter(l => leadPipe(l) === pk);
  const known = new Set(P.stages.map(s => s[0])), odd = leads.filter(l => !known.has(l.stage));
  const colsDef = odd.length ? [...P.stages, ['__other', 'Other stage']] : P.stages;
  const cols = colsDef.map(([k, label]) => {
    const list = k === '__other' ? odd : leads.filter(l => l.stage === k);
    return `<div class="kcol" data-stage="${k}"><div class="kcol-h"><span>${label} <span class="muted">${list.length}</span></span><span class="sum">${kmoney(list.reduce((s, l) => s + num(l.value), 0))}</span></div><div class="kcol-b">${list.map(l => { const c = cust(l.customerId); const late = l.next && parseLocal(l.next) < sod(new Date()) && !CLOSED.includes(l.stage); return `<div class="kcard" draggable="true" data-lead="${l.id}"><div class="t">${esc(l.title)}</div><div class="small">${esc(c.name)}</div><div class="m"><span>${divPill(l.division)}</span><b>${money(l.value)}</b></div><div class="m"><span>${esc(srcEN(l.source))}</span><span class="${late ? 'down b' : ''}">${l.next ? '⏱ ' + new Date(l.next + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span></div></div>`; }).join('')}</div></div>`;
  }).join('');
  const open = leads.filter(l => !CLOSED.includes(l.stage));
  const tabs = `<div class="tabs">${Object.entries(PIPELINES).map(([k, v]) => `<button data-act="filt" data-f="pipe" data-v="${k}" class="${pk === k ? 'on' : ''}">${k !== 'marketing' ? `<span class="div-dot d-${k}"></span> ` : ''}${v.name} <span class="muted">${db.leads.filter(l => k === 'marketing' ? divOK(l) : true).filter(l => leadPipe(l) === k && !CLOSED.includes(l.stage)).length}</span></button>`).join('')}</div>`;
  return head(P.name, pk === 'marketing' ? `${open.length} open marketing leads · new HighLevel leads land in Warm Leads` : `${open.length} open opportunities · ${money(open.reduce((s, l) => s + num(l.value), 0))} in play`, `<button class="btn primary" data-act="newLead" data-pipe="${pk}">＋ New Lead</button>`) + tabs + `<div class="kanban">${cols}</div>`;
};
ROUTES['pipeline:after'] = () => {
  $$('[data-lead]').forEach(el => {
    el.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', el.dataset.lead));
    el.addEventListener('click', () => leadModal(db.leads.find(l => l.id === el.dataset.lead)));
  });
  $$('[data-stage]').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('over'); const l = db.leads.find(x => x.id === e.dataTransfer.getData('text/plain')); if (!l || l.stage === col.dataset.stage || col.dataset.stage === '__other') return; if (col.dataset.stage === 'lost') { const r = prompt('Why was this lead lost? (required)'); if (!r || !r.trim()) return; l.lostReason = r.trim(); } l.stage = col.dataset.stage; l.stageAt = iso(new Date()); log(`Lead "${l.title}" → ${stageName(l.stage, l.division)}`); emit('lead.stage', 'lead', l, { to: l.stage }); save(); render(); });
  });
};
function leadModal(l, pipe) {
  const isNew = !l;
  l = l || { id: uid(), stage: (PIPELINES[pipe] || PIPELINES.solar).entry, createdAt: iso(new Date()), division: PIPELINES[pipe] && PIPELINES[pipe].division ? PIPELINES[pipe].division : (state.div !== 'all' ? state.div : 'solar'), value: 0, source: 'Google', next: ymd(addDays(new Date(), 1)) };
  const m = form({
    title: isNew ? 'New Lead' : 'Lead: ' + esc(l.title),
    fields: [
      { k: 'customerId', label: 'Customer', type: 'select', options: [['__new', '＋ New customer…'], ...custOptions()], value: l.customerId || '__new' },
      { k: 'newName', label: 'Name (if new)', value: '' }, { k: 'newPhone', label: 'Phone (if new)', value: '' },
      { k: 'title', label: 'Opportunity', value: l.title, required: true, ph: 'e.g. 8 kW solar system' },
      { k: 'division', label: 'Division', type: 'select', options: divOptions(), value: l.division },
      { k: 'value', label: 'Estimated value ($)', type: 'number', value: l.value },
      { k: 'stage', label: 'Pipeline · stage', type: 'select', options: stageOptionsFor(l.division), value: l.stage },
      { k: 'source', label: 'Lead source', type: 'select', options: SOURCES, value: srcEN(l.source) },
      { k: 'next', label: 'Next follow-up', type: 'date', value: l.next },
      { k: 'notes', label: 'Notes', type: 'textarea', full: true, value: l.notes },
    ],
    extraFoot: isNew ? '' : `<button class="btn danger" id="ldDel" style="margin-right:auto">Delete</button>${leadPipe(l) === 'marketing' ? `<button class="btn" id="ldToSales">→ Move to ${DIV[l.division] ? DIV[l.division].name : 'Sales'} Pipeline</button>` : ''}<button class="btn" id="ldEst">→ Create estimate</button>`,
    onSave(v) {
      if (v.customerId === '__new') { if (!v.newName) { toast('Enter the new customer\'s name'); return false; } const c = newCustomer({ name: v.newName, phone: v.newPhone, source: v.source }); v.customerId = c.id; }
      delete v.newName; delete v.newPhone;
      const prevStage = l.stage; if (v.stage === 'lost' && prevStage !== 'lost') { const r = prompt('Why was this lead lost? (required)'); if (!r || !r.trim()) { toast('A lost reason is required'); return false; } l.lostReason = r.trim(); } Object.assign(l, v);
      if (isNew) { l.stageAt = l.createdAt; db.leads.unshift(l); log(`New lead: ${cust(l.customerId).name} (${DIV[l.division].name})`); toast('Lead created'); emit('lead.created', 'lead', l); }
      else if (prevStage !== l.stage) { l.stageAt = iso(new Date()); emit('lead.stage', 'lead', l, { to: l.stage }); }
    },
  });
  const dSel = $('[name=division]', m.el), sSel = $('[name=stage]', m.el);
  if (dSel && sSel) dSel.onchange = () => { const cur = sSel.value, opts = stageOptionsFor(dSel.value); sSel.innerHTML = opts.map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(v)}</option>`).join(''); if (!opts.some(o => o[0] === cur)) sSel.value = 'new'; };
  if (!isNew) {
    $('#ldDel', m.el).onclick = () => { m.close(); confirmDlg('Delete this lead?', () => { db.leads = db.leads.filter(x => x.id !== l.id); }); };
    const toSales = $('#ldToSales', m.el);
    if (toSales) toSales.onclick = () => { m.close(); l.stage = 'new'; l.stageAt = iso(new Date()); const pn = PIPELINES[pipeOf('new', l.division)].name; log(`Lead "${l.title}" moved to ${pn}`); emit('lead.stage', 'lead', l, { to: 'new' }); save(); state.filters.pipe = pipeOf('new', l.division); render(); toast('Moved to ' + pn); };
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
  const dupN = duplicateGroups().length;
  return head('Customers', `${db.customers.length} customers total`, `${dupN ? `<a class="btn" href="#/duplicates">⚠ ${dupN} possible duplicate${dupN > 1 ? 's' : ''}</a>` : ''}<button class="btn" data-act="exportCsv" data-what="customers">⇩ CSV</button><button class="btn primary" data-act="newCustomer">＋ Customer</button>`) + `
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
      <div class="card"><div class="card-h"><h3>Leads & memberships</h3><button class="btn sm" data-act="newPlan" data-cust="${c.id}">＋ Membership</button></div><div class="card-b">${leads.map(l => `<div class="list-item"><div style="flex:1">${esc(l.title)}</div>${divPill(l.division)}<span class="pill">${stageName(l.stage, l.division)}</span></div>`).join('')}${plans.map(pl => `<div class="list-item"><div style="flex:1"><b>${esc(pl.name)}</b><div class="small muted">Next visit ${fDate(parseLocal(pl.nextVisit))}</div></div><span class="pill ok">${money(pl.price)}/${pl.interval === 'month' ? 'mo' : 'yr'}</span></div>`).join('') || (leads.length ? '' : '<div class="muted">Nothing yet</div>')}</div></div>
    </div>`;
  if (tab === 'property') body = `
    <div class="card mb"><div class="card-h"><h3>Properties (${(c.properties || []).length + 1})</h3><button class="btn sm" data-act="addProperty" data-id="${c.id}">＋ Property</button></div><div class="card-b"><div class="list-item"><div style="flex:1"><b>Main</b> · ${esc([c.address, c.city, c.zip].filter(Boolean).join(', '))}</div></div>${(c.properties || []).map(pp => `<div class="list-item"><div style="flex:1"><b>${esc(pp.label || 'Property')}</b> · ${esc([pp.address, pp.city, pp.zip].filter(Boolean).join(', '))}${pp.access ? `<div class="small muted">Access: ${esc(pp.access)}</div>` : ''}</div><span class="small muted">${db.jobs.filter(j => j.propertyId === pp.id).length} projects</span></div>`).join('')}</div></div>
    <div class="grid g2">
      <div class="card"><div class="card-h"><h3>Property</h3><button class="btn sm" data-act="editProperty" data-id="${c.id}">Edit</button></div><div class="card-b"><div class="calc-out">
        <div><div class="l">Roof type</div><div class="b">${esc(p.roofType || '—')}</div></div><div><div class="l">Roof age</div><div class="b">${p.roofAge ? p.roofAge + ' years' : '—'}</div></div>
        <div><div class="l">Living area</div><div class="b">${p.sqft ? Number(p.sqft).toLocaleString() + ' ft²' : '—'}</div></div><div><div class="l">Stories</div><div class="b">${esc(p.stories || '—')}</div></div>
        <div><div class="l">Utility</div><div class="b">${esc(p.utility || '—')}</div></div><div><div class="l">Average bill</div><div class="b">${p.avgBill ? money(p.avgBill) + '/mo' : '—'}</div></div>
      </div>${p.roofAge >= 15 ? `<p class="small"><span class="pill warn">Opportunity</span> ${p.roofAge}-year-old roof: good candidate for replacement before going solar.</p>` : ''}${p.avgBill >= 200 ? `<p class="small"><span class="pill brand">Opportunity</span> High bill (${money(p.avgBill)}/mo): strong candidate for solar + battery.</p>` : ''}</div></div>
      <div class="card"><div class="card-h"><h3>Installed equipment</h3><button class="btn sm" data-act="addEquip" data-id="${c.id}">＋ Equipment</button></div><div class="card-b">${(c.equipment || []).map(eq => { const exp = eq.warranty && parseLocal(eq.warranty) < new Date(); return `<div class="list-item"><div style="flex:1"><div class="b">${esc(eq.type)} — ${esc(eq.brand)}</div><div class="small muted">Model ${esc(eq.model)} · S/N ${esc(eq.serial)} · Installed ${fDate(parseLocal(eq.installed))}</div></div><span class="pill ${exp ? 'bad' : 'ok'}">${exp ? 'Warranty expired' : 'Warranty until ' + fDate(parseLocal(eq.warranty))}</span><button class="btn ghost sm danger" data-act="delEquip" data-id="${c.id}" data-eq="${eq.id}">✕</button></div>`; }).join('') || '<div class="muted">Track HVAC units, inverters, panels or batteries to follow up on warranties.</div>'}</div></div>
    </div>`;
  if (tab === 'conv') body = `<div class="card"><div class="card-b" id="ghlConv"><span class="muted small">Loading conversation from HighLevel…</span></div></div>`;
  if (tab === 'notes') body = `<div class="card"><div class="card-b"><label class="f">Internal notes<textarea id="custNotes" style="min-height:200px">${esc(c.notes)}</textarea></label><div class="row mt"><button class="btn primary" data-act="saveNotes" data-id="${c.id}">Save notes</button></div></div></div>`;
  return `<div class="small muted mb"><a href="#/customers">Customers</a> / ${esc(c.name)}</div>` + head(esc(c.name), `${esc(c.address)}, ${esc(c.city)} ${esc(c.zip)} · Customer since ${fDate(c.createdAt)} · ${esc(srcEN(c.source))}`,
    `<a class="btn" href="tel:${esc(c.phone)}">✆ Call</a><a class="btn" href="sms:${esc(c.phone)}">✉ SMS</a><a class="btn" href="mailto:${esc(c.email)}">@ Email</a><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${addr}">⌖ Map</a><button class="btn" data-act="editCustomer" data-id="${c.id}">Edit</button><button class="btn primary" data-act="newEstimate" data-cust="${c.id}">＋ Estimate</button>`) + `
  <div class="grid g4 mb">${kpi('Lifetime value', money(custLTV(id)))}${kpi('Balance due', money(custBal(id)))}${kpi('Jobs', jobs.length, jobs.filter(j => j.status === 'completed').length + ' completed')}${kpi('Contact', `<span style="font-size:15px">${esc(c.phone)}</span>`, esc(c.email))}</div>
  <div class="tabs">${[['overview', 'Overview'], ['conv', '💬 Conversation'], ['property', 'Property & equipment'], ['notes', 'Notes']].map(([k, v]) => `<button data-act="tab" data-t="cust" data-v="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>${body}`;
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
  projInit(j); j.fin.budget = { price: subtotal(items), cost: costOf(items), byCat: { Materials: costOf(items) }, lockedAt: iso(new Date()), by: me(), fromEstimate: e.number };
  j.financing.mode = e.financing || 'cash'; hist(j, `Project created from ${e.number} (${e.options[k].name}) — original budget ${money2(subtotal(items))} price / ${money2(costOf(items))} cost`);
  db.jobs.unshift(j); e.jobId = j.id;
  const lead = db.leads.find(l => l.estimateId === e.id || (l.customerId === e.customerId && l.division === e.division && !CLOSED.includes(l.stage)));
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

/* ───────────── HighLevel ───────────── */
const ghlOn = () => cloud.on && cloud.ghl && cloud.ghl.connected;
async function ghlCall(action, payload = {}) {
  const { data: { session } } = await cloud.sb.auth.getSession();
  const r = await fetch(`${CFG.url}/functions/v1/opsboss-ghl`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.key, Authorization: `Bearer ${session ? session.access_token : ''}` }, body: JSON.stringify({ action, ...payload }) });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || out.error) throw new Error(out.message || out.error || 'HighLevel error ' + r.status);
  return out;
}
async function ghlLoadConfig() { if (!cloud.on) return; try { const { data } = await cloud.sb.rpc('opsboss_ghl_config'); cloud.ghl = data || {}; } catch (e) { cloud.ghl = {}; } }
// Vincula un cliente de OpsBoss con su contacto de HighLevel (busca por teléfono/email; si no existe, lo crea).
async function ghlEnsure(c) {
  if (c.ghlId) return c.ghlId;
  const out = await ghlCall('link', { customer: { name: c.name, phone: c.phone, email: c.email, address: c.address, city: c.city, zip: c.zip } });
  c.ghlId = out.contactId; save();
  if (out.created) log(`HighLevel contact created for ${c.name}`);
  return c.ghlId;
}
async function ghlSend(c, type, text, subject) {
  const ch = type === 'Email' ? 'email' : 'sms';
  if (c.consent && c.consent[ch] === false) throw new Error(`${c.name} opted out of ${ch.toUpperCase()}`);
  const id = await ghlEnsure(c);
  await ghlCall('send', { contactId: id, type, message: text, subject });
  log(`${type === 'Email' ? '@ Email' : '✉ SMS'} sent to ${c.name} via HighLevel`);
}
const ghlContactUrl = id => `https://app.gohighlevel.com/v2/location/${cloud.ghl && cloud.ghl.locationId}/contacts/detail/${id}`;
ROUTES['customer:after'] = async id => {
  const box = $('#ghlConv'); if (!box) return;
  const c = byId('customers', id);
  if (!ghlOn()) { box.innerHTML = `<div class="empty">Connect HighLevel in <a href="#/settings">Settings</a> to see SMS, calls and emails here.</div>`; return; }
  if (!c.phone && !c.email) { box.innerHTML = '<div class="empty">Add a phone or email to this customer to link HighLevel.</div>'; return; }
  try {
    const cid = await ghlEnsure(c);
    const h = await ghlCall('history', { contactId: cid, limit: 60 });
    if (!$('#ghlConv')) return;
    const msgs = (h.messages || []).slice().reverse();
    const bubble = m => {
      const out = m.direction === 'outbound', when = new Date(m.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      if (m.type === 'call') return `<div class="list-item"><span class="pill ${m.callStatus === 'completed' ? 'ok' : 'warn'}">📞 ${out ? 'Outbound' : 'Inbound'} call</span><div style="flex:1" class="small">${m.duration ? Math.round(m.duration / 60) + ' min' : ''} ${esc(m.callStatus || m.status || '')}</div><span class="small muted">${when}</span></div>`;
      return `<div style="display:flex;justify-content:${out ? 'flex-end' : 'flex-start'};margin:6px 0"><div style="max-width:78%;background:${out ? 'var(--brand)' : 'var(--panel-2)'};color:${out ? '#fff' : 'var(--text)'};border:1px solid var(--border);border-radius:12px;padding:8px 11px"><div class="small" style="white-space:pre-wrap">${m.type === 'email' ? '<b>@ ' + esc(m.subject || 'Email') + '</b><br>' : ''}${esc(m.body || '(' + m.type + ')')}</div><div style="font-size:11px;opacity:.7;margin-top:3px">${when}${m.status ? ' · ' + esc(m.status) : ''}</div></div></div>`;
    };
    box.innerHTML = `<div class="row mb" style="justify-content:space-between"><span class="small muted">Last ${msgs.length} messages from HighLevel</span><div class="row"><a class="btn sm" href="${esc(ghlContactUrl(cid))}" target="_blank" rel="noopener">📞 Call / open in HighLevel ↗</a><button class="btn sm" data-act="ghlRefresh" data-id="${c.id}">↻</button></div></div>
      <div style="max-height:420px;overflow:auto;padding:4px 2px" id="ghlMsgs">${msgs.map(bubble).join('') || '<div class="empty">No conversation yet.</div>'}</div>
      <div class="row mt" style="align-items:flex-end"><textarea class="inp" id="ghlText" placeholder="Write an SMS…" style="flex:1;min-height:60px"></textarea><button class="btn primary" data-act="ghlSendSms" data-id="${c.id}">Send SMS</button></div>`;
    const ml = $('#ghlMsgs'); if (ml) ml.scrollTop = ml.scrollHeight;
  } catch (e) { if ($('#ghlConv')) $('#ghlConv').innerHTML = `<div class="auth-msg bad">HighLevel: ${esc(e.message)}</div>`; }
};
// Leads que llegan desde HighLevel: disparan los workflows de "lead creado" una sola vez.
async function processGhlLeads() {
  if (!cloud.on) return;
  for (const l of db.leads) {
    if (l.via !== 'highlevel' || l.wfFired || portalSeen.has('g' + l.id)) continue;
    portalSeen.add('g' + l.id);
    const { data: mine } = await cloud.sb.rpc('opsboss_lock', { p_key: 'ghl-lead:' + l.id });
    l.wfFired = true;
    if (mine) { toast(`📥 New marketing lead: ${cust(l.customerId).name}`); emit('lead.created', 'lead', l); }
    save();
  }
}

/* ───────────── PROJECT PHOTOS (financier / QA checklists) ───────────── */
// Una línea por foto requerida. Las que empiezan con "?" son opcionales. Editables en Settings.
const PHOTO_DEFAULTS = {
  solar: [
    'Front of house with address number visible',
    'Utility meter close-up (meter number readable)',
    'Main service panel — door closed with label',
    'Main service panel — dead front removed (breakers & bus)',
    'Main panel rating label (bus bar & main breaker)',
    'Roof — each array plane before install',
    '? Attic / rafters at array location',
    'Attachments and flashing before modules',
    'Racking and rails installed',
    'Grounding / bonding (lugs, WEEB, ground wire)',
    'Each array — full view with all modules visible',
    'Module spec label (model & wattage)',
    'Module serial numbers / layout map',
    'Inverter or microinverter label & serials',
    'Junction box / combiner — open, wiring visible',
    'Conduit run from array to point of interconnection',
    'AC disconnect with labels',
    'Point of interconnection (PV breaker or line-side tap)',
    'Production meter / CTs installed',
    'NEC placards & warning labels',
    '? Battery — installed unit, label and serial',
    'Monitoring gateway installed',
    'Commissioning screen — system producing / online',
    'Final — house with completed system',
    'Site cleanup',
  ],
  hvac: [
    'Front of house with address number visible',
    'Old outdoor unit before removal (data plate)',
    'Old indoor unit / furnace before removal (data plate)',
    'New outdoor unit installed — full view',
    'New outdoor unit data plate (model & serial)',
    'New indoor unit / air handler / furnace installed',
    'New indoor unit data plate (model & serial)',
    'Line set and insulation',
    'Condensate drain and safety switch',
    'Electrical disconnect and whip',
    'Pad / mounting and clearances',
    'Refrigerant charge — gauge readings',
    'Supply and return temperature readings',
    'Filter installed',
    'Thermostat installed and running',
    '? Permit sticker / job card',
    'Site cleanup',
  ],
  roofing: [],
};
const pslug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
function photoReqs(division) {
  const lines = (db.settings.photoReqs && db.settings.photoReqs[division]) || PHOTO_DEFAULTS[division] || [];
  const seen = new Set();
  return lines.map(l => { const t = String(l).trim(), opt = t.startsWith('?'), label = t.replace(/^\?\s*/, ''); return { id: pslug(label), label, required: !opt }; })
    .filter(r => r.label && !seen.has(r.id) && seen.add(r.id));
}
function photoStatus(j) {
  const reqs = photoReqs(j.division), shots = j.reqPhotos || [];
  const has = r => shots.some(s => s.reqId === r.id);
  return { reqs, shots, done: reqs.filter(has).length, total: reqs.length, required: reqs.filter(r => r.required).length, requiredDone: reqs.filter(r => r.required && has(r)).length, missing: reqs.filter(r => r.required && !has(r)) };
}
// Reduce la foto y le imprime número de trabajo, requisito, dirección y fecha/hora.
function stampPhoto(file, lines, max = 1600) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * s), h = Math.round(img.height * s);
        const fs = Math.max(14, Math.round(w / 55)), band = Math.round(fs * 1.5 * lines.length + fs * 0.6);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
        g.drawImage(img, 0, 0, w, h);
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, h - band, w, band);
        g.fillStyle = '#fff'; g.font = `600 ${fs}px Inter, Arial, sans-serif`; g.textBaseline = 'top';
        lines.forEach((t, i) => g.fillText(t, Math.round(fs * 0.6), h - band + Math.round(fs * 0.35) + i * Math.round(fs * 1.5), w - fs));
        cv.toBlob(b => b ? res(b) : rej(new Error('Could not process photo')), 'image/jpeg', 0.82);
      };
      img.onerror = () => rej(new Error('Unsupported image'));
      img.src = r.result;
    };
    r.onerror = () => rej(new Error('Could not read photo'));
    r.readAsDataURL(file);
  });
}
const blobToDataUrl = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
async function savePhoto(j, req, file) {
  const c = cust(j.customerId), when = new Date();
  const blob = await stampPhoto(file, [`${j.number} · ${req.label}`, `${[c.address, c.city].filter(Boolean).join(', ')} · ${when.toLocaleString('en-US')}`], cloud.on ? 1600 : 1000);
  const shot = { id: uid(), reqId: req.id, label: req.label, takenAt: iso(when), by: cloud.user ? cloud.user.email : 'local' };
  if (cloud.on) {
    const path = `jobs/${j.id}/${req.id}-${shot.id}.jpg`;
    shot.path = path;
    let err = null;
    if (navigator.onLine === false) err = new Error('offline');
    else { try { const { error } = await cloud.sb.storage.from('opsboss-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false }); err = error; } catch (e) { err = e; } }
    if (err) { shot.pending = true; await uqPut({ id: shot.id, jobId: j.id, path, blob, label: req.label, error: navigator.onLine === false ? '' : (err.message || String(err)), ts: iso(when) }); uqRefresh(); toast('📶 Saved on this phone — it will upload when the connection is back'); }
  } else shot.data = await blobToDataUrl(blob);
  (j.reqPhotos = j.reqPhotos || []).push(shot);
  log(`📷 ${req.label} — ${j.number}`);
  save();
  return shot;
}
const photoUrlCache = new Map();
async function photoUrls(shots) {
  const out = {}, need = [];
  if (shots.some(s => s.pending)) { try { const all = await uqAll(); shots.filter(s => s.pending).forEach(s => { const it = all.find(x => x.id === s.id); if (it) out[s.id] = URL.createObjectURL(it.blob); }); } catch (e) { /* sin cola */ } }
  for (const s of shots) {
    if (s.data) out[s.id] = s.data;
    else if (s.path && !s.pending) { const c = photoUrlCache.get(s.path); if (c && c.exp > Date.now()) out[s.id] = c.url; else need.push(s); }
  }
  if (need.length && cloud.on) {
    const { data } = await cloud.sb.storage.from('opsboss-photos').createSignedUrls(need.map(s => s.path), 3600);
    (data || []).forEach((d, i) => { if (d.signedUrl) { photoUrlCache.set(need[i].path, { url: d.signedUrl, exp: Date.now() + 50 * 60 * 1000 }); out[need[i].id] = d.signedUrl; } });
  }
  return out;
}
const photoProgress = st => `<div class="progress" style="height:10px"><div style="width:${st.total ? st.done / st.total * 100 : 0}%;background:${st.missing.length ? 'var(--warn)' : 'var(--ok)'}"></div></div>`;

ROUTES.field = () => {
  const q = (state.filters.fq || '').toLowerCase(), today = new Date();
  const jobs = db.jobs.filter(divOK).filter(j => j.status !== 'cancelled')
    .filter(j => !q || [j.number, j.title, cust(j.customerId).name, cust(j.customerId).address].join(' ').toLowerCase().includes(q))
    .map(j => ({ j, st: photoStatus(j), rank: j.status === 'inprogress' ? 0 : j.start && sameDay(j.start, today) ? 1 : j.status === 'completed' ? 4 : 2 }))
    .sort((a, b) => a.rank - b.rank || (a.st.missing.length ? 0 : 1) - (b.st.missing.length ? 0 : 1));
  return head('Field work orders', 'Tap a job to open its work order: scope, tasks, photos, hours, materials, serials and customer sign-off.') + uqBar() + `
  <div class="card mb"><div class="toolbar"><input id="fq" placeholder="Search job #, customer, address…" value="${esc(state.filters.fq || '')}" style="flex:1;min-width:200px"></div></div>
  <div class="grid g3">${jobs.map(({ j, st }) => { const c = cust(j.customerId); return `<div class="card click" data-go="#/wo/${j.id}" style="cursor:pointer"><div class="card-b">
    <div class="row" style="justify-content:space-between"><b>${j.number}</b>${pill(JOB_ST, j.status)}</div>
    <div class="b mt">${esc(j.title)}</div><div class="small muted">${esc(c.name)} · ${esc([c.address, c.city].filter(Boolean).join(', '))}</div>
    <div class="row mt" style="justify-content:space-between">${divPill(j.division)}<span class="small ${st.missing.length ? 'down b' : 'up b'}">${st.missing.length ? `${st.missing.length} required missing` : '✓ All required photos'}</span></div>
    <div class="mt">${photoProgress(st)}<div class="small muted mt">${st.done}/${st.total} photos</div></div>
  </div></div>`; }).join('') || '<div class="card"><div class="empty">No jobs with a photo checklist yet. Solar and HVAC jobs get one automatically.</div></div>'}</div>`;
};
ROUTES['field:after'] = () => { const i = $('#fq'); if (!i) return; i.oninput = () => { state.filters.fq = i.value; const pos = i.selectionStart; render(); const n = $('#fq'); n.focus(); n.setSelectionRange(pos, pos); }; };

ROUTES.photos = id => {
  const j = db.jobs.find(x => x.id === id); if (!j) return '<div class="empty">Job not found</div>';
  const c = cust(j.customerId), st = photoStatus(j), known = new Set(st.reqs.map(r => r.id));
  const thumbs = list => list.map(s => `<div style="position:relative"><img data-photo="${s.id}" alt="${esc(s.label)}" style="width:112px;height:84px;object-fit:cover;border-radius:8px;border:1px solid var(--border);background:var(--panel-2)"><button class="btn sm" style="position:absolute;top:3px;right:3px;padding:0 6px" data-act="delReqPhoto" data-job="${j.id}" data-shot="${s.id}" title="Delete photo">✕</button></div>`).join('');
  const other = st.shots.filter(s => !known.has(s.reqId));
  return `<div class="small muted mb"><a href="#/field">Field Photos</a> / ${j.number}</div>` + head(`📷 ${j.number} · ${esc(j.title)}`, `${esc(c.name)} · ${esc([c.address, c.city].filter(Boolean).join(', '))} · ${divPill(j.division)}`,
    `<a class="btn" href="#/job/${j.id}">Job details</a><button class="btn primary" data-act="photoPdf" data-id="${j.id}">⇩ Download PDF</button>`) + `
  <div class="card mb"><div class="card-b"><div class="row" style="justify-content:space-between;margin-bottom:8px"><b>${st.done}/${st.total} photos · ${st.requiredDone}/${st.required} required</b><span class="small ${st.missing.length ? 'down b' : 'up b'}">${st.missing.length ? `${st.missing.length} required photos missing — the job can’t be completed yet` : '✓ Ready for the financier'}</span></div>${photoProgress(st)}</div></div>
  <div class="card">${st.reqs.map((r, i) => { const mine = st.shots.filter(s => s.reqId === r.id); return `<div class="list-item" style="padding:12px 16px;align-items:flex-start;flex-wrap:wrap">
    <div style="width:28px" class="b ${mine.length ? 'up' : r.required ? 'down' : 'muted'}">${mine.length ? '✓' : i + 1}</div>
    <div style="flex:1;min-width:200px"><div class="b">${esc(r.label)}</div><div class="small">${r.required ? '<span class="pill warn" style="font-size:11px">Required</span>' : '<span class="pill" style="font-size:11px">Optional</span>'} ${mine.length ? `<span class="muted">${mine.length} photo${mine.length > 1 ? 's' : ''}</span>` : ''}</div><div class="row mt">${thumbs(mine)}</div></div>
    <label class="btn ${mine.length ? '' : 'primary'}" style="align-self:center">📷 ${mine.length ? 'Add another' : 'Take photo'}<input type="file" accept="image/*" capture="environment" hidden data-act-input="reqPhoto" data-job="${j.id}" data-req="${r.id}"></label>
  </div>`; }).join('') || '<div class="empty">No photo checklist for this division. Add one in Settings → Required photos.</div>'}</div>
  ${other.length ? `<div class="card mt"><div class="card-h"><h3>Other photos</h3><span class="small muted">From items no longer on the checklist</span></div><div class="card-b"><div class="row">${thumbs(other)}</div></div></div>` : ''}`;
};
ROUTES['photos:after'] = async id => {
  const j = db.jobs.find(x => x.id === id); if (!j || !(j.reqPhotos || []).length) return;
  const urls = await photoUrls(j.reqPhotos);
  $$('img[data-photo]').forEach(im => { const u = urls[im.dataset.photo]; if (u) { im.src = u; im.onclick = () => window.open(u, '_blank'); im.style.cursor = 'zoom-in'; } });
};
function loadScript(src) { return new Promise((res, rej) => { if ([...document.scripts].some(s => s.src === src)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
async function imageForPdf(url, max = 1400) {
  const blob = await (await fetch(url)).blob(), data = await blobToDataUrl(blob);
  return await new Promise((res, rej) => { const im = new Image(); im.onload = () => { const s = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * s); cv.height = Math.round(im.height * s); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); res({ data: cv.toDataURL('image/jpeg', 0.78), w: cv.width, h: cv.height }); }; im.onerror = rej; im.src = data; });
}
async function photoPdf(j) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'pt', format: 'letter' }), _t = doc.text.bind(doc), pt = x => String(x ?? '').replace(/[—–]/g, '-').replace(/·/g, '|').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x00-\xFF]/g, ''), W = 612, H = 792, M = 40, c = cust(j.customerId), st = photoStatus(j), s = db.settings;
  doc.text = (t, ...a) => _t(Array.isArray(t) ? t.map(pt) : pt(t), ...a);
  // Portada
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text(s.company || 'OpsBoss', M, 70);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100); doc.text([s.license || '', [s.address, s.phone, s.email].filter(Boolean).join(' · ')], M, 88);
  doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Project Photo Report', M, 140);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  const info = [['Job', `${j.number} — ${j.title}`], ['Division', DIV[j.division] ? DIV[j.division].name : ''], ['Customer', c.name], ['Address', [c.address, c.city, c.zip].filter(Boolean).join(', ')], ['Install date', j.start ? fDate(j.start) : '—'], ['Generated', new Date().toLocaleString('en-US')], ['Photos', `${st.done}/${st.total} items · ${st.requiredDone}/${st.required} required`]];
  info.forEach(([k, v], i) => { doc.setFont('helvetica', 'bold'); doc.text(k, M, 170 + i * 18); doc.setFont('helvetica', 'normal'); doc.text(String(v || ''), M + 90, 170 + i * 18, { maxWidth: W - M * 2 - 90 }); });
  let y = 170 + info.length * 18 + 20;
  doc.setFont('helvetica', 'bold'); doc.setTextColor(st.missing.length ? 200 : 5, st.missing.length ? 40 : 150, st.missing.length ? 40 : 105);
  doc.text(st.missing.length ? `INCOMPLETE — ${st.missing.length} required photo(s) missing (marked MISSING below)` : 'COMPLETE — all required photos included', M, y);
  doc.setTextColor(20); y += 26;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Checklist', M, y); y += 16; doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  st.reqs.forEach((r, i) => {
    if (y > H - M) { doc.addPage(); y = M + 10; }
    const n = st.shots.filter(x => x.reqId === r.id).length, miss = r.required && !n;
    doc.setTextColor(miss ? 200 : 20, miss ? 40 : 20, miss ? 40 : 20);
    doc.text(`${n ? '[x]' : r.required ? '[  ]' : '[ - ]'} ${i + 1}. ${r.label}${n > 1 ? ` (${n} photos)` : ''}${r.required ? '' : ' (optional)'}${miss ? '  — MISSING' : ''}`, M + 6, y, { maxWidth: W - M * 2 - 6 });
    y += 13;
  });
  doc.setTextColor(20);
  // Fotos: 2 por página
  const urls = await photoUrls(st.shots), order = st.reqs.flatMap(r => st.shots.filter(x => x.reqId === r.id)).concat(st.shots.filter(x => !st.reqs.some(r => r.id === x.reqId)));
  const slotH = (H - M * 2 - 30) / 2;
  for (let i = 0; i < order.length; i++) {
    if (i % 2 === 0) doc.addPage();
    const shot = order[i], top = M + (i % 2) * (slotH + 30), ri = st.reqs.findIndex(r => r.id === shot.reqId);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20);
    doc.text(`${ri >= 0 ? ri + 1 + '. ' : ''}${shot.label}`, M, top + 10, { maxWidth: W - M * 2 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110);
    doc.text(`${new Date(shot.takenAt).toLocaleString('en-US')} · ${shot.by || ''}`, M, top + 24);
    try {
      const im = await imageForPdf(urls[shot.id]); const boxW = W - M * 2, boxH = slotH - 40, sc = Math.min(boxW / im.w, boxH / im.h);
      doc.addImage(im.data, 'JPEG', M + (boxW - im.w * sc) / 2, top + 32, im.w * sc, im.h * sc);
    } catch (e) { doc.setTextColor(200, 40, 40); doc.text('Photo could not be loaded', M, top + 50); }
  }
  doc.save(`${j.number}-photo-report.pdf`);
  log(`⇩ Photo report PDF downloaded — ${j.number}`);
}

/* ───────────── PROJECT FILE: service workflows, statuses, financials ───────────── */
const COST_CATS = ['Materials', 'Equipment', 'Own labor', 'Subcontract', 'Design & engineering', 'Permits', 'Electrical', 'Rentals', 'Disposal', 'Commissions', 'Financing fees', 'Warranty', 'Other'];
const FIN_MODES = [['cash', 'Cash'], ['loan', 'Loan'], ['lease', 'Lease'], ['ppa', 'PPA']];
const SERVICE_FLOW = {
  solar: [['visit', 'Site visit', ['Site survey and roof photos', 'Utility bill / usage collected']], ['design', 'Design', ['System design and layout', 'Design approved by customer']], ['permits', 'Permits & interconnection', ['Building / electrical permit approved', 'Interconnection application approved']], ['procurement', 'Procurement', ['Equipment ordered', 'Equipment delivered']], ['install', 'Installation', ['Racking and modules installed', 'Inverters / batteries and conduit']], ['inspection', 'Inspection', ['City inspection passed']], ['pto', 'PTO', ['Utility PTO received']], ['handoff', 'Handoff', ['Monitoring activated', 'Customer handoff and warranty documents']]],
  hvac: [['assessment', 'Assessment', ['Existing system documented', 'Load calculation (Manual J/S when applicable)']], ['design', 'Design', ['Equipment selected (AHRI match)']], ['program', 'Program validation', ['Rebate / HEAT Loan eligibility confirmed']], ['permits', 'Permits & procurement', ['Permit pulled', 'Equipment ordered']], ['install', 'Installation', ['Indoor and outdoor units installed', 'Electrical scope complete']], ['commissioning', 'Commissioning', ['Startup tests recorded']], ['docs', 'Documentation & handoff', ['Rebate / program paperwork submitted', 'Customer handoff']]],
  roofing: [['inspection', 'Inspection', ['Roof inspection photos']], ['measure', 'Measurement & scope', ['Measurement report', 'Scope and extras agreed']], ['schedule', 'Scheduling & materials', ['Materials ordered', 'Dumpster scheduled']], ['tearoff', 'Tear-off', ['Tear-off complete']], ['decking', 'Decking review', ['Decking inspected / replaced']], ['install', 'Installation', ['Underlayment and flashing', 'Shingles / metal installed']], ['cleanup', 'Cleanup & inspection', ['Magnet sweep and cleanup', 'Final inspection']], ['handoff', 'Handoff', ['Warranty registered']]],
};
const SPEC_FIELDS = {
  solar: [['utility', 'Utility'], ['usageKwh', 'Annual usage (kWh)', 'number'], ['dcKw', 'System size DC (kW)', 'number'], ['acKw', 'System size AC (kW)', 'number'], ['productionKwh', 'Est. production (kWh/yr)', 'number'], ['designRev', 'Design / revision'], ['modules', 'Modules (model × qty)'], ['inverters', 'Inverters'], ['batteries', 'Batteries'], ['icApp', 'Interconnection application #'], ['permitApp', 'Permit application #']],
  hvac: [['existingHeat', 'Existing heating system'], ['zones', 'Zones', 'number'], ['manualJ', 'Manual J/S'], ['indoorModel', 'Indoor model'], ['outdoorModel', 'Outdoor model'], ['ahri', 'AHRI #'], ['capacity', 'Capacity (BTU / tons)'], ['electricalScope', 'Electrical scope'], ['commissioning', 'Commissioning tests'], ['heatLoan', 'HEAT Loan #'], ['rebate', 'Rebate program / amount'], ['rebatePayee', 'Rebate beneficiary']],
  roofing: [['measureReport', 'Measurement report'], ['squares', 'Squares', 'number'], ['waste', 'Waste (%)', 'number'], ['manufacturer', 'Manufacturer'], ['roofSystem', 'Roof system'], ['ventilation', 'Ventilation'], ['flashing', 'Flashing'], ['disposal', 'Disposal'], ['decking', 'Decking (sheets replaced)'], ['extrasPrice', 'Extras unit price ($)', 'number']],
};
const MONEY_ROLES = ['owner', 'admin', 'finance', 'ops', 'purchasing'];
const canMoney = () => !cloud.on || MONEY_ROLES.includes(cloud.role);
const canRates = () => !cloud.on || ['owner', 'admin', 'finance'].includes(cloud.role);
const canApprove = () => !cloud.on || ['owner', 'admin', 'finance'].includes(cloud.role);
const me = () => (cloud.user && cloud.user.email) || 'local';
const sumBy = (arr, f) => (arr || []).reduce((s, x) => s + num(f(x)), 0);
const flowOf = j => SERVICE_FLOW[j.division] || [];

function projInit(j) {
  if (!j.ops) { const f = flowOf(j); j.ops = { stage: f.length ? f[0][0] : '', tasks: {}, exceptions: [] }; }
  j.ops.tasks = j.ops.tasks || {}; j.ops.exceptions = j.ops.exceptions || [];
  for (const [k, , ts] of flowOf(j)) if (!j.ops.tasks[k]) j.ops.tasks[k] = ts.map(t => ({ id: uid(), t, done: false, owner: '' }));
  j.fin = j.fin || {}; j.fin.changeOrders = j.fin.changeOrders || []; j.fin.costs = j.fin.costs || []; j.fin.labor = j.fin.labor || []; if (j.fin.remaining == null) j.fin.remaining = 0;
  j.blockers = j.blockers || []; j.dependsOn = j.dependsOn || []; j.specs = j.specs || {}; j.financing = j.financing || { mode: 'cash', payer: '', release: '' }; j.history = j.history || [];
  return j;
}
function hist(j, text) { (j.history = j.history || []).unshift({ ts: iso(new Date()), by: me(), text }); j.history = j.history.slice(0, 300); }
const stageIdx = j => flowOf(j).findIndex(s => s[0] === (j.ops && j.ops.stage));
const stageLabel = (j, k = j.ops && j.ops.stage) => (flowOf(j).find(s => s[0] === k) || [k, j.ops && j.ops.closed ? 'Closed' : '—'])[1];
function blockersOf(j) {
  projInit(j);
  const open = j.blockers.filter(b => !b.resolvedAt).map(b => ({ ...b, kind: 'blocker' }));
  const deps = j.dependsOn.map(d => { const o = db.jobs.find(x => x.id === d.projectId); if (!o) return null; projInit(o); const met = o.status === 'completed' || o.ops.closed || (d.stage ? flowOf(o).findIndex(s => s[0] === o.ops.stage) > flowOf(o).findIndex(s => s[0] === d.stage) : false); return met ? null : { kind: 'dep', reason: `Waiting on ${o.number} (${DIV[o.division] ? DIV[o.division].name : ''})${d.stage ? ' to finish ' + stageLabel(o, d.stage) : ''}`, owner: (o.owner || ''), id: d.projectId }; }).filter(Boolean);
  return [...open, ...deps];
}
// Finanzas del proyecto (montos antes de impuestos; los impuestos se muestran aparte)
const projInvoices = j => db.invoices.filter(i => i.status !== 'void' && (i.jobId === j.id || (j.estimateId && i.estimateId === j.estimateId && !i.jobId)));
const billLines = j => (db.bills || []).flatMap(b => (b.lines || []).filter(l => l.projectId === j.id).map(l => ({ ...l, bill: b })));
const poBilled = po => sumBy((db.bills || []).flatMap(b => b.lines || []).filter(l => l.poId === po.id), l => l.amount);
// Tarifas por entrada de mano de obra y comisiones viven en "comp" (solo owner/admin/finance las leen).
// Los demás roles usan los totales que calcula el servidor (fin.laborCost, fin.commPaid, fin.commOpen).
function compOf(j, create) { db.comp = db.comp || []; let c = db.comp.find(x => x.id === j.id); if (!c && create) { c = { id: j.id, labor: {}, commissions: [] }; db.comp.push(c); } if (c) { c.labor = c.labor || {}; c.commissions = c.commissions || []; } return c; }
function laborRateOf(j, l) { const c = compOf(j); return c && c.labor[l.id] != null ? num(c.labor[l.id]) : techRate(tech(l.techId)); }
function laborCostOf(j) { const f = j.fin; if (canRates()) return sumBy(f.labor, l => num(l.hours) * laborRateOf(j, l)); return f.laborCost != null ? num(f.laborCost) : sumBy(f.labor, l => num(l.hours) * num(db.settings.laborRate || 45)); }
const commsOf = j => canRates() ? ((compOf(j) || {}).commissions || []) : [];
function migrateComp(d) {
  d.comp = d.comp || [];
  (d.jobs || []).forEach(j => { const f = j.fin; if (!f) return; const has = (f.commissions && f.commissions.length) || (f.labor || []).some(l => l.rate != null); if (!has) { delete f.commissions; return; } let c = d.comp.find(x => x.id === j.id); if (!c) { c = { id: j.id, labor: {}, commissions: [] }; d.comp.push(c); } (f.labor || []).forEach(l => { if (l.rate != null) { if (c.labor[l.id] == null) c.labor[l.id] = num(l.rate); delete l.rate; } }); if (f.commissions) { if (!c.commissions.length) c.commissions = f.commissions; delete f.commissions; } });
  (d.tickets || []).forEach(t => (t.time || []).forEach(x => { delete x.rate; }));
}
function finOf(j) {
  projInit(j);
  const f = j.fin, base = f.budget ? f.budget.price : subtotal(j.items), baseCost = f.budget ? f.budget.cost : costOf(j.items);
  const coApproved = f.changeOrders.filter(c => c.status === 'approved');
  const coPrice = sumBy(coApproved, c => c.price), coCost = sumBy(coApproved, c => c.cost);
  const revenue = base + coPrice;
  const lines = billLines(j), labor = laborCostOf(j);
  const actual = sumBy(lines, l => l.amount) + sumBy(f.costs, c => c.amount) + labor;
  const paidOut = sumBy(lines.filter(l => l.bill.paidAt), l => l.amount) + sumBy(f.costs.filter(c => c.paid), c => c.amount) + labor;
  const pos = (db.pos || []).filter(p => p.projectId === j.id && p.status === 'approved');
  const committed = sumBy(pos, p => Math.max(0, num(p.amount) - poBilled(p)));
  const comms = commsOf(j).filter(c => c.status !== 'void'), commPaid = canRates() ? sumBy(comms.filter(c => c.status === 'paid'), c => c.amount) : num(f.commPaid), commOpen = canRates() ? sumBy(comms.filter(c => c.status === 'approved'), c => c.amount) : num(f.commOpen);
  const remaining = f.remainingSet ? num(f.remaining) : Math.max(0, baseCost + coCost - actual - committed);
  const projected = actual + commPaid + committed + commOpen + remaining;
  const gross = revenue - projected, pct = revenue ? gross / revenue : 0;
  const invs = projInvoices(j), sent = invs.filter(i => i.status !== 'draft');
  const billed = sumBy(sent, i => subtotal(i.items)), tax = sumBy(sent, i => taxOf(i.items)), collected = sumBy(invs, i => invPaid(i)), ar = sumBy(sent, i => invBal(i));
  const byCat = {}; for (const c of COST_CATS) byCat[c] = 0;
  lines.forEach(l => byCat[l.category || 'Other'] = num(byCat[l.category || 'Other']) + num(l.amount));
  f.costs.forEach(c => byCat[c.category || 'Other'] = num(byCat[c.category || 'Other']) + num(c.amount));
  byCat['Own labor'] += labor;
  pos.forEach(p => { byCat['__c_' + (p.category || 'Other')] = num(byCat['__c_' + (p.category || 'Other')]) + Math.max(0, num(p.amount) - poBilled(p)); });
  byCat.Commissions += commPaid; if (commOpen) byCat.__c_Commissions = num(byCat.__c_Commissions) + commOpen;
  return { base, baseCost, coPrice, coCost, revenue, revisedCost: baseCost + coCost, actual: actual + commPaid, paidOut: paidOut + commPaid, committed: committed + commOpen, remaining, remainingAuto: !f.remainingSet, projected, gross, pct, billed, tax, collected, ar, unbilled: Math.max(0, revenue - billed), byCat, invs };
}
function finStatus(j) {
  const F = finOf(j), invs = F.invs;
  if (invs.some(i => i.disputed && invBal(i) > 0.009)) return ['Disputed', 'bad'];
  if (invs.some(i => invStatus(i) === 'overdue')) return ['Overdue balance', 'bad'];
  if (!F.billed) return invs.some(i => i.kind === 'deposit') ? ['Deposit pending', 'warn'] : ['Not invoiced', ''];
  if (F.ar > 0.009) return F.billed + 0.009 < F.revenue ? ['Partially invoiced · balance due', 'warn'] : ['Invoiced · balance due', 'warn'];
  if (F.billed + 0.009 < F.revenue) return ['Partially invoiced', 'info'];
  return (j.status === 'completed' || j.ops.closed) ? ['Financially closed', 'ok'] : ['Fully invoiced & paid', 'ok'];
}
function salesStatusOf(j) {
  const e = j.estimateId && db.estimates.find(x => x.id === j.estimateId);
  if (e && e.status === 'approved') return ['Contract signed', 'ok'];
  const l = db.leads.find(x => x.customerId === j.customerId && x.division === j.division);
  return l ? [stageName(l.stage, l.division), l.stage === 'won' ? 'ok' : 'info'] : ['Direct job', ''];
}
const projAddress = j => { const c = cust(j.customerId), p = (c.properties || []).find(x => x.id === j.propertyId); return p ? [p.address, p.city, p.zip].filter(Boolean).join(', ') : [c.address, c.city, c.zip].filter(Boolean).join(', '); };
const ownerName = j => j.owner || (j.techIds && j.techIds[0] && tech(j.techIds[0]) ? tech(j.techIds[0]).name : '');

function projSummary(j) {
  projInit(j);
  const F = finOf(j), bl = blockersOf(j), fs = finStatus(j), ss = salesStatusOf(j);
  const cell = (l, v) => `<div><div class="l">${l}</div><div class="b" style="font-size:14px">${v}</div></div>`;
  return `<div class="card mb"><div class="card-b">
    <div class="row mb" style="gap:6px"><span class="pill ${ss[1]}">Sales: ${esc(ss[0])}</span><span class="pill brand">Ops: ${esc(stageLabel(j))}</span><span class="pill ${fs[1]}">Finance: ${esc(fs[0])}</span>${bl.length ? `<span class="pill bad">⛔ Blocked (${bl.length})</span>` : ''}</div>
    <div class="calc-out" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      ${cell('Address', esc(projAddress(j)) || '—')}${cell('Service', DIV[j.division] ? DIV[j.division].name : '—')}${cell('Owner', esc(ownerName(j)) || '<span class="muted">Unassigned</span>')}
      ${cell('Next action', j.nextAction ? esc(j.nextAction) : '<span class="muted">—</span>')}${cell('Due', j.nextDue ? `<span class="${parseLocal(j.nextDue) < sod(new Date()) ? 'down' : ''}">${fDate(parseLocal(j.nextDue))}</span>` : '—')}${cell('Expected install', j.expectedInstall ? fDate(parseLocal(j.expectedInstall)) : (j.start ? fDate(j.start) : '—'))}
      ${canMoney() ? cell('Balance due', `<span class="${F.ar ? 'down' : ''}">${money2(F.ar)}</span>`) + cell('Projected margin', `<span class="${F.gross < 0 ? 'down' : 'up'}">${money(F.gross)} · ${pct2(F.pct)}</span>`) : ''}
    </div>
    ${bl.length ? `<div class="mt">${bl.map(b => `<div class="list-item"><span class="pill bad">⛔</span><div style="flex:1"><div class="b small">${esc(b.reason)}</div><div class="small muted">${b.owner ? 'Owner: ' + esc(b.owner) + ' · ' : ''}${b.followUp ? 'Follow up ' + fDate(parseLocal(b.followUp)) : ''}</div></div>${b.kind === 'blocker' ? `<button class="btn sm" data-act="resolveBlocker" data-id="${j.id}" data-b="${b.id}">Resolve</button>` : `<a class="btn sm" href="#/job/${b.id}">Open</a>`}</div>`).join('')}</div>` : ''}
    ${j.ai && j.ai.summary ? `<div class="mt small" style="border-left:3px solid var(--brand);padding:4px 10px"><b>✨ ${esc(j.ai.summary.r.headline)}</b><div class="muted">${esc(j.ai.summary.r.summary)}</div><div class="muted">AI summary · reviewed by ${esc(j.ai.summary.savedBy || '')} ${fDate(j.ai.summary.savedAt)} · <a href="#" data-act="aiOpen" data-id="${j.id}">open</a></div></div>` : ''}
    <div class="row mt"><button class="btn sm" data-act="projNext" data-id="${j.id}">✎ Next action</button><button class="btn sm" data-act="addBlocker" data-id="${j.id}">⛔ Add blocker</button><button class="btn sm" data-act="addDep" data-id="${j.id}">⇢ Depends on…</button>${cloud.role !== 'sub' ? `<button class="btn sm" data-act="aiOpen" data-id="${j.id}">✨ AI</button>` : ''}<a class="btn sm" href="#/wo/${j.id}">📱 Work order</a><button class="btn sm" data-act="projPortal" data-id="${j.id}">🌐 Customer portal</button><button class="btn sm" data-act="handoverPdf" data-id="${j.id}">⇩ Handover</button></div>
  </div></div>`;
}
const PROJ_TABS = [['overview', 'Overview'], ['workflow', 'Workflow'], ['specs', 'Specs & financing'], ['financials', 'Financials'], ['billing', 'Billing'], ['history', 'History']];
function projTabs(j, tab) { return `<div class="tabs">${PROJ_TABS.filter(([k]) => canMoney() || !['financials', 'billing'].includes(k)).map(([k, v]) => `<button data-act="tab" data-t="proj" data-v="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>`; }

function projWorkflow(j) {
  const f = flowOf(j), cur = stageIdx(j);
  if (!f.length) return '<div class="card"><div class="empty">No workflow template for this service.</div></div>';
  return `<div class="card mb"><div class="card-b"><div class="steps">${f.map(([k, l], i) => `<div class="${i <= cur || j.ops.closed ? 'on' : ''}">${l}</div>`).join('')}</div></div></div>
  <div class="grid g2">${f.map(([k, l], i) => { const ts = j.ops.tasks[k] || [], done = ts.filter(t => t.done).length; return `<div class="card" style="${i === cur ? 'outline:2px solid var(--brand)' : i < cur ? 'opacity:.75' : ''}"><div class="card-h"><h3>${i + 1}. ${l}</h3><span class="small ${done === ts.length ? 'up' : 'muted'}">${done}/${ts.length}</span></div><div class="card-b">
    ${ts.map(t => `<label class="check"><input type="checkbox" data-act-input="opsTask" data-id="${j.id}" data-s="${k}" data-t="${t.id}" ${t.done ? 'checked' : ''}><span style="flex:1;${t.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(t.t)}</span><span class="small muted">${esc(t.owner || '')}</span></label>`).join('')}
    <div class="row mt"><button class="btn sm ghost" data-act="opsAddTask" data-id="${j.id}" data-s="${k}">＋ Task</button>${i === cur ? `<button class="btn sm primary" data-act="stageAdvance" data-id="${j.id}">${i === f.length - 1 ? '✓ Close project' : 'Advance to ' + esc(f[i + 1][1]) + ' →'}</button>` : ''}</div>
  </div></div>`; }).join('')}</div>
  ${j.ops.exceptions.length ? `<div class="card mt"><div class="card-h"><h3>Authorized exceptions</h3></div><div class="card-b">${j.ops.exceptions.map(x => `<div class="list-item small"><div style="flex:1"><b>${esc(x.stage)}</b> — ${esc(x.reason)}</div><span class="muted">${esc(x.by)} · ${fDate(x.ts)}</span></div>`).join('')}</div></div>` : ''}`;
}
function projSpecs(j) {
  const fields = SPEC_FIELDS[j.division] || [], s = j.specs, fz = j.financing;
  return `<div class="grid g2"><div class="card"><div class="card-h"><h3>${DIV[j.division] ? DIV[j.division].name : ''} specs</h3></div><div class="card-b form">${fields.map(([k, l, t]) => `<label class="f">${l}<input class="inp" ${t === 'number' ? 'type="number" step="any"' : ''} data-act-input="projSpec" data-id="${j.id}" data-k="${k}" value="${esc(s[k] ?? '')}"></label>`).join('') || '<div class="muted">No fields for this service.</div>'}</div></div>
  <div class="card"><div class="card-h"><h3>Financing & payer</h3></div><div class="card-b form" style="grid-template-columns:1fr">
    <label class="f">Mode<select class="inp" data-act-input="projFinancing" data-id="${j.id}" data-k="mode">${FIN_MODES.map(([k, v]) => `<option value="${k}" ${fz.mode === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="f">Who pays Nexis (financier / customer / program)<input class="inp" data-act-input="projFinancing" data-id="${j.id}" data-k="payer" value="${esc(fz.payer || '')}"></label>
    <label class="f">Documents that release each disbursement<textarea class="inp" data-act-input="projFinancing" data-id="${j.id}" data-k="release" placeholder="e.g. M1 40% at signed contract + permit · M2 50% at install photos · M3 10% at PTO">${esc(fz.release || '')}</textarea></label>
    <label class="f">Property<select class="inp" data-act-input="projProp" data-id="${j.id}"><option value="">Customer address</option>${(cust(j.customerId).properties || []).map(p => `<option value="${p.id}" ${j.propertyId === p.id ? 'selected' : ''}>${esc(p.label || p.address)}</option>`).join('')}</select></label>
    <label class="f">Expected install<input class="inp" type="date" data-act-input="projField" data-id="${j.id}" data-k="expectedInstall" value="${esc(j.expectedInstall || '')}"></label>
    <label class="f">Project owner<input class="inp" list="ownerList" data-act-input="projField" data-id="${j.id}" data-k="owner" value="${esc(j.owner || '')}"><datalist id="ownerList">${db.techs.map(t => `<option value="${esc(t.name)}">`).join('')}</datalist></label>
  </div></div></div>`;
}
function projFinancials(j) {
  const F = finOf(j), f = j.fin, row = (l, v, cls = '', hint = '') => `<tr><td>${l}${hint ? `<div class="small muted">${hint}</div>` : ''}</td><td class="right b ${cls}">${v}</td></tr>`;
  const pos = (db.pos || []).filter(p => p.projectId === j.id), lines = billLines(j);
  return `<div class="grid g-2-1"><div>
    <div class="card"><div class="card-h"><h3>Profitability</h3>${f.budget ? `<span class="small muted">Original budget locked ${fDate(f.budget.lockedAt)}</span>` : `<button class="btn sm primary" data-act="lockBudget" data-id="${j.id}">🔒 Lock original budget</button>`}</div><div class="table-wrap"><table>
      ${row('Original contract', money2(F.base))}${row('+ Approved change orders', money2(F.coPrice))}${row('Approved contract value (expected revenue)', money2(F.revenue), '', `Taxes collected for remittance shown separately: ${money2(F.tax)}`)}
      ${row('Actual cost', money2(F.actual), '', `Paid so far ${money2(F.paidOut)}`)}${row('+ Pending commitments', money2(F.committed), '', 'Approved POs / subcontracts not yet billed')}
      <tr><td>+ Remaining cost estimate <div class="small muted">${F.remainingAuto ? 'Auto: revised budget cost − actual − committed. Type a number to override.' : 'Work left with no commitment yet'}</div></td><td class="right"><input class="inp" type="number" step="any" style="width:130px;text-align:right" data-act-input="finRemaining" data-id="${j.id}" value="${Math.round(F.remaining * 100) / 100}"></td></tr>
      ${row('Projected final cost', money2(F.projected))}${row('Projected gross profit', `${money2(F.gross)} · ${pct2(F.pct)}`, F.gross < 0 ? 'down' : 'up')}
      ${row('Revised budget cost', money2(F.revisedCost), '', 'Original budget + approved change-order costs')}
    </table></div></div>
    <div class="card mt"><div class="card-h"><h3>Budget vs actual by category</h3></div><div class="table-wrap"><table><thead><tr><th>Category</th><th class="right">Budget</th><th class="right">Actual</th><th class="right">Committed</th><th class="right">Variance</th></tr></thead><tbody>
      ${COST_CATS.map(c => { const b = num((f.budget && f.budget.byCat || {})[c]), a = num(F.byCat[c]), cm = num(F.byCat['__c_' + c]); return b || a || cm ? `<tr><td>${c}</td><td class="right">${money(b)}</td><td class="right">${money(a)}</td><td class="right">${money(cm)}</td><td class="right ${b - a - cm < 0 ? 'down b' : 'up'}">${money(b - a - cm)}</td></tr>` : ''; }).join('')}
    </tbody></table></div><div class="card-b small muted">Budget split comes from the locked original budget; edit it with "Budget split".<button class="btn sm" style="margin-left:8px" data-act="budgetSplit" data-id="${j.id}">Budget split</button></div></div>
    <div class="card mt"><div class="card-h"><h3>Change orders (${f.changeOrders.length})</h3><button class="btn sm" data-act="addCO" data-id="${j.id}">＋ Change order</button></div><div class="card-b">${f.changeOrders.map(c => `<div class="list-item"><div style="flex:1"><div class="b">${esc(c.number)} · ${esc(c.desc)}</div><div class="small muted">Price ${money2(c.price)} · est. cost ${money2(c.cost)} · margin effect ${money2(num(c.price) - num(c.cost))}${c.evidence ? ' · ' + esc(c.evidence) : ''}${c.approvedBy ? ' · approved by ' + esc(c.approvedBy) : ''}</div></div><span class="pill ${c.status === 'approved' ? 'ok' : c.status === 'rejected' ? 'bad' : 'warn'}">${c.status}</span>${c.status === 'pending' && canApprove() ? `<button class="btn sm ok" data-act="coSet" data-id="${j.id}" data-c="${c.id}" data-s="approved">Approve</button><button class="btn sm" data-act="coSet" data-id="${j.id}" data-c="${c.id}" data-s="rejected">Reject</button>` : ''}</div>`).join('') || '<span class="muted small">No change orders.</span>'}</div></div>
  </div><div>
    <div class="card"><div class="card-h"><h3>Purchase orders (${pos.length})</h3><button class="btn sm" data-act="newPO" data-job="${j.id}">＋ PO</button></div><div class="card-b">${pos.map(p => `<div class="list-item"><div style="flex:1"><div class="b small">${esc(p.number)} · ${esc(p.vendor)}</div><div class="small muted">${esc(p.category)} · ${money2(p.amount)} · billed ${money2(poBilled(p))}</div></div><span class="pill ${p.status === 'approved' ? 'ok' : p.status === 'pending' ? 'warn' : ''}">${p.status}</span></div>`).join('') || '<span class="muted small">No POs.</span>'}</div></div>
    <div class="card mt"><div class="card-h"><h3>Costs</h3><div class="row"><button class="btn sm" data-act="addCost" data-id="${j.id}">＋ Cost</button>${canRates() ? `<button class="btn sm" data-act="addLabor" data-id="${j.id}">＋ Labor</button>` : ''}</div></div><div class="card-b">
      ${lines.map(l => `<div class="list-item small"><div style="flex:1">${esc(l.bill.vendor)} ${esc(l.bill.number || '')} · ${esc(l.category)}</div><b>${money2(l.amount)}</b></div>`).join('')}
      ${f.costs.map(c => `<div class="list-item small"><div style="flex:1">${esc(c.vendor || 'Direct')} · ${esc(c.category)}${c.note ? ' · ' + esc(c.note) : ''}<div class="muted">${fDate(parseLocal(c.date))} · by ${esc(c.by || '')}</div></div><b>${money2(c.amount)}</b><button class="btn ghost sm danger" data-act="delCost" data-id="${j.id}" data-c="${c.id}">✕</button></div>`).join('')}
      ${canRates() ? f.labor.map(l => `<div class="list-item small"><div style="flex:1">Labor · ${esc((tech(l.techId) || {}).name || l.who || '')} · ${l.hours}h × ${money2(laborRateOf(j, l))}</div><b>${money2(num(l.hours) * laborRateOf(j, l))}</b></div>`).join('') : (f.labor.length ? `<div class="small muted">Labor: ${f.labor.reduce((s, l) => s + num(l.hours), 0)}h logged (rates restricted)</div>` : '')}
      ${!lines.length && !f.costs.length && !f.labor.length ? '<span class="muted small">No costs yet. Vendor bills from Purchasing land here automatically.</span>' : ''}
    </div></div>
    ${(() => { const o = overheadOf(j, F); return `<div class="card mt"><div class="card-h"><h3>After overhead</h3></div><div class="card-b"><div class="calc-out"><div><div class="l">Allocated overhead</div><div class="b">${money2(o.amount)}</div></div><div><div class="l">Result after overhead</div><div class="b ${o.after < 0 ? 'down' : 'up'}">${money2(o.after)}</div></div></div><p class="small muted">Rule: ${esc(o.rule)}. Change it in Settings → Overhead allocation rule.</p></div></div>`; })()}
    ${canRates() ? `<div class="card mt"><div class="card-h"><h3>Commissions</h3><button class="btn sm" data-act="commSim" data-id="${j.id}">Simulate / approve</button></div><div class="card-b">${commsOf(j).map(c => `<div class="list-item small"><div style="flex:1">${esc(c.rep)} · ${esc(c.ruleName)}<div class="muted">${esc(c.trace || '')}</div></div><b>${money2(c.amount)}</b><span class="pill ${c.status === 'paid' ? 'ok' : c.status === 'void' ? '' : 'info'}">${c.status}</span></div>`).join('') || '<span class="muted small">No commission yet. Simulate it before approving.</span>'}</div></div>` : ''}
  </div></div>`;
}
function projBilling(j) {
  const F = finOf(j), fs = finStatus(j);
  return `<div class="grid g4 mb">${kpi('Contract value', money2(F.revenue))}${kpi('Invoiced', money2(F.billed), `Unbilled ${money2(F.unbilled)}`)}${kpi('Collected', money2(F.collected))}${kpi('Balance due', money2(F.ar), `<span class="pill ${fs[1]}">${esc(fs[0])}</span>`)}</div>
  <div class="card"><div class="card-h"><h3>Invoices & disbursements</h3><button class="btn sm ok" data-act="invoiceJob" data-id="${j.id}">$ Invoice</button></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Type</th><th>Issued</th><th>Due</th><th class="right">Amount</th><th class="right">Paid</th><th class="right">Balance</th><th>Status</th><th></th></tr></thead><tbody>
  ${F.invs.map(i => `<tr class="click" data-go="#/invoice/${i.id}"><td class="b">${i.number}</td><td>${i.kind === 'deposit' ? 'Deposit' : i.milestone ? esc(i.milestone) : 'Invoice'}${i.payer ? `<div class="small muted">Payer: ${esc(i.payer)}</div>` : ''}</td><td>${fDate(i.createdAt)}</td><td>${fDate(parseLocal(i.due))}</td><td class="right">${money2(invTotal(i))}</td><td class="right">${money2(invPaid(i))}</td><td class="right b">${money2(invBal(i))}</td><td>${pill(INV_ST, invStatus(i))}${i.disputed ? ' <span class="pill bad">Disputed</span>' : ''}</td><td><button class="btn sm ghost" data-act="toggleDispute" data-inv="${i.id}">${i.disputed ? 'Clear dispute' : 'Dispute'}</button></td></tr>`).join('') || '<tr><td colspan="9" class="empty">No invoices yet.</td></tr>'}
  </tbody></table></div></div>`;
}
function projHistory(j) {
  return `<div class="card"><div class="card-h"><h3>Change log</h3></div><div class="card-b"><div class="timeline">${(j.history || []).map(h => `<div class="ev"><div>${esc(h.text)}</div><div class="small muted">${esc(h.by || '')} · ${new Date(h.ts).toLocaleString('en-US')}</div></div>`).join('') || '<div class="muted">No changes recorded yet.</div>'}</div></div></div><div id="srvAudit"></div>`;
}

/* ───────────── MY WORK ───────────── */
ROUTES.mywork = () => {
  const today = ymd(new Date()), myName = (db.techs.find(t => (t.email || '').toLowerCase() === me().toLowerCase()) || {}).name;
  const mine = t => !myName || !t.assignee || (tech(t.assignee) || {}).name === myName;
  const tasks = (db.tasks || []).filter(t => !t.done && t.due <= today && mine(t)).sort((a, b) => a.due.localeCompare(b.due));
  const soon = addDays(new Date(), 7);
  const installs = db.jobs.filter(j => j.status !== 'cancelled' && j.status !== 'completed' && ((j.start && new Date(j.start) <= soon && new Date(j.start) >= sod(new Date())) || (j.expectedInstall && parseLocal(j.expectedInstall) <= soon && parseLocal(j.expectedInstall) >= sod(new Date())))).sort((a, b) => String(a.start || a.expectedInstall).localeCompare(String(b.start || b.expectedInstall)));
  const blocked = db.jobs.filter(j => j.status !== 'cancelled' && !(j.ops && j.ops.closed)).map(j => ({ j, b: blockersOf(j) })).filter(x => x.b.length);
  const due = db.jobs.filter(j => j.nextDue && j.nextDue <= today && j.status !== 'cancelled');
  const card = (title, body, n) => `<div class="card"><div class="card-h"><h3>${title} <span class="muted small">${n}</span></h3></div><div class="card-b">${body || '<div class="muted small">Nothing here ✓</div>'}</div></div>`;
  const jl = j => `<div class="list-item click" data-go="#/job/${j.id}" style="cursor:pointer"><div style="flex:1;min-width:0"><div class="b">${j.number} · ${esc(j.title)}</div><div class="small muted">${esc(cust(j.customerId).name)} · ${esc(stageLabel(projInit(j)))}</div></div>${divPill(j.division)}</div>`;
  return head('My Work', `${tasks.length} tasks due · ${blocked.length} blocked projects · ${installs.length} installs in the next 7 days`, `<a class="btn" href="#/tasks">All tasks</a>`) + `<div class="grid g2">
    ${card('Tasks due today & overdue', tasks.slice(0, 12).map(t => `<div class="list-item"><span class="pill ${t.due < today ? 'bad' : 'warn'}">${t.due < today ? 'Overdue' : 'Today'}</span><div style="flex:1"><a href="#/tasks">${esc(t.title)}</a></div></div>`).join(''), tasks.length)}
    ${card('Next actions due', due.map(j => `<div class="list-item click" data-go="#/job/${j.id}" style="cursor:pointer"><div style="flex:1"><div class="b small">${j.number} · ${esc(j.nextAction || '')}</div><div class="small muted">${esc(cust(j.customerId).name)}</div></div><span class="small down">${fDate(parseLocal(j.nextDue))}</span></div>`).join(''), due.length)}
    ${card('Upcoming installs (7 days)', installs.map(jl).join(''), installs.length)}
    ${card('Blocked projects', blocked.map(({ j, b }) => `<div class="list-item click" data-go="#/job/${j.id}" style="cursor:pointer"><span class="pill bad">⛔</span><div style="flex:1;min-width:0"><div class="b small">${j.number} · ${esc(j.title)}</div><div class="small muted">${esc(b[0].reason)}${b.length > 1 ? ` (+${b.length - 1})` : ''}</div></div></div>`).join(''), blocked.length)}
  </div>`;
};

/* ───────────── PURCHASING: POs & vendor bills ───────────── */
const projOptions = () => db.jobs.filter(j => j.status !== 'cancelled').map(j => [j.id, `${j.number} · ${j.title} (${cust(j.customerId).name})`]);
ROUTES.purchasing = () => {
  const tab = state.tabs.purch || 'pos', pos = db.pos || [], bills = db.bills || [];
  const unassigned = bills.flatMap(b => (b.lines || []).filter(l => !l.projectId).map(l => ({ ...l, bill: b })));
  return head('Purchasing & Vendor Bills', 'Commitments (POs / subcontracts) and vendor bills split across projects', `<button class="btn" data-act="newPO">＋ PO</button><button class="btn primary" data-act="newBill">＋ Vendor bill</button>`) +
  `<div class="tabs">${[['pos', `Purchase orders (${pos.length})`], ['bills', `Vendor bills (${bills.length})`], ['unassigned', `Costs without project (${unassigned.length})`]].map(([k, v]) => `<button data-act="tab" data-t="purch" data-v="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>` +
  (tab === 'pos' ? `<div class="card"><div class="table-wrap"><table><thead><tr><th>#</th><th>Vendor</th><th>Project</th><th>Category</th><th class="right">Amount</th><th class="right">Billed</th><th class="right">Open</th><th>Status</th><th></th></tr></thead><tbody>${pos.map(p => { const j = db.jobs.find(x => x.id === p.projectId); return `<tr><td class="b">${esc(p.number)}</td><td>${esc(p.vendor)}<div class="small muted">${esc(p.desc || '')}</div><div class="small">${p.receivedAt ? `<span class="up">✓ Received ${fDate(p.receivedAt)}</span>` : p.expected ? `<span class="${p.expected < ymd(new Date()) && p.status === 'approved' ? 'down b' : 'muted'}">Expected ${fDate(parseLocal(p.expected))}</span>` : ''}${!p.receivedAt && p.status === 'approved' ? ` <button class="btn sm ghost" data-act="poRecv" data-id="${p.id}">Mark received</button>` : ''}</div></td><td>${j ? `<a href="#/job/${j.id}">${j.number}</a>` : '—'}</td><td>${esc(p.category)}</td><td class="right">${money2(p.amount)}</td><td class="right">${money2(poBilled(p))}</td><td class="right b">${money2(Math.max(0, num(p.amount) - poBilled(p)))}</td><td><span class="pill ${p.status === 'approved' ? 'ok' : p.status === 'pending' ? 'warn' : ''}">${p.status}</span>${p.approvedBy ? `<div class="small muted">${esc(p.approvedBy)}</div>` : ''}</td><td class="right">${p.status === 'pending' && canApprove() ? `<button class="btn sm ok" data-act="poSet" data-id="${p.id}" data-s="approved">Approve</button>` : ''}${p.status !== 'cancelled' ? `<button class="btn sm ghost" data-act="poSet" data-id="${p.id}" data-s="cancelled">Cancel</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="9" class="empty">No purchase orders.</td></tr>'}</tbody></table></div></div>`
  : tab === 'bills' ? `<div class="card"><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Bill #</th><th>Date</th><th>Split</th><th class="right">Total</th><th>Paid</th><th></th></tr></thead><tbody>${bills.map(b => `<tr><td class="b">${esc(b.vendor)}</td><td>${esc(b.number || '')}${b.attachment ? `<div class="small"><a href="${esc(b.attachment)}" target="_blank" rel="noopener">receipt ↗</a></div>` : ''}</td><td>${fDate(parseLocal(b.date))}</td><td class="small">${(b.lines || []).map(l => { const j = db.jobs.find(x => x.id === l.projectId); return `${j ? j.number : '<span class="down">No project</span>'} · ${esc(l.category)} · ${money2(l.amount)}`; }).join('<br>')}</td><td class="right b">${money2(sumBy(b.lines, l => l.amount))}</td><td>${b.paidAt ? `<span class="pill ok">Paid ${fDate(b.paidAt)}</span>` : `<button class="btn sm" data-act="billPaid" data-id="${b.id}">Mark paid</button>`}</td><td><button class="btn ghost sm danger" data-act="delBill" data-id="${b.id}">✕</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty">No vendor bills.</td></tr>'}</tbody></table></div></div>`
  : `<div class="card"><div class="card-b">${unassigned.map(l => `<div class="list-item"><span class="pill warn">Exception</span><div style="flex:1">${esc(l.bill.vendor)} ${esc(l.bill.number || '')} · ${esc(l.category)}</div><b>${money2(l.amount)}</b><button class="btn sm" data-act="editBill" data-id="${l.bill.id}">Assign</button></div>`).join('') || '<div class="empty">Every cost is assigned to a project ✓</div>'}</div></div>`);
};
function poModal(projectId) {
  form({ title: 'New purchase order / subcontract', fields: [{ k: 'projectId', label: 'Project', type: 'select', options: projOptions(), value: projectId, full: true }, { k: 'vendor', label: 'Vendor / subcontractor', required: true }, { k: 'category', label: 'Category', type: 'select', options: COST_CATS, value: 'Materials' }, { k: 'amount', label: 'Amount ($)', type: 'number', step: '0.01', required: true }, { k: 'expected', label: 'Expected delivery / start', type: 'date' }, { k: 'desc', label: 'Description', full: true }],
    saveLabel: canApprove() ? 'Create & approve' : 'Submit for approval',
    onSave(v) {
      const j = db.jobs.find(x => x.id === v.projectId); if (!j) { toast('Pick a project'); return false; }
      const F = finOf(j), after = F.gross - num(v.amount);
      const po = { id: uid(), number: 'PO-' + (1000 + (db.pos || []).length + 1), ...v, amount: num(v.amount), status: canApprove() ? 'approved' : 'pending', date: ymd(new Date()), createdBy: me(), approvedBy: canApprove() ? me() : '' };
      (db.pos = db.pos || []).unshift(po); projInit(j); hist(j, `${po.number} ${po.status} — ${po.vendor} ${money2(po.amount)} (${po.category})`);
      if (po.status === 'pending') db.tasks.unshift({ id: uid(), title: `Approve ${po.number}: ${po.vendor} ${money2(po.amount)} on ${j.number} (margin if added as new cost: ${money(after)})`, due: ymd(new Date()), done: false, assignee: '', customerId: j.customerId, link: { kind: 'job', id: j.id }, wf: 'Approvals', createdAt: iso(new Date()) });
      toast(`${po.number} ${po.status === 'approved' ? 'approved' : 'sent for approval'}`);
    } });
}
function billModal(bill) {
  const isNew = !bill, d = JSON.parse(JSON.stringify(bill || { vendor: '', number: '', date: ymd(new Date()), attachment: '', lines: [{ projectId: '', category: 'Materials', amount: 0, poId: '' }] }));
  const pOpts = [['', '— No project (exception) —'], ...projOptions()];
  const draw = () => { $('#billEd').innerHTML = `<div class="form"><label class="f">Vendor<input class="inp" data-b="vendor" value="${esc(d.vendor)}"></label><label class="f">Bill #<input class="inp" data-b="number" value="${esc(d.number)}"></label><label class="f">Date<input class="inp" type="date" data-b="date" value="${esc(d.date)}"></label><label class="f">Receipt link (optional)<input class="inp" data-b="attachment" value="${esc(d.attachment || '')}" placeholder="https://…"></label></div>
    <h4 style="margin:16px 0 6px">Split across projects <span class="small muted" style="font-weight:400">(negative amount = credit / return)</span></h4>
    ${d.lines.map((l, i) => `<div class="row mb" style="align-items:flex-end;flex-wrap:wrap"><label class="f" style="flex:2;min-width:200px">Project<select class="inp" data-l="${i}" data-f="projectId">${pOpts.map(([v, t]) => `<option value="${v}" ${l.projectId === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label><label class="f" style="flex:1;min-width:130px">Category<select class="inp" data-l="${i}" data-f="category">${COST_CATS.map(c => `<option ${l.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label class="f" style="width:120px">Amount<input class="inp" type="number" step="0.01" data-l="${i}" data-f="amount" value="${num(l.amount)}"></label><label class="f" style="flex:1;min-width:140px">Against PO<select class="inp" data-l="${i}" data-f="poId"><option value="">—</option>${(db.pos || []).filter(p => p.status === 'approved' && (!l.projectId || p.projectId === l.projectId)).map(p => `<option value="${p.id}" ${l.poId === p.id ? 'selected' : ''}>${esc(p.number)} · ${esc(p.vendor)} (open ${money(Math.max(0, num(p.amount) - poBilled(p)))})</option>`).join('')}</select></label><button class="btn ghost sm danger" data-rm="${i}">✕</button></div>`).join('')}
    <div class="row"><button class="btn sm" id="addLine">＋ Line</button><span class="b" style="margin-left:auto">Total ${money2(sumBy(d.lines, l => l.amount))}</span></div>`; };
  modal({ title: isNew ? 'New vendor bill' : 'Edit vendor bill', wide: true, body: '<div id="billEd"></div>', foot: '<button class="btn" data-dismiss>Cancel</button><button class="btn primary" id="billSave">Save bill</button>', onMount(bg, close) {
    bg.addEventListener('input', e => { const el = e.target; if (el.dataset.b) d[el.dataset.b] = el.value; if (el.dataset.l !== undefined && el.tagName === 'INPUT') d.lines[+el.dataset.l][el.dataset.f] = num(el.value); });
    bg.addEventListener('change', e => { const el = e.target; if (el.dataset.l !== undefined && el.tagName === 'SELECT') { d.lines[+el.dataset.l][el.dataset.f] = el.value; if (el.dataset.f === 'projectId') { d.lines[+el.dataset.l].poId = ''; draw(); } else if (el.dataset.f === 'poId' && el.value) { const p = db.pos.find(x => x.id === el.value); d.lines[+el.dataset.l].category = p.category; d.lines[+el.dataset.l].projectId = p.projectId; if (!num(d.lines[+el.dataset.l].amount)) d.lines[+el.dataset.l].amount = Math.max(0, num(p.amount) - poBilled(p)); if (!d.vendor) d.vendor = p.vendor; draw(); } } });
    bg.addEventListener('click', e => { if (e.target.closest('#addLine')) { d.lines.push({ projectId: '', category: 'Materials', amount: 0, poId: '' }); draw(); } const rm = e.target.closest('[data-rm]'); if (rm) { d.lines.splice(+rm.dataset.rm, 1); draw(); } });
    $('#billSave', bg).onclick = () => {
      if (!d.vendor.trim() || !d.lines.length) { toast('Vendor and at least one line are required'); return; }
      const dup = (db.bills || []).find(b => b.id !== d.id && b.vendor.trim().toLowerCase() === d.vendor.trim().toLowerCase() && d.number && b.number === d.number);
      if (dup) { toast(`Possible duplicate: ${dup.vendor} bill ${dup.number} already exists`); return; }
      d.lines.forEach(l => { l.id = l.id || uid(); l.amount = num(l.amount); });
      if (isNew) { d.id = uid(); d.createdBy = me(); d.createdAt = iso(new Date()); (db.bills = db.bills || []).unshift(d); } else Object.assign(bill, d);
      new Set(d.lines.map(l => l.projectId).filter(Boolean)).forEach(pid => { const j = db.jobs.find(x => x.id === pid); if (j) { projInit(j); hist(j, `Vendor bill ${d.vendor} ${d.number || ''}: ${money2(sumBy(d.lines.filter(l => l.projectId === pid), l => l.amount))}`); } });
      close(); save(); render(); toast('Vendor bill saved');
    };
    draw();
  } });
}

/* ───────────── FINANCE DASHBOARD ───────────── */
ROUTES.finance = () => {
  const projects = db.jobs.filter(divOK).filter(j => j.status !== 'cancelled').map(j => ({ j, F: finOf(j), fs: finStatus(j) }));
  const tot = k => sumBy(projects, x => x.F[k]);
  const losses = projects.filter(x => x.F.gross < 0), doneUnbilled = projects.filter(x => (x.j.status === 'completed' || (x.j.ops && x.j.ops.closed)) && x.F.unbilled > 0.009);
  const pays = allPayments(), wk = d => { const s = weekStart(d); return ymd(s); };
  const weeks = {}; for (let i = -4; i <= 4; i++) weeks[ymd(addDays(weekStart(new Date()), i * 7))] = { in: 0, out: 0 };
  pays.forEach(p => { const k = wk(p.date); if (weeks[k]) weeks[k].in += num(p.amount); });
  (db.bills || []).filter(b => b.paidAt).forEach(b => { const k = wk(b.paidAt); if (weeks[k]) weeks[k].out += sumBy(b.lines, l => l.amount); });
  db.invoices.filter(i => !['void', 'draft'].includes(i.status) && invBal(i) > 0).forEach(i => { const k = wk(parseLocal(i.due)); if (weeks[k] && parseLocal(i.due) >= sod(new Date())) weeks[k].expected = num(weeks[k].expected) + invBal(i); });
  return head('Finance', 'Project profitability, receivables and cash. Open projects are provisional.') + `
  <div class="grid g4 mb">${kpi('Contract value (open + closed)', kmoney(tot('revenue')))}${kpi('Projected gross profit', kmoney(tot('gross')), pct(tot('gross') / Math.max(1, tot('revenue'))))}${kpi('Balance due (A/R)', kmoney(tot('ar')))}${kpi('Pending commitments', kmoney(tot('committed')))}</div>
  <div class="grid g2 mb">
    <div class="card"><div class="card-h"><h3>Needs attention</h3></div><div class="card-b">${[...losses.map(x => `<div class="list-item click" data-go="#/job/${x.j.id}" style="cursor:pointer"><span class="pill bad">Loss</span><div style="flex:1">${x.j.number} · ${esc(x.j.title)}</div><b class="down">${money(x.F.gross)}</b></div>`), ...doneUnbilled.map(x => `<div class="list-item click" data-go="#/job/${x.j.id}" style="cursor:pointer"><span class="pill warn">Done, not invoiced</span><div style="flex:1">${x.j.number} · ${esc(x.j.title)}</div><b>${money(x.F.unbilled)}</b></div>`)].join('') || '<div class="muted small">Nothing urgent ✓</div>'}</div></div>
    <div class="card"><div class="card-h"><h3>Cash by week</h3></div><div class="table-wrap"><table><thead><tr><th>Week of</th><th class="right">Collected</th><th class="right">Paid out</th><th class="right">Net</th><th class="right">Expected in</th></tr></thead><tbody>${Object.entries(weeks).map(([k, v]) => `<tr${k === ymd(weekStart(new Date())) ? ' style="font-weight:700"' : ''}><td>${fDate(parseLocal(k))}</td><td class="right">${money(v.in)}</td><td class="right">${money(v.out)}</td><td class="right ${v.in - v.out < 0 ? 'down' : ''}">${money(v.in - v.out)}</td><td class="right muted">${v.expected ? money(v.expected) : ''}</td></tr>`).join('')}</tbody></table></div></div>
  </div>
  <div class="card"><div class="card-h"><h3>Projects</h3></div><div class="table-wrap"><table><thead><tr><th>Project</th><th>Ops</th><th>Finance</th><th class="right">Contract</th><th class="right">Projected cost</th><th class="right">Gross</th><th class="right">Invoiced</th><th class="right">Collected</th><th class="right">Balance</th></tr></thead><tbody>
  ${projects.map(({ j, F, fs }) => `<tr class="click" data-go="#/job/${j.id}"><td><div class="b">${j.number} · ${esc(j.title)}</div><div class="small muted">${esc(cust(j.customerId).name)} · ${DIV[j.division] ? DIV[j.division].name : ''}</div></td><td class="small">${esc(stageLabel(j))}</td><td><span class="pill ${fs[1]}">${esc(fs[0])}</span></td><td class="right">${money(F.revenue)}</td><td class="right">${money(F.projected)}</td><td class="right b ${F.gross < 0 ? 'down' : 'up'}">${money(F.gross)}<div class="small">${pct2(F.pct)}</div></td><td class="right">${money(F.billed)}</td><td class="right">${money(F.collected)}</td><td class="right b">${money(F.ar)}</td></tr>`).join('')}
  </tbody></table></div></div>`;
};

/* ───────────── DUPLICATES & MERGE ───────────── */
function duplicateGroups() {
  const norm = { phone: c => String(c.phone || '').replace(/\D/g, '').slice(-10), email: c => String(c.email || '').trim().toLowerCase(), address: c => String(c.address || '').toLowerCase().replace(/[^a-z0-9]/g, '') + '|' + String(c.zip || ''), source: c => c.ghlId || '' };
  const seen = new Map(), groups = [];
  for (const [k, f] of Object.entries(norm)) {
    const m = new Map(); db.customers.forEach(c => { const v = f(c); if (v && v.length > 4 && v !== '|') (m.get(v) || m.set(v, []).get(v)).push(c); });
    m.forEach((list, v) => { if (list.length > 1) { const key = list.map(c => c.id).sort().join(','); if (!seen.has(key)) { seen.set(key, 1); groups.push({ by: k, list }); } } });
  }
  return groups;
}
ROUTES.duplicates = () => {
  const g = duplicateGroups();
  return head('Possible duplicates', 'Matched by phone, email, address or source ID. Merging keeps all history, projects and documents.') + `<div class="grid g2">${g.map(({ by, list }) => `<div class="card"><div class="card-h"><h3>Same ${by}</h3><span class="small muted">${list.length} records</span></div><div class="card-b">${list.map(c => `<div class="list-item"><div style="flex:1"><a href="#/customer/${c.id}" class="b">${esc(c.name)}</a><div class="small muted">${esc(c.phone)} · ${esc(c.email)} · ${esc(c.address)} · since ${fDate(c.createdAt)}</div></div><button class="btn sm" data-act="mergeKeep" data-keep="${c.id}" data-all="${list.map(x => x.id).join(',')}">Keep this one</button></div>`).join('')}</div></div>`).join('') || '<div class="card"><div class="empty">No duplicates found ✓</div></div>'}</div>`;
};
function mergeCustomers(keepId, ids) {
  const keep = db.customers.find(c => c.id === keepId); if (!keep) return;
  for (const id of ids) { if (id === keepId) continue; const o = db.customers.find(c => c.id === id); if (!o) continue;
    for (const coll of ['leads', 'estimates', 'jobs', 'invoices', 'plans', 'tasks']) (db[coll] || []).forEach(r => { if (r.customerId === id) r.customerId = keepId; });
    for (const k of ['phone', 'email', 'address', 'city', 'zip', 'ghlId']) if (!keep[k] && o[k]) keep[k] = o[k];
    keep.equipment = [...(keep.equipment || []), ...(o.equipment || [])]; keep.properties = [...(keep.properties || []), ...(o.properties || [])];
    keep.tags = [...new Set([...(keep.tags || []), ...(o.tags || [])])];
    keep.notes = [keep.notes, o.notes ? `— merged from ${o.name} (${fDate(o.createdAt)}) —\n${o.notes}` : ''].filter(Boolean).join('\n');
    (keep.mergedFrom = keep.mergedFrom || []).push({ id: o.id, name: o.name, phone: o.phone, email: o.email, at: iso(new Date()), by: me() });
    db.customers = db.customers.filter(c => c.id !== id);
    log(`Merged customer ${o.name} into ${keep.name}`);
  }
}

ROUTES.job = id => {
  const j = db.jobs.find(x => x.id === id); if (!j) return '<div class="empty">Project not found</div>';
  projInit(j);
  let tab = state.tabs.proj || 'overview'; if (!canMoney() && ['financials', 'billing'].includes(tab)) tab = 'overview';
  if (tab === 'overview') { const html = jobOverview(id); const cut = html.indexOf('<div class="card mb"><div class="card-b"><div class="steps">'); return cut > 0 ? html.slice(0, cut) + projSummary(j) + projTabs(j, tab) + html.slice(cut) : html; }
  return `<div class="small muted mb"><a href="#/jobs">Projects</a> / ${j.number}</div>` + head(`${j.number} · ${esc(j.title)}`, `${custLink(j.customerId)} · ${divPill(j.division)}`, pill(JOB_ST, j.status)) + projSummary(j) + projTabs(j, tab) +
    ({ workflow: projWorkflow, specs: projSpecs, financials: projFinancials, billing: projBilling, history: projHistory }[tab] || projWorkflow)(j);
};

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
      } else { if (j.start && start && j.start !== start) { projInit(j); hist(j, `Rescheduled from ${fDay(j.start)} ${fTime(j.start)} to ${fDay(start)} ${fTime(start)}`); j.reschedules = (j.reschedules || 0) + 1; } Object.assign(j, data); if (!start) j.status = 'unscheduled'; else if (j.status === 'unscheduled') j.status = 'scheduled'; }
    },
  });
}
ROUTES.jobs = () => {
  const f = state.filters.job || 'open';
  const all = db.jobs.filter(divOK);
  const list = all.filter(j => f === 'all' ? true : f === 'open' ? !['completed', 'cancelled'].includes(j.status) : j.status === f).sort((a, b) => (a.start ? new Date(a.start) : 9e15) - (b.start ? new Date(b.start) : 9e15));
  return head('Projects', `${all.filter(j => !['completed', 'cancelled'].includes(j.status)).length} open projects`, `<button class="btn" data-act="exportCsv" data-what="jobs">⇩ CSV</button><button class="btn primary" data-act="newJob">＋ Job</button>`) + `
  <div class="card"><div class="toolbar">${[['open', 'Open'], ['all', 'All'], ...Object.entries(JOB_ST).map(([k, v]) => [k, v[0]])].map(([k, v]) => `<button class="btn sm ${f === k ? 'primary' : ''}" data-act="filt" data-f="job" data-v="${k}">${v} <span class="muted">${k === 'all' ? all.length : k === 'open' ? all.filter(j => !['completed', 'cancelled'].includes(j.status)).length : all.filter(j => j.status === k).length}</span></button>`).join('')}</div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Job</th><th>Customer</th><th>Scheduled</th><th>Crew</th><th>Progress</th><th class="right">Amount</th><th>Status</th></tr></thead><tbody>
  ${list.map(j => { const done = j.checklist.filter(c => c.done).length; return `<tr class="click" data-go="#/job/${j.id}"><td class="b">${j.number}</td><td><div class="b">${esc(j.title)}</div>${divPill(j.division)}</td><td>${custLink(j.customerId)}<div class="small muted">${esc(cust(j.customerId).city || '')}</div></td><td>${j.start ? fDay(j.start) + '<div class="small muted">' + fTime(j.start) + ' · ' + j.duration + 'h</div>' : '<span class="muted">—</span>'}</td><td><div class="row">${j.techIds.map(t => avatar(tech(t))).join('') || '<span class="muted small">Unassigned</span>'}</div></td><td style="min-width:110px"><div class="progress"><div style="width:${j.checklist.length ? done / j.checklist.length * 100 : 0}%"></div></div><div class="small muted">${done}/${j.checklist.length}</div></td><td class="right">${money(totalOf(j.items))}</td><td>${pill(JOB_ST, j.status)}</td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">No jobs</td></tr>'}
  </tbody></table></div></div>`;
};
function jobOverview(id) {
  const j = db.jobs.find(x => x.id === id); if (!j) return '<div class="empty">Project not found</div>';
  const c = cust(j.customerId), idx = JOB_FLOW.indexOf(j.status), next = JOB_FLOW[idx + 1];
  const nextLabel = { scheduled: 'Schedule', enroute: '🚚 On the way', inprogress: '▶ Start job', completed: '✓ Complete' }[next];
  const inv = j.invoiceId && db.invoices.find(i => i.id === j.invoiceId);
  const permits = db.permits.filter(p => p.jobId === j.id);
  const done = j.checklist.filter(x => x.done).length;
  return `<div class="small muted mb"><a href="#/jobs">Projects</a> / ${j.number}</div>` + head(`${j.number} · ${esc(j.title)}`, `${custLink(j.customerId)} · ${divPill(j.division)} · ${j.start ? fDay(j.start) + ' ' + fTime(j.start) + '–' + fTime(jobEnd(j)) : 'Unscheduled'}`,
    `${pill(JOB_ST, j.status)}<button class="btn" data-act="editJob" data-id="${j.id}">Edit</button>${next && j.status !== 'cancelled' ? (next === 'scheduled' ? `<button class="btn primary" data-act="editJob" data-id="${j.id}">Schedule</button>` : `<button class="btn primary" data-act="jobStatus" data-id="${j.id}" data-s="${next}">${nextLabel}</button>`) : ''}${inv ? `<a class="btn" href="#/invoice/${inv.id}">Invoice ${inv.number}</a>` : `<button class="btn ok" data-act="invoiceJob" data-id="${j.id}">$ Invoice</button>`}`) + `
  <div class="card mb"><div class="card-b"><div class="steps">${JOB_FLOW.map((s, i) => `<div class="${i <= idx ? 'on' : ''}">${JOB_ST[s][0]}</div>`).join('')}</div></div></div>
  <div class="grid g-2-1">
    <div>
      <div class="card"><div class="card-h"><h3>Job line items</h3>${j.estimateId ? `<a class="small" href="#/estimate/${j.estimateId}">From estimate →</a>` : ''}</div><div class="card-b">${itemsTable(j.items, !inv, `job:${j.id}`)}</div></div>
      <div class="card mt"><div class="card-h"><h3>Checklist ${DIV[j.division].name} (${done}/${j.checklist.length})</h3><button class="btn sm" data-act="addCheck" data-id="${j.id}">＋ Task</button></div><div class="card-b"><div class="progress mb"><div style="width:${j.checklist.length ? done / j.checklist.length * 100 : 0}%"></div></div>${j.checklist.map(x => `<label class="check"><input type="checkbox" data-act-input="check" data-id="${j.id}" data-c="${x.id}" ${x.done ? 'checked' : ''}><span style="${x.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(x.t)}</span></label>`).join('')}</div></div>
      ${(() => { const st = photoStatus(j); return st.total ? `<div class="card mt"><div class="card-h"><h3>📷 Required photos (${st.done}/${st.total})</h3><div class="row"><button class="btn sm" data-act="photoPdf" data-id="${j.id}">⇩ PDF</button><a class="btn sm primary" href="#/photos/${j.id}">Open photo checklist</a></div></div><div class="card-b">${photoProgress(st)}<div class="small mt ${st.missing.length ? 'down' : 'up'}">${st.missing.length ? `${st.missing.length} required photo${st.missing.length > 1 ? 's' : ''} missing: ${st.missing.slice(0, 3).map(r => esc(r.label)).join(' · ')}${st.missing.length > 3 ? '…' : ''}` : '✓ All required photos taken'}</div></div></div>` : ''; })()}
      <div class="card mt"><div class="card-h"><h3>Other photos (${j.photos.length})</h3><label class="btn sm">＋ Upload photos<input type="file" accept="image/*" multiple hidden data-act-input="photos" data-id="${j.id}"></label></div><div class="card-b"><div class="row">${j.photos.map((p, i) => `<div style="position:relative"><img src="${p}" alt="Photo ${i + 1}" style="width:120px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><button class="btn sm" style="position:absolute;top:4px;right:4px;padding:1px 6px" data-act="delPhoto" data-id="${j.id}" data-i="${i}">✕</button></div>`).join('') || '<span class="muted small">Upload before/after photos, damage, equipment and nameplates.</span>'}</div></div></div>
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
  form({ title: isNew ? 'New technician' : 'Edit technician', fields: [{ k: 'name', label: 'Name', value: t.name, required: true }, { k: 'role', label: 'Role', value: t.role }, { k: 'division', label: 'Division', type: 'select', options: divOptions(), value: t.division }, { k: 'phone', label: 'Phone', value: t.phone }, { k: 'email', label: 'Login email (links them to their work orders)', type: 'email', value: t.email }, { k: 'color', label: 'Schedule color', type: 'color', value: t.color }, ...(canRates() ? [{ k: 'rate', label: 'Loaded hourly cost ($/h · private)', type: 'number', step: '0.01', value: (db.settings.techRates || {})[t.id] ?? '' }] : [])],
    extraFoot: isNew ? '' : '<button class="btn danger" id="tDel" style="margin-right:auto">Delete</button>',
    onSave(v) { const rate = v.rate; delete v.rate; v.email = String(v.email || '').trim().toLowerCase(); let id = t.id; if (isNew) { id = uid(); db.techs.push({ id, ...v }); } else Object.assign(t, v); if (canRates() && rate !== undefined && rate !== '' && num(rate) > 0) { db.settings.techRates = { ...(db.settings.techRates || {}), [id]: num(rate) }; } } });
  if (!isNew) $('#tDel').onclick = () => { $('.modal-bg:last-child').remove(); confirmDlg('Delete this technician? Their jobs will become unassigned.', () => { db.techs = db.techs.filter(x => x.id !== t.id); db.jobs.forEach(j => j.techIds = j.techIds.filter(x => x !== t.id)); }); };
}

/* ───────────── CONFIGURACIÓN ───────────── */
const canAdmin = () => !cloud.on || ['owner', 'admin'].includes(cloud.role);
const AUDIT_COLL = { jobs: 'Project', invoices: 'Invoice', pos: 'Purchase order', bills: 'Vendor bill', estimates: 'Estimate', comp: 'Rates & commissions', settings: 'Settings', tickets: 'Ticket' };
const auditHref = a => ({ jobs: '#/job/', invoices: '#/invoice/', estimates: '#/estimate/', tickets: '#/ticket/', comp: '#/job/' }[a.coll] ? { jobs: '#/job/', invoices: '#/invoice/', estimates: '#/estimate/', tickets: '#/ticket/', comp: '#/job/' }[a.coll] + a.record_id : a.coll === 'pos' || a.coll === 'bills' ? '#/purchasing' : '#/settings');
const auditRow = a => `<tr><td class="small">${new Date(a.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td class="small">${esc(a.email || 'system')}<div class="muted">${esc(ROLE_LABEL[a.role] || a.role || 'automation')}</div></td><td class="small"><a href="${auditHref(a)}">${esc(AUDIT_COLL[a.coll] || a.coll)} ${esc(a.label || '')}</a></td><td class="small b">${esc(a.field)}</td><td class="small">${a.old_value != null ? `<span class="muted" style="text-decoration:line-through">${esc(String(a.old_value).slice(0, 120))}</span> → ` : ''}${esc(String(a.new_value ?? '').slice(0, 160))}</td></tr>`;
ROUTES.audit = () => head('Audit log', 'Recorded by the server: who changed stages, statuses, costs, payments, approvals, rates and commissions') + `<div class="tabs">${[['', 'All'], ...Object.entries(AUDIT_COLL)].map(([k, v]) => `<button data-act="filt" data-f="auc" data-v="${k}" class="${(state.filters.auc || '') === k ? 'on' : ''}">${v}</button>`).join('')}</div><div class="card"><div class="table-wrap"><table><thead><tr><th>When</th><th>Who</th><th>Record</th><th>Field</th><th>Change</th></tr></thead><tbody id="auditBody"><tr><td colspan="5" class="empty">${cloud.on ? 'Loading…' : 'The audit log is kept by the server — sign in to the cloud workspace to see it.'}</td></tr></tbody></table></div></div>`;
ROUTES['audit:after'] = async () => {
  if (!cloud.on) return;
  let q = cloud.sb.from('opsboss_audit').select('*').order('at', { ascending: false }).limit(400);
  if (state.filters.auc) q = q.eq('coll', state.filters.auc);
  const { data, error } = await q; const b = $('#auditBody'); if (!b) return;
  b.innerHTML = error ? `<tr><td colspan="5" class="empty">${esc(error.message)}</td></tr>` : (data || []).map(auditRow).join('') || '<tr><td colspan="5" class="empty">No changes recorded yet.</td></tr>';
};
ROUTES['job:after'] = async id => {
  const box = $('#srvAudit'); if (!box || !cloud.on || !['owner', 'admin', 'finance'].includes(cloud.role)) return;
  const { data } = await cloud.sb.from('opsboss_audit').select('*').in('coll', ['jobs', 'comp']).eq('record_id', id).order('at', { ascending: false }).limit(100);
  if ($('#srvAudit')) $('#srvAudit').innerHTML = `<div class="card mt"><div class="card-h"><h3>Server audit</h3><span class="small muted">recorded by the database, cannot be edited</span></div><div class="table-wrap"><table><tbody>${(data || []).map(auditRow).join('') || '<tr><td class="empty">No changes recorded yet.</td></tr>'}</tbody></table></div></div>`;
};
const canEditSettings = () => !cloud.on || ['owner', 'admin', 'finance'].includes(cloud.role);
ROUTES['settings:after'] = async () => {
  if (!canEditSettings()) { $$('#view [data-act-input]').forEach(el => { if (el.dataset.actInput !== 'memberRole') el.disabled = true; }); const h = $('#view .page-head'); if (h && !$('#roNote')) h.insertAdjacentHTML('afterend', `<div class="auth-msg mb" id="roNote">Settings are read-only for your role (${esc(ROLE_LABEL[cloud.role] || cloud.role)}). Owner, admin and finance can change them.</div>`); }
  const box = $('#acl'); if (!box) return;
  const [{ data: mem, error: e1 }, inv] = await Promise.all([cloud.sb.from('opsboss_members').select('*').order('created_at'), canAdmin() ? cloud.sb.from('opsboss_invites').select('*').order('created_at') : Promise.resolve({ data: [] })]);
  if (!$('#acl')) return;
  if (e1) { box.innerHTML = `<div class="auth-msg bad">${esc(e1.message)}</div>`; return; }
  const roles = Object.entries(ROLE_LABEL).filter(([k]) => k !== 'owner' || cloud.role === 'owner');
  box.innerHTML = `${mem.map(m => `<div class="list-item"><span class="avatar" style="background:#6366f1">${initials(m.name || m.email)}</span><div style="flex:1;min-width:0"><div class="b">${esc(m.name || '')}</div><div class="small muted">${esc(m.email)}</div></div>${canAdmin() && m.user_id !== cloud.user.id && (m.role !== 'owner' || cloud.role === 'owner') ? `<select class="inp" style="width:auto;padding:5px 8px" data-act-input="memberRole" data-id="${m.user_id}">${roles.map(([k, v]) => `<option value="${k}" ${m.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn ghost sm danger" data-act="removeMember" data-id="${m.user_id}" title="Remove access">✕</button>` : `<span class="pill">${ROLE_LABEL[m.role]}</span>`}</div>`).join('')}
  ${canAdmin() ? `${(inv.data || []).map(i => `<div class="list-item"><span class="pill warn">Invited</span><div style="flex:1;min-width:0" class="small">${esc(i.name ? i.name + ' · ' : '')}${esc(i.email)} · ${ROLE_LABEL[i.role]}${i.expires_at && new Date(i.expires_at) < new Date() ? ' · <span class="down">link expired</span>' : ''}</div><button class="btn sm" data-act="inviteLink" data-email="${esc(i.email)}" data-role="${esc(i.role)}" data-name="${esc(i.name || '')}">🔗 Invite link</button><button class="btn ghost sm danger" data-act="removeInvite" data-email="${esc(i.email)}">✕</button></div>`).join('')}
  <form class="row mt" id="inviteForm"><input class="inp" name="name" placeholder="Name" style="flex:1;min-width:140px"><input class="inp" type="email" name="email" required placeholder="email@nexispower.com" style="flex:1;min-width:180px"><select class="inp" name="role" style="width:auto">${roles.map(([k, v]) => `<option value="${k}" ${k === 'office' ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn primary">Invite</button></form>
  <p class="small muted">You’ll get a personal invite link to send by text or email. They open it, choose a password and they’re in — no email verification. Links expire in 14 days.</p>` : ''}`;
  const f = $('#inviteForm');
  if (f) f.onsubmit = async ev => { ev.preventDefault(); await inviteLinkModal(f.email.value.trim().toLowerCase(), f.role.value, f.name.value.trim()); };
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
      <div class="card mb"><div class="card-h"><h3>📷 Required photos</h3></div><div class="card-b"><p class="small muted">One photo per line. Start a line with <code>?</code> to make it optional. Jobs can’t be completed until every required photo is taken. Adjust to your financier’s checklist (PPA / lease / loan).</p>
        ${['solar', 'hvac', 'roofing'].map(k => `<label class="f mt">${DIV[k].name}<textarea class="inp" style="min-height:${k === 'roofing' ? 70 : 150}px;font-size:12.5px" data-act-input="photoReqs" data-k="${k}" ${canAdmin() ? '' : 'disabled'} placeholder="${k === 'roofing' ? 'No checklist yet — add lines to enable one' : ''}">${esc(((db.settings.photoReqs && db.settings.photoReqs[k]) || PHOTO_DEFAULTS[k] || []).join('\n'))}</textarea></label>`).join('')}
      </div></div>
      <div class="card"><div class="card-h"><h3>Tax & financing</h3></div><div class="card-b form">${f('taxRate', 'Sales tax (%)', 'number', '0.01')}${f('apr', 'Financing APR (%)', 'number', '0.01')}${f('term', 'Term (months)', 'number')}</div></div>
      ${cloud.on ? `<div class="card mt"><div class="card-h"><h3>HighLevel (SMS, email & calls)</h3><span class="pill ${ghlOn() ? 'ok' : ''}">${ghlOn() ? 'Connected' : 'Not connected'}</span></div><div class="card-b">
        ${canAdmin() ? `<div class="form" style="grid-template-columns:1fr 1fr"><label class="f">Private Integration token ${cloud.ghl && cloud.ghl.tokenHint ? `<span class="muted">(saved ${esc(cloud.ghl.tokenHint)})</span>` : ''}<input class="inp" id="ghlToken" type="password" autocomplete="off" placeholder="${cloud.ghl && cloud.ghl.tokenHint ? 'Leave blank to keep the current token' : 'pit-…'}"></label><label class="f">Location ID<input class="inp" id="ghlLoc" value="${esc((cloud.ghl && cloud.ghl.locationId) || '')}"></label></div>
        <label class="check mt"><input type="checkbox" id="ghlAuto" ${cloud.ghl && cloud.ghl.autoSend ? 'checked' : ''}><span><b>Send workflow messages automatically</b> through HighLevel (otherwise they wait in Tasks for one-click sending)</span></label>
        <div class="row mt"><button class="btn primary" data-act="ghlSave">Save</button>${ghlOn() ? '<button class="btn" data-act="ghlTest">Test connection</button>' : ''}</div>
        <p class="small muted">The token is write-only: it’s stored on the server and never shown again.</p>
        ${cloud.ghl && cloud.ghl.webhookKey ? `<details class="mt"><summary class="b small">Webhook URLs for HighLevel workflows</summary><p class="small muted">In HighLevel, add a <b>Webhook</b> action (method POST) to a workflow and paste the URL for that event:</p>${[['lead', 'New lead → Marketing Leads · Warm Leads (trigger: Contact Created / Form Submitted)'], ['reply', 'Customer replied → task to reply (trigger: Customer Replied)'], ['call', 'Call logged → activity, task if missed (trigger: Call Status)']].map(([ev, label]) => `<label class="f mt">${label}<input class="inp" readonly onclick="this.select()" value="${esc(CFG.url + '/functions/v1/opsboss-ghl-webhook?event=' + ev + '&key=' + cloud.ghl.webhookKey)}"></label>`).join('')}<p class="small muted mt">Optional: add <code>&division=solar</code>, <code>roofing</code> or <code>hvac</code> to the lead URL so leads land in the right division.</p></details>` : ''}`
        : `<p class="small muted">${ghlOn() ? 'Messages and calls sync with HighLevel.' : 'Ask an admin to connect HighLevel.'}</p>`}
      </div></div>` : ''}
      ${p3SettingsCards()}${p4SettingsCard()}${aiSettingsCard()}
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
function wfRun(wf, kind, rec, runKey) {
  const now = new Date(), c = wfInfo(kind, rec).c, link = { kind, id: rec.id };
  for (const a of wf.actions) {
    if (a.type === 'task') db.tasks.unshift({ id: uid(), title: wfFill(a.title, kind, rec), due: ymd(addDays(now, num(a.days))), assignee: a.tech || (kind === 'job' ? rec.techIds[0] || '' : ''), done: false, customerId: c.id, link, wf: wf.name, createdAt: iso(now) });
    if (a.type === 'message') {
      const t = { id: uid(), type: 'message', channel: a.channel || 'sms', body: wfFill(a.body, kind, rec), title: `${a.channel === 'email' ? 'Send email' : 'Send SMS'} to ${c.name}`, due: ymd(addDays(now, num(a.days))), assignee: '', done: false, customerId: c.id, link, wf: wf.name, createdAt: iso(now) };
      db.tasks.unshift(t);
      // Envío automático por HighLevel: solo mensajes para hoy, si está activado en Settings.
      if (ghlOn() && cloud.ghl.autoSend && !num(a.days) && c.id) {
        const ch = t.channel === 'email' ? 'email' : 'sms';
        if (!db.settings.outboundLive) runLog('wf.message', `${wf.name}: ${ch.toUpperCase()} to ${c.name} prepared as a task (test mode — not sent)`, { status: 'test', retry: { taskId: t.id } });
        else if (c.consent && c.consent[ch] === false) runLog('wf.message', `${wf.name}: ${c.name} opted out of ${ch.toUpperCase()} — not sent`, { status: 'blocked' });
        else { const r = runLog('wf.message', `${wf.name}: ${ch.toUpperCase()} to ${c.name}`, { system: 'HighLevel', retry: { taskId: t.id } }); ghlSend(c, t.channel === 'email' ? 'Email' : 'SMS', t.body, db.settings.company).then(() => { t.done = true; t.doneAt = iso(new Date()); t.sentVia = 'highlevel'; save(); remoteRender(); }).catch(e => { r.status = 'error'; r.detail += ' · ' + e.message; save(); toast('HighLevel auto-send failed: ' + e.message); }); }
      }
    }
    if (a.type === 'move_lead' && a.stage) {
      const lead = kind === 'lead' ? rec : db.leads.find(l => l.customerId === c.id && (!rec.division || l.division === rec.division) && !CLOSED.includes(l.stage));
      if (lead && lead.stage !== a.stage) { lead.stage = a.stage; lead.stageAt = iso(now); emit('lead.stage', 'lead', lead, { to: a.stage }); }
    }
    if (a.type === 'invoice_job' && kind === 'job' && !rec.invoiceId) invoiceFromJob(rec);
    if (a.type === 'assign_tech' && kind === 'job' && a.tech && !rec.techIds.includes(a.tech)) rec.techIds.push(a.tech);
    if (a.type === 'tag' && a.tag && c.id) { c.tags = c.tags || []; if (!c.tags.includes(a.tag)) c.tags.push(a.tag); }
    if (a.type === 'note') log(wfFill(a.text, kind, rec));
    if (a.type === 'notify') toast('⚡ ' + wfFill(a.text, kind, rec));
  }
  wf.runs = (wf.runs || 0) + 1; wf.lastRun = iso(now);
  runLog('workflow', `⚡ ${wf.name} — ${c.name || ''} (${wf.actions.length} action${wf.actions.length === 1 ? '' : 's'})`, { key: runKey });
  log(`⚡ Workflow "${wf.name}" — ${c.name || ''}`);
}
// Dispara los workflows de un evento. Devuelve cuántos se ejecutaron.
function emit(event, kind, rec, extra = {}) {
  if (!db.workflows || wfDepth > 3) return 0;
  let n = 0; wfDepth++;
  try { for (const wf of db.workflows) if (wf.active && wf.trigger.type === event && wfMatches(wf, kind, rec, extra)) { const key = `wf:${wf.id}:${event}:${rec.id}:${extra.to || ''}`; if (recentRun(key)) continue; wfRun(wf, kind, rec, key); n++; } } catch (e) { console.error('workflow', e); }
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
    if (wf.trigger.type === 'time.lead_stale') cands = db.leads.filter(l => !CLOSED.includes(l.stage)).map(l => [l, new Date(l.stageAt || l.createdAt).getTime() + days, l.stage]);
    if (wf.trigger.type === 'time.invoice_overdue') cands = db.invoices.filter(i => invStatus(i) === 'overdue' && !i.disputed).map(i => [i, parseLocal(i.due).getTime() + days, i.due]);
    if (wf.trigger.type === 'time.job_completed_ago') cands = db.jobs.filter(j => j.status === 'completed').map(j => [j, new Date(j.completedAt || j.start || j.createdAt).getTime() + days, 'x']);
    if (wf.trigger.type === 'time.plan_visit_due') cands = db.plans.filter(p => p.status === 'active').map(p => [p, parseLocal(p.nextVisit).getTime() - days, p.nextVisit]);
    for (const [rec, at, ver] of cands) {
      if (at > now || at < since) continue;
      const key = wf.id + ':' + ver; rec._wf = rec._wf || {};
      if (rec._wf[key]) continue;
      if (!wfMatches(wf, T.kind, rec, {})) continue;
      rec._wf[key] = iso(new Date()); wfRun(wf, T.kind, rec, 'wf:' + key + ':' + rec.id); n++;
    }
  }
  if (n) { save(); toast(`⚡ ${n} scheduled automation${n > 1 ? 's' : ''} ran`); if (!$('#modalRoot').children.length) render(); }
}
function invoiceFromJob(j) {
  const est = j.estimateId && byId('estimates', j.estimateId);
  const deps = est ? db.invoices.filter(i => i.status !== 'void' && (i.estimateId === est.id || (i.customerId === j.customerId && i.items.some(it => it.name.includes(est.number))))) : [];
  const items = j.items.map(x => ({ ...x, id: uid() }));
  ((j.fin && j.fin.changeOrders) || []).filter(c => c.status === 'approved' && !c.invoicedIn).forEach(c => { items.push({ id: uid(), name: `${c.number}: ${c.desc}`, qty: 1, price: num(c.price), cost: num(c.cost) }); c.invoicedIn = 'pending'; });
  deps.forEach(d => items.push({ id: uid(), name: `Less deposit (${d.number})`, qty: 1, price: -subtotal(d.items), cost: 0 }));
  const inv = createInvoice({ customerId: j.customerId, jobId: j.id, division: j.division, items }); j.invoiceId = inv.id; ((j.fin && j.fin.changeOrders) || []).forEach(c => { if (c.invoicedIn === 'pending') c.invoicedIn = inv.id; }); if (j.history) hist(j, `Invoice ${inv.number} created — ${money2(subtotal(items))}`); return inv;
}
const wfTriggerText = t => { const T = WF_TRIGGERS[t.type]; if (!T) return t.type; let s = T.label.replace('N days', `${num(t.days)} day${num(t.days) === 1 ? '' : 's'}`); if (t.stage && t.stage !== 'any') s += ` → ${stageName(t.stage)}`; if (t.status && t.status !== 'any') s += ` → ${JOB_ST[t.status]?.[0]}`; return s; };
const wfCondText = k => { const p = []; if (k.division && k.division !== 'any') p.push('Division ' + DIV[k.division].name); if (num(k.minValue)) p.push('Amount ≥ ' + money(k.minValue)); if (k.source && k.source !== 'any') p.push('Source ' + srcEN(k.source)); return p.join(' · ') || 'Always'; };
const wfActionText = a => a.type === 'task' ? `Task: "${a.title}"${num(a.days) ? ` (due in ${a.days} d)` : ''}` : a.type === 'message' ? `${a.channel === 'email' ? 'Email' : 'SMS'}: "${String(a.body || '').slice(0, 70)}${String(a.body || '').length > 70 ? '…' : ''}"` : a.type === 'move_lead' ? `Move lead to ${stageName(a.stage) || '—'}` : a.type === 'assign_tech' ? `Assign to ${tech(a.tech)?.name || '—'}` : a.type === 'tag' ? `Tag "${a.tag}"` : a.type === 'note' || a.type === 'notify' ? `${WF_ACTIONS[a.type]}: "${a.text}"` : WF_ACTIONS[a.type];

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
      if (a.type === 'move_lead') p = `<label class="f">Stage${sel('stage', ALL_STAGES, a.stage, `data-a="${i}"`)}</label>`;
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
      ${T.param === 'stage' ? `<label class="f">New stage${sel('trigger.stage', [['any', 'Any'], ...ALL_STAGES], d.trigger.stage || 'any')}</label>` : ''}
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
  const row = t => { const c = cust(t.customerId); const tk = tech(t.assignee); return `<div class="list-item" style="align-items:flex-start"><input type="checkbox" style="width:18px;height:18px;margin-top:2px;accent-color:var(--brand)" data-act-input="taskDone" data-id="${t.id}" ${t.done ? 'checked' : ''}><div style="flex:1;min-width:0"><div class="b" style="${t.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${t.type === 'message' ? (t.channel === 'email' ? '@ ' : '✉ ') : ''}${esc(t.title)}</div>${t.type === 'message' ? `<div class="small" style="white-space:pre-wrap;background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin:6px 0">${esc(t.body)}</div>` : ''}${t.notes ? `<div class="small muted">${esc(t.notes)}</div>` : ''}<div class="small muted">${taskLink(t)} · ${t.due === today ? 'Today' : fDate(parseLocal(t.due))}${t.wf ? ` · <span class="pill brand" style="font-size:11px">⚡ ${esc(t.wf)}</span>` : ''}</div></div>${tk ? avatar(tk) : ''}${t.type === 'message' && !t.done && ghlOn() && c.id ? `<button class="btn sm primary" data-act="taskGhl" data-id="${t.id}">⚡ Send via HighLevel</button>` : ''}${t.type === 'message' && !t.done && !ghlOn() ? (t.channel === 'email' ? `<a class="btn sm primary" data-act="taskSend" data-id="${t.id}" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(db.settings.company)}&body=${encodeURIComponent(t.body)}">@ Send</a>` : `<a class="btn sm primary" data-act="taskSend" data-id="${t.id}" href="sms:${esc(c.phone)}?body=${encodeURIComponent(t.body)}">✉ Send</a>`) : ''}<button class="btn ghost sm danger" data-act="taskDel" data-id="${t.id}" title="Delete">✕</button></div>`; };
  return head('Tasks', `${open.length} open · ${open.filter(t => t.due < today).length} overdue`, `<select class="inp" style="width:auto" data-act-input="taskWho"><option value="all">Whole team</option><option value="none" ${who === 'none' ? 'selected' : ''}>Unassigned</option>${db.techs.map(t => `<option value="${t.id}" ${who === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select><a class="btn" href="#/workflows">⚡ Workflows</a><button class="btn primary" data-act="taskNew">＋ Task</button>`) +
    groups.map(([label, list, cls]) => list.length || label !== 'Completed' ? `<div class="card mb"><div class="card-h"><h3><span class="pill ${cls}">${label}</span> <span class="muted small">${list.length}</span></h3></div><div class="card-b" style="padding-top:4px;padding-bottom:4px">${list.map(row).join('') || '<div class="muted small" style="padding:10px 0">Nothing here.</div>'}</div></div>` : '').join('');
};

/* ───────────── Búsqueda / paleta de comandos ───────────── */
function openPalette() {
  const pages = NAV.filter(n => n[0] !== 'sec').map(n => ({ label: n[2], type: 'Page', go: '#/' + n[0] }));
  const actions = [['New lead', 'newLead'], ['New customer', 'newCustomer'], ['New estimate', 'newEstimate'], ['New job', 'newJob'], ['New invoice', 'newInvoice']].map(([label, act]) => ({ label: '＋ ' + label, type: 'Action', act }));
  const records = () => [
    ...db.customers.map(c => ({ label: c.name, sub: `${c.phone} · ${c.address}, ${c.city}`, type: 'Customer', go: '#/customer/' + c.id, hay: [c.name, c.phone, c.email, c.address, c.city, ...(c.equipment || []).map(e => e.serial), ...(c.properties || []).map(p => p.address)].join(' ') })),
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
  newLead: el => leadModal(null, el && el.dataset && el.dataset.pipe),
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
  jobStatus: el => { const j = byId('jobs', el.dataset.id);
    if (el.dataset.s === 'completed') { const st = photoStatus(j); if (st.missing.length) { modal({ title: 'Required photos missing', body: `<p>This job can’t be completed until all required photos are taken (${st.requiredDone}/${st.required}).</p><ul class="small">${st.missing.map(r => `<li>${esc(r.label)}</li>`).join('')}</ul>`, foot: `<button class="btn" data-dismiss>Close</button><a class="btn primary" href="#/photos/${j.id}" onclick="this.closest('.modal-bg').remove()">📷 Open photo checklist</a>` }); return; } }
    j.status = el.dataset.s; if (j.status === 'completed') { j.completedAt = iso(new Date()); j.checklist.forEach(c => c.done = true); } log(`${j.number} → ${JOB_ST[j.status][0]}`); emit('job.status', 'job', j, { to: j.status }); save(); render(); toast(JOB_ST[j.status][0]); if (j.status === 'enroute') { const c = cust(j.customerId); modal({ title: 'Notify the customer', body: `<p>Send an "on the way" text to ${esc(c.name)}?</p>`, foot: `<button class="btn" data-dismiss>No</button><a class="btn primary" href="sms:${esc(c.phone)}?body=${encodeURIComponent(`Hi ${c.name}, your ${db.settings.company} technician is on the way for "${j.title}".`)}">✉ Send SMS</a>` }); } },
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
    modal({ title: kind === 'estimate' ? 'Link to review and sign' : 'Payment link', body: `<p class="muted">The customer doesn’t need an account. The link is private and expires in 90 days; you’ll see here when they open it.</p><input class="inp" readonly value="${esc(url)}" onclick="this.select()"><div class="row mt"><button class="btn" data-act="portalCopy" data-url="${esc(url)}">Copy</button>${ghlOn() ? `<button class="btn primary" id="ghlPortalSms">⚡ Text it via HighLevel</button>` : ''}<a class="btn" href="sms:${esc(c.phone)}?body=${encodeURIComponent(smsTxt)}">✉ SMS</a><a class="btn" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}">@ Email</a><a class="btn" href="${esc(url)}" target="_blank" rel="noopener">View as customer ↗</a></div>`, foot: '<button class="btn primary" data-dismiss>Done</button>', onMount(bg) { const b = $('#ghlPortalSms', bg); if (b) b.onclick = async () => { b.disabled = true; b.textContent = 'Sending…'; try { await ghlSend(c, 'SMS', smsTxt); b.textContent = '✓ Sent'; toast('Link texted via HighLevel ✓'); } catch (e) { b.disabled = false; b.textContent = '⚡ Text it via HighLevel'; toast('HighLevel: ' + e.message); } }; } });
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
  taskGhl: async el => {
    const t = byId('tasks', el.dataset.id), c = cust(t.customerId); el.disabled = true; el.textContent = 'Sending…';
    try { await ghlSend(c, t.channel === 'email' ? 'Email' : 'SMS', t.body, db.settings.company); t.done = true; t.doneAt = iso(new Date()); t.sentVia = 'highlevel'; save(); render(); toast('Sent via HighLevel ✓'); }
    catch (e) { el.disabled = false; el.textContent = '⚡ Send via HighLevel'; toast('HighLevel: ' + e.message); }
  },
  ghlSendSms: async el => {
    const c = byId('customers', el.dataset.id), txt = ($('#ghlText') || {}).value || ''; if (!txt.trim()) return;
    el.disabled = true; el.textContent = 'Sending…';
    try { await ghlSend(c, 'SMS', txt.trim()); toast('SMS sent ✓'); ROUTES['customer:after'](c.id); } catch (e) { toast('HighLevel: ' + e.message); el.disabled = false; el.textContent = 'Send SMS'; }
  },
  ghlRefresh: el => ROUTES['customer:after'](el.dataset.id),
  ghlSave: async () => {
    const token = $('#ghlToken').value.trim(), loc = $('#ghlLoc').value.trim(), auto = $('#ghlAuto').checked;
    const { data, error } = await cloud.sb.rpc('opsboss_ghl_save', { p_token: token || null, p_location: loc || null, p_auto: auto });
    if (error) { toast(error.message); return; }
    cloud.ghl = data; $('#ghlToken').value = ''; toast('HighLevel settings saved'); render();
  },
  ghlTest: async el => { el.disabled = true; try { const r = await ghlCall('status'); toast(`✓ Connected to ${r.name}`); } catch (e) { toast('HighLevel: ' + e.message); } el.disabled = false; },
  delReqPhoto: el => confirmDlg('Delete this photo?', async () => { const j = byId('jobs', el.dataset.job), shot = (j.reqPhotos || []).find(x => x.id === el.dataset.shot); if (!shot) return; if (shot.path && cloud.on) await cloud.sb.storage.from('opsboss-photos').remove([shot.path]); j.reqPhotos = j.reqPhotos.filter(x => x.id !== shot.id); save(); render(); }),
  photoPdf: async el => { const j = byId('jobs', el.dataset.id), t = el.textContent; el.disabled = true; el.textContent = 'Building PDF…'; try { await photoPdf(j); } catch (e) { toast('PDF error: ' + e.message); } el.disabled = false; el.textContent = t; },
  inviteLink: el => inviteLinkModal(el.dataset.email, el.dataset.role, el.dataset.name),
  projNext: el => { const j = byId('jobs', el.dataset.id); form({ title: 'Next action', fields: [{ k: 'nextAction', label: 'Next action', full: true, value: j.nextAction || '', required: true }, { k: 'nextDue', label: 'Due date', type: 'date', value: j.nextDue || ymd(new Date()) }, { k: 'owner', label: 'Owner', value: j.owner || ownerName(j) }], onSave(v) { Object.assign(j, v); hist(j, `Next action: ${v.nextAction} (due ${v.nextDue}, ${v.owner || 'no owner'})`); } }); },
  addBlocker: el => { const j = projInit(byId('jobs', el.dataset.id)); form({ title: 'Add blocker', fields: [{ k: 'reason', label: 'What is blocking?', full: true, required: true }, { k: 'owner', label: 'Who resolves it', value: j.owner || '' }, { k: 'followUp', label: 'Follow up on', type: 'date', value: ymd(addDays(new Date(), 2)) }], onSave(v) { j.blockers.push({ id: uid(), ...v, createdAt: iso(new Date()), by: me() }); hist(j, `⛔ Blocked: ${v.reason}`); db.tasks.unshift({ id: uid(), title: `Unblock ${j.number}: ${v.reason}`, due: v.followUp || ymd(new Date()), done: false, assignee: '', customerId: j.customerId, link: { kind: 'job', id: j.id }, wf: 'Blocker', createdAt: iso(new Date()) }); } }); },
  resolveBlocker: el => { const j = byId('jobs', el.dataset.id), b = j.blockers.find(x => x.id === el.dataset.b); if (!b) return; b.resolvedAt = iso(new Date()); b.resolvedBy = me(); hist(j, `✓ Blocker resolved: ${b.reason}`); save(); render(); },
  addDep: el => { const j = projInit(byId('jobs', el.dataset.id)); form({ title: 'Depends on another project', fields: [{ k: 'projectId', label: 'Project that must go first', type: 'select', options: projOptions().filter(([id]) => id !== j.id), full: true }, { k: 'stage', label: 'Until it finishes stage (blank = until completed)', value: '', ph: 'e.g. install' }], onSave(v) { const o = db.jobs.find(x => x.id === v.projectId); if (!o) return false; const st = flowOf(o).find(s => s[0] === v.stage || s[1].toLowerCase() === String(v.stage).toLowerCase()); j.dependsOn.push({ projectId: o.id, stage: st ? st[0] : '' }); hist(j, `Depends on ${o.number}${st ? ' finishing ' + st[1] : ''}`); } }); },
  stageAdvance: el => {
    const j = projInit(byId('jobs', el.dataset.id)), f = flowOf(j), i = stageIdx(j), [k, l] = f[i], open = (j.ops.tasks[k] || []).filter(t => !t.done), bl = blockersOf(j);
    const go = reason => { if (reason) j.ops.exceptions.push({ stage: l, reason, by: me(), ts: iso(new Date()) }); if (i === f.length - 1) { j.ops.closed = true; hist(j, `Project closed${reason ? ' (exception: ' + reason + ')' : ''}`); } else { j.ops.stage = f[i + 1][0]; hist(j, `Stage: ${l} → ${f[i + 1][1]}${reason ? ' (exception: ' + reason + ')' : ''}`); emit('job.status', 'job', j, { to: 'stage:' + f[i + 1][0] }); } save(); render(); };
    if (!open.length && !bl.length) return go('');
    modal({ title: 'Advance with exception?', body: `<p>${open.length ? `${open.length} task(s) in <b>${esc(l)}</b> are not done: ${open.map(t => esc(t.t)).join(', ')}.` : ''} ${bl.length ? `The project has ${bl.length} open blocker(s).` : ''}</p>${canApprove() || cloud.role === 'ops' ? '<label class="f">Reason (recorded in history)<textarea class="inp" id="excReason"></textarea></label>' : '<p class="small muted">Only Operations, Finance or Admin can authorize exceptions.</p>'}`, foot: `<button class="btn" data-dismiss>Cancel</button>${canApprove() || cloud.role === 'ops' ? '<button class="btn primary" id="excGo">Advance with exception</button>' : ''}`, onMount(bg, close) { const b = $('#excGo', bg); if (b) b.onclick = () => { const r = $('#excReason', bg).value.trim(); if (!r) { toast('A reason is required'); return; } close(); go(r); }; } });
  },
  opsAddTask: el => { const j = byId('jobs', el.dataset.id); form({ title: 'Add workflow task', fields: [{ k: 't', label: 'Task', full: true, required: true }, { k: 'owner', label: 'Owner' }], onSave(v) { j.ops.tasks[el.dataset.s].push({ id: uid(), t: v.t, owner: v.owner, done: false }); } }); },
  lockBudget: el => { const j = projInit(byId('jobs', el.dataset.id)); j.fin.budget = { price: subtotal(j.items), cost: costOf(j.items), byCat: { Materials: costOf(j.items) }, lockedAt: iso(new Date()), by: me() }; hist(j, `Original budget locked: ${money2(j.fin.budget.price)} price / ${money2(j.fin.budget.cost)} cost`); save(); render(); },
  budgetSplit: el => { const j = projInit(byId('jobs', el.dataset.id)); if (!j.fin.budget) { toast('Lock the original budget first'); return; } const bc = j.fin.budget.byCat || {}; form({ title: 'Budget split by category', fields: COST_CATS.map(c => ({ k: c, label: c, type: 'number', step: '0.01', value: bc[c] || '' })), onSave(v) { const byCat = {}; let t = 0; for (const c of COST_CATS) if (num(v[c])) { byCat[c] = num(v[c]); t += num(v[c]); } j.fin.budget.byCat = byCat; j.fin.budget.cost = t; hist(j, `Budget split updated (total cost ${money2(t)})`); } }); },
  addCO: el => { const j = projInit(byId('jobs', el.dataset.id)); form({ title: 'New change order', fields: [{ k: 'desc', label: 'Description', full: true, required: true }, { k: 'price', label: 'Price to customer ($)', type: 'number', step: '0.01' }, { k: 'cost', label: 'Estimated cost ($)', type: 'number', step: '0.01' }, { k: 'evidence', label: 'Evidence (photo link, note)', full: true }], onSave(v) { const co = { id: uid(), number: `CO-${j.fin.changeOrders.length + 1}`, ...v, price: num(v.price), cost: num(v.cost), status: 'pending', createdBy: me(), createdAt: iso(new Date()) }; j.fin.changeOrders.push(co); hist(j, `${co.number} requested: ${co.desc} — ${money2(co.price)} price / ${money2(co.cost)} cost`); if (!canApprove()) db.tasks.unshift({ id: uid(), title: `Approve ${co.number} on ${j.number}: ${co.desc} (${money2(co.price)})`, due: ymd(new Date()), done: false, assignee: '', customerId: j.customerId, link: { kind: 'job', id: j.id }, wf: 'Approvals', createdAt: iso(new Date()) }); } }); },
  coSet: el => { const j = byId('jobs', el.dataset.id), co = j.fin.changeOrders.find(x => x.id === el.dataset.c); co.status = el.dataset.s; co.approvedBy = me(); co.decidedAt = iso(new Date()); hist(j, `${co.number} ${co.status} by ${me()}`); save(); render(); },
  newPO: el => poModal(el.dataset.job),
  poRecv: el => { const po = (db.pos || []).find(x => x.id === el.dataset.id); po.receivedAt = iso(new Date()); po.receivedBy = me(); const j = db.jobs.find(x => x.id === po.projectId); if (j) { projInit(j); hist(j, `${po.number} received (${po.vendor})`); } save(); render(); },
  poSet: el => { const po = (db.pos || []).find(x => x.id === el.dataset.id); po.status = el.dataset.s; if (po.status === 'approved') { po.approvedBy = me(); po.approvedAt = iso(new Date()); } const j = db.jobs.find(x => x.id === po.projectId); if (j) { projInit(j); hist(j, `${po.number} ${po.status} by ${me()}`); } save(); render(); },
  newBill: () => billModal(null),
  editBill: el => billModal((db.bills || []).find(b => b.id === el.dataset.id)),
  delBill: el => confirmDlg('Delete this vendor bill?', () => { db.bills = db.bills.filter(b => b.id !== el.dataset.id); }),
  billPaid: el => { const b = db.bills.find(x => x.id === el.dataset.id); b.paidAt = iso(new Date()); b.paidBy = me(); save(); render(); },
  addCost: el => { const j = projInit(byId('jobs', el.dataset.id)); form({ title: 'Add direct cost', fields: [{ k: 'category', label: 'Category', type: 'select', options: COST_CATS }, { k: 'amount', label: 'Amount ($, negative = credit/return)', type: 'number', step: '0.01', required: true }, { k: 'vendor', label: 'Vendor / paid to' }, { k: 'date', label: 'Date', type: 'date', value: ymd(new Date()) }, { k: 'note', label: 'Note / receipt link', full: true }], onSave(v) { j.fin.costs.push({ id: uid(), ...v, amount: num(v.amount), by: me(), paid: true }); hist(j, `Cost ${v.category} ${money2(v.amount)} ${v.vendor || ''}`); } }); },
  delCost: el => { const j = byId('jobs', el.dataset.id); const c = j.fin.costs.find(x => x.id === el.dataset.c); j.fin.costs = j.fin.costs.filter(x => x.id !== el.dataset.c); hist(j, `Cost removed: ${c ? c.category + ' ' + money2(c.amount) : ''}`); save(); render(); },
  addLabor: el => { const j = projInit(byId('jobs', el.dataset.id)); form({ title: 'Log crew hours', fields: [{ k: 'techId', label: 'Crew member', type: 'select', options: techOptions() }, { k: 'hours', label: 'Hours', type: 'number', step: '0.25', required: true }, { k: 'rate', label: 'Loaded hourly cost ($)', type: 'number', step: '0.01', value: db.settings.laborRate || 45 }, { k: 'date', label: 'Date', type: 'date', value: ymd(new Date()) }], onSave(v) { const lid = uid(); compOf(j, true).labor[lid] = num(v.rate); j.fin.labor.push({ id: lid, techId: v.techId, hours: num(v.hours), date: v.date, by: me() }); hist(j, `Labor logged: ${v.hours}h`); } }); },
  toggleDispute: el => { const i = byId('invoices', el.dataset.inv); i.disputed = !i.disputed; log(`${i.number} ${i.disputed ? 'marked disputed' : 'dispute cleared'}`); save(); render(); },
  mergeKeep: el => { const ids = el.dataset.all.split(','), keep = byId('customers', el.dataset.keep); confirmDlg(`Merge ${ids.length - 1} record(s) into <b>${esc(keep.name)}</b>? Projects, estimates, invoices, tasks and notes move to this customer.`, () => { mergeCustomers(el.dataset.keep, ids); toast('Customers merged'); }); },
  addProperty: el => { const c = byId('customers', el.dataset.id); form({ title: 'Add property', fields: [{ k: 'label', label: 'Label', ph: 'e.g. Rental on Elm St' }, { k: 'address', label: 'Address', required: true, full: true }, { k: 'city', label: 'City' }, { k: 'zip', label: 'ZIP' }, { k: 'access', label: 'Access info (gate code, lockbox)', full: true }], onSave(v) { (c.properties = c.properties || []).push({ id: uid(), ...v }); } }); },
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
  settingBool: el => { db.settings[el.dataset.k] = el.checked; if (el.dataset.k === 'outboundLive') { runLog('settings', `Automatic outbound messages ${el.checked ? 'ACTIVATED' : 'set to test mode'}`); save(); render(); toast(el.checked ? 'Automatic messages are live' : 'Test mode: automatic messages are not sent'); return; } save(); toast(el.checked ? 'Online payments enabled' : 'Online payments disabled'); },
  taskDone: el => { const t = byId('tasks', el.dataset.id); t.done = el.checked; t.doneAt = el.checked ? iso(new Date()) : null; save(); render(); },
  taskWho: el => { state.filters.taskWho = el.value; render(); },
  memberRole: async el => { const { error } = await cloud.sb.from('opsboss_members').update({ role: el.value }).eq('user_id', el.dataset.id); toast(error ? error.message : 'Role updated'); },
  setting: el => { db.settings[el.dataset.k] = el.type === 'number' ? num(el.value) : el.value; save(); },
  calc: el => { const [g, k] = el.dataset.k.split('.'); state.tools[g][k] = num(el.value); const pos = el.dataset.k; render(); const n = $(`[data-k="${pos}"]`); if (n) { n.focus(); } },
  reqPhoto: async el => {
    const j = byId('jobs', el.dataset.job), req = photoReqs(j.division).find(r => r.id === el.dataset.req), files = [...el.files];
    if (!req || !files.length) return;
    const lbl = el.closest('label'); if (lbl) lbl.firstChild.textContent = '⏳ Uploading… ';
    let n = 0; for (const f of files) { try { await savePhoto(j, req, f); n++; } catch (e) { toast('Photo not saved: ' + (e.message || e)); } }
    if (n) toast(`📷 ${n} photo${n > 1 ? 's' : ''} saved to ${j.number}`);
    render();
  },
  photoReqs: el => { db.settings.photoReqs = db.settings.photoReqs || {}; db.settings.photoReqs[el.dataset.k] = el.value.split('\n').map(x => x.trim()).filter(Boolean); save(); toast('Photo checklist saved'); },
  opsTask: el => { const j = byId('jobs', el.dataset.id), t = j.ops.tasks[el.dataset.s].find(x => x.id === el.dataset.t); t.done = el.checked; t.doneBy = me(); t.doneAt = iso(new Date()); hist(j, `${el.checked ? '✓' : '↺'} ${t.t}`); save(); render(); },
  projSpec: el => { const j = projInit(byId('jobs', el.dataset.id)); const old = j.specs[el.dataset.k]; j.specs[el.dataset.k] = el.type === 'number' ? num(el.value) : el.value; hist(j, `Spec ${el.dataset.k}: ${old ?? '—'} → ${j.specs[el.dataset.k]}`); save(); },
  projFinancing: el => { const j = projInit(byId('jobs', el.dataset.id)); j.financing[el.dataset.k] = el.value; hist(j, `Financing ${el.dataset.k} updated`); save(); },
  projProp: el => { const j = byId('jobs', el.dataset.id); j.propertyId = el.value; hist(j, 'Property changed'); save(); render(); },
  projField: el => { const j = projInit(byId('jobs', el.dataset.id)); j[el.dataset.k] = el.value; hist(j, `${el.dataset.k}: ${el.value}`); save(); },
  finRemaining: el => { const j = projInit(byId('jobs', el.dataset.id)); const old = finOf(j).remaining; j.fin.remaining = num(el.value); j.fin.remainingSet = el.value !== ''; hist(j, `Remaining cost estimate ${money2(old)} → ${money2(j.fin.remaining)}`); save(); render(); },
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
  if (e.target.closest('#installBtn')) { doInstall(); return; }
  if (e.target.closest('#themeBtn')) { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const n = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('opsboss.theme', n); } catch (er) { /* ignore */ } }
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  if (e.key === 'Escape') { const m = $$('.modal-bg').pop(); if (m) m.remove(); }
  if (e.key === '/' && !e.target.closest('input,textarea,select')) { e.preventDefault(); openPalette(); }
});
try { const th = localStorage.getItem('opsboss.theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { /* ignore */ }

/* ───────────── Instalar como app (PWA) ───────────── */
let installEvt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function renderInstall() {
  const b = $('#installBtn'); if (!b) return;
  b.hidden = isStandalone() || !(installEvt || isIOS() || /android/i.test(navigator.userAgent));
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; renderInstall(); });
window.addEventListener('appinstalled', () => { installEvt = null; renderInstall(); toast('OpsBoss installed ✓'); });
function showInstallHelp() {
  const ios = isIOS();
  modal({ title: '📲 Install OpsBoss on your phone', body: ios
    ? `<ol style="line-height:1.9;padding-left:20px"><li>Open this page in <b>Safari</b> (on iPhone, other browsers can’t install apps).</li><li>Tap the <b>Share</b> button <span style="font-size:18px">⎋</span> at the bottom of the screen.</li><li>Scroll down and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. The OpsBoss icon appears on your home screen.</li></ol><p class="small muted">Open OpsBoss from that icon: it runs full screen like a regular app and the camera works for Field Photos.</p>`
    : `<ol style="line-height:1.9;padding-left:20px"><li>Open this page in <b>Chrome</b>.</li><li>Tap the <b>⋮</b> menu (top right).</li><li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Confirm with <b>Install</b>.</li></ol><p class="small muted">The OpsBoss icon appears with your other apps.</p>`,
    foot: '<button class="btn primary" data-dismiss>Got it</button>' });
}
async function doInstall() {
  if (installEvt) { installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); installEvt = null; renderInstall(); if (r && r.outcome === 'accepted') toast('Installing OpsBoss…'); return; }
  showInstallHelp();
}
if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

/* ───────────── Invitaciones con link ───────────── */
async function inviteLinkModal(email, role, name) {
  const { data: token, error } = await cloud.sb.rpc('opsboss_invite_create', { p_email: email, p_role: role, p_name: name || null });
  if (error) { toast(error.message); return; }
  const url = location.origin + location.pathname + '?invite=' + token, co = db.settings.company || 'OpsBoss', first = (name || '').split(' ')[0] || 'there';
  const msg = `Hi ${first}, you're invited to ${co}'s OpsBoss. Open this link, choose a password and you're in: ${url}`;
  ROUTES['settings:after'] && $('#acl') && ROUTES['settings:after']();
  modal({ title: `Invite link for ${esc(name || email)}`, body: `<p class="muted">Send this personal link to <b>${esc(email)}</b> (${ROLE_LABEL[role]}). They open it, choose a password and they’re in. It works once and expires in 14 days.</p><input class="inp" readonly value="${esc(url)}" onclick="this.select()"><div class="row mt"><button class="btn primary" data-act="portalCopy" data-url="${esc(url)}">Copy link</button><a class="btn" href="sms:?body=${encodeURIComponent(msg)}">✉ Text</a><a class="btn" href="mailto:${esc(email)}?subject=${encodeURIComponent(`Your invite to ${co} OpsBoss`)}&body=${encodeURIComponent(msg)}">@ Email</a></div>`, foot: '<button class="btn" data-dismiss>Done</button>' });
}
async function joinScreen(token) {
  const el = $('#auth'); el.hidden = false;
  const logo = '<div class="logo" style="width:44px;height:44px;font-size:22px">O<span></span></div>';
  el.innerHTML = `<div class="auth-card">${logo}<h1>Join OpsBoss</h1><p>Checking your invitation…</p></div>`;
  const { data: inv, error } = await cloud.sb.rpc('opsboss_invite_info', { p_token: token });
  const clearUrl = () => history.replaceState(null, '', location.pathname + location.hash);
  if (error || !inv || inv.error) { clearUrl(); authScreen('login', 'This invite link is invalid, already used or expired. Ask your admin for a new one — or sign in if you already joined.'); return; }
  el.innerHTML = `<div class="auth-card">${logo}<h1>Join ${esc(db && db.settings ? db.settings.company : 'OpsBoss')}</h1><p>You’re invited as <b>${ROLE_LABEL[inv.role] || inv.role}</b>.</p><form id="jForm">
    <label class="f">Email<input value="${esc(inv.email)}" disabled></label>
    <label class="f">Your name<input name="name" autocomplete="name" required value="${esc(inv.name || '')}"></label>
    <label class="f">Choose a password<input name="password" type="password" minlength="8" autocomplete="new-password" required placeholder="At least 8 characters"></label>
    <button class="btn primary full" id="jSubmit">Join and sign in</button><div id="jErr"></div></form></div>`;
  $('#jForm').onsubmit = async ev => {
    ev.preventDefault();
    const f = ev.target, btn = $('#jSubmit'), password = f.password.value;
    btn.disabled = true; btn.textContent = 'One moment…';
    let out = {};
    try { const r = await fetch(`${CFG.url}/functions/v1/opsboss-accept-invite`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.key }, body: JSON.stringify({ token, name: f.name.value.trim(), password }) }); out = await r.json(); } catch (e) { out = { error: 'network' }; }
    if (!out.ok) { btn.disabled = false; btn.textContent = 'Join and sign in'; $('#jErr').innerHTML = `<div class="auth-msg bad" style="margin-top:10px">${{ invalid: 'This invite link is invalid or expired.', password: 'Use a password with at least 8 characters.', network: 'Could not reach the server. Check your connection.' }[out.error] || esc(out.message || 'Something went wrong. Please try again.')}</div>`; return; }
    clearUrl();
    if (out.existing) { authScreen('login', `You’re on the team! You already had an account for ${esc(out.email)} — sign in with your existing password (or use “Forgot your password?”).`, 'ok'); const e = $('#aForm [name=email]'); if (e) e.value = out.email; return; }
    const { error: se } = await cloud.sb.auth.signInWithPassword({ email: out.email, password });
    if (se) { authScreen('login', 'Account created — please sign in.', 'ok'); return; }
    const { data } = await cloud.sb.auth.getUser(); if (data.user) enter(data.user);
  };
}

/* ───────────── Arranque y login ───────────── */
function renderUserBox() {
  const b = $('#userBox'); if (!b) return;
  if (cloud.on) b.innerHTML = `<div class="em" title="${esc(cloud.user.email)}">${esc(cloud.user.email)}</div><div>${ROLE_LABEL[cloud.role] || ''} · <button data-act="signOut">Sign out</button></div>`;
  else if (CFG.url) b.innerHTML = `<div>Local demo mode · <button data-act="exitDemo">Sign in</button></div>`;
  else b.innerHTML = '';
}
function start() { p3Init(); p4Init(); if (cloud.on) { setTimeout(() => { uqRefresh(); uqFlush(); }, 2500); if (!window.__uqTimer) window.__uqTimer = setInterval(() => uqFlush(), 120000); } if (cloud.on) cloud.sb.from('opsboss_members').select('name,email').then(({ data }) => { cloud.members = data || []; }); setTimeout(alertScan, 4000); if (!window.__alTimer) window.__alTimer = setInterval(alertScan, 30 * 60 * 1000); renderUserBox(); renderInstall(); render(); setTimeout(processPortal, 1200); setTimeout(processGhlLeads, 1400); setTimeout(wfTimers, 1500); if (!window.__wfTimer) window.__wfTimer = setInterval(wfTimers, 5 * 60 * 1000); }
function authScreen(mode = 'login', msg = '', kind = 'bad') {
  const el = $('#auth'); el.hidden = false;
  const logo = '<div class="logo" style="width:44px;height:44px;font-size:22px">O<span></span></div>';
  const note = msg ? `<div class="auth-msg ${kind}">${msg}</div>` : '';
  if (mode === 'loading') { el.innerHTML = `<div class="auth-card">${logo}<h1>OpsBoss</h1><p>Loading your data…</p></div>`; return; }
  if (mode === 'noaccess' || mode === 'setup') {
    el.innerHTML = `<div class="auth-card">${logo}<h1>${mode === 'setup' ? 'Database setup needed' : 'No access yet'}</h1>${note}<p>${mode === 'setup' ? 'Run <code>opsboss/supabase/schema.sql</code> in the Supabase SQL Editor and reload this page.' : `Your account <b>${esc(cloud.user && cloud.user.email)}</b> hasn’t been invited to OpsBoss yet. Ask your admin to send you an invite link (Settings → Team & access → 🔗 Invite link) and open it.`}</p><div class="row"><button class="btn" id="aRetry">Retry</button><button class="btn" id="aOut">Sign out</button><button class="btn ghost" id="aDemo">View demo</button></div></div>`;
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
    <div class="links">${mode !== 'login' ? '<button data-m="login">← Sign in</button>' : ''}${mode === 'login' ? '<button data-m="magic">Magic link</button><button data-m="reset">Forgot your password?</button>' : ''}</div>
    <div class="links" style="border-top:1px solid var(--border);padding-top:12px"><button id="aDemo">Try it with demo data →</button>${isStandalone() ? '' : '<button id="aInstall">📲 Install app</button>'}</div></div>`;
  $$('[data-m]', el).forEach(b => b.onclick = () => authScreen(b.dataset.m));
  $('#aDemo').onclick = enterDemo;
  if ($('#aInstall')) $('#aInstall').onclick = doInstall;
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
    await ghlLoadConfig();
    const { d, count } = await cloudLoad();
    db = d; migrateComp(db);
    cloud.shadow = snapshot();
    migrateEn(db);
    if (!db.settings) { const b = blankDb(); db.settings = b.settings; if (!db.pricebook.length) db.pricebook = b.pricebook; }
    if (count && !db.workflows.length && !db.settings.wfSeeded) { db.workflows = wfTemplates().slice(0, 6).map(t => wfFromTemplate(t)); db.settings.wfSeeded = true; }
    cloud.on = true; $('#auth').hidden = true; setSync('ok');
    if (['tech', 'sub'].includes(role) && (!location.hash || location.hash === '#/' || location.hash === '#/dashboard')) location.hash = '#/field';
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
  const inviteToken = new URLSearchParams(location.search).get('invite');
  if (inviteToken && /^[a-f0-9]{64}$/.test(inviteToken)) { await cloud.sb.auth.signOut().catch(() => {}); joinScreen(inviteToken); return; }
  cloud.sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY') { setTimeout(() => authScreen('newpass'), 0); return; }
    if (ev === 'SIGNED_IN' && session && !cloud.on) setTimeout(() => enter(session.user), 0);
  });
  const { data: { session } } = await cloud.sb.auth.getSession();
  if (session) enter(session.user); else if (!cloud.entering) authScreen('login');
  window.addEventListener('beforeunload', e => { if (cloud.on && (cloud.busy || $('#syncStatus').classList.contains('saving'))) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('online', () => cloud.on && sync());
}

/* ═════════════ PHASE 3 — INTEGRATIONS, ACCOUNTING & AUTOMATION ═════════════ */
const hash36 = s => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36); };
const daysSince = d => d ? Math.floor((Date.now() - new Date(d).getTime()) / DAY) : 0;
const P3_COLLS = ['ledger', 'exceptions', 'runs', 'alerts', 'appts'];
const isFin = () => !cloud.on || ['owner', 'admin', 'finance'].includes(cloud.role);
const memberNames = () => [...new Set([...db.techs.map(t => t.name), ...(cloud.members || []).map(m => m.name || m.email)].filter(Boolean))].sort();

// ── Settings defaults ──
const LEAD_SOURCE_DEFAULTS = [
  { key: 'web', label: 'Website', sources: 'website, web form, web, organic, nexispower.com', division: 'auto', pipeline: 'marketing' },
  { key: 'meta', label: 'Meta (Facebook / Instagram)', sources: 'facebook, instagram, meta, fb, ig, paid social', division: 'auto', pipeline: 'marketing' },
  { key: 'hvac_forms', label: 'HVAC forms', formNames: 'hvac, heat pump', division: 'hvac', pipeline: 'marketing' },
  { key: 'solar_cal', label: 'Solar calendar', calendarNames: 'solar', division: 'solar', pipeline: 'sales' },
  { key: 'lef2026v2', label: 'Last English Form 2026 (v2)', formNames: 'last english form 2026 (v2), last english form 2026 v2', division: 'auto', pipeline: 'marketing', lang: 'en' },
];
const ALERT_DEFAULTS = { taskEscalateDays: 2, blockedDays: 3, permitDays: 21, interconnectDays: 30, leadHours: 4, doneNotInvoicedDays: 2, poPendingDays: 1, dayCapacity: 10, escalateTo: '' };
const COMM_PAY = { signed: 'Contract signed', installed: 'Installation complete', collected50: '50% collected', collected: 'Paid in full' };
function p3Init() {
  P3_COLLS.forEach(k => db[k] = db[k] || []);
  const s = db.settings || (db.settings = {});
  if (!s.leadSources) s.leadSources = JSON.parse(JSON.stringify(LEAD_SOURCE_DEFAULTS));
  s.alertRules = { ...ALERT_DEFAULTS, ...(s.alertRules || {}) };
  if (!s.overhead) s.overhead = { mode: 'pct_revenue', pct: 10, flat: 0, note: 'Company overhead (office, vehicles, insurance, marketing) allocated as a % of each project’s contract value.' };
  if (!s.commRules) s.commRules = [{ id: uid(), name: 'Sales rep — standard', division: 'any', basis: 'gross', rate: 10, flat: 0, payWhen: 'installed', from: '2026-01-01', to: '', createdAt: iso(new Date()), createdBy: 'system' }];
  if (s.outboundLive == null) s.outboundLive = false;
}

// ── Run log (registro de ejecuciones) ──
function runLog(kind, detail, extra = {}) {
  p3Init();
  const r = { id: 'r-' + uid(), kind, system: 'OpsBoss', ts: iso(new Date()), status: 'ok', detail, by: me(), attempts: 1, ...extra };
  db.runs.unshift(r);
  if (db.runs.length > 500) db.runs = db.runs.slice(0, 500);
  return r;
}
const RUN_ST = { ok: ['OK', 'ok'], duplicate: ['Skipped (duplicate)', ''], warning: ['Warning', 'warn'], error: ['Failed', 'bad'], test: ['Test mode', 'info'], blocked: ['Blocked (consent)', 'warn'] };
const recentRun = (key, mins = 10) => (db.runs || []).find(r => r.key === key && Date.now() - new Date(r.ts) < mins * 60000);

// ── Alerts ──
function alertsAll() {
  p3Init();
  const R = db.settings.alertRules, out = [], today = ymd(new Date());
  const add = a => out.push({ level: 1, ...a });
  (db.tasks || []).filter(t => !t.done && t.due < today).forEach(t => { const age = Math.floor((sod(new Date()) - parseLocal(t.due)) / DAY); add({ key: 'task:' + t.id, kind: 'Overdue task', sev: age >= R.taskEscalateDays ? 'bad' : 'warn', title: t.title, text: `${age} day${age === 1 ? '' : 's'} overdue${t.assignee ? ' · ' + ((tech(t.assignee) || {}).name || t.assignee) : ' · unassigned'}`, href: '#/tasks', age, owner: (tech(t.assignee) || {}).name || t.assignee || '', level: age >= R.taskEscalateDays * 2 ? 3 : age >= R.taskEscalateDays ? 2 : 1 }); });
  db.jobs.filter(j => j.status !== 'cancelled' && !(j.ops && j.ops.closed)).forEach(j => {
    projInit(j);
    j.blockers.filter(b => !b.resolvedAt).forEach(b => { const age = daysSince(b.ts || b.createdAt); if (age >= R.blockedDays || (b.followUp && b.followUp <= today)) add({ key: 'blk:' + j.id + ':' + b.id, kind: 'Blocked project', sev: age >= R.blockedDays * 2 ? 'bad' : 'warn', title: `${j.number} blocked ${age} d: ${b.reason}`, text: `${b.owner ? 'Owner ' + b.owner : 'No owner'}${b.followUp ? ' · follow up ' + fDate(parseLocal(b.followUp)) : ''}`, href: '#/job/' + j.id, age, owner: b.owner || '', level: age >= R.blockedDays * 2 ? 3 : 2 }); });
    if (canMoney() && (j.status === 'completed' || j.ops.closed)) { const F = finOf(j), age = daysSince(j.completedAt || j.start); if (F.unbilled > 0.009 && age >= R.doneNotInvoicedDays) add({ key: 'unbilled:' + j.id, kind: 'Done, not invoiced', sev: 'bad', title: `${j.number} completed ${age} d ago — ${money(F.unbilled)} not invoiced`, text: cust(j.customerId).name, href: '#/job/' + j.id, age, level: 2 }); }
  });
  db.permits.filter(p => p.status === 'submitted' && p.submitted).forEach(p => { const lim = /interconnection|PTO/i.test(p.type) ? R.interconnectDays : R.permitDays, age = Math.floor((Date.now() - parseLocal(p.submitted)) / DAY); const j = db.jobs.find(x => x.id === p.jobId); if (age > lim) add({ key: 'permit:' + p.id, kind: 'Permit delayed', sev: 'bad', title: `${p.type} permit pending ${age} days (limit ${lim})`, text: `${p.jurisdiction || ''}${j ? ' · ' + j.number + ' · ' + cust(j.customerId).name : ''}`, href: j ? '#/job/' + j.id : '#/permits', age, level: age > lim * 1.5 ? 3 : 2 }); });
  db.permits.filter(p => p.status === 'rejected').forEach(p => { const j = db.jobs.find(x => x.id === p.jobId); add({ key: 'permitrej:' + p.id, kind: 'Permit corrections', sev: 'warn', title: `${p.type} permit needs corrections`, text: j ? j.number + ' · ' + cust(j.customerId).name : '', href: '#/permits', age: 0 }); });
  db.leads.filter(l => ['new', 'warm'].includes(l.stage)).forEach(l => { const h = (Date.now() - new Date(l.createdAt)) / 36e5; if (h >= R.leadHours) add({ key: 'lead:' + l.id, kind: 'Lead not contacted', sev: h >= 24 ? 'bad' : 'warn', title: `${cust(l.customerId).name} waiting ${h >= 48 ? Math.floor(h / 24) + ' days' : Math.floor(h) + ' h'}`, text: `${l.title} · ${l.source || ''}${l.owner ? ' · ' + ((tech(l.owner) || {}).name || l.owner) : ' · no owner'}`, href: '#/pipeline', age: Math.floor(h / 24), owner: (tech(l.owner) || {}).name || l.owner || '', level: h >= 48 ? 3 : h >= 24 ? 2 : 1 }); });
  if (canMoney()) {
    db.invoices.filter(i => invStatus(i) === 'overdue').forEach(i => { const age = Math.floor((Date.now() - parseLocal(i.due)) / DAY); add(i.disputed ? { key: 'disp:' + i.id, kind: 'Disputed invoice', sev: 'info', title: `${i.number} disputed — reminders paused`, text: `${cust(i.customerId).name} · ${money(invBal(i))}`, href: '#/invoice/' + i.id, age } : { key: 'inv:' + i.id, kind: 'Overdue invoice', sev: 'bad', title: `${i.number} overdue ${age} d · ${money(invBal(i))}`, text: `${cust(i.customerId).name}${i.payer ? ' · payer ' + i.payer : ''}`, href: '#/invoice/' + i.id, age, level: age > 30 ? 3 : age > 14 ? 2 : 1 }); });
    (db.pos || []).filter(p => p.status === 'pending' && daysSince(p.createdAt) >= R.poPendingDays).forEach(p => add({ key: 'po:' + p.id, kind: 'Approval needed', sev: 'warn', title: `PO ${p.number} · ${p.vendor} · ${money(p.amount)} waiting for approval`, text: (db.jobs.find(j => j.id === p.projectId) || {}).number || '', href: '#/purchasing', age: daysSince(p.createdAt), level: 2 }));
  }
  const tmr = ymd(addDays(new Date(), 1));
  (db.appts || []).filter(a => a.status === 'booked' && a.start && ymd(a.start) <= tmr && new Date(a.start) >= new Date()).forEach(a => { const t = (db.tasks || []).find(x => x.id === a.prepTaskId); if (!t || !t.done) add({ key: 'appt:' + a.id, kind: 'Visit tomorrow', sev: 'info', title: `${a.title}`, text: `${fDay(a.start)} ${fTime(a.start)} · prep not done`, href: '#/schedule', age: 0 }); });
  calConflicts().forEach(c => add({ key: 'cal:' + c.key, kind: 'Schedule conflict', sev: 'warn', title: c.title, text: c.text, href: '#/schedule', age: 0 }));
  if (isFin()) { const ex = exceptionsOpen(); if (ex.length) add({ key: 'exc:count', kind: 'Accounting exceptions', sev: 'warn', title: `${ex.length} accounting exception${ex.length > 1 ? 's' : ''} to review`, text: [...new Set(ex.map(e => EXC_KIND[e.kind]))].join(' · '), href: '#/exceptions', age: 0 }); }
  (db.alerts || []).filter(a => a.kind && a.kind !== 'ack' && !(a.readBy || []).includes(me()) && daysSince(a.ts) < 14).forEach(a => add({ key: 'note:' + a.id, kind: a.kind === 'lead.new' ? 'New lead' : a.kind === 'ticket.new' ? 'Service request' : 'Notice', sev: a.sev || 'info', title: a.title, text: a.text, href: a.link ? ({ lead: '#/pipeline', job: '#/job/', invoice: '#/invoice/', ticket: '#/ticket/' }[a.link.kind] || '#/') + (['job', 'invoice', 'ticket'].includes(a.link.kind) ? a.link.id : '') : '#/alerts', age: daysSince(a.ts), stored: a.id }));
  p4Alerts(add);
  const acks = new Map((db.alerts || []).filter(a => a.kind === 'ack').map(a => [a.ackKey, a]));
  return out.map(a => { const k = acks.get(a.key); return { ...a, acked: !!(k && (!k.until || k.until > iso(new Date())) && (k.level || 1) >= (a.level || 1)) }; }).sort((a, b) => ({ bad: 0, warn: 1, info: 2 }[a.sev] - { bad: 0, warn: 1, info: 2 }[b.sev]) || b.age - a.age);
}
const LVL = { 1: 'Owner', 2: 'Manager', 3: 'Direction' };
ROUTES.alerts = () => {
  const all = alertsAll(), show = state.filters.alAll ? all : all.filter(a => !a.acked);
  const groups = {}; show.forEach(a => (groups[a.kind] = groups[a.kind] || []).push(a));
  return head('Alerts', `${all.filter(a => !a.acked).length} open · escalation: owner → manager → direction by age (rules in Settings)`, `<button class="btn" data-act="filt" data-f="alAll" data-v="${state.filters.alAll ? '' : '1'}">${state.filters.alAll ? 'Hide acknowledged' : 'Show acknowledged'}</button><button class="btn" data-act="alertScan">↻ Run escalation now</button>`) +
    (Object.entries(groups).map(([k, list]) => `<div class="card mb"><div class="card-h"><h3>${esc(k)} <span class="muted small">${list.length}</span></h3></div><div class="card-b">${list.map(a => `<div class="list-item"><span class="pill ${a.sev}">${a.sev === 'bad' ? '●' : a.sev === 'warn' ? '▲' : 'i'}</span><div style="flex:1;min-width:0"><a href="${a.href}" class="b small">${esc(a.title)}</a><div class="small muted">${esc(a.text || '')}${a.level > 1 ? ` · <b>escalated to ${LVL[a.level]}</b>` : ''}</div></div>${a.acked ? '<span class="pill">Acknowledged</span>' : `<button class="btn sm" data-act="alertAck" data-k="${esc(a.key)}" data-l="${a.level || 1}" ${a.stored ? `data-s="${a.stored}"` : ''}>✓ Got it</button><button class="btn sm ghost" data-act="alertSnooze" data-k="${esc(a.key)}" title="Snooze 1 day">⏰</button>`}</div>`).join('')}</div></div>`).join('') || '<div class="card"><div class="empty">No alerts — everything is on track ✓</div></div>');
};
// Escalación: crea (una sola vez por alerta y nivel) una tarea para el responsable del nivel.
async function alertScan(manual) {
  if (!db) return; p3Init();
  if (cloud.on) { try { const { data: mine } = await cloud.sb.rpc('opsboss_lock', { p_key: 'alert-scan:' + ymd(new Date()) + ':' + new Date().getHours() + (manual ? ':' + uid() : '') }); if (!mine) return; } catch (e) { return; } }
  const R = db.settings.alertRules; let n = 0;
  for (const a of alertsAll()) {
    if (a.level < 2 || a.acked) continue;
    const dedupe = 'esc:' + a.key + ':L' + a.level;
    if ((db.tasks || []).some(t => t.dedupe === dedupe)) continue;
    const who = a.level >= 3 ? (R.directionName || R.escalateTo) : (R.escalateTo || '');
    const t = db.techs.find(x => x.name === who);
    db.tasks.unshift({ id: uid(), title: `Escalated (${LVL[a.level]}): ${a.title}`, notes: a.text, due: ymd(new Date()), assignee: t ? t.id : '', done: false, wf: 'Alert escalation', createdAt: iso(new Date()), dedupe, link: null });
    n++;
  }
  runLog('alerts.scan', `Alert scan: ${n} escalation task${n === 1 ? '' : 's'} created`, { key: 'alerts.scan', status: 'ok' });
  save(); if (manual) { toast(`${n} escalation task${n === 1 ? '' : 's'} created`); render(); }
}

// ── Calendar conflicts ──
function calConflicts() {
  const R = (db.settings.alertRules || ALERT_DEFAULTS), out = [], from = addDays(sod(new Date()), -1), to = addDays(new Date(), 45);
  const jobs = db.jobs.filter(j => j.start && j.status !== 'cancelled' && j.status !== 'completed' && new Date(j.start) >= from && new Date(j.start) <= to);
  for (const t of db.techs) {
    const mine = jobs.filter(j => (j.techIds || []).includes(t.id)).sort((a, b) => new Date(a.start) - new Date(b.start));
    for (let i = 0; i < mine.length; i++) for (let k = i + 1; k < mine.length; k++) { const a = mine[i], b = mine[k]; if (new Date(b.start) < jobEnd(a) && sameDay(a.start, b.start)) out.push({ key: 'dbl:' + t.id + ':' + a.id + ':' + b.id, jobs: [a.id, b.id], title: `${t.name} double-booked ${fDay(a.start)}`, text: `${a.number} ${fTime(a.start)}–${fTime(jobEnd(a))} overlaps ${b.number} ${fTime(b.start)}` }); }
    const byDay = {}; mine.forEach(j => { const d = ymd(j.start); byDay[d] = (byDay[d] || 0) + num(j.duration); });
    Object.entries(byDay).forEach(([d, h]) => { if (h > R.dayCapacity) out.push({ key: 'cap:' + t.id + ':' + d, jobs: mine.filter(j => ymd(j.start) === d).map(j => j.id), title: `${t.name} over capacity ${fDay(parseLocal(d))}`, text: `${h} h scheduled (capacity ${R.dayCapacity} h)` }); });
  }
  jobs.forEach(j => { const b = blockersOf(j); if (b.length) out.push({ key: 'blk:' + j.id, jobs: [j.id], title: `${j.number} scheduled while blocked`, text: b[0].reason }); });
  const ap = (db.appts || []).filter(a => a.status === 'booked' && a.start && a.assignedTo && new Date(a.start) >= from);
  for (let i = 0; i < ap.length; i++) for (let k = i + 1; k < ap.length; k++) { const a = ap[i], b = ap[k]; if (a.assignedTo === b.assignedTo && new Date(a.start) < new Date(b.end || new Date(new Date(b.start).getTime() + 36e5)) && new Date(b.start) < new Date(a.end || new Date(new Date(a.start).getTime() + 36e5))) out.push({ key: 'appt:' + a.id + ':' + b.id, jobs: [], title: `Overlapping visits for ${a.assignedTo}`, text: `${a.title} / ${b.title} · ${fDay(a.start)}` }); }
  return out;
}

// ── Commissions (versioned rules) ──
function commRuleFor(j, at) {
  const d = ymd(at || (j.fin && j.fin.budget && j.fin.budget.lockedAt) || j.createdAt || new Date());
  const rules = (db.settings.commRules || []).filter(r => r.from <= d && (!r.to || r.to >= d));
  return rules.find(r => r.division === j.division) || rules.find(r => r.division === 'any') || null;
}
function commPayable(j, r) {
  const F = finOf(j);
  if (r.payWhen === 'signed') return { ok: !!(j.fin.budget || j.estimateId), why: 'Contract signed' };
  if (r.payWhen === 'installed') { const ii = flowOf(j).findIndex(s => /install/.test(s[0])); return { ok: j.status === 'completed' || (ii >= 0 && stageIdx(j) > ii), why: 'Installation complete' }; }
  if (r.payWhen === 'collected50') return { ok: F.collected >= F.revenue * 0.5 - 0.01, why: `Collected ${pct(F.revenue ? F.collected / F.revenue : 0)} of 50%` };
  return { ok: F.revenue > 0 && F.collected >= F.revenue - 0.01, why: `Collected ${pct(F.revenue ? F.collected / F.revenue : 0)} of 100%` };
}
function commSimulate(j, rep) {
  projInit(j);
  const r = commRuleFor(j); if (!r) return null;
  const F = finOf(j), existing = sumBy(commsOf(j).filter(c => c.status !== 'void'), c => c.amount);
  const basisAmt = r.basis === 'gross' ? F.gross + existing : F.revenue;
  const amount = Math.max(0, Math.round((basisAmt * num(r.rate) / 100 + num(r.flat)) * 100) / 100);
  return { rule: r, basisAmt, amount, rep, pay: commPayable(j, r), trace: `${r.basis === 'gross' ? 'Projected gross profit (before commissions)' : 'Approved contract value'} ${money2(basisAmt)} × ${num(r.rate)}%${num(r.flat) ? ' + ' + money2(r.flat) : ''} = ${money2(amount)} · rule "${r.name}" effective ${r.from}${r.to ? ' → ' + r.to : ''}` };
}
function commModal(j) {
  if (!canRates()) { toast('Only owner, admin or finance can see commissions'); return; }
  const reps = memberNames();
  modal({ title: `Commission · ${j.number}`, body: `<label class="f">Sales rep<input class="inp" id="cmRep" list="cmReps" value="${esc(j.salesRep || '')}"><datalist id="cmReps">${reps.map(n => `<option value="${esc(n)}">`).join('')}</datalist></label><div id="cmOut" class="mt"></div>`, foot: `<button class="btn" data-dismiss>Close</button>${canApprove() ? '<button class="btn primary" id="cmOk">Approve commission</button>' : ''}`, onMount(bg, close) {
    const draw = () => { const s = commSimulate(j, $('#cmRep', bg).value); $('#cmOut', bg).innerHTML = s ? `<div class="card"><div class="card-b"><div class="kpi"><div class="l">Simulated commission</div><div class="v">${money2(s.amount)}</div></div><p class="small">${esc(s.trace)}</p><p class="small">Payable when: <b>${COMM_PAY[s.rule.payWhen]}</b> — ${s.pay.ok ? '<span class="pill ok">condition met</span>' : `<span class="pill warn">not yet (${esc(s.pay.why)})</span>`}</p><p class="small muted">Approving adds it to the project as a pending commission cost; marking it paid moves it to actual cost.</p></div></div>` : '<div class="auth-msg bad">No commission rule is effective for this project’s contract date and service. Add one in Commissions.</div>'; };
    $('#cmRep', bg).oninput = draw; draw();
    const okb = $('#cmOk', bg); if (okb) okb.onclick = () => { const rep = $('#cmRep', bg).value.trim(); if (!rep) { toast('Choose the sales rep'); return; } const s = commSimulate(j, rep); if (!s) return; j.salesRep = rep; compOf(j, true).commissions.push({ id: uid(), rep, ruleId: s.rule.id, ruleName: s.rule.name, ruleFrom: s.rule.from, basis: s.rule.basis, basisAmt: s.basisAmt, rate: s.rule.rate, flat: s.rule.flat, amount: s.amount, payWhen: s.rule.payWhen, status: 'approved', approvedBy: me(), approvedAt: iso(new Date()), trace: s.trace }); hist(j, `Commission approved for ${rep}: ${money2(s.amount)} (${s.rule.name})`); runLog('commission.approve', `${j.number} · ${rep} · ${money2(s.amount)}`); close(); save(); render(); toast('Commission approved'); };
  } });
}
ROUTES.commissions = () => {
  if (!canRates()) return head('Commissions', '') + '<div class="card"><div class="empty">Restricted: only owner, admin and finance can see compensation.</div></div>';
  p3Init();
  const rows = db.jobs.flatMap(j => commsOf(projInit(j)).map(c => ({ j, c, pay: commPayable(j, c) })));
  const rules = [...db.settings.commRules].sort((a, b) => a.name.localeCompare(b.name) || b.from.localeCompare(a.from));
  return head('Commissions', 'Versioned rules by effective date · simulate before approving · payable when the rule’s condition is met', '<button class="btn primary" data-act="commRuleNew">＋ Rule</button>') + `
  <div class="grid g4 mb">${kpi('Approved, not paid', money(sumBy(rows.filter(r => r.c.status === 'approved'), r => r.c.amount)))}${kpi('Payable now', money(sumBy(rows.filter(r => r.c.status === 'approved' && r.pay.ok), r => r.c.amount)))}${kpi('Paid', money(sumBy(rows.filter(r => r.c.status === 'paid'), r => r.c.amount)))}${kpi('Rules (all versions)', rules.length)}</div>
  <div class="card mb"><div class="card-h"><h3>Project commissions</h3></div><div class="table-wrap"><table><thead><tr><th>Project</th><th>Rep</th><th>Rule</th><th class="right">Amount</th><th>Payable</th><th>Status</th><th></th></tr></thead><tbody>
  ${rows.map(({ j, c, pay }) => `<tr><td><a href="#/job/${j.id}">${j.number}</a> · ${esc(cust(j.customerId).name)}</td><td>${esc(c.rep)}</td><td class="small">${esc(c.ruleName)} (from ${esc(c.ruleFrom)})<div class="muted">${esc(c.trace || '')}</div></td><td class="right b">${money2(c.amount)}</td><td>${c.status === 'paid' ? '' : pay.ok ? '<span class="pill ok">Yes</span>' : `<span class="pill warn">${esc(pay.why)}</span>`}</td><td><span class="pill ${c.status === 'paid' ? 'ok' : c.status === 'void' ? '' : 'info'}">${c.status}</span></td><td class="right">${c.status === 'approved' && canApprove() ? `<button class="btn sm ok" data-act="commPaid" data-id="${j.id}" data-c="${c.id}" ${pay.ok ? '' : 'title="Condition not met yet"'}>Mark paid</button><button class="btn sm ghost" data-act="commVoid" data-id="${j.id}" data-c="${c.id}">Void</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No commissions yet. Open a project → Financials → Commission to simulate and approve.</td></tr>'}
  </tbody></table></div></div>
  <div class="card"><div class="card-h"><h3>Rules & versions</h3></div><div class="table-wrap"><table><thead><tr><th>Rule</th><th>Service</th><th>Basis</th><th class="right">Rate</th><th class="right">Flat</th><th>Payable when</th><th>Effective</th><th></th></tr></thead><tbody>
  ${rules.map(r => `<tr><td class="b">${esc(r.name)}</td><td>${r.division === 'any' ? 'All' : DIV[r.division] ? DIV[r.division].name : r.division}</td><td>${r.basis === 'gross' ? 'Gross profit' : 'Contract value'}</td><td class="right">${num(r.rate)}%</td><td class="right">${money2(r.flat)}</td><td>${COMM_PAY[r.payWhen]}</td><td>${esc(r.from)} → ${esc(r.to || 'open')}</td><td class="right">${!r.to ? `<button class="btn sm" data-act="commRuleVersion" data-r="${r.id}">New version</button>` : '<span class="small muted">superseded</span>'}</td></tr>`).join('')}
  </tbody></table></div><div class="card-b small muted">Rules are never edited in place: “New version” closes the current one the day before the new effective date, so past commissions keep the rule that applied when the contract was signed.</div></div>`;
};
function commRuleModal(base) {
  form({ title: base ? `New version · ${base.name}` : 'New commission rule', fields: [
    { k: 'name', label: 'Name', value: base ? base.name : '', required: true }, { k: 'division', label: 'Service', type: 'select', options: [['any', 'All services'], ...divOptions()], value: base ? base.division : 'any' },
    { k: 'basis', label: 'Basis', type: 'select', options: [['contract', 'Approved contract value'], ['gross', 'Projected gross profit']], value: base ? base.basis : 'contract' },
    { k: 'rate', label: 'Rate (%)', type: 'number', step: '0.01', value: base ? base.rate : 5 }, { k: 'flat', label: 'Flat amount ($)', type: 'number', step: '0.01', value: base ? base.flat : 0 },
    { k: 'payWhen', label: 'Payable when', type: 'select', options: Object.entries(COMM_PAY), value: base ? base.payWhen : 'installed' },
    { k: 'from', label: 'Effective from', type: 'date', value: ymd(new Date()), required: true },
  ], onSave(v) {
    if (base && v.from <= base.from) { toast('The new version must start after ' + base.from); return false; }
    if (base) base.to = ymd(addDays(parseLocal(v.from), -1));
    db.settings.commRules.push({ id: uid(), ...v, rate: num(v.rate), flat: num(v.flat), to: '', createdAt: iso(new Date()), createdBy: me(), prevId: base ? base.id : null });
    runLog('commission.rule', `${base ? 'New version of' : 'New'} commission rule "${v.name}" from ${v.from}`);
  } });
}

// ── Ledger (QuickBooks) ──
const LEDGER_T = { invoice: 'Invoice', payment: 'Payment', credit: 'Credit memo', salesreceipt: 'Sales receipt', refund: 'Refund', bill: 'Vendor bill', billpayment: 'Bill payment', vendorcredit: 'Vendor credit', expense: 'Expense', deposit: 'Deposit', journal: 'Journal entry' };
const REV_T = ['invoice', 'salesreceipt', 'credit', 'refund'], COST_T = ['bill', 'expense', 'vendorcredit'];
const QB_TYPE_MAP = [[/^invoice$/i, 'invoice'], [/^payment|receive payment/i, 'payment'], [/credit memo/i, 'credit'], [/sales receipt/i, 'salesreceipt'], [/refund/i, 'refund'], [/^bill payment|bill pmt/i, 'billpayment'], [/^bill$/i, 'bill'], [/vendor credit|supplier credit/i, 'vendorcredit'], [/expense|check|credit card|cash purchase/i, 'expense'], [/deposit/i, 'deposit'], [/journal/i, 'journal']];
const ledgerHasData = () => (db.ledger || []).length > 0;
function csvParse(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim()));
}
const amt = s => { const t = String(s || '').replace(/[$,\s]/g, ''); const neg = /^\(.*\)$/.test(t) || t.startsWith('-'); const v = parseFloat(t.replace(/[()-]/g, '')); return isFinite(v) ? (neg ? -v : v) : NaN; };
const qbDate = s => { const t = String(s || '').trim(); let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; } m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : ''; };
// Importa un CSV exportado de QuickBooks ("Transaction List by Date" / "Transaction Detail by Account" o similar).
function importLedgerCsv(text, fileName) {
  p3Init();
  const rows = csvParse(text);
  const hi = rows.findIndex(r => r.map(x => x.trim().toLowerCase()).includes('date') && r.some(x => /amount|total/i.test(x)));
  if (hi < 0) throw new Error('Could not find the header row (needs at least “Date” and “Amount” columns).');
  const H = rows[hi].map(x => x.trim().toLowerCase());
  const col = (...names) => { for (const n of names) { const i = H.indexOf(n); if (i >= 0) return i; } for (const n of names) { const i = H.findIndex(h => h.includes(n)); if (i >= 0) return i; } return -1; };
  const C = { date: col('date', 'transaction date'), type: col('transaction type', 'type'), num: col('num', 'no.', 'number', 'ref no.'), name: col('name', 'customer', 'vendor', 'payee', 'supplier'), memo: col('memo/description', 'memo', 'description'), account: col('account', 'split'), amount: col('amount', 'total'), balance: col('open balance', 'balance'), due: col('due date'), klass: col('class') };
  if (C.date < 0 || C.amount < 0) throw new Error('Missing Date or Amount column.');
  const byId = new Map(db.ledger.map(l => [l.id, l])), apiKey = new Set(db.ledger.filter(l => l.src === 'qbo').map(l => l.type + '|' + l.num + '|' + String(l.name).toLowerCase()));
  const occ = {}; const batch = iso(new Date()); let created = 0, updated = 0, same = 0, skipped = 0;
  for (const r of rows.slice(hi + 1)) {
    const date = qbDate(r[C.date]), a = amt(r[C.amount]);
    if (!date || !isFinite(a)) { skipped++; continue; }
    const rawType = C.type >= 0 ? String(r[C.type]).trim() : '';
    const type = (QB_TYPE_MAP.find(([re]) => re.test(rawType)) || [, a < 0 ? 'expense' : 'deposit'])[1];
    const g = k => C[k] >= 0 ? String(r[C[k]] || '').trim() : '';
    const rec = { src: 'csv', type, qbType: rawType, num: g('num'), date, name: g('name'), memo: g('memo'), account: g('account'), klass: g('klass'), amount: Math.abs(a), signed: a, due: qbDate(g('due')) || undefined, balance: C.balance >= 0 && isFinite(amt(r[C.balance])) ? Math.abs(amt(r[C.balance])) : undefined, file: fileName };
    if (rec.num && apiKey.has(type + '|' + rec.num + '|' + rec.name.toLowerCase())) { skipped++; continue; }
    const base = [type, rec.num, date, rec.name.toLowerCase(), rec.amount.toFixed(2), rec.num ? '' : rec.memo.toLowerCase()].join('|');
    occ[base] = (occ[base] || 0) + 1;
    const id = 'csv-' + hash36(base + '#' + occ[base]);
    const old = byId.get(id);
    if (old) { const keep = { projectId: old.projectId, customerId: old.customerId, overhead: old.overhead, note: old.note, assignedBy: old.assignedBy, matchedBy: old.matchedBy }; const nx = { ...old, ...rec, ...Object.fromEntries(Object.entries(keep).filter(([, v]) => v !== undefined)) }; if (canon(nx) === canon(old)) same++; else { Object.assign(old, nx); updated++; } }
    else { const n = { id, ...rec, batch, importedAt: batch, importedBy: me() }; db.ledger.push(n); byId.set(id, n); created++; }
  }
  const m = autoMatchLedger();
  const r = runLog('ledger.import', `CSV "${fileName}": ${created} new, ${updated} updated, ${same} unchanged, ${skipped} skipped · ${m} auto-assigned to projects`, { system: 'QuickBooks', key: 'csv:' + fileName });
  db.settings.ledgerUpdatedAt = batch; db.settings.ledgerSource = 'CSV import (' + fileName + ')';
  save();
  return { created, updated, same, skipped, matched: m, run: r };
}
const jobByNumber = n => db.jobs.find(j => j.number && String(n || '').toUpperCase().includes(j.number.toUpperCase()));
const invByNum = n => n && db.invoices.find(i => i.number === n || i.number === 'INV-' + n || i.number.replace(/\D/g, '') === String(n).replace(/\D/g, ''));
const billByNum = (vendor, n) => n && (db.bills || []).find(b => b.number === n && b.vendor.trim().toLowerCase() === String(vendor || '').trim().toLowerCase());
function autoMatchLedger() {
  let n = 0;
  for (const l of db.ledger || []) {
    if (l.projectId || l.overhead) continue;
    let pid = '', by = '';
    if (l.type === 'invoice') { const i = invByNum(l.num); if (i && i.jobId) { pid = i.jobId; by = 'invoice #'; l.customerId = i.customerId; } }
    if (!pid && l.type === 'payment' && (l.applied || []).length) { const ps = new Set((l.applied || []).map(a => { const qi = db.ledger.find(x => x.src === l.src && x.type === 'invoice' && x.qbId === a.qbId); const i = qi && invByNum(qi.num); return i && i.jobId; }).filter(Boolean)); if (ps.size === 1) { pid = [...ps][0]; by = 'applied invoice'; } }
    if (!pid && l.type === 'bill') { const b = billByNum(l.name, l.num); if (b) { const ps = new Set(b.lines.map(x => x.projectId).filter(Boolean)); if (ps.size === 1) { pid = [...ps][0]; by = 'OpsBoss bill'; } else if (ps.size > 1) { l.splits = b.lines.filter(x => x.projectId).map(x => ({ projectId: x.projectId, amount: x.amount })); l.matchedBy = 'OpsBoss bill (split)'; n++; continue; } } }
    if (!pid) { const j = jobByNumber([l.memo, l.klass, ...(l.lines || []).map(x => x.customer + ' ' + x.desc + ' ' + x.klass)].join(' ')); if (j) { pid = j.id; by = 'project # in memo/class'; } }
    if (!pid && REV_T.includes(l.type) && l.name) { const c = db.customers.find(x => x.name.trim().toLowerCase() === l.name.trim().toLowerCase()); if (c) { l.customerId = c.id; const js = db.jobs.filter(j => j.customerId === c.id && j.status !== 'cancelled'); if (js.length === 1) { pid = js[0].id; by = 'only project of customer'; } } }
    if (pid) { l.projectId = pid; l.matchedBy = by; n++; }
  }
  return n;
}
// Diferencias de conciliación entre OpsBoss y QuickBooks.
function reconcile() {
  const L = db.ledger || [], qInv = L.filter(l => l.type === 'invoice'), qBill = L.filter(l => l.type === 'bill'), diffs = [];
  if (qInv.length) {
    const minD = qInv.reduce((m, l) => l.date < m ? l.date : m, '9999');
    db.invoices.filter(i => !['void', 'draft'].includes(i.status) && ymd(i.createdAt) >= minD).forEach(i => {
      const q = qInv.find(l => invByNum(l.num) === i);
      if (!q) diffs.push({ key: 'inv-missing:' + i.id, title: `${i.number} is in OpsBoss but not in QuickBooks`, amount: invTotal(i), href: '#/invoice/' + i.id });
      else { if (Math.abs(num(q.amount) - invTotal(i)) > 0.01) diffs.push({ key: 'inv-amt:' + i.id + ':' + q.amount, title: `${i.number}: OpsBoss ${money2(invTotal(i))} vs QuickBooks ${money2(q.amount)}`, amount: invTotal(i) - num(q.amount), href: '#/invoice/' + i.id }); if (q.balance != null && Math.abs(num(q.balance) - invBal(i)) > 0.01) diffs.push({ key: 'inv-bal:' + i.id + ':' + q.balance, title: `${i.number} balance: OpsBoss ${money2(invBal(i))} vs QuickBooks ${money2(q.balance)} (payment recorded in only one system)`, amount: invBal(i) - num(q.balance), href: '#/invoice/' + i.id }); }
    });
    qInv.filter(l => !invByNum(l.num)).forEach(l => diffs.push({ key: 'qinv-only:' + l.id, title: `QuickBooks invoice ${l.num || '(no #)'} · ${l.name} has no match in OpsBoss`, amount: l.amount, href: '#/accounting' }));
  }
  if (qBill.length) {
    qBill.forEach(l => { const b = billByNum(l.name, l.num); if (b && Math.abs(sumBy(b.lines, x => x.amount) - num(l.amount)) > 0.01) diffs.push({ key: 'bill-amt:' + b.id + ':' + l.amount, title: `Bill ${l.name} ${l.num}: OpsBoss ${money2(sumBy(b.lines, x => x.amount))} vs QuickBooks ${money2(l.amount)}`, amount: sumBy(b.lines, x => x.amount) - num(l.amount), href: '#/purchasing' }); });
    const minB = qBill.reduce((m, l) => l.date < m ? l.date : m, '9999');
    (db.bills || []).filter(b => b.date >= minB && b.number && !qBill.some(l => billByNum(l.name, l.num) === b)).forEach(b => diffs.push({ key: 'bill-missing:' + b.id, title: `Bill ${b.vendor} ${b.number} is in OpsBoss but not in QuickBooks`, amount: sumBy(b.lines, x => x.amount), href: '#/purchasing' }));
  }
  return diffs;
}

// ── Exceptions inbox ──
const EXC_KIND = { no_project: 'Transaction without project', unapplied: 'Unapplied payment', sync: 'Sync difference', receipt: 'Missing receipt', duplicate: 'Possible duplicate', unmapped: 'Unmapped lead source' };
function exceptionsAll() {
  p3Init();
  const out = [], add = e => out.push(e);
  (db.ledger || []).filter(l => [...REV_T, ...COST_T].includes(l.type) && !l.projectId && !l.overhead && !(l.splits || []).length && !(l.type === 'deposit')).forEach(l => add({ key: 'np:' + l.id, kind: 'no_project', title: `${LEDGER_T[l.type]} ${l.num || ''} · ${l.name || l.account || ''}`, detail: `${fDate(parseLocal(l.date))} · ${l.memo || ''}`, amount: l.amount, ledgerId: l.id }));
  (db.bills || []).forEach(b => b.lines.filter(x => !x.projectId).forEach(x => add({ key: 'npb:' + b.id + ':' + x.id, kind: 'no_project', title: `OpsBoss bill ${b.vendor} ${b.number || ''} (${x.category})`, detail: fDate(parseLocal(b.date)), amount: x.amount, href: '#/purchasing' })));
  (db.ledger || []).filter(l => l.type === 'payment' && num(l.unapplied) > 0.009).forEach(l => add({ key: 'ua:' + l.id, kind: 'unapplied', title: `Payment ${l.ref || l.num || ''} · ${l.name}`, detail: `${fDate(parseLocal(l.date))} · ${money2(l.unapplied)} not applied to an invoice`, amount: l.unapplied, ledgerId: l.id }));
  (db.ledger || []).filter(l => l.type === 'payment' && !l.projectId && !num(l.unapplied) && !(l.applied || []).length).forEach(l => add({ key: 'upl:' + l.id, kind: 'unapplied', title: `Payment ${l.ref || l.num || ''} · ${l.name}`, detail: `${fDate(parseLocal(l.date))} · not linked to an invoice or project`, amount: l.amount, ledgerId: l.id }));
  reconcile().forEach(d => add({ key: 'sync:' + d.key, kind: 'sync', title: d.title, detail: '', amount: d.amount, href: d.href }));
  (db.bills || []).filter(b => !b.attachment && sumBy(b.lines, x => x.amount) > 0).forEach(b => add({ key: 'rcpt:' + b.id, kind: 'receipt', title: `Bill ${b.vendor} ${b.number || ''} has no receipt attached`, detail: fDate(parseLocal(b.date)), amount: sumBy(b.lines, x => x.amount), href: '#/purchasing' }));
  db.jobs.forEach(j => ((j.fin && j.fin.costs) || []).filter(c => !c.receipt && !/https?:\/\//.test(c.note || '') && num(c.amount) >= 250).forEach(c => add({ key: 'rcptc:' + j.id + ':' + c.id, kind: 'receipt', title: `${j.number} cost ${c.vendor || c.category} without receipt`, detail: fDate(parseLocal(c.date)), amount: c.amount, href: '#/job/' + j.id })));
  const bl = (db.bills || []).map(b => ({ b, t: sumBy(b.lines, x => x.amount) }));
  for (let i = 0; i < bl.length; i++) for (let k = i + 1; k < bl.length; k++) { const a = bl[i], c = bl[k]; if (a.b.vendor.trim().toLowerCase() === c.b.vendor.trim().toLowerCase() && Math.abs(a.t - c.t) < 0.01 && Math.abs(parseLocal(a.b.date) - parseLocal(c.b.date)) <= 5 * DAY) add({ key: 'dupb:' + [a.b.id, c.b.id].sort().join(':'), kind: 'duplicate', title: `Bills ${a.b.vendor} ${a.b.number || '—'} and ${c.b.number || '—'} have the same amount (${money2(a.t)}) within 5 days`, detail: '', amount: a.t, href: '#/purchasing' }); }
  const lg = {}; (db.ledger || []).filter(l => l.num && ['bill', 'invoice', 'expense'].includes(l.type)).forEach(l => { const k = l.type + '|' + l.num + '|' + String(l.name).toLowerCase(); (lg[k] = lg[k] || []).push(l); });
  Object.values(lg).filter(x => x.length > 1).forEach(x => add({ key: 'dupl:' + x.map(l => l.id).sort().join(':'), kind: 'duplicate', title: `${x.length} QuickBooks ${LEDGER_T[x[0].type]}s with # ${x[0].num} for ${x[0].name}`, detail: x.map(l => money2(l.amount)).join(' / '), amount: x[0].amount, href: '#/accounting' }));
  const dg = duplicateGroups(); if (dg.length) add({ key: 'dupc:' + dg.length, kind: 'duplicate', title: `${dg.length} group${dg.length > 1 ? 's' : ''} of possible duplicate customers`, detail: 'Review and merge', amount: 0, href: '#/duplicates' });
  db.leads.filter(l => l.sourceKey === 'unmapped' && !CLOSED.includes(l.stage)).forEach(l => add({ key: 'unm:' + l.id, kind: 'unmapped', title: `Lead ${cust(l.customerId).name} came from an unmapped HighLevel source`, detail: [l.sourceIds && l.sourceIds.formName, l.sourceIds && l.sourceIds.utm].filter(Boolean).join(' · ') || 'Add its form/calendar ID in Settings → Lead sources', amount: 0, href: '#/settings' }));
  const st = new Map((db.exceptions || []).map(e => [e.id, e]));
  return out.map(e => { const s = st.get('x-' + hash36(e.key)); return { ...e, id: 'x-' + hash36(e.key), status: s ? s.status : 'open', assignee: s ? s.assignee : '', note: s ? s.note : '', resolvedBy: s && s.resolvedBy, resolvedAt: s && s.resolvedAt }; });
}
const exceptionsOpen = () => exceptionsAll().filter(e => e.status === 'open');
function excState(id) { let s = db.exceptions.find(x => x.id === id); if (!s) { s = { id, status: 'open', assignee: '', note: '', history: [] }; db.exceptions.push(s); } return s; }
ROUTES.exceptions = () => {
  if (!isFin() && cloud.on && !['purchasing', 'ops'].includes(cloud.role)) return head('Exceptions', '') + '<div class="card"><div class="empty">Restricted to finance, purchasing and operations.</div></div>';
  const all = exceptionsAll(), f = state.filters.exk || 'all', showDone = state.filters.exDone;
  const list = all.filter(e => (f === 'all' || e.kind === f) && (showDone ? e.status !== 'open' : e.status === 'open'));
  const pOpts = projOptions(), names = memberNames();
  return head('Exceptions inbox', 'Transactions without project, unapplied payments, sync differences, missing receipts and possible duplicates — assign and resolve each one', `<button class="btn" data-act="filt" data-f="exDone" data-v="${showDone ? '' : '1'}">${showDone ? 'Show open' : 'Show resolved'}</button><button class="btn" data-act="ledgerMatch">⚙ Auto-match</button>`) + `
  <div class="tabs">${[['all', 'All'], ...Object.entries(EXC_KIND)].map(([k, v]) => `<button data-act="filt" data-f="exk" data-v="${k}" class="${f === k ? 'on' : ''}">${v} <span class="muted">${all.filter(e => (k === 'all' || e.kind === k) && e.status === 'open').length}</span></button>`).join('')}</div>
  <div class="card"><div class="card-b">${list.map(e => `<div class="list-item" style="flex-wrap:wrap"><span class="pill ${e.kind === 'sync' || e.kind === 'unapplied' ? 'bad' : 'warn'}">${EXC_KIND[e.kind]}</span><div style="flex:1;min-width:220px">${e.href ? `<a href="${e.href}" class="b small">${esc(e.title)}</a>` : `<span class="b small">${esc(e.title)}</span>`}<div class="small muted">${esc(e.detail || '')}${e.note ? ' · note: ' + esc(e.note) : ''}${e.resolvedBy ? ` · ${e.status} by ${esc(e.resolvedBy)} ${fDate(e.resolvedAt)}` : ''}</div></div>${e.amount ? `<b class="small">${money2(e.amount)}</b>` : ''}
    ${e.status === 'open' ? `${e.ledgerId && ['no_project', 'unapplied'].includes(e.kind) ? `<select class="inp" style="width:auto;max-width:220px;padding:5px 8px" data-act-input="ledgerProject" data-id="${e.ledgerId}"><option value="">Assign to project…</option><option value="__overhead">Company overhead (no project)</option>${pOpts.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select>` : ''}
    <select class="inp" style="width:auto;padding:5px 8px" data-act-input="excAssign" data-id="${e.id}"><option value="">Assignee…</option>${names.map(n => `<option ${e.assignee === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><button class="btn sm ok" data-act="excResolve" data-id="${e.id}" data-s="resolved">Resolve</button><button class="btn sm ghost" data-act="excResolve" data-id="${e.id}" data-s="ignored">Ignore</button>` : `<button class="btn sm" data-act="excResolve" data-id="${e.id}" data-s="open">Reopen</button>`}</div>`).join('') || '<div class="empty">Nothing to review ✓</div>'}</div></div>`;
};

// ── Accounting (QuickBooks) ──
const AGE_B = [['current', 'Current'], ['1-30', '1–30'], ['31-60', '31–60'], ['61-90', '61–90'], ['90+', '90+']];
const ageBucket = due => { const d = Math.floor((sod(new Date()) - parseLocal(due)) / DAY); return d <= 0 ? 'current' : d <= 30 ? '1-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : '90+'; };
function arRows() {
  return db.invoices.filter(i => !['void', 'draft'].includes(i.status) && invBal(i) > 0.009).map(i => { const j = db.jobs.find(x => x.id === i.jobId) || (i.estimateId && db.jobs.find(x => x.estimateId === i.estimateId)); return { i, j, bal: invBal(i), b: ageBucket(i.due), payer: i.payer || (j && j.financing && j.financing.payer) || cust(i.customerId).name, missing: i.disputed ? 'Disputed — reminders paused' : (j && j.financing && j.financing.release ? 'Release docs: ' + j.financing.release : '') }; });
}
function apRows() {
  const own = (db.bills || []).filter(b => !b.paidAt && sumBy(b.lines, l => l.amount) > 0).map(b => ({ src: 'OpsBoss', vendor: b.vendor, num: b.number, date: b.date, due: b.due || ymd(addDays(parseLocal(b.date), 30)), bal: sumBy(b.lines, l => l.amount), projects: [...new Set(b.lines.map(l => (db.jobs.find(j => j.id === l.projectId) || {}).number).filter(Boolean))].join(', '), href: '#/purchasing' }));
  const qb = (db.ledger || []).filter(l => l.type === 'bill' && num(l.balance) > 0.009 && !billByNum(l.name, l.num)).map(l => ({ src: 'QuickBooks', vendor: l.name, num: l.num, date: l.date, due: l.due || ymd(addDays(parseLocal(l.date), 30)), bal: num(l.balance), projects: (db.jobs.find(j => j.id === l.projectId) || {}).number || '', href: '#/accounting' }));
  return [...own, ...qb].map(r => ({ ...r, b: ageBucket(r.due) }));
}
function overheadOf(j, F = finOf(j)) {
  const o = db.settings.overhead || {};
  const amount = o.mode === 'pct_cost' ? F.projected * num(o.pct) / 100 : o.mode === 'flat' ? num(o.flat) : F.revenue * num(o.pct) / 100;
  const rule = o.mode === 'pct_cost' ? `${num(o.pct)}% of projected cost (${money2(F.projected)})` : o.mode === 'flat' ? `Flat ${money2(o.flat)} per project` : `${num(o.pct)}% of contract value (${money2(F.revenue)})`;
  return { amount, rule, after: F.gross - amount };
}
function monthlyResults(year, basis) {
  const months = [...Array(12)].map((_, m) => ({ m, rev: {}, revT: 0, cost: 0, oh: 0, cin: 0, cout: 0 }));
  const inY = d => d && String(d).slice(0, 4) === String(year), mo = d => +String(d).slice(5, 7) - 1;
  if (basis === 'qb') {
    (db.ledger || []).forEach(l => {
      if (!inY(l.date)) return; const M = months[mo(l.date)]; const j = db.jobs.find(x => x.id === l.projectId); const dv = j ? j.division : 'other';
      const net = num(l.amount) - num(l.tax);
      if (l.type === 'invoice' || l.type === 'salesreceipt') { M.rev[dv] = num(M.rev[dv]) + net; M.revT += net; }
      if (l.type === 'credit' || l.type === 'refund') { M.rev[dv] = num(M.rev[dv]) - net; M.revT -= net; }
      if (['bill', 'expense'].includes(l.type)) { if (l.overhead || (!l.projectId && !(l.splits || []).length)) M.oh += num(l.amount); else M.cost += num(l.amount); }
      if (l.type === 'vendorcredit') M.cost -= num(l.amount);
      if (['payment', 'salesreceipt', 'deposit'].includes(l.type)) M.cin += num(l.amount);
      if (['billpayment', 'expense', 'refund'].includes(l.type)) M.cout += num(l.amount);
    });
  } else {
    db.invoices.filter(i => !['void', 'draft'].includes(i.status) && inY(ymd(i.createdAt))).forEach(i => { const M = months[mo(ymd(i.createdAt))], v = subtotal(i.items), dv = i.division || 'other'; M.rev[dv] = num(M.rev[dv]) + v; M.revT += v; });
    (db.bills || []).filter(b => inY(b.date)).forEach(b => b.lines.forEach(l => { if (l.projectId) months[mo(b.date)].cost += num(l.amount); else months[mo(b.date)].oh += num(l.amount); }));
    db.jobs.forEach(j => { projInit(j); j.fin.costs.filter(c => inY(c.date)).forEach(c => months[mo(c.date)].cost += num(c.amount)); j.fin.labor.filter(l => inY(l.date)).forEach(l => months[mo(l.date)].cost += num(l.hours) * laborRateOf(j, l)); commsOf(j).filter(c => c.status === 'paid' && inY(ymd(c.paidAt))).forEach(c => months[mo(ymd(c.paidAt))].cost += num(c.amount)); });
    allPayments().filter(p => inY(ymd(p.date))).forEach(p => months[mo(ymd(p.date))].cin += num(p.amount));
    (db.bills || []).filter(b => b.paidAt && inY(ymd(b.paidAt))).forEach(b => months[mo(ymd(b.paidAt))].cout += sumBy(b.lines, l => l.amount));
  }
  const fixed = num((db.settings.overhead || {}).monthly);
  months.forEach(M => { M.oh += fixed; M.gross = M.revT - M.cost; M.net = M.gross - M.oh; M.cash = M.cin - M.cout; });
  return months;
}
ROUTES.accounting = () => {
  if (!isFin()) return head('Accounting', '') + '<div class="card"><div class="empty">Restricted to owner, admin and finance.</div></div>';
  p3Init();
  const tab = state.tabs.acct || 'overview', tabs = [['overview', 'QuickBooks'], ['ar', 'Receivables (A/R)'], ['ap', 'Payables (A/P)'], ['ledger', 'Ledger'], ['recon', 'Reconciliation'], ['reports', 'Monthly reports']];
  const L = db.ledger, upd = db.settings.ledgerUpdatedAt;
  let body = '';
  if (tab === 'overview') body = `<div class="grid g2"><div>
    <div class="card mb"><div class="card-h"><h3>QuickBooks Online</h3><span class="pill" id="qboPill">${cloud.on ? 'Checking…' : 'Demo mode'}</span></div><div class="card-b" id="qboBox">${cloud.on ? '<span class="muted small">Loading…</span>' : '<p class="small muted">The live QuickBooks connection works when you are signed in to the cloud workspace. In demo mode you can try the CSV import below.</p>'}</div></div>
    <div class="card mb"><div class="card-h"><h3>Import from QuickBooks (CSV)</h3></div><div class="card-b"><p class="small muted">In QuickBooks: Reports → <b>Transaction List by Date</b> (or Transaction Detail) → choose the period → Export to CSV/Excel (save as CSV). Re-importing the same file updates the same records — it never duplicates them.</p><label class="btn primary">⇧ Import CSV<input type="file" accept=".csv,text/csv" hidden data-act-input="ledgerCsv"></label></div></div>
    <div class="card"><div class="card-h"><h3>Export to QuickBooks (CSV)</h3></div><div class="card-b"><p class="small muted">Files use QuickBooks Online import columns. Project numbers go in <b>Class</b> so totals can be traced back.</p><div class="row"><button class="btn" data-act="qbExport" data-k="invoices">Invoices</button><button class="btn" data-act="qbExport" data-k="payments">Payments</button><button class="btn" data-act="qbExport" data-k="bills">Vendor bills</button><button class="btn" data-act="qbExport" data-k="customers">Customers</button><button class="btn" data-act="qbExport" data-k="projects">Project profitability</button></div></div></div>
  </div><div>
    <div class="card mb"><div class="card-h"><h3>Ledger status</h3></div><div class="card-b"><div class="calc-out"><div><div class="l">Transactions</div><div class="b">${L.length}</div></div><div><div class="l">Assigned to projects</div><div class="b">${L.filter(l => l.projectId || (l.splits || []).length).length}</div></div><div><div class="l">Overhead</div><div class="b">${L.filter(l => l.overhead).length}</div></div><div><div class="l">Open exceptions</div><div class="b"><a href="#/exceptions">${exceptionsOpen().length}</a></div></div></div><p class="small muted mt">Last update: ${upd ? new Date(upd).toLocaleString('en-US') + ' · ' + esc(db.settings.ledgerSource || '') : 'never'}</p></div></div>
    <div class="card"><div class="card-h"><h3>System of record</h3></div><div class="table-wrap"><table><thead><tr><th>Record</th><th>Originates in</th><th>Goes to</th><th>Matched by</th></tr></thead><tbody>
      ${[['Customers', 'HighLevel / OpsBoss', 'QuickBooks (export)', 'Name, phone, email'], ['Estimates, contracts, change orders', 'OpsBoss', '—', '—'], ['Invoices', 'OpsBoss', 'QuickBooks (official ledger)', 'Invoice number'], ['Customer payments', 'Portal (Stripe) / OpsBoss / QuickBooks', 'QuickBooks; imported back', 'Invoice applied, reference'], ['Credits & refunds', 'QuickBooks', 'OpsBoss (import)', 'Document number'], ['Vendor bills (project costs)', 'OpsBoss (split by project)', 'QuickBooks (export)', 'Vendor + bill number'], ['Card / check expenses', 'QuickBooks', 'OpsBoss (import → project or overhead)', 'Project # in memo or Class'], ['Adjustments & journal entries', 'QuickBooks only', '—', '—']].map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'small' : 'b small'}">${c}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div><div class="card-b small muted">QuickBooks is the official ledger; OpsBoss is the operating system for budgets, costs and project profitability. OpsBoss does not write to QuickBooks yet — writing will be enabled per record type after duplicates, retries, partial payments and credits are tested.</div></div>
  </div></div>`;
  if (tab === 'ar') { const rows = arRows(), sel = state.filters.arb || ''; body = `<div class="grid g5 mb">${AGE_B.map(([k, v]) => `<div class="card kpi click" data-act="filt" data-f="arb" data-v="${sel === k ? '' : k}" style="cursor:pointer;${sel === k ? 'outline:2px solid var(--brand)' : ''}"><div class="l">${v} days</div><div class="v">${kmoney(sumBy(rows.filter(r => r.b === k), r => r.bal))}</div><div class="s">${rows.filter(r => r.b === k).length} invoices</div></div>`).join('')}</div>
    <div class="card"><div class="card-h"><h3>Open receivables ${sel ? '· ' + sel : ''}</h3><span class="b">${money2(sumBy(rows.filter(r => !sel || r.b === sel), r => r.bal))}</span></div><div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Project</th><th>Who pays</th><th>Due</th><th>Age</th><th class="right">Balance</th><th>What’s missing</th></tr></thead><tbody>${rows.filter(r => !sel || r.b === sel).sort((a, b) => a.i.due.localeCompare(b.i.due)).map(r => `<tr class="click" data-go="#/invoice/${r.i.id}"><td class="b">${r.i.number}</td><td>${r.j ? `<a href="#/job/${r.j.id}" onclick="event.stopPropagation()">${r.j.number}</a>` : '—'}</td><td>${esc(r.payer)}</td><td>${fDate(parseLocal(r.i.due))}</td><td>${AGE_B.find(x => x[0] === r.b)[1]}</td><td class="right b">${money2(r.bal)}</td><td class="small">${esc(r.missing)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Nothing outstanding ✓</td></tr>'}</tbody></table></div></div>`; }
  if (tab === 'ap') { const rows = apRows(), sel = state.filters.apb || ''; body = `<div class="grid g5 mb">${AGE_B.map(([k, v]) => `<div class="card kpi click" data-act="filt" data-f="apb" data-v="${sel === k ? '' : k}" style="cursor:pointer;${sel === k ? 'outline:2px solid var(--brand)' : ''}"><div class="l">${v} days</div><div class="v">${kmoney(sumBy(rows.filter(r => r.b === k), r => r.bal))}</div><div class="s">${rows.filter(r => r.b === k).length} bills</div></div>`).join('')}</div>
    <div class="card"><div class="card-h"><h3>Open payables ${sel ? '· ' + sel : ''}</h3><span class="b">${money2(sumBy(rows.filter(r => !sel || r.b === sel), r => r.bal))}</span></div><div class="table-wrap"><table><thead><tr><th>Vendor</th><th>Bill #</th><th>Projects</th><th>Due</th><th class="right">Balance</th><th>Source</th></tr></thead><tbody>${rows.filter(r => !sel || r.b === sel).sort((a, b) => a.due.localeCompare(b.due)).map(r => `<tr class="click" data-go="${r.href}"><td class="b">${esc(r.vendor)}</td><td>${esc(r.num || '—')}</td><td>${esc(r.projects || '—')}</td><td>${fDate(parseLocal(r.due))}</td><td class="right b">${money2(r.bal)}</td><td class="small muted">${r.src}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nothing to pay ✓</td></tr>'}</tbody></table></div></div>`; }
  if (tab === 'ledger') { const q = (state.filters.lq || '').toLowerCase(), t = state.filters.lt || '', un = state.filters.lun; const rows = L.filter(l => (!t || l.type === t) && (!un || (!l.projectId && !l.overhead && !(l.splits || []).length)) && (!q || [l.num, l.name, l.memo, l.account].join(' ').toLowerCase().includes(q))).sort((a, b) => b.date.localeCompare(a.date)); const pOpts = projOptions();
    body = `<div class="row mb" style="flex-wrap:wrap"><input class="inp" id="lq" placeholder="Search #, name, memo…" value="${esc(state.filters.lq || '')}" style="max-width:260px"><select class="inp" style="width:auto" data-act-input="filtSel" data-f="lt"><option value="">All types</option>${Object.entries(LEDGER_T).map(([k, v]) => `<option value="${k}" ${t === k ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn ${un ? 'primary' : ''}" data-act="filt" data-f="lun" data-v="${un ? '' : '1'}">Unassigned only</button><span class="small muted" style="margin-left:auto">${rows.length} of ${L.length}</span></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>#</th><th>Name</th><th>Memo / account</th><th class="right">Amount</th><th>Project</th><th>Source</th></tr></thead><tbody>${rows.slice(0, 400).map(l => `<tr><td>${fDate(parseLocal(l.date))}</td><td class="small">${LEDGER_T[l.type] || l.type}</td><td>${esc(l.num || '')}</td><td>${esc(l.name || '')}</td><td class="small muted">${esc([l.memo, l.account].filter(Boolean).join(' · '))}</td><td class="right b">${money2(l.amount)}${l.balance != null && l.balance > 0 ? `<div class="small muted">open ${money2(l.balance)}</div>` : ''}</td><td>${(l.splits || []).length ? `<span class="small">Split: ${l.splits.map(s => (db.jobs.find(j => j.id === s.projectId) || {}).number).join(', ')}</span>` : `<select class="inp" style="padding:4px 6px;width:auto;max-width:180px" data-act-input="ledgerProject" data-id="${l.id}"><option value="">—</option><option value="__overhead" ${l.overhead ? 'selected' : ''}>Overhead</option>${pOpts.map(([v, tt]) => `<option value="${v}" ${l.projectId === v ? 'selected' : ''}>${esc(tt)}</option>`).join('')}</select>${l.matchedBy ? `<div class="small muted">auto: ${esc(l.matchedBy)}</div>` : ''}`}</td><td class="small muted">${l.src === 'qbo' ? 'API' : 'CSV'}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No transactions yet. Connect QuickBooks or import a CSV.</td></tr>'}</tbody></table></div></div>`; }
  if (tab === 'recon') { const d = reconcile(), qi = L.filter(l => l.type === 'invoice'), matched = qi.filter(l => invByNum(l.num)).length;
    body = `<div class="grid g4 mb">${kpi('QuickBooks invoices', qi.length)}${kpi('Matched to OpsBoss', matched)}${kpi('Differences', d.length)}${kpi('Unassigned transactions', L.filter(l => [...REV_T, ...COST_T].includes(l.type) && !l.projectId && !l.overhead && !(l.splits || []).length).length)}</div>
    <div class="card"><div class="card-h"><h3>Differences between OpsBoss and QuickBooks</h3><button class="btn sm" data-act="ledgerMatch">⚙ Auto-match projects</button></div><div class="card-b">${d.map(x => `<div class="list-item"><span class="pill bad">≠</span><div style="flex:1"><a href="${x.href}" class="small b">${esc(x.title)}</a></div><b class="small">${money2(x.amount)}</b></div>`).join('') || `<div class="muted small">${qi.length ? 'Everything matches ✓' : 'Import QuickBooks transactions to reconcile.'}</div>`}</div><div class="card-b small muted">Rules: invoices match by number; bills by vendor + bill number; payments through the invoice they were applied to. Each difference also appears in the Exceptions inbox, where it can be assigned and resolved.</div></div>`; }
  if (tab === 'reports') { const year = +(state.filters.ry || new Date().getFullYear()), basis = state.filters.rb || (ledgerHasData() ? 'qb' : 'ops'), M = monthlyResults(year, basis), T = k => sumBy(M, m => m[k]); const divs = [...new Set(M.flatMap(m => Object.keys(m.rev)))]; const o = db.settings.overhead;
    const proj = db.jobs.filter(j => j.status !== 'cancelled' && ymd((j.fin && j.fin.budget && j.fin.budget.lockedAt) || j.createdAt).slice(0, 4) === String(year)).map(j => ({ j, F: finOf(j) })); const bySvc = {}; proj.forEach(({ j, F }) => { const s = bySvc[j.division] = bySvc[j.division] || { n: 0, rev: 0, cost: 0, oh: 0 }; s.n++; s.rev += F.revenue; s.cost += F.projected; s.oh += overheadOf(j, F).amount; });
    body = `<div class="row mb" style="flex-wrap:wrap"><select class="inp" style="width:auto" data-act-input="filtSel" data-f="ry">${[0, 1, 2].map(k => new Date().getFullYear() - k).map(y => `<option ${y === year ? 'selected' : ''}>${y}</option>`).join('')}</select><select class="inp" style="width:auto" data-act-input="filtSel" data-f="rb"><option value="qb" ${basis === 'qb' ? 'selected' : ''} ${ledgerHasData() ? '' : 'disabled'}>QuickBooks ledger (official)</option><option value="ops" ${basis === 'ops' ? 'selected' : ''}>OpsBoss operational data</option></select><button class="btn" data-act="qbExport" data-k="monthly" data-y="${year}" data-b="${basis}">⇩ CSV</button><span class="small muted" style="margin-left:auto">Updated ${basis === 'qb' ? (upd ? new Date(upd).toLocaleString('en-US') : '—') : 'live'} · Criterion: ${basis === 'qb' ? 'accrual by transaction date from QuickBooks; cash = payments, deposits and sales receipts in, bill payments, expenses and refunds out' : 'accrual: revenue by invoice date (pre-tax), costs by bill/cost date; cash by settlement date'}</span></div>
    <div class="card mb"><div class="card-h"><h3>Company results ${year}</h3></div><div class="table-wrap"><table><thead><tr><th></th>${M.map(m => `<th class="right">${new Date(year, m.m, 1).toLocaleDateString('en-US', { month: 'short' })}</th>`).join('')}<th class="right">Total</th></tr></thead><tbody>
      ${divs.map(dv => `<tr><td class="small">Revenue · ${DIV[dv] ? DIV[dv].name : 'Unassigned'}</td>${M.map(m => `<td class="right small">${m.rev[dv] ? money(m.rev[dv]) : ''}</td>`).join('')}<td class="right small">${money(sumBy(M, m => m.rev[dv]))}</td></tr>`).join('')}
      ${[['Revenue', 'revT', 'b'], ['Direct project costs', 'cost', ''], ['Gross profit', 'gross', 'b'], ['Overhead', 'oh', ''], ['Result after overhead', 'net', 'b'], ['Cash in', 'cin', 'small'], ['Cash out', 'cout', 'small'], ['Net cash flow', 'cash', 'b']].map(([l, k, c]) => `<tr><td class="${c}">${l}</td>${M.map(m => `<td class="right ${c} ${m[k] < 0 ? 'down' : ''}">${m[k] ? money(m[k]) : ''}</td>`).join('')}<td class="right ${c} ${T(k) < 0 ? 'down' : ''}">${money(T(k))}</td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>Profitability by service (projects signed in ${year})</h3><span class="small muted">Overhead rule: ${esc(o.mode === 'pct_cost' ? o.pct + '% of projected cost' : o.mode === 'flat' ? money(o.flat) + ' per project' : o.pct + '% of contract value')}${num(o.monthly) ? ` · plus ${money(o.monthly)}/month fixed overhead in company results` : ''}</span></div><div class="table-wrap"><table><thead><tr><th>Service</th><th class="right">Projects</th><th class="right">Contract value</th><th class="right">Projected cost</th><th class="right">Gross</th><th class="right">Margin</th><th class="right">Allocated overhead</th><th class="right">After overhead</th></tr></thead><tbody>${Object.entries(bySvc).map(([dv, s]) => `<tr><td class="b">${DIV[dv] ? DIV[dv].name : dv}</td><td class="right">${s.n}</td><td class="right">${money(s.rev)}</td><td class="right">${money(s.cost)}</td><td class="right b">${money(s.rev - s.cost)}</td><td class="right">${pct2(s.rev ? (s.rev - s.cost) / s.rev : 0)}</td><td class="right">${money(s.oh)}</td><td class="right b ${s.rev - s.cost - s.oh < 0 ? 'down' : 'up'}">${money(s.rev - s.cost - s.oh)}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No projects signed this year.</td></tr>'}</tbody></table></div></div>`; }
  return head('Accounting', 'QuickBooks is the official ledger · OpsBoss runs operations, budgets and project profitability') + `<div class="tabs">${tabs.map(([k, v]) => `<button data-act="tab" data-t="acct" data-v="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>` + body;
};
async function qboCall(action, payload = {}) {
  const { data: { session } } = await cloud.sb.auth.getSession();
  const r = await fetch(`${CFG.url}/functions/v1/opsboss-qbo`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.key, Authorization: `Bearer ${session ? session.access_token : ''}` }, body: JSON.stringify({ action, ...payload }) });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || out.error) throw new Error(out.message || out.error || 'QuickBooks error ' + r.status);
  return out;
}
ROUTES['accounting:after'] = async () => {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  if (q.get('qbo')) { toast(q.get('qbo') === 'connected' ? 'QuickBooks connected ✓' : 'QuickBooks connection failed: ' + q.get('qbo')); history.replaceState(null, '', location.pathname + location.search + '#/accounting'); }
  const lq = $('#lq'); if (lq) lq.oninput = () => { state.filters.lq = lq.value; const pos = lq.selectionStart; render(); const n = $('#lq'); n.focus(); n.setSelectionRange(pos, pos); };
  const box = $('#qboBox'); if (!box || !cloud.on) return;
  try {
    const s = await qboCall('status'); cloud.qbo = s;
    if (!$('#qboBox')) return;
    $('#qboPill').className = 'pill ' + (s.connected ? 'ok' : ''); $('#qboPill').textContent = s.connected ? 'Connected' : 'Not connected';
    box.innerHTML = !s.configured ? `<p class="small">To connect QuickBooks, create an app at <b>developer.intuit.com</b> (Accounting scope) and add these Supabase Edge Function secrets: <code>QBO_CLIENT_ID</code>, <code>QBO_CLIENT_SECRET</code> and <code>QBO_ENV</code> (<code>production</code> or <code>sandbox</code>).</p><label class="f">Redirect URI to register in the Intuit app<input class="inp" readonly onclick="this.select()" value="${esc(s.redirectUri)}"></label><p class="small muted">Until then, use the CSV import — it works the same way.</p>`
      : s.connected ? `<div class="calc-out"><div><div class="l">Company</div><div class="b">${esc(s.companyName || s.realmId)}</div></div><div><div class="l">Environment</div><div class="b">${esc(s.env)}</div></div><div><div class="l">Last sync</div><div class="b">${s.lastSync ? new Date(s.lastSync).toLocaleString('en-US') : 'never'}</div></div></div>${s.lastResult ? `<p class="small muted">Last result: ${s.lastResult.created} new, ${s.lastResult.updated} updated, ${s.lastResult.unchanged} unchanged.</p>` : ''}<div class="row mt"><button class="btn primary" data-act="qboPull">↻ Sync now (read-only)</button><button class="btn" data-act="qboPull" data-full="1">Full re-import (24 months)</button><button class="btn ghost danger" data-act="qboDisconnect">Disconnect</button></div>`
      : `<p class="small muted">Connect read-only access to import invoices, payments, credits, vendor bills, expenses and deposits. Nothing is written to QuickBooks.</p><button class="btn primary" data-act="qboConnect">Connect QuickBooks</button>`;
  } catch (e) { if ($('#qboBox')) $('#qboBox').innerHTML = `<div class="auth-msg bad">${esc(e.message)}</div>`; }
};
function qbExport(k, el) {
  const csv = rows => rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');
  const d = ymd(new Date()); let rows;
  const jn = id => (db.jobs.find(j => j.id === id) || {}).number || '';
  if (k === 'invoices') { rows = [['InvoiceNo', 'Customer', 'InvoiceDate', 'DueDate', 'Item(Product/Service)', 'ItemDescription', 'ItemQuantity', 'ItemRate', 'ItemAmount', 'Taxable', 'Class']]; db.invoices.filter(i => !['void', 'draft'].includes(i.status)).forEach(i => i.items.forEach(it => rows.push([i.number, cust(i.customerId).name, ymd(i.createdAt), i.due, DIV[i.division] ? DIV[i.division].name : 'Services', it.name, it.qty, it.price, (num(it.qty) * num(it.price)).toFixed(2), num(db.settings.taxRate) ? 'Y' : 'N', jn(i.jobId)]))); }
  if (k === 'payments') { rows = [['Date', 'Customer', 'InvoiceNo', 'Amount', 'Method', 'Reference']]; allPayments().forEach(p => rows.push([ymd(p.date), cust(p.inv.customerId).name, p.inv.number, num(p.amount).toFixed(2), p.method || '', p.ref || p.id || ''])); }
  if (k === 'bills') { rows = [['BillNo', 'Supplier', 'BillDate', 'DueDate', 'Account', 'LineDescription', 'LineAmount', 'Class']]; (db.bills || []).forEach(b => b.lines.forEach(l => rows.push([b.number, b.vendor, b.date, b.due || ymd(addDays(parseLocal(b.date), 30)), l.category, (l.poId ? 'PO ' + ((db.pos.find(p => p.id === l.poId) || {}).number || '') + ' ' : '') + jn(l.projectId), num(l.amount).toFixed(2), jn(l.projectId)]))); }
  if (k === 'customers') { rows = [['Name', 'Email', 'Phone', 'Street', 'City', 'Zip']]; db.customers.forEach(c => rows.push([c.name, c.email, c.phone, c.address, c.city, c.zip])); }
  if (k === 'projects') { rows = [['Project', 'Customer', 'Service', 'Contract value', 'Actual cost', 'Committed', 'Remaining estimate', 'Projected cost', 'Gross', 'Margin %', 'Overhead', 'After overhead', 'Invoiced', 'Collected', 'Balance due']]; db.jobs.filter(j => j.status !== 'cancelled').forEach(j => { const F = finOf(j), o = overheadOf(j, F); rows.push([j.number, cust(j.customerId).name, DIV[j.division] ? DIV[j.division].name : '', F.revenue.toFixed(2), F.actual.toFixed(2), F.committed.toFixed(2), F.remaining.toFixed(2), F.projected.toFixed(2), F.gross.toFixed(2), (F.pct * 100).toFixed(2), o.amount.toFixed(2), o.after.toFixed(2), F.billed.toFixed(2), F.collected.toFixed(2), F.ar.toFixed(2)]); }); }
  if (k === 'monthly') { const M = monthlyResults(+el.dataset.y, el.dataset.b); rows = [['Month', 'Revenue', 'Direct costs', 'Gross', 'Overhead', 'After overhead', 'Cash in', 'Cash out', 'Net cash']]; M.forEach(m => rows.push([`${el.dataset.y}-${String(m.m + 1).padStart(2, '0')}`, ...['revT', 'cost', 'gross', 'oh', 'net', 'cin', 'cout', 'cash'].map(x => m[x].toFixed(2))])); }
  download(`opsboss-${k}-${d}.csv`, csv(rows), 'text/csv');
  runLog('export.' + k, `Exported ${rows.length - 1} ${k} rows to CSV`, { system: 'QuickBooks' });
  save();
}

// ── Automation log ──
ROUTES.runs = () => {
  p3Init();
  const f = state.filters.rs || 'all', list = (db.runs || []).filter(r => f === 'all' || (f === 'error' ? r.status === 'error' : r.system === f)).sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  return head('Automation log', 'Every automation, webhook, import and export with its result. Failed runs can be retried without duplicating tasks, invoices or messages.') + `
  <div class="tabs">${[['all', 'All'], ['error', 'Failed'], ['OpsBoss', 'OpsBoss'], ['HighLevel', 'HighLevel'], ['QuickBooks', 'QuickBooks']].map(([k, v]) => `<button data-act="filt" data-f="rs" data-v="${k}" class="${f === k ? 'on' : ''}">${v}${k === 'error' ? ` <span class="muted">${(db.runs || []).filter(r => r.status === 'error').length}</span>` : ''}</button>`).join('')}</div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>When</th><th>System</th><th>Event</th><th>Result</th><th>Detail</th><th></th></tr></thead><tbody>${list.slice(0, 300).map(r => `<tr><td class="small">${new Date(r.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td class="small">${esc(r.system || '')}</td><td class="small b">${esc(r.kind)}</td><td>${pill(RUN_ST, r.status)}${num(r.attempts) > 1 ? `<div class="small muted">${r.attempts} attempts</div>` : ''}</td><td class="small">${esc(r.detail || '')}${r.ids && r.ids.formName ? `<div class="muted">form: ${esc(r.ids.formName)}${r.ids.formId ? ' (' + esc(r.ids.formId) + ')' : ''}</div>` : ''}${r.ids && r.ids.calendarName ? `<div class="muted">calendar: ${esc(r.ids.calendarName)}${r.ids.calendarId ? ' (' + esc(r.ids.calendarId) + ')' : ''}</div>` : ''}</td><td class="right">${r.status === 'error' && r.retry ? `<button class="btn sm" data-act="runRetry" data-id="${r.id}">↻ Retry</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No runs yet.</td></tr>'}</tbody></table></div></div>`;
};
async function runRetry(r) {
  r.attempts = num(r.attempts) + 1;
  try {
    if (r.kind.startsWith('ghl.') && r.retry && r.retry.payload) {
      if (!(cloud.ghl && cloud.ghl.webhookKey)) throw new Error('Only an admin can retry HighLevel webhooks');
      const res = await fetch(`${CFG.url}/functions/v1/opsboss-ghl-webhook${r.retry.url}&key=${cloud.ghl.webhookKey}&retry=${encodeURIComponent(r.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: r.retry.payload });
      const o = await res.json().catch(() => ({})); if (!res.ok) throw new Error(o.error || 'HTTP ' + res.status);
      toast('Webhook reprocessed ✓'); return;
    }
    if (r.kind === 'qbo.pull') { const o = await qboCall('pull', { since: r.retry && r.retry.since }); r.status = 'ok'; r.detail += ` · retried: ${o.created} new, ${o.updated} updated`; toast('QuickBooks sync retried ✓'); return; }
    if (r.kind === 'wf.message' && r.retry && r.retry.taskId) {
      const t = (db.tasks || []).find(x => x.id === r.retry.taskId);
      if (!t || t.done) { r.status = 'duplicate'; r.detail += ' · already sent/closed, not resent'; toast('Already sent — not resent'); return; }
      await ghlSend(cust(t.customerId), t.channel === 'email' ? 'Email' : 'SMS', t.body, db.settings.company);
      t.done = true; t.doneAt = iso(new Date()); t.sentVia = 'highlevel'; r.status = 'ok'; r.detail += ' · sent on retry'; toast('Message sent ✓'); return;
    }
    throw new Error('This run cannot be retried automatically');
  } catch (e) { r.status = 'error'; r.detail = String(r.detail || '').replace(/ · retry failed:.*$/, '') + ' · retry failed: ' + e.message; toast(e.message); }
  finally { save(); render(); }
}

// ── Settings: lead sources, alert rules, overhead, outbound mode ──
function p3SettingsCards() {
  p3Init();
  const s = db.settings, R = s.alertRules, o = s.overhead, dis = canAdmin() ? '' : 'disabled';
  const lastSeen = k => { const r = (db.runs || []).find(x => x.source === k); return r ? ago(r.ts) + ' ago' : 'not yet'; };
  const ownerOpts = sel => `<option value="">— Unassigned —</option>${db.techs.map(t => `<option value="${t.id}" ${sel === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}`;
  const wh = k => cloud.ghl && cloud.ghl.webhookKey ? `${CFG.url}/functions/v1/opsboss-ghl-webhook?event=lead&src=${k}&key=${cloud.ghl.webhookKey}` : '';
  return `<div class="card mt"><div class="card-h"><h3>Outbound communications</h3><span class="pill ${s.outboundLive ? 'ok' : 'warn'}">${s.outboundLive ? 'Live' : 'Test mode'}</span></div><div class="card-b">
    <label class="check"><input type="checkbox" data-act-input="settingBool" data-k="outboundLive" ${s.outboundLive ? 'checked' : ''} ${dis}><span><b>Activate automatic outbound messages</b> (workflow SMS/email through HighLevel). While off, automations prepare the message as a task and log it as “Test mode” — nothing is sent automatically. Messages a person sends by hand are not affected.</span></label>
    <p class="small muted">Single sender per channel: SMS, email and calls go only through HighLevel (OpsBoss never sends them directly). HighLevel’s own workflows should not send the same message — keep each reminder in one system. Customers who opt out (STOP, or a consent webhook) are skipped automatically; language is taken from the contact.</p></div></div>
  <div class="card mt"><div class="card-h"><h3>Lead sources (HighLevel mapping)</h3>${cloud.on && ghlOn() ? '<button class="btn sm" data-act="ghlVerify">✓ Verify IDs in HighLevel</button>' : ''}</div><div class="card-b">
    <p class="small muted">Each source is matched by its own webhook URL (most reliable), then by form ID, calendar ID, form/calendar name, tag or UTM source. Leads from unmatched sources go to the Exceptions inbox.</p>
    <div id="ghlVerifyOut"></div>
    ${s.leadSources.map((x, i) => `<details class="mt" ${i === 0 ? '' : ''}><summary><b>${esc(x.label)}</b> <span class="small muted">· ${x.division === 'auto' ? 'service auto-detected' : DIV[x.division] ? DIV[x.division].name : ''} · ${x.pipeline === 'sales' ? 'Sales pipeline' : 'Marketing Leads'} · last lead ${lastSeen(x.key)}</span>${x.active === false ? ' <span class="pill">off</span>' : ''}</summary><div class="form mt">
      ${[['label', 'Name'], ['formIds', 'Form IDs (comma separated)'], ['formNames', 'Form names'], ['calendarIds', 'Calendar IDs'], ['calendarNames', 'Calendar names'], ['tags', 'Tags'], ['sources', 'UTM / source contains']].map(([k, l]) => `<label class="f">${l}<input class="inp" data-act-input="leadSrc" data-i="${i}" data-k="${k}" value="${esc(x[k] || '')}" ${dis}></label>`).join('')}
      <label class="f">Service<select class="inp" data-act-input="leadSrc" data-i="${i}" data-k="division" ${dis}>${[['auto', 'Detect from form/tags'], ...divOptions()].map(([k, v]) => `<option value="${k}" ${x.division === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f">Pipeline<select class="inp" data-act-input="leadSrc" data-i="${i}" data-k="pipeline" ${dis}><option value="marketing" ${x.pipeline !== 'sales' ? 'selected' : ''}>Marketing Leads (Warm Leads)</option><option value="sales" ${x.pipeline === 'sales' ? 'selected' : ''}>Sales pipeline (New lead)</option></select></label>
      <label class="f">Owner (gets the first task)<select class="inp" data-act-input="leadSrc" data-i="${i}" data-k="owner" ${dis}>${ownerOpts(x.owner)}</select></label>
      <label class="f">Language<select class="inp" data-act-input="leadSrc" data-i="${i}" data-k="lang" ${dis}>${[['', 'From contact'], ['en', 'English'], ['es', 'Spanish'], ['pt', 'Portuguese']].map(([k, v]) => `<option value="${k}" ${(x.lang || '') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" data-act-input="leadSrc" data-i="${i}" data-k="active" ${x.active === false ? '' : 'checked'} ${dis}><span>Active</span></label>
      ${wh(x.key) ? `<label class="f full">Webhook URL for this source (HighLevel workflow → Webhook, POST)<input class="inp" readonly onclick="this.select()" value="${esc(wh(x.key))}"></label>` : ''}
    </div></details>`).join('')}
    ${canAdmin() ? '<button class="btn sm mt" data-act="leadSrcAdd">＋ Source</button>' : ''}
    ${cloud.ghl && cloud.ghl.webhookKey ? `<details class="mt"><summary class="b small">Appointment & consent webhooks</summary><label class="f mt">Appointment booked / rescheduled / cancelled (trigger: Appointment Status)<input class="inp" readonly onclick="this.select()" value="${esc(CFG.url + '/functions/v1/opsboss-ghl-webhook?event=appointment&src=solar_cal&key=' + cloud.ghl.webhookKey)}"></label><label class="f mt">Unsubscribe / DND (add &channel=sms|email|call|all and &value=off or on)<input class="inp" readonly onclick="this.select()" value="${esc(CFG.url + '/functions/v1/opsboss-ghl-webhook?event=consent&channel=all&value=off&key=' + cloud.ghl.webhookKey)}"></label><p class="small muted">Recommended Custom Data in the webhook action: <code>formId</code>, <code>formName</code>, <code>calendarId</code>, <code>calendarName</code>, <code>appointmentId</code>, <code>startTime</code>, <code>endTime</code>, <code>status</code>, <code>language</code>, <code>service</code>. Repeated deliveries are ignored, so HighLevel retries never duplicate leads.</p></details>` : ''}
    <label class="f mt">Default owner for new leads<select class="inp" data-act-input="setting" data-k="leadOwnerDefault" ${dis}>${ownerOpts(s.leadOwnerDefault)}</select></label>
  </div></div>
  <div class="card mt"><div class="card-h"><h3>Alerts & escalation</h3></div><div class="card-b form">
    ${[['taskEscalateDays', 'Escalate overdue tasks after (days)'], ['blockedDays', 'Alert when blocked for (days)'], ['permitDays', 'Permit pending limit (days)'], ['interconnectDays', 'Interconnection / PTO limit (days)'], ['leadHours', 'New lead not contacted after (hours)'], ['doneNotInvoicedDays', 'Completed, not invoiced after (days)'], ['poPendingDays', 'PO waiting for approval (days)'], ['dayCapacity', 'Crew capacity per day (hours)']].map(([k, l]) => `<label class="f">${l}<input class="inp" type="number" data-act-input="alertRule" data-k="${k}" value="${esc(R[k])}" ${dis}></label>`).join('')}
    <label class="f">Escalate to (manager)<select class="inp" data-act-input="alertRule" data-k="escalateTo" ${dis}><option value="">—</option>${db.techs.map(t => `<option ${R.escalateTo === t.name ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
    <label class="f">Then to (direction)<select class="inp" data-act-input="alertRule" data-k="directionName" ${dis}><option value="">—</option>${db.techs.map(t => `<option ${R.directionName === t.name ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
  </div></div>
  ${isFin() ? `<div class="card mt"><div class="card-h"><h3>Overhead allocation rule</h3></div><div class="card-b form">
    <label class="f">Rule<select class="inp" data-act-input="overhead" data-k="mode" ${dis}><option value="pct_revenue" ${o.mode === 'pct_revenue' ? 'selected' : ''}>% of contract value</option><option value="pct_cost" ${o.mode === 'pct_cost' ? 'selected' : ''}>% of projected cost</option><option value="flat" ${o.mode === 'flat' ? 'selected' : ''}>Flat amount per project</option></select></label>
    <label class="f">${o.mode === 'flat' ? 'Amount per project ($)' : 'Percentage (%)'}<input class="inp" type="number" step="0.01" data-act-input="overhead" data-k="${o.mode === 'flat' ? 'flat' : 'pct'}" value="${esc(o.mode === 'flat' ? o.flat : o.pct)}" ${dis}></label>
    <label class="f">Fixed monthly overhead in company results ($)<input class="inp" type="number" step="0.01" data-act-input="overhead" data-k="monthly" value="${esc(o.monthly || 0)}" ${dis}></label>
    <label class="f full">Note<input class="inp" data-act-input="overhead" data-k="note" value="${esc(o.note || '')}" ${dis}></label>
  </div></div>` : ''}`;
}

// ── Bell + nav ──
function renderBell() {
  const b = $('#bellBtn'); if (!b || !db) return;
  let n = 0; try { n = alertsAll().filter(a => !a.acked && a.sev !== 'info').length; } catch (e) { n = 0; }
  $('#bellN').textContent = n ? (n > 99 ? '99+' : n) : ''; $('#bellN').hidden = !n;
}

// Wrappers de pantallas existentes
const _mywork = ROUTES.mywork;
ROUTES.mywork = () => { const html = _mywork(), al = alertsAll().filter(a => !a.acked && a.sev !== 'info'); const card = al.length ? `<div class="card mb"><div class="card-h"><h3>🔔 Needs attention <span class="muted small">${al.length}</span></h3><a class="btn sm" href="#/alerts">All alerts</a></div><div class="card-b">${al.slice(0, 5).map(a => `<div class="list-item"><span class="pill ${a.sev}">${esc(a.kind)}</span><div style="flex:1;min-width:0"><a href="${a.href}" class="small b">${esc(a.title)}</a><div class="small muted">${esc(a.text || '')}${a.level > 1 ? ' · escalated to ' + LVL[a.level] : ''}</div></div></div>`).join('')}</div></div>` : ''; const i = html.indexOf('<div class="grid g2">'); return i > 0 ? html.slice(0, i) + card + html.slice(i) : html + card; };
const _schedule = ROUTES.schedule;
ROUTES.schedule = () => {
  const html = _schedule(), cf = calConflicts(), ws = state.week, we = addDays(ws, 7);
  const ap = (db.appts || []).filter(a => a.start && new Date(a.start) >= ws && new Date(a.start) < we).sort((a, b) => new Date(a.start) - new Date(b.start));
  const changes = db.jobs.flatMap(j => (j.history || []).filter(h => /^Rescheduled/.test(h.text) && daysSince(h.ts) <= 14).map(h => ({ j, h }))).sort((a, b) => b.h.ts.localeCompare(a.h.ts));
  const extra = `${cf.length ? `<div class="card mb" style="border-color:var(--bad)"><div class="card-h"><h3>⚠ Conflicts (${cf.length})</h3></div><div class="card-b">${cf.map(c => `<div class="list-item small"><span class="pill bad">Conflict</span><div style="flex:1"><b>${esc(c.title)}</b> · ${esc(c.text)}</div></div>`).join('')}</div></div>` : ''}
  <div class="grid g2 mb"><div class="card"><div class="card-h"><h3>📅 Visits & appointments this week (${ap.length})</h3></div><div class="card-b">${ap.map(a => `<div class="list-item small"><span class="pill ${a.status === 'cancelled' ? '' : a.status === 'booked' ? 'info' : 'ok'}">${esc(a.status)}</span><div style="flex:1"><b>${fDay(a.start)} ${fTime(a.start)}</b> · ${esc(a.title)}${a.assignedTo ? ' · ' + esc(a.assignedTo) : ''}${a.reschedules ? ` · <span class="down">rescheduled ×${a.reschedules}</span>` : ''}</div><a href="#/customer/${a.customerId}">${esc(cust(a.customerId).name)}</a></div>`).join('') || '<span class="muted small">No visits booked from HighLevel calendars this week.</span>'}</div></div>
  <div class="card"><div class="card-h"><h3>Schedule changes (14 days)</h3></div><div class="card-b">${changes.slice(0, 8).map(({ j, h }) => `<div class="list-item small"><div style="flex:1"><a href="#/job/${j.id}">${j.number}</a> · ${esc(h.text)}</div><span class="muted">${esc(h.by || '')} · ${ago(h.ts)}</span></div>`).join('') || '<span class="muted small">No reschedules.</span>'}</div></div></div>`;
  const i = html.indexOf('<div class="card mb"><div class="card-h"><h3>Unscheduled'); return i > 0 ? html.slice(0, i) + extra + html.slice(i) : html + extra;
};
const _schedAfter = ROUTES['schedule:after'];
ROUTES['schedule:after'] = () => { _schedAfter(); const ids = new Set(calConflicts().flatMap(c => c.jobs)); $$('[data-job]').forEach(el => { if (ids.has(el.dataset.job)) { el.style.outline = '2px solid var(--bad)'; el.title = '⚠ Conflict · ' + el.title; } }); };
const _customer = ROUTES.customer;
ROUTES.customer = id => { const html = _customer(id), c = byId('customers', id); if (!c) return html; const cs = { sms: true, email: true, call: true, ...(c.consent || {}) }; const strip = `<div class="card mb"><div class="card-b row" style="flex-wrap:wrap;gap:14px"><span class="small b">Communication preferences</span>${['sms', 'email', 'call'].map(ch => `<label class="check small"><input type="checkbox" data-act-input="custConsent" data-id="${c.id}" data-ch="${ch}" ${cs[ch] ? 'checked' : ''}><span>${ch.toUpperCase()}</span></label>`).join('')}<label class="small row" style="gap:6px">Language<select class="inp" style="width:auto;padding:4px 8px" data-act-input="custLang" data-id="${c.id}">${[['', '—'], ['en', 'English'], ['es', 'Spanish'], ['pt', 'Portuguese']].map(([k, v]) => `<option value="${k}" ${(c.lang || '') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>${(c.consentLog || [])[0] ? `<span class="small muted">Last change: ${esc(c.consentLog[0].text)} · ${esc(c.consentLog[0].by)} · ${fDate(c.consentLog[0].ts)}</span>` : ''}</div></div>`; const i = html.indexOf('<div class="tabs">'); return i > 0 ? html.slice(0, i) + strip + html.slice(i) : html; };

/* ───────────── Phase 3 actions ───────────── */
Object.assign(ACT, {
  alertAck: el => { p3Init(); const k = el.dataset.k; db.alerts.push({ id: 'ack-' + hash36(k + me()), kind: 'ack', ackKey: k, level: +el.dataset.l || 1, by: me(), ts: iso(new Date()) }); if (el.dataset.s) { const a = db.alerts.find(x => x.id === el.dataset.s); if (a) a.readBy = [...new Set([...(a.readBy || []), me()])]; } save(); render(); },
  alertSnooze: el => { p3Init(); const k = el.dataset.k; db.alerts = db.alerts.filter(x => !(x.kind === 'ack' && x.ackKey === k && x.by === me())); db.alerts.push({ id: 'ack-' + hash36(k + me()), kind: 'ack', ackKey: k, level: 9, until: iso(addDays(new Date(), 1)), by: me(), ts: iso(new Date()) }); save(); render(); toast('Snoozed until tomorrow'); },
  alertScan: () => alertScan(true),
  commSim: el => commModal(projInit(byId('jobs', el.dataset.id))),
  commRuleNew: () => commRuleModal(null),
  commRuleVersion: el => commRuleModal(db.settings.commRules.find(r => r.id === el.dataset.r)),
  commPaid: el => { const j = projInit(byId('jobs', el.dataset.id)), c = commsOf(j).find(x => x.id === el.dataset.c); const pay = commPayable(j, c); const go = () => { c.status = 'paid'; c.paidAt = iso(new Date()); c.paidBy = me(); hist(j, `Commission paid to ${c.rep}: ${money2(c.amount)}`); runLog('commission.paid', `${j.number} · ${c.rep} · ${money2(c.amount)}`); }; if (!pay.ok) confirmDlg(`The payment condition is not met yet (${esc(pay.why)}). Mark as paid anyway?`, go); else { go(); save(); render(); } },
  commVoid: el => { const j = projInit(byId('jobs', el.dataset.id)), c = commsOf(j).find(x => x.id === el.dataset.c); const why = prompt('Reason to void this commission?'); if (!why) return; c.status = 'void'; c.voidReason = why; c.voidBy = me(); hist(j, `Commission voided (${c.rep}): ${why}`); save(); render(); },
  ledgerMatch: () => { const n = autoMatchLedger(); runLog('ledger.match', `Auto-match assigned ${n} transaction${n === 1 ? '' : 's'} to projects`, { system: 'QuickBooks' }); save(); render(); toast(`${n} transaction${n === 1 ? '' : 's'} matched`); },
  excResolve: el => { p3Init(); const s = excState(el.dataset.id), to = el.dataset.s; let note = ''; if (to !== 'open') { note = prompt(to === 'resolved' ? 'How was it resolved?' : 'Why ignore it?') || ''; if (to === 'ignored' && !note) { toast('A reason is required to ignore an exception'); return; } } s.status = to; s.note = note || s.note; s.resolvedBy = to === 'open' ? '' : me(); s.resolvedAt = to === 'open' ? '' : iso(new Date()); (s.history = s.history || []).unshift({ ts: iso(new Date()), by: me(), text: `${to}${note ? ': ' + note : ''}` }); save(); render(); },
  qbExport: el => qbExport(el.dataset.k, el),
  qboConnect: async el => { el.disabled = true; try { const o = await qboCall('connect'); location.href = o.url; } catch (e) { toast(e.message); el.disabled = false; } },
  qboPull: async el => { el.disabled = true; el.textContent = 'Syncing…'; try { const o = await qboCall('pull', { full: !!el.dataset.full }); toast(`QuickBooks: ${o.created} new, ${o.updated} updated, ${o.unchanged} unchanged`); db.settings.ledgerUpdatedAt = iso(new Date()); db.settings.ledgerSource = 'QuickBooks API'; setTimeout(() => { const n = autoMatchLedger(); if (n) runLog('ledger.match', `Auto-match assigned ${n} QuickBooks transactions to projects`, { system: 'QuickBooks' }); save(); render(); }, 2500); } catch (e) { toast('QuickBooks: ' + e.message); } finally { save(); render(); } },
  qboDisconnect: () => confirmDlg('Disconnect QuickBooks? Imported transactions stay in OpsBoss.', async () => { try { await qboCall('disconnect'); toast('QuickBooks disconnected'); } catch (e) { toast(e.message); } render(); }),
  runRetry: el => { const r = (db.runs || []).find(x => x.id === el.dataset.id); if (r) { el.disabled = true; runRetry(r); } },
  ghlVerify: async el => {
    el.disabled = true; const out = $('#ghlVerifyOut');
    try {
      const d = await ghlCall('sources'); const F = new Map((d.forms || []).map(f => [String(f.id).toLowerCase(), f.name])), C = new Map((d.calendars || []).map(c => [String(c.id).toLowerCase(), c.name]));
      const ids = s => String(s || '').split(/[,\n]/).map(x => x.trim()).filter(Boolean);
      const rows = db.settings.leadSources.map(s => { const fi = ids(s.formIds).map(id => F.has(id.toLowerCase()) ? `<span class="pill ok">✓ form ${esc(F.get(id.toLowerCase()))}</span>` : `<span class="pill bad">✗ form ${esc(id)} not found</span>`), ci = ids(s.calendarIds).map(id => C.has(id.toLowerCase()) ? `<span class="pill ok">✓ calendar ${esc(C.get(id.toLowerCase()))}</span>` : `<span class="pill bad">✗ calendar ${esc(id)} not found</span>`); const byName = [...ids(s.formNames).map(n => [...F.values()].some(v => String(v).toLowerCase().includes(n.toLowerCase())) ? `<span class="pill ok">✓ form “${esc(n)}”</span>` : `<span class="pill warn">form “${esc(n)}” not found</span>`), ...ids(s.calendarNames).map(n => [...C.values()].some(v => String(v).toLowerCase().includes(n.toLowerCase())) ? `<span class="pill ok">✓ calendar “${esc(n)}”</span>` : `<span class="pill warn">calendar “${esc(n)}” not found</span>`)]; return `<div class="list-item" style="flex-wrap:wrap"><b class="small" style="min-width:160px">${esc(s.label)}</b><div class="row" style="gap:4px;flex-wrap:wrap">${[...fi, ...ci, ...byName].join('') || '<span class="small muted">matched by URL/source only</span>'}</div></div>`; });
      out.innerHTML = `<div class="card mb"><div class="card-b"><div class="small muted mb">HighLevel has ${(d.forms || []).length} forms and ${(d.calendars || []).length} calendars${d.formsError ? ' · forms: ' + esc(d.formsError) : ''}${d.calendarsError ? ' · calendars: ' + esc(d.calendarsError) : ''}</div>${rows.join('')}<details class="mt"><summary class="small">All forms & calendars (IDs)</summary><div class="small">${[...(d.forms || []).map(f => `Form · ${esc(f.name)} · <code>${esc(f.id)}</code>`), ...(d.calendars || []).map(c => `Calendar · ${esc(c.name)} · <code>${esc(c.id)}</code>`)].join('<br>')}</div></details></div></div>`;
      runLog('ghl.verify', `Verified lead source IDs: ${(d.forms || []).length} forms, ${(d.calendars || []).length} calendars in HighLevel`, { system: 'HighLevel' }); save();
    } catch (e) { out.innerHTML = `<div class="auth-msg bad">HighLevel: ${esc(e.message)}</div>`; }
    el.disabled = false;
  },
  leadSrcAdd: () => { p3Init(); db.settings.leadSources.push({ key: 'src' + uid().slice(0, 5), label: 'New source', division: 'auto', pipeline: 'marketing' }); save(); render(); },
});
Object.assign(INPUT, {
  ledgerCsv: el => { const f = el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const o = importLedgerCsv(String(r.result), f.name); toast(`Imported: ${o.created} new, ${o.updated} updated, ${o.same} unchanged · ${o.matched} matched to projects`); render(); } catch (e) { toast('Import failed: ' + e.message); runLog('ledger.import', `CSV "${f.name}" failed: ${e.message}`, { status: 'error', system: 'QuickBooks' }); save(); } }; r.readAsText(f); el.value = ''; },
  ledgerProject: el => { const l = db.ledger.find(x => x.id === el.dataset.id); if (!l) return; if (el.value === '__overhead') { l.overhead = true; l.projectId = ''; } else { l.overhead = false; l.projectId = el.value; } l.assignedBy = me(); l.matchedBy = ''; if (l.projectId) { const j = db.jobs.find(x => x.id === l.projectId); if (j) hist(projInit(j), `QuickBooks ${LEDGER_T[l.type] || l.type} ${l.num || ''} (${money2(l.amount)}) assigned to this project`); } save(); render(); },
  excAssign: el => { p3Init(); const s = excState(el.dataset.id); s.assignee = el.value; (s.history = s.history || []).unshift({ ts: iso(new Date()), by: me(), text: 'assigned to ' + (el.value || 'nobody') }); save(); },
  filtSel: el => { state.filters[el.dataset.f] = el.value; render(); },
  leadSrc: el => { const s = db.settings.leadSources[+el.dataset.i]; s[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; save(); if (el.tagName === 'SELECT' || el.type === 'checkbox') render(); },
  alertRule: el => { db.settings.alertRules[el.dataset.k] = el.type === 'number' ? num(el.value) : el.value; save(); },
  overhead: el => { db.settings.overhead[el.dataset.k] = ['mode', 'note'].includes(el.dataset.k) ? el.value : num(el.value); save(); if (el.dataset.k === 'mode') render(); },
  custConsent: el => { const c = byId('customers', el.dataset.id); c.consent = { sms: true, email: true, call: true, ...(c.consent || {}) }; c.consent[el.dataset.ch] = el.checked; (c.consentLog = c.consentLog || []).unshift({ ts: iso(new Date()), by: me(), text: `${el.dataset.ch.toUpperCase()} ${el.checked ? 'opt-in' : 'opt-out'}` }); save(); render(); },
  custLang: el => { byId('customers', el.dataset.id).lang = el.value; save(); },
});


/* ═════════════ PHASE 4 — FIELD & POST-SALE ═════════════ */
const P4_COLLS = ['tickets', 'warranties'];
const TK_ST = { new: ['New', 'warn'], scheduled: ['Scheduled', 'info'], inprogress: ['In progress', 'brand'], resolved: ['Resolved', 'ok'], closed: ['Closed', ''] };
const TK_PRI = { low: ['Low', ''], normal: ['Normal', 'info'], high: ['High', 'warn'], urgent: ['Urgent', 'bad'] };
const SERIAL_DEFAULTS = { solar: ['Inverter / microinverters', 'Battery', 'Production meter / gateway', 'Solar modules (one serial is enough)'], hvac: ['Outdoor unit', 'Indoor unit / air handler', 'Thermostat'], roofing: [] };
const WARRANTY_DEFAULTS = {
  solar: [['Workmanship', 'Nexis Power', 10, false], ['Roof penetrations (leaks)', 'Nexis Power', 10, false], ['Solar modules — product', 'Manufacturer', 25, true], ['Inverter / microinverters', 'Manufacturer', 25, true], ['Battery', 'Manufacturer', 10, true]],
  hvac: [['Workmanship / labor', 'Nexis Power', 2, false], ['Parts (registered)', 'Manufacturer', 10, true], ['Compressor', 'Manufacturer', 10, true]],
  roofing: [['Workmanship', 'Nexis Power', 10, false], ['Roof system — manufacturer', 'Manufacturer', 25, true]],
};
function p4Init() {
  P4_COLLS.forEach(k => db[k] = db[k] || []);
  const s = db.settings;
  if (!s.serialReqs) s.serialReqs = JSON.parse(JSON.stringify(SERIAL_DEFAULTS));
  if (!s.warrantyDefaults) s.warrantyDefaults = JSON.parse(JSON.stringify(WARRANTY_DEFAULTS));
  if (s.serviceRate == null) s.serviceRate = 125;
  if (s.partsMarkup == null) s.partsMarkup = 40;
  s.counters = s.counters || {};
}
const myTech = () => db.techs.find(t => (t.email || '').toLowerCase() === me().toLowerCase()) || (state.iam && tech(state.iam));
const techRate = t => { const r = (db.settings.techRates || {})[t && t.id]; return num(r != null && r !== '' ? r : (db.settings.laborRate || 45)); };
const dl = (d, n) => ymd(addDays(parseLocal(d), n));

// ── Upload queue (photos taken offline or when the upload fails) ──
const UQ = { db: null, list: [] };
function uqOpen() { return UQ.db || (UQ.db = new Promise((res, rej) => { try { const r = indexedDB.open('opsboss-uploads', 1); r.onupgradeneeded = () => r.result.createObjectStore('q', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } })); }
async function uqTx(mode, fn) { const d = await uqOpen(); return new Promise((res, rej) => { const tx = d.transaction('q', mode), st = tx.objectStore('q'); const out = fn(st); tx.oncomplete = () => res(out && out.result !== undefined ? out.result : out); tx.onerror = () => rej(tx.error); }); }
const uqPut = item => uqTx('readwrite', st => st.put(item));
const uqDel = id => uqTx('readwrite', st => st.delete(id));
const uqAll = () => uqTx('readonly', st => st.getAll());
async function uqRefresh() { try { UQ.list = (await uqAll()) || []; } catch (e) { UQ.list = []; } const b = $('#uqBar'); if (b) b.outerHTML = uqBar(); }
const uqBar = () => { const n = UQ.list.length, failed = UQ.list.filter(x => x.error).length; return `<div id="uqBar">${n ? `<div class="card mb" style="border-color:${failed ? 'var(--bad)' : 'var(--warn)'}"><div class="card-b row" style="justify-content:space-between;flex-wrap:wrap"><span class="small b">${failed ? `⚠ ${failed} upload${failed > 1 ? 's' : ''} failed` : `⏳ ${n} photo${n > 1 ? 's' : ''} waiting to upload`}${navigator.onLine === false ? ' · you are offline' : ''}</span><span class="small muted">${failed ? esc(UQ.list.find(x => x.error).error) : 'They upload automatically when the connection is back.'}</span><button class="btn sm primary" data-act="uqRetry">↻ Retry now</button></div></div>` : ''}</div>`; };
async function uqFlush(manual) {
  if (!cloud.on || UQ.busy) return; UQ.busy = true; let ok = 0;
  try {
    for (const it of (await uqAll()) || []) {
      try {
        const { error } = await cloud.sb.storage.from('opsboss-photos').upload(it.path, it.blob, { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
        await uqDel(it.id); ok++;
        const j = db.jobs.find(x => x.id === it.jobId), s = j && (j.reqPhotos || []).find(x => x.id === it.id);
        if (s) { delete s.pending; s.uploadedAt = iso(new Date()); }
      } catch (e) { it.error = e.message || String(e); it.attempts = (it.attempts || 0) + 1; it.lastTry = iso(new Date()); await uqPut(it); }
    }
  } finally { UQ.busy = false; }
  if (ok) { runLog('photos.upload', `${ok} queued photo${ok > 1 ? 's' : ''} uploaded`); save(); }
  await uqRefresh(); if (ok || manual) { toast(ok ? `📷 ${ok} photo${ok > 1 ? 's' : ''} uploaded` : 'Still waiting for a connection'); render(); }
}
window.addEventListener('online', () => setTimeout(() => uqFlush(), 1500));

// ── Handover (completion package) ──
function handoverStatus(j) {
  projInit(j);
  const st = photoStatus(j), pend = (j.reqPhotos || []).filter(s => s.pending).length;
  const reqSerials = (db.settings.serialReqs || {})[j.division] || [], eq = j.installedEquip || [];
  const missingSerials = reqSerials.filter(t => !eq.some(e => e.type === t && String(e.serial || '').trim()));
  const permits = db.permits.filter(p => p.jobId === j.id), openPermits = permits.filter(p => !['passed', 'approved'].includes(p.status));
  const F = finOf(j);
  return [
    { key: 'photos', label: 'Required photos', ok: !st.missing.length && !pend, detail: st.missing.length ? `${st.missing.length} missing` : pend ? `${pend} still uploading` : `${st.requiredDone}/${st.required}`, href: '#/photos/' + j.id },
    { key: 'serials', label: 'Equipment serial numbers', ok: !missingSerials.length, detail: missingSerials.length ? 'Missing: ' + missingSerials.join(', ') : `${eq.length} recorded`, href: '#/wo/' + j.id },
    { key: 'inspections', label: 'Permits & inspections', ok: !openPermits.length, detail: permits.length ? (openPermits.length ? openPermits.map(p => `${p.type}: ${PERMIT_ST[p.status] ? PERMIT_ST[p.status][0] : p.status}`).join(', ') : 'All passed') : 'None on file', href: '#/permits' },
    { key: 'signoff', label: 'Customer sign-off', ok: !!j.signoff, detail: j.signoff ? `${j.signoff.name} · ${fDate(j.signoff.at)}` : 'Not signed', href: '#/wo/' + j.id },
    { key: 'invoice', label: 'Final invoice', ok: F.revenue <= 0.009 || F.unbilled <= 0.009, detail: F.unbilled > 0.009 ? money2(F.unbilled) + ' not invoiced' : 'Invoiced', href: '#/job/' + j.id },
  ];
}
// Al completar la instalación: pide lo que falta, registra garantías y guarda el equipo en el cliente. Idempotente.
function onCompleted(j) {
  p4Init(); projInit(j);
  const c = cust(j.customerId), today = ymd(new Date()), items = handoverStatus(j); let tasks = 0, wn = 0;
  items.filter(i => !i.ok && i.key !== 'invoice').forEach(i => { const dedupe = 'ho:' + j.id + ':' + i.key; if (db.tasks.some(t => t.dedupe === dedupe && !t.done)) return; db.tasks.unshift({ id: uid(), title: `Handover ${j.number}: ${i.label} — ${i.detail}`, due: today, assignee: (j.techIds || [])[0] || '', done: false, customerId: j.customerId, link: { kind: 'job', id: j.id }, wf: 'Installation complete', createdAt: iso(new Date()), dedupe }); tasks++; });
  if (!db.warranties.some(w => w.jobId === j.id) && !j.ticketId) {
    for (const [type, provider, years, reg] of ((db.settings.warrantyDefaults || {})[j.division] || [])) {
      const eqm = (j.installedEquip || []).find(e => type.toLowerCase().includes(String(e.type).split(' ')[0].toLowerCase()));
      db.warranties.push({ id: uid(), jobId: j.id, customerId: j.customerId, division: j.division, type, provider, item: eqm ? [eqm.brand, eqm.model].filter(Boolean).join(' ') : '', serial: eqm ? eqm.serial : '', start: today, end: dl(today, Math.round(num(years) * 365.25)), years: num(years), needsRegistration: !!reg, registered: !reg, registerBy: reg ? dl(today, 60) : '', createdAt: iso(new Date()) });
      if (reg) db.tasks.unshift({ id: uid(), title: `Register ${type} warranty with the manufacturer (${j.number})`, due: dl(today, 30), assignee: '', done: false, customerId: j.customerId, link: { kind: 'job', id: j.id }, wf: 'Warranty registration', createdAt: iso(new Date()), dedupe: 'wreg:' + j.id + ':' + type });
      wn++;
    }
  }
  (j.installedEquip || []).forEach(e => { c.equipment = c.equipment || []; if (c.equipment.some(x => x.fromJob === j.id && x.serial === e.serial && x.type === e.type)) return; const w = db.warranties.filter(x => x.jobId === j.id).sort((a, b) => b.end.localeCompare(a.end))[0]; c.equipment.push({ id: uid(), type: e.type, brand: e.brand || '', model: e.model || '', serial: e.serial || '', installed: today, warranty: w ? w.end : '', fromJob: j.id }); });
  j.handover = { ...(j.handover || {}), completedAt: iso(new Date()), ready: items.every(i => i.ok) };
  hist(j, `Installation complete: ${wn} warranties registered, ${tasks} handover task${tasks === 1 ? '' : 's'} created`);
  runLog('job.completed', `${j.number}: handover ${items.filter(i => i.ok).length}/${items.length} ready · ${wn} warranties started · ${tasks} tasks`, { key: 'complete:' + j.id });
}
async function handoverPdf(j) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'pt', format: 'letter' }), s = db.settings, c = cust(j.customerId), M = 40;
  const pt = x => String(x ?? '').replace(/[—–]/g, '-').replace(/·/g, '|').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x00-\xFF]/g, '');
  let y = 60; const line = (t, size = 10, bold = false, color = 20) => { if (y > 740) { doc.addPage(); y = 50; } doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(color); const w = doc.splitTextToSize(pt(t), 532); doc.text(w, M, y); y += w.length * (size + 4); };
  line(s.company || 'OpsBoss', 18, true); line([s.address, s.phone, s.email, s.license].filter(Boolean).join(' · '), 9, false, 110); y += 12;
  line('Project Handover Package', 16, true); line(`${j.number} · ${j.title}`, 11); line(`${c.name} · ${projAddress(j)}`, 10, false, 90); line(`Completed: ${fDate(j.completedAt || new Date())}`, 10, false, 90); y += 10;
  line('Checklist', 12, true); handoverStatus(j).forEach(i => line(`${i.ok ? '[x]' : '[ ]'} ${i.label} — ${i.detail}`)); y += 8;
  line('Installed equipment', 12, true); (j.installedEquip || []).forEach(e => line(`${e.type}: ${[e.brand, e.model].filter(Boolean).join(' ')} · S/N ${e.serial || '-'}`)); if (!(j.installedEquip || []).length) line('None recorded', 10, false, 120); y += 8;
  line('Warranties', 12, true); db.warranties.filter(w => w.jobId === j.id).forEach(w => line(`${w.type} (${w.provider}) · ${fDate(parseLocal(w.start))} to ${fDate(parseLocal(w.end))}${w.needsRegistration ? (w.registered ? ' · registered ' + (w.regNumber || '') : ' · registration pending') : ''}`)); y += 8;
  line('Permits & inspections', 12, true); db.permits.filter(p => p.jobId === j.id).forEach(p => line(`${p.type} · ${p.jurisdiction || ''} · #${p.number || '-'} · ${PERMIT_ST[p.status] ? PERMIT_ST[p.status][0] : p.status}`)); y += 8;
  if (j.signoff) { line('Customer sign-off', 12, true); line(`${j.signoff.name} · ${new Date(j.signoff.at).toLocaleString('en-US')}`); if (j.signoff.sig) { if (y > 640) { doc.addPage(); y = 50; } try { doc.addImage(j.signoff.sig, 'PNG', M, y, 220, 80); y += 90; } catch (e) { /* firma no disponible */ } } }
  line('Service & warranty claims: ' + [s.phone, s.email].filter(Boolean).join(' · '), 9, false, 110);
  doc.save(`${j.number}-handover.pdf`);
  runLog('handover.pdf', `${j.number}: handover package generated`);
}

// ── Mobile work order ──
ROUTES.wo = id => {
  const j = db.jobs.find(x => x.id === id); if (!j) return '<div class="empty">Work order not found</div>';
  projInit(j); p4Init();
  const c = cust(j.customerId), st = photoStatus(j), mt = myTech(), prop = (c.properties || []).find(p => p.id === j.propertyId) || {};
  const addr = projAddress(j), today = ymd(new Date());
  const stage = j.ops.stage, tasks = (j.ops.tasks[stage] || []);
  const clockOn = mt && j.clock && j.clock[mt.id];
  const hoursToday = sumBy(j.fin.labor.filter(l => l.date === today), l => l.hours);
  const reqSerials = (db.settings.serialReqs || {})[j.division] || [];
  const next = { scheduled: ['enroute', '🚐 On my way'], unscheduled: ['enroute', '🚐 On my way'], enroute: ['inprogress', '▶ Start work'], inprogress: ['completed', '✓ Complete job'] }[j.status];
  const ho = handoverStatus(j), permits = db.permits.filter(p => p.jobId === j.id);
  const sec = (title, body, extra = '') => `<div class="card mb"><div class="card-h"><h3>${title}</h3>${extra}</div><div class="card-b">${body}</div></div>`;
  return `<div class="small muted mb"><a href="#/field">Field</a> / ${j.number}</div>` + uqBar() + `
  <div class="card mb"><div class="card-b">
    <div class="row" style="justify-content:space-between;flex-wrap:wrap"><div><div class="b" style="font-size:18px">${j.number} · ${esc(j.title)}</div><div class="small muted">${divPill(j.division)} ${j.start ? fDay(j.start) + ' ' + fTime(j.start) + ' · ' + num(j.duration) + ' h' : 'Not scheduled'} · Stage: ${esc(stageLabel(j))}</div></div>${pill(JOB_ST, j.status)}</div>
    <div class="mt"><div class="b">${esc(c.name)}</div><a class="small" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}" target="_blank" rel="noopener">📍 ${esc(addr || 'No address')}</a>${prop.access || (c.property || {}).access ? `<div class="small mt"><b>Access:</b> ${esc(prop.access || c.property.access)}</div>` : ''}${j.notes ? `<div class="small mt"><b>Instructions:</b> ${esc(j.notes)}</div>` : ''}</div>
    <div class="row mt" style="flex-wrap:wrap">${c.phone ? `<a class="btn" href="tel:${esc(c.phone)}">📞 Call</a><a class="btn" href="sms:${esc(c.phone)}">✉ Text</a>` : ''}${next ? `<button class="btn primary" data-act="jobStatus" data-id="${j.id}" data-s="${next[0]}">${next[1]}</button>` : ''}<button class="btn danger" data-act="woIssue" data-id="${j.id}">⚠ Report a problem</button></div>
  </div></div>
  ${sec('⏱ Time', `${mt ? `<div class="row" style="flex-wrap:wrap"><button class="btn ${clockOn ? 'danger' : 'primary'}" data-act="woClock" data-id="${j.id}">${clockOn ? `■ Clock out (since ${fTime(j.clock[mt.id])})` : '▶ Clock in'}</button><span class="small muted">You: ${esc(mt.name)}</span></div>` : `<label class="f">Who are you?<select class="inp" data-act-input="iam">${techOptions().map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></label>`}
    <div class="small mt">${j.fin.labor.length ? j.fin.labor.slice(-6).map(l => `<div class="list-item small"><div style="flex:1">${esc((tech(l.techId) || {}).name || l.who || '')} · ${fDate(parseLocal(l.date))}</div><b>${num(l.hours)} h</b></div>`).join('') : '<span class="muted">No hours logged yet.</span>'}</div>
    <div class="row mt"><span class="small b">Today: ${hoursToday} h</span><button class="btn sm" data-act="woHours" data-id="${j.id}">＋ Add hours</button></div>`)}
  ${sec('✓ Tasks — ' + esc(stageLabel(j)), tasks.map(t => `<label class="check" style="padding:8px 0"><input type="checkbox" data-act-input="opsTask" data-id="${j.id}" data-s="${stage}" data-t="${t.id}" ${t.done ? 'checked' : ''}><span>${esc(t.t)}${t.doneBy ? ` <span class="small muted">· ${esc(t.doneBy)}</span>` : ''}</span></label>`).join('') + ((j.checklist || []).length ? `<details class="mt"><summary class="small b">Job checklist (${j.checklist.filter(t => t.done).length}/${j.checklist.length})</summary>${j.checklist.map(t => `<label class="check" style="padding:8px 0"><input type="checkbox" data-act-input="check" data-id="${j.id}" data-c="${t.id}" ${t.done ? 'checked' : ''}><span>${esc(t.t)}</span></label>`).join('')}</details>` : '') || '<span class="muted small">No tasks for this stage.</span>')}
  ${sec('📷 Photos', `${photoProgress(st)}<div class="row mt" style="justify-content:space-between"><span class="small">${st.done}/${st.total} photos · ${st.missing.length ? `<b class="down">${st.missing.length} required missing</b>` : '<b class="up">All required ✓</b>'}${(j.reqPhotos || []).some(s => s.pending) ? ` · ⏳ ${(j.reqPhotos || []).filter(s => s.pending).length} uploading` : ''}</span><a class="btn primary" href="#/photos/${j.id}">Open checklist</a></div>`)}
  ${sec('🔧 Scope', (j.items || []).map(i => `<div class="list-item small"><div style="flex:1">${esc(i.name)}</div><b>× ${num(i.qty)}</b></div>`).join('') || '<span class="muted small">No line items.</span>')}
  ${sec('📦 Materials used', (j.materials || []).map(m => `<div class="list-item small"><div style="flex:1">${esc(m.name)}${m.serial ? ` · S/N ${esc(m.serial)}` : ''}<div class="muted">${esc(m.by || '')} · ${fDate(m.ts)}</div></div><b>× ${num(m.qty)} ${esc(m.unit || '')}</b><button class="btn ghost sm danger" data-act="woMatDel" data-id="${j.id}" data-m="${m.id}">✕</button></div>`).join('') || '<span class="muted small">Nothing logged yet.</span>', `<button class="btn sm" data-act="woMat" data-id="${j.id}">＋ Material</button>`)}
  ${sec('🏷 Equipment & serial numbers', `${reqSerials.map(t => { const e = (j.installedEquip || []).find(x => x.type === t); return `<div class="list-item small"><span class="pill ${e && e.serial ? 'ok' : 'warn'}">${e && e.serial ? '✓' : 'Needed'}</span><div style="flex:1"><b>${esc(t)}</b>${e ? `<div class="muted">${esc([e.brand, e.model].filter(Boolean).join(' '))} · S/N ${esc(e.serial || '—')}</div>` : ''}</div><button class="btn sm" data-act="woEquip" data-id="${j.id}" data-t="${esc(t)}">${e ? 'Edit' : 'Add'}</button></div>`; }).join('')}${(j.installedEquip || []).filter(e => !reqSerials.includes(e.type)).map(e => `<div class="list-item small"><span class="pill ok">✓</span><div style="flex:1"><b>${esc(e.type)}</b><div class="muted">${esc([e.brand, e.model].filter(Boolean).join(' '))} · S/N ${esc(e.serial || '—')}</div></div><button class="btn sm" data-act="woEquip" data-id="${j.id}" data-e="${e.id}">Edit</button></div>`).join('')}`, `<button class="btn sm" data-act="woEquip" data-id="${j.id}">＋ Other</button>`)}
  ${(j.issues || []).length ? sec('⚠ Problems reported', j.issues.map(i => `<div class="list-item small"><span class="pill ${i.resolvedAt ? 'ok' : i.stops ? 'bad' : 'warn'}">${i.resolvedAt ? 'Resolved' : i.stops ? 'Stops work' : 'Open'}</span><div style="flex:1">${esc(i.text)}<div class="muted">${esc(i.by)} · ${fDate(i.ts)}</div></div></div>`).join('')) : ''}
  ${sec('📄 Documents', `${permits.map(p => `<div class="list-item small"><div style="flex:1">${esc(p.type)} permit ${p.number ? '#' + esc(p.number) : ''}</div>${pill(PERMIT_ST, p.status)}</div>`).join('') || '<div class="small muted">No permits on file.</div>'}<div class="row mt" style="flex-wrap:wrap"><button class="btn sm" data-act="photoPdf" data-id="${j.id}">⇩ Photo report</button><button class="btn sm" data-act="handoverPdf" data-id="${j.id}">⇩ Handover package</button></div>`)}
  ${sec('✍ Customer sign-off', j.signoff ? `<div class="row"><img src="${j.signoff.sig}" alt="Signature" style="height:60px;background:#fff;border:1px solid var(--border);border-radius:8px"><div class="small"><b>${esc(j.signoff.name)}</b><br>${new Date(j.signoff.at).toLocaleString('en-US')}</div></div>` : `<p class="small muted">Ask the customer to review the work and sign on the screen.</p><button class="btn primary" data-act="woSign" data-id="${j.id}">✍ Collect signature</button>`)}
  ${sec('Handover checklist', ho.map(i => `<div class="list-item small"><span class="pill ${i.ok ? 'ok' : 'warn'}">${i.ok ? '✓' : '…'}</span><div style="flex:1"><a href="${i.href}">${esc(i.label)}</a><div class="muted">${esc(i.detail)}</div></div></div>`).join(''))}`;
};
ROUTES['wo:after'] = () => { uqRefresh(); };
function sigPad(title, onDone) {
  modal({ title, body: `<label class="f">Customer name<input class="inp" id="sgName"></label><p class="small muted mt">Sign below</p><canvas id="sgPad" style="width:100%;height:180px;border:2px dashed var(--border);border-radius:12px;background:#fff;touch-action:none"></canvas><button class="btn sm mt" id="sgClear">Clear</button>`, foot: '<button class="btn" data-dismiss>Cancel</button><button class="btn primary" id="sgOk">Save signature</button>', onMount(bg, close) {
    const cv = $('#sgPad', bg), ctx = cv.getContext('2d'); const fit = () => { const r = cv.getBoundingClientRect(); cv.width = r.width * 2; cv.height = r.height * 2; ctx.scale(2, 2); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0f172a'; }; fit();
    let drawing = false, ink = false; const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.onpointerdown = e => { drawing = true; ink = true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); };
    cv.onpointermove = e => { if (!drawing) return; ctx.lineTo(...pos(e)); ctx.stroke(); };
    cv.onpointerup = () => { drawing = false; };
    $('#sgClear', bg).onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); ink = false; };
    $('#sgOk', bg).onclick = () => { const n = $('#sgName', bg).value.trim(); if (n.length < 2 || !ink) { toast('Name and signature are required'); return; } onDone({ name: n, sig: cv.toDataURL('image/png'), at: iso(new Date()), by: me() }); close(); save(); render(); };
  } });
}

// ── Service tickets & warranties ──
const tkNum = () => { p4Init(); const max = Math.max(1000, num(db.settings.counters.ticket), ...db.tickets.map(t => parseInt(String(t.number || '').replace(/\D/g, ''), 10) || 0)); db.settings.counters.ticket = max + 1; return 'T-' + (max + 1); };
const tkCost = t => sumBy(t.time, x => num(x.hours) * techRate(tech(x.techId))) + sumBy(t.parts, x => num(x.qty) * num(x.cost));
function tkWarranty(t) {
  const on = ymd(t.createdAt || new Date());
  return db.warranties.filter(w => (w.jobId && w.jobId === t.jobId) || (!t.jobId && w.customerId === t.customerId)).filter(w => w.start <= on && w.end >= on);
}
function tkHist(t, text) { (t.history = t.history || []).unshift({ ts: iso(new Date()), by: me(), text }); }
// Publica el costo del ticket: garantía → costo del proyecto original (categoría Warranty); si no, queda facturable.
function tkPostCost(t) {
  const j = t.jobId && db.jobs.find(x => x.id === t.jobId); if (!j) return;
  projInit(j); j.fin.costs = j.fin.costs.filter(c => c.ticketId !== t.id);
  if (t.warranty && tkCost(t) > 0) { j.fin.costs.push({ id: uid(), category: 'Warranty', amount: Math.round(tkCost(t) * 100) / 100, vendor: 'Service ' + t.number, note: t.title, date: ymd(new Date()), by: me(), paid: true, ticketId: t.id, receipt: 'ticket' }); hist(j, `Warranty service ${t.number}: ${money2(tkCost(t))} charged to this project`); }
}
function ticketModal(t, preset = {}) {
  p4Init();
  const isNew = !t; t = t || { priority: 'normal', source: 'phone', ...preset };
  const custJobs = cid => [['', '— None —'], ...db.jobs.filter(j => j.customerId === cid).map(j => [j.id, `${j.number} · ${j.title}`])];
  form({ title: isNew ? 'New service ticket' : 'Edit ' + t.number, fields: [
    { k: 'customerId', label: 'Customer', type: 'select', options: custOptions(), value: t.customerId },
    { k: 'jobId', label: 'Project', type: 'select', options: custJobs(t.customerId || (db.customers[0] || {}).id), value: t.jobId || '' },
    { k: 'title', label: 'Problem', full: true, required: true, value: t.title, ph: 'e.g. Inverter shows a red light' },
    { k: 'description', label: 'Details', type: 'textarea', full: true, value: t.description },
    { k: 'priority', label: 'Priority', type: 'select', options: Object.entries(TK_PRI).map(([k, v]) => [k, v[0]]), value: t.priority },
    { k: 'source', label: 'Source', type: 'select', options: [['phone', 'Phone'], ['portal', 'Customer portal'], ['email', 'Email / text'], ['internal', 'Internal / inspection']], value: t.source },
    { k: 'assignee', label: 'Technician', type: 'select', options: techOptions(), value: t.assignee || '' },
  ], onSave(v) {
    const j = v.jobId && db.jobs.find(x => x.id === v.jobId);
    if (isNew) { const nt = { id: uid(), number: tkNum(), ...v, division: j ? j.division : (state.div !== 'all' ? state.div : 'hvac'), status: 'new', createdAt: iso(new Date()), time: [], parts: [], history: [] }; nt.warranty = tkWarranty(nt).length > 0; tkHist(nt, `Ticket opened (${v.source})${nt.warranty ? ' · under warranty' : ''}`); db.tickets.unshift(nt); runLog('ticket.new', `${nt.number} ${nt.title} · ${cust(nt.customerId).name}`); setTimeout(() => location.hash = '#/ticket/' + nt.id); }
    else { Object.assign(t, v); tkHist(t, 'Details updated'); }
  } });
  const sel = $('[name=customerId]'); if (sel) sel.onchange = () => { $('[name=jobId]').innerHTML = custJobs(sel.value).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join(''); };
}
ROUTES.service = () => {
  p4Init();
  const tab = state.tabs.svc || 'tickets', T = db.tickets.filter(t => divOK(t));
  const open = T.filter(t => !['resolved', 'closed'].includes(t.status)), done = T.filter(t => t.resolvedAt && daysSince(t.resolvedAt) <= 90);
  const avg = done.length ? sumBy(done, t => (new Date(t.resolvedAt) - new Date(t.createdAt)) / DAY) / done.length : 0;
  const yr = T.filter(t => daysSince(t.createdAt) <= 365), rep = {}; yr.forEach(t => { const k = (t.jobId || t.customerId) + '|' + String(t.title).toLowerCase().split(/\W+/).filter(w => w.length > 3).slice(0, 2).join(' '); (rep[k] = rep[k] || []).push(t); });
  const repeats = Object.values(rep).filter(x => x.length > 1);
  const exp = db.warranties.filter(w => w.end >= ymd(new Date()) && w.end <= dl(ymd(new Date()), 90)), unreg = db.warranties.filter(w => w.needsRegistration && !w.registered);
  const tRow = t => `<tr class="click" data-go="#/ticket/${t.id}"><td class="b">${t.number}</td><td>${esc(t.title)}<div class="small muted">${esc(cust(t.customerId).name)}${t.jobId ? ' · ' + ((db.jobs.find(j => j.id === t.jobId) || {}).number || '') : ''}</div></td><td>${pill(TK_PRI, t.priority)}</td><td>${t.warranty ? '<span class="pill ok">Warranty</span>' : '<span class="pill">Billable</span>'}</td><td>${esc((tech(t.assignee) || {}).name || '—')}</td><td class="small">${ago(t.createdAt)}</td><td>${pill(TK_ST, t.status)}</td>${canMoney() ? `<td class="right">${money(tkCost(t))}</td>` : ''}</tr>`;
  let body = '';
  if (tab === 'tickets') body = `<div class="card"><div class="table-wrap"><table><thead><tr><th>#</th><th>Problem</th><th>Priority</th><th>Coverage</th><th>Tech</th><th>Opened</th><th>Status</th>${canMoney() ? '<th class="right">Cost</th>' : ''}</tr></thead><tbody>${[...open, ...T.filter(t => !open.includes(t)).slice(0, 30)].map(tRow).join('') || '<tr><td colspan="8" class="empty">No tickets yet.</td></tr>'}</tbody></table></div></div>`;
  if (tab === 'warranties') body = `<div class="card"><div class="table-wrap"><table><thead><tr><th>Project</th><th>Warranty</th><th>Provider</th><th>Item / serial</th><th>Start</th><th>End</th><th>Registration</th></tr></thead><tbody>${db.warranties.filter(w => divOK(w)).sort((a, b) => a.end.localeCompare(b.end)).map(w => { const j = db.jobs.find(x => x.id === w.jobId); return `<tr><td>${j ? `<a href="#/job/${j.id}">${j.number}</a>` : '—'}<div class="small muted">${esc(cust(w.customerId).name)}</div></td><td class="b">${esc(w.type)}</td><td>${esc(w.provider)}</td><td class="small">${esc(w.item || '')}${w.serial ? ' · S/N ' + esc(w.serial) : ''}</td><td>${fDate(parseLocal(w.start))}</td><td class="${w.end < ymd(new Date()) ? 'muted' : ''}">${fDate(parseLocal(w.end))}</td><td>${w.needsRegistration ? (w.registered ? `<span class="pill ok">Registered${w.regNumber ? ' · ' + esc(w.regNumber) : ''}</span>` : `<button class="btn sm" data-act="wReg" data-id="${w.id}">Mark registered</button><div class="small ${w.registerBy < ymd(new Date()) ? 'down' : 'muted'}">by ${fDate(parseLocal(w.registerBy))}</div>`) : '<span class="small muted">Not required</span>'}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">Warranties start automatically when an installation is completed.</td></tr>'}</tbody></table></div></div>`;
  if (tab === 'repeats') body = `<div class="card"><div class="card-b">${repeats.map(list => `<div class="list-item"><span class="pill warn">×${list.length}</span><div style="flex:1"><b>${esc(list[0].title)}</b><div class="small muted">${esc(cust(list[0].customerId).name)} · ${list.map(t => `<a href="#/ticket/${t.id}">${t.number}</a>`).join(', ')}</div></div>${canMoney() ? `<b>${money(sumBy(list, tkCost))}</b>` : ''}</div>`).join('') || '<div class="empty">No repeated problems in the last 12 months ✓</div>'}</div></div>`;
  return head('Service & warranties', 'Service tickets linked to projects and equipment, warranty tracking and post-sale cost', '<button class="btn primary" data-act="tkNew">＋ Ticket</button>') + `
  <div class="grid g4 mb">${kpi('Open tickets', open.length, `${open.filter(t => !t.assignee).length} unassigned`)}${kpi('Avg. resolution', avg ? avg.toFixed(1) + ' days' : '—', 'last 90 days')}${kpi('Repeated problems', repeats.length, 'last 12 months')}${canMoney() ? kpi('Post-sale cost (12 mo)', money(sumBy(yr, tkCost)), `${money(sumBy(yr.filter(t => t.warranty), tkCost))} under warranty`) : kpi('Warranties expiring', exp.length, 'next 90 days')}</div>
  ${unreg.length ? `<div class="card mb" style="border-color:var(--warn)"><div class="card-b small">⚠ ${unreg.length} manufacturer warrant${unreg.length > 1 ? 'ies' : 'y'} not registered yet — <a href="#/service" data-act="tab" data-t="svc" data-v="warranties">review</a></div></div>` : ''}
  <div class="tabs">${[['tickets', `Tickets (${open.length} open)`], ['warranties', `Warranties (${db.warranties.length})`], ['repeats', 'Repeated problems']].map(([k, v]) => `<button data-act="tab" data-t="svc" data-v="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>${body}`;
};
ROUTES.ticket = id => {
  p4Init();
  const t = db.tickets.find(x => x.id === id); if (!t) return '<div class="empty">Ticket not found</div>';
  const c = cust(t.customerId), j = t.jobId && db.jobs.find(x => x.id === t.jobId), ws = tkWarranty(t), prior = db.tickets.filter(x => x.customerId === t.customerId && x.id !== t.id);
  const visit = t.visitJobId && db.jobs.find(x => x.id === t.visitJobId);
  const nextSt = { new: ['inprogress', 'Start work'], scheduled: ['inprogress', 'Start work'], inprogress: null }[t.status];
  return `<div class="small muted mb"><a href="#/service">Service</a> / ${t.number}</div>` + head(`${t.number} · ${esc(t.title)}`, `${esc(c.name)} · opened ${fDate(t.createdAt)} via ${esc(t.source)} ${pill(TK_PRI, t.priority)}`, `${pill(TK_ST, t.status)}<button class="btn" data-act="tkEdit" data-id="${t.id}">Edit</button>${nextSt ? `<button class="btn" data-act="tkStatus" data-id="${t.id}" data-s="${nextSt[0]}">${nextSt[1]}</button>` : ''}${!['resolved', 'closed'].includes(t.status) ? `<button class="btn ok" data-act="tkResolve" data-id="${t.id}">✓ Resolve</button>` : t.status === 'resolved' ? `<button class="btn" data-act="tkStatus" data-id="${t.id}" data-s="closed">Close</button><button class="btn ghost" data-act="tkStatus" data-id="${t.id}" data-s="inprogress">Reopen</button>` : ''}`) + `
  <div class="grid g-2-1"><div>
    <div class="card mb"><div class="card-b">${t.description ? `<p style="white-space:pre-wrap">${esc(t.description)}</p>` : '<p class="muted small">No details.</p>'}${t.contact ? `<p class="small"><b>Customer contact preference:</b> ${esc(t.contact)}</p>` : ''}${t.resolution ? `<div class="auth-msg ok mt"><b>Resolution:</b> ${esc(t.resolution)}</div>` : ''}</div></div>
    <div class="card mb"><div class="card-h"><h3>Visit</h3></div><div class="card-b">${visit ? `<div class="list-item"><div style="flex:1"><a href="#/wo/${visit.id}" class="b">${visit.number}</a> · ${visit.start ? fDay(visit.start) + ' ' + fTime(visit.start) : 'not scheduled'} · ${esc((tech((visit.techIds || [])[0]) || {}).name || 'unassigned')}</div>${pill(JOB_ST, visit.status)}</div>` : `<p class="small muted">Schedule a service visit; it shows up in Schedule & Dispatch and in the technician’s work orders.</p><button class="btn primary" data-act="tkVisit" data-id="${t.id}">📅 Schedule visit</button>`}</div></div>
    <div class="card mb"><div class="card-h"><h3>Time & parts</h3><div class="row"><button class="btn sm" data-act="tkTime" data-id="${t.id}">＋ Time</button><button class="btn sm" data-act="tkPart" data-id="${t.id}">＋ Part</button></div></div><div class="card-b">
      ${t.time.map(x => `<div class="list-item small"><div style="flex:1">⏱ ${esc((tech(x.techId) || {}).name || '')} · ${fDate(parseLocal(x.date))}</div><b>${num(x.hours)} h${canRates() ? ' · ' + money2(num(x.hours) * techRate(tech(x.techId))) : ''}</b></div>`).join('')}
      ${t.parts.map(x => `<div class="list-item small"><div style="flex:1">📦 ${esc(x.name)} × ${num(x.qty)}</div>${canMoney() ? `<b>${money2(num(x.qty) * num(x.cost))}</b>` : ''}</div>`).join('')}
      ${!t.time.length && !t.parts.length ? '<span class="muted small">Nothing logged.</span>' : ''}
      ${canMoney() ? `<div class="row mt" style="justify-content:space-between"><b>Cost to resolve: ${money2(tkCost(t))}</b>${t.warranty ? `<span class="small muted">Charged to ${j ? j.number : 'the project'} as Warranty cost when resolved</span>` : t.invoiceId ? `<a class="btn sm" href="#/invoice/${t.invoiceId}">Invoice ${(db.invoices.find(i => i.id === t.invoiceId) || {}).number || ''}</a>` : `<button class="btn sm ok" data-act="tkInvoice" data-id="${t.id}">$ Invoice customer</button>`}</div>` : ''}
    </div></div>
    <div class="card"><div class="card-h"><h3>History</h3></div><div class="card-b"><div class="timeline">${(t.history || []).map(h => `<div class="ev"><div>${esc(h.text)}</div><div class="small muted">${esc(h.by || '')} · ${new Date(h.ts).toLocaleString('en-US')}</div></div>`).join('')}</div></div></div>
  </div><div>
    <div class="card mb"><div class="card-h"><h3>Coverage</h3></div><div class="card-b"><label class="check"><input type="checkbox" data-act-input="tkWarranty" data-id="${t.id}" ${t.warranty ? 'checked' : ''}><span><b>Under warranty</b> (no charge to the customer)</span></label>${ws.map(w => `<div class="list-item small"><span class="pill ok">Active</span><div style="flex:1">${esc(w.type)} · ${esc(w.provider)}<div class="muted">until ${fDate(parseLocal(w.end))}</div></div></div>`).join('') || '<div class="small muted mt">No active warranty found for this project.</div>'}</div></div>
    <div class="card mb"><div class="card-h"><h3>Assigned</h3></div><div class="card-b"><select class="inp" data-act-input="tkAssign" data-id="${t.id}">${techOptions().map(([v, n]) => `<option value="${v}" ${t.assignee === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div></div>
    <div class="card mb"><div class="card-h"><h3>Project & equipment</h3></div><div class="card-b">${j ? `<a href="#/job/${j.id}" class="b">${j.number} · ${esc(j.title)}</a><div class="small muted">Completed ${j.completedAt ? fDate(j.completedAt) : '—'}</div>` : '<span class="small muted">No project linked.</span>'}${(c.equipment || []).map(e => `<div class="list-item small"><div style="flex:1"><b>${esc(e.type)}</b> ${esc([e.brand, e.model].filter(Boolean).join(' '))}<div class="muted">S/N ${esc(e.serial || '—')} · installed ${fDate(parseLocal(e.installed))}</div></div></div>`).join('')}</div></div>
    <div class="card"><div class="card-h"><h3>Previous tickets (${prior.length})</h3></div><div class="card-b">${prior.map(x => `<div class="list-item small"><a href="#/ticket/${x.id}">${x.number}</a><div style="flex:1">${esc(x.title)}</div>${pill(TK_ST, x.status)}</div>`).join('') || '<span class="muted small">None.</span>'}</div></div>
  </div></div>`;
};

// ── Project → customer portal link ──
async function projectPortalLink(j) {
  if (!cloud.on) { toast('The customer portal works in the cloud workspace (sign in).'); return; }
  try {
    const { data: tok, error } = await cloud.sb.rpc('opsboss_portal_link', { p_kind: 'project', p_id: j.id });
    if (error) throw error;
    const url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'portal.html?p=' + tok, c = cust(j.customerId);
    modal({ title: 'Customer project portal', body: `<p class="small">${esc(c.name)} can follow the project, see visits, documents, invoices and warranties, pay, and request service. Costs, margins and internal notes are never shown.</p><label class="f">Link<input class="inp" readonly value="${esc(url)}" onclick="this.select()"></label><label class="f mt">Message shown to the customer (optional)<textarea class="inp" id="ppNote" placeholder="e.g. Your permit was approved — we’ll call to schedule the install.">${esc(j.portalNote || '')}</textarea></label>`, foot: `<button class="btn" data-dismiss>Close</button><button class="btn" id="ppSave">Save message</button>${c.phone ? `<a class="btn primary" href="sms:${esc(c.phone)}?body=${encodeURIComponent(`Hi ${c.name}, follow your ${db.settings.company} project here: ${url}`)}">✉ Text link</a>` : ''}`, onMount(bg, close) { $('#ppSave', bg).onclick = () => { j.portalNote = $('#ppNote', bg).value.trim(); hist(j, 'Customer portal message updated'); save(); toast('Saved — the customer sees it in the portal'); close(); }; } });
    runLog('portal.link', `Project portal link for ${j.number}`);
  } catch (e) { toast(e.message || String(e)); }
}

// ── Alerts for phase 4 (called from alertsAll) ──
function p4Alerts(add) {
  if (!db.tickets) return;
  db.tickets.filter(t => t.status === 'new').forEach(t => { const h = (Date.now() - new Date(t.createdAt)) / 36e5; if (!t.assignee || h > 24) add({ key: 'tk:' + t.id, kind: 'Service request', sev: t.priority === 'urgent' || h > 24 ? 'bad' : 'warn', title: `${t.number} ${t.title}`, text: `${cust(t.customerId).name} · ${t.assignee ? 'not started' : 'unassigned'} · ${Math.floor(h)} h`, href: '#/ticket/' + t.id, age: Math.floor(h / 24), level: h > 48 ? 3 : h > 24 ? 2 : 1 }); });
  (db.warranties || []).filter(w => w.needsRegistration && !w.registered && w.registerBy && w.registerBy <= dl(ymd(new Date()), 14)).forEach(w => add({ key: 'wreg:' + w.id, kind: 'Warranty registration', sev: w.registerBy < ymd(new Date()) ? 'bad' : 'warn', title: `Register ${w.type} warranty by ${fDate(parseLocal(w.registerBy))}`, text: ((db.jobs.find(j => j.id === w.jobId) || {}).number || '') + ' · ' + cust(w.customerId).name, href: '#/service', age: 0 }));
  db.jobs.filter(j => (j.issues || []).some(i => !i.resolvedAt)).forEach(j => j.issues.filter(i => !i.resolvedAt).forEach(i => add({ key: 'iss:' + i.id, kind: 'Field problem', sev: i.stops ? 'bad' : 'warn', title: `${j.number}: ${i.text}`, text: `${i.by} · ${fDate(i.ts)}`, href: '#/job/' + j.id, age: daysSince(i.ts) })));
}

/* ───────────── Phase 4 actions ───────────── */
function p4SettingsCard() {
  p4Init();
  const s = db.settings, dis = canAdmin() ? '' : 'disabled';
  return `<div class="card mt"><div class="card-h"><h3>Field, handover & warranties</h3></div><div class="card-b">
    <p class="small muted">Serial numbers the crew must record before handover (one per line).</p>
    ${['solar', 'hvac', 'roofing'].map(k => `<label class="f mt">${DIV[k].name} — required serials<textarea class="inp" style="min-height:70px;font-size:12.5px" data-act-input="p4Serials" data-k="${k}" ${dis}>${esc((s.serialReqs[k] || []).join('\n'))}</textarea></label>`).join('')}
    <p class="small muted mt">Warranties started automatically when an installation is completed. One per line: <code>Name | Provider | Years | register</code> (add “register” when the manufacturer requires registration).</p>
    ${['solar', 'hvac', 'roofing'].map(k => `<label class="f mt">${DIV[k].name} — warranties<textarea class="inp" style="min-height:90px;font-size:12.5px" data-act-input="p4Warr" data-k="${k}" ${dis}>${esc((s.warrantyDefaults[k] || []).map(w => [w[0], w[1], w[2], w[3] ? 'register' : ''].filter(x => x !== '').join(' | ')).join('\n'))}</textarea></label>`).join('')}
    ${canRates() ? `<div class="form mt"><label class="f">Service labor rate charged to customers ($/h)<input class="inp" type="number" data-act-input="setting" data-k="serviceRate" value="${esc(s.serviceRate)}" ${dis}></label><label class="f">Parts markup on service invoices (%)<input class="inp" type="number" data-act-input="setting" data-k="partsMarkup" value="${esc(s.partsMarkup)}" ${dis}></label><label class="f">Default loaded labor cost ($/h)<input class="inp" type="number" data-act-input="setting" data-k="laborRate" value="${esc(s.laborRate || 45)}" ${dis}></label></div>` : ''}
  </div></div>`;
}
const pbOpts = div => [['', '— Other (type the name) —'], ...db.pricebook.filter(p => !div || p.division === div).map(p => [p.id, p.name])];
Object.assign(ACT, {
  uqRetry: () => uqFlush(true),
  woClock: el => {
    const j = projInit(byId('jobs', el.dataset.id)), mt = myTech(); if (!mt) { toast('Choose who you are first'); return; }
    j.clock = j.clock || {};
    if (j.clock[mt.id]) { const h = Math.max(0.25, Math.round((Date.now() - new Date(j.clock[mt.id])) / 36e5 * 4) / 4); const lid = uid(); if (canRates()) compOf(j, true).labor[lid] = techRate(mt); j.fin.labor.push({ id: lid, techId: mt.id, hours: h, date: ymd(new Date()), by: me(), src: 'clock', from: j.clock[mt.id], to: iso(new Date()) }); delete j.clock[mt.id]; hist(j, `${mt.name} clocked out: ${h} h`); toast(`Clocked out · ${h} h logged`); }
    else { j.clock[mt.id] = iso(new Date()); hist(j, `${mt.name} clocked in`); toast('Clocked in'); }
    save(); render();
  },
  woHours: el => { const j = projInit(byId('jobs', el.dataset.id)), mt = myTech(); form({ title: 'Add hours', fields: [{ k: 'techId', label: 'Crew member', type: 'select', options: techOptions(), value: mt ? mt.id : '' }, { k: 'hours', label: 'Hours', type: 'number', step: '0.25', required: true }, { k: 'date', label: 'Date', type: 'date', value: ymd(new Date()) }], onSave(v) { if (!v.techId) { toast('Choose the crew member'); return false; } const lid = uid(); if (canRates()) compOf(j, true).labor[lid] = techRate(tech(v.techId)); j.fin.labor.push({ id: lid, techId: v.techId, hours: num(v.hours), date: v.date, by: me(), src: 'field' }); hist(j, `Hours logged: ${tech(v.techId).name} ${v.hours} h`); } }); },
  woIssue: el => { const j = projInit(byId('jobs', el.dataset.id)); form({ title: 'Report a problem', fields: [{ k: 'text', label: 'What happened?', type: 'textarea', full: true, required: true }, { k: 'stops', label: 'Does it stop the work?', type: 'select', options: [['no', 'No — keep working'], ['yes', 'Yes — work cannot continue']] }], onSave(v) {
    const i = { id: uid(), text: v.text, stops: v.stops === 'yes', by: me(), ts: iso(new Date()) }; (j.issues = j.issues || []).push(i);
    db.tasks.unshift({ id: uid(), title: `Field problem ${j.number}: ${v.text.slice(0, 80)}`, notes: v.text, due: ymd(new Date()), assignee: '', done: false, customerId: j.customerId, link: { kind: 'job', id: j.id }, wf: 'Field report', createdAt: iso(new Date()) });
    if (i.stops) j.blockers.push({ id: i.id, reason: 'Field: ' + v.text.slice(0, 120), owner: j.owner || '', followUp: ymd(new Date()), createdAt: iso(new Date()), by: me() });
    hist(j, `⚠ Problem reported${i.stops ? ' (work stopped)' : ''}: ${v.text}`); runLog('field.issue', `${j.number}: ${v.text.slice(0, 100)}`); toast('Reported — the office was notified');
  } }); },
  woMat: el => { const j = projInit(byId('jobs', el.dataset.id)); form({ title: 'Material used', fields: [{ k: 'pb', label: 'From price book', type: 'select', options: pbOpts(j.division), full: true }, { k: 'name', label: 'Or name', full: true }, { k: 'qty', label: 'Quantity', type: 'number', step: 'any', value: 1, required: true }, { k: 'serial', label: 'Serial # (if any)' }], onSave(v) {
    const p = v.pb && db.pricebook.find(x => x.id === v.pb), name = p ? p.name : v.name; if (!name) { toast('Choose an item or type its name'); return false; }
    const m = { id: uid(), name, qty: num(v.qty), unit: p ? p.unit : '', serial: v.serial, cost: p ? num(p.cost) : 0, by: me(), ts: iso(new Date()) }; (j.materials = j.materials || []).push(m);
    if (m.cost) j.fin.costs.push({ id: uid(), category: 'Materials', amount: Math.round(m.cost * m.qty * 100) / 100, vendor: 'Field stock', note: `${name} × ${m.qty}`, date: ymd(new Date()), by: me(), paid: true, materialId: m.id, receipt: 'field' });
    hist(j, `Material used: ${name} × ${m.qty}`);
  } }); },
  woMatDel: el => { const j = projInit(byId('jobs', el.dataset.id)), m = j.materials.find(x => x.id === el.dataset.m); j.materials = j.materials.filter(x => x !== m); j.fin.costs = j.fin.costs.filter(c => c.materialId !== m.id); hist(j, `Material removed: ${m.name}`); save(); render(); },
  woEquip: el => { const j = projInit(byId('jobs', el.dataset.id)), e = el.dataset.e ? (j.installedEquip || []).find(x => x.id === el.dataset.e) : (j.installedEquip || []).find(x => x.type === el.dataset.t); form({ title: 'Equipment', fields: [{ k: 'type', label: 'Type', value: e ? e.type : (el.dataset.t || ''), required: true }, { k: 'brand', label: 'Brand', value: e && e.brand }, { k: 'model', label: 'Model', value: e && e.model }, { k: 'serial', label: 'Serial number', value: e && e.serial, required: true }], onSave(v) { if (e) Object.assign(e, v); else (j.installedEquip = j.installedEquip || []).push({ id: uid(), ...v, by: me(), ts: iso(new Date()) }); hist(j, `Serial recorded: ${v.type} ${v.serial}`); } }); },
  woSign: el => { const j = projInit(byId('jobs', el.dataset.id)); sigPad('Customer sign-off · ' + j.number, s => { j.signoff = s; hist(j, `Customer sign-off: ${s.name}`); }); },
  handoverPdf: async el => { el.disabled = true; try { await handoverPdf(byId('jobs', el.dataset.id)); } catch (e) { toast('PDF: ' + e.message); } el.disabled = false; },
  projPortal: el => projectPortalLink(byId('jobs', el.dataset.id)),
  tkNew: el => ticketModal(null, el && el.dataset && el.dataset.cust ? { customerId: el.dataset.cust } : {}),
  tkEdit: el => ticketModal(db.tickets.find(t => t.id === el.dataset.id)),
  tkStatus: el => { const t = db.tickets.find(x => x.id === el.dataset.id); tkHist(t, `Status ${t.status} → ${el.dataset.s}`); t.status = el.dataset.s; if (el.dataset.s === 'inprogress') { t.resolvedAt = ''; } save(); render(); },
  tkResolve: el => { const t = db.tickets.find(x => x.id === el.dataset.id); form({ title: 'Resolve ' + t.number, fields: [{ k: 'resolution', label: 'What was done?', type: 'textarea', full: true, required: true }], onSave(v) { t.resolution = v.resolution; t.status = 'resolved'; t.resolvedAt = iso(new Date()); tkPostCost(t); tkHist(t, 'Resolved: ' + v.resolution); runLog('ticket.resolved', `${t.number} resolved in ${((new Date(t.resolvedAt) - new Date(t.createdAt)) / DAY).toFixed(1)} days · cost ${money2(tkCost(t))}${t.warranty ? ' (warranty)' : ''}`); } }); },
  tkVisit: el => { const t = db.tickets.find(x => x.id === el.dataset.id); const j = { id: uid(), number: nextNum('job'), customerId: t.customerId, division: t.division || 'hvac', title: `Service ${t.number}: ${t.title}`, techIds: t.assignee ? [t.assignee] : [], start: null, duration: 2, status: 'unscheduled', items: [], checklist: [], photos: [], ticketId: t.id, notes: t.description || '', propertyId: ((db.jobs.find(x => x.id === t.jobId)) || {}).propertyId, createdAt: iso(new Date()) }; db.jobs.unshift(j); t.visitJobId = j.id; t.status = 'scheduled'; tkHist(t, `Service visit ${j.number} created`); save(); jobModal(j); },
  tkTime: el => { const t = db.tickets.find(x => x.id === el.dataset.id); form({ title: 'Log time · ' + t.number, fields: [{ k: 'techId', label: 'Technician', type: 'select', options: techOptions(), value: t.assignee }, { k: 'hours', label: 'Hours', type: 'number', step: '0.25', required: true }, { k: 'date', label: 'Date', type: 'date', value: ymd(new Date()) }], onSave(v) { if (!v.techId) { toast('Choose the technician'); return false; } t.time.push({ id: uid(), techId: v.techId, hours: num(v.hours), date: v.date, by: me() }); tkHist(t, `Time: ${tech(v.techId).name} ${v.hours} h`); if (t.status === 'resolved') tkPostCost(t); } }); },
  tkPart: el => { const t = db.tickets.find(x => x.id === el.dataset.id); form({ title: 'Part used · ' + t.number, fields: [{ k: 'pb', label: 'From price book', type: 'select', options: pbOpts(t.division), full: true }, { k: 'name', label: 'Or name', full: true }, { k: 'qty', label: 'Quantity', type: 'number', step: 'any', value: 1 }, ...(canMoney() ? [{ k: 'cost', label: 'Unit cost ($, blank = price book)', type: 'number', step: '0.01' }] : [])], onSave(v) { const p = v.pb && db.pricebook.find(x => x.id === v.pb), name = p ? p.name : v.name; if (!name) { toast('Choose a part or type its name'); return false; } t.parts.push({ id: uid(), name, qty: num(v.qty) || 1, cost: num(v.cost) || (p ? num(p.cost) : 0), price: p ? num(p.price) : 0, by: me() }); tkHist(t, `Part: ${name} × ${num(v.qty) || 1}`); if (t.status === 'resolved') tkPostCost(t); } }); },
  tkInvoice: el => { const t = db.tickets.find(x => x.id === el.dataset.id), s = db.settings; const hrs = sumBy(t.time, x => x.hours); const items = [...(hrs ? [{ id: uid(), name: `Service labor — ${t.number} ${t.title}`, qty: hrs, price: num(s.serviceRate), cost: 0 }] : []), ...t.parts.map(p => ({ id: uid(), name: p.name, qty: p.qty, price: p.price || Math.round(num(p.cost) * (1 + num(s.partsMarkup) / 100) * 100) / 100, cost: p.cost }))]; if (!items.length) { toast('Log time or parts first'); return; } const inv = createInvoice({ customerId: t.customerId, jobId: t.visitJobId || null, division: t.division, items, note: `Service ticket ${t.number}` }); t.invoiceId = inv.id; tkHist(t, `Invoice ${inv.number} created`); save(); location.hash = '#/invoice/' + inv.id; },
  wReg: el => { const w = db.warranties.find(x => x.id === el.dataset.id); const n = prompt(`Registration / confirmation number for ${w.type}:`); if (n === null) return; w.registered = true; w.regNumber = n; w.registeredAt = iso(new Date()); w.registeredBy = me(); const t = db.tasks.find(x => x.dedupe === 'wreg:' + w.jobId + ':' + w.type); if (t) { t.done = true; t.doneAt = iso(new Date()); } runLog('warranty.registered', `${w.type} registered${n ? ' #' + n : ''}`); save(); render(); },
});
Object.assign(INPUT, {
  iam: el => { state.iam = el.value; try { localStorage.setItem('opsboss.iam', el.value); } catch (e) { /* ignore */ } render(); },
  tkWarranty: el => { const t = db.tickets.find(x => x.id === el.dataset.id); t.warranty = el.checked; tkHist(t, el.checked ? 'Marked under warranty' : 'Marked billable'); if (t.status === 'resolved' || t.status === 'closed') tkPostCost(t); save(); render(); },
  tkAssign: el => { const t = db.tickets.find(x => x.id === el.dataset.id); t.assignee = el.value; tkHist(t, 'Assigned to ' + ((tech(el.value) || {}).name || 'nobody')); const v = t.visitJobId && db.jobs.find(x => x.id === t.visitJobId); if (v && el.value && !v.techIds.includes(el.value)) v.techIds = [el.value, ...v.techIds.slice(1)]; save(); render(); },
  p4Serials: el => { db.settings.serialReqs[el.dataset.k] = el.value.split('\n').map(x => x.trim()).filter(Boolean); save(); },
  p4Warr: el => { db.settings.warrantyDefaults[el.dataset.k] = el.value.split('\n').map(l => l.split('|').map(x => x.trim())).filter(p => p[0]).map(p => [p[0], p[1] || 'Nexis Power', num(p[2]) || 1, /register/i.test(p[3] || '')]); save(); },
});
try { state.iam = localStorage.getItem('opsboss.iam') || ''; } catch (e) { /* ignore */ }
// Completar: no se permite con fotos aún subiendo; al completar se arma la entrega y se registran garantías.
const _jobStatus = ACT.jobStatus;
ACT.jobStatus = el => {
  const j = byId('jobs', el.dataset.id), was = j.status;
  if (el.dataset.s === 'completed') { const pend = (j.reqPhotos || []).filter(s => s.pending).length; if (pend) { modal({ title: 'Photos still uploading', body: `<p>${pend} photo${pend > 1 ? 's are' : ' is'} saved on this phone but not uploaded yet. Connect to the internet and retry before completing.</p>`, foot: '<button class="btn" data-dismiss>Close</button><button class="btn primary" data-act="uqRetry" onclick="this.closest(\'.modal-bg\').remove()">↻ Retry uploads</button>' }); return; } }
  _jobStatus(el);
  if (j.status === 'completed' && was !== 'completed') {
    onCompleted(j);
    const t = j.ticketId && db.tickets.find(x => x.id === j.ticketId); if (t && !['resolved', 'closed'].includes(t.status)) { tkHist(t, `Visit ${j.number} completed`); }
    save(); render();
    const ho = handoverStatus(j).filter(i => !i.ok); if (ho.length && !j.ticketId) toast(`Handover: ${ho.length} item${ho.length > 1 ? 's' : ''} pending — tasks created`);
  }
};


/* ═════════════ TEAM DASHBOARDS ═════════════ */
const BOARD_TABS = [['direction', 'Direction'], ['sales', 'Sales'], ['ops', 'Operations'], ['finance', 'Finance'], ['service', 'Service']];
const PERIODS = [['month', 'This month'], ['lastmonth', 'Last month'], ['quarter', 'This quarter'], ['ytd', 'Year to date'], ['12m', 'Last 12 months'], ['custom', 'Custom…']];
function periodRange() {
  const f = state.filters, now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const k = f.bp || 'month';
  if (k === 'lastmonth') return [new Date(y, m - 1, 1), new Date(y, m, 1)];
  if (k === 'quarter') return [new Date(y, Math.floor(m / 3) * 3, 1), addDays(sod(now), 1)];
  if (k === 'ytd') return [new Date(y, 0, 1), addDays(sod(now), 1)];
  if (k === '12m') return [new Date(y - 1, m, now.getDate()), addDays(sod(now), 1)];
  if (k === 'custom' && f.bFrom && f.bTo) return [parseLocal(f.bFrom), addDays(parseLocal(f.bTo), 1)];
  return [new Date(y, m, 1), addDays(sod(now), 1)];
}
const signDate = j => { const e = j.estimateId && db.estimates.find(x => x.id === j.estimateId); return (e && e.approvedAt) || (j.fin && j.fin.budget && j.fin.budget.lockedAt) || j.createdAt; };
const leadOwner = l => (tech(l.owner) || {}).name || l.owner || '';
function projSource(j) { const l = db.leads.find(x => x.customerId === j.customerId && x.stage === 'won' && (!x.division || x.division === j.division)) || db.leads.find(x => x.customerId === j.customerId); return srcEN((l && l.source) || cust(j.customerId).source || '') || 'Unknown'; }
let DR = {};
const drillRow = (t, s, v, href) => ({ t, s, v, href });
function tile(label, value, sub, key, rows, tone = '') { if (key) DR[key] = { title: label, rows: rows || [] }; return `<div class="card kpi ${key ? 'click' : ''}" ${key ? `data-act="drill" data-k="${key}" style="cursor:pointer" title="Open the records behind this number"` : ''}><div class="l">${label}</div><div class="v ${tone}">${value}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`; }
const drillLink = (key, title, rows, label) => { DR[key] = { title, rows }; return `<button type="button" class="linkbtn" data-act="drill" data-k="${key}">${label}</button>`; };
const bar = (v, max, color = 'var(--brand)') => `<div class="progress" style="height:8px;min-width:80px;flex:1"><div style="width:${max ? Math.min(100, v / max * 100) : 0}%;background:${color}"></div></div>`;
function boardData() {
  const [from, to] = periodRange(), inP = d => d && new Date(d) >= from && new Date(d) < to;
  const f = state.filters, own = f.bOwner || '', src = f.bSrc || '';
  const jobs = db.jobs.filter(divOK).filter(j => j.status !== 'cancelled').filter(j => (!own || ownerName(j) === own) && (!src || projSource(j) === src));
  const leads = db.leads.filter(divOK).filter(l => (!own || leadOwner(l) === own) && (!src || srcEN(l.source || cust(l.customerId).source) === src));
  const P = jobs.map(j => ({ j, F: finOf(j), sd: signDate(j) }));
  return { from, to, inP, jobs, leads, P, own, src };
}
const pRow = ({ j, F }) => drillRow(`${j.number} · ${j.title}`, `${cust(j.customerId).name} · ${DIV[j.division] ? DIV[j.division].name : ''} · ${ownerName(j) || 'no owner'}`, canMoney() ? money(F.revenue) + ' · ' + pct2(F.pct) : '', '#/job/' + j.id);
const iRow = i => drillRow(`${i.number} · ${cust(i.customerId).name}`, `due ${fDate(parseLocal(i.due))}${i.disputed ? ' · disputed' : ''}`, money2(invBal(i)), '#/invoice/' + i.id);

function boardDirection(D) {
  const signed = D.P.filter(x => D.inP(x.sd)), rev = sumBy(signed, x => x.F.revenue), gross = sumBy(signed, x => x.F.gross);
  const pays = allPayments().filter(p => D.inP(p.date) && (state.div === 'all' || p.division === state.div)), cin = sumBy(pays, p => p.amount);
  const losses = D.P.filter(x => x.F.gross < -0.009);
  // Caja proyectada 8 semanas: cobros esperados (saldo por vencimiento) − pagos esperados (A/P por vencimiento)
  const wk0 = weekStart(new Date()), weeks = [...Array(8)].map((_, i) => ({ s: addDays(wk0, i * 7), in: 0, out: 0, inR: [], outR: [] }));
  const wIdx = d => { const i = Math.floor((sod(d) - wk0) / (7 * DAY)); return i < 0 ? 0 : i; };
  db.invoices.filter(i => !['void', 'draft'].includes(i.status) && invBal(i) > 0.009 && !i.disputed && (state.div === 'all' || i.division === state.div)).forEach(i => { const w = weeks[wIdx(parseLocal(i.due))]; if (w) { w.in += invBal(i); w.inR.push(iRow(i)); } });
  apRows().forEach(r => { const w = weeks[wIdx(parseLocal(r.due))]; if (w) { w.out += r.bal; w.outR.push(drillRow(`${r.vendor} ${r.num || ''}`, `due ${fDate(parseLocal(r.due))} · ${r.projects || ''}`, money2(r.bal), r.href)); } });
  let cum = 0; weeks.forEach(w => { cum += w.in - w.out; w.cum = cum; });
  const proj8 = sumBy(weeks, w => w.in - w.out);
  // Dinero detenido
  const heldBill = D.P.filter(x => (x.j.status === 'completed' || x.j.ops.closed) && x.F.unbilled > 0.009);
  const heldPermit = D.P.filter(x => x.j.status !== 'completed' && x.F.unbilled > 0.009 && db.permits.some(p => p.jobId === x.j.id && ['todo', 'submitted', 'rejected'].includes(p.status)));
  const heldFin = D.P.filter(x => ['loan', 'lease', 'ppa'].includes((x.j.financing || {}).mode) && x.F.ar > 0.009);
  const overdue = db.invoices.filter(i => invStatus(i) === 'overdue' && (state.div === 'all' || i.division === state.div));
  const held = [['Billing — completed, not invoiced', sumBy(heldBill, x => x.F.unbilled), heldBill.map(pRow), 'held1'], ['Billing — overdue invoices', sumBy(overdue, invBal), overdue.map(iRow), 'held2'], ['Permits & utility approvals pending', sumBy(heldPermit, x => x.F.unbilled), heldPermit.map(pRow), 'held3'], ['Financiers (loan / lease / PPA balance)', sumBy(heldFin, x => x.F.ar), heldFin.map(pRow), 'held4']];
  const bySvc = {}; signed.forEach(x => { const k = x.j.division; (bySvc[k] = bySvc[k] || []).push(x); });
  return `<div class="grid g3 mb">
    ${tile('Signed sales', kmoney(rev), `${signed.length} project${signed.length === 1 ? '' : 's'} · by signing date`, 'd-signed', signed.map(pRow))}
    ${canMoney() ? tile('Projected gross on signed', kmoney(gross), pct2(rev ? gross / rev : 0), 'd-gross', signed.map(pRow), gross < 0 ? 'down' : '') : ''}
    ${canMoney() ? tile('Cash collected', kmoney(cin), 'by settlement date', 'd-cash', pays.map(p => drillRow(`${p.inv.number} · ${cust(p.inv.customerId).name}`, `${fDate(p.date)} · ${p.method || ''}`, money2(p.amount), '#/invoice/' + p.inv.id))) : ''}
    ${canMoney() ? tile('Projected cash · next 8 weeks', kmoney(proj8), 'expected collections − payables', 'd-proj', [...weeks.flatMap(w => w.inR), ...weeks.flatMap(w => w.outR).map(r => ({ ...r, v: '−' + r.v }))], proj8 < 0 ? 'down' : '') : ''}
    ${canMoney() ? tile('Projects losing money', losses.length, kmoney(sumBy(losses, x => x.F.gross)), 'd-loss', losses.map(pRow), losses.length ? 'down' : '') : ''}
    ${canMoney() ? tile('Money held up', kmoney(sumBy(held, h => h.v || h[1])), 'billing · permits · financiers', 'd-held', held.flatMap(h => h[2])) : ''}
  </div>
  ${canMoney() ? `<div class="grid g2 mb">
    <div class="card"><div class="card-h"><h3>Gross profit by service</h3><span class="small muted">projects signed in the period</span></div><div class="table-wrap"><table><thead><tr><th>Service</th><th class="right">Projects</th><th class="right">Contract value</th><th class="right">Projected gross</th><th class="right">Margin</th></tr></thead><tbody>${Object.entries(bySvc).map(([k, l]) => { const r = sumBy(l, x => x.F.revenue), g = sumBy(l, x => x.F.gross); return `<tr><td class="b">${drillLink('svc-' + k, `Signed · ${DIV[k] ? DIV[k].name : k}`, l.map(pRow), DIV[k] ? DIV[k].name : k)}</td><td class="right">${l.length}</td><td class="right">${money(r)}</td><td class="right b ${g < 0 ? 'down' : 'up'}">${money(g)}</td><td class="right">${pct2(r ? g / r : 0)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">No signed projects in this period.</td></tr>'}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>Money held up</h3></div><div class="card-b">${held.map(([l, v, rows, k]) => `<div class="list-item"><div style="flex:1">${drillLink(k, l, rows, esc(l))}<div class="small muted">${rows.length} record${rows.length === 1 ? '' : 's'}</div></div><b>${money(v)}</b></div>`).join('')}</div></div>
  </div>
  <div class="card"><div class="card-h"><h3>Projected cash by week</h3><span class="small muted">invoice balances by due date (overdue in the first week) − vendor bills by due date · disputed invoices excluded</span></div><div class="table-wrap"><table><thead><tr><th>Week of</th><th class="right">Expected in</th><th class="right">Expected out</th><th class="right">Net</th><th class="right">Cumulative</th></tr></thead><tbody>${weeks.map((w, i) => `<tr><td>${fDate(w.s)}${i === 0 ? ' <span class="small muted">(+ overdue)</span>' : ''}</td><td class="right">${w.inR.length ? drillLink('wi' + i, 'Expected in · week of ' + fDate(w.s), w.inR, money(w.in)) : money(0)}</td><td class="right">${w.outR.length ? drillLink('wo' + i, 'Expected out · week of ' + fDate(w.s), w.outR, money(w.out)) : money(0)}</td><td class="right b ${w.in - w.out < 0 ? 'down' : ''}">${money(w.in - w.out)}</td><td class="right ${w.cum < 0 ? 'down' : ''}">${money(w.cum)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
}
function boardSales(D) {
  const L = D.leads, now = Date.now();
  const uncont = L.filter(l => ['new', 'warm'].includes(l.stage)).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const lRow = l => drillRow(`${cust(l.customerId).name} · ${l.title}`, `${PIPELINES[leadPipe(l)].name}: ${stageName(l.stage, l.division)} · ${srcEN(l.source)} · ${leadOwner(l) || 'no owner'} · ${ago(l.createdAt)}${/^\d/.test(ago(l.createdAt)) ? ' ago' : ''}`, money(l.value), '#/pipeline');
  const appts = (db.appts || []).filter(a => D.inP(a.start) && a.status !== 'cancelled').filter(a => { const l = db.leads.find(x => x.id === a.leadId); return !l || L.includes(l); });
  const visitLeads = L.filter(l => l.stage === 'visit' || l.stage === 'mappt');
  const ests = db.estimates.filter(divOK).filter(e => !D.own || (db.leads.find(l => l.customerId === e.customerId && leadOwner(l) === D.own))).filter(e => !D.src || srcEN(cust(e.customerId).source) === D.src);
  const stale = ests.filter(e => e.status === 'sent' && now - new Date(e.sentAt || e.createdAt) > 3 * DAY && !(db.tasks || []).some(t => !t.done && t.link && t.link.kind === 'estimate' && t.link.id === e.id));
  const decided = ests.filter(e => (e.status === 'approved' && D.inP(e.approvedAt || e.sentAt || e.createdAt)) || (e.status === 'declined' && D.inP(e.declinedAt || e.sentAt || e.createdAt)));
  const won = decided.filter(e => e.status === 'approved'), rate = decided.length ? won.length / decided.length : 0;
  const eRow = e => drillRow(`${e.number} · ${cust(e.customerId).name}`, `${EST_ST[e.status] ? EST_ST[e.status][0] : e.status} · sent ${fDate(e.sentAt || e.createdAt)}`, money(e.status === 'approved' ? estTotal(e) : estMax(e)), '#/estimate/' + e.id);
  const openVal = sumBy(L.filter(l => !CLOSED.includes(l.stage)), l => l.value);
  const signed = D.P.filter(x => D.inP(x.sd));
  const bySrc = {}; L.filter(l => D.inP(l.createdAt)).forEach(l => { const k = srcEN(l.source || cust(l.customerId).source) || 'Unknown'; (bySrc[k] = bySrc[k] || { leads: [], P: [] }).leads.push(l); });
  signed.forEach(x => { const k = projSource(x.j); (bySrc[k] = bySrc[k] || { leads: [], P: [] }).P.push(x); });
  const byRep = {}; signed.forEach(x => { const k = ownerName(x.j) || 'Unassigned'; (byRep[k] = byRep[k] || []).push(x); });
  return `<div class="grid g3 mb">
    ${tile('Leads not contacted', uncont.length, uncont.length ? `oldest ${ago(uncont[0].createdAt)}` : 'all contacted ✓', 's-unc', uncont.map(lRow), uncont.length ? 'down' : '')}
    ${tile('Appointments', appts.length + visitLeads.length, `${appts.length} booked in the period · ${visitLeads.length} leads at visit stage`, 's-appt', [...appts.map(a => drillRow(`${a.title}`, `${fDay(a.start)} ${fTime(a.start)} · ${a.status}`, '', '#/customer/' + a.customerId)), ...visitLeads.map(lRow)])}
    ${tile('Proposals without follow-up', stale.length, 'sent > 3 days, no open follow-up task', 's-stale', stale.map(eRow), stale.length ? 'down' : '')}
    ${tile('Close rate', pct(rate), `${won.length} won of ${decided.length} decided`, 's-close', decided.map(eRow))}
    ${tile('Open pipeline', kmoney(openVal), `${L.filter(l => !CLOSED.includes(l.stage)).length} open leads`, 's-pipe', L.filter(l => !CLOSED.includes(l.stage)).map(lRow))}
    ${tile('Signed sales', kmoney(sumBy(signed, x => x.F.revenue)), `${signed.length} projects · by signing date`, 's-signed', signed.map(pRow))}
  </div>
  <div class="grid g2">
    <div class="card"><div class="card-h"><h3>Results by lead source</h3><span class="small muted">leads created and projects signed in the period</span></div><div class="table-wrap"><table><thead><tr><th>Source</th><th class="right">Leads</th><th class="right">Signed</th><th class="right">Revenue</th>${canMoney() ? '<th class="right">Gross</th><th class="right">Margin</th>' : ''}</tr></thead><tbody>${Object.entries(bySrc).sort((a, b) => sumBy(b[1].P, x => x.F.revenue) - sumBy(a[1].P, x => x.F.revenue)).map(([k, v]) => { const r = sumBy(v.P, x => x.F.revenue), g = sumBy(v.P, x => x.F.gross); return `<tr><td class="b">${esc(k)}</td><td class="right">${v.leads.length ? drillLink('src-l-' + hash36(k), `Leads · ${k}`, v.leads.map(lRow), v.leads.length) : 0}</td><td class="right">${v.P.length ? drillLink('src-p-' + hash36(k), `Signed · ${k}`, v.P.map(pRow), v.P.length) : 0}</td><td class="right">${money(r)}</td>${canMoney() ? `<td class="right b ${g < 0 ? 'down' : 'up'}">${money(g)}</td><td class="right">${pct2(r ? g / r : 0)}</td>` : ''}</tr>`; }).join('') || '<tr><td colspan="6" class="empty">No data in this period.</td></tr>'}</tbody></table></div></div>
    <div><div class="card mb"><div class="card-h"><h3>Pipeline by stage</h3></div><div class="card-b">${STAGES.filter(s => !['won', 'lost'].includes(s[0])).map(([k, n]) => { const l = L.filter(x => x.stage === k); return `<div class="row" style="gap:10px;margin:5px 0"><span class="small" style="width:150px">${drillLink('stg-' + k, n, l.map(lRow), n)}</span>${bar(l.length, Math.max(1, ...STAGES.map(s => L.filter(x => x.stage === s[0]).length)))}<b class="small" style="width:70px;text-align:right">${l.length} · ${kmoney(sumBy(l, x => x.value))}</b></div>`; }).join('')}</div></div>
    <div class="card"><div class="card-h"><h3>Signed by rep</h3></div><div class="card-b">${Object.entries(byRep).sort((a, b) => sumBy(b[1], x => x.F.revenue) - sumBy(a[1], x => x.F.revenue)).map(([k, l]) => `<div class="list-item"><div style="flex:1">${drillLink('rep-' + hash36(k), 'Signed · ' + k, l.map(pRow), esc(k))}</div><span class="small muted">${l.length}</span><b>${money(sumBy(l, x => x.F.revenue))}</b></div>`).join('') || '<span class="muted small">No signed projects in this period.</span>'}</div></div></div>
  </div>`;
}
function boardOps(D) {
  const today = sod(new Date()), in14 = addDays(today, 14), R = db.settings.alertRules || ALERT_DEFAULTS;
  const installs = D.jobs.filter(j => j.status !== 'completed').filter(j => { const d = j.start ? new Date(j.start) : j.expectedInstall ? parseLocal(j.expectedInstall) : null; return d && d >= today && d < in14; }).sort((a, b) => new Date(a.start || a.expectedInstall) - new Date(b.start || b.expectedInstall));
  const blocked = D.jobs.filter(j => !(j.ops && j.ops.closed) && j.status !== 'completed').map(j => ({ j, b: blockersOf(j) })).filter(x => x.b.length);
  const docs = D.jobs.filter(j => j.status === 'inprogress' || (j.status === 'completed' && daysSince(j.completedAt) <= 90)).map(j => ({ j, m: handoverStatus(j).filter(i => !i.ok && i.key !== 'invoice') })).filter(x => x.m.length);
  const late = (db.pos || []).filter(p => p.status === 'approved' && !p.receivedAt && ['Materials', 'Equipment'].includes(p.category)).map(p => ({ p, j: db.jobs.find(x => x.id === p.projectId) })).filter(x => x.j && D.jobs.includes(x.j)).filter(x => (x.p.expected && x.p.expected < ymd(today)) || (!x.p.expected && x.j.start && new Date(x.j.start) < addDays(today, 7)));
  const jRow = j => drillRow(`${j.number} · ${j.title}`, `${cust(j.customerId).name} · ${j.start ? fDay(j.start) : 'expected ' + fDate(parseLocal(j.expectedInstall))} · ${(j.techIds || []).map(t => (tech(t) || {}).name).filter(Boolean).join(', ') || 'no crew'}`, '', '#/job/' + j.id);
  const days = [...Array(14)].map((_, i) => addDays(today, i)).filter(d => d.getDay() !== 0 && d.getDay() !== 6), cap = days.length * num(R.dayCapacity);
  const crews = db.techs.filter(t => state.div === 'all' || t.division === state.div).map(t => { const hrs = sumBy(db.jobs.filter(j => j.status !== 'cancelled' && j.start && (j.techIds || []).includes(t.id) && new Date(j.start) >= today && new Date(j.start) < in14), j => j.duration); return { t, hrs }; });
  const util = sumBy(crews, c => c.hrs) / Math.max(1, cap * crews.length);
  return `<div class="grid g3 mb">
    ${tile('Installs · next 14 days', installs.length, installs.filter(j => !j.start).length ? `${installs.filter(j => !j.start).length} without a date yet` : '', 'o-inst', installs.map(jRow))}
    ${tile('Crew utilization · next 2 weeks', pct(util), `${sumBy(crews, c => c.hrs)} h booked of ${cap * crews.length} h`, 'o-cap', crews.map(c => drillRow(c.t.name, `${c.hrs} h of ${cap} h`, pct(c.hrs / Math.max(1, cap)), '#/schedule')), util > 0.95 ? 'down' : '')}
    ${tile('Blocked projects', blocked.length, blocked.length ? `oldest ${Math.max(...blocked.map(x => daysSince((x.b[0] || {}).createdAt)))} d` : '', 'o-blk', blocked.map(({ j, b }) => drillRow(`${j.number} · ${j.title}`, b.map(x => x.reason).join(' · '), '', '#/job/' + j.id)), blocked.length ? 'down' : '')}
    ${tile('Missing documents', docs.length, 'photos, serials, inspections, sign-off', 'o-docs', docs.map(({ j, m }) => drillRow(`${j.number} · ${j.title}`, m.map(i => i.label + ': ' + i.detail).join(' · '), '', '#/wo/' + j.id)), docs.length ? 'down' : '')}
    ${tile('Delayed materials', late.length, 'approved POs not received on time', 'o-late', late.map(({ p, j }) => drillRow(`${p.number} · ${p.vendor}`, `${j.number} · ${p.expected ? 'expected ' + fDate(parseLocal(p.expected)) : 'no date · install ' + fDay(j.start)}`, '', '#/purchasing')), late.length ? 'down' : '')}
    ${tile('Schedule conflicts', calConflicts().length, 'double bookings, capacity, blocked', 'o-conf', calConflicts().map(c => drillRow(c.title, c.text, '', '#/schedule')))}
  </div>
  <div class="grid g2">
    <div class="card"><div class="card-h"><h3>Upcoming installs</h3></div><div class="card-b">${installs.map(j => `<div class="list-item click" data-go="#/wo/${j.id}" style="cursor:pointer"><div style="width:90px" class="small b">${j.start ? fDay(j.start) : '<span class="warn">no date</span>'}</div><div style="flex:1;min-width:0"><div class="b small">${j.number} · ${esc(j.title)}</div><div class="small muted">${esc(cust(j.customerId).name)} · ${esc((j.techIds || []).map(t => (tech(t) || {}).name).filter(Boolean).join(', ') || 'no crew')}</div></div>${blockersOf(j).length ? '<span class="pill bad">⛔</span>' : ''}${divPill(j.division)}</div>`).join('') || '<span class="muted small">Nothing in the next 14 days.</span>'}</div></div>
    <div class="card"><div class="card-h"><h3>Crew capacity · next 2 weeks</h3><span class="small muted">${num(R.dayCapacity)} h/day, weekdays</span></div><div class="card-b">${crews.map(c => `<div class="row" style="gap:10px;margin:6px 0">${avatar(c.t)}<span class="small" style="width:140px">${esc(c.t.name)}</span>${bar(c.hrs, cap, c.hrs > cap ? 'var(--bad)' : c.hrs > cap * 0.85 ? 'var(--warn)' : 'var(--ok)')}<b class="small" style="width:80px;text-align:right">${c.hrs}/${cap} h</b></div>`).join('') || '<span class="muted small">No crews.</span>'}</div></div>
  </div>`;
}
function boardFinance(D) {
  if (!canMoney()) return '<div class="card"><div class="empty">Restricted to finance, operations, purchasing and direction.</div></div>';
  const eow = addDays(weekStart(new Date()), 7);
  const collect = db.invoices.filter(i => !['void', 'draft'].includes(i.status) && invBal(i) > 0.009 && parseLocal(i.due) < eow && (state.div === 'all' || i.division === state.div)).sort((a, b) => a.due.localeCompare(b.due));
  const pay = apRows().filter(r => parseLocal(r.due) < eow).sort((a, b) => a.due.localeCompare(b.due));
  const dni = D.P.filter(x => (x.j.status === 'completed' || x.j.ops.closed) && x.F.unbilled > 0.009);
  const ex = isFin() ? exceptionsOpen() : [], unas = ex.filter(e => e.kind === 'no_project'), diffs = ex.filter(e => e.kind === 'sync');
  const billed = db.invoices.filter(i => !['void', 'draft'].includes(i.status) && D.inP(i.createdAt) && (state.div === 'all' || i.division === state.div));
  const pays = allPayments().filter(p => D.inP(p.date) && (state.div === 'all' || p.division === state.div));
  const xRow = e => drillRow(e.title, EXC_KIND[e.kind] + (e.detail ? ' · ' + e.detail : ''), e.amount ? money2(e.amount) : '', e.href || '#/exceptions');
  return `<div class="grid g3 mb">
    ${tile('To collect this week', kmoney(sumBy(collect, invBal)), `${collect.length} invoices incl. ${collect.filter(i => invStatus(i) === 'overdue').length} overdue`, 'f-col', collect.map(iRow))}
    ${tile('To pay this week', kmoney(sumBy(pay, r => r.bal)), `${pay.length} vendor bills`, 'f-pay', pay.map(r => drillRow(`${r.vendor} ${r.num || ''}`, `due ${fDate(parseLocal(r.due))} · ${r.projects || ''} · ${r.src}`, money2(r.bal), r.href)))}
    ${tile('Completed, not invoiced', kmoney(sumBy(dni, x => x.F.unbilled)), `${dni.length} projects`, 'f-dni', dni.map(pRow), dni.length ? 'down' : '')}
    ${tile('Costs without project', kmoney(sumBy(unas, e => e.amount)), `${unas.length} transactions`, 'f-unas', unas.map(xRow), unas.length ? 'down' : '')}
    ${tile('Differences with QuickBooks', diffs.length, ledgerHasData() ? 'invoice/bill amounts and balances' : 'import QuickBooks to compare', 'f-diff', diffs.map(xRow), diffs.length ? 'down' : '')}
    ${tile('Invoiced · collected (period)', `${kmoney(sumBy(billed, i => subtotal(i.items)))} · ${kmoney(sumBy(pays, p => p.amount))}`, 'invoice date · settlement date', 'f-bc', [...billed.map(i => drillRow(`${i.number} · ${cust(i.customerId).name}`, 'invoiced ' + fDate(i.createdAt), money2(subtotal(i.items)), '#/invoice/' + i.id)), ...pays.map(p => drillRow(`Payment · ${p.inv.number}`, fDate(p.date), money2(p.amount), '#/invoice/' + p.inv.id))])}
  </div>
  <div class="grid g2">
    <div class="card"><div class="card-h"><h3>Collect this week</h3><a class="btn sm" href="#/accounting">A/R aging</a></div><div class="card-b">${collect.slice(0, 12).map(i => `<div class="list-item click" data-go="#/invoice/${i.id}" style="cursor:pointer"><div style="flex:1"><div class="b small">${i.number} · ${esc(cust(i.customerId).name)}</div><div class="small ${invStatus(i) === 'overdue' ? 'down' : 'muted'}">due ${fDate(parseLocal(i.due))}${i.payer ? ' · payer ' + esc(i.payer) : ''}</div></div><b>${money2(invBal(i))}</b></div>`).join('') || '<span class="muted small">Nothing due ✓</span>'}</div></div>
    <div class="card"><div class="card-h"><h3>Pay this week</h3><a class="btn sm" href="#/purchasing">Vendor bills</a></div><div class="card-b">${pay.slice(0, 12).map(r => `<div class="list-item"><div style="flex:1"><div class="b small">${esc(r.vendor)} ${esc(r.num || '')}</div><div class="small muted">due ${fDate(parseLocal(r.due))} · ${esc(r.projects || '')}</div></div><b>${money2(r.bal)}</b></div>`).join('') || '<span class="muted small">Nothing due ✓</span>'}</div></div>
  </div>`;
}
function boardService(D) {
  p4Init();
  const T = db.tickets.filter(divOK).filter(t => !D.own || (tech(t.assignee) || {}).name === D.own);
  const open = T.filter(t => !['resolved', 'closed'].includes(t.status)), res = T.filter(t => t.resolvedAt && D.inP(t.resolvedAt));
  const avg = res.length ? sumBy(res, t => (new Date(t.resolvedAt) - new Date(t.createdAt)) / DAY) / res.length : 0;
  const active = db.warranties.filter(divOK).filter(w => w.end >= ymd(new Date())), exp = active.filter(w => w.end <= dl(ymd(new Date()), 90)), unreg = db.warranties.filter(w => w.needsRegistration && !w.registered);
  const rep = {}; T.filter(t => daysSince(t.createdAt) <= 365).forEach(t => { const k = (t.jobId || t.customerId) + '|' + String(t.title).toLowerCase().split(/\W+/).filter(w => w.length > 3).slice(0, 2).join(' '); (rep[k] = rep[k] || []).push(t); });
  const repeats = Object.values(rep).filter(x => x.length > 1);
  const cost = sumBy(res, tkCost), wcost = sumBy(res.filter(t => t.warranty), tkCost);
  const tRow = t => drillRow(`${t.number} · ${t.title}`, `${cust(t.customerId).name} · ${TK_ST[t.status] ? TK_ST[t.status][0] : t.status} · ${(tech(t.assignee) || {}).name || 'unassigned'} · ${ago(t.createdAt)}`, canMoney() ? money(tkCost(t)) : '', '#/ticket/' + t.id);
  const wRow = w => drillRow(`${w.type} · ${cust(w.customerId).name}`, `${w.provider} · until ${fDate(parseLocal(w.end))}${w.needsRegistration && !w.registered ? ' · NOT registered' : ''}`, '', '#/service');
  const byTech = {}; res.forEach(t => { const k = (tech(t.assignee) || {}).name || 'Unassigned'; (byTech[k] = byTech[k] || []).push(t); });
  return `<div class="grid g3 mb">
    ${tile('Open tickets', open.length, `${open.filter(t => !t.assignee).length} unassigned · ${open.filter(t => t.priority === 'urgent').length} urgent`, 'v-open', open.map(tRow), open.length ? 'down' : '')}
    ${tile('Active warranties', active.length, `${exp.length} expire in 90 days · ${unreg.length} not registered`, 'v-war', [...unreg.map(wRow), ...exp.map(wRow)])}
    ${tile('Avg. resolution time', avg ? avg.toFixed(1) + ' days' : '—', `${res.length} resolved in the period`, 'v-res', res.map(tRow))}
    ${tile('Repeated problems', repeats.length, 'same project & issue, 12 months', 'v-rep', repeats.flat().map(tRow), repeats.length ? 'down' : '')}
    ${canMoney() ? tile('Post-sale cost', kmoney(cost), `${kmoney(wcost)} under warranty · resolved in the period`, 'v-cost', res.map(tRow)) : ''}
  </div>
  <div class="grid g2">
    <div class="card"><div class="card-h"><h3>Open tickets by age</h3><a class="btn sm" href="#/service">All tickets</a></div><div class="card-b">${open.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))).slice(0, 12).map(t => `<div class="list-item click" data-go="#/ticket/${t.id}" style="cursor:pointer">${pill(TK_PRI, t.priority)}<div style="flex:1;min-width:0"><div class="b small">${t.number} · ${esc(t.title)}</div><div class="small muted">${esc(cust(t.customerId).name)} · ${esc((tech(t.assignee) || {}).name || 'unassigned')}</div></div><span class="small">${ago(t.createdAt)}</span></div>`).join('') || '<span class="muted small">No open tickets ✓</span>'}</div></div>
    <div class="card"><div class="card-h"><h3>Resolved by technician</h3></div><div class="card-b">${Object.entries(byTech).map(([k, l]) => `<div class="list-item"><div style="flex:1">${drillLink('tt-' + hash36(k), 'Resolved · ' + k, l.map(tRow), esc(k))}</div><span class="small muted">${l.length} · avg ${(sumBy(l, t => (new Date(t.resolvedAt) - new Date(t.createdAt)) / DAY) / l.length).toFixed(1)} d</span>${canMoney() ? `<b>${money(sumBy(l, tkCost))}</b>` : ''}</div>`).join('') || '<span class="muted small">Nothing resolved in this period.</span>'}</div></div>
  </div>`;
}
ROUTES.boards = () => {
  DR = {};
  const role = cloud.on ? cloud.role : 'owner';
  const def = { sales: 'sales', ops: 'ops', tech: 'ops', sub: 'ops', purchasing: 'ops', finance: 'finance' }[role] || 'direction';
  const tab = state.tabs.board || def, f = state.filters, D = boardData();
  const owners = [...new Set([...db.techs.map(t => t.name), ...db.leads.map(leadOwner), ...db.jobs.map(ownerName)].filter(Boolean))].sort();
  const sources = [...new Set([...db.leads.map(l => srcEN(l.source)), ...db.customers.map(c => srcEN(c.source))].filter(Boolean))].sort();
  const sel = (k, opts, v, label) => `<select class="inp" style="width:auto" data-act-input="filtSel" data-f="${k}" aria-label="${label}">${opts.map(([a, b]) => `<option value="${esc(a)}" ${v === a ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
  const body = { direction: boardDirection, sales: boardSales, ops: boardOps, finance: boardFinance, service: boardService }[tab](D);
  return head('Team dashboards', `${fDate(D.from)} – ${fDate(addDays(D.to, -1))} · click any number to see the records behind it`) + `
  <div class="tabs">${BOARD_TABS.map(([k, v]) => `<button data-act="tab" data-t="board" data-v="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>
  <div class="card mb"><div class="toolbar row" style="flex-wrap:wrap;gap:8px">${sel('bp', PERIODS, f.bp || 'month', 'Period')}${(f.bp === 'custom') ? `<input class="inp" type="date" style="width:auto" data-act-input="filtSel" data-f="bFrom" value="${esc(f.bFrom || '')}"><input class="inp" type="date" style="width:auto" data-act-input="filtSel" data-f="bTo" value="${esc(f.bTo || '')}">` : ''}
    <select class="inp" style="width:auto" data-act-input="boardDiv" aria-label="Service">${[['all', 'All services'], ...divOptions()].map(([a, b]) => `<option value="${a}" ${state.div === a ? 'selected' : ''}>${b}</option>`).join('')}</select>
    ${sel('bOwner', [['', 'All owners'], ...owners.map(o => [o, o])], f.bOwner || '', 'Owner')}${sel('bSrc', [['', 'All sources'], ...sources.map(o => [o, o])], f.bSrc || '', 'Source')}
    ${f.bOwner || f.bSrc || state.div !== 'all' || (f.bp && f.bp !== 'month') ? '<button class="btn sm ghost" data-act="boardReset">Reset filters</button>' : ''}
    <span class="small muted" style="margin-left:auto">Sales by signing date · results by invoice date · cash by settlement date</span></div></div>` + body;
};
function drillModal(k) {
  const d = DR[k]; if (!d) return;
  modal({ title: d.title, wide: true, body: `<div class="small muted mb">${d.rows.length} record${d.rows.length === 1 ? '' : 's'}</div>${d.rows.map(r => `<div class="list-item"><div style="flex:1;min-width:0">${r.href ? `<a href="${r.href}" data-dismiss class="b small">${esc(r.t)}</a>` : `<span class="b small">${esc(r.t)}</span>`}<div class="small muted">${esc(r.s || '')}</div></div>${r.v ? `<b class="small">${esc(r.v)}</b>` : ''}</div>`).join('') || '<div class="empty">No records.</div>'}`, foot: '<button class="btn" data-dismiss>Close</button>' });
}
Object.assign(ACT, {
  drill: el => drillModal(el.dataset.k),
  boardReset: () => { Object.assign(state.filters, { bp: 'month', bOwner: '', bSrc: '', bFrom: '', bTo: '' }); state.div = 'all'; render(); },
});
Object.assign(INPUT, { boardDiv: el => { state.div = el.value; try { localStorage.setItem('opsboss.div', state.div); } catch (e) { /* ignore */ } render(); } });


/* ═════════════ AI ASSISTANT (Claude) — drafts only, a person approves ═════════════ */
const AI_EXTRACT_KINDS = [['specs', 'Technical specs (proposal, design, utility bill, spec sheet)'], ['equipment', 'Equipment label / serial plate'], ['permit', 'Permit or utility approval'], ['vendor_bill', 'Vendor bill / receipt']];
const AI_DRAFT_KINDS = [['status_update', 'Project status update'], ['payment_reminder', 'Payment reminder'], ['schedule_confirmation', 'Visit / install confirmation'], ['custom', 'Custom (write an instruction)']];
const aiReady = () => cloud.on && !!db.settings.aiEnabled && cloud.role !== 'sub';
async function aiCall(payload) {
  const { data: { session } } = await cloud.sb.auth.getSession();
  const r = await fetch(`${CFG.url}/functions/v1/opsboss-ai`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.key, Authorization: `Bearer ${session ? session.access_token : ''}` }, body: JSON.stringify(payload) });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || out.error) throw new Error(out.message || out.error || 'AI error ' + r.status);
  return out;
}
const fileB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
async function shrinkImage(f) { if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 1.5e6) return f; try { const b = await stampPhoto(f, [], 2000); return new File([b], f.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }); } catch (e) { return f; } }

function aiModal(j, tab = 'summary') {
  projInit(j);
  if (!cloud.on) { modal({ title: '✨ AI assistant', body: '<p>The AI assistant runs on the server and works in the cloud workspace (sign in). It is not available in demo mode.</p>', foot: '<button class="btn" data-dismiss>Close</button>' }); return; }
  if (!db.settings.aiEnabled) { modal({ title: '✨ AI assistant', body: `<p>The AI assistant is off. ${canEditSettings() ? 'Turn it on in <a href="#/settings" data-dismiss>Settings → AI assistant</a> after reading what it shares.' : 'Ask an owner, admin or finance to turn it on in Settings.'}</p>`, foot: '<button class="btn" data-dismiss>Close</button>' }); return; }
  const st = { tab, busy: false, sum: j.ai && j.ai.summary ? j.ai.summary : null, ext: null, draft: null, err: '' };
  modal({ title: `✨ AI assistant · ${j.number}`, wide: true, body: '<div id="aiBox"></div>', foot: '<span class="small muted" style="margin-right:auto">Claude prepares drafts. Nothing is saved, sent or charged until you approve it.</span><button class="btn" data-dismiss>Close</button>', onMount(bg, close) {
    const box = $('#aiBox', bg);
    const tabs = () => `<div class="tabs">${[['summary', 'Summary & missing info'], ['extract', 'Read a document'], ['draft', 'Draft a message']].map(([k, v]) => `<button data-aitab="${k}" class="${st.tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>${st.err ? `<div class="auth-msg bad mb">${esc(st.err)}</div>` : ''}`;
    const busy = t => `<div class="empty">⏳ ${t}… this can take up to a minute.</div>`;
    const draw = () => {
      let b = '';
      if (st.tab === 'summary') {
        const s = st.sum;
        b = s ? `<div class="small muted mb">Generated ${fDate(s.at)} by ${esc(s.by || '')}${s.savedBy ? ` · saved to the project by ${esc(s.savedBy)}` : ' · not saved yet'}</div>
          <h3 style="margin:0 0 6px">${esc(s.r.headline)}</h3><p>${esc(s.r.summary)}</p>
          <div class="calc-out" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))"><div><div class="l">Sales</div><div class="small">${esc(s.r.sales)}</div></div><div><div class="l">Operations</div><div class="small">${esc(s.r.operations)}</div></div><div><div class="l">Finance</div><div class="small">${esc(s.r.finance)}</div></div></div>
          ${s.r.risks.length ? `<h4 style="margin:14px 0 4px">Risks</h4>${s.r.risks.map(x => `<div class="list-item small"><span class="pill warn">!</span><div style="flex:1">${esc(x)}</div></div>`).join('')}` : ''}
          <h4 style="margin:14px 0 4px">Suggested next actions <span class="small muted" style="font-weight:400">— tick the ones to turn into tasks</span></h4>
          ${s.r.next_actions.map((a, i) => `<label class="list-item small" style="cursor:pointer"><input type="checkbox" data-ai-na="${i}"><div style="flex:1"><b>${esc(a.action)}</b><div class="muted">${esc(a.who)} · ${esc(a.why)}</div></div>${a.needs_approval ? '<span class="pill bad">Needs approval</span>' : ''}</label>`).join('')}
          ${s.r.missing_info.length ? `<h4 style="margin:14px 0 4px">Missing information</h4>${s.r.missing_info.map((m, i) => `<label class="list-item small" style="cursor:pointer"><input type="checkbox" data-ai-mi="${i}"><div style="flex:1"><b>${esc(m.item)}</b><div class="muted">${esc(m.why)}</div></div></label>`).join('')}` : ''}
          <div class="row mt" style="flex-wrap:wrap"><button class="btn primary" id="aiSave">✓ Save summary & create ticked tasks</button><button class="btn" id="aiRun">↻ Regenerate</button></div>`
          : (st.busy ? busy('Reading the project') : `<p class="small muted">Claude reads this project (stage, tasks, blockers, permits, specs, change orders, history${canMoney() ? ', financial totals' : ''}) and writes a summary, risks, next actions and missing information. Phone numbers, emails, addresses, access notes, photos, signatures and individual pay rates are never sent.</p><button class="btn primary" id="aiRun">✨ Summarize this project</button>`);
      }
      if (st.tab === 'extract') {
        const e = st.ext;
        b = st.busy ? busy('Reading the document') : `<div class="form"><label class="f">What is it?<select class="inp" id="aiKind">${AI_EXTRACT_KINDS.map(([k, v]) => `<option value="${k}" ${(e && e.kind) === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="f">PDF or photo<input class="inp" type="file" id="aiFile" accept="application/pdf,image/*"></label></div><button class="btn primary mt" id="aiRun">✨ Read document</button>
          ${e ? `<h4 style="margin:16px 0 4px">${esc(e.r.document_type || 'Document')} — review before applying</h4>${e.r.fields.length ? e.r.fields.map((x, i) => `<div class="list-item small" style="flex-wrap:wrap"><input type="checkbox" data-ai-f="${i}" ${x.confidence === 'high' ? 'checked' : ''}><div style="width:190px"><b>${esc(x.label)}</b><div class="muted">${esc(x.key)}</div></div><input class="inp" style="flex:1;min-width:160px" data-ai-fv="${i}" value="${esc(x.value)}"><span class="pill ${x.confidence === 'high' ? 'ok' : x.confidence === 'medium' ? 'warn' : 'bad'}">${x.confidence}</span><div class="muted" style="flex-basis:100%;padding-left:24px">“${esc(x.quote)}”</div></div>`).join('') : '<div class="muted small">No matching fields found in this document.</div>'}${e.r.notes ? `<div class="auth-msg mt small">${esc(e.r.notes)}</div>` : ''}${e.r.fields.length ? '<button class="btn primary mt" id="aiApply">✓ Apply ticked values to the project</button>' : ''}` : ''}`;
      }
      if (st.tab === 'draft') {
        const d = st.draft, c = cust(j.customerId);
        b = st.busy ? busy('Writing the draft') : `<div class="form"><label class="f">Message<select class="inp" id="aiDk">${AI_DRAFT_KINDS.map(([k, v]) => `<option value="${k}" ${(d && d.kind) === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="f">Language<select class="inp" id="aiLang">${[['', 'Customer’s language'], ['en', 'English'], ['es', 'Spanish'], ['pt', 'Portuguese']].map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><label class="f full">Instruction (for “Custom”)<input class="inp" id="aiIns" placeholder="e.g. Explain that the utility asked for a new meter photo"></label></div><button class="btn primary mt" id="aiRun">✨ Write draft</button>
          ${d ? `${d.r.needs_approval.length ? `<div class="auth-msg bad mt small"><b>Check before sending:</b> ${d.r.needs_approval.map(esc).join(' · ')}</div>` : ''}${d.r.notes_for_staff ? `<div class="small muted mt">${esc(d.r.notes_for_staff)}</div>` : ''}
            <label class="f mt">SMS<textarea class="inp" id="aiSms" style="min-height:80px">${esc(d.r.sms)}</textarea></label>
            <label class="f mt">Email subject<input class="inp" id="aiSub" value="${esc(d.r.subject)}"></label><label class="f mt">Email<textarea class="inp" id="aiEmail" style="min-height:160px">${esc(d.r.email)}</textarea></label>
            <div class="row mt" style="flex-wrap:wrap">${ghlOn() && c.phone ? '<button class="btn primary" id="aiSendSms">Send SMS via HighLevel</button>' : ''}${ghlOn() && c.email ? '<button class="btn" id="aiSendEmail">Send email via HighLevel</button>' : ''}<button class="btn" id="aiTask">Save as task to send later</button><button class="btn ghost" id="aiCopy">Copy SMS</button></div>` : ''}`;
      }
      box.innerHTML = tabs() + b;
    };
    const run = async () => {
      st.err = ''; st.busy = true; const prevTab = st.tab;
      try {
        if (st.tab === 'summary') { const o = await aiCall({ action: 'summarize', jobId: j.id }); st.sum = { r: o.result, at: o.generatedAt, by: me(), model: o.model }; }
        if (st.tab === 'extract') {
          const kind = $('#aiKind', bg).value; let f = $('#aiFile', bg).files[0]; if (!f) throw new Error('Choose a PDF or photo first');
          f = await shrinkImage(f); if (f.size > 6.5e6) throw new Error('File too large (max ~6 MB)');
          draw(); const o = await aiCall({ action: 'extract', jobId: j.id, kind, mediaType: f.type || 'application/pdf', data: await fileB64(f) }); st.ext = { r: o.result, kind, file: f.name };
        }
        if (st.tab === 'draft') { const kind = $('#aiDk', bg).value, lang = $('#aiLang', bg).value, instruction = $('#aiIns', bg).value; draw(); const o = await aiCall({ action: 'draft', jobId: j.id, kind, lang, instruction }); st.draft = { r: o.result, kind }; }
      } catch (e) { st.err = e.message; }
      st.busy = false; if (st.tab === prevTab) draw();
    };
    bg.addEventListener('click', async e => {
      const t = e.target.closest('[data-aitab]'); if (t) { st.tab = t.dataset.aitab; st.err = ''; draw(); return; }
      if (e.target.closest('#aiRun')) { const b = e.target.closest('#aiRun'); if (st.tab === 'summary' && !st.sum) { st.busy = true; draw(); } b.disabled = true; await run(); return; }
      if (e.target.closest('#aiSave')) {
        const s = st.sum; let n = 0;
        $$('[data-ai-na]:checked', bg).forEach(c => { const a = s.r.next_actions[+c.dataset.aiNa]; db.tasks.unshift({ id: uid(), title: `${a.needs_approval ? '[Approval] ' : ''}${a.action}`, notes: `${a.who} · ${a.why} (suggested by AI, approved by ${me()})`, due: ymd(new Date()), assignee: '', done: false, customerId: j.customerId, link: { kind: 'job', id: j.id }, wf: 'AI assistant', createdAt: iso(new Date()) }); n++; });
        $$('[data-ai-mi]:checked', bg).forEach(c => { const m = s.r.missing_info[+c.dataset.aiMi]; db.tasks.unshift({ id: uid(), title: `Get missing info for ${j.number}: ${m.item}`, notes: `${m.why} (flagged by AI, approved by ${me()})`, due: ymd(addDays(new Date(), 2)), assignee: '', done: false, customerId: j.customerId, link: { kind: 'job', id: j.id }, wf: 'AI assistant', createdAt: iso(new Date()) }); n++; });
        j.ai = { ...(j.ai || {}), summary: { ...s, r: { ...s.r, finance: '' }, savedBy: me(), savedAt: iso(new Date()) } }; // finance text stays out of the shared project record
        hist(j, `AI summary reviewed and saved by ${me()}${n ? ` · ${n} task${n > 1 ? 's' : ''} created` : ''}`);
        save(); toast(`Saved${n ? ` · ${n} task${n > 1 ? 's' : ''} created` : ''}`); st.sum = j.ai.summary; draw(); render(); return;
      }
      if (e.target.closest('#aiApply')) {
        const ex = st.ext, picked = $$('[data-ai-f]:checked', bg).map(c => ({ ...ex.r.fields[+c.dataset.aiF], value: $(`[data-ai-fv="${c.dataset.aiF}"]`, bg).value.trim() })).filter(x => x.value);
        if (!picked.length) { toast('Tick at least one value'); return; }
        const specs = picked.filter(x => !x.key.includes('.')), eq = Object.fromEntries(picked.filter(x => x.key.startsWith('equip.')).map(x => [x.key.slice(6), x.value])), pm = Object.fromEntries(picked.filter(x => x.key.startsWith('permit.')).map(x => [x.key.slice(7), x.value])), bl = Object.fromEntries(picked.filter(x => x.key.startsWith('bill.')).map(x => [x.key.slice(5), x.value]));
        specs.forEach(x => { j.specs[x.key] = x.value; });
        if (Object.keys(eq).length) (j.installedEquip = j.installedEquip || []).push({ id: uid(), type: eq.type || 'Equipment', brand: eq.brand || '', model: eq.model || '', serial: eq.serial || '', by: me(), ts: iso(new Date()), source: 'AI from ' + ex.file });
        if (Object.keys(pm).length) { const stMap = s => /approv|issued|granted/i.test(s) ? 'approved' : /pass/i.test(s) ? 'passed' : /reject|correction|denied/i.test(s) ? 'rejected' : /submit|pending|review/i.test(s) ? 'submitted' : 'todo'; db.permits.unshift({ id: uid(), jobId: j.id, type: PERMIT_TYPES.find(t => (pm.type || '').toLowerCase().includes(t.split(' ')[0].toLowerCase())) || pm.type || 'Building', jurisdiction: pm.jurisdiction || '', number: pm.number || '', status: stMap(pm.status || ''), submitted: /^\d{4}-\d{2}-\d{2}$/.test(pm.date || '') ? pm.date : '', notes: 'Read by AI from ' + ex.file + ', approved by ' + me(), updated: ymd(new Date()) }); }
        if (Object.keys(bl).length && canMoney()) { const cat = COST_CATS.find(c => c.toLowerCase() === String(bl.category || '').toLowerCase()) || 'Materials'; (db.bills = db.bills || []).unshift({ id: uid(), vendor: bl.vendor || 'Unknown vendor', number: bl.number || '', date: /^\d{4}-\d{2}-\d{2}$/.test(bl.date || '') ? bl.date : ymd(new Date()), attachment: '', lines: [{ id: uid(), projectId: j.id, category: cat, amount: num(String(bl.total || '').replace(/[$,]/g, '')), poId: '' }], createdBy: me(), createdAt: iso(new Date()), source: 'AI from ' + ex.file }); }
        hist(j, `AI document “${ex.file}”: ${picked.length} value${picked.length > 1 ? 's' : ''} reviewed and applied by ${me()} (${picked.map(x => x.label).join(', ')})`);
        runLog('ai.apply', `${j.number}: ${picked.length} AI-extracted values applied by ${me()}`, { system: 'Claude' });
        save(); toast(`${picked.length} value${picked.length > 1 ? 's' : ''} applied`); close(); render(); return;
      }
      if (e.target.closest('#aiCopy')) { try { await navigator.clipboard.writeText($('#aiSms', bg).value); toast('Copied'); } catch (er) { toast('Copy failed'); } return; }
      if (e.target.closest('#aiTask')) { const c = cust(j.customerId); db.tasks.unshift({ id: uid(), type: 'message', channel: 'sms', body: $('#aiSms', bg).value, title: `Send SMS to ${c.name} (AI draft, review first)`, due: ymd(new Date()), assignee: '', done: false, customerId: c.id, link: { kind: 'job', id: j.id }, wf: 'AI assistant', createdAt: iso(new Date()) }); hist(j, 'AI message draft saved as a task'); save(); toast('Saved to Tasks'); return; }
      const sms = e.target.closest('#aiSendSms'), em = e.target.closest('#aiSendEmail');
      if (sms || em) {
        const c = cust(j.customerId), btn = sms || em, text = sms ? $('#aiSms', bg).value.trim() : $('#aiEmail', bg).value.trim();
        if (/\[[^\]]*confirm[^\]]*\]/i.test(text)) { toast('Replace the [confirm …] placeholders before sending'); return; }
        btn.disabled = true;
        try { await ghlSend(c, sms ? 'SMS' : 'Email', text, $('#aiSub', bg).value || db.settings.company); hist(j, `${sms ? 'SMS' : 'Email'} sent to ${c.name} (AI draft, reviewed and sent by ${me()})`); save(); toast('Sent ✓'); } catch (er) { toast(er.message); btn.disabled = false; }
      }
    });
    draw();
  } });
}
function aiSettingsCard() {
  const s = db.settings, dis = canEditSettings() ? '' : 'disabled';
  return `<div class="card mt"><div class="card-h"><h3>✨ AI assistant (Claude)</h3><span class="pill ${s.aiEnabled ? 'ok' : ''}">${s.aiEnabled ? 'On' : 'Off'}</span></div><div class="card-b">
    <label class="check"><input type="checkbox" data-act-input="aiToggle" ${s.aiEnabled ? 'checked' : ''} ${dis}><span><b>Turn on the AI assistant</b> (project summaries, reading documents, message drafts)</span></label>
    <p class="small mt"><b>What is sent to Anthropic (Claude):</b> project number and title, service, stage and tasks, blockers, permits status, technical specs, scope item names, change orders, recent project history, the customer’s first name and city${'' } and — only for owner, admin, finance, operations and purchasing — the project’s financial totals. Documents you upload to “Read a document” are sent too.</p>
    <p class="small"><b>Never sent:</b> phone numbers, emails, street addresses, access/gate notes, photos, signatures, payment details, individual pay rates or commissions.</p>
    <p class="small"><b>Human approval:</b> the AI only proposes. Summaries are saved, tasks created, values applied and messages sent only when a person clicks to approve — and price, scope, payment or date commitments are flagged for approval. Every AI request is listed in the Automation log; limit 40 per person per hour.</p>
    <p class="small muted">Setup (once): add the <code>ANTHROPIC_API_KEY</code> secret in Supabase → Edge Functions → Secrets. Model: Claude Opus 5.5.</p>
  </div></div>`;
}

Object.assign(ACT, { aiOpen: el => aiModal(projInit(byId('jobs', el.dataset.id)), el.dataset.tab || 'summary') });
Object.assign(INPUT, { aiToggle: el => { db.settings.aiEnabled = el.checked; runLog('settings', `AI assistant ${el.checked ? 'turned ON' : 'turned off'} by ${me()}`); save(); render(); toast(el.checked ? 'AI assistant on' : 'AI assistant off'); } });

boot();
})();
