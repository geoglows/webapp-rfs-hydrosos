console.log("DIAGNOSTIC SCRIPT STARTED");

import fs from "node:fs/promises";

import { fetchRetrospective } from "../data/fetchRetrospective.js";
import { buildRecords } from "../utils/buildRecords.js";
import { getHydroSOSData } from "../utils/getHydroSOSdata.js";
import { computeHydrologicSummary } from "../utils/computeHydrologicSummary.js";

const CONCURRENCY = 5;

const outletLookup = JSON.parse(
  await fs.readFile("./public/outlet_lookup.json", "utf8")
);

const basins = Object.entries(outletLookup).map(
  ([hybasID, { riverID }]) => ({
    hybasID,
    riverID
  })
);

console.log("========================================");
console.log("HYDROSOS BASIN STATUS DIAGNOSTIC");
console.log("========================================");
console.log(`Basins found: ${basins.length}`);
console.log(`Concurrency: ${CONCURRENCY}`);
console.log();

const results = [];
const failures = [];

async function processBasin(basin, index) {
  const { hybasID, riverID } = basin;

  try {
    const data = await fetchRetrospective(riverID);

    const records = buildRecords(data);

    const hydroSOSData = getHydroSOSData(records);

    const summary = computeHydrologicSummary(
      records,
      hydroSOSData.bands,
      hydroSOSData.currentYearMonthly
    );

    if (!summary) {
      throw new Error("Hydrologic summary returned null");
    }

    results.push({
      hybasID,
      riverID,

      flowPercentile: summary.flowPercentile,
      volumePercentile: summary.volumePercentile,
      outlookPercentile: summary.outlookPercentile,

      currentStatus: summary.status
    });

    console.log(
      `[${index + 1}/${basins.length}] ` +
      `${hybasID} / ${riverID} ✓`
    );

  } catch (error) {
    failures.push({
      hybasID,
      riverID,
      error: error.message
    });

    console.error(
      `[${index + 1}/${basins.length}] ` +
      `${hybasID} / ${riverID} ✗ ${error.message}`
    );
  }
}

async function runWithConcurrency(items, concurrency) {
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;

      if (index >= items.length) {
        return;
      }

      await processBasin(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );

  await Promise.all(workers);
}

await runWithConcurrency(basins, CONCURRENCY);

console.log();
console.log("========================================");
console.log("RESULTS");
console.log("========================================");
console.log(`Successful: ${results.length}`);
console.log(`Failed:     ${failures.length}`);
console.log();

if (results.length > 0) {
  const headers = [
    "hybasID",
    "riverID",
    "flowPercentile",
    "volumePercentile",
    "outlookPercentile",
    "currentStatus"
  ];

  const csvRows = [
    headers.join(","),

    ...results.map(row =>
      headers
        .map(header => {
          const value = row[header];

          if (value == null) {
            return "";
          }

          if (typeof value === "string") {
            return `"${value.replaceAll('"', '""')}"`;
          }

          return value;
        })
        .join(",")
    )
  ];

  await fs.writeFile(
    "./basin_status_metrics.csv",
    csvRows.join("\n"),
    "utf8"
  );

  console.log(
    `Saved ${results.length} basin records to basin_status_metrics.csv`
  );
}

if (failures.length > 0) {
  const failureRows = [
    "hybasID,riverID,error",

    ...failures.map(row =>
      [
        row.hybasID,
        row.riverID,
        `"${row.error.replaceAll('"', '""')}"`
      ].join(",")
    )
  ];

  await fs.writeFile(
    "./basin_status_failures.csv",
    failureRows.join("\n"),
    "utf8"
  );

  console.log(
    `Saved ${failures.length} failures to basin_status_failures.csv`
  );
}

console.log();
console.log("Diagnostic extraction complete.");