import { formatVolume } from "./formatVolume";


function ordinalSuffix(number) {

  const n = Math.abs(Math.round(number));

  if (n % 100 >= 11 && n % 100 <= 13) {
      return "th";
  }

  switch (n % 10) {
      case 1:
          return "st";
      case 2:
          return "nd";
      case 3:
          return "rd";
      default:
          return "th";
  }
}


export function updateHydrologicSummary(
    summary,
    basinID,
    riverID,
    riverName
) {
    const element =
        document.getElementById("basin-info");

    if (!element) {
        return;
    }
    const basinDisplayName = riverName
    ? `${riverName} Basin`
    : `Basin ${basinID}`;

    if (!summary) {

        element.innerHTML = `
    
            <div class="basin-status">
    
                <div class="basin-status-heading">
    
                    <h1 class="basin-name">
                        ${basinDisplayName}
                    </h1>
    
                </div>
    
                <p>Hydrologic status unavailable.</p>
    
            </div>
        `;
    
        return;
    }


    const flowPercentile =
        summary.flowPercentile != null
            ? Math.round(summary.flowPercentile)
            : null;


    const volumePercentile =
        summary.volumePercentile != null
            ? Math.round(summary.volumePercentile)
            : null;

            function getStatusClass(percentile) {

              if (percentile == null) {
                  return "normal";
              }
          
              if (percentile < 10) {
                  return "very-dry";
              }
          
              if (percentile < 25) {
                  return "dry";
              }
          
              if (percentile < 75) {
                  return "normal";
              }
          
              if (percentile < 90) {
                  return "wet";
              }
          
              return "very-wet";
          }


    const statusClass =
        summary.status
            ?.toLowerCase()
            .replace(" ", "-") || "normal";

        

const flowStatusClass =
    getStatusClass(summary.flowPercentile);

const volumeStatusClass =
    getStatusClass(summary.volumePercentile);

const outlookStatusClass =
    getStatusClass(summary.outlookPercentile);


    const flowValue =
        summary.currentFlow != null
            ? summary.currentFlow.toFixed(0)
            : "—";


            const volumeValue =
            formatVolume(summary.rollingVolumeValue);


            element.innerHTML = `

            <div class="basin-status">

    <div class="basin-status-heading">

        <h1 class="basin-name">
            ${basinDisplayName}
        </h1>

        <div class="hydrologic-status-badge ${statusClass}">
            ${summary.status}
        </div>

    </div>


            <div class="status-metrics">

                <div class="status-metric ${flowStatusClass}">

                    <div class="status-metric-label">
                        Current Flow
                    </div>

                    <div class="status-metric-percentile">
                        ${flowPercentile ?? "—"}<span>${flowPercentile != null ? ordinalSuffix(flowPercentile) : ""}</span>
                    </div>

                    <div class="status-metric-description">
                        percentile
                    </div>

                    <div class="status-metric-secondary">
                        ${flowValue} m³/s
                    </div>

                </div>


                <div class="status-metric ${volumeStatusClass}">

                    <div class="status-metric-label">
                        9-Month Volume
                    </div>

                    <div class="status-metric-percentile">
                        ${volumePercentile ?? "—"}<span>${volumePercentile != null ? ordinalSuffix(volumePercentile) : ""}</span>
                    </div>

                    <div class="status-metric-description">
                        percentile
                    </div>

                    <div class="status-metric-secondary">
                    ${volumeValue}
                    </div>

                </div>


                <div class="status-metric ${outlookStatusClass}">

    <div class="status-metric-label">
        3-Month Volume Outlook
    </div>

    <div class="status-metric-percentile">
    ${
      summary.outlookPercentile != null
          ? Math.round(summary.outlookPercentile)
          : "—"
  }<span>${
      summary.outlookPercentile != null
          ? ordinalSuffix(summary.outlookPercentile)
          : ""
  }</span>
    </div>

    <div class="status-metric-description">
        percentile · ${summary.outlook ?? "—"}
    </div>

    <div class="status-metric-secondary">
    ${formatVolume(summary.projectedVolume)} projected
</div>

</div>

              </div>  

            <div class="basin-identifiers">

                <span>Hydrobasin ${basinID}</span>

                <span class="identifier-divider">•</span>

                <span>Outlet ${riverID}</span>

            </div>

        </div>

    `;

}

