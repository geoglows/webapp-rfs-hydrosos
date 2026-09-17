import {computeMonthlyMeans} from "./monthlyMeans.js";
import {computeHydroSOSBands} from "./hydrosos.js";
import {computeCurrentYearMonthly} from "./computeCurrentYearMonthly.js";

export function getHydroSOSData(records) {
  const monthlyMeans =
    computeMonthlyMeans(records);

  const currentYear =
    new Date().getUTCFullYear();

  const bands =
    computeHydroSOSBands(
      monthlyMeans,
      currentYear
    );

  const {currentYearMonthly} = computeCurrentYearMonthly(monthlyMeans, records);

  return {
    monthlyMeans,
    bands,
    currentYearMonthly,
    currentYear
  };
}
