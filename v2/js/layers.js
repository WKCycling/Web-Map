/* ============================================================
   LAYERS MODULE (WK Cycling Map v2)
   Loads all GeoJSON layers, applies styles, creates popups,
   and adds layers to the global layer groups defined in map.js.
=============================================================== */

/* ============================================================
   STYLE FUNCTIONS
=============================================================== */

// Route styling
function routeStyle(feature) {
    return {
        color: feature.properties.Color || "#3388ff",
        weight: 4,
        opacity: 0.9,
        pane: "routesPane"
    };
}

// Park polygon styling
function parkStyle() {
    return {
        color: "#228B22",
        weight: 1,
        fillColor: "#7CFC00",
        fillOpacity: 0.4,
        pane: "routesPane"
    };
}

// Park label styling
function parkLabelStyle() {
    return {
        pane: "labelsPane",
        interactive: false
    };
}

/* ============================================================
   POPUP BUILDERS
=============================================================== */

function buildRoutePopup(props) {
    let html = "<b>" + (props.Name || "Unnamed Route") + "</b><br>";

    if (props.Length_km) {
        html += "Length: " + props.Length_km + " km<br>";
    }
    if (props.Surface) {
        html += "Surface: " + props.Surface + "<br>";
    }
    if (props.Status) {
        html += "Status: " + props.Status + "<br>";
    }
    if (props.URL) {
        html += `<a href="${props.URL}" target="_blank">More Info</a>`;
    }

    return html;
}

function buildPointPopup(props) {
    let html = "<b>" + (props.Name || "Point of Interest") + "</b><br>";

    if (props.Type) {
        html += "Type: " + props.Type + "<br>";
    }
    if (props.Address) {
        html += props.Address + "<br>";
    }
    if (props.URL) {
        html += `<a href="${props.URL}" target="_blank">Website</a>`;
    }

    return html;
}

/* ============================================================
   ICONS (Bike shops, etc.)
=============================================================== */

var bikeShopIcon = L.icon({
    iconUrl: "../markers/BikeShops_12.svg",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -10],
    pane: "pointsPane"
});

/* ============================================================
   GEOJSON LOADERS
=============================================================== */

// Load cycling routes
$.getJSON("../data/Existing_Routes.geojson", function (data) {
    var layer = L.geoJSON(data, {
        style: routeStyle,
        onEachFeature: function (feature, layer) {
            layer.bindPopup(buildRoutePopup(feature.properties));
        }
    });

    routeLayers.addLayer(layer);
});

// Load proposed routes
$.getJSON("../data/Proposed_Routes.geojson", function (data) {
    var layer = L.geoJSON(data, {
        style: routeStyle,
        onEachFeature: function (feature, layer) {
            layer.bindPopup(buildRoutePopup(feature.properties));
        }
    });

    routeLayers.addLayer(layer);
});

// Load parks
$.getJSON("../data/Municipal_Parks.geojson", function (data) {
    var layer = L.geoJSON(data, {
        style: parkStyle,
        onEachFeature: function (feature, layer) {
            if (feature.properties && feature.properties.Name) {
                layer.bindPopup("<b>" + feature.properties.Name + "</b>");
            }
        }
    });

    routeLayers.addLayer(layer);
});

// Load park labels
$.getJSON("../data/Park_Labels.geojson", function (data) {
    var layer = L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {
                icon: L.divIcon({
                    className: "park-label",
                    html: feature.properties.Name,
                    iconSize: [100, 20]
                })
            });
        }
    });

    parkLabelLayers.addLayer(layer);
});

// Load bike shops
$.getJSON("../data/Bike_Shops.geojson", function (data) {
    var layer = L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, { icon: bikeShopIcon });
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup(buildPointPopup(feature.properties));
        }
    });

    pointLayers.addLayer(layer);
});

/* ============================================================
   EXPORT (global)
=============================================================== */

window.routeStyle = routeStyle;
window.buildRoutePopup = buildRoutePopup;
window.buildPointPopup = buildPointPopup;
