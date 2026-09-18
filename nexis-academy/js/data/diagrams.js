/* ============================================================
   Nexis Power Academy — original explanatory diagrams
   Inline SVG, drawn in-house (not extracted from any source manual)
   so they stay on-brand, crisp at any size, and free of licensing
   questions around third-party stock photography. Registered by id
   and rendered wherever a lesson uses a { type:'diagram', id:'...' } block.
   ============================================================ */

var NX = { orange: '#FFA501', orange2: '#FF8501', charcoal: '#2B3D4A', blue: '#445A7D', white: '#FAFAF6', ink: '#1B2530' };

function svgWrap(viewBox, inner, height) {
  return '<svg viewBox="' + viewBox + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;' + (height ? 'max-height:' + height + 'px;' : '') + '" role="img">' + inner + '</svg>';
}
function sunGlyph(cx, cy, r, color) {
  var rays = '';
  for (var i = 0; i < 8; i++) {
    var a = (i / 8) * Math.PI * 2;
    var x1 = cx + Math.cos(a) * (r + 4), y1 = cy + Math.sin(a) * (r + 4);
    var x2 = cx + Math.cos(a) * (r + 11), y2 = cy + Math.sin(a) * (r + 11);
    rays += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round"/>';
  }
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + color + '"/>' + rays;
}
function labelBelow(x, y, text, weight, size, color) {
  return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="' + (weight || 700) + '" font-size="' + (size || 12) + '" fill="' + (color || '#2B3D4A') + '">' + text + '</text>';
}
function arrowRight(x1, x2, y, color) {
  return '<line x1="' + x1 + '" y1="' + y + '" x2="' + (x2 - 8) + '" y2="' + y + '" stroke="' + color + '" stroke-width="2.5"/>' +
    '<polygon points="' + (x2 - 8) + ',' + (y - 5) + ' ' + x2 + ',' + y + ' ' + (x2 - 8) + ',' + (y + 5) + '" fill="' + color + '"/>';
}

var DIAGRAMS = {};

// ---------- SOLAR: sun -> panel -> inverter -> home -> grid, with net metering credit loop ----------
DIAGRAMS['sol-diagram-solar-works'] = function () {
  var y = 70;
  var inner =
    sunGlyph(50, y, 20, NX.orange) + labelBelow(50, 118, 'Sunlight', 700, 12) +
    arrowRight(80, 132, y, '#B7BEC4') +
    // panel
    '<rect x="140" y="50" width="60" height="40" rx="4" fill="' + NX.charcoal + '"/>' +
    '<line x1="140" y1="63" x2="200" y2="63" stroke="#3E5364"/><line x1="140" y1="77" x2="200" y2="77" stroke="#3E5364"/>' +
    '<line x1="160" y1="50" x2="160" y2="90" stroke="#3E5364"/><line x1="180" y1="50" x2="180" y2="90" stroke="#3E5364"/>' +
    labelBelow(170, 118, 'Solar Panels', 700, 12) +
    arrowRight(208, 262, y, '#B7BEC4') +
    // inverter
    '<rect x="270" y="48" width="44" height="44" rx="8" fill="' + NX.blue + '"/>' +
    '<path d="M292 58 L282 74 L290 74 L286 84 L302 66 L293 66 Z" fill="' + NX.white + '"/>' +
    labelBelow(292, 118, 'Inverter', 700, 12) +
    arrowRight(322, 376, y, '#B7BEC4') +
    // home
    '<polygon points="410,48 442,72 442,92 378,92 378,72" fill="' + NX.orange2 + '"/>' +
    '<rect x="392" y="76" width="16" height="16" fill="' + NX.white + '"/>' +
    labelBelow(410, 118, 'Your Home', 700, 12) +
    // bidirectional to grid
    '<line x1="452" y1="66" x2="512" y2="66" stroke="' + NX.blue + '" stroke-width="2.5"/>' +
    '<polygon points="512,61 522,66 512,71" fill="' + NX.blue + '"/>' +
    '<line x1="452" y1="86" x2="512" y2="86" stroke="' + NX.orange + '" stroke-width="2.5"/>' +
    '<polygon points="452,81 442,86 452,91" fill="' + NX.orange + '"/>' +
    labelBelow(482, 55, 'exports excess →', 600, 10, NX.blue) +
    labelBelow(482, 100, '← draws at night', 600, 10, NX.orange2) +
    // grid pole
    '<line x1="560" y1="40" x2="560" y2="92" stroke="' + NX.charcoal + '" stroke-width="4"/>' +
    '<line x1="540" y1="50" x2="580" y2="50" stroke="' + NX.charcoal + '" stroke-width="4"/>' +
    labelBelow(560, 118, 'Utility Grid', 700, 12) +
    '<rect x="360" y="128" width="220" height="26" rx="13" fill="' + NX.orange + '" opacity="0.16"/>' +
    labelBelow(470, 146, 'Net metering: exported energy earns bill credits used later', 700, 11, '#9A5B00');
  return svgWrap('0 0 620 164', inner);
};

// ---------- SOLAR: main system components on a house cutaway ----------
DIAGRAMS['sol-diagram-components'] = function () {
  var inner =
    // roof + panels
    '<polygon points="70,140 320,30 570,140" fill="none" stroke="' + NX.charcoal + '" stroke-width="3"/>' +
    '<rect x="150" y="80" width="150" height="42" rx="2" fill="' + NX.charcoal + '" transform="rotate(-15 225 101)"/>' +
    // house body
    '<rect x="85" y="140" width="470" height="140" fill="none" stroke="' + NX.charcoal + '" stroke-width="3"/>' +
    // inverter (wall)
    '<rect x="112" y="172" width="30" height="30" rx="4" fill="' + NX.blue + '"/>' + labelBelow(127, 222, '2. Inverter', 700, 11) +
    // electrical panel
    '<rect x="192" y="170" width="26" height="34" rx="3" fill="' + NX.charcoal + '"/>' + labelBelow(205, 222, '3. Elec. Panel', 700, 11) +
    // battery (optional)
    '<rect x="268" y="178" width="34" height="26" rx="4" fill="' + NX.orange + '"/>' + labelBelow(285, 222, '4. Battery*', 700, 11) +
    // meter
    '<circle cx="365" cy="190" r="16" fill="none" stroke="' + NX.blue + '" stroke-width="3"/>' + labelBelow(365, 222, '5. Meter', 700, 11) +
    // monitoring
    '<rect x="428" y="176" width="26" height="20" rx="2" fill="' + NX.charcoal + '"/>' + labelBelow(441, 222, '6. Monitor', 700, 11) +
    // grid connection line off to the right
    '<line x1="503" y1="190" x2="530" y2="190" stroke="' + NX.blue + '" stroke-width="3"/>' +
    '<line x1="530" y1="170" x2="530" y2="210" stroke="' + NX.charcoal + '" stroke-width="4"/>' + labelBelow(530, 250, '7. Grid', 700, 11) +
    labelBelow(320, 18, '1. Solar Panels', 700, 12, NX.orange2) +
    labelBelow(320, 300, '*Battery is optional. All 8 parts are covered in Module 3.', 500, 10, '#7C8A94');
  return svgWrap('0 0 640 315', inner);
};

// ---------- SOLAR: roof-orientation compass for site qualification ----------
DIAGRAMS['sol-diagram-site-compass'] = function () {
  var cx = 130, cy = 130, r = 100;
  function tick(deg, label, best) {
    var a = (deg - 90) * Math.PI / 180;
    var x1 = cx + Math.cos(a) * (r - 14), y1 = cy + Math.sin(a) * (r - 14);
    var x2 = cx + Math.cos(a) * r, y2 = cy + Math.sin(a) * r;
    var lx = cx + Math.cos(a) * (r + 18), ly = cy + Math.sin(a) * (r + 18);
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (best ? NX.orange2 : '#B7BEC4') + '" stroke-width="' + (best ? 5 : 2) + '"/>' +
      labelBelow(lx, ly + 4, label, best ? 800 : 600, best ? 13 : 11, best ? NX.orange2 : '#7C8A94');
  }
  var inner =
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#E4E4DC" stroke-width="2"/>' +
    '<path d="M ' + (cx + Math.cos(Math.PI * (135 - 90) / 180) * r) + ' ' + (cy + Math.sin(Math.PI * (135 - 90) / 180) * r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx + Math.cos(Math.PI * (225 - 90) / 180) * r) + ' ' + (cy + Math.sin(Math.PI * (225 - 90) / 180) * r) + ' L ' + cx + ' ' + cy + ' Z" fill="' + NX.orange + '" opacity="0.14"/>' +
    tick(0, 'N', false) + tick(45, 'NE', false) + tick(90, 'E', false) + tick(135, 'SE', true) + tick(180, 'S', true) + tick(225, 'SW', true) + tick(270, 'W', false) + tick(315, 'NW', false) +
    '<polygon points="' + cx + ',' + (cy - 34) + ' ' + (cx - 8) + ',' + (cy - 18) + ' ' + (cx + 8) + ',' + (cy - 18) + '" fill="' + NX.charcoal + '"/>' +
    '<rect x="' + (cx - 30) + '" y="' + (cy - 16) + '" width="60" height="34" fill="' + NX.charcoal + '"/>' +
    labelBelow(cx, cy + 60, 'roof', 700, 12, NX.white);
  return svgWrap('-20 -10 300 280', inner, 260);
};

// ---------- HVAC: refrigeration cycle loop ----------
DIAGRAMS['hv-diagram-cycle'] = function () {
  var inner =
    '<rect x="30" y="30" width="120" height="60" rx="6" fill="' + NX.blue + '"/>' + labelBelow(90, 110, 'Outdoor Coil', 700, 12) + labelBelow(90, 126, '(absorbs heat)', 500, 10, '#7C8A94') +
    '<rect x="220" y="30" width="90" height="60" rx="30" fill="' + NX.charcoal + '"/>' + labelBelow(265, 110, 'Compressor', 700, 12) +
    '<rect x="380" y="30" width="120" height="60" rx="6" fill="' + NX.orange2 + '"/>' + labelBelow(440, 110, 'Indoor Coil', 700, 12) + labelBelow(440, 126, '(releases heat)', 500, 10, '#7C8A94') +
    '<rect x="220" y="150" width="90" height="40" rx="6" fill="' + NX.blue + '" opacity="0.7"/>' + labelBelow(265, 210, 'Expansion Valve', 700, 12) +
    arrowRight(150, 220, 60, NX.charcoal) + arrowRight(310, 380, 60, NX.orange2) +
    '<line x1="440" y1="90" x2="440" y2="170" stroke="' + NX.orange2 + '" stroke-width="2.5"/><line x1="440" y1="170" x2="310" y2="170" stroke="' + NX.orange2 + '" stroke-width="2.5"/>' +
    '<polygon points="316,165 306,170 316,175" fill="' + NX.orange2 + '"/>' +
    '<line x1="90" y1="90" x2="90" y2="170" stroke="' + NX.blue + '" stroke-width="2.5"/><line x1="90" y1="170" x2="220" y2="170" stroke="' + NX.blue + '" stroke-width="2.5"/>' +
    '<polygon points="214,165 224,170 214,175" fill="' + NX.blue + '"/>' +
    labelBelow(265, 240, 'Heat is transferred, not created — refrigerant moves it around this closed loop.', 600, 11, '#7C8A94');
  return svgWrap('0 0 530 250', inner);
};

// ---------- HVAC: outdoor + indoor unit anatomy ----------
DIAGRAMS['hv-diagram-anatomy'] = function () {
  var inner =
    // 1. indoor air handler (wall head)
    '<rect x="30" y="40" width="150" height="30" rx="7" fill="' + NX.blue + '"/>' +
    '<line x1="46" y1="55" x2="150" y2="55" stroke="' + NX.white + '" stroke-width="2" stroke-dasharray="2 4"/>' +
    labelBelow(105, 92, '1. Indoor Air Handler', 700, 12.5) +
    labelBelow(105, 107, '(wall / floor / cassette / ducted)', 500, 9.5, '#7C8A94') +
    // 3. line set connecting indoor to outdoor (drawn between the two, label sits in the gap)
    '<path d="M180 55 L215 55 L215 130 L260 130" fill="none" stroke="' + NX.orange2 + '" stroke-width="3"/>' +
    labelBelow(228, 178, '3. Line Set +', 700, 11.5, NX.orange2) +
    labelBelow(228, 192, 'Drain', 700, 11.5, NX.orange2) +
    // 2. outdoor condenser
    '<rect x="260" y="95" width="130" height="70" rx="6" fill="' + NX.charcoal + '"/>' +
    '<line x1="274" y1="110" x2="274" y2="150" stroke="' + NX.white + '" stroke-width="2"/>' +
    '<line x1="290" y1="110" x2="290" y2="150" stroke="' + NX.white + '" stroke-width="2"/>' +
    '<circle cx="345" cy="130" r="19" fill="none" stroke="' + NX.white + '" stroke-width="3"/>' +
    '<rect x="255" y="165" width="140" height="7" fill="' + NX.ink + '" opacity="0.6"/>' +
    labelBelow(325, 195, '2. Outdoor Condenser', 700, 12.5) +
    // 4. electrical + controls
    '<rect x="440" y="105" width="70" height="50" rx="6" fill="' + NX.orange + '"/>' +
    '<line x1="460" y1="120" x2="460" y2="140" stroke="#241500" stroke-width="3"/>' +
    '<line x1="475" y1="120" x2="475" y2="140" stroke="#241500" stroke-width="3"/>' +
    '<line x1="490" y1="120" x2="490" y2="140" stroke="#241500" stroke-width="3"/>' +
    labelBelow(475, 92, '4. Electrical', 700, 11.5) +
    labelBelow(475, 178, '+ Controls', 700, 11.5) +
    '<line x1="392" y1="128" x2="438" y2="128" stroke="#B7BEC4" stroke-width="2" stroke-dasharray="3 3"/>';
  return svgWrap('0 0 560 210', inner);
};

// ---------- HVAC: comfort zoning — open ranch vs. colonial ----------
DIAGRAMS['hv-diagram-zoning'] = function () {
  function head(x, y) { return '<rect x="' + x + '" y="' + y + '" width="14" height="8" rx="2" fill="' + NX.blue + '"/>'; }
  var inner =
    // ranch (open plan, fewer heads)
    '<rect x="10" y="10" width="220" height="150" fill="none" stroke="' + NX.charcoal + '" stroke-width="2.5"/>' +
    '<line x1="150" y1="10" x2="150" y2="90" stroke="#B7BEC4" stroke-width="1.5" stroke-dasharray="4 3"/>' +
    head(60, 20) + head(180, 20) +
    labelBelow(120, 185, 'Open Ranch — fewer, larger zones', 700, 12) +
    labelBelow(120, 200, 'air moves freely through open living areas', 500, 10, '#7C8A94') +
    // colonial (closed rooms, more heads)
    '<rect x="270" y="10" width="220" height="150" fill="none" stroke="' + NX.charcoal + '" stroke-width="2.5"/>' +
    '<line x1="380" y1="10" x2="380" y2="160" stroke="' + NX.charcoal + '" stroke-width="2"/>' +
    '<line x1="270" y1="85" x2="380" y2="85" stroke="' + NX.charcoal + '" stroke-width="2"/>' +
    '<line x1="380" y1="60" x2="490" y2="60" stroke="' + NX.charcoal + '" stroke-width="2"/>' +
    head(300, 20) + head(300, 100) + head(410, 20) + head(410, 90) +
    labelBelow(380, 185, 'Colonial — more zones', 700, 12) +
    labelBelow(380, 200, 'closed bedrooms & stairs break up airflow', 500, 10, '#7C8A94');
  return svgWrap('0 0 500 215', inner);
};

// ---------- ENERGY ADVISOR: whole-home problem map ----------
DIAGRAMS['ea-diagram-problem-map'] = function () {
  var problems = ['Energy\nProblem', 'Comfort\nProblem', 'Envelope\nProblem', 'Roof\nProblem', 'Electrical\nCapacity', 'Energy Cost\nProblem'];
  var cx = 260, cy = 150, r = 118;
  var nodes = '';
  problems.forEach(function (p, i) {
    var a = (i / problems.length) * Math.PI * 2 - Math.PI / 2;
    var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    var lines = p.split('\n');
    nodes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '" stroke="#E4E4DC" stroke-width="2"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="34" fill="' + (i % 2 === 0 ? NX.charcoal : NX.blue) + '"/>' +
      labelBelow(x, y - 2, lines[0], 700, 10.5, NX.white) + labelBelow(x, y + 12, lines[1] || '', 700, 10.5, NX.white);
  });
  var inner =
    nodes +
    '<circle cx="' + cx + '" cy="' + cy + '" r="46" fill="' + NX.orange + '"/>' +
    labelBelow(cx, cy - 4, 'The', 700, 12, '#241500') + labelBelow(cx, cy + 14, 'Customer', 800, 13, '#241500');
  return svgWrap('0 0 520 300', inner, 300);
};

// ---------- ENERGY ADVISOR: phased home energy roadmap ----------
DIAGRAMS['ea-diagram-roadmap'] = function () {
  var phases = [['Phase 1', 'Energy Assessment +', 'Weatherization', NX.blue], ['Phase 2', 'Heat Pump', 'Installation', NX.charcoal], ['Phase 3', 'Solar', '', NX.orange2], ['Phase 4', 'Battery /', 'EV Charger', NX.orange]];
  var w = 130, gap = 20, x = 10, y = 30, h = 110;
  var inner = '';
  phases.forEach(function (p, i) {
    inner += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="' + p[3] + '"/>' +
      labelBelow(x + w / 2, y + 30, p[0], 800, 13, NX.white) +
      labelBelow(x + w / 2, y + 55, p[1], 600, 11.5, NX.white) +
      labelBelow(x + w / 2, y + 72, p[2], 600, 11.5, NX.white);
    if (i < phases.length - 1) {
      inner += arrowRight(x + w + 4, x + w + gap - 4, y + h / 2, '#B7BEC4');
    }
    x += w + gap;
  });
  return svgWrap('0 0 620 160', inner);
};

window.DIAGRAMS = DIAGRAMS;
