import { getHistoricalForecastCurves } from "./getHistoricalForecastCurves.js";
import { computeForecastEnvelope } from "./computeForecastEnvelope.js";
import { computeRollingWindowCurves } from "./computeRollingWindowCurves.js";
import { buildRecords } from "./buildRecords.js";


export function computeRollingVolumeOutlook(records) {

    const today = new Date();

    const rollingCurves =
        computeRollingWindowCurves(records);


    // --------------------------------------------------
    // Build cumulative-volume curves
    // --------------------------------------------------

    const cumulativeCurves =
        rollingCurves.map(curve => {

            let runningTotal = 0;

            return {
                year: curve.year,

                dates: curve.referenceDates,

                cumulativeVolume:
                    curve.records.map(record => {

                        runningTotal += record.volume;

                        return runningTotal;

                    })
            };

        });


    // --------------------------------------------------
    // Historical curves
    // --------------------------------------------------

    const historicalCurves =
        cumulativeCurves
            .filter(
                c => c.year < today.getUTCFullYear()
            )
            .sort(
                (a, b) => a.year - b.year
            )
            .slice(-30);


    // --------------------------------------------------
    // Current curve
    // --------------------------------------------------

    const currentCurve =
        cumulativeCurves.find(
            c => c.year === today.getUTCFullYear()
        );


    if (
        !currentCurve ||
        currentCurve.cumulativeVolume.length === 0 ||
        historicalCurves.length === 0
    ) {
        return null;
    }


    // --------------------------------------------------
    // Find the last observed date
    // --------------------------------------------------

    const lastModeledDate =
        currentCurve.dates[
            currentCurve.cumulativeVolume.length - 1
        ];


    // --------------------------------------------------
    // Historical forecast trajectories
    // --------------------------------------------------

    const historicalForecasts =
        getHistoricalForecastCurves(
            historicalCurves,
            currentCurve,
            lastModeledDate
        );


    if (!historicalForecasts.length) {
        return null;
    }


    // --------------------------------------------------
    // Forecast envelope
    // --------------------------------------------------

    const forecast =
        computeForecastEnvelope(
            historicalForecasts
        );


    // --------------------------------------------------
    // Current observed volume
    // --------------------------------------------------

    const currentVolume =
        currentCurve.cumulativeVolume.at(-1);


    // --------------------------------------------------
    // Projected end-of-window volume
    //
    // The forecast values represent volume added
    // after the last observed date, so add the
    // current observed volume.
    // --------------------------------------------------

    const forecastMedianAdded =
        forecast.median.at(-1);


    if (forecastMedianAdded == null) {
        return null;
    }


    const projectedVolume =
        currentVolume +
        forecastMedianAdded;


    // --------------------------------------------------
    // Historical end-of-window volumes
    // --------------------------------------------------

    const historicalVolumes =
        historicalCurves
            .map(
                curve =>
                    curve.cumulativeVolume.at(-1)
            )
            .filter(
                value =>
                    value != null &&
                    !Number.isNaN(value)
            );


    if (historicalVolumes.length === 0) {
        return null;
    }


    // --------------------------------------------------
    // Calculate percentile rank
    // --------------------------------------------------

    const countBelowOrEqual =
        historicalVolumes.filter(
            volume =>
                volume <= projectedVolume
        ).length;


    const percentile =
        (
            countBelowOrEqual /
            historicalVolumes.length
        ) * 100;


    // --------------------------------------------------
    // Convert percentile to status
    // --------------------------------------------------

    let outlook;

    if (percentile < 10) {

        outlook = "Very dry";

    } else if (percentile < 25) {

        outlook = "Dry";

    } else if (percentile < 75) {

        outlook = "Normal";

    } else if (percentile < 90) {

        outlook = "Wet";

    } else {

        outlook = "Very wet";

    }


    return {

        percentile,

        outlook,

        projectedVolume,

        currentVolume,

        forecastedVolume:
            forecastMedianAdded,

        historicalVolumes,

        historicalYears:
            historicalVolumes.length

    };

}