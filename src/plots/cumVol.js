import {computeRollingWindowCurves} from "../utils/computeRollingWindowCurves";
import {buildRecords} from "../utils/buildRecords";
import {computeMedianCurve} from "../utils/computeMedianCurve";
import {legendDefaults, renderChart, titleOptions, tooltipDefaults, unifiedHover} from "./chartSetup.js";
import { getVolumeUnit } from "../utils/formatVolume.js";

export function plotCumulativeVolume(data) {
  const records = buildRecords(data);

  const curves =
    computeRollingWindowCurves(records);

  const cumulativeCurves = curves.map(curve => {
    let runningTotal = 0;

    return {
      year: curve.year,
      dates: curve.referenceDates,
      cumulativeVolume: curve.records.map(record => {
        runningTotal += record.volume;

        return runningTotal;
      })
    };
  });

  const allVolumes =
    cumulativeCurves.flatMap(
        curve => curve.cumulativeVolume
    );

const maxVolume =
    Math.max(...allVolumes);

const volumeUnit =
    getVolumeUnit(maxVolume);

  // Each historical year as a faint gray line in the background.
  //
  // Chart.js draws datasets from the highest order to the lowest, so the
  // background needs the highest order to end up underneath. Without this
  // the gray mass is drawn over the two lines that matter.
  const datasets = cumulativeCurves.map(curve => ({
    label: "",
    data: toPoints(curve.dates, curve.cumulativeVolume, volumeUnit),
    borderColor: "rgba(204, 204, 204, 0.5)",
    borderWidth: 1,
    pointRadius: 0,
    order: 2,
    skipTooltip: true
  }));

  const today = new Date();

  const currentWaterYear =
    today.getUTCMonth() >= 9
      ? today.getUTCFullYear() + 1
      : today.getUTCFullYear();

  const recentCurves = cumulativeCurves
    .filter(curve => curve.year < today.getUTCFullYear()) // exclude current incomplete WY
    .sort((a, b) => a.year - b.year)
    .slice(-30);

  const median = computeMedianCurve(recentCurves);

  datasets.push({
    label: "30-year Median",
    data: toPoints(median.dates, median.cumulativeVolume, volumeUnit),
    borderColor: "#1f77b4",
    borderWidth: 4,
    pointRadius: 0,
    order: 1
  });

  const currentCurve = cumulativeCurves.find(
    c => c.year === currentWaterYear
  );

  if (currentCurve) {
    datasets.push({
      label: "Current Water Year",
      data: toPoints(
        currentCurve.dates,
        currentCurve.cumulativeVolume,
        volumeUnit
      ),
      borderColor: "black",
      borderWidth: 4,
      pointRadius: 0,
      order: 0
    });
  }

  renderChart("cumulative-volume", {
    type: "line",
    data: {datasets},
    options: {
      responsive: true,
      interaction: unifiedHover,
      plugins: {
        title: titleOptions("Simulated Cumulative Volume"),
        legend: {
          ...legendDefaults,
          position: "top"
        },
        tooltip: {
          ...tooltipDefaults,
          callbacks: {
            label: item =>
              `${item.dataset.label}: ` +
              `${item.parsed.y.toFixed(volumeUnit.decimals)} ` +
              `${volumeUnit.label}`
          }
        }
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "month",
            displayFormats: {month: "MMM"},
            tooltipFormat: "d MMM yyyy"
          },
          title: {
            display: true,
            text: "Date"
          }
        },
        y: {
          title: {
            display: true,
            text: `Cumulative Volume (${volumeUnit.label})`
          }
        }
      }
    }
  });
}

function toPoints(dates, volumes, volumeUnit) {
  return volumes.map((volume, index) => ({
    x: dates[index],
    y: volume == null
      ? null
      : volume / volumeUnit.divisor
  }));
}
