// NEXIS wordmark, recreated as inline SVG to match the brand manual (black "NEXIS" wordmark
// with an orange circle accent behind the "I"). Used everywhere instead of a raster asset.
function nexisLogoSVG(opts) {
  opts = opts || {};
  var light = !!opts.light; // white wordmark for dark backgrounds
  var h = opts.height || 26;
  var fill = light ? '#FFFFFF' : '#161616';
  return (
    '<svg class="nexis-logo-svg" height="' + h + '" viewBox="0 0 172 40" xmlns="http://www.w3.org/2000/svg" aria-label="Nexis Power">' +
      '<defs><radialGradient id="nexisGlow" cx="35%" cy="30%" r="75%">' +
        '<stop offset="0%" stop-color="#FFD37A"/><stop offset="55%" stop-color="#FFA501"/><stop offset="100%" stop-color="#FF8501"/>' +
      '</radialGradient></defs>' +
      '<text x="4" y="29" font-family="Sora, Arial, sans-serif" font-weight="800" font-size="28" letter-spacing="-0.5" fill="' + fill + '">N</text>' +
      '<text x="29" y="29" font-family="Sora, Arial, sans-serif" font-weight="800" font-size="28" letter-spacing="-0.5" fill="' + fill + '">E</text>' +
      '<circle cx="76" cy="20" r="17" fill="url(#nexisGlow)"/>' +
      '<text x="98" y="29" font-family="Sora, Arial, sans-serif" font-weight="800" font-size="28" letter-spacing="-0.5" fill="' + fill + '">I</text>' +
      '<text x="107" y="29" font-family="Sora, Arial, sans-serif" font-weight="800" font-size="28" letter-spacing="-0.5" fill="' + fill + '">S</text>' +
    '</svg>'
  );
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
