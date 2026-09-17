export function createDataSourceControl({ onChange }) {

    const container =
      document.createElement("div");
  
    container.className =
      "data-source-control maplibregl-ctrl";
  
    container.innerHTML = `
      <div class="data-source-control-title">
        Retrospective Data
      </div>
  
      <div class="data-source-buttons">
        <button
          type="button"
          class="data-source-button active"
          data-source="original"
        >
          Original
        </button>
  
        <button
          type="button"
          class="data-source-button"
          data-source="bias-corrected"
        >
          Bias Corrected
        </button>
      </div>
    `;
  
    const buttons =
      container.querySelectorAll(
        ".data-source-button"
      );
  
    buttons.forEach(button => {
  
      button.addEventListener(
        "click",
        () => {
  
          const source =
            button.dataset.source;
  
          buttons.forEach(b =>
            b.classList.remove("active")
          );
  
          button.classList.add("active");
  
          onChange(
            source === "bias-corrected"
          );
  
        }
      );
  
    });
  
    // Prevent clicks from reaching the map.
    container.addEventListener(
      "click",
      event => event.stopPropagation()
    );
  
    return {
  
      onAdd() {
        return container;
      },
  
      onRemove() {
        container.remove();
      }
  
    };
  
  }