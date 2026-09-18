// Official NEXIS wordmark, cropped from the Nexis Power brand kit (brand-kit.png / brand-kit-white.png).
// `light: true` selects the white-on-transparent variant for dark surfaces (top nav, dark hero panels).
function nexisLogoSVG(opts) {
  opts = opts || {};
  var light = !!opts.light;
  var h = opts.height || 26;
  var src = 'assets/' + (light ? 'nexis-logo-white.png' : 'nexis-logo.png');
  var w = Math.round(h * (626 / 272));
  return '<img src="' + src + '" alt="Nexis Power" height="' + h + '" width="' + w + '" style="height:' + h + 'px;width:auto;display:block;">';
}

// Small sun/energy mark used as favicon-ish accent and loading states
function nexisMarkSVG(size) {
  size = size || 22;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none">' +
    '<circle cx="12" cy="12" r="11" fill="url(#markGrad)"/>' +
    '<defs><radialGradient id="markGrad" cx="35%" cy="30%" r="75%">' +
      '<stop offset="0%" stop-color="#FFD37A"/><stop offset="55%" stop-color="#FFA501"/><stop offset="100%" stop-color="#FF8501"/>' +
    '</radialGradient></defs></svg>';
}
