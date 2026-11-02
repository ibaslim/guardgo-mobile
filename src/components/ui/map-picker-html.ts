import type { MapsConfig } from '@/services/maps-config';

type Pin = { latitude: number; longitude: number };

// Settings go into the page as JSON; "<" is escaped so no value can close the script tag.
const asJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

/**
 * The page the map picker shows in a WebView: Google's JavaScript map with address search, the same
 * library the web client uses. It tells the app about the pin with `postMessage`:
 *   { type: 'pin', latitude, longitude } when the pin moves, { type: 'error', message } on a failure.
 */
export function buildMapPickerHtml(config: MapsConfig, initial: Pin | null) {
  const settings = asJson({
    mapId: config.mapId ?? 'DEMO_MAP_ID',
    country: config.countryRestriction ?? null,
    initial,
  });

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  html, body { margin: 0; height: 100%; font-family: sans-serif; }
  #map { position: absolute; inset: 0; }
  #search { position: absolute; top: 10px; left: 10px; right: 10px; z-index: 2; }
  #query { width: 100%; box-sizing: border-box; padding: 12px 14px; font-size: 16px; border: 1px solid #bbb; border-radius: 10px; background: #fff; color: #111; box-shadow: 0 2px 8px rgba(0,0,0,.2); }
  #results { margin: 4px 0 0; padding: 0; list-style: none; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.2); overflow: hidden; }
  #results li { padding: 11px 14px; font-size: 15px; color: #111; border-top: 1px solid #eee; }
  #results li:first-child { border-top: 0; }
  #results small { display: block; color: #666; font-size: 12px; margin-top: 2px; }
</style>
</head>
<body>
<div id="search">
  <input id="query" type="search" placeholder="Search an address" autocomplete="off" />
  <ul id="results" hidden></ul>
</div>
<div id="map"></div>
<script>
  var SETTINGS = ${settings};
  function send(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
  window.gm_authFailure = function () { send({ type: 'error', message: 'Google Maps rejected the key. Check its restrictions.' }); };

  var map, marker, places;
  var input = document.getElementById('query');
  var list = document.getElementById('results');

  function setPin(position, moveMap) {
    if (!marker) {
      marker = new google.maps.Marker({ map: map, position: position, draggable: true });
      marker.addListener('dragend', function (event) { setPin(event.latLng.toJSON(), false); });
    } else {
      marker.setPosition(position);
    }
    if (moveMap) { map.panTo(position); map.setZoom(Math.max(map.getZoom(), 16)); }
    send({ type: 'pin', latitude: position.lat, longitude: position.lng });
  }

  function clearResults() { list.hidden = true; list.innerHTML = ''; }

  function showResults(items) {
    list.innerHTML = '';
    items.forEach(function (item) {
      var row = document.createElement('li');
      row.textContent = item.main;
      if (item.secondary) { var small = document.createElement('small'); small.textContent = item.secondary; row.appendChild(small); }
      row.addEventListener('click', function () { clearResults(); input.value = item.main; item.pick(); });
      list.appendChild(row);
    });
    list.hidden = items.length === 0;
  }

  // Address suggestions from Places; when Places isn't available for the key, the geocoder finds one match.
  var timer;
  async function suggest(text) {
    try {
      var request = { input: text };
      if (SETTINGS.country) request.includedRegionCodes = [SETTINGS.country];
      var result = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      showResults(result.suggestions.filter(function (s) { return s.placePrediction; }).map(function (s) {
        var prediction = s.placePrediction;
        return {
          main: prediction.mainText ? prediction.mainText.text : prediction.text.text,
          secondary: prediction.secondaryText ? prediction.secondaryText.text : '',
          pick: async function () {
            var place = prediction.toPlace();
            await place.fetchFields({ fields: ['location'] });
            if (place.location) setPin(place.location.toJSON(), true);
          },
        };
      }));
    } catch (error) {
      geocode(text, false);
    }
  }

  function geocode(text, pickFirst) {
    var request = { address: text };
    if (SETTINGS.country) request.componentRestrictions = { country: SETTINGS.country };
    new google.maps.Geocoder().geocode(request, function (results, status) {
      if (status !== 'OK' || !results.length) { clearResults(); if (pickFirst) send({ type: 'error', message: 'No place found. Try a fuller address, or tap the map.' }); return; }
      if (pickFirst) { clearResults(); setPin(results[0].geometry.location.toJSON(), true); return; }
      showResults(results.slice(0, 5).map(function (r) {
        return { main: r.formatted_address, secondary: '', pick: function () { setPin(r.geometry.location.toJSON(), true); } };
      }));
    });
  }

  input.addEventListener('input', function () {
    clearTimeout(timer);
    var text = input.value.trim();
    if (text.length < 3) { clearResults(); return; }
    timer = setTimeout(function () { suggest(text); }, 250);
  });
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') { event.preventDefault(); input.blur(); geocode(input.value.trim(), true); }
  });

  async function start() {
    try {
      var maps = await google.maps.importLibrary('maps');
      places = await google.maps.importLibrary('places');
      var start = SETTINGS.initial ? { lat: SETTINGS.initial.latitude, lng: SETTINGS.initial.longitude } : { lat: 43.6532, lng: -79.3832 };
      map = new maps.Map(document.getElementById('map'), {
        center: start, zoom: SETTINGS.initial ? 16 : 11, mapId: SETTINGS.mapId,
        disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false,
      });
      map.addListener('click', function (event) { clearResults(); input.blur(); setPin(event.latLng.toJSON(), false); });
      if (SETTINGS.initial) setPin(start, false);
      send({ type: 'ready' });
    } catch (error) {
      send({ type: 'error', message: 'Could not start Google Maps.' });
    }
  }

  (function (g) {
    var h, a, k, p = 'The Google Maps JavaScript API', c = 'google', l = 'importLibrary', q = '__ib__', m = document, b = window;
    b = b[c] || (b[c] = {});
    var d = b.maps || (b.maps = {}), r = new Set(), e = new URLSearchParams(),
      u = function () { return h || (h = new Promise(async function (f, n) {
        await (a = m.createElement('script'));
        e.set('libraries', [].concat.apply([], r) + '');
        for (k in g) e.set(k.replace(/[A-Z]/g, function (t) { return '_' + t[0].toLowerCase(); }), g[k]);
        e.set('callback', c + '.maps.' + q);
        a.src = 'https://maps.' + c + 'apis.com/maps/api/js?' + e;
        d[q] = f;
        a.onerror = function () { h = n(Error(p + ' could not load.')); };
        a.nonce = (m.querySelector('script[nonce]') || {}).nonce || '';
        m.head.append(a);
      })); };
    d[l] ? console.warn(p + ' only loads once.') : (d[l] = function (f) { var n = [].slice.call(arguments, 1); return r.add(f), u().then(function () { return d[l].apply(d, [f].concat(n)); }); });
  })({ key: ${asJson(config.apiKey)}, v: 'weekly' });

  start();
</script>
</body>
</html>`;
}
