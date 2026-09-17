export function computeMonthlyMeans(records, field = "flow") {
  const groups = {};

  records.forEach(r => {
    if (r[field] == null || Number.isNaN(r[field])) return;

    const key = `${r.year}-${r.month}`;

    if (!groups[key])
      groups[key] = [];

    groups[key].push(r[field]);
  });

  const monthlyMeans = {};

  Object.entries(groups).forEach(([key, values]) => {
      const [year, month] =
        key.split("-").map(Number);

      if (!monthlyMeans[year])
        monthlyMeans[year] = {};

      const mean =
        values.reduce((a, b) => a + b, 0) /
        values.length;

      monthlyMeans[year][month] = mean;
    }
  );

  return monthlyMeans;
}
