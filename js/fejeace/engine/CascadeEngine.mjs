import { GameConfig } from "../config/GameConfig.mjs";
import { cloneGrid } from "./ReelGenerator.mjs";
import { goldenTransforms } from "./GoldenEngine.mjs";
import { winningCellKeys } from "./WaysEvaluator.mjs";

function collapseSegment(cells, start, end, moves) {
  const survivors = [];
  for (let row = start; row <= end; row += 1) {
    if (cells[row]) survivors.push({ cell: cells[row], from: row });
    cells[row] = null;
  }
  let target = end;
  for (let index = survivors.length - 1; index >= 0; index -= 1) {
    const survivor = survivors[index];
    cells[target] = survivor.cell;
    if (survivor.from !== target) moves.push({ uid: survivor.cell.uid, fromRow: survivor.from, toRow: target });
    target -= 1;
  }
}

function collapseReel(cells) {
  const moves = [];
  const lockedRows = cells
    .map((cell, row) => cell?.sticky ? row : -1)
    .filter((row) => row >= 0);
  let start = 0;
  for (const lockedRow of lockedRows) {
    if (start <= lockedRow - 1) collapseSegment(cells, start, lockedRow - 1, moves);
    start = lockedRow + 1;
  }
  if (start <= cells.length - 1) collapseSegment(cells, start, cells.length - 1, moves);
  return moves;
}

export function processCascade(grid, wins, generator) {
  const workGrid = cloneGrid(grid);
  const transformList = goldenTransforms(workGrid, wins);
  const transformKeys = new Set(transformList.map((entry) => entry.key));
  const removedCells = [];

  for (const key of winningCellKeys(wins)) {
    const [reel, row] = key.split(":").map(Number);
    const cell = workGrid[reel][row];
    if (!cell) continue;
    if (transformKeys.has(key)) {
      workGrid[reel][row] = {
        uid: `${cell.uid}:wild`,
        family: "wild",
        variant: "wild",
        sticky: true,
        transformedFrom: cell.family,
        generatedOnReel: reel
      };
    } else {
      removedCells.push({ reel, row, key, uid: cell.uid, family: cell.family });
      workGrid[reel][row] = null;
    }
  }

  const gridAfterElimination = cloneGrid(workGrid);
  const fallingMoves = [];
  workGrid.forEach((reel, reelIndex) => {
    collapseReel(reel).forEach((move) => fallingMoves.push({ ...move, reel: reelIndex }));
  });
  const gridAfterCollapse = cloneGrid(workGrid);
  const addedCells = [];
  workGrid.forEach((reel, reelIndex) => {
    for (let row = 0; row < GameConfig.rows; row += 1) {
      if (reel[row]) continue;
      const cell = generator.nextCell(reelIndex);
      reel[row] = cell;
      addedCells.push({ reel: reelIndex, row, key: `${reelIndex}:${row}`, uid: cell.uid, family: cell.family });
    }
  });

  return {
    removedCells,
    goldenTransforms: transformList,
    gridAfterElimination,
    fallingMoves,
    gridAfterCollapse,
    addedCells,
    gridAfterRefill: cloneGrid(workGrid)
  };
}
