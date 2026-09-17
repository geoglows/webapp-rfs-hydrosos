import {buildRecords} from "../utils/buildRecords";
import {computeRollingWindowCurves} from "../utils/computeRollingWindowCurves";
import {computeMovingAverage} from "../utils/computeMovingAverage";
import {getVolumeUnit} from "../utils/formatVolume";
import {
  legendDefaults,
  renderChart,
  titleOptions,
  tooltipDefaults,
  unifiedHover
} from "./chartSetup.js";

const MOVING_AVERAGE_YEARS = 5;

export function plotTotalDischarge(data) {

  const records = buildRecords(data);

  const curves =
    computeRollingWindowCurves(records);


  // One point per year: the total volume the rolling
  // window accumulated.
  //
  // Keep these values in m³ so that we can choose
  // an appropriate display unit later.
  const annualVolumes = curves.map(curve => ({
    year: curve.year,
    volume: curve.records.reduce(
      (total, record) => total + record.volume,
      0
    )
  }));


  const movingAverage =
    computeMovingAverage(
      annualVolumes,
      MOVING_AVERAGE_YEARS
    );


  const years =
    annualVolumes.map(d => d.year);


  // Choose one unit for the entire graph.
  const maxVolume =
    Math.max(
      ...annualVolumes.map(d => d.volume)
    );

  const volumeUnit =
    getVolumeUnit(maxVolume);


  // Convert raw m³ values into the selected
  // graph unit.
  const scaleVolume = value =>
    value == null
      ? null
      : value / volumeUnit.divisor;


  renderChart("annual-runoff", {

    type: "line",

    data: {

      labels: years,

      datasets: [

        {
          label: "Total Discharge",

          data:
            annualVolumes.map(
              d => scaleVolume(d.volume)
            ),

          borderColor: "#A8A8A8",

          borderWidth: 2,

          pointRadius: 3,

          pointBackgroundColor: "#A8A8A8",

          order: 1
        },


        {
          label:
            `${MOVING_AVERAGE_YEARS}-Year Moving Average`,

          data:
            movingAverage.map(
              value => scaleVolume(value)
            ),

          borderColor: "#1f77b4",

          borderWidth: 4,

          pointRadius: 0,

          order: 0
        }

      ]

    },


    options: {

      responsive: true,

      interaction: unifiedHover,


      plugins: {

        title:
          titleOptions(
            "Simulated Total Discharge"
          ),

        legend: {
          ...legendDefaults,
          position: "top"
        },

        tooltip: {

          ...tooltipDefaults,

          callbacks: {

            label: item =>
              `${item.dataset.label}: ` +
              `${item.parsed.y.toFixed(
                volumeUnit.decimals
              )} ${volumeUnit.label}`

          }

        }

      },


      scales: {

        x: {

          title: {
            display: true,
            text: "Water Year"
          },

          ticks: {

            // One label a decade,
            // rather than one per year
            callback(value) {

              const year =
                this.getLabelForValue(value);

              return year % 10 === 0
                ? year
                : "";

            },

            autoSkip: false,

            maxRotation: 0

          }

        },


        y: {

          title: {

            display: true,

            text:
              `Total Discharge (${volumeUnit.label})`

          }

        }

      }

    }

  });

}
