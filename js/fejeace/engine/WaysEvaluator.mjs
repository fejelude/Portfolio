import { SymbolConfig } from "../config/SymbolConfig.mjs";
import { candidateFamiliesFromFirstReel, cellMatchesFamily } from "./WildEngine.mjs";

export const cellKey = (reel, row) => `${reel}:${row}`;

export function evaluateWays(grid) {
  const wins = [];
  for (const family of candidateFamiliesFromFirstReel(grid)) {
    const matchedByReel = [];
    for (let reelIndex = 0; reelIndex < grid.length; reelIndex += 1) {
      const matches = grid[reelIndex]
        .map((cell, rowIndex) => ({ cell, reel: reelIndex, row: rowIndex, key: cellKey(reelIndex, rowIndex) }))
        .filter(({ cell }) => cellMatchesFamily(cell, family));
      if (!matches.length) break;
      matchedByReel.push(matches);
    }
    if (matchedByReel.length < 3) continue;

    const reelCount = Math.min(5, matchedByReel.length);
    const activeReels = matchedByReel.slice(0, reelCount);
    const ways = activeReels.reduce((total, matches) => total * matches.length, 1);
    const payoutFactor = Number(SymbolConfig[family].payouts[reelCount] || 0);
    if (!(payoutFactor > 0)) continue;

    const cells = activeReels.flat();
    wins.push({
      family,
      reels: reelCount,
      ways,
      payoutFactor,
      cells: cells.map(({ reel, row, key }) => ({ reel, row, key })),
      wildSubstitutions: cells.filter(({ cell }) => cell.family === "wild").map(({ key }) => key)
    });
  }
  return wins;
}

export function winningCellKeys(wins) {
  return [...new Set(wins.flatMap((win) => win.cells.map((cell) => cell.key)))];
}
