# CLAUDE.md

## Project overview

A client-side web map of the cycling network in the West Kootenay region of BC. No build system, no backend, no package manager — plain HTML, CSS, and JavaScript served as static files.

## File layout

| File | Purpose |
|---|---|
| `index.html` | HTML skeleton only — CDN script/link tags and `<div id="map">` |
| `style.css` | All CSS |
| `map.js` | All map logic |
| `data/*.geojson` | One GeoJSON file per layer |
| `hillshade_tiles/` | Pre-rendered PNG hillshade tiles (`{z}/{x}/{y}.png`, zoom 8–14) |
| `markers/` | SVG/PNG point icons |
| `legend/` | Thumbnail images used in the layer tree control |

## Coding conventions

- Use `var` throughout — the existing codebase does not use `let`/`const`, keep it consistent.
- No TypeScript, no transpilation, no bundlers.
- All JavaScript stays in `map.js`, all CSS stays in `style.css`. Do not add inline `<script>` or `<style>` blocks to `index.html`.

## Key patterns

**`buildPopupTable(rows)`** — use this for every layer popup. Pass `[['Label', value], …]` pairs.

**`linkUrl(url, fallback)`** — use this wherever a URL appears in a popup. Truncates to 40 characters.

**`bikepackingRoutes` array** — to add a new bikepacking route, add one entry to this array at the top of `map.js` and declare the corresponding `L.layerGroup()` variable. The loading loop, popup, and legend entry are all automatic.

**`bcOGL`** — reuse this constant for the BC Open Government Licence attribution string.

**`wkccAttr`** — reuse this constant for WKCC attribution.

## Adding a new layer

1. Add the GeoJSON file to `data/`.
2. Declare `var New_Layer = L.layerGroup();` in the layer groups block.
3. Load with `$.getJSON("data/New_Layer.geojson", ...)` and call `.addTo(New_Layer)`.
4. Build the popup with `buildPopupTable([…])`.
5. Add `{ label: createLegendIcon("icon.png", "Name"), layer: New_Layer }` to the `treeControl` overlay tree.
6. Add `New_Layer` to the `defaultLayers` array if it should be on by default.
7. Add to `zoomRestrictedLayers` if it should auto-hide below a zoom level.

## Pane z-index order

| Pane | z-index |
|---|---|
| `terrainPane` | 250 |
| `boundariesPane` | 350 |
| `routesPane` | 450 |
| `BikePackingPane` | 470 |
| `parksPane` | 520 |
| `pointsPane` | 550 |

## Things to avoid

- Do not add a build step, bundler, or npm dependencies.
- Do not move GeoJSON data into `map.js` — keep it in `data/` so files stay manageable.
- Do not add `!important` to CSS unless overriding a third-party Leaflet rule.
- Do not hardcode pixel widths in popup HTML — let `style.css` handle sizing.