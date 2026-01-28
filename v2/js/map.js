/* ============================================================
   MAP INITIALIZATION (WK Cycling Map v2)
   This file sets up the Leaflet map, basemaps, panes, and
   global layer groups used by the rest of the modules.
=============================================================== */

// Create the map
var map = L.map('map', {
    center: [49.5, -117.3],   // Default WK region center
    zoom: 11,
    zoomControl: true,
    preferCanvas: true
});

// ============================================================
// BASEMAPS
// ============================================================

// OpenStreetMap
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// ESRI World Imagery
var esriImagery = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
    }
);

// Basemap control
var baseMaps = {
    "OpenStreetMap": osm,
    "ESRI Imagery": esriImagery
};

L.control.layers(baseMaps, null, { collapsed: true }).addTo(map);

// ============================================================
// PANES (controls drawing order)
// ============================================================

map.createPane('routesPane');
map.getPane('routesPane').style.zIndex = 400;

map.createPane('pointsPane');
map.getPane('pointsPane').style.zIndex = 500;

map.createPane('labelsPane');
map.getPane('labelsPane').style.zIndex = 600;

// ============================================================
// GLOBAL LAYER GROUPS (other modules will add to these)
// ============================================================

window.routeLayers = L.layerGroup().addTo(map);
window.pointLayers = L.layerGroup().addTo(map);
window.parkLabelLayers = L.layerGroup().addTo(map);

// ============================================================
// SCALE BAR
// ============================================================

L.control.scale({
    metric: true,
    imperial: false,
    position: 'bottomleft'
}).addTo(map);

// ============================================================
// DOUBLE-CLICK COORDINATE POPUP
// ============================================================

map.on('dblclick', function (e) {
    var lat = e.latlng.lat.toFixed(6);
    var lng = e.latlng.lng.toFixed(6);

    L.popup()
        .setLatLng(e.latlng)
        .setContent(
            "<b>Coordinates</b><br>" +
            "Lat: " + lat + "<br>" +
            "Lng: " + lng
        )
        .openOn(map);
});

// ============================================================
// EXPORT MAP FOR OTHER MODULES
// ============================================================

window.map = map;
