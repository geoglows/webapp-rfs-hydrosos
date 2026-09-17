/**
 * Where the volume of the last few months sits inside the distribution of
 * the same calendar window in previous years.
 */
export function computeRollingVolumePercentile(
  records,
  monthsBack = 9,
  historicalYears = 30
) {
  if (!records || records.length === 0) {
    return null;
  }

  const lastObserved = records.reduce(
    (latest, record) => record.date > latest ? record.date : latest,
    records[0].date
  );

  // Start of the current rolling window
  const windowStart = new Date(lastObserved);

  windowStart.setUTCMonth(
    windowStart.getUTCMonth() - monthsBack
  );

  // Each historical year is compared through the same point in its own year
  const currentYear = lastObserved.getUTCFullYear();

  const years = [...new Set(records.map(r => r.year))]
    .sort((a, b) => a - b)
    .filter(year => year < currentYear)
    .slice(-historicalYears);

  const volumeBetween = (start, end) => records
    .filter(record => record.date >= start && record.date <= end)
    .reduce((sum, record) => sum + record.volume, 0);

  const currentVolume = volumeBetween(windowStart, lastObserved);

  const historicalVolumes = [];

  for (const year of years) {
    const yearOffset = year - currentYear;

    const start = new Date(windowStart);
    const end = new Date(lastObserved);

    start.setUTCFullYear(start.getUTCFullYear() + yearOffset);
    end.setUTCFullYear(end.getUTCFullYear() + yearOffset);

    const matched = records.filter(
      record => record.date >= start && record.date <= end
    );

    if (matched.length === 0) continue;

    historicalVolumes.push(
      matched.reduce((sum, record) => sum + record.volume, 0)
    );
  }

  if (historicalVolumes.length === 0) {
    return null;
  }

  const countBelowOrEqual = historicalVolumes.filter(
    volume => volume <= currentVolume
  ).length;

  return {
    currentVolume,
    percentile: (countBelowOrEqual / historicalVolumes.length) * 100,
    historicalVolumes,
    historicalYears: historicalVolumes.length,
    windowStart,
    windowEnd: lastObserved
  };
}
