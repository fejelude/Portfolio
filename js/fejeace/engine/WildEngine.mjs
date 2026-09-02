import { RegularSymbolIds, SymbolConfig } from "../config/SymbolConfig.mjs";

export function cellMatchesFamily(cell, family) {
  return Boolean(cell) && (cell.family === family || cell.family === "wild");
}

export function candidateFamiliesFromFirstReel(grid) {
  const naturalFamilies = [...new Set(
    grid[0]
      .filter((cell) => cell && RegularSymbolIds.includes(cell.family))
      .map((cell) => cell.family)
  )];
  if (naturalFamilies.length) return naturalFamilies;

  const hasWild = grid[0].some((cell) => cell?.family === "wild");
  if (!hasWild) return [];

  return [...RegularSymbolIds].sort((left, right) => {
    const leftMax = Math.max(...Object.values(SymbolConfig[left].payouts));
    const rightMax = Math.max(...Object.values(SymbolConfig[right].payouts));
    return rightMax - leftMax;
  }).slice(0, 1);
}
