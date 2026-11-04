/* OpsBoss — Portal del cliente: ver, firmar y pagar estimados y facturas.
   No requiere cuenta: el acceso es el token secreto del link. Toda validación ocurre en el servidor. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const money2 = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = n => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const fDate = d => d ? new Date(String(d).length === 10 ? d + 'T12:00' : d).toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const DIV = { solar: 'Solar', roofing: 'Roofing', hvac: 'HVAC' };
const root = $('#portal');
const params = new URLSearchParams(location.search);
const token = params.get('t') || '';
const CFG = window.OPSBOSS_CONFIG || {};
let sb, data, sel = 0;

const fail = (title, msg) => { root.innerHTML = `<div class="pcard done"><div class="ic" style="background:#fef2f2;color:#dc2626">!</div><h2>${title}</h2><p class="muted">${msg}</p></div>`; };
const subtotal = items => (items || []).reduce((s, i) => s + num(i.qty) * num(i.price), 0);
const total = items => subtotal(items) * (1 + num(data.company.taxRate) / 100);
const monthly = (P, apr, n) => { const r = apr / 1200; return n ? (r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n) : 0; };

function itemsTable(items) {
  const sub = subtotal(items), tax = sub * num(data.company.taxRate) / 100;
  return `<div class="table-wrap"><table><thead><tr><th>Concepto</th><th class="right hm">Cant.</th><th class="right hm">Precio</th><th class="right">Total</th></tr></thead><tbody>${items.map(i => `<tr><td>${esc(i.name)}<div class="small muted sm-only">${esc(i.qty)} × ${money2(i.price)}</div></td><td class="right hm">${esc(i.qty)}</td><td class="right hm">${money2(i.price)}</td><td class="right b" style="white-space:nowrap">${money2(num(i.qty) * num(i.price))}</td></tr>`).join('')}</tbody></table></div>
  <div style="display:flex;justify-content:flex-end;margin-top:10px"><table style="width:auto;min-width:240px"><tr><td class="muted">Subtotal</td><td class="right">${money2(sub)}</td></tr>${tax ? `<tr><td class="muted">Impuesto (${data.company.taxRate}%)</td><td class="right">${money2(tax)}</td></tr>` : ''}<tr><td class="b">Total</td><td class="right b" style="font-size:18px">${money2(sub + tax)}</td></tr></table></div>`;
}
function header() {
  const c = data.company, cu = data.customer;
  return `<div class="ptop"><div style="display:flex;gap:12px;align-items:center"><div class="logo" style="width:44px;height:44px;font-size:22px">O<span></span></div><div><div class="b" style="font-size:18px">${esc(c.name)}</div><div class="muted small">${esc(c.phone)} · ${esc(c.email)}</div></div></div><button class="btn sm noprint" onclick="window.print()">⎙ Imprimir / PDF</button></div>
  <div class="pcard" style="padding:16px 24px"><div class="small muted">Preparado para</div><div class="b">${esc(cu.name)}</div><div class="small muted">${esc([cu.address, cu.city, cu.zip].filter(Boolean).join(', '))}</div></div>`;
}
function footer() { const c = data.company; return `<p class="small muted" style="text-align:center;margin-top:24px">${esc(c.name)} · ${esc(c.address || '')} · ${esc(c.license || '')}<br>${esc(c.terms || '')}</p>`; }

/* ───────── Estimado ───────── */
function renderEstimate() {
  const r = data.record, c = data.company, opts = r.options || [];
  const expired = r.validUntil && new Date(r.validUntil + 'T23:59') < new Date();
  if (r.status === 'approved') return renderApproved();
  if (r.status === 'declined') { root.innerHTML = header() + `<div class="pcard done"><h2>Estimado ${esc(r.number)} rechazado</h2><p class="muted">Gracias por avisarnos. Si cambia de opinión o quiere otra opción, llámenos al ${esc(c.phone)}.</p></div>` + footer(); return; }
  sel = Math.min(sel, opts.length - 1);
  const opt = opts[sel], t = total(opt.items), dep = t * num(r.deposit) / 100;
  const best = opts.length > 1 ? opts.length - 1 : -1;
  root.innerHTML = header() + `
  <div class="pcard">
    <div class="small muted">Estimado ${esc(r.number)} · ${DIV[r.division] || ''} · ${fDate(r.createdAt)}</div>
    <h2>${esc(r.title)}</h2>
    ${r.validUntil ? `<div class="small ${expired ? '' : 'muted'}" style="${expired ? 'color:#dc2626;font-weight:600' : ''}">${expired ? 'Este estimado venció el ' : 'Válido hasta el '}${fDate(r.validUntil)}</div>` : ''}
    ${opts.length > 1 ? `<p class="muted" style="margin-bottom:0">Elija la opción que prefiera:</p>` : ''}
    <div class="opts">${opts.map((o, i) => { const ot = total(o.items); return `<button class="opt ${i === sel ? 'on' : ''}" data-opt="${i}">${i === best ? '<span class="badge">Recomendado</span>' : ''}<div class="b">${esc(o.name)}</div><div class="pr">${money(ot)}</div>${num(c.apr) && num(c.term) ? `<div class="small muted">o ${money(monthly(ot, num(c.apr), num(c.term)))}/mes financiado*</div>` : ''}<div class="small muted">${o.items.length} conceptos</div></button>`; }).join('')}</div>
    <h3 style="margin:8px 0">Detalle — ${esc(opt.name)}</h3>
    ${itemsTable(opt.items)}
    ${r.notes ? `<p style="white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:12px">${esc(r.notes)}</p>` : ''}
    ${num(c.apr) && num(c.term) ? `<p class="small muted">*Pago mensual estimado a ${c.term} meses con ${c.apr}% APR, sujeto a aprobación de crédito.</p>` : ''}
  </div>
  ${expired ? `<div class="pcard"><p>Este estimado ya venció. Llámenos al <b>${esc(c.phone)}</b> y con gusto lo actualizamos.</p></div>` : `
  <div class="pcard noprint" id="approveCard">
    <h2>Aprobar "${esc(opt.name)}" — ${money2(t)}</h2>
    ${dep ? `<p class="muted">Al aprobar se genera un depósito de <b>${money2(dep)}</b> (${num(r.deposit)}%) para reservar su proyecto.</p>` : '<p class="muted">Firme abajo para aprobar este trabajo.</p>'}
    <label class="f" style="margin-bottom:12px">Nombre completo<input class="inp" id="sname" autocomplete="name" value="${esc(data.customer.name || '')}"></label>
    <div class="small muted" style="margin-bottom:6px">Firme con el dedo o el mouse:</div>
    <canvas class="sig" id="sig"></canvas>
    <div class="row2" style="justify-content:space-between;margin:6px 0 14px"><button class="btn sm ghost" id="sigClear">Borrar firma</button><span class="small muted" id="sigHint">Firma requerida</span></div>
    <label class="check" style="align-items:flex-start"><input type="checkbox" id="agree"><span class="small">Acepto este estimado, sus términos y autorizo a ${esc(c.name)} a realizar el trabajo descrito. Entiendo que mi firma electrónica tiene la misma validez que una firma escrita.</span></label>
    <button class="btn ok bigbtn mt" id="approveBtn">✓ Aprobar y firmar</button>
    <div id="aerr"></div>
    <div style="text-align:center;margin-top:14px"><button class="btn ghost sm" id="declineBtn">No me interesa / rechazar</button></div>
  </div>`}` + footer();
  root.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { sel = +b.dataset.opt; renderEstimate(); document.querySelector('#approveCard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  if (!expired) wireSignature();
}
function wireSignature() {
  const cv = $('#sig'), ctx = cv.getContext('2d');
  const fit = () => { const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; ctx.scale(d, d); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f172a'; };
  fit();
  let drawing = false, has = false, last = null;
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); $('#aerr').innerHTML = ''; });
  cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; if (!has) { has = true; $('#sigHint').textContent = '✓ Firmado'; } });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => cv.addEventListener(ev, () => { drawing = false; }));
  $('#sigClear').onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); has = false; $('#sigHint').textContent = 'Firma requerida'; };
  $('#approveBtn').onclick = async () => {
    const name = $('#sname').value.trim(), err = $('#aerr');
    err.innerHTML = '';
    if (name.length < 2) { err.innerHTML = '<div class="err">Escriba su nombre completo.</div>'; return; }
    if (!has) { err.innerHTML = '<div class="err">Por favor firme en el recuadro.</div>'; return; }
    if (!$('#agree').checked) { err.innerHTML = '<div class="err">Marque la casilla para aceptar los términos.</div>'; return; }
    // firma a PNG reducido
    const out = document.createElement('canvas'); out.width = 600; out.height = 200; const o = out.getContext('2d'); o.fillStyle = '#fff'; o.fillRect(0, 0, 600, 200); o.drawImage(cv, 0, 0, 600, 200);
    const btn = $('#approveBtn'); btn.disabled = true; btn.textContent = 'Procesando…';
    const { data: res, error } = await sb.rpc('opsboss_portal_approve', { p_token: token, p_option: sel, p_name: name, p_signature: out.toDataURL('image/png') });
    if (error || res?.error) {
      btn.disabled = false; btn.textContent = '✓ Aprobar y firmar';
      const m = { expired: 'Este estimado ya venció.', already: 'Este estimado ya fue aprobado.', closed: 'Este estimado ya no está disponible.', invalid: 'El enlace ya no es válido.' }[res?.error] || 'No se pudo completar. Intente de nuevo o llámenos.';
      err.innerHTML = `<div class="err">${m}</div>`; return;
    }
    await load();
  };
  $('#declineBtn').onclick = async () => {
    const reason = prompt('¿Nos cuenta por qué? (opcional)') ;
    if (reason === null) return;
    const { data: res, error } = await sb.rpc('opsboss_portal_decline', { p_token: token, p_reason: reason });
    if (error || res?.error) { alert('No se pudo registrar. Intente de nuevo.'); return; }
    await load();
  };
}
function renderApproved() {
  const r = data.record, c = data.company, opt = (r.options || [])[r.selected ?? 0];
  root.innerHTML = header() + `<div class="pcard done"><div class="ic">✓</div><h2>¡Proyecto aprobado!</h2><p class="muted">${esc(r.title)}${opt ? ` — opción <b>${esc(opt.name)}</b>, ${money2(total(opt.items))}` : ''}<br>Firmado por ${esc(r.signedBy || '')} el ${fDate(r.signedAt)}.</p>
  ${data.depositToken ? `<a class="btn primary bigbtn" style="max-width:380px;margin:12px auto 0" href="?t=${esc(data.depositToken)}">Ver y pagar el depósito →</a>` : `<p>Nos pondremos en contacto pronto para agendar. ¿Preguntas? Llame al <b>${esc(c.phone)}</b>.</p>`}</div>` + (opt ? `<div class="pcard"><h3 style="margin-top:0">Resumen</h3>${itemsTable(opt.items)}</div>` : '') + footer();
}

/* ───────── Factura ───────── */
function renderInvoice() {
  const r = data.record, c = data.company;
  const t = total(r.items), paid = (r.payments || []).reduce((s, p) => s + num(p.amount), 0), bal = Math.max(0, t - paid);
  const justPaid = params.get('paid') === '1';
  const isDep = r.kind === 'deposit';
  root.innerHTML = header() + `
  ${justPaid ? `<div class="pcard done" style="padding:24px"><div class="ic">✓</div><h2>¡Gracias por su pago!</h2><p class="muted">${bal > 0.009 ? 'Estamos confirmando su pago; puede tardar unos minutos en reflejarse aquí.' : 'Su pago fue recibido.'}</p></div>` : ''}
  <div class="pcard">
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><div class="small muted">${isDep ? 'Depósito' : 'Factura'} ${esc(r.number)}</div><h2>${bal <= 0.009 ? 'Pagada ✓' : 'Saldo: ' + money2(bal)}</h2><div class="small muted">Emitida ${fDate(r.createdAt)} · Vence ${fDate(r.due)}</div></div>
    ${bal > 0.009 && r.status !== 'void' ? `<div style="min-width:240px" class="noprint">${c.paymentsEnabled ? `<button class="btn primary bigbtn" id="payBtn">Pagar ${money2(bal)}</button><div class="small muted" style="text-align:center;margin-top:6px">Tarjeta o cuenta bancaria · pago seguro con Stripe</div>` : ''}<div id="perr"></div></div>` : ''}</div>
    <div class="mt">${itemsTable(r.items)}</div>
    ${(r.payments || []).length ? `<h3>Pagos recibidos</h3>${r.payments.map(p => `<div class="list-item"><div style="flex:1">${fDate(p.date)} · ${esc(p.method)}</div><b>${money2(p.amount)}</b></div>`).join('')}` : ''}
    ${r.notes ? `<p style="white-space:pre-wrap">${esc(r.notes)}</p>` : ''}
    ${bal > 0.009 && c.payInstructions ? `<div style="background:#f8fafc;border-radius:10px;padding:12px;margin-top:12px"><div class="b small">Otras formas de pago</div><div class="small" style="white-space:pre-wrap">${esc(c.payInstructions)}</div></div>` : ''}
  </div>` + footer();
  const pb = $('#payBtn');
  if (pb) pb.onclick = async () => {
    pb.disabled = true; pb.textContent = 'Abriendo pago seguro…';
    try {
      const r2 = await fetch(`${CFG.url}/functions/v1/opsboss-pay`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.key }, body: JSON.stringify({ token }) });
      const out = await r2.json();
      if (out.url) { location.href = out.url; return; }
      throw new Error(out.error);
    } catch (e) {
      pb.disabled = false; pb.textContent = `Pagar ${money2(bal)}`;
      $('#perr').innerHTML = `<div class="err">No se pudo abrir el pago en línea. ${c.payInstructions ? 'Use otra forma de pago o llámenos.' : 'Llámenos al ' + esc(c.phone) + '.'}</div>`;
    }
  };
  if (justPaid && bal > 0.009) setTimeout(load, 4000);
}

async function load() {
  const { data: d, error } = await sb.rpc('opsboss_portal_get', { p_token: token });
  if (error) { fail('No pudimos cargar su documento', 'Revise su conexión e intente de nuevo.'); return; }
  if (d?.error) { fail('Enlace no válido', 'Este enlace venció o fue reemplazado. Pida uno nuevo a la empresa que se lo envió.'); return; }
  data = d;
  document.title = `${d.kind === 'estimate' ? 'Estimado' : 'Factura'} ${d.record.number} — ${d.company.name || ''}`;
  if (d.kind === 'estimate') { if (d.record.selected != null) sel = d.record.selected; renderEstimate(); } else renderInvoice();
}

if (!/^[a-f0-9]{64}$/.test(token)) { fail('Enlace no válido', 'Abra el enlace completo que le enviamos por mensaje o correo.'); return; }
if (!window.supabase || !CFG.url) { fail('No se pudo cargar', 'Revise su conexión a internet y recargue la página.'); return; }
sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: false, autoRefreshToken: false } });
load();
})();
