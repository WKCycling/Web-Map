/* ============================================================
   CONTROLS MODULE (WK Cycling Map v2)
   Handles UI controls: filter panel toggle, abstract panel
   toggle, and custom Leaflet buttons.
=============================================================== */

/* ============================================================
   FILTER PANEL TOGGLE
=============================================================== */

function toggleFilterPanel() {
    var panel = document.getElementById("filter-panel");

    if (panel.classList.contains("hidden")) {
        panel.classList.remove("hidden");
    } else {
        panel.classList.add("hidden");
    }
}

/* ============================================================
   ABSTRACT PANEL CONTENT
=============================================================== */

function buildAbstractPanel() {
    var panel = document.getElementById("abstract-panel");

    panel.innerHTML = `
        <h2>About This Map</h2>
        <p>
            This interactive cycling map for the West Kootenays highlights
            existing and proposed cycling routes, parks, bike shops, and
            other points of interest. Use the filter panel to refine the
            routes shown on the map.
        </p>
        <p>
            Data sources include municipal GIS datasets, community cycling
            groups, and field verification. This map is maintained by the
            WK Cycling Coalition.
        </p>
    `;
}

/* ============================================================
   ABSTRACT PANEL TOGGLE
=============================================================== */

function toggleAbstractPanel() {
    var panel = document.getElementById("abstract-panel");

    if (panel.classList.contains("hidden")) {
        panel.classList.remove("hidden");
    } else {
        panel.classList.add("hidden");
    }
}

/* ============================================================
   CUSTOM LEAFLET BUTTONS
=============================================================== */

var FilterControl = L.Control.extend({
    options: { position: "topright" },

    onAdd: function () {
        var btn = L.DomUtil.create("div", "leaflet-control-custom");
        btn.innerHTML = "Filters";

        btn.onclick = function () {
            toggleFilterPanel();
        };

        return btn;
    }
});

var AbstractControl = L.Control.extend({
    options: { position: "topright" },

    onAdd: function () {
        var btn = L.DomUtil.create("div", "leaflet-control-custom");
        btn.innerHTML = "About";

        btn.onclick = function () {
            toggleAbstractPanel();
        };

        return btn;
    }
});

/* ============================================================
   ADD CONTROLS TO MAP
=============================================================== */

map.addControl(new FilterControl());
map.addControl(new AbstractControl());

/* ============================================================
   INITIALIZE ABSTRACT PANEL
=============================================================== */

buildAbstractPanel();
// --- User Location Button Control ---
L.Control.Locate = L.Control.extend({
    onAdd: function () {
        const btn = L.DomUtil.create('button', 'locate-btn');
        btn.title = "Show my location";
        btn.innerHTML = "📍";

        L.DomEvent.on(btn, 'click', (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);

            map.locate({ setView: true, maxZoom: 15 });
        });

        return btn;
    },

    onRemove: function () {}
});

L.control.locate = function (opts) {
    return new L.Control.Locate(opts);
};

// Add the control to the map
L.control.locate({ position: 'topleft' }).addTo(map);

// When location is found, show marker + circle
map.on('locationfound', function (e) {
    if (window._userMarker) {
        map.removeLayer(window._userMarker);
        map.removeLayer(window._userCircle);
    }

    window._userMarker = L.marker(e.latlng).addTo(map);
    window._userCircle = L.circle(e.latlng, {
        radius: e.accuracy,
        color: '#136AEC',
        fillColor: '#136AEC',
        fillOpacity: 0.2
    }).addTo(map);
});

// When location fails
map.on('locationerror', function () {
    alert("Unable to access your location.");
});
/* ============================================================
   EXPORT (global)
=============================================================== */

window.toggleFilterPanel = toggleFilterPanel;
window.toggleAbstractPanel = toggleAbstractPanel;
