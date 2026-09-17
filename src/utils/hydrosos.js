import {percentile} from "./percentile";

import {getRollingMonths} from "./getRollingMonths.js";

export function computeHydroSOSBands(
  monthlyMeans,
  referenceYear
) {
  const bands = [];

  const rollingMonths = getRollingMonths();

  for (const month of rollingMonths) {
    const values = [];

    for (
      let y = referenceYear - 30;
      y < referenceYear;
      y++
    ) {
      const v = monthlyMeans[y]?.[month];

      if (v !== undefined) {
        values.push(v);
      }
    }

    bands.push({
      month,
      values,
      minimum: Math.min(...values),
      p10: percentile(values, 10),
      p25: percentile(values, 25),
      median: percentile(values, 50),
      p75: percentile(values, 75),
      p90: percentile(values, 90),
      p99: percentile(values, 99),
      maximum: Math.max(...values)
    });
  }

  return bands;
}
