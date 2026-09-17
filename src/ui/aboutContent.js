export const aboutContent = `

  <h2>About & Methods</h2>


  <section class="about-section">

    <h3>What is HydroSOS?</h3>

    <p>
      HydroSOS is an interactive tool for exploring current and
      forecasted hydrologic conditions across river basins around
      the world.
    </p>

    <p>
      The map provides a quick overview of how current runoff
      conditions compare with historical conditions. Select a basin
      on the map or search by basin name or HYBASIN ID to explore
      its current status, historical variability, and forecasted
      conditions.
    </p>

  </section>


  <section class="about-section">

    <h3>How to Use the Map</h3>

    <h4>1. Explore</h4>

    <p>
      Explore the global map to see the current hydrologic status
      of river basins. You can also use the search bar to find a
      specific basin by name or HYBASIN ID.
    </p>

    <h4>2. Check Basin Status</h4>

    <p>
      Each basin is colored according to how its current cumulative
      runoff compares with historical conditions. Select a basin
      to open its information panel.
    </p>

    <h4>3. Explore the Outlook</h4>

    <p>
      The basin information panel contains graphs showing
      historical conditions, current-year runoff, and the projected
      outlook.
    </p>

  </section>


  <section class="about-section">

    <h3>Understanding Basin Status</h3>

    <p>
      Basin colors represent the percentile of current cumulative
      runoff relative to the historical reference period.
    </p>

    <div class="status-table">

      <div class="status-row">
        <strong>Very Dry</strong>
        <span>Below the 10th percentile</span>
      </div>

      <div class="status-row">
        <strong>Dry</strong>
        <span>10th–30th percentile</span>
      </div>

      <div class="status-row">
        <strong>Normal</strong>
        <span>30th–70th percentile</span>
      </div>

      <div class="status-row">
        <strong>Wet</strong>
        <span>70th–90th percentile</span>
      </div>

      <div class="status-row">
        <strong>Very Wet</strong>
        <span>Above the 90th percentile</span>
      </div>

    </div>

    <p>
      These classifications describe relative hydrologic
      conditions. They do not directly represent reservoir storage,
      water-supply availability, groundwater conditions, or the
      impacts of drought on people or ecosystems.
    </p>

  </section>


  <section class="about-section">

    <h3>Understanding the Graphs</h3>

    <h4>Historical Conditions</h4>

    <p>
      Historical data provide a reference for understanding the
      range of hydrologic conditions that have occurred in the
      basin.
    </p>

    <h4>Current Conditions</h4>

    <p>
      The current year is compared with the historical distribution
      to show whether cumulative runoff is tracking above or below
      typical conditions.
    </p>

    <h4>Forecast</h4>

    <p>
      The forecast extends the current runoff trajectory into the
      upcoming months. Forecast conditions are presented alongside
      historical variability so that projected runoff can be
      interpreted in context.
    </p>

    <h4>Percentile Bands</h4>

    <p>
      Shaded regions represent the range of historical conditions.
      Percentiles provide a relative measure of how unusual current
      or forecasted runoff is.
    </p>

  </section>


  <section class="about-section">

    <h3>Data & Methodology</h3>

    <h4>Hydrologic Data</h4>

    <p>
      Hydrologic information is derived from the GEOGloWS global
      hydrologic modeling system, including retrospective and
      forecasted streamflow data.
    </p>

    <h4>Basin Boundaries</h4>

    <p>
      The application uses HydroBASINS to define river basin
      boundaries and associate hydrologic information with
      individual basins. Each basin is identified using a unique
      HYBASIN ID.
    </p>

    <h4>Historical Reference Period</h4>

    <p>
      Current conditions are evaluated relative to a 30-year
      historical reference period.
    </p>

    <h4>Cumulative Runoff</h4>

    <p>
      Daily streamflow is converted to daily runoff volume and
      accumulated over the relevant period. Cumulative volume is
      compared with the historical distribution to determine its
      percentile and corresponding hydrologic status.
    </p>

    <h4>Forecast Methodology</h4>

    <p>
      Forecasted conditions are generated using historical
      hydrologic patterns together with the current year's observed
      runoff. Forecast values should be interpreted together with
      the historical range rather than as a precise prediction of
      future conditions.
    </p>

    <h4>Bias-Corrected Data</h4>

    <p>
      HydroSOS provides an option to use bias-corrected hydrologic
      data. Because the bias-corrected data are retrieved
      separately, enabling this option may increase loading time.
    </p>

  </section>


  <section class="about-section">

    <h3>Limitations</h3>

    <p>
      HydroSOS is intended as a tool for exploring relative
      hydrologic conditions, not as a standalone water-resource
      management or drought-impact assessment tool.
    </p>

    <h4>Relative Rather Than Absolute Conditions</h4>

    <p>
      A basin classified as Dry has lower-than-usual runoff
      relative to its historical conditions. This does not
      necessarily mean that the basin has an absolute water
      shortage.
    </p>

    <h4>Forecast Uncertainty</h4>

    <p>
      Forecasts are inherently uncertain and should be interpreted
      alongside the historical variability shown in the graphs.
    </p>

    <h4>Global Datasets</h4>

    <p>
      HydroSOS relies on globally available hydrologic and
      geographic datasets. These datasets provide broad spatial
      coverage but may not represent local watershed boundaries,
      streamflow behavior, or water-management systems with the
      same detail as regional datasets.
    </p>

    <h4>Interpretation</h4>

    <p>
      HydroSOS should be used as an exploratory and informational
      tool. Basin status should be considered alongside other
      relevant information when making decisions about water
      resources.
    </p>

  </section>


  <section class="about-section">

    <h3>Data Sources</h3>

    <ul>
      <li>GEOGloWS global hydrologic data</li>
      <li>HydroBASINS global watershed boundaries</li>
      <li>Associated global river-network datasets</li>
    </ul>

  </section>

`;