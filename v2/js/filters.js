/* ============================================================
   FILTERS MODULE (WK Cycling Map v2)
   Handles dropdown population, filter state, and filtering
   logic for route layers.
=============================================================== */

/* ============================================================
   FILTER STATE
=============================================================== */

var filterState = {
    surface: "All",
    status: "All",
    length: "All"
};

/* ============================================================
   POPULATE FILTER PANEL
=============================================================== */

function buildFilterPanel() {
    var panel = document.getElementById("filter-panel");

    panel.innerHTML = `
        <h2>Filter Routes</h2>

        <div class="filter-group">
            <label for="surfaceFilter">Surface</label>
            <select id="surfaceFilter">
                <option value="All">All</option>
                <option value="Paved">Paved</option>
                <option value="Gravel">Gravel</option>
                <option value="Dirt">Dirt</option>
            </select>
        </div>

        <div class="filter-group">
            <label for="statusFilter">Status</label>
            <select id="statusFilter">
                <option value="All">All</option>
                <option value="Existing">Existing</option>
                <option value="Proposed">Proposed</option>
            </select>
        </div>

        <div class="filter-group">
            <label for="lengthFilter">Length</label>
            <select id="lengthFilter">
                <option value="All">All</option>
                <option value="Short">Under 5 km</option>
                <option value="Medium">5–15 km</option>
                <option value="Long">Over 15 km</option>
            </select>
        </div>
    `;

    attachFilterListeners();
}

/* ============================================================
   FILTER LOGIC
=============================================================== */

function featureMatchesFilters(feature) {
    var p = feature.properties;

    // Surface filter
    if (filterState.surface !== "All" && p.Surface !== filterState.surface) {
        return false;
    }

    // Status filter
    if (filterState.status !== "All" && p.Status !== filterState.status) {
        return false;
    }

    // Length filter
    if (filterState.length !== "All") {
        var len = parseFloat(p.Length_km || 0);

        if (filterState.length === "Short" && len >= 5) return false;
        if (filterState.length === "Medium" && (len < 5 || len > 15)) return false;
        if (filterState.length === "Long" && len <= 15) return false;
    }

    return true;
}

/* ============================================================
   APPLY FILTERS TO ROUTE LAYERS
=============================================================== */

function updateRouteFiltering() {
    routeLayers.clearLayers();

    $.getJSON("../data/Existing_Routes.geojson", function (data) {
        var layer = L.geoJSON(data, {
            style: routeStyle,
            filter: featureMatchesFilters,
            onEachFeature: function (feature, layer) {
                layer.bindPopup(buildRoutePopup(feature.properties));
            }
        });
        routeLayers.addLayer(layer);
    });

    $.getJSON("../data/Proposed_Routes.geojson", function (data) {
        var layer = L.geoJSON(data, {
            style: routeStyle,
            filter: featureMatchesFilters,
            onEachFeature: function (feature, layer) {
                layer.bindPopup(buildRoutePopup(feature.properties));
            }
        });
        routeLayers.addLayer(layer);
    });
}

/* ============================================================
   EVENT LISTENERS
=============================================================== */

function attachFilterListeners() {
    document.getElementById("surfaceFilter").addEventListener("change", function () {
        filterState.surface = this.value;
        updateRouteFiltering();
    });

    document.getElementById("statusFilter").addEventListener("change", function () {
        filterState.status = this.value;
        updateRouteFiltering();
    });

    document.getElementById("lengthFilter").addEventListener("change", function () {
        filterState.length = this.value;
        updateRouteFiltering();
    });
}

/* ============================================================
   INITIALIZE FILTER PANEL
=============================================================== */

buildFilterPanel();

/* ============================================================
   EXPORT (global)
=============================================================== */

window.updateRouteFiltering = updateRouteFiltering;
