export function buildRecords(data) {
  const riverID = data.metadata.river_id;

  return data.datetime.map((d, i) => {
    const date = new Date(d);

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    const dayOfYear = Math.floor(
      (
        date -
        new Date(Date.UTC(year, 0, 1))
      ) /
      (1000 * 60 * 60 * 24)
    ) + 1;

    const waterYear =
      month >= 10 ? year + 1 : year;

    const wyStart =
      month >= 10
        ? new Date(Date.UTC(year, 9, 1))
        : new Date(Date.UTC(year - 1, 9, 1));

    const waterYearDay = Math.floor(
      (date - wyStart) /
      (1000 * 60 * 60 * 24)
    ) + 1;

    const rawFlow = data[riverID][i];

    const missing = rawFlow == null || Number.isNaN(rawFlow);

    if (missing) {
      console.warn(`Missing flow for ${date.toISOString()}`);
    }

    const flow = missing ? null : rawFlow;
    const volume = missing ? null : flow * 86400;

    return {
      date,
      year,
      month,
      day,
      dayOfYear,
      waterYear,
      waterYearDay,
      flow,
      volume
    };
  });
}
