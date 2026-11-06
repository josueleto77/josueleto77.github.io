/* OpsBoss — Portal del cliente: ver, firmar y pagar estimados y facturas.
   No requiere cuenta: el acceso es el token secreto del link. Toda validación ocurre en el servidor. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const money2 = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = n => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const fDate = d => d ? new Date(String(d).length === 10 ? d + 'T12:00' : d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
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
  return `<div class="table-wrap"><table><thead><tr><th>Item</th><th class="right hm">Qty</th><th class="right hm">Price</th><th class="right">Total</th></tr></thead><tbody>${items.map(i => `<tr><td>${esc(i.name)}<div class="small muted sm-only">${esc(i.qty)} × ${money2(i.price)}</div></td><td class="right hm">${esc(i.qty)}</td><td class="right hm">${money2(i.price)}</td><td class="right b" style="white-space:nowrap">${money2(num(i.qty) * num(i.price))}</td></tr>`).join('')}</tbody></table></div>
  <div style="display:flex;justify-content:flex-end;margin-top:10px"><table style="width:auto;min-width:240px"><tr><td class="muted">Subtotal</td><td class="right">${money2(sub)}</td></tr>${tax ? `<tr><td class="muted">Tax (${data.company.taxRate}%)</td><td class="right">${money2(tax)}</td></tr>` : ''}<tr><td class="b">Total</td><td class="right b" style="font-size:18px">${money2(sub + tax)}</td></tr></table></div>`;
}
function header() {
  const c = data.company, cu = data.customer;
  return `<div class="ptop"><div style="display:flex;gap:12px;align-items:center"><div class="logo" style="width:44px;height:44px;font-size:22px">O<span></span></div><div><div class="b" style="font-size:18px">${esc(c.name)}</div><div class="muted small">${esc(c.phone)} · ${esc(c.email)}</div></div></div><button class="btn sm noprint" onclick="window.print()">⎙ Print / PDF</button></div>
  <div class="pcard" style="padding:16px 24px"><div class="small muted">Prepared for</div><div class="b">${esc(cu.name)}</div><div class="small muted">${esc([cu.address, cu.city, cu.zip].filter(Boolean).join(', '))}</div></div>`;
}
function footer() { const c = data.company; return `<p class="small muted" style="text-align:center;margin-top:24px">${esc(c.name)} · ${esc(c.address || '')} · ${esc(c.license || '')}<br>${esc(c.terms || '')}</p>`; }

/* ───────── Estimado ───────── */
function renderEstimate() {
  const r = data.record, c = data.company, opts = r.options || [];
  const expired = r.validUntil && new Date(r.validUntil + 'T23:59') < new Date();
  if (r.status === 'approved') return renderApproved();
  if (r.status === 'declined') { root.innerHTML = header() + `<div class="pcard done"><h2>Estimate ${esc(r.number)} declined</h2><p class="muted">Thanks for letting us know. If you change your mind or would like another option, call us at ${esc(c.phone)}.</p></div>` + footer(); return; }
  sel = Math.min(sel, opts.length - 1);
  const opt = opts[sel], t = total(opt.items), dep = t * num(r.deposit) / 100;
  const best = opts.length > 1 ? opts.length - 1 : -1;
  root.innerHTML = header() + `
  <div class="pcard">
    <div class="small muted">Estimate ${esc(r.number)} · ${DIV[r.division] || ''} · ${fDate(r.createdAt)}</div>
    <h2>${esc(r.title)}</h2>
    ${r.validUntil ? `<div class="small ${expired ? '' : 'muted'}" style="${expired ? 'color:#dc2626;font-weight:600' : ''}">${expired ? 'This estimate expired on ' : 'Valid until '}${fDate(r.validUntil)}</div>` : ''}
    ${opts.length > 1 ? `<p class="muted" style="margin-bottom:0">Choose the option you prefer:</p>` : ''}
    <div class="opts">${opts.map((o, i) => { const ot = total(o.items); return `<button class="opt ${i === sel ? 'on' : ''}" data-opt="${i}">${i === best ? '<span class="badge">Recommended</span>' : ''}<div class="b">${esc(o.name)}</div><div class="pr">${money(ot)}</div>${num(c.apr) && num(c.term) ? `<div class="small muted">or ${money(monthly(ot, num(c.apr), num(c.term)))}/mo financed*</div>` : ''}<div class="small muted">${o.items.length} items</div></button>`; }).join('')}</div>
    <h3 style="margin:8px 0">Details — ${esc(opt.name)}</h3>
    ${itemsTable(opt.items)}
    ${r.notes ? `<p style="white-space:pre-wrap;background:#f8fafc;border-radius:10px;padding:12px">${esc(r.notes)}</p>` : ''}
    ${num(c.apr) && num(c.term) ? `<p class="small muted">*Estimated monthly payment over ${c.term} months at ${c.apr}% APR, subject to credit approval.</p>` : ''}
  </div>
  ${expired ? `<div class="pcard"><p>This estimate has expired. Call us at <b>${esc(c.phone)}</b> and we’ll be glad to update it.</p></div>` : `
  <div class="pcard noprint" id="approveCard">
    <h2>Approve "${esc(opt.name)}" — ${money2(t)}</h2>
    ${dep ? `<p class="muted">Approving creates a deposit of <b>${money2(dep)}</b> (${num(r.deposit)}%) to reserve your project.</p>` : '<p class="muted">Sign below to approve this work.</p>'}
    <label class="f" style="margin-bottom:12px">Full name<input class="inp" id="sname" autocomplete="name" value="${esc(data.customer.name || '')}"></label>
    <div class="small muted" style="margin-bottom:6px">Sign with your finger or mouse:</div>
    <canvas class="sig" id="sig"></canvas>
    <div class="row2" style="justify-content:space-between;margin:6px 0 14px"><button class="btn sm ghost" id="sigClear">Clear signature</button><span class="small muted" id="sigHint">Signature required</span></div>
    <label class="check" style="align-items:flex-start"><input type="checkbox" id="agree"><span class="small">I accept this estimate and its terms and authorize ${esc(c.name)} to perform the work described. I understand my electronic signature is as valid as a handwritten one.</span></label>
    <button class="btn ok bigbtn mt" id="approveBtn">✓ Approve and sign</button>
    <div id="aerr"></div>
    <div style="text-align:center;margin-top:14px"><button class="btn ghost sm" id="declineBtn">Not interested / decline</button></div>
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
  cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; if (!has) { has = true; $('#sigHint').textContent = '✓ Signed'; } });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => cv.addEventListener(ev, () => { drawing = false; }));
  $('#sigClear').onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); has = false; $('#sigHint').textContent = 'Signature required'; };
  $('#approveBtn').onclick = async () => {
    const name = $('#sname').value.trim(), err = $('#aerr');
    err.innerHTML = '';
    if (name.length < 2) { err.innerHTML = '<div class="err">Please enter your full name.</div>'; return; }
    if (!has) { err.innerHTML = '<div class="err">Please sign in the box.</div>'; return; }
    if (!$('#agree').checked) { err.innerHTML = '<div class="err">Check the box to accept the terms.</div>'; return; }
    // firma a PNG reducido
    const out = document.createElement('canvas'); out.width = 600; out.height = 200; const o = out.getContext('2d'); o.fillStyle = '#fff'; o.fillRect(0, 0, 600, 200); o.drawImage(cv, 0, 0, 600, 200);
    const btn = $('#approveBtn'); btn.disabled = true; btn.textContent = 'Processing…';
    const { data: res, error } = await sb.rpc('opsboss_portal_approve', { p_token: token, p_option: sel, p_name: name, p_signature: out.toDataURL('image/png') });
    if (error || res?.error) {
      btn.disabled = false; btn.textContent = '✓ Approve and sign';
      const m = { expired: 'This estimate has expired.', already: 'This estimate was already approved.', closed: 'This estimate is no longer available.', invalid: 'This link is no longer valid.' }[res?.error] || 'Something went wrong. Please try again or call us.';
      err.innerHTML = `<div class="err">${m}</div>`; return;
    }
    await load();
  };
  $('#declineBtn').onclick = async () => {
    const reason = prompt('Would you tell us why? (optional)') ;
    if (reason === null) return;
    const { data: res, error } = await sb.rpc('opsboss_portal_decline', { p_token: token, p_reason: reason });
    if (error || res?.error) { alert('Could not save your answer. Please try again.'); return; }
    await load();
  };
}
function renderApproved() {
  const r = data.record, c = data.company, opt = (r.options || [])[r.selected ?? 0];
  root.innerHTML = header() + `<div class="pcard done"><div class="ic">✓</div><h2>Project approved!</h2><p class="muted">${esc(r.title)}${opt ? ` — <b>${esc(opt.name)}</b> option, ${money2(total(opt.items))}` : ''}<br>Signed by ${esc(r.signedBy || '')} on ${fDate(r.signedAt)}.</p>
  ${data.depositToken ? `<a class="btn primary bigbtn" style="max-width:380px;margin:12px auto 0" href="?t=${esc(data.depositToken)}">View and pay deposit →</a>` : `<p>We’ll be in touch soon to schedule. Questions? Call <b>${esc(c.phone)}</b>.</p>`}</div>` + (opt ? `<div class="pcard"><h3 style="margin-top:0">Summary</h3>${itemsTable(opt.items)}</div>` : '') + footer();
}

/* ───────── Factura ───────── */
function renderInvoice() {
  const r = data.record, c = data.company;
  const t = total(r.items), paid = (r.payments || []).reduce((s, p) => s + num(p.amount), 0), bal = Math.max(0, t - paid);
  const justPaid = params.get('paid') === '1';
  const isDep = r.kind === 'deposit';
  root.innerHTML = header() + `
  ${justPaid ? `<div class="pcard done" style="padding:24px"><div class="ic">✓</div><h2>Thank you for your payment!</h2><p class="muted">${bal > 0.009 ? 'We’re confirming your payment; it may take a few minutes to show here.' : 'Your payment was received.'}</p></div>` : ''}
  <div class="pcard">
    <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><div class="small muted">${isDep ? 'Deposit' : 'Invoice'} ${esc(r.number)}</div><h2>${bal <= 0.009 ? 'Paid ✓' : 'Balance: ' + money2(bal)}</h2><div class="small muted">Issued ${fDate(r.createdAt)} · Due ${fDate(r.due)}</div></div>
    ${bal > 0.009 && r.status !== 'void' ? `<div style="min-width:240px" class="noprint">${c.paymentsEnabled ? `<button class="btn primary bigbtn" id="payBtn">Pay ${money2(bal)}</button><div class="small muted" style="text-align:center;margin-top:6px">Card or bank account · secure payment by Stripe</div>` : ''}<div id="perr"></div></div>` : ''}</div>
    <div class="mt">${itemsTable(r.items)}</div>
    ${(r.payments || []).length ? `<h3>Payments received</h3>${r.payments.map(p => `<div class="list-item"><div style="flex:1">${fDate(p.date)} · ${esc(p.method)}</div><b>${money2(p.amount)}</b></div>`).join('')}` : ''}
    ${r.notes ? `<p style="white-space:pre-wrap">${esc(r.notes)}</p>` : ''}
    ${bal > 0.009 && c.payInstructions ? `<div style="background:#f8fafc;border-radius:10px;padding:12px;margin-top:12px"><div class="b small">Other ways to pay</div><div class="small" style="white-space:pre-wrap">${esc(c.payInstructions)}</div></div>` : ''}
  </div>` + footer();
  const pb = $('#payBtn');
  if (pb) pb.onclick = async () => {
    pb.disabled = true; pb.textContent = 'Opening secure checkout…';
    try {
      const r2 = await fetch(`${CFG.url}/functions/v1/opsboss-pay`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.key }, body: JSON.stringify({ token }) });
      const out = await r2.json();
      if (out.url) { location.href = out.url; return; }
      throw new Error(out.error);
    } catch (e) {
      pb.disabled = false; pb.textContent = `Pay ${money2(bal)}`;
      $('#perr').innerHTML = `<div class="err">Online payment couldn’t be opened. ${c.payInstructions ? 'Please use another payment method or call us.' : 'Please call us at ' + esc(c.phone) + '.'}</div>`;
    }
  };
  if (justPaid && bal > 0.009) setTimeout(load, 4000);
}

async function load() {
  const { data: d, error } = await sb.rpc('opsboss_portal_get', { p_token: token });
  if (error) { fail('We couldn’t load your document', 'Check your connection and try again.'); return; }
  if (d?.error) { fail('Invalid link', 'This link expired or was replaced. Ask the company that sent it for a new one.'); return; }
  data = d;
  document.title = `${d.kind === 'estimate' ? 'Estimate' : d.record.kind === 'deposit' ? 'Deposit' : 'Invoice'} ${d.record.number} — ${d.company.name || ''}`;
  if (d.kind === 'estimate') { if (d.record.selected != null) sel = d.record.selected; renderEstimate(); } else renderInvoice();
}

if (!/^[a-f0-9]{64}$/.test(token)) { fail('Invalid link', 'Open the full link we sent you by text or email.'); return; }
if (!window.supabase || !CFG.url) { fail('Couldn’t load', 'Check your internet connection and reload the page.'); return; }
sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: false, autoRefreshToken: false } });
load();
})();
