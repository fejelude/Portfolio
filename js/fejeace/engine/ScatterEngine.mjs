import { GameConfig } from "../config/GameConfig.mjs";
import { roundMoney } from "./WinCalculator.mjs";

export function evaluateScatters(grid, { mode, bet }) {
  const cells = [];
  grid.forEach((reel, reelIndex) => reel.forEach((cell, rowIndex) => {
    if (cell?.family === "scatter") cells.push({ reel: reelIndex, row: rowIndex, key: `${reelIndex}:${rowIndex}` });
  }));
  const count = cells.length;
  const payoutFactor = Number(GameConfig.scatterPayouts[Math.min(5, count)] || 0);
  const triggered = count >= 3;
  return {
    count,
    cells,
    payoutFactor,
    payout: roundMoney(bet * payoutFactor),
    triggered,
    awardedSpins: triggered
      ? mode === "free" ? GameConfig.freeSpinsRetriggered : GameConfig.freeSpinsAwarded
      : 0
  };
}
