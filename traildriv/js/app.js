(() => {
'use strict';

/* ======================================================================
   Traildriv — nearby activity finder
   Data source: OpenStreetMap via the public Overpass API (no key needed).
   ====================================================================== */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const NEARBY_FACT_RADIUS = 400; // meters, used for restrooms/picnic/sports lookups around a place

const GOOGLE_API_KEY = (window.TRAILDRIV_CONFIG && window.TRAILDRIV_CONFIG.googleMapsApiKey) || '';
const WIKIMEDIA_COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

// Every subquery below requires a "name" tag. This is deliberate: it cuts
// the amount of data Overpass has to return (the #1 cause of slow loads),
// and it means every result the app shows has an actual name instead of a
// generic "Unnamed X" placeholder.
const CATEGORIES = {
  playground: {
    label: 'Playgrounds', icon: '🛝', color: '#f39c12',
    query: (r, lat, lon) => `
      node["leisure"="playground"]["name"](around:${r},${lat},${lon});
      way["leisure"="playground"]["name"](around:${r},${lat},${lon});`
  },
  hiking: {
    label: 'Hiking Trails', icon: '🥾', color: '#8e44ad',
    // Route relations are deliberately excluded: Overpass has to resolve
    // every member way of a relation to test it against the radius, which
    // is by far the slowest kind of query it runs — a bad trade for trails
    // that can span whole regions well beyond "nearby" anyway.
    query: (r, lat, lon) => `
      node["information"="trailhead"]["name"](around:${r},${lat},${lon});
      way["highway"="path"]["name"](around:${r},${lat},${lon});`
  },
  fishing: {
    label: 'Fishing Spots', icon: '🎣', color: '#2980b9',
    query: (r, lat, lon) => `
      node["leisure"="fishing"]["name"](around:${r},${lat},${lon});
      way["leisure"="fishing"]["name"](around:${r},${lat},${lon});`
  },
  biking: {
    label: 'Bike Trails', icon: '🚴', color: '#16a085',
    // Same reasoning as hiking above: no route relations, way-level tags
    // only (much cheaper for Overpass to evaluate).
    query: (r, lat, lon) => `
      way["route"="mtb"]["name"](around:${r},${lat},${lon});
      way["highway"="cycleway"]["name"](around:${r},${lat},${lon});`
  },
  lakes: {
    label: 'Lakes', icon: '🏞️', color: '#2c7fb8',
    query: (r, lat, lon) => `
      way["natural"="water"]["name"](around:${r},${lat},${lon});
      relation["natural"="water"]["name"](around:${r},${lat},${lon});`
  },
  restaurants: {
    label: 'Restaurants', icon: '🍽️', color: '#e74c3c',
    query: (r, lat, lon) => `
      node["amenity"="restaurant"]["name"](around:${r},${lat},${lon});`
  },
  dancing: {
    label: 'Dance Clubs', icon: '💃', color: '#d35400',
    query: (r, lat, lon) => `
      node["amenity"="nightclub"]["name"](around:${r},${lat},${lon});`
  },
  massage: {
    label: 'Massage & Spa', icon: '💆', color: '#27ae60',
    query: (r, lat, lon) => `
      node["shop"="massage"]["name"](around:${r},${lat},${lon});
      node["amenity"="spa"]["name"](around:${r},${lat},${lon});
      node["leisure"="spa"]["name"](around:${r},${lat},${lon});`
  }
};

/* ---------------------------------------------------------------------
   State
   --------------------------------------------------------------------- */
const state = {
  userLocation: null,        // {lat, lon, label}
  radius: 3000, // small default on purpose — query cost on the free Overpass service scales with area (radius squared)
  activeCategories: new Set(), // empty until the visitor picks categories
  places: [],                 // all fetched places
  favorites: loadFavorites(),
  showFavoritesOnly: false,
  sort: 'distance',
  activeId: null
};

/* ---------------------------------------------------------------------
   DOM refs
   --------------------------------------------------------------------- */
const el = {
  categoryBar: document.getElementById('categoryBar'),
  catAllBtn: document.getElementById('catAllBtn'),
  statusStrip: document.getElementById('statusStrip'),
  resultsCount: document.getElementById('resultsCount'),
  resultsList: document.getElementById('resultsList'),
  locateBtn: document.getElementById('locateBtn'),
  radiusSelect: document.getElementById('radiusSelect'),
  sortSelect: document.getElementById('sortSelect'),
  favoritesToggle: document.getElementById('favoritesToggle'),
  searchForm: document.getElementById('searchForm'),
  searchInput: document.getElementById('searchInput'),
  detailOverlay: document.getElementById('detailOverlay'),
  detailDrawer: document.getElementById('detailDrawer'),
  detailContent: document.getElementById('detailContent'),
  detailClose: document.getElementById('detailClose'),
  factTemplate: document.getElementById('factTemplate')
};

/* ---------------------------------------------------------------------
   Map setup
   --------------------------------------------------------------------- */
const map = L.map('map', { zoomControl: true }).setView([39.5, -98.35], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let userMarker = null;
let radiusCircle = null;
const placeMarkers = new Map(); // id -> marker

function pinIcon(color, glyph, big) {
  return L.divIcon({
    className: 'leaflet-div-icon',
    html: `<div class="marker-pin${big ? ' user' : ''}" style="background:${color}"><span>${glyph}</span></div>`,
    iconSize: big ? [34, 34] : [30, 30],
    iconAnchor: big ? [17, 34] : [15, 30],
    popupAnchor: [0, -28]
  });
}

/* ---------------------------------------------------------------------
   Utilities
   --------------------------------------------------------------------- */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters) {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

function elementCoords(elm) {
  if (elm.type === 'node') return { lat: elm.lat, lon: elm.lon };
  if (elm.center) return { lat: elm.center.lat, lon: elm.center.lon };
  return null;
}

function placeName(tags, categoryLabel) {
  return tags.name || tags['name:en'] || `Unnamed ${categoryLabel.replace(/s$/, '')}`;
}

function setStatus(message, type) {
  if (!message) { el.statusStrip.hidden = true; return; }
  el.statusStrip.hidden = false;
  el.statusStrip.textContent = message;
  el.statusStrip.className = 'status-strip' + (type ? ` ${type}` : '');
}

function loadFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem('traildriv_favorites') || '[]')); }
  catch (e) { return new Set(); }
}
function saveFavorites() {
  try { localStorage.setItem('traildriv_favorites', JSON.stringify([...state.favorites])); }
  catch (e) { /* storage unavailable, ignore */ }
}

/* ---------------------------------------------------------------------
   Overpass fetch with endpoint fallback
   --------------------------------------------------------------------- */
async function runOverpassQuery(body, timeoutMs = 22000) {
  let lastErr;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const t0 = performance.now();
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(body),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      console.log(`[Traildriv] ${endpoint} responded in ${Math.round(performance.now() - t0)}ms with ${(json.elements || []).length} elements`);
      return json;
    } catch (err) {
      clearTimeout(timer);
      console.log(`[Traildriv] ${endpoint} failed after ${Math.round(performance.now() - t0)}ms (${err.name === 'AbortError' ? 'timed out' : err.message}) — trying next endpoint if any`);
      lastErr = err;
    }
  }
  throw lastErr || new Error('All Overpass endpoints failed');
}

/* ---------------------------------------------------------------------
   Category chips
   --------------------------------------------------------------------- */
function buildCategoryBar() {
  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    const btn = document.createElement('button');
    btn.dataset.cat = key;
    btn.dataset.active = state.activeCategories.has(key) ? 'true' : 'false';
    btn.innerHTML = `<span>${cat.icon}</span><span>${cat.label}</span>`;
    btn.addEventListener('click', () => toggleCategory(key));
    el.categoryBar.appendChild(btn);
  });
  syncAllButton();
}

function syncAllButton() {
  el.catAllBtn.dataset.active = state.activeCategories.size === Object.keys(CATEGORIES).length ? 'true' : 'false';
}

function toggleCategory(key) {
  if (state.activeCategories.has(key)) state.activeCategories.delete(key);
  else state.activeCategories.add(key);
  if (state.activeCategories.size === 0) state.activeCategories.add(key); // keep at least one
  refreshCategoryButtons();
  if (state.userLocation) fetchPlaces();
}

function refreshCategoryButtons() {
  el.categoryBar.querySelectorAll('button[data-cat]').forEach(btn => {
    btn.dataset.active = state.activeCategories.has(btn.dataset.cat) ? 'true' : 'false';
  });
  syncAllButton();
}

el.catAllBtn.addEventListener('click', () => {
  const allOn = state.activeCategories.size === Object.keys(CATEGORIES).length;
  state.activeCategories = new Set(allOn ? [Object.keys(CATEGORIES)[0]] : Object.keys(CATEGORIES));
  refreshCategoryButtons();
  if (state.userLocation) fetchPlaces();
});

/* ---------------------------------------------------------------------
   Fetching places
   --------------------------------------------------------------------- */
async function fetchPlaces() {
  if (!state.userLocation) return;
  if (state.activeCategories.size === 0) { renderCategoryPrompt(); return; }
  const { lat, lon } = state.userLocation;
  const r = state.radius;
  const searchStart = performance.now();
  console.log(`[Traildriv] Search started — categories: ${[...state.activeCategories].join(', ')}, radius: ${r}m`);

  setStatus('Searching nearby places…', 'info');
  renderSkeletons();

  // Overpass is a free, shared public service — response time depends on
  // how busy it is right now, not just on this query. Let the visitor know
  // it hasn't stalled if it's taking a while.
  const slowNotice = setTimeout(() => {
    setStatus('Still searching… the map data service is shared and can be slow at busy times.', 'info');
  }, 7000);

  // One combined request for every selected category, instead of one
  // request per category: the public Overpass server throttles concurrent
  // queries per client, so firing several at once mostly queued them
  // serially anyway — a single larger query is faster in practice and
  // easier on the shared server.
  const categories = [...state.activeCategories];
  const combinedQuery = categories.map(key => CATEGORIES[key].query(r, lat, lon)).join('\n');
  const body = `[out:json][timeout:25];(${combinedQuery});out center tags;`;

  let data = null;
  let failed = false;
  try {
    data = await runOverpassQuery(body, 20000);
  } catch (err) {
    failed = true;
  } finally {
    clearTimeout(slowNotice);
  }

  const places = [];
  const seen = new Set();

  (data && data.elements ? data.elements : []).forEach(elm => {
    const coords = elementCoords(elm);
    if (!coords || !elm.tags || !elm.tags.name) return;
    const catKey = categorizeElement(elm.tags);
    if (!catKey || !state.activeCategories.has(catKey)) return;
    const dedupeKey = `${elm.type}/${elm.id}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    const dist = haversine(lat, lon, coords.lat, coords.lon);
    places.push({
      id: dedupeKey,
      catKey,
      cat: CATEGORIES[catKey],
      name: placeName(elm.tags, CATEGORIES[catKey].label),
      tags: elm.tags,
      lat: coords.lat,
      lon: coords.lon,
      distance: dist
    });
  });

  state.places = places;
  setStatus(failed ? 'Could not reach the map data service right now. Please try again in a moment.' : '', failed ? 'error' : undefined);
  console.log(`[Traildriv] Search finished in ${Math.round(performance.now() - searchStart)}ms — ${places.length} place(s) shown${failed ? ' (request failed)' : ''}`);

  renderResults();
  renderMapMarkers();
}

// Mirrors the tag combinations used in CATEGORIES' queries above (kept in
// sync with them) to attribute a combined query's results back to the
// category each element actually matches.
function categorizeElement(tags) {
  if (tags.leisure === 'playground') return 'playground';
  if (tags.information === 'trailhead' || tags.highway === 'path' || tags.route === 'hiking') return 'hiking';
  if (tags.leisure === 'fishing') return 'fishing';
  if (tags.route === 'mtb' || tags.highway === 'cycleway' || tags.route === 'bicycle') return 'biking';
  if (tags.natural === 'water') return 'lakes';
  if (tags.amenity === 'restaurant') return 'restaurants';
  if (tags.amenity === 'nightclub') return 'dancing';
  if (tags.shop === 'massage' || tags.amenity === 'spa' || tags.leisure === 'spa') return 'massage';
  return null;
}

/* ---------------------------------------------------------------------
   Rendering: results list
   --------------------------------------------------------------------- */
function renderCategoryPrompt() {
  el.resultsCount.textContent = 'Choose a category above';
  el.resultsList.innerHTML = `
    <div class="empty-state">
      <h3>What are you looking for?</h3>
      <p>Pick one or more categories above — playgrounds, hiking trails, restaurants and more — to see what's nearby.</p>
    </div>
  `;
  renderMapMarkers();
}

function renderSkeletons() {
  el.resultsList.innerHTML = '';
  el.resultsCount.textContent = 'Loading…';
  for (let i = 0; i < 5; i++) {
    const s = document.createElement('div');
    s.className = 'skeleton';
    el.resultsList.appendChild(s);
  }
}

function getFilteredSortedPlaces() {
  let list = state.places;
  if (state.showFavoritesOnly) list = list.filter(p => state.favorites.has(p.id));
  list = [...list];
  if (state.sort === 'distance') list.sort((a, b) => a.distance - b.distance);
  else list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function renderResults() {
  if (state.activeCategories.size === 0) {
    renderCategoryPrompt();
    return;
  }

  const list = getFilteredSortedPlaces();
  el.resultsCount.textContent = list.length
    ? `${list.length} place${list.length === 1 ? '' : 's'} found`
    : 'No places found';
  el.resultsList.innerHTML = '';

  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = state.showFavoritesOnly
      ? `<h3>No favorites yet</h3><p>Tap the star on a place to save it here.</p>`
      : `<h3>Nothing nearby</h3><p>Try a larger radius or a different category.</p>`;
    el.resultsList.appendChild(empty);
    return;
  }

  const frag = document.createDocumentFragment();
  list.forEach(place => frag.appendChild(buildPlaceCard(place)));
  el.resultsList.appendChild(frag);
}

function buildPlaceCard(place) {
  const card = document.createElement('div');
  card.className = 'place-card' + (place.id === state.activeId ? ' active' : '');
  card.dataset.id = place.id;

  const isFav = state.favorites.has(place.id);
  const badges = quickBadges(place);

  card.innerHTML = `
    <button class="fav-btn ${isFav ? 'active' : ''}" aria-label="Toggle favorite">${isFav ? '★' : '☆'}</button>
    <div class="place-card-top">
      <div class="place-icon" style="background:${place.cat.color}">${place.cat.icon}</div>
      <div class="place-info">
        <p class="place-name">${escapeHtml(place.name)}</p>
        <p class="place-cat">${place.cat.label}</p>
      </div>
      <div class="place-dist">${formatDistance(place.distance)}</div>
    </div>
    ${badges.length ? `<div class="place-tags">${badges.map(b => `<span class="place-tag">${b}</span>`).join('')}</div>` : ''}
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.fav-btn')) return;
    openDetail(place);
  });
  card.querySelector('.fav-btn').addEventListener('click', () => {
    toggleFavorite(place.id);
  });

  return card;
}

function quickBadges(place) {
  const t = place.tags;
  const badges = [];
  if (t.fee === 'no') badges.push('Free');
  else if (t.fee === 'yes') badges.push('Fee required');
  if (t.sac_scale) badges.push(`Difficulty: ${humanizeSacScale(t.sac_scale)}`);
  if (t.outdoor_seating === 'yes') badges.push('Outdoor seating');
  if (t.cuisine) badges.push(capitalize(t.cuisine.split(';')[0].replace(/_/g, ' ')));
  if (t.wheelchair === 'yes') badges.push('Wheelchair accessible');
  return badges.slice(0, 3);
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  saveFavorites();
  renderResults();
}

/* ---------------------------------------------------------------------
   Rendering: map markers
   --------------------------------------------------------------------- */
function renderMapMarkers() {
  placeMarkers.forEach(m => map.removeLayer(m));
  placeMarkers.clear();

  state.places.forEach(place => {
    const marker = L.marker([place.lat, place.lon], { icon: pinIcon(place.cat.color, place.cat.icon) });
    marker.addTo(map);
    marker.bindTooltip(place.name, { direction: 'top', offset: [0, -26] });
    marker.on('click', () => openDetail(place));
    placeMarkers.set(place.id, marker);
  });
}

function focusPlaceOnMap(place) {
  map.panTo([place.lat, place.lon]);
  const marker = placeMarkers.get(place.id);
  if (marker) marker.openTooltip();
}

/* ---------------------------------------------------------------------
   Detail drawer
   --------------------------------------------------------------------- */
async function openDetail(place) {
  state.activeId = place.id;
  document.querySelectorAll('.place-card').forEach(c => c.classList.toggle('active', c.dataset.id === place.id));

  el.detailOverlay.hidden = false;
  el.detailDrawer.hidden = false;
  el.detailDrawer.setAttribute('aria-hidden', 'false');

  // The drawer taking up layout space resizes the map container (desktop)
  // or covers it (mobile) — either way Leaflet needs to recompute its size
  // before we pan, so the selected place lands in the still-visible area.
  requestAnimationFrame(() => {
    map.invalidateSize();
    focusPlaceOnMap(place);
  });

  let nearby = null;
  let media = null;
  const isStillOpen = () => state.activeId === place.id;

  renderDetailBase(place, nearby, media);

  fetchNearbyFacts(place.lat, place.lon)
    .then(r => { nearby = r; })
    .catch(() => { nearby = 'error'; })
    .then(() => { if (isStillOpen()) renderDetailBase(place, nearby, media); });

  fetchPlaceMedia(place)
    .then(r => { media = r; })
    .catch(() => { media = 'error'; })
    .then(() => { if (isStillOpen()) renderDetailBase(place, nearby, media); });
}

function closeDetail() {
  el.detailOverlay.hidden = true;
  el.detailDrawer.hidden = true;
  el.detailDrawer.setAttribute('aria-hidden', 'true');
  state.activeId = null;
  document.querySelectorAll('.place-card.active').forEach(c => c.classList.remove('active'));
  requestAnimationFrame(() => map.invalidateSize());
}
el.detailClose.addEventListener('click', closeDetail);
el.detailOverlay.addEventListener('click', closeDetail);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

async function fetchNearbyFacts(lat, lon) {
  const r = NEARBY_FACT_RADIUS;
  const body = `[out:json][timeout:20];(
    node["amenity"="toilets"](around:${r},${lat},${lon});
    node["leisure"="picnic_table"](around:${r},${lat},${lon});
    way["leisure"="picnic_table"](around:${r},${lat},${lon});
    node["tourism"="picnic_site"](around:${r},${lat},${lon});
    node["leisure"="pitch"]["sport"](around:${r},${lat},${lon});
    way["leisure"="pitch"]["sport"](around:${r},${lat},${lon});
    node["leisure"="swimming_area"](around:${r},${lat},${lon});
    way["leisure"="swimming_area"](around:${r},${lat},${lon});
    node["natural"="beach"](around:${r},${lat},${lon});
    way["natural"="beach"](around:${r},${lat},${lon});
    node["amenity"="drinking_water"](around:${r},${lat},${lon});
    way["natural"="wood"](around:${r},${lat},${lon});
    way["leisure"="park"]["shade"="yes"](around:${r},${lat},${lon});
  );out center tags;`;

  const data = await runOverpassQuery(body, 18000);
  const elements = data.elements || [];

  const sports = new Set();
  let toilets = 0, picnic = 0, swimming = false, beach = false, drinkingWater = false, shade = false;

  elements.forEach(elm => {
    const t = elm.tags || {};
    if (t.amenity === 'toilets') toilets++;
    if (t.leisure === 'picnic_table' || t.tourism === 'picnic_site') picnic++;
    if (t.leisure === 'pitch' && t.sport) sports.add(t.sport);
    if (t.leisure === 'swimming_area') swimming = true;
    if (t.natural === 'beach') beach = true;
    if (t.amenity === 'drinking_water') drinkingWater = true;
    if (t.natural === 'wood' || t.shade === 'yes') shade = true;
  });

  return { toilets, picnic, sports: [...sports], swimming, beach, drinkingWater, shade };
}

function renderDetailBase(place, nearby, media) {
  const t = place.tags;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`;
  const mapsUrl = `https://www.openstreetmap.org/${place.id}`;

  const facts = buildFacts(place, nearby);
  const isFav = state.favorites.has(place.id);

  el.detailContent.innerHTML = `
    <div class="detail-header">
      <span class="detail-cat-badge">${place.cat.icon} ${place.cat.label}</span>
      <h2 class="detail-title">${escapeHtml(place.name)}</h2>
      <p class="detail-sub">${formatDistance(place.distance)} away${t['addr:street'] ? ' · ' + escapeHtml(addressLine(t)) : ''}</p>
    </div>
    ${renderPhotosSection(place, media)}
    <div class="detail-actions">
      <a class="primary" href="${directionsUrl}" target="_blank" rel="noopener">↗ Directions</a>
      <a href="${mapsUrl}" target="_blank" rel="noopener">View on map</a>
      <button id="favBtnDetail">${isFav ? '★ Saved' : '☆ Save'}</button>
    </div>
    <div class="detail-section-title">Details</div>
    <div class="fact-grid" id="factGrid"></div>
    ${nearby === null ? `<div class="loader"><span class="spinner"></span> Checking nearby amenities…</div>` : ''}
    ${nearby === 'error' ? `<p class="detail-note">Could not load extra amenity info for this spot right now.</p>` : ''}
    <div class="detail-section-title">Reviews</div>
    ${renderReviewsSection(media)}
    <p class="detail-note">Details are sourced from OpenStreetMap community data. Some fields may be missing or out of date — please verify on site, especially fees and hours.</p>
  `;

  const grid = document.getElementById('factGrid');
  facts.forEach(f => grid.appendChild(buildFactEl(f)));

  document.getElementById('favBtnDetail').addEventListener('click', () => {
    toggleFavorite(place.id);
    renderDetailBase(place, nearby, media);
  });
}

/* ---------------------------------------------------------------------
   Photos & reviews (Google Places, with free Wikimedia Commons fallback
   for photos when OpenStreetMap links the place to Wikidata/Commons)
   --------------------------------------------------------------------- */
let googleMapsPromise = null;
let placesService = null;

function ensureGoogleMaps() {
  if (!GOOGLE_API_KEY) return Promise.resolve(false);
  if (window.google && window.google.maps && window.google.maps.places) return Promise.resolve(true);
  if (googleMapsPromise) return googleMapsPromise;
  googleMapsPromise = new Promise(resolve => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_API_KEY)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

function getPlacesService() {
  if (!placesService) placesService = new google.maps.places.PlacesService(document.createElement('div'));
  return placesService;
}

function findGooglePlaceId(place) {
  return new Promise(resolve => {
    const service = getPlacesService();
    service.findPlaceFromQuery({
      query: place.name,
      fields: ['place_id'],
      locationBias: new google.maps.Circle({ center: { lat: place.lat, lng: place.lon }, radius: 300 })
    }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) resolve(results[0].place_id);
      else resolve(null);
    });
  });
}

function getGooglePlaceDetails(placeId) {
  return new Promise(resolve => {
    const service = getPlacesService();
    service.getDetails({
      placeId,
      fields: ['rating', 'user_ratings_total', 'reviews', 'photos', 'url']
    }, (result, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && result) resolve(result);
      else resolve(null);
    });
  });
}

async function fetchGoogleEnrichment(place) {
  if (!GOOGLE_API_KEY) return { enabled: false, found: false };

  const cacheKey = `traildriv_google_${place.id}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) { /* storage unavailable, ignore */ }

  const ready = await ensureGoogleMaps();
  if (!ready || !window.google || !window.google.maps || !window.google.maps.places) {
    return { enabled: true, found: false };
  }

  const placeId = await findGooglePlaceId(place);
  if (!placeId) {
    const result = { enabled: true, found: false };
    try { sessionStorage.setItem(cacheKey, JSON.stringify(result)); } catch (e) { /* ignore */ }
    return result;
  }

  const details = await getGooglePlaceDetails(placeId);
  if (!details) return { enabled: true, found: false };

  const photos = (details.photos || []).slice(0, 6).map(p => {
    try { return { url: p.getUrl({ maxWidth: 640 }) }; }
    catch (e) { return null; }
  }).filter(Boolean);

  const reviews = (details.reviews || []).slice(0, 5).map(r => ({
    author: r.author_name,
    authorPhoto: r.profile_photo_url,
    authorUrl: r.author_url,
    rating: r.rating,
    time: r.relative_time_description,
    text: r.text
  }));

  const result = {
    enabled: true,
    found: true,
    rating: details.rating || null,
    totalRatings: details.user_ratings_total || 0,
    reviews,
    photos,
    mapsUrl: details.url || null
  };
  try { sessionStorage.setItem(cacheKey, JSON.stringify(result)); } catch (e) { /* ignore */ }
  return result;
}

async function fetchWikimediaPhoto(tags) {
  try {
    let filename = null;
    if (tags.wikimedia_commons) {
      if (tags.wikimedia_commons.startsWith('File:')) {
        filename = tags.wikimedia_commons.slice('File:'.length);
      } else if (tags.wikimedia_commons.startsWith('Category:')) {
        filename = await firstFileInCommonsCategory(tags.wikimedia_commons);
      }
    }
    if (!filename && tags.wikidata) {
      filename = await wikidataImageFilename(tags.wikidata);
    }
    return filename ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=640` : null;
  } catch (e) {
    return null;
  }
}

async function firstFileInCommonsCategory(category) {
  const url = `${WIKIMEDIA_COMMONS_API}?action=query&list=categorymembers&cmtitle=${encodeURIComponent(category)}&cmtype=file&cmlimit=1&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  const member = data && data.query && data.query.categorymembers && data.query.categorymembers[0];
  return member ? member.title.replace(/^File:/, '') : null;
}

async function wikidataImageFilename(qid) {
  const url = `${WIKIDATA_API}?action=wbgetclaims&entity=${encodeURIComponent(qid)}&property=P18&format=json&origin=*`;
  const res = await fetch(url);
  const data = await res.json();
  const claims = data && data.claims && data.claims.P18;
  const value = claims && claims[0] && claims[0].mainsnak && claims[0].mainsnak.datavalue && claims[0].mainsnak.datavalue.value;
  return value || null;
}

async function fetchPlaceMedia(place) {
  const [google, wikiPhotoUrl] = await Promise.all([
    fetchGoogleEnrichment(place).catch(() => ({ enabled: !!GOOGLE_API_KEY, found: false })),
    (place.tags.wikimedia_commons || place.tags.wikidata)
      ? fetchWikimediaPhoto(place.tags).catch(() => null)
      : Promise.resolve(null)
  ]);

  const photos = [];
  if (google.found && google.photos) photos.push(...google.photos);
  if (wikiPhotoUrl) photos.push({ url: wikiPhotoUrl, source: 'wikimedia' });

  return {
    photos,
    googleEnabled: google.enabled,
    googleFound: google.found,
    rating: google.found ? google.rating : null,
    totalRatings: google.found ? google.totalRatings : 0,
    reviews: google.found ? google.reviews : [],
    mapsUrl: google.found ? google.mapsUrl : null
  };
}

function renderStars(rating) {
  if (rating == null) return '';
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function renderPhotosSection(place, media) {
  if (media === null) return `<div class="photo-strip-loading"><span class="spinner"></span> Loading photos…</div>`;
  if (media === 'error' || !media.photos || !media.photos.length) return '';
  return `<div class="photo-strip">${media.photos.map(p =>
    `<a href="${p.url}" target="_blank" rel="noopener"><img src="${p.url}" alt="${escapeHtml(place.name)}" loading="lazy" class="photo-thumb"></a>`
  ).join('')}</div>`;
}

function renderReviewsSection(media) {
  if (!GOOGLE_API_KEY) {
    return `<p class="detail-note">Add a Google Places API key in <code>js/config.js</code> to show Google ratings and reviews here.</p>`;
  }
  if (media === null) return `<div class="loader"><span class="spinner"></span> Loading Google reviews…</div>`;
  if (media === 'error') return `<p class="detail-note">Could not load Google reviews right now.</p>`;
  if (!media.googleFound) return `<p class="detail-note">No matching Google listing was found for this place.</p>`;
  if (!media.rating && !media.reviews.length) return `<p class="detail-note">This place has no Google reviews yet.</p>`;

  return `
    <div class="google-rating-row">
      <span class="google-stars">${renderStars(media.rating)}</span>
      <span class="google-rating-num">${media.rating != null ? media.rating.toFixed(1) : '—'}</span>
      <span class="google-rating-count">(${media.totalRatings} review${media.totalRatings === 1 ? '' : 's'})</span>
      ${media.mapsUrl ? `<a href="${media.mapsUrl}" target="_blank" rel="noopener" class="google-link">View on Google →</a>` : ''}
    </div>
    <div class="review-list">
      ${media.reviews.map(r => `
        <div class="review-card">
          <div class="review-head">
            ${r.authorPhoto
              ? `<img class="review-avatar" src="${r.authorPhoto}" alt="">`
              : `<div class="review-avatar review-avatar-fallback">${escapeHtml((r.author || '?').charAt(0))}</div>`}
            <div>
              <div class="review-author">${escapeHtml(r.author || 'Google user')}</div>
              <div class="review-meta">${renderStars(r.rating)} · ${escapeHtml(r.time || '')}</div>
            </div>
          </div>
          <p class="review-text">${escapeHtml(r.text || '')}</p>
        </div>
      `).join('')}
    </div>
    <p class="google-attribution">Reviews and ratings via Google</p>
  `;
}

function buildFactEl(fact) {
  const node = el.factTemplate.content.firstElementChild.cloneNode(true);
  if (fact.state) node.classList.add(fact.state);
  node.querySelector('.fact-icon').textContent = fact.icon;
  node.querySelector('.fact-label').textContent = fact.label;
  const valueEl = node.querySelector('.fact-value');
  valueEl.textContent = fact.value;
  if (fact.na) valueEl.classList.add('na');
  return node;
}

function buildFacts(place, nearby) {
  const t = place.tags;
  const facts = [];

  // Fee
  facts.push(feeFact(t));

  // Hours
  facts.push({ icon: '🕒', label: 'Hours', value: t.opening_hours || 'Not listed', na: !t.opening_hours });

  // Difficulty (hiking / biking specific)
  if (place.catKey === 'hiking' || place.catKey === 'biking') {
    const diff = t.sac_scale ? humanizeSacScale(t.sac_scale)
      : t['mtb:scale'] ? `MTB scale ${t['mtb:scale']}`
      : t.trail_visibility ? humanizeTrailVis(t.trail_visibility)
      : null;
    facts.push({ icon: '⛰️', label: 'Difficulty', value: diff || 'Not specified', na: !diff });
    facts.push({ icon: '🧭', label: 'Surface', value: t.surface ? capitalize(t.surface.replace(/_/g, ' ')) : 'Not specified', na: !t.surface });
    if (t.distance || t.length) facts.push({ icon: '📏', label: 'Length', value: t.distance || t.length });
  }

  // Restrooms
  if (nearby && nearby !== 'error') {
    facts.push({
      icon: '🚻', label: 'Restrooms nearby',
      value: nearby.toilets ? `Yes (${nearby.toilets} found)` : 'None found nearby',
      state: nearby.toilets ? 'good' : 'bad'
    });
    facts.push({
      icon: '🧺', label: 'Picnic areas',
      value: nearby.picnic ? `Yes (${nearby.picnic} found)` : 'None found nearby',
      state: nearby.picnic ? 'good' : 'bad'
    });
    facts.push({
      icon: '🌳', label: 'Shade / trees',
      value: nearby.shade ? 'Wooded area nearby' : 'Not indicated in map data',
      na: !nearby.shade
    });
    facts.push({
      icon: '💧', label: 'Swimming area',
      value: (nearby.swimming || nearby.beach) ? 'Yes' : 'Not found nearby',
      state: (nearby.swimming || nearby.beach) ? 'good' : undefined,
      na: !(nearby.swimming || nearby.beach)
    });
    facts.push({
      icon: '🚰', label: 'Drinking water',
      value: nearby.drinkingWater ? 'Available nearby' : 'Not found nearby',
      na: !nearby.drinkingWater
    });
    facts.push({
      icon: '⚽', label: 'Sports courts',
      value: nearby.sports.length ? nearby.sports.map(capitalize).join(', ') : 'None found nearby',
      na: !nearby.sports.length
    });
  }

  // Accessibility
  facts.push({
    icon: '♿', label: 'Wheelchair access',
    value: t.wheelchair ? capitalize(t.wheelchair.replace(/_/g, ' ')) : 'Not specified',
    na: !t.wheelchair
  });

  // Dogs
  if (t.dog) facts.push({ icon: '🐾', label: 'Dogs', value: capitalize(t.dog.replace(/_/g, ' ')) });

  // Category-specific extras
  if (place.catKey === 'restaurants' && t.cuisine) {
    facts.push({ icon: '🍴', label: 'Cuisine', value: t.cuisine.split(';').map(capitalize).join(', ') });
  }
  if ((place.catKey === 'restaurants' || place.catKey === 'dancing') && t.outdoor_seating) {
    facts.push({ icon: '🌤️', label: 'Outdoor seating', value: t.outdoor_seating === 'yes' ? 'Yes' : 'No' });
  }

  // Contact
  const phone = t.phone || t['contact:phone'];
  const website = t.website || t['contact:website'];
  if (phone) facts.push({ icon: '📞', label: 'Phone', value: phone });
  if (website) facts.push({ icon: '🔗', label: 'Website', value: website.replace(/^https?:\/\//, '') });

  return facts;
}

function feeFact(t) {
  if (t.fee === 'no') return { icon: '💵', label: 'Fee', value: 'Free', state: 'good' };
  if (t.fee === 'yes') return { icon: '💵', label: 'Fee', value: 'Fee required', state: 'bad' };
  if (t.fee) return { icon: '💵', label: 'Fee', value: capitalize(t.fee.replace(/_/g, ' ')) };
  return { icon: '💵', label: 'Fee', value: 'Not specified', na: true };
}

function humanizeSacScale(v) {
  const map = {
    hiking: 'Easy (T1 – Hiking)',
    mountain_hiking: 'Moderate (T2 – Mountain hiking)',
    demanding_mountain_hiking: 'Hard (T3 – Demanding)',
    alpine_hiking: 'Very hard (T4 – Alpine)',
    demanding_alpine_hiking: 'Expert (T5)',
    difficult_alpine_hiking: 'Extreme (T6)'
  };
  return map[v] || capitalize(v.replace(/_/g, ' '));
}
function humanizeTrailVis(v) {
  const map = { excellent: 'Easy to follow', good: 'Well marked', intermediate: 'Moderately marked', bad: 'Hard to follow', horrible: 'Very hard to follow', no: 'Unmarked' };
  return map[v] || capitalize(v.replace(/_/g, ' '));
}
function addressLine(t) {
  return [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------------------------------------------------------------
   Geolocation
   --------------------------------------------------------------------- */
function setUserLocation(lat, lon, label) {
  state.userLocation = { lat, lon, label };

  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.marker([lat, lon], { icon: pinIcon('#182333', '📍', true) }).addTo(map);
  userMarker.bindPopup(label || 'You are here');

  if (radiusCircle) map.removeLayer(radiusCircle);
  radiusCircle = L.circle([lat, lon], { radius: state.radius, color: '#2ecc71', weight: 1, fillOpacity: 0.05 }).addTo(map);

  map.setView([lat, lon], zoomForRadius(state.radius));
  setStatus('');
  fetchPlaces();
}

function zoomForRadius(r) {
  if (r <= 3000) return 14;
  if (r <= 8000) return 12;
  if (r <= 20000) return 11;
  return 9;
}

function locateUser() {
  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported by this browser. Use the search box to find a location instead.', 'error');
    return;
  }
  setStatus('Getting your location…', 'info');
  navigator.geolocation.getCurrentPosition(
    pos => setUserLocation(pos.coords.latitude, pos.coords.longitude, 'You are here'),
    err => {
      let msg = 'Could not get your location. Use the search box to enter a place instead.';
      if (err.code === err.PERMISSION_DENIED) msg = 'Location access was denied. Use the search box to enter a city or address instead.';
      setStatus(msg, 'error');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

el.locateBtn.addEventListener('click', locateUser);

/* ---------------------------------------------------------------------
   Search (Nominatim geocoding)
   --------------------------------------------------------------------- */
el.searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = el.searchInput.value.trim();
  if (!q) return;
  setStatus(`Looking up "${q}"…`, 'info');
  try {
    const url = `${NOMINATIM_ENDPOINT}?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    if (!data.length) { setStatus(`No results for "${q}".`, 'error'); return; }
    const { lat, lon, display_name } = data[0];
    setUserLocation(parseFloat(lat), parseFloat(lon), display_name);
  } catch (err) {
    setStatus('Search failed. Please try again.', 'error');
  }
});

/* ---------------------------------------------------------------------
   Other controls
   --------------------------------------------------------------------- */
el.radiusSelect.addEventListener('change', () => {
  state.radius = parseInt(el.radiusSelect.value, 10);
  if (state.userLocation) setUserLocation(state.userLocation.lat, state.userLocation.lon, state.userLocation.label);
});

el.sortSelect.addEventListener('change', () => {
  state.sort = el.sortSelect.value;
  renderResults();
});

el.favoritesToggle.addEventListener('click', () => {
  state.showFavoritesOnly = !state.showFavoritesOnly;
  el.favoritesToggle.setAttribute('aria-pressed', String(state.showFavoritesOnly));
  renderResults();
});

/* ---------------------------------------------------------------------
   Init
   --------------------------------------------------------------------- */
buildCategoryBar();
locateUser();

})();
