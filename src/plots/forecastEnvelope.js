import {buildRecords} from "../utils/buildRecords.js";
import {getHistoricalForecastCurves} from "../utils/getHistoricalForecastCurves.js";
import {computeForecastEnvelope} from "../utils/computeForecastEnvelope.js";
import {computeDailyPercentileBands} from "../utils/computeDailyPercentileBands.js";
import {computeRollingWindowCurves} from "../utils/computeRollingWindowCurves.js";
import { getVolumeUnit } from "../utils/formatVolume.js";
import {legendDefaults, renderChart, titleOptions, tooltipDefaults, unifiedHover} from "./chartSetup.js";

export function plotForecastEnvelope(data) {
  const records = buildRecords(data);

  const rollingCurves =
    computeRollingWindowCurves(records);

  const cumulativeCurves = rollingCurves.map(curve => {
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

  console.log(
    "Cumulative curves with invalid values:",
    cumulativeCurves.filter(curve =>
        curve.cumulativeVolume.some(
            v => v == null || Number.isNaN(v)
        )
    ).map(curve => ({
        year: curve.year,
        invalidValues:
            curve.cumulativeVolume.filter(
                v => v == null || Number.isNaN(v)
            ).length
    }))
);

  const today = new Date();

  const historicalCurves =
    cumulativeCurves
      .filter(c => c.year < today.getUTCFullYear())
      .sort((a, b) => a.year - b.year)
      .slice(-30);

  const currentCurve =
    cumulativeCurves.find(
      c => c.year === today.getUTCFullYear()
    );

    console.log("Current curve:", {
      year: currentCurve?.year,
      length: currentCurve?.cumulativeVolume.length,
      lastVolume: currentCurve?.cumulativeVolume.at(-1),
      invalidValues:
          currentCurve?.cumulativeVolume.filter(
              v => v == null || Number.isNaN(v)
          ).length
  });

  const lastModeledDate =
    currentCurve.dates[currentCurve.cumulativeVolume.length - 1];

  const historicalForecasts =
    getHistoricalForecastCurves(
      historicalCurves,
      currentCurve,
      lastModeledDate
    );

  const forecast =
    computeForecastEnvelope(
      historicalForecasts
    );

    console.log("Forecast:", {
      median: forecast?.median?.at(-1),
      minimum: forecast?.minimum?.at(-1),
      maximum: forecast?.maximum?.at(-1)
  });

  const dailyBands =
    computeDailyPercentileBands(historicalCurves);

  const currentVolume =
    currentCurve.cumulativeVolume.at(-1);

    

  const maxVolume =
    Math.max(
        ...cumulativeCurves.flatMap(
            curve => curve.cumulativeVolume
        )
    );

const volumeUnit =
    getVolumeUnit(maxVolume);
  
  

  // Forecast is stored as volume added since the last modeled day,
  // so shift it up onto the end of the modeled curve.
  const shifted = values =>
    values.map(
        v =>
            v == null
                ? null
                : (currentVolume + v) /
                  volumeUnit.divisor
    );

    const bandPoints = values =>
      toPoints(
          dailyBands.dates,
          values,
          volumeUnit
      );

  const forecastPoints = key => {
    const values = shifted(forecast[key]);

    return forecast.dates.map((date, index) => ({
      x: date,
      y: values[index]
    }));
  };

  const datasets = [];

  // Historical percentile bands, each filling down to the one before it
  datasets.push({
    label: "",
    data: bandPoints(dailyBands.minimum),
    borderWidth: 0,
    pointRadius: 0,
    order: 3,
    skipTooltip: true
  });

  const bands = [
    ["Very Dry", dailyBands.p10, "#CD233F80"],
    ["Dry", dailyBands.p25, "#FFA88580"],
    ["Normal", dailyBands.p75, "#E7E2BC80"],
    ["Wet", dailyBands.p90, "#8ECEEE80"],
    ["Very Wet", dailyBands.maximum, "#2C7DCD80"]
  ];

  for (const [label, values, color] of bands) {
    datasets.push({
      label,
      data: bandPoints(values),
      backgroundColor: color,
      borderColor: "rgba(0,0,0,0.15)",
      borderWidth: 0.5,
      pointRadius: 0,
      fill: datasets.length - 1,
      // Chart.js draws highest order first, so the shading lands under
      // every line. `fill` still refers to dataset indices, which order
      // does not touch.
      order: 3,
      skipTooltip: true
    });
  }

  const forecastMaxIndex = datasets.length;

  datasets.push({
    label: "Historical Max",
    data: forecastPoints("maximum"),
    borderColor: "green",
    borderDash: [6, 4],
    borderWidth: 2,
    pointRadius: 0,
    order: 2
  });

  datasets.push({
    label: "Historical Min",
    data: forecastPoints("minimum"),
    borderColor: "red",
    borderDash: [6, 4],
    borderWidth: 2,
    pointRadius: 0,
    fill: forecastMaxIndex,
    backgroundColor: "rgba(180,180,180,0.25)",
    order: 2
  });

  datasets.push({
    label: "30-year Median Forecast",
    data: forecastPoints("median"),
    borderColor: "#1f77b4",
    borderDash: [6, 4],
    borderWidth: 4,
    pointRadius: 0,
    order: 1
  });

  datasets.push({
    label: "Modeled Discharge",
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

  renderChart("forecast-envelope", {
    type: "line",
    data: {datasets},
    options: {
      responsive: true,
      interaction: unifiedHover,
      plugins: {
        title: titleOptions("Three-Month Seasonal Outlook"),
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
            text: "Water Year"
          }
        },
        y: {
          title: {
            display: true,
            text:
    `Cumulative Volume (${volumeUnit.label})`
          }
        }
      }
    }
  });
}

function toPoints(dates, volumes, volumeUnit) {
  return volumes.map((volume, index) => ({
      x: dates[index],
      y:
          volume == null
              ? null
              : volume / volumeUnit.divisor
  }));
}
