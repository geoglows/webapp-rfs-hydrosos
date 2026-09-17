// datePicker.js

import {
    latestAvailableMonth,
    findTifForMonth
  } from "./findLatestTif.js";
  
  import { setRasterTif } from "../map/rasterLayer.js";
  
  
  // Adjust to whenever the dataset actually begins
  const EARLIEST_MONTH =
    new Date(Date.UTC(2020, 0, 1));
  
  
  export function createDatePickerControl(map) {
  
    const latest =
      latestAvailableMonth();
  
    const earliest =
      EARLIEST_MONTH;
  
    let currentMonth =
      latest;
  
  
    const container =
      document.createElement("div");
  
    container.className =
      "hydrosos-date-controls maplibregl-ctrl";
  
  
    const prevBtn =
      document.createElement("button");
  
    prevBtn.id =
      "hydrosos-prev";
  
    prevBtn.setAttribute(
      "aria-label",
      "Previous month"
    );
  
    prevBtn.textContent = "‹";
  
  
    const inputEl =
      document.createElement("input");
  
    inputEl.id =
      "hydrosos-date";
  
    inputEl.type =
      "month";
  
  
    const nextBtn =
      document.createElement("button");
  
    nextBtn.id =
      "hydrosos-next";
  
    nextBtn.setAttribute(
      "aria-label",
      "Next month"
    );
  
    nextBtn.textContent = "›";
  
  
    container.append(
      prevBtn,
      inputEl,
      nextBtn
    );
  
  
    inputEl.max =
      monthInputValue(latest);
  
    inputEl.min =
      monthInputValue(earliest);
  
  
    async function loadMonth(
      requestedMonth,
      {onFallback} = {}
    ) {
  
      prevBtn.disabled = true;
      nextBtn.disabled = true;
  
  
      try {
  
        const {
          url,
          month: actualMonth
        } =
          await findTifForMonth(
            requestedMonth
          );
  
  
        if (
          monthInputValue(actualMonth) !==
          monthInputValue(requestedMonth)
        ) {
  
          onFallback?.(
            actualMonth
          );
  
        }
  
  
        currentMonth =
          actualMonth;
  
        inputEl.value =
          monthInputValue(
            actualMonth
          );
  
  
        await setRasterTif(
          map,
          url
        );
  
  
      } catch (err) {
  
        console.error(err);
  
  
      } finally {
  
        updateButtonState();
  
      }
  
    }
  
  
    function updateButtonState() {
  
      prevBtn.disabled =
        monthInputValue(currentMonth) <=
        monthInputValue(earliest);
  
  
      nextBtn.disabled =
        monthInputValue(currentMonth) >=
        monthInputValue(latest);
  
    }
  
  
    function shiftMonth(delta) {
  
      const next =
        new Date(
          Date.UTC(
            currentMonth.getUTCFullYear(),
            currentMonth.getUTCMonth() + delta,
            1
          )
        );
  
      loadMonth(next);
  
    }
  
  
    inputEl.addEventListener(
      "change",
      () => {
  
        const [
          year,
          month
        ] =
          inputEl.value
            .split("-")
            .map(Number);
  
  
        const requested =
          new Date(
            Date.UTC(
              year,
              month - 1,
              1
            )
          );
  
  
        loadMonth(
          requested,
          {
            onFallback:
              actualMonth => {
  
                console.warn(
                  `No data for requested month, showing ${monthInputValue(actualMonth)} instead`
                );
  
              }
          }
        );
  
      }
    );
  
  
    prevBtn.addEventListener(
      "click",
      () =>
        shiftMonth(-1)
    );
  
  
    nextBtn.addEventListener(
      "click",
      () =>
        shiftMonth(1)
    );
  
  
    // Initial load
    loadMonth(latest);
  
  
    return {
  
      onAdd() {
        return container;
      },
  
      onRemove() {
        container.remove();
      }
  
    };
  
  }
  
  
  function monthInputValue(date) {
  
    return `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() + 1
    ).padStart(2, "0")}`;
  
  }