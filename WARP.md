# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Static single-page app served directly from index.html. No build system, package manager, or tests are configured.
- Purpose: visualize Community Health Centers on a Leaflet map with a sidebar, support filtering by medication and sorting by distance/price.

Commands
- Preview locally (prevents CORS issues and simulates GitHub Pages serving):
```sh path=null start=null
python3 -m http.server 8000
```
Then open http://localhost:8000 in a browser.

- Open the page directly (macOS):
```sh path=null start=null
open index.html
```

- Lint/format: not configured in-repo. If needed ad hoc, use local tooling (e.g., Prettier/HTMLHint) outside this repo.
- Tests: none configured.

High-level architecture
- Entry point: index.html contains all HTML, CSS, and JavaScript (no bundler). CNAME configures a custom GitHub Pages domain.
- Third-party libraries (via CDN):
  - Leaflet for mapping (CSS/JS from unpkg)
  - PapaParse for CSV parsing (cdnjs)
- External data sources:
  - Health centers CSV: https://raw.githubusercontent.com/kanthipm/medpull/main/hc_data.csv
  - Inventory CSV: https://raw.githubusercontent.com/kanthipm/medpull/main/inventory.csv
  These URLs are hard-coded; data changes require updating those CSVs (in that upstream repo) or changing the URLs in index.html.
- External API:
  - OpenCage geocoding API is called per health center address; an API key is referenced in index.html. Do not commit secrets; rotate or replace the key as needed.

Runtime data model (all in-memory, keyed by health center name)
- healthCenters: { [name]: { lat, lon, name, address, hours, specializations, distance } }
- inventoryData: { [name]: { [medication]: { price } } }
- markers: { [name]: LeafletMarker }

UI and interaction flow
1) Initialization
   - Map centers on Houston (29.7604, -95.3698) and loads OSM tiles.
   - Fetch inventory CSV → parse with PapaParse → fill inventoryData → populate the medication dropdown.
   - Fetch health centers CSV → for each row, geocode address via OpenCage → compute distance from Houston → create healthCenters entry and add a map marker.
   - Once all geocodes resolve, initialize the sidebar list with all centers.
2) Filtering and sorting
   - Medication filter: shows only centers present in inventoryData for the selected medication.
   - Sort dropdown: default by distance; if a medication is selected, can sort by price for that medication.
3) Sidebar ↔ map sync
   - Clicking a sidebar entry recenters the map, opens the corresponding marker popup, and expands details.
   - Clicking a marker scrolls and expands the corresponding sidebar entry.
4) Distance calculation
   - Haversine implementation returns miles; the reference point is hard-coded to Houston. Update both the initial map center and distance reference together if changing regions.

Operational notes
- Rate limits: geocoding occurs one request per health center; large CSVs may hit OpenCage rate limits. Consider caching results or precomputing coordinates upstream if scaling.
- Data updates: edit the upstream CSVs or point the code at different URLs; this repo does not store the CSVs locally.
