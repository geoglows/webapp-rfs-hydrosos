export function buildHydroSOSForecast(bands, currentYearMonthly, monthsAhead = 3) {
  const median = new Array(bands.length).fill(null)
  const minimum = new Array(bands.length).fill(null)
  const maximum = new Array(bands.length).fill(null)

  const lastModeled = currentYearMonthly.findLastIndex(v => v != null)
  if (lastModeled === -1) {
    return null;
  }

  // Anchor at the last modeled month
  median[lastModeled] = currentYearMonthly[lastModeled];
  minimum[lastModeled] = currentYearMonthly[lastModeled];
  maximum[lastModeled] = currentYearMonthly[lastModeled];

  // Fill the next few months
  for (let i = 1; i <= monthsAhead; i++) {
    const index = lastModeled + i;
    if (index >= bands.length) break;
    median[index] = bands[index].median;
    minimum[index] = bands[index].p10;
    maximum[index] = bands[index].p90;
  }
  return {
    median,
    minimum,
    maximum
  };
}
