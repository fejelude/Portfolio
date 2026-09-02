import { winningCellKeys } from "./WaysEvaluator.mjs";

export function goldenTransforms(grid, wins) {
  const winningKeys = new Set(winningCellKeys(wins));
  const transforms = [];
  grid.forEach((reel, reelIndex) => {
    reel.forEach((cell, rowIndex) => {
      const key = `${reelIndex}:${rowIndex}`;
      if (cell?.variant === "golden" && winningKeys.has(key)) {
        transforms.push({ reel: reelIndex, row: rowIndex, key, family: cell.family, fromUid: cell.uid });
      }
    });
  });
  return transforms;
}
