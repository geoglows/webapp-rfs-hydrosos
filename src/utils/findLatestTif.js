const BASE_URL = "https://d2grb3c773p1iz.cloudfront.net/hydrosos/cogs";

// A month's result is published on the 5th of the following month, UTC.
const PUBLISH_DAY = 5;

// How far back to keep looking if the expected file is not up yet
const FALLBACK_MONTHS = 6;

/**
 * The most recent month whose raster should exist: the last completed month
 * once its result has been published, otherwise the month before that.
 */
export function latestAvailableMonth(now = new Date()) {
  const monthsBack = now.getUTCDate() >= PUBLISH_DAY ? 1 : 2;

  // Day 1 rather than today's date, so month arithmetic can't overflow off the
  // end of a shorter month. Date.UTC rolls the year back for us.
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1)
  );
}

export function tifUrl(month) {
  const year = month.getUTCFullYear();
  const paddedMonth = String(month.getUTCMonth() + 1).padStart(2, "0");
  return `${BASE_URL}/${year}-${paddedMonth}.tif`;
}


export async function findLatestTif() {
  const latest = latestAvailableMonth();

  for (let i = 0; i < FALLBACK_MONTHS; i++) {
    const month = new Date(
      Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() - i, 1)
    );

    const url = tifUrl(month);

    try {
      const response = await fetch(url, {method: "HEAD"});

      if (response.ok) {
        console.log("Found TIFF:", url);
        return url;
      }
    } catch (error) {
      console.warn("Failed to check:", url);
    }
  }

  throw new Error("Could not find a recent TIFF.");
}


async function tifExists(month) {
  try {
    const response = await fetch(tifUrl(month), {method: "HEAD"});
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Find the raster for a requested month, falling back to the nearest
 * earlier month (up to FALLBACK_MONTHS back) if that exact month is missing.
 */
export async function findTifForMonth(requestedMonth) {
  for (let i = 0; i < FALLBACK_MONTHS; i++) {
    const month = new Date(
      Date.UTC(requestedMonth.getUTCFullYear(), requestedMonth.getUTCMonth() - i, 1)
    );
    if (await tifExists(month)) {
      return {url: tifUrl(month), month};
    }
  }
  throw new Error("No TIFF found near requested month.");
}
