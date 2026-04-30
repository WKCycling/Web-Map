// Zoom control position
var map = L.map('map', {
    zoomControl: true,
    maxZoom: 16,
    minZoom: 8,
    doubleClickZoom: false,
    attributionControl: false
}).setView([49.8, -117.9], 9);

// Location selector position
L.control.scale({ position: 'bottomright', metric: true, imperial: false, maxWidth: 200 }).addTo(map);

L.control.locate({
    position: 'bottomright',
    flyTo: true,
    showCompass: true,
    strings: { title: "Show my location" }
}).addTo(map);

// priorityIcon definition
var priorityIcon = L.icon({ iconUrl: 'markers/Warning.svg', iconSize: [20, 20], iconAnchor: [5, 5] });
var priorityHighlightIcon = L.icon({ iconUrl: 'markers/Warning.svg', iconSize: [28, 28], iconAnchor: [7, 7] });

// Custom panes control draw order
map.createPane('terrainPane').style.zIndex    = 250;
map.createPane('boundariesPane').style.zIndex = 350;
map.createPane('routesPane').style.zIndex     = 450;
map.createPane('BikePackingPane').style.zIndex = 470;
map.createPane('parksPane').style.zIndex      = 520;
map.createPane('pointsPane').style.zIndex     = 550;

// ── Layer groups ─────────────────────────────────────────────────────

var Existing_Routes               = L.layerGroup();
var Proposed_Routes               = L.layerGroup();
var Municipal_Parks               = L.layerGroup();
var Provincial_Parks              = L.layerGroup();
var Municipal_Boundaries          = L.layerGroup();
var Regional_Districts_Boundaries = L.layerGroup();
var Bike_Shops                    = L.layerGroup();
var Recreation_Sites              = L.layerGroup();
var BC_Transit_Stops              = L.layerGroup();
var Frog_Peak_Loop                = L.layerGroup();
var Kootenay_Confluence           = L.layerGroup();
var Santa_Rosa_Valleys_and_Vistas = L.layerGroup();
var Bonnington_Scrambler          = L.layerGroup();
var Log_Jam_Loop                  = L.layerGroup();
var Priority_Improvements         = L.layerGroup();

var existingRoutesFeatures    = [];
var highlightedRoute          = null;
var priorityImprovementsFeatures = [];

// ── Basemaps & terrain ───────────────────────────────────────────────

var cartoDB = L.tileLayer("https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png", {
    attribution: '<a href="https://cartodb.com/basemaps/">Map tiles by CartoDB, under CC BY 3.0. Data by OpenStreetMap, under ODbL.</a>'
}).addTo(map);

var esri = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var hillshadeLayer = L.tileLayer("hillshade_tiles/{z}/{x}/{y}.png", {
    pane: 'terrainPane', maxZoom: 14, minZoom: 8, opacity: 0.7
}).addTo(map);

var contoursLayer = L.vectorGrid.protobuf('https://api.maptiler.com/tiles/contours-v2/{z}/{x}/{y}.pbf?key=MjRuIt3YXiPwNbQiRoht', {
    pane: 'terrainPane',
    vectorTileLayerStyles: { "contour": { color: "#c4d4f2", weight: 0.5 }, "contour_ft": { opacity: 0 }, "high-res": { opacity: 0 } },
    maxZoom: 14, minZoom: 8,
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
});

// ── Bikepacking route definitions ────────────────────────────────────
// To add a new bikepacking route, append an entry here.

var bikepackingRoutes = [
    { file: 'Frog_Peak_Loop',                layer: Frog_Peak_Loop,                color: 'rgba(247,72,33,1.0)',   legendIcon: 'frog_peak.png',           legendLabel: 'Frog Peak Loop' },
    { file: 'Kootenay_Confluence',            layer: Kootenay_Confluence,            color: 'rgba(247,222,33,1.0)',  legendIcon: 'kootenay_confluence.png',  legendLabel: 'Kootenay Confluence' },
    { file: 'Santa_Rosa_Valleys_and_Vistas',  layer: Santa_Rosa_Valleys_and_Vistas,  color: 'rgba(132,55,38,1.0)',   legendIcon: 'santa_rosa.png',           legendLabel: 'Santa Rosa Valleys and Vistas' },
    { file: 'Bonnington_Scrambler',           layer: Bonnington_Scrambler,           color: 'rgba(255,170,23,1.0)',  legendIcon: 'bonnington_scrambler.png', legendLabel: 'Bonnington Scrambler' },
    { file: 'Log_Jam_Loop',                   layer: Log_Jam_Loop,                   color: 'rgba(54,81,231,1.0)',   legendIcon: 'log_jam_loop.png',         legendLabel: 'Log Jam Loop' }
];

// ── Helpers ──────────────────────────────────────────────────────────

function buildPopupTable(rows) {
    return '<div class="popup"><table>' +
        rows.map(function(row) {
            return '<tr><td><b>' + row[0] + ':</b></td><td>' + row[1] + '</td></tr>';
        }).join('') +
        '</table></div>';
}

function linkUrl(url, fallback) {
    if (!url) return fallback || 'No source';
    var display = url.length > 40 ? url.substring(0, 40) + '[...]' : url;
    return '<a href="' + url + '" target="_blank">' + display + '</a>';
}

function addHitTargets(geoJsonLayer, targetGroup, pane) {
    geoJsonLayer.eachLayer(function(subLayer) {
        var hit = L.polyline(subLayer.getLatLngs(), {
            weight: 20, opacity: 0, interactive: true, pane: pane
        });
        hit.on('click', function(e) {
            subLayer.fire('click', { latlng: e.latlng, originalEvent: e.originalEvent });
            L.DomEvent.stopPropagation(e);
        });
        targetGroup.addLayer(hit);
    });
}

// ── Route filtering ──────────────────────────────────────────────────

var routeFilters = { type: 'all', surface: 'all', transCanadaTrail: false };

function featureMatchesFilters(feature) {
    var props = feature.properties;
    if (routeFilters.type !== 'all' && props.Type !== routeFilters.type) return false;
    if (routeFilters.surface !== 'all' && props.Surface !== routeFilters.surface) return false;
    if (routeFilters.transCanadaTrail && props.Trans_Canada_Trail !== true) return false;
    return true;
}

function updateRouteFiltering() {
    existingRoutesFeatures.forEach(function(layer) {
        var matches = featureMatchesFilters(layer.feature);
        if (highlightedRoute === layer && !matches) resetHighlightedRoute();
        if (layer !== highlightedRoute) layer.setStyle(getRouteStyle(layer.feature, !matches));
    });
}

// ── Route styling & highlighting ─────────────────────────────────────

function getRouteStyle(feature, isDimmed) {
    return isDimmed
        ? { color: "rgba(17,116,6,0.3)", weight: 3, opacity: 0.4 }
        : { color: "rgba(17,116,6,1.0)", weight: 3, opacity: 0.9 };
}

function getProposedRouteBaseStyle() {
    return { color: 'rgba(252,0,0,1.0)', dashArray: '4,2', weight: 1, opacity: 1 };
}

function highlightRoute(layer) {
    resetHighlightedRoute();
    highlightedRoute = layer;
    if (layer.routeCategory === "priority") {
        layer.setIcon(priorityHighlightIcon);
    } else {
        layer.setStyle({ color: "#f0fc03", weight: 5, opacity: 1 });
        layer.bringToFront();
    }
}

function resetHighlightedRoute() {
    if (!highlightedRoute) return;
    if (highlightedRoute.routeCategory === "existing") {
        var matches = featureMatchesFilters(highlightedRoute.feature);
        highlightedRoute.setStyle(getRouteStyle(highlightedRoute.feature, !matches));
    } else if (highlightedRoute.routeCategory === "proposed") {
        highlightedRoute.setStyle(getProposedRouteBaseStyle());
    } else if (highlightedRoute.routeCategory === "priority") {
        highlightedRoute.setIcon(priorityIcon);
    }
    highlightedRoute = null;
}

// ── Park labels ──────────────────────────────────────────────────────

function Label_Parks(feature, layer) {
    if (!feature.properties['park_name']) return;
    if (window.innerWidth < 768) {
        layer.on('click', function() { layer.bindPopup(feature.properties['park_name']).openPopup(); });
    } else {
        layer.bindTooltip(feature.properties['park_name'], { className: 'Label_Parks', sticky: true });
    }
}

// ── Coordinate popup on double-click ─────────────────────────────────

map.on('dblclick', function(e) {
    L.popup()
        .setLatLng(e.latlng)
        .setContent('Lat: ' + e.latlng.lat.toFixed(6) + '<br>Lng: ' + e.latlng.lng.toFixed(6))
        .openOn(map);
});

// ── Layer loading ─────────────────────────────────────────────────────

var bcOGL = '&copy;<a href="https://www2.gov.bc.ca/gov/content/data/policy-standards/data-policies/open-data/open-government-licence-bc">Open Government Licence - British Columbia</a>';
var wkccAttr = '&copy; 2026 West Kootenay Cycling Coalition and Contributors';

$.getJSON("data/Existing_Routes.geojson", function(data) {
    var existingGeoLayer = L.geoJSON(data, {
        pane: 'routesPane',
        attribution: wkccAttr,
        style: function(feature) { return getRouteStyle(feature, false); },
        interactive: true,
        onEachFeature: function(feature, layer) {
            layer.routeCategory = "existing";
            existingRoutesFeatures.push(layer);
            layer.on("click", function(e) {
                highlightRoute(layer);
                L.DomEvent.stopPropagation(e);
            });
            var props = feature.properties || {};
            var source = props.Source || props.source || '';
            layer.bindPopup(buildPopupTable([
                ['Name',              props.Name || props.name || 'Unnamed Route'],
                ['Type',              props.Type || props.type || 'Unknown'],
                ['Network',           props.Tenure || props.tenure || 'Unknown'],
                ['Source',            linkUrl(source)],
                ['Length (km)',        props.Shape_length || props.length || props.Length || 'Unknown'],
                ['Description',       '<p style="margin:0; white-space:normal;">' + (props.description || props.Description || 'No description available') + '</p>'],
                ['Surface',           props.Surface || props.surface || 'Unknown'],
                ['Trans Canada Trail', props.Trans_Canada_Trail || props.trans_canada_trail || 'No']
            ]));
        }
    }).addTo(Existing_Routes);
    addHitTargets(existingGeoLayer, Existing_Routes, 'routesPane');
    populateFilterDropdowns(data);
});

function populateFilterDropdowns(geojsonData) {
    var types = new Set();
    var surfaces = new Set();
    geojsonData.features.forEach(function(f) {
        if (f.properties.Type)    types.add(f.properties.Type);
        if (f.properties.Surface) surfaces.add(f.properties.Surface);
    });
    function fillSelect(id, values) {
        var sel = document.getElementById(id);
        Array.from(values).sort().forEach(function(v) {
            var opt = document.createElement('option');
            opt.value = opt.textContent = v;
            sel.appendChild(opt);
        });
    }
    fillSelect('type-filter', types);
    fillSelect('surface-filter', surfaces);
}

$.getJSON("data/Proposed_Routes.geojson", function(data) {
    var proposedGeoLayer = L.geoJSON(data, {
        pane: 'routesPane',
        attribution: wkccAttr,
        bubblingMouseEvents: false,
        style: function() { return getProposedRouteBaseStyle(); },
        onEachFeature: function(feature, layer) {
            layer.routeCategory = "proposed";
            var props = feature.properties || {};
            layer.bindPopup(buildPopupTable([
                ['Name',         props.Name || 'Unnamed Route'],
                ['Type',         props.Type || 'Unknown'],
                ['Network',      props.Network || 'Unknown'],
                ['Jurisdiction', props.Municipality || 'Unknown'],
                ['Source',       linkUrl(props.Source || '')]
            ]));
            layer.on("click", function(e) {
                L.DomEvent.stopPropagation(e);
                highlightRoute(layer);
                layer.openPopup(e.latlng);
            });
        }
    }).addTo(Proposed_Routes);
    addHitTargets(proposedGeoLayer, Proposed_Routes, 'routesPane');
});

$.getJSON("data/Municipal_Parks.geojson", function(data) {
    L.geoJSON(data, {
        attribution: bcOGL,
        style: {
            opacity: 1, color: 'rgba(37,96,18,1.0)', dashArray: '',
            lineCap: 'butt', lineJoin: 'miter', weight: 1.0,
            fill: true, fillOpacity: 1, fillColor: 'rgba(114,155,111,0.6039215686274509)'
        },
        interactive: true,
        onEachFeature: Label_Parks
    }).addTo(Municipal_Parks);
});

$.getJSON("data/Provincial_Parks.geojson", function(data) {
    L.geoJSON(data, {
        attribution: bcOGL,
        style: {
            opacity: 1, color: 'rgba(37,96,18,1.0)', dashArray: '5.0,1.0',
            lineCap: 'butt', lineJoin: 'miter', weight: 1.5,
            fill: true, fillOpacity: 0.6, fillColor: 'rgba(114,155,111,0.6039215686274509)'
        },
        interactive: true,
        onEachFeature: Label_Parks
    }).addTo(Provincial_Parks);
});

$.getJSON("data/Municipal_Boundaries.geojson", function(data) {
    L.geoJSON(data, {
        pane: 'boundariesPane', attribution: bcOGL,
        style: {
            opacity: 0.15, color: 'rgba(255,142,37)', dashArray: '10.0,2.0,4.0,2.0',
            lineCap: 'butt', lineJoin: 'miter', weight: 2.0,
            fill: true, fillOpacity: 1, fillColor: 'rgba(255,158,23,0.0)'
        },
        minZoom: 12, maxZoom: 16, interactive: false
    }).addTo(Municipal_Boundaries);
});

$.getJSON("data/Regional_Districts_Boundaries.geojson", function(data) {
    L.geoJSON(data, {
        attribution: bcOGL, pane: 'boundariesPane',
        style: {
            opacity: 0.3, color: 'rgba(128,128,128,1.0)', dashArray: '15.0,3.0,6.0,3.0',
            lineCap: 'butt', lineJoin: 'miter', weight: 3.0, fillOpacity: 0
        },
        interactive: false
    }).addTo(Regional_Districts_Boundaries);
});

$.getJSON("data/Bike_Shops.geojson", function(data) {
    L.geoJSON(data, {
        pane: 'pointsPane',
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, { icon: L.icon({ iconUrl: 'markers/BikeShops_12.svg', iconSize: [19, 19], iconAnchor: [9, 9] }) });
        },
        interactive: true,
        onEachFeature: function(feature, layer) {
            var props = feature.properties;
            layer.bindPopup(buildPopupTable([
                ['Name',         props.Name],
                ['Address',      props.StreetAddress],
                ['City',         props.City],
                ['Province',     props.Province],
                ['Postal Code',  props.PostalCode],
                ['URL',          linkUrl(props.URL || '')],
                ['Phone Number', props.PhoneNumber]
            ]));
        }
    }).addTo(Bike_Shops);
});

$.getJSON("data/Recreation_Sites.geojson", function(data) {
    L.geoJSON(data, {
        attribution: bcOGL, pane: 'pointsPane',
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, { icon: L.icon({ iconUrl: 'markers/picnic-2.png', iconSize: [20, 20], iconAnchor: [5, 5] }) });
        },
        interactive: true,
        onEachFeature: function(feature, layer) {
            var props = feature.properties;
            layer.bindPopup(buildPopupTable([
                ['Name',                     props.project_name],
                ['Number of<br>Camp Sites',  props.num_camp_sites],
                ['Description',              '<p style="margin:0; white-space:normal;">' + props.project_description + '</p>']
            ]));
        }
    }).addTo(Recreation_Sites);
});

$.getJSON("data/Priority_Improvements.geojson", function(data) {
    L.geoJSON(data, {
        attribution: wkccAttr, pane: 'pointsPane',
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, { icon: priorityIcon });
        },
        interactive: true,
        onEachFeature: function(feature, layer) {
            var props = feature.properties || {};
            var url = props.URL || '';
            layer.bindPopup(buildPopupTable([
                ['Name',        props.Name || 'Unnamed Improvement'],
                ['Description', '<p style="margin:0; white-space:normal; word-wrap:break-word;">' + (props.Description || 'No description available') + '</p>'],
                ['Comments',    '<p style="margin:0; white-space:normal; word-wrap:break-word;">' + (props.Comments || 'None') + '</p>'],
                ['URL',         url ? '<a href="' + url + '" target="_blank">' + url + '</a>' : 'No link'],
                ['Priority',    props.Priority || 'Unknown']
            ]));
            layer.routeCategory = "priority";
            priorityImprovementsFeatures.push(layer);
            layer.on("click", function(e) {
                highlightRoute(layer);
                L.DomEvent.stopPropagation(e);
            });
        }
    }).addTo(Priority_Improvements);
});

$.getJSON("data/BC_Transit_Stops.geojson", function(data) {
    L.geoJSON(data, {
        attribution: '&copy;<a href="https://www.bctransit.com/open-data/terms-of-use/">BC Transit Terms of Use</a>',
        pane: 'pointsPane',
        pointToLayer: function(feature, latlng) {
            return L.marker(latlng, { icon: L.icon({ iconUrl: 'markers/BCTransitStops_10.svg', iconSize: [14, 14], iconAnchor: [7, 7] }) });
        }
    }).addTo(BC_Transit_Stops);
});

// Bikepacking routes — driven by the bikepackingRoutes array above
bikepackingRoutes.forEach(function(route) {
    $.getJSON('data/' + route.file + '.geojson', function(data) {
        var bpGeoLayer = L.geoJSON(data, {
            pane: 'BikePackingPane',
            attribution: '&copy;<a href="https://bikepacking.com/west-kootenay/">Moe Nadeau - BikePacking.com</a>',
            style: { opacity: 1, color: route.color, dashArray: '', lineCap: 'square', lineJoin: 'bevel', weight: 2.0, fillOpacity: 0 },
            interactive: true,
            onEachFeature: function(feature, layer) {
                layer.bindPopup(buildPopupTable([
                    ['Name',       feature.properties.name],
                    ['Length (km)', feature.properties.Length],
                    ['Source',     linkUrl(feature.properties.Source || '')]
                ]));
            }
        }).addTo(route.layer);
        addHitTargets(bpGeoLayer, route.layer, 'BikePackingPane');
    });
});

// Add default-visible layers to the map
[Existing_Routes, Municipal_Parks, Provincial_Parks,
 Municipal_Boundaries, Regional_Districts_Boundaries, Priority_Improvements
].forEach(function(l) { l.addTo(map); });

// ── Legend ────────────────────────────────────────────────────────────

function createLegendIcon(iconFile, label) {
    return '<img src="legend/' + iconFile + '" style="height:16px;vertical-align:middle;margin-right:4px;">' + label;
}

var LegendContainer = L.Control.extend({
    options: { position: 'topright' },
    onAdd: function() {
        var container = L.DomUtil.create('div', 'leaflet-control legend-container');
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        container.innerHTML =
            '<div class="legend-header"><span>Legend</span><span class="legend-toggle">&#9662;</span></div>' +
            '<div class="legend-body"></div>';
        return container;
    }
});

new LegendContainer().addTo(map);

var treeControl = L.control.layers.tree(
    {
        label: '<b>Base Maps</b>',
        children: [
            { label: 'CartoDB', layer: cartoDB },
            { label: 'Imagery', layer: esri }
        ]
    },
    {
        label: '<b>Overlays</b>',
        selectAllCheckbox: true,
        children: [
            {
                label: '<b>Terrain Overlays</b>', selectAllCheckbox: false,
                children: [
                    { label: createLegendIcon("hillshade.png", "Hillshade"), layer: hillshadeLayer },
                    { label: createLegendIcon("contours.png", "Contours"),   layer: contoursLayer }
                ]
            },
            {
                label: '<b>Bike Routes</b>', selectAllCheckbox: false,
                children: [
                    { label: createLegendIcon("existing_routes.png", "Existing Routes"), layer: Existing_Routes },
                    { label: '<span class="legend-proposed-routes">' + createLegendIcon("proposed_routes.png", "Proposed Routes") + '</span>', layer: Proposed_Routes },
                    { label: createLegendIcon("Warning.svg", "Priority Improvements"), layer: Priority_Improvements },
                    {
                        label: '<b>Bike Packing Routes</b>', selectAllCheckbox: false,
                        children: bikepackingRoutes.map(function(r) {
                            return { label: createLegendIcon(r.legendIcon, r.legendLabel), layer: r.layer };
                        })
                    }
                ]
            },
            {
                label: '<b>Parks</b>', selectAllCheckbox: false,
                children: [
                    { label: '<span class="legend-municipal-parks">' + createLegendIcon("municipal_parks.png", "Municipal Parks") + '</span>', layer: Municipal_Parks },
                    { label: createLegendIcon("provincial_parks.png", "Provincial Parks"), layer: Provincial_Parks }
                ]
            },
            {
                label: '<b>Boundaries</b>', selectAllCheckbox: false,
                children: [
                    { label: '<span class="legend-municipal-boundaries">' + createLegendIcon("municipal_boundaries.png", "Municipal Boundaries") + '</span>', layer: Municipal_Boundaries },
                    { label: createLegendIcon("regional_districts.png", "Regional Districts"), layer: Regional_Districts_Boundaries }
                ]
            },
            { label: createLegendIcon("bike_shops.png", "Bike Shops"),       layer: Bike_Shops },
            { label: createLegendIcon("picnic-2.png", "Recreation Sites"),    layer: Recreation_Sites },
            { label: createLegendIcon("bc_transit.png", "BC Transit Stops"),  layer: BC_Transit_Stops }
            // To add a new layer: { label: createLegendIcon("icon.png", "Name"), layer: New_Layer }
        ]
    },
    {
        namedToggle: false, selectorBack: false,
        closedSymbol: '&#8862; &#x1f5c0;', openedSymbol: '&#8863; &#x1f5c1;',
        spaceSymbol: '&#x00A0;&#x00A0;&#x00A0;',
        collapsed: false, position: 'topright'
    }
).addTo(map);

var legendBodyEl  = document.querySelector('.legend-body');
var legendToggle  = document.querySelector('.legend-toggle');
var legendHeader  = document.querySelector('.legend-header');

legendBodyEl.appendChild(treeControl.getContainer());
treeControl.getContainer().classList.add('custom-legend');

legendHeader.addEventListener('click', function() {
    legendBodyEl.classList.toggle('collapsed');
    legendToggle.classList.toggle('collapsed');
});

// ── Zoom-restricted layers ────────────────────────────────────────────

var zoomRestrictedLayers = [
    { layer: Municipal_Boundaries, legendClass: "legend-municipal-boundaries", minZoom: 12, maxZoom: 16 },
    { layer: Municipal_Parks,      legendClass: "legend-municipal-parks",      minZoom: 11, maxZoom: 16 }
];

// Layers the user has explicitly unchecked — zoom restriction must not override this.
var userHiddenLayers = new Set();
var zoomUpdating = false;

map.on('overlayremove', function(e) {
    if (!zoomUpdating) userHiddenLayers.add(e.layer);
});
map.on('overlayadd', function(e) {
    if (!zoomUpdating) userHiddenLayers.delete(e.layer);
});

function updateZoomRestrictedLayers() {
    zoomUpdating = true;
    var zoom = map.getZoom();
    zoomRestrictedLayers.forEach(function(item) {
        var legendItem = document.querySelector('.' + item.legendClass);
        var checkbox   = legendItem ? legendItem.closest('label').querySelector('input[type=checkbox]') : null;
        var inRange    = zoom >= item.minZoom && zoom <= item.maxZoom;
        if (inRange) {
            if (!map.hasLayer(item.layer) && !userHiddenLayers.has(item.layer)) {
                map.addLayer(item.layer);
            }
            if (legendItem) legendItem.classList.remove('legend-disabled');
            if (checkbox)   checkbox.disabled = false;
        } else {
            if (map.hasLayer(item.layer)) map.removeLayer(item.layer);
            if (legendItem) legendItem.classList.add('legend-disabled');
            if (checkbox)   checkbox.disabled = true;
        }
    });
    zoomUpdating = false;
}

setTimeout(updateZoomRestrictedLayers, 100);
map.on("zoomend", updateZoomRestrictedLayers);

// ── Filter panel ──────────────────────────────────────────────────────

var filterPanel = L.control({ position: 'topleft' });
filterPanel.onAdd = function() {
    var div = L.DomUtil.create('div', 'leaflet-control filter-panel');
    div.innerHTML =
        '<p class="filter-toggle">&#128269; Route Filters<span class="filter-arrow">&#9662;</span></p>' +
        '<div class="filter-content collapsed">' +
            '<div class="filter-group"><label>Route Type:</label>' +
                '<select id="type-filter"><option value="all">All Types</option></select></div>' +
            '<div class="filter-group"><label>Surface:</label>' +
                '<select id="surface-filter"><option value="all">All Surfaces</option></select></div>' +
            '<div class="filter-group"><label>' +
                '<input type="checkbox" id="tct-filter"> Trans Canada Trail Only</label></div>' +
            '<button class="clear-filters" onclick="clearAllFilters()">Clear All Filters</button>' +
        '</div>';

    var toggle  = div.querySelector('.filter-toggle');
    var content = div.querySelector('.filter-content');
    var arrow   = div.querySelector('.filter-arrow');
    arrow.style.transform = 'rotate(180deg)';

    toggle.onclick = function() {
        var expanding = content.classList.contains('collapsed');
        content.classList.toggle('collapsed', !expanding);
        arrow.style.transform = expanding ? 'rotate(0deg)' : 'rotate(180deg)';
        if (expanding) collapseAbstract();
    };

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    return div;
};
filterPanel.addTo(map);

setTimeout(function() {
    document.getElementById('type-filter').addEventListener('change', function() {
        routeFilters.type = this.value;
        updateRouteFiltering();
    });
    document.getElementById('surface-filter').addEventListener('change', function() {
        routeFilters.surface = this.value;
        updateRouteFiltering();
    });
    document.getElementById('tct-filter').addEventListener('change', function() {
        routeFilters.transCanadaTrail = this.checked;
        updateRouteFiltering();
    });
}, 100);

window.clearAllFilters = function() {
    routeFilters.type = 'all';
    routeFilters.surface = 'all';
    routeFilters.transCanadaTrail = false;
    document.getElementById('type-filter').value = 'all';
    document.getElementById('surface-filter').value = 'all';
    document.getElementById('tct-filter').checked = false;
    updateRouteFiltering();
};

// ── Abstract panel ────────────────────────────────────────────────────

var abstract = L.control({ position: 'bottomleft' });
abstract.onAdd = function() {
    var div = L.DomUtil.create('div', 'leaflet-control abstract');
    div.innerHTML =
        '<p id="abstract-toggle"><b>West Kootenay Cycling Map</b><span id="abstract-arrow">&#9662;</span></p>' +
        '<div id="abstract-content">' +
            '<p>This map shows the extent of the cycling network in the West Kootenays region, including existing ' +
            '(<img src="legend/existing_routes.png" style="height:16px;width:16px;display:inline-block;vertical-align:middle;margin:0 2px;">) ' +
            'and proposed routes (<img src="legend/proposed_routes.png" style="height:16px;width:16px;display:inline-block;vertical-align:middle;margin:0 2px;">). ' +
            'Use the <b>legend</b> and <b>filters</b> to explore the network. Click features for <b>popups</b>.</p>' +
            '<p>To report issues or share ideas, contact us at:<br>' +
            '<a href="https://westkootenaycycling.ca/contact" target="_blank" rel="noopener noreferrer">westkootenaycycling.ca/contact</a></p>' +
            '<p style="margin-bottom:2px;">Include the <b>location</b> in your feedback. <b>Double-click</b> anywhere on the map to get coordinates.</p>' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;">' +
                '<img src="images/WKCC.png" alt="WKCC logo" style="width:120px;height:auto;flex-shrink:0;">' +
                '<div style="text-align:right;font-size:9px;line-height:1.5;color:#555;">' +
                    'Map data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors<br>' +
                    'Basemap: <a href="https://cartodb.com/basemaps/" target="_blank">CartoDB</a> CC BY 3.0 / <a href="https://www.esri.com" target="_blank">Esri</a><br>' +
                    'Contours: <a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a><br>' +
                    'Routes &amp; improvements: &copy; 2026 WKCC<br>' +
                    'Bikepacking: &copy; <a href="https://bikepacking.com/west-kootenay/" target="_blank">Moe Nadeau / BikePacking.com</a><br>' +
                    'Parks, boundaries, recreation, transit:<br><a href="https://www2.gov.bc.ca/gov/content/data/policy-standards/data-policies/open-data/open-government-licence-bc" target="_blank">BC Open Government Licence</a>' +
                '</div>' +
            '</div>' +
        '</div>';

    var toggle  = div.querySelector('#abstract-toggle');
    var content = div.querySelector('#abstract-content');
    var arrow   = div.querySelector('#abstract-arrow');
    content.style.display = 'block';

    toggle.onclick = function() {
        var expanding = content.classList.contains('collapsed');
        content.classList.toggle('collapsed', !expanding);
        arrow.style.transform = expanding ? 'rotate(0deg)' : 'rotate(180deg)';
        if (expanding) collapseFilter();
    };
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    return div;
};
abstract.addTo(map);

function collapseAbstract() {
    var content = document.getElementById('abstract-content');
    var arrow   = document.getElementById('abstract-arrow');
    if (content && !content.classList.contains('collapsed')) {
        content.classList.add('collapsed');
        arrow.style.transform = 'rotate(180deg)';
    }
}

function collapseFilter() {
    var content = document.querySelector('.filter-content');
    var arrow   = document.querySelector('.filter-arrow');
    if (content && !content.classList.contains('collapsed')) {
        content.classList.add('collapsed');
        arrow.style.transform = 'rotate(180deg)';
    }
}

function collapseLegend() {
    if (legendBodyEl && !legendBodyEl.classList.contains('collapsed')) {
        legendBodyEl.classList.add('collapsed');
        legendToggle.classList.add('collapsed');
    }
}

// ── Mobile defaults ───────────────────────────────────────────────────

if (window.innerWidth < 768) {
    if (treeControl && treeControl.collapse) treeControl.collapse();
    legendBodyEl.classList.add('collapsed');
    legendToggle.classList.add('collapsed');
    setTimeout(collapseAbstract, 200);
}

map.on("click", function() { resetHighlightedRoute(); collapseFilter(); collapseLegend(); collapseAbstract(); });
