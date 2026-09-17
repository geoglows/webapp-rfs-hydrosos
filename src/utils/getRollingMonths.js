// The dashboard shows a rolling twelve month window that opens this many
// months before the current one, which leaves the current month sitting at
// index MONTHS_BACK. computeRollingWindowCurves opens its date window on the
// same month, so every chart on the page starts in the same place.
export const MONTHS_BACK = 9;

// How far past the current month the seasonal outlook reaches
export const MONTHS_FORWARD = 3;

const MONTHS_IN_WINDOW = 12;

export function getRollingMonths() {
  const currentMonth =
    new Date().getUTCMonth() + 1;

  const months = [];

  for (let i = 0; i < MONTHS_IN_WINDOW; i++) {
    let month = currentMonth - (MONTHS_BACK-1) + i;

    while (month < 1) {
      month += 12;
    }

    while (month > 12) {
      month -= 12;
    }

    months.push(month);
  }

  console.log("HydroSOS rolling months:", months);


  return months;
}
