import "./styles.css";

import {addRasterLayer} from "./map/rasterLayer.js";
import {createMap} from "./map/initMap.js";
import {findLatestTif} from "./utils/findLatestTif.js";
import {fetchRetrospective} from "./data/fetchRetrospective.js";
import {plotCumulativeVolume} from "./plots/cumVol.js";
import {plotHydroSOSBands} from "./plots/hydroSOSbands.js";
import {plotForecastEnvelope} from "./plots/forecastEnvelope.js";
import {buildRecords} from "./utils/buildRecords.js";
import {getHydroSOSData} from "./utils/getHydroSOSdata.js";
import {addBasinLayer, selectBasin} from "./map/basinLayer.js";
import {destroyAllCharts} from "./plots/chartSetup.js";
import {plotTotalDischarge} from "./plots/yearlyVolume.js";
import {computeHydrologicSummary} from "./utils/computeHydrologicSummary.js";
import {updateHydrologicSummary} from "./utils/updateHydrologicSummary.js";
import { createDatePickerControl } from "./utils/datePicker.js";
import {loadBasinSearchIndex,searchBasins} from "./utils/basinSearch.js"
import { fetchBiasCorrectedRetrospective } from "./data/fetchBiasCorrected.js";
import { createDataSourceControl } from "./utils/dataSourceControl.js";
import { initAboutPanel } from "./ui/aboutPanel.js";



const map = createMap();

map.addControl(
  createDatePickerControl(map),
  "top-right"
);

map.addControl(
  createDataSourceControl({
    onChange: handleDataSourceChange
  }),
  "top-right"
);

const tifUrl = await findLatestTif();
await addRasterLayer(map, tifUrl);

await loadBasinSearchIndex();

const panel = document.getElementById("basin-panel");
const toggleButton = document.getElementById("toggle-panel");

let useBiasCorrected = false;
let currentBasinFeature = null;

initAboutPanel();

// The panel takes half the row away from the map, so MapLibre has to
// remeasure once the width transition has finished.
function syncPanelState() {
  const open = !panel.classList.contains("hidden");
  toggleButton.textContent = open ? "Hide Charts" : "Show Charts";
  toggleButton.setAttribute("aria-expanded", String(open));
  setTimeout(() => map.resize(), 320);
}

function openPanel() {
  panel.classList.remove("hidden");
  syncPanelState();
}

function closePanel() {
  panel.classList.add("hidden");
  document.getElementById("loading").style.display = "none";
  destroyAllCharts();
  syncPanelState();
}

const searchBox = document.getElementById("basin-search");
const searchButton = document.getElementById("search-button");

const suggestionsBox =
  document.getElementById("basin-suggestions");

  searchBox.addEventListener(
    "input",
    handleSearchInput
  );

  function handleSearchInput() {

    const query =
      searchBox.value.trim();
  
    if (!query) {
      hideSuggestions();
      return;
    }
  
    const suggestions =
      searchBasins(query);
  
    showSuggestions(suggestions);
  }

  function showSuggestions(suggestions) {

    if (suggestions.length === 0) {
        hideSuggestions();
        return;
    }


    suggestionsBox.innerHTML =
        suggestions.map(basin => `
            <div
                class="basin-suggestion"
                data-hybas-id="${basin.hybasId}"
            >
                <div class="basin-suggestion-name">
                    ${basin.name || "Unnamed basin"}
                </div>

                <div class="basin-suggestion-id">
                    HYBASIN ${basin.hybasId}
                </div>
            </div>
        `).join("");


    suggestionsBox.classList.add("visible");


    suggestionsBox
        .querySelectorAll(".basin-suggestion")
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    const hybasID =
                        item.dataset.hybasId;

                    searchBox.value =
                        hybasID;

                    hideSuggestions();

                    runSearch();

                }
            );

        });
}
  
  
  function hideSuggestions() {
  
    suggestionsBox.innerHTML = "";
  
    suggestionsBox.classList.remove(
      "visible"
    );
  
  }

  document.addEventListener(
    "click",
    event => {
  
      if (
        !event.target.closest(
          ".basin-search-container"
        )
      ) {
        hideSuggestions();
      }
  
    }
  );

document
  .getElementById("close-modal")
  .addEventListener("click", closePanel);

toggleButton.addEventListener("click", () => {
  if (panel.classList.contains("hidden")) openPanel();
  else closePanel();
});

// Corrects the url builder so this could work in multiple environments
const base = import.meta.env.BASE_URL;
const basinBounds = await fetch(`${base}basin_index.json`).then(r => r.json());
const outletLookup = await fetch(`${base}outlet_lookup.json`).then(r => r.json());

const outletNames = await fetch(`${base}outlet_names.json`)
  .then(r => r.json());

  console.log("Basin lookup:", basinBounds);
console.log("Outlet lookup:", outletLookup);
console.log("Outlet names:", outletNames);

console.log(
  "Example outlet name:",
  outletNames["7040585120"]
);

async function fetchRetrospectiveData(riverID) {
  if (useBiasCorrected) {
    return fetchBiasCorrectedRetrospective(riverID);
  }

  return fetchRetrospective(riverID);
}

function handleDataSourceChange(biasCorrected) {
  if (biasCorrected === useBiasCorrected) {
    return;
  }

  useBiasCorrected = biasCorrected;

  // If a basin is already open, reload it using the new source.
  if (currentBasinFeature) {
    openBasin(currentBasinFeature);
  }
}

// -------------------------------
// Open a basin (used by BOTH clicks and search)
// -------------------------------

async function openBasin(feature) {
  currentBasinFeature = feature;


  openPanel();
  document.querySelector(".panel-content").scrollTop = 0;

  const props = feature.properties;
const hybasID = String(props.HYBAS_ID);

const outletInfo = outletLookup[hybasID];

if (!outletInfo) {
  console.error("No outlet lookup found for basin:", hybasID);
  return;
}

const riverID = outletInfo.riverID;

const riverName =
  outletNames[hybasID]?.riverName ?? null;

  
  document.getElementById("loading").style.display = "flex";

  try {
    const data = await fetchRetrospectiveData(riverID);

    plotCumulativeVolume(data);
    const records = buildRecords(data);
    const hydroSOSData = getHydroSOSData(records);

    updateHydrologicSummary(
      computeHydrologicSummary(
        records,
        hydroSOSData.bands,
        hydroSOSData.currentYearMonthly
      ),
      hybasID,
      riverID,
      riverName
    );

    plotHydroSOSBands(
      hydroSOSData.bands,
      hydroSOSData.currentYearMonthly
    );

    plotForecastEnvelope(data);
    plotTotalDischarge(data);

  } catch (error) {
    console.error(error);

    destroyAllCharts();

    updateHydrologicSummary(
      null,
      hybasID,
      riverID,
      riverName
    );

    alert("Unable to load basin data.");

  } finally {
    document.getElementById("loading").style.display = "none";
  }
}

// -------------------------------
// Add basin layer
// -------------------------------
await addBasinLayer(
  map,
  {tilesUrl: `${base}hydrobasins.pmtiles`, bounds: basinBounds},
  openBasin
)

function runSearch() {

  const hybasID =
    searchBox.value.trim();

  hideSuggestions();

  const feature =
    selectBasin(hybasID, map);

  if (!feature) {
    alert("HYBAS_ID not found.");
    return;
  }

  openBasin(feature);
}

searchButton.addEventListener("click", runSearch)
searchBox.addEventListener(
  "keydown", event => {
    if (event.key === "Enter") runSearch();
  }
)

// initDatePicker(map, {
//   inputEl: document.getElementById("hydrosos-date"),
//   prevBtn: document.getElementById("hydrosos-prev"),
//   nextBtn: document.getElementById("hydrosos-next")
// });
