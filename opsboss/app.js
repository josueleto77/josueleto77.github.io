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
const fDate = d => d ? new Date(d).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fDay = d => new Date(d).toLocaleDateString('es-US', { weekday: 'short', day: 'numeric', month: 'short' });
const fTime = d => new Date(d).toLocaleTimeString('es-US', { hour: 'numeric', minute: '2-digit' });
const ago = d => { const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return 'ahora'; if (s < 3600) return Math.floor(s / 60) + ' min'; if (s < 86400) return Math.floor(s / 3600) + ' h'; return Math.floor(s / 86400) + ' d'; };
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
const JOB_ST = { unscheduled: ['Sin programar', 'warn'], scheduled: ['Programado', 'info'], enroute: ['En camino', 'brand'], inprogress: ['En progreso', 'brand'], completed: ['Completado', 'ok'], cancelled: ['Cancelado', 'bad'] };
const JOB_FLOW = ['unscheduled', 'scheduled', 'enroute', 'inprogress', 'completed'];
const EST_ST = { draft: ['Borrador', ''], sent: ['Enviado', 'info'], approved: ['Aprobado', 'ok'], declined: ['Rechazado', 'bad'] };
const INV_ST = { draft: ['Borrador', ''], sent: ['Enviada', 'info'], partial: ['Pago parcial', 'warn'], paid: ['Pagada', 'ok'], overdue: ['Vencida', 'bad'], void: ['Anulada', ''] };
const STAGES = [['new', 'Nuevo'], ['contacted', 'Contactado'], ['visit', 'Visita agendada'], ['proposal', 'Propuesta enviada'], ['won', 'Ganado'], ['lost', 'Perdido']];
const SOURCES = ['Google', 'Referido', 'Facebook/Instagram', 'Puerta a puerta', 'Sitio web', 'Yelp', 'Evento', 'Cliente recurrente'];
const PAY_METHODS = ['Tarjeta', 'ACH / Transferencia', 'Cheque', 'Efectivo', 'Financiamiento', 'Zelle'];
const PERMIT_TYPES = ['Construcción', 'Eléctrico', 'Techado', 'Mecánico', 'Interconexión (utility)', 'PTO (permiso para operar)', 'HOA'];
const PERMIT_ST = { todo: ['Por enviar', 'warn'], submitted: ['Enviado', 'info'], approved: ['Aprobado', 'ok'], inspection: ['Inspección programada', 'brand'], passed: ['Inspección aprobada', 'ok'], rejected: ['Rechazado / correcciones', 'bad'] };
const CHECKLISTS = {
  solar: ['Site survey y fotos del techo', 'Revisión de factura eléctrica', 'Diseño y layout del sistema', 'Contrato firmado', 'Permiso de construcción / eléctrico', 'Solicitud de interconexión', 'Pedido de equipos', 'Instalación de racking y paneles', 'Inversor / microinversores y conduit', 'Inspección de la ciudad', 'PTO de la utility', 'Activación del monitoreo y entrega al cliente'],
  roofing: ['Inspección y medición del techo', 'Fotos de daños (antes)', 'Reclamo de seguro / ajustador (si aplica)', 'Permiso de techado', 'Entrega de materiales y dumpster', 'Remoción del techo existente', 'Inspección de deck y reemplazo de madera', 'Underlayment, ice & water, flashing', 'Instalación de tejas / metal', 'Limpieza con imán y fotos (después)', 'Inspección final', 'Registro de garantía'],
  hvac: ['Diagnóstico del sistema', 'Revisión de presión de refrigerante', 'Limpieza de serpentines', 'Cambio de filtro', 'Revisión de capacitores y contactores', 'Prueba de termostato', 'Medición de temperatura de suministro/retorno', 'Revisión de drenaje de condensado', 'Recomendaciones al cliente', 'Fotos y firma del cliente'],
};
const STORE_KEY = 'opsboss.v1';

/* ───────────── Datos ───────────── */
let db;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function seed() {
  const R = rng(42), pick = a => a[Math.floor(R() * a.length)], now = new Date(), ws = weekStart(now);
  const d = {
    settings: { company: 'Nexis Power', phone: '(555) 210-4400', email: 'office@nexispower.com', address: '1200 Energy Way, Suite 4', license: 'Lic. #C-10 / C-39 / C-20', taxRate: 0, apr: 7.99, term: 120, counters: { est: 1040, job: 2100, inv: 3050 }, terms: 'Pago debido a 15 días. Garantía de mano de obra según contrato.' },
    techs: [], customers: [], leads: [], estimates: [], jobs: [], invoices: [], plans: [], permits: [], pricebook: [], activity: [],
  };
  d.techs = [
    { id: 't1', name: 'Carlos Méndez', role: 'Líder instalación solar', division: 'solar', color: '#f59e0b', phone: '(555) 301-1101' },
    { id: 't2', name: 'Andrea Ruiz', role: 'Electricista solar', division: 'solar', color: '#eab308', phone: '(555) 301-1102' },
    { id: 't3', name: 'Mike Johnson', role: 'Capataz de techado', division: 'roofing', color: '#b45309', phone: '(555) 301-1103' },
    { id: 't4', name: 'Luis Herrera', role: 'Techador', division: 'roofing', color: '#a16207', phone: '(555) 301-1104' },
    { id: 't5', name: 'Sara Kim', role: 'Técnica HVAC', division: 'hvac', color: '#0ea5e9', phone: '(555) 301-1105' },
    { id: 't6', name: 'Diego Torres', role: 'Técnico HVAC', division: 'hvac', color: '#06b6d4', phone: '(555) 301-1106' },
  ];
  d.pricebook = [
    ['solar', 'Panel solar 410W monocristalino (instalado)', 'panel', 820, 430], ['solar', 'Microinversor', 'unidad', 260, 160], ['solar', 'Inversor string 7.6kW', 'unidad', 2900, 1800], ['solar', 'Batería 13.5 kWh', 'unidad', 13500, 9200], ['solar', 'Racking y montaje por panel', 'panel', 95, 45], ['solar', 'Actualización de panel eléctrico 200A', 'trabajo', 3200, 1400], ['solar', 'Permisos e ingeniería', 'trabajo', 1200, 600], ['solar', 'Monitoreo y app', 'trabajo', 0, 0],
    ['roofing', 'Teja asfáltica arquitectónica (por square)', 'square', 520, 260], ['roofing', 'Techo de metal standing seam (por square)', 'square', 1150, 620], ['roofing', 'Remoción y disposición (por square)', 'square', 95, 40], ['roofing', 'Reemplazo de plywood (hoja)', 'hoja', 85, 38], ['roofing', 'Ice & water shield (rollo)', 'rollo', 140, 70], ['roofing', 'Ventilación de cumbrera (pie lineal)', 'pie', 12, 5], ['roofing', 'Flashing de chimenea', 'unidad', 450, 120], ['roofing', 'Reparación de fuga', 'trabajo', 650, 180], ['roofing', 'Canaletas seamless (pie lineal)', 'pie', 14, 6],
    ['hvac', 'Visita de diagnóstico', 'visita', 89, 20], ['hvac', 'Mantenimiento AC + calefacción', 'visita', 179, 45], ['hvac', 'Capacitor dual', 'unidad', 245, 35], ['hvac', 'Recarga de refrigerante R-454B (lb)', 'lb', 140, 45], ['hvac', 'Termostato inteligente instalado', 'unidad', 395, 160], ['hvac', 'Bomba de calor 3 ton 16 SEER2 (instalada)', 'sistema', 11800, 6900], ['hvac', 'Sistema split 4 ton 18 SEER2 (instalado)', 'sistema', 15400, 8900], ['hvac', 'Mini-split ductless 1 zona', 'sistema', 5200, 2700], ['hvac', 'Limpieza de ductos', 'trabajo', 550, 150], ['hvac', 'Motor de ventilador', 'unidad', 690, 220],
  ].map(([division, name, unit, price, cost]) => ({ id: uid(), division, name, unit, price, cost }));
  const people = ['María González', 'James Carter', 'Rosa Martínez', 'Kevin Nguyen', 'Patricia Lopez', 'Robert Williams', 'Elena Vargas', 'David Chen', 'Lucía Fernández', 'Thomas Brown', 'Gabriela Soto', 'Brian Miller', 'Ana Castillo', 'Steven Davis', 'Valeria Rojas', 'Mark Wilson', 'Isabel Moreno', 'Jason Lee'];
  const streets = ['Oak St', 'Maple Ave', 'Sunset Blvd', 'Pine Rd', 'Cedar Ln', 'Willow Dr', 'Elm St', 'Lakeview Ct', 'Highland Ave', 'River Rd'];
  const cities = ['Riverside', 'Corona', 'Ontario', 'Fontana', 'Moreno Valley', 'Rancho Cucamonga'];
  d.customers = people.map((name, i) => ({
    id: 'c' + (i + 1), name, phone: `(555) ${400 + i}-${String(1000 + i * 37).slice(-4)}`, email: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.') + '@mail.com',
    address: `${100 + Math.floor(R() * 8900)} ${pick(streets)}`, city: pick(cities), zip: String(91700 + Math.floor(R() * 200)),
    source: pick(SOURCES), tags: [], createdAt: iso(addDays(now, -Math.floor(R() * 400) - 20)), notes: '',
    property: { roofType: pick(['Teja asfáltica', 'Teja de barro', 'Metal', 'Plano / TPO']), roofAge: 5 + Math.floor(R() * 20), sqft: 1400 + Math.floor(R() * 2200), utility: pick(['SCE', 'SDG&E', 'PG&E', 'IID']), avgBill: 120 + Math.floor(R() * 260), stories: R() > .7 ? 2 : 1 },
    equipment: [],
  }));
  const C = d.customers;
  C[2].equipment.push({ id: uid(), type: 'Bomba de calor', brand: 'Carrier', model: '25VNA4', serial: 'CR2291XK', installed: ymd(addDays(now, -900)), warranty: ymd(addDays(now, 2700)) });
  C[5].equipment.push({ id: uid(), type: 'Sistema solar 8.2 kW', brand: 'REC / Enphase', model: 'Alpha Pure 410 / IQ8+', serial: 'SYS-55102', installed: ymd(addDays(now, -400)), warranty: ymd(addDays(now, 8700)) });
  C[0].equipment.push({ id: uid(), type: 'AC split 3 ton', brand: 'Trane', model: 'XR16', serial: 'TR88123', installed: ymd(addDays(now, -3200)), warranty: ymd(addDays(now, -100)) });

  const leadDefs = [
    [6, 'solar', 'Sistema solar + batería', 34000, 'new'], [7, 'roofing', 'Reemplazo de techo por granizo', 18500, 'new'], [8, 'hvac', 'AC no enfría', 450, 'contacted'],
    [9, 'solar', 'Cotización solar 10 kW', 29500, 'contacted'], [10, 'roofing', 'Inspección de goteras', 900, 'visit'], [11, 'hvac', 'Reemplazo de sistema completo', 15400, 'visit'],
    [12, 'solar', 'Solar comercial bodega', 96000, 'proposal'], [13, 'roofing', 'Techo de metal nuevo', 31000, 'proposal'], [14, 'hvac', 'Mini-split para garage', 5200, 'won'],
    [15, 'solar', 'Paneles para casa nueva', 24000, 'lost'], [16, 'roofing', 'Canaletas y fascia', 3200, 'new'], [17, 'hvac', 'Plan de mantenimiento', 199, 'contacted'],
  ];
  d.leads = leadDefs.map(([ci, division, title, value, stage], i) => ({ id: uid(), customerId: C[ci].id, division, title, value, stage, source: C[ci].source, createdAt: iso(addDays(now, -i * 2 - 1)), next: ymd(addDays(now, (i % 5) - 1)), notes: '' }));

  const mkItems = (division, list) => list.map(([idx, qty]) => { const p = d.pricebook.filter(x => x.division === division)[idx]; return { id: uid(), name: p.name, qty, price: p.price, cost: p.cost }; });
  const estDefs = [
    [0, 'solar', 'Sistema solar 8.2 kW', 'sent', [[[0, 20], [1, 20], [4, 20], [6, 1]], [[0, 20], [1, 20], [4, 20], [6, 1], [3, 1]]], -3],
    [1, 'roofing', 'Reemplazo de techo 24 squares', 'approved', [[[0, 24], [2, 24], [4, 3]], [[1, 24], [2, 24], [4, 3]]], -12],
    [2, 'hvac', 'Reemplazo de bomba de calor', 'approved', [[[5, 1], [4, 1]], [[6, 1], [4, 1]]], -20],
    [3, 'solar', 'Solar 6 kW + panel 200A', 'draft', [[[0, 15], [1, 15], [4, 15], [5, 1], [6, 1]]], -1],
    [4, 'roofing', 'Reparación de fuga y flashing', 'sent', [[[7, 1], [6, 1]]], -6],
    [5, 'hvac', 'Termostato + mantenimiento', 'declined', [[[4, 1], [1, 1]]], -25],
    [6, 'solar', 'Solar 11 kW con batería', 'sent', [[[0, 27], [2, 1], [4, 27], [6, 1]], [[0, 27], [2, 1], [4, 27], [6, 1], [3, 1]]], -9],
    [7, 'hvac', 'Mini-split 1 zona', 'approved', [[[7, 1]]], -15],
  ];
  const optNames = ['Bueno', 'Mejor', 'Óptimo'];
  d.estimates = estDefs.map(([ci, division, title, status, opts, off]) => ({
    id: uid(), number: 'E-' + (++d.settings.counters.est), customerId: C[ci].id, division, title, status, createdAt: iso(addDays(now, off)), validUntil: ymd(addDays(now, off + 30)),
    options: opts.map((items, k) => ({ id: uid(), name: optNames[k], items: mkItems(division, items) })), selected: status === 'approved' ? 0 : null, notes: '', deposit: division === 'solar' ? 10 : division === 'roofing' ? 30 : 0,
  }));
  d.estimates.forEach(e => { if (e.status === 'approved') e.selected = e.options.length - 1; });

  const jobDefs = [
    [1, 'roofing', 'Reemplazo de techo — Carter', ['t3', 't4'], 0, 7, 9, 'inprogress'], [2, 'hvac', 'Instalación bomba de calor', ['t5'], 0, 8, 6, 'completed'],
    [0, 'hvac', 'Mantenimiento anual AC', ['t6'], 0, 13, 1.5, 'scheduled'], [5, 'solar', 'Limpieza y revisión de paneles', ['t2'], 1, 9, 2, 'scheduled'],
    [8, 'hvac', 'Diagnóstico: AC no enfría', ['t6'], 1, 10, 1.5, 'scheduled'], [7, 'hvac', 'Instalación mini-split', ['t5'], 1, 8, 7, 'scheduled'],
    [9, 'solar', 'Site survey 10 kW', ['t1'], 2, 9, 2, 'scheduled'], [10, 'roofing', 'Inspección de goteras', ['t3'], 2, 14, 1.5, 'scheduled'],
    [11, 'hvac', 'Evaluación reemplazo sistema', ['t5'], 3, 11, 2, 'scheduled'], [12, 'solar', 'Instalación solar 8.2 kW', ['t1', 't2'], 3, 7, 9, 'scheduled'],
    [13, 'roofing', 'Instalación canaletas', ['t4'], 4, 8, 5, 'scheduled'], [14, 'hvac', 'Mantenimiento membresía', ['t6'], 4, 9, 1.5, 'scheduled'],
    [3, 'solar', 'Inspección municipal solar', ['t2'], -2, 10, 2, 'completed'], [4, 'roofing', 'Reparación de fuga', ['t4'], -1, 9, 3, 'completed'],
    [15, 'hvac', 'Cambio de capacitor', ['t5'], -1, 15, 1, 'completed'], [16, 'roofing', 'Estimado de techo nuevo', [], null, 0, 1.5, 'unscheduled'],
    [17, 'hvac', 'Revisión de calefacción', [], null, 0, 1.5, 'unscheduled'], [6, 'solar', 'Diseño y permisos 11 kW', [], null, 0, 3, 'unscheduled'],
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
    const inv = { id: uid(), number: 'F-' + (++d.settings.counters.inv), customerId: C[ci].id, jobId: null, division, items: [{ id: uid(), name: division === 'solar' ? 'Sistema solar instalado' : division === 'roofing' ? 'Trabajo de techado' : 'Servicio HVAC', qty: 1, price: amt, cost: Math.round(amt * (0.5 + R() * 0.15)) }], status: 'sent', createdAt: iso(dt), due: ymd(addDays(dt, 15)), payments: [] };
    if (paidFull) inv.payments.push({ id: uid(), amount: amt, date: iso(addDays(dt, Math.min(age, 3 + Math.floor(R() * 12)))), method: pick(PAY_METHODS) });
    else if (R() > 0.5) inv.payments.push({ id: uid(), amount: Math.round(amt * 0.3), date: iso(addDays(dt, 1)), method: 'Tarjeta' });
    void i; return inv;
  });
  // factura del trabajo completado de HVAC
  const doneJob = d.jobs[1];
  d.invoices.push({ id: uid(), number: 'F-' + (++d.settings.counters.inv), customerId: doneJob.customerId, jobId: doneJob.id, division: 'hvac', items: doneJob.items.map(x => ({ ...x, id: uid() })), status: 'draft', createdAt: iso(now), due: ymd(addDays(now, 15)), payments: [] });
  doneJob.invoiceId = d.invoices[d.invoices.length - 1].id;

  d.plans = [
    [0, 'Confort Anual HVAC', 19, 'month'], [2, 'Confort Anual HVAC', 19, 'month'], [14, 'Confort Premium HVAC', 29, 'month'], [5, 'Solar Care (limpieza + monitoreo)', 249, 'year'], [11, 'Confort Anual HVAC', 199, 'year'], [1, 'Roof Shield (inspección anual)', 149, 'year'],
  ].map(([ci, name, price, interval], i) => ({ id: uid(), customerId: C[ci].id, name, price, interval, division: name.includes('HVAC') ? 'hvac' : name.includes('Solar') ? 'solar' : 'roofing', status: 'active', startDate: ymd(addDays(now, -200 - i * 30)), nextVisit: ymd(addDays(now, i * 9 - 6)), visitsPerYear: name.includes('Premium') ? 3 : 2 }));

  const solarJob = d.jobs.find(j => j.title.startsWith('Instalación solar'));
  const roofJob = d.jobs[0];
  d.permits = [
    { id: uid(), jobId: solarJob.id, type: 'Eléctrico', jurisdiction: 'Ciudad de ' + C[12].city, number: 'BE-26-4471', status: 'approved', submitted: ymd(addDays(now, -18)), updated: ymd(addDays(now, -4)), notes: '' },
    { id: uid(), jobId: solarJob.id, type: 'Interconexión (utility)', jurisdiction: C[12].property.utility, number: 'NEM-88123', status: 'submitted', submitted: ymd(addDays(now, -10)), updated: ymd(addDays(now, -10)), notes: 'NEM 3.0 / net billing' },
    { id: uid(), jobId: roofJob.id, type: 'Techado', jurisdiction: 'Ciudad de ' + C[1].city, number: 'RF-26-1029', status: 'inspection', submitted: ymd(addDays(now, -9)), updated: ymd(addDays(now, -1)), notes: 'Inspección de deck mañana' },
    { id: uid(), jobId: d.jobs[17].id, type: 'Construcción', jurisdiction: 'Ciudad de ' + C[6].city, number: '', status: 'todo', submitted: '', updated: ymd(now), notes: 'Falta carta de ingeniería estructural' },
    { id: uid(), jobId: d.jobs[12].id, type: 'PTO (permiso para operar)', jurisdiction: C[3].property.utility, number: 'PTO-55621', status: 'submitted', submitted: ymd(addDays(now, -2)), updated: ymd(addDays(now, -2)), notes: '' },
  ];
  d.activity = [
    ['Pago recibido de ' + C[4].name, -0.1], ['Estimado ' + d.estimates[0].number + ' enviado a ' + C[0].name, -0.3], ['Nuevo lead: ' + C[6].name + ' (Solar)', -0.6], ['Trabajo completado: Instalación bomba de calor', -1], ['Permiso RF-26-1029 con inspección programada', -1.4],
  ].map(([text, off]) => ({ id: uid(), text, ts: iso(new Date(Date.now() + off * DAY)) }));
  return d;
}

function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return JSON.parse(raw); } catch (e) { /* sin acceso */ }
  return seed();
}
function save() {
  if (cloud.on) { setSync('saving'); clearTimeout(cloud.timer); cloud.timer = setTimeout(sync, 450); return; }
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { toast('No se pudo guardar localmente (almacenamiento lleno o bloqueado).'); }
}
function log(text) { db.activity.unshift({ id: uid(), text, ts: iso(new Date()), by: cloud.user ? cloud.user.email : undefined }); db.activity = db.activity.slice(0, 200); }
function blankDb() { const d = seed(); return { ...d, techs: [], customers: [], leads: [], estimates: [], jobs: [], invoices: [], plans: [], permits: [], activity: [] }; }

/* ───────────── Nube (Supabase) ───────────── */
const CFG = window.OPSBOSS_CONFIG || {};
const COLLS = ['customers', 'leads', 'estimates', 'jobs', 'invoices', 'plans', 'permits', 'pricebook', 'techs', 'activity'];
const TABLE = 'opsboss_records';
const ROLE_LABEL = { owner: 'Dueño', admin: 'Administrador', office: 'Oficina', tech: 'Técnico' };
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
  const txt = { ok: 'Sincronizado', saving: 'Guardando…', error: 'Error de sincronización', local: 'Modo local', offline: 'Sin conexión' }[st];
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
    .subscribe(st => { if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setSync('error', 'Tiempo real desconectado; los cambios de otros se verán al recargar.'); });
}


/* ───────────── Cálculos ───────────── */
const cust = id => db.customers.find(c => c.id === id) || { name: '(cliente eliminado)', id: '' };
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
const nextNum = k => { const p = { est: 'E-', job: 'J-', inv: 'F-' }[k], coll = { est: 'estimates', job: 'jobs', inv: 'invoices' }[k]; const max = Math.max(db.settings.counters[k] || 0, ...db[coll].map(x => parseInt(String(x.number || '').replace(/\D/g, ''), 10) || 0)); db.settings.counters[k] = max + 1; return p + (max + 1); };

/* ───────────── Estado UI ───────────── */
const state = { div: 'all', week: weekStart(new Date()), tabs: {}, filters: {} };
try { state.div = localStorage.getItem('opsboss.div') || 'all'; } catch (e) { /* ignore */ }

/* ───────────── UI: toast, modal ───────────── */
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#toastRoot').appendChild(t); setTimeout(() => t.remove(), 3200); }
function modal({ title, body, foot = '', wide = false, onMount }) {
  const root = $('#modalRoot');
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-h"><h2>${title}</h2><button class="icon-btn" data-close aria-label="Cerrar">✕</button></div><div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
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
function form({ title, fields, onSave, saveLabel = 'Guardar', extraFoot = '', wide }) {
  return modal({
    title, wide,
    body: `<form class="form" id="mform">${fields.map(field).join('')}<button type="submit" hidden></button></form>`,
    foot: `${extraFoot}<button class="btn" data-dismiss>Cancelar</button><button class="btn primary" data-save>${saveLabel}</button>`,
    onMount(bg, close) {
      const submit = e => {
        e && e.preventDefault();
        const vals = {}; $$('[name]', bg).forEach(i => vals[i.name] = i.type === 'number' ? num(i.value) : i.value.trim());
        for (const f of fields) if (f.required && !vals[f.k]) { toast(`"${f.label}" es obligatorio`); return; }
        if (onSave(vals, bg) !== false) { close(); save(); render(); }
      };
      $('#mform', bg).addEventListener('submit', submit);
      $('[data-save]', bg).onclick = submit;
    },
  });
}
const custOptions = () => [...db.customers].sort((a, b) => a.name.localeCompare(b.name)).map(c => [c.id, c.name]);
const divOptions = () => Object.entries(DIV).map(([k, v]) => [k, v.name]);
const techOptions = () => [['', '— Sin asignar —'], ...db.techs.map(t => [t.id, t.name])];
const confirmDlg = (msg, yes) => modal({ title: 'Confirmar', body: `<p>${msg}</p>`, foot: `<button class="btn" data-dismiss>Cancelar</button><button class="btn primary" id="cfYes">Confirmar</button>`, onMount(bg, close) { $('#cfYes', bg).onclick = () => { close(); yes(); save(); render(); }; } });

/* ───────────── Navegación ───────────── */
const NAV = [
  ['sec', 'Operación'], ['dashboard', '◧', 'Panel'], ['schedule', '▦', 'Agenda y despacho'], ['pipeline', '⇶', 'Pipeline de ventas'], ['customers', '☺', 'Clientes'],
  ['sec', 'Ventas y trabajos'], ['estimates', '✎', 'Estimados'], ['jobs', '⚒', 'Trabajos'], ['invoices', '$', 'Facturas y pagos'], ['plans', '↻', 'Membresías'],
  ['sec', 'Proyectos'], ['permits', '⚑', 'Permisos e inspecciones'], ['tools', '∑', 'Calculadoras'],
  ['sec', 'Negocio'], ['reports', '▤', 'Reportes'], ['pricebook', '☰', 'Lista de precios'], ['team', '◎', 'Equipo'], ['settings', '⚙', 'Configuración'],
];
function renderNav() {
  const route = (location.hash.slice(2) || 'dashboard').split('/')[0];
  const parentOf = { customer: 'customers', estimate: 'estimates', job: 'jobs', invoice: 'invoices' };
  const active = parentOf[route] || route;
  const badges = { schedule: db.jobs.filter(j => j.status === 'unscheduled').length, invoices: db.invoices.filter(i => invStatus(i) === 'overdue').length, pipeline: db.leads.filter(l => l.stage === 'new').length, permits: db.permits.filter(p => ['todo', 'rejected'].includes(p.status)).length };
  $('#nav').innerHTML = NAV.map(n => n[0] === 'sec' ? `<div class="sec">${n[1]}</div>` : `<a href="#/${n[0]}" class="${active === n[0] ? 'active' : ''}"><span class="ic">${n[1]}</span>${n[2]}${badges[n[0]] ? `<span class="badge">${badges[n[0]]}</span>` : ''}</a>`).join('');
  $('#divFilter').innerHTML = [['all', 'Todo'], ...divOptions()].map(([k, v]) => `<button data-div="${k}" class="${state.div === k ? 'on' : ''}">${k !== 'all' ? `<span class="div-dot d-${k}"></span> ` : ''}${v}</button>`).join('');
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
  const rows = items.map((it, i) => editable ? `<tr><td><input data-li="${ctx}" data-i="${i}" data-f="name" value="${esc(it.name)}"></td><td style="width:80px"><input data-li="${ctx}" data-i="${i}" data-f="qty" type="number" step="any" value="${it.qty}"></td><td style="width:120px"><input data-li="${ctx}" data-i="${i}" data-f="price" type="number" step="any" value="${it.price}"></td><td class="right b" style="width:110px">${money2(num(it.qty) * num(it.price))}</td><td style="width:36px"><button class="btn ghost sm danger" data-act="liDel" data-ctx="${ctx}" data-i="${i}" title="Quitar">✕</button></td></tr>`
    : `<tr><td>${esc(it.name)}</td><td class="right">${it.qty}</td><td class="right">${money2(it.price)}</td><td class="right b">${money2(num(it.qty) * num(it.price))}</td></tr>`).join('');
  const sub = subtotal(items), tax = taxOf(items), cost = costOf(items);
  return `<div class="table-wrap"><table class="line-items"><thead><tr><th>Concepto</th><th class="right">Cant.</th><th class="right">Precio</th><th class="right">Total</th>${editable ? '<th></th>' : ''}</tr></thead><tbody>${rows || `<tr><td colspan="5" class="muted">Sin conceptos todavía.</td></tr>`}</tbody></table></div>
  ${editable ? `<div class="row mt"><button class="btn sm" data-act="liAdd" data-ctx="${ctx}">＋ Línea</button><button class="btn sm" data-act="liBook" data-ctx="${ctx}">☰ Desde lista de precios</button></div>` : ''}
  <div style="display:flex;justify-content:flex-end;margin-top:12px"><table style="width:auto;min-width:260px"><tr><td class="muted">Subtotal</td><td class="right">${money2(sub)}</td></tr>${num(db.settings.taxRate) ? `<tr><td class="muted">Impuesto (${db.settings.taxRate}%)</td><td class="right">${money2(tax)}</td></tr>` : ''}<tr><td class="b">Total</td><td class="right b" style="font-size:17px">${money2(sub + tax)}</td></tr>${editable && sub ? `<tr class="no-print"><td class="muted small">Margen bruto</td><td class="right small ${sub - cost >= 0 ? 'up' : 'down'}">${money(sub - cost)} · ${pct((sub - cost) / sub)}</td></tr>` : ''}</table></div>`;
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
    title: 'Agregar desde lista de precios', wide: true,
    body: `<input class="inp" id="pbq" placeholder="Buscar concepto…"><div class="table-wrap mt"><table><thead><tr><th>Concepto</th><th>División</th><th>Unidad</th><th class="right">Precio</th><th></th></tr></thead><tbody id="pbl"></tbody></table></div>`,
    onMount(bg, close) {
      const draw = q => { $('#pbl', bg).innerHTML = list.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).map(p => `<tr><td>${esc(p.name)}</td><td>${divPill(p.division)}</td><td>${esc(p.unit)}</td><td class="right">${money2(p.price)}</td><td class="right"><button class="btn sm primary" data-pb="${p.id}">Agregar</button></td></tr>`).join(''); };
      draw('');
      $('#pbq', bg).oninput = e => draw(e.target.value);
      bg.addEventListener('click', e => { const b = e.target.closest('[data-pb]'); if (!b) return; const p = db.pricebook.find(x => x.id === b.dataset.pb); onPick({ id: uid(), name: p.name, qty: 1, price: p.price, cost: p.cost }); toast('Agregado: ' + p.name); save(); render(); });
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
  const months = []; for (let m = 5; m >= 0; m--) { const s = new Date(now.getFullYear(), now.getMonth() - m, 1), e = new Date(now.getFullYear(), now.getMonth() - m + 1, 1); const by = {}; Object.keys(DIV).forEach(k => by[k] = allPayments().filter(p => p.division === k && new Date(p.date) >= s && new Date(p.date) < e).reduce((a, p) => a + num(p.amount), 0)); months.push({ label: s.toLocaleDateString('es-US', { month: 'short' }), by }); }
  const keys = state.div === 'all' ? Object.keys(DIV) : [state.div];
  const maxM = Math.max(1, ...months.map(m => keys.reduce((s, k) => s + m.by[k], 0)));
  const bars = months.map(m => { const tot = keys.reduce((s, k) => s + m.by[k], 0); return `<div class="bar" title="${m.label}: ${money(tot)}"><div class="small b">${kmoney(tot)}</div><div class="stack" style="height:${tot / maxM * 130}px">${keys.map(k => `<div style="height:${tot ? m.by[k] / tot * 100 : 0}%;background:${DIV[k].color}"></div>`).join('')}</div><div class="lbl">${m.label}</div></div>`; }).join('');
  const attention = [
    ...overdue.slice(0, 4).map(i => `<div class="list-item"><span class="pill bad">Vencida</span><div style="flex:1"><a href="#/invoice/${i.id}">${i.number}</a> · ${esc(cust(i.customerId).name)}</div><b>${money(invBal(i))}</b></div>`),
    ...db.jobs.filter(divOK).filter(j => j.status === 'unscheduled').slice(0, 3).map(j => `<div class="list-item"><span class="pill warn">Sin programar</span><div style="flex:1"><a href="#/job/${j.id}">${esc(j.title)}</a></div>${divPill(j.division)}</div>`),
    ...db.permits.filter(p => ['todo', 'rejected'].includes(p.status)).slice(0, 3).map(p => `<div class="list-item">${pill(PERMIT_ST, p.status)}<div style="flex:1"><a href="#/permits">${esc(p.type)}</a> · ${esc(p.jurisdiction)}</div></div>`),
    ...sentEst.filter(e => (Date.now() - new Date(e.createdAt)) / DAY > 5).slice(0, 3).map(e => `<div class="list-item"><span class="pill info">Dar seguimiento</span><div style="flex:1"><a href="#/estimate/${e.id}">${e.number}</a> · ${esc(cust(e.customerId).name)}</div><b>${money(estMax(e))}</b></div>`),
  ];
  const srcCount = {}; leads.forEach(l => srcCount[l.source] = (srcCount[l.source] || 0) + 1); const srcMax = Math.max(1, ...Object.values(srcCount));
  return head(`Buenos días 👋`, `${now.toLocaleDateString('es-US', { weekday: 'long', day: 'numeric', month: 'long' })} · ${todays.length} trabajos hoy · ${state.div === 'all' ? 'todas las divisiones' : DIV[state.div].name}`, `<a class="btn" href="#/schedule">Ver agenda</a><button class="btn primary" data-act="newJob">＋ Trabajo</button>`) + `
  <div class="grid g4">
    ${kpi('Cobrado este mes', money(mRev), `<span class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${pct(Math.abs(delta))}</span> vs. mes anterior`)}
    ${kpi('Por cobrar (A/R)', money(ar), `${overdue.length} facturas vencidas · ${money(overdue.reduce((s, i) => s + invBal(i), 0))}`)}
    ${kpi('Pipeline abierto', kmoney(pipe), `${openLeads.length} leads · ${sentEst.length} estimados enviados`)}
    ${kpi('Tasa de cierre', pct(close), `Ingreso recurrente: ${money(mrr)}/mes`)}
  </div>
  <div class="grid g-2-1 mt">
    <div class="card"><div class="card-h"><h3>Ingresos cobrados — últimos 6 meses</h3><div class="legend">${keys.map(k => `<span><span class="div-dot d-${k}"></span>${DIV[k].name}</span>`).join('')}</div></div><div class="card-b"><div class="bars">${bars}</div></div></div>
    <div class="card"><div class="card-h"><h3>Trabajos de hoy</h3><a href="#/schedule" class="small">Despacho →</a></div><div class="card-b">${todays.length ? todays.map(j => `<div class="list-item click" data-go="#/job/${j.id}" style="cursor:pointer"><div style="width:62px" class="small b">${fTime(j.start)}</div><div style="flex:1;min-width:0"><div class="b" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(j.title)}</div><div class="small muted">${esc(cust(j.customerId).name)} · ${esc(cust(j.customerId).city || '')}</div></div><div class="row">${j.techIds.map(t => avatar(tech(t))).join('')}</div></div>`).join('') : '<div class="empty">No hay trabajos hoy.</div>'}</div></div>
  </div>
  <div class="grid g3 mt">
    <div class="card"><div class="card-h"><h3>Requiere atención</h3></div><div class="card-b">${attention.join('') || '<div class="empty">Todo al día ✓</div>'}</div></div>
    <div class="card"><div class="card-h"><h3>Fuentes de leads</h3></div><div class="card-b">${Object.entries(srcCount).sort((a, b) => b[1] - a[1]).map(([s, n]) => `<div style="margin-bottom:10px"><div class="row" style="justify-content:space-between"><span>${esc(s)}</span><b>${n}</b></div><div class="progress"><div style="width:${n / srcMax * 100}%"></div></div></div>`).join('') || '<div class="empty">Sin leads.</div>'}</div></div>
    <div class="card"><div class="card-h"><h3>Actividad reciente</h3></div><div class="card-b"><div class="timeline">${db.activity.slice(0, 7).map(a => `<div class="ev"><div>${esc(a.text)}</div><div class="small muted">hace ${ago(a.ts)}</div></div>`).join('')}</div></div></div>
  </div>`;
};

/* ───────────── AGENDA / DESPACHO ───────────── */
ROUTES.schedule = () => {
  const ws = state.week, days = [...Array(7)].map((_, i) => addDays(ws, i));
  const techs = db.techs.filter(t => state.div === 'all' || t.division === state.div);
  const jobs = db.jobs.filter(divOK).filter(j => j.status !== 'cancelled');
  const chip = j => { const c = cust(j.customerId); return `<div class="jchip ${j.division} ${j.status === 'completed' ? 'done' : ''}" draggable="true" data-job="${j.id}" data-go="#/job/${j.id}" title="${esc(j.title)} — ${esc(c.name)}"><b>${j.start ? fTime(j.start) + ' · ' : ''}${esc(j.title)}</b>${esc(c.name)} · ${num(j.duration)}h${j.status === 'completed' ? ' ✓' : ''}</div>`; };
  const unsched = jobs.filter(j => j.status === 'unscheduled' || !j.start);
  let grid = `<div class="bh">Técnico</div>` + days.map(d => `<div class="bh ${sameDay(d, new Date()) ? 'today' : ''}">${fDay(d)}</div>`).join('');
  techs.forEach(t => {
    const hrs = jobs.filter(j => j.start && j.techIds.includes(t.id) && new Date(j.start) >= ws && new Date(j.start) < addDays(ws, 7)).reduce((s, j) => s + num(j.duration), 0);
    grid += `<div class="tech">${avatar(t)}<div style="min-width:0"><div class="b small">${esc(t.name)}</div><div class="small muted">${hrs}h / 40h</div></div></div>`;
    days.forEach(d => {
      const list = jobs.filter(j => j.start && j.techIds.includes(t.id) && sameDay(j.start, d)).sort((a, b) => new Date(a.start) - new Date(b.start));
      grid += `<div class="cell ${sameDay(d, new Date()) ? 'today' : ''}" data-drop="${t.id}|${ymd(d)}">${list.map(chip).join('')}${list.length ? `<a class="small muted" href="${routeUrl(list)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Abrir ruta en Google Maps">↗ ruta</a>` : ''}</div>`;
    });
  });
  return head('Agenda y despacho', 'Arrastra los trabajos entre técnicos y días. Suelta en "Sin programar" para desprogramar.', `<button class="btn" data-act="wk" data-n="-7">‹</button><button class="btn" data-act="wk" data-n="0">Hoy</button><button class="btn" data-act="wk" data-n="7">›</button><button class="btn primary" data-act="newJob">＋ Trabajo</button>`) + `
  <div class="card mb"><div class="card-h"><h3>Sin programar (${unsched.length})</h3><span class="small muted">Semana del ${fDate(ws)}</span></div><div class="card-b"><div class="tray" data-drop="unscheduled">${unsched.map(chip).join('') || '<span class="muted small">No hay trabajos pendientes de programar.</span>'}</div></div></div>
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
      if (target === 'unscheduled') { j.start = null; j.techIds = []; j.status = 'unscheduled'; log(`${j.number} desprogramado`); }
      else {
        const [tid, day] = target.split('|');
        const time = j.start ? hm(j.start) : '08:00';
        j.start = iso(parseLocal(day, time));
        if (!j.techIds.includes(tid)) { if (from && j.techIds.includes(from)) j.techIds = j.techIds.map(x => x === from ? tid : x); else if (j.techIds.length) j.techIds[0] = tid; else j.techIds = [tid]; }
        if (j.status === 'unscheduled') j.status = 'scheduled';
        log(`${j.number} asignado a ${tech(tid).name} el ${fDay(j.start)}`);
        toast(`Programado: ${fDay(j.start)} ${fTime(j.start)} · ${tech(tid).name}`);
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
    return `<div class="kcol" data-stage="${k}"><div class="kcol-h"><span>${label} <span class="muted">${list.length}</span></span><span class="sum">${kmoney(list.reduce((s, l) => s + num(l.value), 0))}</span></div><div class="kcol-b">${list.map(l => { const c = cust(l.customerId); const late = l.next && parseLocal(l.next) < sod(new Date()) && !['won', 'lost'].includes(l.stage); return `<div class="kcard" draggable="true" data-lead="${l.id}"><div class="t">${esc(l.title)}</div><div class="small">${esc(c.name)}</div><div class="m"><span>${divPill(l.division)}</span><b>${money(l.value)}</b></div><div class="m"><span>${esc(l.source || '')}</span><span class="${late ? 'down b' : ''}">${l.next ? '⏱ ' + fDate(l.next) : ''}</span></div></div>`; }).join('')}</div></div>`;
  }).join('');
  const open = leads.filter(l => !['won', 'lost'].includes(l.stage));
  return head('Pipeline de ventas', `${open.length} oportunidades abiertas · ${money(open.reduce((s, l) => s + num(l.value), 0))} en juego`, `<button class="btn primary" data-act="newLead">＋ Lead</button>`) + `<div class="kanban">${cols}</div>`;
};
ROUTES['pipeline:after'] = () => {
  $$('[data-lead]').forEach(el => {
    el.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', el.dataset.lead));
    el.addEventListener('click', () => leadModal(db.leads.find(l => l.id === el.dataset.lead)));
  });
  $$('[data-stage]').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('over'); const l = db.leads.find(x => x.id === e.dataTransfer.getData('text/plain')); if (!l || l.stage === col.dataset.stage) return; l.stage = col.dataset.stage; log(`Lead "${l.title}" → ${STAGES.find(s => s[0] === l.stage)[1]}`); save(); render(); });
  });
};
function leadModal(l) {
  const isNew = !l;
  l = l || { id: uid(), stage: 'new', createdAt: iso(new Date()), division: state.div !== 'all' ? state.div : 'solar', value: 0, source: 'Google', next: ymd(addDays(new Date(), 1)) };
  const m = form({
    title: isNew ? 'Nuevo lead' : 'Lead: ' + esc(l.title),
    fields: [
      { k: 'customerId', label: 'Cliente', type: 'select', options: [['__new', '＋ Nuevo cliente…'], ...custOptions()], value: l.customerId || '__new' },
      { k: 'newName', label: 'Nombre (si es nuevo)', value: '' }, { k: 'newPhone', label: 'Teléfono (si es nuevo)', value: '' },
      { k: 'title', label: 'Oportunidad', value: l.title, required: true, ph: 'Ej. Sistema solar 8 kW' },
      { k: 'division', label: 'División', type: 'select', options: divOptions(), value: l.division },
      { k: 'value', label: 'Valor estimado ($)', type: 'number', value: l.value },
      { k: 'stage', label: 'Etapa', type: 'select', options: STAGES, value: l.stage },
      { k: 'source', label: 'Fuente', type: 'select', options: SOURCES, value: l.source },
      { k: 'next', label: 'Próximo seguimiento', type: 'date', value: l.next },
      { k: 'notes', label: 'Notas', type: 'textarea', full: true, value: l.notes },
    ],
    extraFoot: isNew ? '' : `<button class="btn danger" id="ldDel" style="margin-right:auto">Eliminar</button><button class="btn" id="ldEst">→ Crear estimado</button>`,
    onSave(v) {
      if (v.customerId === '__new') { if (!v.newName) { toast('Escribe el nombre del nuevo cliente'); return false; } const c = newCustomer({ name: v.newName, phone: v.newPhone, source: v.source }); v.customerId = c.id; }
      delete v.newName; delete v.newPhone;
      Object.assign(l, v); if (isNew) { db.leads.unshift(l); log(`Nuevo lead: ${cust(l.customerId).name} (${DIV[l.division].name})`); toast('Lead creado'); }
    },
  });
  if (!isNew) {
    $('#ldDel', m.el).onclick = () => { m.close(); confirmDlg('¿Eliminar este lead?', () => { db.leads = db.leads.filter(x => x.id !== l.id); }); };
    $('#ldEst', m.el).onclick = () => { m.close(); const e = createEstimate({ customerId: l.customerId, division: l.division, title: l.title }); l.stage = 'proposal'; l.estimateId = e.id; save(); location.hash = '#/estimate/' + e.id; };
  }
}

/* ───────────── CLIENTES ───────────── */
function newCustomer(v) {
  const c = { id: uid(), name: v.name, phone: v.phone || '', email: v.email || '', address: v.address || '', city: v.city || '', zip: v.zip || '', source: v.source || 'Google', tags: [], createdAt: iso(new Date()), notes: v.notes || '', property: { roofType: '', roofAge: '', sqft: '', utility: '', avgBill: '', stories: 1 }, equipment: [] };
  db.customers.unshift(c); log('Nuevo cliente: ' + c.name); return c;
}
function customerModal(c) {
  const isNew = !c; c = c || {};
  form({
    title: isNew ? 'Nuevo cliente' : 'Editar cliente',
    fields: [
      { k: 'name', label: 'Nombre completo', value: c.name, required: true }, { k: 'phone', label: 'Teléfono', type: 'tel', value: c.phone },
      { k: 'email', label: 'Email', type: 'email', value: c.email }, { k: 'source', label: 'Fuente', type: 'select', options: SOURCES, value: c.source },
      { k: 'address', label: 'Dirección', value: c.address, full: true }, { k: 'city', label: 'Ciudad', value: c.city }, { k: 'zip', label: 'Código postal', value: c.zip },
      { k: 'notes', label: 'Notas', type: 'textarea', full: true, value: c.notes },
    ],
    onSave(v) { if (isNew) { const n = newCustomer(v); toast('Cliente creado'); setTimeout(() => location.hash = '#/customer/' + n.id); } else Object.assign(c, v); },
  });
}
ROUTES.customers = () => {
  const q = (state.filters.cq || '').toLowerCase();
  const rows = db.customers.filter(c => !q || [c.name, c.phone, c.email, c.address, c.city].join(' ').toLowerCase().includes(q)).filter(c => state.div === 'all' || [...db.jobs, ...db.leads, ...db.estimates, ...db.invoices].some(x => x.customerId === c.id && x.division === state.div));
  const divsOf = id => [...new Set([...db.jobs, ...db.leads, ...db.estimates, ...db.invoices].filter(x => x.customerId === id).map(x => x.division))];
  return head('Clientes', `${db.customers.length} clientes en total`, `<button class="btn" data-act="exportCsv" data-what="customers">⇩ CSV</button><button class="btn primary" data-act="newCustomer">＋ Cliente</button>`) + `
  <div class="card"><div class="toolbar"><input id="cq" placeholder="Buscar por nombre, teléfono, dirección…" value="${esc(state.filters.cq || '')}" style="flex:1;min-width:200px"></div>
  <div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Contacto</th><th>Dirección</th><th>Divisiones</th><th class="right">Valor de vida</th><th class="right">Saldo</th></tr></thead><tbody>
  ${rows.map(c => { const bal = custBal(c.id); return `<tr class="click" data-go="#/customer/${c.id}"><td><div class="row"><span class="avatar" style="background:#6366f1">${initials(c.name)}</span><div><div class="b">${esc(c.name)}</div><div class="small muted">${esc(c.source || '')}</div></div></div></td><td><div>${esc(c.phone)}</div><div class="small muted">${esc(c.email)}</div></td><td>${esc(c.address)}<div class="small muted">${esc(c.city)} ${esc(c.zip)}</div></td><td><div class="row">${divsOf(c.id).map(divPill).join('')}</div></td><td class="right">${money(custLTV(c.id))}</td><td class="right ${bal ? 'b down' : 'muted'}">${bal ? money(bal) : '—'}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">Sin resultados</td></tr>'}
  </tbody></table></div></div>`;
};
ROUTES['customers:after'] = () => { const i = $('#cq'); if (!i) return; i.oninput = () => { state.filters.cq = i.value; const pos = i.selectionStart; render(); const n = $('#cq'); n.focus(); n.setSelectionRange(pos, pos); }; };

ROUTES.customer = id => {
  const c = db.customers.find(x => x.id === id); if (!c) return '<div class="empty">Cliente no encontrado</div>';
  const tab = state.tabs.cust || 'overview';
  const jobs = db.jobs.filter(j => j.customerId === id), ests = db.estimates.filter(e => e.customerId === id), invs = db.invoices.filter(i => i.customerId === id), leads = db.leads.filter(l => l.customerId === id), plans = db.plans.filter(p => p.customerId === id);
  const addr = encodeURIComponent(`${c.address}, ${c.city} ${c.zip}`);
  const p = c.property || {};
  let body = '';
  if (tab === 'overview') body = `
    <div class="grid g2">
      <div class="card"><div class="card-h"><h3>Trabajos (${jobs.length})</h3><button class="btn sm" data-act="newJob" data-cust="${c.id}">＋</button></div><div class="card-b">${jobs.map(j => `<div class="list-item click" data-go="#/job/${j.id}" style="cursor:pointer"><div style="flex:1"><div class="b">${j.number} · ${esc(j.title)}</div><div class="small muted">${j.start ? fDate(j.start) : 'Sin fecha'}</div></div>${divPill(j.division)} ${pill(JOB_ST, j.status)}</div>`).join('') || '<div class="muted">Sin trabajos</div>'}</div></div>
      <div class="card"><div class="card-h"><h3>Estimados (${ests.length})</h3><button class="btn sm" data-act="newEstimate" data-cust="${c.id}">＋</button></div><div class="card-b">${ests.map(e => `<div class="list-item click" data-go="#/estimate/${e.id}" style="cursor:pointer"><div style="flex:1"><div class="b">${e.number} · ${esc(e.title)}</div><div class="small muted">${fDate(e.createdAt)}</div></div><b>${money(e.status === 'approved' ? estTotal(e) : estMax(e))}</b> ${pill(EST_ST, e.status)}</div>`).join('') || '<div class="muted">Sin estimados</div>'}</div></div>
      <div class="card"><div class="card-h"><h3>Facturas (${invs.length})</h3><button class="btn sm" data-act="newInvoice" data-cust="${c.id}">＋</button></div><div class="card-b">${invs.map(i => `<div class="list-item click" data-go="#/invoice/${i.id}" style="cursor:pointer"><div style="flex:1"><div class="b">${i.number}</div><div class="small muted">${fDate(i.createdAt)}</div></div><b>${money(invTotal(i))}</b> ${pill(INV_ST, invStatus(i))}</div>`).join('') || '<div class="muted">Sin facturas</div>'}</div></div>
      <div class="card"><div class="card-h"><h3>Leads y membresías</h3><button class="btn sm" data-act="newPlan" data-cust="${c.id}">＋ Membresía</button></div><div class="card-b">${leads.map(l => `<div class="list-item"><div style="flex:1">${esc(l.title)}</div>${divPill(l.division)}<span class="pill">${STAGES.find(s => s[0] === l.stage)[1]}</span></div>`).join('')}${plans.map(pl => `<div class="list-item"><div style="flex:1"><b>${esc(pl.name)}</b><div class="small muted">Próxima visita ${fDate(parseLocal(pl.nextVisit))}</div></div><span class="pill ok">${money(pl.price)}/${pl.interval === 'month' ? 'mes' : 'año'}</span></div>`).join('') || (leads.length ? '' : '<div class="muted">Nada aún</div>')}</div></div>
    </div>`;
  if (tab === 'property') body = `
    <div class="grid g2">
      <div class="card"><div class="card-h"><h3>Propiedad</h3><button class="btn sm" data-act="editProperty" data-id="${c.id}">Editar</button></div><div class="card-b"><div class="calc-out">
        <div><div class="l">Tipo de techo</div><div class="b">${esc(p.roofType || '—')}</div></div><div><div class="l">Edad del techo</div><div class="b">${p.roofAge ? p.roofAge + ' años' : '—'}</div></div>
        <div><div class="l">Área habitable</div><div class="b">${p.sqft ? Number(p.sqft).toLocaleString() + ' ft²' : '—'}</div></div><div><div class="l">Pisos</div><div class="b">${esc(p.stories || '—')}</div></div>
        <div><div class="l">Compañía eléctrica</div><div class="b">${esc(p.utility || '—')}</div></div><div><div class="l">Factura promedio</div><div class="b">${p.avgBill ? money(p.avgBill) + '/mes' : '—'}</div></div>
      </div>${p.roofAge >= 15 ? `<p class="small"><span class="pill warn">Oportunidad</span> Techo con ${p.roofAge} años: candidato a reemplazo antes de instalar solar.</p>` : ''}${p.avgBill >= 200 ? `<p class="small"><span class="pill brand">Oportunidad</span> Factura alta (${money(p.avgBill)}/mes): buen candidato para solar + batería.</p>` : ''}</div></div>
      <div class="card"><div class="card-h"><h3>Equipos instalados</h3><button class="btn sm" data-act="addEquip" data-id="${c.id}">＋ Equipo</button></div><div class="card-b">${(c.equipment || []).map(eq => { const exp = eq.warranty && parseLocal(eq.warranty) < new Date(); return `<div class="list-item"><div style="flex:1"><div class="b">${esc(eq.type)} — ${esc(eq.brand)}</div><div class="small muted">Modelo ${esc(eq.model)} · S/N ${esc(eq.serial)} · Instalado ${fDate(parseLocal(eq.installed))}</div></div><span class="pill ${exp ? 'bad' : 'ok'}">${exp ? 'Garantía vencida' : 'Garantía hasta ' + fDate(parseLocal(eq.warranty))}</span><button class="btn ghost sm danger" data-act="delEquip" data-id="${c.id}" data-eq="${eq.id}">✕</button></div>`; }).join('') || '<div class="muted">Registra unidades HVAC, inversores, paneles o baterías para seguimiento de garantías.</div>'}</div></div>
    </div>`;
  if (tab === 'notes') body = `<div class="card"><div class="card-b"><label class="f">Notas internas<textarea id="custNotes" style="min-height:200px">${esc(c.notes)}</textarea></label><div class="row mt"><button class="btn primary" data-act="saveNotes" data-id="${c.id}">Guardar notas</button></div></div></div>`;
  return `<div class="small muted mb"><a href="#/customers">Clientes</a> / ${esc(c.name)}</div>` + head(esc(c.name), `${esc(c.address)}, ${esc(c.city)} ${esc(c.zip)} · Cliente desde ${fDate(c.createdAt)} · ${esc(c.source || '')}`,
    `<a class="btn" href="tel:${esc(c.phone)}">✆ Llamar</a><a class="btn" href="sms:${esc(c.phone)}">✉ SMS</a><a class="btn" href="mailto:${esc(c.email)}">@ Email</a><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${addr}">⌖ Mapa</a><button class="btn" data-act="editCustomer" data-id="${c.id}">Editar</button><button class="btn primary" data-act="newEstimate" data-cust="${c.id}">＋ Estimado</button>`) + `
  <div class="grid g4 mb">${kpi('Valor de vida', money(custLTV(id)))}${kpi('Saldo pendiente', money(custBal(id)))}${kpi('Trabajos', jobs.length, jobs.filter(j => j.status === 'completed').length + ' completados')}${kpi('Contacto', `<span style="font-size:15px">${esc(c.phone)}</span>`, esc(c.email))}</div>
  <div class="tabs">${[['overview', 'Resumen'], ['property', 'Propiedad y equipos'], ['notes', 'Notas']].map(([k, v]) => `<button data-act="tab" data-t="cust" data-v="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>${body}`;
};

/* ───────────── ESTIMADOS ───────────── */
function createEstimate({ customerId, division, title, items }) {
  const e = { id: uid(), number: nextNum('est'), customerId, division: division || 'solar', title: title || 'Nuevo estimado', status: 'draft', createdAt: iso(new Date()), validUntil: ymd(addDays(new Date(), 30)), options: [{ id: uid(), name: 'Bueno', items: items || [] }], selected: null, notes: '', deposit: division === 'roofing' ? 30 : division === 'solar' ? 10 : 0 };
  db.estimates.unshift(e); log(`Estimado ${e.number} creado para ${cust(customerId).name}`); return e;
}
function newEstimateModal(customerId) {
  form({ title: 'Nuevo estimado', fields: [{ k: 'customerId', label: 'Cliente', type: 'select', options: custOptions(), value: customerId }, { k: 'division', label: 'División', type: 'select', options: divOptions(), value: state.div !== 'all' ? state.div : 'solar' }, { k: 'title', label: 'Título', full: true, required: true, ph: 'Ej. Reemplazo de techo 28 squares' }], saveLabel: 'Crear', onSave(v) { const e = createEstimate(v); setTimeout(() => location.hash = '#/estimate/' + e.id); } });
}
ROUTES.estimates = () => {
  const f = state.filters.est || 'all';
  const list = db.estimates.filter(divOK).filter(e => f === 'all' || e.status === f);
  const all = db.estimates.filter(divOK);
  const sum = s => all.filter(e => e.status === s).reduce((a, e) => a + (s === 'approved' ? estTotal(e) : estMax(e)), 0);
  return head('Estimados', 'Propuestas con opciones Bueno / Mejor / Óptimo y financiamiento', `<button class="btn primary" data-act="newEstimate">＋ Estimado</button>`) + `
  <div class="grid g4 mb">${kpi('Borradores', all.filter(e => e.status === 'draft').length, money(sum('draft')))}${kpi('Enviados', all.filter(e => e.status === 'sent').length, money(sum('sent')) + ' en espera')}${kpi('Aprobados', all.filter(e => e.status === 'approved').length, money(sum('approved')))}${kpi('Rechazados', all.filter(e => e.status === 'declined').length, money(sum('declined')))}</div>
  <div class="card"><div class="toolbar">${[['all', 'Todos'], ...Object.entries(EST_ST).map(([k, v]) => [k, v[0]])].map(([k, v]) => `<button class="btn sm ${f === k ? 'primary' : ''}" data-act="filt" data-f="est" data-v="${k}">${v}</button>`).join('')}</div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Cliente</th><th>Título</th><th>División</th><th>Opciones</th><th>Fecha</th><th class="right">Monto</th><th>Estado</th></tr></thead><tbody>
  ${list.map(e => `<tr class="click" data-go="#/estimate/${e.id}"><td class="b">${e.number}</td><td>${custLink(e.customerId)}</td><td>${esc(e.title)}</td><td>${divPill(e.division)}</td><td>${e.options.length}</td><td>${fDate(e.createdAt)}</td><td class="right b">${e.options.length > 1 && e.status !== 'approved' ? money(Math.min(...e.options.map(o => totalOf(o.items)))) + '–' : ''}${money(e.status === 'approved' ? estTotal(e) : estMax(e))}</td><td>${pill(EST_ST, e.status)}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">Sin estimados</td></tr>'}
  </tbody></table></div></div>`;
};
ROUTES.estimate = id => {
  const e = db.estimates.find(x => x.id === id); if (!e) return '<div class="empty">Estimado no encontrado</div>';
  const k = Math.min(state.tabs['opt' + id] ?? (e.selected ?? 0), e.options.length - 1), opt = e.options[k];
  const tot = totalOf(opt.items), mo = monthly(tot, num(db.settings.apr), num(db.settings.term));
  const editable = e.status !== 'approved';
  const c = cust(e.customerId);
  return `<div class="small muted mb"><a href="#/estimates">Estimados</a> / ${e.number}</div>` + head(`${e.number} · ${esc(e.title)}`, `${custLink(e.customerId)} · ${divPill(e.division)} · Creado ${fDate(e.createdAt)} · Válido hasta ${fDate(parseLocal(e.validUntil))}`,
    `${pill(EST_ST, e.status)}<button class="btn" data-act="previewEst" data-id="${e.id}">⎙ Vista cliente / PDF</button>${e.status === 'draft' ? `<button class="btn primary" data-act="sendEst" data-id="${e.id}">Enviar al cliente</button>` : ''}${['sent', 'draft'].includes(e.status) ? `<button class="btn ok" data-act="approveEst" data-id="${e.id}" data-k="${k}">✓ Aprobar "${esc(opt.name)}"</button><button class="btn danger" data-act="declineEst" data-id="${e.id}">Rechazar</button>` : ''}${e.status === 'approved' ? `<span class="small muted">Opción aprobada: <b>${esc(e.options[e.selected].name)}</b></span>` : ''}${e.status === 'declined' ? `<button class="btn" data-act="reopenEst" data-id="${e.id}">Reabrir</button>` : ''}`) + `
  <div class="opt-tabs">${e.options.map((o, i) => `<button data-act="optTab" data-id="${e.id}" data-k="${i}" class="${i === k ? 'on' : ''}"><div class="b">${esc(o.name)} ${e.selected === i ? '✓' : ''}</div><div class="small muted">${money(totalOf(o.items))} · ${o.items.length} conceptos</div></button>`).join('')}${editable && e.options.length < 3 ? `<button data-act="addOpt" data-id="${e.id}"><div class="b">＋ Opción</div><div class="small muted">Duplica la actual</div></button>` : ''}</div>
  <div class="grid g-2-1">
    <div class="card"><div class="card-h"><h3>${editable ? `<input class="inp" style="width:220px;padding:6px 9px" data-act-input="optName" data-id="${e.id}" data-k="${k}" value="${esc(opt.name)}">` : esc(opt.name)}</h3>${editable && e.options.length > 1 ? `<button class="btn sm danger" data-act="delOpt" data-id="${e.id}" data-k="${k}">Eliminar opción</button>` : ''}</div><div class="card-b">${itemsTable(opt.items, editable, `est:${e.id}:${k}`)}</div></div>
    <div>
      <div class="card"><div class="card-h"><h3>Financiamiento</h3></div><div class="card-b"><div class="kpi" style="padding:0"><div class="l">Pago mensual estimado</div><div class="v">${money(mo)}<span class="small muted">/mes</span></div><div class="s">${db.settings.term} meses · ${db.settings.apr}% APR · sobre ${money(tot)}</div></div><p class="small muted">Ajusta tasa y plazo en Configuración. Sujeto a aprobación de crédito.</p></div></div>
      <div class="card mt"><div class="card-h"><h3>Condiciones</h3></div><div class="card-b form" style="grid-template-columns:1fr">
        <label class="f">Depósito al aprobar (%)<input type="number" class="inp" data-act-input="estDeposit" data-id="${e.id}" value="${e.deposit || 0}" ${editable ? '' : 'disabled'}></label>
        <label class="f">Válido hasta<input type="date" class="inp" data-act-input="estValid" data-id="${e.id}" value="${e.validUntil}" ${editable ? '' : 'disabled'}></label>
        <label class="f">Notas para el cliente<textarea class="inp" data-act-input="estNotes" data-id="${e.id}" ${editable ? '' : 'disabled'}>${esc(e.notes)}</textarea></label>
        ${num(e.deposit) ? `<div class="small">Depósito: <b>${money(tot * num(e.deposit) / 100)}</b></div>` : ''}
      </div></div>
      <div class="card mt"><div class="card-h"><h3>Cliente</h3></div><div class="card-b"><div class="b">${esc(c.name)}</div><div class="small muted">${esc(c.address)}, ${esc(c.city)}<br>${esc(c.phone)} · ${esc(c.email)}</div>${db.jobs.filter(j => j.estimateId === e.id).map(j => `<div class="mt"><a class="btn sm" href="#/job/${j.id}">→ Trabajo ${j.number}</a></div>`).join('')}<div class="mt"><button class="btn sm danger" data-act="delEst" data-id="${e.id}">Eliminar estimado</button></div></div></div>
    </div>
  </div>`;
};
function docHTML({ kind, number, date, extraMeta = '', customerId, items, notes, footer = '', bodyHTML }) {
  const s = db.settings, c = cust(customerId);
  return `<div class="doc"><div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap"><div><div style="display:flex;align-items:center;gap:10px"><div class="logo">O<span></span></div><div><div style="font-weight:800;font-size:20px">${esc(s.company)}</div><div style="color:#64748b;font-size:12px">${esc(s.license)}</div></div></div><div style="color:#64748b;font-size:12.5px;margin-top:8px">${esc(s.address)}<br>${esc(s.phone)} · ${esc(s.email)}</div></div>
  <div style="text-align:right"><div style="font-size:22px;font-weight:800;letter-spacing:.02em">${kind}</div><div style="color:#64748b">${number}</div><div style="font-size:12.5px;margin-top:6px">${date}${extraMeta}</div></div></div>
  <div style="margin:22px 0;padding:14px;background:#f8fafc;border-radius:10px"><div style="font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.06em">Para</div><div style="font-weight:700">${esc(c.name)}</div><div style="font-size:12.5px;color:#475569">${esc(c.address)}, ${esc(c.city)} ${esc(c.zip)}<br>${esc(c.phone)} · ${esc(c.email)}</div></div>
  ${bodyHTML ?? itemsTable(items, false)}${notes ? `<div style="margin-top:16px;font-size:12.5px;color:#475569;white-space:pre-wrap"><b>Notas:</b> ${esc(notes)}</div>` : ''}${footer}<div style="margin-top:24px;font-size:11.5px;color:#94a3b8">${esc(s.terms)}</div></div>`;
}
function previewEstimate(e) {
  const blocks = e.options.map((o, i) => `<h3 style="margin:20px 0 8px">Opción ${i + 1}: ${esc(o.name)} — ${money2(totalOf(o.items))} <span style="font-weight:400;color:#64748b;font-size:13px">· o ${money(monthly(totalOf(o.items), num(db.settings.apr), num(db.settings.term)))}/mes financiado</span></h3>${itemsTable(o.items, false)}`).join('');
  const html = docHTML({ kind: 'ESTIMADO', number: e.number, date: 'Fecha: ' + fDate(e.createdAt), extraMeta: `<br>Válido hasta: ${fDate(parseLocal(e.validUntil))}`, customerId: e.customerId, items: [], notes: e.notes, bodyHTML: `<h2 style="margin:0">${esc(e.title)}</h2>${blocks}` });
  modal({ title: 'Vista del cliente', wide: true, body: html + `<div style="margin-top:20px;display:flex;gap:40px;flex-wrap:wrap"><div style="flex:1;min-width:200px;border-top:1px solid #cbd5e1;padding-top:6px;font-size:12px;color:#64748b">Firma del cliente</div><div style="width:160px;border-top:1px solid #cbd5e1;padding-top:6px;font-size:12px;color:#64748b">Fecha</div></div>`, foot: `<button class="btn" data-dismiss>Cerrar</button><button class="btn" onclick="navigator.clipboard&&navigator.clipboard.writeText(location.href);">Copiar enlace</button><button class="btn primary" onclick="window.print()">⎙ Imprimir / PDF</button>` });
}

/* ───────────── TRABAJOS ───────────── */
function jobModal(j, preset = {}) {
  const isNew = !j; j = j || {};
  const st = j.start ? new Date(j.start) : null;
  form({
    title: isNew ? 'Nuevo trabajo' : 'Editar trabajo ' + j.number,
    fields: [
      { k: 'customerId', label: 'Cliente', type: 'select', options: custOptions(), value: j.customerId || preset.customerId },
      { k: 'division', label: 'División', type: 'select', options: divOptions(), value: j.division || preset.division || (state.div !== 'all' ? state.div : 'hvac') },
      { k: 'title', label: 'Descripción del trabajo', full: true, required: true, value: j.title || preset.title, ph: 'Ej. Mantenimiento AC' },
      { k: 'date', label: 'Fecha', type: 'date', value: st ? ymd(st) : (preset.date || '') }, { k: 'time', label: 'Hora', type: 'time', value: st ? hm(st) : '08:00' },
      { k: 'duration', label: 'Duración (horas)', type: 'number', step: '0.5', value: j.duration ?? 2 },
      { k: 'tech1', label: 'Técnico principal', type: 'select', options: techOptions(), value: (j.techIds || [])[0] || '' },
      { k: 'tech2', label: 'Técnico adicional', type: 'select', options: techOptions(), value: (j.techIds || [])[1] || '' },
      { k: 'notes', label: 'Instrucciones / notas', type: 'textarea', full: true, value: j.notes },
    ],
    onSave(v) {
      const techIds = [v.tech1, v.tech2].filter((x, i, a) => x && a.indexOf(x) === i);
      const start = v.date ? iso(parseLocal(v.date, v.time)) : null;
      const data = { customerId: v.customerId, division: v.division, title: v.title, duration: v.duration, techIds, start, notes: v.notes };
      if (isNew) {
        const nj = { id: uid(), number: nextNum('job'), ...data, status: start ? 'scheduled' : 'unscheduled', items: preset.items || [], checklist: CHECKLISTS[v.division].map(t => ({ id: uid(), t, done: false })), photos: [], estimateId: preset.estimateId || null, createdAt: iso(new Date()) };
        db.jobs.unshift(nj); log(`Trabajo ${nj.number} creado: ${nj.title}`); toast('Trabajo creado'); setTimeout(() => location.hash = '#/job/' + nj.id);
      } else { Object.assign(j, data); if (!start) j.status = 'unscheduled'; else if (j.status === 'unscheduled') j.status = 'scheduled'; }
    },
  });
}
ROUTES.jobs = () => {
  const f = state.filters.job || 'open';
  const all = db.jobs.filter(divOK);
  const list = all.filter(j => f === 'all' ? true : f === 'open' ? !['completed', 'cancelled'].includes(j.status) : j.status === f).sort((a, b) => (a.start ? new Date(a.start) : 9e15) - (b.start ? new Date(b.start) : 9e15));
  return head('Trabajos', `${all.filter(j => !['completed', 'cancelled'].includes(j.status)).length} trabajos abiertos`, `<button class="btn" data-act="exportCsv" data-what="jobs">⇩ CSV</button><button class="btn primary" data-act="newJob">＋ Trabajo</button>`) + `
  <div class="card"><div class="toolbar">${[['open', 'Abiertos'], ['all', 'Todos'], ...Object.entries(JOB_ST).map(([k, v]) => [k, v[0]])].map(([k, v]) => `<button class="btn sm ${f === k ? 'primary' : ''}" data-act="filt" data-f="job" data-v="${k}">${v} <span class="muted">${k === 'all' ? all.length : k === 'open' ? all.filter(j => !['completed', 'cancelled'].includes(j.status)).length : all.filter(j => j.status === k).length}</span></button>`).join('')}</div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Trabajo</th><th>Cliente</th><th>Programado</th><th>Equipo</th><th>Progreso</th><th class="right">Monto</th><th>Estado</th></tr></thead><tbody>
  ${list.map(j => { const done = j.checklist.filter(c => c.done).length; return `<tr class="click" data-go="#/job/${j.id}"><td class="b">${j.number}</td><td><div class="b">${esc(j.title)}</div>${divPill(j.division)}</td><td>${custLink(j.customerId)}<div class="small muted">${esc(cust(j.customerId).city || '')}</div></td><td>${j.start ? fDay(j.start) + '<div class="small muted">' + fTime(j.start) + ' · ' + j.duration + 'h</div>' : '<span class="muted">—</span>'}</td><td><div class="row">${j.techIds.map(t => avatar(tech(t))).join('') || '<span class="muted small">Sin asignar</span>'}</div></td><td style="min-width:110px"><div class="progress"><div style="width:${j.checklist.length ? done / j.checklist.length * 100 : 0}%"></div></div><div class="small muted">${done}/${j.checklist.length}</div></td><td class="right">${money(totalOf(j.items))}</td><td>${pill(JOB_ST, j.status)}</td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">Sin trabajos</td></tr>'}
  </tbody></table></div></div>`;
};
ROUTES.job = id => {
  const j = db.jobs.find(x => x.id === id); if (!j) return '<div class="empty">Trabajo no encontrado</div>';
  const c = cust(j.customerId), idx = JOB_FLOW.indexOf(j.status), next = JOB_FLOW[idx + 1];
  const nextLabel = { scheduled: 'Programar', enroute: '🚚 En camino', inprogress: '▶ Iniciar trabajo', completed: '✓ Completar' }[next];
  const inv = j.invoiceId && db.invoices.find(i => i.id === j.invoiceId);
  const permits = db.permits.filter(p => p.jobId === j.id);
  const done = j.checklist.filter(x => x.done).length;
  return `<div class="small muted mb"><a href="#/jobs">Trabajos</a> / ${j.number}</div>` + head(`${j.number} · ${esc(j.title)}`, `${custLink(j.customerId)} · ${divPill(j.division)} · ${j.start ? fDay(j.start) + ' ' + fTime(j.start) + '–' + fTime(jobEnd(j)) : 'Sin programar'}`,
    `${pill(JOB_ST, j.status)}<button class="btn" data-act="editJob" data-id="${j.id}">Editar</button>${next && j.status !== 'cancelled' ? (next === 'scheduled' ? `<button class="btn primary" data-act="editJob" data-id="${j.id}">Programar</button>` : `<button class="btn primary" data-act="jobStatus" data-id="${j.id}" data-s="${next}">${nextLabel}</button>`) : ''}${inv ? `<a class="btn" href="#/invoice/${inv.id}">Factura ${inv.number}</a>` : `<button class="btn ok" data-act="invoiceJob" data-id="${j.id}">$ Facturar</button>`}`) + `
  <div class="card mb"><div class="card-b"><div class="steps">${JOB_FLOW.map((s, i) => `<div class="${i <= idx ? 'on' : ''}">${JOB_ST[s][0]}</div>`).join('')}</div></div></div>
  <div class="grid g-2-1">
    <div>
      <div class="card"><div class="card-h"><h3>Conceptos del trabajo</h3>${j.estimateId ? `<a class="small" href="#/estimate/${j.estimateId}">Desde estimado →</a>` : ''}</div><div class="card-b">${itemsTable(j.items, !inv, `job:${j.id}`)}</div></div>
      <div class="card mt"><div class="card-h"><h3>Checklist ${DIV[j.division].name} (${done}/${j.checklist.length})</h3><button class="btn sm" data-act="addCheck" data-id="${j.id}">＋ Tarea</button></div><div class="card-b"><div class="progress mb"><div style="width:${j.checklist.length ? done / j.checklist.length * 100 : 0}%"></div></div>${j.checklist.map(x => `<label class="check"><input type="checkbox" data-act-input="check" data-id="${j.id}" data-c="${x.id}" ${x.done ? 'checked' : ''}><span style="${x.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(x.t)}</span></label>`).join('')}</div></div>
      <div class="card mt"><div class="card-h"><h3>Fotos (${j.photos.length})</h3><label class="btn sm">＋ Subir fotos<input type="file" accept="image/*" multiple hidden data-act-input="photos" data-id="${j.id}"></label></div><div class="card-b"><div class="row">${j.photos.map((p, i) => `<div style="position:relative"><img src="${p}" alt="Foto ${i + 1}" style="width:120px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><button class="btn sm" style="position:absolute;top:4px;right:4px;padding:1px 6px" data-act="delPhoto" data-id="${j.id}" data-i="${i}">✕</button></div>`).join('') || '<span class="muted small">Sube fotos de antes/después, daños, equipos y placas de datos.</span>'}</div></div></div>
    </div>
    <div>
      <div class="card"><div class="card-h"><h3>Cliente y ubicación</h3></div><div class="card-b"><div class="b">${esc(c.name)}</div><div class="small muted">${esc(c.address)}, ${esc(c.city)} ${esc(c.zip)}</div><div class="row mt"><a class="btn sm" href="tel:${esc(c.phone)}">✆ Llamar</a><a class="btn sm" href="sms:${esc(c.phone)}?body=${encodeURIComponent(`Hola ${c.name}, su técnico de ${db.settings.company} va en camino.`)}">✉ "En camino"</a><a class="btn sm" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.address + ', ' + c.city)}">⌖ Navegar</a></div></div></div>
      <div class="card mt"><div class="card-h"><h3>Equipo asignado</h3></div><div class="card-b">${j.techIds.map(t => { const x = tech(t); return x ? `<div class="list-item">${avatar(x)}<div><div class="b">${esc(x.name)}</div><div class="small muted">${esc(x.role)}</div></div></div>` : ''; }).join('') || '<span class="muted">Sin asignar</span>'}</div></div>
      ${j.division !== 'hvac' || permits.length ? `<div class="card mt"><div class="card-h"><h3>Permisos</h3><button class="btn sm" data-act="newPermit" data-job="${j.id}">＋</button></div><div class="card-b">${permits.map(p => `<div class="list-item"><div style="flex:1"><div class="b">${esc(p.type)}</div><div class="small muted">${esc(p.jurisdiction)} ${p.number ? '· ' + esc(p.number) : ''}</div></div>${pill(PERMIT_ST, p.status)}</div>`).join('') || '<span class="muted small">Sin permisos registrados.</span>'}</div></div>` : ''}
      <div class="card mt"><div class="card-h"><h3>Notas</h3></div><div class="card-b"><textarea class="inp" style="min-height:110px" data-act-input="jobNotes" data-id="${j.id}" placeholder="Notas internas, códigos de acceso, mascotas…">${esc(j.notes)}</textarea></div></div>
      <div class="row mt"><button class="btn sm danger" data-act="cancelJob" data-id="${j.id}">${j.status === 'cancelled' ? 'Reactivar' : 'Cancelar trabajo'}</button><button class="btn sm danger" data-act="delJob" data-id="${j.id}">Eliminar</button></div>
    </div>
  </div>`;
};
function compressImage(file) {
  return new Promise(res => { const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { const s = Math.min(1, 900 / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = img.width * s; cv.height = img.height * s; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', 0.7)); }; img.onerror = () => res(null); img.src = r.result; }; r.readAsDataURL(file); });
}

/* ───────────── FACTURAS ───────────── */
function createInvoice({ customerId, jobId, division, items, note }) {
  const inv = { id: uid(), number: nextNum('inv'), customerId, jobId: jobId || null, division: division || 'hvac', items: items || [], status: 'draft', createdAt: iso(new Date()), due: ymd(addDays(new Date(), 15)), payments: [], notes: note || '' };
  db.invoices.unshift(inv); log(`Factura ${inv.number} creada para ${cust(customerId).name}`); return inv;
}
ROUTES.invoices = () => {
  const f = state.filters.inv || 'all';
  const all = db.invoices.filter(divOK);
  const list = all.filter(i => f === 'all' || invStatus(i) === f).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const open = all.filter(i => ['sent', 'partial', 'overdue'].includes(invStatus(i)));
  const aging = [0, 0, 0, 0]; open.forEach(i => { const d = (Date.now() - parseLocal(i.due)) / DAY; aging[d <= 30 ? 0 : d <= 60 ? 1 : d <= 90 ? 2 : 3] += invBal(i); });
  const m30 = allPayments().filter(divOK).filter(p => (Date.now() - new Date(p.date)) / DAY <= 30).reduce((s, p) => s + num(p.amount), 0);
  return head('Facturas y pagos', 'Factura, cobra y da seguimiento a tus cuentas por cobrar', `<button class="btn" data-act="exportCsv" data-what="invoices">⇩ CSV</button><button class="btn primary" data-act="newInvoice">＋ Factura</button>`) + `
  <div class="grid g4 mb">${kpi('Por cobrar', money(open.reduce((s, i) => s + invBal(i), 0)), open.length + ' facturas abiertas')}${kpi('Vencidas', money(all.filter(i => invStatus(i) === 'overdue').reduce((s, i) => s + invBal(i), 0)), all.filter(i => invStatus(i) === 'overdue').length + ' facturas')}${kpi('Cobrado (30 días)', money(m30))}${kpi('Antigüedad', `<span style="font-size:13px;font-weight:600">0-30: ${kmoney(aging[0])} · 31-60: ${kmoney(aging[1])}<br>61-90: ${kmoney(aging[2])} · 90+: ${kmoney(aging[3])}</span>`)}</div>
  <div class="card"><div class="toolbar">${[['all', 'Todas'], ...Object.entries(INV_ST).map(([k, v]) => [k, v[0]])].map(([k, v]) => `<button class="btn sm ${f === k ? 'primary' : ''}" data-act="filt" data-f="inv" data-v="${k}">${v}</button>`).join('')}</div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Cliente</th><th>División</th><th>Emitida</th><th>Vence</th><th class="right">Total</th><th class="right">Saldo</th><th>Estado</th></tr></thead><tbody>
  ${list.map(i => `<tr class="click" data-go="#/invoice/${i.id}"><td class="b">${i.number}</td><td>${custLink(i.customerId)}</td><td>${divPill(i.division)}</td><td>${fDate(i.createdAt)}</td><td>${fDate(parseLocal(i.due))}</td><td class="right">${money2(invTotal(i))}</td><td class="right b">${invBal(i) ? money2(invBal(i)) : '—'}</td><td>${pill(INV_ST, invStatus(i))}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">Sin facturas</td></tr>'}
  </tbody></table></div></div>`;
};
ROUTES.invoice = id => {
  const i = db.invoices.find(x => x.id === id); if (!i) return '<div class="empty">Factura no encontrada</div>';
  const st = invStatus(i), editable = !i.payments.length && st !== 'void';
  return `<div class="small muted mb"><a href="#/invoices">Facturas</a> / ${i.number}</div>` + head(`Factura ${i.number}`, `${custLink(i.customerId)} · ${divPill(i.division)} · Emitida ${fDate(i.createdAt)} · Vence ${fDate(parseLocal(i.due))}`,
    `${pill(INV_ST, st)}<button class="btn" data-act="previewInv" data-id="${i.id}">⎙ Vista / PDF</button>${st === 'draft' ? `<button class="btn primary" data-act="sendInv" data-id="${i.id}">Enviar factura</button>` : ''}${!['paid', 'void'].includes(st) ? `<button class="btn ok" data-act="payInv" data-id="${i.id}">$ Registrar pago</button>` : ''}${st === 'overdue' ? `<button class="btn" data-act="remindInv" data-id="${i.id}">✉ Recordatorio</button>` : ''}`) + `
  <div class="grid g-2-1">
    <div class="card"><div class="card-h"><h3>Conceptos</h3>${i.jobId ? `<a class="small" href="#/job/${i.jobId}">Trabajo →</a>` : ''}</div><div class="card-b">${itemsTable(i.items, editable, `inv:${i.id}`)}</div></div>
    <div>
      <div class="card"><div class="card-b"><div class="calc-out"><div><div class="l">Total</div><div class="v">${money2(invTotal(i))}</div></div><div><div class="l">Saldo</div><div class="v ${invBal(i) ? 'down' : 'up'}">${money2(invBal(i))}</div></div></div>
      <label class="f mt">Fecha de vencimiento<input type="date" class="inp" data-act-input="invDue" data-id="${i.id}" value="${i.due}"></label></div></div>
      <div class="card mt"><div class="card-h"><h3>Pagos (${i.payments.length})</h3></div><div class="card-b">${i.payments.map(p => `<div class="list-item"><div style="flex:1"><div class="b">${money2(p.amount)}</div><div class="small muted">${fDate(p.date)} · ${esc(p.method)}${p.ref ? ' · ' + esc(p.ref) : ''}</div></div><button class="btn ghost sm danger" data-act="delPay" data-id="${i.id}" data-p="${p.id}">✕</button></div>`).join('') || '<span class="muted small">Sin pagos registrados.</span>'}</div></div>
      <div class="row mt">${st !== 'void' ? `<button class="btn sm danger" data-act="voidInv" data-id="${i.id}">Anular factura</button>` : ''}</div>
    </div>
  </div>`;
};
function payModal(i) {
  form({ title: `Registrar pago — ${i.number}`, fields: [{ k: 'amount', label: 'Monto ($)', type: 'number', step: '0.01', value: invBal(i).toFixed(2), required: true }, { k: 'method', label: 'Método', type: 'select', options: PAY_METHODS, value: 'Tarjeta' }, { k: 'date', label: 'Fecha', type: 'date', value: ymd(new Date()) }, { k: 'ref', label: 'Referencia / # cheque', value: '' }], saveLabel: 'Registrar pago',
    onSave(v) { if (v.amount <= 0) { toast('Monto inválido'); return false; } i.payments.push({ id: uid(), amount: v.amount, method: v.method, date: iso(parseLocal(v.date, '12:00')), ref: v.ref }); if (i.status === 'draft') i.status = 'sent'; log(`Pago de ${money2(v.amount)} recibido de ${cust(i.customerId).name} (${i.number})`); toast('Pago registrado ✓'); } });
}

/* ───────────── MEMBRESÍAS ───────────── */
ROUTES.plans = () => {
  const list = db.plans.filter(divOK);
  const active = list.filter(p => p.status === 'active');
  const mrr = active.reduce((s, p) => s + (p.interval === 'month' ? p.price : p.price / 12), 0);
  const due = active.filter(p => parseLocal(p.nextVisit) <= addDays(new Date(), 14));
  return head('Membresías y mantenimiento', 'Ingreso recurrente con planes de mantenimiento HVAC, Solar Care y Roof Shield', `<button class="btn primary" data-act="newPlan">＋ Membresía</button>`) + `
  <div class="grid g4 mb">${kpi('Miembros activos', active.length)}${kpi('Ingreso recurrente mensual', money(mrr))}${kpi('Ingreso anual proyectado', money(mrr * 12))}${kpi('Visitas próximas (14 días)', due.length)}</div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Plan</th><th>División</th><th>Precio</th><th>Desde</th><th>Próxima visita</th><th>Estado</th><th></th></tr></thead><tbody>
  ${list.map(p => { const late = parseLocal(p.nextVisit) < sod(new Date()); return `<tr><td>${custLink(p.customerId)}</td><td class="b">${esc(p.name)}<div class="small muted">${p.visitsPerYear} visitas/año</div></td><td>${divPill(p.division)}</td><td>${money(p.price)}/${p.interval === 'month' ? 'mes' : 'año'}</td><td>${fDate(parseLocal(p.startDate))}</td><td class="${late && p.status === 'active' ? 'down b' : ''}">${fDate(parseLocal(p.nextVisit))}</td><td>${p.status === 'active' ? '<span class="pill ok">Activa</span>' : '<span class="pill">Cancelada</span>'}</td><td class="right"><div class="row" style="justify-content:flex-end">${p.status === 'active' ? `<button class="btn sm primary" data-act="planVisit" data-id="${p.id}">Agendar visita</button>` : ''}<button class="btn sm" data-act="togglePlan" data-id="${p.id}">${p.status === 'active' ? 'Cancelar' : 'Reactivar'}</button></div></td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">Sin membresías</td></tr>'}
  </tbody></table></div></div>`;
};

/* ───────────── PERMISOS ───────────── */
ROUTES.permits = () => {
  const list = db.permits.filter(p => { const j = db.jobs.find(x => x.id === p.jobId); return !j || divOK(j); });
  return head('Permisos e inspecciones', 'Construcción, eléctrico, techado, interconexión con la utility y PTO', `<button class="btn primary" data-act="newPermit">＋ Permiso</button>`) + `
  <div class="grid g4 mb">${Object.entries(PERMIT_ST).slice(0, 4).map(([k, v]) => kpi(v[0], list.filter(p => p.status === k).length)).join('')}</div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Trabajo</th><th>Jurisdicción</th><th># Permiso</th><th>Enviado</th><th>Días</th><th>Estado</th><th></th></tr></thead><tbody>
  ${list.map(p => { const j = db.jobs.find(x => x.id === p.jobId); const days = p.submitted ? Math.floor((Date.now() - parseLocal(p.submitted)) / DAY) : '—'; return `<tr><td class="b">${esc(p.type)}</td><td>${j ? `<a href="#/job/${j.id}">${j.number}</a> · ${esc(cust(j.customerId).name)}` : '—'}</td><td>${esc(p.jurisdiction)}</td><td>${esc(p.number || '—')}</td><td>${p.submitted ? fDate(parseLocal(p.submitted)) : '—'}</td><td>${days}</td><td><select class="inp" style="padding:5px 8px;width:auto" data-act-input="permitSt" data-id="${p.id}">${Object.entries(PERMIT_ST).map(([k, v]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></td><td class="right"><button class="btn sm" data-act="editPermit" data-id="${p.id}">Editar</button></td></tr>${p.notes ? `<tr><td></td><td colspan="7" class="small muted" style="padding-top:0">↳ ${esc(p.notes)}</td></tr>` : ''}`; }).join('') || '<tr><td colspan="8" class="empty">Sin permisos</td></tr>'}
  </tbody></table></div></div>`;
};
function permitModal(p, jobId) {
  const isNew = !p; p = p || { status: 'todo', jobId };
  form({ title: isNew ? 'Nuevo permiso' : 'Editar permiso', fields: [
    { k: 'jobId', label: 'Trabajo', type: 'select', options: db.jobs.map(j => [j.id, `${j.number} · ${j.title} (${cust(j.customerId).name})`]), value: p.jobId, full: true },
    { k: 'type', label: 'Tipo', type: 'select', options: PERMIT_TYPES, value: p.type }, { k: 'jurisdiction', label: 'Jurisdicción / utility', value: p.jurisdiction, required: true },
    { k: 'number', label: '# de permiso', value: p.number }, { k: 'status', label: 'Estado', type: 'select', options: Object.entries(PERMIT_ST).map(([k, v]) => [k, v[0]]), value: p.status },
    { k: 'submitted', label: 'Fecha de envío', type: 'date', value: p.submitted }, { k: 'notes', label: 'Notas', type: 'textarea', full: true, value: p.notes },
  ], extraFoot: isNew ? '' : '<button class="btn danger" id="pmDel" style="margin-right:auto">Eliminar</button>',
  onSave(v) { v.updated = ymd(new Date()); if (isNew) { db.permits.unshift({ id: uid(), ...v }); log(`Permiso ${v.type} agregado`); } else Object.assign(p, v); } });
  if (!isNew) $('#pmDel').onclick = () => { $('.modal-bg:last-child').remove(); confirmDlg('¿Eliminar este permiso?', () => { db.permits = db.permits.filter(x => x.id !== p.id); }); };
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
    body = calcCard('Dimensionamiento solar', [
      ['solar.kwh', 'Consumo mensual (kWh)', s.kwh], ['solar.rate', 'Tarifa eléctrica ($/kWh)', s.rate, '0.01'], ['solar.sun', 'Horas sol pico / día', s.sun, '0.1'], ['solar.offset', 'Compensación deseada (%)', s.offset],
      ['solar.watts', 'Potencia del panel (W)', s.watts], ['solar.ppw', 'Precio por watt ($/W)', s.ppw, '0.05'], ['solar.esc', 'Aumento anual de tarifa (%)', s.esc, '0.5'], ['solar.incentive', 'Incentivos / reembolsos (%)', s.incentive], ['solar.battery', 'Baterías 13.5 kWh (cant.)', s.battery],
    ], [['Tamaño del sistema', sysKw.toFixed(2) + ' kW'], ['Paneles', panels + ' × ' + s.watts + 'W'], ['Producción anual', Math.round(prod).toLocaleString() + ' kWh'], ['Precio bruto', money(gross)], ['Costo neto', money(net)], ['Ahorro año 1', money(y1)], ['Ahorro 25 años', money(sav)], ['Retorno de inversión', payback ? payback + ' años' : '> 25 años']],
    'El crédito federal residencial (25D) terminó para sistemas instalados después del 31/12/2025. Usa "Incentivos" para programas estatales, de la utility o el crédito comercial (48E) si aplica.', `data-act="calcEst" data-k="solar" data-panels="${panels}" data-bat="${s.battery}"`);
  }
  if (tab === 'roof') {
    const r = t.roof, factor = Math.sqrt(1 + Math.pow(r.pitch / 12, 2)), surface = r.area * factor, sq = surface / 100 * (1 + r.waste / 100), sqR = Math.ceil(sq * 3) / 3;
    const mats = [['Teja asfáltica arquitectónica', 0], ['Metal standing seam', 1]], matPb = db.pricebook.filter(p => p.division === 'roofing');
    const unitP = matPb[r.material ? 1 : 0]?.price || 520, tear = r.tearoff ? (matPb[2]?.price || 95) * Math.ceil(surface / 100) * r.layers : 0;
    const total = unitP * sqR + tear + Math.ceil(surface / 100 / 10) * (matPb[4]?.price || 140);
    body = calcCard('Medición de techo', [
      ['roof.area', 'Área de huella (ft²)', r.area], ['roof.pitch', 'Pendiente (x/12)', r.pitch, '1'], ['roof.waste', 'Desperdicio (%)', r.waste], ['roof.material', 'Material (0 = asfalto, 1 = metal)', r.material, '1'], ['roof.tearoff', 'Remoción (1 = sí, 0 = no)', r.tearoff, '1'], ['roof.layers', 'Capas a remover', r.layers, '1'],
    ], [['Factor de pendiente', factor.toFixed(3)], ['Superficie real', Math.round(surface).toLocaleString() + ' ft²'], ['Squares (con desperdicio)', sqR.toFixed(1)], ['Bultos de teja', r.material ? 'N/A' : Math.ceil(sqR * 3)], ['Rollos de underlayment', Math.ceil(surface / 1000)], ['Material', mats[r.material ? 1 : 0][0]], ['Precio estimado', money(total)], ['Precio por square', money(total / Math.max(sqR, 1))]],
    'Pendientes ≥ 8/12 o techos de 2 pisos suelen requerir cargo adicional por seguridad. Verifica medidas con dron o reporte aéreo.', `data-act="calcEst" data-k="roof" data-sq="${sqR.toFixed(1)}" data-tear="${r.tearoff ? Math.ceil(surface / 100) * r.layers : 0}" data-mat="${r.material ? 1 : 0}" data-ice="${Math.ceil(surface / 100 / 10)}"`);
  }
  if (tab === 'hvac') {
    const h = t.hvac, mult = [1.15, 1, 0.9][h.insul] ?? 1, btu = h.sqft * h.zone * (h.ceiling / 8) * mult + Math.max(0, h.people - 2) * 600, tons = Math.max(1.5, Math.round(btu / 12000 * 2) / 2);
    body = calcCard('Carga térmica aproximada', [
      ['hvac.sqft', 'Área acondicionada (ft²)', h.sqft], ['hvac.zone', 'BTU por ft² (clima: 20 frío – 35 muy cálido)', h.zone], ['hvac.ceiling', 'Altura de techo (ft)', h.ceiling], ['hvac.insul', 'Aislamiento (0 malo, 1 normal, 2 bueno)', h.insul, '1'], ['hvac.people', 'Ocupantes', h.people],
    ], [['Carga estimada', Math.round(btu).toLocaleString() + ' BTU/h'], ['Tamaño recomendado', tons + ' toneladas'], ['Bueno', `${tons} ton · 14.3 SEER2`], ['Mejor', `${tons} ton · 16 SEER2 bomba de calor`], ['Óptimo', `${tons} ton · 18+ SEER2 inverter`], ['CFM aprox.', Math.round(tons * 400) + ' CFM']],
    'Estimación rápida para ventas. Para diseño final realiza un cálculo Manual J completo.', `data-act="calcEst" data-k="hvac" data-tons="${tons}"`);
  }
  return head('Calculadoras', 'Herramientas de campo para cotizar más rápido — convierte el resultado en un estimado con un clic') + `<div class="tabs">${[['solar', '☀ Solar'], ['roof', '⌂ Roofing'], ['hvac', '❄ HVAC']].map(([k, v]) => `<button data-act="tab" data-t="tools" data-v="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>${body}`;
};
function calcCard(title, inputs, outputs, note, estAttrs) {
  return `<div class="grid g2"><div class="card"><div class="card-h"><h3>${title}</h3></div><div class="card-b form">${inputs.map(([k, l, v, step]) => `<label class="f">${l}<input type="number" step="${step || 'any'}" value="${v}" data-act-input="calc" data-k="${k}"></label>`).join('')}</div></div>
  <div class="card"><div class="card-h"><h3>Resultado</h3></div><div class="card-b"><div class="calc-out">${outputs.map(([l, v]) => `<div><div class="l">${l}</div><div class="v">${v}</div></div>`).join('')}</div><p class="small muted">${note}</p><button class="btn primary" ${estAttrs}>→ Crear estimado con este resultado</button></div></div></div>`;
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
  return head('Reportes', 'Rendimiento por división, técnico y fuente de leads', `<select class="inp" style="width:auto" data-act-input="range">${[[30, 'Últimos 30 días'], [90, 'Últimos 90 días'], [180, 'Últimos 6 meses'], [365, 'Último año']].map(([v, l]) => `<option value="${v}" ${+range === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`) + `
  <div class="grid g4 mb">${kpi('Cobrado', money(pays.reduce((s, p) => s + num(p.amount), 0)))}${kpi('Facturado', money(byDiv.reduce((s, d) => s + d.billed, 0)))}${kpi('Estimados creados', ests.length, pct(ests.filter(e => e.status === 'approved').length / Math.max(1, ests.length)) + ' aprobados')}${kpi('Ticket promedio', money(byDiv.reduce((s, d) => s + d.billed, 0) / Math.max(1, byDiv.reduce((s, d) => s + d.count, 0))))}</div>
  <div class="grid g2">
    <div class="card"><div class="card-h"><h3>Por división</h3></div><div class="card-b">${byDiv.map(d => `<div class="mb"><div class="row" style="justify-content:space-between"><span>${divPill(d.k)}</span><span class="small muted">${d.count} facturas · ticket ${money(d.avg)} · margen ${pct(d.margin)}</span></div><div class="progress mt" style="height:12px"><div style="width:${d.billed / maxB * 100}%;background:${DIV[d.k].color}"></div></div><div class="row small mt" style="justify-content:space-between"><span>Facturado <b>${money(d.billed)}</b></span><span>Cobrado <b>${money(d.collected)}</b></span></div></div>`).join('')}</div></div>
    <div class="card"><div class="card-h"><h3>Rendimiento de técnicos</h3></div><div class="table-wrap"><table><thead><tr><th>Técnico</th><th class="right">Trabajos</th><th class="right">Horas</th><th class="right">Ingreso</th></tr></thead><tbody>${techRows.map(r => `<tr><td><div class="row">${avatar(r.t)} ${esc(r.t.name)}</div></td><td class="right">${r.n}</td><td class="right">${r.hrs}</td><td class="right b">${money(r.rev)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>ROI de fuentes de leads</h3></div><div class="table-wrap"><table><thead><tr><th>Fuente</th><th class="right">Leads</th><th class="right">Ganados</th><th class="right">Conversión</th><th class="right">Valor ganado</th></tr></thead><tbody>${srcRows.map(r => `<tr><td>${esc(r.s)}</td><td class="right">${r.n}</td><td class="right">${r.won}</td><td class="right">${pct(r.won / r.n)}</td><td class="right b">${money(r.val)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>Embudo de estimados</h3></div><div class="card-b">${Object.entries(EST_ST).map(([k, v]) => { const n = ests.filter(e => e.status === k).length; return `<div class="mb"><div class="row" style="justify-content:space-between"><span>${v[0]}</span><b>${n} · ${money(ests.filter(e => e.status === k).reduce((s, e) => s + (k === 'approved' ? estTotal(e) : estMax(e)), 0))}</b></div><div class="progress"><div style="width:${n / Math.max(1, ests.length) * 100}%"></div></div></div>`; }).join('')}</div></div>
  </div>`;
};

/* ───────────── LISTA DE PRECIOS ───────────── */
ROUTES.pricebook = () => {
  const list = db.pricebook.filter(divOK);
  return head('Lista de precios', 'Servicios y materiales estándar con costo y margen', `<button class="btn primary" data-act="newPb">＋ Concepto</button>`) + `
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Concepto</th><th>División</th><th>Unidad</th><th class="right">Costo</th><th class="right">Precio</th><th class="right">Margen</th><th></th></tr></thead><tbody>
  ${list.map(p => `<tr class="click" data-act="editPb" data-id="${p.id}"><td class="b">${esc(p.name)}</td><td>${divPill(p.division)}</td><td>${esc(p.unit)}</td><td class="right">${money2(p.cost)}</td><td class="right b">${money2(p.price)}</td><td class="right ${p.price && (p.price - p.cost) / p.price < 0.3 ? 'down' : 'up'}">${p.price ? pct((p.price - p.cost) / p.price) : '—'}</td><td class="right muted">Editar</td></tr>`).join('')}
  </tbody></table></div></div>`;
};
function pbModal(p) {
  const isNew = !p; p = p || { division: state.div !== 'all' ? state.div : 'hvac', unit: 'unidad', price: 0, cost: 0 };
  form({ title: isNew ? 'Nuevo concepto' : 'Editar concepto', fields: [{ k: 'name', label: 'Nombre', value: p.name, required: true, full: true }, { k: 'division', label: 'División', type: 'select', options: divOptions(), value: p.division }, { k: 'unit', label: 'Unidad', value: p.unit }, { k: 'cost', label: 'Costo ($)', type: 'number', step: '0.01', value: p.cost }, { k: 'price', label: 'Precio ($)', type: 'number', step: '0.01', value: p.price }],
    extraFoot: isNew ? '' : '<button class="btn danger" id="pbDel" style="margin-right:auto">Eliminar</button>',
    onSave(v) { if (isNew) db.pricebook.unshift({ id: uid(), ...v }); else Object.assign(p, v); } });
  if (!isNew) $('#pbDel').onclick = () => { $('.modal-bg:last-child').remove(); confirmDlg('¿Eliminar este concepto?', () => { db.pricebook = db.pricebook.filter(x => x.id !== p.id); }); };
}

/* ───────────── EQUIPO ───────────── */
ROUTES.team = () => {
  const ws = weekStart(new Date());
  return head('Equipo', 'Técnicos, roles y carga de trabajo de esta semana', `<button class="btn primary" data-act="newTech">＋ Técnico</button>`) + `<div class="grid g3">${db.techs.filter(t => state.div === 'all' || t.division === state.div).map(t => {
    const wk = db.jobs.filter(j => j.techIds.includes(t.id) && j.start && new Date(j.start) >= ws && new Date(j.start) < addDays(ws, 7)), hrs = wk.reduce((s, j) => s + num(j.duration), 0);
    const today = db.jobs.filter(j => j.techIds.includes(t.id) && j.start && sameDay(j.start, new Date()));
    const cur = today.find(j => ['enroute', 'inprogress'].includes(j.status));
    return `<div class="card"><div class="card-b"><div class="row">${avatar(t).replace('width:28px', '')}<div style="flex:1"><div class="b">${esc(t.name)}</div><div class="small muted">${esc(t.role)}</div></div>${divPill(t.division)}</div>
    <div class="mt small">${cur ? `<span class="pill brand">${JOB_ST[cur.status][0]}</span> ${esc(cur.title)}` : today.length ? `<span class="pill info">${today.length} trabajos hoy</span>` : '<span class="pill">Disponible</span>'}</div>
    <div class="mt"><div class="row small" style="justify-content:space-between"><span>Utilización semanal</span><b>${hrs}h / 40h</b></div><div class="progress"><div style="width:${Math.min(100, hrs / 40 * 100)}%;background:${hrs > 40 ? 'var(--bad)' : t.color}"></div></div></div>
    <div class="row mt"><a class="btn sm" href="tel:${esc(t.phone)}">✆ ${esc(t.phone)}</a><button class="btn sm" data-act="editTech" data-id="${t.id}">Editar</button></div></div></div>`;
  }).join('')}</div>`;
};
function techModal(t) {
  const isNew = !t; t = t || { color: '#6366f1', division: 'hvac' };
  form({ title: isNew ? 'Nuevo técnico' : 'Editar técnico', fields: [{ k: 'name', label: 'Nombre', value: t.name, required: true }, { k: 'role', label: 'Rol', value: t.role }, { k: 'division', label: 'División', type: 'select', options: divOptions(), value: t.division }, { k: 'phone', label: 'Teléfono', value: t.phone }, { k: 'color', label: 'Color en agenda', type: 'color', value: t.color }],
    extraFoot: isNew ? '' : '<button class="btn danger" id="tDel" style="margin-right:auto">Eliminar</button>',
    onSave(v) { if (isNew) db.techs.push({ id: uid(), ...v }); else Object.assign(t, v); } });
  if (!isNew) $('#tDel').onclick = () => { $('.modal-bg:last-child').remove(); confirmDlg('¿Eliminar este técnico? Sus trabajos quedarán sin asignar.', () => { db.techs = db.techs.filter(x => x.id !== t.id); db.jobs.forEach(j => j.techIds = j.techIds.filter(x => x !== t.id)); }); };
}

/* ───────────── CONFIGURACIÓN ───────────── */
const canAdmin = () => !cloud.on || ['owner', 'admin'].includes(cloud.role);
ROUTES['settings:after'] = async () => {
  const box = $('#acl'); if (!box) return;
  const [{ data: mem, error: e1 }, inv] = await Promise.all([cloud.sb.from('opsboss_members').select('*').order('created_at'), canAdmin() ? cloud.sb.from('opsboss_invites').select('*').order('created_at') : Promise.resolve({ data: [] })]);
  if (!$('#acl')) return;
  if (e1) { box.innerHTML = `<div class="auth-msg bad">${esc(e1.message)}</div>`; return; }
  const roles = Object.entries(ROLE_LABEL).filter(([k]) => k !== 'owner' || cloud.role === 'owner');
  box.innerHTML = `${mem.map(m => `<div class="list-item"><span class="avatar" style="background:#6366f1">${initials(m.name || m.email)}</span><div style="flex:1;min-width:0"><div class="b">${esc(m.name || '')}</div><div class="small muted">${esc(m.email)}</div></div>${canAdmin() && m.user_id !== cloud.user.id && (m.role !== 'owner' || cloud.role === 'owner') ? `<select class="inp" style="width:auto;padding:5px 8px" data-act-input="memberRole" data-id="${m.user_id}">${roles.map(([k, v]) => `<option value="${k}" ${m.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn ghost sm danger" data-act="removeMember" data-id="${m.user_id}" title="Quitar acceso">✕</button>` : `<span class="pill">${ROLE_LABEL[m.role]}</span>`}</div>`).join('')}
  ${canAdmin() ? `${(inv.data || []).map(i => `<div class="list-item"><span class="pill warn">Invitado</span><div style="flex:1;min-width:0" class="small">${esc(i.email)} · ${ROLE_LABEL[i.role]}</div><button class="btn ghost sm danger" data-act="removeInvite" data-email="${esc(i.email)}">✕</button></div>`).join('')}
  <form class="row mt" id="inviteForm"><input class="inp" type="email" name="email" required placeholder="email@nexispower.com" style="flex:1;min-width:180px"><select class="inp" name="role" style="width:auto">${roles.map(([k, v]) => `<option value="${k}" ${k === 'office' ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn primary">Invitar</button></form>
  <p class="small muted">La persona invitada entra en <b>${esc(location.origin + location.pathname)}</b> con ese email (la primera vez, con "Crear cuenta").</p>` : ''}`;
  const f = $('#inviteForm');
  if (f) f.onsubmit = async ev => { ev.preventDefault(); const email = f.email.value.trim().toLowerCase(), role = f.role.value; const { error } = await cloud.sb.from('opsboss_invites').upsert({ email, role, invited_by: cloud.user.id }); if (error) toast(error.message); else { toast('Invitación creada para ' + email); ROUTES['settings:after'](); } };
};
ROUTES.settings = () => {
  const s = db.settings;
  const f = (k, l, type = 'text', step) => `<label class="f">${l}<input class="inp" type="${type}" ${step ? `step="${step}"` : ''} data-act-input="setting" data-k="${k}" value="${esc(s[k])}"></label>`;
  return head('Configuración', 'Datos de la empresa, impuestos, financiamiento y respaldo') + `
  <div class="grid g2">
    <div class="card"><div class="card-h"><h3>Empresa</h3></div><div class="card-b form">${f('company', 'Nombre comercial')}${f('license', 'Licencias')}${f('phone', 'Teléfono')}${f('email', 'Email', 'email')}<div class="full">${f('address', 'Dirección')}</div><label class="f full">Términos en documentos<textarea class="inp" data-act-input="setting" data-k="terms">${esc(s.terms)}</textarea></label></div></div>
    <div>
      <div class="card"><div class="card-h"><h3>Impuestos y financiamiento</h3></div><div class="card-b form">${f('taxRate', 'Impuesto de venta (%)', 'number', '0.01')}${f('apr', 'APR de financiamiento (%)', 'number', '0.01')}${f('term', 'Plazo (meses)', 'number')}</div></div>
      <div class="card mt"><div class="card-h"><h3>Datos y respaldo</h3></div><div class="card-b"><p class="small muted">${cloud.on ? 'Los datos se guardan en Supabase y se comparten en tiempo real con tu equipo. Exporta un respaldo de vez en cuando.' : 'Modo local: los datos se guardan solo en este navegador. Exporta un respaldo con frecuencia.'}</p><div class="row"><button class="btn" data-act="exportJson">⇩ Exportar respaldo (JSON)</button>${canAdmin() ? `<label class="btn">⇧ Importar respaldo<input type="file" accept="application/json" hidden data-act-input="importJson"></label><button class="btn danger" data-act="resetDemo">Restablecer datos demo</button><button class="btn danger" data-act="wipe">Empezar en blanco</button>` : ''}</div></div></div>
      ${cloud.on ? `<div class="card mt"><div class="card-h"><h3>Equipo y acceso</h3><span class="pill brand">Tu rol: ${ROLE_LABEL[cloud.role] || cloud.role}</span></div><div class="card-b" id="acl"><span class="muted small">Cargando…</span></div></div>` : ''}
    </div>
  </div>`;
};

/* ───────────── Búsqueda / paleta de comandos ───────────── */
function openPalette() {
  const pages = NAV.filter(n => n[0] !== 'sec').map(n => ({ label: n[2], type: 'Página', go: '#/' + n[0] }));
  const actions = [['Nuevo lead', 'newLead'], ['Nuevo cliente', 'newCustomer'], ['Nuevo estimado', 'newEstimate'], ['Nuevo trabajo', 'newJob'], ['Nueva factura', 'newInvoice']].map(([label, act]) => ({ label: '＋ ' + label, type: 'Acción', act }));
  const records = () => [
    ...db.customers.map(c => ({ label: c.name, sub: `${c.phone} · ${c.address}, ${c.city}`, type: 'Cliente', go: '#/customer/' + c.id, hay: [c.name, c.phone, c.email, c.address, c.city].join(' ') })),
    ...db.jobs.map(j => ({ label: `${j.number} · ${j.title}`, sub: cust(j.customerId).name, type: 'Trabajo', go: '#/job/' + j.id })),
    ...db.estimates.map(e => ({ label: `${e.number} · ${e.title}`, sub: cust(e.customerId).name, type: 'Estimado', go: '#/estimate/' + e.id })),
    ...db.invoices.map(i => ({ label: `${i.number} · ${money(invTotal(i))}`, sub: cust(i.customerId).name, type: 'Factura', go: '#/invoice/' + i.id })),
  ];
  const m = modal({ title: 'Buscar', body: `<div class="cmd" style="margin:0;width:100%"><input id="cmdq" placeholder="Escribe un nombre, teléfono, # de trabajo, factura…" autocomplete="off"><div class="cmd-list" id="cmdl"></div></div>` });
  m.el.querySelector('.modal').classList.add('cmd'); m.el.querySelector('.modal-b').style.padding = 0; m.el.querySelector('.modal-h').style.display = 'none';
  let items = [], sel = 0;
  const draw = () => {
    const q = $('#cmdq', m.el).value.trim().toLowerCase();
    items = q ? [...actions, ...pages, ...records()].filter(x => (x.label + ' ' + (x.hay || x.sub || '')).toLowerCase().includes(q)).slice(0, 30) : [...actions, ...pages];
    sel = Math.min(sel, Math.max(0, items.length - 1));
    $('#cmdl', m.el).innerHTML = items.map((x, i) => `<div class="cmd-item ${i === sel ? 'sel' : ''}" data-i="${i}"><div><div>${esc(x.label)}</div>${x.sub ? `<div class="small muted">${esc(x.sub)}</div>` : ''}</div><span class="t">${x.type}</span></div>`).join('') || '<div class="empty">Sin resultados</div>';
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
  newInvoice: el => form({ title: 'Nueva factura', fields: [{ k: 'customerId', label: 'Cliente', type: 'select', options: custOptions(), value: el.dataset.cust }, { k: 'division', label: 'División', type: 'select', options: divOptions(), value: state.div !== 'all' ? state.div : 'hvac' }], saveLabel: 'Crear', onSave(v) { const i = createInvoice(v); setTimeout(() => location.hash = '#/invoice/' + i.id); } }),
  saveNotes: el => { byId('customers', el.dataset.id).notes = $('#custNotes').value; save(); toast('Notas guardadas'); },
  editProperty: el => { const c = byId('customers', el.dataset.id), p = c.property = c.property || {}; form({ title: 'Propiedad', fields: [{ k: 'roofType', label: 'Tipo de techo', type: 'select', options: ['', 'Teja asfáltica', 'Teja de barro', 'Teja de concreto', 'Metal', 'Plano / TPO', 'Madera'], value: p.roofType }, { k: 'roofAge', label: 'Edad del techo (años)', type: 'number', value: p.roofAge }, { k: 'sqft', label: 'Área habitable (ft²)', type: 'number', value: p.sqft }, { k: 'stories', label: 'Pisos', type: 'number', value: p.stories }, { k: 'utility', label: 'Compañía eléctrica', value: p.utility }, { k: 'avgBill', label: 'Factura eléctrica promedio ($)', type: 'number', value: p.avgBill }], onSave(v) { Object.assign(p, v); } }); },
  addEquip: el => { const c = byId('customers', el.dataset.id); form({ title: 'Agregar equipo', fields: [{ k: 'type', label: 'Tipo', value: '', required: true, ph: 'Ej. Bomba de calor 3 ton / Inversor / Batería' }, { k: 'brand', label: 'Marca', value: '' }, { k: 'model', label: 'Modelo', value: '' }, { k: 'serial', label: 'Número de serie', value: '' }, { k: 'installed', label: 'Fecha de instalación', type: 'date', value: ymd(new Date()) }, { k: 'warranty', label: 'Garantía hasta', type: 'date', value: ymd(addDays(new Date(), 3650)) }], onSave(v) { (c.equipment = c.equipment || []).push({ id: uid(), ...v }); } }); },
  delEquip: el => { const c = byId('customers', el.dataset.id); c.equipment = c.equipment.filter(x => x.id !== el.dataset.eq); save(); render(); },
  liAdd: el => { liTarget(el.dataset.ctx).push({ id: uid(), name: 'Nuevo concepto', qty: 1, price: 0, cost: 0 }); save(); render(); },
  liDel: el => { liTarget(el.dataset.ctx).splice(+el.dataset.i, 1); save(); render(); },
  liBook: el => { const [k, id] = el.dataset.ctx.split(':'); const rec = byId({ est: 'estimates', job: 'jobs', inv: 'invoices' }[k], id); bookPicker(rec.division, it => liTarget(el.dataset.ctx).push(it)); },
  optTab: el => { state.tabs['opt' + el.dataset.id] = +el.dataset.k; render(); },
  addOpt: el => { const e = byId('estimates', el.dataset.id); const k = state.tabs['opt' + e.id] ?? 0; const names = ['Bueno', 'Mejor', 'Óptimo']; e.options.push({ id: uid(), name: names[e.options.length] || 'Opción', items: e.options[k].items.map(x => ({ ...x, id: uid() })) }); state.tabs['opt' + e.id] = e.options.length - 1; save(); render(); },
  delOpt: el => { const e = byId('estimates', el.dataset.id); e.options.splice(+el.dataset.k, 1); state.tabs['opt' + e.id] = 0; save(); render(); },
  sendEst: el => { const e = byId('estimates', el.dataset.id); e.status = 'sent'; e.sentAt = iso(new Date()); const c = cust(e.customerId); log(`Estimado ${e.number} enviado a ${c.name}`); save(); render(); modal({ title: 'Estimado marcado como enviado', body: `<p>Envía el estimado al cliente:</p><div class="row"><a class="btn" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(`Su estimado ${e.number} de ${db.settings.company}`)}&body=${encodeURIComponent(`Hola ${c.name},\n\nAdjunto su estimado ${e.number} (${e.title}) por ${money(estMax(e))}.\nOpciones de financiamiento desde ${money(monthly(Math.min(...e.options.map(o => totalOf(o.items))), num(db.settings.apr), num(db.settings.term)))}/mes.\n\nQuedamos a sus órdenes,\n${db.settings.company}\n${db.settings.phone}`)}">@ Email</a><a class="btn" href="sms:${esc(c.phone)}?body=${encodeURIComponent(`Hola ${c.name}, le enviamos su estimado ${e.number} de ${db.settings.company} por ${money(estMax(e))}. ¿Tiene alguna pregunta?`)}">✉ SMS</a><button class="btn" data-act="previewEst" data-id="${e.id}">⎙ PDF</button></div>`, foot: '<button class="btn primary" data-dismiss>Listo</button>' }); },
  approveEst: el => {
    const e = byId('estimates', el.dataset.id), k = +el.dataset.k; e.status = 'approved'; e.selected = k; e.approvedAt = iso(new Date());
    const items = e.options[k].items.map(x => ({ ...x, id: uid() }));
    const j = { id: uid(), number: nextNum('job'), customerId: e.customerId, division: e.division, title: e.title, techIds: [], start: null, duration: e.division === 'hvac' ? 6 : 8, status: 'unscheduled', items, checklist: CHECKLISTS[e.division].map(t => ({ id: uid(), t, done: false })), photos: [], notes: e.notes, estimateId: e.id, createdAt: iso(new Date()) };
    db.jobs.unshift(j);
    const lead = db.leads.find(l => l.estimateId === e.id || (l.customerId === e.customerId && l.division === e.division && !['won', 'lost'].includes(l.stage))); if (lead) lead.stage = 'won';
    let msg = `Estimado aprobado. Trabajo ${j.number} creado.`;
    if (num(e.deposit)) { const dep = totalOf(items) * num(e.deposit) / 100; const inv = createInvoice({ customerId: e.customerId, jobId: null, division: e.division, items: [{ id: uid(), name: `Depósito ${e.deposit}% — ${e.number} ${e.title}`, qty: 1, price: Math.round(dep * 100) / 100 / (1 + num(db.settings.taxRate) / 100), cost: 0 }] }); inv.status = 'sent'; msg += ` Factura de depósito ${inv.number}.`; }
    log(`Estimado ${e.number} aprobado (${e.options[k].name}) — ${money(totalOf(items))}`); save(); toast(msg); location.hash = '#/job/' + j.id;
  },
  declineEst: el => { const e = byId('estimates', el.dataset.id); e.status = 'declined'; log(`Estimado ${e.number} rechazado`); save(); render(); },
  reopenEst: el => { byId('estimates', el.dataset.id).status = 'draft'; save(); render(); },
  delEst: el => confirmDlg('¿Eliminar este estimado?', () => { db.estimates = db.estimates.filter(x => x.id !== el.dataset.id); location.hash = '#/estimates'; }),
  previewEst: el => previewEstimate(byId('estimates', el.dataset.id)),
  jobStatus: el => { const j = byId('jobs', el.dataset.id); j.status = el.dataset.s; if (j.status === 'completed') { j.completedAt = iso(new Date()); j.checklist.forEach(c => c.done = true); } log(`${j.number} → ${JOB_ST[j.status][0]}`); save(); render(); toast(JOB_ST[j.status][0]); if (j.status === 'enroute') { const c = cust(j.customerId); modal({ title: 'Avisar al cliente', body: `<p>¿Enviar mensaje de "en camino" a ${esc(c.name)}?</p>`, foot: `<button class="btn" data-dismiss>No</button><a class="btn primary" href="sms:${esc(c.phone)}?body=${encodeURIComponent(`Hola ${c.name}, su técnico de ${db.settings.company} va en camino para "${j.title}".`)}">✉ Enviar SMS</a>` }); } },
  cancelJob: el => { const j = byId('jobs', el.dataset.id); j.status = j.status === 'cancelled' ? (j.start ? 'scheduled' : 'unscheduled') : 'cancelled'; save(); render(); },
  delJob: el => confirmDlg('¿Eliminar este trabajo?', () => { db.jobs = db.jobs.filter(x => x.id !== el.dataset.id); location.hash = '#/jobs'; }),
  invoiceJob: el => { const j = byId('jobs', el.dataset.id); const deps = db.invoices.filter(i => i.customerId === j.customerId && i.items.some(it => j.estimateId && it.name.includes(byId('estimates', j.estimateId)?.number || '@@'))); const items = j.items.map(x => ({ ...x, id: uid() })); deps.forEach(d => items.push({ id: uid(), name: `Menos depósito (${d.number})`, qty: 1, price: -subtotal(d.items), cost: 0 })); const inv = createInvoice({ customerId: j.customerId, jobId: j.id, division: j.division, items }); j.invoiceId = inv.id; save(); location.hash = '#/invoice/' + inv.id; },
  addCheck: el => { const j = byId('jobs', el.dataset.id); form({ title: 'Agregar tarea', fields: [{ k: 't', label: 'Tarea', full: true, required: true }], onSave(v) { j.checklist.push({ id: uid(), t: v.t, done: false }); } }); },
  delPhoto: el => { byId('jobs', el.dataset.id).photos.splice(+el.dataset.i, 1); save(); render(); },
  sendInv: el => { const i = byId('invoices', el.dataset.id); i.status = 'sent'; const c = cust(i.customerId); log(`Factura ${i.number} enviada a ${c.name}`); save(); render(); modal({ title: 'Factura enviada', body: `<p>Comparte la factura con el cliente:</p><div class="row"><a class="btn" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(`Factura ${i.number} — ${db.settings.company}`)}&body=${encodeURIComponent(`Hola ${c.name},\n\nSu factura ${i.number} por ${money2(invTotal(i))} vence el ${fDate(parseLocal(i.due))}.\n\nGracias por su preferencia,\n${db.settings.company}`)}">@ Email</a><a class="btn" href="sms:${esc(c.phone)}?body=${encodeURIComponent(`Hola ${c.name}, su factura ${i.number} de ${db.settings.company} por ${money2(invTotal(i))} está lista.`)}">✉ SMS</a></div>`, foot: '<button class="btn primary" data-dismiss>Listo</button>' }); },
  remindInv: el => { const i = byId('invoices', el.dataset.id), c = cust(i.customerId); location.href = `sms:${c.phone}?body=${encodeURIComponent(`Hola ${c.name}, le recordamos que la factura ${i.number} de ${db.settings.company} tiene un saldo de ${money2(invBal(i))}, vencida el ${fDate(parseLocal(i.due))}. ¡Gracias!`)}`; log(`Recordatorio enviado: ${i.number}`); save(); },
  payInv: el => payModal(byId('invoices', el.dataset.id)),
  delPay: el => confirmDlg('¿Eliminar este pago?', () => { const i = byId('invoices', el.dataset.id); i.payments = i.payments.filter(p => p.id !== el.dataset.p); }),
  voidInv: el => confirmDlg('¿Anular esta factura?', () => { byId('invoices', el.dataset.id).status = 'void'; }),
  previewInv: el => { const i = byId('invoices', el.dataset.id); const paid = invPaid(i); modal({ title: 'Factura ' + i.number, wide: true, body: docHTML({ kind: 'FACTURA', number: i.number, date: 'Emitida: ' + fDate(i.createdAt), extraMeta: `<br>Vence: ${fDate(parseLocal(i.due))}`, customerId: i.customerId, items: i.items, notes: i.notes, footer: paid ? `<div style="text-align:right;margin-top:8px">Pagado: <b>${money2(paid)}</b><br><span style="font-size:18px">Saldo: <b>${money2(invBal(i))}</b></span></div>` : '' }), foot: `<button class="btn" data-dismiss>Cerrar</button><button class="btn primary" onclick="window.print()">⎙ Imprimir / PDF</button>` }); },
  newPlan: el => form({ title: 'Nueva membresía', fields: [{ k: 'customerId', label: 'Cliente', type: 'select', options: custOptions(), value: el.dataset.cust }, { k: 'name', label: 'Plan', type: 'select', options: ['Confort Anual HVAC', 'Confort Premium HVAC', 'Solar Care (limpieza + monitoreo)', 'Roof Shield (inspección anual)'] }, { k: 'price', label: 'Precio ($)', type: 'number', value: 19 }, { k: 'interval', label: 'Cobro', type: 'select', options: [['month', 'Mensual'], ['year', 'Anual']] }, { k: 'visitsPerYear', label: 'Visitas por año', type: 'number', value: 2 }, { k: 'nextVisit', label: 'Primera visita', type: 'date', value: ymd(addDays(new Date(), 14)) }], onSave(v) { db.plans.unshift({ id: uid(), ...v, division: v.name.includes('HVAC') ? 'hvac' : v.name.includes('Solar') ? 'solar' : 'roofing', status: 'active', startDate: ymd(new Date()) }); log(`Nueva membresía: ${cust(v.customerId).name} — ${v.name}`); } }),
  togglePlan: el => { const p = byId('plans', el.dataset.id); p.status = p.status === 'active' ? 'cancelled' : 'active'; save(); render(); },
  planVisit: el => { const p = byId('plans', el.dataset.id); const pb = db.pricebook.find(x => x.division === p.division && /Mantenimiento|Limpieza|Reparación/.test(x.name)); jobModal(null, { customerId: p.customerId, division: p.division, title: 'Visita de membresía — ' + p.name, date: p.nextVisit, items: pb ? [{ id: uid(), name: pb.name + ' (incluido en membresía)', qty: 1, price: 0, cost: pb.cost }] : [] }); p.nextVisit = ymd(addDays(parseLocal(p.nextVisit), Math.round(365 / Math.max(1, p.visitsPerYear)))); save(); },
  newPermit: el => permitModal(null, el.dataset.job),
  editPermit: el => permitModal(byId('permits', el.dataset.id)),
  calcEst: el => {
    const k = el.dataset.k, pb = d => db.pricebook.filter(p => p.division === d), it = (p, q) => p ? { id: uid(), name: p.name, qty: q, price: p.price, cost: p.cost } : null;
    let division, title, items;
    if (k === 'solar') { const P = pb('solar'), n = +el.dataset.panels; division = 'solar'; title = `Sistema solar ${(n * state.tools.solar.watts / 1000).toFixed(1)} kW`; items = [it(P[0], n), it(P[1], n), it(P[4], n), it(P[6], 1), +el.dataset.bat ? it(P[3], +el.dataset.bat) : null]; }
    if (k === 'roof') { const P = pb('roofing'); division = 'roofing'; title = `Techo nuevo ${el.dataset.sq} squares`; items = [it(P[+el.dataset.mat], +el.dataset.sq), +el.dataset.tear ? it(P[2], +el.dataset.tear) : null, it(P[4], +el.dataset.ice)]; }
    if (k === 'hvac') { const P = pb('hvac'); division = 'hvac'; title = `Sistema HVAC ${el.dataset.tons} ton`; items = [it(P.find(p => /Bomba de calor/.test(p.name)), 1), it(P.find(p => /Termostato/.test(p.name)), 1)]; }
    form({ title: 'Crear estimado', fields: [{ k: 'customerId', label: 'Cliente', type: 'select', options: custOptions() }, { k: 'title', label: 'Título', value: title, full: true }], saveLabel: 'Crear estimado', onSave(v) { const e = createEstimate({ customerId: v.customerId, division, title: v.title, items: items.filter(Boolean) }); setTimeout(() => location.hash = '#/estimate/' + e.id); } });
  },
  newPb: () => pbModal(null),
  editPb: el => pbModal(byId('pricebook', el.dataset.id)),
  newTech: () => techModal(null),
  editTech: el => techModal(byId('techs', el.dataset.id)),
  exportCsv: el => {
    const w = el.dataset.what; let rows;
    if (w === 'customers') rows = [['Nombre', 'Teléfono', 'Email', 'Dirección', 'Ciudad', 'CP', 'Fuente', 'Valor de vida', 'Saldo'], ...db.customers.map(c => [c.name, c.phone, c.email, c.address, c.city, c.zip, c.source, custLTV(c.id).toFixed(2), custBal(c.id).toFixed(2)])];
    if (w === 'jobs') rows = [['#', 'Trabajo', 'División', 'Cliente', 'Fecha', 'Horas', 'Técnicos', 'Estado', 'Monto'], ...db.jobs.map(j => [j.number, j.title, DIV[j.division].name, cust(j.customerId).name, j.start ? ymd(j.start) + ' ' + hm(j.start) : '', j.duration, j.techIds.map(t => tech(t)?.name).join(' / '), JOB_ST[j.status][0], totalOf(j.items).toFixed(2)])];
    if (w === 'invoices') rows = [['#', 'Cliente', 'División', 'Emitida', 'Vence', 'Total', 'Pagado', 'Saldo', 'Estado'], ...db.invoices.map(i => [i.number, cust(i.customerId).name, DIV[i.division].name, ymd(i.createdAt), i.due, invTotal(i).toFixed(2), invPaid(i).toFixed(2), invBal(i).toFixed(2), INV_ST[invStatus(i)][0]])];
    download(`opsboss-${w}-${ymd(new Date())}.csv`, '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
  },
  exportJson: () => download(`opsboss-respaldo-${ymd(new Date())}.json`, JSON.stringify(db, null, 2), 'application/json'),
  removeMember: el => confirmDlg('¿Quitar el acceso de esta persona a OpsBoss?', async () => { const { error } = await cloud.sb.from('opsboss_members').delete().eq('user_id', el.dataset.id); toast(error ? error.message : 'Acceso eliminado'); render(); }),
  removeInvite: async el => { const { error } = await cloud.sb.from('opsboss_invites').delete().eq('email', el.dataset.email); toast(error ? error.message : 'Invitación eliminada'); ROUTES['settings:after'](); },
  signOut: async () => { if (cloud.on) { clearTimeout(cloud.timer); await sync(); } await cloud.sb.auth.signOut(); location.reload(); },
  exitDemo: () => { try { localStorage.removeItem('opsboss.mode'); } catch (e) { /* ignore */ } location.href = location.pathname; },
  resetDemo: () => confirmDlg('Esto reemplaza todos los datos con datos de demostración. ¿Continuar?', () => { db = seed(); toast('Datos demo restablecidos'); }),
  wipe: () => confirmDlg('Esto borra todos los clientes, trabajos, estimados y facturas (se conservan configuración, equipo y lista de precios). ¿Continuar?', () => { Object.assign(db, { customers: [], leads: [], estimates: [], jobs: [], invoices: [], plans: [], permits: [], activity: [] }); toast('Listo — empieza a cargar tus datos'); }),
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
  permitSt: el => { const p = byId('permits', el.dataset.id); p.status = el.value; p.updated = ymd(new Date()); if (el.value === 'submitted' && !p.submitted) p.submitted = ymd(new Date()); log(`Permiso ${p.type} → ${PERMIT_ST[p.status][0]}`); save(); render(); },
  range: el => { state.filters.range = +el.value; render(); },
  memberRole: async el => { const { error } = await cloud.sb.from('opsboss_members').update({ role: el.value }).eq('user_id', el.dataset.id); toast(error ? error.message : 'Rol actualizado'); },
  setting: el => { db.settings[el.dataset.k] = el.type === 'number' ? num(el.value) : el.value; save(); },
  calc: el => { const [g, k] = el.dataset.k.split('.'); state.tools[g][k] = num(el.value); const pos = el.dataset.k; render(); const n = $(`[data-k="${pos}"]`); if (n) { n.focus(); } },
  photos: async el => { const j = byId('jobs', el.dataset.id); for (const f of el.files) { const d = await compressImage(f); if (d) j.photos.push(d); } save(); render(); toast('Fotos agregadas'); },
  importJson: el => { const f = el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d.customers || !d.settings) throw 0; db = d; save(); render(); toast('Respaldo importado ✓'); } catch (e) { toast('Archivo inválido'); } }; r.readAsText(f); },
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
  if (cloud.on) b.innerHTML = `<div class="em" title="${esc(cloud.user.email)}">${esc(cloud.user.email)}</div><div>${ROLE_LABEL[cloud.role] || ''} · <button data-act="signOut">Cerrar sesión</button></div>`;
  else if (CFG.url) b.innerHTML = `<div>Modo demo local · <button data-act="exitDemo">Iniciar sesión</button></div>`;
  else b.innerHTML = '';
}
function start() { renderUserBox(); render(); }
function authScreen(mode = 'login', msg = '', kind = 'bad') {
  const el = $('#auth'); el.hidden = false;
  const logo = '<div class="logo" style="width:44px;height:44px;font-size:22px">O<span></span></div>';
  const note = msg ? `<div class="auth-msg ${kind}">${msg}</div>` : '';
  if (mode === 'loading') { el.innerHTML = `<div class="auth-card">${logo}<h1>OpsBoss</h1><p>Cargando tus datos…</p></div>`; return; }
  if (mode === 'noaccess' || mode === 'setup') {
    el.innerHTML = `<div class="auth-card">${logo}<h1>${mode === 'setup' ? 'Falta configurar la base de datos' : 'Sin acceso todavía'}</h1>${note}<p>${mode === 'setup' ? 'Ejecuta <code>opsboss/supabase/schema.sql</code> en el SQL Editor de Supabase y recarga esta página.' : `Tu cuenta <b>${esc(cloud.user && cloud.user.email)}</b> aún no está invitada a OpsBoss. Pide a un administrador que te invite desde Configuración → Equipo y acceso, y vuelve a entrar.`}</p><div class="row"><button class="btn" id="aRetry">Reintentar</button><button class="btn" id="aOut">Cerrar sesión</button><button class="btn ghost" id="aDemo">Ver demo</button></div></div>`;
    $('#aRetry').onclick = () => location.reload();
    $('#aOut').onclick = async () => { await cloud.sb.auth.signOut(); location.reload(); };
    $('#aDemo').onclick = enterDemo;
    return;
  }
  const titles = { login: ['Inicia sesión', 'Entra con tu cuenta de OpsBoss.', 'Entrar'], signup: ['Crear cuenta', 'Usa el email con el que te invitaron.', 'Crear cuenta'], magic: ['Enlace mágico', 'Te enviamos un enlace para entrar sin contraseña.', 'Enviar enlace'], reset: ['Recuperar contraseña', 'Te enviamos un enlace para crear una nueva.', 'Enviar enlace'], newpass: ['Nueva contraseña', 'Escribe tu nueva contraseña.', 'Guardar'] }[mode];
  const needEmail = mode !== 'newpass', needPass = ['login', 'signup', 'newpass'].includes(mode);
  el.innerHTML = `<div class="auth-card">${logo}<h1>${titles[0]}</h1><p>${titles[1]}</p>${note}<form id="aForm">
    ${mode === 'signup' ? '<label class="f">Nombre<input name="name" autocomplete="name" required></label>' : ''}
    ${needEmail ? '<label class="f">Email<input name="email" type="email" autocomplete="email" required></label>' : ''}
    ${needPass ? `<label class="f">Contraseña<input name="password" type="password" minlength="8" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required></label>` : ''}
    <button class="btn primary full" id="aSubmit">${titles[2]}</button></form>
    <div class="links">${mode !== 'login' ? '<button data-m="login">← Iniciar sesión</button>' : '<button data-m="signup">Crear cuenta</button>'}${mode === 'login' ? '<button data-m="magic">Enlace mágico</button><button data-m="reset">¿Olvidaste tu contraseña?</button>' : ''}</div>
    <div class="links" style="border-top:1px solid var(--border);padding-top:12px"><button id="aDemo">Probar con datos de demostración →</button></div></div>`;
  $$('[data-m]', el).forEach(b => b.onclick = () => authScreen(b.dataset.m));
  $('#aDemo').onclick = enterDemo;
  $('#aForm').onsubmit = async ev => {
    ev.preventDefault();
    const f = ev.target, btn = $('#aSubmit'), redirect = location.origin + location.pathname;
    btn.disabled = true; btn.textContent = 'Un momento…';
    const email = f.email ? f.email.value.trim() : '', password = f.password ? f.password.value : '';
    let r;
    if (mode === 'login') r = await cloud.sb.auth.signInWithPassword({ email, password });
    if (mode === 'signup') r = await cloud.sb.auth.signUp({ email, password, options: { data: { name: f.name.value.trim() }, emailRedirectTo: redirect } });
    if (mode === 'magic') r = await cloud.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: false } });
    if (mode === 'reset') r = await cloud.sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
    if (mode === 'newpass') r = await cloud.sb.auth.updateUser({ password });
    if (r.error) { authScreen(mode, esc(r.error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : /fetch|network/i.test(r.error.message) ? 'No se pudo conectar con el servidor. Revisa tu conexión a internet.' : r.error.message)); return; }
    if (mode === 'signup' && !r.data.session) { authScreen('login', 'Cuenta creada. Revisa tu email para confirmarla y luego inicia sesión.', 'ok'); return; }
    if (mode === 'magic' || mode === 'reset') { authScreen('login', 'Listo: revisa tu email y abre el enlace.', 'ok'); return; }
    if (mode === 'newpass') toast('Contraseña actualizada');
    const { data } = await cloud.sb.auth.getUser(); if (data.user) enter(data.user);
  };
}
function enterDemo() {
  try { localStorage.setItem('opsboss.mode', 'demo'); } catch (e) { /* ignore */ }
  cloud.on = false; db = load(); $('#auth').hidden = true; setSync('local', 'Modo demo: los datos se guardan solo en este navegador.'); start();
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
    if (!db.settings) { const b = blankDb(); db.settings = b.settings; if (!db.pricebook.length) db.pricebook = b.pricebook; }
    cloud.on = true; $('#auth').hidden = true; setSync('ok');
    subscribe(); start(); sync();
    if (!count && canAdmin()) firstRun();
  } catch (e) { authScreen('setup', esc(e.message || String(e))); } finally { cloud.entering = false; }
}
function firstRun() {
  let local = null; try { const raw = localStorage.getItem(STORE_KEY); if (raw) local = JSON.parse(raw); } catch (e) { /* ignore */ }
  modal({ title: 'Bienvenido a OpsBoss en la nube', body: `<p>La base de datos está vacía. ¿Cómo quieres empezar?</p><div class="grid" style="gap:10px">
    ${local && local.customers ? `<button class="btn" data-fr="local" style="justify-content:flex-start">⇧ Subir los datos de este navegador <span class="muted small">(${local.customers.length} clientes, ${local.jobs.length} trabajos)</span></button>` : ''}
    <button class="btn" data-fr="blank" style="justify-content:flex-start">✦ Empezar en blanco <span class="muted small">(con lista de precios base)</span></button>
    <button class="btn" data-fr="demo" style="justify-content:flex-start">◧ Cargar datos de demostración <span class="muted small">(para probar con el equipo)</span></button></div>`,
    onMount(bg, close) { bg.addEventListener('click', e => { const b = e.target.closest('[data-fr]'); if (!b) return; const k = b.dataset.fr; db = k === 'local' ? local : k === 'demo' ? seed() : { ...blankDb(), settings: db.settings, pricebook: db.pricebook }; COLLS.forEach(c => db[c] = db[c] || []); log('Base de datos inicializada'); close(); save(); render(); toast('Listo ✓'); }); },
  });
}
async function boot() {
  let demo = false; try { demo = localStorage.getItem('opsboss.mode') === 'demo' || new URLSearchParams(location.search).has('demo'); } catch (e) { /* ignore */ }
  if (!CFG.url || !window.supabase || !window.supabase.createClient) { cloud.on = false; db = load(); setSync('local', 'Modo local: los datos se guardan solo en este navegador.'); start(); return; }
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
