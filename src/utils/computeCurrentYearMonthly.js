import {getRollingMonths} from "./getRollingMonths.js";

export function computeCurrentYearMonthly(monthlyMeans, records = []) {
  const today = new Date();

  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth() + 1;

  // Days with a usable flow value in each year-month, so a month is only
  // plotted once the data covers all of it, however far behind the data runs.
  const daysObserved = {};

  records.forEach(r => {
    if (r.flow == null) return;

    const key = `${r.year}-${r.month}`;

    daysObserved[key] = (daysObserved[key] ?? 0) + 1;
  });

  const rollingMonths = getRollingMonths();

  const currentYearMonthly = [];

  // Find the actual position of the current month within the rolling window.
  const currentMonthIndex = rollingMonths.indexOf(currentMonth);

  rollingMonths.forEach((month, index) => {
    // Determine which calendar year this month belongs to.
    const dataYear = month > currentMonth ? currentYear - 1 : currentYear;

    // Leave future months blank.
    if (index > currentMonthIndex) {
      currentYearMonthly.push(null);
      return;
    }

    const daysInMonth = new Date(Date.UTC(dataYear, month, 0)).getUTCDate();

    // Don't plot a month until it's fully observed.
    if ((daysObserved[`${dataYear}-${month}`] ?? 0) < daysInMonth) {
      currentYearMonthly.push(null);
      return;
    }

    currentYearMonthly.push(monthlyMeans[dataYear]?.[month] ?? null);
  });

  return {
    currentYear,
    currentYearMonthly
  };
}
