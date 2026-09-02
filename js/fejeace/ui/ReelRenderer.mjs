import { symbolAsset } from "../config/AssetConfig.mjs";
import { SymbolConfig } from "../config/SymbolConfig.mjs";

export class ReelRenderer {
  constructor(gridElement) {
    this.gridElement = gridElement;
    this.cells = new Map();
    this.buildCells();
  }

  buildCells() {
    const fragment = document.createDocumentFragment();
    for (let row = 0; row < 4; row += 1) {
      for (let reel = 0; reel < 5; reel += 1) {
        const key = `${reel}:${row}`;
        const cell = document.createElement("div");
        cell.className = "reel-cell";
        cell.dataset.key = key;
        cell.dataset.reel = String(reel);
        cell.dataset.row = String(row);
        cell.innerHTML = '<div class="symbol-aura"></div><img class="symbol-img" alt="" draggable="false"><div class="cell-shine"></div>';
        const image = cell.querySelector(".symbol-img");
        image.addEventListener("load", () => cell.classList.remove("asset-error"));
        image.addEventListener("error", () => {
          cell.classList.add("asset-error");
          image.removeAttribute("src");
        });
        this.cells.set(key, cell);
        fragment.appendChild(cell);
      }
    }
    this.gridElement.replaceChildren(fragment);
  }

  cellAt(reel, row) {
    return this.cells.get(`${reel}:${row}`);
  }

  cellsForReel(reel) {
    return [...this.cells.values()].filter((cell) => Number(cell.dataset.reel) === reel);
  }

  setCell(reel, row, data) {
    const element = this.cellAt(reel, row);
    if (!element) return;
    const image = element.querySelector(".symbol-img");
    element.dataset.family = data?.family || "empty";
    element.dataset.variant = data?.variant || "normal";
    element.dataset.fallback = data?.family === "wild" ? "W" : data?.family === "scatter" ? "S" : (data?.family || "?").slice(0, 1).toUpperCase();
    element.classList.toggle("is-golden", data?.variant === "golden");
    element.classList.toggle("is-wild", data?.family === "wild");
    element.classList.toggle("is-scatter", data?.family === "scatter");
    if (!data) {
      image.removeAttribute("src");
      image.alt = "";
      return;
    }
    image.src = symbolAsset(data);
    const prefix = data.variant === "golden" ? "Golden " : "";
    image.alt = `${prefix}${SymbolConfig[data.family]?.name || data.family}`;
  }

  renderGrid(grid, { addedCells = [] } = {}) {
    const addedKeys = new Set(addedCells.map((cell) => cell.key));
    grid.forEach((reel, reelIndex) => reel.forEach((cell, rowIndex) => {
      const element = this.cellAt(reelIndex, rowIndex);
      this.setCell(reelIndex, rowIndex, cell);
      element.classList.remove("is-winning", "is-eliminating", "is-transforming", "is-spinning", "is-anticipating");
      if (addedKeys.has(`${reelIndex}:${rowIndex}`)) {
        element.classList.remove("is-refilling");
        void element.offsetWidth;
        element.classList.add("is-refilling");
      }
    }));
  }

  clearEffects() {
    this.cells.forEach((cell) => cell.classList.remove(
      "is-winning", "is-eliminating", "is-transforming", "is-refilling", "is-spinning", "is-anticipating", "is-scatter-hit"
    ));
  }

  markWinning(keys) {
    keys.forEach((key) => this.cells.get(key)?.classList.add("is-winning"));
  }

  markEliminating(entries) {
    entries.forEach(({ key }) => this.cells.get(key)?.classList.add("is-eliminating"));
  }

  applyGoldenTransforms(entries, gridAfterElimination) {
    entries.forEach(({ reel, row, key }) => {
      this.setCell(reel, row, gridAfterElimination[reel][row]);
      const element = this.cells.get(key);
      element?.classList.remove("is-winning");
      element?.classList.add("is-transforming");
    });
  }

  markScatter(entries) {
    entries.forEach(({ key }) => this.cells.get(key)?.classList.add("is-scatter-hit"));
  }
}
