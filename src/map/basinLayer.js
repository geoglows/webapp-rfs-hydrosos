import {addProtocol} from "maplibre-gl";
import {Protocol} from "pmtiles";
import {MAX_MAP_ZOOM, whenStyleReady} from "./initMap.js";

const SOURCE_ID = "basins";
const SOURCE_LAYER = "basins";
const HIT_LAYER_ID = "basins-hit";
const OUTLINE_LAYER_ID = "basins-outline";
const SELECTED_FILL_ID = "basins-selected-fill";
const SELECTED_OUTLINE_ID = "basins-selected-outline";

// Matches nothing until a basin is picked
const NOTHING_SELECTED = ["==", ["get", "HYBAS_ID"], ""];

let protocolRegistered = false;

// HYBAS_ID -> [west, south, east, north], from public/basin_index.json.
// Vector tiles cannot tell us the extent of a basin that has never been
// rendered, so the search box zooms using this instead.
let basinBounds = {};

function selectedFilter(hybasID) {
  return ["==", ["get", "HYBAS_ID"], hybasID];
}

const LEGEND_CLASSES = [
  ["very-dry", "Very Dry"],
  ["dry", "Dry"],
  ["normal", "Normal"],
  ["wet", "Wet"],
  ["very-wet", "Very Wet"]
];

/** Reads the same status colors the charts shade their bands with. */
class HydroSOSLegend {
  onAdd() {
    this.container = document.createElement("div");

    this.container.className = "maplibregl-ctrl hydrosos-legend";

    this.container.innerHTML = `
      <div class="hydrosos-legend-title"><strong>HydroSOS Status</strong></div>
      ${LEGEND_CLASSES.map(([className, label]) => `
        <div class="hydrosos-legend-item">
          <span class="hydrosos-color ${className}"></span>
          <span>${label}</span>
        </div>
      `).join("")}
    `;

    return this.container;
  }

  onRemove() {
    this.container.remove();
  }
}

export async function addBasinLayer(map, {tilesUrl, bounds}, onClick) {
  basinBounds = bounds;

  map.addControl(new HydroSOSLegend(), "bottom-right");

  if (!protocolRegistered) {
    addProtocol("pmtiles", new Protocol().tile);
    protocolRegistered = true;
  }

  await whenStyleReady(map);

  map.addSource(SOURCE_ID, {
    type: "vector",
    url: `pmtiles://${new URL(tilesUrl, window.location.href).href}`
  });

  // Invisible, but it is what makes a basin clickable. MapLibre still
  // hit-tests fills at zero opacity.
  map.addLayer({
    id: HIT_LAYER_ID,
    type: "fill",
    source: SOURCE_ID,
    "source-layer": SOURCE_LAYER,
    paint: {
      "fill-opacity": 0
    }
  });

  map.addLayer({
    id: OUTLINE_LAYER_ID,
    type: "line",
    source: SOURCE_ID,
    "source-layer": SOURCE_LAYER,
    paint: {
      "line-color": "#808080",
      "line-width": 1
    }
  });

  map.addLayer({
    id: SELECTED_FILL_ID,
    type: "fill",
    source: SOURCE_ID,
    "source-layer": SOURCE_LAYER,
    filter: NOTHING_SELECTED,
    paint: {
      "fill-color": "#3388ff",
      "fill-opacity": 0.2
    }
  });

  map.addLayer({
    id: SELECTED_OUTLINE_ID,
    type: "line",
    source: SOURCE_ID,
    "source-layer": SOURCE_LAYER,
    filter: NOTHING_SELECTED,
    paint: {
      "line-color": "#3388ff",
      "line-width": 3
    }
  });

  map.on("click", HIT_LAYER_ID, event => {
    const hybasID = event.features[0].properties.HYBAS_ID;

    // You are already looking at the basin you clicked, so leave the view alone
    onClick(selectBasin(hybasID, map, {zoomTo: false}));
  });

  map.on("mouseenter", HIT_LAYER_ID, () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", HIT_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
  });
}

export function selectBasin(hybasID, map, {zoomTo = true} = {}) {
  const bounds = basinBounds[hybasID];

  if (!bounds) {
    return null;
  }

  // The tiles store HYBAS_ID as a number, so the filter has to compare numbers
  const id = Number(hybasID);

  map.setFilter(SELECTED_FILL_ID, selectedFilter(id));
  map.setFilter(SELECTED_OUTLINE_ID, selectedFilter(id));

  // A searched basin can be anywhere, so that one still has to be brought
  // into view.
  if (zoomTo) {
    const [west, south, east, north] = bounds;

    map.fitBounds([[west, south], [east, north]], {
      padding: 100,
      maxZoom: MAX_MAP_ZOOM
    });
  }

  return {properties: {HYBAS_ID: id}};
}
