# Traildriv

Traildriv finds the outdoor and leisure spots closest to you — playgrounds,
hiking trails, fishing spots, bike trails, lakes, restaurants, dance clubs,
and massage/spa places — and shows the details that matter before you go:
restrooms, picnic areas, shade, swimming areas, sports courts, trail
difficulty, fees, hours, accessibility and more.

It's a static, client-side web app (no backend, no build step, no API
keys). Open `index.html` in a browser, or serve the folder with any static
file server.

## How it works

- **Location**: uses the browser Geolocation API automatically on load, with
  a manual search fallback (city/address) if permission is denied or
  unavailable.
- **Data**: live queries against the public [Overpass API](https://overpass-api.de)
  (OpenStreetMap), with automatic fallback to alternate Overpass mirrors if
  one is unreachable. Search-by-name uses OpenStreetMap's Nominatim
  geocoder.
- **Map**: [Leaflet](https://leafletjs.com) with OpenStreetMap tiles.

Since the data comes from OpenStreetMap's community-maintained map, detail
fields (fees, hours, amenities) are only as complete as what's been mapped
for that location — the app is upfront in the UI when a field isn't
available rather than guessing.

## Structure

```
traildriv/
├── index.html
├── css/style.css
├── js/app.js
└── img/ (logo, icon)
```

No dependencies to install — `js/app.js` is plain JavaScript, loaded
directly by the browser.
