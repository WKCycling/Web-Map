/* ============================================================
   UTILS MODULE (WK Cycling Map v2)
   Shared helper functions used across multiple modules.
=============================================================== */

/* ============================================================
   SAFE PROPERTY ACCESS
   Prevents errors when properties are missing.
=============================================================== */

function getProp(obj, key, fallback = "") {
    if (!obj || obj[key] === undefined || obj[key] === null) {
        return fallback;
    }
    return obj[key];
}

/* ============================================================
   FORMAT URL (ensures http:// is present)
=============================================================== */

function formatURL(url) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }
    return "https://" + url;
}

/* ============================================================
   CREATE HTML TABLE FROM PROPERTIES
   Useful for popups with many attributes.
=============================================================== */

function buildPropertyTable(props, fields) {
    var html = "<table class='popup-table'>";

    fields.forEach(function (field) {
        var label = field.label;
        var key = field.key;

        var value = getProp(props, key, "");

        if (value !== "") {
            html += `
                <tr>
                    <td><b>${label}</b></td>
                    <td>${value}</td>
                </tr>
            `;
        }
    });

    html += "</table>";
    return html;
}

/* ============================================================
   NUMBER FORMATTING
=============================================================== */

function formatNumber(num, decimals = 1) {
    if (num === null || num === undefined || isNaN(num)) return "";
    return parseFloat(num).toFixed(decimals);
}

/* ============================================================
   LENGTH CATEGORY (used by filters)
=============================================================== */

function lengthCategory(km) {
    km = parseFloat(km || 0);

    if (km < 5) return "Short";
    if (km <= 15) return "Medium";
    return "Long";
}

/* ============================================================
   EXPORT HELPERS (global)
=============================================================== */

window.getProp = getProp;
window.formatURL = formatURL;
window.buildPropertyTable = buildPropertyTable;
window.formatNumber = formatNumber;
window.lengthCategory = lengthCategory;
