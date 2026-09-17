'use strict';

const API_BASE =
  "https://geoglows.ecmwf.int/api/v2/retrospectivedaily";

export async function fetchBiasCorrectedRetrospective(linkno) {
  const riverId = Number(linkno);

  const url =
    `${API_BASE}/${riverId}` +
    `?format=json` +
    `&start_date=19400101` +
    `&bias_corrected=true`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Bias-corrected retrospective request failed: ${response.status}`
    );
  }

  const data = await response.json();

  return {
    datetime: data.datetime,
    [riverId]: data[riverId],
    metadata: {
      river_id: riverId,
      units: "m^3 s^-1",
      resolution: "daily",
      bias_corrected: true,
    },
  };
}