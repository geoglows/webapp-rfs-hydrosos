import {buildHydroSOSForecast} from "../utils/buildHydroSOSForecast";
import {legendDefaults, renderChart, titleOptions, tooltipDefaults, unifiedHover} from "./chartSetup.js";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar",
  "Apr", "May", "Jun",
  "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec"
];

export function plotHydroSOSBands(
  bands,
  currentYearMonthly
) {
  const months = bands.map(
    b => MONTH_NAMES[b.month - 1]
  );

  console.log("HydroSOS bands months:", months);
console.log("Current year monthly:", currentYearMonthly);

  const forecast =
    buildHydroSOSForecast(
      bands,
      currentYearMonthly
    );

    console.log("HydroSOS forecast:", forecast);

  // Shaded status bands, each filling down to the one before it
  const datasets = [
    band("Very Dry", bands.map(b => b.p10), "#CD233F80", "origin"),
    band("Dry", bands.map(b => b.p25), "#FFA88580", 0),
    band("Normal", bands.map(b => b.p75), "#E7E2BC80", 1),
    band("Wet", bands.map(b => b.p90), "#8ECEEE80", 2),
    band("Very Wet", bands.map(b => b.p99), "#2C7DCD80", 3)
  ];

  datasets.push({
    label: "Current Year",
    data: currentYearMonthly,
    borderColor: "black",
    borderWidth: 4,
    pointRadius: 4,
    order: 0
  });

  if (forecast) {
    const maximumIndex = datasets.length;

    datasets.push({
      label: "90th Percentile",
      data: forecast.maximum,
      borderColor: "gray",
      borderDash: [4, 4],
      borderWidth: 2,
      pointRadius: 0,
      order: 2
    });

    datasets.push({
      label: "10th Percentile",
      data: forecast.minimum,
      borderColor: "gray",
      borderDash: [4, 4],
      borderWidth: 2,
      pointRadius: 0,
      fill: maximumIndex,
      backgroundColor: "rgba(180,180,180,0.2)",
      order: 2
    });

    datasets.push({
      label: "Median Forecast",
      data: forecast.median,
      borderColor: "#1f77b4",
      borderDash: [6, 4],
      borderWidth: 3,
      pointRadius: 3.5,
      order: 1
    });
  }

  renderChart("hydrosos-bands", {
    type: "line",
    data: {
      labels: months,
      datasets
    },
    options: {
      responsive: true,
      interaction: unifiedHover,
      plugins: {
        title: titleOptions("HydroSOS Monthly Flow Status"),
        legend: {
          ...legendDefaults,
          position: "top"
        },
        tooltip: {
          ...tooltipDefaults,
          callbacks: {
            label: item =>
              `${item.dataset.label}: ` +
              `${item.parsed.y.toFixed(0)} m³/s`
          }
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: "Mean Monthly Flow (m³/s)"
          }
        }
      }
    }
  });
}

function band(label, values, color, fillTarget) {
  return {
    label,
    data: values,
    backgroundColor: color,
    borderWidth: 0,
    pointRadius: 0,
    fill: fillTarget,
    // Chart.js draws highest order first, so the shading lands underneath
    // every line. `fill` still refers to dataset indices, which order
    // does not touch.
    order: 3,
    skipTooltip: true
  };
}
