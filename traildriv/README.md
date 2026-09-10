# Traildriv

Traildriv finds the outdoor and leisure spots closest to you — playgrounds,
hiking trails, fishing spots, bike trails, lakes, restaurants, dance clubs,
and massage/spa places — and shows the details that matter before you go:
restrooms, picnic areas, shade, swimming areas, sports courts, trail
difficulty, fees, hours, accessibility and more.

It's a static, client-side web app (no backend, no build step). Open
`index.html` in a browser, or serve the folder with any static file server.

## How it works

- **Location**: uses the browser Geolocation API automatically on load, with
  a manual search fallback (city/address) if permission is denied or
  unavailable.
- **Data**: hybrid by design. Playgrounds, hiking trails, fishing spots,
  bike trails and lakes always come from the public
  [Overpass API](https://overpass-api.de) (OpenStreetMap) — the best free
  source for that kind of outdoor/trail data — queried with a combined,
  bbox-scoped request per search and a short local cache to keep it fast,
  with automatic fallback to alternate Overpass mirrors if one is
  unreachable. Restaurants, dance clubs and massage/spas are searched via
  **Google Places Nearby Search** instead when a Google API key is
  configured (see below) — Google's commercial database is faster and
  better-populated for that kind of business listing than OpenStreetMap;
  with no key, or if Google is briefly unreachable, those three categories
  fall back to Overpass too, exactly like before this existed. Search-by-name
  uses OpenStreetMap's Nominatim geocoder.
- **Map**: [Leaflet](https://leafletjs.com) with OpenStreetMap tiles.
- **Photos**: free, no key required — when OpenStreetMap links a place to
  Wikidata/Wikimedia Commons, its photo is pulled from Commons. Optionally
  combined with Google Photos when a Google API key is configured (see
  below).
- **Reviews & ratings**: optional. Google's Places API is the only
  legitimate source for real Google review text, and it requires an API key
  tied to a billing-enabled Google Cloud project — see setup below. Without
  a key, the reviews section simply says so and the rest of the app works
  normally.

Since the data comes from OpenStreetMap's community-maintained map, detail
fields (fees, hours, amenities) are only as complete as what's been mapped
for that location — the app is upfront in the UI when a field isn't
available rather than guessing.

## Enabling Google reviews & photos (optional)

1. Create/select a project at [console.cloud.google.com](https://console.cloud.google.com/)
   and enable billing (Google gives ~$200/month free usage, but a card is
   required).
2. Enable the **Places API** and **Maps JavaScript API**.
3. Create an API key, then restrict it (*Credentials → your key →
   Application restrictions → HTTP referrers*) to this site, e.g.
   `https://josueleto77.github.io/traildriv/*`. A referrer-restricted
   browser key is safe to commit/publish.
4. Paste the key into `js/config.js` (`googleMapsApiKey`).

Notes:
- With a key configured, restaurants/dance clubs/massage-spa searches also
  switch from Overpass to Google Places **Nearby Search** (in addition to
  reviews/photos on any place's detail panel) — this is the part meant to
  make searches feel fast, since it's what Overpass covers most weakly and
  slowly. Nearby Search results are cached client-side for a few minutes
  too.
- Each place opened in the detail panel triggers a small number of Places
  API calls (place details, using the place's real ID directly when it was
  already found via Nearby Search), cached per browser tab
  (`sessionStorage`) to avoid repeat charges while browsing.
- Only Google's public "Basic"/"Atmosphere" fields are used (rating, review
  count, up to 5 reviews, photos, phone, website, hours) — nothing is
  scraped.
- Google's terms require showing their attribution next to reviews/photos;
  the app already includes it and it should not be removed.
- Nearby Search and Place Details are billed per request beyond Google's
  free monthly credit — check current pricing on Google's own site before
  relying on this for meaningful traffic.

## Structure

```
traildriv/
├── index.html
├── css/style.css
├── js/app.js
├── js/config.js   (Google API key — optional)
└── img/ (logo, icon)
```

No dependencies to install — `js/app.js` is plain JavaScript, loaded
directly by the browser.
