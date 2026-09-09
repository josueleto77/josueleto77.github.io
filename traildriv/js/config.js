// Traildriv configuration.
// Add your Google Maps/Places API key below to enable Google ratings, reviews
// and photos in the place detail panel. Leave it empty to skip Google entirely
// (Wikimedia Commons photos still work with no key, where OpenStreetMap links
// a place to Wikidata/Wikimedia Commons).
//
// Setup:
// 1. Create/select a project at https://console.cloud.google.com/
// 2. Enable the "Places API" (and "Maps JavaScript API").
// 3. Create an API key, then restrict it (Credentials > your key > Application
//    restrictions > HTTP referrers) to your site, e.g.:
//      https://josueleto77.github.io/traildriv/*
//    A referrer-restricted browser key is safe to commit/publish.
// 4. Paste the key below.
window.TRAILDRIV_CONFIG = {
  googleMapsApiKey: 'AIzaSyAW4H6uO21teND6oTQus7OEz3mTIOKEO8k'
};
