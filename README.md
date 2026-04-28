## NOTES TO DEVELOPER ON USE OF GIT

# General Workflow:

1. Sit down at your computer
2. Clear out any work not committed from last time: git reset HEAD --hard
3. If you are working from the master (or main as per config), then 4+5; if continuing work on a branch, then 6
4. Reset things to master/main: git checkout master/main && git pull origin master/main
5. Create a new feature branch for what you're going to work on: git checkout -b feature/my-feature-name-here
6. Confirm you are in the desired branch. If not: git checkout -b branch-name origin/branch-name 
7. Add your work, committing as you go
8. Push to GitHub repo
9. As required, create a Pull Request from your branch feature/my-feature-name-here into master/main on GitHub with their UI
10. Review & merge the Pull Request into the master/main

# Git commands:
1. git commit -am "Comment"  -  commit all included saved files
2. git status --- check status of changes
3. git checkout -b feature/my-feature-name-here

## NOTES ON THE PROJECT

# West Kootenay Cycling Routes Map

An interactive web map of the cycling network in the West Kootenay region of British Columbia, maintained by the West Kootenay Cycling Coalition (WKCC).

---

## Architecture

The project is a **single-page, client-side web application** with no build system or backend. 
It is split across three files by concern: HTML structure (`index.html`), styles (`style.css`), and map logic (`map.js`).

### Libraries

| Library | Version | Purpose |
|---|---|---|
| [Leaflet.js](https://leafletjs.com/) | 1.9.4 | Core mapping engine |
| [Leaflet.Control.Layers.Tree](https://github.com/jjimenezshaw/Leaflet.Control.Layers.Tree) | latest | Hierarchical layer tree / legend panel |
| [Leaflet.VectorGrid](https://github.com/Leaflet/Leaflet.VectorGrid) | latest | Renders MapTiler vector tile contours |
| [Leaflet.LocateControl](https://github.com/domoritz/leaflet-locatecontrol) | latest | GPS "show my location" button |
| [jQuery](https://jquery.com/) | 3.7.1 | `$.getJSON()` for loading all GeoJSON data files |

### File Structure

```
index.html              # HTML skeleton — CDN links + <div id="map">
style.css               # All CSS (controls, popups, legend, responsive breakpoints)
map.js                  # All map logic (layers, filters, legend, panels)
data/                   # GeoJSON datasets (one file per layer)
hillshade_tiles/        # Pre-rendered hillshade PNGs, zoom levels 8–14 ({z}/{x}/{y}.png)
markers/                # SVG/PNG icons for point features
legend/                 # Thumbnail images used inside the layer tree control
images/                 # WKCC logo
```

### Key patterns in `map.js`

**`buildPopupTable(rows)`** — shared helper used by every layer. Accepts an array of `['Label', value]` pairs and returns the popup HTML, eliminating repeated string concatenation.

**`linkUrl(url, fallback)`** — formats a URL as a truncated anchor tag (capped at 40 characters). Used wherever a source link appears in a popup.

**`bikepackingRoutes` array** — the five bikepacking routes (Frog Peak Loop, Kootenay Confluence, Santa Rosa Valleys & Vistas, Bonnington Scrambler, Log Jam Loop) are defined as a single data array. One loop loads all five GeoJSON files and the legend tree children are built from the same array with `.map()`. Adding a new bikepacking route requires only a new entry in this array.

---

## Data Layers

All spatial data is loaded at runtime via `$.getJSON()` from local GeoJSON files. 
There is no tile server — polygons and lines are rendered directly by Leaflet.

### Basemaps (tile layers — mutually exclusive)
- **CartoDB Light** — default, clean street basemap
- **Esri World Imagery** — satellite/aerial imagery

### Terrain Overlays
- **Hillshade** — pre-rendered PNG tiles stored locally in `hillshade_tiles/` (zoom 8–14, opacity 0.7)
- **Contours** — vector tiles from MapTiler (`contours-v2`), styled as thin blue lines
- **Missing Files** There are some missing PNG tiles in `hillshade_tiles/` which produce silent 404s when called

### Bike Routes
| Layer | File | Style | Notes |
|---|---|---|---|
| Existing Routes | `Existing_Routes.geojson` | Solid green line | Filterable; click to highlight |
| Proposed Routes | `Proposed_Routes.geojson` | Red dashed line | Zoom-restricted; click to highlight |
| Priority Improvements | `Priority_Improvements.geojson` | Warning icon (⚠) | Point layer; click to highlight |
| Frog Peak Loop | `Frog_Peak_Loop.geojson` | Orange line | Bikepacking route |
| Kootenay Confluence | `Kootenay_Confluence.geojson` | Yellow line | Bikepacking route |
| Santa Rosa Valleys & Vistas | `Santa_Rosa_Valleys_and_Vistas.geojson` | Dark red line | Bikepacking route |
| Bonnington Scrambler | `Bonnington_Scrambler.geojson` | Amber line | Bikepacking route |
| Log Jam Loop | `Log_Jam_Loop.geojson` | Blue line | Bikepacking route |

Bikepacking routes are sourced from [BikePacking.com](https://bikepacking.com/west-kootenay/) (© Moe Nadeau).

### Parks & Boundaries
| Layer | Style | Interaction |
|---|---|---|
| Municipal Parks | Green fill | Hover tooltip (desktop) / tap popup (mobile) showing park name |
| Provincial Parks | Green fill, dashed border | Same as above |
| Municipal Boundaries | Orange dashed border, no fill | Non-interactive; hidden below zoom 12 |
| Regional Districts | Grey dashed border, no fill | Non-interactive |

### Points of Interest
| Layer | Icon | Popup Fields |
|---|---|---|
| Bike Shops | `BikeShops_12.svg` | Name, address, city, phone, URL |
| Recreation Sites | `picnic-2.png` | Name, number of campsites, description |
| BC Transit Stops | `BCTransitStops_10.svg` | (no popup) |

> **Note:** `Cities_and_Towns.geojson` and `Villages.geojson` exist in `data/` but are not currently loaded by `index.html`.

---

## Layer Rendering Order (Z-index)

Leaflet custom panes control draw order:

| Pane | Z-index | Layers |
|---|---|---|
| `terrainPane` | 250 | Hillshade, Contours |
| `boundariesPane` | 350 | Municipal & Regional District Boundaries |
| `routesPane` | 450 | Existing Routes, Proposed Routes |
| `BikePackingPane` | 470 | All five bikepacking routes |
| `parksPane` | 520 | (declared, not currently assigned) |
| `pointsPane` | 550 | Bike Shops, Recreation Sites, BC Transit, Priority Improvements |

---

## Interactive Features

### Route Highlighting
Clicking an Existing Route, Proposed Route, or Priority Improvement highlights it in yellow and opens a popup at the click location. Clicking the map background resets the highlight.

### Route Filters (top-left panel)
Filters apply to the **Existing Routes** layer only. Available filters:
- **Route Type** — dropdown populated dynamically from unique `Type` values in the GeoJSON
- **Surface** — dropdown populated dynamically from unique `Surface` values
- **Trans Canada Trail** — checkbox to show only TCT-designated routes

Non-matching routes are dimmed (opacity 0.4) rather than removed, so spatial context is preserved.

### Coordinate Picker
Double-clicking anywhere on the map opens a popup showing the latitude and longitude of that point, useful for submitting location-specific feedback.

### Map Controls
- **Layer tree / Legend** (top-right) — hierarchical toggle for all layers, with legend thumbnails; collapses on mobile by default
- **Route Filters** (top-left) — collapsible filter panel
- **Abstract** (bottom-left) — project description, feedback link, WKCC logo; expands on desktop, collapsed on mobile
- **Scale bar** (bottom-right) — metric only
- **Locate** (bottom-right) — flies to the user's GPS position

### Zoom Restrictions
Some layers are automatically shown/hidden based on zoom level, and their legend entries are greyed out when inactive:

| Layer | Visible at zoom |
|---|-----------------|
| Municipal Boundaries | 12 – 16         |
| Municipal Parks | 12 – 16         |

---

## Responsive Behaviour

At viewport widths below 768 px (mobile):
- Legend panel starts collapsed
- Abstract panel starts collapsed
- Popups expand to 90 vw
- Park labels use a tap-to-popup pattern instead of hover tooltips

---

## Adding a New Layer

All changes are made in `map.js`.

**For a regular layer (routes, parks, boundaries, POIs):**

1. Add the GeoJSON file to `data/`
2. Declare a `L.layerGroup()` variable in the layer groups block near the top
3. Load and style it with `$.getJSON()`, assigning it to an appropriate pane
4. Use `buildPopupTable([['Label', value], …])` to build the popup HTML
5. Add a `{ label: createLegendIcon(…), layer: YourLayer }` entry to the `treeControl` overlay tree
6. Add the layer to the `defaultLayers` array if it should be visible on load
7. Add it to `zoomRestrictedLayers` if it should auto-hide below a certain zoom

**For a new bikepacking route:**

Add a single entry to the `bikepackingRoutes` array at the top of `map.js`:

```js
{ file: 'Your_Route_Name', layer: Your_Route, color: 'rgba(r,g,b,1.0)', legendIcon: 'icon.png', legendLabel: 'Route Display Name' }
```

Also declare the corresponding `L.layerGroup()` variable in the layer groups block. 
The loading, styling, popup, and legend entry are all handled automatically by the loop.

---

## Data Sources & Attribution

| Source | Licence |
|---|---|
| Existing/Proposed Routes, Priority Improvements | © 2025 West Kootenay Cycling Coalition and Contributors |
| Bikepacking routes | © Moe Nadeau / BikePacking.com |
| Parks, Boundaries, Recreation Sites, BC Transit | © Province of British Columbia — [Open Government Licence](https://www2.gov.bc.ca/gov/content/data/policy-standards/data-policies/open-data/open-government-licence-bc) |
| CartoDB basemap tiles | © CartoDB CC BY 3.0 / © OpenStreetMap ODbL |
| Esri imagery tiles | © Esri and contributors |
| Contour vector tiles | © MapTiler / © OpenStreetMap contributors |