/* ============================================================
   LEGEND MODULE (WK Cycling Map v2)
   Handles legend UI, expand/collapse behavior, and content.
=============================================================== */

/* ============================================================
   BUILD LEGEND CONTENT
=============================================================== */

function buildLegend() {
    var legend = document.getElementById("legend");

    legend.innerHTML = `
        <div id="legend-header" class="legend-header">
            Map Legend
        </div>

        <div id="legend-content">

            <div class="legend-item">
                <div class="legend-symbol" style="background:#3388ff;"></div>
                <span>Existing Cycling Routes</span>
            </div>

            <div class="legend-item">
                <div class="legend-symbol" style="background:#ff8800;"></div>
                <span>Proposed Cycling Routes</span>
            </div>

            <div class="legend-item">
                <div class="legend-symbol" style="background:#7CFC00; border-color:#228B22;"></div>
                <span>Parks</span>
            </div>

            <div class="legend-item">
                <img src="../markers/BikeShops_12.svg" width="22" height="22" style="margin-right:8px;">
                <span>Bike Shops</span>
            </div>

        </div>
    `;
}

/* ============================================================
   EXPAND / COLLAPSE LOGIC
=============================================================== */

function attachLegendBehavior() {
    var legend = document.getElementById("legend");
    var header = document.getElementById("legend-header");

    header.addEventListener("click", function () {
        if (legend.classList.contains("collapsed")) {
            legend.classList.remove("collapsed");
            legend.classList.add("expanded");
        } else {
            legend.classList.remove("expanded");
            legend.classList.add("collapsed");
        }
    });
}

/* ============================================================
   INITIALIZE LEGEND
=============================================================== */

buildLegend();
attachLegendBehavior();

/* ============================================================
   EXPORT (global)
=============================================================== */

window.buildLegend = buildLegend;
